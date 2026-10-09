import express from 'express';
import { tempIDController } from '../controllers/tempIDController.js';

const router = express.Router();

router.post('/request', tempIDController.requestTempID);
router.patch('/:id/status', tempIDController.updateTempIDStatus);

export default router;