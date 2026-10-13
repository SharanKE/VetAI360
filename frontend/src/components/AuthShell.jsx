import { useState } from "react";

export default function AuthShell({ title, subtitle, children }) {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  function handleMouseMove(e) {
    setMousePos({ x: e.clientX, y: e.clientY });
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 via-white to-pasture-50/40 px-4 py-12 select-none-text"
    >
      {/* ======================================================== */}
      {/* DYNAMIC MOUSE-FOLLOW SPOTLIGHT (Animates with cursor)     */}
      {/* ======================================================== */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(32, 99, 69, 0.09), transparent 80%)`,
        }}
      />

      {/* Soft Ambient Corner Lights */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[520px] -translate-x-1/2 rounded-full bg-pasture-200/30 blur-3xl animate-pulse-subtle" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-amber-100/30 blur-3xl animate-pulse-subtle [animation-delay:4s]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Interactive Logo with Hover Animation */}
        <div className="mb-6 text-center group cursor-pointer">
          <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-2xl bg-pasture-800 text-white shadow-md transition-all duration-300 ease-out group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-xl group-hover:bg-pasture-700">
            <span className="text-2xl transition-transform duration-300 group-hover:scale-125">
              🐾
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink transition-colors duration-200 group-hover:text-pasture-700">
            VetAI <span className="text-amber-500 transition-colors duration-200 group-hover:text-amber-600">360</span>
          </h1>
          <p className="mt-1 text-xs text-gray-500 transition-colors duration-200 group-hover:text-gray-700">
            Smart Veterinary Healthcare Platform
          </p>
        </div>

        {/* Clean Auth Card with Hover Floating Lift */}
        <div className="rounded-2xl border border-gray-100 bg-white/95 backdrop-blur-md p-7 shadow-xl shadow-pasture-950/5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-pasture-900/10 sm:p-9 animate-fade-in">
          <div className="mb-6">
            <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{subtitle}</p>
            )}
          </div>

          <div>{children}</div>
        </div>

        {/* Minimal Footer */}
        <p className="mt-6 text-center text-[11px] text-gray-400 transition-colors duration-200 hover:text-gray-600">
          PES Institute of Technology and Management · Dept. of CE
        </p>
      </div>
    </div>
  );
}
