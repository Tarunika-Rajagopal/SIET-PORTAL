import { AuditLog } from '../types';
import {ApiClient} from './apiClient';


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
  async getFaculties(): Promise<AdminFaculty[]> {
    try {
      const fetchFaculty = await ApiClient.getAllFaculties(); 
      return fetchFaculty;
    } catch (e) {
      return [];
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

  async addFaculty(faculty: {
    name: string;
    email: string;
    designation: string;
    role: 'Advisor' | 'Guide' | 'Advisor & Guide' | 'None';
    advisorBatch?: string;
    advisorClass?: string;
    specialization?: string;
  }, reason: string = "New faculty semester onboarding"): Promise<void> {

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

    await ApiClient.addFaculty(newFaculty);
     
    
    let details = `Onboarded as ${faculty.role}`;
    if (faculty.advisorClass) {
      details += ` (Class ${faculty.advisorClass}, ${faculty.advisorBatch})`;
    }
    this.addAuditLog("Faculty Onboarding", faculty.name, details, reason);
  },

  async assignAdvisor(facultyEmail: string, batch: string, className: string): Promise<void> {

    try{
      const res = await ApiClient.assignAdvisor(facultyEmail, batch, className);
    }catch(e){
      console.error(e);
    }
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

  async removeAdvisorWithSuccessor(
    currentAdvisorEmail: string,
    successorEmail: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    
    await ApiClient.reassign(currentAdvisorEmail,successorEmail);

    return {
      success: true,
      message: `Details updated Successfully`
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
  async getStudents(): Promise<AdminStudent[]> {
    try{
      return await ApiClient.getAllStudents();
    }
    catch(e){
      console.error(e);
      return [];
    }
  },

  async saveStudents(students: AdminStudent[]): Promise<void> {
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

  async addStudent(student: {
    name: string;
    rollNo: string;
    email: string;
    password?: string;
    batch?: string;
    classSection?: string;
  }, reason: string = "Direct semester enrollment"): Promise<{ success: boolean; message: string }> {
    
    const newStudent: AdminStudent = {
      rollNo: student.rollNo,
      name: student.name,
      email: student.email,
      password: student.password || "student@123",
      batch: student.batch || "2023-2027 (III Year)",
      classSection: student.classSection || "CSE-B",
      teamNo: "Unassigned",
      projectTitle: "",
      guide: "Unassigned"
    };

    try{
      await ApiClient.addStudent(newStudent);
    }
    catch(e){
      console.error(e);
      return { success: false, message: `Failed to enroll student ${student.name}.` };
    }

    return { success: true, message: `Student ${student.name} enrolled successfully.` };
  },

  async importStudents(studentsToImport: Array<{
    name: string;
    rollNo: string;
    email: string;
    password?: string;
    batch: string;
    classSection: string;
  }>): Promise< { addedCount: number; errors: string[] }> {
    let addedCount = 0;  
    try{
        await ApiClient.importStudent(studentsToImport);
        return { addedCount: studentsToImport.length, errors: [] };
      }
      catch(e){
        console.error(e);
        return { addedCount: 0, errors: [e.message] };
      }
    },

  async deleteStudent(rollNo: string): Promise<boolean> {

        try{
          await ApiClient.deleteStudent(rollNo); 
        } catch(e){
          console.error(e);
          return false;
        }
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
