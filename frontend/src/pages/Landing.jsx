import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Stethoscope,
  Microscope,
  ClipboardList,
  Calendar,
  Video,
  ArrowRight,
  ShieldCheck,
  MapPin,
  ExternalLink,
  Activity,
  Mic,
  Camera,
  Syringe,
  Hospital,
  PawPrint,
  Radio,
  Bell,
} from "lucide-react";

const TELEMETRY_FEED = [
  { tag: "Cow #104", temp: "38.6°C", hr: "72 BPM", status: "Grazing Normal", color: "text-[#00D284]" },
  { tag: "Buffalo #208", temp: "38.4°C", hr: "68 BPM", status: "Rumination Active", color: "text-[#00D284]" },
  { tag: "Calf #312", temp: "38.8°C", hr: "80 BPM", status: "Pasture Zone A", color: "text-emerald-400" },
  { tag: "Bull #009", temp: "38.5°C", hr: "74 BPM", status: "Normal Vitals", color: "text-[#00D284]" },
];

export default function Landing() {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [scrollY, setScrollY] = useState(0);
  const [feedIndex, setFeedIndex] = useState(0);

  // Mouse follow spotlight
  function handleMouseMove(e) {
    setMousePos({ x: e.clientX, y: e.clientY });
  }

  // Scroll listener for smooth parallax
  useEffect(() => {
    function handleScroll() {
      setScrollY(window.scrollY);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Live telemetry feed ticker cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setFeedIndex((prev) => (prev + 1) % TELEMETRY_FEED.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const currentFeed = TELEMETRY_FEED[feedIndex];

  return (
    <div
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-[#080B10] text-white selection:bg-[#00D284]/30 selection:text-[#00D284] font-sans relative overflow-x-hidden"
    >
      {/* Dynamic Cursor Spotlight (Follows mouse smoothly) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(750px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 210, 132, 0.07), transparent 75%)`,
        }}
      />
      {/* Top Ambient Light Glow */}
      <div className="relative border-b border-white/[0.06] overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-96 bg-[radial-gradient(ellipse_65%_55%_at_50%_0%,rgba(0,210,132,0.14)_0%,rgba(8,11,16,0)_70%)] pointer-events-none" />

        {/* Top Navbar */}
        <header className="relative max-w-6xl mx-auto px-6 h-20 flex items-center justify-between z-10">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-[#00D284] flex items-center justify-center text-black font-extrabold shadow-md shadow-[#00D284]/20 transition-transform group-hover:scale-105">
              <Stethoscope size={20} strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
              VetAI 360
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <Link to="/nearby-vets" className="hover:text-white transition-colors">Nearby Hospitals</Link>
            <Link to="/login" className="hover:text-white transition-colors">AI Diagnostics</Link>
            <Link to="/login" className="hover:text-white transition-colors">Tele-Consult</Link>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-[#00D284] px-5 py-2.5 text-xs font-bold text-black shadow-[0_0_24px_-2px_rgba(0,210,132,0.38)] hover:shadow-[0_0_32px_2px_rgba(0,210,132,0.55)] transition-all hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative max-w-4xl mx-auto px-6 pt-16 pb-14 text-center z-10">
          {/* Top Pill Badge with Pulse */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00D284]/30 bg-[#00D284]/[0.08] px-4 py-1.5 text-xs font-semibold text-[#00D284] mb-8 animate-pulse-subtle shadow-md shadow-[#00D284]/15 hover:border-[#00D284]/60 transition-colors cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D284] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D284]"></span>
            </span>
            <span>Next-Generation Veterinary Tools</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.12]">
            Better care for every <br className="hidden sm:block" />
            <span className="text-[#00D284] drop-shadow-[0_0_24px_rgba(0,210,132,0.35)]">
              patient. Every time.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            VetAI 360 is the next-generation livestock and veterinary healthcare platform. Real-time IoT vitals monitoring, GPS pasture geofencing, AI multimodal disease diagnosis, hospital navigation radar, and encrypted telemedicine.
          </p>

          {/* Buttons with Hover Glow Shimmer */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/nearby-vets"
              className="w-full sm:w-auto rounded-full bg-[#00D284] px-7 py-3 text-sm font-bold text-black shadow-[0_0_24px_-2px_rgba(0,210,132,0.38)] hover:shadow-[0_0_36px_4px_rgba(0,210,132,0.65)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
            >
              Explore Nearby Hospitals
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto rounded-full bg-white/[0.05] border border-white/[0.1] px-7 py-3 text-sm font-semibold text-slate-200 hover:bg-white/[0.09] hover:text-white hover:border-white/[0.25] hover:-translate-y-1 transition-all duration-300"
            >
              See All Features
            </a>
          </div>
        </section>

        {/* Smartphone Mockup Frame with Floating Parallax */}
        <div
          className="max-w-xl mx-auto px-6 pb-20 relative z-10"
          style={{
            transform: `translateY(${Math.min(scrollY * 0.08, 45)}px) perspective(1000px) rotateX(${Math.max(0, 5 - scrollY * 0.015)}deg)`,
            transition: "transform 0.12s ease-out",
          }}
        >
          {/* Ambient Mint Glow Aura behind Phone */}
          <div className="absolute inset-0 bg-[#00D284]/[0.08] blur-3xl rounded-full -z-10 transform scale-95 animate-pulse-glow pointer-events-none" />

          {/* Smartphone Shell with Gentle Float */}
          <div className="rounded-[40px] border-4 border-[#1E2638] bg-[#0A0E17] p-3 shadow-2xl shadow-black relative overflow-hidden animate-float-slow">
            {/* Camera / Speaker Notch */}
            <div className="w-28 h-4 bg-[#1E2638] rounded-full mx-auto mb-3" />

            {/* Screen Area */}
            <div className="rounded-[30px] bg-gradient-to-b from-[#0F1D1B] via-[#0B131A] to-[#0A0D14] p-6 border border-[#00D284]/20 text-center relative overflow-hidden">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-[#00D284]/15 border border-[#00D284]/40 flex items-center justify-center text-[#00D284] shadow-lg shadow-[#00D284]/10 mb-4 transition-transform duration-300 hover:scale-105">
                <Stethoscope size={32} strokeWidth={2.2} />
              </div>

              <h3 className="text-xl font-extrabold text-white">VetAI 360</h3>
              <p className="text-sm font-bold text-[#00D284] mt-1">Next-Generation Veterinary Platform</p>
              <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Empowering farmers and veterinarians with AI diagnostics, IoT telemetry, and live clinical consultations.
              </p>

              {/* Live Simulated Collar Telemetry Ticker */}
              <div className="mt-4 rounded-xl bg-black/50 border border-white/[0.08] p-2.5 flex items-center justify-between text-left transition-all duration-500">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D284] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D284]"></span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono text-slate-400">Live Collar Telemetry</p>
                    <p className="text-xs font-bold text-white tracking-wide truncate">
                      {currentFeed.tag} · {currentFeed.temp} · {currentFeed.hr}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#00D284]/15 text-[#00D284] shrink-0 border border-[#00D284]/20">
                  {currentFeed.status}
                </span>
              </div>

              {/* Quick Feature Badges Inside Screen */}
              <div className="grid grid-cols-3 gap-2.5 mt-4 pt-3 border-t border-white/[0.08]">
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-center transition-all hover:border-[#00D284]/30 hover:bg-white/[0.08]">
                  <div className="text-lg mb-1">🐾</div>
                  <p className="text-[10px] font-bold text-slate-200">Livestock Records</p>
                </div>
                <div className="bg-[#00D284]/[0.08] border border-[#00D284]/30 rounded-xl p-2.5 text-center transition-all hover:bg-[#00D284]/[0.15]">
                  <div className="text-lg mb-1">🩺</div>
                  <p className="text-[10px] font-bold text-[#00D284]">AI Diagnostics</p>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 text-center transition-all hover:border-[#00D284]/30 hover:bg-white/[0.08]">
                  <div className="text-lg mb-1">📡</div>
                  <p className="text-[10px] font-bold text-slate-200">IoT & GPS Radar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Built exclusively for livestock & veterinary care
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
            Every tool in VetAI 360 is engineered to solve real-world animal health challenges — from IoT bio-sensors to AI-assisted disease diagnosis and emergency hospital navigation.
          </p>
        </div>

        {/* 2-Column Dark Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: AI Image Diagnosis */}
          <div className="group rounded-2xl bg-[#0C1019] border border-white/[0.08] p-7 transition-all duration-300 hover:border-[#00D284]/50 hover:bg-[#111723] hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#00D284]/15 flex flex-col justify-between cursor-default">
            <div>
              <div className="h-11 w-11 rounded-xl bg-[#00D284]/15 border border-[#00D284]/30 flex items-center justify-center text-[#00D284] mb-5 group-hover:scale-110 group-hover:bg-[#00D284]/25 group-hover:border-[#00D284]/50 transition-all duration-300">
                <Camera size={22} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">AI Image Diagnosis</h3>
              <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Upload photographs of livestock lesions, skin abrasions, or eyes. Instant neural multimodal detection for Lumpy Skin Disease (LSD), Foot & Mouth Disease (FMD), and Mastitis with confidence scoring.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center justify-between text-xs text-slate-500">
              <span className="text-[#00D284] font-medium font-mono">Multimodal Gemini + Vision</span>
              <span className="text-slate-400">Instant Lesion & Disease Detection</span>
            </div>
          </div>

          {/* Card 2: IoT Vitals Monitoring */}
          <div className="group rounded-2xl bg-[#0C1019] border border-white/[0.08] p-7 transition-all duration-300 hover:border-[#00D284]/50 hover:bg-[#111723] hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#00D284]/15 flex flex-col justify-between cursor-default">
            <div>
              <div className="h-11 w-11 rounded-xl bg-[#00D284]/15 border border-[#00D284]/30 flex items-center justify-center text-[#00D284] mb-5 group-hover:scale-110 group-hover:bg-[#00D284]/25 group-hover:border-[#00D284]/50 transition-all duration-300">
                <Activity size={22} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">IoT Real-Time Vitals Monitoring</h3>
              <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Continuous telemetry from smart collars and bio-sensors tracking body temperature, heart rate, SpO2, rumination cycles, and step activity for early sickness detection.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center justify-between text-xs text-slate-500">
              <span className="text-[#00D284] font-medium font-mono">Live WebSocket Streaming</span>
              <span className="text-slate-400">Continuous Biometric Health</span>
            </div>
          </div>

          {/* Card 3: GPS Pasture Map & Geofencing */}
          <div className="group rounded-2xl bg-[#0C1019] border border-white/[0.08] p-7 transition-all duration-300 hover:border-[#00D284]/50 hover:bg-[#111723] hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#00D284]/15 flex flex-col justify-between cursor-default">
            <div>
              <div className="h-11 w-11 rounded-xl bg-[#00D284]/15 border border-[#00D284]/30 flex items-center justify-center text-[#00D284] mb-5 group-hover:scale-110 group-hover:bg-[#00D284]/25 group-hover:border-[#00D284]/50 transition-all duration-300">
                <MapPin size={22} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">GPS Pasture Map & Geofencing</h3>
              <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Live satellite tracking of livestock grazing across pastures. Custom geofence perimeters trigger instant alerts when animals breach safety boundaries or wander into hazard zones.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center justify-between text-xs text-slate-500">
              <span className="text-[#00D284] font-medium font-mono">Live Collar GPS Engine</span>
              <span className="text-slate-400">Boundary Escape Alerts</span>
            </div>
          </div>

          {/* Card 4: Nearby Veterinary Hospitals */}
          <div className="group rounded-2xl bg-[#0C1019] border border-white/[0.08] p-7 transition-all duration-300 hover:border-[#00D284]/50 hover:bg-[#111723] hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#00D284]/15 flex flex-col justify-between cursor-default">
            <div>
              <div className="h-11 w-11 rounded-xl bg-[#00D284]/15 border border-[#00D284]/30 flex items-center justify-center text-[#00D284] mb-5 group-hover:scale-110 group-hover:bg-[#00D284]/25 group-hover:border-[#00D284]/50 transition-all duration-300">
                <Hospital size={22} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Nearby Veterinary Hospital Radar</h3>
              <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Scan for verified government veterinary hospitals, private clinics, and emergency dispensaries within 50 km. Get real-world turn-by-turn driving routes, estimated travel times, and instant phone dialing.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center justify-between text-xs text-slate-500">
              <span className="text-[#00D284] font-medium font-mono">OSRM Turn-by-Turn Navigation</span>
              <span className="text-slate-400">Verified Local Clinics</span>
            </div>
          </div>

          {/* Card 5: AI Voice Assistant (Multilingual) */}
          <div className="group rounded-2xl bg-[#0C1019] border border-white/[0.08] p-7 transition-all duration-300 hover:border-[#00D284]/50 hover:bg-[#111723] hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#00D284]/15 flex flex-col justify-between cursor-default">
            <div>
              <div className="h-11 w-11 rounded-xl bg-[#00D284]/15 border border-[#00D284]/30 flex items-center justify-center text-[#00D284] mb-5 group-hover:scale-110 group-hover:bg-[#00D284]/25 group-hover:border-[#00D284]/50 transition-all duration-300">
                <Mic size={22} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">AI Multilingual Voice Assistant</h3>
              <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Voice-guided veterinary consult built for farmers in regional languages (Kannada, Hindi, English). Speak symptoms hands-free and hear immediate spoken guidance on urgent treatments.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center justify-between text-xs text-slate-500">
              <span className="text-[#00D284] font-medium font-mono">Kannada / Hindi / English</span>
              <span className="text-slate-400">Speech-to-Speech Guidance</span>
            </div>
          </div>

          {/* Card 6: Telemedicine Video Consults */}
          <div className="group rounded-2xl bg-[#0C1019] border border-white/[0.08] p-7 transition-all duration-300 hover:border-[#00D284]/50 hover:bg-[#111723] hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#00D284]/15 flex flex-col justify-between cursor-default">
            <div>
              <div className="h-11 w-11 rounded-xl bg-[#00D284]/15 border border-[#00D284]/30 flex items-center justify-center text-[#00D284] mb-5 group-hover:scale-110 group-hover:bg-[#00D284]/25 group-hover:border-[#00D284]/50 transition-all duration-300">
                <Video size={22} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Telemedicine & Video Rooms</h3>
              <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Connect farmers in remote areas with specialized veterinary doctors via secure WebRTC video calls. Share live animal symptoms, conduct visual exams, and generate digital treatment prescriptions.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center justify-between text-xs text-slate-500">
              <span className="text-[#00D284] font-medium font-mono">Live WebRTC Video Consult</span>
              <span className="text-slate-400">Encrypted Rural Tele-Vet</span>
            </div>
          </div>

          {/* Card 7: 360° Livestock & Patient Records */}
          <div className="group rounded-2xl bg-[#0C1019] border border-white/[0.08] p-7 transition-all duration-300 hover:border-[#00D284]/50 hover:bg-[#111723] hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#00D284]/15 flex flex-col justify-between cursor-default">
            <div>
              <div className="h-11 w-11 rounded-xl bg-[#00D284]/15 border border-[#00D284]/30 flex items-center justify-center text-[#00D284] mb-5 group-hover:scale-110 group-hover:bg-[#00D284]/25 group-hover:border-[#00D284]/50 transition-all duration-300">
                <PawPrint size={22} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">360° Livestock Health Dossier</h3>
              <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Comprehensive animal records indexed by Ear Tag / RFID. Track breed lineage, age, weight history, lactation stages, and past medical interventions in one unified view.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center justify-between text-xs text-slate-500">
              <span className="text-[#00D284] font-medium font-mono">RFID Tag & Cattle Registry</span>
              <span className="text-slate-400">Complete Health Dossier</span>
            </div>
          </div>

          {/* Card 8: Automated Vaccination Schedule & Alerts */}
          <div className="group rounded-2xl bg-[#0C1019] border border-white/[0.08] p-7 transition-all duration-300 hover:border-[#00D284]/50 hover:bg-[#111723] hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#00D284]/15 flex flex-col justify-between cursor-default">
            <div>
              <div className="h-11 w-11 rounded-xl bg-[#00D284]/15 border border-[#00D284]/30 flex items-center justify-center text-[#00D284] mb-5 group-hover:scale-110 group-hover:bg-[#00D284]/25 group-hover:border-[#00D284]/50 transition-all duration-300">
                <Syringe size={22} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Automated Vaccination Schedules</h3>
              <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Timely immunization protocols for FMD, Brucellosis, Black Quarter, and Rabies. Automated notification reminders ensure full herd immunity and compliance.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center justify-between text-xs text-slate-500">
              <span className="text-[#00D284] font-medium font-mono">Daily 07:00 Reminder Engine</span>
              <span className="text-slate-400">Herd Immunization Tracker</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center border-t border-white/[0.06]">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          The future of veterinary practice is here
        </h2>
        <p className="mt-4 text-slate-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
          Whether you're a single-doctor clinic or a multi-location group, VetAI 360 scales with your ambition while keeping care personal.
        </p>

        <div className="mt-8">
          <Link
            to="/register"
            className="inline-block rounded-full bg-[#00D284] px-8 py-3.5 text-sm font-bold text-black shadow-[0_0_24px_-2px_rgba(0,210,132,0.38)] hover:shadow-[0_0_32px_2px_rgba(0,210,132,0.55)] transition-all hover:-translate-y-0.5"
          >
            Book a Personalized Demo
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#06080D] py-14">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[#00D284] flex items-center justify-center text-black font-extrabold">
                <Stethoscope size={18} strokeWidth={2.5} />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">VetAI 360</span>
            </div>

            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              VetAI 360 is the comprehensive platform for veterinary practices and modern livestock management. AI-assisted diagnostics, complete 360° patient records, seamless scheduling, inventory, billing, and telehealth.
            </p>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Product</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#features" className="hover:text-white transition">Features</a></li>
              <li><Link to="/login" className="hover:text-white transition">Get Started</Link></li>
              <li><Link to="/nearby-vets" className="hover:text-white transition">Nearby Vets</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Services</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/login" className="hover:text-white transition">AI Diagnosis</Link></li>
              <li><Link to="/login" className="hover:text-white transition">Telemedicine</Link></li>
              <li><Link to="/nearby-vets" className="hover:text-white transition">Hospital Radar</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">System</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/login" className="hover:text-white transition">Doctor Login</Link></li>
              <li><Link to="/register" className="hover:text-white transition">Register Account</Link></li>
              <li><a href="#features" className="hover:text-white transition">Documentation</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 mt-12 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© 2026 VetAI 360. All rights reserved.</p>
          <p className="text-slate-500">PES Institute of Technology and Management</p>
        </div>
      </footer>
    </div>
  );
}
