import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Stethoscope, Mic } from "lucide-react";
import client from "../api/client";
import { Button, Card, ErrorBanner, PageHeader, Select } from "../components/ui";

const ANIMAL_TYPES = ["Dog", "Cat", "Cow", "Goat", "Horse", "Pig", "Rabbit", "Sheep"];

const YES_NO_SYMPTOMS = [
  { key: "Appetite_Loss",       label: "Appetite loss" },
  { key: "Vomiting",            label: "Vomiting" },
  { key: "Diarrhea",            label: "Diarrhea" },
  { key: "Coughing",            label: "Coughing" },
  { key: "Labored_Breathing",   label: "Labored breathing" },
  { key: "Lameness",            label: "Lameness / limping" },
  { key: "Skin_Lesions",        label: "Skin lesions / nodules" },
  { key: "Nasal_Discharge",     label: "Nasal discharge" },
  { key: "Eye_Discharge",       label: "Eye discharge" },
];

const TEXT_SYMPTOMS = [
  "Fever", "Lethargy", "Sneezing", "Swelling", "Bloating",
  "Weight Loss", "Hair Loss", "Excessive Salivation", "Mouth Ulcers",
  "Muscle Weakness", "Tremors", "Paralysis", "Seizures",
  "Nasal Discharge", "Eye Discharge", "Skin Rash", "Jaundice",
  "Pale Gums", "Dehydration", "Abnormal Milk",
];

const DURATION_OPTIONS = [
  "Less than 1 day", "1-2 days", "3 days", "4-5 days",
  "1 week", "2 weeks", "1 month", "More than 1 month",
];

