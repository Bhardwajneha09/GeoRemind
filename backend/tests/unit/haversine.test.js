const {
  haversineDistance,
  isInsideGeofence,
  getBoundingBox,
  EARTH_RADIUS_METRES
} = require('../../utils/haversine');

describe('Haversine Formula Utility Tests', () => {
  describe('haversineDistance', () => {
    test('Same point returns 0 metres', () => {
      const lat = 40.712776;
      const lon = -74.005974;
      const distance = haversineDistance(lat, lon, lat, lon);
      expect(distance).toBe(0);
    });

    test('Calculates known distance between London and Paris accurately (~340-345km)', () => {
      // London (Trafalgar Square)
      const londonLat = 51.5074;
      const londonLon = -0.1278;

      // Paris (Notre-Dame)
      const parisLat = 48.8566;
      const parisLon = 2.3522;

      const distance = haversineDistance(londonLat, londonLon, parisLat, parisLon);

      // Distance is approximately 343.5 km
      expect(distance).toBeGreaterThan(340000);
      expect(distance).toBeLessThan(346000);
    });

    test('Edge case: Antipodal points distance equals half Earth circumference (~20,015 km)', () => {
      // North Pole and South Pole
      const distancePoles = haversineDistance(90, 0, -90, 0);
      const expectedHalfCircumference = Math.PI * EARTH_RADIUS_METRES;

      expect(Math.abs(distancePoles - expectedHalfCircumference)).toBeLessThan(100);

      // Equator opposite longitudes (0, 0) and (0, 180)
      const distanceEquator = haversineDistance(0, 0, 0, 180);
      expect(Math.abs(distanceEquator - expectedHalfCircumference)).toBeLessThan(100);
    });
  });

  describe('isInsideGeofence', () => {
    const centerLat = 51.5007; // Big Ben
    const centerLon = -0.1246;
    const radiusM = 100;

    test('Point inside 100m radius returns true', () => {
      // Coordinates ~25 metres from Big Ben
      const insideLat = 51.5009;
      const insideLon = -0.1246;

      const inside = isInsideGeofence(insideLat, insideLon, centerLat, centerLon, radiusM);
      expect(inside).toBe(true);
    });

    test('Point outside 100m radius returns false', () => {
      // Coordinates ~500 metres from Big Ben
      const outsideLat = 51.5050;
      const outsideLon = -0.1246;

      const inside = isInsideGeofence(outsideLat, outsideLon, centerLat, centerLon, radiusM);
      expect(inside).toBe(false);
    });

    test('Point exactly on radius boundary returns true', () => {
      const distance = haversineDistance(centerLat, centerLon, centerLat, centerLon);
      expect(distance).toBeLessThanOrEqual(radiusM);
      expect(isInsideGeofence(centerLat, centerLon, centerLat, centerLon, radiusM)).toBe(true);
    });
  });

  describe('getBoundingBox', () => {
    test('Generates correct bounding box min/max ranges', () => {
      const lat = 40.7128;
      const lon = -74.0060;
      const radiusM = 1000; // 1 km

      const bbox = getBoundingBox(lat, lon, radiusM);

      expect(bbox).toHaveProperty('minLat');
      expect(bbox).toHaveProperty('maxLat');
      expect(bbox).toHaveProperty('minLon');
      expect(bbox).toHaveProperty('maxLon');

      expect(bbox.minLat).toBeLessThan(lat);
      expect(bbox.maxLat).toBeGreaterThan(lat);
      expect(bbox.minLon).toBeLessThan(lon);
      expect(bbox.maxLon).toBeGreaterThan(lon);

      // Verify that a point 500m north is strictly inside the bounding box
      const pointLat = lat + 0.003;
      expect(pointLat).toBeGreaterThan(bbox.minLat);
      expect(pointLat).toBeLessThan(bbox.maxLat);
    });

    test('Clamps latitude and handles pole boundary condition', () => {
      const nearNorthPole = getBoundingBox(89.99, 0, 50000);
      expect(nearNorthPole.maxLat).toBeLessThanOrEqual(90);

      const nearSouthPole = getBoundingBox(-89.99, 0, 50000);
      expect(nearSouthPole.minLat).toBeGreaterThanOrEqual(-90);
    });
  });
});
