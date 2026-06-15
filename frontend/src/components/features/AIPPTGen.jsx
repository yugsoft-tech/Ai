import React, { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import BookSelectionForm from '@/components/BookSelectionForm';
import { Presentation, Download, FileText, User, Play, Loader2, RefreshCw } from 'lucide-react';
import useCurriculumStore from '@/store/curriculumStore';
import api from '@/services/api';

export default function AIPPTGen() {
  const [selection, setSelection] = useState(null);
  const [theme, setTheme] = useState('Green');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [slidesData, setSlidesData] = useState(null);
  
  const { setSelectedSubjectId, setSelectedChapterId, chapterDetails } = useCurriculumStore();

  const chapterTitle = chapterDetails?.title 
    ? chapterDetails.title 
    : selection?.chapterTitle ? selection.chapterTitle : "Presentation";

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await api.post('/ai-tools/ppt/generate', {
        prompt: `Generate a presentation about the chapter: ${chapterTitle}`,
        chapterId: selection.chapterId,
        bookId: selection.bookId,
      });
      
      let rawData = res.data?.data?.content || res.data?.content;
      let parsed = null;
      if (typeof rawData === 'string') {
        const cleanStr = rawData.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        parsed = JSON.parse(cleanStr);
      } else {
        parsed = rawData;
      }
      
      setSlidesData(parsed);
      setIsGenerated(true);
    } catch (err) {
      console.error(err);
      alert('Failed to generate presentation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!slidesData) return;
    try {
      const res = await api.post('/compiler/pptx', {
        title: chapterTitle,
        slidesJson: JSON.stringify(slidesData),
      }, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${chapterTitle.replace(/\s+/g, '_')}_${Date.now()}.pptx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to download presentation file');
    }
  };

  if (!selection) {
    return (
      <BookSelectionForm
        hidePeriods
        onGenerate={(data) => {
          setSelection(data);
          setSelectedSubjectId(data.bookId);
          setSelectedChapterId(data.chapterId);
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 p-1 overflow-y-auto custom-scrollbar pb-10">
      {/* Header Config Card */}
      <GlassCard className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Presentation className="text-neon-purple" size={24} />
          <div>
            <h3 className="font-semibold text-white">Presentation Generator</h3>
            <p className="text-xs text-gray-400">Generate PPTs directly from the book content</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-48">
            <Dropdown 
              options={['Modern Dark', 'Clean White', 'Neon Cyber', 'Green']} 
              placeholder="Visual Theme" 
              value={theme} 
              onChange={setTheme} 
            />
          </div>
          
          {!isGenerated && (
            <Button 
              variant="accent" 
              className="flex items-center gap-2" 
              onClick={handleGenerate} 
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {isGenerating ? 'Generating...' : 'Generate PPT'}
            </Button>
          )}

          <button
            onClick={() => {
              setSelection(null);
              setSelectedSubjectId('');
              setSelectedChapterId('');
              setIsGenerated(false);
            }}
            title="Change book / chapter"
            className="text-gray-400 hover:text-white transition-colors ml-2"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </GlassCard>

      {/* Before Generation State */}
      {!isGenerated && !isGenerating && (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-800 rounded-xl m-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-neon-purple/10 flex items-center justify-center mx-auto text-neon-purple">
              <Presentation size={32} />
            </div>
            <h3 className="text-xl font-medium text-white">Ready to Generate</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Select your preferred theme from the top right and click 'Generate PPT' to create a comprehensive presentation for {chapterTitle}.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center m-4">
          <Loader2 size={48} className="animate-spin text-neon-purple mb-6" />
          <h3 className="text-xl font-medium text-white mb-2">Analyzing content...</h3>
          <p className="text-gray-400">Generating slides and applying {theme} theme</p>
        </div>
      )}

      {/* Generated View (Matching Screenshot) */}
      {isGenerated && (
        <div className="flex flex-col gap-6 w-full max-w-[900px] mx-auto mt-4 px-4">
          <div className="flex items-center gap-4 mb-2">
            <Presentation className="text-blue-500" size={36} />
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">{chapterTitle}</h1>
              <p className="text-sm text-gray-400">PowerPoint Presentation Generated</p>
            </div>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center border-blue-500/30 bg-[#0d1117]/80">
              <span className="text-3xl font-bold text-blue-500 mb-2">{slidesData?.length || 0}</span>
              <span className="text-sm text-blue-500/80 font-medium">Total Slides</span>
            </div>
            <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center border-green-500/30 bg-[#0a1411]/80">
              <span className="text-3xl font-bold text-green-500 mb-2">{slidesData?.length || 0}</span>
              <span className="text-sm text-green-500/80 font-medium">Content Slides</span>
            </div>
            <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center border-purple-500/30 bg-[#120d17]/80">
              <span className="text-2xl font-bold text-purple-500 mb-2">{theme}</span>
              <span className="text-sm text-purple-500/80 font-medium">Theme</span>
            </div>
            <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center border-orange-500/30 bg-[#17100d]/80">
              <FileText className="text-orange-500 mb-2" size={28} />
              <span className="text-sm text-orange-500/80 font-medium">PPTX</span>
            </div>
          </div>

          {/* Presentation Details Card */}
          <GlassCard className="mt-4 border-gray-800 bg-[#0d0d0d] rounded-2xl p-0 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-2 border-b border-gray-800 pb-4 mb-6">
                <FileText size={18} className="text-gray-300" />
                <h3 className="font-semibold text-white">Presentation Details</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-y-8 gap-x-12 mb-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5 font-medium">Title</p>
                  <p className="text-[15px] font-bold text-white">{chapterTitle}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5 font-medium">Theme</p>
                  <div className="flex items-center gap-2">
                     <div className="w-4 h-4 rounded-full bg-green-500 border border-white/20"></div>
                     <p className="text-[14px] text-white font-semibold">{theme}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5 font-medium">Subtitle</p>
                  <p className="text-[14px] text-gray-400">Generated Educational Content</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5 font-medium">Total Slides</p>
                  <p className="text-[14px] text-white font-semibold">{slidesData?.length || 0} slides</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5 font-medium">Author</p>
                  <p className="text-[14px] text-gray-400 flex items-center gap-2">
                    <User size={14} /> Epoch AI Generated Presentation
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5 font-medium">Filename</p>
                  <p className="text-[14px] text-gray-400">{chapterTitle.replace(/\s+/g, '_')}_generated.pptx</p>
                </div>
              </div>
            </div>

            {/* Download CTA Button Only */}
            <div className="px-6 pb-6 pt-2 flex justify-end">
              <Button onClick={handleDownload} className="bg-neon-purple hover:bg-neon-purple/80 text-white flex items-center gap-2 font-medium px-8 py-2.5 shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all whitespace-nowrap border-none">
                <Download size={18} /> Download PPT
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
