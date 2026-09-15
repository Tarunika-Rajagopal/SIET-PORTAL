import { User, Role } from '../types';

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
    projectTitle: "AI-Powered Autonomous Grid Balancing with Edge Vision",
    guideName: "Dr. P. Manimegalai",
    advisorName: "Dr. R. Karthikeyan",
    overallProgress: 68,
    currentWeek: 6
  },
  // 2. Department HOD
  {
    email: "hod.cse@siet.ac.in",
    password: "hod@123",
    name: "Dr. N. Saravanan",
    department: "Computer Science and Engineering",
    role: "hod",
    designation: "Professor & Head of Department",
    phone: "+91 94432 10987",
    totalFaculty: 48,
    totalStudents: 320,
    departmentProgress: 74,
    upcomingReviews: 3
  },
  // 3. System Administrator
  {
    email: "admin@siet.ac.in",
    password: "admin@123",
    name: "Department Administrator",
    department: "Computer Science and Engineering",
    role: "admin",
    designation: "System & Database Administrator"
  },
  // 4. Class Advisor Faculty
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
    totalMentees: 16,
    activeProjects: 4,
    pendingApprovals: 2,
    avgProgress: 70,
    totalStudents: 64,
    totalTeams: 16,
    allocatedGuides: 12
  },
  // 5. Dedicated Guide
  {
    email: "dr.manimegalai@siet.ac.in",
    password: "guide@123",
    name: "Dr. P. Manimegalai",
    department: "Computer Science and Engineering",
    role: "guide",
    designation: "Associate Professor & Research Mentor",
    phone: "+91 98433 87654",
    totalMentees: 16,
    activeProjects: 4,
    pendingApprovals: 3,
    avgProgress: 75
  }
];

const STORAGE_KEY = "siet_auth_user";
const USERS_STORAGE_KEY = "siet_registered_users";

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
      const user = sessionStorage.getItem(STORAGE_KEY);
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
    } catch (e) {}
  },

  logout(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
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
    return { success: true, user: matchedUser };
  }
};
