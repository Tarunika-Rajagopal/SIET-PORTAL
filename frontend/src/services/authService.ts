import { User, Role } from '../types';
import { ApiClient } from './apiClient';

export function getUserInitials(name?: string): string {
  if (!name) return 'TR';
  const cleaned = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TR';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return (first + last).toUpperCase();
}

export const DEFAULT_USERS: User[] = [
  // 1. Primary Student Account
  {
    email: "student@srishakthi.ac.in",
    password: "student@123",
    name: "Tarunika Rajgopal",
    initials: "TR",
    rollNo: "714023104112",
    department: "Computer Science and Engineering",
    year: "III Year",
    batch: "2023-2027 (III Year)",
    class: "CSE-B",
    section: "B",
    yearSemester: "III Year / VI Semester",
    role: "student",
    teamId: "TEAM-CSE-Y3-B04",
    teamNo: "Team 04",
    projectTitle: "",
    guideName: "Dr. P. Manimegalai",
    advisorName: "Dr. R. Karthikeyan",
    overallProgress: 0,
    currentWeek: 0
  },
  // 2. Dedicated Guide
  {
    email: "dr.manimegalai@siet.ac.in",
    password: "guide@123",
    name: "Dr. P. Manimegalai",
    initials: "PM",
    department: "Computer Science and Engineering",
    role: "guide",
    roles: ["guide"],
    designation: "Professor & Research Mentor",
    phone: "+91 98433 87654",
    totalMentees: 4,
    activeProjects: 1,
    pendingApprovals: 0,
    avgProgress: 0
  },
  // 3. Class Advisor Faculty
  {
    email: "dr.karthik@siet.ac.in",
    password: "faculty@123",
    name: "Dr. R. Karthikeyan",
    department: "Computer Science and Engineering",
    role: "advisor",
    roles: ["advisor"],
    advisorClass: "CSE-B",
    advisorBatch: "2023-2027 (III Year)",
    designation: "Professor & Designated Class Advisor",
    phone: "+91 98421 23456",
    totalMentees: 4,
    activeProjects: 1,
    pendingApprovals: 0,
    avgProgress: 0,
    totalStudents: 4,
    totalTeams: 1,
    allocatedGuides: 1
  },
  // 4. Department HOD
  {
    email: "hod.cse@siet.ac.in",
    password: "hod@123",
    name: "Dr. N. Saravanan",
    department: "Computer Science and Engineering",
    role: "hod",
    designation: "Professor & Head of Department",
    phone: "+91 94432 10987",
    totalFaculty: 48,
    totalStudents: 4,
    departmentProgress: 0,
    upcomingReviews: 0
  },
  // 5. System Administrator
  {
    email: "admin@siet.ac.in",
    password: "admin@123",
    name: "Department Administrator",
    department: "Computer Science and Engineering",
    role: "admin",
    designation: "System & Database Administrator"
  }
];

const STORAGE_KEY = "siet_auth_user_v5";
const USERS_STORAGE_KEY = "siet_registered_users_v5";

export const AuthService = {
  getUserInitials,

  getRegisteredUsers(): User[] {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((u: User) => {
          if (u.email === "dr.karthik@siet.ac.in") {
            return { ...u, role: "advisor", roles: ["advisor"] };
          }
          return u;
        });
      }
    } catch (e) {}
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  },

  getCurrentUser(): User | null {
    try {
      const user = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user: User, activeRole: Role | null = null): void {
    const sessionData: User = {
      ...user,
      activeRole: activeRole || user.activeRole || user.role || (user.roles ? user.roles[0] : "student"),
      sessionTime: new Date().toISOString(),
      initials: getUserInitials(user.name)
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    } catch (e) {}
  },

  logout(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('siet_auth_token');
    } catch (e) {}
  },

  authenticate(emailOrRoll: string, password: string): { success: boolean; message?: string; user?: User; requiresRoleSelection?: boolean } {
    const term = (emailOrRoll || '').trim().toLowerCase();
    const allUsers = this.getRegisteredUsers();

    const matchedUser = allUsers.find(u =>
      (u.email && u.email.toLowerCase() === term) ||
      (u.rollNo && u.rollNo.toLowerCase() === term)
    );

    if (!matchedUser) {
      return { success: false, message: "Institutional ID or Register Number not found." };
    }

    if (matchedUser.password && matchedUser.password !== password) {
      return { success: false, message: "Incorrect password. Please verify your credentials." };
    }

    this.setCurrentUser(matchedUser, matchedUser.role);

    // Asynchronously log in to backend API to obtain and save JWT token
    ApiClient.login(emailOrRoll, password).catch(err => {
      console.log('Backend login sync:', err);
    });

    return { success: true, user: matchedUser };
  }
};
