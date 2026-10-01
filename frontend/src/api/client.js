import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:5000/api");

const client = axios.create({ baseURL: API_BASE });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("vetai360_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    // Preserve err.response so callers can inspect status + body
    // (e.g. the gatekeeper returns 400 + { is_animal: false })
    const message = err.response?.data?.error || "Something went wrong. Please try again.";
    const forward = new Error(message);
    forward.response = err.response;   // keep the original response
    return Promise.reject(forward);
  }
);

export default client;
