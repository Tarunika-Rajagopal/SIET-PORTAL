import { WeeklySubmission } from '../types';
import { StudentService } from './studentService';
import { getCanonicalStudentSubmissions } from './advisorSubmissionsService';

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
  rejectionReason?: string;
  guideApprovalStatus?: string;
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
    projectTitle: "",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    status: "In Progress",
    progress: 0,
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
    submissions: []
  },
  {
    id: "TEAM-CSE-Y3-B05",
    teamNo: "Team 05",
    projectTitle: "",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    status: "In Progress",
    progress: 0,
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
      { rollNo: "714023104038", name: "Janani S", email: "janani.s@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104051", name: "Manoj V", email: "manoj.v@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104058", name: "Nithya R", email: "nithya.r@srishakthi.ac.in", isLead: false }
    ],
    submissions: []
  },
  {
    id: "TEAM-CSE-Y3-B06",
    teamNo: "Team 06",
    projectTitle: "",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    status: "In Progress",
    progress: 0,
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
    submissions: []
  },
  {
    id: "TEAM-CSE-Y3-B07",
    teamNo: "Team 07",
    projectTitle: "",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    status: "In Progress",
    progress: 0,
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
      { rollNo: "714023104142", name: "Sneha M", email: "sneha.m@srishakthi.ac.in", isLead: true },
      { rollNo: "714023104148", name: "Suresh P", email: "suresh.p@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104155", name: "Swetha V", email: "swetha.v@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104162", name: "Varun K", email: "varun.k@srishakthi.ac.in", isLead: false }
    ],
    submissions: []
  },
  {
    id: "TEAM-CSE-Y3-A01",
    teamNo: "Team 01",
    projectTitle: "",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-A",
    status: "In Progress",
    progress: 0,
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
    submissions: []
  },
  {
    id: "TEAM-CSE-Y3-A02",
    teamNo: "Team 02",
    projectTitle: "",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-A",
    status: "In Progress",
    progress: 0,
    advisor: {
      name: "Dr. A. Ramesh",
      email: "ramesh.a@siet.ac.in",
      designation: "Associate Professor, CSE"
    },
    guide: {
      name: "Dr. P. Manimegalai",
      email: "dr.manimegalai@siet.ac.in",
      designation: "Associate Professor, CSE",
      specialization: "AI, Deep Learning & UAV Vision"
    },
    members: [
      { rollNo: "714023104018", name: "Aravind S", email: "aravind.s@srishakthi.ac.in", isLead: true },
      { rollNo: "714023104024", name: "Balaji R", email: "balaji.r@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104028", name: "Divya M", email: "divya.m@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104033", name: "Gokul K", email: "gokul.k@srishakthi.ac.in", isLead: false }
    ],
    submissions: []
  },
  {
    id: "TEAM-CSE-Y3-C08",
    teamNo: "Team 08",
    projectTitle: "",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-C",
    status: "In Progress",
    progress: 0,
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
    submissions: []
  },
  {
    id: "TEAM-CSE-Y3-C09",
    teamNo: "Team 09",
    projectTitle: "",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-C",
    status: "In Progress",
    progress: 0,
    advisor: {
      name: "Dr. M. Suresh",
      email: "suresh.m@siet.ac.in",
      designation: "Assistant Professor, CSE"
    },
    guide: {
      name: "Dr. P. Manimegalai",
      email: "dr.manimegalai@siet.ac.in",
      designation: "Associate Professor, CSE",
      specialization: "AI, Deep Learning & UAV Vision"
    },
    members: [
      { rollNo: "714023104205", name: "Deepa N", email: "deepa.n@srishakthi.ac.in", isLead: true },
      { rollNo: "714023104208", name: "Ezhil V", email: "ezhil.v@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104212", name: "Farooq A", email: "farooq.a@srishakthi.ac.in", isLead: false },
      { rollNo: "714023104218", name: "Gayathri S", email: "gayathri.s@srishakthi.ac.in", isLead: false }
    ],
    submissions: []
  }
];

