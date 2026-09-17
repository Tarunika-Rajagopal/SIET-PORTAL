import React, { useState, useEffect } from 'react';
import { 
  Award, Check, RefreshCw, AlertCircle, ChevronDown, CheckCircle2,
  Users, User, BookOpen
} from 'lucide-react';
import { AdvisorService, ClassTeam } from '../../services/advisorService';
import { MarksService, WeeklyMarksRecord } from '../../services/marksService';
import { AdvisorHistoryService } from '../../services/advisorHistoryService';

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
  const [teams, setTeams] = useState<ClassTeam[]>(() => 
    AdvisorService.getTeamsForClass(className)
  );

  // Active selected team (defaults to prop selectedTeamId or first team)
  const [activeTeamId, setActiveTeamId] = useState<string>(() => 
    selectedTeamId || teams[0]?.teamId || ''
  );

  const [selectedWeek, setSelectedWeek] = useState<number>(1);
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

  const activeTeam = teams.find(t => t.teamId === activeTeamId) || teams[0];

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
  }, [activeTeam?.teamId, selectedWeek]);

  // Compute live team average
  const currentAverage = (() => {
    const values = Object.values(marksInput)
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v) && v >= 0 && v <= 100);
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
      if (isNaN(num) || num < 0 || num > 100) {
        setErrorMessage(`Marks for ${m.name} must be a number between 0 and 100.`);
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
      
      {/* Top Header Card (Clean - No approved batch) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-card border border-[#E2E8E4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Advisor: {advisorName} &bull; Milestone Marks Evaluation
            </h2>
            <span className="text-xs text-mint-800 bg-mint-100 border border-mint-200 px-2.5 py-0.5 rounded-full font-bold">
              Class {className}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a team and milestone week below to assign individual marks. Team average is computed automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          title="Refresh Page"
          className="p-2 bg-[#EFF3F1] hover:bg-[#E2E8E4] text-slate-600 border border-[#E2E8E4] rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 shadow-2xs self-start sm:self-center"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Select Team Quick Bar */}
      <div className="space-y-2">
        <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
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
                className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 shadow-2xs ${
                  isSelected
                    ? 'bg-mint-50 border-mint-500 ring-2 ring-mint-400/40 shadow-sm'
                    : 'bg-white border-[#E2E8E4] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="px-2 py-0.5 rounded-lg bg-mint-100 text-mint-900 font-black text-xs">
                    {t.teamNo}
                  </span>
                  {wMarks ? (
                    <span className="text-[10px] font-black text-mint-800 bg-mint-100/80 px-1.5 py-0.2 rounded">
                      Avg: {wMarks.teamAverage}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold italic">
                      Ungraded
                    </span>
                  )}
                </div>

                <div className="font-extrabold text-slate-900 text-xs truncate">
                  {t.title}
                </div>

                <div className="text-[10px] text-slate-400 truncate">
                  Guide: {t.guide}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grading Workspace Card */}
      {activeTeam && (
        <form onSubmit={handleSaveMarks} className="bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-[#E2E8E4] space-y-6 animate-fadeIn">
          
          {/* Header of Active Team */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E4] pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-1 rounded-xl bg-mint-100 text-mint-900 border border-mint-200 font-black text-xs">
                  {activeTeam.teamNo}
                </span>
                <span className="text-xs text-slate-500 font-mono font-bold bg-slate-100 px-2.5 py-0.5 rounded-md">
                  {activeTeam.teamId}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                {activeTeam.title}
              </h3>
              <p className="text-xs text-slate-500">
                Class {activeTeam.class} &bull; Guide: <strong>{activeTeam.guide}</strong>
              </p>
            </div>

            {/* Week Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="sprintWeekSelect" className="text-xs font-bold text-slate-600 whitespace-nowrap">
                Milestone Week:
              </label>
              <div className="relative">
                <select
                  id="sprintWeekSelect"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="appearance-none pl-3.5 pr-8 py-2 bg-[#EFF3F1] border border-[#E2E8E4] rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:border-mint-500 shadow-xs cursor-pointer"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
                    <option key={w} value={w}>
                      {w === 0 ? 'Week 0: Project Initiation & Title Proposal' : `Week ${w} Milestone`}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick Week Pill Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((w) => {
              const isCurrent = w === selectedWeek;
              const wMarks = MarksService.getWeeklyMarks(activeTeam.teamId, w);

              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedWeek(w)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-mint-500 text-white shadow-xs font-extrabold'
                      : 'bg-slate-100 hover:bg-mint-50 text-slate-700 border border-[#E2E8E4]'
                  }`}
                >
                  <span>Week {w}</span>
                  {wMarks && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                      isCurrent ? 'bg-white text-mint-900' : 'bg-mint-200 text-mint-900'
                    }`}>
                      {wMarks.teamAverage}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Calculated Team Average Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-mint-50 to-emerald-50 border border-mint-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-mint-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Award size={20} />
              </div>
              <div>
                <span className="text-[10px] text-mint-800 font-extrabold uppercase tracking-wider block">
                  Official Advisor Milestone Score &bull; Week {selectedWeek}
                </span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {currentAverage !== null ? `Calculated Team Average: ${currentAverage} / 100` : 'Enter Individual Marks Below'}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 italic">
              Marks visible to Guide, Advisor, and HOD (strictly hidden from students).
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold flex items-center gap-2 text-xs">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 2. Team Members Individual Marks Input Cards */}
          <div className="space-y-3">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              2. Enter Individual Student Marks (0 - 100)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeTeam.members.map((m) => (
                <div 
                  key={m.rollNo}
                  className="p-4 rounded-2xl bg-slate-50 border border-[#E2E8E4] flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900 text-xs">{m.name}</span>
                      {m.isLead && (
                        <span className="px-1.5 py-0.2 rounded bg-mint-100 text-mint-900 text-[9px] font-black uppercase">
                          Lead
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{m.rollNo}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0-100"
                      value={marksInput[m.rollNo] || ''}
                      onChange={(e) => setMarksInput({ ...marksInput, [m.rollNo]: e.target.value })}
                      className="w-20 px-3 py-2 bg-white border border-[#E2E8E4] rounded-xl text-xs font-black text-slate-900 text-center focus:outline-none focus:border-mint-500 shadow-2xs"
                    />
                    <span className="text-slate-400 font-bold text-xs">/ 100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Advisor Remarks */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              3. Evaluation Remarks &amp; Technical Milestone Critique (Optional)
            </label>
            <textarea
              rows={3}
              value={advisorRemarks}
              onChange={(e) => setAdvisorRemarks(e.target.value)}
              placeholder="e.g. Robust telemetry verified with low latency response. Documented edge inference benchmarks thoroughly..."
              className="w-full p-3.5 bg-[#EFF3F1]/70 border border-[#E2E8E4] rounded-2xl text-xs focus:outline-none focus:border-mint-500 text-slate-800 placeholder-slate-400 shadow-2xs"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-[#E2E8E4] flex items-center justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-mint-500 hover:bg-mint-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
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
