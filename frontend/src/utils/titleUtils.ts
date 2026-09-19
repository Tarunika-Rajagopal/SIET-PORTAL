/**
 * Title display logic across all portals (Student, Advisor, Guide, HOD, Admin):
 * - If title is not submitted: "No Title Submitted"
 * - If title is submitted but not approved: "Title Approval Pending"
 * - If title submitted by student is approved: exact submitted title
 * Strictly never displays "Capstone Project".
 */
export function formatProjectTitle(
  title?: string | null,
  status?: string | null,
  isTitleApproved?: boolean | null
): string {
  const cleanTitle = (title || '').trim();

  // Check if approved
  const isApproved = isTitleApproved === true || 
    status === 'Approved' || 
    status === 'APPROVED' || 
    status === 'approved' ||
    status === 'Active & Approved';

  // Check if title is empty or matches dummy default placeholders
  const isDummy = !cleanTitle || 
    cleanTitle.toLowerCase().includes('capstone') || 
    cleanTitle === 'No Title Submitted' || 
    cleanTitle === 'Title Approval Pending' ||
    cleanTitle === 'Title Not Submitted' ||
    cleanTitle === 'Awaiting Student Title Proposal' ||
    cleanTitle === 'Awaiting Student Title Proposal Submission';

  if (isApproved) {
    if (!isDummy) {
      return cleanTitle;
    }
    try {
      const d1 = localStorage.getItem('siet_deliverable_v6_submission_1');
      if (d1) {
        const p1 = JSON.parse(d1);
        if (p1?.projectTitle && p1.projectTitle.trim() && !p1.projectTitle.toLowerCase().includes('capstone')) {
          return p1.projectTitle.trim();
        }
      }
      const d0 = localStorage.getItem('siet_deliverable_v6_week_0');
      if (d0) {
        const p0 = JSON.parse(d0);
        if (p0?.projectTitle && p0.projectTitle.trim() && !p0.projectTitle.toLowerCase().includes('capstone')) {
          return p0.projectTitle.trim();
        }
      }
    } catch (e) {}
  }

  if (isDummy) {
    return 'No Title Submitted';
  }

  // Otherwise submitted, awaiting approval
  return 'Title Approval Pending';
}

/**
 * When viewing submissions or for guide approval:
 * Always show the authentic submitted title (or fallback if not submitted/empty).
 */
export function getSubmissionTitle(
  title?: string | null,
  fallback: string = 'No Title Submitted'
): string {
  const cleanTitle = (title || '').trim();

  const isDummy = !cleanTitle || 
    cleanTitle.toLowerCase().includes('capstone') || 
    cleanTitle === 'No Title Submitted' || 
    cleanTitle === 'Title Approval Pending' ||
    cleanTitle === 'Title Not Submitted' ||
    cleanTitle === 'Awaiting Student Title Proposal' ||
    cleanTitle === 'Awaiting Student Title Proposal Submission';

  if (isDummy) {
    return fallback;
  }

  return cleanTitle;
}

/**
 * Helper to check if a title status is officially approved.
 */
export function isTitleApprovedStatus(
  status?: string | null,
  isTitleApproved?: boolean | null
): boolean {
  return isTitleApproved === true || 
    status === 'Approved' || 
    status === 'APPROVED' || 
    status === 'approved' ||
    status === 'Active & Approved';
}
