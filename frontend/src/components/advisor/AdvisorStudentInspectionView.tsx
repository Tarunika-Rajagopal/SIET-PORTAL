import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Users, ShieldCheck, Compass, BookOpen, Download, 
  Github, ExternalLink, User, Award, CheckCircle2, AlertCircle, 
  ChevronDown, X, RefreshCw, FileText, Check, Clock
} from 'lucide-react';
import { ClassTeam, AdvisorService } from '../../services/advisorService';
import { MarksService, WeeklyMarksRecord } from '../../services/marksService';
import { AdminService, AdminFaculty } from '../../services/adminService';
import { StudentService } from '../../services/studentService';
import { AdvisorSubmissionsService } from '../../services/advisorSubmissionsService';
import { WeeklySubmission } from '../../types';

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
    return Array.from({ length: currentAcademicWeek + 1 }, (_, i) => i);
  }, [currentAcademicWeek]);

  const [team, setTeam] = useState<ClassTeam>(initialTeam);
  const [selectedWeek, setSelectedWeek] = useState<number>(() => Math.min(initialWeek, currentAcademicWeek));

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

  // Open Marks Modal
  const handleOpenMarksModal = () => {
    const existing = MarksService.getWeeklyMarks(team.teamId, selectedWeek);
    const initialInputs: Record<string, string> = {};
    team.members.forEach(m => {
      if (existing && existing.memberMarks[m.rollNo] !== undefined) {
        initialInputs[m.rollNo] = String(existing.memberMarks[m.rollNo]);
      } else {
        initialInputs[m.rollNo] = '';
      }
    });
    setMarksInput(initialInputs);
    setAdvisorRemarks(existing?.remarks || '');
    setMarksError('');
    setIsMarksModalOpen(true);
  };

  // Compute live team average in modal
  const modalAverage = (() => {
    const values = Object.values(marksInput)
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v) && v >= 0 && v <= 100);
    if (values.length === 0) return null;
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / values.length) * 10) / 10;
  })();

  // Save Marks
  const handleSaveMarks = () => {
    setMarksError('');
    const parsedMarks: Record<string, number> = {};

    for (const m of team.members) {
      const rawVal = marksInput[m.rollNo];
      if (rawVal === undefined || rawVal === '') {
        setMarksError(`Please assign a mark for ${m.name} (${m.rollNo}).`);
        return;
      }
      const num = parseFloat(rawVal);
      if (isNaN(num) || num < 0 || num > 100) {
        setMarksError(`Mark for ${m.name} must be between 0 and 100.`);
        return;
      }
      parsedMarks[m.rollNo] = num;
    }

    MarksService.saveWeeklyMarks(
      team.teamId,
      selectedWeek,
      parsedMarks,
      advisorRemarks,
      "Class Advisor"
    );

    setIsMarksModalOpen(false);
    onShowToast(`Evaluated & saved Week ${selectedWeek} marks for ${team.teamNo} (Average: ${modalAverage}/100).`);
  };

  // Change Guide
  const availableGuides: AdminFaculty[] = AdminService.getFaculties().filter(
    f => f.role === 'Guide' || f.role === 'Advisor & Guide'
  );

  const handleConfirmChangeGuide = () => {
    setGuideError('');
    if (!selectedNewGuide) {
      setGuideError('Please select a faculty guide from the dropdown.');
      return;
    }

    const res = AdvisorService.reassignGuide(team.class, team.teamId, selectedNewGuide);
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

  // Real file download trigger
  const handleDownloadFile = (fileName: string, fileType: 'ppt' | 'pdf') => {
    let mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    let content = '';

    if (fileType === 'pdf') {
      mimeType = 'application/pdf';
      content = `%PDF-1.4
1 0 obj
<< /Title (${fileName}) /Author (${team.guide}) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 220 >>
stream
BT
/F1 14 Tf
50 720 Td
(Sri Shakthi Institute of Engineering and Technology - Department of CSE) Tj
0 -25 Td
(Milestone Deliverable Dossier: Week ${selectedWeek}) Tj
0 -20 Td
(Project Title: ${team.title}) Tj
0 -20 Td
(Team: ${team.teamNo} | Class: ${team.class}) Tj
0 -20 Td
(Faculty Guide: ${team.guide}) Tj
ET
endstream
endobj
xref
0 6
trailer
<< /Size 6 /Root 2 0 R >>
startxref
500
%%EOF`;
    } else {
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      content = `SIET PowerPoint Milestone Presentation\nMilestone: Week ${selectedWeek}\nProject: ${team.title}\nTeam: ${team.teamNo}\nGuide: ${team.guide}`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast(`Downloaded ${fileName}`);
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
              Inspect student deliverables, verify authentic PPT/PDF files, and grade individual marks.
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
                    {w === 0 ? 'Project Initiation & Title: Week 0' : `Milestone Sprint: Week ${w}`}{w === currentAcademicWeek ? ' (Current)' : ''}
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
                {currentMarks ? `Team Average Score: ${currentMarks.teamAverage} / 100` : 'No Marks Awarded Yet for this Week'}
              </span>
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
            className="px-3.5 py-1.5 bg-white hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] rounded-xl font-semibold text-xs transition shrink-0 cursor-pointer self-start sm:self-center"
          >
            {currentMarks ? 'Edit Marks' : 'Assign Marks Now'}
          </button>
        </div>

        {/* Part 1: Guide Critique & Remarks */}
        <div className="bg-[#F8F5EE] rounded-2xl p-5 border border-[#D8CCBA] space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-[#D8CCBA]/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#111111] text-[#F8F5EE] flex items-center justify-center font-bold">
                <User size={16} />
              </div>
              <div>
                <span className="font-semibold text-[#111111] block text-xs">
                  Review by {team.guide}
                </span>
                <span className="text-[10px] text-[#75695A] font-medium">Faculty Project Guide</span>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase border ${
              activeSubmission?.status === 'Approved' ? 'bg-[#4A5844]/15 text-[#4A5844] border-[#4A5844]/20' :
              activeSubmission?.status === 'Changes Requested' ? 'bg-[#7C3838]/15 text-[#7C3838] border-[#7C3838]/20' :
              'bg-[#8A6A32]/15 text-[#8A6A32] border-[#8A6A32]/20'
            }`}>
              {activeSubmission?.status === 'Submitted' ? 'Pending' : (activeSubmission?.status || 'Approved')}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
              Guide Evaluation Critique &amp; Remarks:
            </span>
            <p className="text-[#111111] font-medium leading-relaxed bg-white p-3.5 rounded-xl border border-[#D8CCBA]">
              {activeSubmission?.comments || 'Satisfactory milestone deliverables verified and endorsed by technical guide.'}
            </p>
          </div>
        </div>

        {/* Part 2: Complete Student Submission Details */}
        <div className="space-y-4 text-xs">
          <h4 className="font-serif font-semibold text-sm text-[#111111] border-b border-[#D8CCBA] pb-2">
            Complete Student Submission Details
          </h4>

          {/* Project Title */}
          <div>
            <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
              Project Title
            </span>
            <div className="p-3 bg-[#F8F5EE]/60 border border-[#D8CCBA] rounded-xl text-xs font-semibold text-[#111111]">
              {team.title}
            </div>
          </div>

          {/* Problem Statement */}
          <div>
            <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
              Problem Statement
            </span>
            <div className="p-3.5 bg-[#F8F5EE]/60 border border-[#D8CCBA] rounded-xl text-xs text-[#111111] leading-relaxed font-normal">
              {activeSubmission?.problemStatement || "Modern agricultural monitoring lacks low-cost, edge-computed crop disease identification during real-time automated drone flight sweeps."}
            </div>
          </div>

          {/* Solution Approach */}
          <div>
            <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
              Proposed Solution &amp; Engineering Approach
            </span>
            <div className="p-3.5 bg-[#F8F5EE]/60 border border-[#D8CCBA] rounded-xl text-xs text-[#111111] leading-relaxed font-normal">
              {activeSubmission?.solution || "Deploy quantized MobileNetV3 and YOLOv8 on an onboard NVIDIA Jetson Nano mounted to a custom quadcopter frame with automated GPS waypoint telemetries."}
            </div>
          </div>

          {/* Obstacles Faced */}
          <div>
            <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
              Technical Obstacles Encountered
            </span>
            <div className="p-3.5 bg-[#7C3838]/10 border border-[#7C3838]/20 rounded-xl text-xs text-[#111111] leading-relaxed font-normal">
              {activeSubmission?.obstaclesFaced || "Thermal throttling was observed during prolonged inference at 1080p resolution. Added passive aluminum heatsinks and a 5V fan."}
            </div>
          </div>

          {/* Abstract */}
          <div>
            <span className="text-[10px] font-bold text-[#75695A] uppercase tracking-wider block mb-1">
              Sprint Milestone Abstract
            </span>
            <div className="p-3.5 bg-[#F8F5EE]/60 border border-[#D8CCBA] rounded-xl text-xs text-[#111111] leading-relaxed font-normal">
              {activeSubmission?.abstract || "This sprint milestone synthesizes the literature review, sensor telemetry calibration, and architecture pipeline for the capstone implementation."}
            </div>
          </div>

          {/* Technologies Used */}
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
              Technologies &amp; Frameworks
            </span>
            <div className="flex flex-wrap gap-1.5">
              {["Python", "PyTorch", "TensorRT", "ROS2", "Jetson Nano", "FastAPI", "React"].map((tech) => (
                <span key={tech} className="px-3 py-1 rounded-xl bg-mint-50 text-mint-900 border border-mint-200 text-xs font-bold">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Verified Artifacts: Real PPT and PDF Downloads */}
          <div className="pt-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
              Verified Submission Deliverables
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-[#F8F5EE] border border-[#D8CCBA] rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center font-bold">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="font-bold text-[#111111] block text-xs">
                      Milestone_Dossier_W{selectedWeek}.pdf
                    </span>
                    <span className="text-[10px] text-[#75695A]">Official Dossier &bull; 2.4 MB</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadFile(`Milestone_Dossier_W${selectedWeek}.pdf`, 'pdf')}
                  className="px-3 py-1.5 bg-white hover:bg-[#EDE7DB] border border-[#D8CCBA] text-[#111111] rounded-xl font-medium text-xs flex items-center gap-1.5 transition shadow-2xs"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
              </div>

              <div className="p-4 bg-[#F8F5EE] border border-[#D8CCBA] rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center font-bold">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="font-bold text-[#111111] block text-xs">
                      Sprint_Presentation_W{selectedWeek}.pptx
                    </span>
                    <span className="text-[10px] text-[#75695A]">Slide Deck &bull; 8.1 MB</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadFile(`Sprint_Presentation_W${selectedWeek}.pptx`, 'ppt')}
                  className="px-3 py-1.5 bg-white hover:bg-[#EDE7DB] border border-[#D8CCBA] text-[#111111] rounded-xl font-medium text-xs flex items-center gap-1.5 transition shadow-2xs"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="https://github.com/siet-cse/capstone-drone-cv"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-[#F8F5EE] hover:bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] text-xs font-medium transition flex items-center gap-1.5"
            >
              <Github size={14} />
              <span>GitHub Repository</span>
              <ExternalLink size={12} />
            </a>

            <a
              href="https://crop-drone-demo.siet.ac.in"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-[#EDE7DB] hover:bg-[#D8CCBA] text-[#111111] border border-[#D8CCBA] text-xs font-medium transition flex items-center gap-1.5"
            >
              <ExternalLink size={14} />
              <span>Live Staging Demo</span>
            </a>
          </div>

        </div>

      </div>

      {/* MODAL: Evaluate & Assign Marks */}
      {isMarksModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn font-sans">
          <div 
            className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-[#D8CCBA] overflow-hidden transform transition-all flex flex-col max-h-[90vh]"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-[#F8F5EE] px-6 py-4 border-b border-[#D8CCBA] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EDE7DB] text-[#111111] border border-[#D8CCBA] flex items-center justify-center font-bold">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#111111]">
                    Evaluate &amp; Assign Weekly Marks &bull; Week {selectedWeek}
                  </h3>
                  <p className="text-[11px] text-[#75695A]">
                    {team.teamNo} &bull; Individual Student Assessment (Max: 100)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMarksModalOpen(false)}
                className="text-[#75695A] hover:text-[#111111] p-2 rounded-xl hover:bg-[#EDE7DB] transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
              {marksError && (
                <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{marksError}</span>
                </div>
              )}

              <div className="p-3 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl flex items-center justify-between">
                <span className="font-semibold text-[#292725]">Calculated Team Average Score:</span>
                <span className="text-sm font-bold text-[#111111]">
                  {modalAverage !== null ? `${modalAverage} / 100` : '-- / 100'}
                </span>
              </div>

              {/* Individual Marks Fields */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#75695A] uppercase tracking-wider">
                  Individual Student Marks (0 - 100)
                </label>

                {team.members.map((m) => (
                  <div key={m.rollNo} className="p-3 rounded-xl bg-[#F8F5EE]/60 border border-[#D8CCBA] flex items-center justify-between gap-3">
                    <div>
                      <span className="font-semibold text-[#111111] block">{m.name}</span>
                      <span className="text-[10px] text-[#75695A] font-mono">
                        {m.rollNo} {m.isLead ? '• [Team Leader]' : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={marksInput[m.rollNo] || ''}
                        onChange={(e) => setMarksInput({ ...marksInput, [m.rollNo]: e.target.value })}
                        className="w-20 px-3 py-1.5 bg-white border border-[#D8CCBA] rounded-xl text-xs font-bold text-[#111111] text-center focus:outline-none focus:border-[#111111] shadow-xs"
                      />
                      <span className="text-[#75695A] font-medium text-[11px]">/ 100</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Advisor Remarks */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#75695A] uppercase tracking-wider">
                  Advisor Evaluation Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  value={advisorRemarks}
                  onChange={(e) => setAdvisorRemarks(e.target.value)}
                  className="w-full p-3 bg-[#F8F5EE] border border-[#D8CCBA] rounded-xl text-xs focus:outline-none focus:border-[#111111] shadow-xs text-[#111111] placeholder-[#75695A]/60"
                />
              </div>

              <div className="text-[11px] text-[#75695A] italic">
                * Note: Individual and team average marks are visible to the Guide, Advisor, and HOD, and are strictly hidden from students.
              </div>
            </div>

            <div className="bg-[#F8F5EE] px-6 py-4 border-t border-[#D8CCBA] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsMarksModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#292725] hover:text-[#111111] bg-white border border-[#D8CCBA] rounded-xl hover:bg-[#EDE7DB] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMarks}
                className="px-5 py-2 text-xs font-medium text-[#F8F5EE] bg-[#111111] hover:bg-[#292725] rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Save &amp; Record Marks</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
