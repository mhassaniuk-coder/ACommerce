import express from 'express';
import { getPlatformStats } from '../controllers/platformStatsController';

const router = express.Router();

// GET /api/platform/stats - Get real-time platform statistics
router.get('/stats', getPlatformStats);

export default router;
