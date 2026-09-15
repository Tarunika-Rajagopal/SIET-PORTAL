import { WeeklySubmission } from '../types';
import { ClassTeam } from './advisorService';
import { StudentService } from './studentService';
import { HodService } from './hodService';

export const AdvisorSubmissionsService = {
  /**
   * Returns all 8 milestone weeks of submissions for a given class team.
   */
  getTeamSubmissions(team: ClassTeam): WeeklySubmission[] {
    // 1. Check local storage for custom submissions
    try {
      const stored = localStorage.getItem(`siet_team_submissions_${team.teamId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }

    // 2. If Team 04 (or matching TEAM-CSE-Y3-B04), use StudentService rich submissions
    if (team.teamId === 'TEAM-CSE-Y3-B04' || team.teamNo === 'Team 04' || team.teamNo === '04') {
      const studentSubs = StudentService.getSubmissions();
      // Ensure weeks 7 & 8 are appended if not already present
      const fullSubs = [...studentSubs];
      if (!fullSubs.find(s => s.week === 7)) {
        fullSubs.push({
          week: 7,
          title: "Review 1 Milestone Defense & Technical Dossier",
          dueDate: "Week 7 (Upcoming)",
          status: "Pending",
          projectTitle: team.title,
          abstract: "Departmental Review 1 preparation covering end-to-end telemetry validation, guide approval checklist, and published project preprint draft.",
          presentationFile: "Review1_Defense_Milestone.pptx",
          pdfFile: "Review1_Technical_Dossier.pdf",
          repoUrl: "https://github.com/tarunika-r/crop-disease-drone",
          demoUrl: "https://crop-drone-demo.siet.ac.in",
          guideName: team.guide,
          comments: "Scheduled for Review 1 panel defense before department committee."
        });
      }
      if (!fullSubs.find(s => s.week === 8)) {
        fullSubs.push({
          week: 8,
          title: "Yield Advisory Algorithm & Field Analytics",
          dueDate: "Week 8 (Upcoming)",
          status: "Pending",
          projectTitle: team.title,
          abstract: "Final integrated drone yield advisory engine validating multi-spectral vegetation indices against ground truth crop yields.",
          presentationFile: "Week8_Final_Telemetry_Report.pptx",
          pdfFile: "Week8_Yield_Analytics_Summary.pdf",
          repoUrl: "https://github.com/tarunika-r/crop-disease-drone",
          demoUrl: "https://crop-drone-demo.siet.ac.in/analytics",
          guideName: team.guide,
          comments: "Final deliverable synthesis and viva voce evaluation."
        });
      }
      return fullSubs;
    }

    // 3. Check if HodService has mock submissions for this team
    const hodTeam = HodService.getTeams().find(t => t.id === team.teamId || t.teamNo === team.teamNo);
    if (hodTeam && hodTeam.submissions && hodTeam.submissions.length > 0) {
      const existing = [...hodTeam.submissions];
      return this.padTo8Weeks(team, existing);
    }

    // 4. Default high quality contextual submissions for any other team (e.g. Team 05, 06, 07, or newly created)
    return this.generateDefaultMilestones(team);
  },

  /**
   * Returns a specific week's submission for a team.
   */
  getSubmissionForWeek(team: ClassTeam, week: number): WeeklySubmission | undefined {
    const subs = this.getTeamSubmissions(team);
    return subs.find(s => s.week === week);
  },

  /**
   * Ensures team has all 8 weeks with realistic milestone contents and enriches missing fields.
   */
  padTo8Weeks(team: ClassTeam, existing: WeeklySubmission[]): WeeklySubmission[] {
    const filled = existing.map(sub => {
      const w = sub.week;
      const defTemplate = this.generateDefaultMilestones(team).find(m => m.week === w);
      return {
        ...sub,
        projectTitle: sub.projectTitle || team.title,
        problemStatement: sub.problemStatement || defTemplate?.problemStatement || `Technical challenge analysis and system design for ${team.title}.`,
        solution: sub.solution || defTemplate?.solution || `Modular technical architecture and sprint deliverables for ${team.title}.`,
        technologyUsed: sub.technologyUsed || defTemplate?.technologyUsed || "React, TypeScript, Node.js, Python, PostgreSQL, Docker",
        obstaclesFaced: sub.obstaclesFaced !== undefined ? sub.obstaclesFaced : defTemplate?.obstaclesFaced || (w <= 3 ? "Addressing latency constraints and interface dependency resolution." : undefined),
        abstract: sub.abstract || defTemplate?.abstract || `Milestone ${w} technical documentation and verification deliverable for ${team.title}.`,
        presentationFile: sub.presentationFile || sub.fileName || `Week${w}_Milestone_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
        pdfFile: sub.pdfFile || `Week${w}_Report_${team.teamNo.replace(/\s+/g, '_')}.pdf`,
        repoUrl: sub.repoUrl || `https://github.com/siet-projects/${team.teamNo.toLowerCase().replace(/\s+/g, '-')}`,
        demoUrl: sub.demoUrl || `https://${team.teamNo.toLowerCase().replace(/\s+/g, '-')}-demo.siet.ac.in`,
        guideName: sub.guideName || team.guide,
        guideReviewDate: sub.guideReviewDate || (sub.submissionDate ? `${sub.submissionDate} (Reviewed)` : undefined),
        score: sub.score !== undefined ? sub.score : (sub.status === 'Approved' ? 90 + (w % 5) : sub.status === 'Changes Requested' ? 74 : undefined),
        maxScore: sub.maxScore || 100
      };
    });

    for (let w = 1; w <= 8; w++) {
      if (!filled.find(s => s.week === w)) {
        const milestoneInfo = MILESTONE_TEMPLATES[w] || {
          title: `Milestone Week ${w}`,
          dueDate: `Week ${w}`
        };
        const defTemplate = this.generateDefaultMilestones(team).find(m => m.week === w);
        filled.push(defTemplate || {
          week: w,
          title: milestoneInfo.title,
          dueDate: w <= 3 ? `Week ${w}` : `Week ${w} (Upcoming)`,
          status: w <= 2 ? "Approved" : w === 3 ? "Submitted" : "Pending",
          submissionDate: w <= 3 ? `${10 + w * 7} Aug 2026` : undefined,
          projectTitle: team.title,
          problemStatement: `Investigation of technical challenges in ${team.title} within the domain of modern engineering.`,
          solution: `Architecture blueprint and modular decomposition for ${team.title}.`,
          technologyUsed: "React, Node.js, Python, PostgreSQL, REST APIs",
          obstaclesFaced: w <= 2 ? "Inter-module dependency resolution and hardware interface timings." : undefined,
          abstract: `Phase ${w} deliverable validating sprint requirements and milestones for ${team.title}.`,
          fileName: `Week${w}_Milestone_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
          presentationFile: `Week${w}_Milestone_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
          pdfFile: `Week${w}_Report_${team.teamNo.replace(/\s+/g, '_')}.pdf`,
          repoUrl: `https://github.com/siet-projects/${team.teamNo.toLowerCase().replace(/\s+/g, '-')}`,
          demoUrl: `https://${team.teamNo.toLowerCase().replace(/\s+/g, '-')}-demo.siet.ac.in`,
          guideName: team.guide,
          comments: w <= 2 ? `Approved by ${team.guide}. Implementation proceeds on schedule.` : `Under review by ${team.guide}.`,
          score: w <= 2 ? 92 : undefined,
          maxScore: 100
        });
      }
    }
    return filled.sort((a, b) => a.week - b.week);
  },

  /**
   * Generates standard 8 weeks for any team
   */
  generateDefaultMilestones(team: ClassTeam): WeeklySubmission[] {
    return [
      {
        week: 1,
        title: "Project Proposal, Title & Problem Formulation",
        dueDate: "Week 1",
        status: "Approved",
        submissionDate: "14 Aug 2026",
        fileName: `Week1_Proposal_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
        fileSize: "3.8 MB",
        projectTitle: team.title,
        problemStatement: `Traditional manual scouting and legacy architectures fail to address latency and scalability required for ${team.title}.`,
        solution: `Comprehensive design and component engineering addressing real-time efficiency for ${team.title}.`,
        technologyUsed: "Python, React, TypeScript, Fastify, Docker, PostgreSQL",
        obstaclesFaced: "Initial dataset acquisition and hardware communication protocols.",
        abstract: `Initial engineering formulation and domain review for ${team.title}, supervised by ${team.guide}.`,
        presentationFile: `Week1_Proposal_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
        pdfFile: `Week1_Proposal_Dossier_${team.teamNo.replace(/\s+/g, '_')}.pdf`,
        repoUrl: "https://github.com/siet-projects",
        demoUrl: "https://siet-projects.internal",
        guideName: team.guide,
        guideReviewDate: "16 Aug 2026",
        comments: `Proposal approved by ${team.guide}. Problem scope and division of work are well specified.`,
        score: 92,
        maxScore: 100
      },
      {
        week: 2,
        title: "Dataset Acquisition & Preprocessing Pipeline",
        dueDate: "Week 2",
        status: "Approved",
        submissionDate: "21 Aug 2026",
        fileName: `Week2_Dataset_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
        fileSize: "5.4 MB",
        projectTitle: team.title,
        problemStatement: "High variance in sensory inputs, missing telemetry attributes, and noise filtration.",
        solution: "Data collection, normalization, tokenization, and pipeline validation across stratified train/test sets.",
        technologyUsed: "NumPy, Pandas, OpenCV, Scikit-learn, PyTorch",
        obstaclesFaced: "Imbalance in benchmark data distributions and feature scaling outliers.",
        abstract: "Data pipeline delivering cleaned datasets and baseline features ready for algorithmic ingestion.",
        presentationFile: `Week2_Dataset_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
        pdfFile: `Week2_Dataset_Report_${team.teamNo.replace(/\s+/g, '_')}.pdf`,
        repoUrl: "https://github.com/siet-projects",
        demoUrl: "https://siet-projects.internal",
        guideName: team.guide,
        guideReviewDate: "23 Aug 2026",
        comments: `Data preparation verified by ${team.guide}. Proceed to model benchmarking.`,
        score: 90,
        maxScore: 100
      },
      {
        week: 3,
        title: "Model Architecture & Benchmark Exploration",
        dueDate: "Week 3",
        status: "Approved",
        submissionDate: "28 Aug 2026",
        fileName: `Week3_Model_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
        fileSize: "7.1 MB",
        projectTitle: team.title,
        problemStatement: "Latency constraints versus prediction fidelity on constrained hardware nodes.",
        solution: "Comparative benchmarking across multiple baseline models, selecting the optimal architecture for production.",
        technologyUsed: "PyTorch, HuggingFace, ONNX, TensorRT, FastAPI",
        obstaclesFaced: "Memory bandwidth limits on edge device and inference throttle.",
        abstract: "Experimental benchmark identifying optimal tradeoff between accuracy and inference latency.",
        presentationFile: `Week3_Model_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
        pdfFile: `Week3_Model_Report_${team.teamNo.replace(/\s+/g, '_')}.pdf`,
        repoUrl: "https://github.com/siet-projects",
        demoUrl: "https://siet-projects.internal",
        guideName: team.guide,
        guideReviewDate: "30 Aug 2026",
        comments: `Benchmarks approved by ${team.guide}. Ready for Zeroth Review defense.`,
        score: 94,
        maxScore: 100
      },
      {
        week: 4,
        title: "Zeroth Review Presentation & Panel Evaluation",
        dueDate: "Week 4",
        status: "Approved",
        submissionDate: "04 Sep 2026",
        fileName: `Zeroth_Review_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
        fileSize: "11.2 MB",
        projectTitle: team.title,
        problemStatement: "Formal departmental defense before evaluation committee.",
        solution: "Presented modular architecture, proof of concept, and milestone delivery timeline.",
        technologyUsed: "PowerPoint, LaTeX Documentation, Hardware Schematics",
        obstaclesFaced: "Integrating evaluator committee recommendations on security protocols.",
        abstract: "Zeroth Review defense deck validating novelty, feasibility, and deliverable commitments.",
        presentationFile: `Zeroth_Review_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
        pdfFile: `Zeroth_Review_Summary_${team.teamNo.replace(/\s+/g, '_')}.pdf`,
        repoUrl: "https://github.com/siet-projects",
        demoUrl: "https://siet-projects.internal",
        guideName: team.guide,
        guideReviewDate: "05 Sep 2026",
        comments: `Review 0 successfully passed. Committee commended teamwork and methodical planning.`,
        score: 91,
        maxScore: 100
      },
      {
        week: 5,
        title: "Edge Hardware / Backend Service Deployment",
        dueDate: "Week 5",
        status: "Changes Requested",
        submissionDate: "07 Sep 2026",
        fileName: `Week5_Deployment_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
        fileSize: "8.9 MB",
        projectTitle: team.title,
        problemStatement: "Containerized deployment, endpoint rate-limiting, and telemetry persistence under continuous load.",
        solution: "Deployed microservices stack with real-time stream ingestion and monitoring metrics.",
        technologyUsed: "Docker, Kubernetes, Redis, Prometheus, Grafana",
        obstaclesFaced: "Cold-start latency spikes during container auto-scaling under peak traffic.",
        abstract: "Telemetry benchmark evaluating throughput, network socket latency, and fault recovery.",
        presentationFile: `Week5_Deployment_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
        pdfFile: `Week5_Telemetry_${team.teamNo.replace(/\s+/g, '_')}.pdf`,
        repoUrl: "https://github.com/siet-projects",
        demoUrl: "https://siet-projects.internal",
        guideName: team.guide,
        guideReviewDate: "08 Sep 2026",
        comments: `Observed latency hiccups during high throughput test. Re-evaluate connection pooling before Review 1.`,
        score: 75,
        maxScore: 100
      },
      {
        week: 6,
        title: "Field Prototype & Real-Time Dashboard Integration",
        dueDate: "Week 6",
        status: "Submitted",
        submissionDate: "10 Sep 2026",
        fileName: `Week6_Dashboard_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
        fileSize: "6.7 MB",
        projectTitle: team.title,
        problemStatement: "Responsive web UI dashboard connecting directly to backend API and live sensor streaming.",
        solution: "Developed React web application with live charts, status heatmaps, and audit logs.",
        technologyUsed: "React, Tailwind CSS, WebSockets, Chart.js, Vite",
        obstaclesFaced: "Handling reconnection backoff and token refresh during unstable network connections.",
        abstract: "Functional prototype linking hardware/backend outputs to a user-facing dashboard for real-time monitoring.",
        presentationFile: `Week6_Dashboard_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
        pdfFile: `Week6_Prototype_Report_${team.teamNo.replace(/\s+/g, '_')}.pdf`,
        repoUrl: "https://github.com/siet-projects",
        demoUrl: "https://siet-projects.internal",
        guideName: team.guide,
        guideReviewDate: "Pending Review",
        comments: `Submitted on schedule. Currently being reviewed by Project Guide ${team.guide}.`
      },
      {
        week: 7,
        title: "Review 1 Milestone Defense & Technical Dossier",
        dueDate: "Week 7 (Upcoming)",
        status: "Pending",
        projectTitle: team.title,
        abstract: "Comprehensive departmental Review 1 preparation covering full working prototype defense and complete technical dossier.",
        presentationFile: `Review1_Defense_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
        pdfFile: `Review1_Technical_Dossier_${team.teamNo.replace(/\s+/g, '_')}.pdf`,
        repoUrl: "https://github.com/siet-projects",
        demoUrl: "https://siet-projects.internal",
        guideName: team.guide,
        comments: "Upcoming milestone. Review 1 presentation scheduled before departmental review panel."
      },
      {
        week: 8,
        title: "Final System Validation, Field Testing & Analytics",
        dueDate: "Week 8 (Upcoming)",
        status: "Pending",
        projectTitle: team.title,
        abstract: "Final end-to-end integration, performance profiling, documentation dossier, and final capstone defense.",
        presentationFile: `Week8_Final_${team.teamNo.replace(/\s+/g, '_')}.pptx`,
        pdfFile: `Week8_Final_Dossier_${team.teamNo.replace(/\s+/g, '_')}.pdf`,
        repoUrl: "https://github.com/siet-projects",
        demoUrl: "https://siet-projects.internal",
        guideName: team.guide,
        comments: "Final project evaluation and viva voce assessment."
      }
    ];
  },

  /**
   * Generates and triggers actual browser download for PPTX or PDF
   */
  downloadFile(
    fileName: string,
    fileType: 'ppt' | 'pdf',
    sub: WeeklySubmission,
    team: ClassTeam,
    advisorName: string
  ) {
    const weekNum = sub.week;
    const weekTitle = sub.title;
    let mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    let content = '';

    if (fileType === 'pdf') {
      mimeType = 'application/pdf';
      content = `%PDF-1.4
1 0 obj
<< /Title (${fileName}) /Author (${advisorName}) >>
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
<< /Length 260 >>
stream
BT
/F1 14 Tf
50 720 Td
(Sri Shakthi Institute of Engineering and Technology - Department of CSE) Tj
0 -25 Td
(Advisor Milestone Audit Dossier: Week ${weekNum} - ${weekTitle}) Tj
0 -20 Td
(Project Title: ${sub.projectTitle || team.title}) Tj
0 -20 Td
(Team: ${team.teamNo} | Class: ${team.class} | Batch: ${team.batch}) Tj
0 -20 Td
(Guide: ${team.guide} | Class Advisor: ${advisorName}) Tj
0 -20 Td
(Submission Status: ${sub.status} | Submitted Date: ${sub.submissionDate || 'N/A'}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
trailer
<< /Size 6 /Root 2 0 R >>
startxref
500
%%EOF`;
    } else {
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      content = `SIET PowerPoint Milestone Presentation
Milestone: Week ${weekNum} - ${weekTitle}
Project: ${sub.projectTitle || team.title}
Team: ${team.teamNo} (${team.class})
Faculty Guide: ${team.guide}
Class Advisor: ${advisorName}
Submission Date: ${sub.submissionDate || 'N/A'}
Evaluation Status: ${sub.status}
Comments: ${sub.comments || 'Evaluated for Capstone Milestone'}`;
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
  }
};

const MILESTONE_TEMPLATES: Record<number, { title: string; dueDate: string }> = {
  1: { title: "Project Proposal, Title & Problem Formulation", dueDate: "Week 1" },
  2: { title: "Dataset Acquisition & Preprocessing Pipeline", dueDate: "Week 2" },
  3: { title: "Model Architecture & Benchmark Exploration", dueDate: "Week 3" },
  4: { title: "Zeroth Review Presentation & Panel Evaluation", dueDate: "Week 4" },
  5: { title: "Edge Hardware / Backend Service Deployment", dueDate: "Week 5" },
  6: { title: "Field Prototype & Real-Time Dashboard Integration", dueDate: "Week 6" },
  7: { title: "Review 1 Milestone Defense & Technical Dossier", dueDate: "Week 7 (Upcoming)" },
  8: { title: "Final System Validation, Field Testing & Analytics", dueDate: "Week 8 (Upcoming)" }
};

export default AdvisorSubmissionsService;
