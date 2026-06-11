'use client';

import Link from 'next/link';
import {
  MessageSquare,
  BookOpen,
  FileText,
  LayoutDashboard,
  CheckCircle,
  Presentation,
  FilePenLine,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Brain,
} from 'lucide-react';

/* ─── Tool card definitions ─────────────────────────────────────── */
const TOOLS = [
  {
    id: 'chat',
    href: '/teacher?tool=chat',
    label: 'Chat with Book',
    description: 'Ask your AI assistant anything about a textbook chapter — get cited, contextual answers instantly.',
    icon: MessageSquare,
    gradient: 'from-violet-600/20 to-purple-900/20',
    iconBg: 'bg-violet-600/20',
    iconColor: 'text-violet-400',
    glow: 'shadow-violet-500/20',
    border: 'hover:border-violet-500/40',
    dot: 'bg-violet-400',
  },
  {
    id: 'lesson',
    href: '/teacher?tool=lesson',
    label: 'AI Lesson Planner',
    description: 'Instantly generate comprehensive lesson plans tailored to your curriculum and period count.',
    icon: Brain,
    gradient: 'from-emerald-600/20 to-teal-900/20',
    iconBg: 'bg-emerald-600/20',
    iconColor: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
    border: 'hover:border-emerald-500/40',
    dot: 'bg-emerald-400',
  },
  {
    id: 'worksheet',
    href: '/teacher?tool=worksheet',
    label: 'Worksheet Engine',
    description: 'Create custom worksheets with MCQs, fill-in-the-blanks, true/false and short answers in seconds.',
    icon: FileText,
    gradient: 'from-blue-600/20 to-cyan-900/20',
    iconBg: 'bg-blue-600/20',
    iconColor: 'text-blue-400',
    glow: 'shadow-blue-500/20',
    border: 'hover:border-blue-500/40',
    dot: 'bg-blue-400',
  },
  {
    id: 'custom-worksheet',
    href: '/teacher?tool=custom-worksheet',
    label: 'Custom Worksheet',
    description: 'Design fully customised worksheets with hand-picked question types and difficulty levels.',
    icon: LayoutDashboard,
    gradient: 'from-orange-600/20 to-amber-900/20',
    iconBg: 'bg-orange-600/20',
    iconColor: 'text-orange-400',
    glow: 'shadow-orange-500/20',
    border: 'hover:border-orange-500/40',
    dot: 'bg-orange-400',
  },
  {
    id: 'answer-key',
    href: '/teacher?tool=answer-key',
    label: 'Answer Key Gen',
    description: 'Auto-generate accurate answer keys for any worksheet or test paper with one click.',
    icon: CheckCircle,
    gradient: 'from-rose-600/20 to-pink-900/20',
    iconBg: 'bg-rose-600/20',
    iconColor: 'text-rose-400',
    glow: 'shadow-rose-500/20',
    border: 'hover:border-rose-500/40',
    dot: 'bg-rose-400',
  },
  {
    id: 'ppt',
    href: '/teacher?tool=ppt',
    label: 'AI PPT Generator',
    description: 'Turn any chapter or topic into beautiful, ready-to-present slides with AI-crafted content.',
    icon: Presentation,
    gradient: 'from-sky-600/20 to-indigo-900/20',
    iconBg: 'bg-sky-600/20',
    iconColor: 'text-sky-400',
    glow: 'shadow-sky-500/20',
    border: 'hover:border-sky-500/40',
    dot: 'bg-sky-400',
  },
  {
    id: 'test-paper',
    href: '/teacher?tool=test-paper',
    label: 'Test Paper Gen',
    description: 'Build structured exam papers with mixed question formats, marking schemes and difficulty control.',
    icon: FilePenLine,
    gradient: 'from-fuchsia-600/20 to-purple-900/20',
    iconBg: 'bg-fuchsia-600/20',
    iconColor: 'text-fuchsia-400',
    glow: 'shadow-fuchsia-500/20',
    border: 'hover:border-fuchsia-500/40',
    dot: 'bg-fuchsia-400',
  },
  {
    id: 'homework',
    href: '/teacher?tool=homework',
    label: 'AI Homework Gen',
    description: 'Generate differentiated homework assignments aligned to chapter objectives automatically.',
    icon: GraduationCap,
    gradient: 'from-lime-600/20 to-green-900/20',
    iconBg: 'bg-lime-600/20',
    iconColor: 'text-lime-400',
    glow: 'shadow-lime-500/20',
    border: 'hover:border-lime-500/40',
    dot: 'bg-lime-400',
  },
];

/* ─── Component ─────────────────────────────────────────────────── */
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-obsidian text-white">

      {/* ── Top nav bar ── */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <Link href="/dashboard" className="text-2xl font-bold tracking-tighter hover:opacity-80 transition-opacity">
          <span className="text-neon-purple">Yugsoft</span> Tech
        </Link>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-green animate-pulse shadow-[0_0_8px_#10b981]" />
          <Sparkles size={13} className="text-emerald-green" />
          <span className="text-sm font-medium text-emerald-green">RAG Engine Active</span>
        </div>
      </header>



      {/* ── Tool Grid ── */}
      <main className="px-8 pt-10 pb-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className={`
                  group relative flex flex-col p-6 rounded-2xl
                  bg-zinc-900/50 border border-zinc-800
                  ${tool.border}
                  hover:shadow-2xl ${tool.glow}
                  transition-all duration-300 cursor-pointer
                  overflow-hidden
                `}
              >
                {/* Gradient background blob */}
                <div
                  className={`absolute inset-0 bg-linear-to-br ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center text-center gap-4">

                  {/* Icon bubble */}
                  <div
                    className={`
                      w-14 h-14 rounded-2xl ${tool.iconBg}
                      flex items-center justify-center
                      shadow-lg group-hover:scale-110 transition-transform duration-300
                    `}
                  >
                    <Icon size={26} className={tool.iconColor} />
                  </div>

                  {/* Text */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white transition-colors">
                      {tool.label}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                      {tool.description}
                    </p>
                  </div>

                  {/* CTA */}
                  <div
                    className={`
                      mt-2 flex items-center gap-1.5 text-xs font-semibold ${tool.iconColor}
                      opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0
                      transition-all duration-300
                    `}
                  >
                    Open tool <ArrowRight size={13} />
                  </div>
                </div>

                {/* Active dot (top-right) */}
                <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${tool.dot} opacity-40 group-hover:opacity-100 transition-opacity`} />
              </Link>
            );
          })}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="text-center pb-10 text-xs text-gray-600">
        Yugsoft Tech — Enterprise Educational AI SaaS · {new Date().getFullYear()}
      </footer>

    </div>
  );
}
