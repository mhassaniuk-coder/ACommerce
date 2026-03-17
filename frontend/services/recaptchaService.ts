const SITE_KEY = '6Le_u40sAAAAAJdEcFIFSUuAghMUtMOXf66fIIOS';

export const getRecaptchaToken = async (action: string = 'LOGIN'): Promise<string> => {
 return new Promise((resolve, reject) => {
  if (typeof window !== 'undefined' && (window as any).grecaptcha) {
   (window as any).grecaptcha.enterprise.ready(async () => {
    try {
     const token = await (window as any).grecaptcha.enterprise.execute(
      SITE_KEY,
      { action }
     );
     resolve(token);
    } catch (error) {
     reject(error);
    }
   });
  } else {
   reject(new Error('reCAPTCHA not loaded'));
  }
 });
};

// Helper function to get reCAPTCHA site key
export const getRecaptchaSiteKey = (): string => {
 return SITE_KEY;
};
