import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { INITIAL_TEAMS, FACULTY_PROFILE } from '../data/guidePortalData';
import { AuthService, getUserInitials } from '../services/authService';
import { AdvisorHistoryService } from '../services/advisorHistoryService';
import { StudentService } from '../services/studentService';
import { MarksService } from '../services/marksService';
import { ApiClient } from '../services/apiClient';
import { isTeamFullySubmitted, hasAnyDetailSubmitted } from '../utils/submissionUtils';
import { sanitizeAndSyncGuideTeams } from '../utils/teamSyncUtils';

const TEAMS_STORAGE_KEY = 'siet_guide_portal_teams_v6';
const ACTIVITIES_STORAGE_KEY = 'siet_guide_portal_activities_v6';

const GuideContext = createContext(null);

export const GuideProvider = ({ children }) => {
  const currentUser = AuthService.getCurrentUser();
  const guideName = (currentUser?.role === 'guide' ? currentUser.name : null) || FACULTY_PROFILE.name;

  const [allTeams, setAllTeams] = useState(() => {
    try {
      const stored = localStorage.getItem(TEAMS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeAndSyncGuideTeams(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading teams from localStorage:', e);
    }
    return sanitizeAndSyncGuideTeams(INITIAL_TEAMS);
  });

  const normalizeName = (n) => (n || '').toLowerCase().replace(/^(dr\.|mr\.|mrs\.|ms\.|prof\.)\s+/i, '').trim();
  const isTargetTeam = (team, teamId) => team?.teamId === teamId;
  const isStudentPortalTeam = (team) => {
    if (!team) return false;
    try {
      const studentTeam = StudentService.getTeam();
      if (!studentTeam) return false;
      const sId = (studentTeam.id || studentTeam.teamId || '').toLowerCase().trim();
      const sNo = (studentTeam.teamNo || '').toLowerCase().trim();
      const sNum = studentTeam.teamNumber != null ? Number(studentTeam.teamNumber) : (sNo ? parseInt(sNo.replace(/\D/g, ''), 10) : null);

      const tId = (team.teamId || team.id || '').toLowerCase().trim();
      const tNo = (team.teamNo || '').toLowerCase().trim();
      const tNum = team.teamNumber != null ? Number(team.teamNumber) : (tNo ? parseInt(tNo.replace(/\D/g, ''), 10) : null);

      if (sId && tId && sId === tId) return true;
      if (sNo && tNo && sNo === tNo) return true;
      if (sNum != null && tNum != null && !Number.isNaN(sNum) && !Number.isNaN(tNum) && sNum === tNum) return true;

      if (Array.isArray(studentTeam.members) && Array.isArray(team.members)) {
        const sRolls = new Set(studentTeam.members.map(m => (m.rollNo || m.rollNumber || m.id || '').toLowerCase().trim()).filter(Boolean));
        if (sRolls.size > 0 && team.members.some(m => sRolls.has((m.rollNo || m.rollNumber || m.id || '').toLowerCase().trim()))) {
          return true;
        }
      }
    } catch (e) {
      // ignore
    }
    return false;
  };

  const [backendMetrics, setBackendMetrics] = useState(null);
  const [backendTeamIds, setBackendTeamIds] = useState(null);
  const backendSubmissionsLoadedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Filter so guide only sees teams assigned to them (or single student team)
  const assignedTeams = useMemo(() => {
    if (backendTeamIds && backendTeamIds.size > 0) {
      return allTeams.filter(t => backendTeamIds.has(t.teamId) || backendTeamIds.has(t.id));
    }
    if (!guideName) return allTeams;
    const target = normalizeName(guideName);
    const filtered = allTeams.filter(t => {
      const g = normalizeName(t.guide || t.guideName || '');
      return g.includes(target) || target.includes(g);
    });
    return filtered.length > 0 ? filtered : allTeams;
  }, [allTeams, guideName, backendTeamIds]);

  const dynamicProfile = useMemo(() => ({
    ...FACULTY_PROFILE,
    name: guideName,
    initials: getUserInitials(guideName),
    assignedTeamsCount: backendMetrics?.totalTeams !== undefined ? backendMetrics.totalTeams : assignedTeams.length
  }), [guideName, backendMetrics, assignedTeams.length]);

  const fetchDashboard = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [data, guideTeams, weeklySubmissions] = await Promise.all([
        ApiClient.getGuideDashboard().catch(e => {
          console.warn('[GuideContext] Failed to load dashboard metrics:', e);
          return null;
        }),
        ApiClient.getGuideTeams().catch(e => {
          console.warn('[GuideContext] Failed to load guide teams:', e);
          return null;
        }),
        ApiClient.getGuidePendingSubmissions().catch(e => {
          console.warn('[GuideContext] Failed to load weekly submissions:', e);
          return null;
        })
      ]);

      if (data) {
        setBackendMetrics({
          totalTeams: Number(data.totalTeams) || 0,
          pendingTitles: Number(data.pendingTitles) || 0,
          approvedTitles: Number(data.approvedTitles) || 0,
          totalSubmissions: Number(data.totalSubmissions) || 0,
          pendingReviews: Number(data.pendingReviews) || 0,
        });
      }

      const hasBackendSubs = Array.isArray(weeklySubmissions);
      if (hasBackendSubs) {
        backendSubmissionsLoadedRef.current = true;
      }

      const getTeamSubmissions = (team, fallbackSubs = []) => {
        if (!hasBackendSubs) return fallbackSubs;
        const matchingBackend = weeklySubmissions.filter(s =>
          (s.teamId && (s.teamId === team.teamId || s.teamId === team.id)) ||
          (s.teamNo && team.teamNo && s.teamNo === team.teamNo) ||
          (s.teamNumber && team.teamNumber && s.teamNumber === team.teamNumber)
        );
        if (matchingBackend.length === 0) return fallbackSubs;

        const merged = [...fallbackSubs];
        matchingBackend.forEach(bSub => {
          const bWeek = bSub.weekNumber !== undefined ? bSub.weekNumber : bSub.week;
          const idx = merged.findIndex(fSub => {
            const fWeek = fSub.weekNumber !== undefined ? fSub.weekNumber : fSub.week;
            return fWeek === bWeek;
          });

          const bStatus = bSub.status || 'Pending';
          const bEvalStatus = bSub.evaluationStatus || (bStatus === 'Submitted' ? 'Pending' : bStatus);
          const isApproved = bStatus === 'Approved' || bEvalStatus === 'Approved';

          const hasRealContent = bSub.hasContent !== undefined 
            ? Boolean(bSub.hasContent) 
            : Boolean(
                bSub.abstractSummary || bSub.problemStatement || bSub.proposedSolution || 
                bSub.technologyUsed || bSub.obstaclesFaced || bSub.pptUrl || bSub.reportUrl || 
                bSub.presentationFileName || bSub.pdfFile || bSub.githubUrl || bSub.liveDemoUrl || 
                (bSub.images && bSub.images.length > 0)
              );

          const formattedSub = {
            ...(idx >= 0 ? merged[idx] : {}),
            ...bSub,
            hasContent: hasRealContent,
            status: bStatus,
            evaluationStatus: bEvalStatus,
            submissionStatus: bSub.submissionStatus || bStatus,
            isLocked: isApproved,
            score: bSub.score !== undefined ? bSub.score : (isApproved && idx >= 0 ? merged[idx].score : null),
            memberMarks: (bSub.memberMarks && Object.keys(bSub.memberMarks).length > 0) ? bSub.memberMarks : (isApproved && idx >= 0 ? (merged[idx].memberMarks || {}) : {}),
            guideRemarks: bSub.comments || bSub.guideRemarks || (isApproved && idx >= 0 ? (merged[idx].guideRemarks || '') : '')
          };

          if (idx >= 0) {
            merged[idx] = formattedSub;
          } else {
            merged.push(formattedSub);
          }
        });
        return merged;
      };

      const teamsData = Array.isArray(guideTeams) && guideTeams.length > 0
        ? guideTeams
        : (data && Array.isArray(data.teams) ? data.teams : null);

      if (Array.isArray(teamsData)) {
        const idSet = new Set();
        teamsData.forEach(t => {
          if (t.teamId) idSet.add(t.teamId);
          if (t.id) idSet.add(t.id);
        });
        setBackendTeamIds(idSet);

        setAllTeams(prevTeams => {
          const updated = prevTeams.map(existing => {
            const match = teamsData.find(
              b => b.teamId === existing.teamId || b.id === existing.id || b.teamNo === existing.teamNo || (existing.teamNumber && b.teamNumber && b.teamNumber === existing.teamNumber)
            );
            if (!match) return existing;

            const teamNum = match.teamNumber !== undefined
              ? match.teamNumber
              : (parseInt(String(match.teamNo || '').replace(/\D/g, ''), 10) || existing.teamNumber);
            const isApproved = match.isTitleApproved !== undefined
              ? Boolean(match.isTitleApproved)
              : Boolean(existing.isTitleApproved);

            const teamSubs = getTeamSubmissions(existing, existing.submissions || []);
            const repoUrlFromSubs = teamSubs.find(s => s.githubUrl || s.repoUrl)?.githubUrl || '';
            const demoUrlFromSubs = teamSubs.find(s => s.liveDemoUrl || s.demoUrl)?.liveDemoUrl || '';

            return {
              ...existing,
              id: match.id || existing.id,
              teamId: match.teamId || existing.teamId,
              teamNo: match.teamNo || existing.teamNo,
              teamNumber: teamNum,
              projectTitle: match.projectTitle !== undefined ? match.projectTitle : existing.projectTitle,
              status: match.status || existing.status,
              progress: match.progress !== undefined ? match.progress : existing.progress,
              batch: match.batch || existing.batch,
              classSection: match.classSection || existing.classSection || '',
              section: match.classSection || existing.section || '',
              guideName: match.guideName || existing.guideName,
              guide: match.guideName || existing.guide,
              advisorName: match.advisorName || existing.advisorName || '',
              advisor: match.advisorName || existing.advisor || '',
              isTitleApproved: isApproved,
              guideApprovalStatus: match.guideApprovalStatus || existing.guideApprovalStatus || 'Pending',
              titleStatus: match.guideApprovalStatus || existing.titleStatus || 'Pending',
              teamLeader: match.teamLeader !== undefined ? match.teamLeader : (existing.teamLeader || ''),
              leaderRollNo: match.leaderRollNo !== undefined ? match.leaderRollNo : (existing.leaderRollNo || ''),
              members: (Array.isArray(match.members) && match.members.length > 0)
                ? match.members
                : ((existing.members && existing.members.length > 0) ? existing.members : (INITIAL_TEAMS.find(it => it.teamId === existing.teamId || it.teamNo === existing.teamNo)?.members || [])),
              memberCount: match.memberCount !== undefined && match.memberCount > 0 ? match.memberCount : (existing.members?.length ?? existing.memberCount),
              membersCount: match.memberCount !== undefined && match.memberCount > 0 ? match.memberCount : (existing.members?.length ?? existing.membersCount),
              githubUrl: existing.githubUrl || repoUrlFromSubs,
              liveDemoUrl: existing.liveDemoUrl || demoUrlFromSubs,
              submissions: teamSubs,
            };
          });

          teamsData.forEach(b => {
            const exists = updated.some(
              e => e.teamId === b.teamId || e.id === b.id
            );
            if (!exists) {
              const initialMatch = INITIAL_TEAMS.find(it => it.teamId === b.teamId || it.teamNo === b.teamNo);
              const membersToUse = (Array.isArray(b.members) && b.members.length > 0)
                ? b.members
                : (initialMatch?.members || []);

              const teamNum = b.teamNumber !== undefined
                ? b.teamNumber
                : (parseInt(String(b.teamNo || '').replace(/\D/g, ''), 10) || initialMatch?.teamNumber || 1);
              const isApproved = Boolean(b.isTitleApproved);
              const teamSubs = getTeamSubmissions(b, []);
              const repoUrlFromSubs = teamSubs.find(s => s.githubUrl || s.repoUrl)?.githubUrl || '';
              const demoUrlFromSubs = teamSubs.find(s => s.liveDemoUrl || s.demoUrl)?.liveDemoUrl || '';

              updated.push({
                id: b.id,
                teamId: b.teamId,
                teamNo: b.teamNo,
                teamNumber: teamNum,
                projectTitle: b.projectTitle || initialMatch?.projectTitle || '',
                status: b.status || 'In Progress',
                progress: b.progress || 0,
                batch: b.batch || initialMatch?.batch || '',
                classSection: b.classSection || initialMatch?.classSection || '',
                section: b.classSection || initialMatch?.section || '',
                guideName: b.guideName || initialMatch?.guide || '',
                guide: b.guideName || initialMatch?.guide || '',
                advisorName: b.advisorName || initialMatch?.advisor || '',
                advisor: b.advisorName || initialMatch?.advisor || '',
                isTitleApproved: isApproved,
                guideApprovalStatus: b.guideApprovalStatus || 'Pending',
                titleStatus: b.guideApprovalStatus || 'Pending',
                teamLeader: b.teamLeader || initialMatch?.teamLeader || '',
                leaderRollNo: b.leaderRollNo || initialMatch?.leaderRollNo || '',
                memberCount: b.memberCount || membersToUse.length,
                membersCount: b.memberCount || membersToUse.length,
                members: membersToUse,
                githubUrl: b.githubUrl || repoUrlFromSubs,
                liveDemoUrl: b.liveDemoUrl || demoUrlFromSubs,
                submissions: teamSubs,
              });
            }
          });

          return updated;
        });
      } else if (hasBackendSubs) {
        setAllTeams(prevTeams =>
          prevTeams.map(existing => ({
            ...existing,
            submissions: getTeamSubmissions(existing, existing.submissions || []),
          }))
        );
      }
    } catch (err) {
      console.warn('[GuideContext] Failed to load dashboard/teams from API, using fallback data:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const [activities, setActivities] = useState(() => {
    try {
      const stored = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Error loading activities from localStorage:', e);
    }
    return [];
  });

  const [toasts, setToasts] = useState([]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(allTeams));
    } catch (e) {
      console.error('Failed to persist teams:', e);
    }
  }, [allTeams]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(activities));
    } catch (e) {
      console.error('Failed to persist activities:', e);
    }
  }, [activities]);


  // Real-time synchronization listener
  const reloadFromStorage = useCallback(() => {
    if (backendSubmissionsLoadedRef.current) {
      fetchDashboard();
      return;
    }
    try {
      const stored = localStorage.getItem(TEAMS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setAllTeams(sanitizeAndSyncGuideTeams(parsed));
          return;
        }
      }
      setAllTeams(sanitizeAndSyncGuideTeams(INITIAL_TEAMS));
    } catch (e) {
      console.error('Error reloading teams from storage:', e);
    }
  }, [fetchDashboard]);

  useEffect(() => {
    window.addEventListener('siet_data_updated', reloadFromStorage);
    window.addEventListener('storage', reloadFromStorage);
    return () => {
      window.removeEventListener('siet_data_updated', reloadFromStorage);
      window.removeEventListener('storage', reloadFromStorage);
    };
  }, [reloadFromStorage]);

  const showToast = (message, type = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // 1. Approve Title
  const approveTitle = (teamId) => {
    const today = new Date().toISOString().split('T')[0];
    let updatedTeam = null;

    setAllTeams(prevTeams => {
      const nextTeams = prevTeams.map(team => {
        if (isTargetTeam(team, teamId)) {
          let updatedSubmissions = (team.submissions || []).map(s => {
            if (s.weekNumber === 1 || s.week === 1 || s.submissionNumber === 1) {
              return {
                ...s,
                evaluationStatus: 'Approved',
                submissionStatus: 'Approved',
                status: 'Approved',
                isLocked: true
              };
            }
            return s;
          });

          // Ensure Week 1 submission exists if proposal has details
          const hasWeek1 = updatedSubmissions.some(s => s.weekNumber === 1 || s.week === 1);
          if (!hasWeek1 && (team.projectTitle || team.problemStatement || team.proposedSolution || team.abstract)) {
            updatedSubmissions.unshift({
              weekNumber: 1,
              week: 1,
              title: 'Project Initiation & Title Proposal',
              dueDate: 'Week 1',
              status: 'Approved',
              evaluationStatus: 'Approved',
              submissionStatus: 'Approved',
              submissionDate: today,
              score: team.guideScore || 90,
              maxScore: 100,
              guideRemarks: team.guideFeedback || 'Approved project proposal.',
              guideName: team.guide || guideName,
              presentationFileName: team.presentationFileName || '',
              reportUrl: team.reportUrl || '',
              problemStatement: team.problemStatement || '',
              proposedSolution: team.proposedSolution || '',
              abstractSummary: team.abstract || team.projectDescription || '',
              technologiesUsed: Array.isArray(team.technologiesUsed) ? team.technologiesUsed : [],
              githubUrl: team.githubUrl || '',
              liveDemoUrl: team.liveDemoUrl || '',
              isLocked: true
            });
          }

          updatedTeam = {
            ...team,
            titleStatus: 'Approved',
            titleLocked: true,
            titleApprovedDate: today,
            rejectionReason: '',
            latestSubmissionStatus: 'Title Approved – Ready for Weekly Sprints',
            submissions: updatedSubmissions
          };
          return updatedTeam;
        }
        return team;
      });

      try {
        localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(nextTeams));
      } catch (e) {}

      return nextTeams;
    });

    if (updatedTeam) {
      // Synchronize to AdvisorService storage
      try {
        const section = updatedTeam.section || 'CSE-B';
        const advisorKey = `siet_advisor_teams_${section}`;
        const advStored = localStorage.getItem(advisorKey);
        if (advStored) {
          const advTeams = JSON.parse(advStored);
          if (Array.isArray(advTeams)) {
            const tNum = updatedTeam.teamNumber;
            const targetAdvTeam = advTeams.find(t => 
              t.teamId === updatedTeam.teamId || 
              t.teamNo === updatedTeam.teamNo || 
              (tNum && parseInt(String(t.teamNo || t.teamId).replace(/\D/g, ''), 10) === tNum)
            );
            if (targetAdvTeam) {
              if (updatedTeam.projectTitle) {
                targetAdvTeam.title = updatedTeam.projectTitle;
              }
              targetAdvTeam.status = 'Approved';
              if (updatedTeam.guide) {
                targetAdvTeam.guide = updatedTeam.guide;
              }
              localStorage.setItem(advisorKey, JSON.stringify(advTeams));
            }
          }
        }
      } catch (e) {
        console.error('Error syncing approved team to advisor storage:', e);
      }

      // Synchronize to StudentService
      if (isStudentPortalTeam(updatedTeam)) {
        try {
          const studentTeam = StudentService.getTeam();
          studentTeam.isTitleApproved = true;
          studentTeam.guideApprovalStatus = 'Approved';
          studentTeam.rejectionReason = '';
          if (updatedTeam.projectTitle) {
            studentTeam.projectTitle = updatedTeam.projectTitle;
            studentTeam.submittedTitle = updatedTeam.projectTitle;
          }
          StudentService.saveTeam(studentTeam);

          // Update student weekly submission 1 to Approved
          const studentSubs = StudentService.getSubmissions();
          const updatedSubs = studentSubs.map(s => (s.week === 1 ? {
            ...s,
            status: 'Approved'
          } : s));
          StudentService.saveSubmissions(updatedSubs);

          // Update Submission 1 deliverable
          const targetTeamId = updatedTeam.teamId || updatedTeam.id || updatedTeam.teamNo;
          const d1 = StudentService.getDeliverables('Submission 1', targetTeamId);
          d1.isTitleApproved = true;
          if (updatedTeam.projectTitle) d1.projectTitle = updatedTeam.projectTitle;
          const dKey = StudentService.getDeliverableKey('Submission 1', targetTeamId);
          if (dKey) {
            try {
              localStorage.setItem(dKey, JSON.stringify(d1));
            } catch (e) {}
          }
        } catch (e) {
          console.error('Error synchronizing title approval:', e);
        }
      }

      // Call backend API if possible
      ApiClient.getGuideTeams().then(bTeams => {
        const t = bTeams.find(x => x.teamId === updatedTeam.teamId || x.teamNo === updatedTeam.teamNo || x.id === updatedTeam.id);
        if (t && t.id) {
          ApiClient.approveProjectTitle(t.id, updatedTeam.projectTitle).catch(() => {});
        }
      }).catch(() => {});

      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Title Approved: Team #${updatedTeam.teamNumber}`,
        details: `Approved "${updatedTeam.projectTitle}". Team roster & scope are now locked.`,
        time: 'Just now',
        type: 'approve'
      };
      setActivities(prev => [newActivity, ...prev]);

      try {
        AdvisorHistoryService.addGuideLog(
          'Project Approval',
          `Team #${updatedTeam.teamNumber} (${updatedTeam.projectTitle || 'Project Title'})`,
          `Approved project proposal. Status updated to Approved. Scope locked.`,
          guideName,
          updatedTeam.section || 'CSE-B'
        );
      } catch (e) {}

      window.dispatchEvent(new Event('siet_data_updated'));
      showToast(`Team #${updatedTeam.teamNumber} title approved and scope locked.`, 'success');
    }
  };

  // 2. Reject Title
  const rejectTitle = (teamId, reason) => {
    if (!reason || !reason.trim()) {
      showToast('Rejection reason is mandatory.', 'error');
      return false;
    }

    let updatedTeam = null;
    setAllTeams(prevTeams =>
      prevTeams.map(team => {
        if (isTargetTeam(team, teamId)) {
          updatedTeam = {
            ...team,
            titleStatus: 'Rejected',
            titleLocked: false,
            titleApprovedDate: null,
            rejectionReason: reason.trim(),
            latestSubmissionStatus: 'Title Rejected – Awaiting Resubmission'
          };
          return updatedTeam;
        }
        return team;
      })
    );

    if (updatedTeam) {
      // Synchronize to StudentService
      if (isStudentPortalTeam(updatedTeam)) {
        try {
          const studentTeam = StudentService.getTeam();
          studentTeam.isTitleApproved = false;
          studentTeam.guideApprovalStatus = 'Rejected';
          studentTeam.rejectionReason = reason.trim();
          StudentService.saveTeam(studentTeam);

          const targetTeamId = updatedTeam.teamId || updatedTeam.id || updatedTeam.teamNo;
          const d1 = StudentService.getDeliverables('Submission 1', targetTeamId);
          d1.isTitleApproved = false;
          d1.submittedFields.title = false;
          const dKey = StudentService.getDeliverableKey('Submission 1', targetTeamId);
          if (dKey) {
            try {
              localStorage.setItem(dKey, JSON.stringify(d1));
            } catch (e) {}
          }
        } catch (e) {
          console.error('Error synchronizing title rejection:', e);
        }
      }

      // Call backend API
      ApiClient.getGuideTeams().then(bTeams => {
        const t = bTeams.find(x => x.teamId === updatedTeam.teamId || x.teamNo === updatedTeam.teamNo || x.id === updatedTeam.id);
        if (t && t.id) {
          ApiClient.rejectProjectTitle(t.id, reason.trim()).catch(() => {});
        }
      }).catch(() => {});

      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Title Rejected: Team #${updatedTeam.teamNumber}`,
        details: `Status: Rejected - Reason: ${reason.trim()}`,
        time: 'Just now',
        type: 'reject'
      };
      setActivities(prev => [newActivity, ...prev]);

      try {
        AdvisorHistoryService.addGuideLog(
          'Project Approval',
          `Team #${updatedTeam.teamNumber} (${updatedTeam.projectTitle || 'Project Title'})`,
          `Rejected project proposal. Status updated to Rejected. Mandated revision: "${reason.trim()}".`,
          guideName,
          updatedTeam.section || 'CSE-B'
        );
      } catch (e) {}

      window.dispatchEvent(new Event('siet_data_updated'));
      showToast(`Feedback sent. Team #${updatedTeam.teamNumber} instructed to revise title.`, 'warning');
      return true;
    }
    return false;
  };

  // 3. Evaluate Weekly Submission
  const evaluateWeeklySubmission = async (teamId, weekNumber, remarks, score, memberMarks) => {
    const today = new Date().toISOString().split('T')[0];
    const weekNum = Number(weekNumber);
    const subNum = weekNum;

    // Calculate score
    const markVals = Object.values(memberMarks || {}).map(Number).filter(v => !isNaN(v));
    const calculatedAvg = markVals.length > 0 
      ? Math.round((markVals.reduce((a, b) => a + b, 0) / markVals.length) * 10) / 10 
      : (score !== undefined && score !== null ? Number(score) : 0);

    let updatedTeam = null;

    const nextTeams = allTeams.map(team => {
      if (isTargetTeam(team, teamId) || team.teamId === teamId || team.id === teamId) {
        let matched = false;
        const updatedSubmissions = (team.submissions || []).map(sub => {
          const isMatch = sub.weekNumber === weekNum || 
                          sub.week === weekNum || 
                          sub.submissionNumber === weekNum;
          if (isMatch) {
            matched = true;
            return {
              ...sub,
              evaluationStatus: 'Approved',
              status: 'Approved',
              submissionStatus: 'Approved',
              isLocked: true,
              evaluatedDate: today,
              score: calculatedAvg,
              memberMarks: memberMarks || sub.memberMarks || {},
              guideRemarks: remarks || 'Endorsed. Satisfactory technical milestone deliverables.'
            };
          }
          return sub;
        });

        if (!matched) {
          updatedSubmissions.push({
            weekNumber: weekNum,
            submissionNumber: weekNum,
            title: `Submission ${weekNum}`,
            evaluationStatus: 'Approved',
            status: 'Approved',
            submissionStatus: 'Approved',
            isLocked: true,
            evaluatedDate: today,
            score: calculatedAvg,
            memberMarks: memberMarks || {},
            guideRemarks: remarks || 'Endorsed. Satisfactory technical milestone deliverables.'
          });
        }

        updatedTeam = {
          ...team,
          submissions: updatedSubmissions,
          latestSubmissionStatus: `Week ${weekNum} Evaluated & Endorsed`,
          ...(weekNum === 1 ? { isTitleApproved: true, titleStatus: 'Approved', guideApprovalStatus: 'Approved' } : {})
        };
        return updatedTeam;
      }
      return team;
    });

    setAllTeams(nextTeams);
    try {
      localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(nextTeams));
    } catch (e) {
      console.error('Failed to persist teams in evaluateWeeklySubmission:', e);
    }

    if (updatedTeam) {
      // 1. Synchronize to StudentService (only for student portal team)
      if (isStudentPortalTeam(updatedTeam)) {
        try {
          const studentSubs = StudentService.getSubmissions() || [];
          let item = studentSubs.find(s => s.week === weekNum);
          if (item) {
            item.status = 'Approved';
            item.comments = remarks || 'Endorsed. Satisfactory technical milestone deliverables.';
            item.guideReviewDate = today;
            item.score = calculatedAvg;
          } else {
            studentSubs.push({
              week: weekNum,
              title: `Submission ${weekNum} Deliverable Submission`,
              dueDate: `Submission ${weekNum}`,
              status: 'Approved',
              score: calculatedAvg,
              comments: remarks || 'Endorsed. Satisfactory technical milestone deliverables.',
              submissionDate: today,
              guideReviewDate: today
            });
          }
          StudentService.saveSubmissions(studentSubs);

          if (weekNum === 1) {
            StudentService.updateApprovalStatus('Approved');
          }
        } catch (e) {
          console.error('Error synchronizing evaluation to StudentService:', e);
        }
      }

      // 2. Synchronize to MarksService (saves marks for weekNum and persists to backend via ApiClient.saveWeeklyMarks)
      try {
        if (memberMarks && Object.keys(memberMarks).length > 0) {
          MarksService.saveWeeklyMarks(teamId, weekNum, memberMarks, remarks, guideName);
        }
      } catch (e) {
        console.error('Error saving marks in MarksService:', e);
      }

      // 3. Persist review status to Backend API for all teams
      try {
        await ApiClient.reviewTeamWeeklySubmission(
          teamId,
          weekNum,
          'APPROVED',
          remarks || 'Endorsed. Satisfactory technical milestone deliverables.',
          calculatedAvg,
          memberMarks,
          guideName
        ).catch(async (err) => {
          console.warn('[GuideContext] reviewTeamWeeklySubmission failed, trying submission ID lookup:', err);
          const pSubs = await ApiClient.getGuidePendingSubmissions().catch(() => []);
          const match = pSubs.find(x => 
            (x.teamId === teamId || x.teamNo === updatedTeam.teamNo) &&
            (x.weekNumber === weekNum || x.week === weekNum)
          );
          if (match && (match.id || match.submissionId)) {
            return ApiClient.reviewWeeklySubmission(
              match.id || match.submissionId,
              'APPROVED',
              remarks,
              calculatedAvg,
              memberMarks,
              guideName
            );
          }
        });
      } catch (e) {
        console.error('Error calling backend review:', e);
      }

      // 4. Activity Log and Notifications
      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Week ${weekNum} Approved: Team #${updatedTeam.teamNumber}`,
        details: `Status: Approved - Remarks: ${remarks || 'Deliverables verified and accepted.'}`,
        time: 'Just now',
        type: 'evaluate'
      };
      setActivities(prev => [newActivity, ...prev]);

      try {
        AdvisorHistoryService.addGuideLog(
          'Milestone Review',
          `Team #${updatedTeam.teamNumber} - Milestone Week ${weekNum}`,
          `Approved Week ${weekNum} deliverables. Status updated to Approved. Remarks: "${remarks || 'Satisfactory'}".`,
          guideName,
          updatedTeam.section || 'CSE-B'
        );
      } catch (e) {}

      window.dispatchEvent(new Event('siet_data_updated'));
      showToast(`Week ${weekNum} deliverables for Team #${updatedTeam.teamNumber} evaluated and locked.`, 'success');
      return true;
    }
    return false;
  };

  // 4. Request Weekly Revision
  const requestWeeklyRevision = (teamId, weekNumber, reason) => {
    if (!reason || !reason.trim()) {
      showToast('Revision reason is mandatory.', 'error');
      return false;
    }

    let updatedTeam = null;
    setAllTeams(prevTeams =>
      prevTeams.map(team => {
        if (isTargetTeam(team, teamId)) {
          const updatedSubmissions = (team.submissions || []).map(sub => {
            if (sub.weekNumber === Number(weekNumber)) {
              return {
                ...sub,
                evaluationStatus: 'Revision Required',
                isLocked: false,
                guideRemarks: reason.trim()
              };
            }
            return sub;
          });

          updatedTeam = {
            ...team,
            submissions: updatedSubmissions,
            latestSubmissionStatus: `Week ${weekNumber} Revision Required`
          };
          return updatedTeam;
        }
        return team;
      })
    );

    if (updatedTeam) {
      // Synchronize to StudentService if this is the active student team
      if (isStudentPortalTeam(updatedTeam)) {
        try {
          const studentSubs = StudentService.getSubmissions();
          const item = studentSubs.find(s => s.week === Number(weekNumber));
          if (item) {
            item.status = 'Changes Requested';
            item.comments = reason.trim();
            StudentService.saveSubmissions(studentSubs);
          }
        } catch (e) {
          console.error('Error synchronizing revision request:', e);
        }
      }

      // Call backend review endpoint for all teams
      ApiClient.getGuidePendingSubmissions().then(pSubs => {
        const match = pSubs.find(x => 
          Number(x.weekNumber || x.week) === Number(weekNumber) &&
          (x.teamId === updatedTeam.teamId || x.team_id === updatedTeam.id || x.teamNo === updatedTeam.teamNo || x.teamId === updatedTeam.id)
        );
        if (match && (match.id || match.submissionId)) {
          ApiClient.reviewWeeklySubmission(match.id || match.submissionId, 'REVISION_REQUESTED', reason.trim()).catch(() => {});
        }
      }).catch(() => {});

      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Week ${weekNumber} Needs Revision: Team #${updatedTeam.teamNumber}`,
        details: `Status: Needs Revision - Reason: ${reason.trim()}`,
        time: 'Just now',
        type: 'reject'
      };
      setActivities(prev => [newActivity, ...prev]);

      try {
        AdvisorHistoryService.addGuideLog(
          'Milestone Review',
          `Team #${updatedTeam.teamNumber} - Milestone Week ${weekNumber}`,
          `Requested revision for Week ${weekNumber}. Status updated to Needs Revision. Reason: "${reason.trim()}".`,
          guideName,
          updatedTeam.section || 'CSE-B'
        );
      } catch (e) {}

      window.dispatchEvent(new Event('siet_data_updated'));
      showToast(`Revision requested for Week ${weekNumber} (Team #${updatedTeam.teamNumber}).`, 'warning');
      return true;
    }
    return false;
  };

  // 5. Reject Weekly Submission
  const rejectWeeklySubmission = (teamId, weekNumber, reason) => {
    if (!reason || !reason.trim()) {
      showToast('Rejection reason is mandatory.', 'error');
      return false;
    }

    let updatedTeam = null;
    setAllTeams(prevTeams =>
      prevTeams.map(team => {
        if (isTargetTeam(team, teamId)) {
          const updatedSubmissions = (team.submissions || []).map(sub => {
            if (sub.weekNumber === Number(weekNumber)) {
              return {
                ...sub,
                evaluationStatus: 'Rejected',
                status: 'Rejected',
                isLocked: false,
                guideRemarks: reason.trim()
              };
            }
            return sub;
          });

          updatedTeam = {
            ...team,
            submissions: updatedSubmissions,
            latestSubmissionStatus: `Week ${weekNumber} Rejected`
          };
          return updatedTeam;
        }
        return team;
      })
    );

    if (updatedTeam) {
      // Synchronize to StudentService if this is the active student team
      if (isStudentPortalTeam(updatedTeam)) {
        try {
          const studentSubs = StudentService.getSubmissions();
          const item = studentSubs.find(s => s.week === Number(weekNumber));
          if (item) {
            item.status = 'Rejected';
            item.comments = reason.trim();
            StudentService.saveSubmissions(studentSubs);
          }
        } catch (e) {
          console.error('Error synchronizing rejection:', e);
        }
      }

      // Call backend review endpoint for all teams
      ApiClient.getGuidePendingSubmissions().then(pSubs => {
        const match = pSubs.find(x => 
          Number(x.weekNumber || x.week) === Number(weekNumber) &&
          (x.teamId === updatedTeam.teamId || x.team_id === updatedTeam.id || x.teamNo === updatedTeam.teamNo || x.teamId === updatedTeam.id)
        );
        if (match && (match.id || match.submissionId)) {
          ApiClient.reviewWeeklySubmission(match.id || match.submissionId, 'REJECTED', reason.trim()).catch(() => {});
        }
      }).catch(() => {});

      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Week ${weekNumber} Rejected: Team #${updatedTeam.teamNumber}`,
        details: `Status: Rejected - Reason: ${reason.trim()}`,
        time: 'Just now',
        type: 'reject'
      };
      setActivities(prev => [newActivity, ...prev]);

      try {
        AdvisorHistoryService.addGuideLog(
          'Milestone Review',
          `Team #${updatedTeam.teamNumber} - Milestone Week ${weekNumber}`,
          `Rejected Week ${weekNumber} submission. Reason: "${reason.trim()}".`,
          guideName,
          updatedTeam.section || 'CSE-B'
        );
      } catch (e) {}

      window.dispatchEvent(new Event('siet_data_updated'));
      showToast(`Submission rejected for Week ${weekNumber} (Team #${updatedTeam.teamNumber}).`, 'error');
      return true;
    }
    return false;
  };

  // 6. Notify Team
  const notifyTeam = (teamId, { comment, timing, location, weekNumber }) => {
    const formattedDate = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const targetWeek = (weekNumber !== undefined && weekNumber !== null) ? Number(weekNumber) : StudentService.getCurrentAcademicWeek();

    let updatedTeam = null;
    setAllTeams(prevTeams =>
      prevTeams.map(team => {
        if (isTargetTeam(team, teamId)) {
          const notificationEntry = {
            timing: timing || 'Today at 3:00 PM',
            location: location || 'Faculty Cabin 204',
            comment: comment || 'Report for project review consultation.',
            date: formattedDate,
            weekNumber: targetWeek
          };

          // Attach notice to target week in team.submissions
          const currentSubs = Array.isArray(team.submissions) ? [...team.submissions] : [];
          let targetSub = currentSubs.find(s => s.weekNumber === targetWeek);
          if (targetSub) {
            targetSub.guideNotice = notificationEntry;
          } else {
            currentSubs.push({
              weekNumber: targetWeek,
              title: `Week ${targetWeek} Deliverables & Scope`,
              submissionDate: new Date().toISOString().split('T')[0],
              submissionStatus: 'Consultation Notice Dispatched',
              evaluationStatus: 'Pending',
              isLocked: false,
              guideNotice: notificationEntry,
              guideRemarks: comment || 'Report for consultation.'
            });
          }

          updatedTeam = {
            ...team,
            isNotified: true,
            notifiedTiming: timing || 'Today at 3:00 PM',
            notifiedLocation: location || 'Faculty Cabin 204',
            notifiedComment: comment || 'Report for project review consultation.',
            notifiedAt: formattedDate,
            notificationHistory: [notificationEntry, ...(team.notificationHistory || [])],
            submissions: currentSubs
          };
          return updatedTeam;
        }
        return team;
      })
    );

    if (updatedTeam) {
      // Synchronize directly into StudentService for that respective week!
      if (isStudentPortalTeam(updatedTeam)) {
        try {
          StudentService.attachGuideNotice(targetWeek, {
            timing: timing || 'Today at 3:00 PM',
            location: location || 'Faculty Cabin 204',
            comment: comment || 'Report for project review consultation.',
            date: formattedDate,
            weekNumber: targetWeek
          });
        } catch (e) {
          console.error('Error synchronizing notice to student service:', e);
        }
      }

      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Notice Dispatched: Team #${updatedTeam.teamNumber} (Week ${targetWeek})`,
        details: `Meeting scheduled for ${timing || 'Today at 3:00 PM'} at ${location || 'Faculty Cabin 204'}.`,
        time: 'Just now',
        type: 'notify'
      };
      setActivities(prev => [newActivity, ...prev]);

      try {
        AdvisorHistoryService.addGuideLog(
          'Notice Dispatched',
          `Team #${updatedTeam.teamNumber} - Week ${targetWeek}`,
          `Dispatched consultation notice for Week ${targetWeek}: "${comment || 'Consultation scheduled'}". Meeting: ${timing} at ${location}.`,
          guideName,
          updatedTeam.section || 'CSE-B'
        );
      } catch (e) {}

      window.dispatchEvent(new Event('siet_data_updated'));
      showToast(`Team #${updatedTeam.teamNumber} notified for Week ${targetWeek} consultation (${timing}).`, 'info');
      return true;
    }
    return false;
  };

  // Reset to default seed
  const resetData = () => {
    setAllTeams(INITIAL_TEAMS);
    localStorage.removeItem(TEAMS_STORAGE_KEY);
    localStorage.removeItem(ACTIVITIES_STORAGE_KEY);
    showToast('Guide Portal reset to initial state.', 'info');
  };

  // Computed Stats for assigned teams only
  const stats = useMemo(() => {
    const localAssignedTeamsCount = assignedTeams.length;
    const localPendingTitleApprovalsCount = assignedTeams.filter(t => t.titleStatus === 'Pending' && hasAnyDetailSubmitted(t)).length;
    const localApprovedTitlesCount = assignedTeams.filter(t => t.titleStatus === 'Approved').length;
    const rejectedTitlesCount = assignedTeams.filter(t => t.titleStatus === 'Rejected').length;
    const notifiedCount = assignedTeams.filter(t => t.isNotified).length;

    let localTotalSubmissionsCount = 0;
    let localPendingWeeklySubmissionsCount = 0;
    let evaluatedSubmissionsCount = 0;
    let revisionRequiredCount = 0;

    assignedTeams.forEach(t => {
      (t.submissions || []).forEach(sub => {
        localTotalSubmissionsCount += 1;
        if (sub.evaluationStatus === 'Pending') localPendingWeeklySubmissionsCount += 1;
        if (sub.evaluationStatus === 'Evaluated') evaluatedSubmissionsCount += 1;
        if (sub.evaluationStatus === 'Revision Required') revisionRequiredCount += 1;
      });
    });

    return {
      assignedTeamsCount: backendMetrics?.totalTeams !== undefined ? backendMetrics.totalTeams : localAssignedTeamsCount,
      pendingTitleApprovalsCount: backendMetrics?.pendingTitles !== undefined ? backendMetrics.pendingTitles : localPendingTitleApprovalsCount,
      approvedTitlesCount: backendMetrics?.approvedTitles !== undefined ? backendMetrics.approvedTitles : localApprovedTitlesCount,
      rejectedTitlesCount,
      notifiedCount,
      totalSubmissionsCount: backendMetrics?.totalSubmissions !== undefined ? backendMetrics.totalSubmissions : localTotalSubmissionsCount,
      pendingWeeklySubmissionsCount: backendMetrics?.pendingReviews !== undefined ? backendMetrics.pendingReviews : localPendingWeeklySubmissionsCount,
      evaluatedSubmissionsCount,
      revisionRequiredCount
    };
  }, [assignedTeams, backendMetrics]);

  return (
    <GuideContext.Provider
      value={{
        facultyProfile: dynamicProfile,
        teams: assignedTeams,
        activities,
        stats,
        toasts,
        showToast,
        removeToast,
        approveTitle,
        rejectTitle,
        evaluateWeeklySubmission,
        requestWeeklyRevision,
        rejectWeeklySubmission,
        notifyTeam,
        resetData,
        refreshDashboard: fetchDashboard
      }}
    >
      {children}
    </GuideContext.Provider>
  );
};

export const useGuide = () => {
  const context = useContext(GuideContext);
  if (!context) {
    throw new Error('useGuide must be used within a GuideProvider');
  }
  return context;
};

export default GuideContext;
