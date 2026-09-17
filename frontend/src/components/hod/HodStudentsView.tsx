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
      
      {/* Filter Option Row */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#D8CCBA] flex flex-wrap items-center gap-3">
        
        {/* Batch Filter */}
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
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
          className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
        >
          <option value="ALL">All Classes</option>
          <option value="CSE-A">Class CSE-A</option>
          <option value="CSE-B">Class CSE-B</option>
          <option value="CSE-C">Class CSE-C</option>
        </select>

        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidate or title..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs focus:outline-none focus:border-[#111111] text-[#111111] placeholder-[#75695A]"
          />
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          title="Refresh page"
          className="p-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] border border-[#D8CCBA] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Refresh page"
        >
          <RefreshCw size={14} />
        </button>

      </div>

      {/* Class Advisor Banner */}
      {classFilter !== 'ALL' && (
        <div className="p-4 rounded-2xl bg-white border border-[#D8CCBA] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#111111] text-[#F8F5EE] flex items-center justify-center font-bold">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#75695A] uppercase tracking-wider">Designated Class Advisor:</span>
                <span className="text-xs font-serif font-bold text-[#111111]">
                  {currentAdvisor ? currentAdvisor.name : 'Dr. R. Karthikeyan'}
                </span>
                <span className="text-[11px] text-[#75695A] font-mono">
                  ({currentAdvisor ? currentAdvisor.email : 'dr.karthik@siet.ac.in'})
                </span>
              </div>
              <p className="text-[11px] text-[#75695A] mt-0.5">
                Class: <strong className="text-[#111111]">{classFilter}</strong> &bull; Batch: <strong className="text-[#111111]">{batchFilter}</strong>
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#4A5844] bg-[#4A5844]/10 px-3 py-1 rounded-full border border-[#4A5844]/30">
            Advisory Verified
          </span>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#D8CCBA] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EDE7DB] text-[#75695A] uppercase tracking-wider font-semibold border-b border-[#D8CCBA]">
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
            <tbody className="divide-y divide-[#D8CCBA] font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#75695A]">
                    No candidates found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const w1 = MarksService.getMemberMark(s.teamId, 1, s.rollNo);
                  const w2 = MarksService.getMemberMark(s.teamId, 2, s.rollNo);
                  const displayMark = typeof w2 === 'number' ? `W2: ${w2}/100` : typeof w1 === 'number' ? `W1: ${w1}/100` : null;

                  return (
                    <tr
                      key={s.rollNo}
                      onClick={() => onSelectStudent(s.rollNo, s.batch, s.classSection)}
                      className="hover:bg-[#F8F5EE]/60 cursor-pointer transition group"
                    >
                      <td className="p-4 font-mono font-bold text-[#111111] whitespace-nowrap">{s.rollNo}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#111111] group-hover:text-[#75695A] transition">
                            {s.name}
                          </span>
                          <ArrowUpRight size={13} className="text-[#75695A] group-hover:text-[#111111] transition opacity-0 group-hover:opacity-100" />
                        </div>
                        <span className="text-[11px] text-[#75695A] font-mono">{s.email}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-semibold">
                          {s.classSection}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-[#111111] whitespace-nowrap">{s.teamNo}</td>
                      <td className="p-4 max-w-xs truncate text-[#292725] font-medium" title={s.projectTitle}>
                        {s.projectTitle}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {displayMark ? (
                          <span className="px-2.5 py-1 rounded-lg bg-[#F8F5EE] text-[#111111] font-bold text-xs border border-[#D8CCBA] inline-flex items-center gap-1 shadow-2xs">
                            <Award size={12} className="text-[#8A6A32]" />
                            <span>{displayMark}</span>
                          </span>
                        ) : (
                          <span className="text-[#75695A] text-[11px] italic">Ungraded</span>
                        )}
                      </td>
                      <td className="p-4 text-[#111111] font-medium whitespace-nowrap">{s.guide}</td>
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
