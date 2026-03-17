const getRequiredEnv = (name: string): string => {
    const value = process.env[name];
    if (!value || value.trim() === '') {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const nodeEnv = process.env.NODE_ENV || 'development';
const adminDashboardEmail = normalizeEmail(process.env.ADMIN_DASHBOARD_EMAIL || 'secret@gmail.com');
const corsOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

if (!/^[^\s@]+@gmail\.com$/i.test(adminDashboardEmail)) {
    throw new Error('ADMIN_DASHBOARD_EMAIL must be a valid Gmail address');
}

if (nodeEnv === 'production' && corsOrigins.length === 0) {
    throw new Error('CORS_ORIGIN must be set in production');
}

export const env = {
    nodeEnv,
    port: Number(process.env.PORT || 5000),
    jwtSecret: getRequiredEnv('JWT_SECRET'),
    corsOrigins,
    adminDashboardEmail,
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    stripeConnectSecret: process.env.STRIPE_CONNECT_SECRET || process.env.STRIPE_SECRET_KEY || '',
    platformCommissionFree: Number(process.env.PLATFORM_COMMISSION_FREE || '0.05'),
    platformCommissionPro: Number(process.env.PLATFORM_COMMISSION_PRO || '0.02'),
    platformCommissionPremium: Number(process.env.PLATFORM_COMMISSION_PREMIUM || '0.01'),
    platformCommissionEnterprise: Number(process.env.PLATFORM_COMMISSION_ENTERPRISE || '0'),
    // Content Moderation Settings
    contentModerationEnabled: process.env.CONTENT_MODERATION_ENABLED === 'true',
    moderationStrictMode: process.env.MODERATION_STRICT_MODE === 'true',
};

export const isProduction = env.nodeEnv === 'production';
