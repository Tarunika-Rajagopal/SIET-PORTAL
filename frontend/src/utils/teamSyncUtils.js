/**
 * Helper to normalize and sanitize team structures received from backend.
 * PostgreSQL/backend data is the single source of truth.
 */

export const sanitizeAndSyncGuideTeams = (rawList) => {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(team => ({
    ...team,
    submissions: Array.isArray(team.submissions) ? team.submissions : []
  }));
};
