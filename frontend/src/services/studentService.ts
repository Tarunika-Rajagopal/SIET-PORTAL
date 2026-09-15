import { Team, WeeklySubmission, ReviewScore, ChecklistState, Announcement } from '../types';

export interface StudentDeliverableState {
  week: string;
  projectTitle?: string;
  isTitleApproved: boolean;
  problemStatement?: string;
  solution?: string;
  technologyUsed?: string;
  obstaclesFaced?: string;
  abstract?: string;
  presentationFile?: string;
  repoUrl?: string;
  demoUrl?: string;
  screenshotFile?: string;
  submittedFields: {
    title: boolean;
    problemStatement: boolean;
    solution: boolean;
    technologyUsed: boolean;
    obstaclesFaced: boolean;
    abstract: boolean;
    presentation: boolean;
    repoUrl: boolean;
    demoUrl: boolean;
    screenshot: boolean;
  };
}

export interface StudentTeamExtended extends Team {
  submittedTitle?: string;
  isTitleApproved: boolean;
  guideApprovalStatus: 'Approved' | 'Pending Review' | 'Revision Required';
}

export const DEFAULT_STUDENT_TEAM: StudentTeamExtended = {
  id: "TEAM-CSE-Y3-B04",
  teamNo: "Team 04",
  projectTitle: "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
  submittedTitle: "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
  isTitleApproved: true,
  guideApprovalStatus: "Approved",
  guideName: "Dr. P. Manimegalai",
  advisorName: "Dr. R. Karthikeyan",
  batch: "2023-2027 (III Year)",
  section: "CSE-B",
  status: "Approved",
  progress: 68,
  members: [
    { rollNo: "714023104112", name: "Tarunika Rajgopal", email: "tarunika.r@srishakthi.ac.in", role: "Team Lead" },
    { rollNo: "714023104178", name: "Vigneshwaran M", email: "vigneshwaran.m@srishakthi.ac.in", role: "Team Member" },
    { rollNo: "714023104189", name: "Vishnu Priya S", email: "vishnupriya.s@srishakthi.ac.in", role: "Team Member" },
    { rollNo: "714023104066", name: "Kavitha R", email: "kavitha.r@srishakthi.ac.in", role: "Team Member" }
  ]
};

