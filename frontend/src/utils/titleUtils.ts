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

  // Check if title is empty or matches dummy default placeholders
  const isDummy = !cleanTitle || 
    cleanTitle.toLowerCase().includes('capstone') || 
    cleanTitle === 'No Title Submitted' || 
    cleanTitle === 'Title Approval Pending' ||
    cleanTitle === 'Title Not Submitted' ||
    cleanTitle === 'Awaiting Student Title Proposal' ||
    cleanTitle === 'Awaiting Student Title Proposal Submission';

  if (isDummy) {
    return 'No Title Submitted';
  }

  // Check if approved
  const isApproved = isTitleApproved === true || 
    status === 'Approved' || 
    status === 'APPROVED' || 
    status === 'approved';

  if (isApproved) {
    return cleanTitle;
  }

  // Otherwise submitted, awaiting approval
  return 'Title Approval Pending';
}
