const express = require("express");
const {
  findNearbyHospitals,
  getDrivingRoute,
  geocodeLocationQuery,
  VERIFIED_HOSPITALS,
} = require("../services/hospitalLocator");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Allow authenticated users to look up hospitals & routes
router.use(authenticate);

/**
 * GET /api/hospitals/nearby
 * Query Params:
 *  - lat: user latitude
 *  - lng: user longitude
 *  - radiusKm: search radius in km (default 50)
 *  - filterType: 'all' | 'emergency' | 'govt' | 'cattle'
 *  - query: city/town/landmark name OR hospital name
 */
router.get("/nearby", async (req, res) => {
  try {
    let { lat, lng, radiusKm = 50, filterType = "all", query } = req.query;

    const userLat = lat !== undefined && lat !== "" ? parseFloat(lat) : 13.9299;
    const userLng = lng !== undefined && lng !== "" ? parseFloat(lng) : 75.5681;

    let searchLat = userLat;
    let searchLng = userLng;
    let placeName = null;

    if (query && query.trim()) {
      const trimmed = query.trim();
      const geo = await geocodeLocationQuery(trimmed);
      if (geo) {
        searchLat = geo.lat;
        searchLng = geo.lng;
        placeName = geo.name;
      }
    }

    const data = await findNearbyHospitals({
      userLat,
      userLng,
      searchLat,
      searchLng,
      radiusKm: parseFloat(radiusKm) || 50,
      filterType: filterType || "all",
      keyword: query || "",
    });

    if (placeName) {
      data.searchLocation = {
        latitude: searchLat,
        longitude: searchLng,
        placeName,
      };
    }

    res.json(data);
  } catch (err) {
    console.error("Error finding nearby veterinary hospitals:", err);
    res.status(500).json({ error: "Failed to locate nearby veterinary hospitals." });
  }
});

/**
 * GET /api/hospitals/route
 * Returns real road driving directions (OSRM polyline, distance in km, travel time & steps)
 * Query Params:
 *  - fromLat, fromLng: starting coordinates (e.g. user GPS position)
 *  - toLat, toLng: destination coordinates (e.g. veterinary hospital)
 */
router.get("/route", async (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng } = req.query;

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({ error: "fromLat, fromLng, toLat, and toLng are required." });
    }

    const route = await getDrivingRoute(fromLat, fromLng, toLat, toLng);
    if (!route) {
      return res.status(500).json({ error: "Could not calculate driving route." });
    }

    res.json(route);
  } catch (err) {
    console.error("Error getting driving route:", err);
    res.status(500).json({ error: "Failed to get driving route." });
  }
});

/**
 * GET /api/hospitals/all
 * Returns the complete verified hospital database
 */
router.get("/all", (req, res) => {
  res.json({ hospitals: VERIFIED_HOSPITALS, total: VERIFIED_HOSPITALS.length });
});

/**
 * GET /api/hospitals/:id
 */
router.get("/:id", (req, res) => {
  const hospital = VERIFIED_HOSPITALS.find((h) => h.id === req.params.id);
  if (!hospital) {
    return res.status(404).json({ error: "Hospital not found." });
  }
  res.json({ hospital });
});

module.exports = router;
