import { useQuery, useMutation } from '@tanstack/react-query';
import { ApiClient } from '../services/apiClient';
import { AdminFaculty, AdminStudent } from '../services/adminService';
import { AdvisorService, ClassTeam } from '../services/advisorService';
import { HodService, HodAdvisor, HodStudent, HodTeamDetails, HodFilterOptions } from '../services/hodService';
import { HodHistoryService, HodHistoryRecord } from '../services/hodHistoryService';
import { AdvisorHistoryService } from '../services/advisorHistoryService';
import { queryClient, QUERY_KEYS } from '../lib/queryClient';

// -------------------------------------------------------------
// QUERY HOOKS (Admin & Advisor)
// -------------------------------------------------------------

/**
 * Centrally managed hook for faculties across all admin and advisor views.
 * Shares a single cached state across all components and re-renders.
 */
export function useFaculties() {
  return useQuery<AdminFaculty[]>({
    queryKey: QUERY_KEYS.faculties,
    queryFn: () => ApiClient.getAllFaculties(),
    staleTime: 1000 * 60 * 5, // 5 minutes fresh: prevents network refetches on re-renders
  });
}

/**
 * Centrally managed hook for available technical guides in the advisor workspace.
 * Queries /advisor/available-guides which is authorized for advisor roles.
 */
