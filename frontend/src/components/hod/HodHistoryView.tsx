import React, { useState, useEffect, useMemo } from 'react';
import { HodHistoryService, HodHistoryRecord } from '../../services/hodHistoryService';
import { 
  History, Search, Calendar, Filter, Download, 
  CheckCircle2, AlertCircle, FileText, UserCheck, 
  Award, Shield, ArrowRight, Printer, Sparkles
} from 'lucide-react';

export const HodHistoryView: React.FC = () => {
  const [history, setHistory] = useState<HodHistoryRecord[]>(() => HodHistoryService.getHistory());
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('ALL');

  useEffect(() => {
    const handleSync = () => {
      setHistory(HodHistoryService.getHistory());
    };
    handleSync();
    const unsub = HodHistoryService.subscribe(handleSync);
    window.addEventListener('siet_hod_history_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      unsub();
      window.removeEventListener('siet_hod_history_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Filtered action records
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // 1. Class filter
      if (classFilter !== 'ALL' && item.classSection !== classFilter) return false;

      // 2. Batch filter
      if (batchFilter !== 'ALL' && item.batch !== batchFilter) return false;

      // 3. Date filter (YYYY-MM-DD against ISO timestamp or date text)
      if (dateFilter) {
        const itemDate = item.timestamp ? item.timestamp.split('T')[0] : '';
        if (itemDate && itemDate !== dateFilter) return false;
      }

      // 4. Action type filter
      if (actionTypeFilter !== 'ALL') {
        if (actionTypeFilter === 'MARKS' && !item.actionType.includes('Marks')) return false;
        if (actionTypeFilter === 'AUDIT' && !item.actionType.includes('Audit')) return false;
        if (actionTypeFilter === 'ADVISOR' && !item.actionType.includes('Advisor')) return false;
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTarget = (item.target || '').toLowerCase().includes(q);
        const matchDetails = (item.details || '').toLowerCase().includes(q);
        const matchAction = (item.actionType || '').toLowerCase().includes(q);
        const matchBy = (item.performedBy || '').toLowerCase().includes(q);
        return matchTarget || matchDetails || matchAction || matchBy;
      }

      return true;
    });
  }, [history, classFilter, batchFilter, dateFilter, actionTypeFilter, searchQuery]);

  const getActionBadge = (actionType: HodHistoryRecord['actionType']) => {
    switch (actionType) {
      case 'Marks Overridden':
      case 'Marks Updated':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1 shrink-0">
            <Award size={12} className="text-emerald-700" />
            <span>{actionType}</span>
          </span>
        );
      case 'Project Audited':
      case 'Submission Reviewed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-sky-50 text-sky-800 border border-sky-300 flex items-center gap-1 shrink-0">
            <Shield size={12} className="text-sky-700" />
            <span>{actionType}</span>
          </span>
        );
      case 'Advisor Appointed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-purple-50 text-purple-800 border border-purple-300 flex items-center gap-1 shrink-0">
            <UserCheck size={12} className="text-purple-700" />
            <span>{actionType}</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center gap-1 shrink-0">
            <CheckCircle2 size={12} className="text-[#111111]" />
            <span>{actionType}</span>
          </span>
        );
    }
  };

  const handleExportCsv = () => {
    const headers = ['Action ID', 'Timestamp', 'Date', 'Action Type', 'Target', 'Class Section', 'Batch', 'Details', 'Performed By'];
    const rows = filteredHistory.map(h => [
      `"${h.id}"`,
      `"${h.timestamp}"`,
      `"${h.date}"`,
      `"${h.actionType}"`,
      `"${(h.target || '').replace(/"/g, '""')}"`,
      `"${h.classSection}"`,
      `"${h.batch}"`,
      `"${(h.details || '').replace(/"/g, '""')}"`,
      `"${h.performedBy}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hod_action_history_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 font-sans animate-fadeIn">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-[#D8CCBA] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center border border-[#D8CCBA] shadow-xs">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-[#111111]">
                HOD Action History &amp; Audit Log
              </h2>
              <p className="text-xs text-[#75695A] mt-0.5 font-medium">
                Comprehensive audit trail of marks edited, milestones audited, and departmental interventions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-center">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white hover:bg-[#F8F5EE] text-[#111111] border border-[#D8CCBA] text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Printer size={14} className="text-[#75695A]" />
            <span>Print Log</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar: Subtle Soft Highlight Styling bg-[#FAF7F2] border-[#D8CCBA] */}
      <div className="bg-[#FAF7F2] rounded-3xl p-5 shadow-xs border border-[#D8CCBA] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team, action, details..."
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#D8CCBA] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#111111] transition font-medium"
              />
            </div>

            {/* Class Filter */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-[#D8CCBA]">
              <span className="text-[11px] font-bold text-[#75695A] uppercase tracking-wider">Class:</span>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#111111] focus:outline-none cursor-pointer py-1"
              >
                <option value="ALL">All Classes</option>
                <option value="CSE-A">CSE-A</option>
                <option value="CSE-B">CSE-B</option>
                <option value="CSE-C">CSE-C</option>
              </select>
            </div>

            {/* Batch Filter */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-[#D8CCBA]">
              <span className="text-[11px] font-bold text-[#75695A] uppercase tracking-wider">Batch:</span>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#111111] focus:outline-none cursor-pointer py-1"
              >
                <option value="ALL">All Batches</option>
                <option value="2023-2027 (III Year)">2023-2027 (III Year)</option>
                <option value="2024-2028 (II Year)">2024-2028 (II Year)</option>
                <option value="2022-2026 (IV Year)">2022-2026 (IV Year)</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-[#D8CCBA]">
              <Calendar size={13} className="text-[#75695A]" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#111111] focus:outline-none cursor-pointer py-1"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="text-[10px] text-[#75695A] hover:text-[#111111] font-bold ml-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick Action Type Filter Pills */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Actions' },
              { id: 'MARKS', label: 'Marks Edited' },
              { id: 'AUDIT', label: 'Audits' },
              { id: 'ADVISOR', label: 'Advisor Actions' }
            ].map(pill => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setActionTypeFilter(pill.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  actionTypeFilter === pill.id
                    ? 'bg-[#111111] text-[#F8F5EE] border border-[#111111] shadow-2xs font-bold'
                    : 'bg-white text-[#75695A] border border-[#D8CCBA] hover:bg-[#EDE7DB]'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#D8CCBA] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EDE7DB] text-[#75695A] uppercase tracking-wider font-semibold border-b border-[#D8CCBA]">
              <tr>
                <th className="p-4 whitespace-nowrap">Timestamp &amp; Date</th>
                <th className="p-4 whitespace-nowrap">Action Type</th>
                <th className="p-4 whitespace-nowrap">Target Team / Entity</th>
                <th className="p-4 whitespace-nowrap">Class &amp; Batch</th>
                <th className="p-4">Action Summary &amp; Interventions</th>
                <th className="p-4 whitespace-nowrap">Author</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8CCBA] font-medium">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-[#75695A]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <History size={28} className="text-[#B8AA97]" />
                      <p className="font-bold text-[#111111] text-sm">No actions match your current filters</p>
                      <p className="text-xs text-[#75695A]">
                        Try adjusting your Date, Class, or Batch filter selections above.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF8F4] transition-colors">
                    {/* Timestamp & Date */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-[#75695A]" />
                        <span className="font-bold text-[#111111] text-xs">{item.date}</span>
                      </div>
                      <span className="text-[10px] text-[#75695A] font-mono block mt-0.5">
                        {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </td>

                    {/* Action Type */}
                    <td className="p-4 whitespace-nowrap">
                      {getActionBadge(item.actionType)}
                    </td>

                    {/* Target Team / Entity */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="font-serif font-bold text-[#111111] text-xs">
                        {item.target}
                      </span>
                    </td>

                    {/* Class & Batch */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#EDE7DB] text-[#111111] font-semibold text-xs border border-[#D8CCBA]">
                        {item.classSection}
                      </span>
                      <span className="text-[10px] text-[#75695A] font-mono block mt-0.5">
                        {item.batch}
                      </span>
                    </td>

                    {/* Action Summary */}
                    <td className="p-4">
                      <p className="text-xs text-[#111111] leading-relaxed">
                        {item.details}
                      </p>
                    </td>

                    {/* Performed By */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-xs font-bold text-[#111111] block">
                        {item.performedBy}
                      </span>
                      <span className="text-[10px] text-[#75695A]">Head of Department</span>
                    </td>
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

export default HodHistoryView;
