const express = require("express");
const {
  findNearbyHospitals,
  geocodeLocationQuery,
  VERIFIED_HOSPITALS,
} = require("../services/hospitalLocator");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Allow authenticated users (farmers, vets, admins) to look up hospitals
router.use(authenticate);

/**
 * GET /api/hospitals/nearby
 * Query Params:
 *  - lat: latitude (number)
 *  - lng: longitude (number)
 *  - radiusKm: search radius in km (default 50)
 *  - filterType: 'all' | 'emergency' | 'govt' | 'cattle'
 *  - query: optional text search for city/village/landmark (e.g. "Shimoga", "Hebbal")
 */
router.get("/nearby", async (req, res) => {
  try {
    let { lat, lng, radiusKm = 50, filterType = "all", query } = req.query;

    let placeName = null;
    if (query && query.trim()) {
      const geo = await geocodeLocationQuery(query.trim());
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        placeName = geo.name;
      }
    }

    // Default to Shimoga / PESITM region if coordinates not provided
    const targetLat = lat !== undefined && lat !== "" ? parseFloat(lat) : 13.9299;
    const targetLng = lng !== undefined && lng !== "" ? parseFloat(lng) : 75.5681;

    const data = await findNearbyHospitals({
      lat: targetLat,
      lng: targetLng,
      radiusKm: parseFloat(radiusKm) || 50,
      filterType: filterType || "all",
    });

    if (placeName) {
      data.userLocation.placeName = placeName;
    }

    res.json(data);
  } catch (err) {
    console.error("Error finding nearby veterinary hospitals:", err);
    res.status(500).json({ error: "Failed to locate nearby veterinary hospitals." });
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
