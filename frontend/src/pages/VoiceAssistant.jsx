import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  Video,
  Languages,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import client from "../api/client";
import { Button, Card, EmptyState, ErrorBanner, PageHeader, Select } from "../components/ui";

const SUPPORTED_LANGUAGES = [
  { code: "kn-IN", name: "ಕನ್ನಡ (Kannada)", flag: "🌾", greeting: "ನಿಮ್ಮ ಹಸುವಿನ ಸಮಸ್ಯೆ ತಿಳಿಸಿ (ಉದಾ: ಜ್ವರ, ಚರ್ಮದ ಮೇಲೆ ಗಂಟುಗಳು, ಮೇವು ತಿನ್ನುತ್ತಿಲ್ಲ)" },
  { code: "hi-IN", name: "हिन्दी (Hindi)", flag: "🇮🇳", greeting: "अपने पशु की समस्या बताएं (उदा: तेज बुखार, खाना नहीं खा रही, दूध कम)" },
  { code: "te-IN", name: "తెలుగు (Telugu)", flag: "🐄", greeting: "మీ పశువు సమస్యను చెప్పండి (ఉదా: జ్వరం, గడ్డలు, మేత తినడం లేదు)" },
  { code: "ta-IN", name: "தமிழ் (Tamil)", flag: "🌿", greeting: "உங்கள் கால்நடை பிரச்சனையை கூறுங்கள் (எ.கா: காய்ச்சல், சாப்பிடவில்லை)" },
  { code: "en-IN", name: "English (India)", flag: "🌐", greeting: "Speak your animal's symptoms (e.g., high fever, skin nodules, not eating)" },
];

const PRESET_QUERIES = [
  {
    lang: "kn-IN",
    title: "Kannada: Lumpy Skin Symptoms",
    text: "ನನ್ನ ಹಸುವಿಗೆ 3 ದಿನಗಳಿಂದ ತೀವ್ರ ಜ್ವರ ಇದೆ, ಮೈಮೇಲೆ ದುಂಡಗಿನ ಗಂಟುಗಳು ಬಂದಿವೆ ಮತ್ತು ಮೇವು ತಿನ್ನುತ್ತಿಲ್ಲ.",
  },
  {
    lang: "hi-IN",
    title: "Hindi: Fever & Mastitis Symptoms",
    text: "मेरी गाय के थन में बहुत सूजन है, दूध में खून आ रहा है और उसे तेज बुखार है।",
  },
  {
    lang: "te-IN",
    title: "Telugu: Bloat / Digestive Issue",
    text: "మా ఆవు కడుపు బాగా ఉబ్బిపోయింది, శ్వಾಸ తీసుకోవడానికి ఇబ్బంది పడుతోంది.",
  },
  {
    lang: "en-IN",
    title: "English: Cough & Respiratory Distress",
    text: "My cow has labored breathing, thick nasal discharge, and reduced milk yield for the past 2 days.",
  },
];

