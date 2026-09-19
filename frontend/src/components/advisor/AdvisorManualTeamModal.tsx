import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Sparkles, AlertCircle, CheckCircle2, ChevronDown, Check, UserMinus } from 'lucide-react';
import { AdvisorService, ClassTeam } from '../../services/advisorService';
import { AdminService, AdminStudent, AdminFaculty } from '../../services/adminService';
import { AdvisorHistoryService } from '../../services/advisorHistoryService';

interface AdvisorManualTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  batch: string;
  advisorName: string;
  initialStudent?: AdminStudent | null;
  onTeamCreated: (newTeam: ClassTeam) => void;
  onShowToast: (msg: string) => void;
}

export const AdvisorManualTeamModal: React.FC<AdvisorManualTeamModalProps> = ({
  isOpen,
  onClose,
  className,
  batch,
  advisorName,
  initialStudent,
  onTeamCreated,
  onShowToast
}) => {
  const capacity = Math.min(AdvisorService.getTeamCapacity(className), 4);
  const existingTeams = AdvisorService.getTeamsForClass(className);

  // Suggested team number e.g. "Team 05"
  const defaultTeamNo = `Team ${String(existingTeams.length + 1).padStart(2, '0')}`;

  const [teamNo, setTeamNo] = useState<string>(defaultTeamNo);
  const [selectedGuide, setSelectedGuide] = useState<string>('');
  const [selectedMemberRolls, setSelectedMemberRolls] = useState<string[]>([]);
  const [leadRollNo, setLeadRollNo] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fetch all unassigned students in this class
  const unassignedStudents: AdminStudent[] = AdvisorService.getClassStudents(className, batch).filter(
    s => !s.teamNo || s.teamNo === 'Unassigned' || s.teamNo.trim() === ''
  );

  // Available faculty guides
  const availableGuides: AdminFaculty[] = AdminService.getFaculties().filter(
    f => f.role === 'Guide' || f.role === 'Advisor & Guide'
  );

  // Pre-select initial student when modal opens
  useEffect(() => {
    if (isOpen) {
      setTeamNo(`Team ${String(existingTeams.length + 1).padStart(2, '0')}`);
      setSelectedGuide(availableGuides[0]?.name || '');
      setErrorMessage('');

      if (initialStudent && initialStudent.rollNo) {
        setSelectedMemberRolls([initialStudent.rollNo]);
        setLeadRollNo(initialStudent.rollNo);
      } else if (unassignedStudents.length > 0) {
        setSelectedMemberRolls([unassignedStudents[0].rollNo]);
        setLeadRollNo(unassignedStudents[0].rollNo);
      } else {
        setSelectedMemberRolls([]);
        setLeadRollNo('');
      }
    }
  }, [isOpen, initialStudent?.rollNo, className]);

  if (!isOpen) return null;

  // Unassigned students who haven't yet been added to this team
  const availableUnassignedToAdd = unassignedStudents.filter(
    s => !selectedMemberRolls.includes(s.rollNo)
  );

  // Add a member chosen from the unassigned students dropdown
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

  // Remove a member from the team
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

  const handleFormTeamSubmit = (e: React.FormEvent) => {
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

    // Title is NOT entered by advisors; defaults to "To be proposed by student team"
    const res = AdvisorService.addManualTeam(className, batch, {
      teamNo: teamNo.trim(),
      title: 'To be proposed by student team',
      guide: selectedGuide,
      leadRollNo: leadRollNo || selectedMemberRolls[0],
      memberRollNos: selectedMemberRolls
    });

    if (!res.success || !res.team) {
      setErrorMessage(res.message);
      return;
    }

    // Log to multi-role history
    AdvisorHistoryService.addLog(
      className,
      'Team Formation',
      res.team.teamNo,
      `Manually created ${res.team.teamNo} with ${res.team.members.length} student(s) and assigned to ${res.team.guide}. (Project title to be proposed by students).`,
      advisorName,
      'Class Advisor'
    );

    onShowToast(`Team ${res.team.teamNo} successfully formed and allocated.`);
    onTeamCreated(res.team);
    onClose();
  };

  // Find student objects for selected members
  const selectedStudentObjects = selectedMemberRolls.map(rNo => {
    return unassignedStudents.find(s => s.rollNo === rNo) || {
      rollNo: rNo,
      name: initialStudent?.rollNo === rNo ? initialStudent.name : `Student (${rNo})`,
      email: `${rNo}@srishakthi.ac.in`
    };
  });

  const isCapacityReached = selectedMemberRolls.length >= capacity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl border border-[#D8CCBA] overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[#D8CCBA] flex items-center justify-between bg-[#F8F5EE]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center font-bold">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#111111]">
                Manual Team Creation &amp; Assignment
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-[#EDE7DB] text-[#75695A] hover:text-[#111111] flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleFormTeamSubmit} className="p-6 space-y-5">
          
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 font-medium animate-fadeIn">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Team Number (Project title is NOT entered by advisor) */}
          <div>
            <label className="block text-xs font-medium text-[#75695A] mb-1">
              Team Number:
            </label>
            <input
              type="text"
              value={teamNo}
              onChange={(e) => setTeamNo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
              required
            />
          </div>

          {/* Dropdown to Select Unassigned Students */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#75695A]">
              Select Unassigned Members (Dropdown):
            </label>

            {/* Dropdown of Unassigned Students */}
            <div className="relative">
              <select
                value=""
                disabled={isCapacityReached || availableUnassignedToAdd.length === 0}
                onChange={(e) => handleAddMemberFromDropdown(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isCapacityReached 
                    ? `Team Capacity Reached (${capacity} Members Max)`
                    : availableUnassignedToAdd.length === 0
                    ? 'No other unassigned students available'
                    : '-- Click dropdown to select an unassigned student to add --'}
                </option>
                {availableUnassignedToAdd.map((s) => (
                  <option key={s.rollNo} value={s.rollNo}>
                    {s.name} &bull; Register No: {s.rollNo}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#75695A] pointer-events-none" />
            </div>

            {/* Selected Members List */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#111111] uppercase tracking-wider">
                  Assigned Team Members ({selectedMemberRolls.length} / {capacity}):
                </span>
                <span className="text-[11px] font-medium text-[#111111] bg-[#F8F5EE] px-2 py-0.5 rounded-md border border-[#D8CCBA]">
                  Capacity: {capacity} Max
                </span>
              </div>

              <div className="space-y-1.5">
                {selectedStudentObjects.map((m) => {
                  const isLead = (leadRollNo || selectedMemberRolls[0]) === m.rollNo;
                  const isInitial = initialStudent?.rollNo === m.rollNo;

                  return (
                    <div
                      key={m.rollNo}
                      className="flex items-center justify-between p-2.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#111111]">{m.name}</span>
                        <span className="text-[11px] font-mono text-[#75695A]">({m.rollNo})</span>
                        {isLead && (
                          <span className="px-2 py-0.5 bg-[#111111] text-white rounded text-[10px] font-medium uppercase">
                            Leader
                          </span>
                        )}
                        {isInitial && (
                          <span className="px-1.5 py-0.5 bg-[#EDE7DB] text-[#111111] rounded text-[10px] font-medium">
                            Selected
                          </span>
                        )}
                      </div>

                      {selectedMemberRolls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.rollNo)}
                          title="Remove from team"
                          className="p-1 hover:bg-rose-100 text-[#75695A] hover:text-rose-600 rounded-lg transition cursor-pointer"
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
              <label className="block text-xs font-medium text-[#75695A] mb-1">
                Designate Team Leader:
              </label>
              <div className="relative">
                <select
                  value={leadRollNo}
                  onChange={(e) => setLeadRollNo(e.target.value)}
                  className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
                >
                  {selectedStudentObjects.map((m) => (
                    <option key={m.rollNo} value={m.rollNo}>
                      {m.name} ({m.rollNo})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#75695A] pointer-events-none" />
              </div>
            </div>
          )}

          {/* Technical Guide Dropdown */}
          <div>
            <label className="block text-xs font-medium text-[#75695A] mb-1">
              Select Technical Faculty Guide:
            </label>
            <div className="relative">
              <select
                value={selectedGuide}
                onChange={(e) => setSelectedGuide(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer"
              >
                {availableGuides.map((g) => {
                  const assignedCount = AdvisorService.getGuideTeamCount(className, g.name);
                  const isFull = assignedCount >= 5;

                  return (
                    <option key={g.id} value={g.name} disabled={isFull}>
                      {g.name} &bull; {g.specialization || g.designation} ({assignedCount}/5 teams in class) {isFull ? '[MAX 5 REACHED]' : ''}
                    </option>
                  );
                })}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#75695A] pointer-events-none" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#D8CCBA] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#75695A] font-medium text-xs rounded-xl border border-[#D8CCBA] transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-[#111111] hover:bg-[#292725] text-white font-medium text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Sparkles size={14} />
              <span>Form Team</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default AdvisorManualTeamModal;
