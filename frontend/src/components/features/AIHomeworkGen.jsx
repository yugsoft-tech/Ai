import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { Sparkles, CalendarClock, UploadCloud } from 'lucide-react';

export default function AIHomeworkGen() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="relative p-[2px] rounded-2xl bg-linear-to-b from-neon-purple via-neon-purple/20 to-transparent box-shadow-glow-purple">
          <GlassCard className="rounded-[14px] bg-obsidian border-none flex flex-col p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-neon-purple" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-neon-purple">AI Assignment Task</span>
                </div>
                <h2 className="text-3xl font-bold text-white">Neural Networks Analysis</h2>
              </div>
              <div className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <CalendarClock size={14} />
                Due Tomorrow
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-4 text-gray-300 text-base leading-relaxed mb-8">
              <p>Based on today's lesson, complete the following tasks:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Identify 3 real-world applications of Neural Networks in your daily life.</li>
                <li>Draw a basic perceptron model and label its inputs, weights, and output.</li>
                <li>Write a short paragraph (150 words) on the ethical implications of deep learning.</li>
              </ul>
            </div>

            {/* Footer / Submission Guidelines */}
            <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                <p className="font-medium text-gray-200 mb-1">Submission Guidelines:</p>
                <p>Upload a PDF document. Max file size: 5MB.</p>
              </div>
              <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all">
                <UploadCloud size={20} />
                Assign to Class
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
