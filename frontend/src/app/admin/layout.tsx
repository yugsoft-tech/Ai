import React from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata = {
  title: 'Yugsoft Admin',
  description: 'Administrative Workspace',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen bg-[#050505] overflow-hidden font-sans">
      <AdminSidebar />
      <main className="flex-1 h-full overflow-y-auto custom-scrollbar relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/4 w-1/2 h-64 bg-emerald-900/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>
        {children}
      </main>
    </div>
  );
}
