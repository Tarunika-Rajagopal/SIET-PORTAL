import React, { useState, useEffect } from 'react';
import { HodService, HodStudent } from '../../services/hodService';
import { MarksService } from '../../services/marksService';
import { Search, UserCheck, ArrowUpRight, CheckCircle2, RefreshCw, Award } from 'lucide-react';

interface HodStudentsViewProps {
  selectedBatch?: string;
  selectedClass?: string;
  initialBatch?: string;
  initialClass?: string;
  onSelectStudent: (studentRollNo: string, batch: string, className: string) => void;
}

export const HodStudentsView: React.FC<HodStudentsViewProps> = ({
  selectedBatch,
  selectedClass,
  initialBatch,
  initialClass,
  onSelectStudent
}) => {
  const [batchFilter, setBatchFilter] = useState(selectedBatch || initialBatch || 'ALL');
  const [classFilter, setClassFilter] = useState(selectedClass || initialClass || 'ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [, setMarksTick] = useState(0);

  useEffect(() => {
    const unsub = MarksService.subscribe(() => {
      setMarksTick(n => n + 1);
    });
    const handleSync = () => {
      setMarksTick(n => n + 1);
    };
    window.addEventListener('siet_marks_updated', handleSync);
    window.addEventListener('siet_data_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      unsub();
      window.removeEventListener('siet_marks_updated', handleSync);
      window.removeEventListener('siet_data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Update when parent props change
  useEffect(() => {
    if (selectedBatch) setBatchFilter(selectedBatch);
    else if (initialBatch) setBatchFilter(initialBatch);
    if (selectedClass) setClassFilter(selectedClass);
    else if (initialClass) setClassFilter(initialClass);
  }, [selectedBatch, selectedClass, initialBatch, initialClass]);

  const students = HodService.getStudents(batchFilter, classFilter);
  const advisors = HodService.getAdvisors(batchFilter, classFilter);
  const currentAdvisor = advisors.find(a => a.assignedClass === classFilter);

  const filteredStudents = students.filter(s => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(q) ||
      s.rollNo.includes(q) ||
      s.projectTitle.toLowerCase().includes(q) ||
      s.teamNo.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      
      {/* Filter Option Row (Clean, no extra marketing/banner content) */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E2E8E4] flex flex-wrap items-center gap-3">
        
        {/* Batch Filter */}
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="px-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-mint-500"
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
          className="px-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-mint-500"
        >
          <option value="ALL">All Classes</option>
          <option value="CSE-A">Class CSE-A</option>
          <option value="CSE-B">Class CSE-B</option>
          <option value="CSE-C">Class CSE-C</option>
        </select>

        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidate or title..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500 text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Refresh button */}
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

      {/* Class Advisor Banner */}
      {classFilter !== 'ALL' && (
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8E4] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mint-100 text-mint-800 flex items-center justify-center font-bold">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Designated Class Advisor:</span>
                <span className="text-xs font-extrabold text-slate-900">
                  {currentAdvisor ? currentAdvisor.name : 'Dr. R. Karthikeyan'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({currentAdvisor ? currentAdvisor.email : 'dr.karthik@siet.ac.in'})
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Class: <strong className="text-slate-800">{classFilter}</strong> &bull; Batch: <strong className="text-slate-800">{batchFilter}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-3xl shadow-card border border-[#E2E8E4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-slate-500 uppercase tracking-wider font-bold border-b border-[#E2E8E4]">
              <tr>
                <th className="p-4">Register Number</th>
                <th className="p-4">Candidate Name</th>
                <th className="p-4">Class</th>
                <th className="p-4">Team No</th>
                <th className="p-4">Project Title</th>
                <th className="p-4">Advisor Marks</th>
                <th className="p-4">Assigned Guide</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4] font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No candidates found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const availableWeeks = MarksService.getAvailableWeeks(s.teamId, [s.rollNo]);
                  const latestWeekWithMarks = availableWeeks.slice().reverse().find(w => {
                    const m = MarksService.getMemberMark(s.teamId, w, s.rollNo);
                    return typeof m === 'number' && m > 0;
                  }) ?? (availableWeeks.length > 0 ? availableWeeks[availableWeeks.length - 1] : null);

                  const latestMark = latestWeekWithMarks !== null ? MarksService.getMemberMark(s.teamId, latestWeekWithMarks, s.rollNo) : null;
                  const displayMark = typeof latestMark === 'number' && latestMark > 0 ? `W${latestWeekWithMarks}: ${latestMark}/100` : null;

                  return (
                    <tr
                      key={s.rollNo}
                      onClick={() => onSelectStudent(s.rollNo, s.batch, s.classSection)}
                      className="hover:bg-mint-50/50 cursor-pointer transition group"
                    >
                      <td className="p-4 font-mono font-bold text-mint-900 whitespace-nowrap">{s.rollNo}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 group-hover:text-mint-700 transition">
                            {s.name}
                          </span>
                          <ArrowUpRight size={13} className="text-slate-300 group-hover:text-mint-600 transition opacity-0 group-hover:opacity-100" />
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{s.email}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-md bg-mint-50 text-mint-900 border border-mint-200 font-bold">
                          {s.classSection}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-mint-700 whitespace-nowrap">{s.teamNo}</td>
                      <td className="p-4 max-w-xs truncate text-slate-700 font-semibold" title={s.projectTitle || 'Not Submitted'}>
                        {s.projectTitle || <span className="text-slate-400 italic font-normal">Not Submitted</span>}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {displayMark ? (
                          <span className="px-2.5 py-1 rounded-lg bg-mint-100 text-mint-950 font-black text-xs border border-mint-200 inline-flex items-center gap-1 shadow-2xs">
                            <Award size={12} className="text-mint-700" />
                            <span>{displayMark}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Ungraded</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-800 font-bold whitespace-nowrap">{s.guide}</td>
                    </tr>
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

export default HodStudentsView;
