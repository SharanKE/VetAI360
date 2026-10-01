import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="font-display text-4xl font-semibold text-pasture-700">404</p>
      <p className="mt-2 text-gray-500">That page doesn't exist.</p>
      <Link to="/" className="mt-4 text-sm font-medium text-pasture-700 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
