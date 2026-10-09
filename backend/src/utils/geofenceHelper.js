// backend/src/utils/geofenceHelper.js
const { LATITUDE, LONGITUDE, MAX_RADIUS_METERS } = require('../config/geofence');

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isWithinGeofence(userLat, userLng) {
  const distance = getDistanceFromLatLonInMeters(userLat, userLng, LATITUDE, LONGITUDE);
  return {
    isInside: distance <= MAX_RADIUS_METERS,
    distance: Math.round(distance),
  };
}

module.exports = { isWithinGeofence };