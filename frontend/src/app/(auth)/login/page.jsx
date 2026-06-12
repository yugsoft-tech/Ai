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

        <div className="mt-6 flex items-center justify-center">
          <div className="w-full h-px bg-glass-border"></div>
          <span className="px-4 text-sm text-gray-500 bg-obsidian">or continue with</span>
          <div className="w-full h-px bg-glass-border"></div>
        </div>

        <button
          type="button"
          onClick={() => window.location.href = 'http://localhost:4001/api/v1/auth/google'}
          className="w-full mt-6 py-3 px-4 bg-white text-gray-900 rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Log in with Google
        </button>

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
