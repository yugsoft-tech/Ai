"use client";

import React, { useState } from 'react';
import StudentSidebar from '@/components/layout/StudentSidebar';
import { Menu } from 'lucide-react';

export default function StudentLayout({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen bg-obsidian overflow-hidden font-sans">
      <StudentSidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      
      <main className="flex-1 h-full overflow-y-auto custom-scrollbar relative flex flex-col">
        {/* Mobile Header for Sidebar Toggle */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-glass-border bg-black/40 backdrop-blur-md sticky top-0 z-30">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-indigo-400">Yugsoft</span> Edu
          </h1>
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg bg-white/5 text-gray-300 hover:text-white"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-1/2 h-64 bg-indigo-900/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>
        
        <div className="flex-1 p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
