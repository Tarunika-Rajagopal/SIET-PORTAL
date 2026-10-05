import React from 'react';
import Grainient from './Grainient';
import { GrainientBackground } from './GrainientBackground';

export default function GrainientDemo() {
  return (
    <GrainientBackground className="min-h-screen w-full flex items-center justify-center p-8">
      <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl border border-white/40 shadow-2xl text-center max-w-md">
        <h1 className="text-3xl font-bold text-[#176B7A] mb-2">Deep Teal Grainient</h1>
        <p className="text-slate-600 text-sm mb-4">
          WebGL animated grain shader in deep teal (#176B7A).
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#176B7A]/10 text-[#176B7A] text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#176B7A] animate-pulse" />
          WebGL Active
        </div>
      </div>
    </GrainientBackground>
  );
}
