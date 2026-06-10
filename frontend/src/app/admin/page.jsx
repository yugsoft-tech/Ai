"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import AdminSidebar from '@/components/layout/AdminSidebar';
import AdminPanel from '@/components/features/AdminPanel';
import { Sparkles, ShieldAlert } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, isAuthenticated, fetchProfile } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!user) {
      fetchProfile();
      return;
    }

    // Direct authorization check: only admin role is allowed
    if (user.role !== 'admin') {
      router.push('/teacher');
    }
  }, [user, isAuthenticated, router, fetchProfile]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
          <span>Authenticating...</span>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert size={48} className="text-red-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-gray-400 mt-2">You do not have permission to view the Administration Portal.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden bg-[#050505]">
      {/* Admin Sidebar */}
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Simplified Admin Top Header */}
        <header className="h-[70px] w-full flex items-center justify-between px-6 border-b border-glass-border bg-[#050505]/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-green box-shadow-glow-green" />
            <h2 className="text-sm font-semibold text-gray-200">Administrative Workspace &bull; {user.role.toUpperCase()}</h2>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-emerald-green/30">
            <div className="w-2 h-2 rounded-full bg-emerald-green box-shadow-glow-green animate-pulse" />
            <Sparkles size={14} className="text-emerald-green" />
            <span className="text-sm font-medium text-emerald-green text-shadow-glow-green">RAG Engine Online</span>
          </div>
        </header>

        {/* Dynamic Admin Panel */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <AdminPanel activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>
    </div>
  );
}