export default function VoiceAssistant() {
  const [selectedLang, setSelectedLang] = useState("kn-IN");
  const [animals, setAnimals] = useState([]);
  const [animalId, setAnimalId] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis || null);

  useEffect(() => {
    client
      .get("/animals")
      .then((res) => setAnimals(res.data.animals || []))
      .catch(() => {});

    // Check SpeechRecognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  // Configure speech recognition on language change
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLang;

    recognition.onresult = (event) => {
      let current = "";
      for (let i = 0; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      setTranscript(current);
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      setIsRecording(false);
      if (event.error === "not-allowed") {
        setError("Microphone access was denied. Please allow microphone permissions in your browser.");
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
  }, [selectedLang]);

  function toggleRecording() {
    setError("");
    if (!recognitionRef.current) {
      setError("Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setTranscript("");
      try {
        recognitionRef.current.lang = selectedLang;
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start recognition:", err);
      }
    }
  }

  async function handleAnalyze() {
    if (!transcript.trim()) {
      setError("Please speak into the microphone or enter a voice description first.");
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await client.post("/predict/voice-assistant", {
        transcript: transcript.trim(),
        language: selectedLang,
        animalId: animalId || null,
      });
      const analysis = res.data.analysis;
      setResult(analysis);

      // Speak native response out loud
      if (analysis.spoken_response_native) {
        speakResponse(analysis.spoken_response_native, selectedLang);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to process voice query.");
    } finally {
      setLoading(false);
    }
  }

  function speakResponse(text, langCode) {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    synthRef.current.speak(utterance);
  }

  function stopAudio() {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlayingAudio(false);
    }
  }

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multilingual AI Veterinary Voice Assistant"
        subtitle="Speak naturally in Kannada, Hindi, Telugu, Tamil, or English to diagnose livestock symptoms and hear instant voice guidance."
        action={
          <span className="flex items-center gap-1.5 rounded-full bg-pasture-100 px-3 py-1 text-xs font-semibold text-pasture-800">
            <Sparkles size={13} className="text-pasture-600" /> Powered by Google Gemini Multilingual AI
          </span>
        }
      />

      {/* ── Language Selector Bar ── */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-gray-100/80 border border-gray-200">
        <span className="px-3 text-xs font-semibold text-gray-500 flex items-center gap-1.5">
          <Languages size={15} /> Select Language:
        </span>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => {
              if (isRecording && recognitionRef.current) recognitionRef.current.stop();
              setSelectedLang(lang.code);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedLang === lang.code
                ? "bg-pasture-700 text-white shadow"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ── Left Input Studio (3 cols) ── */}
        <div className="lg:col-span-3 space-y-5">
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="text-sm font-bold text-ink">Voice Consultation Terminal</p>
                <p className="text-xs text-gray-500">{currentLangObj.greeting}</p>
              </div>
              <Select
                value={animalId}
                onChange={(e) => setAnimalId(e.target.value)}
                className="text-xs w-48"
              >
                <option value="">— Herd / General Animal —</option>
                {animals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.species})
                  </option>
                ))}
              </Select>
            </div>

            <ErrorBanner message={error} />

            {/* Microphone Recording Center */}
            <div className="flex flex-col items-center justify-center py-6 px-4 rounded-xl bg-gradient-to-b from-gray-50 to-pasture-50/30 border border-pasture-100">
              <div className="relative mb-3">
                {isRecording && (
                  <span className="absolute -inset-3 rounded-full bg-red-400/30 animate-ping" />
                )}
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={loading}
                  className={`relative flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 ${
                    isRecording
                      ? "bg-alertred text-white ring-4 ring-red-200"
                      : "bg-pasture-600 text-white hover:bg-pasture-700 ring-4 ring-pasture-100"
                  }`}
                >
                  {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                </button>
              </div>

              <p className="font-semibold text-sm text-ink">
                {isRecording ? "🔴 Listening… Speak your symptoms now" : "Tap Microphone to Speak"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isRecording
                  ? `Speaking in ${currentLangObj.name}…`
                  : `Language set to ${currentLangObj.name}`}
              </p>
            </div>

            {/* Live Transcript / Input Area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">
                  Spoken Voice Transcript / Message
                </label>
                {transcript && (
                  <button
                    type="button"
                    onClick={() => setTranscript("")}
                    className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  >
                    <RotateCcw size={11} /> Clear
                  </button>
                )}
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={`Speak or type in ${currentLangObj.name}...`}
                rows={3}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:border-pasture-500 focus:outline-none focus:ring-1 focus:ring-pasture-500"
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={loading || !transcript.trim()}
              className="w-full py-2.5 shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Analyzing Symptoms with Gemini AI…
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Diagnose & Hear Advice in {currentLangObj.name}
                </>
              )}
            </Button>
          </Card>

          {/* ── 1-Click Real-World Presentation Presets ── */}
          <Card className="space-y-3 bg-gradient-to-br from-amber-50/60 to-orange-50/60 border-amber-200">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-600" /> Fast Voice Scenarios (Click to Test)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_QUERIES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedLang(preset.lang);
                    setTranscript(preset.text);
                  }}
                  className="text-left p-2.5 rounded-lg border border-amber-200/80 bg-white/80 hover:bg-amber-100/60 transition shadow-sm"
                >
                  <p className="font-semibold text-xs text-amber-950">{preset.title}</p>
                  <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">{preset.text}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Right Results Card (2 cols) ── */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <Card className="space-y-4 border-pasture-200 shadow-lg">
              {/* Spoken Audio Response Box */}
              <div className="p-3.5 rounded-xl bg-pasture-900 text-white space-y-2.5 shadow">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                    <Volume2 size={15} /> Spoken Voice Diagnosis
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      isPlayingAudio
                        ? stopAudio()
                        : speakResponse(result.spoken_response_native, selectedLang)
                    }
                    className="flex items-center gap-1 text-xs font-medium text-pasture-200 hover:text-white bg-pasture-800 px-2.5 py-1 rounded-md"
                  >
                    {isPlayingAudio ? <Pause size={12} /> : <Play size={12} />}
                    {isPlayingAudio ? "Stop Audio" : "Replay Voice"}
                  </button>
                </div>
                <p className="text-xs leading-relaxed font-medium text-pasture-100">
                  "{result.spoken_response_native}"
                </p>
                <p className="text-[11px] text-pasture-300 italic border-t border-pasture-800 pt-1.5">
                  English translation: "{result.spoken_response_english}"
                </p>
              </div>

              {/* Primary Clinical Diagnosis */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Primary Diagnosis</p>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      result.is_urgent
                        ? "bg-red-100 text-alertred animate-pulse"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {result.is_urgent ? "🚨 URGENT" : "SAFE / MODERATE"}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-ink">{result.primary_diagnosis}</h3>

                {/* Confidence Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500 font-mono">
                    <span>Clinical Confidence</span>
                    <span>{Math.round(result.confidence * 100)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-pasture-600 transition-all duration-700"
                      style={{ width: `${Math.round(result.confidence * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Detected Symptoms */}
              {result.detected_symptoms?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-gray-500">Detected Symptoms</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.detected_symptoms.map((s, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-pasture-50 px-2 py-0.5 text-xs font-medium text-pasture-700 border border-pasture-200"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable First-Aid Steps */}
              {result.first_aid_actions?.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-pasture-600" /> Immediate First-Aid Steps
                  </p>
                  <ul className="space-y-1.5">
                    {result.first_aid_actions.map((act, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="h-4 w-4 flex-shrink-0 rounded-full bg-pasture-100 text-pasture-800 text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Telemedicine CTA */}
              <div className="pt-2 border-t">
                <Link
                  to="/telemedicine"
                  className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 text-xs font-semibold shadow transition"
                >
                  <Video size={14} /> Book Instant Consultation with Vet
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="h-full flex flex-col items-center justify-center text-center p-8 border-dashed border-gray-200">
              <div className="h-12 w-12 rounded-full bg-pasture-50 text-pasture-600 flex items-center justify-center mb-3">
                <Stethoscope size={24} />
              </div>
              <h4 className="font-semibold text-sm text-ink mb-1">Awaiting Voice Input</h4>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                Tap the microphone button on the left to describe your animal's illness in your mother tongue.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
