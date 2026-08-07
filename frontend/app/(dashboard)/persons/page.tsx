import PersonsGallery from "@/components/PersonsGallery";

export default function PersonsPage() {
  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 lg:gap-6 w-full">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Known Persons</h1>
          <p className="text-slate-500 text-sm mt-1">Manage the faces recognized by your security system.</p>
        </div>
      </div>

      <div className="bg-white rounded-[20px] p-6 lg:p-8 shadow-sm border border-slate-100">
        <PersonsGallery />
      </div>
    </div>
  );
}
