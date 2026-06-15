"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import useAuthStore from '@/store/authStore';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState('');
  
  const setAuth = useAuthStore((state) => state.setAuth);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  useEffect(() => {
    const handleCallback = async () => {
      if (!token) {
        setError('No authentication token found.');
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      try {
        // First set the token so the api interceptor can use it
        setAuth(null, token);

        // Fetch the full user profile
        const user = await fetchProfile();
        
        if (user) {
          // Redirect based on role
          if (user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'super_admin' || user?.role?.toLowerCase() === 'school_admin') {
            router.push('/admin');
          } else if (user?.role?.toLowerCase() === 'student') {
            router.push('/student');
          } else {
            router.push('/dashboard');
          }
        } else {
          throw new Error('Failed to fetch user profile');
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError('Failed to complete authentication.');
        setTimeout(() => router.push('/login'), 2000);
      }
    };

    handleCallback();
  }, [token, router, setAuth, fetchProfile]);

  return (
    <div className="min-h-screen bg-obsidian text-white flex flex-col items-center justify-center font-sans">
      <div className="glass-panel p-10 rounded-3xl flex flex-col items-center max-w-sm w-full">
        {error ? (
          <div className="text-red-400 text-center animate-fade-in">
            <p className="mb-2 font-bold">Error</p>
            <p className="text-sm">{error}</p>
            <p className="text-xs text-gray-500 mt-4">Redirecting to login...</p>
          </div>
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <h2 className="text-xl font-bold">Authenticating...</h2>
            <p className="text-sm text-gray-400 mt-2 text-center">
              Please wait while we log you in securely.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
