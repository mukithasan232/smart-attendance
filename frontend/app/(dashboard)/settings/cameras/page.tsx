"use client";
import { useState, useEffect } from 'react';
import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card } from "@/components/ui/Card";
import { Video, Plus, Trash2, Edit2, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface Camera {
  id: string;
  name: string;
  url: string;
  location: string | null;
  enabled: boolean;
  createdAt: string;
}

export default function CameraSettingsPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cameras');
      if (!res.ok) throw new Error('Failed to fetch cameras');
      const data = await res.json();
      setCameras(data.cameras || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, location })
      });
      if (!res.ok) throw new Error('Failed to add camera');
      showToast('Camera added successfully!', 'success');
      setShowModal(false);
      setName('');
      setUrl('');
      setLocation('');
      fetchCameras();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this camera?')) return;
    try {
      const res = await fetch(`/api/cameras/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete camera');
      showToast('Camera deleted successfully!', 'success');
      fetchCameras();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  return (
    <PageWrapper 
      title="Camera Feeds" 
      subtitle="Manage your RTSP streams and IP camera sources for facial recognition."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCameras} disabled={isLoading}>
            <RefreshCw size={15} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={15} className="mr-2" />
            Add Camera
          </Button>
        </div>
      }
    >
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name & Location</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stream URL</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    Loading cameras...
                  </td>
                </tr>
              ) : cameras.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                    <Video size={32} className="mx-auto mb-3 text-slate-300" />
                    <p>No cameras configured yet.</p>
                    <p className="text-sm mt-1">Click "Add Camera" to setup your first stream.</p>
                  </td>
                </tr>
              ) : (
                cameras.map((camera) => (
                  <tr key={camera.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <Badge variant={camera.enabled ? "success" : "neutral"}>
                        {camera.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{camera.name}</div>
                      <div className="text-xs text-slate-500">{camera.location || 'No location'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 break-all max-w-xs">
                      {camera.url}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(camera.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Camera Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Add New Camera</h3>
            </div>
            
            <form onSubmit={handleAddCamera} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Camera Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Front Entrance"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">RTSP Stream URL</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="rtsp://admin:pass@192.168.1.100:554/stream1"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Must be a valid RTSP or HTTP video stream URL.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location (Optional)</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Lobby"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" className="flex-1 justify-center" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 justify-center" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                  Save Camera
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-bold text-white animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}
    </PageWrapper>
  );
}
