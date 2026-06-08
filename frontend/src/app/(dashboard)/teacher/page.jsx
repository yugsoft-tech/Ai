"use client";

import React, { useState } from 'react';
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
  const [activeTool, setActiveTool] = useState('chat');

  return (
    <div className="h-full flex overflow-hidden">
      <Sidebar activeTool={activeTool} setActiveTool={setActiveTool} />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <TopHeader />
        <SplitWorkspace>
          <div className={`h-full w-full ${activeTool === 'chat' ? 'block' : 'hidden'}`}>
            <ChatWithBook />
          </div>
          <div className={`h-full w-full ${activeTool === 'lesson' ? 'block' : 'hidden'}`}>
            <AILessonPlan />
          </div>
          <div className={`h-full w-full ${activeTool === 'worksheet' ? 'block' : 'hidden'}`}>
            <WorksheetGen />
          </div>
          <div className={`h-full w-full ${activeTool === 'custom-worksheet' ? 'block' : 'hidden'}`}>
            <CustomWorksheet />
          </div>
          <div className={`h-full w-full ${activeTool === 'answer-key' ? 'block' : 'hidden'}`}>
            <AnswerKeyGen />
          </div>
          <div className={`h-full w-full ${activeTool === 'ppt' ? 'block' : 'hidden'}`}>
            <AIPPTGen />
          </div>
          <div className={`h-full w-full ${activeTool === 'test-paper' ? 'block' : 'hidden'}`}>
            <TestPaperGen />
          </div>
          <div className={`h-full w-full ${activeTool === 'homework' ? 'block' : 'hidden'}`}>
            <AIHomeworkGen />
          </div>
        </SplitWorkspace>
      </div>
    </div>
  );
}
