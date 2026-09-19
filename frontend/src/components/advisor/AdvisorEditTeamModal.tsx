import React, { useState, useEffect } from 'react';
import { X, Users, AlertCircle, CheckCircle2, ChevronDown, Check, UserMinus, Edit3, Sparkles } from 'lucide-react';
import { AdvisorService, ClassTeam } from '../../services/advisorService';
import { AdminService, AdminStudent, AdminFaculty } from '../../services/adminService';
import { AdvisorHistoryService } from '../../services/advisorHistoryService';

interface AdvisorEditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  batch: string;
  advisorName: string;
  team: ClassTeam | null;
  onTeamUpdated: (updatedTeam: ClassTeam) => void;
  onShowToast: (msg: string) => void;
}

export const AdvisorEditTeamModal: React.FC<AdvisorEditTeamModalProps> = ({
  isOpen,
  onClose,
  className,
  batch,
  advisorName,
  team,
  onTeamUpdated,
  onShowToast
}) => {
  const capacity = AdvisorService.getTeamCapacity(className);

  const [teamNo, setTeamNo] = useState<string>('');
  const [selectedGuide, setSelectedGuide] = useState<string>('');
  const [selectedMemberRolls, setSelectedMemberRolls] = useState<string[]>([]);
  const [leadRollNo, setLeadRollNo] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Unassigned students in this class
  const unassignedStudents: AdminStudent[] = AdvisorService.getClassStudents(className, batch).filter(
    s => !s.teamNo || s.teamNo === 'Unassigned' || s.teamNo.trim() === ''
  );

  // Available faculty guides
  const availableGuides: AdminFaculty[] = AdminService.getFaculties().filter(
    f => f.role === 'Guide' || f.role === 'Advisor & Guide'
  );

  // Load team data into state when modal opens
  useEffect(() => {
    if (isOpen && team) {
      setTeamNo(team.teamNo);
      setSelectedGuide(team.guide);
      const rolls = team.members.map(m => m.rollNo);
      setSelectedMemberRolls(rolls);
      const lead = team.members.find(m => m.isLead)?.rollNo || rolls[0] || '';
      setLeadRollNo(lead);
      setErrorMessage('');
    }
  }, [isOpen, team]);

  if (!isOpen || !team) return null;

  const availableUnassignedToAdd = unassignedStudents.filter(
    s => !selectedMemberRolls.includes(s.rollNo)
  );

  const handleAddMemberFromDropdown = (rollNo: string) => {
    if (!rollNo) return;
    setErrorMessage('');

    if (selectedMemberRolls.length >= capacity) {
      setErrorMessage(`Cannot add more than ${capacity} members (Class configured capacity: ${capacity}).`);
      return;
    }

    if (!selectedMemberRolls.includes(rollNo)) {
      const updated = [...selectedMemberRolls, rollNo];
      setSelectedMemberRolls(updated);
      if (!leadRollNo) {
        setLeadRollNo(rollNo);
      }
    }
  };

  const handleRemoveMember = (rollNo: string) => {
    setErrorMessage('');
    if (selectedMemberRolls.length <= 1) {
      setErrorMessage('A team must have at least 1 student member.');
      return;
    }
    const updated = selectedMemberRolls.filter(r => r !== rollNo);
    setSelectedMemberRolls(updated);
    if (leadRollNo === rollNo) {
      setLeadRollNo(updated[0] || '');
    }
  };

  const handleSaveTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!teamNo.trim()) {
      setErrorMessage('Please provide a team number or designation.');
      return;
    }

    if (selectedMemberRolls.length === 0) {
      setErrorMessage('Please select at least one student member for this team.');
      return;
    }

    if (!selectedGuide) {
      setErrorMessage('Please select a technical guide for this team.');
      return;
    }

    const res = AdvisorService.updateTeam(className, batch, team.teamId, {
      teamNo: teamNo.trim(),
      guide: selectedGuide,
      leadRollNo: leadRollNo || selectedMemberRolls[0],
      memberRollNos: selectedMemberRolls
    });

    if (!res.success || !res.team) {
      setErrorMessage(res.message);
      return;
    }

    // Log history
    AdvisorHistoryService.addLog(
      className,
      'Team Modification',
      res.team.teamNo,
      `Updated ${res.team.teamNo}: Guide set to ${res.team.guide}, ${res.team.members.length} members configured.`,
      advisorName,
      'Class Advisor'
    );

    onShowToast(`Team ${res.team.teamNo} was successfully updated.`);
    onTeamUpdated(res.team);
    onClose();
  };

  const allStudents = AdminService.getStudents();
  const selectedStudentObjects = selectedMemberRolls.map(rNo => {
    const s = allStudents.find(x => x.rollNo === rNo);
    return s || {
      rollNo: rNo,
      name: `Student (${rNo})`,
      email: `${rNo}@srishakthi.ac.in`
    };
  });

  const isCapacityReached = selectedMemberRolls.length >= capacity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-[#E2E8E4] overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E2E8E4] flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-mint-100 text-mint-900 flex items-center justify-center font-bold">
              <Edit3 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Make Changes to {team.teamNo}
              </h3>
              <p className="text-[11px] text-slate-500">
                Class {className} &bull; Batch {batch} &bull; Modify team number, guide, leader, and roster
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSaveTeamSubmit} className="p-6 space-y-5">
          
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 font-bold animate-fadeIn">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Team Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Team Number / Designation: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={teamNo}
              onChange={(e) => setTeamNo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-mint-500"
              required
            />
          </div>

          {/* Members list & Dropdown to Add Unassigned Members */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Add Student Members from Unassigned Pool (Optional):
            </label>

            <div className="relative">
              <select
                value=""
                disabled={isCapacityReached || availableUnassignedToAdd.length === 0}
                onChange={(e) => handleAddMemberFromDropdown(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-mint-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isCapacityReached 
                    ? `Team Capacity Reached (${capacity} Members Max)`
                    : availableUnassignedToAdd.length === 0
                    ? 'No unassigned students available to add'
                    : '-- Select an unassigned student to add to this team --'}
                </option>
                {availableUnassignedToAdd.map((s) => (
                  <option key={s.rollNo} value={s.rollNo}>
                    {s.name} &bull; Register No: {s.rollNo}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Current Team Members */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Configured Members ({selectedMemberRolls.length} / {capacity}):
                </span>
                <span className="text-[11px] font-bold text-mint-900 bg-mint-50 px-2 py-0.5 rounded-md border border-mint-200">
                  Capacity: {capacity} Max
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedStudentObjects.map((m) => {
                  const isLead = (leadRollNo || selectedMemberRolls[0]) === m.rollNo;

                  return (
                    <div
                      key={m.rollNo}
                      className="flex items-center justify-between p-2.5 bg-mint-50/60 border border-mint-200 rounded-xl text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{m.name}</span>
                        <span className="text-[11px] font-mono text-slate-500">({m.rollNo})</span>
                        {isLead && (
                          <span className="px-2 py-0.5 bg-mint-500 text-white rounded text-[10px] font-black uppercase">
                            Leader
                          </span>
                        )}
                      </div>

                      {selectedMemberRolls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.rollNo)}
                          title="Remove from team"
                          className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Designate Team Leader */}
          {selectedStudentObjects.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Designate Team Leader:
              </label>
              <div className="relative">
                <select
                  value={leadRollNo}
                  onChange={(e) => setLeadRollNo(e.target.value)}
                  className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-mint-500 cursor-pointer"
                >
                  {selectedStudentObjects.map((m) => (
                    <option key={m.rollNo} value={m.rollNo}>
                      {m.name} ({m.rollNo})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Technical Guide Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Technical Faculty Guide:
            </label>
            <div className="relative">
              <select
                value={selectedGuide}
                onChange={(e) => setSelectedGuide(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-mint-500 cursor-pointer"
              >
                {availableGuides.map((g) => {
                  const assignedCount = AdvisorService.getGuideTeamCount(className, g.name);
                  const isCurrentInThisTeam = team.guide.toLowerCase() === g.name.toLowerCase();
                  const isFull = !isCurrentInThisTeam && assignedCount >= 5;

                  return (
                    <option key={g.id} value={g.name} disabled={isFull}>
                      {g.name} &bull; {g.specialization || g.designation} ({assignedCount}/5 teams in class) {isFull ? '[MAX 5 REACHED]' : ''}
                    </option>
                  );
                })}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#E2E8E4] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <CheckCircle2 size={14} />
              <span>Save Changes</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default AdvisorEditTeamModal;
