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
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#D8CCBA] flex flex-col gap-4">
        
        {/* Header Title & Record Count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8CCBA] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-serif font-bold text-[#111111]">
                My Activity History &amp; Evaluation Audit Log
              </h2>
              <span className="text-xs text-[#111111] bg-[#F8F5EE] border border-[#D8CCBA] px-2.5 py-0.5 rounded-full font-medium">
                {filteredLogs.length} Records
              </span>
            </div>
            <p className="text-xs text-[#75695A] mt-0.5">
              Personal chronological audit trail of all changes and evaluations performed by <strong>{advisorName}</strong> for Class {className}
            </p>
          </div>

          {/* Download as PDF Button */}
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="px-4 py-2 bg-[#111111] hover:bg-[#292725] text-white font-medium rounded-xl shadow-sm transition flex items-center gap-1.5 text-xs shrink-0 cursor-pointer self-start sm:self-auto active:scale-95"
          >
            <Download size={14} />
            <span>Download as PDF</span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          
          {/* 1. Filter by Action Type */}
          <div className="relative">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
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
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#75695A] pointer-events-none" />
          </div>

          {/* 3. From Date */}
          <div className="flex items-center gap-1.5 bg-[#F8F5EE] px-3 py-1.5 rounded-xl border border-[#D8CCBA]">
            <span className="text-[10px] text-[#75695A] font-bold uppercase">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-[#111111] font-medium focus:outline-none text-xs cursor-pointer"
            />
          </div>

          {/* 4. To Date */}
          <div className="flex items-center gap-1.5 bg-[#F8F5EE] px-3 py-1.5 rounded-xl border border-[#D8CCBA]">
            <span className="text-[10px] text-[#75695A] font-bold uppercase">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-[#111111] font-medium focus:outline-none text-xs cursor-pointer"
            />
          </div>

          {/* 5. Search input */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#75695A]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search history by entity or detail..."
              className="w-full pl-8 pr-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs focus:outline-none focus:border-[#111111] text-[#111111] placeholder-[#75695A]/60"
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
            className="p-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#75695A] rounded-xl border border-[#D8CCBA] transition cursor-pointer flex items-center justify-center shrink-0"
          >
            <RefreshCw size={14} />
          </button>

        </div>
      </div>

      {/* History Records Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#D8CCBA] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EDE7DB] text-[#75695A] uppercase tracking-wider font-semibold border-b border-[#D8CCBA]">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Role</th>
                <th className="p-4">Action Type</th>
                <th className="p-4">Target Entity</th>
                <th className="p-4">Activity Description</th>
                <th className="p-4">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8CCBA] font-normal">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-[#75695A]">
                    No personal activity records found for {advisorName}.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const roleName = log.role || 'Class Advisor';
                  return (
                    <tr key={log.id} className="hover:bg-[#F8F5EE]/60 transition">
                      
                      {/* Timestamp */}
                      <td className="p-4 whitespace-nowrap font-mono text-[#75695A]">
                        {log.dateFormatted}
                      </td>

                      {/* Role */}
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase border ${
                          roleName === 'Class Advisor' ? 'bg-[#F8F5EE] text-[#111111] border-[#D8CCBA]' :
                          roleName === 'Faculty Guide' ? 'bg-[#EDE7DB] text-[#75695A] border-[#D8CCBA]' :
                          roleName === 'Head of Department' ? 'bg-[#111111] text-white border-[#111111]' :
                          'bg-[#F3EFE6] text-[#292725] border-[#D8CCBA]'
                        }`}>
                          {roleName}
                        </span>
                      </td>

                      {/* Action Type */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-medium uppercase border bg-[#F8F5EE] text-[#111111] border-[#D8CCBA]">
                          {log.actionType}
                        </span>
                      </td>

                      {/* Target Entity */}
                      <td className="p-4 font-medium text-[#111111] whitespace-nowrap">
                        {log.target}
                      </td>

                      {/* Details */}
                      <td className="p-4 text-[#292725] max-w-md leading-relaxed">
                        {log.details}
                      </td>

                      {/* Performed By */}
                      <td className="p-4 text-[#111111] font-medium whitespace-nowrap">
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