function syncTeamWithStudentData(baseTeam: HodTeamDetails): HodTeamDetails {
  if (baseTeam.id === "TEAM-CSE-Y3-B04" || baseTeam.teamNo === "Team 04") {
    try {
      const sTeam = StudentService.getTeam();
      const d0 = StudentService.getDeliverables("Week 0");
      const realTitle = sTeam.submittedTitle || d0.projectTitle || sTeam.projectTitle || "";
      const realSubs = getCanonicalStudentSubmissions(realTitle);

      const isApproved = Boolean(sTeam.isTitleApproved || sTeam.guideApprovalStatus === 'Approved');
      const isRejected = sTeam.guideApprovalStatus === 'Rejected';
      const status: 'Approved' | 'In Progress' | 'Review Required' = isApproved
        ? 'Approved'
        : (isRejected ? 'Review Required' : 'In Progress');

      const members = (sTeam.members && sTeam.members.length > 0)
        ? sTeam.members.map((m: any) => ({
            rollNo: m.rollNo,
            name: m.name,
            email: m.email,
            isLead: m.role === 'Team Lead' || Boolean(m.isLead)
          }))
        : baseTeam.members;

      return {
        ...baseTeam,
        projectTitle: realTitle,
        status,
        rejectionReason: sTeam.rejectionReason || '',
        guideApprovalStatus: sTeam.guideApprovalStatus || (isApproved ? 'Approved' : 'Pending'),
        members,
        submissions: realSubs
      };
    } catch (e) {
      console.error('Error syncing Team 04 with student data', e);
    }
  }

  // Check guide storage siet_guide_portal_teams_v6 for guide evaluations and reasons
  try {
    const guideRaw = localStorage.getItem("siet_guide_portal_teams_v6");
    if (guideRaw) {
      const gTeams = JSON.parse(guideRaw);
      if (Array.isArray(gTeams)) {
        const gMatch = gTeams.find((gt: any) => 
          gt.teamId === baseTeam.id || 
          gt.teamNo === baseTeam.teamNo || 
          (baseTeam.teamNo && gt.teamNumber === parseInt(baseTeam.teamNo.replace(/\D/g, ''), 10))
        );
        if (gMatch) {
          const isGApproved = gMatch.titleStatus === 'Approved';
          const isGRejected = gMatch.titleStatus === 'Rejected';
          const status = isGApproved ? 'Approved' : (isGRejected ? 'Review Required' : baseTeam.status);
          const gSubs: WeeklySubmission[] = Array.isArray(gMatch.submissions)
            ? gMatch.submissions.map((gs: any) => ({
                week: gs.weekNumber ?? gs.week ?? 0,
                title: gs.title || `Milestone Week ${gs.weekNumber ?? gs.week ?? 0}`,
                status: gs.status || 'Submitted',
                comments: gs.comments || (isGRejected ? gMatch.rejectionReason : ''),
                submissionDate: gs.submissionDate || '',
                guideName: baseTeam.guide?.name || 'Dr. P. Manimegalai',
                projectTitle: gMatch.projectTitle || baseTeam.projectTitle || ''
              }))
            : [];
          return {
            ...baseTeam,
            projectTitle: gMatch.projectTitle || baseTeam.projectTitle || '',
            status,
            rejectionReason: gMatch.rejectionReason || '',
            guideApprovalStatus: gMatch.titleStatus || 'Pending',
            submissions: gSubs.length > 0 ? gSubs : baseTeam.submissions
          };
        }
      }
    }
  } catch (e) {}

  // For other teams, check local storage for real custom submissions
  try {
    const stored = localStorage.getItem(`siet_team_submissions_${baseTeam.id}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.filter(s => s && typeof s === 'object' && !String(s.presentationFile || '').includes('mock_ppt'));
        return {
          ...baseTeam,
          submissions: valid
        };
      }
    }
  } catch (e) {}

  return {
    ...baseTeam,
    projectTitle: baseTeam.projectTitle || "",
    submissions: []
  };
}

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
    const syncedTeams = MOCK_HOD_TEAMS.map(syncTeamWithStudentData);

    syncedTeams.forEach(team => {
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
    const syncedTeams = MOCK_HOD_TEAMS.map(syncTeamWithStudentData);

    return syncedTeams.filter(t => {
      const matchBatch = !batchFilter || batchFilter === 'ALL' || t.batch === batchFilter;
      const matchClass = !classFilter || classFilter === 'ALL' || t.classSection === classFilter;
      
      let matchSearch = true;
      if (searchTerm && searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const inTitle = (t.projectTitle || '').toLowerCase().includes(q);
        const inTeamNo = (t.teamNo || '').toLowerCase().includes(q);
        const inMembers = t.members.some(m => m.name.toLowerCase().includes(q) || m.rollNo.includes(q));
        const inGuide = (t.guide?.name || '').toLowerCase().includes(q);
        const inAdvisor = (t.advisor?.name || '').toLowerCase().includes(q);
        matchSearch = inTitle || inTeamNo || inMembers || inGuide || inAdvisor;
      }

      return matchBatch && matchClass && matchSearch;
    });
  },

  getTeamByStudent(rollNoOrName: string): HodTeamDetails | undefined {
    const q = rollNoOrName.toLowerCase();
    const syncedTeams = MOCK_HOD_TEAMS.map(syncTeamWithStudentData);
    return syncedTeams.find(t =>
      t.members.some(m => m.rollNo.toLowerCase() === q || m.name.toLowerCase().includes(q))
    );
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
