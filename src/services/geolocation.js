import { CAMPUS } from '../config/campus';

export const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const error = new Error('Geolocation is not supported by your browser.');
      error.name = 'GeolocationError';
      return reject(error);
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) => {
        const error = new Error(err.message || 'Could not determine this device location.');
        error.name = 'GeolocationError';
        error.code = err.code;
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });

// Haversine distance in metres
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const distanceFromCampus = (lat, lng) =>
  Math.round(calculateDistance(lat, lng, CAMPUS.latitude, CAMPUS.longitude));

export async function verifyCampusGeofence() {
  const pos = await getCurrentPosition();
  const distance = distanceFromCampus(pos.latitude, pos.longitude);
  return { isWithinCampus: distance <= CAMPUS.radiusMeters, distance, radius: CAMPUS.radiusMeters, coords: pos };
}
