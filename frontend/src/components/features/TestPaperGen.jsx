'use client';
import React, { useState, useEffect } from 'react';
import { Info, BookOpen, HelpCircle, Sparkles, Layers, Loader2, FileText } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import api from '@/services/api';

/* ─────────────────────────────────────────────────────────────────
   Test Paper Dedicated Clean HTML Builder (No Markdown Errors)
───────────────────────────────────────────────────────────────── */
function buildTestPaperHTML(generalDetails, testPaperData, totalMaximumMarks) {
  let sectionsHTML = '';
  let sectionCharCode = 65; // Starts with Section 'A'
  let globalQNum = 1;

  Object.keys(testPaperData).forEach(key => {
    if (key === 'testDetails' || key === 'chapterTitle') return;
    const questions = testPaperData[key];
    
    if (Array.isArray(questions) && questions.length > 0) {
      let sectionLabel = key.toUpperCase();
      let sectionMarksEach = 2; // Default fallback
      
      // Attempt to humanize labels if matching local structure identifiers
      if (key === 'mcq') { sectionLabel = 'Multiple Choice Questions'; sectionMarksEach = 2; }
      else if (key === 'fill') { sectionLabel = 'Fill in the Blanks'; sectionMarksEach = 2; }
      else if (key === 'tf') { sectionLabel = 'True / False'; sectionMarksEach = 2; }
      else if (key === 'short') { sectionLabel = 'Short Answer Questions'; sectionMarksEach = 3; }
      else if (key === 'long') { sectionLabel = 'Long Answer Questions'; sectionMarksEach = 5; }

      const currentSectionLetter = String.fromCharCode(sectionCharCode);
      sectionCharCode++;
      
      const isTrueFalse = sectionLabel.toLowerCase().includes('true') || key === 'tf';

      sectionsHTML += `
        <div class="section-container">
          <div class="section-title-bar">
            <h2 class="section-title">SECTION ${currentSectionLetter}: ${sectionLabel}</h2>
            <span class="section-marks">[${questions.length * sectionMarksEach} Marks]</span>
          </div>
          <div class="questions-list">
            ${questions.map((q) => {
              const currentQNum = globalQNum++;
              const activeOptions = q.options || q.choices || [];
              
              if (isTrueFalse) {
                return `
                  <div class="question-item">
                    <table style="width:100%">
                      <tr>
                        <td style="width:85%; vertical-align:top;"><strong>Q${currentQNum}.</strong> ${q.question || q.statement}</td>
                        <td style="width:15%; text-align:right; font-weight:bold; font-family:monospace;">[ T / F ]</td>
                      </tr>
                    </table>
                  </div>
                `;
              }

              let choicesMarkup = '';
              if (Array.isArray(activeOptions) && activeOptions.length > 0) {
                choicesMarkup = `
                  <div class="options-grid">
                    ${activeOptions.map((opt, oIdx) => `
                      <div class="option-cell">
                        <span class="opt-prefix">(${String.fromCharCode(97 + oIdx)})</span>
                        <span>${opt}</span>
                      </div>
                    `).join('')}
                  </div>
                `;
              }

              let linesMarkup = '';
              // Add response lines automatically if it's a short/long text item
              if (key === 'short' || key === 'long') {
                const totalLines = key === 'long' ? 4 : 2;
                linesMarkup = `<div class="lines-block">${'<div class="writing-line"></div>'.repeat(totalLines)}</div>`;
              }

              return `
                <div class="question-item">
                  <p class="q-text"><strong>Q${currentQNum}.</strong> ${q.question || q.statement}</p>
                  ${choicesMarkup}
                  ${linesMarkup}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
  });

  const css = `
    @page { size: A4; margin: 15mm 18mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11.5pt;
      color: #000;
      background: #fff;
      margin: 0; padding: 0;
      line-height: 1.5;
    }
    .exam-header { text-center: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; text-align: center; }
    .school-name { text-transform: uppercase; font-size: 18pt; margin: 0 0 4px 0; font-weight: bold; }
    .paper-type { font-size: 13pt; margin: 0 0 15px 0; font-weight: bold; text-transform: uppercase; color: #333; }
    
    .meta-table { width: 100%; margin-top: 10px; border-collapse: collapse; }
    .meta-table td { padding: 5px 2px; font-size: 11pt; font-weight: bold; vertical-align: bottom; }
    .fill-line { border-bottom: 1px dashed #000; display: inline-block; height: 15px; }

    .section-container { break-inside: avoid; page-break-inside: avoid; margin-bottom: 25px; }
    .section-title-bar { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1.5px solid #000; padding-bottom: 4px; margin-bottom: 14px; }
    .section-title { font-size: 12.5pt; margin: 0; font-weight: bold; text-transform: uppercase; }
    .section-marks { font-size: 11pt; font-weight: bold; }
    
    .questions-list { padding-left: 2px; }
    .question-item { margin-bottom: 18px; break-inside: avoid; page-break-inside: avoid; }
    .q-text { margin: 0 0 6px 0; }
    
    .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 40px; padding-left: 15px; margin-top: 5px; }
    .option-cell { display: flex; gap: 6px; }
    .opt-prefix { font-weight: bold; }

    .lines-block { margin-top: 10px; margin-bottom: 5px; }
    .writing-line { border-bottom: 1px solid #888; height: 24px; margin-left: 15px; width: 95%; }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Examination Paper</title>
  <style>${css}</style>
</head>
<body>
  <div class="exam-header">
    <div class="school-name">${testPaperData.testDetails?.schoolName || generalDetails.schoolName}</div>
    <div class="paper-type">${generalDetails.paperType} Examination</div>
    
    <table class="meta-table">
      <tr>
        <td style="width: 50%; text-align: left;">Class: ${generalDetails.className} ${generalDetails.section ? `(${generalDetails.section})` : ''}</td>
        <td style="width: 50%; text-align: right;">Duration: ${generalDetails.duration}</td>
      </tr>
      <tr>
        <td style="text-align: left;">Student Name: <span class="fill-line" style="width:60%"></span></td>
        <td style="text-align: right;">Maximum Marks: ${totalMaximumMarks}</td>
      </tr>
    </table>
  </div>
  ${sectionsHTML}
</body>
</html>`;
}

export default function TestPaperGen() {
  const [generalDetails, setGeneralDetails] = useState({
    schoolName: '',
    className: '',
    section: '',
    duration: '',
    paperType: 'Half Yearly',
  });

  const [books, setBooks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedChapterIds, setSelectedChapterIds] = useState([]);
  const [isBooksLoading, setIsBooksLoading] = useState(false);
  const [isChaptersLoading, setIsChaptersLoading] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [testPaperData, setTestPaperData] = useState(null);

  const [questionStructure, setQuestionStructure] = useState([
    { id: 'mcq', label: 'Multiple Choice (MCQ)', count: 5, marks: 2 },
    { id: 'fill', label: 'Fill in the Blanks', count: 5, marks: 2 },
    { id: 'tf', label: 'True / False', count: 5, marks: 2 },
    { id: 'short', label: 'Short Answer Questions', count: 5, marks: 3 },
    { id: 'long', label: 'Long Answer Questions', count: 3, marks: 5 },
  ]);

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

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const selectedBook = books.find(b => b.id === selectedBookId || b._id === selectedBookId);
      const selectedChapters = chapters.filter(c => selectedChapterIds.includes(c.id || c._id));
      
      const structureConfigStr = questionStructure
        .filter(q => q.count > 0)
        .map(q => `${q.count} questions of ${q.label} (Key name in JSON: '${q.id}')`)
        .join(', ');

      const reqDto = {
        prompt: `Generate a comprehensive high-quality school test paper based on the attached materials. 
        Structure requirement: ${structureConfigStr}.
        
        CRITICAL RULE FOR MULTIPLE CHOICE (MCQ): 
        For every question entry inside the 'mcq' array, you MUST provide a strict array of 4 choices/options. 
        The array MUST be placed under the key name 'options' exactly. 
        Example format: "question": "...", "options": ["Choice A", "Choice B", "Choice C", "Choice D"], "correctAnswer": "Choice A".
        Do not return empty arrays or omit the options key under any circumstances.`,
        bookId: selectedBookId,
        chapterIds: selectedChapterIds,
        subject: selectedBook?.title || selectedBook?.name,
        chapterTitle: selectedChapters.map(c => c.title || c.name).join(', '),
        testPaperConfig: {
          generalDetails,
          questionStructure
        }
      };
      
      const res = await api.post('/ai-tools/test-paper/generate', reqDto);
      const rawData = res.data?.data?.content || res.data?.content;
      
      let parsed = null;
      if (typeof rawData === 'string') {
        const cleanStr = rawData.replace(/^```(?:json)?\s*/i, '').replace(/\\s*```\\s*$/i, '').trim();
        parsed = JSON.parse(cleanStr);
      } else {
        parsed = rawData;
      }
      
      setTestPaperData(parsed);
      setIsGenerated(true);
    } catch (err) {
      console.error(err);
      alert('Failed to generate test paper');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!testPaperData) return;
    
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Please allow popups for this site to export PDF.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildTestPaperHTML(generalDetails, testPaperData, totalMaximumMarks));
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
  };

  const updateQuestion = (id, field, value) => {
    setQuestionStructure(prev => prev.map(q => 
      q.id === id ? { ...q, [field]: parseInt(value) || 0 } : q
    ));
  };

  const totalMaximumMarks = questionStructure.reduce((acc, curr) => acc + (curr.count * curr.marks), 0);
  const isFormValid = generalDetails.schoolName && generalDetails.className && generalDetails.duration && selectedBookId && selectedChapterIds.length > 0 && !isGenerating;

  const toggleChapter = (chapterId) => {
    setSelectedChapterIds(prev => 
      prev.includes(chapterId) 
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  if (isGenerated && testPaperData) {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 relative">
        <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center bg-[#1a1a1a] border border-gray-800 p-4 rounded-xl shadow-md">
          <button 
            onClick={() => setIsGenerated(false)} 
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            ← Back to Generator
          </button>
          <button 
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition-colors text-sm"
          >
            <FileText size={16}/> Export to PDF
          </button>
        </div>

        <div className="max-w-4xl mx-auto bg-[#0a0a0a] text-gray-200 p-8 md:p-12 rounded-xl shadow-2xl relative font-sans border border-gray-800">
          <div className="text-center mb-8 border-b border-gray-800 pb-6">
            <h1 className="text-2xl font-bold uppercase tracking-wider mb-2 text-white">{testPaperData.testDetails?.schoolName || generalDetails.schoolName}</h1>
            <h2 className="text-lg font-semibold mb-4 text-gray-300">{generalDetails.paperType} Examination</h2>
            <div className="flex justify-between text-[14px] font-medium px-4 md:px-10 mt-6 text-gray-400">
              <span>Class: {testPaperData.testDetails?.className || generalDetails.className} {generalDetails.section ? `(${generalDetails.section})` : ''}</span>
              <span>Duration: {testPaperData.testDetails?.duration || generalDetails.duration}</span>
            </div>
            <div className="flex justify-between text-[14px] font-medium px-4 md:px-10 mt-2 text-gray-400">
              <span>Student Name: ________________________</span>
              <span>Maximum Marks: {totalMaximumMarks}</span>
            </div>
          </div>

          <div className="space-y-4 text-[15px]">
             {(() => {
               let sectionCharCode = 65;
               let globalQNum = 1;
               
               return Object.keys(testPaperData).map(key => {
                 if (key === 'testDetails' || key === 'chapterTitle') return null;
                 const questions = testPaperData[key];
                 if (!Array.isArray(questions) || questions.length === 0) return null;
                 
                 let sectionLabel = key;
                 let sectionMarks = 0;
                 const structureInfo = questionStructure.find(q => q.id === key);
                 if (structureInfo) {
                   sectionLabel = structureInfo.label;
                   sectionMarks = structureInfo.count * structureInfo.marks;
                 }

                 const currentSectionLetter = String.fromCharCode(sectionCharCode);
                 sectionCharCode++;
                 const isTrueFalse = sectionLabel.toLowerCase().includes('true') && sectionLabel.toLowerCase().includes('false');

                 return (
                   <div key={key} className="pb-6">
                     <div className="flex justify-between items-end border-b border-gray-800 pb-2 mb-6 mt-4">
                       <h3 className="font-bold text-[16px] uppercase text-white">SECTION {currentSectionLetter}: {sectionLabel}</h3>
                       <span className="text-[14px] font-bold text-gray-200">[{sectionMarks} Marks]</span>
                     </div>
                     <div className="space-y-6">
                       {questions.map((q, idx) => {
                         const currentQNum = globalQNum++;
                         // Smart key extractor fallback (checks options or choices arrays)
                         const activeOptions = q.options || q.choices || [];
                         
                         return (
                           <div key={idx} className="break-inside-avoid">
                             {isTrueFalse ? (
                               <div className="flex justify-between">
                                 <p className="text-gray-200"><span className="font-bold mr-2">{currentQNum}.</span> {q.question || q.statement}</p>
                                 <div className="text-gray-400 font-mono font-bold shrink-0 ml-6 tracking-widest">[ T / F ]</div>
                               </div>
                             ) : (
                               <div>
                                 <p className="text-gray-200"><span className="font-bold mr-2">{currentQNum}.</span> {q.question || q.statement}</p>
                                 {Array.isArray(activeOptions) && activeOptions.length > 0 && (
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4 pl-6 mt-4">
                                     {activeOptions.map((opt, oIdx) => (
                                       <div key={oIdx} className="text-gray-300">
                                         ({String.fromCharCode(65 + oIdx)}) {opt}
                                       </div>
                                     ))}
                                   </div>
                                 )}
                               </div>
                             )}
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 );
               })
             })()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 relative">
      <div className="absolute top-20 right-20 w-96 h-96 bg-neon-purple/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-emerald-green/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto space-y-8 pb-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <GlassCard className="p-8 border border-white/10 hover:border-neon-purple/30 transition-colors group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-neon-purple/20 to-blue-500/10 flex items-center justify-center border border-neon-purple/20 group-hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all">
                <Info size={22} className="text-neon-purple"/>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">General Details</h2>
                <p className="text-xs text-gray-400">Basic header information</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">School Name <span className="text-pink-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="e.g. Yugsoft Academy" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/50 transition-all"
                  value={generalDetails.schoolName}
                  onChange={e => setGeneralDetails({...generalDetails, schoolName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Class <span className="text-pink-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g. 10th Grade" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/50 transition-all"
                    value={generalDetails.className}
                    onChange={e => setGeneralDetails({...generalDetails, className: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Section</label>
                  <input 
                    type="text" 
                    placeholder="e.g. A or B" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/50 transition-all"
                    value={generalDetails.section}
                    onChange={e => setGeneralDetails({...generalDetails, section: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Duration <span className="text-pink-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g. 2 hours" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/50 transition-all"
                    value={generalDetails.duration}
                    onChange={e => setGeneralDetails({...generalDetails, duration: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Paper Type <span className="text-pink-500">*</span></label>
                  <div className="relative">
                    <select 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/50 transition-all appearance-none cursor-pointer"
                      value={generalDetails.paperType}
                      onChange={e => setGeneralDetails({...generalDetails, paperType: e.target.value})}
                    >
                      <option className="bg-[#1a1a1a] text-white" value="Unit Test">Unit Test</option>
                      <option className="bg-[#1a1a1a] text-white" value="Half Yearly">Half Yearly</option>
                      <option className="bg-[#1a1a1a] text-white" value="Term 1">Term 1</option>
                      <option className="bg-[#1a1a1a] text-white" value="Term 2">Term 2</option>
                      <option className="bg-[#1a1a1a] text-white" value="Yearly">Yearly</option>
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <Layers size={16} className="text-gray-500"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          
          <GlassCard className="p-8 border border-white/10 hover:border-emerald-green/30 transition-colors group flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-green/20 to-teal-500/10 flex items-center justify-center border border-emerald-green/20 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
                  <BookOpen size={22} className="text-emerald-green"/>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-wide">Content Source</h2>
                  <p className="text-xs text-gray-400">Syllabus mapped materials</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Book <span className="text-pink-500">*</span></label>
                  <div className="relative">
                    <select 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-green focus:ring-1 focus:ring-emerald-green/50 transition-all appearance-none cursor-pointer"
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
                    <div className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus-within:border-emerald-green focus-within:ring-1 focus-within:ring-emerald-green/50 transition-all max-h-40 overflow-y-auto custom-scrollbar">
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
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-emerald-green border-emerald-green' : 'border-gray-500 group-hover:border-white'}`}>
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
        </div>

        
        <GlassCard className="p-8 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <HelpCircle size={200}/>
          </div>

          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-blue-500/20 to-purple-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <HelpCircle size={22} className="text-blue-400"/>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Question Blueprint</h2>
              <p className="text-xs text-gray-400">Define the assessment structure and marking scheme</p>
            </div>
          </div>

          <div className="w-full relative z-10">
            <div className="grid grid-cols-12 gap-4 pb-4 border-b border-white/10 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-5 pl-2">Question Type</div>
              <div className="col-span-3 text-center">No. of Questions</div>
              <div className="col-span-2 text-center">Marks Each</div>
              <div className="col-span-2 text-right pr-4">Total</div>
            </div>
            
            <div className="space-y-2 mt-4">
              {questionStructure.map((q) => (
                <div key={q.id} className="grid grid-cols-12 gap-4 py-3 px-2 rounded-xl hover:bg-white/5 transition-colors items-center border border-transparent hover:border-white/5">
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-1.5 h-6 rounded-full bg-linear-to-b from-neon-purple to-transparent opacity-70"></div>
                    <span className="text-[15px] font-medium text-gray-200">{q.label}</span>
                  </div>
                  
                  <div className="col-span-3 flex justify-center">
                    <div className="relative flex items-center bg-black/40 border border-white/10 rounded-lg overflow-hidden group focus-within:border-neon-purple/70 focus-within:ring-1 focus-within:ring-neon-purple/30">
                      <input 
                        type="number" 
                        value={q.count}
                        onChange={(e) => updateQuestion(q.id, 'count', e.target.value)}
                        className="w-16 bg-transparent px-2 py-2 text-center text-sm font-semibold text-white focus:outline-none custom-number-input"
                        min="0"
                      />
                    </div>
                  </div>
                  
                  <div className="col-span-2 flex justify-center">
                    <div className="relative flex items-center bg-black/40 border border-white/10 rounded-lg overflow-hidden group focus-within:border-blue-500/70 focus-within:ring-1 focus-within:ring-blue-500/30">
                      <input 
                        type="number" 
                        value={q.marks}
                        onChange={(e) => updateQuestion(q.id, 'marks', e.target.value)}
                        className="w-16 bg-transparent px-2 py-2 text-center text-sm font-semibold text-white focus:outline-none custom-number-input"
                        min="0"
                      />
                    </div>
                  </div>
                  
                  <div className="col-span-2 text-right pr-4">
                    <span className="text-[16px] font-bold text-neon-purple bg-neon-purple/10 px-3 py-1 rounded-md">
                      {q.count * q.marks}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end items-center mt-8 pt-6 border-t border-white/10">
              <div className="bg-linear-to-r from-neon-purple/10 to-blue-500/10 border border-neon-purple/20 px-8 py-4 rounded-2xl flex items-center gap-6 shadow-[0_0_30px_rgba(139,92,246,0.1)]">
                <span className="text-sm font-bold text-gray-300 uppercase tracking-widest">Maximum Marks</span>
                <span className="text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-neon-purple to-blue-400">
                  {totalMaximumMarks}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>

        
        {!isGenerated && (
          <div className="mt-12 text-center flex flex-col items-center max-w-md mx-auto">
            <button 
              disabled={!isFormValid}
              onClick={handleGenerate}
              className={`
                w-full py-4 rounded-xl font-bold text-[16px] flex items-center justify-center gap-3 transition-all duration-300 mb-3
                ${isFormValid 
                  ? 'bg-linear-to-r from-neon-purple to-blue-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] hover:scale-[1.02]' 
                  : 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed'
                }
              `}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin text-white"/>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={20} className={isFormValid ? "text-white" : "text-gray-500"}/>
                  Generate Custom Test Paper
                </>
              )}
            </button>
            
            <div className="h-4">
              {!isFormValid && !isGenerating && (
                <p className="text-xs text-gray-500 tracking-wide">Please fill in all required fields to generate</p>
              )}
            </div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .custom-number-input::-webkit-inner-spin-button, 
        .custom-number-input::-webkit-outer-spin-button {  
           opacity: 1;
           cursor: pointer;
        }
      `}</style>
    </div>
  );
}
