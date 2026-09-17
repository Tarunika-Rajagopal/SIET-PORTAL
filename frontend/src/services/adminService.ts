import { AuditLog } from '../types';

export interface AdminFaculty {
  id: string;
  name: string;
  email: string;
  designation: string;
  role: 'Advisor' | 'Guide' | 'Advisor & Guide' | 'None';
  advisorBatch?: string;
  advisorClass?: string;
  specialization?: string;
  teamsCount: number;
  maxQuota: number;
  status: 'Active' | 'Available';
}

export interface AdminStudent {
  rollNo: string;
  name: string;
  email: string;
  password?: string;
  batch: string;
  classSection: string;
  teamNo: string;
  projectTitle: string;
  guide: string;
}

export const DEFAULT_FACULTIES: AdminFaculty[] = [
  {
    id: "fac-1",
    name: "Dr. R. Karthikeyan",
    email: "dr.karthik@siet.ac.in",
    designation: "Professor",
    role: "Advisor & Guide",
    advisorBatch: "2023-2027 (III Year)",
    advisorClass: "CSE-B",
    specialization: "Cloud Distributed Systems & Cybersecurity",
    teamsCount: 4,
    maxQuota: 5,
    status: "Active"
  },
  {
    id: "fac-2",
    name: "Dr. A. Ramesh",
    email: "ramesh.a@siet.ac.in",
    designation: "Associate Professor",
    role: "Advisor",
    advisorBatch: "2023-2027 (III Year)",
    advisorClass: "CSE-A",
    specialization: "VLSI & Embedded Systems",
    teamsCount: 0,
    maxQuota: 5,
    status: "Active"
  },
  {
    id: "fac-3",
    name: "Dr. S. Kavitha",
    email: "kavitha.s@siet.ac.in",
    designation: "Assistant Professor",
    role: "Advisor",
    advisorBatch: "2023-2027 (III Year)",
    advisorClass: "CSE-C",
    specialization: "Data Mining & Machine Learning",
    teamsCount: 0,
    maxQuota: 5,
    status: "Active"
  },
  {
    id: "fac-4",
    name: "Dr. P. Manimegalai",
    email: "manimegalai.p@siet.ac.in",
    designation: "Associate Professor",
    role: "Guide",
    specialization: "AI, Deep Learning & UAV Vision",
    teamsCount: 4,
    maxQuota: 5,
    status: "Active"
  },
  {
    id: "fac-5",
    name: "Dr. A. Devipriya",
    email: "devipriya.a@siet.ac.in",
    designation: "Associate Professor",
    role: "Guide",
    specialization: "Smart Grids, Blockchain & IoT",
    teamsCount: 3,
    maxQuota: 5,
    status: "Active"
  },
  {
    id: "fac-6",
    name: "Dr. K. Vignesh",
    email: "vignesh.k@siet.ac.in",
    designation: "Assistant Professor (Sr. Gr)",
    role: "Guide",
    specialization: "Edge Computing, Wearables & NLP",
    teamsCount: 5,
    maxQuota: 5,
    status: "Active"
  },
  {
    id: "fac-7",
    name: "Dr. G. Sivakumar",
    email: "sivakumar.g@siet.ac.in",
    designation: "Assistant Professor",
    role: "None",
    specialization: "Cybersecurity & Networks",
    teamsCount: 0,
    maxQuota: 5,
    status: "Available"
  }
];

