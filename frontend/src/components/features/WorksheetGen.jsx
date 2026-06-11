'use client';
import React, { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import { RefreshCw, Play, Loader2, Download, FileText, CheckCircle } from 'lucide-react';
import useCurriculumStore from '@/store/curriculumStore';
import BookSelectionForm from '@/components/BookSelectionForm';
import Slider from '@/components/ui/Slider';
import api from '@/services/api';

/* ─────────────────────────────────────────────────────────────────
   Worksheet-specific Clean HTML Builder (No Blank Pages, Pure White)
───────────────────────────────────────────────────────────────── */
function buildWorksheetHTML(chapterTitle, worksheetData) {
  let sectionsHTML = '';

  // I. MCQs Section
  if (worksheetData.mcqs && worksheetData.mcqs.length > 0) {
    sectionsHTML += `
      <div class="section-container">
        <h2>I. Multiple Choice Questions</h2>
        <div class="questions-list">
          ${worksheetData.mcqs.map((item, idx) => `
            <div class="question-item">
              <p class="q-text"><strong>${idx + 1}. ${item.question || item.q}</strong></p>
              <div class="options-grid">
                ${item.options ? item.options.map((opt, oIdx) => `
                  <div class="option-cell">
                    <span class="opt-prefix">${String.fromCharCode(65 + oIdx)}.</span>
                    <span class="${item.correctAnswer === opt ? 'correct-ans' : ''}">${opt}</span>
                  </div>
                `).join('') : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // II. Fill in the Blanks Section
  if (worksheetData.fillInTheBlanks && worksheetData.fillInTheBlanks.length > 0) {
    sectionsHTML += `
      <div class="section-container">
        <h2>II. Fill in the Blanks</h2>
        <div class="questions-list">
          ${worksheetData.fillInTheBlanks.map((item, idx) => `
            <div class="question-item">
              <p class="q-text">${idx + 1}. ${item.question || item.q}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // III. True or False Section
  if (worksheetData.trueFalse && worksheetData.trueFalse.length > 0) {
    sectionsHTML += `
      <div class="section-container">
        <h2>III. True or False</h2>
        <table class="tf-table">
          ${worksheetData.trueFalse.map((item, idx) => `
            <tr>
              <td class="tf-q">${idx + 1}. ${item.statement || item.q}</td>
              <td class="tf-box">[ T ] &nbsp;&nbsp;&nbsp;&nbsp; [ F ]</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;
  }

  // IV. Short Answer Questions Section with Writing Lines
  if (worksheetData.shortAnswer && worksheetData.shortAnswer.length > 0) {
    sectionsHTML += `
      <div class="section-container">
        <h2>IV. Short Answer Questions</h2>
        <div class="questions-list">
          ${worksheetData.shortAnswer.map((item, idx) => `
            <div class="question-item line-spacing">
              <p class="q-text"><strong>${idx + 1}. ${item.question || item.q}</strong></p>
              <div class="writing-line"></div>
              <div class="writing-line"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

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
    h1 { text-align: center; text-transform: uppercase; font-size: 16pt; margin: 0 0 20px 0; color: #000; font-weight: bold; }
    h2 { font-size: 13pt; margin: 22px 0 12px 0; border-bottom: 1px solid #000; padding-bottom: 3px; font-weight: bold; text-transform: uppercase; }
    
    .header-table { width: 100%; margin-bottom: 25px; border-collapse: collapse; }
    .header-table td { padding: 6px 4px; font-size: 10.5pt; font-weight: bold; vertical-align: bottom; }
    .header-line { border-bottom: 1px dashed #000; width: 100%; display: inline-block; height: 15px; }

    .section-container { margin-bottom: 15px; }
    .questions-list { padding-left: 5px; }
    .question-item { margin-bottom: 14px; break-inside: avoid; page-break-inside: avoid; }
    .q-text { margin: 0 0 6px 0; }
    
    .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 30px; padding-left: 15px; margin-top: 5px; }
    .option-cell { display: flex; gap: 6px; }
    .opt-prefix { font-weight: bold; }
    .correct-ans { font-weight: bold; text-decoration: underline; }

    .tf-table { width: 100%; border-collapse: collapse; }
    .tf-table td { padding: 8px 4px; border-bottom: 1px dotted #ccc; }
    .tf-q { width: 85%; vertical-align: top; }
    .tf-box { width: 15%; text-align: right; font-family: monospace; font-weight: bold; white-space: nowrap; }

    .line-spacing { margin-bottom: 25px; }
    .writing-line { border-bottom: 1px solid #999; height: 24px; margin-left: 15px; width: 95%; }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${chapterTitle}</title>
  <style>${css}</style>
</head>
<body>
  <h1>${chapterTitle}</h1>
  <table class="header-table">
    <tr>
      <td style="width: 50%;">Name: <span class="header-line" style="width:80%"></span></td>
      <td style="width: 50%;">Roll No: <span class="header-line" style="width:70%"></span></td>
    </tr>
    <tr>
      <td>Class: <span class="header-line" style="width:82%"></span></td>
      <td>Section: <span class="header-line" style="width:72%"></span></td>
    </tr>
    <tr>
      <td>Date: <span class="header-line" style="width:83%"></span></td>
      <td>Teacher's Signature: <span class="header-line" style="width:50%"></span></td>
    </tr>
  </table>
  <hr style="border: none; border-top: 2px solid #000; margin-bottom: 10px;" />
  ${sectionsHTML}
</body>
</html>`;
}

export default function WorksheetGen() {
  const [selection, setSelection] = useState(null);
  const { setSelectedSubjectId, setSelectedChapterId, chapterDetails } = useCurriculumStore();
  const [difficulty, setDifficulty] = useState(50);
  const [qCount, setQCount] = useState(10);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [worksheetData, setWorksheetData] = useState(null);

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

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await api.post('/ai-tools/worksheet/generate', {
        prompt: `Generate a worksheet with ${qCount} questions, difficulty ${difficulty}%`,
        chapterId: selection.chapterId,
        bookId: selection.bookId,
      });
      
      let rawData = res.data?.data?.content || res.data?.content;
      let parsedData = null;

      if (typeof rawData === 'string') {
        try {
          let cleanStr = rawData.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
          parsedData = JSON.parse(cleanStr);
        } catch (e) {
          console.error("JSON parse failed. Raw data:", rawData);
          alert("Failed to parse worksheet data. Please try again.");
          setIsGenerating(false);
          return;
        }
      } else if (typeof rawData === 'object') {
        parsedData = rawData;
      }

      if (parsedData) {
        setWorksheetData(parsedData);
        setIsGenerated(true);
      } else {
        alert("Received empty data from the server.");
      }
    } catch (error) {
      console.error("Failed to generate worksheet", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = () => {
    if (!worksheetData) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Please allow popups for this site to export PDF.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildWorksheetHTML(chapterTitle, worksheetData));
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
  };

  const handleExportDOCX = () => {
    if (!worksheetData) return;
    
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Worksheet</title>
    <style>
      body { font-family: 'Times New Roman', serif; padding: 20px; }
      h1 { text-align: center; text-transform: uppercase; font-size: 18pt; margin-bottom: 20px; }
      h2 { font-size: 14pt; margin-top: 20px; margin-bottom: 10px; }
      p { font-size: 12pt; margin: 5px 0; }
      .header-table { width: 100%; margin-bottom: 30px; font-weight: bold; }
      .header-table td { padding: 5px; }
    </style>
    </head><body>`;

    html += `<h1>${chapterTitle}</h1>`;
    html += `<table class="header-table">
      <tr><td>Name: ______________________</td><td>Roll No: __________</td></tr>
      <tr><td>Class: ______________________</td><td>Section: __________</td></tr>
      <tr><td>Date: ______________________</td><td>Teacher's Signature: __________</td></tr>
    </table><hr/><br/>`;

    if (worksheetData.mcqs && worksheetData.mcqs.length > 0) {
      html += `<h2>I. Multiple Choice Questions</h2>`;
      worksheetData.mcqs.forEach((item, idx) => {
        html += `<p><strong>${idx + 1}. ${item.question || item.q}</strong></p>`;
        html += `<table style="width:100%; margin-left: 20px; margin-bottom: 10px;"><tr>`;
        if (item.options) {
          item.options.forEach((opt, oIdx) => {
            html += `<td style="padding: 5px 0;">${String.fromCharCode(65 + oIdx)}. ${opt}</td>`;
            if (oIdx % 2 !== 0) html += `</tr><tr>`;
          });
        }
        html += `</tr></table>`;
      });
    }

    if (worksheetData.fillInTheBlanks && worksheetData.fillInTheBlanks.length > 0) {
      html += `<h2>II. Fill in the Blanks</h2>`;
      worksheetData.fillInTheBlanks.forEach((item, idx) => {
        html += `<p>${idx + 1}. ${item.question || item.q}</p>`;
      });
    }

    if (worksheetData.trueFalse && worksheetData.trueFalse.length > 0) {
      html += `<h2>III. True or False</h2>`;
      html += `<table style="width: 100%;">`;
      worksheetData.trueFalse.forEach((item, idx) => {
        html += `<tr>
          <td style="width: 80%; padding: 5px 0;">${idx + 1}. ${item.statement || item.q}</td>
          <td style="width: 20%; text-align: right;">[ T ] &nbsp;&nbsp;&nbsp;&nbsp; [ F ]</td>
        </tr>`;
      });
      html += `</table>`;
    }

    if (worksheetData.shortAnswer && worksheetData.shortAnswer.length > 0) {
      html += `<h2>IV. Short Answer Questions</h2>`;
      worksheetData.shortAnswer.forEach((item, idx) => {
        html += `<p style="margin-bottom: 20px;"><strong>${idx + 1}. ${item.question || item.q}</strong></p>`;
        html += `<p>_________________________________________________________________________</p>`;
        html += `<p>_________________________________________________________________________</p><br/>`;
      });
    }

    html += `</body></html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chapterTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chapterTitle = chapterDetails?.title 
    ? `CHAPTER - ${chapterDetails.title.toUpperCase()}` 
    : selection?.chapterTitle ? `CHAPTER - ${selection.chapterTitle.toUpperCase()}` : "CHAPTER - CUSTOM WORKSHEET";

  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

  return (
    <div className="h-full flex flex-col gap-6 p-4 relative bg-[#0a0a0a] min-h-screen text-white overflow-y-auto custom-scrollbar">
      
      {/* Top Action Bar */}
      <div className="w-full max-w-[1000px] mx-auto bg-[#1a1a1a] rounded-xl border border-gray-800 p-6 no-print flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Worksheet: {selection.chapterTitle || "Computer Peripherals"}</h2>
          <div className="px-3 py-1 bg-black rounded-md border border-gray-800 text-xs text-gray-400 font-mono">
            {dateStr}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportPDF}
            disabled={!isGenerated || isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
          >
            <FileText size={16} /> Export to PDF
          </button>
          <button 
            onClick={handleExportDOCX}
            disabled={!isGenerated || isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-[#111] text-gray-300 font-semibold rounded-md hover:bg-[#222] border border-gray-700 transition-colors disabled:opacity-50 text-sm"
          >
            <Download size={16} /> Export to DOCX
          </button>
          <button 
            disabled={!isGenerated || isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
          >
            Answer Key <CheckCircle size={16} />
          </button>

          {!isGenerated && (
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black font-bold rounded-md hover:bg-amber-400 transition-colors ml-auto text-sm"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
              Generate Worksheet
            </button>
          )}
          <button
            onClick={() => {
              setSelection(null);
              setSelectedSubjectId('');
              setSelectedChapterId('');
            }}
            title="Change book / chapter"
            className="text-gray-400 hover:text-white transition-colors ml-4"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Config Sliders */}
        {!isGenerated && (
          <div className="flex gap-8 mt-4 pt-4 border-t border-gray-800">
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Difficulty</span>
                <span>{difficulty}%</span>
              </div>
              <Slider value={difficulty} onChange={setDifficulty} />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Question Count</span>
                <span>{qCount}</span>
              </div>
              <Slider value={qCount} max={50} onChange={setQCount} />
            </div>
          </div>
        )}
      </div>

      {/* Interactive Preview Container for Web Dashboard */}
      <div className="w-full max-w-[1000px] mx-auto flex flex-col gap-6 pb-20">
        {isGenerating ? (
          <div className="h-[400px] flex flex-col items-center justify-center bg-[#1a1a1a] rounded-xl border border-gray-800">
            <Loader2 className="animate-spin text-amber-500 mb-4" size={48} />
            <p className="text-gray-400 font-sans font-medium text-lg">Generating Worksheet Schema...</p>
          </div>
        ) : isGenerated && worksheetData ? (
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-8 font-sans shadow-2xl">
            <h1 className="text-xl font-bold text-center uppercase tracking-wider text-amber-500 mb-8 font-serif border-b border-gray-800 pb-4">
              {chapterTitle} (Web Dashboard Preview)
            </h1>
            
            <div className="space-y-10 text-[15px] text-gray-200">
              {/* MCQs Preview */}
              {worksheetData.mcqs && worksheetData.mcqs.length > 0 && (
                <div>
                  <h2 className="font-bold text-lg mb-4 text-amber-400 font-serif">I. Multiple Choice Questions</h2>
                  <div className="space-y-6 pl-2">
                    {worksheetData.mcqs.map((item, idx) => (
                      <div key={idx}>
                        <p className="font-semibold mb-2">{idx + 1}. {item.question || item.q}</p>
                        <div className="grid grid-cols-2 gap-2 pl-4 text-gray-400">
                          {item.options?.map((opt, oIdx) => (
                            <div key={oIdx} className={item.correctAnswer === opt ? 'text-amber-500 font-medium' : ''}>
                              {String.fromCharCode(65 + oIdx)}. {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fill in the Blanks Preview */}
              {worksheetData.fillInTheBlanks && worksheetData.fillInTheBlanks.length > 0 && (
                <div className="pt-4 border-t border-gray-800">
                  <h2 className="font-bold text-lg mb-4 text-amber-400 font-serif">II. Fill in the Blanks</h2>
                  <div className="space-y-3 pl-2">
                    {worksheetData.fillInTheBlanks.map((item, idx) => (
                      <p key={idx}>{idx + 1}. {item.question || item.q}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* True/False Preview */}
              {worksheetData.trueFalse && worksheetData.trueFalse.length > 0 && (
                <div className="pt-4 border-t border-gray-800">
                  <h2 className="font-bold text-lg mb-4 text-amber-400 font-serif">III. True or False</h2>
                  <div className="space-y-3 pl-2">
                    {worksheetData.trueFalse.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <p>{idx + 1}. {item.statement || item.q}</p>
                        <div className="text-gray-400 font-mono">[ T ] &nbsp;&nbsp; [ F ]</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Short Answer Preview */}
              {worksheetData.shortAnswer && worksheetData.shortAnswer.length > 0 && (
                <div className="pt-4 border-t border-gray-800">
                  <h2 className="font-bold text-lg mb-4 text-amber-400 font-serif">IV. Short Answer Questions</h2>
                  <div className="space-y-6 pl-2">
                    {worksheetData.shortAnswer.map((item, idx) => (
                      <div key={idx}>
                        <p className="font-semibold mb-4">{idx + 1}. {item.question || item.q}</p>
                        <div className="border-b border-gray-700 w-full h-4"></div>
                        <div className="border-b border-gray-700 w-full h-6"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-gray-500 font-sans italic">Click "Generate Worksheet" above to build your document.</p>
          </div>
        )}
      </div>
    </div>
  );
}
