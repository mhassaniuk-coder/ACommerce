import express from 'express';
import { login, register, updateProfile, verifyAccount, googleAuth, submitKyc, verifyPayment, verifyEmail, resendVerificationEmail, verifyPhone } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { recaptchaMiddleware } from '../middleware/recaptcha';

const router = express.Router();

router.post('/register', recaptchaMiddleware, register);
router.post('/login', recaptchaMiddleware, login);
router.post('/google', googleAuth);
router.post('/verify', authenticate, verifyAccount);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/verify-phone', authenticate, verifyPhone);
router.post('/kyc', authenticate, submitKyc);
router.post('/payment', authenticate, verifyPayment);
router.patch('/profile', authenticate, updateProfile);

export default router;
