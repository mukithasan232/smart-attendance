import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'system-config.json');

export async function GET() {
  try {
    let configData = {};
    try {
      const fileContent = await fs.readFile(CONFIG_FILE, 'utf-8');
      configData = JSON.parse(fileContent);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
      // If file doesn't exist, fallback to environment variables
      configData = {
        backendUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      };
    }
    
    return NextResponse.json(configData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { backendUrl, supabaseUrl, supabaseKey } = body;
    
    const configData = {
      backendUrl: backendUrl || '',
      supabaseUrl: supabaseUrl || '',
      supabaseKey: supabaseKey || '',
    };
    
    await fs.writeFile(CONFIG_FILE, JSON.stringify(configData, null, 2), 'utf-8');
    
    return NextResponse.json({ message: 'Configuration saved successfully', config: configData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
