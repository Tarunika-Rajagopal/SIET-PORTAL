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
    <div className="space-y-6">
      
      {/* Top Filter and Actions Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-card border border-[#E2E8E4] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900">
              System Audit Trail &amp; History ({filteredLogs.length})
            </h2>
            <span className="text-xs text-mint-700 bg-mint-50 border border-mint-200 px-2.5 py-0.5 rounded-full font-bold">
              Compliance Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of faculty assignments, student roster adjustments &amp; mandatory reasons
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-mint-500"
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
            className="px-3 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-mint-500"
          >
            <option value="ALL">All Months</option>
            <option value="2026-09">Sep 2026</option>
            <option value="2026-08">Aug 2026</option>
          </select>

          {/* Single Search Bar */}
          <div className="relative w-full sm:w-56">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search audit trail..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Download as PDF Button */}
          <button
            onClick={() => setPdfPreviewOpen(true)}
            className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-1.5 text-xs shrink-0"
          >
            <Download size={14} />
            <span>Download as PDF</span>
          </button>

          {/* Page Refresh Button */}
          <button
            onClick={() => window.location.reload()}
            title="Reload Page"
            className="p-2 bg-[#EFF3F1] hover:bg-mint-100 text-slate-600 hover:text-mint-700 border border-[#E2E8E4] rounded-xl text-xs transition flex items-center justify-center shrink-0"
          >
            <RefreshCw size={14} />
          </button>

        </div>
      </div>

      {/* Audit Logs List */}
      <div className="bg-white rounded-3xl shadow-card border border-[#E2E8E4] overflow-hidden">
        <div className="divide-y divide-[#E2E8E4]">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No audit logs found matching the filter criteria.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-5 hover:bg-mint-50/30 transition flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs">
                
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-mint-50 text-mint-800 flex items-center justify-center shrink-0 shadow-sm mt-0.5 border border-mint-200">
                    <Shield size={18} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{log.actionType}</span>
                      <span className="px-2.5 py-0.5 rounded-md bg-mint-50 text-mint-900 font-bold text-[10px] border border-mint-200">
                        {log.target}
                      </span>
                    </div>

                    <p className="text-slate-800 font-semibold mt-1">{log.details}</p>
                    
                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                      <span className="font-bold text-slate-700">Reason:</span>
                      <span className="italic">{log.reason}</span>
                    </div>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <div className="text-slate-600 font-bold flex items-center gap-1 sm:justify-end">
                    <Calendar size={13} className="text-slate-400" />
                    <span>{log.dateFormatted}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">Logged by {log.admin}</span>
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
