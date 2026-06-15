"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Sparkles, Brain, Cpu, Globe } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-obsidian text-white flex flex-col font-sans selection:bg-neon-purple selection:text-white">
      {/* Background glowing effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-neon-purple/20 rounded-full blur-[100px]" />
        <div className="absolute top-40 -left-40 w-96 h-96 bg-emerald-green/20 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full px-4 md:px-8 py-4 md:py-6 flex justify-between items-center glass-panel border-b border-glass-border">
        <div className="flex items-center gap-2">
          <Brain className="w-8 h-8 text-neon-purple" />
          <span className="text-xl md:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-neon-purple to-emerald-green">
            YugSoft AI
          </span>
        </div>
        <nav className="flex items-center gap-4 md:gap-6">
          <Link href="/features" className="hidden md:block text-sm font-medium text-gray-300 hover:text-white transition-colors">Features</Link>
          <Link href="/pricing" className="hidden md:block text-sm font-medium text-gray-300 hover:text-white transition-colors">Pricing</Link>
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/login">
              <button className="px-3 md:px-4 py-2 text-sm font-medium text-white hover:text-neon-purple transition-colors">
                Log In
              </button>
            </Link>
            <Link href="/signup">
              <button className="px-3 md:px-4 py-2 text-sm font-medium bg-white text-black rounded-full hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                Sign Up
              </button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-neon-purple/10 border border-neon-purple/20 text-neon-purple text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            <span>Next-Generation AI for Educators</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-extrabold tracking-tight mb-6 md:mb-8 mt-10 md:mt-0">
            Empower Your <br />
            <span className="bg-clip-text text-transparent bg-linear-to-r from-neon-purple to-emerald-green">
              Teaching Experience
            </span>
          </h1>
          
          <p className="text-lg md:text-xl lg:text-2xl text-gray-400 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
            Generate lesson plans, craft perfect worksheets, and automate homework grading with the most powerful AI suite designed exclusively for schools.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-neon-purple text-white rounded-full font-semibold flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] transition-shadow"
              >
                Get Started <ChevronRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Feature Cards Showcase */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full pb-10"
        >
          <div className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
            <div className="w-14 h-14 rounded-2xl bg-neon-purple/20 flex items-center justify-center mb-6">
              <Brain className="w-7 h-7 text-neon-purple" />
            </div>
            <h3 className="text-xl font-bold mb-3">AI Lesson Planner</h3>
            <p className="text-gray-400">Instantly generate comprehensive lesson plans tailored to your curriculum.</p>
          </div>
          
          <div className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
            <div className="w-14 h-14 rounded-2xl bg-emerald-green/20 flex items-center justify-center mb-6">
              <Cpu className="w-7 h-7 text-emerald-green" />
            </div>
            <h3 className="text-xl font-bold mb-3">Worksheet Engine</h3>
            <p className="text-gray-400">Create custom worksheets and automated answer keys in seconds.</p>
          </div>

          <div className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
              <Globe className="w-7 h-7 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold mb-3">Global Accessibility</h3>
            <p className="text-gray-400">Access your teaching tools from anywhere, fully synced and backed up.</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
