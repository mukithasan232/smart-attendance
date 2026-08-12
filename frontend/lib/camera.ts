export function getCameraSource(customUrl?: string): string {
  if (customUrl) return customUrl;

  // In development, default to local webcam (0)
  if (process.env.NODE_ENV === 'development') {
    return '0';
  }

  // In production, strictly connect to the configured IP Camera, RTSP stream, or WebSocket stream
  return process.env.NEXT_PUBLIC_CAMERA_URL || '';
}

/**
 * Returns the proxy URL for the stream if it's an external HTTP URL
 * to avoid mixed-content issues in production HTTPS deployments.
 */
export function getProxiedStreamUrl(url: string): string {
  if (!url) return '';
  if (url === '0') return url; // Local webcam handled elsewhere or directly in dev
  
  // If the stream is an external http:// URL and we are on an https:// site, we should proxy it
  if (url.startsWith('http://') && typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return `/api/stream-proxy?url=${encodeURIComponent(url)}`;
  }
  
  return url;
}
