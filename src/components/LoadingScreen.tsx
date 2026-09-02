import React from 'react';
import { Shield } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#0a2e1e] via-[#0d3b27] to-[#061f14]">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 1px, transparent 1px),
                          radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Animated shield icon */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 flex items-center justify-center backdrop-blur-sm">
            <Shield className="w-10 h-10 text-amber-400" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-1.5">
          <h1 className="text-lg font-bold text-white tracking-wide uppercase">
            JAMPIDMIL
          </h1>
          <p className="text-xs text-emerald-300/70 font-medium tracking-wider uppercase">
            Kejaksaan Agung Republik Indonesia
          </p>
        </div>

        {/* Spinner */}
        <div className="flex items-center gap-3 mt-2">
          <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          <span className="text-sm text-emerald-200/80 font-medium">
            Memuat data sistem...
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-56 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full"
            style={{
              animation: 'loadingBar 2s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes loadingBar {
          0% { width: 0%; opacity: 0.7; }
          50% { width: 70%; opacity: 1; }
          100% { width: 100%; opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};
