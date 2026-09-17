import { AdminService, AdminStudent } from './adminService';

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
      if (stored) return parseInt(stored, 10) || 4;
    } catch (e) {}
    return 4;
  },

  setTeamCapacity(className: string = "CSE-B", capacity: number) {
    try {
      localStorage.setItem(`siet_team_capacity_${className}`, String(capacity));
      notifyListeners();
    } catch (e) {}
  },

  getTeamsForClass(className: string = "CSE-B"): ClassTeam[] {
    const defaultTeams: ClassTeam[] = [
      {
        teamId: "TEAM-CSE-Y3-B04",
        teamNo: "Team 04",
        class: className,
        batch: "2023-2027 (III Year)",
        title: "Autonomous Crop Disease Segmentation & Yield Advisory Drone System",
        guide: "Dr. P. Manimegalai",
        guideEmail: "dr.manimegalai@siet.ac.in",
        status: "Active & Approved",
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
        title: "Decentralized Smart Grid Energy Trading Protocol",
        guide: "Dr. A. Devipriya",
        guideEmail: "dr.devipriya@siet.ac.in",
        status: "Approved",
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
        title: "Edge-AI Wearable for Real-Time Cardiac Arrhythmia Detection",
        guide: "Dr. K. Vignesh",
        guideEmail: "dr.vignesh@siet.ac.in",
        status: "Approved",
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
        title: "LLM-Powered Multi-Lingual Legal Advisory System for Rural Citizens",
        guide: "Dr. P. Manimegalai",
        guideEmail: "dr.manimegalai@siet.ac.in",
        status: "Approved",
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

    try {
      const stored = localStorage.getItem(`siet_advisor_teams_${className}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let updated = false;
          parsed.forEach((t: any) => {
            if (t.teamId === 'TEAM-CSE-Y3-B04' || t.teamNo === 'Team 04' || t.teamNo === '04') {
              const expectedLead = "Tarunika Rajgopal (714023104112)";
              if (t.leadStudent !== expectedLead) {
                t.leadStudent = expectedLead;
                updated = true;
              }
              const isLeadCorrect = Array.isArray(t.members) &&
                t.members.length === 4 &&
                t.members[0]?.rollNo === '714023104112' &&
                t.members[0]?.isLead === true &&
                !t.members.slice(1).some((m: any) => m.isLead);
              if (!isLeadCorrect) {
                t.members = [
                  { rollNo: "714023104112", name: "Tarunika Rajgopal", email: "tarunika.r@srishakthi.ac.in", isLead: true },
                  { rollNo: "714023104178", name: "Vigneshwaran M", email: "vigneshwaran.m@srishakthi.ac.in", isLead: false },
                  { rollNo: "714023104189", name: "Vishnu Priya S", email: "vishnupriya.s@srishakthi.ac.in", isLead: false },
                  { rollNo: "714023104066", name: "Kavitha R", email: "kavitha.r@srishakthi.ac.in", isLead: false }
                ];
                t.membersCount = 4;
                updated = true;
              }
            }
          });
          if (updated) {
            localStorage.setItem(`siet_advisor_teams_${className}`, JSON.stringify(parsed));
          }
          return parsed;
        }
      }
      localStorage.setItem(`siet_advisor_teams_${className}`, JSON.stringify(defaultTeams));
      return defaultTeams;
    } catch (e) {
      return defaultTeams;
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

  getClassStudents(className: string = "CSE-B", batch: string = "2023-2027 (III Year)"): AdminStudent[] {
    const allStudents = AdminService.getStudents();
    return allStudents.filter(s => s.classSection === className && (batch === 'ALL' || s.batch === batch));
  },

  addStudentToClass(
    className: string = "CSE-B",
    batch: string = "2023-2027 (III Year)",
    name: string,
    rollNo: string
  ): { success: boolean; message: string } {
    const cleanName = name.trim();
    const cleanRoll = rollNo.trim();
    const generatedEmail = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@srishakthi.ac.in`;

    const res = AdminService.addStudent({
      name: cleanName,
      rollNo: cleanRoll,
      email: generatedEmail,
      batch,
      classSection: className
    }, `Added to Class ${className} by Class Advisor`);

    if (res.success) {
      notifyListeners();
    }
    return res;
  },

  getGuideTeamCount(className: string = "CSE-B", guideName: string): number {
    const teams = this.getTeamsForClass(className);
    return teams.filter(t => t.guide.toLowerCase() === guideName.toLowerCase()).length;
  },

  createTeams(
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
  ): boolean {
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
        title: nt.title || `Capstone Project - ${cleanNo}`,
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
    const allStudents = AdminService.getStudents();
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
    AdminService.saveStudents(allStudents);

    notifyListeners();
    return true;
  },

  moveStudent(
    className: string,
    studentRollNo: string,
    targetTeamId: string
  ): { success: boolean; message: string } {
    const teams = this.getTeamsForClass(className);
    const targetTeam = teams.find(t => t.teamId === targetTeamId);
    if (!targetTeam) {
      return { success: false, message: "Target team does not exist." };
    }

    const currentCap = targetTeam.capacity || this.getTeamCapacity(className);
    if (targetTeam.members.length >= currentCap) {
      return { 
        success: false, 
        message: `Target team is at maximum capacity (${targetTeam.members.length}/${currentCap} members). Cannot move student.` 
      };
    }

    // Locate source team
    const sourceTeam = teams.find(t => t.members.some(m => m.rollNo === studentRollNo));
    if (!sourceTeam) {
      return { success: false, message: "Student is not currently in any team." };
    }

    if (sourceTeam.teamId === targetTeamId) {
      return { success: false, message: "Student is already in this team." };
    }

    // Extract student
    const studentMember = sourceTeam.members.find(m => m.rollNo === studentRollNo);
    if (!studentMember) {
      return { success: false, message: "Student member record not found." };
    }

    // Remove from source team
    sourceTeam.members = sourceTeam.members.filter(m => m.rollNo !== studentRollNo);
    sourceTeam.membersCount = sourceTeam.members.length;
    // If was lead, reassign lead to first remaining member if available
    if (studentMember.isLead && sourceTeam.members.length > 0) {
      sourceTeam.members[0].isLead = true;
      sourceTeam.leadStudent = `${sourceTeam.members[0].name} (${sourceTeam.members[0].rollNo})`;
    } else if (sourceTeam.members.length === 0) {
      sourceTeam.leadStudent = 'Unassigned';
    }

    // Add to target team
    const movedMember: TeamMemberRecord = {
      ...studentMember,
      isLead: false
    };
    targetTeam.members.push(movedMember);
    targetTeam.membersCount = targetTeam.members.length;

    this.saveTeamsForClass(className, teams);

    // Update in AdminService
    const allStudents = AdminService.getStudents();
    const student = allStudents.find(s => s.rollNo === studentRollNo);
    if (student) {
      student.teamNo = targetTeam.teamNo;
      student.projectTitle = targetTeam.title;
      student.guide = targetTeam.guide;
      AdminService.saveStudents(allStudents);
    }

    notifyListeners();
    return { 
      success: true, 
      message: `Successfully moved ${studentMember.name} to ${targetTeam.teamNo}.` 
    };
  },

  reassignGuide(
    className: string,
    teamId: string,
    guideName: string,
    guideEmail?: string
  ): { success: boolean; message: string } {
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
    const allStudents = AdminService.getStudents();
    team.members.forEach(m => {
      const s = allStudents.find(x => x.rollNo === m.rollNo);
      if (s) {
        s.guide = guideName;
      }
    });
    AdminService.saveStudents(allStudents);

    notifyListeners();
    return { 
      success: true, 
      message: `Guide ${guideName} successfully assigned to ${team.teamNo}.` 
    };
  },

  assignGuideToTeam(className: string, teamId: string, guideName: string): boolean {
    const res = this.reassignGuide(className, teamId, guideName);
    return res.success;
  },

  addManualTeam(
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
  ): { success: boolean; message: string; team?: ClassTeam } {
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
    const codeNo = cleanNo.replace(/[^0-9]/g, '') || String(teams.length + 1);
    const teamId = `TEAM-CSE-Y3-B${codeNo.padStart(2, '0')}`;

    // Resolve student objects
    const allStudents = AdminService.getStudents();
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
      title: teamData.title || `Capstone Project - ${cleanNo}`,
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
    AdminService.saveStudents(allStudents);

    notifyListeners();
    return {
      success: true,
      message: `Team ${newTeam.teamNo} successfully formed and assigned to ${newTeam.guide}.`,
      team: newTeam
    };
  }
};
