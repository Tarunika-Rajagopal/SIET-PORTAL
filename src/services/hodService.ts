import { WeeklySubmission } from '../types';
import { StudentService } from './studentService';

export interface HodAdvisor {
  id: string;
  name: string;
  email: string;
  designation: string;
  batch: string;
  assignedClass: string;
  teamsCount: number;
  studentsCount: number;
  status: 'Active' | 'Available';
}

export interface HodStudent {
  rollNo: string;
  name: string;
  email: string;
  batch: string;
  classSection: string;
  teamNo: string;
  teamId: string;
  projectTitle: string;
  guide: string;
  advisor: string;
}

export interface HodTeamDetails {
  id: string;
  teamNo: string;
  projectTitle: string;
  batch: string;
  classSection: string;
  status: 'Approved' | 'In Progress' | 'Review Required';
  progress: number;
  advisor: {
    name: string;
    email: string;
    designation: string;
  };
  guide: {
    name: string;
    email: string;
    designation: string;
    specialization: string;
  };
  members: Array<{
    rollNo: string;
    name: string;
    email: string;
    isLead: boolean;
  }>;
  submissions: WeeklySubmission[];
}

export const MOCK_HOD_ADVISORS: HodAdvisor[] = [
  {
    id: "adv-1",
    name: "Dr. R. Karthikeyan",
    email: "dr.karthik@siet.ac.in",
    designation: "Professor",
    batch: "2023-2027 (III Year)",
    assignedClass: "CSE-B",
    teamsCount: 16,
    studentsCount: 64,
    status: "Active"
  },
  {
    id: "adv-2",
    name: "Dr. A. Ramesh",
    email: "ramesh.a@siet.ac.in",
    designation: "Associate Professor",
    batch: "2023-2027 (III Year)",
    assignedClass: "CSE-A",
    teamsCount: 15,
    studentsCount: 62,
    status: "Active"
  },
  {
    id: "adv-3",
    name: "Dr. S. Kavitha",
    email: "kavitha.s@siet.ac.in",
    designation: "Assistant Professor",
    batch: "2023-2027 (III Year)",
    assignedClass: "CSE-C",
    teamsCount: 16,
    studentsCount: 65,
    status: "Active"
  },
  {
    id: "adv-4",
    name: "Dr. K. Senthil Kumar",
    email: "senthilkumar.k@siet.ac.in",
    designation: "Associate Professor",
    batch: "2024-2028 (II Year)",
    assignedClass: "CSE-A",
    teamsCount: 16,
    studentsCount: 64,
    status: "Active"
  },
  {
    id: "adv-5",
    name: "Dr. G. Sivakumar",
    email: "sivakumar.g@siet.ac.in",
    designation: "Assistant Professor",
    batch: "2024-2028 (II Year)",
    assignedClass: "CSE-B",
    teamsCount: 16,
    studentsCount: 63,
    status: "Active"
  }
];

