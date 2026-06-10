'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  description: string;
}

export default function AdminHeader({ title, description }: AdminHeaderProps) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Overview', href: '/admin' },
    { name: 'Curriculum Management', href: '/admin/curriculum' },
    { name: 'User Directory', href: '/admin/users' },
  ];

  return (
    <>
      {/* Top Indicators */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] box-shadow-glow-green"></div>
          Administrative Workspace • ADMIN
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-[#10b981] bg-[rgba(16,185,129,0.1)] px-3 py-1.5 rounded-full border border-[rgba(16,185,129,0.2)] box-shadow-glow-green">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></div>
          RAG Engine Online
        </div>
      </div>

      {/* Header Area */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-sm text-gray-400">
            {description}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] transition-colors text-sm font-medium text-gray-300">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-[rgba(255,255,255,0.1)] mb-8">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.name}
              {isActive && (
                <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-white rounded-t-full"></div>
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
