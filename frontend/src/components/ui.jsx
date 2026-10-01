export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-pasture-100 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-pasture-600 text-white hover:bg-pasture-700",
    secondary: "bg-pasture-50 text-pasture-700 hover:bg-pasture-100",
    danger: "bg-alertred text-white hover:bg-red-800",
    ghost: "text-pasture-700 hover:bg-pasture-50",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>}
      <input
        className={`w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-pasture-400 focus:ring-2 focus:ring-pasture-100 ${className}`}
        {...props}
      />
    </label>
  );
}

export function Select({ label, children, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>}
      <select
        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-pasture-400 focus:ring-2 focus:ring-pasture-100 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>}
      <textarea
        className={`w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-pasture-400 focus:ring-2 focus:ring-pasture-100 ${className}`}
        {...props}
      />
    </label>
  );
}

const SEVERITY_STYLES = {
  low: "bg-pasture-50 text-pasture-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-alertred",
};

export function SeverityBadge({ severity }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.low}`}>
      {severity}
    </span>
  );
}

export function EmptyState({ title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-pasture-200 bg-pasture-50/40 px-6 py-14 text-center">
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {subtitle && <p className="mt-1.5 max-w-sm text-sm text-gray-500">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-alertred">
      {message}
    </div>
  );
}
