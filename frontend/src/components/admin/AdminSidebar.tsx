'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, Users, LogOut } from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Curriculum Manager', href: '/admin/curriculum', icon: BookOpen },
    { label: 'User Directory', href: '/admin/users', icon: Users },
  ];

  return (
    <aside className="w-64 h-full flex flex-col bg-[#080808] border-r border-[rgba(255,255,255,0.05)] font-sans">
      {/* Logo Section */}
      <div className="p-6 pb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-[#10b981]">Yugsoft</span>
          <span className="text-white">Admin</span>
        </h1>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4">
        <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-4 px-2">
          Administration
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981] box-shadow-glow-green border border-[rgba(16,185,129,0.2)]'
                    : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-[#10b981]' : ''} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.05)]">
        <div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-3 border border-[rgba(255,255,255,0.05)] mb-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[rgba(16,185,129,0.2)] flex items-center justify-center border border-[rgba(16,185,129,0.3)]">
            <Users size={14} className="text-[#10b981]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">ajeet.admin</div>
            <div className="text-[10px] text-gray-400">ADMIN</div>
          </div>
        </div>
        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[rgba(239,68,68,0.1)] text-red-400 hover:bg-[rgba(239,68,68,0.15)] transition-colors border border-[rgba(239,68,68,0.2)] text-xs font-medium">
          <LogOut size={14} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
