export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden w-1/2 flex-col justify-between bg-pasture-900 px-14 py-14 lg:flex">
        <p className="font-display text-2xl font-semibold text-white">
          VetAI <span className="text-amber-300">360</span>
        </p>

        <div>
          <p className="font-display text-4xl font-semibold leading-tight text-white">
            One platform for every animal on the farm.
          </p>
          <p className="mt-4 max-w-md text-pasture-200">
            Real-time IoT vitals, AI-assisted disease screening, vaccination
            tracking, and instant vet consultations — built for rural
            livestock healthcare access.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 font-mono text-xs text-pasture-300">
            <div className="rounded-lg border border-pasture-700 px-3 py-3">
              <p className="text-lg text-amber-300">IoT</p>
              <p>Live vitals</p>
            </div>
            <div className="rounded-lg border border-pasture-700 px-3 py-3">
              <p className="text-lg text-amber-300">CNN</p>
              <p>Image diagnosis</p>
            </div>
            <div className="rounded-lg border border-pasture-700 px-3 py-3">
              <p className="text-lg text-amber-300">RTC</p>
              <p>Telemedicine</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-pasture-400">PES Institute of Technology and Management · Dept. of CE</p>
      </div>

      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
