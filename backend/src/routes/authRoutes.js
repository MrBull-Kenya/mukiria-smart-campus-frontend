import express from 'express';
import { authController } from '../controllers/authController.js';
import { passkeyController } from '../controllers/passkeyController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', authController.login);
router.get('/passkeys/config', passkeyController.config);
router.post('/passkeys/authentication/options', passkeyController.authenticationOptions);
router.post('/passkeys/authentication/verify', passkeyController.verifyAuthentication);
router.get('/passkeys', verifyToken, passkeyController.list);
router.post('/passkeys/registration/options', verifyToken, passkeyController.registrationOptions);
router.post('/passkeys/registration/verify', verifyToken, passkeyController.verifyRegistration);
router.delete('/passkeys/:credentialHash', verifyToken, passkeyController.remove);
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
