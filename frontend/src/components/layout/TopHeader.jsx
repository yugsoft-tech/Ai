import React from 'react';
import { Sparkles, Menu } from 'lucide-react';

export default function TopHeader({ toggleSidebar }) {
  return (
    <header data-id="top-header" className="h-[70px] shrink-0 w-full flex items-center justify-between md:justify-end px-4 md:px-6 z-20 border-b border-glass-border md:border-none">
      {/* Mobile Menu Button */}
      {toggleSidebar && (
        <button onClick={toggleSidebar} className="md:hidden p-2 -ml-2 text-gray-300 hover:text-white transition-colors">
          <Menu size={24} />
        </button>
      )}

      {/* RAG Engine Status indicator */}
      <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full glass-panel border-emerald-green/30">
        <div className="w-2 h-2 rounded-full bg-emerald-green box-shadow-glow-green animate-pulse"></div>
        <Sparkles size={14} className="text-emerald-green" />
        <span className="text-xs md:text-sm font-medium text-emerald-green text-shadow-glow-green hidden sm:inline">RAG Engine Active</span>
        <span className="text-xs font-medium text-emerald-green text-shadow-glow-green sm:hidden">RAG Active</span>
      </div>
    </header>
  );
}
