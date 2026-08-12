"use client";
import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card } from "@/components/ui/Card";
import { ShieldAlert } from "lucide-react";

export default function AccountSettingsPage() {
  return (
    <PageWrapper title="Account & Security" subtitle="Manage personal profile details, change password, and view assigned subscription plan tier.">
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Security</h3>
          <p className="text-slate-500 max-w-sm mb-6">
            Update your credentials and review active sessions.
          </p>
          <button onClick={() => window.location.href = '/settings'} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition">
            Go to Legacy Settings
          </button>
        </div>
      </Card>
    </PageWrapper>
  );
}
