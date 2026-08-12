'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

type AuthState = {
  user: User | null;
  role: 'ADMIN' | 'USER' | null;
  isVerified: boolean;
  isLoading: boolean;
};

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  isVerified: false,
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    isVerified: false,
    isLoading: true,
  });

  const supabase = createClient();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setState({
          user: session.user,
          role: session.user.app_metadata?.role || 'USER',
          isVerified: session.user.app_metadata?.isVerified || false,
          isLoading: false,
        });
      } else {
        setState({
          user: null,
          role: null,
          isVerified: false,
          isLoading: false,
        });
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setState({
          user: session.user,
          role: session.user.app_metadata?.role || 'USER',
          isVerified: session.user.app_metadata?.isVerified || false,
          isLoading: false,
        });
      } else {
        setState({
          user: null,
          role: null,
          isVerified: false,
          isLoading: false,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
