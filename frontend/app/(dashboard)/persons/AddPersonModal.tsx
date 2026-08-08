"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, useRef } from "react";
import { Upload, UserPlus, CheckCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AddPersonModalProps {
  onSuccess: () => void;
  onCancel: () => void;
  onSubmit: (name: string, designation: string, file: File) => Promise<void>;
}

export default function AddPersonModal({ onSuccess, onCancel, onSubmit }: AddPersonModalProps) {
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !designation.trim() || !file) return;
    setUploading(true);
    try {
      await onSubmit(name.trim(), designation.trim(), file);
      onSuccess();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-slate-900 font-bold text-lg">Add New Person</h3>
              <p className="text-xs text-slate-500 font-medium">Register a face to the system</p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-shadow"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                ID / Designation
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Software Engineer or EMP-101"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-shadow"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Face Photo
              </label>
              <div
                className={`relative group border-2 border-dashed rounded-xl overflow-hidden flex flex-col items-center justify-center transition-all cursor-pointer ${
                  file ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300"
                } ${preview ? 'h-48' : 'h-32'}`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                
                {preview ? (
                  <>
                    <img src={preview} alt="preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium">
                      Click to change
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center p-4">
                    <div className="w-10 h-10 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 mb-2 group-hover:scale-110 group-hover:text-indigo-500 transition-all">
                      <Upload size={18} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Upload photo</p>
                    <p className="text-xs text-slate-500 font-medium mt-1">Drag and drop or click to browse</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 justify-center"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 justify-center"
              disabled={!name.trim() || !designation.trim() || !file || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle size={16} className="mr-2" />
                  Register Person
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
