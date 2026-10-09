import express from 'express';
import { classController } from '../controllers/classController.js';

const router = express.Router();

router.get('/list', classController.getAllClasses);
router.post('/request', classController.requestNewClass);

export default router;