import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Shield,
  AlertTriangle,
  Radio,
  Battery,
  Navigation,
  ExternalLink,
  RotateCcw,
  Sliders,
  Sparkles,
  Thermometer,
  HeartPulse,
} from "lucide-react";
import client from "../api/client";
import { useSocket } from "../context/SocketContext";
import { Card, PageHeader, Button, EmptyState } from "../components/ui";

// Custom Leaflet DivIcon generator
function createCowIcon(animalName, isOutOfBounds, isSelected) {
  const color = isOutOfBounds ? "#EF4444" : "#10B981";
  const pulseClass = isOutOfBounds ? "animate-ping" : "";

  return L.divIcon({
    className: "custom-cow-pin",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="position: relative; width: 38px; height: 38px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white;">
          <span style="font-size: 18px;">🐄</span>
          <span style="position: absolute; top: -3px; right: -3px; width: 12px; height: 12px; border-radius: 50%; background: ${color}; border: 2px solid white;" class="${pulseClass}"></span>
        </div>
        <div style="margin-top: 4px; background: rgba(17, 24, 39, 0.85); color: white; padding: 2px 6px; border-radius: 6px; font-size: 11px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
          ${animalName}
        </div>
      </div>
    `,
    iconSize: [40, 56],
    iconAnchor: [20, 48],
    popupAnchor: [0, -48],
  });
}

function createFarmBaseIcon() {
  return L.divIcon({
    className: "farm-base-pin",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: #2563EB; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(37,99,235,0.4); border: 2px solid white;">
          <span style="font-size: 16px;">🏡</span>
        </div>
        <div style="margin-top: 3px; background: #1E3A8A; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">
          Farm Base
        </div>
      </div>
    `,
    iconSize: [36, 50],
    iconAnchor: [18, 42],
  });
}

// Map center adjuster helper
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

