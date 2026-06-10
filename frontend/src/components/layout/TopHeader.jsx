import React from 'react';
import { Sparkles } from 'lucide-react';

export default function TopHeader() {
  return (
    <header data-id="top-header" className="h-[70px] w-full flex items-center justify-end px-6 z-20">
      {/* RAG Engine Status indicator */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-emerald-green/30">
        <div className="w-2 h-2 rounded-full bg-emerald-green box-shadow-glow-green animate-pulse"></div>
        <Sparkles size={14} className="text-emerald-green" />
        <span className="text-sm font-medium text-emerald-green text-shadow-glow-green">RAG Engine Active</span>
      </div>
    </header>
  );
}
