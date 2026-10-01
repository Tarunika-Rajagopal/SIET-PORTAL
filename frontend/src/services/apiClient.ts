import {faculty} from '../types';
import { AdminStudent } from './adminService';

const PRIMARY_API_BASE_URL = 'http://127.0.0.1:8000/api/v1';
const FALLBACK_API_BASE_URL = 'http://localhost:8000/api/v1';

function getToken(): string | null {
  try {
    const raw = sessionStorage.getItem('siet_auth_token') || localStorage.getItem('siet_auth_token');
    if (raw) return raw;
    const userRaw = sessionStorage.getItem('siet_auth_user_v5') || localStorage.getItem('siet_auth_user_v5') || sessionStorage.getItem('siet_auth_user') || localStorage.getItem('siet_auth_user');
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      return parsed.token || null;
    }
  } catch (e) {}
  return null;
}

const inFlightRequests = new Map<string, Promise<any>>();

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';

  if (!isGet) {
    inFlightRequests.clear();
  } else if (inFlightRequests.has(endpoint)) {
    return inFlightRequests.get(endpoint) as Promise<T>;
  }

  const exec = async (): Promise<T> => {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${PRIMARY_API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (fetchErr: any) {
      try {
        response = await fetch(`${FALLBACK_API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } catch (fallbackErr: any) {
        if (fetchErr.name === 'TypeError' || fallbackErr.name === 'TypeError') {
          throw new Error('Cannot connect to backend server at localhost:8000 (or 127.0.0.1:8000). Is the server running?');
        }
        throw fetchErr;
      }
    }

    if (!response.ok) {
      let errorDetail = 'API request failed';
      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || JSON.stringify(errJson);
      } catch (e) {
        errorDetail = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorDetail);
    }

    return response.json();
  };

  const promise = exec().catch((err) => {
    inFlightRequests.delete(endpoint);
    throw err;
  });

  if (isGet) {
    inFlightRequests.set(endpoint, promise);
    // Cooldown deduplication window (5 seconds) across siblings and re-renders
    setTimeout(() => {
      inFlightRequests.delete(endpoint);
    }, 5000);
  }

  return promise;
}

export const ApiClient = {
  async checkServerHealth(): Promise<{ online: boolean; databaseOk: boolean; message: string }> {
    const urls = ['http://localhost:8000/health', 'http://127.0.0.1:8000/health'];
    for (const url of urls) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const data = await res.json();
          return { online: true, databaseOk: data.status === 'healthy', message: data.status };
        }
      } catch (err: any) {
        // Continue to next URL fallback
      }
    }
    return { online: false, databaseOk: false, message: 'Server is not responding (timeout)' };
  },

  // Auth
  async login(emailOrRoll: string, password: string) {
    const data = await request<{success:boolean;token:string;user:any;message?:string}>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrRoll, password }),
    });
    if (data.token) {
      localStorage.setItem('siet_auth_token', data.token);
      sessionStorage.setItem('siet_auth_token', data.token);
    }
    return data;
  },

  // Student Endpoints
  async getStudentTeam() {
    return request<any>('/student/team');
  },

  async getStudentSubmissions() {
    return request<any[]>('/student/submissions');
  },

  async getStudentSubmissionByWeek(weekNumber: number) {
    return request<any>(`/student/submissions/${weekNumber}`);
  },

  async submitStudentDeliverables(weekNumber: number, deliverables: {
    problemStatement?: string;
    solution?: string;
    technologyUsed?: string;
    obstaclesFaced?: string;
    abstract?: string;
    repoUrl?: string;
    demoUrl?: string;
    isSubmit?: boolean;
  }) {
    return request<any>(`/student/submissions/${weekNumber}`, {
      method: 'POST',
      body: JSON.stringify({
        problemStatement: deliverables.problemStatement,
        solution: deliverables.solution,
        technologyUsed: deliverables.technologyUsed,
        obstaclesFaced: deliverables.obstaclesFaced,
        abstract: deliverables.abstract,
        repoUrl: deliverables.repoUrl,
        demoUrl: deliverables.demoUrl,
        isSubmit: deliverables.isSubmit ?? true
      }),
    });
  },

  async updateProjectTitle(teamId: string, title: string) {
    return request<any>(`/projects/team/${teamId}/title`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  },

  async deleteStudentSubmission(weekNumber: number) {
    return request<any>(`/student/submissions/${weekNumber}`, {
      method: 'DELETE',
    });
  },

  // Guide Endpoints
  async getGuideTeams() {
    return request<any[]>('/guide/teams');
  },

  async getGuideDashboard() {
    return request<any>('/guide/dashboard');
  },

  async getGuidePendingSubmissions() {
    return request<any[]>('/guide/submissions/weekly');
  },

  async reviewWeeklySubmission(
    submissionId: string,
    status: 'APPROVED' | 'REVISION_REQUESTED' | 'REJECTED',
    comments?: string,
    score?: number,
    memberMarks?: Record<string, number>,
    gradedBy?: string
  ) {
    return request<any>(`/guide/submissions/${submissionId}/review`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        comments,
        score,
        memberMarks,
        gradedBy
      }),
    });
  },

  async reviewTeamWeeklySubmission(
    teamId: string,
    week: number,
    status: 'APPROVED' | 'REVISION_REQUESTED' | 'REJECTED',
    comments?: string,
    score?: number,
    memberMarks?: Record<string, number>,
    gradedBy?: string
  ) {
    return request<any>(`/guide/teams/${teamId}/submissions/${week}/review`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        comments,
        score,
        memberMarks,
        gradedBy
      }),
    });
  },

  async getAllWeeklyMarks(): Promise<Record<string, Record<number, any>>> {
    return request<Record<string, Record<number, any>>>('/marks/all');
  },

  async getTeamWeeklyMarks(teamId: string): Promise<Record<number, any>> {
    return request<Record<number, any>>(`/marks/${teamId}/weekly`);
  },

  async getWeeklyMark(teamId: string, weekNumber: number): Promise<any> {
    return request<any>(`/marks/${teamId}/weekly/${weekNumber}`);
  },

  async saveWeeklyMarks(
    teamId: string,
    weekNumber: number,
    memberMarks: Record<string, number>,
    remarks?: string,
    gradedBy?: string
  ) {
    return request<any>(`/marks/${teamId}/weekly/${weekNumber}`, {
      method: 'POST',
      body: JSON.stringify({
        memberMarks,
        remarks,
        gradedBy
      }),
    });
  },

  async approveProjectTitle(projectId: string, title?: string, remarks?: string) {
    return request<any>(`/projects/${projectId}/title-approval`, {
      method: 'POST',
      body: JSON.stringify({
        decision: 'APPROVED',
        remarks: remarks || 'Title scope approved.'
      }),
    });
  },

  async rejectProjectTitle(projectId: string, reason: string) {
    return request<any>(`/projects/${projectId}/title-approval`, {
      method: 'POST',
      body: JSON.stringify({
        decision: 'REJECTED',
        remarks: reason
      }),
    });
  },

  // Advisor Endpoints
  async getAdvisorStudents(className: string = "", batch?: string): Promise<AdminStudent[]> {
    const params = new URLSearchParams();
    if (className) params.append('className', className);
    if (batch && batch !== 'ALL') params.append('batch', batch);
    return request<AdminStudent[]>(`/advisor/students?${params.toString()}`);
  },

  async getAdvisorTeams(className: string = ""): Promise<any[]> {
    const params = new URLSearchParams();
    if (className) params.append('className', className);
    return request<any[]>(`/advisor/teams?${params.toString()}`);
  },

  async getAdvisorAvailableGuides(): Promise<any[]> {
    return request<any[]>('/advisor/available-guides');
  },

  async createAdvisorTeam(teamData: {
    className: string;
    batch: string;
    capacity: number;
    teamNo: string;
    title?: string;
    guide: string;
    guideEmail?: string;
    leadRollNo: string;
    memberRollNos: string[];
  }): Promise<any> {
    return request<any>('/advisor/teams', {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
  },

  async createAdvisorTeamsBulk(bulkData: {
    className: string;
    batch: string;
    capacity: number;
    teams: Array<{
      teamNo: string;
      title?: string;
      guide: string;
      guideEmail?: string;
      leadRollNo: string;
      memberRollNos?: string[];
      members?: any[];
    }>;
  }): Promise<any> {
    return request<any>('/advisor/teams/bulk', {
      method: 'POST',
      body: JSON.stringify(bulkData),
    });
  },

  async moveAdvisorStudent(data: {
    className: string;
    studentRollNo: string;
    targetTeamId: string;
  }): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/advisor/move-student', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async reassignAdvisorGuide(data: {
    className: string;
    teamId: string;
    guideName: string;
    guideEmail?: string;
  }): Promise<{ success: boolean; message: string; team?: any }> {
    return request<{ success: boolean; message: string; team?: any }>('/advisor/reassign-guide', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getAdvisorHistory(className: string = ""): Promise<any[]> {
    const params = new URLSearchParams();
    if (className) params.append('className', className);
    return request<any[]>(`/advisor/history?${params.toString()}`);
  },

  async logAdvisorHistory(entry: {
    className: string;
    actionType: string;
    target: string;
    details: string;
    actorName: string;
    role?: string;
  }): Promise<any> {
    return request<any>('/advisor/history', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },
  

  async logHodHistory(entry: {
    actionType: string;
    target: string;
    details: string;
    classSection: string;
    batch: string;
    performedBy: string;
  }): Promise<any> {
    return request<any>('/hod/history', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  //admin endpoints
  async getAllStudents() {
    return request<any[]>('/admin/students');
  },

  async getAllFaculties(){
    return request<any[]>('/admin/faculties');
  },

   async addFaculty(faculty:any){
    return request<any>(`/admin/faculties`,{
      method:'POST',
      body:JSON.stringify(faculty),
    })
   },

   async deleteFaculty(facultyEmail:string){
    return request<any>(`/admin/faculties/remove-faculty`,{
      method:'POST',
      body:JSON.stringify({
        faculty_email:facultyEmail,
      }),
    })
   },
   async reassign(email_one:string){

    // console.log('Communication to backend')
    return request<any>('/admin/reassign',{
      method:'POST',
      body:JSON.stringify({
        email_one:email_one,
      }),
    })
   },
   async removeGuide(email_one: string) {
    return request<any>('/admin/delete-guide', {
      method: 'POST',
      body: JSON.stringify({
        email_one: email_one,
      }),
    });
   },
   async addStudent(student:AdminStudent){
    return request<any>(`/admin/students`,{
      method:'POST',
      body:JSON.stringify(student),
    })
   },
   async importStudent(studentsToImport: Array<{
    name: string;
    rollNo: string;
    email: string;
    password?: string;
    batch: string;
    classSection: string;
  }>):Promise<any>{
    return request<any>(`/admin/students/import`,{
      method:'POST',
      body:JSON.stringify({
        students:studentsToImport
      }),
    })
   },
   async deleteStudent(rollNo:string){
    return request<any>(`/admin/students/${rollNo}`,{
      method:'DELETE',
    })
   },
   async updateStudent(student:AdminStudent){
    return request<any>(`/admin/students/${student.rollNo}`,{
      method:'PUT',
      body:JSON.stringify(student),
    })
   },
   async assignAdvisor(email:string,batch:string,className:string){
    // console.log('Endpoints', classSection);
    return request<any>(`/admin/faculties/assign-advisor`,{
      method:'POST',
      body:JSON.stringify({
        faculty_id:email,
        batch:batch,
        className:className,
      }),
    })
   },
   async getWeeklySubmissionsSummary(): Promise<Array<{ week: number; studentCount: number; submissionCount: number; status: string }>> {
     return request('/hod/weekly-submissions/summary');
   },
   async deleteWeeklySubmissions(weeks: number[]): Promise<{ success: boolean; deletedCount: number; weeks: number[]; message: string }> {
     return request('/hod/weekly-submissions', {
       method: 'DELETE',
       body: JSON.stringify({ weeks }),
     });
   },
   async getHodAdvisors(batch?: string, className?: string): Promise<any[]> {
     const params = new URLSearchParams();
     if (batch && batch !== 'ALL') params.append('batch', batch);
     if (className && className !== 'ALL') params.append('className', className);
     const qs = params.toString() ? `?${params.toString()}` : '';
     return request(`/hod/advisors${qs}`);
   },
   async getHodStudents(batch?: string, className?: string): Promise<any[]> {
     const params = new URLSearchParams();
     if (batch && batch !== 'ALL') params.append('batch', batch);
     if (className && className !== 'ALL') params.append('className', className);
     const qs = params.toString() ? `?${params.toString()}` : '';
     return request(`/hod/students${qs}`);
   },
   async getHodTeams(batch?: string, className?: string, search?: string): Promise<any[]> {
     const params = new URLSearchParams();
     if (batch && batch !== 'ALL') params.append('batch', batch);
     if (className && className !== 'ALL') params.append('className', className);
     if (search && search.trim()) params.append('search', search.trim());
     const qs = params.toString() ? `?${params.toString()}` : '';
     return request(`/hod/teams${qs}`);
   },
   async getHodFacultyList(): Promise<any[]> {
     return request('/hod/faculty-list');
   },
   async getHodHistory(): Promise<any[]> {
     return request('/hod/history');
   },
   async getHodStatistics(): Promise<{
     totalStudents: number;
     totalTeams: number;
     totalGuides: number;
     totalAdvisors: number;
     totalFaculty: number;
     activeProjects: number;
     pendingApprovals: number;
     departmentProgress: number;
     weeklySummary: Array<{ week: number; studentCount: number; submissionCount: number; status: string }>;
   }> {
     return request('/hod/statistics');
   },
   async getHodFilterOptions(): Promise<{ batches: string[]; classes: string[] }> {
     return request('/hod/filter-options');
   },
   async getHodWeekReleases(): Promise<{ releases: Record<string, boolean> }> {
     return request('/hod/week-releases');
   },
   async updateHodWeekRelease(week: number, released: boolean): Promise<any> {
     return request(`/hod/week-releases/${week}`, {
       method: 'PUT',
       body: JSON.stringify({ released }),
     });
   },
   async getStudentWeekReleases(): Promise<{ releases: Record<string, boolean> }> {
     return request('/student/week-releases');
   },
   async deleteGuide(guideEmail:string): Promise<null> {
     return request<null>(`/admin/delete-guide`,{
      method:'POST',
      body:JSON.stringify({
        guide_email:guideEmail,
      }),
     })
   },
   async getJobStatus(jobId: string) {
     return request<{
       job_id: string;
       job_type: string;
       status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING';
       progress: number;
       created_at: string;
       started_at?: string;
       completed_at?: string;
       error?: string;
       result?: any;
     }>(`/jobs/${jobId}`);
   },
   async createExportJob(reportType: string = 'HOD_SUMMARY', format: string = 'csv') {
     return request<{
       success: boolean;
       message: string;
       job_id: string;
       status: string;
     }>('/jobs/export', {
       method: 'POST',
       body: JSON.stringify({ reportType, format }),
     });
   }
};
