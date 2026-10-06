 import React, { useState, useEffect } from 'react';
import { X, Award, CheckCircle2, Save, Loader2, AlertCircle, Info, User } from 'lucide-react';
import { MemberRubricScore, MemberRubricsMap } from '../../types';
import { ApiClient } from '../../services/apiClient';
import { MarksService } from '../../services/marksService';

export interface RubricMember {
  name: string;
  rollNo: string;
  isLead?: boolean;
}

export interface RubricEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamNo: string;
  projectTitle?: string;
  weekNumber: number;
  members: RubricMember[];
  initialRubrics?: MemberRubricsMap;
  initialRemarks?: string;
  evaluatorRole: 'guide' | 'advisor' | 'hod';
  evaluatorName?: string;
  onSuccess?: (teamAverage: number, rubrics: MemberRubricsMap) => void;
}

export const RubricEvaluationModal: React.FC<RubricEvaluationModalProps> = ({
  isOpen,
  onClose,
  teamId,
  teamNo,
  projectTitle,
  weekNumber,
  members,
  initialRubrics,
  initialRemarks = '',
  evaluatorRole,
  evaluatorName,
  onSuccess,
}) => {
  const [rubrics, setRubrics] = useState<MemberRubricsMap>({});
  const [remarks, setRemarks] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Determine evaluator display title
  const gradedByTitle = evaluatorName
    ? `${evaluatorName} (${evaluatorRole === 'guide' ? 'Faculty Guide' : evaluatorRole === 'advisor' ? 'Class Advisor' : 'HOD / CSE'})`
    : evaluatorRole === 'guide'
    ? 'Faculty Guide'
    : evaluatorRole === 'advisor'
    ? 'Class Advisor'
    : 'HOD / CSE';

  // Synchronize initial data whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setSuccessMsg('');
    setRemarks(initialRemarks || '');

    // Initialize each member's rubric
    const newRubrics: MemberRubricsMap = {};
    const existing = initialRubrics || MarksService.getWeeklyMarks(teamId, weekNumber, members.map(m => m.rollNo))?.memberRubrics;

    members.forEach(m => {
      const rno = m.rollNo.trim();
      if (existing && existing[rno]) {
        const item = existing[rno];
        newRubrics[rno] = {
          systemDesign: Number(item.systemDesign ?? 0),
          presentationInteraction: Number(item.presentationInteraction ?? 0),
          technicalSkills: Number(item.technicalSkills ?? 0),
          implementationProgress: Number(item.implementationProgress ?? 0),
          total: Number(item.total ?? (
            (item.systemDesign ?? 0) +
            (item.presentationInteraction ?? 0) +
            (item.technicalSkills ?? 0) +
            (item.implementationProgress ?? 0)
          )),
        };
      } else {
        newRubrics[rno] = {
          systemDesign: 0,
          presentationInteraction: 0,
          technicalSkills: 0,
          implementationProgress: 0,
          total: 0,
        };
      }
    });

    setRubrics(newRubrics);
  }, [isOpen, teamId, weekNumber, members, initialRubrics, initialRemarks]);

  if (!isOpen) return null;

  // Handle score change for a specific criterion of a member
  const handleScoreChange = (
    rollNo: string,
    field: keyof Omit<MemberRubricScore, 'total'>,
    value: string
  ) => {
    const num = Math.max(0, Math.min(5, parseFloat(value) || 0));
    setRubrics(prev => {
      const current = prev[rollNo] || {
        systemDesign: 0,
        presentationInteraction: 0,
        technicalSkills: 0,
        implementationProgress: 0,
        total: 0,
      };
      const updated = {
        ...current,
        [field]: num,
      };
      const newTotal = Math.round(
        (updated.systemDesign +
          updated.presentationInteraction +
          updated.technicalSkills +
          updated.implementationProgress) * 10
      ) / 10;
      return {
        ...prev,
        [rollNo]: {
          ...updated,
          total: newTotal,
        },
      };
    });
  };

  // Quick fill all criteria for a member
  const handleQuickFill = (rollNo: string, val: number) => {
    setRubrics(prev => ({
      ...prev,
      [rollNo]: {
        systemDesign: val,
        presentationInteraction: val,
        technicalSkills: val,
        implementationProgress: val,
        total: Math.round(val * 4 * 10) / 10,
      },
    }));
  };

  // Auto-calculated team average
  const totalScores = Object.values(rubrics).map(r => r.total || 0);
  const teamAverage =
    totalScores.length > 0
      ? Math.round((totalScores.reduce((acc, curr) => acc + curr, 0) / totalScores.length) * 10) / 10
      : 0;

  // Submit handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Backend API persistence
      await ApiClient.saveWeeklyMarks(
        teamId,
        weekNumber,
        rubrics,
        remarks,
        gradedByTitle
      );

      // 2. Optimistic local cache update
      MarksService.saveWeeklyMarks(
        teamId,
        weekNumber,
        rubrics,
        remarks,
        gradedByTitle,
        rubrics
      );

      setSuccessMsg('Rubric marks successfully saved and synchronized across all portals!');
      if (onSuccess) {
        onSuccess(teamAverage, rubrics);
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to save rubric marks:', err);
      // Fallback local update if network glitch
      MarksService.saveWeeklyMarks(
        teamId,
        weekNumber,
        rubrics,
        remarks,
        gradedByTitle,
        rubrics
      );
      if (onSuccess) {
        onSuccess(teamAverage, rubrics);
      }
      setErrorMsg(err?.message || 'Warning: Server responded with error, but marks saved locally.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
      <div
        className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-[#D8CCBA] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Header */}
        <div className="bg-[#F8F5EE] px-6 py-4 border-b border-[#D8CCBA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#111111] text-[#F8F5EE] flex items-center justify-center font-bold shadow-xs">
              <Award size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-serif font-bold text-[#111111]">
                  Review {weekNumber} Evaluation Rubric
                </h3>
                <span className="px-2.5 py-0.5 rounded-lg bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] font-extrabold text-xs">
                  {teamNo}
                </span>
              </div>
              <p className="text-xs text-[#75695A] truncate max-w-md">
                {projectTitle || 'Project Milestone Evaluation'} &bull; Evaluator:{' '}
                <strong className="text-[#111111]">{gradedByTitle}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="text-[#75695A] hover:text-[#111111] p-1.5 rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Scrollable Table of Members */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
            {/* Criteria Info Banner */}
            <div className="flex items-start gap-2.5 p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-[11px] text-amber-950">
              <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Official Evaluation Rubric (Total 20 Marks):</span>
                Award marks individually for every team member across 4 criteria (max 5 each):{' '}
                <strong>System Design (5)</strong>, <strong>Presentation &amp; Interaction (5)</strong>,{' '}
                <strong>Technical Skills (5)</strong>, and <strong>Implementation Progress (5)</strong>.
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Rubric Evaluation Table matching user specification */}
            <div className="border border-[#D8CCBA] rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#EDE7DB] text-[#111111] font-bold border-b border-[#D8CCBA] text-[11px]">
                    <tr>
                      <th className="p-3.5 min-w-[180px]">Student Member</th>
                      <th className="p-3.5 text-center min-w-[120px]">
                        System Design <span className="block text-[10px] text-[#75695A]">(5)</span>
                      </th>
                      <th className="p-3.5 text-center min-w-[130px]">
                        Presentation &amp; Interaction <span className="block text-[10px] text-[#75695A]">(5)</span>
                      </th>
                      <th className="p-3.5 text-center min-w-[120px]">
                        Technical Skills <span className="block text-[10px] text-[#75695A]">(5)</span>
                      </th>
                      <th className="p-3.5 text-center min-w-[130px]">
                        Implementation Progress <span className="block text-[10px] text-[#75695A]">(5)</span>
                      </th>
                      <th className="p-3.5 text-center min-w-[90px] bg-[#E5DEC9]">
                        Total <span className="block text-[10px] text-[#75695A]">(20)</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8CCBA] bg-white">
                    {members.map((m) => {
                      const rno = m.rollNo.trim();
                      const score = rubrics[rno] || {
                        systemDesign: 0,
                        presentationInteraction: 0,
                        technicalSkills: 0,
                        implementationProgress: 0,
                        total: 0,
                      };

                      return (
                        <tr key={rno} className="hover:bg-[#F8F5EE]/60 transition-colors">
                          {/* Student Info */}
                          <td className="p-3.5 align-middle">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-[#F8F5EE] border border-[#D8CCBA] text-[#111111] flex items-center justify-center font-bold text-[10px] shrink-0">
                                <User size={13} />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-[#111111] block truncate text-xs">
                                  {m.name}
                                </span>
                                <span className="font-mono text-[10px] text-[#75695A]">
                                  {m.rollNo} {m.isLead && <span className="text-amber-800 font-bold">&bull; Lead</span>}
                                </span>
                              </div>
                            </div>
                            {/* Quick fill buttons */}
                            <div className="flex items-center gap-1 mt-1 text-[9px] text-[#75695A]">
                              <span>Quick:</span>
                              {[5, 4, 3].map(v => (
                                <button
                                  type="button"
                                  key={v}
                                  onClick={() => handleQuickFill(rno, v)}
                                  className="px-1 py-0.5 rounded bg-[#EDE7DB] hover:bg-[#D8CCBA] text-[#111111] font-bold cursor-pointer transition"
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          </td>

                          {/* 1. System Design (5) */}
                          <td className="p-3.5 text-center align-middle">
                            <input
                              type="number"
                              min={0}
                              max={5}
                              step={0.5}
                              value={score.systemDesign}
                              onChange={(e) => handleScoreChange(rno, 'systemDesign', e.target.value)}
                              className="w-16 px-2 py-1.5 text-center font-bold text-xs bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-[#111111] focus:outline-none focus:border-[#111111] focus:bg-white transition"
                            />
                            <span className="block text-[10px] text-[#75695A] mt-0.5">/ 5</span>
                          </td>

                          {/* 2. Presentation & Interaction (5) */}
                          <td className="p-3.5 text-center align-middle">
                            <input
                              type="number"
                              min={0}
                              max={5}
                              step={0.5}
                              value={score.presentationInteraction}
                              onChange={(e) => handleScoreChange(rno, 'presentationInteraction', e.target.value)}
                              className="w-16 px-2 py-1.5 text-center font-bold text-xs bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-[#111111] focus:outline-none focus:border-[#111111] focus:bg-white transition"
                            />
                            <span className="block text-[10px] text-[#75695A] mt-0.5">/ 5</span>
                          </td>

                          {/* 3. Technical Skills (5) */}
                          <td className="p-3.5 text-center align-middle">
                            <input
                              type="number"
                              min={0}
                              max={5}
                              step={0.5}
                              value={score.technicalSkills}
                              onChange={(e) => handleScoreChange(rno, 'technicalSkills', e.target.value)}
                              className="w-16 px-2 py-1.5 text-center font-bold text-xs bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-[#111111] focus:outline-none focus:border-[#111111] focus:bg-white transition"
                            />
                            <span className="block text-[10px] text-[#75695A] mt-0.5">/ 5</span>
                          </td>

                          {/* 4. Implementation Progress (5) */}
                          <td className="p-3.5 text-center align-middle">
                            <input
                              type="number"
                              min={0}
                              max={5}
                              step={0.5}
                              value={score.implementationProgress}
                              onChange={(e) => handleScoreChange(rno, 'implementationProgress', e.target.value)}
                              className="w-16 px-2 py-1.5 text-center font-bold text-xs bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-[#111111] focus:outline-none focus:border-[#111111] focus:bg-white transition"
                            />
                            <span className="block text-[10px] text-[#75695A] mt-0.5">/ 5</span>
                          </td>

                          {/* 5. Total (20) */}
                          <td className="p-3.5 text-center align-middle bg-[#FAF8F4]">
                            <span
                              className={`px-3 py-1 rounded-xl font-black text-xs inline-block border shadow-2xs ${
                                score.total >= 18
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : score.total >= 15
                                  ? 'bg-teal-100 text-teal-900 border-teal-300'
                                  : score.total >= 10
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-rose-100 text-rose-900 border-rose-300'
                              }`}
                            >
                              {score.total} <span className="text-[10px] font-bold">/ 20</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Team Calculated Average Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-[#F8F5EE] rounded-2xl border border-[#D8CCBA] gap-3">
              <div>
                <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block">
                  Team Calculated Average Score (Review {weekNumber})
                </span>
                <span className="text-xl font-bold font-serif text-[#111111]">
                  {teamAverage} <span className="text-xs text-[#75695A] font-sans font-bold">/ 20</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-[#75695A] block">
                  Status: {teamAverage > 0 ? (
                    <span className="text-emerald-700 font-extrabold">Evaluated</span>
                  ) : (
                    <span className="text-amber-800 font-extrabold">Pending Evaluation</span>
                  )}
                </span>
                <span className="text-[10px] text-[#75695A]">
                  Evaluation recorded by {gradedByTitle}
                </span>
              </div>
            </div>

            {/* Evaluative Feedback / Remarks Textarea */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Evaluation Remarks &amp; Feedback:
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Specify constructive feedback, technical strengths, and areas for improvement..."
                className="w-full px-3.5 py-2.5 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#111111] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="bg-[#F8F5EE] px-6 py-3.5 border-t border-[#D8CCBA] flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[#75695A]">
              Changes synchronize instantly across Guide, Advisor, and HOD portals.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-[#75695A] hover:text-[#111111] bg-white border border-[#D8CCBA] rounded-xl hover:bg-[#EDE7DB] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-[#111111] hover:bg-[#292725] disabled:opacity-60 disabled:cursor-not-allowed text-[#F8F5EE] font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Save Evaluation Marks</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RubricEvaluationModal;
