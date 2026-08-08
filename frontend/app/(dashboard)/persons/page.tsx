"use client";
/* eslint-disable @next/next/no-img-element, react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback } from "react";
import { getPersons, deletePerson, uploadPerson, snapshotUrl, Person } from "@/lib/api";
import { UserPlus, Trash2, User, Search, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageWrapper } from "@/components/ui/PageWrapper";
import AddPersonModal from "./AddPersonModal";

export default function PersonsPage() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchPersons = useCallback(async () => {
    try {
      const data = await getPersons();
      setPersons(data || []);
    } catch {
      showToast("Failed to load persons list.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
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

  const handleAddSubmit = async (name: string, designation: string, file: File) => {
    try {
      await uploadPerson(name, designation, file);
      showToast(`Successfully registered ${name}!`, "success");
      setShowAddModal(false);
      fetchPersons();
    } catch (err: unknown) {
      showToast((err as Error).message || "Registration failed.", "error");
      throw err;
    }
  };

  const filteredPersons = persons.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.designation && p.designation.toLowerCase().includes(q)) ||
      String(p.id).includes(q)
    );
  });

  return (
    <PageWrapper
      title="Persons Directory"
      subtitle="Manage registered individuals recognized by the AI vision system."
      actions={
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchPersons} disabled={loading}>
            <RefreshCw size={15} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus size={15} className="mr-2" />
            Add Person
          </Button>
        </div>
      }
    >
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-slate-900 font-bold text-lg mb-2">Remove Person?</h3>
            <p className="text-slate-500 text-sm mb-6">
              This person will no longer be recognized. Historical logs will be preserved.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button className="flex-1 justify-center bg-red-600 hover:bg-red-700 shadow-red-200 border-red-600" onClick={() => handleDelete(deleteId)}>
                <Trash2 size={15} className="mr-2" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Person Modal */}
      {showAddModal && (
        <AddPersonModal 
          onCancel={() => setShowAddModal(false)}
          onSuccess={() => {}} 
          onSubmit={handleAddSubmit}
        />
      )}

      <Card>
        {/* Search Bar */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, or designation..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-shadow"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Showing {filteredPersons.length} registered {filteredPersons.length === 1 ? 'person' : 'persons'}
          </div>
        </div>

        {/* Directory Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="border border-slate-100 rounded-2xl p-5 animate-pulse bg-slate-50/50">
                <div className="w-16 h-16 bg-slate-200 rounded-full mb-4" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredPersons.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
              <User size={32} />
            </div>
            <h3 className="text-slate-900 font-bold text-lg mb-1">No persons found</h3>
            <p className="text-slate-500 text-sm max-w-sm mb-6">
              {search ? "No matches for your search. Try adjusting the keywords." : "Your directory is empty. Add a person to get started with facial recognition."}
            </p>
            {!search && (
              <Button onClick={() => setShowAddModal(true)}>
                <UserPlus size={15} className="mr-2" /> Add First Person
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPersons.map((p) => {
              const imgUrl = snapshotUrl(p.snapshot_path);
              return (
                <div key={p.id} className="group border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-all bg-white relative flex flex-col">
                  {/* Action Menu (Delete) */}
                  <button
                    onClick={() => setDeleteId(p.id)}
                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete person"
                  >
                    <Trash2 size={15} />
                  </button>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-sm flex-shrink-0">
                      {imgUrl ? (
                        <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "https://placehold.co/100x100?text=?"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <User size={24} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-slate-900 font-bold text-base truncate pr-6">{p.name}</h4>
                      <div className="mt-1">
                        <Badge variant="info" className="text-[10px] uppercase tracking-wider">{p.designation || `PID-${p.id}`}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Added {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="text-slate-400">#{p.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
