"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase's `supabase.auth.getSession()` automatically reads the URL hash fragment 
      // if tokens are present, sets the session, and clears the hash.
      const supabase = createClient();
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Callback auth error:', error);
        setError('Authentication failed. Redirecting to login...');
        setTimeout(() => {
          window.location.href = window.location.origin + '/login';
        }, 2000);
        return;
      }

      if (data.session) {
        // Find role to determine correct redirect path
        const role = data.session.user?.app_metadata?.role || 'USER';
        
        let redirectPath = '/dashboard';
        if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
          redirectPath = '/super-admin/dashboard';
        }

        // Redirect dynamically without ever using hardcoded localhost:3000
        window.location.href = window.location.origin + redirectPath;
      } else {
        // Try parsing hash manually just in case
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          // It's possible supabase is still processing the hash, we wait a sec
          setTimeout(handleCallback, 500);
        } else {
          setError('No session found. Redirecting to login...');
          setTimeout(() => {
            window.location.href = window.location.origin + '/login';
          }, 2000);
        }
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      {error ? (
        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-200 font-medium">
          {error}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Authenticating...</h2>
          <p className="text-slate-500 text-sm">Please wait while we verify your session.</p>
        </div>
      )}
    </div>
  );
}
