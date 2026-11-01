import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
} from "lucide-react";
import client from "../api/client";
import { Card, PageHeader, Button } from "../components/ui";

// Custom Leaflet Pin for User Location with Radar Pulse
function createUserIcon(isLiveTracking) {
  const pulseClass = isLiveTracking ? "radar-live-pulse" : "";
  return L.divIcon({
    className: "custom-user-pin",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="position: relative; width: 36px; height: 36px; border-radius: 50%; background: #2563EB; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(37,99,235,0.6); border: 2.5px solid white;">
          <span style="font-size: 17px;">📍</span>
          <span style="position: absolute; inset: -4px; border-radius: 50%; border: 2px solid #3B82F6; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          ${isLiveTracking ? '<span style="position: absolute; inset: -10px; border-radius: 50%; border: 1.5px dashed #22C55E; animation: spin 4s linear infinite;"></span>' : ''}
        </div>
        <div style="margin-top: 3px; background: rgba(17, 24, 39, 0.95); color: white; padding: 2px 7px; border-radius: 6px; font-size: 10px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2);">
          ${isLiveTracking ? "🟢 Live Tracking" : "You Are Here"}
        </div>
      </div>
    `,
    iconSize: [40, 56],
    iconAnchor: [20, 46],
    popupAnchor: [0, -46],
  });
}

// Custom Leaflet Pin for Veterinary Hospitals
function createHospitalIcon(isNearest, isEmergency, isSelected) {
  const bgGradient = isNearest
    ? "linear-gradient(135deg, #F59E0B, #D97706)"
    : isEmergency
    ? "linear-gradient(135deg, #DC2626, #B91C1C)"
    : "linear-gradient(135deg, #059669, #047857)";
  const iconEmoji = isEmergency ? "🏥" : "🐾";
  const size = isSelected || isNearest ? 42 : 35;

  return L.divIcon({
    className: "custom-hospital-pin",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: ${bgGradient}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.4); border: 2.5px solid white; transition: transform 0.2s;">
          <span style="font-size: ${size > 36 ? "19px" : "16px"};">${iconEmoji}</span>
          ${
            isNearest
              ? '<span style="position: absolute; top: -6px; right: -6px; background: #FEF08A; color: #854D0E; font-size: 9px; font-weight: 900; border-radius: 9999px; padding: 1px 5px; border: 1.5px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.2);">NEAREST</span>'
              : ""
          }
        </div>
      </div>
    `,
    iconSize: [size, size + 16],
    iconAnchor: [size / 2, size + 10],
    popupAnchor: [0, -size - 10],
  });
}

// Map View Adjuster Helper
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