export const DEFAULT_STUDENTS: AdminStudent[] = [
  // Class CSE-B - Team 04
  {
    rollNo: "714023104112",
    name: "Tarunika Rajgopal",
    email: "tarunika.r@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 04",
    projectTitle: "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
    guide: "Dr. P. Manimegalai"
  },
  {
    rollNo: "714023104178",
    name: "Vigneshwaran M",
    email: "vigneshwaran.m@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 04",
    projectTitle: "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
    guide: "Dr. P. Manimegalai"
  },
  {
    rollNo: "714023104189",
    name: "Vishnu Priya S",
    email: "vishnupriya.s@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 04",
    projectTitle: "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
    guide: "Dr. P. Manimegalai"
  },
  {
    rollNo: "714023104066",
    name: "Kavitha R",
    email: "kavitha.r@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 04",
    projectTitle: "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
    guide: "Dr. P. Manimegalai"
  },

  // Class CSE-B - Team 05
  {
    rollNo: "714023104035",
    name: "Harish Kumar K",
    email: "harish.k@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 05",
    projectTitle: "Decentralized Smart Grid Energy Trading Protocol",
    guide: "Dr. A. Devipriya"
  },
  {
    rollNo: "714023104038",
    name: "Janani S",
    email: "janani.s@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 05",
    projectTitle: "Decentralized Smart Grid Energy Trading Protocol",
    guide: "Dr. A. Devipriya"
  },
  {
    rollNo: "714023104051",
    name: "Manoj V",
    email: "manoj.v@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 05",
    projectTitle: "Decentralized Smart Grid Energy Trading Protocol",
    guide: "Dr. A. Devipriya"
  },
  {
    rollNo: "714023104058",
    name: "Nithya R",
    email: "nithya.r@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 05",
    projectTitle: "Decentralized Smart Grid Energy Trading Protocol",
    guide: "Dr. A. Devipriya"
  },

  // Class CSE-B - Team 06
  {
    rollNo: "714023104088",
    name: "Naveen Raj",
    email: "naveen.r@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 06",
    projectTitle: "Edge-AI Wearable for Real-Time Cardiac Arrhythmia Detection",
    guide: "Dr. K. Vignesh"
  },
  {
    rollNo: "714023104092",
    name: "Praveen S",
    email: "praveen.s@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 06",
    projectTitle: "Edge-AI Wearable for Real-Time Cardiac Arrhythmia Detection",
    guide: "Dr. K. Vignesh"
  },
  {
    rollNo: "714023104095",
    name: "Raja Vignesh",
    email: "raja.v@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 06",
    projectTitle: "Edge-AI Wearable for Real-Time Cardiac Arrhythmia Detection",
    guide: "Dr. K. Vignesh"
  },
  {
    rollNo: "714023104099",
    name: "Saranya K",
    email: "saranya.k@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 06",
    projectTitle: "Edge-AI Wearable for Real-Time Cardiac Arrhythmia Detection",
    guide: "Dr. K. Vignesh"
  },

  // Class CSE-B - Team 07
  {
    rollNo: "714023104142",
    name: "Sneha M",
    email: "sneha.m@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 07",
    projectTitle: "LLM-Powered Multi-Lingual Legal Advisory System for Rural Citizens",
    guide: "Dr. P. Manimegalai"
  },
  {
    rollNo: "714023104148",
    name: "Suresh P",
    email: "suresh.p@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 07",
    projectTitle: "LLM-Powered Multi-Lingual Legal Advisory System for Rural Citizens",
    guide: "Dr. P. Manimegalai"
  },
  {
    rollNo: "714023104155",
    name: "Swetha V",
    email: "swetha.v@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 07",
    projectTitle: "LLM-Powered Multi-Lingual Legal Advisory System for Rural Citizens",
    guide: "Dr. P. Manimegalai"
  },
  {
    rollNo: "714023104162",
    name: "Varun K",
    email: "varun.k@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-B",
    teamNo: "Team 07",
    projectTitle: "LLM-Powered Multi-Lingual Legal Advisory System for Rural Citizens",
    guide: "Dr. P. Manimegalai"
  },

  // Class CSE-A - Team 01 & Team 02
  {
    rollNo: "714023104015",
    name: "Ananya Sharma",
    email: "ananya.s@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-A",
    teamNo: "Team 01",
    projectTitle: "Distributed Ledger for Healthcare Interoperability",
    guide: "Dr. A. Devipriya"
  },
  {
    rollNo: "714023104022",
    name: "Bala Murugan",
    email: "bala.m@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-A",
    teamNo: "Team 01",
    projectTitle: "Distributed Ledger for Healthcare Interoperability",
    guide: "Dr. A. Devipriya"
  },
  {
    rollNo: "714023104018",
    name: "Aravind S",
    email: "aravind.s@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-A",
    teamNo: "Team 02",
    projectTitle: "Autonomous Swarm UAV Platform",
    guide: "Dr. P. Manimegalai"
  },
  {
    rollNo: "714023104024",
    name: "Balaji R",
    email: "balaji.r@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-A",
    teamNo: "Team 02",
    projectTitle: "Autonomous Swarm UAV Platform",
    guide: "Dr. P. Manimegalai"
  },

  // Class CSE-C - Team 08 & Team 09
  {
    rollNo: "714023104050",
    name: "Meera Krishnan",
    email: "meera.k@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-C",
    teamNo: "Team 08",
    projectTitle: "Autonomous Robotic Navigation in Agritech",
    guide: "Dr. P. Manimegalai"
  },
  {
    rollNo: "714023104205",
    name: "Deepa N",
    email: "deepa.n@srishakthi.ac.in",
    batch: "2023-2027 (III Year)",
    classSection: "CSE-C",
    teamNo: "Team 09",
    projectTitle: "Edge Computing AI Pipeline for Smart Agriculture",
    guide: "Dr. P. Manimegalai"
  }
];

