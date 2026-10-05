import { ApprovalItem } from '../types';
import { ApiClient } from './apiClient';

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
  async getMentoredTeams(): Promise<MentoredTeam[]> {
    try {
      const teams = await ApiClient.getGuideTeams();
      return (teams || []).map((t: any) => ({
        teamId: t.teamId || t.id || '',
        class: t.classSection || t.section || '',
        batch: t.batch || '',
        title: t.projectTitle || '',
        leadStudent: t.teamLeader ? `${t.teamLeader}${t.leaderRollNo ? ` (${t.leaderRollNo})` : ''}` : '',
        currentWeek: 1,
        status: t.status || 'In Progress',
        guideApprovalStatus: t.guideApprovalStatus || 'Pending',
        lastSubmission: 'Week 1',
        reviewStatus: t.guideApprovalStatus === 'Approved' ? 'Approved' : 'Under Review',
        progress: t.progress || 0
      }));
    } catch {
      return [];
    }
  },

  async getPendingApprovals(): Promise<ApprovalItem[]> {
    try {
      const teams = await ApiClient.getGuideTeams();
      const pending = (teams || []).filter((t: any) => !t.isTitleApproved && t.projectTitle);
      return pending.map((t: any) => ({
        id: t.id || t.teamId || '',
        teamNo: t.teamNo || `Team ${t.teamNumber || ''}`,
        title: t.projectTitle || '',
        proposedBy: t.teamLeader ? `${t.teamLeader}${t.leaderRollNo ? ` (${t.leaderRollNo})` : ''}` : '',
        submittedOn: 'Week 1',
        status: 'Pending',
        category: 'Project Title Proposal',
        description: 'Capstone Project Title Proposal submitted by student team.'
      }));
    } catch {
      return [];
    }
  },

  async approveItem(teamId: string, title?: string): Promise<void> {
    await ApiClient.approveProjectTitle(teamId, title || '');
  },

  async rejectItem(teamId: string, reason?: string): Promise<void> {
    await ApiClient.rejectProjectTitle(teamId, reason || 'Title revised');
  }
};
