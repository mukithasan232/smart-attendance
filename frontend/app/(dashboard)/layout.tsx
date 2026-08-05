import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 min-h-screen">
        <TopNav />
        <main className="main-content bg-slate-50">
          {children}
        </main>
      </div>
    </>
  );
}
