import React, { useState, useEffect, useCallback } from 'react';
import { HodService, HodAdvisor } from '../../services/hodService';
import { Search, ArrowUpRight, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

interface HodAdvisorsViewProps {
  onSelectAdvisor: (batch: string, className: string) => void;
}

export const HodAdvisorsView: React.FC<HodAdvisorsViewProps> = ({ onSelectAdvisor }) => {
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [advisors, setAdvisors] = useState<HodAdvisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [batchOptions, setBatchOptions] = useState<string[]>([
    '2023-2027 (III Year)',
    '2024-2028 (II Year)',
    '2022-2026 (IV Year)'
  ]);
  const [classOptions, setClassOptions] = useState<string[]>([
    'CSE-A',
    'CSE-B',
    'CSE-C'
  ]);

  // Load real options from database
  useEffect(() => {
    HodService.fetchFilterOptions().then(opts => {
      if (opts?.batches?.length) setBatchOptions(opts.batches);
      if (opts?.classes?.length) setClassOptions(opts.classes);
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const live = await HodService.fetchAdvisors(batchFilter, classFilter);
      if (Array.isArray(live)) {
        setAdvisors(live);
      }
    } catch (e: any) {
      console.warn('Failed to fetch advisors:', e);
      setErrorMessage(e.message || 'Unable to connect to the backend server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [batchFilter, classFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredAdvisors = advisors.filter(a => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (a.name || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q) ||
      (a.assignedClass || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      
      {/* Filter Option Row */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#D8CCBA] flex flex-wrap items-center gap-3">
        
        {/* Batch Filter */}
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="px-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
        >
          <option value="ALL">All Batches</option>
          {batchOptions.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* Class Filter */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
        >
          <option value="ALL">All Classes</option>
          {classOptions.map(c => (
            <option key={c} value={c}>Class {c}</option>
          ))}
        </select>

        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search advisor or section..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs focus:outline-none focus:border-[#111111] text-[#111111] placeholder-[#75695A]"
          />
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={loadData}
          title="Reload advisors from database"
          className="p-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] border border-[#D8CCBA] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Refresh data"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>

      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Advisors Table */}
      <div className="bg-white rounded-3xl shadow-xs border border-[#D8CCBA] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EDE7DB] text-[#75695A] uppercase tracking-wider font-semibold border-b border-[#D8CCBA]">
              <tr>
                <th className="p-4">Advisor Name</th>
                <th className="p-4">Designation</th>
                <th className="p-4">Assigned Section</th>
                <th className="p-4">Academic Batch</th>
                <th className="p-4">Total Students</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8CCBA] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[#75695A]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 size={24} className="animate-spin text-[#111111]" />
                      <span className="font-semibold text-xs text-[#75695A]">Loading advisors from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAdvisors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[#75695A]">
                    <div className="max-w-sm mx-auto space-y-1">
                      <p className="font-bold text-sm text-[#111111]">No advisors found</p>
                      <p className="text-xs text-[#75695A]">No faculty advisors match the selected batch or class section filters in the database.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAdvisors.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => onSelectAdvisor(a.batch, a.assignedClass)}
                    className="hover:bg-[#F8F5EE]/60 cursor-pointer transition group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="font-serif font-bold text-[#111111] group-hover:text-[#75695A] transition">
                          {a.name}
                        </div>
                        <ArrowUpRight size={13} className="text-[#75695A] group-hover:text-[#111111] transition opacity-0 group-hover:opacity-100" />
                      </div>
                      <span className="text-[11px] text-[#75695A] font-mono">{a.email}</span>
                    </td>
                    <td className="p-4 text-[#292725]">{a.designation}</td>
                    <td className="p-4">
                      {a.assignedClass ? (
                        <span className="px-2.5 py-1 rounded-md bg-[#EDE7DB] text-[#111111] font-semibold border border-[#D8CCBA]">
                          Class {a.assignedClass}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#75695A] italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4 text-[#75695A] font-semibold">{a.batch || 'Unassigned'}</td>
                    <td className="p-4 font-semibold text-[#111111]">{a.studentsCount} Students</td>
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
