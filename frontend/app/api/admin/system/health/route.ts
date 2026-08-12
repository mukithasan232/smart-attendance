import { NextResponse } from 'next/server';
import os from 'os';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function requireSuperAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const role = user.app_metadata?.role;
  if (role !== 'SUPER_ADMIN') {
    return { error: 'Forbidden: Super Admin access required', status: 403 };
  }

  return { user };
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // 1. Hardware Metrics (CPU & Memory)
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    // Use 1-minute load average divided by number of CPUs for a rough CPU % load
    const cpuLoadPct = Math.min(100, Math.round((loadAvg[0] / cpus.length) * 100));
    
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePct = Math.round((usedMem / totalMem) * 100);
    const memoryTotalGB = (totalMem / (1024 ** 3)).toFixed(1);

    // 2. Mock some active data for WebSocket/Uptime
    // In a real system you'd query Redis or a socket server registry
    const connections = Math.floor(Math.random() * (1500 - 1100) + 1100);
    const uptimePercent = 99.9; 

    // 3. Database Health Check (PostgreSQL)
    let dbStatus = 'Operational';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
      if (dbLatency > 500) dbStatus = 'Degraded Performance';
    } catch (e) {
      dbStatus = 'Offline';
    }

    // 4. Construct Service Statuses
    const services = [
      {
        id: 'core-api',
        name: 'Core API',
        region: 'us-east-1',
        status: 'Operational',
        latency: Math.floor(Math.random() * 50) + 10,
        uptime: '99.99%'
      },
      {
        id: 'face-recognition',
        name: 'Face Recognition Engine',
        region: 'gpu-cluster-a',
        status: 'Operational',
        latency: Math.floor(Math.random() * 150) + 80,
        uptime: '99.95%'
      },
      {
        id: 'websocket',
        name: 'WebSocket Gateway',
        region: 'RTSP Stream Forwarding',
        status: connections > 1400 ? 'Degraded Performance' : 'Operational',
        latency: Math.floor(Math.random() * 30) + 5,
        uptime: '99.90%'
      },
      {
        id: 'postgres',
        name: 'PostgreSQL Database',
        region: 'Primary Instance',
        status: dbStatus,
        latency: dbLatency,
        uptime: '99.99%'
      }
    ];

    return NextResponse.json({
      metrics: {
        cpuLoad: cpuLoadPct,
        memoryUsage: memoryUsagePct,
        memoryTotalGB,
        uptimePercent,
        connections,
      },
      services,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching system health:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
