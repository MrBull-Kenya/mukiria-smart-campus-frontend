import express from 'express';
import { ministryController } from '../controllers/ministryController.js';

const router = express.Router();

router.post('/report', ministryController.generateReport);
router.get('/reports', ministryController.getAllReports);

export default router;