export const MOCK_HOD_TEAMS: HodTeamDetails[] = [
  {
    id: "TEAM-CSE-Y3-B04",
    teamNo: "Team 04",
    projectTitle: "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    status: "Approved",
    progress: 75,
    advisor: {
      name: "Dr. R. Karthikeyan",
      email: "dr.karthik@siet.ac.in",
      designation: "Professor, CSE"
    },
    guide: {
      name: "Dr. P. Manimegalai",
      email: "dr.manimegalai@siet.ac.in",
      designation: "Associate Professor, CSE",
      specialization: "AI, Deep Learning & UAV Vision"
    },
    members: [
      { rollNo: "714023104112", name: "Tarunika Rajgopal", email: "tarunika.r@srishakthi.ac.in", isLead: true },
      { rollNo: "714023104178", name: "Vigneshwaran M", email: "vigneshwaran.m@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104189", name: "Vishnu Priya S", email: "vishnupriya.s@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104066", name: "Kavitha R", email: "kavitha.r@srishakthi.ac.in", isLead: false }
    ],
    submissions: [
      {
        week: 1,
        title: "Project Proposal, Scope & Problem Formulation",
        dueDate: "Week 1",
        status: "Approved",
        submissionDate: "14 Aug 2026",
        fileName: "Week1_Proposal_Deck.pptx",
        comments: "Approved by Dr. P. Manimegalai. Strong feasibility analysis and realistic hardware budget.",
        score: 95,
        maxScore: 100
      },
      {
        week: 2,
        title: "Dataset Acquisition & Preprocessing Pipeline",
        dueDate: "Week 2",
        status: "Approved",
        submissionDate: "21 Aug 2026",
        fileName: "Week2_Dataset_Report.pptx",
        comments: "Annotation quality verified across 3,200 aerial foliage images.",
        score: 92,
        maxScore: 100
      },
      {
        week: 3,
        title: "Model Architecture & Benchmark Exploration",
        dueDate: "Week 3",
        status: "Approved",
        submissionDate: "28 Aug 2026",
        fileName: "Week3_Model_Benchmark.pptx",
        comments: "YOLOv8 Nano inference verified on target Jetson compute board.",
        score: 90,
        maxScore: 100
      },
      {
        week: 4,
        title: "Zeroth Review Defense & Panel Presentation",
        dueDate: "Week 4",
        status: "Approved",
        submissionDate: "04 Sep 2026",
        fileName: "Zeroth_Review_Defense.pptx",
        comments: "Clear articulation of camera telemetry and payload weight.",
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
        comments: "Thermal envelope throttling observed during continuous flight. Add heatsink testing notes before Review 1.",
        score: 74,
        maxScore: 100
      },
      {
        week: 6,
        title: "Field Prototype & Real-Time Dashboard Integration",
        dueDate: "Week 6",
        status: "Submitted",
        submissionDate: "10 Sep 2026",
        fileName: "Week6_Field_Report.pptx",
        comments: "Under review by Project Technical Guide."
      },
      {
        week: 7,
        title: "Review 1 Milestone Defense & Technical Dossier",
        dueDate: "Week 7 (Upcoming)",
        status: "Pending"
      },
      {
        week: 8,
        title: "Yield Advisory Algorithm & Field Analytics",
        dueDate: "Week 8 (Upcoming)",
        status: "Pending"
      }
    ]
  },
  {
    id: "TEAM-CSE-Y3-B05",
    teamNo: "Team 05",
    projectTitle: "Decentralized Smart Grid Energy Trading Protocol",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    status: "Approved",
    progress: 70,
    advisor: {
      name: "Dr. R. Karthikeyan",
      email: "dr.karthik@siet.ac.in",
      designation: "Professor, CSE"
    },
    guide: {
      name: "Dr. A. Devipriya",
      email: "dr.devipriya@siet.ac.in",
      designation: "Associate Professor, CSE",
      specialization: "Smart Grids, Blockchain & IoT"
    },
    members: [
      { rollNo: "714023104035", name: "Harish Kumar K", email: "harish.k@srishakthi.ac.in", isLead: true },
      { rollNo: "714023104040", name: "Janani S", email: "janani.s@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104045", name: "Kishore M", email: "kishore.m@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104052", name: "Logesh R", email: "logesh.r@srishakthi.ac.in", isLead: false }
    ],
    submissions: [
      {
        week: 1,
        title: "Microgrid Energy Settlement & Consensus Architecture",
        dueDate: "Week 1",
        status: "Approved",
        submissionDate: "14 Aug 2026",
        fileName: "Week1_Energy_Trading_Proposal.pptx",
        comments: "Smart contract state diagram accepted by Dr. A. Devipriya.",
        score: 93,
        maxScore: 100
      },
      {
        week: 2,
        title: "Private EVM Testnet Setup & Gas Benchmarking",
        dueDate: "Week 2",
        status: "Approved",
        submissionDate: "21 Aug 2026",
        fileName: "Week2_EVM_Setup.pptx",
        comments: "Latency benchmarks within 2.4 seconds per peer transaction.",
        score: 91,
        maxScore: 100
      },
      {
        week: 3,
        title: "IoT Smart Meter Telemetry Interface",
        dueDate: "Week 3",
        status: "Approved",
        submissionDate: "28 Aug 2026",
        fileName: "Week3_IoT_Meter.pptx",
        comments: "Hardware MQTT connection validated.",
        score: 88,
        maxScore: 100
      }
    ]
  },
  {
    id: "TEAM-CSE-Y3-B06",
    teamNo: "Team 06",
    projectTitle: "Edge-AI Wearable for Real-Time Cardiac Arrhythmia Detection",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    status: "Approved",
    progress: 72,
    advisor: {
      name: "Dr. R. Karthikeyan",
      email: "dr.karthik@siet.ac.in",
      designation: "Professor, CSE"
    },
    guide: {
      name: "Dr. K. Vignesh",
      email: "dr.vignesh@siet.ac.in",
      designation: "Assistant Professor (Sr. Gr)",
      specialization: "Edge Computing, Wearables & NLP"
    },
    members: [
      { rollNo: "714023104088", name: "Naveen Raj", email: "naveen.r@srishakthi.ac.in", isLead: true },
      { rollNo: "714023104092", name: "Praveen S", email: "praveen.s@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104095", name: "Raja Vignesh", email: "raja.v@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104099", name: "Saranya K", email: "saranya.k@srishakthi.ac.in", isLead: false }
    ],
    submissions: [
      {
        week: 1,
        title: "ECG Signal Acquisition & Quantized CNN Proposal",
        dueDate: "Week 1",
        status: "Approved",
        submissionDate: "14 Aug 2026",
        fileName: "Week1_ECG_Wearable_Proposal.pptx",
        comments: "Validated against MIT-BIH Arrhythmia benchmark dataset.",
        score: 94,
        maxScore: 100
      }
    ]
  },
  {
    id: "TEAM-CSE-Y3-A01",
    teamNo: "Team 01",
    projectTitle: "Distributed Ledger for Healthcare Interoperability",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-A",
    status: "Approved",
    progress: 65,
    advisor: {
      name: "Dr. A. Ramesh",
      email: "ramesh.a@siet.ac.in",
      designation: "Associate Professor, CSE"
    },
    guide: {
      name: "Dr. A. Devipriya",
      email: "dr.devipriya@siet.ac.in",
      designation: "Associate Professor, CSE",
      specialization: "Smart Grids, Blockchain & IoT"
    },
    members: [
      { rollNo: "714023104015", name: "Ananya Sharma", email: "ananya.s@srishakthi.ac.in", isLead: true },
      { rollNo: "714023104022", name: "Bala Murugan", email: "bala.m@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104025", name: "Charan K", email: "charan.k@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104028", name: "Deepak R", email: "deepak.r@srishakthi.ac.in", isLead: false }
    ],
    submissions: [
      {
        week: 1,
        title: "HIPAA-Compliant Decentralized Storage Protocol",
        dueDate: "Week 1",
        status: "Approved",
        submissionDate: "14 Aug 2026",
        fileName: "Week1_Healthcare_Proposal.pptx",
        comments: "Architecture approved by Dr. A. Devipriya.",
        score: 92,
        maxScore: 100
      }
    ]
  },
  {
    id: "TEAM-CSE-Y3-C08",
    teamNo: "Team 08",
    projectTitle: "Autonomous Robotic Navigation in Agritech",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-C",
    status: "Approved",
    progress: 68,
    advisor: {
      name: "Dr. S. Kavitha",
      email: "kavitha.s@siet.ac.in",
      designation: "Assistant Professor, CSE"
    },
    guide: {
      name: "Dr. P. Manimegalai",
      email: "dr.manimegalai@siet.ac.in",
      designation: "Associate Professor, CSE",
      specialization: "AI, Deep Learning & UAV Vision"
    },
    members: [
      { rollNo: "714023104050", name: "Meera Krishnan", email: "meera.k@srishakthi.ac.in", isLead: true },
      { rollNo: "714023104055", name: "Nandhini V", email: "nandhini.v@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104060", name: "Pradeep S", email: "pradeep.s@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104065", name: "Rahul M", email: "rahul.m@srishakthi.ac.in", isLead: false }
    ],
    submissions: [
      {
        week: 1,
        title: "SLAM Navigation & Obstacle Avoidance Architecture",
        dueDate: "Week 1",
        status: "Approved",
        submissionDate: "14 Aug 2026",
        fileName: "Week1_Robotics_Proposal.pptx",
        comments: "LiDAR and camera sensor fusion approved.",
        score: 90,
        maxScore: 100
      }
    ]
  }
];

