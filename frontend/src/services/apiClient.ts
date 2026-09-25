import {faculty} from '../types';
import { AdminStudent } from './adminService';

const API_BASE_URL = 'http://localhost:8000/api/v1';

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

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (fetchErr: any) {
    if (fetchErr.name === 'TypeError' && fetchErr.message?.includes('fetch')) {
      throw new Error('Cannot connect to backend server at localhost:8000. Is the server running?');
    }
    throw fetchErr;
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
}

export const ApiClient = {
  async checkServerHealth(): Promise<{ online: boolean; databaseOk: boolean; message: string }> {
    try {
      const res = await fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        return { online: false, databaseOk: false, message: `Server returned ${res.status}` };
      }
      const data = await res.json();
      return { online: true, databaseOk: data.status === 'healthy', message: data.status };
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        return { online: false, databaseOk: false, message: 'Server is not responding (timeout)' };
      }
      return { online: false, databaseOk: false, message: 'Cannot connect to backend server at localhost:8000' };
    }
  },

  // Auth
  async login(emailOrRoll: string, password: string) {
    const data = await request<{success:boolean;token:string;user:any;message?:string}>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrRoll, password }),
    });
    if (data.token) {
      localStorage.setItem('siet_auth_token', data.token);
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

   async deleteFaculty(facultyId:string){
    return request<any>(`/admin/faculties/${facultyId}`,{
      method:'DELETE',
    })
   },
   async reassign(email_one:string,email_two:string){
    return request<any>('/admin/reassign',{
      method:'POST',
      body:JSON.stringify({
        email_one:email_one,
        email_two:email_two,
        mess:'HI'
      }),
    })
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
   async deleteStudent(studentId:string){
    return request<any>(`/admin/students/${studentId}`,{
      method:'DELETE',
    })
   },
   async updateStudent(student:AdminStudent){
    return request<any>(`/admin/students/${student.rollNo}`,{
      method:'PUT',
      body:JSON.stringify(student),
    })
   }
};
