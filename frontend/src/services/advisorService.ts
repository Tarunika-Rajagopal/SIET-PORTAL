import { AdminService, AdminStudent } from './adminService';
import { StudentService } from './studentService';

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

  getTeamCapacity(className: string = "CSE-B"): number {
    try {
      const stored = localStorage.getItem(`siet_team_capacity_${className}`);
      if (stored) {
        const parsed = parseInt(stored, 10) || 4;
        return Math.min(parsed, 4);
      }
    } catch (e) {}
    return 4;
  },

  setTeamCapacity(className: string = "CSE-B", capacity: number) {
    try {
      const cap = Math.min(capacity, 4);
      localStorage.setItem(`siet_team_capacity_${className}`, String(cap));
      notifyListeners();
    } catch (e) {}
  },

  getTeamsForClass(className: string = "CSE-B"): ClassTeam[] {
    const isMockTitle = (str?: string) => 
      /autonomous crop disease|decentralized smart grid|edge-ai wearable|llm-powered/i.test(str || '');

    const defaultTeams: ClassTeam[] = [
      {
        teamId: "TEAM-CSE-Y3-B04",
        teamNo: "Team 04",
        class: className,
        batch: "2023-2027 (III Year)",
        title: "",
        guide: "Dr. P. Manimegalai",
        guideEmail: "dr.manimegalai@siet.ac.in",
        status: "Pending",
        capacity: 4,
        membersCount: 4,
        leadStudent: "Tarunika Rajgopal (714023104112)",
        members: [
          { rollNo: "714023104112", name: "Tarunika Rajgopal", email: "tarunika.r@srishakthi.ac.in", isLead: true },
          { rollNo: "714023104178", name: "Vigneshwaran M", email: "vigneshwaran.m@srishakthi.ac.in", isLead: false },
          { rollNo: "714023104189", name: "Vishnu Priya S", email: "vishnupriya.s@srishakthi.ac.in", isLead: false },
          { rollNo: "714023104066", name: "Kavitha R", email: "kavitha.r@srishakthi.ac.in", isLead: false }
        ]
      },
      {
        teamId: "TEAM-CSE-Y3-B05",
        teamNo: "Team 05",
        class: className,
        batch: "2023-2027 (III Year)",
        title: "",
        guide: "Dr. A. Devipriya",
        guideEmail: "dr.devipriya@siet.ac.in",
        status: "Pending",
        capacity: 4,
        membersCount: 4,
        leadStudent: "Harish Kumar K (714023104035)",
        members: [
          { rollNo: "714023104035", name: "Harish Kumar K", email: "harish.k@srishakthi.ac.in", isLead: true },
          { rollNo: "714023104038", name: "Janani S", email: "janani.s@srishakthi.ac.in", isLead: false },
          { rollNo: "714023104051", name: "Manoj V", email: "manoj.v@srishakthi.ac.in", isLead: false },
          { rollNo: "714023104058", name: "Nithya R", email: "nithya.r@srishakthi.ac.in", isLead: false }
        ]
      },
      {
        teamId: "TEAM-CSE-Y3-B06",
        teamNo: "Team 06",
        class: className,
        batch: "2023-2027 (III Year)",
        title: "",
        guide: "Dr. K. Vignesh",
        guideEmail: "dr.vignesh@siet.ac.in",
        status: "Pending",
        capacity: 4,
        membersCount: 4,
        leadStudent: "Naveen Raj (714023104088)",
        members: [
          { rollNo: "714023104088", name: "Naveen Raj", email: "naveen.r@srishakthi.ac.in", isLead: true },
          { rollNo: "714023104092", name: "Praveen S", email: "praveen.s@srishakthi.ac.in", isLead: false },
          { rollNo: "714023104095", name: "Raja Vignesh", email: "raja.v@srishakthi.ac.in", isLead: false },
          { rollNo: "714023104099", name: "Saranya K", email: "saranya.k@srishakthi.ac.in", isLead: false }
        ]
      },
      {
        teamId: "TEAM-CSE-Y3-B07",
        teamNo: "Team 07",
        class: className,
        batch: "2023-2027 (III Year)",
        title: "",
        guide: "Dr. P. Manimegalai",
        guideEmail: "dr.manimegalai@siet.ac.in",
        status: "Pending",
        capacity: 4,
        membersCount: 4,
        leadStudent: "Sneha M (714023104142)",
        members: [
          { rollNo: "714023104142", name: "Sneha M", email: "sneha.m@srishakthi.ac.in", isLead: true },
          { rollNo: "714023104148", name: "Suresh P", email: "suresh.p@srishakthi.ac.in", isLead: false },
          { rollNo: "714023104155", name: "Swetha V", email: "swetha.v@srishakthi.ac.in", isLead: false },
          { rollNo: "714023104162", name: "Varun K", email: "varun.k@srishakthi.ac.in", isLead: false }
        ]
      }
    ];

    const syncWithRealStudentAndGuide = (teamList: ClassTeam[]): ClassTeam[] => {
      try {
        // 1. Scrub any lingering mock titles from all teams
        teamList.forEach(t => {
          if (isMockTitle(t.title)) {
            t.title = '';
            t.status = 'Pending';
          }
        });

        // 2. Real-time synchronization for Team 04 with Student Portal data
        const studentTeam = StudentService.getTeam();
        const d0 = StudentService.getDeliverables('Week 0');
        const rawRealTitle = (d0?.projectTitle || studentTeam?.submittedTitle || studentTeam?.projectTitle || '').trim();
        const cleanRealTitle = isMockTitle(rawRealTitle) ? '' : rawRealTitle;

        const team04 = teamList.find(t => t.teamId === 'TEAM-CSE-Y3-B04' || t.teamNo === 'Team 04');
        if (team04) {
          team04.title = cleanRealTitle;
          if (cleanRealTitle) {
            team04.status = (studentTeam.isTitleApproved || studentTeam.guideApprovalStatus === 'Approved')
              ? 'Active & Approved'
              : 'Under Review';
          } else {
            team04.status = 'Pending';
          }
        }

        // 3. Sync other teams with Guide Portal if real titles were submitted & approved
        const guideRaw = localStorage.getItem('siet_guide_portal_teams_v6');
        if (guideRaw) {
          const guideTeams = JSON.parse(guideRaw);
          if (Array.isArray(guideTeams)) {
            teamList.forEach(t => {
              if (t.teamId === 'TEAM-CSE-Y3-B04') return; // Team 04 already synchronized with student
              const tNum = parseInt(String(t.teamNo || t.teamId).replace(/\D/g, ''), 10);
              const gt = guideTeams.find((g: any) => 
                (g.teamId && g.teamId.toLowerCase() === t.teamId.toLowerCase()) || 
                (g.teamNo && g.teamNo.toLowerCase() === t.teamNo.toLowerCase()) || 
                (Number(g.teamNumber) === tNum && !Number.isNaN(tNum))
              );
              if (gt) {
                if (gt.projectTitle && gt.projectTitle.trim() && !isMockTitle(gt.projectTitle)) {
                  t.title = gt.projectTitle.trim();
                  t.status = (gt.titleStatus === 'Approved' || gt.titleLocked) ? 'Approved' : 'Pending';
                } else {
                  t.title = '';
                  t.status = 'Pending';
                }
                if (gt.guide) {
                  t.guide = gt.guide;
                }
              }
            });
          }
        }
      } catch (e) {
        console.error('Failed to sync advisor teams with real student data', e);
      }
      return teamList;
    };

    try {
      const stored = localStorage.getItem(`siet_advisor_teams_${className}`);
      let teamsToUse = defaultTeams;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          teamsToUse = parsed;
        }
      }
      const synced = syncWithRealStudentAndGuide(teamsToUse);
      localStorage.setItem(`siet_advisor_teams_${className}`, JSON.stringify(synced));
      return synced;
    } catch (e) {
      return syncWithRealStudentAndGuide(defaultTeams);
    }
  },

  saveTeamsForClass(className: string, teams: ClassTeam[]) {
    try {
      localStorage.setItem(`siet_advisor_teams_${className}`, JSON.stringify(teams));
      notifyListeners();
    } catch (e) {
      console.error(e);
    }
  },

  areTeamsCreated(className: string = "CSE-B"): boolean {
    const teams = this.getTeamsForClass(className);
    return teams.length > 0;
  },
  
  async getClassStudents(className: string = "CSE-B", batch: string = "2023-2027 (III Year)"): Promise<AdminStudent[]> {
    const allStudents =await AdminService.getStudents();
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
        // If not in any team members list, check if student.teamNo was set to a valid team in this class
        if (student.teamNo && student.teamNo !== 'Unassigned') {
          const matchingTeam = teams.find(t => t.teamNo.toLowerCase() === student.teamNo.toLowerCase());
          if (matchingTeam) {
            const currentCap = matchingTeam.capacity || this.getTeamCapacity(className);
            if (matchingTeam.members.length < currentCap) {
              matchingTeam.members.push({
                rollNo: student.rollNo,
                name: student.name,
                email: student.email,
                isLead: matchingTeam.members.length === 0
              });
              matchingTeam.membersCount = matchingTeam.members.length;
              this.saveTeamsForClass(className, teams);
              return {
                ...student,
                teamNo: matchingTeam.teamNo,
                projectTitle: matchingTeam.title,
                guide: matchingTeam.guide
              };
            }
          }
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
    className: string = "CSE-B",
    batch: string = "2023-2027 (III Year)",
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

  getGuideTeamCount(className: string = "CSE-B", guideName: string): number {
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

    this.saveTeamsForClass(className, formattedTeams);
    this.setTeamCapacity(className, capacity);

    // Update students in AdminService
    const allStudents =await AdminService.getStudents();
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
    return true;
  },

  async assignStudentToTeam(
    className: string,
    studentRollNo: string,
    targetTeamId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.moveStudent(className, studentRollNo, targetTeamId);
  },

  async moveStudent(
    className: string,
    studentRollNo: string,
    targetTeamId: string
  ): Promise<{ success: boolean; message: string }> {
    const teams = this.getTeamsForClass(className);
    const targetTeam = teams.find(t => t.teamId === targetTeamId || t.teamNo === targetTeamId);
    if (!targetTeam) {
      return { success: false, message: "Target team does not exist." };
    }

    const currentCap = targetTeam.capacity || this.getTeamCapacity(className);
    if (targetTeam.members.length >= currentCap) {
      return { 
        success: false, 
        message: `Target team is at maximum capacity (${targetTeam.members.length}/${currentCap} members). Cannot assign student.` 
      };
    }

    // Locate source team if any
    const sourceTeam = teams.find(t => t.members.some(m => m.rollNo === studentRollNo));
    if (sourceTeam && sourceTeam.teamId === targetTeam.teamId) {
      return { success: false, message: "Student is already in this team." };
    }

    const allStudents = await AdminService.getStudents();
    const student =await allStudents.find(s => s.rollNo === studentRollNo);

    // If student was in a source team, remove them from source team
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

    this.saveTeamsForClass(className, teams);

    // Update in AdminService
    if (student) {
      student.teamNo = targetTeam.teamNo;
      student.projectTitle = targetTeam.title;
      student.guide = targetTeam.guide;
      await AdminService.saveStudents(allStudents);
    }

    notifyListeners();
    return { 
      success: true, 
      message: `Successfully assigned ${student?.name || studentRollNo} to ${targetTeam.teamNo}.` 
    };
  },

  async reassignGuide(
    className: string,
    teamId: string,
    guideName: string,
    guideEmail?: string
  ): Promise<{ success: boolean; message: string }> {
    const teams = this.getTeamsForClass(className);
    const team = teams.find(t => t.teamId === teamId);
    if (!team) {
      return { success: false, message: "Team not found." };
    }

    if (team.guide.toLowerCase() === guideName.toLowerCase()) {
      return { success: false, message: "This guide is already assigned to this team." };
    }

    const currentGuideLoad = this.getGuideTeamCount(className, guideName);
    if (currentGuideLoad >= 5) {
      return { 
        success: false, 
        message: `Cannot assign ${guideName}. Guide has already reached the maximum institutional quota of 5 teams in this class.` 
      };
    }

    team.guide = guideName;
    if (guideEmail) team.guideEmail = guideEmail;

    this.saveTeamsForClass(className, teams);

    // Update students in AdminService
    const allStudents = await AdminService.getStudents();
    
    team.members.forEach(m => {
      const s = allStudents.find(x => x.rollNo === m.rollNo);
      if (s) {
        s.guide = guideName;
      }
    });
    await AdminService.saveStudents(allStudents);

    notifyListeners();
    return { 
      success: true, 
      message: `Guide ${guideName} successfully assigned to ${team.teamNo}.` 
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

    teams.push(newTeam);
    this.saveTeamsForClass(className, teams);

    // Update students in AdminService
    allStudents.forEach(s => {
      if (teamData.memberRollNos.includes(s.rollNo)) {
        s.teamNo = newTeam.teamNo;
        s.projectTitle = newTeam.title;
        s.guide = newTeam.guide;
      }
    });
    await AdminService.saveStudents(allStudents);

    notifyListeners();
    return {
      success: true,
      message: `Team ${newTeam.teamNo} successfully formed and assigned to ${newTeam.guide}.`,
      team: newTeam
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
    return await this.addManualTeam(className, options.batch || "2023-2027 (III Year)", {
      teamNo: options.newTeamNo,
      title: options.projectTitle || "",
      guide: options.guideName || 'Dr. P. Manimegalai',
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

  async deleteTeam(className: string, teamId: string): Promise<{ success: boolean; message: string }> {
    let teams = this.getTeamsForClass(className);
    const targetTeam = teams.find(t => t.teamId === teamId);
    if (!targetTeam) {
      return { success: false, message: "Team not found." };
    }

    const memberRolls = targetTeam.members.map(m => m.rollNo);

    // Filter out deleted team
    teams = teams.filter(t => t.teamId !== teamId);
    this.saveTeamsForClass(className, teams);

    // Reset student assignments in AdminService to Unassigned
    const allStudents = await AdminService.getStudents();
    allStudents.forEach(s => {
      if (memberRolls.includes(s.rollNo)) {
        s.teamNo = "Unassigned";
        s.projectTitle = "";
        s.guide = "";
      }
    });
    await AdminService.saveStudents(allStudents);

    notifyListeners();
    return {
      success: true,
      message: `Team ${targetTeam.teamNo} was successfully deleted.`
    };
  }
};
