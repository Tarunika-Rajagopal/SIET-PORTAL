import React, { useState } from 'react';
import { HodService, HodAdvisor } from '../../services/hodService';
import { UserCheck, Search, ArrowUpRight, CheckCircle2, RefreshCw } from 'lucide-react';

interface HodAdvisorsViewProps {
  onSelectAdvisor: (batch: string, className: string) => void;
}

export const HodAdvisorsView: React.FC<HodAdvisorsViewProps> = ({ onSelectAdvisor }) => {
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const advisors = HodService.getAdvisors(batchFilter, classFilter);

  const filteredAdvisors = advisors.filter(a => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.assignedClass.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      
      {/* Filter Option Row (No extra contents) */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E2E8E4] flex flex-wrap items-center gap-3">
        
        {/* Batch Filter */}
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="px-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-mint-500"
        >
          <option value="ALL">All Batches</option>
          <option value="2023-2027 (III Year)">2023-2027 (III Year)</option>
          <option value="2024-2028 (II Year)">2024-2028 (II Year)</option>
          <option value="2022-2026 (IV Year)">2022-2026 (IV Year)</option>
        </select>

        {/* Class Filter */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-mint-500"
        >
          <option value="ALL">All Classes</option>
          <option value="CSE-A">Class CSE-A</option>
          <option value="CSE-B">Class CSE-B</option>
          <option value="CSE-C">Class CSE-C</option>
        </select>

        {/* Search Bar - Clicking refreshes batch & class to ALL automatically */}
        <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onClick={() => { setBatchFilter('ALL'); setClassFilter('ALL'); }}
            onFocus={() => { setBatchFilter('ALL'); setClassFilter('ALL'); }}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search advisor or section..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500 text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          title="Refresh page"
          className="p-2 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-600 hover:text-slate-900 border border-[#E2E8E4] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Refresh page"
        >
          <RefreshCw size={14} />
        </button>

      </div>

      {/* Advisors Table (Status column removed, Total Students displayed) */}
      <div className="bg-white rounded-3xl shadow-card border border-[#E2E8E4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-slate-500 uppercase tracking-wider font-bold border-b border-[#E2E8E4]">
              <tr>
                <th className="p-4">Advisor Name</th>
                <th className="p-4">Designation</th>
                <th className="p-4">Assigned Section</th>
                <th className="p-4">Academic Batch</th>
                <th className="p-4">Total Students</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4] font-medium">
              {filteredAdvisors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No advisors match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredAdvisors.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => onSelectAdvisor(a.batch, a.assignedClass)}
                    className="hover:bg-mint-50/50 cursor-pointer transition group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="font-extrabold text-slate-900 group-hover:text-mint-700 transition">
                          {a.name}
                        </div>
                        <ArrowUpRight size={13} className="text-slate-300 group-hover:text-mint-600 transition opacity-0 group-hover:opacity-100" />
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{a.email}</span>
                    </td>
                    <td className="p-4 text-slate-700">{a.designation}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 font-bold border border-amber-200">
                        Class {a.assignedClass}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-bold">{a.batch}</td>
                    <td className="p-4 font-bold text-slate-800">{a.studentsCount} Students</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default HodAdvisorsView;
