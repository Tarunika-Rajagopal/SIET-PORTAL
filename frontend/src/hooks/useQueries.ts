import { useQuery, useMutation } from '@tanstack/react-query';
import { ApiClient } from '../services/apiClient';
import { AdminFaculty, AdminStudent } from '../services/adminService';
import { AdvisorService, ClassTeam } from '../services/advisorService';
import { queryClient, QUERY_KEYS } from '../lib/queryClient';

// -------------------------------------------------------------
// QUERY HOOKS
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
export function useClassTeams(className: string = 'CSE-B') {
  return useQuery<ClassTeam[]>({
    queryKey: QUERY_KEYS.advisorTeams(className),
    queryFn: () => AdvisorService.fetchTeamsForClass(className),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for class students in advisor portal.
 */
export function useClassStudents(className: string = 'CSE-B', batch: string = 'ALL') {
  return useQuery<AdminStudent[]>({
    queryKey: QUERY_KEYS.advisorStudents(className, batch),
    queryFn: () => AdvisorService.getClassStudents(className, batch),
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
