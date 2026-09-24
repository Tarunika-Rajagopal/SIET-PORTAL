export type Role = 'student' | 'guide' | 'advisor' | 'hod' | 'admin';

export interface User {
  email: string;
  password?: string;
  name: string;
  rollNo?: string;
  department: string;
  role: Role;
  roles?: Role[];
  activeRole?: Role;
  designation?: string;
  phone?: string;
  year?: string;
  batch?: string;
  class?: string;
  section?: string;
  yearSemester?: string;
  teamId?: string;
  teamNo?: string;
  projectTitle?: string;
  guideName?: string;
  advisorName?: string;
  advisorClass?: string;
  advisorBatch?: string;
  overallProgress?: number;
  currentWeek?: number;
  sessionTime?: string;
  initials?: string;
  totalMentees?: number;
  activeProjects?: number;
  pendingApprovals?: number;
  avgProgress?: number;
  totalStudents?: number;
  totalTeams?: number;
  allocatedGuides?: number;
  totalFaculty?: number;
  departmentProgress?: number;
  upcomingReviews?: number;
}

export interface TeamMember {
  name: string;
  rollNo: string;
  role: string;
  email: string;
}

export interface Team {
  id: string;
  teamNo: string;
  projectTitle: string;
  guideName: string;
  advisorName: string;
  batch: string;
  section: string;
  members: TeamMember[];
  status: 'In Progress' | 'Approved' | 'Review Required' | 'Submitted';
  progress: number;
}

export interface GuideNotice {
  timing: string;
  location: string;
  comment: string;
  date: string;
  weekNumber?: number;
}

export interface WeeklySubmission {
  week: number;
  title: string;
  dueDate: string;
  status: 'Submitted' | 'Pending' | 'Approved' | 'Changes Requested' | 'Rejected';
  submissionDate?: string;
  fileName?: string;
  fileSize?: string;
  comments?: string;
  score?: number;
  maxScore?: number;
  projectTitle?: string;
  problemStatement?: string;
  solution?: string;
  technologyUsed?: string;
  obstaclesFaced?: string;
  abstract?: string;
  presentationFile?: string;
  pdfFile?: string;
  repoUrl?: string;
  demoUrl?: string;
  screenshotFile?: string;
  guideName?: string;
  guideReviewDate?: string;
  guideNotice?: GuideNotice;
}

export interface RubricCriteria {
  id: string;
  title: string;
  description: string;
  maxMarks: number;
  awardedMarks: number;
  feedback: string;
}

export interface ReviewScore {
  reviewNumber: string;
  reviewTitle: string;
  date: string;
  status: 'Completed' | 'Upcoming';
  criteria: RubricCriteria[];
  totalScore: number;
  maxTotal: number;
  guideFeedback?: string;
}

export interface ApprovalItem {
  id: string;
  teamNo: string;
  title: string;
  proposedBy: string;
  submittedOn: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  category: string;
  description?: string;
}

export interface Announcement {
  id: string;
  title: string;
  date: string;
  sender: string;
  tag: string;
  content: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  dateFormatted: string;
  dateKey: string;
  monthKey: string;
  actionType: string;
  target: string;
  details: string;
  reason: string;
  admin: string;
}

export interface ChecklistState {
  titleApproval: boolean;
  abstractSubmission: boolean;
  literatureReview: boolean;
  designDiagrams: boolean;
  prototypeReady: boolean;
  zerothReviewDone: boolean;
}

export interface faculty {
    name: string;
    email: string;
    designation: string;
    role: string;
    department: string;
    advisorBatch?: string;
    advisorClass?: string;
    specialization?: string;
}