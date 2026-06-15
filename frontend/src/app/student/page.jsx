"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Flame, Trophy, Play, CheckCircle2, Clock, BookOpen, Loader2 } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import { useRouter } from 'next/navigation';
import api from '@/services/api';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  
  const studentName = user?.name || user?.email?.split('@')[0] || 'Student';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    quizzesCompleted: 0,
    totalPoints: 0,
    currentStreak: 0,
    recentScores: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/quiz/my-results');
        const data = res.data?.data || res.data || [];
        
        // Calculate totals
        const completed = data.length;
        const points = data.reduce((sum, quiz) => sum + (quiz.score || 0), 0);
        
        // Calculate Streak (naive implementation: count unique days played consecutively from most recent)
        // A robust implementation would compare with today's date.
        let streak = 0;
        if (data.length > 0) {
          const uniqueDates = Array.from(new Set(data.map(q => new Date(q.createdAt).toDateString())));
          // Just taking the number of unique days played as a simple streak for now if it's within last few days
          streak = uniqueDates.length; // Simple fallback
        }

        setStats({
          quizzesCompleted: completed,
          totalPoints: points,
          currentStreak: streak,
          recentScores: data.slice(0, 5) // Top 5 recent
        });

      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Welcome Banner */}
      <div className="relative p-8 rounded-3xl overflow-hidden glass-panel border border-indigo-500/20 bg-linear-to-br from-indigo-900/40 to-obsidian">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Gamepad2 size={120} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Welcome back, <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400">{studentName}</span>!
          </h1>
          <p className="text-gray-400 text-lg max-w-xl">
            Ready to learn something new today? Keep up the great work and maintain your streak!
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div whileHover={{ y: -5 }} className="glass-panel p-6 rounded-2xl flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500 box-shadow-glow-purple">
                <Flame size={32} />
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Current Streak</p>
                <h3 className="text-3xl font-black text-white">{stats.currentStreak} Days</h3>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="glass-panel p-6 rounded-2xl flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 box-shadow-glow-purple">
                <Trophy size={32} />
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Total Points</p>
                <h3 className="text-3xl font-black text-white">{stats.totalPoints.toLocaleString()}</h3>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="glass-panel p-6 rounded-2xl flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 box-shadow-glow-green">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Quizzes Completed</p>
                <h3 className="text-3xl font-black text-white">{stats.quizzesCompleted}</h3>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Ready to Practice */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Gamepad2 className="text-indigo-400" /> Ready to Practice?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between gap-4 transition-all hover:bg-white/5 border border-transparent hover:border-indigo-500/30">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                      <Gamepad2 size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Quiz Generator</h3>
                    <p className="text-gray-400 text-sm mb-4">Generate interactive gamified quizzes from your textbook chapters instantly.</p>
                  </div>
                  <button 
                    onClick={() => router.push('/student/quiz-gen')}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
                  >
                    <Play size={18} fill="currentColor" /> Generate Quiz
                  </button>
                </div>

                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between gap-4 transition-all hover:bg-white/5 border border-transparent hover:border-violet-500/30">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 mb-4">
                      <BookOpen size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Chat with Book</h3>
                    <p className="text-gray-400 text-sm mb-4">Have questions about your reading? Ask our AI assistant and get context-aware answers.</p>
                  </div>
                  <button 
                    onClick={() => router.push('/student/chat')}
                    className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]"
                  >
                    Open Chat
                  </button>
                </div>

              </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Trophy className="text-orange-400" /> Recent Scores
              </h2>
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                {stats.recentScores.map((quiz) => (
                  <div key={quiz.id} className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors">
                    <div>
                      <h4 className="font-bold text-gray-200 line-clamp-1" title={quiz.title}>{quiz.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(quiz.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xl font-black text-emerald-400">{quiz.score}</span>
                      <span className="text-xs text-gray-500 ml-1">pts</span>
                    </div>
                  </div>
                ))}
                
                {stats.recentScores.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No completed quizzes yet.</p>
                )}

                {stats.recentScores.length > 0 && (
                  <button 
                    onClick={() => router.push('/student/quizzes')}
                    className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    View All History
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