export const DEFAULT_COMPLETED_WEEKS: WeeklySubmission[] = [
  {
    week: 1,
    title: "Project Proposal, Title & Problem Formulation",
    dueDate: "Week 1",
    status: "Approved",
    submissionDate: "14 Aug 2026",
    fileName: "Week1_Project_Proposal.pptx",
    fileSize: "4.2 MB",
    projectTitle: "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
    problemStatement: "Early-stage fungal crop diseases inflict substantial agricultural output losses before visible foliage symptoms appear. Traditional manual scouting is labor-intensive and lacks spatial precision.",
    solution: "An autonomous multi-rotor UAV outfitted with high-resolution edge vision hardware and YOLOv8 segmentation for real-time foliage disease mapping.",
    technologyUsed: "Python 3.10, PyTorch, YOLOv8 Nano, ROS2 Humble, NVIDIA Jetson Orin Nano",
    obstaclesFaced: "Difficulty in acquiring raw multi-spectral training data with annotated plant pathogen masks; hardware delivery lead time for Jetson carrier board.",
    abstract: "This project engineering endeavor formulates a lightweight computer vision pipeline hosted directly onboard unmanned aerial vehicles.",
    presentationFile: "Week1_Project_Proposal.pptx",
    pdfFile: "Week1_Proposal_Dossier.pdf",
    repoUrl: "https://github.com/tarunika-r/crop-disease-drone",
    demoUrl: "https://crop-drone-demo.siet.ac.in",
    screenshotFile: "/logo.jpg",
    guideName: "Dr. P. Manimegalai",
    guideReviewDate: "15 Aug 2026",
    comments: "Title and problem statement thoroughly vetted and approved. Technical viability is sound. Proceed with dataset acquisition.",
    score: 95,
    maxScore: 100
  },
  {
    week: 2,
    title: "Dataset Acquisition & Preprocessing Pipeline",
    dueDate: "Week 2",
    status: "Approved",
    submissionDate: "21 Aug 2026",
    fileName: "Week2_Dataset_Pipeline.pptx",
    fileSize: "8.6 MB",
    projectTitle: "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
    problemStatement: "Field imagery exhibits high variance in illumination, shadow occlusions, and wind motion blur, requiring specialized preprocessing.",
    solution: "Collected 4,500 multispectral drone foliage images. Built CLAHE contrast normalization, affine rotations, and color jitter pipeline.",
    technologyUsed: "OpenCV, Albumentations, Roboflow, Python, NumPy",
    obstaclesFaced: "Severe illumination variability across drone passes during peak sunlight hours; high class imbalance between healthy foliage and early-stage fungal blight patches.",
    abstract: "Data pipeline delivering 4,500 annotated foliage patches with 5-class disease labeling and stratified validation splits.",
    presentationFile: "Week2_Dataset_Pipeline.pptx",
    pdfFile: "Week2_Dataset_Report.pdf",
    repoUrl: "https://github.com/tarunika-r/crop-disease-drone/tree/main/dataset",
    demoUrl: "https://crop-drone-demo.siet.ac.in/dataset",
    screenshotFile: "/logo.jpg",
    guideName: "Dr. P. Manimegalai",
    guideReviewDate: "22 Aug 2026",
    comments: "High quality data augmentation and normalization pipeline. Dataset balance between classes is well maintained.",
    score: 90,
    maxScore: 100
  },
  {
    week: 3,
    title: "Model Architecture & Benchmark Exploration",
    dueDate: "Week 3",
    status: "Approved",
    submissionDate: "28 Aug 2026",
    fileName: "Week3_Model_Benchmark.pptx",
    fileSize: "6.1 MB",
    projectTitle: "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
    problemStatement: "Standard semantic segmentation models exceed the edge compute budget of lightweight UAV flight controllers.",
    solution: "Benchmarked YOLOv8n-seg against MobileNetV3-UNet. YOLOv8 nano achieved 89.4% mAP50 at 42 FPS on edge GPU.",
    technologyUsed: "Ultralytics YOLOv8, PyTorch CUDA, TensorRT 8.6",
    obstaclesFaced: "Standard YOLOv8 segmentation inference exceeded edge compute thermal limitations on battery power; memory bandwidth latency during real-time frame transfers.",
    abstract: "Comparative algorithmic benchmark identifying YOLOv8n-seg as the optimal model balancing mAP accuracy and flight telemetry constraints.",
    presentationFile: "Week3_Model_Benchmark.pptx",
    pdfFile: "Week3_Model_Architecture.pdf",
    repoUrl: "https://github.com/tarunika-r/crop-disease-drone/tree/main/models",
    demoUrl: "https://crop-drone-demo.siet.ac.in/benchmarks",
    screenshotFile: "/logo.jpg",
    guideName: "Dr. P. Manimegalai",
    guideReviewDate: "29 Aug 2026",
    comments: "YOLOv8 nano models show promising mAP scores. Inference speed meets real-time flight thresholds.",
    score: 92,
    maxScore: 100
  },
  {
    week: 4,
    title: "Zeroth Review Presentation & Panel Evaluation",
    dueDate: "Week 4",
    status: "Approved",
    submissionDate: "04 Sep 2026",
    fileName: "Zeroth_Review_Defense.pptx",
    fileSize: "12.4 MB",
    projectTitle: "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
    problemStatement: "Formal defense of project scope, hardware BOM, literature gap, and implementation feasibility before the departmental panel.",
    solution: "Delivered 20-slide technical presentation covering architectural blueprint, Jetson integration roadmap, and expected KPIs.",
    technologyUsed: "PowerPoint, LaTeX Documentation, Hardware Schematics",
    obstaclesFaced: "Harmonizing divergent feedback from external department evaluators regarding power consumption envelopes and fail-safe return-to-home algorithms.",
    abstract: "Comprehensive departmental Zeroth Review defense document validating novelty, milestones, and guide-mentored deliverable trajectory.",
    presentationFile: "Zeroth_Review_Defense.pptx",
    pdfFile: "Zeroth_Review_Executive_Summary.pdf",
    repoUrl: "https://github.com/tarunika-r/crop-disease-drone",
    demoUrl: "https://crop-drone-demo.siet.ac.in",
    screenshotFile: "/logo.jpg",
    guideName: "Dr. P. Manimegalai",
    guideReviewDate: "05 Sep 2026",
    comments: "Review 0 successfully completed. Panel commended team coordination and clarity of mathematical formulation. Approved for subsequent milestone implementation.",
    score: 92,
    maxScore: 100
  },
  {
    week: 5,
    title: "Edge Hardware Deployment on Jetson Platform",
    dueDate: "Week 5",
    status: "Changes Requested",
    submissionDate: "07 Sep 2026",
    fileName: "Jetson_Telemetry_Logs.pptx",
    fileSize: "14.8 MB",
    projectTitle: "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
    problemStatement: "Quantization of weights to FP16 and TensorRT engine serialization under 15W power cap on NVIDIA Jetson Orin Nano.",
    solution: "Compiled TensorRT engine with FP16 precision. Connected CSI camera over GStreamer pipeline with zero-copy shared memory.",
    technologyUsed: "NVIDIA JetPack 5.1, TensorRT, GStreamer, C++20, ROS2 Humble",
    obstaclesFaced: "Thermal throttling encountered during sustained 10-minute inference on Jetson Orin Nano under full 15W power mode; frame drops on CSI GStreamer pipeline.",
    abstract: "Hardware telemetry analysis measuring inference wattage, frame latency, and temperature throttling under sustained flight simulation.",
    presentationFile: "Jetson_Telemetry_Logs.pptx",
    pdfFile: "Jetson_Thermal_Telemetry.pdf",
    repoUrl: "https://github.com/tarunika-r/crop-disease-drone/tree/main/jetson",
    demoUrl: "https://crop-drone-demo.siet.ac.in/telemetry",
    screenshotFile: "/logo.jpg",
    guideName: "Dr. P. Manimegalai",
    guideReviewDate: "08 Sep 2026",
    comments: "Thermal throttling observed during 10-minute continuous inference. Re-test with active cooling fan and update power envelope benchmarks before Review 1.",
    score: 72,
    maxScore: 100
  },
  {
    week: 6,
    title: "Field Prototype & Real-Time Dashboard Integration",
    dueDate: "Week 6",
    status: "Submitted",
    submissionDate: "10 Sep 2026",
    fileName: "Week6_Field_Report.pptx",
    fileSize: "9.3 MB",
    projectTitle: "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
    problemStatement: "Telemetry data streaming from drone to ground web station over WebSocket protocol with geo-tagged disease heatmaps.",
    solution: "React frontend dashboard displaying live video stream with overlay segmentation masks, GPS coordinates, and disease severity index.",
    technologyUsed: "React, WebSockets, Leaflet Maps, Fastify, Jetson Telemetry Server",
    obstaclesFaced: "Packet latency during WebSocket video streaming over 5GHz Wi-Fi bridge in outdoor open-field trials; GPS coordinate drift under dense foliage.",
    presentationFile: "Week6_Field_Report.pptx",
    guideName: "Dr. P. Manimegalai",
    guideReviewDate: "Pending Review",
    comments: "Currently under review by Project Guide Dr. P. Manimegalai. Preliminary prototype inspected at robotics lab."
  }
];

