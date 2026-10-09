// Keep the frontend's VITE_CAMPUS_* values in sync; the server remains authoritative.
const num = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };

export const MTTI_COORDINATES = {
  latitude: num(process.env.CAMPUS_LAT, -0.0663),
  longitude: num(process.env.CAMPUS_LNG, 37.6642),
  radiusMeters: num(process.env.CAMPUS_RADIUS_M, 200),
};

export const QR_SCAN_RADIUS_METERS = 20;

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function verifyGeofence(userLat, userLon) {
  const distance = calculateDistance(userLat, userLon, MTTI_COORDINATES.latitude, MTTI_COORDINATES.longitude);
  return { isWithinCampus: distance <= MTTI_COORDINATES.radiusMeters, distanceMeters: Math.round(distance) };
}
