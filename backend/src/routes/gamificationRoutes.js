import express from 'express';
import { gamificationController } from '../controllers/gamificationController.js';

const router = express.Router();

router.get('/scorecard/:adm_no', gamificationController.getStudentScorecard);

export default router;