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
