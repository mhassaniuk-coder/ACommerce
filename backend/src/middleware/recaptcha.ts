import { Request, Response, NextFunction } from 'express';
import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';

const SITE_KEY = '6Le_u40sAAAAAJdEcFIFSUuAghMUtMOXf66fIIOS';

// Environment variables for reCAPTCHA Enterprise
// RECAPTCHA_PROJECT_ID - Your Google Cloud project ID
// GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON (or set via env)

interface RecaptchaRequest extends Request {
  recaptchaValid?: boolean;
  recaptchaScore?: number;
}

// Create the reCAPTCHA client
const getRecaptchaClient = (): RecaptchaEnterpriseServiceClient => {
  return new RecaptchaEnterpriseServiceClient();
};

export const verifyRecaptcha = async (token: string, action: string = 'LOGIN'): Promise<{ valid: boolean; score?: number }> => {
  const projectId = process.env.RECAPTCHA_PROJECT_ID || 'acommerce-42565';

  if (!projectId) {
    console.error('reCAPTCHA: Missing project ID');
    return { valid: false };
  }

  try {
    const client = getRecaptchaClient();
    const projectPath = client.projectPath(projectId);

    // Build the assessment request
    const [response] = await client.createAssessment({
      assessment: {
        event: {
          token: token,
          siteKey: SITE_KEY,
        },
      },
      parent: projectPath,
    });

    // Check if the token is valid
    if (!response.tokenProperties?.valid) {
      console.error('reCAPTCHA: Invalid token', response.tokenProperties?.invalidReason);
      return { valid: false };
    }

    // Check if the expected action was executed
    if (response.tokenProperties.action !== action) {
      console.error('reCAPTCHA: Invalid action. Expected:', action, 'Got:', response.tokenProperties.action);
      return { valid: false };
    }

    // Get the risk score (0.0 - 1.0)
    const score = response.riskAnalysis?.score ?? 0;

    // Consider score >= 0.5 as valid
    const isValid = score >= 0.5;

    if (!isValid) {
      console.error('reCAPTCHA: Low score', score);
    }

    return { valid: isValid, score };
  } catch (error: any) {
    console.error('reCAPTCHA verification error:', error.message || error);
    return { valid: false };
  }
};

// Express middleware for reCAPTCHA verification
export const recaptchaMiddleware = async (
  req: RecaptchaRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Skip reCAPTCHA in development mode
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv !== 'production') {
    console.log('[Dev Mode] Skipping reCAPTCHA verification');
    next();
    return;
  }

  const token = req.body.recaptchaToken || req.query.recaptchaToken;

  if (!token) {
    res.status(400).json({ error: 'reCAPTCHA token is required' });
    return;
  }

  // Determine action based on route
  const action = req.path === '/register' ? 'REGISTER' :
    req.path === '/login' ? 'LOGIN' :
      req.path === '/forgot-password' ? 'FORGOT_PASSWORD' : 'LOGIN';

  try {
    const result = await verifyRecaptcha(token, action);
    req.recaptchaValid = result.valid;
    req.recaptchaScore = result.score;

    if (!result.valid) {
      res.status(400).json({ error: 'reCAPTCHA verification failed' });
      return;
    }

    next();
  } catch (error) {
    console.error('reCAPTCHA middleware error:', error);
    res.status(500).json({ error: 'reCAPTCHA verification error' });
  }
};

// Optional: Middleware that doesn't block but logs the result
export const recaptchaOptionalMiddleware = async (
  req: RecaptchaRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.body.recaptchaToken || req.query.recaptchaToken;

  if (token) {
    try {
      const action = req.path === '/register' ? 'REGISTER' : 'LOGIN';
      const result = await verifyRecaptcha(token, action);
      req.recaptchaValid = result.valid;
      req.recaptchaScore = result.score;
      console.log('reCAPTCHA validation result:', result);
    } catch (error) {
      console.error('reCAPTCHA optional validation error:', error);
      req.recaptchaValid = false;
    }
  } else {
    req.recaptchaValid = undefined;
  }

  next();
};
