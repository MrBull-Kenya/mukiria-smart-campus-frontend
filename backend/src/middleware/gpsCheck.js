import { MTTI_COORDINATES, verifyGeofence } from '../config/mttiGPS.js';

export const enforceGPSGeofence = (req, res, next) => {
  try {
    const { gps_lat, gps_lng } = req.body;

    if (gps_lat === undefined || gps_lng === undefined) {
      return res.status(400).json({ error: 'GPS coordinates (latitude and longitude) are required.' });
    }

    const geofenceResult = verifyGeofence(parseFloat(gps_lat), parseFloat(gps_lng));

    if (!geofenceResult.isWithinCampus) {
      return res.status(403).json({
        error: `Geofence rejection: You are ${geofenceResult.distanceMeters}m away from MTTI campus. Must be within ${MTTI_COORDINATES.radiusMeters}m.`
      });
    }

    // Attach distance and validation info to request object if needed downstream
    req.geofence = geofenceResult;
    next();
  } catch (err) {
    console.error('GPS middleware error:', err);
    res.status(500).json({ error: 'Failed to evaluate GPS geofence boundary.' });
  }
};