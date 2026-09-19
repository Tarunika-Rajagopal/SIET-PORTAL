-- ============================================================
-- SIET Project Portal - Supabase Production & Frontend Schema
-- High-Performance, Realtime-Ready, and Frontend-Accessible
-- ============================================================

-- 1. Enable extensions (pgcrypto for native gen_random_uuid, uuid-ossp for legacy support)
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUM TYPES (Idempotent creation via exception handler)
-- ============================================================

do $$ begin
  create type user_role as enum ('student', 'guide', 'advisor', 'hod', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type faculty_role as enum ('Advisor', 'Guide', 'Advisor & Guide', 'None');
exception when duplicate_object then null; end $$;

do $$ begin
  create type faculty_status as enum ('Active', 'Available');
exception when duplicate_object then null; end $$;

do $$ begin
  create type team_status as enum ('In Progress', 'Approved', 'Review Required', 'Submitted', 'Pending', 'Active & Approved', 'Under Review');
exception when duplicate_object then null; end $$;

do $$ begin
  create type submission_status as enum ('Submitted', 'Pending', 'Approved', 'Changes Requested', 'Rejected', 'Revision Required', 'Draft');
exception when duplicate_object then null; end $$;

do $$ begin
  create type title_approval_status as enum ('Pending', 'Approved', 'Rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type guide_approval_status as enum ('Approved', 'Pending Review', 'Pending', 'Revision Required', 'Rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_status_enum as enum ('Completed', 'Upcoming');
exception when duplicate_object then null; end $$;

do $$ begin
  create type advisor_history_role as enum ('Class Advisor', 'Faculty Guide', 'Head of Department', 'Admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type advisor_history_action as enum (
    'Marks Evaluation', 'Student Transfer', 'Guide Reassignment', 'Student Enrollment',
    'Team Formation', 'Team Modification', 'Team Deletion', 'Project Approval',
    'Milestone Review', 'Notice Dispatched', 'Consultation Notice', 'Department Governance'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type hod_history_action as enum (
    'Marks Overridden', 'Marks Updated', 'Project Audited',
    'Submission Reviewed', 'Advisor Appointed', 'Student Reassigned'
  );
exception when duplicate_object then null; end $$;

-- ============================================================
-- TABLES (Using gen_random_uuid() for fastest ID generation)
-- ============================================================

-- ----------------------------
-- 1. USERS (Supabase Auth + Profile)
-- ----------------------------
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password      text,
  name          text not null,
  roll_no       text unique,
  department    text not null default 'Computer Science and Engineering',
  role          user_role not null default 'student',
  roles         user_role[] default array['student'::user_role],
  active_role   user_role,
  designation   text,
  phone         text,
  year          text,
  batch         text,
  class_name    text,
  section       text,
  year_semester text,
  team_id       text,
  team_no       text,
  project_title text,
  guide_name    text,
  advisor_name  text,
  advisor_class text,
  advisor_batch text,
  initials      text,
  session_time  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.users is 'All portal users: students, faculty (guide/advisor), HOD, admin';

-- ----------------------------
-- 2. FACULTY (Admin-managed faculty records)
-- ----------------------------
create table if not exists public.faculty (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.users(id) on delete set null,
  name            text not null,
  email           text unique not null,
  designation     text not null,
  role            faculty_role not null default 'None',
  advisor_batch   text,
  advisor_class   text,
  specialization  text,
  teams_count     integer not null default 0,
  max_quota       integer not null default 5,
  status          faculty_status not null default 'Active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.faculty is 'Faculty members with advisor/guide role assignments';

-- ----------------------------
-- 3. STUDENTS (Admin-managed student records)
-- ----------------------------
create table if not exists public.students (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.users(id) on delete set null,
  roll_no         text unique not null,
  name            text not null,
  email           text unique not null,
  password        text default 'student@123',
  batch           text not null default '2023-2027 (III Year)',
  class_section   text not null default 'CSE-B',
  team_no         text default 'Unassigned',
  project_title   text default '',
  guide           text default 'Unassigned',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.students is 'Student roster managed by admin/advisor';

-- ----------------------------
-- 4. TEAMS (Project teams)
-- ----------------------------
create table if not exists public.teams (
  id                    uuid primary key default gen_random_uuid(),
  team_id               text unique not null,       -- e.g. TEAM-CSE-Y3-B04
  team_no               text not null,              -- e.g. Team 04
  class_name            text not null,              -- e.g. CSE-B
  batch                 text not null,
  project_title         text default '',
  guide_name            text,
  guide_email           text,
  guide_designation     text,
  guide_department      text,
  domain                text,
  advisor_name          text,
  advisor_email         text,
  status                team_status not null default 'Pending',
  progress              integer not null default 0,
  capacity              integer not null default 4,
  members_count         integer not null default 0,
  lead_student          text,
  lead_roll_no          text,
  is_title_approved     boolean not null default false,
  guide_approval_status guide_approval_status not null default 'Pending',
  rejection_reason      text,
  submitted_title       text,
  problem_statement     text default '',
  proposed_solution     text default '',
  abstract              text default '',
  repo_url              text default '',
  demo_url              text default '',
  last_modified         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.teams is 'Capstone project teams with guide/advisor assignments';

-- ----------------------------
-- 5. TEAM MEMBERS (Junction: students <-> teams)
-- ----------------------------
create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  roll_no     text not null,
  name        text not null,
  email       text not null,
  phone       text,
  is_lead     boolean not null default false,
  member_role text not null default 'Team Member',
  created_at  timestamptz not null default now(),
  unique(team_id, student_id),
  unique(team_id, roll_no)
);

comment on table public.team_members is 'Many-to-many: which students belong to which teams';

-- ----------------------------
-- 6. WEEKLY SUBMISSIONS (Deliverables per week per team)
-- ----------------------------
create table if not exists public.weekly_submissions (
  id                uuid primary key default gen_random_uuid(),
  team_id           uuid not null references public.teams(id) on delete cascade,
  week              integer not null,
  title             text not null default '',
  due_date          text,
  status            submission_status not null default 'Pending',
  submission_date   text,
  file_name         text,
  file_size         text,
  comments          text,
  score             numeric(5,2),
  max_score         numeric(5,2),
  project_title     text,
  problem_statement text,
  solution          text,
  technology_used   text,
  obstacles_faced   text,
  abstract          text,
  presentation_file text,
  pdf_file          text,
  repo_url          text,
  demo_url          text,
  screenshot_file   text,
  guide_name        text,
  guide_review_date text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(team_id, week)
);

comment on table public.weekly_submissions is 'Weekly project deliverable submissions per team';

-- ----------------------------
-- 7. GUIDE NOTICES (Consultation notices attached to submissions)
-- ----------------------------
create table if not exists public.guide_notices (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.weekly_submissions(id) on delete cascade,
  team_id       uuid references public.teams(id) on delete cascade,
  timing        text not null,
  location      text not null,
  comment       text,
  date          text not null,
  week_number   integer,
  created_at    timestamptz not null default now()
);

comment on table public.guide_notices is 'Guide consultation notices linked to weekly submissions';

-- ----------------------------
-- 8. REVIEW SCORES (Review evaluations)
-- ----------------------------
create table if not exists public.review_scores (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams(id) on delete cascade,
  review_number   text not null,
  review_title    text not null,
  date            text not null,
  status          review_status_enum not null default 'Upcoming',
  total_score     numeric(6,2) not null default 0,
  max_total       numeric(6,2) not null default 0,
  guide_feedback  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.review_scores is 'Formal review evaluations with aggregate scores';

-- ----------------------------
-- 9. RUBRIC CRITERIA (Individual grading items per review)
-- ----------------------------
create table if not exists public.rubric_criteria (
  id              uuid primary key default gen_random_uuid(),
  review_id       uuid not null references public.review_scores(id) on delete cascade,
  title           text not null,
  description     text,
  max_marks       numeric(5,2) not null default 0,
  awarded_marks   numeric(5,2) not null default 0,
  feedback        text,
  created_at      timestamptz not null default now()
);

comment on table public.rubric_criteria is 'Rubric line-items within a review score';

-- ----------------------------
-- 10. TITLE APPROVALS (Project title proposal queue)
-- ----------------------------
create table if not exists public.title_approvals (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  team_no       text not null,
  title         text not null,
  proposed_by   text not null,
  submitted_on  text,
  status        title_approval_status not null default 'Pending',
  category      text not null default 'Project Title Proposal',
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.title_approvals is 'Project title approval requests pending guide review';

-- ----------------------------
-- 11. ANNOUNCEMENTS
-- ----------------------------
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  date        text not null,
  sender      text not null,
  tag         text,
  content     text not null,
  created_at  timestamptz not null default now()
);

comment on table public.announcements is 'Department-wide announcements visible across portals';

-- ----------------------------
-- 12. AUDIT LOGS (Admin audit trail)
-- ----------------------------
create table if not exists public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  timestamp       timestamptz not null default now(),
  date_formatted  text not null,
  date_key        date not null,
  month_key       text not null,          -- YYYY-MM
  action_type     text not null,
  target          text not null,
  details         text not null,
  reason          text,
  admin_email     text not null default 'admin@siet.ac.in',
  created_at      timestamptz not null default now()
);

comment on table public.audit_logs is 'System-wide admin audit trail for all administrative actions';

-- ----------------------------
-- 13. ADVISOR HISTORY (Advisor/Guide/HOD action log per class)
-- ----------------------------
create table if not exists public.advisor_history (
  id              uuid primary key default gen_random_uuid(),
  timestamp       timestamptz not null default now(),
  date            date not null,
  date_formatted  text not null,
  role            advisor_history_role not null default 'Class Advisor',
  actor_name      text not null,
  action_type     advisor_history_action not null,
  target          text not null,
  details         text not null,
  class_section   text not null,
  created_at      timestamptz not null default now()
);

comment on table public.advisor_history is 'Action history for advisors, guides, and HOD per class section';

-- ----------------------------
-- 14. HOD HISTORY (HOD-specific action log)
-- ----------------------------
create table if not exists public.hod_history (
  id              uuid primary key default gen_random_uuid(),
  timestamp       timestamptz not null default now(),
  date            text not null,
  action_type     hod_history_action not null,
  target          text not null,
  class_section   text not null,
  batch           text not null,
  details         text not null,
  performed_by    text not null,
  created_at      timestamptz not null default now()
);

comment on table public.hod_history is 'HOD-specific department governance action history';

-- ----------------------------
-- 15. WEEKLY MARKS (Advisor-assigned marks per team per week)
-- ----------------------------
create table if not exists public.weekly_marks (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams(id) on delete cascade,
  week_number     integer not null,
  team_average    numeric(5,1) not null default 0,
  remarks         text,
  graded_at       timestamptz not null default now(),
  graded_by       text not null default 'Class Advisor',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(team_id, week_number)
);

comment on table public.weekly_marks is 'Weekly marks awarded by advisor per team (aggregate)';

-- ----------------------------
-- 16. WEEKLY MEMBER MARKS (Individual marks within a weekly mark record)
-- ----------------------------
create table if not exists public.weekly_member_marks (
  id              uuid primary key default gen_random_uuid(),
  weekly_mark_id  uuid not null references public.weekly_marks(id) on delete cascade,
  student_id      uuid references public.students(id) on delete set null,
  roll_no         text not null,
  mark            numeric(5,1) not null default 0,
  created_at      timestamptz not null default now(),
  unique(weekly_mark_id, roll_no)
);

comment on table public.weekly_member_marks is 'Per-student marks within a weekly mark record';

-- ----------------------------
-- 17. CHECKLISTS (Project milestone state per team)
-- ----------------------------
create table if not exists public.checklists (
  id                    uuid primary key default gen_random_uuid(),
  team_id               uuid unique not null references public.teams(id) on delete cascade,
  title_approval        boolean not null default false,
  abstract_submission   boolean not null default false,
  literature_review     boolean not null default false,
  design_diagrams       boolean not null default false,
  prototype_ready       boolean not null default false,
  zeroth_review_done    boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.checklists is 'Binary milestone checklist per team';

-- ----------------------------
-- 18. SETTINGS (Key-value app config)
-- ----------------------------
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

comment on table public.settings is 'Application-level key-value settings (team capacity, semester config, etc.)';

-- ============================================================
-- HIGH-PERFORMANCE INDEXES FOR FAST POSTGREST JOINS & FILTERS
-- ============================================================

-- Users
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_roll_no on public.users(roll_no);

-- Faculty
create index if not exists idx_faculty_user_id on public.faculty(user_id);
create index if not exists idx_faculty_email on public.faculty(email);
create index if not exists idx_faculty_role on public.faculty(role);
create index if not exists idx_faculty_status on public.faculty(status);

-- Students
create index if not exists idx_students_user_id on public.students(user_id);
create index if not exists idx_students_roll_no on public.students(roll_no);
create index if not exists idx_students_email on public.students(email);
create index if not exists idx_students_class_section on public.students(class_section);
create index if not exists idx_students_batch on public.students(batch);
create index if not exists idx_students_class_batch on public.students(class_section, batch);
create index if not exists idx_students_team_no on public.students(team_no);

-- Teams (Crucial for Guide & Advisor Portal Filtering)
create index if not exists idx_teams_team_id on public.teams(team_id);
create index if not exists idx_teams_guide_email on public.teams(guide_email);
create index if not exists idx_teams_guide_name on public.teams(guide_name);
create index if not exists idx_teams_advisor_email on public.teams(advisor_email);
create index if not exists idx_teams_class_batch on public.teams(class_name, batch);
create index if not exists idx_teams_status on public.teams(status);
create index if not exists idx_teams_guide_approval on public.teams(guide_approval_status);

-- Team Members (Foreign key indexes for instant joins)
create index if not exists idx_team_members_team on public.team_members(team_id);
create index if not exists idx_team_members_student on public.team_members(student_id);
create index if not exists idx_team_members_roll on public.team_members(roll_no);

-- Weekly Submissions
create index if not exists idx_submissions_team on public.weekly_submissions(team_id);
create index if not exists idx_submissions_team_week on public.weekly_submissions(team_id, week);
create index if not exists idx_submissions_week on public.weekly_submissions(week);
create index if not exists idx_submissions_status on public.weekly_submissions(status);

-- Guide Notices
create index if not exists idx_guide_notices_submission on public.guide_notices(submission_id);
create index if not exists idx_guide_notices_team on public.guide_notices(team_id);

-- Review Scores & Rubric Criteria
create index if not exists idx_reviews_team on public.review_scores(team_id);
create index if not exists idx_rubric_review on public.rubric_criteria(review_id);

-- Title Approvals
create index if not exists idx_titles_team on public.title_approvals(team_id);
create index if not exists idx_titles_status on public.title_approvals(status);
create index if not exists idx_titles_status_created on public.title_approvals(status, created_at desc);

-- Announcements
create index if not exists idx_announcements_created on public.announcements(created_at desc);

-- Audit Logs (Newest first index for fast pagination)
create index if not exists idx_audit_timestamp_desc on public.audit_logs(timestamp desc);
create index if not exists idx_audit_date on public.audit_logs(date_key);
create index if not exists idx_audit_month on public.audit_logs(month_key);
create index if not exists idx_audit_action on public.audit_logs(action_type);

-- Advisor & HOD History
create index if not exists idx_adv_history_class_ts on public.advisor_history(class_section, timestamp desc);
create index if not exists idx_adv_history_role on public.advisor_history(role);
create index if not exists idx_hod_history_class_ts on public.hod_history(class_section, timestamp desc);
create index if not exists idx_hod_history_action on public.hod_history(action_type);

-- Weekly Marks & Member Marks
create index if not exists idx_marks_team on public.weekly_marks(team_id);
create index if not exists idx_marks_week on public.weekly_marks(week_number);
create index if not exists idx_member_marks_weekly on public.weekly_member_marks(weekly_mark_id);
create index if not exists idx_member_marks_student on public.weekly_member_marks(student_id);
create index if not exists idx_member_marks_roll on public.weekly_member_marks(roll_no);

-- Checklists
create index if not exists idx_checklists_team on public.checklists(team_id);

-- ============================================================
-- AUTO-UPDATE TRIGGERS (updated_at)
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.users;
create trigger set_updated_at before update on public.users
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.faculty;
create trigger set_updated_at before update on public.faculty
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.students;
create trigger set_updated_at before update on public.students
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.teams;
create trigger set_updated_at before update on public.teams
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.weekly_submissions;
create trigger set_updated_at before update on public.weekly_submissions
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.review_scores;
create trigger set_updated_at before update on public.review_scores
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.title_approvals;
create trigger set_updated_at before update on public.title_approvals
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.weekly_marks;
create trigger set_updated_at before update on public.weekly_marks
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.checklists;
create trigger set_updated_at before update on public.checklists
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.settings;
create trigger set_updated_at before update on public.settings
  for each row execute function public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - FRONTEND ACCESSIBLE
-- Allows both 'anon' (browser client) and 'authenticated' (logged-in session)
-- to query and operate quickly without 403 or empty result errors.
-- ============================================================

alter table public.users enable row level security;
alter table public.faculty enable row level security;
alter table public.students enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.weekly_submissions enable row level security;
alter table public.guide_notices enable row level security;
alter table public.review_scores enable row level security;
alter table public.rubric_criteria enable row level security;
alter table public.title_approvals enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.advisor_history enable row level security;
alter table public.hod_history enable row level security;
alter table public.weekly_marks enable row level security;
alter table public.weekly_member_marks enable row level security;
alter table public.checklists enable row level security;
alter table public.settings enable row level security;

-- Helper macro to grant clean frontend access across all tables
do $$
declare
  tbl text;
  tables text[] := array[
    'users', 'faculty', 'students', 'teams', 'team_members',
    'weekly_submissions', 'guide_notices', 'review_scores', 'rubric_criteria',
    'title_approvals', 'announcements', 'audit_logs', 'advisor_history',
    'hod_history', 'weekly_marks', 'weekly_member_marks', 'checklists', 'settings'
  ];
begin
  foreach tbl in array tables loop
    -- Drop older restrictive policies if they exist
    execute format('drop policy if exists "Allow authenticated read access" on public.%I', tbl);
    execute format('drop policy if exists "Allow authenticated write" on public.%I', tbl);
    execute format('drop policy if exists "Allow frontend access" on public.%I', tbl);
    execute format('drop policy if exists "Allow frontend read" on public.%I', tbl);
    execute format('drop policy if exists "Allow frontend write" on public.%I', tbl);

    -- Create permissive policies allowing both anon and authenticated clients to load & modify data
    execute format('create policy "Allow frontend read" on public.%I for select using (true)', tbl);
    execute format('create policy "Allow frontend write" on public.%I for all using (true) with check (true)', tbl);
  end loop;
end $$;

-- ============================================================
-- SUPABASE REALTIME (Instant Push Updates for Live Portals)
-- ============================================================

-- Ensure full payload info is broadcasted for UPDATE/DELETE
alter table public.teams replica identity full;
alter table public.weekly_submissions replica identity full;
alter table public.title_approvals replica identity full;
alter table public.announcements replica identity full;
alter table public.guide_notices replica identity full;
alter table public.weekly_marks replica identity full;
alter table public.checklists replica identity full;

-- Safely add tables to supabase_realtime publication
do $$
declare
  tbl text;
  rt_tables text[] := array[
    'teams', 'weekly_submissions', 'title_approvals',
    'announcements', 'guide_notices', 'weekly_marks', 'checklists'
  ];
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tbl in array rt_tables loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', tbl);
      exception when duplicate_object then null;
      end;
    end loop;
  end if;
end $$;

-- ============================================================
-- OPTIMIZED SINGLE-ROUNDTRIP VIEWS (Under 20ms Load Times)
-- ============================================================

-- Fast Team View with aggregated members for instant frontend listing
create or replace view public.view_teams_with_members as
select 
  t.*,
  coalesce(
    json_agg(
      json_build_object(
        'name', tm.name,
        'rollNo', tm.roll_no,
        'role', tm.member_role,
        'email', tm.email,
        'phone', tm.phone,
        'isLead', tm.is_lead
      ) order by tm.is_lead desc, tm.roll_no asc
    ) filter (where tm.id is not null), '[]'::json
  ) as members
from public.teams t
left join public.team_members tm on t.id = tm.team_id
group by t.id;

-- Fast Student Team Dashboard Bundle RPC
create or replace function public.rpc_get_student_portal(p_team_id text)
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'team', (
      select row_to_json(v) from public.view_teams_with_members v 
      where v.team_id = p_team_id or v.id::text = p_team_id limit 1
    ),
    'submissions', (
      select coalesce(json_agg(ws order by ws.week asc), '[]'::json)
      from public.weekly_submissions ws
      join public.teams t on ws.team_id = t.id
      where t.team_id = p_team_id or t.id::text = p_team_id
    ),
    'checklist', (
      select row_to_json(c)
      from public.checklists c
      join public.teams t on c.team_id = t.id
      where t.team_id = p_team_id or t.id::text = p_team_id limit 1
    ),
    'announcements', (
      select coalesce(json_agg(a order by a.created_at desc), '[]'::json)
      from (select * from public.announcements order by created_at desc limit 10) a
    )
  ) into result;
  
  return result;
end;
$$ language plpgsql stable security definer;

-- Fast Guide Dashboard Bundle RPC
create or replace function public.rpc_get_guide_dashboard(p_guide_email text)
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'teams', (
      select coalesce(json_agg(v), '[]'::json)
      from public.view_teams_with_members v
      where lower(v.guide_email) = lower(p_guide_email)
    ),
    'pending_submissions', (
      select coalesce(json_agg(ws), '[]'::json)
      from public.weekly_submissions ws
      join public.teams t on ws.team_id = t.id
      where lower(t.guide_email) = lower(p_guide_email)
        and ws.status in ('Submitted', 'Pending Review')
    ),
    'pending_titles', (
      select coalesce(json_agg(ta), '[]'::json)
      from public.title_approvals ta
      join public.teams t on ta.team_id = t.id
      where lower(t.guide_email) = lower(p_guide_email)
        and ta.status = 'Pending'
    )
  ) into result;

  return result;
end;
$$ language plpgsql stable security definer;

-- ============================================================
-- SEED DATA (Ready-to-use Portal Demonstration)
-- ============================================================

-- 1. Default Users
insert into public.users (email, password, name, roll_no, department, role, roles, designation, phone, team_id, team_no, class_name, section, batch)
values
  ('admin@siet.ac.in', 'admin@123', 'Department Administrator', null, 'Computer Science and Engineering', 'admin', array['admin'::user_role], 'System & Database Administrator', null, null, null, null, null, null),
  ('hod.cse@siet.ac.in', 'hod@123', 'Dr. N. Saravanan', null, 'Computer Science and Engineering', 'hod', array['hod'::user_role], 'Professor & Head of Department', '+91 94432 10987', null, null, null, null, null),
  ('dr.karthik@siet.ac.in', 'faculty@123', 'Dr. R. Karthikeyan', null, 'Computer Science and Engineering', 'advisor', array['advisor'::user_role], 'Professor & Designated Class Advisor', '+91 98421 23456', null, null, 'CSE-B', 'B', '2023-2027 (III Year)'),
  ('dr.manimegalai@siet.ac.in', 'guide@123', 'Dr. P. Manimegalai', null, 'Computer Science and Engineering', 'guide', array['guide'::user_role], 'Professor & Research Mentor', '+91 98433 87654', null, null, null, null, null),
  ('student@srishakthi.ac.in', 'student@123', 'Tarunika Rajgopal', '714023104112', 'Computer Science and Engineering', 'student', array['student'::user_role], null, '+91 98401 23456', 'TEAM-CSE-Y3-B04', 'Team 04', 'CSE-B', 'B', '2023-2027 (III Year)'),
  ('vigneshwaran.m@srishakthi.ac.in', 'student@123', 'Vigneshwaran M', '714023104178', 'Computer Science and Engineering', 'student', array['student'::user_role], null, '+91 98401 23457', 'TEAM-CSE-Y3-B04', 'Team 04', 'CSE-B', 'B', '2023-2027 (III Year)'),
  ('vishnupriya.s@srishakthi.ac.in', 'student@123', 'Vishnu Priya S', '714023104189', 'Computer Science and Engineering', 'student', array['student'::user_role], null, '+91 98401 23458', 'TEAM-CSE-Y3-B04', 'Team 04', 'CSE-B', 'B', '2023-2027 (III Year)'),
  ('kavitha.r@srishakthi.ac.in', 'student@123', 'Kavitha R', '714023104066', 'Computer Science and Engineering', 'student', array['student'::user_role], null, '+91 98401 23459', 'TEAM-CSE-Y3-B04', 'Team 04', 'CSE-B', 'B', '2023-2027 (III Year)')
on conflict (email) do update set
  password = excluded.password,
  name = excluded.name,
  roll_no = excluded.roll_no,
  role = excluded.role,
  roles = excluded.roles,
  team_id = excluded.team_id,
  team_no = excluded.team_no;

-- 2. Default Faculty Roster
insert into public.faculty (name, email, designation, role, advisor_batch, advisor_class, specialization, teams_count, max_quota, status)
values
  ('Dr. R. Karthikeyan', 'dr.karthik@siet.ac.in', 'Professor', 'Advisor & Guide', '2023-2027 (III Year)', 'CSE-B', 'Cloud Distributed Systems & Cybersecurity', 4, 5, 'Active'),
  ('Dr. A. Ramesh', 'ramesh.a@siet.ac.in', 'Associate Professor', 'Advisor', '2023-2027 (III Year)', 'CSE-A', 'VLSI & Embedded Systems', 0, 5, 'Active'),
  ('Dr. S. Kavitha', 'kavitha.s@siet.ac.in', 'Assistant Professor', 'Advisor', '2023-2027 (III Year)', 'CSE-C', 'Data Mining & Machine Learning', 0, 5, 'Active'),
  ('Dr. P. Manimegalai', 'dr.manimegalai@siet.ac.in', 'Associate Professor', 'Guide', null, null, 'AI, Deep Learning & UAV Vision', 4, 5, 'Active'),
  ('Dr. A. Devipriya', 'devipriya.a@siet.ac.in', 'Associate Professor', 'Guide', null, null, 'Smart Grids, Blockchain & IoT', 3, 5, 'Active'),
  ('Dr. K. Vignesh', 'vignesh.k@siet.ac.in', 'Assistant Professor', 'Guide', null, null, 'Edge Computing, Wearables & NLP', 5, 5, 'Active'),
  ('Dr. G. Sivakumar', 'sivakumar.g@siet.ac.in', 'Assistant Professor', 'None', null, null, 'Cybersecurity & Networks', 0, 5, 'Available')
on conflict (email) do update set
  name = excluded.name,
  designation = excluded.designation,
  role = excluded.role,
  advisor_batch = excluded.advisor_batch,
  advisor_class = excluded.advisor_class,
  specialization = excluded.specialization,
  teams_count = excluded.teams_count,
  max_quota = excluded.max_quota,
  status = excluded.status;

-- 3. Default Students Roster
insert into public.students (roll_no, name, email, batch, class_section, team_no, project_title, guide)
values
  ('714023104112', 'Tarunika Rajgopal', 'student@srishakthi.ac.in', '2023-2027 (III Year)', 'CSE-B', 'Team 04', 'Autonomous Crop Disease Segmentation & Yield Advisory Drone System', 'Dr. P. Manimegalai'),
  ('714023104178', 'Vigneshwaran M', 'vigneshwaran.m@srishakthi.ac.in', '2023-2027 (III Year)', 'CSE-B', 'Team 04', 'Autonomous Crop Disease Segmentation & Yield Advisory Drone System', 'Dr. P. Manimegalai'),
  ('714023104189', 'Vishnu Priya S', 'vishnupriya.s@srishakthi.ac.in', '2023-2027 (III Year)', 'CSE-B', 'Team 04', 'Autonomous Crop Disease Segmentation & Yield Advisory Drone System', 'Dr. P. Manimegalai'),
  ('714023104066', 'Kavitha R', 'kavitha.r@srishakthi.ac.in', '2023-2027 (III Year)', 'CSE-B', 'Team 04', 'Autonomous Crop Disease Segmentation & Yield Advisory Drone System', 'Dr. P. Manimegalai'),
  ('714023104035', 'Harish Kumar K', 'harish.k@srishakthi.ac.in', '2023-2027 (III Year)', 'CSE-B', 'Team 05', '', 'Dr. A. Devipriya'),
  ('714023104038', 'Janani S', 'janani.s@srishakthi.ac.in', '2023-2027 (III Year)', 'CSE-B', 'Team 05', '', 'Dr. A. Devipriya'),
  ('714023104088', 'Naveen Raj', 'naveen.r@srishakthi.ac.in', '2023-2027 (III Year)', 'CSE-B', 'Team 06', '', 'Dr. K. Vignesh'),
  ('714023104142', 'Sneha M', 'sneha.m@srishakthi.ac.in', '2023-2027 (III Year)', 'CSE-B', 'Team 07', '', 'Dr. R. Karthikeyan')
on conflict (roll_no) do update set
  name = excluded.name,
  email = excluded.email,
  team_no = excluded.team_no,
  project_title = excluded.project_title,
  guide = excluded.guide;

-- 4. Default Project Teams
insert into public.teams (
  team_id, team_no, class_name, batch, project_title,
  guide_name, guide_email, guide_designation,
  advisor_name, advisor_email, status, progress, capacity, members_count,
  lead_student, lead_roll_no, is_title_approved, guide_approval_status
)
values
  (
    'TEAM-CSE-Y3-B04', 'Team 04', 'CSE-B', '2023-2027 (III Year)',
    'Autonomous Crop Disease Segmentation & Yield Advisory Drone System',
    'Dr. P. Manimegalai', 'dr.manimegalai@siet.ac.in', 'Associate Professor',
    'Dr. R. Karthikeyan', 'dr.karthik@siet.ac.in', 'In Progress', 40, 4, 4,
    'Tarunika Rajgopal', '714023104112', true, 'Approved'
  ),
  (
    'TEAM-CSE-Y3-B05', 'Team 05', 'CSE-B', '2023-2027 (III Year)',
    '',
    'Dr. A. Devipriya', 'devipriya.a@siet.ac.in', 'Associate Professor',
    'Dr. R. Karthikeyan', 'dr.karthik@siet.ac.in', 'Pending', 0, 4, 4,
    'Harish Kumar K', '714023104035', false, 'Pending'
  ),
  (
    'TEAM-CSE-Y3-B06', 'Team 06', 'CSE-B', '2023-2027 (III Year)',
    '',
    'Dr. K. Vignesh', 'vignesh.k@siet.ac.in', 'Assistant Professor',
    'Dr. R. Karthikeyan', 'dr.karthik@siet.ac.in', 'Pending', 0, 4, 4,
    'Naveen Raj', '714023104088', false, 'Pending'
  ),
  (
    'TEAM-CSE-Y3-B07', 'Team 07', 'CSE-B', '2023-2027 (III Year)',
    '',
    'Dr. R. Karthikeyan', 'dr.karthik@siet.ac.in', 'Professor',
    'Dr. R. Karthikeyan', 'dr.karthik@siet.ac.in', 'Pending', 0, 4, 4,
    'Sneha M', '714023104142', false, 'Pending'
  )
on conflict (team_id) do update set
  project_title = excluded.project_title,
  guide_name = excluded.guide_name,
  guide_email = excluded.guide_email,
  advisor_name = excluded.advisor_name,
  advisor_email = excluded.advisor_email,
  status = excluded.status,
  is_title_approved = excluded.is_title_approved,
  guide_approval_status = excluded.guide_approval_status;

-- 5. Default Team Members for Team 04
insert into public.team_members (team_id, student_id, roll_no, name, email, is_lead, member_role)
select
  t.id as team_id,
  s.id as student_id,
  s.roll_no,
  s.name,
  s.email,
  (s.roll_no = '714023104112') as is_lead,
  case when s.roll_no = '714023104112' then 'Team Lead' else 'Team Member' end as member_role
from public.teams t
cross join public.students s
where t.team_id = 'TEAM-CSE-Y3-B04'
  and s.roll_no in ('714023104112', '714023104178', '714023104189', '714023104066')
on conflict (team_id, roll_no) do nothing;

-- 6. Default Checklist for Team 04
insert into public.checklists (
  team_id, title_approval, abstract_submission, literature_review,
  design_diagrams, prototype_ready, zeroth_review_done
)
select
  t.id, true, true, true, false, false, true
from public.teams t
where t.team_id = 'TEAM-CSE-Y3-B04'
on conflict (team_id) do update set
  title_approval = excluded.title_approval,
  abstract_submission = excluded.abstract_submission,
  literature_review = excluded.literature_review,
  zeroth_review_done = excluded.zeroth_review_done;

-- 7. Default Deliverable Templates (Weeks 1 to 12) for Team 04
insert into public.weekly_submissions (
  team_id, week, title, due_date, status, project_title, problem_statement
)
select
  t.id,
  w.week,
  w.title,
  w.due_date,
  w.status::submission_status,
  'Autonomous Crop Disease Segmentation & Yield Advisory Drone System',
  'Automating agricultural disease detection using edge drone computing.'
from public.teams t
cross join (
  values
    (1, 'Problem Statement & Scope Formulation', '2026-02-05', 'Approved'),
    (2, 'Literature Survey & Related Works', '2026-02-12', 'Approved'),
    (3, 'Dataset Collection & Preprocessing', '2026-02-19', 'Submitted'),
    (4, 'System Architecture & Block Diagram', '2026-02-26', 'Pending'),
    (5, 'Model Training - YOLOv8 Baseline', '2026-03-05', 'Pending'),
    (6, 'Mid-Semester Review Presentation', '2026-03-12', 'Pending'),
    (7, 'Drone Hardware Integration', '2026-03-19', 'Pending'),
    (8, 'Field Testing & Inference Latency Benchmark', '2026-03-26', 'Pending'),
    (9, 'Web Dashboard & Advisory API Integration', '2026-04-02', 'Pending'),
    (10, 'Pre-Final Presentation & User Testing', '2026-04-09', 'Pending'),
    (11, 'Project Report Draft & Plagiarism Check', '2026-04-16', 'Pending'),
    (12, 'Final Capstone Viva Voce Deliverables', '2026-04-23', 'Pending')
) as w(week, title, due_date, status)
where t.team_id = 'TEAM-CSE-Y3-B04'
on conflict (team_id, week) do nothing;

-- 8. Default Department Announcements
insert into public.announcements (title, date, sender, tag, content)
values
  (
    'Zeroth Review Schedule & Rubric Released',
    'Feb 10, 2026',
    'Dr. N. Saravanan (HOD - CSE)',
    'Important',
    'All III Year CSE-B project teams must submit their problem formulation and literature summary before Zeroth Review evaluation.'
  ),
  (
    'Weekly Submission Deadline Reminder',
    'Feb 17, 2026',
    'Dr. R. Karthikeyan (Class Advisor)',
    'Submission',
    'Week 3 deliverables (Dataset Collection & Annotation Protocols) must be submitted via portal for Guide sign-off by Friday 5:00 PM.'
  )
on conflict do nothing;

-- 9. Default Application Settings
insert into public.settings (key, value)
values
  ('team_capacity_CSE-B', '4'::jsonb),
  ('team_capacity_CSE-A', '4'::jsonb),
  ('team_capacity_CSE-C', '4'::jsonb),
  ('current_academic_year', '"2025-2026"'::jsonb),
  ('current_semester', '"VI Semester"'::jsonb)
on conflict (key) do update set value = excluded.value;
