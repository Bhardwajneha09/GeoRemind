/**
 * Mean radius of the Earth in metres (WGS84 spherical approximation).
 * @constant {number}
 */
const EARTH_RADIUS_METRES = 6371000;

/**
 * Converts degrees to radians.
 *
 * @param {number} degrees - Angle in degrees.
 * @returns {number} Angle in radians.
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 *
 * @param {number} radians - Angle in radians.
 * @returns {number} Angle in degrees.
 */
function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates the great-circle distance between two geographic coordinates
 * using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of point 1 in decimal degrees.
 * @param {number} lon1 - Longitude of point 1 in decimal degrees.
 * @param {number} lat2 - Latitude of point 2 in decimal degrees.
 * @param {number} lon2 - Longitude of point 2 in decimal degrees.
 * @returns {number} Distance between the two points in METRES.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  // Math.min/Math.max guard against floating point inaccuracies beyond [0, 1]
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  return EARTH_RADIUS_METRES * c;
}

/**
 * Determines whether a user's coordinate is inside a circular geofence.
 *
 * @param {number} userLat - User's latitude in decimal degrees.
 * @param {number} userLon - User's longitude in decimal degrees.
 * @param {number} fenceLat - Geofence center latitude in decimal degrees.
 * @param {number} fenceLon - Geofence center longitude in decimal degrees.
 * @param {number} radiusMetres - Geofence radius in metres.
 * @returns {boolean} True if the user is inside or on the geofence perimeter, false otherwise.
 */
function isInsideGeofence(userLat, userLon, fenceLat, fenceLon, radiusMetres) {
  const distance = haversineDistance(userLat, userLon, fenceLat, fenceLon);
  return distance <= radiusMetres;
}

/**
 * Calculates a bounding box (minLat, maxLat, minLon, maxLon) enclosing a circle
 * of given radius around a central point, ideal for database indexed pre-filtering.
 *
 * @param {number} lat - Center latitude in decimal degrees.
 * @param {number} lon - Center longitude in decimal degrees.
 * @param {number} radiusMetres - Radius in metres.
 * @returns {{ minLat: number, maxLat: number, minLon: number, maxLon: number }} Bounding box coordinates.
 */
function getBoundingBox(lat, lon, radiusMetres) {
  const deltaLat = toDegrees(radiusMetres / EARTH_RADIUS_METRES);
  const minLat = Math.max(-90, lat - deltaLat);
  const maxLat = Math.min(90, lat + deltaLat);

  // Compensate for converging meridians near the poles
  const latRad = toRadians(lat);
  const cosLat = Math.cos(latRad);
  let deltaLon;

  if (Math.abs(cosLat) < 1e-9) {
    // At or very close to poles, include all longitudes
    deltaLon = 180;
  } else {
    deltaLon = toDegrees(radiusMetres / (EARTH_RADIUS_METRES * cosLat));
  }

  let minLon = lon - deltaLon;
  let maxLon = lon + deltaLon;

  // Clamp longitude bounds
  if (minLon < -180) minLon = -180;
  if (maxLon > 180) maxLon = 180;

  return {
    minLat: parseFloat(minLat.toFixed(7)),
    maxLat: parseFloat(maxLat.toFixed(7)),
    minLon: parseFloat(minLon.toFixed(7)),
    maxLon: parseFloat(maxLon.toFixed(7))
  };
}

module.exports = {
  EARTH_RADIUS_METRES,
  haversineDistance,
  isInsideGeofence,
  getBoundingBox
};