export default function NearbyVets() {
  // Coordinates default to PESITM / Abdul Kalam Cricket Stadium, Kotegangur
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

  // Real Road Routing state from OSRM
  const [roadRoute, setRoadRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showTurnSteps, setShowTurnSteps] = useState(false);

  // Real-Life Monitoring (Continuous GPS Watch Mode)
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [liveSpeed, setLiveSpeed] = useState(0); // km/h
  const [liveHeading, setLiveHeading] = useState(null);
  const watchIdRef = useRef(null);

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

  // Fetch Hospitals based on coordinates & filters
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

  // Fetch Real Road Driving Route whenever selectedHospital or userCoords change
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

    // Fast OSRM Road Routing API
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;

    fetch(osrmUrl)
      .then((r) => r.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.code === "Ok" && data.routes && data.routes[0]) {
          const r = data.routes[0];
          const coordinates = r.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
          const distanceKm = +(r.distance / 1000).toFixed(1);
          const durationMins = Math.max(1, Math.round(r.duration / 60));

          const steps = (r.legs[0]?.steps || [])
            .map((s) => {
              let instruction = "";
              const modifier = s.maneuver.modifier ? ` ${s.maneuver.modifier}` : "";
              if (s.maneuver.type === "depart") instruction = "Start out from your position";
              else if (s.maneuver.type === "arrive") instruction = `Arrive at ${selectedHospital.name}`;
              else if (s.maneuver.type === "roundabout") instruction = `Enter roundabout and take exit${modifier}`;
              else instruction = `${s.maneuver.type}${modifier}`;

              if (s.name) instruction += ` onto ${s.name}`;

              return {
                instruction: instruction.charAt(0).toUpperCase() + instruction.slice(1),
                distanceKm: +(s.distance / 1000).toFixed(2),
                distanceMeters: Math.round(s.distance),
                durationSec: Math.round(s.duration),
              };
            })
            .filter((s) => s.distanceMeters > 0 || s.instruction.includes("Arrive"));

          setRoadRoute({
            status: "success",
            coordinates,
            distanceKm,
            durationMins,
            summary: r.legs[0]?.summary || "Direct Driving Road",
            steps,
          });
        } else {
          fallbackBackendRoute();
        }
      })
      .catch(() => {
        fallbackBackendRoute();
      })
      .finally(() => {
        if (isMounted) setRouteLoading(false);
      });

    function fallbackBackendRoute() {
      client
        .get(`/hospitals/route?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`)
        .then((res) => {
          if (isMounted) setRoadRoute(res.data);
        })
        .catch(() => {
          if (isMounted) {
            setRoadRoute({
              status: "fallback",
              coordinates: [userCoords, [toLat, toLng]],
              distanceKm: selectedHospital.distanceKm,
              durationMins: Math.round(selectedHospital.distanceKm * 2.2),
              summary: "Direct Distance Line",
              steps: [
                { instruction: "Proceed towards hospital", distanceKm: selectedHospital.distanceKm, distanceMeters: Math.round(selectedHospital.distanceKm * 1000) },
                { instruction: "Arrive at veterinary hospital", distanceKm: 0, distanceMeters: 0 }
              ],
            });
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [selectedHospital, userCoords[0], userCoords[1]]);

  // Single-Shot GPS Detection
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
        let msg = "Could not access location. Please allow location access or choose a city below.";
        if (error.code === 1) msg = "Location permission denied. Please search your city or taluk below.";
        setGpsError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  }

  // Real-Life Continuous GPS Monitoring Toggle (watchPosition)
  function toggleLiveMonitoring() {
    if (isLiveTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsLiveTracking(false);
    } else {
      if (!navigator.geolocation) {
        setGpsError("Geolocation is not supported by your device.");
        return;
      }
      setIsLiveTracking(true);
      setGpsError("");

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, speed, heading } = pos.coords;
          setUserCoords([latitude, longitude]);
          setPlaceLabel("Live GPS Telemetry Active");
          if (speed !== null && speed !== undefined && speed >= 0) {
            setLiveSpeed(Math.round(speed * 3.6)); // convert m/s to km/h
          }
          if (heading !== null && heading !== undefined) {
            setLiveHeading(Math.round(heading));
          }
        },
        (err) => {
          console.warn("Live tracking watchPosition error:", err);
          setGpsError("Live GPS signal weak. Continuing with last recorded location.");
        },
        { enableHighAccuracy: true, maximumAge: 1500, timeout: 15000 }
      );
    }
  }

  // Cleanup watchPosition on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Handle City / Area / Hospital Search
  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    loadHospitals(userCoords[0], userCoords[1], searchQuery.trim(), radiusKm, filterType);
  }

  function handleQuickLocationSelect(q) {
    setSearchQuery(q);
    loadHospitals(userCoords[0], userCoords[1], q, radiusKm, filterType);
  }

  // Initial Load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords([lat, lng]);
          setPlaceLabel("Your Live GPS Location");
          loadHospitals(lat, lng, "");
        },
        () => {
          // Fallback to default Shivamogga/PESITM region
          loadHospitals(userCoords[0], userCoords[1], "");
        },
        { timeout: 5000 }
      );
    } else {
      loadHospitals(userCoords[0], userCoords[1], "");
    }
  }, []);

  // Direct Google Maps Driving Directions URL (using exact hospital name and address to prevent Google Maps from guessing nearby houses or parlours)
  const activeGoogleMapsUrl = selectedHospital
    ? (selectedHospital.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${encodeURIComponent(selectedHospital.name + ", " + selectedHospital.address)}&travelmode=driving`)
    : "";

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <PageHeader
        title="Nearest Veterinary Hospitals & Emergency Care"
        subtitle="Locate verified government veterinary polyclinics, university hospitals, and 24/7 cattle emergency centers with real driving road navigation."
        action={
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleLiveMonitoring}
              variant={isLiveTracking ? "secondary" : "secondary"}
              className={`flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm ${
                isLiveTracking
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                  : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
              }`}
            >
              <Radio size={15} className={isLiveTracking ? "animate-pulse text-white" : "text-emerald-600"} />
              <span>{isLiveTracking ? "📡 Live Tracking ON" : "Start Live Monitoring"}</span>
            </Button>

            <Button
              onClick={handleDetectLiveGps}
              disabled={isDetectingGps}
              className="flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Locate size={15} className={isDetectingGps ? "animate-spin" : ""} />
              <span>{isDetectingGps ? "Detecting GPS…" : "📍 My Live GPS"}</span>
            </Button>
          </div>
        }
      />

      {/* ── Live Monitoring Telemetry Bar (Active when tracking is on) ── */}
      {isLiveTracking && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 shadow-sm text-emerald-900 text-xs animate-fade-in">
          <div className="flex items-center gap-2.5 font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <span>Real-Life GPS Telemetry Active</span>
            <span className="text-gray-400">|</span>
            <span className="flex items-center gap-1 text-gray-700 font-mono">
              <Gauge size={13} className="text-emerald-700" /> Speed: {liveSpeed} km/h
            </span>
            {liveHeading !== null && (
              <span className="flex items-center gap-1 text-gray-700 font-mono">
                <Compass size={13} className="text-emerald-700" /> Heading: {liveHeading}°
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium text-emerald-800">
            Dynamically recalculating road route as you move
          </span>
        </div>
      )}

      {/* ── 24/7 Animal Emergency Helpline Banner (1962) ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-alertred text-white shadow-md">
            <Ambulance size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-alertred px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                24/7 National Emergency
              </span>
              <p className="font-display font-bold text-gray-900 text-sm">
                Mobile Veterinary Hospital & Ambulance Helpline
              </p>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Toll-free government emergency animal healthcare for critical livestock emergencies, dystocia/calving, and trauma.
            </p>
          </div>
        </div>
        <a
          href="tel:1962"
          className="flex items-center gap-2 rounded-lg bg-alertred px-4 py-2 text-xs font-bold text-white shadow hover:bg-red-700 transition"
        >
          <PhoneCall size={14} /> Call Emergency Helpline: 1962
        </a>
      </div>

      {/* ── Search & Filter Controls ── */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search city, taluk, village, or hospital name (e.g. PESITM, Shimoga, Hebbal, Bhadravathi, Sagar)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-4 text-xs focus:border-pasture-500 focus:outline-none focus:ring-1 focus:ring-pasture-500"
              />
            </div>
            <Button type="submit" variant="primary" className="py-2.5 text-xs font-bold">
              Find Hospital
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
            <div className="h-[600px] w-full relative">
              <MapContainer
                center={userCoords}
                zoom={12}
                scrollWheelZoom={true}
                className="h-full w-full z-0"
              >
                <ChangeView
                  center={
                    selectedHospital
                      ? [selectedHospital.latitude, selectedHospital.longitude]
                      : userCoords
                  }
                  zoom={12}
                />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* User Location Marker with Live Indicator */}
                <Marker position={userCoords} icon={createUserIcon(isLiveTracking)}>
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold text-xs text-blue-700 flex items-center gap-1">
                        📍 Your Current Position
                      </p>
                      <p className="text-[11px] text-gray-600 mt-0.5">{placeLabel}</p>
                      {isLiveTracking && (
                        <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                          🟢 Live Tracking: {liveSpeed} km/h
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>

                {/* Radius Coverage Circle */}
                <Circle
                  center={userCoords}
                  radius={radiusKm * 1000}
                  pathOptions={{
                    color: "#2563EB",
                    fillColor: "#3B82F6",
                    fillOpacity: 0.04,
                    weight: 1.5,
                    dashArray: "4, 6",
                  }}
                />

                {/* Real Road Driving Route Polyline from OSRM */}
                {roadRoute && roadRoute.coordinates && roadRoute.coordinates.length > 0 && (
                  <>
                    {/* Outer Road Glow / Halo */}
                    <Polyline
                      positions={roadRoute.coordinates}
                      pathOptions={{
                        color: "#2563EB",
                        weight: 7,
                        opacity: 0.35,
                        lineCap: "round",
                        lineJoin: "round",
                      }}
                    />
                    {/* Inner Crisp High-Visibility Road Line */}
                    <Polyline
                      positions={roadRoute.coordinates}
                      pathOptions={{
                        color: "#1D4ED8",
                        weight: 4,
                        opacity: 0.95,
                        lineCap: "round",
                        lineJoin: "round",
                      }}
                    />
                  </>
                )}

                {/* Hospital Markers */}
                {hospitals.map((hospital, idx) => {
                  const isNearestHospital = nearest && hospital.id === nearest.id;
                  const isSelected = selectedHospital && hospital.id === selectedHospital.id;

                  return (
                    <Marker
                      key={hospital.id || idx}
                      position={[hospital.latitude, hospital.longitude]}
                      icon={createHospitalIcon(isNearestHospital, hospital.isEmergency24x7, isSelected)}
                      eventHandlers={{
                        click: () => {
                          setSelectedHospital(hospital);
                        },
                      }}
                    >
                      <Popup>
                        <div className="p-2 space-y-2 min-w-[220px]">
                          <div>
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                              {isNearestHospital ? "⭐ Closest Facility" : hospital.type}
                            </div>
                            <h4 className="font-bold text-ink text-xs mt-0.5">{hospital.name}</h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">{hospital.address}</p>
                          </div>

                          <div className="rounded bg-emerald-50 border border-emerald-200 px-2 py-1 text-emerald-800 text-[11px] font-semibold flex items-center justify-between">
                            <span>Distance: {hospital.distanceKm} km</span>
                            <span>{hospital.estimatedDrive}</span>
                          </div>

                          <div className="pt-2 flex flex-col gap-1 border-t border-gray-100">
                            <a
                              href={hospital.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${encodeURIComponent(hospital.name + ", " + hospital.address)}&travelmode=driving`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-center gap-1 rounded bg-pasture-600 py-1.5 text-xs font-semibold text-white hover:bg-pasture-700 transition"
                            >
                              <Navigation size={12} /> Get Directions
                            </a>
                            <a
                              href={`tel:${hospital.phone}`}
                              className="flex items-center justify-center gap-1 rounded border border-gray-300 bg-white py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                            >
                              <PhoneCall size={12} /> Call: {hospital.phone}
                            </a>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Road Route Floating Overlay on Map */}
              {selectedHospital && roadRoute && (
                <div className="absolute bottom-4 left-4 right-4 z-[400] rounded-xl border border-white/80 bg-white/95 p-3.5 shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pasture-700 text-white shadow-md">
                        <RouteIcon size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-blue-700">
                            {roadRoute.distanceKm} km
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs font-bold text-emerald-700">
                            ~{roadRoute.durationMins} mins drive
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 line-clamp-1">
                          Route to <span className="font-semibold">{selectedHospital.name}</span> ({roadRoute.summary})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {roadRoute.steps && roadRoute.steps.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowTurnSteps(!showTurnSteps)}
                          className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                        >
                          {showTurnSteps ? "Hide Turns" : "View Steps"}
                        </button>
                      )}
                      <a
                        href={activeGoogleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-md transition"
                      >
                        <Navigation size={13} />
                        <span>Google Maps</span>
                      </a>
                    </div>
                  </div>

                  {/* Expandable Turn-by-Turn Road Instructions */}
                  {showTurnSteps && roadRoute.steps && roadRoute.steps.length > 0 && (
                    <div className="mt-3 max-h-48 overflow-y-auto border-t border-gray-100 pt-2.5 space-y-1.5 scrollbar-thin">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Turn-by-Turn Navigation Steps ({roadRoute.steps.length} turns)
                      </p>
                      {roadRoute.steps.map((st, i) => (
                        <div key={i} className="flex items-start justify-between text-xs py-1 border-b border-gray-50">
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-[10px] font-bold text-gray-400 mt-0.5">
                              {i + 1}.
                            </span>
                            <span className="text-gray-800 font-medium">{st.instruction}</span>
                          </div>
                          <span className="font-mono text-[11px] text-gray-500 font-semibold whitespace-nowrap ml-2">
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
          {/* Nearest Facility Card */}
          {nearest && (
            <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 p-4 shadow-md">
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
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-pasture-700 hover:bg-pasture-800 py-2.5 text-xs font-bold text-white shadow-sm transition"
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
                    onClick={() => setSelectedHospital(hospital)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition ${
                      isSelected
                        ? "border-pasture-500 bg-pasture-50/70 shadow-md ring-1 ring-pasture-400"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
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
                        <h4 className="font-bold text-ink text-xs mt-1">{hospital.name}</h4>
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
                          className="flex items-center gap-1 rounded bg-pasture-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-pasture-700 shadow-sm"
                        >
                          <Navigation size={10} /> Directions
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
