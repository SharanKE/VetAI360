import { useEffect, useRef, useState } from "react";
import { UploadCloud, X, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import client from "../api/client";
import { Button, Card, ErrorBanner, PageHeader, Select } from "../components/ui";

const SEVERITY_STYLES = {
  none:     { bar: "bg-pasture-500", badge: "bg-pasture-100 text-pasture-800", label: "No issue found" },
  mild:     { bar: "bg-yellow-400",  badge: "bg-yellow-100 text-yellow-800",   label: "Mild — monitor closely" },
  moderate: { bar: "bg-orange-500",  badge: "bg-orange-100 text-orange-800",   label: "Moderate — vet visit needed" },
  severe:   { bar: "bg-red-500",     badge: "bg-red-100 text-red-800",         label: "Severe — contact vet today" },
  critical: { bar: "bg-red-700",     badge: "bg-red-100 text-red-900",         label: "Critical — urgent vet care" },
  unknown:  { bar: "bg-gray-400",    badge: "bg-gray-100 text-gray-700",       label: "Review needed" },
};

function ConfidenceBar({ label, confidence, isTop }) {
  const pct = Math.round(confidence * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className={`font-medium ${isTop ? "text-gray-800" : "text-gray-500"}`}>{label}</span>
        <span className={`font-mono text-xs ${isTop ? "text-gray-800" : "text-gray-400"}`}>{pct}%</span>
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

export default function ImageDiagnosis() {
  const [animals, setAnimals]   = useState([]);
  const [animalId, setAnimalId] = useState("");
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    client.get("/animals").then((res) => setAnimals(res.data.animals || [])).catch(() => {});
  }, []);

  function applyFile(f) {
    if (!f || !f.type.startsWith("image/")) { setError("Please select an image file (JPG, PNG, etc.)."); return; }
    if (f.size > 8 * 1024 * 1024) { setError("Image must be under 8 MB."); return; }
    setFile(f);
    setResult(null);
    setError("");
    setPreview(URL.createObjectURL(f));
  }

  function handleFile(e) { applyFile(e.target.files[0]); }
  function handleDrop(e) { e.preventDefault(); setDragging(false); applyFile(e.dataTransfer.files[0]); }

  function clearFile() {
    setFile(null); setPreview(null); setResult(null); setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setResult(null);
    if (!file) { setError("Choose a photo first."); return; }
    setLoading(true);
    const formData = new FormData();
    formData.append("image", file);
    if (animalId) formData.append("animalId", animalId);
    try {
      const res = await client.post("/predict/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data.raw ?? res.data);
    } catch (err) {
      const data = err.response?.data;
      if (data && data.is_animal === false) {
        setResult({ _rejected: true, ...data });
      } else {
        setError(err.response?.data?.error || err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  const rejected  = result?._rejected === true;
  const unclear   = result?.unclear === true;
  const sev       = SEVERITY_STYLES[result?.severity] || SEVERITY_STYLES.unknown;
  const pct       = result ? Math.round((result.confidence ?? 0) * 100) : 0;
  const isHealthy = result?.label === "Healthy";

  return (
    <div>
      <PageHeader
        title="Image-Based Diagnosis"
        subtitle="Upload a photo of the animal — Gemini AI will analyse it and identify any health issues."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* ── Upload panel ── */}
        <Card className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="space-y-5">
            <ErrorBanner message={error} />

            <Select
              label="Link result to an animal (optional)"
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
            >
              <option value="">— Don't save to a record —</option>
              {animals.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.species})</option>
              ))}
            </Select>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !file && inputRef.current?.click()}
              className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors
                ${dragging ? "border-pasture-400 bg-pasture-50" : "border-pasture-200 bg-pasture-50/30 hover:border-pasture-300 hover:bg-pasture-50"}`}
            >
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

              {preview ? (
                <>
                  <img src={preview} alt="Preview" className="max-h-48 rounded-xl object-contain shadow" />
                  <p className="text-xs text-gray-500">{file.name} — {(file.size / 1024).toFixed(0)} KB</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    className="absolute right-3 top-3 rounded-full bg-white p-1 shadow hover:bg-red-50"
                  >
                    <X size={14} className="text-red-500" />
                  </button>
                </>
              ) : (
                <>
                  <UploadCloud size={32} className="text-pasture-400" />
                  <p className="text-sm font-medium text-pasture-700">Drag & drop or click to upload</p>
                  <p className="text-xs text-gray-400">JPG or PNG · Max 8 MB</p>
                </>
              )}
            </div>

            {/* Tips */}
            <div className="rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-700 space-y-1">
              <p className="font-semibold flex items-center gap-1"><Zap size={12} /> Powered by AI Vision & Neural Network</p>
              <p>• Upload any clear photo of your animal — full body or close-up of affected area</p>
              <p>• Works best in natural daylight with a steady camera</p>
              <p>• Can detect skin conditions, wounds, lesions, FMD, mange, and more</p>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !file}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Analysing photo with AI…
                </span>
              ) : "Analyse with AI"}
            </Button>
          </form>
        </Card>

        {/* ── Results panel ── */}
        <div className="space-y-4 lg:col-span-2">
          {result ? (
            <>
              {rejected ? (
                /* Not an animal */
                <Card className="border-l-4 border-orange-400">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={22} className="text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-orange-700">Not an animal photo</p>
                      <p className="mt-1 text-sm text-gray-600 leading-relaxed">{result.message}</p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-1.5">
                    {(result.suggestions || []).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </Card>

              ) : unclear ? (
                /* Unclear image */
                <Card className="border-l-4 border-yellow-400">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={22} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-yellow-700">Image too unclear to diagnose</p>
                      <p className="mt-1 text-sm text-gray-600">{result.recommendation}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-gray-500">
                    <p>• Hold camera 15–30 cm from the affected area</p>
                    <p>• Use natural daylight — avoid flash</p>
                    <p>• Keep the camera steady to avoid blur</p>
                  </div>
                </Card>

              ) : (
                /* Normal diagnosis */
                <>
                  {/* Primary result card */}
                  <Card className={`border-l-4 ${isHealthy ? "border-pasture-500" : result.is_urgent ? "border-red-600" : "border-orange-400"}`}>
                    <div className="flex items-start gap-3">
                      {isHealthy
                        ? <CheckCircle2 size={22} className="text-pasture-600 mt-0.5 flex-shrink-0" />
                        : <AlertTriangle size={22} className={`mt-0.5 flex-shrink-0 ${result.is_urgent ? "text-red-600" : "text-orange-500"}`} />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Detected condition</p>
                        <p className="mt-0.5 text-lg font-bold text-gray-900 leading-tight">{result.label}</p>
                        {result.species && (
                          <p className="mt-0.5 text-xs text-gray-500">Animal: <span className="font-medium">{result.species}</span></p>
                        )}
                        <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${sev.badge}`}>
                          {sev.label}
                        </span>
                        {result.is_urgent && (
                          <span className="ml-2 inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                            ⚠ Urgent
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Confidence bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>AI Confidence</span>
                        <span className="font-mono font-semibold text-gray-800">{pct}%</span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-3 rounded-full transition-all duration-700 ${sev.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        {pct >= 80 ? "High confidence" : pct >= 55 ? "Moderate confidence" : "Low confidence — verify with a vet"}
                      </p>
                    </div>
                  </Card>

                  {/* Findings */}
                  {result.findings && (
                    <Card>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">What the AI sees</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{result.findings}</p>
                    </Card>
                  )}

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

                  {/* Disclaimer */}
                  <div className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500 space-y-1">
                    <p className="font-semibold text-gray-600">⚠ Disclaimer</p>
                    <p>This is an AI screening tool — not a clinical diagnosis. Always confirm with a qualified veterinarian before starting any treatment.</p>
                    <p className="mt-1 text-gray-400 italic">{result.model_note}</p>
                  </div>
                </>
              )}
            </>
          ) : (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <UploadCloud size={36} className="mb-3 text-pasture-200" />
              <p className="text-sm font-medium text-gray-500">Upload a photo and click Analyse</p>
              <p className="mt-1 text-xs text-gray-400">AI screening will identify potential health issues</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
