import Link from 'next/link';
import { AlertTriangle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-[20px] p-10 shadow-sm border border-gray-100 max-w-md w-full text-center flex flex-col items-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full mb-6 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">404 - Page Not Found</h1>
        <p className="text-sm text-slate-500 mb-8">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link 
          href="/" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 font-bold flex items-center gap-2 transition-colors duration-200"
        >
          <Home className="w-5 h-5" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
