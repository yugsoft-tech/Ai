import React, { useEffect } from 'react';
import Dropdown from '@/components/ui/Dropdown';
import { Sparkles, Loader2 } from 'lucide-react';
import useCurriculumStore from '@/store/curriculumStore';

export default function TopHeader() {
  const {
    classes,
    subjects,
    chapters,
    selectedClassId,
    selectedSubjectId,
    selectedChapterId,
    isClassesLoading,
    isSubjectsLoading,
    isChaptersLoading,
    fetchClasses,
    setSelectedClassId,
    setSelectedSubjectId,
    setSelectedChapterId,
  } = useCurriculumStore();

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleClassChange = (classVal) => {
    setSelectedClassId(classVal);
  };

  const handleSubjectChange = (subjectName) => {
    const matchingSubject = subjects.find((s) => s.name === subjectName);
    if (matchingSubject) {
      setSelectedSubjectId(matchingSubject.id);
    }
  };

  const handleChapterChange = (chapterTitle) => {
    const matchingChapter = chapters.find((c) => c.title === chapterTitle);
    if (matchingChapter) {
      setSelectedChapterId(matchingChapter.id);
    }
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const selectedChapter = chapters.find((c) => c.id === selectedChapterId);

  return (
    <header className="h-[70px] w-full flex items-center justify-between px-6 z-20">
      {/* Pill-shaped frosted glass bar for selections */}
      <div className="glass-panel rounded-full px-6 py-2 flex items-center gap-4 flex-1 max-w-3xl">
        <div className="w-1/3 relative flex items-center">
          <Dropdown 
            options={classes.length > 0 ? classes : ['Grade 10']} 
            placeholder="Select Class" 
            value={selectedClassId} 
            onChange={handleClassChange}
            className={`w-full ${isClassesLoading ? 'opacity-50 pointer-events-none' : ''}`}
          />
          {isClassesLoading && <Loader2 size={16} className="animate-spin text-neon-purple absolute right-8" />}
        </div>
        <div className="w-1/3 relative flex items-center">
          <Dropdown 
            options={subjects.length > 0 ? subjects.map(s => s.name) : ['Computer Science']} 
            placeholder="Select Subject" 
            value={selectedSubject?.name || ''} 
            onChange={handleSubjectChange}
            className={`w-full ${isSubjectsLoading ? 'opacity-50 pointer-events-none' : ''}`}
          />
          {isSubjectsLoading && <Loader2 size={16} className="animate-spin text-neon-purple absolute right-8" />}
        </div>
        <div className="w-1/3 relative flex items-center">
          <Dropdown 
            options={chapters.length > 0 ? chapters.map((c) => c.title) : ['Ch 2: Core Concepts']} 
            placeholder="Select Chapter" 
            value={selectedChapter?.title || ''} 
            onChange={handleChapterChange}
            className={`w-full ${isChaptersLoading ? 'opacity-50 pointer-events-none' : ''}`}
          />
          {isChaptersLoading && <Loader2 size={16} className="animate-spin text-neon-purple absolute right-8" />}
        </div>
      </div>

      {/* RAG Engine Status indicator */}
      <div className="ml-4 flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-emerald-green/30">
        <div className="w-2 h-2 rounded-full bg-emerald-green box-shadow-glow-green animate-pulse"></div>
        <Sparkles size={14} className="text-emerald-green" />
        <span className="text-sm font-medium text-emerald-green text-shadow-glow-green">RAG Engine Active</span>
      </div>
    </header>
  );
}
