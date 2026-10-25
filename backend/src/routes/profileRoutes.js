import express from 'express';
import { profileController, profilePhotoUpload } from '../controllers/profileController.js';

const router = express.Router();
const profilePhoto = (req, res, next) => profilePhotoUpload.single('photo')(req, res, (err) => {
  if (!err) return next();
  const tooLarge = err.code === 'LIMIT_FILE_SIZE';
  return res.status(tooLarge ? 413 : 400).json({
    error: tooLarge ? 'Profile photos must be 2 MB or smaller.' : err.message,
  });
});

router.get('/', profileController.get);
router.put('/', profileController.update);
router.post('/password', profileController.changePassword);
router.post('/photo', profilePhoto, profileController.uploadPhoto);

export default router;
