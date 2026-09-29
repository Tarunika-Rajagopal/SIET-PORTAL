import { AuditLog } from '../types';
import { ApiClient } from './apiClient';
import { queryClient, QUERY_KEYS } from '../lib/queryClient';


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

  getCachedFaculties(): AdminFaculty[] {
    const data = queryClient.getQueryData<AdminFaculty[]>(QUERY_KEYS.faculties);
    if (data && Array.isArray(data)) return [...data];
    try {
      const stored = localStorage.getItem("siet_admin_faculties");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  async getFaculties(forceRefresh: boolean = false): Promise<AdminFaculty[]> {
    try {
      if (forceRefresh) {
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.faculties });
      }
      return await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.faculties,
        queryFn: () => ApiClient.getAllFaculties(),
        staleTime: 1000 * 60 * 5,
      });
    } catch (e) {
      return [];
    }
  },

  saveFaculties(faculties: AdminFaculty[]): void {
    try {
      localStorage.setItem("siet_admin_faculties", JSON.stringify(faculties));
      queryClient.setQueryData(QUERY_KEYS.faculties, faculties);
      notifyListeners();
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
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.faculties });
     
    
    let details = `Onboarded as ${faculty.role}`;
    if (faculty.advisorClass) {
      details += ` (Class ${faculty.advisorClass}, ${faculty.advisorBatch})`;
    }
    this.addAuditLog("Faculty Onboarding", faculty.name, details, reason);
  },

  async assignAdvisor(facultyEmail: string, batch: string, className: string, reason?: string): Promise<boolean> {
    try {
      await ApiClient.assignAdvisor(facultyEmail, batch, className);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.faculties });
      return true;
    } catch(e) {
      console.error(e);
      return false;
    }
  },

  removeAdvisor(facultyEmail: string, reason: string, successorEmail?: string): boolean {
    if (successorEmail) {
      const res = this.removeAdvisorWithSuccessor(facultyEmail, successorEmail, reason);
      return res.success;
    }

    const list = this.getCachedFaculties();
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
  ): Promise<{ success: boolean; message: string }> {
    
    await ApiClient.reassign(currentAdvisorEmail);

    return {
      success: true,
      message: `Details updated Successfully`
    };
  },

  assignGuide(facultyEmail: string, reason: string): boolean {
    const list = this.getCachedFaculties();
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

    const list = this.getCachedFaculties();
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

  async removeGuidewithoutSuccessor(
    currentGuideEmail: string
  ): Promise<{ success: boolean; message: string }> {
      await ApiClient.deleteGuide(currentGuideEmail);
      return {success: true, message: "Details updated Successfully"};
  },

  async deleteFaculty(
    deleteid: string
  ): Promise<boolean> {
    try{
      await ApiClient.deleteFaculty(deleteid);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.faculties });
      return true;
    }
    catch(e){
      console.error(e);
      return false;
    }
  },

  // ---------------- STUDENT OPERATIONS ----------------
  async getStudents(forceRefresh: boolean = false): Promise<AdminStudent[]> {
    try{
      if (forceRefresh) {
        await queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      }
      return await queryClient.fetchQuery({
        queryKey: ['admin', 'students', 'ALL', 'ALL'],
        queryFn: () => ApiClient.getAllStudents(),
        staleTime: 1000 * 60 * 5,
      });
    }
    catch(e){
      console.error(e);
      return [];
    }
  },

  async saveStudents(students: AdminStudent[]): Promise<void> {
    try {
      localStorage.setItem("siet_admin_students", JSON.stringify(students));
      queryClient.setQueryData(['admin', 'students', 'ALL', 'ALL'], students);
      notifyListeners();
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

    try {
      const res = await ApiClient.addStudent(newStudent);
      if (res && res.success === false) {
        return { success: false, message: res.message || `Failed to enroll student ${student.name}.` };
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      await queryClient.invalidateQueries({ queryKey: ['advisor', 'students'] });
      await queryClient.invalidateQueries({ queryKey: ['advisor', 'teams'] });
    } catch (e: any) {
      console.error(e);
      return { success: false, message: e?.message || `Failed to enroll student ${student.name}.` };
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
        await queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
        return { addedCount: studentsToImport.length, errors: [] };
      }
      catch(e: any){
        console.error(e);
        return { addedCount: 0, errors: [e?.message || 'Import error'] };
      }
    },

  async deleteStudent(rollNo: string): Promise<boolean> {
        try{
          await ApiClient.deleteStudent(rollNo); 
          await queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
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
