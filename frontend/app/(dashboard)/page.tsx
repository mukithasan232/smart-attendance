import LiveFeed from "@/components/LiveFeed";
import EventsTable from "@/components/EventsTable";
import { Users, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  return (
    <div>
      {/* Analytics Cards */}
      <div className="analytics-grid">
        <div className="analytic-card">
          <div className="analytic-title">
            Total Visitors Today
            <Users size={16} className="text-indigo-500" />
          </div>
          <div className="analytic-value">142</div>
        </div>
        
        <div className="analytic-card border-red-200 bg-red-50">
          <div className="analytic-title text-red-700">
            Unknown Alerts
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <div className="analytic-value text-red-700">3</div>
        </div>
        
        <div className="analytic-card border-emerald-200 bg-emerald-50">
          <div className="analytic-title text-emerald-700">
            Active Cameras
            <div className="flex items-center">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
          </div>
          <div className="analytic-value text-emerald-700">1</div>
        </div>
      </div>

      {/* Main content */}
      <div className="dashboard-layout">
        {/* Left: live feed */}
        <section className="feed-section">
          <LiveFeed />
        </section>

        {/* Right: events table */}
        <section className="events-section">
          <EventsTable />
        </section>
      </div>
    </div>
  );
}
