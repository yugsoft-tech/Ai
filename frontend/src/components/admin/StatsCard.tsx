import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  glowColor?: string;
}

export default function StatsCard({ label, value, icon: Icon, iconBgColor, iconColor, glowColor }: StatsCardProps) {
  return (
    <div className="glass-panel p-4 rounded-xl flex items-center gap-4 transition-all duration-300 hover:bg-[rgba(255,255,255,0.08)] cursor-default">
      <div 
        className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBgColor} ${glowColor ? glowColor : ''}`}
      >
        <Icon className={iconColor} size={20} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-1">
          {label}
        </div>
        <div className={`text-2xl font-bold ${value === 'Active' ? 'text-[#10b981]' : 'text-white'}`}>
          {value}
        </div>
      </div>
    </div>
  );
}