export const StudentService = {
  getCurrentAcademicWeek(): number {
    // Academic semester began Sunday, August 2, 2026.
    // Each Sunday rolls over to the next academic week automatically.
    const semesterStart = new Date(2026, 7, 2); // August is month 7 (0-indexed)
    const now = new Date();
    const diffTime = now.getTime() - semesterStart.getTime();
    if (diffTime < 0) return 1;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;
    return Math.max(1, Math.min(16, weekNumber));
  },
  getTeam(): StudentTeamExtended {
    try {
      const stored = localStorage.getItem("siet_student_team");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    localStorage.setItem("siet_student_team", JSON.stringify(DEFAULT_STUDENT_TEAM));
    return DEFAULT_STUDENT_TEAM;
  },

  saveTeam(team: StudentTeamExtended): void {
    localStorage.setItem("siet_student_team", JSON.stringify(team));
  },

  getSubmissions(): WeeklySubmission[] {
    try {
      const stored = localStorage.getItem("siet_student_submissions_v2");
      if (stored) {
        const parsed: WeeklySubmission[] = JSON.parse(stored);
        parsed.forEach(p => {
          if (!p.obstaclesFaced) {
            const def = DEFAULT_COMPLETED_WEEKS.find(w => w.week === p.week);
            if (def?.obstaclesFaced) p.obstaclesFaced = def.obstaclesFaced;
          }
          if (!p.technologyUsed) {
            const def = DEFAULT_COMPLETED_WEEKS.find(w => w.week === p.week);
            if (def?.technologyUsed) p.technologyUsed = def.technologyUsed;
          }
        });
        return parsed;
      }
    } catch (e) {}
    localStorage.setItem("siet_student_submissions_v2", JSON.stringify(DEFAULT_COMPLETED_WEEKS));
    return DEFAULT_COMPLETED_WEEKS;
  },

  saveSubmissions(submissions: WeeklySubmission[]): void {
    localStorage.setItem("siet_student_submissions_v2", JSON.stringify(submissions));
  },

  getDeliverables(weekText: string): StudentDeliverableState {
    const key = `siet_deliverable_${weekText.replace(/\s+/g, '_').toLowerCase()}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    const defaultState: StudentDeliverableState = {
      week: weekText,
      projectTitle: "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
      isTitleApproved: true,
      problemStatement: "Early-stage fungal crop diseases inflict substantial agricultural output losses before visible foliage symptoms appear. Traditional manual scouting is labor-intensive and lacks spatial precision.",
      solution: "An autonomous multi-rotor UAV outfitted with high-resolution edge vision hardware and YOLOv8 segmentation for real-time foliage disease mapping.",
      technologyUsed: "Python 3.10, PyTorch, YOLOv8 Nano, ROS2 Humble, NVIDIA Jetson Orin Nano",
      obstaclesFaced: "Packet latency during WebSocket video streaming over 5GHz Wi-Fi bridge in outdoor open-field trials; GPS coordinate drift under dense foliage.",
      abstract: "This project engineering endeavor formulates a lightweight computer vision pipeline hosted directly onboard unmanned aerial vehicles.",
      presentationFile: "Milestone_Presentation.pptx",
      repoUrl: "https://github.com/tarunika-r/crop-disease-drone",
      demoUrl: "https://crop-drone-demo.siet.ac.in",
      screenshotFile: "dashboard_output.png",
      submittedFields: {
        title: true,
        problemStatement: true,
        solution: true,
        technologyUsed: true,
        obstaclesFaced: true,
        abstract: true,
        presentation: true,
        repoUrl: true,
        demoUrl: true,
        screenshot: true
      }
    };
    return defaultState;
  },

  saveDeliverableField(
    weekText: string,
    field: keyof StudentDeliverableState['submittedFields'],
    value: string
  ): StudentDeliverableState {
    const key = `siet_deliverable_${weekText.replace(/\s+/g, '_').toLowerCase()}`;
    const current = this.getDeliverables(weekText);

    if (field === 'title') {
      current.projectTitle = value;
      // If Week 1 proposal, submitting title resets approval until Guide signs off
      if (weekText.toLowerCase().includes('week 1') || weekText.toLowerCase() === '1') {
        const team = this.getTeam();
        team.submittedTitle = value;
        team.isTitleApproved = false;
        team.guideApprovalStatus = 'Pending Review';
        this.saveTeam(team);
        current.isTitleApproved = false;
      }
    } else if (field === 'problemStatement') {
      current.problemStatement = value;
    } else if (field === 'solution') {
      current.solution = value;
    } else if (field === 'technologyUsed') {
      current.technologyUsed = value;
    } else if (field === 'obstaclesFaced') {
      current.obstaclesFaced = value;
    } else if (field === 'abstract') {
      current.abstract = value;
    } else if (field === 'presentation') {
      current.presentationFile = value;
    } else if (field === 'repoUrl') {
      current.repoUrl = value;
    } else if (field === 'demoUrl') {
      current.demoUrl = value;
    } else if (field === 'screenshot') {
      current.screenshotFile = value;
    }

    current.submittedFields[field] = true;
    localStorage.setItem(key, JSON.stringify(current));

    // Synchronize field change to current week in submissions ledger
    try {
      const match = weekText.match(/\d+/);
      if (match) {
        const weekNum = parseInt(match[0], 10);
        const list = this.getSubmissions();
        const item = list.find(s => s.week === weekNum);
        if (item) {
          if (field === 'title') item.projectTitle = value;
          if (field === 'problemStatement') item.problemStatement = value;
          if (field === 'solution') item.solution = value;
          if (field === 'technologyUsed') item.technologyUsed = value;
          if (field === 'obstaclesFaced') item.obstaclesFaced = value;
          if (field === 'abstract') item.abstract = value;
          if (field === 'presentation') { item.presentationFile = value; item.fileName = value; }
          if (field === 'repoUrl') item.repoUrl = value;
          if (field === 'demoUrl') item.demoUrl = value;
          if (field === 'screenshot') item.screenshotFile = value;
          this.saveSubmissions(list);
        }
      }
    } catch (e) {}

    // Auto-notify Guide, Advisor, HOD
    try {
      const notifs = JSON.parse(localStorage.getItem('siet_faculty_notifications') || '[]');
      notifs.unshift({
        id: `NOTIF-${Date.now()}`,
        date: new Date().toLocaleDateString('en-GB'),
        title: `Team 04 Submitted ${field.toUpperCase()} for ${weekText}`,
        targetRoles: ['guide', 'advisor', 'hod']
      });
      localStorage.setItem('siet_faculty_notifications', JSON.stringify(notifs));
    } catch (e) {}

    return current;
  },

  updateSubmission(weekNumber: number, updatedComments: string): boolean {
    const list = this.getSubmissions();
    const item = list.find(s => s.week === weekNumber);
    if (!item) return false;

    // Only allowed if status is Changes Requested or Rejected
    if (item.status !== 'Changes Requested' && item.status !== 'Pending') {
      return false;
    }

    item.status = 'Submitted';
    item.submissionDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    item.comments = `Updated: ${updatedComments}`;
    this.saveSubmissions(list);
    return true;
  }
};
