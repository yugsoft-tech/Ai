import React from 'react';
import { useGamifiedQuiz, QuizQuestion } from '../../../hooks/useGamifiedQuiz';
import { CheckCircle, XCircle, Timer, Zap, Trophy } from 'lucide-react';

interface GamifiedQuizUIProps {
  questions: QuizQuestion[];
  title: string;
}

import { useRouter } from 'next/navigation';

export const GamifiedQuizUI: React.FC<GamifiedQuizUIProps> = ({ questions, title }) => {
  const router = useRouter();
  const {
    currentQuestion,
    currentIndex,
    streak,
    timeLeft,
    isSubmitting,
    isFinished,
    verifiedScore,
    handleAnswer,
  } = useGamifiedQuiz(questions, title);

  if (isFinished) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 text-center animate-fade-in">
        {isSubmitting ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <h2 className="text-2xl font-bold text-white animate-pulse">Calculating Score...</h2>
          </div>
        ) : (
          <div className="py-12 space-y-6 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-linear-to-tr from-indigo-500 to-purple-500 shadow-[0_0_40px_rgba(99,102,241,0.5)]">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400">
              Quiz Complete!
            </h2>
            <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 inline-block min-w-[250px] my-4">
              <p className="text-slate-400 text-sm uppercase tracking-wider mb-2">Verified Score</p>
              <p className="text-6xl font-black text-white">{verifiedScore}</p>
            </div>
            <p className="text-slate-400 mb-6">Great job completing "{title}"!</p>
            
            <button 
              onClick={() => router.push('/student/leaderboard')}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-95"
            >
              <Trophy size={20} /> View Leaderboard
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!currentQuestion) return null;

  const isLowTime = timeLeft <= 5;

  return (
    <div className="w-full max-w-3xl mx-auto p-6 md:p-8 bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 transition-all duration-300">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {currentQuestion.type.replace('_', ' ')}
          </span>
          <span className="text-slate-400 font-medium text-sm">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-4 py-1.5 rounded-full border transition-colors ${streak >= 3 ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
            <span className="text-lg">🔥</span>
            <span className="font-bold">{streak}</span>
          </div>
          
          <div className={`flex items-center space-x-2 px-4 py-1.5 rounded-full border transition-colors ${isLowTime ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
            <Timer className="w-4 h-4" />
            <span className="font-bold font-mono text-lg">{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-800 rounded-full mb-8 overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${isLowTime ? 'bg-red-500' : 'bg-linear-to-r from-indigo-500 to-purple-500'}`}
          style={{ width: `${(timeLeft / 15) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="mb-10">
        <h3 className="text-2xl md:text-3xl font-bold text-white leading-snug">
          {currentQuestion.question}
        </h3>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentQuestion.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswer(option)}
            className="group relative flex items-center p-5 text-left bg-slate-800 border-2 border-slate-700 rounded-xl overflow-hidden transition-all duration-200 hover:border-indigo-500 hover:bg-slate-800/80 active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-linear-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center font-bold mr-4 group-hover:bg-indigo-500 group-hover:text-white transition-colors shrink-0">
              {String.fromCharCode(65 + idx)}
            </div>
            <span className="text-slate-200 font-medium text-lg leading-tight relative z-10">
              {option}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
