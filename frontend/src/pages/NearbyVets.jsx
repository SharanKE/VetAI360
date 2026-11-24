import { useEffect, useState, useRef, useCallback } from "react";
import {
  Hospital,
  MapPin,
  Navigation,
  PhoneCall,
  Search,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Locate,
  Ambulance,
  Compass,
  Building2,
  ExternalLink,
  ChevronRight,
  Filter,
  Radio,
  Gauge,
  Route as RouteIcon,
  Crosshair,
  ArrowRight,
  Sparkles,
  Layers,
  Map as MapIcon,
  Satellite,
  Info,
} from "lucide-react";
import client from "../api/client";
import { Card, PageHeader, Button } from "../components/ui";

// Popular Quick-Search Location Chips
const POPULAR_LOCATIONS = [
  { label: "🏏 Abdul Kalam Stadium", query: "Abdul Kalam Stadium" },
  { label: "🏫 PESITM Kotegangur", query: "PESITM" },
  { label: "🏥 KVAFSU Teaching Hospital", query: "KVAFSU" },
  { label: "📍 Shivamogga City", query: "Shivamogga" },
  { label: "🌿 Thirthahalli", query: "Thirthahalli" },
  { label: "🏭 Bhadravathi", query: "Bhadravathi" },
  { label: "🌾 Sagar Taluk", query: "Sagar" },
  { label: "🏛️ Bengaluru", query: "Bengaluru" },
  { label: "🌿 Mysuru", query: "Mysuru" },
  { label: "🚜 Hassan", query: "Hassan" },
  { label: "🏰 Chitradurga", query: "Chitradurga" },
];

