import express from 'express';
import { attendanceController } from '../controllers/attendanceController.js';
import { uploadFace } from '../config/faceStorage.js';

const router = express.Router();

router.post('/scan', uploadFace.single('photo'), attendanceController.scanAttendance);

export default router;