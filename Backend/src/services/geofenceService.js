// Backend/src/services/geofenceService.js
import pool from "../config/database.js";

/**
 * Calculates Great-Circle distance between two coordinates in meters (Haversine formula).
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371e3; // Earth radius in meters
  const phi1 = (Number(lat1) * Math.PI) / 180;
  const phi2 = (Number(lat2) * Math.PI) / 180;
  const deltaPhi = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const deltaLambda = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export const geofenceService = {
  /**
   * Evaluates if given coordinate is within any active company office geofence radius.
   */
  async evaluateLocation(latitude, longitude) {
    const res = await pool.query(
      `SELECT * FROM office_geofences WHERE is_active = true ORDER BY id ASC`
    );
    const geofences = res.rows;

    if (geofences.length === 0) {
      return {
        isCompliant: true,
        nearestGeofence: null,
        distanceMeters: 0,
        workMode: "OFFICE",
      };
    }

    let nearest = null;
    let minDistance = Infinity;

    for (const geo of geofences) {
      const dist = calculateDistanceMeters(latitude, longitude, geo.latitude, geo.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = geo;
      }
    }

    const isCompliant = nearest && minDistance <= nearest.radius_meters;

    return {
      isCompliant,
      nearestGeofence: nearest,
      distanceMeters: minDistance,
      workMode: isCompliant ? "OFFICE" : "REMOTE",
    };
  },
};

export default geofenceService;
