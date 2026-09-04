import React from 'react';

export interface LoadingScreenProps {
  message?: string;
  subtitle?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Memuat data sistem...",
  subtitle = "Kejaksaan Agung Republik Indonesia",
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#061a0e] via-[#0a2e1e] to-[#0d3b27] overflow-hidden">

      {/* Background decorative rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[420px] h-[420px] rounded-full border border-white/5"
          style={{ animation: 'ringPulse 4s ease-in-out infinite' }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full border border-amber-400/10"
          style={{ animation: 'ringPulse 4s ease-in-out infinite 1s' }}
        />
        <div
          className="absolute w-[180px] h-[180px] rounded-full border border-emerald-400/10"
          style={{ animation: 'ringPulse 4s ease-in-out infinite 2s' }}
        />
      </div>

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Glow blob top-right */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      {/* Glow blob bottom-left */}
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main content card */}
      <div className="relative flex flex-col items-center gap-7 px-6 max-w-xs w-full">

        {/* Logo container with animated glow */}
        <div className="relative flex items-center justify-center">
          {/* Outer ping ring */}
          <div
            className="absolute w-28 h-28 rounded-full bg-amber-400/15"
            style={{ animation: 'logoPing 2.4s ease-out infinite' }}
          />
          {/* Inner glow ring */}
          <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-amber-400/20 to-emerald-500/20 blur-md" />

          {/* Logo circle */}
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#0d3b27] to-[#061a0e] border border-amber-400/30 flex items-center justify-center shadow-2xl ring-1 ring-white/10">
            <img
              src="/logo-pidmil.png"
              alt="Logo JAMPIDMIL"
              className="w-14 h-14 object-contain drop-shadow-lg"
            />
          </div>
        </div>

        {/* Brand title */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold text-white tracking-widest uppercase drop-shadow">
            JAMPIDMIL
          </h1>
          <div className="flex items-center gap-2 justify-center">
            <div className="h-px flex-1 bg-amber-400/30" />
            <span className="text-[10px] text-amber-300/80 font-bold uppercase tracking-[0.2em]">
              Kejaksaan RI
            </span>
            <div className="h-px flex-1 bg-amber-400/30" />
          </div>
          <p className="text-[11px] text-emerald-300/60 font-medium tracking-wider">
            {subtitle}
          </p>
        </div>

        {/* Loading message pill */}
        <div className="flex items-center gap-2.5 bg-black/30 px-4 py-2.5 rounded-full border border-white/10 backdrop-blur-sm w-full justify-center">
          {/* Triple dot spinner */}
          <div className="flex items-center gap-1 shrink-0">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-amber-400"
                style={{
                  animation: `dotBounce 1.2s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
          <span className="text-xs text-emerald-100/90 font-medium text-center leading-tight">
            {message}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-400 rounded-full"
            style={{ animation: 'loadingBar 1.8s ease-in-out infinite' }}
          />
        </div>

        {/* Footer text */}
        <p className="text-[10px] text-white/20 tracking-widest uppercase font-semibold">
          Portal Layanan Surat T-10
        </p>
      </div>

      <style>{`
        @keyframes loadingBar {
          0%   { transform: translateX(-100%); opacity: 0.6; }
          50%  { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0.6; }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1.2); opacity: 1; }
        }
        @keyframes logoPing {
          0%   { transform: scale(1);   opacity: 0.4; }
          70%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes ringPulse {
          0%, 100% { transform: scale(1);    opacity: 0.5; }
          50%       { transform: scale(1.05); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
