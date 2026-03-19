import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/authRoutes';
import storeRoutes from './routes/storeRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import reviewRoutes from './routes/reviewRoutes';
import customerRoutes from './routes/customerRoutes';

import adminRoutes from './routes/adminRoutes';
import aiRoutes from './routes/aiRoutes';
import marketingRoutes from './routes/marketingRoutes';
import cartRoutes from './routes/cartRoutes';
import billingRoutes from './routes/billingRoutes';
import autoPilotRoutes from './routes/autoPilotRoutes';
import categoryRoutes from './routes/categoryRoutes';
import searchRoutes from './routes/searchRoutes';
import webhookRoutes from './routes/webhookRoutes';
import sellerRoutes from './routes/sellerRoutes';
import platformAnalyticsRoutes from './routes/platformAnalyticsRoutes';
import storeLimitsRoutes from './routes/storeLimitsRoutes';
import moderationRoutes from './routes/moderationRoutes';
import ratingRoutes from './routes/ratingRoutes';
import disputeRoutes from './routes/disputeRoutes';
import platformStatsRoutes from './routes/platformStatsRoutes';
import promoRoutes from './routes/promoRoutes';

import prisma from './utils/prisma';
import { env, isProduction } from './config/env';
import { rateLimit } from './middleware/rateLimit';

const app = express();
const PORT = env.port;
const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
const allowedOrigins = env.corsOrigins.length > 0 ? env.corsOrigins : isProduction ? [] : defaultDevOrigins;

app.disable('x-powered-by');

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true
    })
);

app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ keyPrefix: 'api-global', max: 1200, windowMs: 15 * 60 * 1000 }));

app.use('/api/auth', rateLimit({ keyPrefix: 'auth', max: 30, windowMs: 15 * 60 * 1000 }), authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/stores/:storeId/products', productRoutes);
app.use('/api/orders', rateLimit({ keyPrefix: 'orders', max: 120, windowMs: 15 * 60 * 1000 }), orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/stores/:storeId/customers', customerRoutes);
app.use('/api/stores/:storeId/discounts', marketingRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/stores/:storeId/billing', billingRoutes);

// Global billing catalog endpoint (doesn't require store ID)
app.get('/api/billing/catalog', (req, res, next) => {
    // Import and call the getPlanCatalog handler directly
    import('./controllers/billingController').then(module => {
        module.getPlanCatalog(req, res).catch(next);
    });
});
app.use('/api/admin', adminRoutes);
app.use('/api/ai', rateLimit({ keyPrefix: 'ai', max: 60, windowMs: 60 * 1000 }), aiRoutes);
app.use('/api/autopilot', autoPilotRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/analytics', platformAnalyticsRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/platform', platformStatsRoutes);
app.use('/api/promo', promoRoutes);
app.use('/api', storeLimitsRoutes);


app.get('/', (req, res) => {
    res.json({ message: 'ACommerce API is running' });
});

app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.floor(process.uptime()) });
});

app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'Origin not allowed' });
    }
    if (error instanceof SyntaxError && 'body' in error) {
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    console.error('Unhandled API error', error);
    return res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
