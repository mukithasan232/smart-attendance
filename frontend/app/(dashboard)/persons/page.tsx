import PersonsGallery from "@/components/PersonsGallery";

export default function PersonsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Known Persons</h1>
        <p className="text-slate-500 text-sm mt-1">Manage the faces recognized by your security system.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <PersonsGallery />
      </div>
    </div>
  );
}
