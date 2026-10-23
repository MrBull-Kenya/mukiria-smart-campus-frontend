import express from 'express';
import { profileController } from '../controllers/profileController.js';

const router = express.Router();

router.get('/', profileController.get);
router.put('/', profileController.update);
router.post('/password', profileController.changePassword);

export default router;
