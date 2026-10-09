import express from 'express';
import { campusController } from '../controllers/campusController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Secure all campus module routes with JWT authentication
router.use(authMiddleware);

// FEAT 12: Library Check-in & Occupancy Management
router.post('/library', campusController.libraryCheckin);

// FEAT 12: Sports & Games Attendance Tracking
router.post('/games', campusController.gamesAttendance);

// FEAT 12: Fees Clearance Status Verification
router.get('/fees', campusController.getFeesClearanceStatus);

// General Service Check-in
router.post('/checkin', campusController.checkinService);

// Retrieve user campus activity logs/history
router.get('/history/:adm_no?', campusController.getCheckins);

export default router;