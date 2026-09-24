import React, { useState, useEffect } from 'react';
import { X, Users, Shuffle, ListOrdered, CheckCircle2, AlertCircle, Shield, UserCheck, Sparkles } from 'lucide-react';
import { AdminService, AdminFaculty, AdminStudent } from '../../services/adminService';
import { TeamMemberRecord } from '../../services/advisorService';

interface AdvisorCreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  batch: string;
  students: AdminStudent[];
  existingTeamsCount: number;
  onConfirmTeams: (
    capacity: number,
    teams: Array<{
      teamNo: string;
      title: string;
      guide: string;
      guideEmail?: string;
      leadRollNo: string;
      members: TeamMemberRecord[];
    }>
  ) => void;
}

export const AdvisorCreateTeamModal: React.FC<AdvisorCreateTeamModalProps> = ({
  isOpen,
  onClose,
  className,
  batch,
  students,
  existingTeamsCount,
  onConfirmTeams
}) => {
  const [capacity, setCapacity] = useState<number>(4);
  const [mode, setMode] = useState<'sequential' | 'shuffle'>('sequential');
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  // Draft teams structure
  const [draftTeams, setDraftTeams] = useState<Array<{
    teamNo: string;
    title: string;
    guide: string;
    guideEmail?: string;
    leadRollNo: string;
    members: TeamMemberRecord[];
  }>>([]);

  const [validationError, setValidationError] = useState<string>('');

  // Available guides from AdminService
  const [availableGuides,setAvailableguides] = useState<AdminFaculty[]>([]);
  useEffect(()=>{
    const f = async()=>{
      const fac = await AdminService.getFaculties();
      setAvailableguides(fac.filter(f=>f.role === 'Guide' || f.role === 'Advisor & Guide'));
    }
    f();
  },[]);

  if (!isOpen) return null;

  // Handle generation of prospective teams
  const handleGenerateTeams = () => {
    setValidationError('');
    if (students.length === 0) {
      setValidationError('No students available in this class to form teams.');
      return;
    }

    if (capacity < 2 || capacity > 4) {
      setValidationError('Team capacity must be between 2 and 4 members.');
      return;
    }

    let studentPool = [...students];
    if (mode === 'sequential') {
      studentPool.sort((a, b) => a.rollNo.localeCompare(b.rollNo));
    } else {
      // Fisher-Yates shuffle
      for (let i = studentPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [studentPool[i], studentPool[j]] = [studentPool[j], studentPool[i]];
      }
    }

    const generated: typeof draftTeams = [];
    let teamCounter = 1;

    for (let i = 0; i < studentPool.length; i += capacity) {
      const chunk = studentPool.slice(i, i + capacity);
      const teamNumberStr = `Team ${String(teamCounter).padStart(2, '0')}`;
      const defaultLeader = chunk[0].rollNo;

      generated.push({
        teamNo: teamNumberStr,
        title: '',
        guide: '',
        guideEmail: '',
        leadRollNo: defaultLeader,
        members: chunk.map(s => ({
          rollNo: s.rollNo,
          name: s.name,
          email: s.email,
          isLead: s.rollNo === defaultLeader
        }))
      });
      teamCounter++;
    }

    setDraftTeams(generated);
    setIsGenerated(true);
  };

  // Compute live guide assignment counts
  const getGuideAssignedCount = (guideName: string) => {
    return draftTeams.filter(t => t.guide.toLowerCase() === guideName.toLowerCase()).length;
  };

  const handleGuideChange = (teamIndex: number, guideName: string) => {
    setValidationError('');
    const fac = availableGuides.find(g => g.name === guideName);
    const updated = [...draftTeams];
    updated[teamIndex].guide = guideName;
    updated[teamIndex].guideEmail = fac?.email || '';
    setDraftTeams(updated);
  };

  const handleLeaderChange = (teamIndex: number, rollNo: string) => {
    const updated = [...draftTeams];
    updated[teamIndex].leadRollNo = rollNo;
    updated[teamIndex].members = updated[teamIndex].members.map(m => ({
      ...m,
      isLead: m.rollNo === rollNo
    }));
    setDraftTeams(updated);
  };

  const handleFinalSubmit = () => {
    setValidationError('');

    // Verify all teams have guide
    for (let i = 0; i < draftTeams.length; i++) {
      const t = draftTeams[i];
      if (!t.guide) {
        setValidationError(`Please assign a Technical Guide for ${t.teamNo}.`);
        return;
      }
      if (!t.leadRollNo) {
        setValidationError(`Please assign a Team Leader for ${t.teamNo}.`);
        return;
      }
    }

    // Verify no guide exceeds 5 teams
    const counts: Record<string, number> = {};
    for (const t of draftTeams) {
      counts[t.guide] = (counts[t.guide] || 0) + 1;
      if (counts[t.guide] > 5) {
        setValidationError(`Guide ${t.guide} has been assigned ${counts[t.guide]} teams. Maximum quota per class is 5 teams.`);
        return;
      }
    }

    onConfirmTeams(capacity, draftTeams);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn font-sans">
      <div 
        className="bg-white w-full max-w-3xl rounded-3xl shadow-xl border border-[#D8CCBA] overflow-hidden transform transition-all flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-[#F8F5EE] px-6 py-4 border-b border-[#D8CCBA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#111111]">
                Automatic Team Generation
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#75695A] hover:text-[#111111] p-2 rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {validationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2 animate-fadeIn">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          {!isGenerated ? (
            <div className="space-y-6 max-w-lg mx-auto py-4">
              
              {/* Step 1: Member Capacity */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#111111] uppercase tracking-wider">
                  1. Team Member Capacity (Per Team)
                </label>
                <div className="flex items-center gap-3">
                  {[2, 3, 4].map(cap => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setCapacity(cap)}
                      className={`flex-1 py-3 rounded-2xl border font-bold text-sm transition flex flex-col items-center justify-center cursor-pointer ${
                        capacity === cap
                          ? 'bg-[#111111] text-white border-[#111111] shadow-sm'
                          : 'bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#111111] border-[#D8CCBA]'
                      }`}
                    >
                      <span>{cap}</span>
                      <span className="text-[10px] font-normal opacity-80">Students</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Formation Logic */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#111111] uppercase tracking-wider">
                  2. Student Partitioning Methodology
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setMode('sequential')}
                    className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                      mode === 'sequential'
                        ? 'bg-[#F8F5EE] border-[#111111] ring-2 ring-[#111111]/20 shadow-xs'
                        : 'bg-white border-[#D8CCBA] hover:bg-[#F8F5EE]'
                    }`}
                  >
                    <ListOrdered size={20} className={mode === 'sequential' ? 'text-[#111111]' : 'text-[#75695A]'} />
                    <div>
                      <span className="font-bold text-[#111111] block">Sequential Roll Number</span>
                    </div>
                  </div>

                  <div
                    onClick={() => setMode('shuffle')}
                    className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                      mode === 'shuffle'
                        ? 'bg-[#F8F5EE] border-[#111111] ring-2 ring-[#111111]/20 shadow-xs'
                        : 'bg-white border-[#D8CCBA] hover:bg-[#F8F5EE]'
                    }`}
                  >
                    <Shuffle size={20} className={mode === 'shuffle' ? 'text-[#111111]' : 'text-[#75695A]'} />
                    <div>
                      <span className="font-bold text-[#111111] block">Shuffle Members</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerateTeams}
                  className="w-full py-3 bg-[#111111] hover:bg-[#292725] text-white font-medium rounded-2xl shadow-sm transition flex items-center justify-center gap-2 text-xs"
                >
                  <Sparkles size={16} />
                  <span>Generate Team Partitions &amp; Proceed to Guide Allocation</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Step 3: Guide Allocation & Leader Selection */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8CCBA] pb-3">
                <div>
                  <h4 className="text-sm font-serif font-bold text-[#111111]">
                    Mandatory Guide Assignment &amp; Team Leader Designation
                  </h4>
                  <p className="text-[11px] text-[#75695A]">
                    Max 5 teams per guide allowed. Assign guides and choose team leaders for each team.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGenerated(false)}
                  className="text-xs font-medium text-[#75695A] hover:text-[#111111] bg-[#F8F5EE] hover:bg-[#EDE7DB] border border-[#D8CCBA] px-3 py-1.5 rounded-xl transition self-start"
                >
                  Change Partition Settings
                </button>
              </div>

              {/* Draft Teams List */}
              <div className="space-y-4">
                {draftTeams.map((team, idx) => {
                  return (
                    <div 
                      key={idx}
                      className="p-4 bg-[#F8F5EE]/60 rounded-2xl border border-[#D8CCBA] space-y-3.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8CCBA]/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-bold text-xs">
                            {team.teamNo}
                          </span>
                          <span className="font-medium text-[#75695A] text-xs">
                            ({team.members.length} Members)
                          </span>
                        </div>
                      </div>

                      {/* Members preview */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {team.members.map((m) => (
                          <div 
                            key={m.rollNo}
                            className={`p-2 rounded-xl border text-[11px] ${
                              team.leadRollNo === m.rollNo
                                ? 'bg-[#EDE7DB] border-[#111111] ring-1 ring-[#111111]'
                                : 'bg-white border-[#D8CCBA]'
                            }`}
                          >
                            <div className="font-bold text-[#111111] truncate">{m.name}</div>
                            <div className="text-[#75695A] font-mono text-[10px]">{m.rollNo}</div>
                          </div>
                        ))}
                      </div>

                      {/* Dropdowns for Guide and Team Leader */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        
                        {/* Technical Guide Dropdown with live 5-team quota check */}
                        <div>
                          <label className="block text-[10px] font-medium text-[#75695A] uppercase tracking-wider mb-1">
                            Assign Technical Guide <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={team.guide}
                            onChange={(e) => handleGuideChange(idx, e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] shadow-xs"
                          >
                            <option value="">Select Faculty Guide...</option>
                            {availableGuides.map((g) => {
                              const assignedCount = getGuideAssignedCount(g.name);
                              const isSelectedInThisTeam = team.guide.toLowerCase() === g.name.toLowerCase();
                              const isMaxedOut = !isSelectedInThisTeam && assignedCount >= 5;

                              return (
                                <option 
                                  key={g.id} 
                                  value={g.name}
                                  disabled={isMaxedOut}
                                >
                                  {g.name} ({assignedCount}/5 teams in class) {isMaxedOut ? '— [MAX 5 REACHED]' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Team Leader Dropdown */}
                        <div>
                          <label className="block text-[10px] font-medium text-[#75695A] uppercase tracking-wider mb-1">
                            Designate Team Leader <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={team.leadRollNo}
                            onChange={(e) => handleLeaderChange(idx, e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#D8CCBA] rounded-xl text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] shadow-xs"
                          >
                            {team.members.map((m) => (
                              <option key={m.rollNo} value={m.rollNo}>
                                {m.name} ({m.rollNo})
                              </option>
                            ))}
                          </select>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#F8F5EE] px-6 py-4 border-t border-[#D8CCBA] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#75695A] hover:text-[#111111] bg-white border border-[#D8CCBA] rounded-xl hover:bg-[#EDE7DB] transition"
          >
            Cancel
          </button>

          {isGenerated && (
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="px-5 py-2 text-xs font-medium text-white bg-[#111111] hover:bg-[#292725] rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <CheckCircle2 size={15} />
              <span>Confirm &amp; Finalize {draftTeams.length} Teams</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdvisorCreateTeamModal;
