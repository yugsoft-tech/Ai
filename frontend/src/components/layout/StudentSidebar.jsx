import React from 'react';
import Link from 'next/link';
import { 
  Gamepad2, Trophy, LayoutDashboard, Settings,
  User, LogOut, X, Flame, BookOpen
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import useAuthStore from '@/store/authStore';

const TOOLS = [
  { id: 'dashboard', href: '/student', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chat', href: '/student/chat', label: 'Chat with Book', icon: BookOpen },
  { id: 'quiz-gen', href: '/student/quiz-gen', label: 'Quiz Generator', icon: Flame },
  { id: 'my-quizzes', href: '/student/quizzes', label: 'My Quizzes', icon: Gamepad2 },
  { id: 'leaderboard', href: '/student/leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'settings', href: '/student/settings', label: 'Settings', icon: Settings },
];

export default function StudentSidebar({ isMobileOpen, setIsMobileOpen }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const userRole = user?.role || 'student';
  const userEmail = user?.email || 'student@school.com';
  const displayRole = userRole.charAt(0).toUpperCase() + userRole.slice(1);
  const displayEmail = userEmail.split('@')[0];

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}
      
      <div className={`fixed md:static inset-y-0 left-0 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out w-[250px] md:w-[250px] h-full flex flex-col glass-panel border-l-0 border-y-0 md:rounded-none z-50`}>
        <div className="flex items-center justify-between p-6">
          <Link href="/student" className="block hover:opacity-80 transition-opacity">
            <h1 className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2">
              <span className="text-indigo-400 text-shadow-glow-purple">Yugsoft</span> Edu
            </h1>
          </Link>
          <button 
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setIsMobileOpen?.(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-2">
          {TOOLS.map((tool) => {
            const isActive = pathname === tool.href || (pathname.startsWith(tool.href) && tool.href !== '/student');
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                onClick={() => {
                  if (setIsMobileOpen) setIsMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-r-lg transition-all duration-200 text-sm font-medium
                  ${isActive 
                    ? 'bg-indigo-500/20 text-white border-l-4 border-indigo-500 box-shadow-glow-purple' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border-l-4 border-transparent'
                  }
                `}
              >
                <Icon size={18} className={isActive ? "text-indigo-400" : ""} />
                {tool.label}
              </Link>
            );
          })}
        </div>

        {/* User Profile Pill & Logout */}
        <div className="p-4 border-t border-glass-border space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 border border-orange-500/50">
              <Flame size={16} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-white max-w-[140px] truncate">{displayEmail}</p>
              <p className="text-xs text-gray-400">{displayRole}</p>
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
    </>
  );
}