export const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: "LOG-1741549800001",
    timestamp: "2026-09-09T14:30:00.000Z",
    dateFormatted: "09 Sep 2026, 02:30 PM",
    dateKey: "2026-09-09",
    monthKey: "2026-09",
    actionType: "Faculty Allocation",
    target: "Dr. R. Karthikeyan",
    details: "Designated as Class Advisor for Class CSE-B (Batch 2023-2027 III Year)",
    reason: "Academic semester workload distribution",
    admin: "admin@siet.ac.in"
  },
  {
    id: "LOG-1741549800002",
    timestamp: "2026-09-09T15:15:00.000Z",
    dateFormatted: "09 Sep 2026, 03:15 PM",
    dateKey: "2026-09-09",
    monthKey: "2026-09",
    actionType: "Guide Mentorship",
    target: "Dr. P. Manimegalai",
    details: "Allocated 4 Capstone Student Teams in AI & Edge Computing",
    reason: "Research specialization alignment",
    admin: "admin@siet.ac.in"
  },
  {
    id: "LOG-1741549800003",
    timestamp: "2026-09-10T11:00:00.000Z",
    dateFormatted: "10 Sep 2026, 11:00 AM",
    dateKey: "2026-09-10",
    monthKey: "2026-09",
    actionType: "Student Roster Sync",
    target: "Class CSE-B (64 Students)",
    details: "Updated register numbers and assigned project student sections",
    reason: "Semester registration finalization",
    admin: "admin@siet.ac.in"
  }
];

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach(cb => {
    try { cb(); } catch (e) { console.error(e); }
  });
}

