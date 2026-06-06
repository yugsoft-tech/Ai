"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';
import SplitWorkspace from '@/components/layout/SplitWorkspace';

// Feature Components
import ChatWithBook from '@/components/features/ChatWithBook';
import AILessonPlan from '@/components/features/AILessonPlan';
import WorksheetGen from '@/components/features/WorksheetGen';
import CustomWorksheet from '@/components/features/CustomWorksheet';
import AnswerKeyGen from '@/components/features/AnswerKeyGen';
import AIPPTGen from '@/components/features/AIPPTGen';
import TestPaperGen from '@/components/features/TestPaperGen';
import AIHomeworkGen from '@/components/features/AIHomeworkGen';

export default function Dashboard() {
  const { user, isAuthenticated, fetchProfile } = useAuthStore();
  const router = useRouter();
  const [activeTool, setActiveTool] = useState('chat');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!user) {
      fetchProfile();
      return;
    }

    if (user.role === 'admin') {
      router.push('/admin');
    } else if (user.role === 'student') {
      router.push('/student');
    }
  }, [user, isAuthenticated, router, fetchProfile]);

  if (!isAuthenticated || !user || user.role === 'admin' || user.role === 'student') {
    return (
      <div className="min-h-screen w-screen bg-[#050505] text-white flex items-center justify-center absolute inset-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-neon-purple border-t-transparent rounded-full animate-spin" />
          <span>Redirecting to your dashboard...</span>
        </div>
      </div>
    );
  }

  const renderTool = () => {
    switch (activeTool) {
      case 'chat': return <ChatWithBook />;
      case 'lesson': return <AILessonPlan />;
      case 'worksheet': return <WorksheetGen />;
      case 'custom-worksheet': return <CustomWorksheet />;
      case 'answer-key': return <AnswerKeyGen />;
      case 'ppt': return <AIPPTGen />;
      case 'test-paper': return <TestPaperGen />;
      case 'homework': return <AIHomeworkGen />;
      default: return <ChatWithBook />;
    }
  };

  return (
    <div className="h-full flex overflow-hidden">
      <Sidebar activeTool={activeTool} setActiveTool={setActiveTool} />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <TopHeader />
        <SplitWorkspace>
          {renderTool()}
        </SplitWorkspace>
      </div>
    </div>
  );
}
