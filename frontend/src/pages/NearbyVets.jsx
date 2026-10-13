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
  Cross,
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
} from "lucide-react";
import client from "../api/client";
import { Card, PageHeader, Button } from "../components/ui";

// Custom Leaflet Pin for User Location
function createUserIcon() {
  return L.divIcon({
    className: "custom-user-pin",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background: #2563EB; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37,99,235,0.5); border: 2.5px solid white;">
          <span style="font-size: 16px;">📍</span>
          <span style="position: absolute; -inset: 4px; border-radius: 50%; border: 2px solid #3B82F6; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        </div>
        <div style="margin-top: 3px; background: rgba(17, 24, 39, 0.9); color: white; padding: 2px 7px; border-radius: 6px; font-size: 10px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
          You Are Here
        </div>
      </div>
    `,
    iconSize: [36, 52],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
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
  const size = isSelected || isNearest ? 40 : 34;

  return L.divIcon({
    className: "custom-hospital-pin",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: ${bgGradient}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.35); border: 2.5px solid white; transition: transform 0.2s;">
          <span style="font-size: ${size > 36 ? "18px" : "15px"};">${iconEmoji}</span>
          ${
            isNearest
              ? '<span style="position: absolute; top: -5px; right: -5px; background: #FEF08A; color: #854D0E; font-size: 9px; font-weight: 900; border-radius: 9999px; padding: 1px 4px; border: 1.5px solid white;">NEAREST</span>'
              : ""
          }
        </div>
      </div>
    `,
    iconSize: [size, size + 14],
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
  // Default coordinates: Shimoga / PESITM region
  const [userCoords, setUserCoords] = useState([13.9299, 75.5681]);
  const [placeLabel, setPlaceLabel] = useState("Shivamogga (Default)");
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [radiusKm, setRadiusKm] = useState(50);
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [hospitals, setHospitals] = useState([]);
  const [nearest, setNearest] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [gpsError, setGpsError] = useState("");

  const listRef = useRef(null);

  // Fetch Hospitals based on current coordinates & filters
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

      if (data.userLocation) {
        setUserCoords([data.userLocation.latitude, data.userLocation.longitude]);
        if (data.userLocation.placeName) {
          setPlaceLabel(data.userLocation.placeName);
        }
      }

      if (data.hospitals && data.hospitals.length > 0) {
        setSelectedHospital(data.hospitals[0]);
      } else {
        setSelectedHospital(null);
      }
    } catch (err) {
      console.error("Failed to load veterinary hospitals:", err);
      setGpsError("Unable to load veterinary hospitals. Please check connection.");
    } finally {
      setLoading(false);
    }
  }

  // Request real-time live browser GPS location
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
        let msg = "Could not access location. Please allow location access or search your city.";
        if (error.code === 1) msg = "Location permission was denied. Please type your city name below.";
        setGpsError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  // Handle City / Area Search
  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    loadHospitals(userCoords[0], userCoords[1], searchQuery.trim(), radiusKm, filterType);
  }

  // Initial Load
  useEffect(() => {
    // Attempt automatic GPS on load; fall back to default Shimoga coordinates gracefully
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
          // Fallback to default
          loadHospitals(userCoords[0], userCoords[1], "");
        },
        { timeout: 6000 }
      );
    } else {
      loadHospitals(userCoords[0], userCoords[1], "");
    }
  }, []);

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <PageHeader
        title="Nearest Veterinary Hospitals & Emergency Care"
        subtitle="Real-world veterinary hospital locator with live GPS navigation, emergency ambulance contact, and cattle care facilities."
        action={
          <Button
            onClick={handleDetectLiveGps}
            disabled={isDetectingGps}
            className="flex items-center gap-2 shadow-sm"
          >
            <Locate size={16} className={isDetectingGps ? "animate-spin" : ""} />
            {isDetectingGps ? "Detecting GPS…" : "📍 Use My Live GPS"}
          </Button>
        }
      />

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
              Government emergency animal healthcare service for critical livestock emergencies, calving, and trauma.
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
                placeholder="Search city, taluk, or village (e.g., Shimoga, Bangalore, Mysore, Mandya, Hassan)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-4 text-xs focus:border-pasture-500 focus:outline-none focus:ring-1 focus:ring-pasture-500"
              />
            </div>
            <Button type="submit" variant="primary" className="py-2.5 text-xs">
              Search Area
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
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
              <option value="100">Within 100 km</option>
              <option value="250">Within 250 km (All)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 text-xs">
          <span className="text-gray-400 font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider mr-1">
            <Filter size={12} /> Filters:
          </span>
          {[
            { id: "all", label: "All Veterinary Centers" },
            { id: "emergency", label: "🚨 24/7 Emergency Only" },
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
            <MapPin size={12} className="text-pasture-600" /> Reference: {placeLabel}
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

                {/* User Location Marker */}
                <Marker position={userCoords} icon={createUserIcon()}>
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold text-xs text-blue-700 flex items-center gap-1">
                        📍 Your Current Position
                      </p>
                      <p className="text-[11px] text-gray-600 mt-0.5">{placeLabel}</p>
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
                    fillOpacity: 0.05,
                    weight: 1.5,
                    dashArray: "4, 6",
                  }}
                />

                {/* Route Line to Selected Hospital */}
                {selectedHospital && (
                  <Polyline
                    positions={[
                      userCoords,
                      [selectedHospital.latitude, selectedHospital.longitude],
                    ]}
                    pathOptions={{
                      color: "#DC2626",
                      weight: 3.5,
                      opacity: 0.8,
                      dashArray: "6, 8",
                    }}
                  />
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
                              href={hospital.googleMapsUrl}
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

              {/* In-Map Info Pill */}
              <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur rounded-lg shadow-md px-3 py-1.5 text-xs border border-gray-200 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-gray-800">{hospitals.length} Veterinary Facilities</span>
                <span className="text-gray-400">within {radiusKm} km</span>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right Hospital Cards List (5 cols on Desktop) ── */}
        <div className="lg:col-span-5 space-y-4" ref={listRef}>
          {/* Featured: Nearest Veterinary Facility */}
          {nearest && (
            <div className="rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-50/70 to-orange-50/40 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-950">
                  ⭐ Closest Veterinary Center to You
                </span>
                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  {nearest.distanceKm} km away ({nearest.estimatedDrive})
                </span>
              </div>

              <div>
                <h3 className="font-display font-bold text-base text-gray-900">{nearest.name}</h3>
                <p className="text-xs text-gray-600 mt-1 flex items-start gap-1">
                  <MapPin size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>{nearest.address}</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-1 text-[11px]">
                {nearest.facilities.slice(0, 3).map((f, i) => (
                  <span
                    key={i}
                    className="rounded bg-white/80 border border-amber-200 px-2 py-0.5 text-gray-700"
                  >
                    ✓ {f}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={nearest.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-pasture-700 hover:bg-pasture-800 py-2 text-xs font-bold text-white shadow-sm transition"
                >
                  <Navigation size={13} /> Turn-by-Turn GPS
                </a>
                <a
                  href={`tel:${nearest.phone}`}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 py-2 text-xs font-bold text-gray-800 shadow-sm transition"
                >
                  <PhoneCall size={13} /> Call Doctor
                </a>
              </div>
            </div>
          )}

          {/* List of Hospitals */}
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              All Ranked Hospitals ({hospitals.length} Found)
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
                  Try expanding the search radius to 100 km or search for a nearby district capital.
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
                      selectedHospital?.id === hospital.id
                        ? "border-pasture-500 bg-pasture-50/60 shadow-md ring-1 ring-pasture-400"
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
                          href={hospital.googleMapsUrl}
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
