import React, { useState, useEffect } from 'react';
import { 
  X, Users, UserPlus, Sparkles, AlertCircle, CheckCircle2, 
  ChevronDown, Check, UserMinus, ArrowRight, ArrowLeft, Shield, Crown, BookOpen 
} from 'lucide-react';
import { AdvisorService, ClassTeam } from '../../services/advisorService';
import { AdminService, AdminStudent, AdminFaculty } from '../../services/adminService';
import { useAdvisorGuides } from '../../hooks/useQueries';
import { AdvisorHistoryService } from '../../services/advisorHistoryService';

interface AdvisorManualTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  batch: string;
  advisorName: string;
  initialStudent?: AdminStudent | null;
  teams?: ClassTeam[];
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
  teams: propTeams,
  onTeamCreated,
  onShowToast
}) => {
  const capacity = Math.min(AdvisorService.getTeamCapacity(className), 4);
  const existingTeams = propTeams && propTeams.length > 0 ? propTeams : AdvisorService.getTeamsForClass(className);

  // Wizard step: 1 (Team & Project) -> 2 (Members & Leader) -> 3 (Guide & Review)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const defaultTeamNo = `Team ${String(existingTeams.length + 1).padStart(2, '0')}`;

  const [teamNo, setTeamNo] = useState<string>(defaultTeamNo);
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [selectedGuide, setSelectedGuide] = useState<string>('');
  const [selectedMemberRolls, setSelectedMemberRolls] = useState<string[]>([]);
  const [leadRollNo, setLeadRollNo] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [unassignedStudents, setUnassignedStudents] = useState<AdminStudent[]>([]);
  const { data: availableGuides = [] } = useAdvisorGuides();
  const [allStudents, setAllStudents] = useState<AdminStudent[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchClassData = async () => {
      const students = await AdvisorService.getClassStudents(className, batch);
      setAllStudents(students);
      const unassigned = students.filter(s =>
        !s.teamNo || s.teamNo === 'Unassigned' || s.teamNo.trim() === '');
      setUnassignedStudents(unassigned);
    };
    fetchClassData();
  }, [isOpen, className, batch]);

  // Synchronize default guide if not selected
  useEffect(() => {
    if (availableGuides.length > 0 && (!selectedGuide || !availableGuides.some(g => g.name === selectedGuide))) {
      setSelectedGuide(availableGuides[0].name);
    }
  }, [availableGuides, selectedGuide]);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      const nextNum = existingTeams.length + 1;
      setTeamNo(`Team ${String(nextNum).padStart(2, '0')}`);
      setProjectTitle('');
      setErrorMessage('');
      setIsSubmitting(false);

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

  // Unassigned students available to be added
  const availableUnassignedToAdd = unassignedStudents.filter(
    s => !selectedMemberRolls.includes(s.rollNo)
  );

  const handleAddMember = (rollNo: string) => {
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

  // Step 1 Validation
  const validateStep1 = () => {
    setErrorMessage('');
    if (!teamNo.trim()) {
      setErrorMessage('Please provide a team designation (e.g. Team 05).');
      return false;
    }

    // Check duplicate
    const cleanNo = teamNo.trim().toLowerCase();
    const isDup = existingTeams.some(t => {
      const existing = t.teamNo.trim().toLowerCase();
      if (existing === cleanNo) return true;
      const numA = existing.replace(/^team\s*/i, '').replace(/^0+/, '');
      const numB = cleanNo.replace(/^team\s*/i, '').replace(/^0+/, '');
      return numA === numB;
    });

    if (isDup) {
      setErrorMessage(`${teamNo.trim()} already exists in Class ${className}. Please choose a unique team number.`);
      return false;
    }

    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    setErrorMessage('');
    if (selectedMemberRolls.length === 0) {
      setErrorMessage('Please select at least one student member for this team.');
      return false;
    }
    if (selectedMemberRolls.length > capacity) {
      setErrorMessage(`Team size cannot exceed ${capacity} students.`);
      return false;
    }
    if (!leadRollNo) {
      setLeadRollNo(selectedMemberRolls[0]);
    }
    return true;
  };

  // Final Submit
  const handleFormTeamSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }

    if (!selectedGuide) {
      setErrorMessage('Please select a technical faculty guide.');
      return;
    }

    const currentGuideLoad = AdvisorService.getGuideTeamCount(className, selectedGuide);
    if (currentGuideLoad >= 5) {
      setErrorMessage(`Guide ${selectedGuide} has reached the institutional limit of 5 teams in this section.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const guideObj = availableGuides.find(g => g.name === selectedGuide);
      const guideEmail = guideObj?.email || `${selectedGuide.toLowerCase().replace(/[^a-z0-9]/g, '.')}@siet.ac.in`;

      const effectiveTitle = projectTitle.trim() || 'To be proposed by student team';

      const res = await AdvisorService.addManualTeam(className, batch, {
        teamNo: teamNo.trim(),
        title: effectiveTitle,
        guide: selectedGuide,
        guideEmail,
        leadRollNo: leadRollNo || selectedMemberRolls[0],
        memberRollNos: selectedMemberRolls
      });

      if (!res.success || !res.team) {
        setErrorMessage(res.message);
        setIsSubmitting(false);
        return;
      }

      AdvisorHistoryService.addLog(
        className,
        'Team Formation',
        res.team.teamNo,
        `Manually created ${res.team.teamNo} via Wizard with ${res.team.members.length} student(s) and assigned to ${res.team.guide}.`,
        advisorName,
        'Class Advisor'
      );

      onShowToast(`Team ${res.team.teamNo} successfully formed and allocated!`);
      onTeamCreated(res.team);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to form team. Please check your network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Map roll numbers to full student objects
  const selectedStudentObjects = selectedMemberRolls.map(rNo => {
    const found = unassignedStudents.find(s => s.rollNo === rNo) || 
                  allStudents.find(s => s.rollNo === rNo);
    return found || {
      rollNo: rNo,
      name: initialStudent?.rollNo === rNo ? initialStudent.name : `Student (${rNo})`,
      email: `${rNo}@srishakthi.ac.in`,
      batch,
      classSection: className
    };
  });

  const selectedGuideObj = availableGuides.find(g => g.name === selectedGuide);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-[#E2E8E4] overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Wizard Header */}
        <div className="p-5 border-b border-[#E2E8E4] flex items-center justify-between bg-gradient-to-r from-mint-50/60 via-white to-mint-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-mint-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Allocate Team Manually
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-mint-100 text-mint-800 text-[10px] font-black uppercase">
                  Class {className}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Step-by-step team composition, project setup, and faculty guide allocation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Wizard Step Progression Bar */}
        <div className="bg-[#F8FAF9] px-6 py-3 border-b border-[#E2E8E4]">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => {
                if (currentStep > 1) setCurrentStep(1);
              }}
              className={`flex items-center gap-2 text-xs font-bold transition cursor-pointer ${
                currentStep === 1 
                  ? 'text-mint-800' 
                  : currentStep > 1 
                  ? 'text-emerald-700' 
                  : 'text-slate-400'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                currentStep === 1 
                  ? 'bg-mint-500 text-white shadow-xs ring-4 ring-mint-100' 
                  : currentStep > 1 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-200 text-slate-500'
              }`}>
                {currentStep > 1 ? <Check size={12} /> : '1'}
              </div>
              <span>Identity & Title</span>
            </button>

            <div className={`h-0.5 flex-1 mx-3 rounded ${currentStep > 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => {
                if (validateStep1()) setCurrentStep(2);
              }}
              className={`flex items-center gap-2 text-xs font-bold transition cursor-pointer ${
                currentStep === 2 
                  ? 'text-mint-800' 
                  : currentStep > 2 
                  ? 'text-emerald-700' 
                  : 'text-slate-400'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                currentStep === 2 
                  ? 'bg-mint-500 text-white shadow-xs ring-4 ring-mint-100' 
                  : currentStep > 2 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-200 text-slate-500'
              }`}>
                {currentStep > 2 ? <Check size={12} /> : '2'}
              </div>
              <span>Members & Leader</span>
            </button>

            <div className={`h-0.5 flex-1 mx-3 rounded ${currentStep > 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => {
                if (validateStep1() && validateStep2()) setCurrentStep(3);
              }}
              className={`flex items-center gap-2 text-xs font-bold transition cursor-pointer ${
                currentStep === 3 
                  ? 'text-mint-800' 
                  : 'text-slate-400'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                currentStep === 3 
                  ? 'bg-mint-500 text-white shadow-xs ring-4 ring-mint-100' 
                  : 'bg-slate-200 text-slate-500'
              }`}>
                3
              </div>
              <span>Guide & Review</span>
            </button>
          </div>
        </div>

        {/* Wizard Form Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 font-bold animate-fadeIn">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Team & Project Info */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-mint-50/40 p-4 rounded-2xl border border-mint-100">
                <span className="text-[10px] uppercase font-black tracking-wider text-mint-800 block mb-1">
                  Step 1 of 3: Team Designation & Project Info
                </span>
                <p className="text-xs text-slate-600">
                  Assign a unique team number for this section and optionally register a proposed project title.
                </p>
              </div>

              {/* Team Number */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                  Team Number / Designation: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={teamNo}
                  onChange={(e) => {
                    setTeamNo(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="e.g. Team 05 or Team 23"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-mint-500 focus:ring-2 focus:ring-mint-200 transition"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Suggested format: Team 01, Team 02, etc. Existing teams count in this section: {existingTeams.length}.
                </span>
              </div>

              {/* Proposed Project Title */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Proposed Project Title (Optional):</span>
                  <span className="text-[10px] font-medium text-slate-400">Can also be proposed by students later</span>
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. AI-Powered Adaptive Traffic Management System"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-mint-500 focus:ring-2 focus:ring-mint-200 transition"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  If left empty, defaults to "To be proposed by student team".
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Members & Leadership */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-mint-50/40 p-4 rounded-2xl border border-mint-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-mint-800 block mb-0.5">
                    Step 2 of 3: Team Roster & Leader
                  </span>
                  <p className="text-xs text-slate-600">
                    Add unassigned students to this team and designate one as the Team Leader.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                    selectedMemberRolls.length >= capacity 
                      ? 'bg-amber-100 text-amber-900 border-amber-300' 
                      : 'bg-white text-mint-900 border-mint-300'
                  }`}>
                    {selectedMemberRolls.length} / {capacity} Members
                  </span>
                </div>
              </div>

              {/* Unassigned Students Dropdown Selector */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                  Add Unassigned Student to Team:
                </label>
                <div className="relative">
                  <select
                    value=""
                    disabled={selectedMemberRolls.length >= capacity || availableUnassignedToAdd.length === 0}
                    onChange={(e) => handleAddMember(e.target.value)}
                    className="w-full appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-mint-500 focus:ring-2 focus:ring-mint-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {selectedMemberRolls.length >= capacity 
                        ? `Maximum team capacity reached (${capacity} students max)`
                        : availableUnassignedToAdd.length === 0
                        ? 'No additional unassigned students available'
                        : '-- Select an unassigned student to add --'}
                    </option>
                    {availableUnassignedToAdd.map((s) => (
                      <option key={s.rollNo} value={s.rollNo}>
                        {s.name} &bull; Register No: {s.rollNo}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Selected Members Roster */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Selected Team Members ({selectedMemberRolls.length}):
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Leader is marked with <Crown size={11} className="inline text-amber-500 -mt-0.5" />
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedStudentObjects.length === 0 ? (
                    <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-[#E2E8E4] text-center text-slate-400 text-xs">
                      No student members selected yet. Use the dropdown above to add students.
                    </div>
                  ) : (
                    selectedStudentObjects.map((m) => {
                      const isLead = (leadRollNo || selectedMemberRolls[0]) === m.rollNo;
                      const isInitial = initialStudent?.rollNo === m.rollNo;

                      return (
                        <div
                          key={m.rollNo}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                            isLead 
                              ? 'bg-amber-50/40 border-amber-300 shadow-2xs' 
                              : 'bg-white border-[#E2E8E4] hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isLead ? 'bg-amber-500 text-white' : 'bg-mint-100 text-mint-900'
                            }`}>
                              {m.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-xs">{m.name}</span>
                                {isLead && (
                                  <span className="px-2 py-0.5 bg-amber-500 text-white rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <Crown size={10} />
                                    <span>Leader</span>
                                  </span>
                                )}
                                {isInitial && (
                                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md text-[9px] font-bold">
                                    Current Student
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">{m.rollNo}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!isLead && (
                              <button
                                type="button"
                                onClick={() => setLeadRollNo(m.rollNo)}
                                title="Make Team Leader"
                                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-amber-800 bg-slate-100 hover:bg-amber-100 rounded-lg transition cursor-pointer"
                              >
                                Make Lead
                              </button>
                            )}

                            {selectedMemberRolls.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m.rollNo)}
                                title="Remove from team"
                                className="p-1.5 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Designate Leader Dropdown */}
              {selectedStudentObjects.length > 1 && (
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">
                    Designate Team Leader:
                  </label>
                  <div className="relative">
                    <select
                      value={leadRollNo}
                      onChange={(e) => setLeadRollNo(e.target.value)}
                      className="w-full appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-mint-500 focus:ring-2 focus:ring-mint-200 cursor-pointer"
                    >
                      {selectedStudentObjects.map((m) => (
                        <option key={m.rollNo} value={m.rollNo}>
                          {m.name} ({m.rollNo})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Guide Allocation & Confirmation */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-mint-50/40 p-4 rounded-2xl border border-mint-100">
                <span className="text-[10px] uppercase font-black tracking-wider text-mint-800 block mb-0.5">
                  Step 3 of 3: Faculty Guide Allocation & Final Review
                </span>
                <p className="text-xs text-slate-600">
                  Assign a technical faculty guide from the computer science faculty pool and review final team configuration.
                </p>
              </div>

              {/* Technical Guide Dropdown */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                  Select Technical Faculty Guide: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedGuide}
                    onChange={(e) => {
                      setSelectedGuide(e.target.value);
                      setErrorMessage('');
                    }}
                    className="w-full appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-mint-500 focus:ring-2 focus:ring-mint-200 cursor-pointer"
                  >
                    {availableGuides.map((g) => {
                      const assignedCount = AdvisorService.getGuideTeamCount(className, g.name);
                      const isFull = assignedCount >= 5;

                      return (
                        <option key={g.id || g.name} value={g.name} disabled={isFull}>
                          {g.name} &bull; {g.specialization || g.designation || 'Faculty'} ({assignedCount}/5 teams in class) {isFull ? '[CAPACITY 5 REACHED]' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                {selectedGuideObj && (
                  <div className="mt-1.5 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Email: <strong>{selectedGuideObj.email || `${selectedGuide.toLowerCase().replace(/[^a-z0-9]/g, '.')}@siet.ac.in`}</strong></span>
                    <span>Class Quota: <strong>{AdvisorService.getGuideTeamCount(className, selectedGuide)} / 5 teams</strong></span>
                  </div>
                )}
              </div>

              {/* Summary Review Card */}
              <div className="bg-[#F8FAF9] p-4 rounded-2xl border border-[#E2E8E4] space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2E8E4] pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Configuration Preview Summary
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                    Ready to Form
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Team Designation:</span>
                    <span className="font-extrabold text-slate-900">{teamNo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Section & Batch:</span>
                    <span className="font-bold text-slate-800">{className} &bull; {batch}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Project Title:</span>
                    <span className="font-bold text-slate-800">{projectTitle.trim() || 'To be proposed by student team'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Assigned Technical Guide:</span>
                    <span className="font-bold text-slate-800">{selectedGuide}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Members ({selectedMemberRolls.length}):</span>
                    <div className="mt-1 space-y-1">
                      {selectedStudentObjects.map(m => (
                        <div key={m.rollNo} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-[#E2E8E4]">
                          <span className="font-bold text-slate-800">{m.name} ({m.rollNo})</span>
                          {m.rollNo === (leadRollNo || selectedMemberRolls[0]) && (
                            <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              Leader
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 bg-[#F8FAF9] border-t border-[#E2E8E4] flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setCurrentStep((prev) => (prev - 1) as 1 | 2);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-[#E2E8E4] transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl border border-[#E2E8E4] transition cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1 && validateStep1()) {
                    setCurrentStep(2);
                  } else if (currentStep === 2 && validateStep2()) {
                    setCurrentStep(3);
                  }
                }}
                className="px-5 py-2 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleFormTeamSubmit()}
                className="px-6 py-2 bg-mint-500 hover:bg-mint-600 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Team...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Confirm &amp; Form Team</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdvisorManualTeamModal;
