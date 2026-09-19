import React, { useState, useMemo } from 'react';
import { 
  Users, ChevronRight, Search, X, Filter, RotateCcw, 
  Settings, Award, AlertTriangle, UserCheck, Shield, ExternalLink,
  Check, Edit3, Save, XCircle, BookOpen, Clock, Mail, Crown
} from 'lucide-react';
import { ClassTeam, TeamMemberRecord, AdvisorService } from '../../services/advisorService';
import { AdminFaculty, AdminStudent } from '../../services/adminService';
import { MarksService } from '../../services/marksService';
import { StudentService } from '../../services/studentService';
import { formatProjectTitle } from '../../utils/titleUtils';

export interface AdvisorAllTeamsTableViewProps {
  teams: ClassTeam[];
  guides: AdminFaculty[];
  students: AdminStudent[];
  className: string;
  batch: string;
  advisorName: string;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  onTeamUpdated?: () => void;
  onShowToast: (msg: string) => void;
}

export const AdvisorAllTeamsTableView: React.FC<AdvisorAllTeamsTableViewProps> = ({
  teams,
  guides,
  students,
  className,
  batch,
  advisorName,
  searchTerm,
  onSearchChange,
  isFilterOpen,
  onToggleFilter,
  onTeamUpdated,
  onShowToast
}) => {
  // Advanced filter states
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [domainFilter, setDomainFilter] = useState<string>('ALL');
  const [sizeFilter, setSizeFilter] = useState<string>('ALL');
  const [guideFilter, setGuideFilter] = useState<string>('ALL');

  // Multi-row expansion tracking
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  // Inline active mode per expanded row: 'roster' | 'manage' | 'marks'
  const [rowActiveModes, setRowActiveModes] = useState<Record<string, 'roster' | 'manage' | 'marks'>>({});

  // Inline editing state for teams: teamId -> draft edits
  const [inlineDrafts, setInlineDrafts] = useState<Record<string, {
    teamNo: string;
    guide: string;
    leadRollNo: string;
    selectedRollNos: string[];
    domain: string;
  }>>({});

  // Inline marks state for quick review
  const [inlineMarks, setInlineMarks] = useState<Record<string, {
    score: number;
    remarks: string;
  }>>({});

  // Toggle row expansion (always slides down directly beneath the row)
  const toggleRowExpand = (teamId: string, preferredMode: 'roster' | 'manage' | 'marks' = 'roster') => {
    setExpandedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId) && rowActiveModes[teamId] === preferredMode) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });

    setRowActiveModes(prev => ({
      ...prev,
      [teamId]: preferredMode
    }));

    // Initialize draft if opening manage mode
    if (!inlineDrafts[teamId]) {
      const team = teams.find(t => t.teamId === teamId);
      if (team) {
        const rolls = team.members.map(m => m.rollNo);
        const lead = team.members.find(m => m.isLead)?.rollNo || rolls[0] || '';
        setInlineDrafts(prev => ({
          ...prev,
          [teamId]: {
            teamNo: team.teamNo,
            guide: team.guide || '',
            leadRollNo: lead,
            selectedRollNos: rolls,
            domain: team.domain || 'AI/ML'
          }
        }));
      }
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setDomainFilter('ALL');
    setSizeFilter('ALL');
    setGuideFilter('ALL');
    onSearchChange('');
    onShowToast('All table filters have been reset.');
  };

  const hasActiveFilters = 
    statusFilter !== 'ALL' || 
    domainFilter !== 'ALL' || 
    sizeFilter !== 'ALL' || 
    guideFilter !== 'ALL' || 
    searchTerm.trim() !== '';

  // Extract unique domains from teams
  const availableDomains = useMemo(() => {
    const set = new Set<string>();
    teams.forEach(t => {
      if (t.domain && t.domain.trim()) {
        set.add(t.domain.trim());
      }
    });
    return Array.from(set);
  }, [teams]);

  // Unassigned students pool for inline member allocation
  const unassignedStudents = useMemo(() => {
    return students.filter(
      s => !s.teamNo || s.teamNo === 'Unassigned' || s.teamNo.trim() === ''
    );
  }, [students]);

  // Combined client-side filtering
  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      // 1. Text Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTeamName = (team.teamNo || '').toLowerCase().includes(q);
        const matchesTeamId = (team.teamId || '').toLowerCase().includes(q);
        const matchesTitle = (team.title || '').toLowerCase().includes(q);
        const matchesGuide = (team.guide || '').toLowerCase().includes(q);
        const matchesDomain = (team.domain || '').toLowerCase().includes(q);
        const matchesMembers = (team.members || []).some(
          m => m.name.toLowerCase().includes(q) || m.rollNo.toLowerCase().includes(q)
        );

        if (!matchesTeamName && !matchesTeamId && !matchesTitle && !matchesGuide && !matchesDomain && !matchesMembers) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL') {
        const teamStatus = (team.status || '').toLowerCase();
        const filterVal = statusFilter.toLowerCase();
        if (filterVal === 'active') {
          if (!teamStatus.includes('active') && !teamStatus.includes('approved')) return false;
        } else if (filterVal === 'completed') {
          if (!teamStatus.includes('completed')) return false;
        } else if (filterVal === 'pending') {
          if (!teamStatus.includes('pending') && !teamStatus.includes('review')) return false;
        } else if (filterVal === 'inactive') {
          if (!teamStatus.includes('inactive') && !teamStatus.includes('rejected')) return false;
        } else if (!teamStatus.includes(filterVal)) {
          return false;
        }
      }

      // 3. Domain Filter
      if (domainFilter !== 'ALL') {
        if ((team.domain || '').toLowerCase() !== domainFilter.toLowerCase()) {
          return false;
        }
      }

      // 4. Team Size Filter
      if (sizeFilter !== 'ALL') {
        const count = team.members?.length || 0;
        if (sizeFilter === '1-2' && (count < 1 || count > 2)) return false;
        if (sizeFilter === '3-4' && (count < 3 || count > 4)) return false;
        if (sizeFilter === '5+' && count < 5) return false;
        if (sizeFilter === 'empty' && count !== 0) return false;
      }

      // 5. Guide Filter
      if (guideFilter !== 'ALL') {
        if ((team.guide || '').toLowerCase() !== guideFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [teams, searchTerm, statusFilter, domainFilter, sizeFilter, guideFilter]);

  // Save inline edits directly inside the dropped-down section
  const handleSaveInlineManage = (team: ClassTeam) => {
    const draft = inlineDrafts[team.teamId];
    if (!draft) return;

    if (!draft.teamNo.trim()) {
      onShowToast('Team Number cannot be empty.');
      return;
    }

    const updatedMembers: TeamMemberRecord[] = draft.selectedRollNos.map(rollNo => {
      const existing = team.members.find(m => m.rollNo === rollNo);
      if (existing) {
        return {
          ...existing,
          isLead: rollNo === draft.leadRollNo
        };
      }
      const studentObj = students.find(s => s.rollNo === rollNo);
      return {
        rollNo,
        name: studentObj?.name || 'Student',
        email: studentObj?.email || `${rollNo.toLowerCase()}@srishakthi.ac.in`,
        isLead: rollNo === draft.leadRollNo
      };
    });

    const leadRecord = updatedMembers.find(m => m.isLead) || updatedMembers[0];
    const leadStudentStr = leadRecord ? `${leadRecord.name} (${leadRecord.rollNo})` : 'Unassigned';

    const guideObj = guides.find(g => g.name === draft.guide);

    const updatedTeam: ClassTeam = {
      ...team,
      teamNo: draft.teamNo.trim(),
      guide: draft.guide || team.guide,
      guideEmail: guideObj?.email || team.guideEmail,
      guideDesignation: guideObj?.designation || team.guideDesignation || 'Associate Professor',
      guideDepartment: 'Dept. of CSE',
      domain: draft.domain || team.domain || 'AI/ML',
      leadStudent: leadStudentStr,
      members: updatedMembers,
      membersCount: updatedMembers.length,
      lastModified: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    const updatedTeamsList = teams.map(t => t.teamId === team.teamId ? updatedTeam : t);
    AdvisorService.saveTeamsForClass(className, updatedTeamsList);

    // Switch view back to roster
    setRowActiveModes(prev => ({
      ...prev,
      [team.teamId]: 'roster'
    }));

    if (onTeamUpdated) onTeamUpdated();
    onShowToast(`Team ${updatedTeam.teamNo} details updated successfully.`);
  };

  // Save quick inline review marks
  const handleSaveInlineMarks = (team: ClassTeam) => {
    const markEntry = inlineMarks[team.teamId];
    if (!markEntry) return;

    const currentWeek = 1; // Milestone Review 1
    const memberMarks: Record<string, number> = {};
    team.members.forEach(m => {
      memberMarks[m.rollNo] = markEntry.score || 85;
    });

    MarksService.saveWeeklyMarks(
      team.teamId,
      currentWeek,
      memberMarks,
      markEntry.remarks || 'Inline advisor milestone evaluation.',
      advisorName
    );

    onShowToast(`Marks for ${team.teamNo} successfully recorded.`);
    setRowActiveModes(prev => ({
      ...prev,
      [team.teamId]: 'roster'
    }));
  };

  return (
    <div className="space-y-4 font-sans">

      {/* Section 2: Collapsible Filter Drawer */}
      <div 
        style={{
          display: 'grid',
          gridTemplateRows: isFilterOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 350ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          <div className="bg-white rounded-2xl border border-[#D8CCBA] p-5 mb-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Status Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#75695A] uppercase tracking-wider block">
                  Team Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#D8CCBA] bg-[#F8F5EE] focus:outline-none focus:border-[#111111] text-[#111111] font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active / Approved</option>
                  <option value="Pending">Pending Review</option>
                  <option value="Completed">Completed</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Domain / Category Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#75695A] uppercase tracking-wider block">
                  Domain / Category
                </label>
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#D8CCBA] bg-[#F8F5EE] focus:outline-none focus:border-[#111111] text-[#111111] font-medium"
                >
                  <option value="ALL">All Domains</option>
                  <option value="AI/ML">AI / Machine Learning</option>
                  <option value="Web Dev">Web Development</option>
                  <option value="IoT">Internet of Things (IoT)</option>
                  <option value="Cyber Security">Cyber Security</option>
                  <option value="Cloud Computing">Cloud Computing</option>
                  <option value="Data Science">Data Science</option>
                  {availableDomains
                    .filter(d => !['AI/ML', 'Web Dev', 'IoT', 'Cyber Security', 'Cloud Computing', 'Data Science'].includes(d))
                    .map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))
                  }
                </select>
              </div>

              {/* Team Size Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#75695A] uppercase tracking-wider block">
                  Team Size
                </label>
                <select
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#D8CCBA] bg-[#F8F5EE] focus:outline-none focus:border-[#111111] text-[#111111] font-medium"
                >
                  <option value="ALL">Any Size</option>
                  <option value="1-2">1 – 2 Members</option>
                  <option value="3-4">3 – 4 Members</option>
                  <option value="5+">5+ Members</option>
                  <option value="empty">0 Members (Empty)</option>
                </select>
              </div>

              {/* Guide / Faculty Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#75695A] uppercase tracking-wider block">
                  Assigned Guide
                </label>
                <select
                  value={guideFilter}
                  onChange={(e) => setGuideFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#D8CCBA] bg-[#F8F5EE] focus:outline-none focus:border-[#111111] text-[#111111] font-medium"
                >
                  <option value="ALL">All Guides</option>
                  {guides.map(g => (
                    <option key={g.name} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Bottom Reset Action */}
            <div className="mt-4 pt-3 border-t border-[#D8CCBA]/40 flex justify-between items-center text-xs">
              <span className="text-[#75695A]">
                Showing <strong className="text-[#111111]">{filteredTeams.length}</strong> of {teams.length} teams
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
                className={`inline-flex items-center gap-1.5 font-bold transition cursor-pointer ${
                  hasActiveFilters ? 'text-[#111111] hover:underline' : 'text-[#75695A]/40 cursor-not-allowed'
                }`}
              >
                <RotateCcw size={13} />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Institutional Data Table Structure */}
      <div className="bg-white rounded-2xl border border-[#D8CCBA] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D8CCBA] bg-[#F8F5EE] text-[11px] font-bold text-[#75695A] uppercase tracking-wider select-none">
                <th scope="col" className="py-3.5 pl-5 pr-3">Team Name</th>
                <th scope="col" className="py-3.5 px-3">Team ID</th>
                <th scope="col" className="py-3.5 px-3">Members</th>
                <th scope="col" className="py-3.5 px-3">Assigned Guide</th>
                <th scope="col" className="py-3.5 px-3">Project Title</th>
                <th scope="col" className="py-3.5 px-3">Status</th>
                <th scope="col" className="py-3.5 px-3">Last Modified</th>
                <th scope="col" className="py-3.5 pl-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8CCBA]/50 text-xs">
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="p-3 rounded-2xl bg-[#F8F5EE] text-[#75695A] border border-[#D8CCBA]">
                        <Filter size={20} />
                      </div>
                      <p className="font-bold text-[#111111] text-sm">No teams match your filter</p>
                      <p className="text-[#75695A] text-xs">
                        Try adjusting your search query or reset the applied filter criteria.
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 px-3.5 py-1.5 rounded-xl border border-[#D8CCBA] bg-[#F8F5EE] font-bold text-xs hover:bg-[#F3EFE6] text-[#111111] cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTeams.map((team) => {
                  const isExpanded = expandedRowIds.has(team.teamId);
                  const activeMode = rowActiveModes[team.teamId] || 'roster';
                  const memberCount = team.members?.length || 0;
                  const isEmpty = memberCount === 0;
                  const draft = inlineDrafts[team.teamId] || {
                    teamNo: team.teamNo,
                    guide: team.guide || '',
                    leadRollNo: team.members.find(m => m.isLead)?.rollNo || team.members[0]?.rollNo || '',
                    selectedRollNos: team.members.map(m => m.rollNo),
                    domain: team.domain || 'AI/ML'
                  };

                  return (
                    <React.Fragment key={team.teamId}>
                      {/* Main Table Row */}
                      <tr 
                        onClick={() => toggleRowExpand(team.teamId, 'roster')}
                        className={`transition-colors cursor-pointer group select-none ${
                          isExpanded 
                            ? 'bg-[#F8F5EE]/90 border-l-4 border-l-[#111111]' 
                            : 'hover:bg-[#F3EFE6]/60'
                        }`}
                      >
                        {/* 1. Team Name + Expand Chevron + Empty Badge */}
                        <td className="py-4 pl-5 pr-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span 
                              className={`transition-transform duration-300 transform text-[#75695A] group-hover:text-[#111111] ${
                                isExpanded ? 'rotate-90' : 'rotate-0'
                              }`}
                            >
                              <ChevronRight size={16} />
                            </span>
                            <span className="font-bold text-[#111111] text-sm">
                              {team.teamNo || 'Untitled Team'}
                            </span>
                            {isEmpty && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#D9AEAE] bg-[#F8EEEE] text-[#7C3838]">
                                Empty
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Team ID: Monospaced identifier code pill */}
                        <td className="py-4 px-3 whitespace-nowrap">
                          <span className="font-mono text-[11px] font-bold px-2 py-1 rounded-md bg-[#EDE7DB] text-[#292725] border border-[#D8CCBA]">
                            {team.teamId}
                          </span>
                        </td>

                        {/* 3. Members: Pill badge displaying current count with group icon */}
                        <td className="py-4 px-3 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F8F5EE] text-[#292725] border border-[#D8CCBA]">
                            <Users size={12} className="text-[#75695A]" />
                            <span>{memberCount} {memberCount === 1 ? 'Member' : 'Members'}</span>
                          </div>
                        </td>

                        {/* 4. Assigned Guide: Primary line guide name with bullet/avatar dot, secondary designation & department */}
                        <td className="py-4 px-3">
                          <div className="flex items-start gap-2 max-w-[200px]">
                            <span className="w-2 h-2 rounded-full bg-[#52796F] mt-1.5 shrink-0" />
                            <div className="truncate">
                              <p className="font-bold text-[#111111] truncate">
                                {team.guide || 'Unassigned Guide'}
                              </p>
                              <p className="text-[11px] text-[#75695A] truncate">
                                {team.guideDesignation || 'Associate Professor'} &bull; {team.guideDepartment || 'Dept. of CSE'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 5. Project Title: Primary truncated project title if approved, or status badge if not approved */}
                        <td className="py-4 px-3">
                          <div className="max-w-[240px]">
                            {(() => {
                              const isSub1Approved = team.status === 'Approved' || (team as any).isTitleApproved || StudentService.isSubmission1Approved(team.teamId);
                              const formatted = formatProjectTitle(team.title, isSub1Approved ? 'Approved' : team.status, isSub1Approved);
                              const isApproved = formatted !== 'No Title Submitted' && formatted !== 'Title Approval Pending';
                              const isPending = formatted === 'Title Approval Pending';

                              if (isApproved) {
                                return (
                                  <p 
                                    className="font-bold text-[#111111] truncate text-xs"
                                    title={formatted}
                                  >
                                    {formatted}
                                  </p>
                                );
                              } else if (isPending) {
                                return (
                                  <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md text-[11px] inline-flex items-center gap-1">
                                    <Clock size={11} /> Title Approval Pending
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md text-[11px]">
                                    No Title Submitted
                                  </span>
                                );
                              }
                            })()}
                            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-[#75695A] bg-[#EDE7DB] border border-[#D8CCBA] px-1.5 py-0.5 rounded">
                              {team.domain || 'General'}
                            </span>
                          </div>
                        </td>

                        {/* 6. Status: Pill badge displaying current lifecycle state */}
                        <td className="py-4 px-3 whitespace-nowrap">
                          <span 
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              (team.status || '').toLowerCase().includes('approved') || (team.status || '').toLowerCase().includes('active')
                                ? 'bg-[#EDF1EC] text-[#4A5844] border-[#C4D1C2]'
                                : (team.status || '').toLowerCase().includes('review')
                                ? 'bg-[#F7F2E7] text-[#8A6A32] border-[#DBCFA8]'
                                : (team.status || '').toLowerCase().includes('completed')
                                ? 'bg-[#EDE7DB] text-[#111111] border-[#D8CCBA]'
                                : 'bg-[#F8EEEE] text-[#7C3838] border-[#D9AEAE]'
                            }`}
                          >
                            {team.status || 'Pending'}
                          </span>
                        </td>

                        {/* 7. Last Modified: Monospaced timestamp string */}
                        <td className="py-4 px-3 whitespace-nowrap">
                          <span className="font-mono text-[11px] text-[#75695A]">
                            {team.lastModified || '2026-09-18 14:30'}
                          </span>
                        </td>

                        {/* 8. Actions: End-aligned action buttons - ALWAYS SLIDES DOWN INLINE, NEVER POPS UP OR MOVES AWAY */}
                        <td className="py-4 pl-3 pr-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {/* Manage Button: Expands row downward directly into Manage mode */}
                            <button
                              type="button"
                              onClick={() => toggleRowExpand(team.teamId, activeMode === 'manage' && isExpanded ? 'roster' : 'manage')}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                isExpanded && activeMode === 'manage'
                                  ? 'bg-[#111111] text-white border-[#111111]'
                                  : 'bg-[#F8F5EE] hover:bg-[#F3EFE6] text-[#111111] border-[#D8CCBA]'
                              }`}
                            >
                              <Settings size={13} />
                              <span>Manage</span>
                            </button>

                            {/* Marks Button: Expands row downward directly into Marks mode */}
                            <button
                              type="button"
                              title="Evaluate Marks & Milestones"
                              onClick={() => toggleRowExpand(team.teamId, activeMode === 'marks' && isExpanded ? 'roster' : 'marks')}
                              className={`p-1.5 rounded-xl border transition cursor-pointer ${
                                isExpanded && activeMode === 'marks'
                                  ? 'bg-[#111111] text-white border-[#111111]'
                                  : 'bg-[#F8F5EE] hover:bg-[#F3EFE6] text-[#111111] border-[#D8CCBA]'
                              }`}
                            >
                              <Award size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Section 4 & 5: Smooth Click-to-Expand Row Behavior & Content - COMPLETELY INLINE WITHOUT ANY POPUP */}
                      <tr>
                        <td colSpan={8} className="p-0 border-0">
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateRows: isExpanded ? '1fr' : '0fr',
                              transition: 'grid-template-rows 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          >
                            <div style={{ overflow: 'hidden', minHeight: 0 }}>
                              <div className="bg-[#F8F5EE]/60 border-y border-[#D8CCBA] p-5 space-y-4">
                                
                                {/* Header Strip with Inline View Toggles */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D8CCBA] text-xs">
                                  <div className="flex items-center gap-3">
                                    <h4 className="font-serif font-bold text-[#111111] text-base">
                                      {team.teamNo} &mdash; Details &amp; Governance
                                    </h4>
                                    <span className="font-mono text-[11px] bg-[#EDE7DB] border border-[#D8CCBA] px-2.5 py-0.5 rounded font-bold text-[#292725]">
                                      {team.teamId}
                                    </span>
                                  </div>

                                  {/* Inline sub-view buttons: Never pops up or moves page */}
                                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#D8CCBA]">
                                    <button
                                      type="button"
                                      onClick={() => setRowActiveModes(prev => ({ ...prev, [team.teamId]: 'roster' }))}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                        activeMode === 'roster'
                                          ? 'bg-[#111111] text-[#F8F5EE]'
                                          : 'text-[#75695A] hover:text-[#111111]'
                                      }`}
                                    >
                                      <Users size={12} />
                                      <span>Team Roster</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setRowActiveModes(prev => ({ ...prev, [team.teamId]: 'manage' }))}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                        activeMode === 'manage'
                                          ? 'bg-[#111111] text-[#F8F5EE]'
                                          : 'text-[#75695A] hover:text-[#111111]'
                                      }`}
                                    >
                                      <Edit3 size={12} />
                                      <span>Inline Manage</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setRowActiveModes(prev => ({ ...prev, [team.teamId]: 'marks' }))}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                        activeMode === 'marks'
                                          ? 'bg-[#111111] text-[#F8F5EE]'
                                          : 'text-[#75695A] hover:text-[#111111]'
                                      }`}
                                    >
                                      <Award size={12} />
                                      <span>Milestone Marks</span>
                                    </button>
                                  </div>
                                </div>

                                {/* CONTENT SECTION 1: Team Roster Cards */}
                                {activeMode === 'roster' && (
                                  <div>
                                    {(!team.members || team.members.length === 0) ? (
                                      <div className="rounded-xl border border-[#D9AEAE] bg-[#F8EEEE] p-4 flex items-center gap-3">
                                        <AlertTriangle size={18} className="text-[#7C3838] shrink-0" />
                                        <div className="text-xs text-[#7C3838]">
                                          <strong className="block font-bold">No Members Assigned Yet</strong>
                                          This team currently has zero student members. Click <strong>Inline Manage</strong> right above to allocate unassigned students.
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {team.members.map((member) => (
                                          <div 
                                            key={member.rollNo}
                                            className="bg-white rounded-xl border border-[#D8CCBA] p-4 shadow-subtle flex flex-col justify-between space-y-2.5"
                                          >
                                            <div className="space-y-1.5">
                                              <div className="flex items-start justify-between gap-2">
                                                <h5 className="font-bold text-[#111111] text-xs truncate">
                                                  {member.name}
                                                </h5>
                                                <span 
                                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 inline-flex items-center gap-1 ${
                                                    member.isLead
                                                      ? 'bg-[#EDE7DB] text-[#111111] border-[#D8CCBA]'
                                                      : 'bg-[#F8F5EE] text-[#75695A] border-[#D8CCBA]'
                                                  }`}
                                                >
                                                  {member.isLead && <Crown size={10} className="text-amber-600" />}
                                                  <span>{member.isLead ? 'Team Lead' : 'Member'}</span>
                                                </span>
                                              </div>

                                              <p className="font-mono text-[11px] text-[#75695A] font-bold">
                                                {member.rollNo}
                                              </p>
                                            </div>

                                            <div className="text-[11px] text-[#75695A] truncate pt-2 border-t border-[#D8CCBA]/40 flex items-center gap-1.5">
                                              <Mail size={11} className="text-[#B8AA97] shrink-0" />
                                              <span className="truncate">{member.email}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* CONTENT SECTION 2: Inline Team Management - NO POPUP MODAL */}
                                {activeMode === 'manage' && (
                                  <div className="bg-white rounded-2xl border border-[#D8CCBA] p-5 space-y-4 shadow-subtle">
                                    <div className="border-b border-[#D8CCBA]/40 pb-2">
                                      <h5 className="font-serif font-bold text-[#111111] text-sm">
                                        Inline Team Configuration &amp; Member Assignment
                                      </h5>
                                      <p className="text-[11px] text-[#75695A]">
                                        Make real-time edits directly in place without leaving the page.
                                      </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                      
                                      {/* Team Name / No */}
                                      <div className="space-y-1">
                                        <label className="font-bold text-[#111111] block">
                                          Team Display Name
                                        </label>
                                        <input
                                          type="text"
                                          value={draft.teamNo}
                                          onChange={(e) => setInlineDrafts(prev => ({
                                            ...prev,
                                            [team.teamId]: { ...draft, teamNo: e.target.value }
                                          }))}
                                          className="w-full px-3 py-2 rounded-xl border border-[#D8CCBA] bg-[#F8F5EE] focus:outline-none focus:border-[#111111] font-medium"
                                        />
                                      </div>

                                      {/* Assigned Guide */}
                                      <div className="space-y-1">
                                        <label className="font-bold text-[#111111] block">
                                          Assign Project Guide
                                        </label>
                                        <select
                                          value={draft.guide}
                                          onChange={(e) => setInlineDrafts(prev => ({
                                            ...prev,
                                            [team.teamId]: { ...draft, guide: e.target.value }
                                          }))}
                                          className="w-full px-3 py-2 rounded-xl border border-[#D8CCBA] bg-[#F8F5EE] focus:outline-none focus:border-[#111111] font-medium"
                                        >
                                          <option value="">-- Select Faculty Guide --</option>
                                          {guides.map(g => (
                                            <option key={g.name} value={g.name}>
                                              {g.name} ({g.designation || 'Faculty'})
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      {/* Project Domain */}
                                      <div className="space-y-1">
                                        <label className="font-bold text-[#111111] block">
                                          Domain Category
                                        </label>
                                        <select
                                          value={draft.domain}
                                          onChange={(e) => setInlineDrafts(prev => ({
                                            ...prev,
                                            [team.teamId]: { ...draft, domain: e.target.value }
                                          }))}
                                          className="w-full px-3 py-2 rounded-xl border border-[#D8CCBA] bg-[#F8F5EE] focus:outline-none focus:border-[#111111] font-medium"
                                        >
                                          <option value="AI/ML">AI / Machine Learning</option>
                                          <option value="Web Dev">Web Development</option>
                                          <option value="IoT">Internet of Things (IoT)</option>
                                          <option value="Cyber Security">Cyber Security</option>
                                          <option value="Cloud Computing">Cloud Computing</option>
                                          <option value="Data Science">Data Science</option>
                                        </select>
                                      </div>

                                    </div>

                                    {/* Team Members & Lead Assignment */}
                                    <div className="space-y-2 pt-2 border-t border-[#D8CCBA]/40 text-xs">
                                      <div className="flex justify-between items-center">
                                        <label className="font-bold text-[#111111]">
                                          Designate Team Lead:
                                        </label>
                                        <span className="text-[11px] text-[#75695A]">
                                          {draft.selectedRollNos.length} of 4 Members Selected
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                        {draft.selectedRollNos.map(rollNo => {
                                          const isLead = draft.leadRollNo === rollNo;
                                          const memberObj = team.members.find(m => m.rollNo === rollNo) || 
                                            students.find(s => s.rollNo === rollNo);

                                          return (
                                            <div 
                                              key={rollNo}
                                              onClick={() => setInlineDrafts(prev => ({
                                                ...prev,
                                                [team.teamId]: { ...draft, leadRollNo: rollNo }
                                              }))}
                                              className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                                                isLead 
                                                  ? 'bg-[#111111] text-[#F8F5EE] border-[#111111]' 
                                                  : 'bg-[#F8F5EE] text-[#111111] border-[#D8CCBA] hover:bg-[#F3EFE6]'
                                              }`}
                                            >
                                              <div className="truncate">
                                                <p className="font-bold truncate text-[11px]">
                                                  {memberObj?.name || rollNo}
                                                </p>
                                                <p className="font-mono text-[10px] opacity-80">{rollNo}</p>
                                              </div>
                                              {isLead ? (
                                                <Crown size={14} className="text-amber-400 shrink-0" />
                                              ) : (
                                                <span className="text-[10px] opacity-60">Set Lead</span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Add Member from Unassigned Pool */}
                                    {unassignedStudents.length > 0 && draft.selectedRollNos.length < 4 && (
                                      <div className="space-y-1.5 pt-2 border-t border-[#D8CCBA]/40 text-xs">
                                        <label className="font-bold text-[#75695A]">
                                          Add Unassigned Student to this Team:
                                        </label>
                                        <select
                                          onChange={(e) => {
                                            const roll = e.target.value;
                                            if (roll && !draft.selectedRollNos.includes(roll)) {
                                              setInlineDrafts(prev => ({
                                                ...prev,
                                                [team.teamId]: {
                                                  ...draft,
                                                  selectedRollNos: [...draft.selectedRollNos, roll]
                                                }
                                              }));
                                              onShowToast(`Added student ${roll} to draft.`);
                                            }
                                          }}
                                          defaultValue=""
                                          className="w-full sm:w-80 px-3 py-2 rounded-xl border border-[#D8CCBA] bg-[#F8F5EE] text-[#111111] font-medium"
                                        >
                                          <option value="" disabled>-- Pick an unassigned student --</option>
                                          {unassignedStudents.map(s => (
                                            <option key={s.rollNo} value={s.rollNo}>
                                              {s.name} ({s.rollNo})
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    )}

                                    {/* Inline Actions */}
                                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8CCBA]/40">
                                      <button
                                        type="button"
                                        onClick={() => setRowActiveModes(prev => ({ ...prev, [team.teamId]: 'roster' }))}
                                        className="px-4 py-2 rounded-xl border border-[#D8CCBA] text-[#75695A] hover:text-[#111111] font-bold text-xs cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveInlineManage(team)}
                                        className="px-4 py-2 rounded-xl bg-[#111111] text-[#F8F5EE] font-bold text-xs hover:bg-[#292725] transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                                      >
                                        <Save size={13} />
                                        <span>Save Changes</span>
                                      </button>
                                    </div>

                                  </div>
                                )}

                                {/* CONTENT SECTION 3: Inline Milestone & Evaluation Marks - NO SEPARATE PAGE */}
                                {activeMode === 'marks' && (
                                  <div className="bg-white rounded-2xl border border-[#D8CCBA] p-5 space-y-4 shadow-subtle text-xs">
                                    <div className="flex justify-between items-start border-b border-[#D8CCBA]/40 pb-2">
                                      <div>
                                        <h5 className="font-serif font-bold text-[#111111] text-sm">
                                          Milestone Assessment &amp; Evaluation for {team.teamNo}
                                        </h5>
                                        <p className="text-[11px] text-[#75695A]">
                                          Assign and publish review marks directly in-place.
                                        </p>
                                      </div>
                                      <span className="px-2.5 py-0.5 rounded-full bg-[#EDF1EC] text-[#4A5844] font-bold text-[10px] border border-[#C4D1C2]">
                                        Review 1 Milestone
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <label className="font-bold text-[#111111] block">
                                          Overall Milestone Score (Max: 100)
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={inlineMarks[team.teamId]?.score || 85}
                                          onChange={(e) => setInlineMarks(prev => ({
                                            ...prev,
                                            [team.teamId]: {
                                              score: Number(e.target.value),
                                              remarks: prev[team.teamId]?.remarks || ''
                                            }
                                          }))}
                                          className="w-full px-3 py-2 rounded-xl border border-[#D8CCBA] bg-[#F8F5EE] font-mono font-bold text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="font-bold text-[#111111] block">
                                          Advisor Remarks &amp; Feedback
                                        </label>
                                        <input
                                          type="text"
                                          value={inlineMarks[team.teamId]?.remarks || ''}
                                          onChange={(e) => setInlineMarks(prev => ({
                                            ...prev,
                                            [team.teamId]: {
                                              score: prev[team.teamId]?.score || 85,
                                              remarks: e.target.value
                                            }
                                          }))}
                                          className="w-full px-3 py-2 rounded-xl border border-[#D8CCBA] bg-[#F8F5EE] text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8CCBA]/40">
                                      <button
                                        type="button"
                                        onClick={() => setRowActiveModes(prev => ({ ...prev, [team.teamId]: 'roster' }))}
                                        className="px-4 py-2 rounded-xl border border-[#D8CCBA] text-[#75695A] hover:text-[#111111] font-bold text-xs cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveInlineMarks(team)}
                                        className="px-4 py-2 rounded-xl bg-[#111111] text-[#F8F5EE] font-bold text-xs hover:bg-[#292725] transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                                      >
                                        <Check size={13} />
                                        <span>Publish Marks</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Footer Strip */}
                                <div className="pt-3 border-t border-[#D8CCBA] flex flex-wrap items-center justify-between gap-2 text-xs text-[#75695A]">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#52796F] shrink-0" />
                                    <span>
                                      <strong className="text-[#111111]">Project Guide:</strong> {team.guide || 'Unassigned'}
                                    </span>
                                    <span className="text-[#D8CCBA]">&bull;</span>
                                    <span>{team.guideDesignation || 'Associate Professor'}</span>
                                    <span className="text-[#D8CCBA]">&bull;</span>
                                    <span>{team.guideDepartment || 'Dept. of CSE'}</span>
                                  </div>

                                  <div className="font-mono text-[11px] text-[#75695A]">
                                    Last Updated: {team.lastModified || '2026-09-18 14:30'}
                                  </div>
                                </div>

                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default AdvisorAllTeamsTableView;
