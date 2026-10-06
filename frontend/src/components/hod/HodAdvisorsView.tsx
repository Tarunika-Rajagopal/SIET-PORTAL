import React, { useState } from 'react';
import { HodAdvisor } from '../../services/hodService';
import { useHodAdvisors, useHodAdvisorStudents, useHodFilterOptions } from '../../hooks/useQueries';
import { Search, ArrowUpRight, RefreshCw, AlertCircle, Loader2, ChevronDown, GraduationCap } from 'lucide-react';

interface HodAdvisorsViewProps {
  onSelectAdvisor?: (batch: string, className: string) => void;
}

const AdvisorStudentsDetail: React.FC<{ advisor: HodAdvisor }> = ({ advisor }) => {
  const { data: students = [], isLoading, isError, error, refetch } = useHodAdvisorStudents(advisor.id);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[#75695A] bg-[#FAF8F4] flex flex-col items-center justify-center gap-2">
        <Loader2 size={20} className="animate-spin text-[#111111]" />
        <span className="text-xs font-semibold">Loading assigned students for {advisor.name}...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-xs mx-4 my-2">
        <span>{(error as any)?.message || 'Failed to load students for this advisor.'}</span>
        <button
          onClick={() => refetch()}
          className="px-2.5 py-1 bg-rose-600 text-white rounded-md text-xs font-bold cursor-pointer hover:bg-rose-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="p-8 text-center bg-[#FAF8F4] border-t border-[#D8CCBA]">
        <div className="max-w-md mx-auto space-y-1">
          <p className="font-bold text-xs text-[#111111]">No students assigned.</p>
          <p className="text-[11px] text-[#75695A]">
            {advisor.assignedClass
              ? `No students currently enrolled under Class ${advisor.assignedClass} (${advisor.batch || 'Unassigned'}).`
              : 'This staff member is currently unassigned and has no students under their advisory purview.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF8F4] border-t border-[#D8CCBA] p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <GraduationCap size={16} className="text-[#75695A]" />
          <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#111111]">
            Assigned Students ({students.length} Total)
          </span>
        </div>
        <span className="text-[11px] text-[#75695A] font-medium">
          Section: <strong className="text-[#111111]">{advisor.assignedClass || 'Unassigned'}</strong> &bull; Batch: <strong className="text-[#111111]">{advisor.batch || 'Unassigned'}</strong>
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#D8CCBA] bg-white shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#EDE7DB] text-[#75695A] font-semibold uppercase text-[10px] tracking-wider border-b border-[#D8CCBA]">
            <tr>
              <th className="p-3">Roll Number</th>
              <th className="p-3">Student Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Team</th>
              <th className="p-3">Project Title</th>
              <th className="p-3">Faculty Guide</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8CCBA] font-medium">
            {students.map((s) => (
              <tr key={s.rollNo} className="hover:bg-[#F8F5EE]/60 transition">
                <td className="p-3 font-mono font-bold text-[#111111]">{s.rollNo}</td>
                <td className="p-3 font-semibold text-[#111111]">{s.name}</td>
                <td className="p-3 text-[#75695A] font-mono text-[11px]">{s.email}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-md bg-[#EDE7DB] text-[#111111] font-bold text-[11px] border border-[#D8CCBA]">
                    {s.teamNo || 'Unassigned'}
                  </span>
                </td>
                <td className="p-3 text-[#292725] max-w-xs truncate" title={s.projectTitle || 'No project title'}>
                  {s.projectTitle || <span className="text-[#75695A] italic">Not submitted</span>}
                </td>
                <td className="p-3 text-[#75695A]">{s.guide || 'Unassigned'}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    s.status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : s.status === 'Unassigned'
                      ? 'bg-[#EDE7DB] text-[#75695A] border border-[#D8CCBA]'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const HodAdvisorsView: React.FC<HodAdvisorsViewProps> = ({ onSelectAdvisor }) => {
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAdvisorId, setExpandedAdvisorId] = useState<string | null>(null);

  const { data: filterOpts } = useHodFilterOptions();
  const {
    data: advisorsData,
    isLoading: loading,
    isError,
    error: queryError,
    refetch: refetchAdvisors
  } = useHodAdvisors(batchFilter, classFilter);

  const advisors = advisorsData || [];
  const errorMessage = isError ? ((queryError as any)?.message || 'Unable to connect to the backend server. Please try again.') : null;

  const batchOptions = filterOpts?.batches?.length ? filterOpts.batches : [
    '2023-2027 (III Year)',
    '2024-2028 (II Year)',
    '2022-2026 (IV Year)'
  ];
  const classOptions = filterOpts?.classes?.length ? filterOpts.classes : [
    'CSE-A',
    'CSE-B',
    'CSE-C'
  ];

  const filteredAdvisors = advisors.filter(a => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (a.name || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q) ||
      (a.assignedClass || '').toLowerCase().includes(q);
  });

  const toggleAdvisorExpand = (advisorId: string) => {
    setExpandedAdvisorId(prev => prev === advisorId ? null : advisorId);
  };

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
          onClick={() => refetchAdvisors()}
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
            onClick={() => refetchAdvisors()}
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
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8CCBA] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-[#75695A]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 size={24} className="animate-spin text-[#111111]" />
                      <span className="font-semibold text-xs text-[#75695A]">Loading advisors from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAdvisors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-[#75695A]">
                    <div className="max-w-sm mx-auto space-y-1">
                      <p className="font-bold text-sm text-[#111111]">No advisors found</p>
                      <p className="text-xs text-[#75695A]">No faculty advisors match the selected batch or class section filters in the database.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAdvisors.map((a) => {
                  const isExpanded = expandedAdvisorId === a.id;
                  return (
                    <React.Fragment key={a.id}>
                      <tr
                        onClick={() => toggleAdvisorExpand(a.id)}
                        className={`cursor-pointer transition-colors duration-300 ease-out group select-none ${
                          isExpanded ? 'bg-[#F8F5EE]' : 'hover:bg-[#F8F5EE]/60'
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-md text-[#75695A] group-hover:text-[#111111] transition flex items-center justify-center">
                              <ChevronDown
                                size={14}
                                className={`transition-transform duration-300 ease-out ${
                                  isExpanded ? 'rotate-180 text-[#111111]' : 'rotate-0 text-[#75695A]'
                                }`}
                              />
                            </span>
                            <div>
                              <div className="font-serif font-bold text-[#111111] group-hover:text-[#75695A] transition">
                                {a.name}
                              </div>
                              <span className="text-[11px] text-[#75695A] font-mono">{a.email}</span>
                            </div>
                          </div>
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
                        <td className="p-4 font-semibold text-[#111111]">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            a.studentsCount > 0
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-[#EDE7DB] text-[#75695A] border-[#D8CCBA]'
                          }`}>
                            {a.studentsCount} Students
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {onSelectAdvisor && a.assignedClass && (
                              <button
                                type="button"
                                title={`View Class ${a.assignedClass} in Students/Teams View`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectAdvisor(a.batch, a.assignedClass);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#EDE7DB] hover:bg-[#E2D9C8] text-[#111111] border border-[#D8CCBA] text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                              >
                                <span>Teams</span>
                                <ArrowUpRight size={12} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAdvisorExpand(a.id);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#75695A] hover:text-[#111111] hover:bg-[#EDE7DB] transition"
                            >
                              {isExpanded ? 'Collapse' : 'View Students'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Advisor Students Sub-row */}
                      {isExpanded && (
                        <tr className="border-b border-[#D8CCBA]">
                          <td colSpan={6} className="p-0 border-0">
                            <AdvisorStudentsDetail advisor={a} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default HodAdvisorsView;
