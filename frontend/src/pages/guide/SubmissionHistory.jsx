import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, Calendar, CheckCircle2, Clock, AlertCircle, FileText, 
  Search, Download, Printer, Shield, CheckSquare, XCircle, Bell
} from 'lucide-react';
import { useGuide } from '../../context/GuideContext';
import { AdvisorHistoryService } from '../../services/advisorHistoryService';
import GuideHistoryPdfModal from '../../components/guide/GuideHistoryPdfModal';

export const SubmissionHistory = () => {
  const { facultyProfile } = useGuide();

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Guide Audit Logs State
  const [guideLogs, setGuideLogs] = useState(() => 
    AdvisorHistoryService.getGuideHistory(facultyProfile?.name)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  useEffect(() => {
    const syncLogs = () => {
      setGuideLogs(AdvisorHistoryService.getGuideHistory(facultyProfile?.name));
    };
    syncLogs();
    const unsub = AdvisorHistoryService.subscribe(syncLogs);
    window.addEventListener('siet_data_updated', syncLogs);
    return () => {
      unsub();
      window.removeEventListener('siet_data_updated', syncLogs);
    };
  }, [facultyProfile?.name]);

  // Filter Guide Logs
  const filteredLogs = useMemo(() => {
    return guideLogs.filter(log => {
      // 1. Action Type Filter
      if (actionFilter === 'APPROVAL') {
        const isApprove = log.actionType === 'Project Approval' && !log.details.toLowerCase().includes('reject');
        const isMilestoneApprove = log.actionType === 'Milestone Review' && log.details.toLowerCase().includes('approved');
        if (!isApprove && !isMilestoneApprove) return false;
      } else if (actionFilter === 'REJECTION') {
        const isReject = log.details.toLowerCase().includes('reject') || log.details.toLowerCase().includes('revision');
        if (!isReject) return false;
      } else if (actionFilter === 'NOTICES') {
        if (!log.actionType.includes('Notice')) return false;
      } else if (actionFilter === 'MILESTONES') {
        if (!log.actionType.includes('Milestone')) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTarget = (log.target || '').toLowerCase().includes(q);
        const matchDetails = (log.details || '').toLowerCase().includes(q);
        const matchActor = (log.actorName || '').toLowerCase().includes(q);
        const matchAction = (log.actionType || '').toLowerCase().includes(q);
        return matchTarget || matchDetails || matchActor || matchAction;
      }

      return true;
    });
  }, [guideLogs, actionFilter, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  const getLogBadge = (log) => {
    const det = (log.details || '').toLowerCase();
    const act = (log.actionType || '').toLowerCase();

    if (det.includes('rejected')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shrink-0">
          <XCircle size={12} className="text-rose-600" />
          <span>Title Rejected</span>
        </span>
      );
    }
    if (det.includes('needs revision') || det.includes('requested revision')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 shrink-0">
          <AlertCircle size={12} className="text-amber-600" />
          <span>Revision Requested</span>
        </span>
      );
    }
    if (act.includes('notice') || det.includes('consultation')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1 shrink-0">
          <Bell size={12} className="text-sky-600" />
          <span>Notice Dispatched</span>
        </span>
      );
    }
    if (act.includes('milestone') && det.includes('approved')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1 shrink-0">
          <CheckSquare size={12} className="text-emerald-700" />
          <span>Milestone Approved</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-mint-100 text-mint-900 border border-mint-200 flex items-center gap-1 shrink-0">
        <CheckCircle2 size={12} className="text-mint-700" />
        <span>Title Approved</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn font-sans">
      
      {/* Guide Action History Log */}
      <div className="space-y-4">
        {/* Controls Bar: Search, Action Filter, Download, Print */}
        <div className="bg-[#FAF7F2] p-4 rounded-3xl border border-[#D8CCBA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#D8CCBA] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#111111] transition font-medium"
              />
            </div>

            {/* Action Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { key: 'ALL', label: 'All Actions' },
                { key: 'APPROVAL', label: 'Approvals' },
                { key: 'REJECTION', label: 'Rejections' },
                { key: 'NOTICES', label: 'Notices' },
                { key: 'MILESTONES', label: 'Milestones' }
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActionFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    actionFilter === tab.key
                      ? 'bg-[#111111] text-[#F8F5EE] border border-[#111111] shadow-2xs font-bold'
                      : 'bg-white text-[#75695A] border border-[#D8CCBA] hover:bg-[#EDE7DB]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons: Print & Download PDF */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#D8CCBA] hover:bg-[#F8F5EE] text-[#111111] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Print History"
            >
              <Printer size={14} className="text-[#75695A]" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Format Preview & Download PDF"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Audit Logs List */}
        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#D8CCBA] p-12 text-center text-[#75695A] space-y-2 shadow-xs">
            <Clock size={32} className="mx-auto text-[#75695A]" />
            <h3 className="text-sm font-bold text-[#111111]">No Guide Actions Recorded Yet</h3>
            <p className="text-xs text-[#75695A] max-w-md mx-auto">
              Actions performed by the Faculty Guide (project approvals, rejections, weekly reviews, and consultation notices) will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-2xl border border-[#D8CCBA] p-5 shadow-xs hover:border-[#111111] transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8CCBA] pb-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {getLogBadge(log)}
                    <h3 className="text-sm font-serif font-bold text-[#111111]">
                      {log.target}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-[#F8F5EE] text-[#111111] border border-[#D8CCBA] font-mono text-[10px] font-bold">
                      Class {log.classSection || 'CSE-B'}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-[#75695A] flex items-center gap-1.5 shrink-0">
                    <Calendar size={13} className="text-[#75695A]" />
                    <span>{log.dateFormatted || log.date}</span>
                  </span>
                </div>

                <p className="text-xs text-[#111111] leading-relaxed font-medium bg-[#F8F5EE] p-3.5 rounded-xl border border-[#D8CCBA]">
                  {log.details}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#75695A] pt-1">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Shield size={13} className="text-[#111111]" />
                    <span>Authorized Faculty Guide: <strong className="text-[#111111]">{log.actorName || facultyProfile?.name || 'Dr. P. Manimegalai'}</strong></span>
                  </span>
                  <span className="font-mono text-[#75695A]">
                    Ref: {log.id}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guide PDF Format Preview & Download Modal */}
      <GuideHistoryPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        logs={filteredLogs}
        guideName={facultyProfile?.name || 'Dr. P. Manimegalai'}
      />

    </div>
  );
};

export default SubmissionHistory;
