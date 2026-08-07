import React from 'react';
import { Search, Filter, MoreVertical, Camera, Clock } from 'lucide-react';

// Mock data for visitor logs
const MOCK_LOGS = [
  {
    id: '1',
    profileInitials: 'JD',
    name: 'John Doe',
    role: 'Employee',
    classification: 'Authorized',
    cameraSource: 'Main Entrance - Cam 01',
    timestamp: '2023-10-27T08:30:00Z',
    statusColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
  {
    id: '2',
    profileInitials: 'UK',
    name: 'Unknown Person',
    role: 'Visitor',
    classification: 'Unrecognized',
    cameraSource: 'Rear Exit - Cam 04',
    timestamp: '2023-10-27T09:15:22Z',
    statusColor: 'text-rose-600 bg-rose-50 border-rose-100',
  },
  {
    id: '3',
    profileInitials: 'AS',
    name: 'Alice Smith',
    role: 'Contractor',
    classification: 'Authorized',
    cameraSource: 'Lobby - Cam 02',
    timestamp: '2023-10-27T10:05:10Z',
    statusColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
  {
    id: '4',
    profileInitials: 'BW',
    name: 'Bruce Wayne',
    role: 'VIP',
    classification: 'Special Access',
    cameraSource: 'Executive Floor - Cam 07',
    timestamp: '2023-10-27T11:45:00Z',
    statusColor: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  },
  {
    id: '5',
    profileInitials: 'TS',
    name: 'Tony Stark',
    role: 'Guest',
    classification: 'Authorized',
    cameraSource: 'Main Entrance - Cam 01',
    timestamp: '2023-10-27T13:20:45Z',
    statusColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  }
];

export default function VisitorLogsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8 flex flex-col gap-6">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 lg:gap-6 mb-6 md:mb-8 w-full">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Visitor Logs</h1>
            <p className="text-slate-500 text-sm mt-1">
              Real-time feed of detected individuals and security classifications.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search logs..." 
                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full md:w-64"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-[20px] p-6 lg:p-8 shadow-sm border border-slate-100">
          <div className="w-full overflow-x-auto bg-white rounded-[20px] border border-slate-100">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 w-[250px]">Profile / Name</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 w-[150px]">Classification</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 w-[200px]">Camera Source</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 w-[150px]">Timestamp</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {MOCK_LOGS.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4.5 border-b border-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold border border-slate-200 shrink-0">
                          {log.profileInitials}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{log.name}</div>
                          <div className="text-slate-500 text-xs mt-0.5">{log.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 border-b border-slate-50">
                      <span className={`px-2.5 py-1 inline-flex items-center gap-1.5 rounded-md font-bold text-xs border ${log.statusColor}`}>
                        {log.classification}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 border-b border-slate-50">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Camera className="w-4 h-4 text-slate-400" />
                        <span>{log.cameraSource}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 border-b border-slate-50">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <span className="text-slate-400 ml-2 text-xs">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 border-b border-slate-50 text-right">
                      <button className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination (Mock) */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100 text-sm">
            <span className="text-slate-500">Showing 1 to 5 of 24 results</span>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border border-gray-200 rounded-md text-slate-600 hover:bg-slate-50 disabled:opacity-50">Previous</button>
              <button className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-md font-medium">1</button>
              <button className="px-3 py-1 text-slate-600 hover:bg-slate-50 rounded-md">2</button>
              <button className="px-3 py-1 text-slate-600 hover:bg-slate-50 rounded-md">3</button>
              <button className="px-3 py-1 border border-gray-200 rounded-md text-slate-600 hover:bg-slate-50">Next</button>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
