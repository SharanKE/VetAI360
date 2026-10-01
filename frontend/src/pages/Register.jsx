import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, ErrorBanner, Input, Select } from "../components/ui";
import AuthShell from "../components/AuthShell";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "farmer",
    phone: "",
    specialty: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await register(form);
      if (data.notice) {
        setNotice(data.notice);
        setLoading(false);
        return;
      }
      navigate("/");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (notice) {
    return (
      <AuthShell title="Almost there" subtitle="One more step before you can sign in.">
        <div className="rounded-lg bg-amber-50 px-4 py-4 text-sm text-amber-800">{notice}</div>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-pasture-700 hover:underline">
          Go to sign in →
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="Join VetAI 360 as a farmer or veterinarian.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />
        <Select label="I am a…" value={form.role} onChange={(e) => update("role", e.target.value)}>
          <option value="farmer">Farmer / Livestock owner</option>
          <option value="vet">Veterinarian</option>
        </Select>
        <Input label="Full name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          required
        />
        <Input label="Phone (optional)" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        {form.role === "vet" && (
          <Input
            label="Specialty"
            placeholder="e.g. Large Animal Medicine"
            value={form.specialty}
            onChange={(e) => update("specialty", e.target.value)}
          />
        )}
        <Input
          label="Password"
          type="password"
          minLength={6}
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-pasture-700 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
