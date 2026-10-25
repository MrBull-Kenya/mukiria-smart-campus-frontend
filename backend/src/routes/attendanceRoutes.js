import express from 'express';
import { attendanceController } from '../controllers/attendanceController.js';
import { passkeyController } from '../controllers/passkeyController.js';
import { uploadFace } from '../config/faceStorage.js';

const router = express.Router();

router.post('/passkey/options', passkeyController.attendanceOptions);
router.post('/scan', uploadFace.single('photo'), attendanceController.scanAttendance);

export default router;