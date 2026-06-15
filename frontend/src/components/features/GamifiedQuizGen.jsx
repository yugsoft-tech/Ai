"use client";

import React, { useState, useEffect } from 'react';
import { Gamepad2, BookOpen, Layers, Sparkles, Loader2 } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import api from '@/services/api';
import { GamifiedQuizUI } from './gamified-quiz/GamifiedQuizUI';

export default function GamifiedQuizGen() {
  const [books, setBooks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedChapterIds, setSelectedChapterIds] = useState([]);
  const [isBooksLoading, setIsBooksLoading] = useState(false);
  const [isChaptersLoading, setIsChaptersLoading] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizData, setQuizData] = useState(null);

  useEffect(() => {
    setIsBooksLoading(true);
    api.get("/curriculum/books").then((res) => {
      const data = res.data?.data || res.data || [];
      setBooks(data);
    }).catch(console.error).finally(() => setIsBooksLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedBookId) {
      setChapters([]);
      setSelectedChapterIds([]);
      return;
    }
    setIsChaptersLoading(true);
    api.get(`/curriculum/books/${selectedBookId}/chapters`).then((res) => {
      const data = res.data?.data || res.data || [];
      setChapters(data);
    }).catch(console.error).finally(() => setIsChaptersLoading(false));
  }, [selectedBookId]);

  const toggleChapter = (chapterId) => {
    setSelectedChapterIds(prev => 
      prev.includes(chapterId) 
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const reqDto = {
        prompt: "Generate a fun and challenging gamified quiz based on the selected chapters.",
        bookId: selectedBookId,
        chapterIds: selectedChapterIds,
      };
      
      const res = await api.post('/ai-tools/gamified-quiz/generate', reqDto);
      const rawData = res.data?.data?.content || res.data?.content || res.data;
      
      let parsed = null;
      if (typeof rawData === 'string') {
        const cleanStr = rawData.replace(/^```(?:json)?\s*/i, '').replace(/\\s*```\\s*$/i, '').trim();
        parsed = JSON.parse(cleanStr);
      } else {
        parsed = rawData;
      }
      
      setQuizData(parsed);
    } catch (err) {
      console.error(err);
      alert('Failed to generate gamified quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const isFormValid = selectedBookId && selectedChapterIds.length > 0 && !isGenerating;

  // Render the quiz player if generation is successful
  if (quizData && quizData.questions) {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 relative">
        <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center bg-[#1a1a1a] border border-gray-800 p-4 rounded-xl shadow-md">
          <button 
            onClick={() => setQuizData(null)} 
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            ← Back to Generator
          </button>
        </div>
        <div className="max-w-5xl mx-auto">
          <GamifiedQuizUI questions={quizData.questions} title={quizData.quizTitle || 'Gamified Quiz'} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 relative">
      <div className="absolute top-20 right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-3xl mx-auto space-y-8 pb-24 relative z-10">
        
        <GlassCard className="p-8 border border-white/10 hover:border-indigo-500/30 transition-colors group flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all">
                <BookOpen size={22} className="text-indigo-400"/>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">Generate Gamified Quiz</h2>
                <p className="text-xs text-gray-400">Select chapters to create an interactive learning experience</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Book <span className="text-pink-500">*</span></label>
                <div className="relative">
                  <select 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer"
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                    disabled={isBooksLoading || isGenerating}
                  >
                    <option className="bg-[#1a1a1a] text-white" value="" disabled>{isBooksLoading ? 'Loading books...' : 'Select a book'}</option>
                    {books.map(b => <option className="bg-[#1a1a1a] text-white" key={b.id || b._id} value={b.id || b._id}>{b.title || b.name}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <Layers size={16} className="text-gray-500"/>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Chapters <span className="text-pink-500">*</span></label>
                {selectedBookId ? (
                  <div className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all max-h-40 overflow-y-auto custom-scrollbar">
                    {isChaptersLoading ? (
                      <span className="text-gray-500">Loading chapters...</span>
                    ) : chapters.length === 0 ? (
                      <span className="text-gray-500">No chapters found.</span>
                    ) : (
                      <div className="space-y-2">
                        {chapters.map(c => {
                          const cId = c.id || c._id;
                          const isChecked = selectedChapterIds.includes(cId);
                          return (
                            <label key={cId} className="flex items-center gap-3 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={isChecked} 
                                onChange={() => toggleChapter(cId)} 
                              />
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-gray-500 group-hover:border-white'}`}>
                                {isChecked && <Sparkles size={10} className="text-white"/>}
                              </div>
                              <span className={isChecked ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}>
                                {c.title || c.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full bg-black/20 border border-white/5 border-dashed rounded-xl px-4 py-4 text-center">
                    <p className="text-sm text-gray-500 italic">Please select a book to view available chapters</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="text-center flex flex-col items-center mx-auto">
          <button 
            disabled={!isFormValid}
            onClick={handleGenerate}
            className={`
              w-full py-4 rounded-xl font-bold text-[16px] flex items-center justify-center gap-3 transition-all duration-300 mb-3
              ${isFormValid 
                ? 'bg-linear-to-r from-indigo-500 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-[1.02]' 
                : 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed'
              }
            `}
          >
            {isGenerating ? (
              <>
                <Loader2 size={20} className="animate-spin text-white"/>
                Generating Quiz...
              </>
            ) : (
              <>
                <Gamepad2 size={20} className={isFormValid ? "text-white" : "text-gray-500"}/>
                Generate & Play
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