export const HodService = {
  getAdvisors(batchFilter?: string, classFilter?: string): HodAdvisor[] {
    return MOCK_HOD_ADVISORS.filter(a => {
      const matchBatch = !batchFilter || batchFilter === 'ALL' || a.batch === batchFilter;
      const matchClass = !classFilter || classFilter === 'ALL' || a.assignedClass === classFilter;
      return matchBatch && matchClass;
    });
  },

  getStudents(batchFilter?: string, classFilter?: string): HodStudent[] {
    const students: HodStudent[] = [];
    MOCK_HOD_TEAMS.forEach(team => {
      if (batchFilter && batchFilter !== 'ALL' && team.batch !== batchFilter) return;
      if (classFilter && classFilter !== 'ALL' && team.classSection !== classFilter) return;

      team.members.forEach(m => {
        students.push({
          rollNo: m.rollNo,
          name: m.name,
          email: m.email,
          batch: team.batch,
          classSection: team.classSection,
          teamNo: team.teamNo,
          teamId: team.id,
          projectTitle: team.projectTitle,
          guide: team.guide.name,
          advisor: team.advisor.name
        });
      });
    });
    return students;
  },

  getTeams(batchFilter?: string, classFilter?: string, searchTerm?: string): HodTeamDetails[] {
    return MOCK_HOD_TEAMS.map(t => {
      if (t.id === "TEAM-CSE-Y3-B04") {
        return {
          ...t,
          submissions: StudentService.getSubmissions()
        };
      }
      return t;
    }).filter(t => {
      const matchBatch = !batchFilter || batchFilter === 'ALL' || t.batch === batchFilter;
      const matchClass = !classFilter || classFilter === 'ALL' || t.classSection === classFilter;
      
      let matchSearch = true;
      if (searchTerm && searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const inTitle = t.projectTitle.toLowerCase().includes(q);
        const inTeamNo = t.teamNo.toLowerCase().includes(q);
        const inMembers = t.members.some(m => m.name.toLowerCase().includes(q) || m.rollNo.includes(q));
        const inGuide = t.guide.name.toLowerCase().includes(q);
        const inAdvisor = t.advisor.name.toLowerCase().includes(q);
        matchSearch = inTitle || inTeamNo || inMembers || inGuide || inAdvisor;
      }

      return matchBatch && matchClass && matchSearch;
    });
  },

  getTeamByStudent(rollNoOrName: string): HodTeamDetails | undefined {
    const q = rollNoOrName.toLowerCase();
    const team = MOCK_HOD_TEAMS.find(t =>
      t.members.some(m => m.rollNo.toLowerCase() === q || m.name.toLowerCase().includes(q))
    );
    if (team && team.id === "TEAM-CSE-Y3-B04") {
      return {
        ...team,
        submissions: StudentService.getSubmissions()
      };
    }
    return team;
  },

  getFacultyList() {
    return [
      { id: "fac-1", name: "Dr. R. Karthikeyan", designation: "Professor", email: "dr.karthik@siet.ac.in", phone: "+91 98421 23456", role: "Advisor & Guide", advisorClass: "CSE-B", teamsCount: 4, avgStudentProgress: 70, status: "Normal" as const },
      { id: "fac-2", name: "Dr. P. Manimegalai", designation: "Associate Professor", email: "dr.manimegalai@siet.ac.in", phone: "+91 98433 87654", role: "Guide", teamsCount: 4, avgStudentProgress: 75, status: "Normal" as const },
      { id: "fac-3", name: "Dr. A. Devipriya", designation: "Associate Professor", email: "dr.devipriya@siet.ac.in", phone: "+91 94431 54321", role: "Guide", teamsCount: 3, avgStudentProgress: 68, status: "Available" as const },
      { id: "fac-4", name: "Dr. K. Vignesh", designation: "Assistant Professor (Sr. Gr)", email: "dr.vignesh@siet.ac.in", phone: "+91 97890 12345", role: "Guide", teamsCount: 5, avgStudentProgress: 72, status: "Overloaded" as const }
    ];
  }
};
