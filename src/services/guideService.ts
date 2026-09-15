import { ApprovalItem } from '../types';
import { StudentService } from './studentService';

export interface MentoredTeam {
  teamId: string;
  class: string;
  batch: string;
  title: string;
  leadStudent: string;
  currentWeek: number;
  status: string;
  guideApprovalStatus: string;
  lastSubmission: string;
  reviewStatus: string;
  progress: number;
}

export const GuideService = {
  getMentoredTeams(): MentoredTeam[] {
    const team = StudentService.getTeam();
    return [
      {
        teamId: team.id,
        class: team.section,
        batch: team.batch,
        title: team.projectTitle,
        leadStudent: "Tarunika Rajgopal (714023104112)",
        currentWeek: 6,
        status: team.status,
        guideApprovalStatus: "Approved",
        lastSubmission: "10 Sep 2026",
        reviewStatus: "Under Review",
        progress: team.progress
      },
      {
        teamId: "TEAM-CSE-Y3-B05",
        class: "CSE-B",
        batch: "2023-2027 (III Year)",
        title: "Decentralized Smart Grid Energy Trading Protocol",
        leadStudent: "Harish Kumar K (714023104035)",
        currentWeek: 5,
        status: "In Progress",
        guideApprovalStatus: "Approved",
        lastSubmission: "06 Sep 2026",
        reviewStatus: "Approved",
        progress: 62
      },
      {
        teamId: "TEAM-CSE-Y3-B08",
        class: "CSE-B",
        batch: "2023-2027 (III Year)",
        title: "Zero-Knowledge Proof Authentication for Medical Records",
        leadStudent: "Deepak S (714023104021)",
        currentWeek: 6,
        status: "Submitted",
        guideApprovalStatus: "Pending",
        lastSubmission: "09 Sep 2026",
        reviewStatus: "Pending Approval",
        progress: 55
      }
    ];
  },

  getPendingApprovals(): ApprovalItem[] {
    return [
      {
        id: "app-1",
        teamNo: "Team 08",
        title: "Zero-Knowledge Proof Authentication for Medical Records",
        proposedBy: "Deepak S (714023104021)",
        submittedOn: "09 Sep 2026",
        status: "Pending",
        category: "Project Scope Revision",
        description: "Requesting addition of Polygon zkEVM smart contracts module to existing healthcare data storage architecture."
      },
      {
        id: "app-2",
        teamNo: "Team 12",
        title: "Hyperspectral Satellite Image De-noising with Diffusion Models",
        proposedBy: "Praveen V (714023104099)",
        submittedOn: "08 Sep 2026",
        status: "Pending",
        category: "Title Modification",
        description: "Shifting focus from optical satellite imagery to Sentinel-2 multi-spectral bands."
      }
    ];
  },

  approveItem(id: string): void {
    // approve logic
  },

  rejectItem(id: string, reason?: string): void {
    // reject logic
  }
};
