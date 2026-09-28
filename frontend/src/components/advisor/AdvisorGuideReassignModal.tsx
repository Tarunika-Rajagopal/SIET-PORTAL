import React, { useState, useEffect } from 'react';
import { 
  BookOpen, X, AlertCircle, Check, ArrowRight, UserCheck, Shield, ChevronDown
} from 'lucide-react';
import { AdminService, AdminFaculty } from '../../services/adminService';
import { useFaculties } from '../../hooks/useQueries';
import { AdvisorService, ClassTeam } from '../../services/advisorService';
import { ApiClient } from '../../services/apiClient';

interface AdvisorGuideReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  advisorName: string;
  teams: ClassTeam[];
  initialTeam?: ClassTeam | null;
  onSuccess: (message: string) => void;
}

export const AdvisorGuideReassignModal: React.FC<AdvisorGuideReassignModalProps> = ({
  isOpen,
  onClose,
  className,
  advisorName,
  teams,
  initialTeam,
  onSuccess,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedNewGuide, setSelectedNewGuide] = useState<string>('');
  const { data: availableGuides = [] } = useFaculties();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialTeam) {
        setSelectedTeamId(initialTeam.teamId);
      } else if (teams.length > 0) {
        setSelectedTeamId(teams[0].teamId);
      }
      setSelectedNewGuide('');
      setErrorMessage('');
    }
  }, [isOpen, initialTeam, teams]);

  if (!isOpen) return null;

  const currentTeam = teams.find(
    (t) => t.teamId === selectedTeamId || t.teamNo === selectedTeamId || (t as any).id === selectedTeamId
  );

  const currentGuideName = currentTeam?.guide || 'Unassigned';

  const selectedGuideObj = availableGuides.find(
    (g) => g.name.toLowerCase() === selectedNewGuide.toLowerCase()
  );

  const handleConfirm = async () => {
    setErrorMessage('');
    if (!currentTeam) {
      setErrorMessage('Please select a valid project team.');
      return;
    }
    if (!selectedNewGuide) {
      setErrorMessage('Please select a new faculty technical guide.');
      return;
    }
    if (selectedNewGuide.toLowerCase() === currentGuideName.toLowerCase()) {
      setErrorMessage('The selected faculty is already the assigned guide for this team.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await AdvisorService.reassignGuide(
        className,
        currentTeam.teamId,
        selectedNewGuide,
        selectedGuideObj?.email || '',
        advisorName
      );

      if (!res.success) {
        setErrorMessage(res.message);
        setIsSubmitting(false);
        return;
      }

      onSuccess(res.message);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during guide reassignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#E2E8E4] overflow-hidden transform transition-all flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-[#F8FAF9] px-6 py-4 border-b border-[#E2E8E4] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-mint-500 text-white flex items-center justify-center font-bold shadow-xs">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Faculty Guide Reassignment
              </h3>
              <p className="text-[11px] font-bold text-slate-500">
                Reassign mentorship with live workload quota tracking (&le; 5 teams/class)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 font-bold flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Target Team Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
              Select Target Project Team
            </label>
            {initialTeam ? (
              <div className="p-3.5 bg-slate-50 border border-[#E2E8E4] rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-mint-100 text-mint-900 border border-mint-200 font-black">
                      {initialTeam.teamNo}
                    </span>
                    <span className="truncate max-w-[240px]">{initialTeam.title || 'Project Team'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Members: {initialTeam.members.length} students &bull; Section: {className}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedTeamId}
                  onChange={(e) => {
                    setSelectedTeamId(e.target.value);
                    setSelectedNewGuide('');
                    setErrorMessage('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:border-mint-500 cursor-pointer appearance-none pr-8"
                >
                  {teams.map((t) => (
                    <option key={t.teamId} value={t.teamId}>
                      {t.teamNo} &bull; {t.title ? t.title.slice(0, 35) + '...' : 'No Title'} &bull; Guide: {t.guide || 'Unassigned'}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* 2. Current Guide Display */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-[#E2E8E4] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">
                Current Assigned Technical Guide
              </span>
              <span className="font-extrabold text-slate-900 text-xs block mt-0.5">
                {currentGuideName}
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-black text-[10px] uppercase">
              Current
            </span>
          </div>

          {/* 3. New Guide Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
              Select Successor Technical Guide
            </label>
            <div className="relative">
              <select
                value={selectedNewGuide}
                onChange={(e) => {
                  setSelectedNewGuide(e.target.value);
                  setErrorMessage('');
                }}
                className="w-full px-3.5 py-2.5 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:border-mint-500 cursor-pointer appearance-none pr-8"
              >
                <option value="">Select Faculty Technical Guide...</option>
                {availableGuides.map((g) => {
                  const assignedCount = AdvisorService.getGuideTeamCount(className, g.name);
                  const isCurrent = currentGuideName.toLowerCase() === g.name.toLowerCase();
                  const isMaxedOut = !isCurrent && assignedCount >= 5;

                  return (
                    <option key={g.id || g.email || g.name} value={g.name} disabled={isMaxedOut || isCurrent}>
                      {g.name} {g.designation ? `(${g.designation})` : ''} &bull; {assignedCount}/5 teams in {className}
                      {isCurrent ? ' [Currently Assigned]' : isMaxedOut ? ' [MAX 5 REACHED]' : ''}
                    </option>
                  );
                })}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 4. Reassignment Preview Card */}
          {selectedNewGuide && currentTeam && (
            <div className="p-4 bg-mint-50/70 border border-mint-200 rounded-2xl space-y-2.5 animate-fadeIn">
              <span className="text-[10px] font-black uppercase tracking-wider text-mint-900 block">
                Mentorship Reassignment Preview
              </span>
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8E4] truncate max-w-[150px]">
                  {currentGuideName}
                </span>
                <ArrowRight size={14} className="text-mint-600 shrink-0" />
                <span className="px-2.5 py-1 rounded-lg bg-mint-600 text-white shadow-2xs truncate max-w-[170px]">
                  {selectedNewGuide}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5">
                <div>Team: <strong>{currentTeam.teamNo}</strong> &bull; Title: <em>{currentTeam.title || 'No Title'}</em></div>
                <div>
                  Successor Quota: <strong>{AdvisorService.getGuideTeamCount(className, selectedNewGuide) + 1} / 5 teams</strong> in {className}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-[#F8FAF9] px-6 py-4 border-t border-[#E2E8E4] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-[#E2E8E4] rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedNewGuide || selectedNewGuide.toLowerCase() === currentGuideName.toLowerCase() || isSubmitting}
            onClick={handleConfirm}
            className={`px-5 py-2 text-xs font-extrabold text-white rounded-xl shadow-sm transition flex items-center gap-1.5 ${
              selectedNewGuide && selectedNewGuide.toLowerCase() !== currentGuideName.toLowerCase() && !isSubmitting
                ? 'bg-mint-500 hover:bg-mint-600 cursor-pointer active:scale-95'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Reassigning Guide...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Confirm Reassignment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvisorGuideReassignModal;
