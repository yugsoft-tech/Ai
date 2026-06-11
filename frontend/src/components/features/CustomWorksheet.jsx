'use client';
import React, { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { GripVertical, PlusCircle, RefreshCw, X, Play, Loader2, Download, FileText, CheckCircle } from 'lucide-react';
import useCurriculumStore from '@/store/curriculumStore';
import BookSelectionForm from '@/components/BookSelectionForm';
import api from '@/services/api';

/* ─────────────────────────────────────────────────────────────────
   Worksheet-specific Clean HTML Builder (No Blank Pages, Pure White)
───────────────────────────────────────────────────────────────── */
function buildWorksheetHTML(chapterTitle, worksheetData) {
  let sectionsHTML = '';

  // I. Multiple Choice Questions
  if (worksheetData.mcqs && worksheetData.mcqs.length > 0) {
    sectionsHTML += `
      <div class="section-container">
        <h2>I. Multiple Choice Questions</h2>
        <div class="questions-list">
          ${worksheetData.mcqs.map((item, idx) => `
            <div class="question-item">
              <p class="q-text"><strong>Q${idx + 1}. ${item.question || item.q}</strong></p>
              <div class="options-grid">
                ${item.options ? item.options.map((opt, oIdx) => `
                  <div class="option-cell">
                    <span class="opt-prefix">(${String.fromCharCode(97 + oIdx)})</span>
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

  // II. Fill in the Blanks
  if (worksheetData.fillInTheBlanks && worksheetData.fillInTheBlanks.length > 0) {
    sectionsHTML += `
      <div class="section-container">
        <h2>II. Fill in the Blanks</h2>
        <div class="questions-list">
          ${worksheetData.fillInTheBlanks.map((item, idx) => `
            <div class="question-item">
              <p class="q-text"><strong>Q${idx + 1}.</strong> ${item.question || item.q}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // III. True or False
  if (worksheetData.trueFalse && worksheetData.trueFalse.length > 0) {
    sectionsHTML += `
      <div class="section-container">
        <h2>III. True or False</h2>
        <table class="tf-table">
          ${worksheetData.trueFalse.map((item, idx) => `
            <tr>
              <td class="tf-q"><strong>Q${idx + 1}.</strong> ${item.statement || item.q}</td>
              <td class="tf-box">[ T ] &nbsp;&nbsp;&nbsp;&nbsp; [ F ]</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;
  }

  // IV. Short Answer Questions
  if (worksheetData.shortAnswer && worksheetData.shortAnswer.length > 0) {
    sectionsHTML += `
      <div class="section-container">
        <h2>IV. Short Answer Questions</h2>
        <div class="questions-list">
          ${worksheetData.shortAnswer.map((item, idx) => `
            <div class="question-item line-spacing">
              <p class="q-text"><strong>Q${idx + 1}. ${item.question || item.q}</strong></p>
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
    h2 { font-size: 13pt; margin: 22px 0 12px 0; border-bottom: 1.5px solid #000; padding-bottom: 4px; font-weight: bold; text-transform: uppercase; }
    
    .header-table { width: 100%; margin-bottom: 25px; border-collapse: collapse; }
    .header-table td { padding: 6px 4px; font-size: 10.5pt; font-weight: bold; vertical-align: bottom; }
    .header-line { border-bottom: 1px dashed #000; display: inline-block; height: 16px; vertical-align: bottom; }

    .section-container { margin-bottom: 25px; }
    .questions-list { padding-left: 5px; }
    .question-item { margin-bottom: 16px; break-inside: avoid; page-break-inside: avoid; }
    .q-text { margin: 0 0 8px 0; }
    
    .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 30px; padding-left: 15px; margin-top: 6px; }
    .option-cell { display: flex; gap: 6px; }
    .opt-prefix { font-weight: bold; }
    .correct-ans { font-weight: bold; text-decoration: underline; }

    .tf-table { width: 100%; border-collapse: collapse; }
    .tf-table td { padding: 8px 4px; border-bottom: 1px dotted #888; }
    .tf-q { width: 80%; vertical-align: top; }
    .tf-box { width: 20%; text-align: right; font-family: monospace; font-weight: bold; white-space: nowrap; }

    .line-spacing { margin-bottom: 30px; }
    .writing-line { border-bottom: 1px solid #777; height: 26px; margin-left: 15px; width: 95%; }
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
  <hr style="border: none; border-top: 2px solid #000; margin-bottom: 15px;" />
  ${sectionsHTML}
</body>
</html>`;
}

export default function CustomWorksheet() {
  const [selection, setSelection] = useState(null);
  const { setSelectedSubjectId, setSelectedChapterId, chapterDetails } = useCurriculumStore();
  const qTypes = ['Multiple Choice (MCQ)', 'True / False', 'Fill in the Blanks', 'Short Answer', 'Long Essay'];
  
  const [droppedTypes, setDroppedTypes] = useState([]);
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

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('qType', type);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('qType');
    if (type && !droppedTypes.find(t => t.type === type)) {
      setDroppedTypes([...droppedTypes, { type, count: 5 }]);
    }
  };

  const removeType = (index) => {
    const newTypes = [...droppedTypes];
    newTypes.splice(index, 1);
    setDroppedTypes(newTypes);
  };

  const updateCount = (index, newCount) => {
    const newTypes = [...droppedTypes];
    newTypes[index].count = newCount;
    setDroppedTypes(newTypes);
  };

  const handleGenerate = async () => {
    if (droppedTypes.length === 0) return;
    setIsGenerating(true);
    try {
      const totalQ = droppedTypes.reduce((acc, curr) => acc + curr.count, 0);
      const formattedTypesArray = droppedTypes.map(t => `${t.count} ${t.type}`);
      const formattedTypesStr = formattedTypesArray.join(', ');
      
      const res = await api.post('/ai-tools/custom-worksheet/generate', {
        prompt: `Generate a custom worksheet with exactly ${totalQ} total questions consisting of: ${formattedTypesStr}.`,
        chapterId: selection.chapterId,
        bookId: selection.bookId,
        customQuestions: formattedTypesArray
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
      console.error("Failed to generate custom worksheet", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const chapterTitle = chapterDetails?.title 
    ? `CHAPTER - ${chapterDetails.title.toUpperCase()}` 
    : selection?.chapterTitle ? `CHAPTER - ${selection.chapterTitle.toUpperCase()}` : "CHAPTER - CUSTOM WORKSHEET";

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

  return (
    <div className="h-full flex flex-col gap-6 p-1 relative text-white overflow-y-auto custom-scrollbar">
      {/* Header with action buttons */}
      <div className="flex items-center justify-between bg-[#1a1a1a] border border-gray-800 p-4 rounded-xl -mx-1 -mt-1 shadow-md">
        <div>
          <h3 className="font-semibold text-white">Custom Worksheet Builder</h3>
          <p className="text-xs text-gray-400 mt-1">
            {selection.chapterTitle} <span className="mx-1.5">·</span> {selection.bookTitle || "Subject"}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isGenerated && (
            <>
              <button 
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition-colors text-sm"
              >
                <FileText size={16} /> Export to PDF
              </button>
              <button 
                onClick={handleExportDOCX}
                className="flex items-center gap-2 px-4 py-2 bg-[#111] text-gray-300 font-semibold rounded-md hover:bg-[#222] border border-gray-700 transition-colors text-sm"
              >
                <Download size={16} /> Export to DOCX
              </button>
            </>
          )}

          {!isGenerated && droppedTypes.length > 0 && (
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black font-bold rounded-md hover:bg-amber-400 transition-colors text-sm"
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
            className="text-gray-400 hover:text-white transition-colors ml-2"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {!isGenerated ? (
        <div className="h-full flex gap-6 pb-10">
          {/* Left Column - Draggable Pills */}
          <GlassCard className="w-1/3 flex flex-col gap-4 bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-2 text-sm">Question Types</h3>
            <p className="text-xs text-gray-400 mb-4">Drag these types into the drop zone.</p>
            <div className="space-y-3">
              {qTypes.map((type, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={(e) => handleDragStart(e, type)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 cursor-grab hover:bg-amber-500/20 hover:border-amber-500/50 transition-all text-sm text-gray-200"
                >
                  <GripVertical size={16} className="text-gray-500" />
                  {type}
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Right Column - Drop Zone Canvas */}
          <div 
            className="flex-[2] bg-[#1a1a1a] rounded-xl border-2 border-dashed border-gray-700 p-8 flex flex-col relative transition-colors group"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{ minHeight: '400px' }}
          >
            <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none"></div>
            
            {droppedTypes.length === 0 ? (
              <div className="text-center space-y-4 m-auto">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-gray-400 group-hover:text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                  <PlusCircle size={32} />
                </div>
                <h3 className="text-lg font-medium text-white">Drag & Drop to Build</h3>
                <p className="text-sm text-gray-400 max-w-xs mx-auto">
                  Drag question types from the left panel and drop them here to compose your custom worksheet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 w-full z-10">
                <h3 className="text-lg font-medium text-white mb-4">Your Worksheet Configuration</h3>
                {droppedTypes.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-[#222] border border-gray-700 shadow-sm">
                    <span className="text-white text-sm font-medium">{item.type}</span>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-xs">No. of Questions:</span>
                        <input 
                          type="number" 
                          min="1" max="50"
                          value={item.count}
                          onChange={(e) => updateCount(idx, parseInt(e.target.value) || 1)}
                          className="w-16 bg-black border border-gray-600 rounded px-2 py-1 text-white text-center text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <button onClick={() => removeType(idx)} className="text-gray-400 hover:text-red-400 transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between items-center p-4 bg-black/40 rounded-lg mt-2 border border-gray-800">
                  <span className="text-gray-300 text-sm font-medium">Total Questions:</span>
                  <span className="text-amber-500 font-bold text-lg">{droppedTypes.reduce((acc, curr) => acc + curr.count, 0)}</span>
                </div>
                
                <div className="text-xs text-gray-500 mt-4 text-center">Drop more items below...</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Worksheet Render Area */
        <div className="w-full max-w-[1000px] mx-auto flex flex-col gap-6 pb-20">
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
        </div>
      )}
    </div>
  );
}
