import express from 'express';
import { authController } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', authController.login);
router.post('/register-student', authController.registerStudent);
router.post('/register-rep', authController.registerRep);
router.post('/register-teacher', authController.registerTeacher);
router.post('/register-hod', authController.registerHod);
router.post('/register-admin', authController.registerAdmin);
router.post('/resend-verification', authController.resendVerification);
router.post('/forgot-password-email', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.get('/verify-token', verifyToken, authController.verifyToken);

export default router;