function ConfidenceBar({ label, confidence, isTop }) {
  const pct = Math.round(confidence * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className={`${isTop ? "font-semibold text-gray-800" : "text-gray-500"}`}>{label}</span>
        <span className="font-mono text-xs text-gray-500">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${isTop ? "bg-pasture-500" : "bg-gray-300"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function SymptomChecker() {
  const [animals, setAnimals]         = useState([]);
  const [animalId, setAnimalId]       = useState("");
  const [animalType, setAnimalType]   = useState("Dog");
  const [gender, setGender]           = useState("Male");
  const [age, setAge]                 = useState("3");
  const [weight, setWeight]           = useState("30");
  const [duration, setDuration]       = useState("3 days");
  const [temperature, setTemperature] = useState("39.0");
  const [heartRate, setHeartRate]     = useState("80");
  const [yesNoVals, setYesNoVals]     = useState({});
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    client.get("/animals").then((r) => setAnimals(r.data.animals || [])).catch(() => {});
  }, []);

  // When an animal is selected, auto-fill animal type
  function handleAnimalSelect(id) {
    setAnimalId(id);
    if (id) {
      const a = animals.find((x) => String(x.id) === String(id));
      if (a) {
        const mapped = {
          Cattle: "Cow", Buffalo: "Cow", Goat: "Goat", Sheep: "Sheep",
          Poultry: "Dog", Dog: "Dog", Cat: "Cat", Horse: "Horse",
          Pig: "Pig", Rabbit: "Rabbit",
        };
        setAnimalType(mapped[a.species] || "Dog");
      }
    }
  }

  function toggleYesNo(key) {
    setYesNoVals((v) => ({ ...v, [key]: v[key] === "Yes" ? "No" : "Yes" }));
  }

  function toggleSymptom(s) {
    setSelectedSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setResult(null);
    const activeYesNo = Object.keys(yesNoVals).filter((k) => yesNoVals[k] === "Yes");
    if (selectedSymptoms.length === 0 && activeYesNo.length === 0) {
      setError("Please select at least one symptom.");
      return;
    }
    setLoading(true);
    try {
      const res = await client.post("/predict/symptoms", {
        animal_type:      animalType,
        species:          animalType,
        gender,
        age:              parseFloat(age) || 3,
        weight:           parseFloat(weight) || 30,
        duration,
        body_temperature: parseFloat(temperature) || 39.0,
        heart_rate:       parseFloat(heartRate) || 80,
        yes_no_symptoms:  yesNoVals,
        symptoms:         selectedSymptoms.map((s) => s.toLowerCase()),
        animalId:         animalId || undefined,
      });
      setResult(res.data.raw ?? res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  const pct = result ? Math.round((result.confidence ?? 0) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="AI Symptom Checker"
        subtitle="Enter the animal's details and observed symptoms for an AI-assisted disease prediction."
        action={
          <Link
            to="/voice-assistant"
            className="flex items-center gap-1.5 rounded-lg bg-pasture-700 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-pasture-800 transition"
          >
            <Mic size={14} /> 🎙️ Speak in Kannada / Hindi
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Input form ── */}
        <Card className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <ErrorBanner message={error} />

            {/* Animal details */}
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-700">Animal Details</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Select label="Animal Type" value={animalType} onChange={(e) => setAnimalType(e.target.value)}>
                  {ANIMAL_TYPES.map((a) => <option key={a}>{a}</option>)}
                </Select>
                <Select label="Gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option>Male</option>
                  <option>Female</option>
                </Select>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Age (years)</label>
                  <input type="number" min="0" max="30" step="0.5" value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pasture-400 focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Weight (kg)</label>
                  <input type="number" min="0" max="1000" step="0.5" value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pasture-400 focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Temperature (°C)</label>
                  <input type="number" min="35" max="45" step="0.1" value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pasture-400 focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Heart Rate (bpm)</label>
                  <input type="number" min="20" max="500" step="1" value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pasture-400 focus:outline-none" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Select label="Duration of symptoms" value={duration} onChange={(e) => setDuration(e.target.value)}>
                  {DURATION_OPTIONS.map((d) => <option key={d}>{d}</option>)}
                </Select>
                <Select label="Link to animal (optional)" value={animalId} onChange={(e) => handleAnimalSelect(e.target.value)}>
                  <option value="">— Don't save to a record —</option>
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.species})</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Yes/No symptoms */}
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-700">Clinical Signs <span className="font-normal text-gray-400">(toggle all that apply)</span></p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {YES_NO_SYMPTOMS.map(({ key, label }) => {
                  const active = yesNoVals[key] === "Yes";
                  return (
                    <button key={key} type="button" onClick={() => toggleYesNo(key)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition
                        ${active ? "border-pasture-400 bg-pasture-50 text-pasture-800 font-medium" : "border-gray-200 text-gray-600 hover:border-pasture-200"}`}>
                      <span className={`h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center text-xs
                        ${active ? "border-pasture-500 bg-pasture-500 text-white" : "border-gray-300"}`}>
                        {active ? "✓" : ""}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Additional symptoms */}
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-700">Additional Symptoms <span className="font-normal text-gray-400">(select all that apply)</span></p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TEXT_SYMPTOMS.map((s) => {
                  const active = selectedSymptoms.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => toggleSymptom(s)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition
                        ${active ? "border-pasture-400 bg-pasture-50 text-pasture-800 font-medium" : "border-gray-200 text-gray-600 hover:border-pasture-200"}`}>
                      <span className={`h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center text-xs
                        ${active ? "border-pasture-500 bg-pasture-500 text-white" : "border-gray-300"}`}>
                        {active ? "✓" : ""}
                      </span>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Analysing symptoms…
                </span>
              ) : "Run AI symptom check"}
            </Button>
          </form>
        </Card>

        {/* ── Results ── */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Primary diagnosis */}
              <Card className={`border-l-4 ${result.is_urgent ? "border-red-500" : "border-pasture-500"}`}>
                <div className="flex items-start gap-3">
                  {result.is_urgent
                    ? <AlertTriangle size={22} className="text-red-500 mt-0.5 flex-shrink-0" />
                    : <CheckCircle2  size={22} className="text-pasture-600 mt-0.5 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Most likely diagnosis</p>
                    <p className="mt-0.5 text-lg font-bold text-gray-900 leading-tight">{result.label}</p>
                    {result.is_urgent && (
                      <span className="mt-2 inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                        ⚠ Urgent — contact a vet
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Confidence</span>
                    <span className="font-mono font-semibold text-gray-800">{pct}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-3 rounded-full transition-all duration-700 ${result.is_urgent ? "bg-red-500" : "bg-pasture-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Card>

              {/* Recommendation */}
              <Card>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Recommendation</p>
                <p className="text-sm text-gray-700 leading-relaxed">{result.recommendation}</p>
              </Card>

              {/* Differential */}
              {result.differential?.length > 0 && (
                <Card>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Differential diagnosis</p>
                  <div className="space-y-3">
                    {result.differential.map((d, i) => (
                      <ConfidenceBar key={d.label} label={d.label} confidence={d.confidence} isTop={i === 0} />
                    ))}
                  </div>
                </Card>
              )}

              {/* Real data badge */}
              {result.trained_on_real_data && (
                <div className="rounded-lg bg-pasture-50 px-4 py-3 text-xs text-pasture-700">
                  <p className="font-semibold">✓ Trained on real veterinary data</p>
                  <p className="mt-1">Model trained on Kaggle animal disease dataset covering 8 species and 60+ diseases.</p>
                </div>
              )}

              {/* Disclaimer */}
              <div className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500">
                <p className="font-semibold text-gray-600">⚠ Disclaimer</p>
                <p>AI screening only — not a clinical diagnosis. Always confirm with a qualified veterinarian.</p>
              </div>
            </>
          ) : (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <Stethoscope size={36} className="mb-3 text-pasture-200" />
              <p className="text-sm font-medium text-gray-500">Fill in the details and run the check</p>
              <p className="mt-1 text-xs text-gray-400">Results will appear here</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
