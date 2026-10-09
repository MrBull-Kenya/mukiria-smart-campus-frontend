import { verifyGeofence } from '../config/mttiGPS.js';

export const gpsController = {
  async checkLocation(req, res) {
    try {
      const { lat, lng } = req.body;
      const result = verifyGeofence(parseFloat(lat), parseFloat(lng));
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'GPS geofence verification failed.' });
    }
  }
};