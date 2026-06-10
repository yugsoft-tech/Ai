'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, Database, Sparkles, Building2, Settings, Loader2 } from 'lucide-react';
import Link from 'next/link';
import StatsCard from '@/components/admin/StatsCard';
import AdminHeader from '@/components/admin/AdminHeader';
import CreateBookModal from '@/components/admin/CreateBookModal';
import api from '@/services/api';

export default function AdminDashboardOverview() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({ books: 0, classes: 0, chapters: 0 });
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [booksRes, classesRes, meRes] = await Promise.all([
        api.get('/curriculum/books'),
        api.get('/curriculum/classes'),
        api.get('/users/me')
      ]);

      const books = booksRes.data?.data || booksRes.data || [];
      const classes = classesRes.data?.data || classesRes.data || [];
      const me = meRes.data?.data || meRes.data;

      const totalChapters = books.reduce((acc: number, book: any) => acc + (book.chapters?.length || 0), 0);

      setStats({
        books: books.length,
        classes: classes.length,
        chapters: totalChapters
      });
      setTenantInfo(me);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="p-8 max-w-[1600px] mx-auto relative">
      <AdminHeader 
        title="Tech Administration Canvas" 
        description="Manage educational curriculum, PDF ingestions, and user permissions." 
      />

      <CreateBookModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="TOTAL BOOKS"
          value={isLoading ? '...' : stats.books.toString()}
          icon={BookOpen}
          iconBgColor="bg-[rgba(139,92,246,0.1)]"
          iconColor="text-[#8b5cf6]"
        />
        <StatsCard
          label="UNIQUE CLASSES"
          value={isLoading ? '...' : stats.classes.toString()}
          icon={GraduationCap}
          iconBgColor="bg-[rgba(16,185,129,0.1)]"
          iconColor="text-[#10b981]"
        />
        <StatsCard
          label="TOTAL CHAPTERS"
          value={isLoading ? '...' : stats.chapters.toString()}
          icon={Database}
          iconBgColor="bg-[rgba(59,130,246,0.1)]"
          iconColor="text-blue-500"
        />
        <StatsCard
          label="RAG STATUS"
          value="Active"
          icon={Sparkles}
          iconBgColor="bg-[rgba(234,179,8,0.1)]"
          iconColor="text-yellow-500"
        />
      </div>

      {/* Action Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Quick Curriculum Setup */}
        <div className="lg:col-span-7 glass-panel rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="text-purple-400" size={20} />
              <h2 className="text-lg font-bold text-white">Quick Curriculum Setup</h2>
            </div>
            <p className="text-sm text-gray-400 mb-8 max-w-md leading-relaxed">
              Quickly add new textbooks, specify classes, and outline chapters to expand the library database.
            </p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white py-2.5 rounded-lg text-sm font-semibold transition-colors box-shadow-glow-purple flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="text-lg leading-none mb-0.5">+</span> Create Book
            </button>
            <Link href="/admin/curriculum" className="flex-1">
              <button className="w-full h-full bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.1)] text-white py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer">
                Manage Chapters
              </button>
            </Link>
          </div>
        </div>

        {/* Tenant Information */}
        <div className="lg:col-span-5 glass-panel rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="text-[#10b981]" size={20} />
            <h2 className="text-lg font-bold text-white">Tenant Information</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-[rgba(255,255,255,0.05)]">
              <span className="text-xs text-gray-400">User Email:</span>
              <span className="text-xs font-medium text-gray-200">{tenantInfo?.email || 'Loading...'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[rgba(255,255,255,0.05)]">
              <span className="text-xs text-gray-400">Current Role:</span>
              <span className="text-xs font-bold text-[#8b5cf6]">{tenantInfo?.role || 'ADMIN'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[rgba(255,255,255,0.05)]">
              <span className="text-xs text-gray-400">Tenant ID:</span>
              <span className="text-[10px] font-mono text-gray-500 truncate max-w-[150px]">{tenantInfo?.tenantId || 'Loading...'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-gray-400">LLM Ingestion Model:</span>
              <span className="text-xs font-semibold text-[#10b981]">gemini-embedding-2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
