import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(targetUrl);
    
    // Copy the response headers (e.g. content-type for mjpeg streams)
    const headers = new Headers(response.headers);
    // Overwrite some headers for proxying
    headers.set('Access-Control-Allow-Origin', '*');
    
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error: unknown) {
    console.error('Proxy error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Proxy failed', details: (error as Error).message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
