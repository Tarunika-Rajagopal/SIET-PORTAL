import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { INITIAL_TEAMS, FACULTY_PROFILE } from '../data/guidePortalData';
import { AuthService, getUserInitials } from '../services/authService';
import { AdvisorHistoryService } from '../services/advisorHistoryService';
import { StudentService } from '../services/studentService';
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
  const isStudentPortalTeam = (team) => team?.teamId === 'TEAM-CSE-Y3-B04' || team?.teamNumber === 4;

  // Filter so guide only sees teams assigned to them (or single student team)
  const assignedTeams = useMemo(() => {
    if (!guideName) return allTeams;
    const target = normalizeName(guideName);
    const filtered = allTeams.filter(t => {
      const g = normalizeName(t.guide || '');
      return g.includes(target) || target.includes(g);
    });
    return filtered.length > 0 ? filtered : allTeams;
  }, [allTeams, guideName]);

  const dynamicProfile = useMemo(() => ({
    ...FACULTY_PROFILE,
    name: guideName,
    initials: getUserInitials(guideName),
    assignedTeamsCount: assignedTeams.length
  }), [guideName, assignedTeams.length]);

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
  }, []);

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
            if (s.weekNumber === 0 || s.week === 0 || s.submissionNumber === 1) {
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

          // Ensure Week 0 submission exists if proposal has details
          const hasWeek0 = updatedSubmissions.some(s => s.weekNumber === 0 || s.week === 0);
          if (!hasWeek0 && (team.projectTitle || team.problemStatement || team.proposedSolution || team.abstract)) {
            updatedSubmissions.unshift({
              weekNumber: 0,
              week: 0,
              title: 'Project Initiation & Title Proposal',
              dueDate: 'Week 0',
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

          // Update student weekly submission 1 (week 0) to Approved
          const studentSubs = StudentService.getSubmissions();
          const updatedSubs = studentSubs.map(s => (s.week === 0 ? {
            ...s,
            status: 'Approved'
          } : s));
          StudentService.saveSubmissions(updatedSubs);

          // Update Week 0 deliverable
          const d0 = StudentService.getDeliverables('Week 0');
          d0.isTitleApproved = true;
          if (updatedTeam.projectTitle) d0.projectTitle = updatedTeam.projectTitle;
          localStorage.setItem('siet_deliverable_v6_week_0', JSON.stringify(d0));

          // Call backend API if possible
          ApiClient.getGuideTeams().then(bTeams => {
            const t = bTeams.find(x => x.teamNo === 'Team 04');
            if (t && t.id) {
              ApiClient.approveProjectTitle(t.id, updatedTeam.projectTitle).catch(() => {});
            }
          }).catch(() => {});
        } catch (e) {
          console.error('Error synchronizing title approval:', e);
        }
      }

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

          const d0 = StudentService.getDeliverables('Week 0');
          d0.isTitleApproved = false;
          d0.submittedFields.title = false;
          localStorage.setItem('siet_deliverable_v6_week_0', JSON.stringify(d0));

          // Call backend API
          ApiClient.getGuideTeams().then(bTeams => {
            const t = bTeams.find(x => x.teamNo === 'Team 04');
            if (t && t.id) {
              ApiClient.rejectProjectTitle(t.id, reason.trim()).catch(() => {});
            }
          }).catch(() => {});
        } catch (e) {
          console.error('Error synchronizing title rejection:', e);
        }
      }

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
  const evaluateWeeklySubmission = (teamId, weekNumber, remarks) => {
    const today = new Date().toISOString().split('T')[0];
    let updatedTeam = null;

    setAllTeams(prevTeams =>
      prevTeams.map(team => {
        if (isTargetTeam(team, teamId)) {
          const updatedSubmissions = (team.submissions || []).map(sub => {
            const isMatch = sub.weekNumber === Number(weekNumber) || 
                            sub.week === Number(weekNumber) || 
                            sub.submissionNumber === Number(weekNumber) ||
                            (Number(weekNumber) > 0 && sub.submissionNumber === Number(weekNumber) + 1);
            if (isMatch) {
              return {
                ...sub,
                evaluationStatus: 'Approved',
                status: 'Approved',
                isLocked: true,
                evaluatedDate: today,
                guideRemarks: remarks || 'Endorsed. Satisfactory technical milestone deliverables.'
              };
            }
            return sub;
          });

          updatedTeam = {
            ...team,
            submissions: updatedSubmissions,
            latestSubmissionStatus: `Week ${weekNumber} Evaluated & Endorsed`
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
          const studentSubs = StudentService.getSubmissions();
          const targetWeek = Number(weekNumber) >= 1 && !studentSubs.some(s => s.week === Number(weekNumber)) 
            ? Number(weekNumber) - 1 
            : Number(weekNumber);
          const item = studentSubs.find(s => s.week === targetWeek || s.week === Number(weekNumber));
          if (item) {
            item.status = 'Approved';
            item.comments = remarks || 'Endorsed. Satisfactory technical milestone deliverables.';
            item.guideReviewDate = today;
            StudentService.saveSubmissions(studentSubs);
          }

          // Call backend review endpoint
          ApiClient.getGuidePendingSubmissions().then(pSubs => {
            const match = pSubs.find(x => x.weekNumber === Number(weekNumber));
            if (match && match.submissionId) {
              ApiClient.reviewWeeklySubmission(match.submissionId, 'APPROVED', remarks).catch(() => {});
            }
          }).catch(() => {});
        } catch (e) {
          console.error('Error synchronizing evaluation:', e);
        }
      }

      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Week ${weekNumber} Approved: Team #${updatedTeam.teamNumber}`,
        details: `Status: Approved - Remarks: ${remarks || 'Deliverables verified and accepted.'}`,
        time: 'Just now',
        type: 'evaluate'
      };
      setActivities(prev => [newActivity, ...prev]);

      try {
        AdvisorHistoryService.addGuideLog(
          'Milestone Review',
          `Team #${updatedTeam.teamNumber} - Milestone Week ${weekNumber}`,
          `Approved Week ${weekNumber} deliverables. Status updated to Approved. Remarks: "${remarks || 'Satisfactory'}".`,
          guideName,
          updatedTeam.section || 'CSE-B'
        );
      } catch (e) {}

      window.dispatchEvent(new Event('siet_data_updated'));
      showToast(`Week ${weekNumber} deliverables for Team #${updatedTeam.teamNumber} evaluated and locked.`, 'success');
    }
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
      // Synchronize to StudentService
      if (isStudentPortalTeam(updatedTeam)) {
        try {
          const studentSubs = StudentService.getSubmissions();
          const item = studentSubs.find(s => s.week === Number(weekNumber));
          if (item) {
            item.status = 'Changes Requested';
            item.comments = reason.trim();
            StudentService.saveSubmissions(studentSubs);
          }

          // Call backend review endpoint
          ApiClient.getGuidePendingSubmissions().then(pSubs => {
            const match = pSubs.find(x => x.weekNumber === Number(weekNumber));
            if (match && match.submissionId) {
              ApiClient.reviewWeeklySubmission(match.submissionId, 'REVISION_REQUESTED', reason.trim()).catch(() => {});
            }
          }).catch(() => {});
        } catch (e) {
          console.error('Error synchronizing revision request:', e);
        }
      }

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
    const assignedTeamsCount = assignedTeams.length;
    const pendingTitleApprovalsCount = assignedTeams.filter(t => t.titleStatus === 'Pending' && hasAnyDetailSubmitted(t)).length;
    const approvedTitlesCount = assignedTeams.filter(t => t.titleStatus === 'Approved').length;
    const rejectedTitlesCount = assignedTeams.filter(t => t.titleStatus === 'Rejected').length;
    const notifiedCount = assignedTeams.filter(t => t.isNotified).length;

    let totalSubmissionsCount = 0;
    let pendingWeeklySubmissionsCount = 0;
    let evaluatedSubmissionsCount = 0;
    let revisionRequiredCount = 0;

    assignedTeams.forEach(t => {
      (t.submissions || []).forEach(sub => {
        totalSubmissionsCount += 1;
        if (sub.evaluationStatus === 'Pending') pendingWeeklySubmissionsCount += 1;
        if (sub.evaluationStatus === 'Evaluated') evaluatedSubmissionsCount += 1;
        if (sub.evaluationStatus === 'Revision Required') revisionRequiredCount += 1;
      });
    });

    return {
      assignedTeamsCount,
      pendingTitleApprovalsCount,
      approvedTitlesCount,
      rejectedTitlesCount,
      notifiedCount,
      totalSubmissionsCount,
      pendingWeeklySubmissionsCount,
      evaluatedSubmissionsCount,
      revisionRequiredCount
    };
  }, [assignedTeams]);

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
        resetData
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
