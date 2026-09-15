import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { INITIAL_TEAMS, FACULTY_PROFILE } from '../data/guidePortalData';
import { AuthService, getUserInitials } from '../services/authService';
import { AdvisorHistoryService } from '../services/advisorHistoryService';

const TEAMS_STORAGE_KEY = 'siet_guide_portal_teams_v2';
const ACTIVITIES_STORAGE_KEY = 'siet_guide_portal_activities_v2';

const GuideContext = createContext(null);

export const GuideProvider = ({ children }) => {
  const currentUser = AuthService.getCurrentUser();
  const guideName = currentUser?.role === 'guide' ? currentUser.name : (currentUser?.name || FACULTY_PROFILE.name);

  const [allTeams, setAllTeams] = useState(() => {
    try {
      const stored = localStorage.getItem(TEAMS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading teams from localStorage:', e);
    }
    return INITIAL_TEAMS;
  });

  const normalizeName = (n) => (n || '').toLowerCase().replace(/^(dr\.|mr\.|mrs\.|ms\.|prof\.)\s+/i, '').trim();

  // Filter so guide only sees teams assigned to them
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
    return [
      {
        id: 'act-1',
        title: 'Meeting Notice Dispatched',
        details: 'Notified Team #2 for raw camera benchmarking discussion at Cabin 204.',
        time: 'Today, 10:15 AM',
        type: 'notify'
      },
      {
        id: 'act-2',
        title: 'Title Endorsement',
        details: 'Approved project title for Team #4: Campus Service Management.',
        time: 'Yesterday, 3:45 PM',
        type: 'approve'
      }
    ];
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

    setAllTeams(prevTeams =>
      prevTeams.map(team => {
        if (team.teamId === teamId) {
          updatedTeam = {
            ...team,
            titleStatus: 'Approved',
            titleLocked: true,
            titleApprovedDate: today,
            rejectionReason: '',
            latestSubmissionStatus: 'Title Approved – Ready for Weekly Sprints'
          };
          return updatedTeam;
        }
        return team;
      })
    );

    if (updatedTeam) {
      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Title Approved: Team #${updatedTeam.teamNumber}`,
        details: `Approved "${updatedTeam.projectTitle}". Team roster & scope are now locked.`,
        time: 'Just now',
        type: 'approve'
      };
      setActivities(prev => [newActivity, ...prev]);

      try {
        AdvisorHistoryService.addLog(
          updatedTeam.section || 'CSE-B',
          'Project Approval',
          `Team #${updatedTeam.teamNumber} (${updatedTeam.projectTitle || 'Project Title'})`,
          `Approved project title. Status updated to Approved. Scope locked.`,
          guideName,
          'Faculty Guide'
        );
      } catch (e) {}

      showToast(`Team #${updatedTeam.teamNumber} title approved and scope permanently locked.`, 'success');
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
        if (team.teamId === teamId) {
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
      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Title Rejected: Team #${updatedTeam.teamNumber}`,
        details: `Status: Rejected - Reason: ${reason.trim()}`,
        time: 'Just now',
        type: 'reject'
      };
      setActivities(prev => [newActivity, ...prev]);

      try {
        AdvisorHistoryService.addLog(
          updatedTeam.section || 'CSE-B',
          'Project Approval',
          `Team #${updatedTeam.teamNumber} (${updatedTeam.projectTitle || 'Project Title'})`,
          `Rejected project title. Status updated to Rejected. Mandated revision: "${reason.trim()}".`,
          guideName,
          'Faculty Guide'
        );
      } catch (e) {}

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
        if (team.teamId === teamId) {
          const updatedSubmissions = (team.submissions || []).map(sub => {
            if (sub.weekNumber === Number(weekNumber)) {
              return {
                ...sub,
                evaluationStatus: 'Evaluated',
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
      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Week ${weekNumber} Approved: Team #${updatedTeam.teamNumber}`,
        details: `Status: Approved - Remarks: ${remarks || 'Deliverables verified and accepted.'}`,
        time: 'Just now',
        type: 'evaluate'
      };
      setActivities(prev => [newActivity, ...prev]);

      try {
        AdvisorHistoryService.addLog(
          updatedTeam.section || 'CSE-B',
          'Milestone Review',
          `Team #${updatedTeam.teamNumber} - Milestone Week ${weekNumber}`,
          `Approved Week ${weekNumber} deliverables. Status updated to Approved. Remarks: "${remarks || 'Satisfactory'}".`,
          guideName,
          'Faculty Guide'
        );
      } catch (e) {}

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
        if (team.teamId === teamId) {
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
      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Week ${weekNumber} Needs Revision: Team #${updatedTeam.teamNumber}`,
        details: `Status: Needs Revision - Reason: ${reason.trim()}`,
        time: 'Just now',
        type: 'reject'
      };
      setActivities(prev => [newActivity, ...prev]);

      try {
        AdvisorHistoryService.addLog(
          updatedTeam.section || 'CSE-B',
          'Milestone Review',
          `Team #${updatedTeam.teamNumber} - Milestone Week ${weekNumber}`,
          `Requested revision for Week ${weekNumber}. Status updated to Needs Revision. Reason: "${reason.trim()}".`,
          guideName,
          'Faculty Guide'
        );
      } catch (e) {}

      showToast(`Revision requested for Week ${weekNumber} (Team #${updatedTeam.teamNumber}).`, 'warning');
      return true;
    }
    return false;
  };

  // 5. Notify Team
  const notifyTeam = (teamId, { comment, timing, location }) => {
    const formattedDate = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    let updatedTeam = null;
    setAllTeams(prevTeams =>
      prevTeams.map(team => {
        if (team.teamId === teamId) {
          const notificationEntry = {
            timing: timing || 'Today at 3:00 PM',
            location: location || 'Faculty Cabin 204',
            comment: comment || 'Report for project review consultation.',
            date: formattedDate
          };

          updatedTeam = {
            ...team,
            isNotified: true,
            notifiedTiming: timing || 'Today at 3:00 PM',
            notifiedLocation: location || 'Faculty Cabin 204',
            notifiedComment: comment || 'Report for project review consultation.',
            notifiedAt: formattedDate,
            notificationHistory: [notificationEntry, ...(team.notificationHistory || [])]
          };
          return updatedTeam;
        }
        return team;
      })
    );

    if (updatedTeam) {
      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Notice Dispatched: Team #${updatedTeam.teamNumber}`,
        details: `Meeting scheduled for ${timing || 'Today at 3:00 PM'} at ${location || 'Faculty Cabin 204'}.`,
        time: 'Just now',
        type: 'notify'
      };
      setActivities(prev => [newActivity, ...prev]);

      try {
        AdvisorHistoryService.addLog(
          updatedTeam.section || 'CSE-B',
          'Milestone Review',
          `Team #${updatedTeam.teamNumber}`,
          `Dispatched meeting notice for ${timing || 'Today at 3:00 PM'} at ${location || 'Faculty Cabin 204'}: "${comment || 'Consultation'}".`,
          guideName,
          'Faculty Guide'
        );
      } catch (e) {}

      showToast(`Team #${updatedTeam.teamNumber} notified for meeting (${timing}).`, 'info');
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
    const pendingTitleApprovalsCount = assignedTeams.filter(t => t.titleStatus === 'Pending').length;
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
