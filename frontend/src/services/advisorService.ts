import { AdminService, AdminStudent } from './adminService';
import { StudentService } from './studentService';
import { ApiClient } from './apiClient';
import { AdvisorHistoryService } from './advisorHistoryService';

export interface TeamMemberRecord {
  rollNo: string;
  name: string;
  email: string;
  isLead: boolean;
}

export interface ClassTeam {
  teamId: string;
  teamNo: string;
  class: string;
  batch: string;
  title: string;
  guide: string;
  guideEmail?: string;
  guideDesignation?: string;
  guideDepartment?: string;
  domain?: string;
  lastModified?: string;
  status: string;
  membersCount: number;
  leadStudent: string;
  capacity: number;
  members: TeamMemberRecord[];
}

type AdvisorListener = () => void;
const listeners: Set<AdvisorListener> = new Set();

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
}

export const AdvisorService = {
  subscribe(listener: AdvisorListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getTeamCapacity(className: string = ""): number {
    try {
      const stored = localStorage.getItem(`siet_team_capacity_${className}`);
      if (stored) {
        const parsed = parseInt(stored, 10) || 4;
        return Math.min(parsed, 4);
      }
    } catch (e) {}
    return 4;
  },

  setTeamCapacity(className: string = "", capacity: number) {
    try {
      const cap = Math.min(capacity, 4);
      localStorage.setItem(`siet_team_capacity_${className}`, String(cap));
      notifyListeners();
    } catch (e) {}
  },

  getTeamsForClass(className: string = ""): ClassTeam[] {
    if (!className) return [];

    const syncWithRealStudentAndGuide = (teamList: ClassTeam[]): ClassTeam[] => {
      try {
        // 1. Real-time synchronization for active student team with Student Portal data
        const studentTeam = StudentService.getTeam();
        let matchedActiveTeamId: string | null = null;

        if (studentTeam && (studentTeam.id || studentTeam.teamNo)) {
          const sId = (studentTeam.id || '').toLowerCase().trim();
          const sNo = (studentTeam.teamNo || '').toLowerCase().trim();
          const sNum = studentTeam.teamNumber != null ? Number(studentTeam.teamNumber) : (sNo ? parseInt(sNo.replace(/\D/g, ''), 10) : null);

          const activeStudentTeam = teamList.find(t => {
            const tId = (t.teamId || '').toLowerCase().trim();
            const tNo = (t.teamNo || '').toLowerCase().trim();
            const tNum = parseInt(tNo.replace(/\D/g, ''), 10);

            if (sId && tId && sId === tId) return true;
            if (sNo && tNo && sNo === tNo) return true;
            if (sNum != null && !Number.isNaN(sNum) && !Number.isNaN(tNum) && sNum === tNum) return true;

            if (Array.isArray(studentTeam.members) && Array.isArray(t.members)) {
              const sRolls = new Set(studentTeam.members.map(m => (m.rollNo || '').toLowerCase().trim()).filter(Boolean));
              if (sRolls.size > 0 && t.members.some(m => sRolls.has((m.rollNo || '').toLowerCase().trim()))) {
                return true;
              }
            }
            return false;
          });

          if (activeStudentTeam) {
            matchedActiveTeamId = activeStudentTeam.teamId;
            const d1 = StudentService.getDeliverables('Submission 1', activeStudentTeam.teamId || studentTeam.id);
            const rawRealTitle = (d1?.projectTitle || studentTeam?.submittedTitle || studentTeam?.projectTitle || '').trim();

            activeStudentTeam.title = rawRealTitle;
            if (rawRealTitle) {
              activeStudentTeam.status = (studentTeam.isTitleApproved || studentTeam.guideApprovalStatus === 'Approved')
                ? 'Active & Approved'
                : 'Under Review';
            } else {
              activeStudentTeam.status = 'Pending';
            }
          }
        }
      } catch (e) {
        console.error('Failed to sync advisor teams with real student data', e);
      }
      return teamList;
    };

    try {
      const stored = localStorage.getItem(`siet_advisor_teams_${className}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const synced = syncWithRealStudentAndGuide(parsed);
          return synced;
        }
      }
    } catch (e) {
      console.error('Failed to parse cached advisor teams', e);
    }
    return [];
  },

  async fetchTeamsForClass(className: string = ""): Promise<ClassTeam[]> {
    if (!className) return [];
    try {
      const serverTeams = await ApiClient.getAdvisorTeams(className);
      if (Array.isArray(serverTeams)) {
        localStorage.setItem(`siet_advisor_teams_${className}`, JSON.stringify(serverTeams));
        return serverTeams;
      }
    } catch (err) {
      console.warn("Direct /advisor/teams API error, using cached teams fallback:", err);
    }
    return this.getTeamsForClass(className);
  },

  saveTeamsForClass(className: string, teams: ClassTeam[]) {
    try {
      localStorage.setItem(`siet_advisor_teams_${className}`, JSON.stringify(teams));
      notifyListeners();
    } catch (e) {
      console.error(e);
    }
  },

  areTeamsCreated(className: string = ""): boolean {
    const teams = this.getTeamsForClass(className);
    return teams.length > 0;
  },
  
  async getClassStudents(className: string = "", batch: string = ""): Promise<AdminStudent[]> {
    try {
      const serverStudents = await ApiClient.getAdvisorStudents(className, batch);
      if (Array.isArray(serverStudents) && serverStudents.length > 0) {
        return serverStudents;
      }
    } catch (err) {
      console.warn("Direct /advisor/students API unavailable, applying admin fallback:", err);
    }

    const allStudents = await AdminService.getStudents();
    const classStudents = allStudents.filter(s => s.classSection === className && (batch === 'ALL' || s.batch === batch));
    const teams = this.getTeamsForClass(className);

    let hasMismatch = false;

    // Dynamically synchronize student team assignments with live teams roster
    const synchronized = classStudents.map(student => {
      const assignedTeam = teams.find(t => t.members.some(m => m.rollNo === student.rollNo));
      if (assignedTeam) {
        if (student.teamNo !== assignedTeam.teamNo || student.guide !== assignedTeam.guide || student.projectTitle !== assignedTeam.title) {
          student.teamNo = assignedTeam.teamNo;
          student.guide = assignedTeam.guide;
          student.projectTitle = assignedTeam.title;
          hasMismatch = true;
        }
        return {
          ...student,
          teamNo: assignedTeam.teamNo,
          projectTitle: assignedTeam.title,
          guide: assignedTeam.guide
        };
      } else {
        if (student.teamNo && student.teamNo !== 'Unassigned') {
          student.teamNo = 'Unassigned';
          student.projectTitle = '';
          student.guide = 'Unassigned';
          hasMismatch = true;
        }
        return {
          ...student,
          teamNo: 'Unassigned',
          projectTitle: '',
          guide: 'Unassigned'
        };
      }
    });

    if (hasMismatch) {
      await AdminService.saveStudents(allStudents);
    }

    return synchronized;
  },

  async addStudentToClass(
    className: string = "",
    batch: string = "",
    name: string,
    rollNo: string,
    targetTeamId?: string,
    email?: string,
    password?: string
  ): Promise<{ success: boolean; message: string }> {
    const cleanName = name.trim();
    const cleanRoll = rollNo.trim();
    const cleanEmail = email && email.trim() ? email.trim() : `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@srishakthi.ac.in`;
    const cleanPassword = password && password.trim() ? password.trim() : "student@123";

    const res =await  AdminService.addStudent({
      name: cleanName,
      rollNo: cleanRoll,
      email: cleanEmail,
      password: cleanPassword,
      batch,
      classSection: className
    }, `Added to Class ${className} by Class Advisor`);

    if (res.success) {
      if (targetTeamId) {
        await this.assignStudentToTeam(className, cleanRoll, targetTeamId);
      }
      notifyListeners();
    }
    return res;
  },

  getGuideTeamCount(className: string = "", guideName: string): number {
    const teams = this.getTeamsForClass(className);
    return teams.filter(t => t.guide.toLowerCase() === guideName.toLowerCase()).length;
  },

  async createTeams(
    className: string,
    batch: string,
    capacity: number,
    newTeams: Array<{
      teamNo: string;
      title: string;
      guide: string;
      guideEmail?: string;
      leadRollNo: string;
      members: TeamMemberRecord[];
    }>
  ): Promise<boolean> {
    const formattedTeams: ClassTeam[] = newTeams.map((nt, idx) => {
      const cleanNo = nt.teamNo.startsWith("Team ") ? nt.teamNo : `Team ${String(idx + 1).padStart(2, '0')}`;
      const codeNo = cleanNo.replace("Team ", "B");
      const teamId = `TEAM-CSE-Y3-${codeNo}`;
      const lead = nt.members.find(m => m.rollNo === nt.leadRollNo) || nt.members[0];

      return {
        teamId,
        teamNo: cleanNo,
        class: className,
        batch,
        title: nt.title || "",
        guide: nt.guide,
        guideEmail: nt.guideEmail || `${nt.guide.toLowerCase().replace(/[^a-z0-9]/g, '.')}@siet.ac.in`,
        status: "Approved",
        capacity,
        membersCount: nt.members.length,
        leadStudent: lead ? `${lead.name} (${lead.rollNo})` : 'Assigned',
        members: nt.members.map(m => ({
          ...m,
          isLead: m.rollNo === (lead?.rollNo || nt.leadRollNo)
        }))
      };
    });

    // 1. Persist to backend database via bulk API
    try {
      await ApiClient.createAdvisorTeamsBulk({
        className,
        batch,
        capacity,
        teams: newTeams.map(nt => ({
          teamNo: nt.teamNo,
          title: nt.title || "",
          guide: nt.guide,
          guideEmail: nt.guideEmail || "",
          leadRollNo: nt.leadRollNo,
          memberRollNos: nt.members.map(m => m.rollNo),
        })),
      });
    } catch (apiErr) {
      console.warn("Backend bulk team creation failed, continuing with local sync fallback:", apiErr);
    }

    this.saveTeamsForClass(className, formattedTeams);
    this.setTeamCapacity(className, capacity);

    // Update students in AdminService
    const allStudents = await AdminService.getStudents();
    formattedTeams.forEach(t => {
      t.members.forEach(m => {
        const student = allStudents.find(s => s.rollNo === m.rollNo);
        if (student) {
          student.teamNo = t.teamNo;
          student.projectTitle = t.title;
          student.guide = t.guide;
        }
      });
    });
    await AdminService.saveStudents(allStudents);

    notifyListeners();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('siet_admin_students_updated'));
      window.dispatchEvent(new CustomEvent('siet_data_updated'));
    }
    return true;
  },

  async assignStudentToTeam(
    className: string,
    studentRollNo: string,
    targetTeamId: string,
    optionsOrName?: any,
    studentEmail?: string,
    replaceRoll?: string,
    exchangeAct?: 'swap' | 'unassign'
  ): Promise<{ success: boolean; message: string }> {
    let options: { replaceStudentRollNo?: string; exchangeAction?: 'swap' | 'unassign' } | undefined;
    if (typeof optionsOrName === 'object' && optionsOrName !== null) {
      options = optionsOrName;
    } else if (replaceRoll) {
      options = { replaceStudentRollNo: replaceRoll, exchangeAction: exchangeAct };
    }
    return this.moveStudent(className, studentRollNo, targetTeamId, options);
  },

  async unassignStudent(
    className: string,
    studentRollNo: string
  ): Promise<{ success: boolean; message: string }> {
    const teams = this.getTeamsForClass(className);
    const sourceTeam = teams.find(t => t.members.some(m => m.rollNo === studentRollNo));
    if (sourceTeam) {
      const removedMember = sourceTeam.members.find(m => m.rollNo === studentRollNo);
      sourceTeam.members = sourceTeam.members.filter(m => m.rollNo !== studentRollNo);
      sourceTeam.membersCount = sourceTeam.members.length;
      if (removedMember?.isLead && sourceTeam.members.length > 0) {
        sourceTeam.members[0].isLead = true;
        sourceTeam.leadStudent = `${sourceTeam.members[0].name} (${sourceTeam.members[0].rollNo})`;
      } else if (sourceTeam.members.length === 0) {
        sourceTeam.leadStudent = 'Unassigned';
      }
      this.saveTeamsForClass(className, teams);
    }

    const allStudents = await AdminService.getStudents();
    const student = allStudents.find(s => s.rollNo === studentRollNo);
    if (student) {
      student.teamNo = 'Unassigned';
      student.guide = 'Unassigned';
      student.projectTitle = '';
      await AdminService.saveStudents(allStudents);
    }


    // Call backend API
    try {
      await ApiClient.unassignAdvisorStudent({
        className,
        studentRollNo,
      });
      // Fetch fresh server state
      try {
        const freshServerTeams = await ApiClient.getAdvisorTeams(className);
        if (Array.isArray(freshServerTeams)) {
          localStorage.setItem(`siet_advisor_teams_${className}`, JSON.stringify(freshServerTeams));
        }
      } catch {}
    } catch (err) {
      console.warn("Backend unassign student API error:", err);
    }

    return { success: true, message: `Student ${student?.name || studentRollNo} unassigned from team.` };
  },

  async moveStudent(
    className: string,
    studentRollNo: string,
    targetTeamId: string,
    options?: {
      replaceStudentRollNo?: string;
      exchangeAction?: 'swap' | 'unassign';
    }
  ): Promise<{ success: boolean; message: string }> {
    const teams = this.getTeamsForClass(className);
    const targetTeam = teams.find(t => t.teamId === targetTeamId || t.teamNo === targetTeamId);
    if (!targetTeam) {
      return { success: false, message: "Target team does not exist." };
    }

    const currentCap = targetTeam.capacity || this.getTeamCapacity(className);
    const allStudents = await AdminService.getStudents();
    const student = allStudents.find(s => s.rollNo === studentRollNo);

    // Locate source team if any
    const sourceTeam = teams.find(t => t.members.some(m => m.rollNo === studentRollNo));
    if (sourceTeam && sourceTeam.teamId === targetTeam.teamId) {
      return { success: false, message: "Student is already in this team." };
    }

    // Handle replacement student from target team if specified
    if (options?.replaceStudentRollNo) {
      const repRoll = options.replaceStudentRollNo.trim();
      const repIdx = targetTeam.members.findIndex(m => m.rollNo === repRoll);
      if (repIdx >= 0) {
        const [repMember] = targetTeam.members.splice(repIdx, 1);
        targetTeam.membersCount = targetTeam.members.length;

        // If removed member was lead, assign lead to next member if present
        if (repMember.isLead && targetTeam.members.length > 0) {
          targetTeam.members[0].isLead = true;
          targetTeam.leadStudent = `${targetTeam.members[0].name} (${targetTeam.members[0].rollNo})`;
        } else if (targetTeam.members.length === 0) {
          targetTeam.leadStudent = 'Unassigned';
        }

        const repStudentObj = allStudents.find(s => s.rollNo === repRoll);

        if (options.exchangeAction === 'swap' && sourceTeam) {
          // Swap: Place removed member into source team
          const isLead = sourceTeam.members.length === 0;
          const swappedMember: TeamMemberRecord = {
            ...repMember,
            isLead,
          };
          sourceTeam.members.push(swappedMember);
          sourceTeam.membersCount = sourceTeam.members.length;
          if (isLead) {
            sourceTeam.leadStudent = `${swappedMember.name} (${swappedMember.rollNo})`;
          }
          if (repStudentObj) {
            repStudentObj.teamNo = sourceTeam.teamNo;
            repStudentObj.projectTitle = sourceTeam.title;
            repStudentObj.guide = sourceTeam.guide;
          }
        } else {
          // Unassign: Removed member becomes Unassigned
          if (repStudentObj) {
            repStudentObj.teamNo = 'Unassigned';
            repStudentObj.projectTitle = '';
            repStudentObj.guide = 'Unassigned';
          }
        }
      }
    }

    if (targetTeam.members.length >= currentCap) {
      return { 
        success: false, 
        message: `Target team is at maximum capacity (${targetTeam.members.length}/${currentCap} members). Cannot assign student.` 
      };
    }

    // If moving student was in a source team, remove them from source team
    if (sourceTeam) {
      const studentMember = sourceTeam.members.find(m => m.rollNo === studentRollNo);
      sourceTeam.members = sourceTeam.members.filter(m => m.rollNo !== studentRollNo);
      sourceTeam.membersCount = sourceTeam.members.length;
      if (studentMember?.isLead && sourceTeam.members.length > 0) {
        sourceTeam.members[0].isLead = true;
        sourceTeam.leadStudent = `${sourceTeam.members[0].name} (${sourceTeam.members[0].rollNo})`;
      } else if (sourceTeam.members.length === 0) {
        sourceTeam.leadStudent = 'Unassigned';
      }
    }

    // Add to target team
    const newMember: TeamMemberRecord = {
      rollNo: studentRollNo,
      name: student ? student.name : `Student (${studentRollNo})`,
      email: student ? student.email : `${studentRollNo}@srishakthi.ac.in`,
      isLead: targetTeam.members.length === 0
    };
    targetTeam.members.push(newMember);
    targetTeam.membersCount = targetTeam.members.length;
    if (targetTeam.members.length === 1) {
      targetTeam.leadStudent = `${newMember.name} (${newMember.rollNo})`;
    }

    // 1. Persist to backend database via API
    try {
      await ApiClient.moveAdvisorStudent({
        className,
        studentRollNo,
        targetTeamId: targetTeam.teamId || targetTeamId,
        replaceStudentRollNo: options?.replaceStudentRollNo,
        exchangeAction: options?.exchangeAction,
      });

      // Fetch fresh database teams state immediately to ensure full consistency
      try {
        const freshServerTeams = await ApiClient.getAdvisorTeams(className);
        if (Array.isArray(freshServerTeams) && freshServerTeams.length > 0) {
          localStorage.setItem(`siet_advisor_teams_${className}`, JSON.stringify(freshServerTeams));
        }
      } catch {}
    } catch (apiErr) {
      console.warn("Backend student transfer API call failed, continuing with local fallback:", apiErr);
    }

    this.saveTeamsForClass(className, teams);

    // Update in AdminService
    if (student) {
      student.teamNo = targetTeam.teamNo;
      student.projectTitle = targetTeam.title;
      student.guide = targetTeam.guide;
    }
    await AdminService.saveStudents(allStudents);


    notifyListeners();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('siet_admin_students_updated'));
      window.dispatchEvent(new CustomEvent('siet_data_updated'));
    }

    return { 
      success: true, 
      message: `Successfully transferred ${student?.name || studentRollNo} to ${targetTeam.teamNo}.` 
    };
  },

  async reassignGuide(
    className: string,
    teamId: string,
    guideName: string,
    guideEmail?: string,
    advisorName?: string
  ): Promise<{ success: boolean; message: string }> {
    const teams = this.getTeamsForClass(className);
    const team = teams.find(t => t.teamId === teamId || t.teamNo === teamId || (t as any).id === teamId);
    const oldGuide = team ? team.guide : "Unassigned";

    if (team && team.guide.toLowerCase() === guideName.toLowerCase()) {
      return { success: false, message: "This guide is already assigned to this team." };
    }

    const currentGuideLoad = this.getGuideTeamCount(className, guideName);
    if (currentGuideLoad >= 5) {
      return { 
        success: false, 
        message: `Cannot assign ${guideName}. Guide has already reached the maximum institutional quota of 5 teams in this class.` 
      };
    }

    // Call backend API for persistence
    try {
      const apiRes = await ApiClient.reassignAdvisorGuide({
        className,
        teamId: team?.teamId || teamId,
        guideName,
        guideEmail,
      });

      if (apiRes && apiRes.success === false) {
        return { success: false, message: apiRes.message || "Failed to reassign guide on server." };
      }
    } catch (err: any) {
      console.warn("Backend reassign-guide error, updating local state:", err);
    }

    if (team) {
      team.guide = guideName;
      if (guideEmail) team.guideEmail = guideEmail;
      this.saveTeamsForClass(className, teams);

      // Update students in AdminService
      try {
        const allStudents = await AdminService.getStudents();
        team.members.forEach(m => {
          const s = allStudents.find(x => x.rollNo === m.rollNo);
          if (s) {
            s.guide = guideName;
          }
        });
        await AdminService.saveStudents(allStudents);
      } catch (e) {
        console.warn("Could not sync admin students:", e);
      }
    }

    // Record in Advisor History Log
    try {
      AdvisorHistoryService.addLog(
        className,
        "Guide Reassignment",
        `${team?.teamNo || teamId} (${team?.title || 'Project Team'})`,
        `Reassigned technical guide from ${oldGuide} to ${guideName}. Institutional quota verified.`,
        advisorName || "Class Advisor",
        "Class Advisor"
      );
    } catch (e) {
      console.warn("Failed to log guide reassignment to history:", e);
    }

    notifyListeners();
    window.dispatchEvent(new CustomEvent('siet_admin_students_updated'));
    window.dispatchEvent(new CustomEvent('siet_data_updated'));

    return { 
      success: true, 
      message: `Guide ${guideName} successfully assigned to ${team ? team.teamNo : 'team'}.` 
    };
  },

  async assignGuideToTeam(className: string, teamId: string, guideName: string): Promise<boolean> {
    const res = await this.reassignGuide(className, teamId, guideName);
    return res.success;
  },

  async addManualTeam(
    className: string,
    batch: string,
    teamData: {
      teamNo?: string;
      title: string;
      guide: string;
      guideEmail?: string;
      leadRollNo: string;
      memberRollNos: string[];
    }
  ): Promise<{ success: boolean; message: string; team?: ClassTeam }> {
    const teams = this.getTeamsForClass(className);
    const capacity = this.getTeamCapacity(className);

    // Guide quota validation
    const guideLoad = this.getGuideTeamCount(className, teamData.guide);
    if (guideLoad >= 5) {
      return {
        success: false,
        message: `Cannot assign ${teamData.guide}. Guide has reached the maximum capacity of 5 teams in this class.`
      };
    }

    const cleanNo = teamData.teamNo?.trim() || `Team ${String(teams.length + 1).padStart(2, '0')}`;

    // Team Number Uniqueness Validation
    const isSameTeamNo = (a: string, b: string) => {
      const normA = a.trim().toLowerCase();
      const normB = b.trim().toLowerCase();
      if (normA === normB) return true;
      const numA = normA.replace(/^team\s*/i, '').replace(/^0+/, '') || normA;
      const numB = normB.replace(/^team\s*/i, '').replace(/^0+/, '') || normB;
      return numA === numB;
    };

    const isDuplicate = teams.some(t => 
      isSameTeamNo(t.teamNo, cleanNo) || 
      (teamData.teamNo ? isSameTeamNo(t.teamNo, teamData.teamNo) : false)
    );

    if (isDuplicate) {
      return {
        success: false,
        message: "This team number is already being created."
      };
    }

    const codeNo = cleanNo.replace(/[^0-9]/g, '') || String(teams.length + 1);
    const teamId = `TEAM-CSE-Y3-B${codeNo.padStart(2, '0')}`;

    // Resolve student objects
    const allStudents = await AdminService.getStudents();
    const members: TeamMemberRecord[] = teamData.memberRollNos.map(rNo => {
      const s = allStudents.find(x => x.rollNo === rNo);
      return {
        rollNo: rNo,
        name: s ? s.name : `Student (${rNo})`,
        email: s ? s.email : `${rNo}@srishakthi.ac.in`,
        isLead: rNo === teamData.leadRollNo
      };
    });

    if (members.length === 0) {
      return {
        success: false,
        message: "Please select at least one student member for this team."
      };
    }

    if (members.length > capacity) {
      return {
        success: false,
        message: `Team member count (${members.length}) exceeds the maximum team capacity (${capacity}).`
      };
    }

    const lead = members.find(m => m.isLead) || members[0];

    const newTeam: ClassTeam = {
      teamId,
      teamNo: cleanNo,
      class: className,
      batch,
      title: teamData.title || "",
      guide: teamData.guide,
      guideEmail: teamData.guideEmail || `${teamData.guide.toLowerCase().replace(/[^a-z0-9]/g, '.')}@siet.ac.in`,
      status: "Approved",
      capacity,
      membersCount: members.length,
      leadStudent: `${lead.name} (${lead.rollNo})`,
      members
    };

    // 1. Persist to backend database
    let backendTeam: any = null;
    try {
      const res = await ApiClient.createAdvisorTeam({
        className,
        batch,
        capacity,
        teamNo: cleanNo,
        title: teamData.title || "To be proposed by student team",
        guide: teamData.guide,
        guideEmail: teamData.guideEmail || `${teamData.guide.toLowerCase().replace(/[^a-z0-9]/g, '.')}@siet.ac.in`,
        leadRollNo: teamData.leadRollNo || lead.rollNo,
        memberRollNos: teamData.memberRollNos,
      });
      if (res && res.team) {
        backendTeam = res.team;
      }
    } catch (err) {
      console.warn("Backend team creation failed, continuing with local fallback:", err);
    }

    const finalTeam: ClassTeam = backendTeam || newTeam;
    const existingIdx = teams.findIndex(t => t.teamId === finalTeam.teamId || t.teamNo === finalTeam.teamNo);
    if (existingIdx >= 0) {
      teams[existingIdx] = finalTeam;
    } else {
      teams.push(finalTeam);
    }
    this.saveTeamsForClass(className, teams);

    // Update students in AdminService
    allStudents.forEach(s => {
      if (teamData.memberRollNos.includes(s.rollNo)) {
        s.teamNo = finalTeam.teamNo;
        s.projectTitle = finalTeam.title;
        s.guide = finalTeam.guide;
      }
    });
    await AdminService.saveStudents(allStudents);

    notifyListeners();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('siet_admin_students_updated'));
      window.dispatchEvent(new CustomEvent('siet_data_updated'));
    }
    return {
      success: true,
      message: `Team ${finalTeam.teamNo} successfully formed and assigned to ${finalTeam.guide}.`,
      team: finalTeam
    };
  },

  async assignStudentGuideAndTeam(
    className: string,
    studentRollNo: string,
    options: {
      mode: 'existing' | 'new';
      targetTeamId?: string;
      newTeamNo?: string;
      guideName?: string;
      guideEmail?: string;
      projectTitle?: string;
      batch?: string;
    }
  ): Promise<{ success: boolean; message: string; team?: ClassTeam }> {
    if (options.mode === 'existing' && options.targetTeamId) {
      return await this.moveStudent(className, studentRollNo, options.targetTeamId);
    }
    return await this.addManualTeam(className, options.batch || "", {
      teamNo: options.newTeamNo,
      title: options.projectTitle || "",
      guide: options.guideName || 'Unassigned',
      guideEmail: options.guideEmail,
      leadRollNo: studentRollNo,
      memberRollNos: [studentRollNo]
    });
  },

  async updateTeam(
    className: string,
    batch: string,
    teamId: string,
    updateData: {
      teamNo?: string;
      guide?: string;
      guideEmail?: string;
      leadRollNo?: string;
      memberRollNos?: string[];
      title?: string;
    }
  ): Promise<{ success: boolean; message: string; team?: ClassTeam }> {
    const teams = this.getTeamsForClass(className);
    const teamIndex = teams.findIndex(t => t.teamId === teamId);
    if (teamIndex === -1) {
      return { success: false, message: "Team not found." };
    }

    const team = { ...teams[teamIndex] };
    const capacity = this.getTeamCapacity(className);

    // 1. Team number uniqueness check if modified
    if (updateData.teamNo && updateData.teamNo.trim() !== team.teamNo) {
      const cleanNo = updateData.teamNo.trim();
      const isSameTeamNo = (a: string, b: string) => {
        const normA = a.trim().toLowerCase();
        const normB = b.trim().toLowerCase();
        if (normA === normB) return true;
        const numA = normA.replace(/^team\s*/i, '').replace(/^0+/, '') || normA;
        const numB = normB.replace(/^team\s*/i, '').replace(/^0+/, '') || normB;
        return numA === numB;
      };

      const isDuplicate = teams.some(t => 
        t.teamId !== teamId && (
          isSameTeamNo(t.teamNo, cleanNo) || 
          isSameTeamNo(t.teamNo, updateData.teamNo || '')
        )
      );

      if (isDuplicate) {
        return {
          success: false,
          message: "This team number is already being created."
        };
      }
      team.teamNo = cleanNo;
    }

    // 2. Guide quota validation if modified
    if (updateData.guide && updateData.guide !== team.guide) {
      const guideLoad = this.getGuideTeamCount(className, updateData.guide);
      if (guideLoad >= 5) {
        return {
          success: false,
          message: `Cannot assign ${updateData.guide}. Guide has reached the maximum capacity of 5 teams in this class.`
        };
      }
      team.guide = updateData.guide;
      team.guideEmail = updateData.guideEmail || `${updateData.guide.toLowerCase().replace(/[^a-z0-9]/g, '.')}@siet.ac.in`;
    }

    if (updateData.title) {
      team.title = updateData.title;
    }

    // 3. Member updates
    const allStudents = await AdminService.getStudents();
    const oldMemberRolls = team.members.map(m => m.rollNo);

    if (updateData.memberRollNos && updateData.memberRollNos.length > 0) {
      if (updateData.memberRollNos.length > capacity) {
        return {
          success: false,
          message: `Team member count (${updateData.memberRollNos.length}) exceeds the maximum team capacity (${capacity}).`
        };
      }

      const newMembers: TeamMemberRecord[] = updateData.memberRollNos.map(rNo => {
        const s = allStudents.find(x => x.rollNo === rNo);
        const isLead = rNo === (updateData.leadRollNo || team.members.find(m => m.isLead)?.rollNo || updateData.memberRollNos![0]);
        return {
          rollNo: rNo,
          name: s ? s.name : `Student (${rNo})`,
          email: s ? s.email : `${rNo}@srishakthi.ac.in`,
          isLead
        };
      });

      team.members = newMembers;
      team.membersCount = newMembers.length;
      const lead = newMembers.find(m => m.isLead) || newMembers[0];
      team.leadStudent = `${lead.name} (${lead.rollNo})`;

      // Update student assignments in AdminService
      allStudents.forEach(s => {
        // Detached students -> Unassigned
        if (oldMemberRolls.includes(s.rollNo) && !updateData.memberRollNos!.includes(s.rollNo)) {
          s.teamNo = "Unassigned";
          s.projectTitle = "";
          s.guide = "";
        }
        // Attached students -> current team
        if (updateData.memberRollNos!.includes(s.rollNo)) {
          s.teamNo = team.teamNo;
          s.projectTitle = team.title;
          s.guide = team.guide;
        }
      });
      await AdminService.saveStudents(allStudents);
    } else if (updateData.leadRollNo) {
      team.members = team.members.map(m => ({
        ...m,
        isLead: m.rollNo === updateData.leadRollNo
      }));
      const lead = team.members.find(m => m.isLead) || team.members[0];
      team.leadStudent = `${lead.name} (${lead.rollNo})`;
    }

    teams[teamIndex] = team;
    this.saveTeamsForClass(className, teams);
    notifyListeners();

    return {
      success: true,
      message: `Team ${team.teamNo} was successfully updated.`,
      team
    };
  },

  async deleteTeam(className: string, teamId: string, advisorName?: string): Promise<{ success: boolean; message: string }> {
    let teams = this.getTeamsForClass(className);
    const targetTeam = teams.find(t => t.teamId === teamId || t.teamNo === teamId || (t as any).id === teamId);
    if (!targetTeam) {
      return { success: false, message: "Team not found." };
    }

    const memberRolls = (targetTeam.members || []).map(m => m.rollNo);

    // Call backend API if possible
    try {
      await ApiClient.deleteAdvisorTeam(targetTeam.teamId || teamId);
    } catch (apiErr: any) {
      console.warn("Backend delete team warning, syncing local state:", apiErr);
    }

    // Filter out deleted team from class
    teams = teams.filter(t => t.teamId !== targetTeam.teamId && t.teamNo !== targetTeam.teamNo);
    this.saveTeamsForClass(className, teams);

    // Reset student assignments in AdminService to Unassigned
    try {
      const allStudents = await AdminService.getStudents();
      allStudents.forEach(s => {
        if (memberRolls.includes(s.rollNo)) {
          s.teamNo = "Unassigned";
          s.projectTitle = "";
          s.guide = "Unassigned";
        }
      });
      await AdminService.saveStudents(allStudents);
    } catch (e) {
      console.warn("Could not sync admin students:", e);
    }


    // Record in Advisor History Log
    try {
      AdvisorHistoryService.addLog(
        className,
        "Team Deletion",
        targetTeam.teamNo,
        `Dissolved ${targetTeam.teamNo} ("${targetTeam.title || 'Untitled Project'}"). ${memberRolls.length} student(s) marked as Unassigned.`,
        advisorName || "Class Advisor",
        "Class Advisor"
      );
    } catch (e) {
      console.warn("Failed to log team deletion to history:", e);
    }

    notifyListeners();
    window.dispatchEvent(new CustomEvent('siet_admin_students_updated'));
    window.dispatchEvent(new CustomEvent('siet_data_updated'));
    window.dispatchEvent(new CustomEvent('siet_advisor_teams_updated'));

    return {
      success: true,
      message: `Team ${targetTeam.teamNo} was successfully deleted.`
    };
  }
};
