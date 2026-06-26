'use client';

import dynamic from 'next/dynamic';

// Dynamically import EVMap with SSR disabled to prevent hydration crash
// MapLibre GL accesses browser-only APIs (window, document, WebGL)
const EVMap = dynamic(() => import('./ev-map'), { ssr: false });

export default function EVMapClient() {
  return <EVMap />;
}