'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BrandingSettings } from '@/lib/api';

const DEFAULT_BRANDING: BrandingSettings = {
  appName: 'CoderNest',
  tagline: 'Smart AI Vision',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#4f46e5',
};

interface BrandingContextType {
  branding: BrandingSettings;
  setBranding: (branding: BrandingSettings) => void;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULT_BRANDING,
  setBranding: () => {},
  isLoading: true,
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings/branding')
      .then(res => res.json())
      .then(data => {
        if (data?.branding) {
          setBranding(data.branding);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    // Inject dynamic CSS variable for primary color
    if (branding.primaryColor) {
      document.documentElement.style.setProperty('--accent-indigo', branding.primaryColor);
      // Optional: adjust other shades if you have color manipulation, 
      // but injecting to --accent-indigo is the minimum.
    }

    // Update document title
    if (branding.appName) {
      document.title = `${branding.appName} — Enterprise Security System`;
    }

    // Update favicon
    if (branding.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, setBranding, isLoading }}>
      {children}
    </BrandingContext.Provider>
  );
};