export default function NearbyVets() {
  // Default coordinates: PESITM / Abdul Kalam Cricket Stadium, Kotegangur, Shivamogga
  const [userCoords, setUserCoords] = useState([13.9785, 75.5265]);
  const [placeLabel, setPlaceLabel] = useState("Abdul Kalam Stadium / Kotegangur, Shivamogga");
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [radiusKm, setRadiusKm] = useState(50);
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [hospitals, setHospitals] = useState([]);
  const [nearest, setNearest] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [gpsError, setGpsError] = useState("");

  // Map display settings: 'roadmap' vs 'hybrid' (satellite)
  const [mapType, setMapType] = useState("roadmap");
  // Focal focus: 'hospital' or 'user'
  const [focusTarget, setFocusTarget] = useState("hospital");

  // Real Road Routing state
  const [roadRoute, setRoadRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showTurnSteps, setShowTurnSteps] = useState(false);

  // Real-Life Continuous GPS Watch Mode
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [liveSpeed, setLiveSpeed] = useState(0); // km/h
  const [liveHeading, setLiveHeading] = useState(null);
  const watchIdRef = useRef(null);

  // Google Maps JS API container ref
  const mapContainerRef = useRef(null);
  const googleMapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [jsApiLoaded, setJsApiLoaded] = useState(false);

  const googleMapsApiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    (typeof window !== "undefined" && window.__GOOGLE_MAPS_API_KEY__) ||
    "";

  // ── 1. Dynamically Load Google Maps JS API if API key is provided ──
  useEffect(() => {
    if (!googleMapsApiKey) return;
    if (window.google && window.google.maps) {
      setJsApiLoaded(true);
      return;
    }

    const scriptId = "google-maps-js-sdk";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=marker&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setJsApiLoaded(true);
    };
    script.onerror = () => {
      console.warn("Failed to load Google Maps JS API script; fallback to interactive Google Maps embed.");
    };
    document.head.appendChild(script);
  }, [googleMapsApiKey]);

  // ── 2. Initialize / Update Google Maps JS Instance when key is present ──
  useEffect(() => {
    if (!jsApiLoaded || !mapContainerRef.current || !window.google?.maps) return;

    const targetLat =
      focusTarget === "hospital" && selectedHospital
        ? selectedHospital.latitude
        : userCoords[0];
    const targetLng =
      focusTarget === "hospital" && selectedHospital
        ? selectedHospital.longitude
        : userCoords[1];

    if (!googleMapInstanceRef.current) {
      try {
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: { lat: targetLat, lng: targetLng },
          zoom: 13,
          mapId: "DEMO_MAP_ID",
          internalUsageAttributionIds: ["gmp_git_agentskills_v1"],
          mapTypeId: mapType === "hybrid" ? window.google.maps.MapTypeId.HYBRID : window.google.maps.MapTypeId.ROADMAP,
          fullscreenControl: true,
          streetViewControl: true,
          zoomControl: true,
          mapTypeControl: false,
        });
        googleMapInstanceRef.current = map;
      } catch (err) {
        console.warn("Error initializing Google Maps JS instance:", err);
      }
    } else {
      const map = googleMapInstanceRef.current;
      map.setCenter({ lat: targetLat, lng: targetLng });
      map.setMapTypeId(
        mapType === "hybrid"
          ? window.google.maps.MapTypeId.HYBRID
          : window.google.maps.MapTypeId.ROADMAP
      );
    }

    // Refresh Advanced Markers
    renderGoogleMarkers();
  }, [jsApiLoaded, mapType, focusTarget, selectedHospital, userCoords, hospitals]);

  // Render Advanced Markers on Google Maps JS instance
  const renderGoogleMarkers = useCallback(() => {
    const map = googleMapInstanceRef.current;
    if (!map || !window.google?.maps?.marker) return;

    // Clear previous markers
    markersRef.current.forEach((m) => {
      if (m.setMap) m.setMap(null);
      else if (m.map) m.map = null;
    });
    markersRef.current = [];

    const { AdvancedMarkerElement, PinElement } = window.google.maps.marker;

    // User Location Marker
    try {
      const userPin = new PinElement({
        background: "#2563EB",
        borderColor: "#FFFFFF",
        glyphColor: "#FFFFFF",
        scale: 1.15,
      });

      const userMarker = new AdvancedMarkerElement({
        map,
        position: { lat: userCoords[0], lng: userCoords[1] },
        title: "Your Location: " + placeLabel,
        content: userPin.element || userPin,
      });

      const userInfowindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 6px; font-family: system-ui, sans-serif; font-size: 12px;">
            <b style="color: #1D4ED8;">📍 Your Current Position</b><br/>
            <span style="color: #4B5563;">${placeLabel}</span>
          </div>
        `,
      });
      userMarker.addListener("click", () => {
        userInfowindow.open({ anchor: userMarker, map });
      });

      markersRef.current.push(userMarker);
    } catch (e) {
      console.warn("AdvancedMarkerElement for user location failed:", e);
    }

    // Hospital Markers
    hospitals.forEach((h) => {
      try {
        const isNearest = nearest && h.id === nearest.id;
        const isSelected = selectedHospital && h.id === selectedHospital.id;
        const isEmergency = h.isEmergency24x7;

        const pinColor = isNearest ? "#D97706" : isEmergency ? "#DC2626" : "#059669";
        const pinGlyph = isEmergency ? "🏥" : "🐾";

        const pin = new PinElement({
          background: pinColor,
          borderColor: isSelected ? "#FBBF24" : "#FFFFFF",
          glyph: pinGlyph,
          scale: isSelected || isNearest ? 1.25 : 1.0,
        });

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: h.latitude, lng: h.longitude },
          title: h.name,
          content: pin.element || pin,
        });

        const navUrl = `https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${encodeURIComponent(h.name + ", " + h.address)}&travelmode=driving`;

        const info = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: system-ui, sans-serif; max-width: 250px;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: ${pinColor}; margin-bottom: 2px;">
                ${isNearest ? "⭐ Closest Facility" : isEmergency ? "🚨 24/7 Emergency" : h.type}
              </div>
              <h4 style="font-size: 13px; font-weight: 700; margin: 0 0 4px; color: #111827;">${h.name}</h4>
              <p style="font-size: 11px; color: #4B5563; margin: 0 0 6px;">${h.address}</p>
              <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 4px 6px; border-radius: 6px; font-size: 11px; font-weight: 600; color: #065F46; margin-bottom: 8px;">
                Distance: ${h.distanceKm} km · ${h.estimatedDrive}
              </div>
              <a href="${navUrl}" target="_blank" rel="noreferrer" style="display: block; text-align: center; background: #2563EB; color: white; padding: 6px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: 700;">
                Turn-by-Turn Navigation
              </a>
            </div>
          `,
        });

        marker.addListener("click", () => {
          setSelectedHospital(h);
          info.open({ anchor: marker, map });
        });

        markersRef.current.push(marker);
      } catch (err) {
        console.warn("AdvancedMarkerElement for hospital failed:", err);
      }
    });
  }, [hospitals, nearest, selectedHospital, userCoords, placeLabel]);

  // ── 3. Fetch Hospitals based on coordinates & filters ──
  async function loadHospitals(lat, lng, queryText, radius = radiusKm, filter = filterType) {
    setLoading(true);
    setGpsError("");
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radiusKm: String(radius),
        filterType: filter,
      });
      if (queryText && queryText.trim()) {
        params.append("query", queryText.trim());
      }

      const res = await client.get(`/hospitals/nearby?${params.toString()}`);
      const data = res.data;

      setHospitals(data.hospitals || []);
      setNearest(data.nearest || null);

      if (data.searchLocation && data.searchLocation.placeName) {
        setPlaceLabel(data.searchLocation.placeName);
      } else if (data.userLocation && data.userLocation.placeName) {
        setPlaceLabel(data.userLocation.placeName);
      }

      if (data.hospitals && data.hospitals.length > 0) {
        setSelectedHospital(data.hospitals[0]);
      } else {
        setSelectedHospital(null);
      }
    } catch (err) {
      console.error("Failed to load veterinary hospitals:", err);
      setGpsError("Unable to load veterinary hospitals. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  }

  // ── 4. Fetch Driving Route whenever selectedHospital or userCoords change ──
  useEffect(() => {
    if (!selectedHospital || !userCoords || !userCoords[0] || !userCoords[1]) {
      setRoadRoute(null);
      return;
    }

    let isMounted = true;
    setRouteLoading(true);

    const fromLat = userCoords[0];
    const fromLng = userCoords[1];
    const toLat = selectedHospital.latitude;
    const toLng = selectedHospital.longitude;

    client
      .get(`/hospitals/route?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`)
      .then((res) => {
        if (isMounted) setRoadRoute(res.data);
      })
      .catch(() => {
        if (isMounted) {
          setRoadRoute({
            status: "estimated",
            distanceKm: selectedHospital.distanceKm,
            durationMins: Math.round(selectedHospital.distanceKm * 2.2),
            summary: "Estimated Direct Route",
            steps: [
              {
                instruction: `Proceed towards ${selectedHospital.name}`,
                distanceKm: selectedHospital.distanceKm,
                distanceMeters: Math.round(selectedHospital.distanceKm * 1000),
              },
              { instruction: "Arrive at veterinary hospital", distanceKm: 0, distanceMeters: 0 },
            ],
          });
        }
      })
      .finally(() => {
        if (isMounted) setRouteLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedHospital, userCoords[0], userCoords[1]]);

  // ── 5. Single-Shot GPS Detection ──
  function handleDetectLiveGps() {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    setIsDetectingGps(true);
    setGpsError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords([latitude, longitude]);
        setPlaceLabel("Your Live GPS Location");
        setSearchQuery("");
        setIsDetectingGps(false);
        loadHospitals(latitude, longitude, "", radiusKm, filterType);
      },
      (error) => {
        setIsDetectingGps(false);
        console.warn("Geolocation error:", error);
        if (error.code === 1) {
          setGpsError("Location access denied. Using Abdul Kalam Stadium / Shivamogga coordinates.");
        } else {
          setGpsError("Could not retrieve GPS position. Using Shivamogga coordinates.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // ── 6. Continuous Real-Life Watch Mode ──
  function toggleLiveTracking() {
    if (isLiveTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsLiveTracking(false);
      setLiveSpeed(0);
      setLiveHeading(null);
    } else {
      if (!navigator.geolocation) {
        setGpsError("Geolocation is not supported by your browser.");
        return;
      }
      setIsLiveTracking(true);
      setGpsError("");

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, speed, heading } = pos.coords;
          setUserCoords([latitude, longitude]);
          if (speed !== null && !isNaN(speed)) {
            setLiveSpeed(Math.round(speed * 3.6)); // m/s to km/h
          }
          if (heading !== null && !isNaN(heading)) {
            setLiveHeading(Math.round(heading));
          }
        },
        (err) => {
          console.warn("Watch position error:", err);
          setGpsError("Live GPS watch interrupted: " + err.message);
          setIsLiveTracking(false);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
      );
    }
  }

  // Clean up GPS watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Initial load
  useEffect(() => {
    loadHospitals(userCoords[0], userCoords[1], searchQuery, radiusKm, filterType);
  }, []);

  // Quick Location Select
  function handleQuickLocationSelect(query) {
    setSearchQuery(query);
    loadHospitals(userCoords[0], userCoords[1], query, radiusKm, filterType);
  }

  // Handle Search Submit
  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    loadHospitals(userCoords[0], userCoords[1], searchQuery.trim(), radiusKm, filterType);
  }

  // Target coordinates for map display
  const targetHospitalLat = selectedHospital ? selectedHospital.latitude : userCoords[0];
  const targetHospitalLng = selectedHospital ? selectedHospital.longitude : userCoords[1];

  // Active Google Maps Direct Turn-by-Turn Navigation URL
  const activeGoogleMapsNavUrl = selectedHospital
    ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${encodeURIComponent(selectedHospital.name + ", " + selectedHospital.address)}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=Veterinary+Hospital+near+${userCoords[0]},${userCoords[1]}`;

  // Interactive Google Maps Embed URL (Works out-of-the-box with zero auth & high precision)
  const embedMapTypeParam = mapType === "hybrid" ? "k" : "m";
  const embedCenterLat = focusTarget === "hospital" && selectedHospital ? targetHospitalLat : userCoords[0];
  const embedCenterLng = focusTarget === "hospital" && selectedHospital ? targetHospitalLng : userCoords[1];
  const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${embedCenterLat},${embedCenterLng}&t=${embedMapTypeParam}&z=14&output=embed`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="Veterinary Hospitals & Emergency Care"
        subtitle="Real-time Google Maps navigation to verified government polyclinics, university teaching hospitals, and 24/7 livestock care centres"
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-800 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Google Maps Powered
          </span>
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              variant={isLiveTracking ? "primary" : "secondary"}
              size="sm"
              onClick={toggleLiveTracking}
              className={`flex items-center gap-1.5 text-xs font-semibold ${
                isLiveTracking
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
                  : ""
              }`}
            >
              <Radio size={14} className={isLiveTracking ? "animate-spin" : ""} />
              {isLiveTracking ? `Live GPS: ${liveSpeed} km/h` : "Start Live GPS"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDetectLiveGps}
              disabled={isDetectingGps}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <Locate size={14} className={isDetectingGps ? "animate-spin text-pasture-600" : ""} />
              {isDetectingGps ? "Detecting GPS…" : "Locate Me"}
            </Button>
          </div>
        }
      />

      {/* ── Search, Radius, & Filter Controls ── */}
      <Card className="p-4 space-y-3.5 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search town, landmark, college (e.g. Kotegangur, PESITM, Shivamogga, KVAFSU)…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-9 pr-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:border-pasture-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pasture-500 transition"
              />
            </div>
            <Button type="submit" size="sm" className="text-xs font-semibold px-4">
              Search
            </Button>
          </form>

          {/* Radius Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Radius:</span>
            <select
              value={radiusKm}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRadiusKm(val);
                loadHospitals(userCoords[0], userCoords[1], searchQuery, val, filterType);
              }}
              className="rounded-lg border border-gray-200 bg-white py-2 px-3 text-xs text-gray-700 focus:border-pasture-500 focus:outline-none"
            >
              <option value="15">Within 15 km</option>
              <option value="30">Within 30 km</option>
              <option value="50">Within 50 km</option>
              <option value="100">Within 100 km</option>
              <option value="250">Within 250 km (Statewide)</option>
            </select>
          </div>
        </div>

        {/* Quick Location Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
          <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap mr-1">
            Quick Locations:
          </span>
          {POPULAR_LOCATIONS.map((loc) => (
            <button
              key={loc.query}
              type="button"
              onClick={() => handleQuickLocationSelect(loc.query)}
              className="rounded-lg border border-gray-200 bg-gray-50/70 hover:bg-pasture-50 hover:border-pasture-300 hover:text-pasture-800 px-2.5 py-1 text-[11px] font-medium text-gray-700 whitespace-nowrap transition"
            >
              {loc.label}
            </button>
          ))}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
          <span className="text-gray-400 font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider mr-1">
            <Filter size={12} /> Filter:
          </span>
          {[
            { id: "all", label: "All Veterinary Centers" },
            { id: "emergency", label: "🚨 24/7 Emergency Active" },
            { id: "govt", label: "🏛️ Government & University Polyclinics" },
            { id: "cattle", label: "🐄 Large Animal & Cattle Specialists" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => {
                setFilterType(pill.id);
                loadHospitals(userCoords[0], userCoords[1], searchQuery, radiusKm, pill.id);
              }}
              className={`rounded-full px-3 py-1 font-medium transition ${
                filterType === pill.id
                  ? "bg-pasture-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {pill.label}
            </button>
          ))}

          {/* Location indicator */}
          <span className="ml-auto text-[11px] font-medium text-gray-500 flex items-center gap-1">
            <MapPin size={12} className="text-pasture-600" /> Center: {placeLabel}
          </span>
        </div>

        {gpsError && (
          <p className="text-xs text-alertred font-medium flex items-center gap-1 pt-1">
            <AlertTriangle size={13} /> {gpsError}
          </p>
        )}
      </Card>

      {/* ── Main Layout: Map & Hospital Directory ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left Map Canvas (7 cols on Desktop) ── */}
        <div className="lg:col-span-7 space-y-3">
          <Card className="p-0 overflow-hidden shadow-md border border-gray-200 relative">
            {/* Map Controls Header Bar */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/90 px-3.5 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white text-[10px] font-black">
                    G
                  </span>
                  Google Maps
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-[11px] text-gray-500 font-medium truncate max-w-[200px]">
                  {selectedHospital ? selectedHospital.name : placeLabel}
                </span>
              </div>

              {/* View & Layer Toggles */}
              <div className="flex items-center gap-1.5">
                {/* Focus toggle */}
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setFocusTarget("hospital")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      focusTarget === "hospital"
                        ? "bg-pasture-700 text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Hospital
                  </button>
                  <button
                    type="button"
                    onClick={() => setFocusTarget("user")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      focusTarget === "user"
                        ? "bg-pasture-700 text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    My GPS
                  </button>
                </div>

                {/* Map Type toggle (Roadmap vs Satellite) */}
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setMapType("roadmap")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      mapType === "roadmap"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <MapIcon size={11} /> Road
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapType("hybrid")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      mapType === "hybrid"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Satellite size={11} /> Satellite
                  </button>
                </div>
              </div>
            </div>

            {/* Google Maps Container */}
            <div className="h-[580px] w-full relative bg-gray-100">
              {jsApiLoaded ? (
                // Google Maps JavaScript API Native Canvas
                <div ref={mapContainerRef} className="h-full w-full" />
              ) : (
                // Interactive Google Maps Embed (Zero-config, high-reliability, no grey tiles)
                <iframe
                  title="Google Maps Veterinary Hospital View"
                  src={googleMapsEmbedUrl}
                  className="h-full w-full border-0"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              )}

              {/* Floating Live Navigation & Route Overlay on Map */}
              {selectedHospital && (
                <div className="absolute bottom-3 left-3 right-3 z-20 rounded-2xl border border-white/90 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                        <Navigation size={22} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-extrabold text-blue-700">
                            {selectedHospital.distanceKm} km
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs font-bold text-emerald-700">
                            ~{selectedHospital.estimatedDrive}
                          </span>
                          {selectedHospital.isEmergency24x7 && (
                            <span className="rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[9px] font-extrabold uppercase text-red-700">
                              24/7 Emergency
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-gray-900 truncate mt-0.5">
                          {selectedHospital.name}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {selectedHospital.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={`tel:${selectedHospital.phone}`}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 px-3 py-2 text-xs font-bold text-gray-800 shadow-sm transition"
                      >
                        <PhoneCall size={13} className="text-emerald-600" />
                        <span>Call</span>
                      </a>
                      <a
                        href={activeGoogleMapsNavUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md transition"
                      >
                        <Navigation size={14} />
                        <span>Navigate in Google Maps</span>
                        <ExternalLink size={12} className="opacity-80" />
                      </a>
                    </div>
                  </div>

                  {/* Route Steps Summary Toggle */}
                  {roadRoute && (
                    <div className="mt-2.5 border-t border-gray-100 pt-2 flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 font-medium">
                        Route: <strong className="text-gray-700">{roadRoute.summary || "Google Direct Path"}</strong>
                      </span>
                      {roadRoute.steps && roadRoute.steps.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowTurnSteps(!showTurnSteps)}
                          className="text-blue-600 font-bold hover:underline"
                        >
                          {showTurnSteps ? "Hide Turn Steps" : `View ${roadRoute.steps.length} Steps`}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Turn-by-Turn Steps Dropdown */}
                  {showTurnSteps && roadRoute?.steps && roadRoute.steps.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto border-t border-gray-100 pt-2 space-y-1.5 scrollbar-thin">
                      {roadRoute.steps.map((st, i) => (
                        <div
                          key={i}
                          className="flex items-start justify-between text-[11px] py-1 border-b border-gray-50"
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-[10px] font-bold text-gray-400 mt-0.5">
                              {i + 1}.
                            </span>
                            <span className="text-gray-800 font-medium">{st.instruction}</span>
                          </div>
                          <span className="font-mono text-[10px] text-gray-500 font-semibold whitespace-nowrap ml-2">
                            {st.distanceKm > 0 ? `${st.distanceKm} km` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Right Hospital List (5 cols on Desktop) ── */}
        <div className="lg:col-span-5 space-y-3">
          {/* Nearest Facility Highlight Card */}
          {nearest && (
            <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 p-4 shadow-md">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-900 border border-amber-300">
                  <Sparkles size={11} className="text-amber-600" /> Closest Veterinary Center to You
                </span>
                <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">
                  {nearest.distanceKm} km away
                </span>
              </div>

              <h3 className="mt-2 font-display text-base font-bold text-gray-900">{nearest.name}</h3>
              <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                {nearest.address}
              </p>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {nearest.facilities.slice(0, 3).map((f) => (
                  <span
                    key={f}
                    className="rounded bg-white/80 border border-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-700"
                  >
                    ✓ {f}
                  </span>
                ))}
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${nearest.latitude},${nearest.longitude}&travelmode=driving`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-bold text-white shadow-sm transition"
                >
                  <Navigation size={13} /> Turn-by-Turn GPS
                </a>
                <a
                  href={`tel:${nearest.phone}`}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 py-2.5 text-xs font-bold text-gray-800 shadow-sm transition"
                >
                  <PhoneCall size={13} /> Call Doctor
                </a>
              </div>
            </div>
          )}

          {/* List of All Ranked Hospitals */}
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Ranked Veterinary Facilities ({hospitals.length} Found)
            </p>

            {loading ? (
              <div className="py-12 text-center text-xs text-gray-400">
                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-pasture-600 border-t-transparent mb-2" />
                <p>Finding closest veterinary hospitals & dispensaries…</p>
              </div>
            ) : hospitals.length === 0 ? (
              <div className="py-10 text-center rounded-xl border border-dashed border-gray-200 p-6">
                <Building2 size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="font-semibold text-xs text-gray-700">No hospitals found within {radiusKm} km</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Try expanding the search radius or clicking one of the location chips above.
                </p>
              </div>
            ) : (
              hospitals.map((hospital) => {
                const isSelected = selectedHospital && selectedHospital.id === hospital.id;

                return (
                  <div
                    key={hospital.id}
                    onClick={() => {
                      setSelectedHospital(hospital);
                      setFocusTarget("hospital");
                    }}
                    className={`cursor-pointer rounded-xl border p-3.5 transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/60 shadow-md ring-1 ring-blue-400"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                              hospital.isEmergency24x7
                                ? "bg-red-100 text-alertred"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {hospital.isEmergency24x7 ? "24/7 Emergency" : "Day OPD"}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {hospital.type}
                          </span>
                        </div>
                        <h4 className="font-bold text-ink text-xs mt-1 truncate">{hospital.name}</h4>
                      </div>

                      {/* Distance pill */}
                      <div className="text-right flex-shrink-0">
                        <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-700 font-mono">
                          {hospital.distanceKm} km
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          ~{hospital.estimatedDrive} · {hospital.bearing}
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-500 mt-2 line-clamp-1 flex items-center gap-1">
                      <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                      {hospital.address}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Clock size={11} /> {hospital.timings}
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${hospital.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-600 hover:text-pasture-700 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <PhoneCall size={11} /> Call
                        </a>
                        <a
                          href={hospital.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${encodeURIComponent(hospital.name + ", " + hospital.address)}&travelmode=driving`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 shadow-sm"
                        >
                          <Navigation size={10} /> Google Maps
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
