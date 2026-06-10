import React from 'react';
import useCurriculumStore from '@/store/curriculumStore';
import { Loader2 } from 'lucide-react';

export default function SplitWorkspace({ children, showReader = true }) {
  const { chapterDetails, isChapterDetailsLoading } = useCurriculumStore();
  const chapterTitle = chapterDetails?.title || 'No Chapter Selected';

  return (
    <div className="flex-1 flex overflow-hidden p-6 gap-6 pt-0">
      {/* Left Workspace Panel (Fixed 40%) - Textbook Reader */}
      {showReader && (
        <div className="w-[40%] h-full flex flex-col glass-panel rounded-2xl overflow-hidden relative">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-obsidian/80 backdrop-blur-md border-b border-glass-border p-4">
          <h2 className="text-lg font-semibold text-white">Textbook Reader</h2>
          <p className="text-xs text-gray-400">{chapterTitle}</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 text-gray-300 leading-relaxed text-sm relative">
          {isChapterDetailsLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-obsidian/50 z-10">
              <Loader2 className="animate-spin text-neon-purple w-8 h-8" />
            </div>
          )}
          
          {chapterDetails?.chunks?.length > 0 ? (
            chapterDetails.chunks.map((chunk, index) => (
              <p key={chunk.id || index}>
                {chunk.contentText}
              </p>
            ))
          ) : (
            !isChapterDetailsLoading && (
              <div className="text-gray-500 italic text-center mt-10">
                No content available for this chapter.
              </div>
            )
          )}

          <div className="h-20"></div> {/* Spacer for scroll bottom */}
        </div>
      </div>
      )}

      {/* Right Workspace Panel (Dynamic) - AI Orchestration Canvas */}
      <div className={`${showReader ? 'w-[60%]' : 'w-full'} h-full flex flex-col relative rounded-2xl overflow-hidden`}>
        {children}
      </div>
    </div>
  );
}