export const AdminService = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // ---------------- FACULTY OPERATIONS ----------------
  getFaculties(): AdminFaculty[] {
    try {
      const stored = localStorage.getItem("siet_admin_faculties");
      if (stored) return JSON.parse(stored);
      localStorage.setItem("siet_admin_faculties", JSON.stringify(DEFAULT_FACULTIES));
      return DEFAULT_FACULTIES;
    } catch (e) {
      return DEFAULT_FACULTIES;
    }
  },

  saveFaculties(faculties: AdminFaculty[]): void {
    try {
      localStorage.setItem("siet_admin_faculties", JSON.stringify(faculties));
      notifyListeners();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('siet_admin_faculties_updated'));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error(e);
    }
  },

  addFaculty(faculty: {
    name: string;
    email: string;
    designation: string;
    role: 'Advisor' | 'Guide' | 'Advisor & Guide' | 'None';
    advisorBatch?: string;
    advisorClass?: string;
    specialization?: string;
  }, reason: string = "New faculty semester onboarding"): void {
    const list = this.getFaculties();
    const newFaculty: AdminFaculty = {
      id: `fac-${Date.now()}`,
      name: faculty.name,
      email: faculty.email,
      designation: faculty.designation,
      role: faculty.role,
      advisorBatch: faculty.advisorBatch || undefined,
      advisorClass: faculty.advisorClass || undefined,
      specialization: faculty.specialization || "Computer Science & Engineering",
      teamsCount: 0,
      maxQuota: 5,
      status: "Active"
    };

    list.push(newFaculty);
    this.saveFaculties(list);

    let details = `Onboarded as ${faculty.role}`;
    if (faculty.advisorClass) {
      details += ` (Class ${faculty.advisorClass}, ${faculty.advisorBatch})`;
    }
    this.addAuditLog("Faculty Onboarding", faculty.name, details, reason);
  },

  assignAdvisor(facultyEmail: string, batch: string, className: string, reason: string): boolean {
    const list = this.getFaculties();
    const faculty = list.find(f => f.email === facultyEmail);
    if (!faculty) return false;

    // Check if another advisor already holds this class
    const existing = list.find(f => f.email !== facultyEmail && f.advisorBatch === batch && f.advisorClass === className);
    if (existing) {
      if (existing.role === 'Advisor & Guide') {
        existing.role = 'Guide';
      } else {
        existing.role = 'None';
      }
      existing.advisorBatch = undefined;
      existing.advisorClass = undefined;
    }

    if (faculty.role === 'Guide') {
      faculty.role = 'Advisor & Guide';
    } else {
      faculty.role = 'Advisor';
    }
    faculty.advisorBatch = batch;
    faculty.advisorClass = className;
    faculty.status = 'Active';

    this.saveFaculties(list);
    this.addAuditLog("Advisor Assignment", faculty.name, `Designated Class Advisor for Class ${className} (${batch})`, reason);
    return true;
  },

  removeAdvisor(facultyEmail: string, reason: string, successorEmail?: string): boolean {
    if (successorEmail) {
      const res = this.removeAdvisorWithSuccessor(facultyEmail, successorEmail, reason);
      return res.success;
    }

    const list = this.getFaculties();
    const faculty = list.find(f => f.email === facultyEmail);
    if (!faculty) return false;

    const prevClass = faculty.advisorClass || 'Class';
    const prevBatch = faculty.advisorBatch || '';

    if (faculty.role === 'Advisor & Guide') {
      faculty.role = 'Guide';
    } else {
      faculty.role = 'None';
    }
    faculty.advisorBatch = undefined;
    faculty.advisorClass = undefined;

    this.saveFaculties(list);
    this.addAuditLog("Advisor Role Revocation", faculty.name, `Removed as Class Advisor for ${prevClass} (${prevBatch}). Role set to ${faculty.role}`, reason);
    return true;
  },

  removeAdvisorWithSuccessor(
    currentAdvisorEmail: string,
    successorEmail: string,
    reason: string
  ): { success: boolean; message: string } {
    const list = this.getFaculties();
    const current = list.find(f => f.email === currentAdvisorEmail);
    if (!current) return { success: false, message: "Advisor record not found." };

    const successor = list.find(f => f.email === successorEmail);
    if (!successor) return { success: false, message: "Successor faculty record not found." };

    const className = current.advisorClass || "CSE-B";
    const batch = current.advisorBatch || "2023-2027 (III Year)";
    const currentName = current.name;
    const successorName = successor.name;

    // 1. Relieve current advisor
    if (current.role === 'Advisor & Guide') {
      current.role = 'Guide';
    } else {
      current.role = 'None';
    }
    current.advisorClass = undefined;
    current.advisorBatch = undefined;

    // 2. Assign successor as class advisor
    successor.advisorClass = className;
    successor.advisorBatch = batch;
    if (successor.role === 'Guide') {
      successor.role = 'Advisor & Guide';
    } else {
      successor.role = 'Advisor';
    }
    successor.status = 'Active';

    this.saveFaculties(list);

    // 3. Dual Audit Log Entries
    this.addAuditLog(
      "Class Advisor Reassignment",
      successorName,
      `Inherited Class Advisor duties for Class ${className} (${batch}) from ${currentName}`,
      reason
    );
    this.addAuditLog(
      "Advisor Role Revocation",
      currentName,
      `Relieved from Class Advisor duties for Class ${className}. Handed over to non-advisor faculty ${successorName}. Role updated to ${current.role}`,
      reason
    );

    return {
      success: true,
      message: `Shifted Class ${className} supervision to ${successorName} and removed advisor role from ${currentName}.`
    };
  },

  assignGuide(facultyEmail: string, reason: string): boolean {
    const list = this.getFaculties();
    const faculty = list.find(f => f.email === facultyEmail);
    if (!faculty) return false;

    if (faculty.role === 'Advisor') {
      faculty.role = 'Advisor & Guide';
    } else {
      faculty.role = 'Guide';
    }
    faculty.status = 'Active';

    this.saveFaculties(list);
    this.addAuditLog("Guide Role Assignment", faculty.name, `Assigned Project Technical Guide status with quota of ${faculty.maxQuota} teams`, reason);
    return true;
  },

  removeGuide(facultyEmail: string, reason: string, successorEmail?: string): boolean {
    if (successorEmail) {
      const res = this.removeGuideWithSuccessor(facultyEmail, successorEmail, reason);
      return res.success;
    }

    const list = this.getFaculties();
    const faculty = list.find(f => f.email === facultyEmail);
    if (!faculty) return false;

    if (faculty.role === 'Advisor & Guide') {
      faculty.role = 'Advisor';
    } else {
      faculty.role = 'None';
    }
    faculty.teamsCount = 0;

    this.saveFaculties(list);
    this.addAuditLog("Guide Role Revocation", faculty.name, `Removed from Project Guide role. Role set to ${faculty.role}`, reason);
    return true;
  },

  removeGuideWithSuccessor(
    currentGuideEmail: string,
    successorEmail: string,
    reason: string
  ): { success: boolean; message: string } {
    const list = this.getFaculties();
    const current = list.find(f => f.email === currentGuideEmail);
    if (!current) return { success: false, message: "Guide record not found." };

    const successor = list.find(f => f.email === successorEmail);
    if (!successor) return { success: false, message: "Successor faculty record not found." };

    const currentName = current.name;
    const successorName = successor.name;
    const teamsToShift = current.teamsCount;

    // 1. Relieve current guide
    if (current.role === 'Advisor & Guide') {
      current.role = 'Advisor';
    } else {
      current.role = 'None';
    }
    current.teamsCount = 0;

    // 2. Assign successor as guide and transfer teams
    successor.teamsCount += teamsToShift;
    if (successor.role === 'Advisor') {
      successor.role = 'Advisor & Guide';
    } else {
      successor.role = 'Guide';
    }
    successor.status = 'Active';

    this.saveFaculties(list);

    // 3. Update student records that had this guide
    try {
      const students = this.getStudents();
      let updatedStudents = false;
      students.forEach(s => {
        if (s.guide === currentName) {
          s.guide = successorName;
          updatedStudents = true;
        }
      });
      if (updatedStudents) {
        this.saveStudents(students);
      }
    } catch (e) {
      console.error("Error shifting student guides:", e);
    }

    // 4. Update advisor teams in localStorage if any
    try {
      ['CSE-A', 'CSE-B', 'CSE-C'].forEach(c => {
        const key = `siet_advisor_teams_${c}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            let updated = false;
            parsed.forEach((t: any) => {
              if (t.guide === currentName || t.guideEmail === currentGuideEmail) {
                t.guide = successorName;
                t.guideEmail = successor.email;
                updated = true;
              }
            });
            if (updated) {
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          }
        }
      });
    } catch (e) {
      console.error("Error updating advisor teams:", e);
    }

    // 5. Dual Audit Log Entries
    this.addAuditLog(
      "Guide Workload Reallocation",
      successorName,
      `Adopted ${teamsToShift} capstone project teams from departing guide ${currentName}. Designated as Project Guide.`,
      reason
    );
    this.addAuditLog(
      "Guide Role Revocation",
      currentName,
      `Relieved from Project Guide role. Reassigned ${teamsToShift} teams to non-guide faculty ${successorName}. Role set to ${current.role}`,
      reason
    );

    return {
      success: true,
      message: `Shifted ${teamsToShift} teams to ${successorName} and removed guide role from ${currentName}.`
    };
  },

  shiftWorkloadAndDeleteFaculty(
    deleteEmail: string,
    advisorSuccessorEmail?: string,
    guideSuccessorEmail?: string,
    reason: string = "Faculty tenure concluded"
  ): boolean {
    const list = this.getFaculties();
    const faculty = list.find(f => f.email === deleteEmail);
    if (!faculty) return false;

    const deletedName = faculty.name;
    const isAdvisor = faculty.role === 'Advisor' || faculty.role === 'Advisor & Guide';
    const isGuide = faculty.role === 'Guide' || faculty.role === 'Advisor & Guide';

    // 1. Shift Advisor workload if applicable
    if (isAdvisor && advisorSuccessorEmail && faculty.advisorClass && faculty.advisorBatch) {
      const advSuccessor = list.find(f => f.email === advisorSuccessorEmail);
      if (advSuccessor) {
        advSuccessor.advisorBatch = faculty.advisorBatch;
        advSuccessor.advisorClass = faculty.advisorClass;
        if (advSuccessor.role === 'Guide') {
          advSuccessor.role = 'Advisor & Guide';
        } else {
          advSuccessor.role = 'Advisor';
        }
        advSuccessor.status = 'Active';
        this.addAuditLog(
          "Workload Reallocation",
          advSuccessor.name,
          `Inherited Class Advisor duties for ${faculty.advisorClass} from departing faculty ${deletedName}`,
          reason
        );
      }
    }

    // 2. Shift Guide workload if applicable
    if (isGuide && guideSuccessorEmail) {
      const gdSuccessor = list.find(f => f.email === guideSuccessorEmail);
      if (gdSuccessor) {
        gdSuccessor.teamsCount += faculty.teamsCount;
        if (gdSuccessor.role === 'Advisor') {
          gdSuccessor.role = 'Advisor & Guide';
        } else {
          gdSuccessor.role = 'Guide';
        }
        gdSuccessor.status = 'Active';

        // Update student records that had this guide
        try {
          const students = this.getStudents();
          let updatedStudents = false;
          students.forEach(s => {
            if (s.guide === deletedName) {
              s.guide = gdSuccessor.name;
              updatedStudents = true;
            }
          });
          if (updatedStudents) {
            this.saveStudents(students);
          }
        } catch (e) {
          console.error("Error updating student guides on delete:", e);
        }

        // Update advisor teams in localStorage
        try {
          ['CSE-A', 'CSE-B', 'CSE-C'].forEach(c => {
            const key = `siet_advisor_teams_${c}`;
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                let updated = false;
                parsed.forEach((t: any) => {
                  if (t.guide === deletedName || t.guideEmail === deleteEmail) {
                    t.guide = gdSuccessor.name;
                    t.guideEmail = gdSuccessor.email;
                    updated = true;
                  }
                });
                if (updated) {
                  localStorage.setItem(key, JSON.stringify(parsed));
                }
              }
            }
          });
        } catch (e) {
          console.error("Error updating advisor teams on delete:", e);
        }

        this.addAuditLog(
          "Mentorship Reallocation",
          gdSuccessor.name,
          `Inherited ${faculty.teamsCount} research teams from departing guide ${deletedName}`,
          reason
        );
      }
    }

    // 3. Remove faculty from list
    const updatedList = list.filter(f => f.email !== deleteEmail);
    this.saveFaculties(updatedList);

    // 4. Log full deletion
    this.addAuditLog(
      "Faculty Termination & Account Purge",
      deletedName,
      `Completely purged faculty credentials (${deleteEmail}). Access revoked.`,
      reason
    );

    return true;
  },

  // ---------------- STUDENT OPERATIONS ----------------
  getStudents(): AdminStudent[] {
    try {
      const stored = localStorage.getItem("siet_admin_students");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.some((s: any) => s.rollNo === '714023104189')) {
            const existingRolls = new Set(parsed.map((s: any) => s.rollNo));
            const missing = DEFAULT_STUDENTS.filter(s => !existingRolls.has(s.rollNo));
            const combined = [...parsed, ...missing];
            localStorage.setItem("siet_admin_students", JSON.stringify(combined));
            return combined;
          }
          return parsed;
        }
      }
      localStorage.setItem("siet_admin_students", JSON.stringify(DEFAULT_STUDENTS));
      return DEFAULT_STUDENTS;
    } catch (e) {
      return DEFAULT_STUDENTS;
    }
  },

  saveStudents(students: AdminStudent[]): void {
    try {
      localStorage.setItem("siet_admin_students", JSON.stringify(students));
      notifyListeners();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('siet_admin_students_updated'));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error(e);
    }
  },

  addStudent(student: {
    name: string;
    rollNo: string;
    email: string;
    password?: string;
    batch?: string;
    classSection?: string;
  }, reason: string = "Direct semester enrollment"): { success: boolean; message: string } {
    const list = this.getStudents();
    if (list.some(s => s.rollNo === student.rollNo)) {
      return { success: false, message: `Student with Register Number ${student.rollNo} already exists!` };
    }
    if (list.some(s => s.email.toLowerCase() === student.email.toLowerCase())) {
      return { success: false, message: `Student with email ${student.email} already exists!` };
    }

    const newStudent: AdminStudent = {
      rollNo: student.rollNo,
      name: student.name,
      email: student.email,
      password: student.password || "student@123",
      batch: student.batch || "2023-2027 (III Year)",
      classSection: student.classSection || "CSE-B",
      teamNo: "Unassigned",
      projectTitle: "Capstone Proposal Pending",
      guide: "Unassigned"
    };

    list.push(newStudent);
    this.saveStudents(list);

    this.addAuditLog(
      "Student Registration",
      `${student.name} (${student.rollNo})`,
      `Registered to ${newStudent.classSection} • ${newStudent.batch}`,
      reason
    );

    return { success: true, message: `Student ${student.name} enrolled successfully.` };
  },

  importStudents(studentsToImport: Array<{
    name: string;
    rollNo: string;
    email: string;
    password?: string;
    batch?: string;
    classSection?: string;
  }>, reason: string = "Batch CSV roster synchronization"): { addedCount: number; errors: string[] } {
    const list = this.getStudents();
    let addedCount = 0;
    const errors: string[] = [];

    studentsToImport.forEach(s => {
      if (!s.name || !s.rollNo || !s.email) {
        errors.push(`Row omitted: missing name, rollNo, or email.`);
        return;
      }
      if (list.some(x => x.rollNo === s.rollNo)) {
        errors.push(`Duplicate Register No ${s.rollNo} omitted.`);
        return;
      }

      list.push({
        rollNo: s.rollNo,
        name: s.name,
        email: s.email,
        password: s.password || "student@123",
        batch: s.batch || "2023-2027 (III Year)",
        classSection: s.classSection || "CSE-B",
        teamNo: "Unassigned",
        projectTitle: "Capstone Proposal Pending",
        guide: "Unassigned"
      });
      addedCount++;
    });

    if (addedCount > 0) {
      this.saveStudents(list);
      this.addAuditLog(
        "Bulk Student Import",
        `${addedCount} Enrolled Candidates`,
        `Synchronized roster with ${addedCount} student records via spreadsheet parser`,
        reason
      );
    }

    return { addedCount, errors };
  },

  deleteStudent(rollNo: string, reason: string): boolean {
    const list = this.getStudents();
    const student = list.find(s => s.rollNo === rollNo);
    if (!student) return false;

    const updated = list.filter(s => s.rollNo !== rollNo);
    this.saveStudents(updated);

    this.addAuditLog(
      "Student Deprovisioning",
      `${student.name} (${student.rollNo})`,
      `Removed from class section ${student.classSection}. Account access discontinued.`,
      reason
    );
    return true;
  },

  // ---------------- AUDIT LOG OPERATIONS ----------------
  getAuditLogs(): AuditLog[] {
    try {
      const stored = localStorage.getItem("siet_admin_audit_logs");
      if (stored) return JSON.parse(stored);
      localStorage.setItem("siet_admin_audit_logs", JSON.stringify(DEFAULT_AUDIT_LOGS));
      return DEFAULT_AUDIT_LOGS;
    } catch (e) {
      return DEFAULT_AUDIT_LOGS;
    }
  },

  addAuditLog(actionType: string, target: string, details: string, reason: string, admin: string = "admin@siet.ac.in"): void {
    const logs = this.getAuditLogs();
    const now = new Date();
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}`,
      timestamp: now.toISOString(),
      dateFormatted: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      dateKey: now.toISOString().split('T')[0],
      monthKey: now.toISOString().substring(0, 7),
      actionType,
      target,
      details,
      reason,
      admin
    };
    logs.unshift(newLog);
    try {
      localStorage.setItem("siet_admin_audit_logs", JSON.stringify(logs));
      notifyListeners();
    } catch (e) {
      console.error(e);
    }
  }
};
