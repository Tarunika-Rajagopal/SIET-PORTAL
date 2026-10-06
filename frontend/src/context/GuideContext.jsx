import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AuthService, getUserInitials } from '../services/authService';
import { MarksService } from '../services/marksService';
import { ApiClient } from '../services/apiClient';
import { useGuideDashboard, useGuideTeams, useGuideSubmissions, invalidateGuideDataQuery } from '../hooks/useQueries';

const GuideContext = createContext(null);

export const GuideProvider = ({ children }) => {
  const currentUser = AuthService.getCurrentUser();
  const guideName = currentUser?.name || 'Faculty Guide';

  // Teams state initialized to empty array (PostgreSQL is single source of truth)
  const [allTeams, setAllTeams] = useState([]);
  const [backendMetrics, setBackendMetrics] = useState(null);
  const [activities, setActivities] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Clean any obsolete mock domain data from localStorage on mount and fetch authoritative marks
  useEffect(() => {
    try {
      localStorage.removeItem('siet_guide_portal_teams_v6');
      localStorage.removeItem('siet_guide_portal_activities_v6');
      localStorage.removeItem('siet_guide_portal_teams');
    } catch (e) {}
    MarksService.fetchAllMarks().catch(() => {});
  }, []);

  // TanStack Query hooks for Guide data from FastAPI backend
  const { data: dashboardData, refetch: refetchDashboard } = useGuideDashboard();
  const { data: guideTeamsData, refetch: refetchTeams } = useGuideTeams();
  const { data: weeklySubmissionsData, refetch: refetchSubmissions } = useGuideSubmissions();

  const dynamicProfile = useMemo(() => ({
    name: guideName,
    initials: getUserInitials(guideName),
    id: currentUser?.id || '',
    empId: currentUser?.empId || currentUser?.emp_id || '',
    role: currentUser?.role || 'Faculty Guide',
    department: currentUser?.department || 'Computer Science and Engineering',
    cabin: currentUser?.cabin || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    assignedTeamsCount: backendMetrics?.totalTeams !== undefined ? backendMetrics.totalTeams : allTeams.length,
    jurisdiction: currentUser?.jurisdiction || ''
  }), [guideName, currentUser, backendMetrics, allTeams.length]);

  const processBackendData = useCallback((data, guideTeams, weeklySubmissions) => {
    if (!data && !guideTeams && !weeklySubmissions) return;
    try {
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

      const getTeamSubmissions = (team, fallbackSubs = []) => {
        if (!hasBackendSubs) return fallbackSubs;
        const matchingBackend = weeklySubmissions.filter(s =>
          (s.teamDbId && team.id && s.teamDbId === team.id) ||
          (s.teamId && (s.teamId === team.teamId || s.teamId === team.id)) ||
          (s.teamNo && team.teamNo && s.teamNo.toLowerCase() === team.teamNo.toLowerCase()) ||
          (s.teamNumber && team.teamNumber && s.teamNumber === team.teamNumber && (!s.classSection || !team.classSection || s.classSection.toLowerCase() === team.classSection.toLowerCase()))
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

          const rawTech = bSub.technologiesUsed || bSub.technologyUsed || bSub.techStack;
          const techArr = Array.isArray(rawTech)
            ? rawTech
            : (typeof rawTech === 'string' && rawTech.trim()
                ? rawTech.split(',').map(s => s.trim()).filter(Boolean)
                : []);
          const techStr = typeof rawTech === 'string' ? rawTech : techArr.join(', ');

          const hasRealContent = bSub.hasContent !== undefined 
            ? Boolean(bSub.hasContent) 
            : Boolean(
                bSub.abstractSummary || bSub.problemStatement || bSub.proposedSolution || 
                techStr || bSub.obstaclesFaced || bSub.githubUrl || bSub.liveDemoUrl
              );

          const formattedSub = {
            ...(idx >= 0 ? merged[idx] : {}),
            ...bSub,
            hasContent: hasRealContent,
            technologiesUsed: techArr,
            technologyUsed: techStr,
            techStack: techStr,
            status: bStatus,
            evaluationStatus: bEvalStatus,
            submissionStatus: bSub.submissionStatus || bStatus,
            isLocked: isApproved,
            score: bSub.score !== undefined && bSub.score !== null ? bSub.score : (idx >= 0 ? merged[idx].score : null),
            memberMarks: (bSub.memberMarks && Object.keys(bSub.memberMarks).length > 0) ? bSub.memberMarks : (idx >= 0 ? (merged[idx].memberMarks || {}) : {}),
            guideRemarks: bSub.comments || bSub.guideRemarks || (idx >= 0 ? (merged[idx].guideRemarks || '') : '')
          };

          if (idx >= 0) {
            merged[idx] = formattedSub;
          } else {
            merged.push(formattedSub);
          }
        });
        return merged;
      };

      const teamsData = Array.isArray(guideTeams)
        ? guideTeams
        : (data && Array.isArray(data.teams) ? data.teams : []);

      // If backend returned teams, map them directly from PostgreSQL data
      if (Array.isArray(teamsData)) {
        const mappedTeams = teamsData.map(b => {
          const teamNum = b.teamNumber !== undefined
            ? b.teamNumber
            : (parseInt(String(b.teamNo || '').replace(/\D/g, ''), 10) || 1);
          const isApproved = Boolean(b.isTitleApproved);
          const teamSubs = getTeamSubmissions(b, Array.isArray(b.submissions) ? b.submissions : []);
          const repoUrlFromSubs = teamSubs.find(s => s.githubUrl || s.repoUrl)?.githubUrl || '';
          const demoUrlFromSubs = teamSubs.find(s => s.liveDemoUrl || s.demoUrl)?.liveDemoUrl || '';

          const teamRawTech = b.technologiesUsed || b.technologyUsed || b.techStack || teamSubs[0]?.technologiesUsed || teamSubs[0]?.technologyUsed || '';
          const teamTechArr = Array.isArray(teamRawTech)
            ? teamRawTech
            : (typeof teamRawTech === 'string' && teamRawTech.trim()
                ? teamRawTech.split(',').map(s => s.trim()).filter(Boolean)
                : []);
          const teamTechStr = typeof teamRawTech === 'string' ? teamRawTech : teamTechArr.join(', ');

          return {
            id: b.id,
            teamId: b.teamId || b.id,
            teamNo: b.teamNo || (teamNum ? `Team ${teamNum}` : ''),
            teamNumber: teamNum,
            projectTitle: b.projectTitle || '',
            status: b.status || 'In Progress',
            progress: b.progress || 0,
            batch: b.batch || '',
            classSection: b.classSection || b.section || '',
            section: b.classSection || b.section || '',
            guideName: b.guideName || guideName,
            guide: b.guideName || guideName,
            advisorName: b.advisorName || '',
            advisor: b.advisorName || '',
            isTitleApproved: isApproved,
            guideApprovalStatus: b.guideApprovalStatus || (isApproved ? 'Approved' : 'Pending'),
            titleStatus: b.guideApprovalStatus || (isApproved ? 'Approved' : 'Pending'),
            teamLeader: b.teamLeader || '',
            leaderRollNo: b.leaderRollNo || '',
            memberCount: b.memberCount || (Array.isArray(b.members) ? b.members.length : 0),
            membersCount: b.memberCount || (Array.isArray(b.members) ? b.members.length : 0),
            members: Array.isArray(b.members) ? b.members : [],
            problemStatement: b.problemStatement || teamSubs[0]?.problemStatement || '',
            proposedSolution: b.proposedSolution || teamSubs[0]?.proposedSolution || '',
            abstract: b.abstract || teamSubs[0]?.abstractSummary || '',
            technologiesUsed: teamTechArr,
            technologyUsed: teamTechStr,
            techStack: teamTechStr,
            githubUrl: b.githubUrl || repoUrlFromSubs,
            liveDemoUrl: b.liveDemoUrl || demoUrlFromSubs,
            submissions: teamSubs,
          };
        });

        setAllTeams(mappedTeams);
      }
    } catch (err) {
      console.warn('[GuideContext] Failed to process dashboard/teams data:', err);
    }
  }, [guideName]);

  // Synchronize data from TanStack Query
  useEffect(() => {
    if (dashboardData || guideTeamsData || weeklySubmissionsData) {
      processBackendData(dashboardData, guideTeamsData, weeklySubmissionsData);
    }
  }, [dashboardData, guideTeamsData, weeklySubmissionsData, processBackendData]);

  const fetchDashboard = useCallback(async () => {
    try {
      const [d, t, s] = await Promise.all([
        refetchDashboard(),
        refetchTeams(),
        refetchSubmissions()
      ]);
      processBackendData(d.data, t.data, s.data);
    } catch (err) {
      console.warn('[GuideContext] fetchDashboard error:', err);
    }
  }, [refetchDashboard, refetchTeams, refetchSubmissions, processBackendData]);

  // Real-time synchronization listener for global update events
  useEffect(() => {
    const handleRemoteUpdate = () => {
      fetchDashboard();
    };
    window.addEventListener('siet_data_updated', handleRemoteUpdate);
    window.addEventListener('siet_marks_updated', handleRemoteUpdate);
    const unsubMarks = MarksService.subscribe(handleRemoteUpdate);
    return () => {
      window.removeEventListener('siet_data_updated', handleRemoteUpdate);
      window.removeEventListener('siet_marks_updated', handleRemoteUpdate);
      unsubMarks();
    };
  }, [fetchDashboard]);

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

  // 1. Approve Title (PostgreSQL Authoritative Backend Mutation)
  const approveTitle = async (teamId) => {
    try {
      const targetTeam = allTeams.find(t => t.teamId === teamId || t.id === teamId);
      if (!targetTeam) {
        showToast('Team not found.', 'error');
        return false;
      }
      const title = targetTeam.projectTitle || '';
      const tId = targetTeam.id || targetTeam.teamId;

      await ApiClient.approveProjectTitle(tId, title);

      // Invalidate queries to fetch authoritative database state
      await invalidateGuideDataQuery();
      await fetchDashboard();

      // Log activity in session
      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Title Approved: Team #${targetTeam.teamNumber}`,
        details: `Approved "${title}". Scope locked.`,
        time: 'Just now',
        type: 'approve'
      };
      setActivities(prev => [newActivity, ...prev]);

      try {
        await ApiClient.logGuideHistory({
          className: targetTeam.classSection || targetTeam.section || '',
          actionType: 'Project Approval',
          target: `Team #${targetTeam.teamNumber} (${title || 'Project Title'})`,
          details: `Approved project proposal. Status updated to Approved. Scope locked.`
        });
      } catch (e) {}

      window.dispatchEvent(new Event('siet_data_updated'));
      showToast(`Team #${targetTeam.teamNumber} title approved and scope locked.`, 'success');
      return true;
    } catch (err) {
      console.error('[GuideContext] approveTitle failed:', err);
      showToast(err?.message || 'Failed to approve project title.', 'error');
      return false;
    }
  };

  // 2. Reject Title (PostgreSQL Authoritative Backend Mutation)
  const rejectTitle = async (teamId, reason) => {
    if (!reason || !reason.trim()) {
      showToast('Rejection reason is mandatory.', 'error');
      return false;
    }

    try {
      const targetTeam = allTeams.find(t => t.teamId === teamId || t.id === teamId);
      if (!targetTeam) {
        showToast('Team not found.', 'error');
        return false;
      }
      const tId = targetTeam.id || targetTeam.teamId;

      await ApiClient.rejectProjectTitle(tId, reason.trim());

      await invalidateGuideDataQuery();
      await fetchDashboard();

      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Title Rejected: Team #${targetTeam.teamNumber}`,
        details: `Status: Rejected - Reason: ${reason.trim()}`,
        time: 'Just now',
        type: 'reject'
      };
      setActivities(prev => [newActivity, ...prev]);

      try {
        await ApiClient.logGuideHistory({
          className: targetTeam.classSection || targetTeam.section || '',
          actionType: 'Project Approval',
          target: `Team #${targetTeam.teamNumber} (${targetTeam.projectTitle || 'Project Title'})`,
          details: `Rejected project proposal. Status updated to Rejected. Mandated revision: "${reason.trim()}".`
        });
      } catch (e) {}

      window.dispatchEvent(new Event('siet_data_updated'));
      showToast(`Feedback sent. Team #${targetTeam.teamNumber} instructed to revise title.`, 'warning');
      return true;
    } catch (err) {
      console.error('[GuideContext] rejectTitle failed:', err);
      showToast(err?.message || 'Failed to reject project title.', 'error');
      return false;
    }
  };

  // 3. Evaluate Weekly Submission (PostgreSQL Authoritative Backend Mutation)
  const evaluateWeeklySubmission = async (teamId, weekNumber, remarks, score, memberMarks) => {
    const weekNum = Number(weekNumber);
    const targetTeam = allTeams.find(t => t.teamId === teamId || t.id === teamId);
    if (!targetTeam) {
      showToast('Team not found.', 'error');
      return false;
    }

    const markVals = Object.values(memberMarks || {}).map(Number).filter(v => !isNaN(v));
    const calculatedAvg = markVals.length > 0 
      ? Math.round((markVals.reduce((a, b) => a + b, 0) / markVals.length) * 10) / 10 
      : (score !== undefined && score !== null ? Number(score) : 0);

    try {
      // 1. Submit review to backend API
      await ApiClient.reviewTeamWeeklySubmission(
        targetTeam.teamId || targetTeam.id,
        weekNum,
        'APPROVED',
        remarks || 'Endorsed. Satisfactory technical milestone deliverables.',
        calculatedAvg,
        memberMarks,
        dynamicProfile.name
      );

      // 2. Persist individual member marks to backend
      if (memberMarks && Object.keys(memberMarks).length > 0) {
        await MarksService.saveWeeklyMarks(
          targetTeam.teamId || targetTeam.id,
          weekNum,
          memberMarks,
          remarks,
          dynamicProfile.name
        );
      }

      // 3. Log history to backend
      try {
        await ApiClient.logGuideHistory({
          className: targetTeam.classSection || targetTeam.section || '',
          actionType: 'Milestone Review',
          target: `Team #${targetTeam.teamNumber} - Milestone Week ${weekNum}`,
          details: `Approved Week ${weekNum} deliverables. Status updated to Approved. Remarks: "${remarks || 'Satisfactory'}".`
        });
      } catch (e) {}

      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Week ${weekNum} Approved: Team #${targetTeam.teamNumber}`,
        details: `Status: Approved - Remarks: ${remarks || 'Deliverables verified and accepted.'}`,
        time: 'Just now',
        type: 'evaluate'
      };
      setActivities(prev => [newActivity, ...prev]);

      await invalidateGuideDataQuery();
      await fetchDashboard();
      await MarksService.fetchAllMarks().catch(() => {});

      window.dispatchEvent(new Event('siet_data_updated'));
      window.dispatchEvent(new Event('siet_marks_updated'));
      showToast(`Week ${weekNum} deliverables for Team #${targetTeam.teamNumber} evaluated and locked.`, 'success');
      return true;
    } catch (err) {
      console.error('[GuideContext] evaluateWeeklySubmission failed:', err);
      showToast(err?.message || 'Failed to submit weekly evaluation.', 'error');
      return false;
    }
  };

  // 4. Request Weekly Revision (PostgreSQL Authoritative Backend Mutation)
  const requestWeeklyRevision = async (teamId, weekNumber, reason) => {
    if (!reason || !reason.trim()) {
      showToast('Revision reason is mandatory.', 'error');
      return false;
    }

    const targetTeam = allTeams.find(t => t.teamId === teamId || t.id === teamId);
    if (!targetTeam) {
      showToast('Team not found.', 'error');
      return false;
    }
    const weekNum = Number(weekNumber);

    try {
      await ApiClient.reviewTeamWeeklySubmission(
        targetTeam.teamId || targetTeam.id,
        weekNum,
        'REVISION_REQUESTED',
        reason.trim(),
        undefined,
        undefined,
        dynamicProfile.name
      );

      try {
        await ApiClient.logGuideHistory({
          className: targetTeam.classSection || targetTeam.section || '',
          actionType: 'Milestone Review',
          target: `Team #${targetTeam.teamNumber} - Milestone Week ${weekNum}`,
          details: `Requested revision for Week ${weekNum}. Status updated to Needs Revision. Reason: "${reason.trim()}".`
        });
      } catch (e) {}

      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Week ${weekNumber} Needs Revision: Team #${targetTeam.teamNumber}`,
        details: `Status: Needs Revision - Reason: ${reason.trim()}`,
        time: 'Just now',
        type: 'reject'
      };
      setActivities(prev => [newActivity, ...prev]);

      await invalidateGuideDataQuery();
      await fetchDashboard();

      window.dispatchEvent(new Event('siet_data_updated'));
      showToast(`Revision requested for Week ${weekNumber} (Team #${targetTeam.teamNumber}).`, 'warning');
      return true;
    } catch (err) {
      console.error('[GuideContext] requestWeeklyRevision failed:', err);
      showToast(err?.message || 'Failed to request revision.', 'error');
      return false;
    }
  };

  // 5. Reject Weekly Submission (PostgreSQL Authoritative Backend Mutation)
  const rejectWeeklySubmission = async (teamId, weekNumber, reason) => {
    if (!reason || !reason.trim()) {
      showToast('Rejection reason is mandatory.', 'error');
      return false;
    }

    const targetTeam = allTeams.find(t => t.teamId === teamId || t.id === teamId);
    if (!targetTeam) {
      showToast('Team not found.', 'error');
      return false;
    }
    const weekNum = Number(weekNumber);

    try {
      await ApiClient.reviewTeamWeeklySubmission(
        targetTeam.teamId || targetTeam.id,
        weekNum,
        'REJECTED',
        reason.trim(),
        undefined,
        undefined,
        dynamicProfile.name
      );

      try {
        await ApiClient.logGuideHistory({
          className: targetTeam.classSection || targetTeam.section || '',
          actionType: 'Milestone Review',
          target: `Team #${targetTeam.teamNumber} - Milestone Week ${weekNum}`,
          details: `Rejected Week ${weekNum} submission. Reason: "${reason.trim()}".`
        });
      } catch (e) {}

      const newActivity = {
        id: 'act-' + Date.now(),
        title: `Week ${weekNumber} Rejected: Team #${targetTeam.teamNumber}`,
        details: `Status: Rejected - Reason: ${reason.trim()}`,
        time: 'Just now',
        type: 'reject'
      };
      setActivities(prev => [newActivity, ...prev]);

      await invalidateGuideDataQuery();
      await fetchDashboard();

      window.dispatchEvent(new Event('siet_data_updated'));
      showToast(`Submission rejected for Week ${weekNumber} (Team #${targetTeam.teamNumber}).`, 'error');
      return true;
    } catch (err) {
      console.error('[GuideContext] rejectWeeklySubmission failed:', err);
      showToast(err?.message || 'Failed to reject weekly submission.', 'error');
      return false;
    }
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

    const targetWeek = (weekNumber !== undefined && weekNumber !== null) ? Number(weekNumber) : 1;
    const targetTeam = allTeams.find(t => t.teamId === teamId || t.id === teamId);
    if (!targetTeam) return false;

    const notificationEntry = {
      timing: timing || '',
      location: location || '',
      comment: comment || '',
      date: formattedDate,
      weekNumber: targetWeek
    };

    setAllTeams(prevTeams =>
      prevTeams.map(team => {
        if (team.teamId === teamId || team.id === teamId) {
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
              guideRemarks: comment || ''
            });
          }

          return {
            ...team,
            isNotified: true,
            notifiedTiming: timing || '',
            notifiedLocation: location || '',
            notifiedComment: comment || '',
            notifiedAt: formattedDate,
            notificationHistory: [notificationEntry, ...(team.notificationHistory || [])],
            submissions: currentSubs
          };
        }
        return team;
      })
    );

    ApiClient.logGuideHistory({
      className: targetTeam.classSection || targetTeam.section || '',
      actionType: 'Notice Dispatched',
      target: `Team #${targetTeam.teamNumber} - Week ${targetWeek}`,
      details: `Dispatched consultation notice for Week ${targetWeek}: "${comment || 'Consultation scheduled'}". Meeting: ${timing || 'N/A'} at ${location || 'N/A'}.`
    }).catch(() => {});

    showToast(`Team #${targetTeam.teamNumber} notified for Week ${targetWeek} consultation.`, 'info');
    return true;
  };

  // Refresh data from server
  const resetData = () => {
    fetchDashboard();
    showToast('Guide Portal data refreshed from server.', 'info');
  };

  // Computed Stats for assigned teams
  const stats = useMemo(() => {
    const localAssignedTeamsCount = allTeams.length;
    const localPendingTitleApprovalsCount = allTeams.filter(t => (t.titleStatus === 'Pending' || t.guideApprovalStatus === 'Pending') && t.projectTitle).length;
    const localApprovedTitlesCount = allTeams.filter(t => t.titleStatus === 'Approved' || t.isTitleApproved).length;
    const rejectedTitlesCount = allTeams.filter(t => t.titleStatus === 'Rejected' || t.guideApprovalStatus === 'Rejected').length;
    const notifiedCount = allTeams.filter(t => t.isNotified).length;

    let localTotalSubmissionsCount = 0;
    let localPendingWeeklySubmissionsCount = 0;
    let evaluatedSubmissionsCount = 0;
    let revisionRequiredCount = 0;

    allTeams.forEach(t => {
      (t.submissions || []).forEach(sub => {
        localTotalSubmissionsCount += 1;
        if (sub.evaluationStatus === 'Pending') localPendingWeeklySubmissionsCount += 1;
        if (sub.evaluationStatus === 'Approved' || sub.evaluationStatus === 'Evaluated') evaluatedSubmissionsCount += 1;
        if (sub.evaluationStatus === 'Revision Required') revisionRequiredCount += 1;
      });
    });

    const pendingTitleApprovals = backendMetrics?.pendingTitles !== undefined ? backendMetrics.pendingTitles : localPendingTitleApprovalsCount;
    const pendingWeeklyReviews = backendMetrics?.pendingReviews !== undefined ? backendMetrics.pendingReviews : localPendingWeeklySubmissionsCount;
    const totalPendingApprovals = pendingTitleApprovals + pendingWeeklyReviews;

    return {
      assignedTeamsCount: backendMetrics?.totalTeams !== undefined ? backendMetrics.totalTeams : localAssignedTeamsCount,
      pendingTitleApprovalsCount: pendingTitleApprovals,
      approvedTitlesCount: backendMetrics?.approvedTitles !== undefined ? backendMetrics.approvedTitles : localApprovedTitlesCount,
      rejectedTitlesCount,
      notifiedCount,
      totalSubmissionsCount: backendMetrics?.totalSubmissions !== undefined ? backendMetrics.totalSubmissions : localTotalSubmissionsCount,
      pendingWeeklySubmissionsCount: pendingWeeklyReviews,
      totalPendingApprovalsCount: totalPendingApprovals,
      evaluatedSubmissionsCount,
      revisionRequiredCount
    };
  }, [allTeams, backendMetrics]);

  return (
    <GuideContext.Provider
      value={{
        facultyProfile: dynamicProfile,
        teams: allTeams,
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
