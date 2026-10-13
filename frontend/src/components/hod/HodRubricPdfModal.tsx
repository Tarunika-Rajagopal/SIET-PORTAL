import React, { useState, useMemo } from 'react';
import { 
  X, Download, Printer, FileText, Loader2, CheckCircle2, 
  Search, Filter, Award, Users, BookOpen
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { HodTeamDetails } from '../../services/hodService';
import { MarksService, WeeklyMarksRecord } from '../../services/marksService';
import { MemberRubricScore } from '../../types';

interface HodRubricPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: HodTeamDetails[];
  initialBatch?: string;
  initialClass?: string;
  initialReview?: number;
}

interface StudentRubricRow {
  sNo: number;
  rollNo: string;
  studentName: string;
  isLead: boolean;
  teamNo: string;
  teamId: string;
  classSection: string;
  batch: string;
  guideName: string;
  projectTitle: string;
  reviewNumber: number;
  systemDesign: number;
  presentationInteraction: number;
  technicalSkills: number;
  implementationProgress: number;
  total: number;
  isEvaluated: boolean;
  remarks: string;
  gradedBy: string;
}

export const HodRubricPdfModal: React.FC<HodRubricPdfModalProps> = ({
  isOpen,
  onClose,
  teams,
  initialBatch = 'ALL',
  initialClass = 'ALL',
  initialReview = 1
}) => {
  const [selectedReview, setSelectedReview] = useState<number | 'ALL'>(initialReview || 1);
  const [selectedClass, setSelectedClass] = useState<string>(initialClass || 'ALL');
  const [selectedBatch, setSelectedBatch] = useState<string>(initialBatch || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Extract distinct classes and batches
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    teams.forEach(t => {
      if (t.classSection) set.add(t.classSection);
    });
    return Array.from(set).sort();
  }, [teams]);

  const availableBatches = useMemo(() => {
    const set = new Set<string>();
    teams.forEach(t => {
      if (t.batch) set.add(t.batch);
    });
    return Array.from(set).sort();
  }, [teams]);

  // Aggregate student rubric records across filtered teams and reviews
  const studentRows = useMemo<StudentRubricRow[]>(() => {
    const rows: StudentRubricRow[] = [];
    let counter = 1;

    // Filter teams first
    const filteredTeams = teams.filter(team => {
      if (selectedClass !== 'ALL' && team.classSection !== selectedClass) return false;
      if (selectedBatch !== 'ALL' && team.batch !== selectedBatch) return false;
      return true;
    });

    const reviewsToInclude: number[] = selectedReview === 'ALL' ? [1, 2, 3, 4] : [selectedReview];

    filteredTeams.forEach(team => {
      reviewsToInclude.forEach(revNum => {
        const wMarks = MarksService.getWeeklyMarks(team.id, revNum, team.members.map(m => m.rollNo)) ||
                       (revNum === 1 ? MarksService.getWeeklyMarks(team.id, 0, team.members.map(m => m.rollNo)) : null);

        team.members.forEach(member => {
          const rno = member.rollNo.trim();
          const rubric: MemberRubricScore | undefined = wMarks?.memberRubrics?.[rno];
          const rawMark = wMarks?.memberMarks?.[rno];

          let sd = 0;
          let pi = 0;
          let ts = 0;
          let ip = 0;
          let total = 0;
          let isEvaluated = false;

          if (rubric) {
            sd = Number(rubric.systemDesign ?? 0);
            pi = Number(rubric.presentationInteraction ?? 0);
            ts = Number(rubric.technicalSkills ?? 0);
            ip = Number(rubric.implementationProgress ?? 0);
            total = Number(rubric.total ?? (sd + pi + ts + ip));
            isEvaluated = total > 0 || (sd > 0 || pi > 0 || ts > 0 || ip > 0);
          } else if (typeof rawMark === 'number' && rawMark > 0) {
            const part = Math.round((Math.min(rawMark, 20) / 4) * 10) / 10;
            sd = part;
            pi = part;
            ts = part;
            ip = part;
            total = Math.min(rawMark, 20);
            isEvaluated = true;
          }

          const searchTarget = `${member.name} ${member.rollNo} ${team.teamNo} ${team.projectTitle}`.toLowerCase();
          if (searchQuery && !searchTarget.includes(searchQuery.toLowerCase())) {
            return;
          }

          rows.push({
            sNo: counter++,
            rollNo: member.rollNo,
            studentName: member.name,
            isLead: Boolean(member.isLead),
            teamNo: team.teamNo,
            teamId: team.id,
            classSection: team.classSection,
            batch: team.batch,
            guideName: team.guide?.name || 'Unassigned',
            projectTitle: team.projectTitle || 'Untitled Project',
            reviewNumber: revNum,
            systemDesign: sd,
            presentationInteraction: pi,
            technicalSkills: ts,
            implementationProgress: ip,
            total,
            isEvaluated,
            remarks: wMarks?.remarks || '',
            gradedBy: wMarks?.gradedBy || ''
          });
        });
      });
    });

    return rows;
  }, [teams, selectedReview, selectedClass, selectedBatch, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalStudents = studentRows.length;
    const evaluatedRows = studentRows.filter(r => r.isEvaluated);
    const evaluatedCount = evaluatedRows.length;
    const avgScore = evaluatedCount > 0
      ? Math.round((evaluatedRows.reduce((acc, r) => acc + r.total, 0) / evaluatedCount) * 10) / 10
      : 0;

    return {
      totalStudents,
      evaluatedCount,
      avgScore
    };
  }, [studentRows]);

  if (!isOpen) return null;

  // Handle PDF Generation & Download
  const handleDownloadPdf = async () => {
    const reportElement = document.getElementById('printableRubricReport');
    if (!reportElement) return;

    try {
      setIsGeneratingPdf(true);

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Page 1
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Multiple pages if table overflows
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const reviewSuffix = selectedReview === 'ALL' ? 'AllReviews' : `Review_${selectedReview}`;
      const classSuffix = selectedClass === 'ALL' ? 'AllClasses' : `Class_${selectedClass}`;
      const fileName = `SIET_CSE_Student_Evaluation_Rubrics_${classSuffix}_${reviewSuffix}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl border border-[#D8CCBA] overflow-hidden my-6 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Controls & Filter Bar (Sticky at Top) */}
        <div className="p-4 border-b border-[#D8CCBA] flex flex-wrap items-center justify-between gap-3 bg-[#F8F5EE] shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#111111]" />
            <div>
              <h3 className="font-serif font-bold text-sm text-[#111111]">
                Student Project Evaluation Rubrics Dossier
              </h3>
              <p className="text-[11px] text-[#75695A] font-medium">
                Official 4-Criteria Rubric Breakdown (20 Marks) • Live PDF Export
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {downloadSuccess && (
              <span className="text-xs text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-fadeIn">
                <CheckCircle2 size={13} className="text-emerald-700" />
                <span>Downloaded Successfully!</span>
              </span>
            )}

            <button
              onClick={handlePrint}
              type="button"
              className="px-3 py-1.5 bg-[#EDE7DB] hover:bg-[#E2D9C8] text-[#111111] font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer border border-[#D8CCBA]"
              title="Print Document"
            >
              <Printer size={13} />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              type="button"
              className="px-4 py-1.5 bg-[#111111] hover:bg-[#292725] text-[#F8F5EE] font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download size={13} />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-[#75695A] hover:text-[#111111] hover:bg-[#EDE7DB] rounded-xl transition cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Toolbar (print:hidden) */}
        <div className="px-5 py-3 border-b border-[#D8CCBA] bg-[#FAF8F4] flex flex-wrap items-center gap-3 shrink-0 print:hidden text-xs">
          
          {/* Review Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#75695A] font-bold uppercase text-[10px]">Review:</span>
            <select
              value={selectedReview}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedReview(val === 'ALL' ? 'ALL' : Number(val));
              }}
              className="px-2.5 py-1 bg-white border border-[#D8CCBA] rounded-lg text-xs font-semibold text-[#111111] focus:outline-none"
            >
              <option value={1}>Review 1</option>
              <option value={2}>Review 2</option>
              <option value={3}>Review 3</option>
              <option value={4}>Review 4</option>
              <option value="ALL">All Reviews (Consolidated)</option>
            </select>
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#75695A] font-bold uppercase text-[10px]">Class:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-2.5 py-1 bg-white border border-[#D8CCBA] rounded-lg text-xs font-semibold text-[#111111] focus:outline-none"
            >
              <option value="ALL">All Classes</option>
              {availableClasses.map(c => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </div>

          {/* Batch Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#75695A] font-bold uppercase text-[10px]">Batch:</span>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-2.5 py-1 bg-white border border-[#D8CCBA] rounded-lg text-xs font-semibold text-[#111111] focus:outline-none"
            >
              <option value="ALL">All Batches</option>
              {availableBatches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Search input */}
          <div className="relative flex-1 min-w-[180px] max-w-xs ml-auto">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#75695A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or team..."
              className="w-full pl-7 pr-2.5 py-1 bg-white border border-[#D8CCBA] rounded-lg text-xs focus:outline-none placeholder-[#75695A]"
            />
          </div>

          {/* Records summary pill */}
          <span className="px-2 py-0.5 rounded-md bg-[#EDE7DB] text-[#111111] font-mono font-bold text-[11px] border border-[#D8CCBA]">
            {studentRows.length} Students
          </span>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 print:bg-white print:p-0">
          <div
            id="printableRubricReport"
            className="bg-white max-w-5xl mx-auto p-8 rounded-2xl shadow-sm border border-[#D8CCBA] print:border-0 print:shadow-none print:p-6 text-[#111111]"
            style={{ minHeight: '600px' }}
          >
            
            {/* College Header */}
            <div className="text-center pb-4 border-b-2 border-[#111111] space-y-1">
              <h1 className="text-lg font-serif font-extrabold tracking-wide uppercase text-[#111111]">
                Sri Shakthi Institute of Engineering and Technology
              </h1>
              <p className="text-[10px] text-[#75695A] font-semibold tracking-wider uppercase">
                (Autonomous Institution • Approved by AICTE, New Delhi • Affiliated to Anna University, Chennai)
              </p>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#111111] pt-1">
                Department of Computer Science and Engineering
              </h2>
              <div className="inline-block mt-1 px-3 py-1 bg-[#F8F5EE] rounded-md border border-[#D8CCBA]">
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#111111]">
                  Project Work Evaluation Rubrics Sheet — {selectedReview === 'ALL' ? 'All Reviews' : `Review ${selectedReview}`}
                </h3>
              </div>
            </div>

            {/* Metadata & Audit Info Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b border-[#D8CCBA] text-[11px] bg-[#FAF8F4] px-4 rounded-xl mt-3">
              <div>
                <span className="text-[#75695A] block text-[9px] uppercase font-bold">Class / Section</span>
                <span className="font-bold text-[#111111]">
                  {selectedClass === 'ALL' ? 'All Classes (A, B, C)' : `Class ${selectedClass}`}
                </span>
              </div>
              <div>
                <span className="text-[#75695A] block text-[9px] uppercase font-bold">Academic Batch</span>
                <span className="font-bold text-[#111111]">
                  {selectedBatch === 'ALL' ? 'All Batches' : selectedBatch}
                </span>
              </div>
              <div>
                <span className="text-[#75695A] block text-[9px] uppercase font-bold">Date of Generation</span>
                <span className="font-bold text-[#111111] font-mono">
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div>
                <span className="text-[#75695A] block text-[9px] uppercase font-bold">Governing Authority</span>
                <span className="font-bold text-[#111111]">Head of Department (CSE)</span>
              </div>
            </div>

            {/* Rubrics Criteria Legend */}
            <div className="my-3 p-2.5 rounded-xl bg-[#F8F5EE] border border-[#D8CCBA] text-[10px] flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-[#111111] uppercase tracking-wider">Evaluation Rubric Components:</span>
              <div className="flex flex-wrap items-center gap-3 text-[#75695A]">
                <span><strong>C1:</strong> System Design (Max: 5)</span>
                <span>•</span>
                <span><strong>C2:</strong> Presentation &amp; Interaction (Max: 5)</span>
                <span>•</span>
                <span><strong>C3:</strong> Technical Skills (Max: 5)</span>
                <span>•</span>
                <span><strong>C4:</strong> Implementation Progress (Max: 5)</span>
                <span>•</span>
                <span className="font-bold text-[#111111]">Total: 20 Marks</span>
              </div>
            </div>

            {/* Main Rubrics Table */}
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-[10px] border-collapse border border-[#D8CCBA]">
                <thead>
                  <tr className="bg-[#111111] text-[#F8F5EE] text-center font-bold">
                    <th className="p-2 border border-[#333333] w-8">S.No</th>
                    <th className="p-2 border border-[#333333] text-left">Roll Number</th>
                    <th className="p-2 border border-[#333333] text-left">Student Name</th>
                    <th className="p-2 border border-[#333333]">Team</th>
                    <th className="p-2 border border-[#333333]">Class</th>
                    {selectedReview === 'ALL' && (
                      <th className="p-2 border border-[#333333]">Rev</th>
                    )}
                    <th className="p-2 border border-[#333333] w-12" title="System Design (Max 5)">C1 (5)</th>
                    <th className="p-2 border border-[#333333] w-12" title="Presentation & Interaction (Max 5)">C2 (5)</th>
                    <th className="p-2 border border-[#333333] w-12" title="Technical Skills (Max 5)">C3 (5)</th>
                    <th className="p-2 border border-[#333333] w-12" title="Implementation Progress (Max 5)">C4 (5)</th>
                    <th className="p-2 border border-[#333333] w-14 bg-emerald-900 text-emerald-100 font-extrabold">Total (20)</th>
                    <th className="p-2 border border-[#333333] text-left">Faculty Guide</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.length === 0 ? (
                    <tr>
                      <td colSpan={selectedReview === 'ALL' ? 12 : 11} className="p-6 text-center text-[#75695A] italic">
                        No student rubric records found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    studentRows.map((row, idx) => (
                      <tr 
                        key={`${row.teamId}-${row.rollNo}-${row.reviewNumber}`}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAF8F4]'}
                      >
                        <td className="p-1.5 border border-[#D8CCBA] text-center font-mono text-[#75695A]">
                          {row.sNo}
                        </td>
                        <td className="p-1.5 border border-[#D8CCBA] font-mono font-bold text-[#111111]">
                          {row.rollNo}
                        </td>
                        <td className="p-1.5 border border-[#D8CCBA] font-bold text-[#111111]">
                          {row.studentName} {row.isLead && <span className="text-[9px] text-[#75695A] font-normal">(Lead)</span>}
                        </td>
                        <td className="p-1.5 border border-[#D8CCBA] text-center font-bold">
                          {row.teamNo}
                        </td>
                        <td className="p-1.5 border border-[#D8CCBA] text-center font-medium">
                          {row.classSection}
                        </td>
                        {selectedReview === 'ALL' && (
                          <td className="p-1.5 border border-[#D8CCBA] text-center font-bold text-[#75695A]">
                            R{row.reviewNumber}
                          </td>
                        )}
                        <td className="p-1.5 border border-[#D8CCBA] text-center font-mono">
                          {row.isEvaluated ? row.systemDesign.toFixed(1) : '-'}
                        </td>
                        <td className="p-1.5 border border-[#D8CCBA] text-center font-mono">
                          {row.isEvaluated ? row.presentationInteraction.toFixed(1) : '-'}
                        </td>
                        <td className="p-1.5 border border-[#D8CCBA] text-center font-mono">
                          {row.isEvaluated ? row.technicalSkills.toFixed(1) : '-'}
                        </td>
                        <td className="p-1.5 border border-[#D8CCBA] text-center font-mono">
                          {row.isEvaluated ? row.implementationProgress.toFixed(1) : '-'}
                        </td>
                        <td className="p-1.5 border border-[#D8CCBA] text-center font-mono font-extrabold bg-[#EDE7DB] text-[#111111]">
                          {row.isEvaluated ? row.total.toFixed(1) : 'Ungraded'}
                        </td>
                        <td className="p-1.5 border border-[#D8CCBA] text-[#75695A] truncate max-w-[130px]">
                          {row.guideName}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Statistics Footer */}
            <div className="mt-4 pt-3 border-t border-[#D8CCBA] flex flex-wrap items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-4">
                <span>Total Candidates: <strong>{stats.totalStudents}</strong></span>
                <span>Evaluated: <strong>{stats.evaluatedCount} / {stats.totalStudents}</strong></span>
                <span>Overall Class Average: <strong className="text-emerald-800">{stats.avgScore} / 20.0</strong></span>
              </div>
              <span className="text-[#75695A] text-[10px] italic">
                Verified through SIET Project Governance Portal &bull; Continuous Academic Evaluation
              </span>
            </div>

            {/* Official Signatures Block */}
            <div className="mt-14 pt-6 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-8">
                <div className="h-0.5 w-36 mx-auto bg-slate-300"></div>
                <div>
                  <span className="font-bold text-[#111111] block">Project Coordinator</span>
                  <span className="text-[10px] text-[#75695A]">Department of CSE</span>
                </div>
              </div>
              <div className="space-y-8">
                <div className="h-0.5 w-36 mx-auto bg-slate-300"></div>
                <div>
                  <span className="font-bold text-[#111111] block">Faculty Guide / Advisor</span>
                  <span className="text-[10px] text-[#75695A]">Department of CSE</span>
                </div>
              </div>
              <div className="space-y-8">
                <div className="h-0.5 w-36 mx-auto bg-[#111111]"></div>
                <div>
                  <span className="font-bold text-[#111111] block">Head of the Department</span>
                  <span className="text-[10px] text-[#75695A]">Department of CSE, SIET</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default HodRubricPdfModal;
