import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Users, ShieldCheck, Compass, BookOpen, Download, 
  Github, ExternalLink, User, Award, CheckCircle2, AlertCircle, 
  ChevronDown, X, RefreshCw, FileText, Check, Clock, Lock
} from 'lucide-react';
import { ClassTeam, AdvisorService } from '../../services/advisorService';
import { MarksService, WeeklyMarksRecord } from '../../services/marksService';
import { AdminService, AdminFaculty } from '../../services/adminService';
import { useAdvisorGuides } from '../../hooks/useQueries';
import { StudentService } from '../../services/studentService';
import { AdvisorSubmissionsService } from '../../services/advisorSubmissionsService';
import { WeeklySubmission } from '../../types';
import { getSubmissionTitle } from '../../utils/titleUtils';
import AdvisorSubmissionDetails from './AdvisorSubmissionDetails';
import { RubricEvaluationModal } from '../common/RubricEvaluationModal';

interface AdvisorStudentInspectionViewProps {
  team: ClassTeam;
  initialWeek?: number;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const AdvisorStudentInspectionView: React.FC<AdvisorStudentInspectionViewProps> = ({
  team: initialTeam,
  initialWeek = 0,
  onBack,
  onShowToast
}) => {
  const currentAcademicWeek = StudentService.getCurrentAcademicWeek();
  const availableWeeks = React.useMemo(() => {
    return [1, 2, 3, 4].filter(w => w <= Math.max(1, currentAcademicWeek));
  }, [currentAcademicWeek]);

  const [team, setTeam] = useState<ClassTeam>(initialTeam);
  const [selectedWeek, setSelectedWeek] = useState<number>(() => Math.max(1, Math.min(initialWeek, currentAcademicWeek)));

  // Marks modal state
  const [isMarksModalOpen, setIsMarksModalOpen] = useState<boolean>(false);
  const [marksInput, setMarksInput] = useState<Record<string, string>>({});
  const [advisorRemarks, setAdvisorRemarks] = useState<string>('');
  const [marksError, setMarksError] = useState<string>('');

  // Change Guide modal state
  const [isChangeGuideOpen, setIsChangeGuideOpen] = useState<boolean>(false);
  const [selectedNewGuide, setSelectedNewGuide] = useState<string>('');
  const [guideError, setGuideError] = useState<string>('');

  // Weekly marks record
  const [currentMarks, setCurrentMarks] = useState<WeeklyMarksRecord | null>(() => 
    MarksService.getWeeklyMarks(team.teamId, selectedWeek)
  );

  // Submissions (fetched canonically for the selected team)
  const teamSubmissions: WeeklySubmission[] = AdvisorSubmissionsService.getTeamSubmissions(team);
  const activeSubmission = teamSubmissions.find(s => s.week === selectedWeek) || teamSubmissions[0];

  // Reload on change
  useEffect(() => {
    const unsub = MarksService.subscribe(() => {
      setCurrentMarks(MarksService.getWeeklyMarks(team.teamId, selectedWeek));
    });
    return unsub;
  }, [team.teamId, selectedWeek]);

  useEffect(() => {
    setCurrentMarks(MarksService.getWeeklyMarks(team.teamId, selectedWeek));
  }, [team.teamId, selectedWeek]);

  const isMarksEnteredByGuide = Boolean(
    currentMarks && (
      currentMarks.teamAverage !== undefined ||
      (currentMarks.memberMarks && Object.keys(currentMarks.memberMarks).length > 0)
    ) && (
      currentMarks.gradedBy?.includes('Guide') ||
      (team?.guide && currentMarks.gradedBy === team.guide) ||
      !currentMarks.gradedBy?.includes('Advisor')
    )
  );

  // Open Rubric Marks Modal
  const handleOpenMarksModal = () => {
    setIsMarksModalOpen(true);
  };
  const { data: availableGuides = [] } = useAdvisorGuides();
 
  const handleConfirmChangeGuide = async () => {
    setGuideError('');
    if (!selectedNewGuide) {
      setGuideError('Please select a faculty guide from the dropdown.');
      return;
    }

    const res = await AdvisorService.reassignGuide(team.class, team.teamId, selectedNewGuide);
    if (!res.success) {
      setGuideError(res.message);
      return;
    }

    const updatedTeams = AdvisorService.getTeamsForClass(team.class);
    const updated = updatedTeams.find(t => t.teamId === team.teamId);
    if (updated) setTeam(updated);

    setIsChangeGuideOpen(false);
    onShowToast(res.message);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn font-sans">
      
      {/* Top Bar with Back Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-white hover:bg-[#F8F5EE] text-[#292725] font-semibold text-xs rounded-xl border border-[#D8CCBA] shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Back to Students Roster</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-xs font-bold">
            {team.teamNo} &bull; Class {team.class}
          </span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Refresh"
            className="p-2 bg-white hover:bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-[#292725] transition"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 1. Team Summary Header Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-xs border border-[#D8CCBA] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8CCBA] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-bold text-xs">
                {team.teamNo}
              </span>
              <span className="text-xs text-[#75695A] font-mono font-medium bg-[#F8F5EE] px-2.5 py-0.5 rounded-md border border-[#D8CCBA]">
                {team.teamId}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-serif font-semibold text-[#111111]">
              {team.title}
            </h2>
            <span className="text-xs text-[#75695A]">
              Batch: {team.batch} &bull; Class: {team.class} &bull; Capacity: {team.capacity || 4} Members
            </span>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#75695A] block">Status</span>
              <span className="text-sm font-semibold text-[#111111]">{team.status}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#111111] text-[#F8F5EE] flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck size={20} />
            </div>
          </div>
        </div>

        {/* Advisor & Guide quick summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-[#F8F5EE] rounded-xl border border-[#D8CCBA] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#8A6A32] flex items-center justify-center shrink-0 border border-[#D8CCBA]">
              <Compass size={18} />
            </div>
            <div>
              <span className="text-[10px] text-[#75695A] font-bold uppercase block">Designated Class Advisor</span>
              <span className="font-semibold text-[#111111] block">Class Advisor</span>
              <span className="text-[10px] text-[#75695A]">Department of CSE &bull; Section {team.class}</span>
            </div>
          </div>

          <div className="p-3.5 bg-[#F8F5EE] rounded-xl border border-[#D8CCBA] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EDE7DB] text-[#111111] flex items-center justify-center shrink-0 border border-[#D8CCBA]">
                <BookOpen size={18} />
              </div>
              <div>
                <span className="text-[10px] text-[#75695A] font-bold uppercase block">Project Technical Guide</span>
                <span className="font-semibold text-[#111111] block">{team.guide}</span>
                <span className="text-[10px] text-[#75695A]">{team.guideEmail || 'Faculty Technical Guide'}</span>
              </div>
            </div>

            {/* Change Guide Button */}
            <button
              type="button"
              onClick={() => {
                setSelectedNewGuide(team.guide);
                setGuideError('');
                setIsChangeGuideOpen(true);
              }}
              className="px-3 py-1.5 bg-white hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] rounded-xl font-semibold text-xs transition shadow-xs shrink-0 cursor-pointer"
            >
              Change Guide
            </button>
          </div>
        </div>

        {/* 2. Team Members Roster with Individual Marks */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#75695A] font-bold uppercase tracking-wider block">
              Team Members ({team.members.length}) &bull; Week {selectedWeek} Marks
            </span>
            <span className="text-[11px] text-[#75695A] font-medium">
              {currentMarks ? (
                <span className="text-[#111111] font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-[#4A5844]" />
                  <span>Team Average: {currentMarks.teamAverage} / 100</span>
                </span>
              ) : (
                <span className="text-[#8A6A32] bg-[#8A6A32]/10 px-2 py-0.5 rounded-md text-[10px] border border-[#8A6A32]/20 font-medium">
                  Week {selectedWeek} Marks Pending
                </span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {team.members.map((m) => {
              const mark = currentMarks?.memberMarks?.[m.rollNo];

              return (
                <div 
                  key={m.rollNo} 
                  className="p-3 rounded-xl bg-[#F8F5EE]/60 border border-[#D8CCBA] flex flex-col justify-between gap-1.5 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-[#111111] text-xs truncate">{m.name}</span>
                    {m.isLead && (
                      <span className="px-1.5 py-0.2 rounded bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-[9px] font-bold uppercase">
                        Lead
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#75695A] font-mono">{m.rollNo}</span>

                  <div className="pt-1.5 border-t border-[#D8CCBA]/60 flex items-center justify-between text-[11px]">
                    <span className="text-[#75695A] font-medium">W{selectedWeek} Score:</span>
                    {typeof mark === 'number' ? (
                      <span className="font-bold text-[#111111] bg-[#EDE7DB] px-2 py-0.5 rounded-lg border border-[#D8CCBA]">
                        {mark} / 100
                      </span>
                    ) : (
                      <span className="text-[#75695A] font-medium italic text-[10px]">
                        -- / 100
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. Milestone Sprint Deliverables (Week 1 to 8) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-[#D8CCBA] space-y-6">
        
        {/* Header with Sprint Weeks Selection & Assign Marks Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8CCBA] pb-4">
          <div>
            <h3 className="text-base font-serif font-semibold text-[#111111]">
              Milestone Sprint Submissions &amp; Weekly Grading
            </h3>
            <p className="text-xs text-[#75695A]">
              Inspect student deliverables and grade individual marks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Gentle Dropdown */}
            <div className="relative">
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="appearance-none pl-3.5 pr-8 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111] shadow-xs cursor-pointer"
              >
                {availableWeeks.map((w) => (
                  <option key={w} value={w}>
                    {w === 1 ? 'Project Initiation & Title: Week 1' : `Milestone Sprint: Week ${w}`}{w === currentAcademicWeek ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#75695A] pointer-events-none" />
            </div>

            {/* Assign Marks Button */}
            <button
              type="button"
              onClick={handleOpenMarksModal}
              className="px-4 py-2 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-medium text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Award size={15} />
              <span>{currentMarks ? 'Update Weekly Marks' : 'Assign Weekly Marks'}</span>
            </button>
          </div>
        </div>

        {/* Quick Week Pill Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {availableWeeks.map((w) => {
            const isCurrentWeek = w === selectedWeek;
            const wMarks = MarksService.getWeeklyMarks(team.teamId, w);

            return (
              <button
                key={w}
                type="button"
                onClick={() => setSelectedWeek(w)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isCurrentWeek
                    ? 'bg-[#111111] text-[#F8F5EE] font-semibold'
                    : 'bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#292725] border border-[#D8CCBA]'
                }`}
              >
                <span>Week {w}</span>
                {wMarks && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                    isCurrentWeek ? 'bg-[#292725] text-[#F8F5EE]' : 'bg-[#EDE7DB] text-[#111111]'
                  }`}>
                    {wMarks.teamAverage}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Week Marks Evaluation Banner (Visible to Advisor, Guide, HOD) */}
        <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#D8CCBA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#111111] text-[#F8F5EE] flex items-center justify-center font-bold shadow-xs shrink-0">
              <Award size={20} />
            </div>
            <div>
              <span className="text-[10px] text-[#75695A] font-bold uppercase tracking-wider block">
                Official Advisor Evaluation Status &bull; Week {selectedWeek}
              </span>
              <span className="font-serif font-semibold text-[#111111] text-sm">
                {currentMarks ? `Team Average Score: ${currentMarks.teamAverage} / 20` : 'No Marks Awarded Yet for this Week'}
              </span>
              {currentMarks?.gradedBy && (
                <span className="text-[10px] text-[#75695A] block mt-0.5">
                  Evaluated by: <strong className="text-[#111111]">{currentMarks.gradedBy}</strong>
                </span>
              )}
              {currentMarks?.remarks && (
                <p className="text-[#75695A] text-[11px] mt-0.5 italic">
                  &ldquo;{currentMarks.remarks}&rdquo;
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenMarksModal}
            className="px-3.5 py-1.5 bg-white hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] rounded-xl font-semibold text-xs transition shrink-0 cursor-pointer self-start sm:self-center shadow-2xs"
          >
            {currentMarks ? 'Edit Evaluation Marks' : 'Assign Rubric Marks'}
          </button>
        </div>

        {/* Complete Student Submission Details (Same format, no mock data, missing fields marked Not Submitted) */}
        <div className="bg-white rounded-2xl p-5 border border-[#D8CCBA]">
          <AdvisorSubmissionDetails
            submission={activeSubmission}
            teamTitle={team.title}
          />
        </div>

      </div>

      {/* Rubric Evaluation Modal */}
      <RubricEvaluationModal
        isOpen={isMarksModalOpen}
        onClose={() => setIsMarksModalOpen(false)}
        teamId={team.teamId}
        teamNo={team.teamNo}
        projectTitle={team.title}
        weekNumber={selectedWeek}
        members={team.members.map(m => ({ name: m.name, rollNo: m.rollNo, isLead: m.isLead }))}
        initialRubrics={currentMarks?.memberRubrics}
        initialRemarks={currentMarks?.remarks}
        evaluatorRole="advisor"
        onSuccess={(avg) => {
          onShowToast(`Evaluated & saved Review ${selectedWeek} marks for ${team.teamNo} (Average: ${avg}/20).`);
          setCurrentMarks(MarksService.getWeeklyMarks(team.teamId, selectedWeek));
        }}
      />

      {/* MODAL: Change Guide */}
      {isChangeGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#D8CCBA] overflow-hidden transform transition-all flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-[#F8F5EE] px-6 py-4 border-b border-[#D8CCBA] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center font-bold">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-semibold text-[#111111]">
                    Reassign Project Guide &bull; {team.teamNo}
                  </h3>
                  <p className="text-[11px] text-[#75695A]">
                    Max 5 teams per guide per class limit enforced
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsChangeGuideOpen(false)}
                className="text-[#75695A] hover:text-[#111111] p-2 rounded-xl hover:bg-[#EDE7DB] transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {guideError && (
                <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{guideError}</span>
                </div>
              )}

              <div className="p-3 bg-[#F8F5EE] rounded-xl border border-[#D8CCBA]">
                <span className="text-[10px] text-[#75695A] font-bold uppercase block">Current Assigned Guide:</span>
                <span className="font-semibold text-[#111111] block text-xs mt-0.5">{team.guide}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#75695A] uppercase tracking-wider mb-1.5">
                  Select New Technical Guide
                </label>
                <select
                  value={selectedNewGuide}
                  onChange={(e) => setSelectedNewGuide(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111] shadow-xs cursor-pointer"
                >
                  <option value="">Select Faculty Member...</option>
                  {availableGuides.map((g) => {
                    const assignedCount = AdvisorService.getGuideTeamCount(team.class, g.name);
                    const isCurrent = team.guide.toLowerCase() === g.name.toLowerCase();
                    const isMaxedOut = !isCurrent && assignedCount >= 5;

                    return (
                      <option key={g.id} value={g.name} disabled={isMaxedOut}>
                        {g.name} ({assignedCount}/5 teams in class) {isCurrent ? '• [Current]' : isMaxedOut ? '• [MAX 5 REACHED]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="bg-[#F8F5EE] px-6 py-4 border-t border-[#D8CCBA] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsChangeGuideOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#292725] hover:text-[#111111] bg-white border border-[#D8CCBA] rounded-xl hover:bg-[#EDE7DB] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmChangeGuide}
                className="px-5 py-2 text-xs font-medium text-[#F8F5EE] bg-[#111111] hover:bg-[#292725] rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Confirm Guide Change</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdvisorStudentInspectionView;
