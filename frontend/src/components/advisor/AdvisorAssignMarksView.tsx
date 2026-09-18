import React, { useState, useEffect } from 'react';
import { 
  Award, Check, RefreshCw, AlertCircle, ChevronDown, CheckCircle2,
  FileCode, FileText, Github, ExternalLink, Clock, Layers
} from 'lucide-react';
import { AdvisorService, ClassTeam } from '../../services/advisorService';
import { MarksService } from '../../services/marksService';
import { AdvisorHistoryService } from '../../services/advisorHistoryService';
import { AdvisorSubmissionsService } from '../../services/advisorSubmissionsService';
import { StudentService } from '../../services/studentService';
import { WeeklySubmission } from '../../types';

interface AdvisorAssignMarksViewProps {
  className: string;
  advisorName: string;
  selectedTeamId?: string | null;
  onShowToast: (msg: string) => void;
}

export const AdvisorAssignMarksView: React.FC<AdvisorAssignMarksViewProps> = ({
  className,
  advisorName,
  selectedTeamId,
  onShowToast
}) => {
  const currentAcademicWeek = StudentService.getCurrentAcademicWeek();
  const [teams, setTeams] = useState<ClassTeam[]>(() => 
    AdvisorService.getTeamsForClass(className)
  );

  // Active selected team (defaults to prop selectedTeamId or first team)
  const [activeTeamId, setActiveTeamId] = useState<string>(() => 
    selectedTeamId || teams[0]?.teamId || ''
  );

  const [selectedWeek, setSelectedWeek] = useState<number>(currentAcademicWeek);
  const [marksInput, setMarksInput] = useState<Record<string, string>>({});
  const [advisorRemarks, setAdvisorRemarks] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    return AdvisorService.subscribe(() => {
      setTeams(AdvisorService.getTeamsForClass(className));
    });
  }, [className]);

  useEffect(() => {
    if (selectedTeamId) {
      setActiveTeamId(selectedTeamId);
    }
  }, [selectedTeamId]);

  const activeTeam = activeTeamId
    ? teams.find(t => t.teamId === activeTeamId)
    : teams[0];
  const teamSubmissions: WeeklySubmission[] = activeTeam
    ? AdvisorSubmissionsService.getTeamSubmissions(activeTeam)
    : [];
  const submissionWeeksKey = teamSubmissions.map(s => s.week).join('|');

  useEffect(() => {
    if (teamSubmissions.length > 0 && !teamSubmissions.some(s => s.week === selectedWeek)) {
      setSelectedWeek(teamSubmissions[0].week);
    }
  }, [activeTeam?.teamId, selectedWeek, submissionWeeksKey]);

  const activeSubmission = activeTeam
    ? AdvisorSubmissionsService.getSubmissionForWeek(activeTeam, selectedWeek) || teamSubmissions[0]
    : undefined;
  const activeMemberRollsKey = activeTeam?.members.map(m => m.rollNo).join('|') || '';

  // Load existing marks for active team and week
  useEffect(() => {
    if (!activeTeam) return;
    const existing = MarksService.getWeeklyMarks(activeTeam.teamId, selectedWeek);
    const initialInputs: Record<string, string> = {};
    activeTeam.members.forEach(m => {
      if (existing && existing.memberMarks[m.rollNo] !== undefined) {
        initialInputs[m.rollNo] = String(existing.memberMarks[m.rollNo]);
      } else {
        initialInputs[m.rollNo] = '';
      }
    });
    setMarksInput(initialInputs);
    setAdvisorRemarks(existing?.remarks || '');
    setErrorMessage('');
  }, [activeTeam?.teamId, activeMemberRollsKey, selectedWeek]);

  // Compute live team average
  const currentAverage = (() => {
    const values = Object.values(marksInput)
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v) && v >= 1 && v <= 100);
    if (values.length === 0) return null;
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / values.length) * 10) / 10;
  })();

  const handleSaveMarks = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!activeTeam) return;

    const parsedMarks: Record<string, number> = {};
    for (const m of activeTeam.members) {
      const raw = marksInput[m.rollNo];
      if (raw === undefined || raw === '') {
        setErrorMessage(`Please enter marks for ${m.name} (${m.rollNo}).`);
        return;
      }
      const num = parseFloat(raw);
      if (isNaN(num) || num < 1 || num > 100) {
        setErrorMessage(`Marks for ${m.name} must be a number between 1 and 100.`);
        return;
      }
      parsedMarks[m.rollNo] = num;
    }

    const record = MarksService.saveWeeklyMarks(
      activeTeam.teamId,
      selectedWeek,
      parsedMarks,
      advisorRemarks,
      advisorName
    );

    // Log history
    AdvisorHistoryService.addLog(
      className,
      'Marks Evaluation',
      `${activeTeam.teamNo} (Week ${selectedWeek})`,
      `Evaluated individual marks for ${activeTeam.members.length} students. Calculated Team Average: ${record.teamAverage}/100.`,
      advisorName
    );

    onShowToast(`Successfully saved Week ${selectedWeek} marks for ${activeTeam.teamNo} (Average: ${record.teamAverage}/100).`);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#D8CCBA] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-serif font-semibold text-[#111111]">
              Advisor: {advisorName} &bull; Milestone Marks Evaluation
            </h2>
            <span className="text-xs text-[#292725] bg-[#F8F5EE] border border-[#D8CCBA] px-2.5 py-0.5 rounded-full font-medium">
              Class {className}
            </span>
          </div>
          <p className="text-xs text-[#75695A] mt-0.5">
                Select a team and milestone week below to review project work, assign individual marks, and save advisor feedback.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          title="Refresh Page"
          className="p-2 bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#292725] border border-[#D8CCBA] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 shadow-xs self-start sm:self-center"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Select Team Quick Bar */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-[#75695A] uppercase tracking-wider">
          1. Select Capstone Team ({teams.length} Teams Available)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {teams.map((t) => {
            const isSelected = activeTeam?.teamId === t.teamId;
            const wMarks = MarksService.getWeeklyMarks(t.teamId, selectedWeek);

            return (
              <button
                key={t.teamId}
                type="button"
                onClick={() => setActiveTeamId(t.teamId)}
                className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 shadow-xs ${
                  isSelected
                    ? 'bg-[#F8F5EE] border-[#111111] ring-1 ring-[#111111]'
                    : 'bg-white border-[#D8CCBA] hover:bg-[#F8F5EE]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="px-2 py-0.5 rounded-lg bg-[#EDE7DB] text-[#111111] font-semibold text-xs">
                    {t.teamNo}
                  </span>
                  {wMarks ? (
                    <span className="text-[10px] font-bold text-[#292725] bg-[#F8F5EE] border border-[#D8CCBA] px-1.5 py-0.5 rounded">
                      Avg: {wMarks.teamAverage}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#75695A] font-medium italic">
                      Ungraded
                    </span>
                  )}
                </div>

                <div className="font-semibold text-[#111111] text-xs truncate">
                  {t.title || <span className="text-[#75695A] italic font-normal">Pending Title</span>}
                </div>

                <div className="text-[10px] text-[#75695A] truncate">
                  Guide: {t.guide}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grading Workspace Card */}
      {activeTeam && (
        <form onSubmit={handleSaveMarks} className="bg-white rounded-2xl p-6 sm:p-7 border border-[#D8CCBA] shadow-xs space-y-6 animate-fadeIn">
          
          {/* Header of Active Team */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8CCBA] pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-1 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-bold text-xs">
                  {activeTeam.teamNo}
                </span>
                <span className="text-xs text-[#75695A] font-mono font-medium bg-[#F8F5EE] px-2.5 py-0.5 rounded-md border border-[#D8CCBA]">
                  {activeTeam.teamId}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-serif font-semibold text-[#111111]">
                {activeTeam.title || <span className="text-[#75695A] italic font-normal">Pending Student Project Title Submission</span>}
              </h3>
              <p className="text-xs text-[#75695A]">
                Class {activeTeam.class} &bull; Guide: <strong className="text-[#292725]">{activeTeam.guide}</strong>
              </p>
            </div>

            {/* Week Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="sprintWeekSelect" className="text-xs font-semibold text-[#75695A] whitespace-nowrap">
                Milestone Week:
              </label>
              <div className="relative">
                <select
                  id="sprintWeekSelect"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="appearance-none pl-3.5 pr-8 py-2 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#111111] shadow-xs cursor-pointer"
                >
                  {Array.from({ length: currentAcademicWeek + 1 }, (_, i) => i).map((w) => (
                    <option key={w} value={w}>
                      {w === 0 ? 'Week 0: Project Initiation & Title Proposal' : `Week ${w} Milestone${w === currentAcademicWeek ? ' (Current)' : ''}`}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#75695A] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Existing Project Details and Work */}
          <div className="rounded-2xl bg-[#F8F5EE] border border-[#D8CCBA] p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#D8CCBA] pb-3">
              <div>
                <h4 className="text-sm font-serif font-semibold text-[#111111] flex items-center gap-2">
                  <Layers size={16} className="text-[#292725]" />
                  <span>Existing Project Details &amp; Work</span>
                </h4>
                <p className="text-[11px] text-[#75695A] mt-0.5">
                  These details are pulled from the selected team's current project and submission records.
                </p>
              </div>
              {activeSubmission && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-[#D8CCBA] text-[10px] font-bold text-[#292725] flex items-center gap-1.5 self-start">
                  <Clock size={12} />
                  <span>Week {activeSubmission.week}: {activeSubmission.status}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white border border-[#D8CCBA]">
                <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
                  Project Title
                </span>
                <p className="font-semibold text-[#111111] leading-relaxed">
                  {activeSubmission?.projectTitle || activeTeam.title}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-[#D8CCBA]">
                <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
                  Team and Guide
                </span>
                <p className="font-semibold text-[#111111] leading-relaxed">
                  {activeTeam.teamNo} &bull; {activeTeam.guide}
                </p>
              </div>
            </div>

            {activeSubmission ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
                      Problem Statement
                    </span>
                    <div className="p-3.5 rounded-xl bg-white border border-[#D8CCBA] text-[#292725] leading-relaxed min-h-20">
                      {activeSubmission.problemStatement || 'No problem statement recorded for this milestone.'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
                      Proposed Solution / Work
                    </span>
                    <div className="p-3.5 rounded-xl bg-white border border-[#D8CCBA] text-[#292725] leading-relaxed min-h-20">
                      {activeSubmission.solution || activeSubmission.abstract || 'No solution or work summary recorded for this milestone.'}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
                    Technology / Implementation Notes
                  </span>
                  <div className="p-3.5 rounded-xl bg-white border border-[#D8CCBA] text-[#292725] leading-relaxed">
                    {activeSubmission.technologyUsed || 'No technology details recorded for this milestone.'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-white border border-[#D8CCBA] flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-[#75695A] shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#75695A] block">Presentation</span>
                      <span className="font-semibold text-[#111111] truncate block">
                        {activeSubmission.presentationFile || activeSubmission.fileName || 'Not uploaded'}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#D8CCBA] flex items-center gap-2 min-w-0">
                    <FileCode size={16} className="text-[#75695A] shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#75695A] block">Report</span>
                      <span className="font-semibold text-[#111111] truncate block">
                        {activeSubmission.pdfFile || 'Not uploaded'}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#D8CCBA] flex items-center gap-2 min-w-0">
                    <Github size={16} className="text-[#75695A] shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#75695A] block">Repository</span>
                      {activeSubmission.repoUrl ? (
                        <a href={activeSubmission.repoUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#111111] truncate block underline">
                          {activeSubmission.repoUrl}
                        </a>
                      ) : (
                        <span className="font-semibold text-[#111111] truncate block">Not uploaded</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#D8CCBA] flex items-center gap-2 min-w-0">
                    <ExternalLink size={16} className="text-[#75695A] shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#75695A] block">Demo</span>
                      {activeSubmission.demoUrl ? (
                        <a href={activeSubmission.demoUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#111111] truncate block underline">
                          {activeSubmission.demoUrl}
                        </a>
                      ) : (
                        <span className="font-semibold text-[#111111] truncate block">Not uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-white border border-dashed border-[#D8CCBA] rounded-xl text-xs text-[#75695A]">
                No submitted milestone work is currently recorded for this selected team. The team roster and project title above are still available for evaluation context.
              </div>
            )}
          </div>

          {/* Quick Week Pill Buttons (Only up to current academic week) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {Array.from({ length: currentAcademicWeek + 1 }, (_, i) => i).map((w) => {
              const isCurrent = w === selectedWeek;
              const wMarks = MarksService.getWeeklyMarks(activeTeam.teamId, w);

              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedWeek(w)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-[#111111] text-[#F8F5EE] font-semibold'
                      : 'bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#292725] border border-[#D8CCBA]'
                  }`}
                >
                  <span>Week {w}</span>
                  {wMarks && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                      isCurrent ? 'bg-[#292725] text-[#F8F5EE]' : 'bg-[#EDE7DB] text-[#111111]'
                    }`}>
                      {wMarks.teamAverage}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Calculated Team Average Banner */}
          <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#D8CCBA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#111111] text-[#F8F5EE] flex items-center justify-center font-bold shadow-xs shrink-0">
                <Award size={20} />
              </div>
              <div>
                <span className="text-[10px] text-[#75695A] font-bold uppercase tracking-wider block">
                  Official Advisor Milestone Score &bull; Week {selectedWeek}
                </span>
                <span className="font-serif font-semibold text-[#111111] text-sm">
                  {currentAverage !== null ? `Calculated Team Average: ${currentAverage} / 100` : 'Enter Individual Marks Below'}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[#75695A] italic">
              Marks visible to Guide, Advisor, and HOD (strictly hidden from students).
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2 text-xs">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 2. Team Members Individual Marks Input Cards */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-[#75695A] uppercase tracking-wider">
              2. Enter Individual Student Marks (1 - 100)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeTeam.members.map((m) => (
                <div 
                  key={m.rollNo}
                  className="p-4 rounded-xl bg-[#F8F5EE]/60 border border-[#D8CCBA] flex items-center justify-between gap-3 shadow-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#111111] text-xs">{m.name}</span>
                      {m.isLead && (
                        <span className="px-1.5 py-0.2 rounded bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-[9px] font-bold uppercase">
                          Lead
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#75695A] font-mono block mt-0.5">{m.rollNo}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="1-100"
                      value={marksInput[m.rollNo] || ''}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        if (nextValue === '') {
                          setMarksInput({ ...marksInput, [m.rollNo]: nextValue });
                          return;
                        }
                        const nextNumber = Number(nextValue);
                        if (!Number.isNaN(nextNumber) && nextNumber >= 1 && nextNumber <= 100) {
                          setMarksInput({ ...marksInput, [m.rollNo]: nextValue });
                        }
                      }}
                      className="w-20 px-3 py-2 bg-white border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111] text-center focus:outline-none focus:border-[#111111] shadow-xs"
                    />
                    <span className="text-[#75695A] font-medium text-xs">/ 100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Advisor Remarks */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#75695A] uppercase tracking-wider">
              Advisor Comments / Feedback for This Team and Project (Optional)
            </label>
            <textarea
              rows={3}
              value={advisorRemarks}
              onChange={(e) => setAdvisorRemarks(e.target.value)}
              placeholder="e.g. Robust telemetry verified with low latency response. Documented edge inference benchmarks thoroughly..."
              className="w-full p-3.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs focus:outline-none focus:border-[#111111] text-[#111111] placeholder-[#75695A]/60 shadow-xs"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-[#D8CCBA] flex items-center justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-medium text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Check size={16} />
              <span>Save &amp; Update Week {selectedWeek} Marks</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
};

export default AdvisorAssignMarksView;
