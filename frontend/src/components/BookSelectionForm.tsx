"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, ChevronDown, Loader2 } from "lucide-react";
import api from "@/services/api";

export default function BookSelectionForm({
  onGenerate,
  hidePeriods = false,
}: {
  onGenerate?: (plan: any) => void;
  hidePeriods?: boolean;
}) {
  const [books, setBooks] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  
  const [selectedBookId, setSelectedBookId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [periods, setPeriods] = useState<number | "">(1);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // Prevents SSR/client hydration mismatch on disabled props
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    api.get("/curriculum/books").then((res) => {
      const data = res.data?.data || res.data || [];
      setBooks(data);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedBookId) {
      setChapters([]);
      setSelectedChapterId("");
      return;
    }
    setIsLoading(true);
    api.get(`/curriculum/books/${selectedBookId}/chapters`).then((res) => {
      const data = res.data?.data || res.data || [];
      setChapters(data);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, [selectedBookId]);

  const handleGenerate = async () => {
    if (!selectedBookId || !selectedChapterId) return;

    // In hidePeriods (chat) mode — just pass the selection, no lesson-plan API call
    if (hidePeriods) {
      const chapterTitle = selectedChapterData?.title || selectedChapterData?.name || '';
      const bookTitle = selectedBookData?.title || selectedBookData?.name || '';
      if (onGenerate) onGenerate({ bookId: selectedBookId, chapterId: selectedChapterId, chapterTitle, bookTitle });
      return;
    }

    if (!periods) return;

    setIsGenerating(true);
    try {
      const chapterTitle = selectedChapterData?.title || selectedChapterData?.name || '';
      const bookTitle = selectedBookData?.title || selectedBookData?.name || '';
      const res = await api.post("/ai-tools/lesson-plan/generate", {
        bookId: selectedBookId,
        chapterId: selectedChapterId,
        chapterTitle,
        subject: bookTitle,
        prompt: `Generate a detailed lesson plan for ${periods} period(s) for the chapter: "${chapterTitle}" from the book "${bookTitle}".`
      });

      // The orchestrator wraps the result as { tool, content, sources }
      // The actual lesson plan JSON lives inside `content`
      const responseData = res.data?.data || res.data;
      const plan = responseData?.content ?? responseData;
      const parsedPlan = typeof plan === 'string' ? JSON.parse(plan) : plan;

      console.log('[BookSelectionForm] Parsed plan:', parsedPlan);

      if (onGenerate) onGenerate(parsedPlan);
    } catch (err) {
      console.error("Failed to generate lesson plan", err);
      alert("Failed to generate lesson plan. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedBookData = books.find(b => b.id === selectedBookId || b._id === selectedBookId);
  const selectedChapterData = chapters.find(c => c.id === selectedChapterId || c._id === selectedChapterId);

  return (
    <div className="h-full w-full bg-[#0a0a0a] flex flex-col items-center justify-center p-4 rounded-xl">
      <div className="w-full max-w-xl bg-zinc-900 rounded-xl border border-zinc-800 p-6 md:p-8 space-y-8 shadow-2xl">
        
        {/* Header Section */}
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <BookOpen className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white tracking-tight">
              Book & Chapter Selection
            </h2>
          </div>
          <p className="text-sm text-gray-400">
            Choose the book and chapter for your lesson plan
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col space-y-1.5 relative">
              <label htmlFor="book" className="text-sm font-medium text-gray-200">Select Book</label>
              <div className="relative">
                <select
                  id="book"
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-500 transition-colors appearance-none cursor-pointer"
                  disabled={mounted && isGenerating}
                >
                  <option value="" disabled>Select a book</option>
                  {books.map(book => (
                    <option key={book.id || book._id} value={book.id || book._id}>
                      {book.title || book.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            
            <div className="flex flex-col space-y-1.5 relative">
              <label htmlFor="chapter" className="text-sm font-medium text-gray-200">
                Select Chapter {isLoading && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}
              </label>
              <div className="relative">
                <select
                  id="chapter"
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-500 transition-colors appearance-none cursor-pointer"
                  disabled={mounted && (!selectedBookId || isGenerating || isLoading)}
                >
                  <option value="" disabled>Select a chapter</option>
                  {chapters.map(chapter => (
                    <option key={chapter.id || chapter._id} value={chapter.id || chapter._id}>
                      {chapter.title || chapter.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {!hidePeriods && (
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="periods" className="text-sm font-medium text-gray-200">Number of Periods</label>
              <input
                type="number"
                id="periods"
                min="1"
                max="20"
                value={periods}
                onChange={(e) => setPeriods(e.target.value ? parseInt(e.target.value, 10) : "")}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-500 transition-colors placeholder:text-gray-600"
                placeholder="e.g., 5"
                disabled={isGenerating}
              />
              <p className="text-xs text-gray-500">
                Specify the number of periods (1-20) to generate lesson plans for
              </p>
            </div>
          )}
        </div>

        {/* Info Summary Box */}
        <div className="bg-[#f4f7fa] rounded-lg p-4 border border-blue-100 flex flex-col space-y-1.5 min-h-[90px]">
          <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
            Selected Chapter
          </span>
          {selectedChapterData ? (
            <>
              <div className="text-base text-blue-950">
                <span className="font-bold">{selectedChapterData.title || selectedChapterData.name}</span>{" "}
                <span className="italic font-medium">from {selectedBookData?.title || selectedBookData?.name}</span>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500 italic mt-1">
              Please select a book and chapter above.
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={mounted && (!selectedBookId || !selectedChapterId || (!hidePeriods && !periods) || isGenerating)}
          className="w-full flex items-center justify-center bg-white text-black font-semibold py-2.5 px-4 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0a0a0a] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {hidePeriods ? 'Loading...' : 'Generating AI Plan... please wait'}
            </>
          ) : (
            hidePeriods ? 'Start Chat' : 'Generate Lesson Plan'
          )}
        </button>

      </div>
    </div>
  );
}
