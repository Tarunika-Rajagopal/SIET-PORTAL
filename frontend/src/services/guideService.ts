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
    const currentWeek = StudentService.getCurrentAcademicWeek();
    return [
      {
        teamId: team.id,
        class: team.section,
        batch: team.batch,
        title: team.projectTitle,
        leadStudent: "Tarunika Rajgopal (714023104112)",
        currentWeek: currentWeek,
        status: team.status,
        guideApprovalStatus: team.guideApprovalStatus,
        lastSubmission: "Week " + currentWeek,
        reviewStatus: team.guideApprovalStatus === 'Approved' ? 'Approved' : 'Under Review',
        progress: team.progress
      }
    ];
  },

  getPendingApprovals(): ApprovalItem[] {
    const team = StudentService.getTeam();
    if (team.submittedTitle && !team.isTitleApproved) {
      return [
        {
          id: "app-1",
          teamNo: team.teamNo,
          title: team.submittedTitle,
          proposedBy: "Tarunika Rajgopal (714023104112)",
          submittedOn: "Week 0",
          status: "Pending",
          category: "Project Title Proposal",
          description: "Initial Capstone Project Title Proposal submitted by student."
        }
      ];
    }
    return [];
  },

  approveItem(_id: string): void {
    const team = StudentService.getTeam();
    team.isTitleApproved = true;
    team.guideApprovalStatus = 'Approved';
    StudentService.saveTeam(team);
  },

  rejectItem(_id: string, _reason?: string): void {
    const team = StudentService.getTeam();
    team.isTitleApproved = false;
    team.guideApprovalStatus = 'Revision Required';
    StudentService.saveTeam(team);
  }
};