export function useAdvisorGuides() {
  return useQuery<AdminFaculty[]>({
    queryKey: QUERY_KEYS.advisorGuides,
    queryFn: () => ApiClient.getAdvisorAvailableGuides(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Centrally managed hook for students.
 */
export function useAdminStudents() {
  return useQuery<AdminStudent[]>({
    queryKey: QUERY_KEYS.students('ALL', 'ALL'),
    queryFn: () => ApiClient.getAllStudents(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for class teams in advisor portal.
 */
export function useClassTeams(className: string = '') {
  return useQuery<ClassTeam[]>({
    queryKey: QUERY_KEYS.advisorTeams(className),
    queryFn: () => className ? AdvisorService.fetchTeamsForClass(className) : Promise.resolve([]),
    enabled: Boolean(className),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for class students in advisor portal.
 */
export function useClassStudents(className: string = '', batch: string = 'ALL') {
  return useQuery<AdminStudent[]>({
    queryKey: QUERY_KEYS.advisorStudents(className, batch),
    queryFn: () => className ? AdvisorService.getClassStudents(className, batch) : Promise.resolve([]),
    enabled: Boolean(className),
    staleTime: 1000 * 60 * 5,
  });
}

// -------------------------------------------------------------
// QUERY HOOKS (HOD)
// -------------------------------------------------------------

/**
 * Hook for HOD filter options (batches and classes).
 */
export function useHodFilterOptions() {
  return useQuery<HodFilterOptions>({
    queryKey: QUERY_KEYS.hodFilterOptions,
    queryFn: () => HodService.fetchFilterOptions(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for HOD advisors list with batch and class filtering.
 */
export function useHodAdvisors(batch?: string, className?: string) {
  return useQuery<HodAdvisor[]>({
    queryKey: QUERY_KEYS.hodAdvisors(batch, className),
    queryFn: () => HodService.fetchAdvisors(batch, className),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for an individual advisor's students in HOD portal.
 * Scoped uniquely per advisorId to guarantee complete data isolation.
 */
export function useHodAdvisorStudents(advisorId?: string) {
  return useQuery<HodStudent[]>({
    queryKey: QUERY_KEYS.hodAdvisorStudents(advisorId || ''),
    queryFn: () => advisorId ? HodService.fetchAdvisorStudents(advisorId) : Promise.resolve([]),
    enabled: Boolean(advisorId),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for HOD teams list with filters and search term.
 */
export function useHodTeams(batch?: string, className?: string, search?: string) {
  return useQuery<HodTeamDetails[]>({
    queryKey: QUERY_KEYS.hodTeams(batch, className, search),
    queryFn: () => HodService.fetchTeams(batch, className, search),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for HOD faculty list (for advisor assignment modal).
 */
export function useHodFacultyList(enabled: boolean = true) {
  return useQuery<any[]>({
    queryKey: QUERY_KEYS.hodFacultyList,
    queryFn: () => HodService.fetchFacultyList(),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for HOD audit & action history.
 */
export function useHodHistory() {
  return useQuery<HodHistoryRecord[]>({
    queryKey: QUERY_KEYS.hodHistory,
    queryFn: () => HodHistoryService.fetchHistory(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for HOD milestone week releases status.
 */
export function useHodWeekReleases() {
  return useQuery<Record<string, boolean>>({
    queryKey: QUERY_KEYS.hodWeekReleases,
    queryFn: () => HodService.fetchWeekReleases(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for weekly submissions aggregate summary.
 */
export function useHodWeeklySummary() {
  return useQuery<Array<{ week: number; studentCount: number; submissionCount: number; status: string }>>({
    queryKey: QUERY_KEYS.hodWeeklySummary,
    queryFn: () => ApiClient.getWeeklySubmissionsSummary(),
    staleTime: 1000 * 60 * 5,
  });
}

// -------------------------------------------------------------
// QUERY HOOKS (Guide)
// -------------------------------------------------------------

/**
 * Hook for Guide dashboard summary metrics.
 */
export function useGuideDashboard() {
  return useQuery<any>({
    queryKey: QUERY_KEYS.guideDashboard,
    queryFn: () => ApiClient.getGuideDashboard(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for Guide assigned teams.
 */
export function useGuideTeams() {
  return useQuery<any[]>({
    queryKey: QUERY_KEYS.guideTeams,
    queryFn: () => ApiClient.getGuideTeams(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for Guide weekly pending submissions.
 */
export function useGuideSubmissions() {
  return useQuery<any[]>({
    queryKey: QUERY_KEYS.guideSubmissions,
    queryFn: () => ApiClient.getGuidePendingSubmissions(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for Guide action history logs.
 */
export function useGuideHistory(faculty?: string, className?: string) {
  return useQuery<any[]>({
    queryKey: QUERY_KEYS.guideHistory(faculty, className),
    queryFn: () => AdvisorHistoryService.getGuideHistory(faculty, className),
    staleTime: 1000 * 60 * 5,
  });
}

// -------------------------------------------------------------
// INVALIDATION HELPERS
// -------------------------------------------------------------

export function invalidateFacultiesQuery() {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.faculties });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.advisorGuides });
}

export function invalidateStudentsQuery() {
  queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
  queryClient.invalidateQueries({ queryKey: ['advisor', 'students'] });
}

export function invalidateTeamsQuery(className?: string) {
  if (className) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.advisorTeams(className) });
  } else {
    queryClient.invalidateQueries({ queryKey: ['advisor', 'teams'] });
  }
}

// HOD invalidation helpers
export function invalidateHodTeamsQuery() {
  queryClient.invalidateQueries({ queryKey: ['hod', 'teams'] });
}

export function invalidateHodAdvisorsQuery() {
  queryClient.invalidateQueries({ queryKey: ['hod', 'advisors'] });
}

export function invalidateHodWeekReleasesQuery() {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hodWeekReleases });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hodWeeklySummary });
}

export function invalidateHodHistoryQuery() {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hodHistory });
}

export function invalidateHodFacultyListQuery() {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hodFacultyList });
}

// Guide & Cross-Portal invalidation helpers
export function invalidateGuideDataQuery() {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.guideDashboard });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.guideTeams });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.guideSubmissions });
  queryClient.invalidateQueries({ queryKey: ['advisor', 'teams'] });
  queryClient.invalidateQueries({ queryKey: ['hod', 'teams'] });
  queryClient.invalidateQueries({ queryKey: ['hod', 'team-submission'] });
}

export function invalidateGuideHistoryQuery() {
  queryClient.invalidateQueries({ queryKey: ['guide', 'history'] });
}

