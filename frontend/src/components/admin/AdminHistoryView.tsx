import React, { useState, useEffect } from 'react';
import { History, Search, Download, Shield, Calendar, Clock, Filter, RefreshCw } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { AuditLog } from '../../types';
import HistoryPdfPreviewModal from './HistoryPdfPreviewModal';

export const AdminHistoryView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>(() => AdminService.getAuditLogs());
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  useEffect(() => {
    return AdminService.subscribe(() => {
      setLogs(AdminService.getAuditLogs());
    });
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actionType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.actionType.toLowerCase().includes(actionFilter.toLowerCase());
    const matchesDate = !dateFilter || log.dateKey === dateFilter;
    const matchesMonth = monthFilter === 'ALL' || log.monthKey === monthFilter;

    return matchesSearch && matchesAction && matchesDate && matchesMonth;
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Filter and Actions Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#D8CCBA] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="ALL">All Actions</option>
            <option value="Faculty">Faculty Onboarding/Roles</option>
            <option value="Advisor">Advisor Assignments</option>
            <option value="Guide">Guide Mentorship</option>
            <option value="Student">Student Roster</option>
            <option value="Workload">Workload Shifts</option>
          </select>

          {/* Month Filter */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="ALL">All Months</option>
            <option value="2026-09">Sep 2026</option>
            <option value="2026-08">Aug 2026</option>
          </select>

          {/* Single Search Bar */}
          <div className="relative w-full sm:w-56">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search audit trail..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs focus:outline-none focus:border-[#111111] text-[#111111] placeholder-[#75695A]/60"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Download as PDF Button */}
          <button
            onClick={() => setPdfPreviewOpen(true)}
            className="px-4 py-2 bg-[#111111] hover:bg-[#292725] text-white font-medium rounded-xl shadow-sm transition flex items-center gap-1.5 text-xs shrink-0 cursor-pointer"
          >
            <Download size={14} />
            <span>Download as PDF</span>
          </button>

          {/* Page Refresh Button */}
          <button
            onClick={() => window.location.reload()}
            title="Reload Page"
            className="p-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] border border-[#D8CCBA] rounded-xl text-xs transition flex items-center justify-center shrink-0 cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Audit Logs List */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#D8CCBA] overflow-hidden">
        <div className="divide-y divide-[#D8CCBA]">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-[#75695A] text-xs">
              No audit logs found matching the filter criteria.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-5 hover:bg-[#F8F5EE]/60 transition flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs">
                
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center shrink-0 shadow-xs mt-0.5 border border-[#D8CCBA]">
                    <Shield size={18} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif font-bold text-[#111111] text-sm">{log.actionType}</span>
                      <span className="px-2.5 py-0.5 rounded-md bg-[#F8F5EE] text-[#111111] font-medium text-[10px] border border-[#D8CCBA]">
                        {log.target}
                      </span>
                    </div>

                    <p className="text-[#292725] font-normal mt-1">{log.details}</p>
                    
                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F8F5EE] border border-[#D8CCBA] text-[#75695A] text-[11px]">
                      <span className="font-bold text-[#111111]">Reason:</span>
                      <span className="italic">{log.reason}</span>
                    </div>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <div className="text-[#111111] font-medium flex items-center gap-1 sm:justify-end">
                    <Calendar size={13} className="text-[#75695A]" />
                    <span>{log.dateFormatted}</span>
                  </div>
                  <span className="text-[10px] text-[#75695A] font-mono mt-1 block">Logged by {log.admin}</span>
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      {/* PDF Preview & Download Modal */}
      <HistoryPdfPreviewModal
        isOpen={pdfPreviewOpen}
        onClose={() => setPdfPreviewOpen(false)}
        logs={filteredLogs}
      />

    </div>
  );
};

export default AdminHistoryView;
