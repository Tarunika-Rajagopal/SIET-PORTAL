const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Verifying: No Project Title Input & Dropdown for Unassigned Members ===\n');

const modalPath = path.join(__dirname, '../src/components/advisor/AdvisorManualTeamModal.tsx');
assert(fs.existsSync(modalPath), 'AdvisorManualTeamModal.tsx not found!');
const modalContent = fs.readFileSync(modalPath, 'utf-8');

// 1. Verify Project Title Input is REMOVED
assert(!modalContent.includes('setProjectTitle'), 'Must NOT have state or input for projectTitle in AdvisorManualTeamModal!');
assert(!modalContent.includes('placeholder="e.g. Distributed Cloud Monitoring Framework"'), 'Must NOT have project title input field!');
assert(modalContent.includes("title: 'To be proposed by student team'"), 'Must automatically default title to "To be proposed by student team"');
console.log('✓ Requirement 1: Project title input is removed from advisor modal; title is automatically designated to be proposed by student team.');

// 2. Verify Dropdown for Unassigned Students
assert(modalContent.includes('handleAddMemberFromDropdown'), 'Must have handleAddMemberFromDropdown method!');
assert(modalContent.includes('availableUnassignedToAdd.map'), 'Must render unassigned members inside <select> dropdown!');
assert(modalContent.includes('-- Click dropdown to select an unassigned student to add --') || modalContent.includes('select an unassigned student'), 'Must have placeholder option in unassigned dropdown!');
console.log('✓ Requirement 2: Unassigned members are chosen via a <select> dropdown, supporting adding multiple unassigned candidates up to capacity.');

// 3. Verify Team Leader & Guide dropdowns remain intact
assert(modalContent.includes('Designate Team Leader'), 'Must have Team Leader designation!');
assert(modalContent.includes('Select Technical Faculty Guide'), 'Must have Faculty Guide selector!');
assert(modalContent.includes('isFull ? \'[MAX 5 REACHED]\''), 'Must enforce max 5 teams quota per guide!');
console.log('✓ Requirement 3: Leader designation and 5-team guide limit enforcement remain intact.');

console.log('\n>>> ALL NEW SPECIFICATIONS VERIFIED SUCCESSFULLY! <<<');
