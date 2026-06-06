import React, { useState, useEffect } from 'react';
import useCurriculumStore from '@/store/curriculumStore';
import api from '@/services/api';
import { Loader2, BookOpen } from 'lucide-react';

export default function SplitWorkspace({ children }) {
  const { selectedBookId, selectedChapterId, books } = useCurriculumStore();
  const [chapterData, setChapterData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadChapterContent() {
      if (!selectedBookId || !selectedChapterId) {
        setChapterData(null);
        return;
      }
      setIsLoading(true);
      try {
        const response = await api.get(`/curriculum/books/${selectedBookId}/chapters/${selectedChapterId}`);
        const data = response.data?.data || response.data;
        setChapterData(data);
      } catch (err) {
        console.error('Failed to load chapter content:', err);
        setChapterData(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadChapterContent();
  }, [selectedBookId, selectedChapterId]);

  const selectedBook = books.find((b) => b.id === selectedBookId);
  const selectedChapter = selectedBook?.chapters?.find((c) => c.id === selectedChapterId);

  // Fallback to static mockup if there are no books or chapters registered (e.g. initial demo setup before any uploads)
  const hasNoData = books.length === 0;

  return (
    <div className="flex-1 flex overflow-hidden p-6 gap-6 pt-0">
      {/* Left Workspace Panel (Fixed 40%) - Textbook Reader */}
      <div className="w-[40%] h-full flex flex-col glass-panel rounded-2xl overflow-hidden relative">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-obsidian/80 backdrop-blur-md border-b border-glass-border p-4">
          <h2 className="text-lg font-semibold text-white">Textbook Reader</h2>
          <p className="text-xs text-gray-400">
            {selectedBook ? `${selectedBook.title} - ${selectedChapter?.title || 'Selected Chapter'}` : 'No Book Selected'}
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 text-gray-300 leading-relaxed text-sm">
          {isLoading ? (
            <div className="h-full flex items-center justify-center flex-col gap-2 text-gray-400">
              <Loader2 className="animate-spin text-neon-purple" size={24} />
              <span>Loading chapter content...</span>
            </div>
          ) : hasNoData ? (
            <>
              <p>
                The fundamental principles of artificial intelligence are rooted in the concept of machine learning,
                where systems improve their performance on a given task by analyzing vast amounts of data.
              </p>
              
              <div className="p-4 rounded-xl bg-neon-purple/10 border border-neon-purple/30">
                <h4 className="text-neon-purple font-medium mb-2">Key Concept Highlight</h4>
                <p className="text-gray-200">
                  Neural networks mimic the human brain's interconnected neuron structure, allowing complex pattern recognition
                  and deep learning capabilities.
                </p>
              </div>

              <p>
                In natural language processing (NLP), models use these networks to understand context, semantics, and syntax.
                This forms the basis for modern conversational agents and generative models.
                <br/><br/>
                Another crucial aspect is reinforcement learning, where an agent learns to make decisions by performing actions
                in an environment to maximize a reward signal. This approach has led to significant breakthroughs in robotics
                and complex game playing.
              </p>
            </>
          ) : chapterData?.chunks && chapterData.chunks.length > 0 ? (
            chapterData.chunks.map((chunk, index) => (
              <div key={chunk.id || index} className="space-y-4">
                <p className="whitespace-pre-wrap">{chunk.contentText}</p>
                {index < chapterData.chunks.length - 1 && <hr className="border-white/5 my-4" />}
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-12">
              <BookOpen size={48} className="text-gray-600 mb-4" />
              <p className="font-medium">No content has been ingested for this chapter yet.</p>
              <p className="text-xs text-gray-600 mt-1">Please add a PDF to this chapter in the admin workspace.</p>
            </div>
          )}
          <div className="h-20"></div> {/* Spacer for scroll bottom */}
        </div>
      </div>

      {/* Right Workspace Panel (Dynamic 60%) - AI Orchestration Canvas */}
      <div className="w-[60%] h-full flex flex-col relative rounded-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}
