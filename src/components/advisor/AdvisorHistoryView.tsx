import React, { useState, useEffect, useMemo } from 'react';
import { History, Search, Download, Calendar, RefreshCw, Filter, FileText, Compass, ChevronDown } from 'lucide-react';
import { AdvisorHistoryService, AdvisorHistoryLog } from '../../services/advisorHistoryService';
import AdvisorHistoryPdfModal from './AdvisorHistoryPdfModal';

interface AdvisorHistoryViewProps {
  className: string;
  advisorName: string;
}

export const AdvisorHistoryView: React.FC<AdvisorHistoryViewProps> = ({
  className,
  advisorName
}) => {
  const [logs, setLogs] = useState<AdvisorHistoryLog[]>(() => 
    AdvisorHistoryService.getHistory(className)
  );
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('All Actions');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  useEffect(() => {
    return AdvisorHistoryService.subscribe(() => {
      setLogs(AdvisorHistoryService.getHistory(className));
    });
  }, [className]);

  const normalizeName = (n: string) => (n || '').toLowerCase().replace(/^(dr\.|mr\.|mrs\.|ms\.|prof\.)\s+/i, '').trim();

  const filteredLogs = useMemo(() => {
    const targetName = normalizeName(advisorName);

    return logs.filter(log => {
      // 1. Filter by specific person (only what this person did is shown)
      if (targetName) {
        const actor = normalizeName(log.actorName || log.advisorName || '');
        const isMatch = actor.includes(targetName) || targetName.includes(actor);
        if (!isMatch) return false;
      }

      // 2. Action type filter
      if (selectedAction !== 'All Actions' && log.actionType !== selectedAction) {
        return false;
      }

      // 3. Date range filtering
      if (fromDate && log.date < fromDate) return false;
      if (toDate && log.date > toDate) return false;

      // 4. Search query filtering
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          log.target.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          log.actionType.toLowerCase().includes(q) ||
          (log.actorName && log.actorName.toLowerCase().includes(q)) ||
          (log.advisorName && log.advisorName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [logs, advisorName, selectedAction, fromDate, toDate, searchTerm]);

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* Top Filter and Action Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-card border border-[#E2E8E4] flex flex-col gap-4">
        
        {/* Header Title & Record Count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E4] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                My Activity History &amp; Evaluation Audit Log
              </h2>
              <span className="text-xs text-mint-800 bg-mint-100 border border-mint-200 px-2.5 py-0.5 rounded-full font-bold">
                {filteredLogs.length} Records
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Personal chronological audit trail of all changes and evaluations performed by <strong>{advisorName}</strong> for Class {className}
            </p>
          </div>

          {/* Download as PDF Button */}
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-1.5 text-xs shrink-0 cursor-pointer self-start sm:self-auto active:scale-95"
          >
            <Download size={14} />
            <span>Download as PDF</span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          
          {/* 1. Filter by Action Type */}
          <div className="relative">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:border-mint-500 cursor-pointer"
            >
              <option value="All Actions">All My Actions</option>
              <option value="Marks Evaluation">Marks Evaluation</option>
              <option value="Project Approval">Project Approval</option>
              <option value="Milestone Review">Milestone Review</option>
              <option value="Student Transfer">Student Transfer</option>
              <option value="Guide Reassignment">Guide Reassignment</option>
              <option value="Team Formation">Team Formation</option>
              <option value="Student Enrollment">Student Enrollment</option>
              <option value="Department Governance">Department Governance</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* 3. From Date */}
          <div className="flex items-center gap-1.5 bg-[#EFF3F1] px-3 py-1.5 rounded-xl border border-[#E2E8E4]">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none text-xs cursor-pointer"
            />
          </div>

          {/* 4. To Date */}
          <div className="flex items-center gap-1.5 bg-[#EFF3F1] px-3 py-1.5 rounded-xl border border-[#E2E8E4]">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none text-xs cursor-pointer"
            />
          </div>

          {/* 5. Search input */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search history by entity or detail..."
              className="w-full pl-8 pr-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* 6. Reset Filters */}
          <button
            type="button"
            onClick={() => {
              setSelectedAction('All Actions');
              setFromDate('');
              setToDate('');
              setSearchTerm('');
            }}
            title="Reset Filters"
            className="p-2 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-600 rounded-xl border border-[#E2E8E4] transition cursor-pointer flex items-center justify-center shrink-0"
          >
            <RefreshCw size={14} />
          </button>

        </div>
      </div>

      {/* History Records Table */}
      <div className="bg-white rounded-3xl shadow-card border border-[#E2E8E4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-slate-500 uppercase tracking-wider font-bold border-b border-[#E2E8E4]">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Role</th>
                <th className="p-4">Action Type</th>
                <th className="p-4">Target Entity</th>
                <th className="p-4">Activity Description</th>
                <th className="p-4">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4] font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    No personal activity records found for {advisorName}.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const roleName = log.role || 'Class Advisor';
                  return (
                    <tr key={log.id} className="hover:bg-mint-50/30 transition">
                      
                      {/* Timestamp */}
                      <td className="p-4 whitespace-nowrap font-mono text-slate-500">
                        {log.dateFormatted}
                      </td>

                      {/* Role */}
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                          roleName === 'Class Advisor' ? 'bg-mint-50 text-mint-900 border-mint-200' :
                          roleName === 'Faculty Guide' ? 'bg-amber-50 text-amber-900 border-amber-200' :
                          roleName === 'Head of Department' ? 'bg-blue-50 text-blue-900 border-blue-200' :
                          'bg-purple-50 text-purple-900 border-purple-200'
                        }`}>
                          {roleName}
                        </span>
                      </td>

                      {/* Action Type */}
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                          log.actionType === 'Marks Evaluation' ? 'bg-mint-100 text-mint-900 border-mint-200' :
                          log.actionType === 'Project Approval' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' :
                          log.actionType === 'Milestone Review' ? 'bg-teal-100 text-teal-900 border-teal-200' :
                          log.actionType === 'Student Transfer' ? 'bg-amber-100 text-amber-900 border-amber-200' :
                          log.actionType === 'Guide Reassignment' ? 'bg-blue-100 text-blue-900 border-blue-200' :
                          log.actionType === 'Team Formation' ? 'bg-purple-100 text-purple-900 border-purple-200' :
                          'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {log.actionType}
                        </span>
                      </td>

                      {/* Target Entity */}
                      <td className="p-4 font-extrabold text-slate-900 whitespace-nowrap">
                        {log.target}
                      </td>

                      {/* Details */}
                      <td className="p-4 text-slate-700 max-w-md leading-relaxed">
                        {log.details}
                      </td>

                      {/* Performed By */}
                      <td className="p-4 text-slate-800 font-bold whitespace-nowrap">
                        {log.actorName || log.advisorName}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Export Modal: Displays Document Format Alone & Direct PDF Download */}
      <AdvisorHistoryPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        logs={filteredLogs}
        advisorName={advisorName}
        className={className}
        dateRange={{ from: fromDate, to: toDate }}
        selectedAction={selectedAction}
      />

    </div>
  );
};

export default AdvisorHistoryView;
