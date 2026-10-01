import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Livestock from "./pages/Livestock";
import AnimalProfile from "./pages/AnimalProfile";
import Monitoring from "./pages/Monitoring";
import PastureMap from "./pages/PastureMap";
import VoiceAssistant from "./pages/VoiceAssistant";
import SymptomChecker from "./pages/SymptomChecker";
import ImageDiagnosis from "./pages/ImageDiagnosis";
import Vaccinations from "./pages/Vaccinations";
import AlertsPage from "./pages/AlertsPage";
import Telemedicine from "./pages/Telemedicine";
import AppointmentRoom from "./pages/AppointmentRoom";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function FullScreenLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pasture-200 border-t-pasture-600" />
        <p className="font-mono text-xs tracking-wide text-pasture-700">LOADING VETAI 360…</p>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="livestock" element={<Livestock />} />
        <Route path="livestock/:id" element={<AnimalProfile />} />
        <Route path="monitoring" element={<Monitoring />} />
        <Route path="pasture-map" element={<PastureMap />} />
        <Route path="voice-assistant" element={<VoiceAssistant />} />
        <Route path="symptom-checker" element={<SymptomChecker />} />
        <Route path="image-diagnosis" element={<ImageDiagnosis />} />
        <Route path="vaccinations" element={<Vaccinations />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="telemedicine" element={<Telemedicine />} />
        <Route path="telemedicine/:id" element={<AppointmentRoom />} />
        <Route path="admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
