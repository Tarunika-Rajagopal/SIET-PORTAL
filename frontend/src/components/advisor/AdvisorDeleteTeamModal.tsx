import React, { useState, useEffect } from 'react';
import { 
  Trash2, X, AlertTriangle, AlertCircle, Users, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { AdvisorService, ClassTeam } from '../../services/advisorService';

interface AdvisorDeleteTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  advisorName: string;
  teams: ClassTeam[];
  initialTeam?: ClassTeam | null;
  onSuccess: (message: string) => void;
}

export const AdvisorDeleteTeamModal: React.FC<AdvisorDeleteTeamModalProps> = ({
  isOpen,
  onClose,
  className,
  advisorName,
  teams,
  initialTeam,
  onSuccess,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialTeam) {
        setSelectedTeamId(initialTeam.teamId || initialTeam.teamNo);
      } else if (teams.length > 0) {
        setSelectedTeamId(teams[0].teamId || teams[0].teamNo);
      } else {
        setSelectedTeamId('');
      }
      setErrorMessage('');
    }
  }, [isOpen, initialTeam, teams]);

  if (!isOpen) return null;

  const currentTeam = teams.find(
    (t) =>
      t.teamId === selectedTeamId ||
      t.teamNo === selectedTeamId ||
      (t as any).id === selectedTeamId
  );

  const handleDelete = async () => {
    if (!currentTeam) {
      setErrorMessage('Please select a valid team to delete.');
      return;
    }

    setIsDeleting(true);
    setErrorMessage('');

    try {
      const res = await AdvisorService.deleteTeam(
        className,
        currentTeam.teamId || currentTeam.teamNo,
        advisorName
      );

      if (!res.success) {
        setErrorMessage(res.message || 'Failed to delete team.');
        setIsDeleting(false);
        return;
      }

      onSuccess(
        `Team ${currentTeam.teamNo} was permanently removed. ${currentTeam.members?.length || 0} student(s) marked as Unassigned.`
      );
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred while deleting the team.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-rose-100 flex flex-col gap-4 animate-scaleUp max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8E4] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Delete Existing Team</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Remove team from class and unassign its students
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dropdown for Team Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700 flex items-center justify-between">
            <span>Select Team to Delete <span className="text-rose-600">*</span></span>
            <span className="text-[11px] text-slate-400 font-semibold">{teams.length} available</span>
          </label>
          <select
            value={selectedTeamId}
            onChange={(e) => {
              setSelectedTeamId(e.target.value);
              setErrorMessage('');
            }}
            disabled={isDeleting || teams.length === 0}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white transition"
          >
            {teams.length === 0 ? (
              <option value="">No existing teams found in this class</option>
            ) : (
              teams.map((t) => (
                <option key={t.teamId || t.teamNo} value={t.teamId || t.teamNo}>
                  {t.teamNo} {t.title ? `— ${t.title}` : ''} ({t.members?.length || 0} students)
                </option>
              ))
            )}
          </select>
        </div>

        {/* Selected Team Details Card */}
        {currentTeam ? (
          <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200 space-y-3">
            <div className="flex items-center justify-between border-b border-rose-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-black shadow-xs">
                  {currentTeam.teamNo}
                </span>
                <span className="text-xs font-extrabold text-slate-900 truncate max-w-[220px]">
                  {currentTeam.title || 'Untitled Project'}
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                {currentTeam.members?.length || 0} Members
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white p-2.5 rounded-xl border border-rose-100">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Faculty Guide</span>
                <span className="font-extrabold text-slate-800 truncate block">
                  {currentTeam.guide || 'Unassigned'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-rose-100">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Class Section</span>
                <span className="font-extrabold text-slate-800 truncate block">
                  {currentTeam.class || className}
                </span>
              </div>
            </div>

            {/* Members preview */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-black text-slate-700 block">
                Assigned Students to be Unlinked:
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {(currentTeam.members || []).length === 0 ? (
                  <div className="text-center py-2 text-slate-400 text-xs font-medium">
                    No students currently assigned to this team.
                  </div>
                ) : (
                  (currentTeam.members || []).map((m) => (
                    <div
                      key={m.rollNo}
                      className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-100 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[11px] font-extrabold text-slate-500">{m.rollNo}</span>
                        <span className="font-bold text-slate-800 truncate">{m.name}</span>
                      </div>
                      {m.isLead ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black shrink-0">
                          👑 Team Lead
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                          Member
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center text-slate-400 text-xs font-medium">
            Please choose a team from the dropdown to review and confirm deletion.
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8E4]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!currentTeam || isDeleting}
            className={`px-4 py-2 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm ${
              !currentTeam || isDeleting
                ? 'bg-rose-300 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-700 cursor-pointer'
            }`}
          >
            <Trash2 size={13} />
            <span>{isDeleting ? 'Deleting Team...' : 'Delete Team'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvisorDeleteTeamModal;