export default function PastureMap() {
  const { socket } = useSocket();
  const [data, setData] = useState([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [showTrail, setShowTrail] = useState(true);
  const [loading, setLoading] = useState(true);
  const [geofenceRadius, setGeofenceRadius] = useState(500);
  const [savingGeofence, setSavingGeofence] = useState(false);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const audioContextRef = useRef(null);

  // Play subtle warning audio tone
  function playBeep() {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio not permitted without interaction
    }
  }

  function loadData() {
    client
      .get("/sensors/locations")
      .then((res) => {
        setData(res.data.locations || []);
        if (res.data.locations?.length > 0 && !selectedAnimalId) {
          const first = res.data.locations[0];
          setSelectedAnimalId(first.animal.id);
          setGeofenceRadius(first.geofence.radiusM || 500);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  // Load breadcrumb GPS history for selected animal
  useEffect(() => {
    if (!selectedAnimalId) return;
    client
      .get(`/sensors/${selectedAnimalId}/gps-history?limit=40`)
      .then((res) => {
        const points = (res.data.breadcrumbs || [])
          .filter((b) => b.latitude && b.longitude)
          .map((b) => [b.latitude, b.longitude]);
        setBreadcrumbs(points);
      })
      .catch(() => setBreadcrumbs([]));
  }, [selectedAnimalId]);

  // Real-time Socket.IO updates
  useEffect(() => {
    if (!socket) return;

    const onUpdate = ({ animalId, reading }) => {
      setData((prev) =>
        prev.map((item) => {
          if (String(item.animal.id) !== String(animalId)) return item;
          const centerLat = Number(item.geofence.centerLat || 12.9716);
          const centerLng = Number(item.geofence.centerLng || 77.5946);
          const lat = reading.latitude || item.currentLocation.latitude;
          const lng = reading.longitude || item.currentLocation.longitude;

          // Simple distance approx for real-time
          const R = 6371e3;
          const φ1 = (centerLat * Math.PI) / 180;
          const φ2 = (lat * Math.PI) / 180;
          const Δφ = ((lat - centerLat) * Math.PI) / 180;
          const Δλ = ((lng - centerLng) * Math.PI) / 180;
          const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
          const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
          const isOut = dist > item.geofence.radiusM;

          if (isOut && !item.currentLocation.isOutOfBounds) {
            playBeep();
          }

          return {
            ...item,
            latestReading: {
              ...item.latestReading,
              ...reading,
            },
            currentLocation: {
              ...item.currentLocation,
              latitude: lat,
              longitude: lng,
              batteryPct: reading.batteryPct ?? item.currentLocation.batteryPct,
              isOutOfBounds: isOut,
              distanceFromBase: dist,
              recordedAt: reading.recorded_at || new Date().toISOString(),
            },
          };
        })
      );

      // Add to breadcrumb trail if currently selected
      if (String(animalId) === String(selectedAnimalId) && reading.latitude && reading.longitude) {
        setBreadcrumbs((prev) => [...prev.slice(-40), [reading.latitude, reading.longitude]]);
      }
    };

    socket.on("sensor:update", onUpdate);
    return () => socket.off("sensor:update", onUpdate);
  }, [socket, selectedAnimalId]);

  const selectedItem = data.find((d) => String(d.animal.id) === String(selectedAnimalId)) || data[0];
  const outOfBoundsAnimals = data.filter((d) => d.currentLocation.isOutOfBounds);

  const mapCenter = selectedItem
    ? [selectedItem.geofence.centerLat, selectedItem.geofence.centerLng]
    : [12.9716, 77.5946];

  async function handleSaveGeofence() {
    if (!selectedItem) return;
    setSavingGeofence(true);
    try {
      await client.put(`/animals/${selectedItem.animal.id}/geofence`, {
        centerLat: selectedItem.geofence.centerLat,
        centerLng: selectedItem.geofence.centerLng,
        radiusM: geofenceRadius,
      });
      setData((prev) =>
        prev.map((item) =>
          item.animal.id === selectedItem.animal.id
            ? { ...item, geofence: { ...item.geofence, radiusM: geofenceRadius } }
            : item
        )
      );
    } catch (err) {
      console.error("Failed to update geofence:", err);
    } finally {
      setSavingGeofence(false);
    }
  }

  async function handleSimulateEscape(isEscaping) {
    if (!selectedItem) return;
    setSimulationLoading(true);
    try {
      await client.post(`/sensors/${selectedItem.animal.id}/simulate-escape`, { isEscaping });
      if (isEscaping) playBeep();
      loadData();
    } finally {
      setSimulationLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Live GPS Pasture Map & Smart Geofencing"
        subtitle="Real-time cattle location tracking, grazing perimeter monitoring, and escape boundary sirens."
        action={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-pasture-100 px-3 py-1 text-xs font-semibold text-pasture-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-pasture-500" /> Live GPS Satellites Connected
            </span>
          </div>
        }
      />

      {/* ── Active Escape Siren Banner ── */}
      {outOfBoundsAnimals.length > 0 && (
        <div className="flex animate-pulse items-center justify-between rounded-xl bg-alertred/10 border-2 border-alertred px-4 py-3 text-alertred shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-alertred text-white">
              <AlertTriangle size={20} className="animate-bounce" />
            </div>
            <div>
              <p className="font-bold text-sm">
                🚨 BOUNDARY BREACH ALERT: {outOfBoundsAnimals.map((a) => a.animal.name).join(", ")}{" "}
                {outOfBoundsAnimals.length === 1 ? "has" : "have"} crossed the safe perimeter!
              </p>
              <p className="text-xs text-alertred/80">
                Animal is currently {outOfBoundsAnimals[0].currentLocation.distanceFromBase} meters from farm base.
              </p>
            </div>
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${outOfBoundsAnimals[0].currentLocation.latitude},${outOfBoundsAnimals[0].currentLocation.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-lg bg-alertred px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-red-700 transition"
          >
            <Navigation size={14} /> Navigate on Google Maps
          </a>
        </div>
      )}

      {!loading && data.length === 0 ? (
        <EmptyState
          title="No monitored animals with GPS"
          subtitle="Enable IoT monitoring on an animal's profile to view their live GPS collar here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* ── Main Map Canvas ── */}
          <div className="lg:col-span-3">
            <Card className="p-0 overflow-hidden shadow-lg border border-gray-200">
              <div className="h-[560px] w-full relative">
                <MapContainer
                  center={mapCenter}
                  zoom={16}
                  scrollWheelZoom={true}
                  className="h-full w-full z-0"
                >
                  <ChangeView center={mapCenter} zoom={16} />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Farm Base Marker & Safe Grazing Circle */}
                  {selectedItem && (
                    <>
                      <Marker
                        position={[selectedItem.geofence.centerLat, selectedItem.geofence.centerLng]}
                        icon={createFarmBaseIcon()}
                      >
                        <Popup>
                          <div className="p-1">
                            <p className="font-bold text-xs">Farm Base & Shed</p>
                            <p className="text-[11px] text-gray-500">
                              Center coordinates: {selectedItem.geofence.centerLat.toFixed(4)},{" "}
                              {selectedItem.geofence.centerLng.toFixed(4)}
                            </p>
                          </div>
                        </Popup>
                      </Marker>

                      <Circle
                        center={[selectedItem.geofence.centerLat, selectedItem.geofence.centerLng]}
                        radius={selectedItem.geofence.radiusM || geofenceRadius}
                        pathOptions={{
                          color: selectedItem.currentLocation.isOutOfBounds ? "#EF4444" : "#10B981",
                          fillColor: selectedItem.currentLocation.isOutOfBounds ? "#EF4444" : "#10B981",
                          fillOpacity: 0.12,
                          weight: 2,
                          dashArray: "4, 6",
                        }}
                      />
                    </>
                  )}

                  {/* Breadcrumb Path Trail */}
                  {showTrail && breadcrumbs.length > 1 && (
                    <Polyline
                      positions={breadcrumbs}
                      pathOptions={{ color: "#3B82F6", weight: 3, opacity: 0.7, dashArray: "3, 5" }}
                    />
                  )}

                  {/* Live Cattle Pins */}
                  {data.map((item) => {
                    const isSelected = String(item.animal.id) === String(selectedAnimalId);
                    const pos = [item.currentLocation.latitude, item.currentLocation.longitude];

                    return (
                      <Marker
                        key={item.animal.id}
                        position={pos}
                        icon={createCowIcon(item.animal.name, item.currentLocation.isOutOfBounds, isSelected)}
                        eventHandlers={{
                          click: () => {
                            setSelectedAnimalId(item.animal.id);
                            setGeofenceRadius(item.geofence.radiusM || 500);
                          },
                        }}
                      >
                        <Popup>
                          <div className="p-2 space-y-2 min-w-[200px]">
                            <div className="flex items-center justify-between border-b pb-1">
                              <p className="font-bold text-ink text-sm flex items-center gap-1">
                                🐄 {item.animal.name}
                              </p>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  item.currentLocation.isOutOfBounds
                                    ? "bg-red-100 text-red-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {item.currentLocation.isOutOfBounds ? "OUT OF BOUNDS" : "SAFE"}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1 text-xs">
                              <div className="flex items-center gap-1 text-amber-600">
                                <Thermometer size={12} />
                                <span>{item.latestReading?.temperature_c || 38.5}°C</span>
                              </div>
                              <div className="flex items-center gap-1 text-alertred">
                                <HeartPulse size={12} />
                                <span>{item.latestReading?.heart_rate_bpm || 72} bpm</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-500">
                                <Battery size={12} />
                                <span>{item.currentLocation.batteryPct}%</span>
                              </div>
                              <div className="flex items-center gap-1 text-blue-600">
                                <MapPin size={12} />
                                <span>{item.currentLocation.distanceFromBase}m away</span>
                              </div>
                            </div>

                            <div className="pt-2 flex flex-col gap-1.5 border-t border-gray-100">
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${item.currentLocation.latitude},${item.currentLocation.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-1 rounded bg-pasture-600 py-1 text-xs font-semibold text-white hover:bg-pasture-700"
                              >
                                <Navigation size={12} /> Google Maps Directions
                              </a>
                              <Link
                                to={`/livestock/${item.animal.id}`}
                                className="flex items-center justify-center gap-1 rounded bg-gray-100 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                              >
                                <ExternalLink size={12} /> Animal Health Card
                              </Link>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>

                {/* Trail toggle badge */}
                <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur rounded-lg shadow-md px-3 py-1.5 flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={showTrail}
                      onChange={(e) => setShowTrail(e.target.checked)}
                      className="rounded text-pasture-600 focus:ring-pasture-500"
                    />
                    Show Grazing Trail
                  </label>
                </div>
              </div>
            </Card>
          </div>

          {/* ── Side Control & Livestock Inspector ── */}
          <div className="space-y-4">
            {/* Livestock Selector */}
            <Card className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Pasture Herd</p>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {data.map((item) => {
                  const isSel = String(item.animal.id) === String(selectedAnimalId);
                  return (
                    <button
                      key={item.animal.id}
                      onClick={() => {
                        setSelectedAnimalId(item.animal.id);
                        setGeofenceRadius(item.geofence.radiusM || 500);
                      }}
                      className={`w-full text-left rounded-lg p-2.5 transition flex items-center justify-between border ${
                        isSel
                          ? "border-pasture-500 bg-pasture-50 shadow-sm"
                          : "border-gray-100 bg-gray-50/50 hover:bg-gray-100"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-ink text-xs">{item.animal.name}</p>
                        <p className="text-[11px] text-gray-400">
                          {item.currentLocation.distanceFromBase}m from base · {item.currentLocation.batteryPct}% bat
                        </p>
                      </div>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          item.currentLocation.isOutOfBounds ? "bg-red-500 animate-ping" : "bg-emerald-500"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Geofence Perimeter Adjuster */}
            {selectedItem && (
              <Card className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                    <Shield size={13} className="text-pasture-600" /> Virtual Perimeter
                  </p>
                  <span className="font-mono text-xs font-semibold text-pasture-700 bg-pasture-50 px-2 py-0.5 rounded">
                    {geofenceRadius} meters
                  </span>
                </div>

                <div className="space-y-1">
                  <input
                    type="range"
                    min="100"
                    max="1500"
                    step="50"
                    value={geofenceRadius}
                    onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                    className="w-full accent-pasture-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                    <span>100m (Shed)</span>
                    <span>500m (Field)</span>
                    <span>1.5km (Pasture)</span>
                  </div>
                </div>

                <Button
                  onClick={handleSaveGeofence}
                  disabled={savingGeofence}
                  variant="secondary"
                  className="w-full text-xs py-2"
                >
                  <Sliders size={13} /> {savingGeofence ? "Saving perimeter…" : "Update Safe Perimeter"}
                </Button>
              </Card>
            )}

            {/* Live Presentation Simulation Box */}
            {selectedItem && (
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 space-y-3">
                <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-xs">
                  <Sparkles size={14} className="text-amber-600" /> Presentation Demo Controls
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Trigger an instant escape simulation to demonstrate the real-time boundary breach siren and Google Maps
                  navigation to evaluators:
                </p>

                <div className="space-y-2">
                  <Button
                    onClick={() => handleSimulateEscape(true)}
                    disabled={simulationLoading}
                    className="w-full bg-alertred hover:bg-red-700 text-white text-xs py-2 shadow-sm"
                  >
                    <AlertTriangle size={13} /> 🚨 Simulate Escape / Breach
                  </Button>

                  <Button
                    onClick={() => handleSimulateEscape(false)}
                    disabled={simulationLoading}
                    variant="ghost"
                    className="w-full text-xs py-1.5 text-gray-600 hover:bg-amber-100"
                  >
                    <RotateCcw size={12} /> Return Animal to Safe Zone
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
