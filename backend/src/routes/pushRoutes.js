import express from 'express';
import { pushController } from '../controllers/pushController.js';

const router = express.Router();
const handle = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(`${req.method} ${req.originalUrl} failed:`, err);
    if (!res.headersSent) res.status(500).json({ error: 'Could not update background notification settings.' });
  });
};

router.get('/vapid-public-key', handle(pushController.vapidPublicKey));
router.post('/subscriptions', handle(pushController.subscribe));
router.delete('/subscriptions', handle(pushController.unsubscribe));

export default router;
