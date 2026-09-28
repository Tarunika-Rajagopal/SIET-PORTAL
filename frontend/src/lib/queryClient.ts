import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes: queries remain strictly fresh without background refetches
      gcTime: 1000 * 60 * 15,   // 15 minutes: keep unused data in memory cache
      refetchOnWindowFocus: false, // Do not trigger network refetches when switching window tabs
      refetchOnMount: false,       // Do not refetch when components remount if cached data exists
      refetchOnReconnect: false,   // Do not refetch automatically on reconnect
      retry: 1,
    },
  },
});

export const QUERY_KEYS = {
  faculties: ['admin', 'faculties'] as const,
  students: (batch?: string, className?: string) => ['admin', 'students', batch || 'ALL', className || 'ALL'] as const,
  advisorGuides: ['advisor', 'available-guides'] as const,
  advisorTeams: (className: string) => ['advisor', 'teams', className] as const,
  advisorStudents: (className: string, batch: string) => ['advisor', 'students', className, batch] as const,
};
