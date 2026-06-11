"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import api from '@/services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let response;
      try {
        response = await api.post('/auth/login', { email, password });
      } catch (err) {
        // If credentials match the demo credentials and user doesn't exist (401/404), auto-signup
        const isDemoTeacher = email === 'demo@yugsoft.com' && password === 'demo1234';
        const isDemoAdmin = email === 'admin@yugsoft.com' && password === 'admin1234';

        if ((isDemoTeacher || isDemoAdmin) && (err.response?.status === 401 || err.response?.status === 404)) {
          if (isDemoAdmin) {
            // Admin creates their own new tenant
            response = await api.post('/auth/signup', {
              email,
              password,
              tenantName: 'Demo School',
              role: 'admin'
            });
          } else {
            // Teacher must join the admin's existing tenant
            // First login the admin to get tenantId, then signup teacher under same tenant
            let adminTenantId = null;
            try {
              const adminLoginRes = await api.post('/auth/login', {
                email: 'admin@yugsoft.com',
                password: 'admin1234',
              });
              const adminData = adminLoginRes.data?.data || adminLoginRes.data;
              adminTenantId = adminData?.user?.tenantId;
            } catch {
              // admin not yet signed up, just create teacher with own tenant
            }

            response = await api.post('/auth/signup', {
              email,
              password,
              tenantName: 'Demo School',
              role: 'teacher',
              ...(adminTenantId ? { tenantId: adminTenantId } : {}),
            });
          }
        } else {
          throw err;
        }
      }

      const data = response.data?.data || response.data;
      const { accessToken, user } = data;
      setAuth(user, accessToken);
      
      if (user?.role?.toLowerCase() === 'admin') {
        router.push('/admin');
      } else if (user?.role?.toLowerCase() === 'student') {
        router.push('/student');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      const apiError = err.response?.data?.message;
      let errorMsg = '';
      if (typeof apiError === 'string') {
        errorMsg = apiError;
      } else if (Array.isArray(apiError)) {
        errorMsg = apiError.join(', ');
      } else if (apiError && typeof apiError === 'object') {
        errorMsg = apiError.message || JSON.stringify(apiError);
      } else {
        errorMsg = err.response?.data?.error || err.message || 'Invalid email or password. Hint: Use admin@yugsoft.com / admin1234 or demo@yugsoft.com / demo1234';
      }
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-white flex flex-col justify-center items-center font-sans selection:bg-neon-purple selection:text-white px-4 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-neon-purple/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-green/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel p-10 rounded-3xl w-full max-w-md z-10 relative"
      >
        <div className="flex flex-col items-center mb-8">
          <Link href="/">
            <div className="w-16 h-16 rounded-2xl bg-neon-purple/20 flex items-center justify-center mb-6 cursor-pointer hover:bg-neon-purple/30 transition-colors">
              <Brain className="w-8 h-8 text-neon-purple" />
            </div>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Welcome Back</h2>
          <p className="text-gray-400 mt-2 text-sm text-center">Log in to YugSoft AI to continue to your dashboard.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-glass-border rounded-xl bg-black/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-purple focus:border-transparent transition-all"
                placeholder="you@school.edu"
              />
            </div>
          </div>

          <div>
            <label className="flex text-sm font-medium text-gray-300 mb-2 justify-between">
              Password
              <Link href="/forgot-password" className="text-neon-purple hover:text-white transition-colors">Forgot?</Link>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-glass-border rounded-xl bg-black/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-purple focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 mt-6 bg-neon-purple text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#7c3aed] transition-colors shadow-[0_0_15px_rgba(139,92,246,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link href="/signup" className="text-neon-purple font-medium hover:text-white transition-colors">
            Sign up for free
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
