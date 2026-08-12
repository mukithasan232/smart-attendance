"use client";
import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card } from "@/components/ui/Card";
import { Video } from "lucide-react";

export default function CameraSettingsPage() {
  return (
    <PageWrapper title="Camera Feeds" subtitle="Manage your RTSP streams and IP camera sources.">
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
            <Video size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Camera Configuration</h3>
          <p className="text-slate-500 max-w-sm mb-6">
            Configure your active camera streams and assign them to your tenant workspace.
          </p>
          <button disabled className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl font-medium cursor-not-allowed">
            Add Camera (Coming Soon)
          </button>
        </div>
      </Card>
    </PageWrapper>
  );
}
