import React from 'react';
import { 
  LayoutDashboard, BookOpen, Users, LogOut, GraduationCap, User 
} from 'lucide-react';
import useAuthStore from '@/store/authStore';
import Link from 'next/link';

export default function AdminSidebar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuthStore();
  const userEmail = user?.email || 'admin@yugsoft.com';
  const displayEmail = userEmail.split('@')[0];

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'curriculum', label: 'Curriculum Manager', icon: BookOpen },
    { id: 'users', label: 'User Directory', icon: Users },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="w-[260px] h-full flex flex-col glass-panel border-l-0 border-y-0 rounded-none z-10">
      {/* Brand Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2">
          <span className="text-emerald-green text-shadow-glow-green">Yugsoft</span> Admin
        </h1>
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-2">
        <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider px-4 mb-2">
          Administration
        </div>
        
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-r-lg transition-all duration-200 text-sm font-medium
                ${isActive 
                  ? 'bg-emerald-green/10 text-white border-l-4 border-emerald-green box-shadow-glow-green' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border-l-4 border-transparent'
                }
              `}
            >
              <Icon size={18} className={isActive ? "text-emerald-green" : ""} />
              {item.label}
            </button>
          );
        })}

      </div>

      {/* User Profile Pill */}
      <div className="p-4 border-t border-glass-border space-y-2">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
          <div className="w-8 h-8 rounded-full bg-emerald-green/20 flex items-center justify-center text-emerald-green border border-emerald-green/50">
            <User size={16} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayEmail}</p>
            <p className="text-xs text-gray-400 font-semibold uppercase">Admin</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-semibold transition-colors"
        >
          <LogOut size={16} />
          Log Out
        </button>
      </div>
    </div>
  );
}
