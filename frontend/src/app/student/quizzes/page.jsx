"use client";

import React, { useEffect, useState } from 'react';
import { Gamepad2, Calendar, Trophy, Loader2 } from 'lucide-react';
import api from '@/services/api';

export default function MyQuizzesPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.get('/quiz/my-results');
        const data = res.data?.data || res.data || [];
        setResults(data);
      } catch (err) {
        console.error('Failed to fetch quiz results', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  return (
    <div className="h-full w-full p-4 md:p-8 overflow-y-auto custom-scrollbar relative animate-fade-in">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 pb-20">
        <div className="flex items-center gap-4 border-b border-white/10 pb-6">
          <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center border border-indigo-500/20">
            <Gamepad2 size={26} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-wide">My Quizzes</h1>
            <p className="text-sm text-gray-400">View your past gamified quiz results and scores</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-gray-400">Loading your history...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
            <Gamepad2 size={48} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-300">No quizzes played yet</h3>
            <p className="text-gray-500 mt-2">Go to Quiz Generator and play your first quiz!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((quiz) => (
              <div 
                key={quiz.id}
                className="group p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-indigo-500/40 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-linear-to-br from-indigo-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white leading-snug line-clamp-2">
                      {quiz.title}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-gray-400 text-sm">
                      <Calendar size={16} className="text-indigo-400" />
                      {new Date(quiz.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <span className="text-sm text-gray-500">Verified Score</span>
                      <div className="flex items-center gap-2">
                        <Trophy size={18} className="text-orange-400" />
                        <span className="text-2xl font-black text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-yellow-400">
                          {quiz.score}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
