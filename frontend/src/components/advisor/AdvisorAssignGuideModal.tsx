import React, { useState, useEffect } from 'react';
import { X, UserCheck, BookOpen, Users, AlertCircle, Sparkles, CheckCircle2, Shield } from 'lucide-react';
import { AdvisorService, ClassTeam } from '../../services/advisorService';
import { AdminService, AdminFaculty, AdminStudent } from '../../services/adminService';
import { AdvisorHistoryService } from '../../services/advisorHistoryService';
import { getUserInitials } from '../../services/authService';

interface AdvisorAssignGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: AdminStudent | null;
  className: string;
  batch: string;
  advisorName: string;
  onShowToast: (msg: string) => void;
}

export const AdvisorAssignGuideModal: React.FC<AdvisorAssignGuideModalProps> = ({
  isOpen,
  onClose,
  student,
  className,
  batch,
  advisorName,
  onShowToast
}) => {
  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [newTeamNo, setNewTeamNo] = useState<string>('');
  const [selectedGuide, setSelectedGuide] = useState<string>('');
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [error, setError] = useState<string>('');

  const teams = AdvisorService.getTeamsForClass(className);
  const teamCapacity = AdvisorService.getTeamCapacity(className);
  
  // Available guides
  const availableGuides: AdminFaculty[] = AdminService.getFaculties().filter(
    f => f.role === 'Guide' || f.role === 'Advisor & Guide'
  );

  useEffect(() => {
    if (isOpen && student) {
      setError('');
      const defaultNo = `Team ${String(teams.length + 1).padStart(2, '0')}`;
      setNewTeamNo(defaultNo);
      setProjectTitle(`Capstone Project - ${defaultNo}`);
      
      // Default to first guide with available quota
      const availableGuide = availableGuides.find(g => AdvisorService.getGuideTeamCount(className, g.name) < 5);
      setSelectedGuide(availableGuide?.name || availableGuides[0]?.name || '');

      // Check if existing teams have capacity
      const teamWithSpace = teams.find(t => t.members.length < (t.capacity || teamCapacity));
      if (teamWithSpace) {
        setSelectedTeamId(teamWithSpace.teamId);
      } else if (teams.length > 0) {
        setSelectedTeamId(teams[0].teamId);
      }
    }
  }, [isOpen, student?.rollNo, className]);

  if (!isOpen || !student) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'existing') {
      if (!selectedTeamId) {
        setError('Please choose a destination team.');
        return;
      }
      const targetTeam = teams.find(t => t.teamId === selectedTeamId);
      if (!targetTeam) {
        setError('Selected team was not found.');
        return;
      }
      const cap = targetTeam.capacity || teamCapacity;
      if (targetTeam.members.length >= cap) {
        setError(`${targetTeam.teamNo} is already at maximum capacity (${cap} members).`);
        return;
      }

      const res = AdvisorService.moveStudent(className, student.rollNo, selectedTeamId);
      if (!res.success) {
        setError(res.message);
        return;
      }

      AdvisorHistoryService.addLog(
        className,
        'Student Transfer',
        `${student.name} (${student.rollNo})`,
        `Allocated to ${targetTeam.teamNo} under Technical Guide ${targetTeam.guide}.`,
        advisorName
      );

      onShowToast(`Technical Guide ${targetTeam.guide} assigned to ${student.name} in ${targetTeam.teamNo}.`);
      onClose();
    } else {
      if (!selectedGuide) {
        setError('Please select a Technical Guide.');
        return;
      }

      const guideLoad = AdvisorService.getGuideTeamCount(className, selectedGuide);
      if (guideLoad >= 5) {
        setError(`Guide ${selectedGuide} has already reached the maximum limit of 5 teams in this class.`);
        return;
      }

      const guideRecord = availableGuides.find(g => g.name === selectedGuide);
      const res = AdvisorService.assignStudentGuideAndTeam(className, student.rollNo, {
        mode: 'new',
        newTeamNo: newTeamNo.trim(),
        guideName: selectedGuide,
        guideEmail: guideRecord?.email,
        projectTitle: projectTitle.trim() || undefined,
        batch: student.batch || batch
      });

      if (!res.success) {
        setError(res.message);
        return;
      }

      AdvisorHistoryService.addLog(
        className,
        'Team Formation',
        `${student.name} (${student.rollNo})`,
        `Assigned Technical Guide ${selectedGuide} in ${newTeamNo.trim()}.`,
        advisorName
      );

      onShowToast(`Technical Guide ${selectedGuide} successfully assigned to ${student.name}.`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#E2E8E4] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#E2E8E4] flex items-center justify-between bg-mint-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-mint-500 text-white flex items-center justify-center font-bold shadow-sm">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Assign Technical Guide</h3>
              <p className="text-xs text-slate-500">Designate project mentorship and team allocation for Class {className}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Candidate Profile Card */}
          <div className="p-4 rounded-2xl bg-[#EFF3F1]/70 border border-[#E2E8E4] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-mint-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                {getUserInitials(student.name)}
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-sm">{student.name}</div>
                <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                  Reg No: <strong className="text-mint-800">{student.rollNo}</strong> &bull; Class: <strong className="text-slate-800">{student.classSection || className}</strong>
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
              Guide Pending
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div>
            <label className="block text-slate-700 font-bold mb-2">Assignment Mode</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  mode === 'new'
                    ? 'bg-white text-mint-900 shadow-xs border border-mint-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Form New Team &amp; Guide
              </button>
              <button
                type="button"
                onClick={() => setMode('existing')}
                disabled={teams.length === 0}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  mode === 'existing'
                    ? 'bg-white text-mint-900 shadow-xs border border-mint-200'
                    : 'text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                Allocate to Existing Team
              </button>
            </div>
          </div>

          {/* Existing Team Selection */}
          {mode === 'existing' && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Select Destination Team <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-[#E2E8E4] rounded-xl font-bold focus:outline-none focus:border-mint-500 text-xs"
                >
                  {teams.map(t => {
                    const cap = t.capacity || teamCapacity;
                    const isFull = t.members.length >= cap;
                    return (
                      <option key={t.teamId} value={t.teamId} disabled={isFull}>
                        {t.teamNo} &bull; Guide: {t.guide} ({t.members.length}/{cap} members){isFull ? ' [FULL]' : ''}
                      </option>
                    );
                  })}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Candidate will be assigned to this team and mentored by its Technical Guide.
                </span>
              </div>
            </div>
          )}

          {/* New Team & Guide Selection */}
          {mode === 'new' && (
            <div className="space-y-3 pt-1">
              
              {/* Technical Guide Dropdown */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Designate Technical Guide <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedGuide}
                  onChange={(e) => setSelectedGuide(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-[#E2E8E4] rounded-xl font-bold focus:outline-none focus:border-mint-500 text-xs"
                >
                  {availableGuides.map(g => {
                    const count = AdvisorService.getGuideTeamCount(className, g.name);
                    const isFull = count >= 5;
                    return (
                      <option key={g.id} value={g.name} disabled={isFull}>
                        {g.name} &bull; {g.designation} ({count}/5 teams in {className}){isFull ? ' [QUOTA FULL]' : ''}
                      </option>
                    );
                  })}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Only guides with available institutional quota in Class {className} can be designated.
                </span>
              </div>

              {/* Team Number */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Team Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTeamNo}
                  onChange={(e) => setNewTeamNo(e.target.value)}
                  placeholder="e.g. Team 08"
                  className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl font-bold focus:outline-none focus:border-mint-500 text-xs"
                />
              </div>

              {/* Project Title */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Project Title (Optional)
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. AI-Based Predictive Maintenance"
                  className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8E4] rounded-xl focus:outline-none focus:border-mint-500 text-xs"
                />
              </div>

            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E2E8E4]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-mint-500 hover:bg-mint-600 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <UserCheck size={14} />
              <span>Confirm Guide Assignment</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default AdvisorAssignGuideModal;
