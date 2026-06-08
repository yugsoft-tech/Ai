import React, { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Slider from '@/components/ui/Slider';
import Button from '@/components/ui/Button';
import { Download, Settings2, Loader2, Play } from 'lucide-react';
import useCurriculumStore from '@/store/curriculumStore';
import api from '@/services/api';

export default function WorksheetGen() {
  const { selectedSubjectId, selectedChapterId, chapterDetails } = useCurriculumStore();
  const [difficulty, setDifficulty] = useState(50);
  const [qCount, setQCount] = useState(10);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [worksheetData, setWorksheetData] = useState(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate POST /api/v1/generator/worksheet
    try {
      // Example implementation sending curriculum variables:
      // await api.post('/api/v1/generator/worksheet', { classId: '...', subjectId: selectedSubjectId, chapterId: selectedChapterId });
      
      // Simulating network payload generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setWorksheetData({
        mcqs: [
          { q: "What is the primary function of a neuron in an artificial neural network?", options: ["A) Data Storage", "B) Pattern Recognition", "C) Signal Transmission", "D) Power Generation"] },
          { q: "Which of the following is an activation function?", options: ["A) ReLU", "B) SGD", "C) Adam", "D) Epoch"] }
        ],
        fillInTheBlanks: [
          { q: "The process of adjusting weights to minimize error is called ____________." },
          { q: "A neural network with multiple hidden layers is known as a ____________ neural network." }
        ],
        trueFalse: [
          { q: "Gradient descent always finds the global minimum." },
          { q: "Backpropagation is used to calculate the gradient of the loss function." }
        ],
        shortAnswer: [
          { q: "Explain the concept of 'weights' and 'biases' with an example." },
          { q: "How does a neural network 'learn' from data?" }
        ]
      });
      setIsGenerated(true);
    } catch (error) {
      console.error("Failed to generate worksheet", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const chapterTitle = chapterDetails?.title 
    ? `CHAPTER - ${chapterDetails.title.toUpperCase()}` 
    : "CHAPTER - EXCEL 2019 - CREATING WORKSHEETS";

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #worksheet-print-area, #worksheet-print-area * {
            visibility: visible;
          }
          #worksheet-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
        }
      `}} />
      <div className="h-full flex flex-col gap-6 p-1 relative">
        {/* Config Card */}
        <div className="no-print">
          <GlassCard className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Settings2 className="text-neon-purple" />
                Worksheet Configuration
              </h3>
              
              <div className="flex items-center gap-4">
                {/* BUTTON 1: Generate Worksheet */}
                <Button 
                  type="button" 
                  variant="primary" 
                  className="flex items-center gap-2"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                  Generate Worksheet
                </Button>
                
                {/* BUTTON 2: Export to PDF */}
                <Button 
                  type="button" 
                  variant="accent" 
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  onClick={handleExportPDF}
                  disabled={!isGenerated || isGenerating}
                >
                  <Download size={16} /> Export to PDF
                </Button>
              </div>
            </div>
            
            <div className="flex gap-8">
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
          </GlassCard>
        </div>

        {/* A4 Preview Canvas */}
        <div className="flex-1 glass-panel rounded-xl flex justify-center p-8 overflow-y-auto custom-scrollbar no-print-bg">
          <div id="worksheet-print-area" className="w-full max-w-[800px] min-h-[1050px] bg-white text-black p-12 shadow-2xl rounded-sm font-serif">
            
            {/* 1. LAYOUT & CURRICULUM HEADER BLOCK */}
            <div className="border-b-2 border-black pb-4 mb-8">
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm font-semibold mb-6">
                <div>Name: __________________________________</div>
                <div className="flex justify-between">
                  <span>Roll No: ________________</span>
                  <span>Date: ________________</span>
                </div>
                <div>Class: __________________________________</div>
                <div>Section: ________________</div>
              </div>
              <h1 className="text-xl font-bold text-left uppercase tracking-wider">
                {chapterTitle}
              </h1>
            </div>

            {/* 2. QUESTION SECTION WRAPPERS */}
            {isGenerated && worksheetData ? (
              <div className="space-y-10 text-sm">
                
                {/* MCQs */}
                {worksheetData.mcqs && worksheetData.mcqs.length > 0 && (
                  <section>
                    <h2 className="font-bold text-lg mb-4 uppercase">I. Multiple Choice Questions</h2>
                    <div className="space-y-6">
                      {worksheetData.mcqs.map((item, idx) => (
                        <div key={idx} className="pl-4">
                          <p className="font-semibold mb-3">{idx + 1}. {item.q}</p>
                          <div className="grid grid-cols-2 gap-4 pl-4">
                            {item.options.map((opt, oIdx) => (
                              <div key={oIdx}>{opt}</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Fill in the Blanks */}
                {worksheetData.fillInTheBlanks && worksheetData.fillInTheBlanks.length > 0 && (
                  <section>
                    <h2 className="font-bold text-lg mb-4 uppercase mt-8">II. Fill in the Blanks</h2>
                    <div className="space-y-4">
                      {worksheetData.fillInTheBlanks.map((item, idx) => (
                        <div key={idx} className="pl-4">
                          <p className="leading-loose">{idx + 1}. {item.q}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* True or False */}
                {worksheetData.trueFalse && worksheetData.trueFalse.length > 0 && (
                  <section>
                    <h2 className="font-bold text-lg mb-4 uppercase mt-8">III. True or False</h2>
                    <div className="space-y-4">
                      {worksheetData.trueFalse.map((item, idx) => (
                        <div key={idx} className="pl-4 flex justify-between items-center border-b border-gray-300 pb-2">
                          <p className="flex-1 pr-4">{idx + 1}. {item.q}</p>
                          <div className="w-32 flex justify-end space-x-6 font-mono font-bold">
                            <span>[ T ]</span>
                            <span>[ F ]</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Short Answer Questions */}
                {worksheetData.shortAnswer && worksheetData.shortAnswer.length > 0 && (
                  <section>
                    <h2 className="font-bold text-lg mb-4 uppercase mt-8">IV. Short Answer Questions</h2>
                    <div className="space-y-8">
                      {worksheetData.shortAnswer.map((item, idx) => (
                        <div key={idx} className="pl-4">
                          <p className="font-semibold mb-6">{idx + 1}. {item.q}</p>
                          <div className="space-y-8">
                            <div className="border-b border-gray-400 w-full h-2"></div>
                            <div className="border-b border-gray-400 w-full h-2"></div>
                            <div className="border-b border-gray-400 w-full h-2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 mt-32">
                 {isGenerating ? (
                   <div className="flex flex-col items-center gap-4">
                     <Loader2 className="animate-spin text-black" size={48} />
                     <p className="text-black font-sans font-medium text-lg">Generating Worksheet Schema...</p>
                   </div>
                 ) : (
                   <p className="text-gray-500 font-sans italic">Click "Generate Worksheet" to build and preview the document.</p>
                 )}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
