"use client";

// components/PersonsGallery.tsx — Known persons grid with add/delete controls.

import { useEffect, useState, useRef, useCallback } from "react";
import {
  getPersons,
  deletePerson,
  uploadPerson,
  snapshotUrl,
  Person,
} from "@/lib/api";
import {
  UserPlus,
  Trash2,
  Upload,
  User,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";

export default function PersonsGallery() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchPersons = useCallback(async () => {
    try {
      const data = await getPersons();
      setPersons(data);
    } catch {
      showToast("Failed to load persons list.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPersons();
  }, [fetchPersons]);

  const handleDelete = async (id: number) => {
    try {
      await deletePerson(id);
      setPersons((prev) => prev.filter((p) => p.id !== id));
      showToast("Person removed from the system.", "success");
    } catch (e: unknown) {
      showToast((e as Error).message || "An error occurred", "error");
    } finally {
      setDeleteId(null);
    }
  };

  const handleUploaded = () => {
    setShowUpload(false);
    fetchPersons();
  };

  return (
    <div className="card">
      {/* Toast notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === "success" ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.msg}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteId !== null && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div
            className="modal-content modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <AlertCircle size={36} className="text-red-500 mb-3" />
            <h3 className="text-slate-900 font-semibold text-lg mb-2">
              Remove Person?
            </h3>
            <p className="text-slate-500 text-sm text-center mb-6">
              This person will no longer be recognised by the system.
              Historical events are preserved.
            </p>
            <div className="flex gap-3">
              <button
                className="btn-secondary flex-1"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
              <button
                className="btn-danger flex-1"
                onClick={() => handleDelete(deleteId)}
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload person modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div
            className="modal-content modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <UploadPersonForm
              onSuccess={handleUploaded}
              onCancel={() => setShowUpload(false)}
              onError={(msg) => showToast(msg, "error")}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="card-header">
        <h2 className="card-title">Known Persons</h2>
        <button
          className="btn-primary"
          onClick={() => setShowUpload(true)}
          id="add-person-btn"
        >
          <UserPlus size={15} />
          Add Person
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : persons.length === 0 ? (
        <div className="empty-state">
          <User size={36} className="text-slate-400 mb-2" />
          <p>No known persons yet.</p>
          <p className="text-xs text-slate-500 mt-1">
            Use the Telegram bot or Add Person button to register faces.
          </p>
        </div>
      ) : (
        <div className="persons-grid">
          {persons.map((p) => {
            const imgUrl = snapshotUrl(p.snapshot_path);
            return (
              <div key={p.id} className="person-card">
                {/* Avatar */}
                <div className="person-avatar">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={p.name}
                      className="person-img"
                    />
                  ) : (
                    <div className="person-placeholder">
                      <User size={28} className="text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="person-info">
                  <p className="person-name">{p.name}</p>
                  <p className="person-meta">
                    ID #{p.id} ·{" "}
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Delete */}
                <button
                  className="person-delete"
                  onClick={() => setDeleteId(p.id)}
                  title="Remove from system"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Upload Person Form (inline) ────────────────────────────────────────────────

function UploadPersonForm({
  onSuccess,
  onCancel,
  onError,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
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
    if (!name.trim() || !file) return;
    setUploading(true);
    try {
      await uploadPerson(name.trim(), file);
      onSuccess();
    } catch (err: unknown) {
      onError((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="upload-form">
      <div className="upload-header">
        <UserPlus size={24} className="text-indigo-600" />
        <h3 className="text-slate-900 font-semibold text-lg">Register New Person</h3>
      </div>

      {/* Name input */}
      <div className="form-group">
        <label className="form-label">Full Name</label>
        <input
          id="person-name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. John Smith"
          className="form-input"
          required
        />
      </div>

      {/* Drop zone */}
      <div
        className={`drop-zone ${file ? "drop-zone-active" : ""}`}
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
          <img src={preview} alt="preview" className="drop-preview" />
        ) : (
          <>
            <Upload size={24} className="text-gray-500 mb-2" />
            <p className="text-sm text-gray-400">
              Drag & drop a clear face photo
            </p>
            <p className="text-xs text-gray-600 mt-1">
              or click to browse
            </p>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-2">
        <button
          type="button"
          className="btn-secondary flex-1"
          onClick={onCancel}
        >
          <X size={14} />
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary flex-1"
          disabled={!name.trim() || !file || uploading}
        >
          {uploading ? (
            <>Processing…</>
          ) : (
            <>
              <CheckCircle size={14} />
              Register
            </>
          )}
        </button>
      </div>
    </form>
  );
}
