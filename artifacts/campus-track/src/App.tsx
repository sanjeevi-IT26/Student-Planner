import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  getGetCurrentUserQueryKey, getGetGroupReportQueryKey, getGetMyPointsQueryKey, getGetTaskStatsQueryKey,
  getListFacultyQueryKey, getListGroupMembersQueryKey, getListGroupsQueryKey, getListTasksQueryKey,
  useAddFaculty, useAwardPoints, useCreateGroup, useCreateGroupAssignment, useCreateTask,
  useDeleteTask, useGetCurrentUser, useGetGroupReport, useGetMyPoints, useGetTaskStats, useJoinGroup,
  useListFaculty, useListGroupMembers, useListGroups, useListTasks, useUpdateGroupMemberRole,
  useUpdateTask, useUpdateTaskStatus,
} from "@workspace/api-client-react";
import type { GroupMember, GroupReportEntry, GroupSummary, Task } from "@workspace/api-client-react";
import {
  ArrowDownRight, ArrowRight, Award, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown,
  Clipboard, Clock3, Copy, GraduationCap, LayoutDashboard, ListTodo, LogOut, Menu, Plus, Search,
  Sparkles, Users, X,
} from "lucide-react";
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import { formatTaskDate, localDateInputValue, taskDateInputValue } from "@/lib/task-date";
import "./index.css";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const clerkAppearance = {
  theme: shadcn, cssLayerName: "clerk",
  options: { logoPlacement: "inside" as const, logoLinkUrl: basePath || "/", logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
  variables: { colorPrimary: "#e85d42", colorForeground: "#19302a", colorMutedForeground: "#6b7d74", colorDanger: "#c83e43", colorBackground: "#fffaf1", colorInput: "#fffdf8", colorInputForeground: "#19302a", colorNeutral: "#d8e2d7", fontFamily: "Manrope, sans-serif", borderRadius: "1rem" },
  elements: {
    rootBox: "w-full flex justify-center", cardBox: "bg-[#fffaf1] rounded-[24px] w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none", footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#19302a] font-display", headerSubtitle: "text-[#6b7d74]", socialButtonsBlockButtonText: "text-[#19302a]",
    formFieldLabel: "text-[#19302a]", footerActionLink: "text-[#e85d42] font-semibold", footerActionText: "text-[#6b7d74]",
    dividerText: "text-[#6b7d74]", identityPreviewEditButton: "text-[#e85d42]", formFieldSuccessText: "text-[#39785d]",
    alertText: "text-[#c83e43]", logoBox: "mb-4", logoImage: "w-10 h-10",
    socialButtonsBlockButton: "border-[#d8e2d7] hover:bg-[#f3eee4]", formButtonPrimary: "bg-[#e85d42] hover:bg-[#cf4f36] text-white shadow-md",
    formFieldInput: "bg-[#fffdf8] border-[#d8e2d7] text-[#19302a]", footerAction: "border-t border-[#e5e3da] mt-4 pt-4",
    dividerLine: "bg-[#d8e2d7]", alert: "bg-[#fff0ed] border-[#f2c8bd]", otpCodeFieldInput: "border-[#d8e2d7] text-[#19302a]",
    formFieldRow: "gap-2", main: "px-2",
  },
};
type Priority = "Low" | "Medium" | "High";
const categories = ["Coursework", "Personal", "Clubs", "Wellbeing"];
const dateToday = () => new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
const dateTime = (value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <Loading />;
  return isSignedIn ? <Redirect to="/dashboard" /> : <Landing />;
}

function Landing() {
  const [, navigate] = useLocation();
  return <main className="landing">
    <nav className="landing-nav wrap"><a className="brand" href={basePath || "/"} data-testid="link-brand-home"><span className="brand-mark"><Sparkles size={17} /></span>Campus<span className="brand-highlight">Track</span></a>
      <div className="nav-actions"><button className="btn btn-quiet" data-testid="link-sign-in" onClick={() => navigate("/sign-in")}>Sign in</button><button className="btn btn-primary" data-testid="link-get-started" onClick={() => navigate("/sign-up")}>Get started <ArrowRight size={16} /></button></div>
    </nav>
    <section className="hero wrap">
      <div className="hero-text"><div className="eyebrow"><span className="eyebrow-dot" /> A steadier semester starts here</div><h1>Good work,<br /><em>at your pace.</em></h1>
        <p>Keep your own plans close. Find your people. See the progress you make together.</p>
        <div className="hero-buttons"><button className="btn btn-primary btn-big" data-testid="link-student-entry" onClick={() => navigate("/sign-in")}>Student sign in <ArrowRight size={17} /></button><button className="btn btn-outline btn-big" data-testid="link-faculty-entry" onClick={() => navigate("/sign-in")}>Faculty sign in <ArrowRight size={17} /></button></div>
        <div className="entry-note">Your CampusTrack access is set by your institution.</div>
      </div>
      <div className="hero-visual" aria-label="Preview of a student planner">
        <div className="visual-ellipse" /><div className="planner-card">
          <div className="planner-meta"><span>MY WEEK</span><span>OCT 14 — 20</span></div><h2>A little progress<br />goes a long way.</h2>
          <div className="progress-line"><span style={{ width: "61%" }} /></div><div className="progress-caption"><span>Weekly rhythm</span><strong>4 of 7 done</strong></div>
          <div className="preview-task completed"><span className="preview-check"><Check size={12} /></span><div><b>Read seminar notes</b><small>History · Today</small></div><CheckCircle2 size={16} /></div>
          <div className="preview-task"><span className="preview-check hollow" /><div><b>Draft the reflection</b><small>Writing · Tomorrow</small></div><span className="priority-chip">HIGH</span></div>
          <div className="preview-task"><span className="preview-check hollow" /><div><b>Meet the study group</b><small>Biology · Friday</small></div></div>
        </div>
        <div className="points-float"><span className="points-symbol"><Award size={19} /></span><span><b>+20 points</b><small>for showing up early</small></span></div>
        <div className="orbit-stamp">PLAN<br />TOGETHER</div>
      </div>
    </section>
    <section className="landing-story wrap">
      <div className="story-head"><span className="section-tag">A calmer way to move forward</span><h2>Personal plans.<br /><i>Shared momentum.</i></h2></div>
      <div className="story-grid"><article><span className="story-number">01</span><div className="story-icon"><ListTodo size={20} /></div><h3>Your work, in view</h3><p>Keep coursework and personal priorities in one list. Start with what matters today.</p></article><article><span className="story-number">02</span><div className="story-icon sage"><Users size={20} /></div><h3>Groups with purpose</h3><p>Join a class group with a code, stay close to shared assignments, and know where you stand.</p></article><article><span className="story-number">03</span><div className="story-icon gold"><Award size={20} /></div><h3>Progress that adds up</h3><p>Earn points for timely work and see a clear history of every award and adjustment.</p></article></div>
      <div className="faculty-band"><div><span className="section-tag">For faculty</span><h3>Less chasing. More teaching.</h3><p>Coordinate multiple groups, assign work, and see student progress at a glance.</p></div><button className="btn btn-dark" data-testid="link-faculty-learn" onClick={() => navigate("/sign-in")}>Faculty sign in <ArrowRight size={16} /></button></div>
    </section>
    <footer className="landing-footer wrap"><a className="brand" href={basePath || "/"} data-testid="link-footer-home"><span className="brand-mark"><Sparkles size={14} /></span>Campus<span className="brand-highlight">Track</span></a><span>Make room for your next win.</span></footer>
  </main>;
}

function Dashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <Loading />;
  if (!isSignedIn) return <Redirect to="/" />;
  return <RolePortal />;
}

function RolePortal() {
  const profile = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } });
  const { signOut } = useClerk();
  const { user } = useUser();
  if (profile.isLoading) return <Loading />;
  if (profile.isError || !profile.data) return <main className="center-state"><div className="empty-mark"><Sparkles /></div><h2>We couldn’t load your workspace</h2><p>Your account is signed in, but CampusTrack could not retrieve its profile.</p><button className="btn btn-outline" onClick={() => void profile.refetch()} data-testid="button-retry-profile">Try again</button></main>;
  return profile.data.role === "faculty"
    ? <FacultyPortal profile={profile.data} onSignOut={() => void signOut({ redirectUrl: basePath || "/" })} />
    : <StudentPortal profile={profile.data} clerkName={user?.firstName || ""} onSignOut={() => void signOut({ redirectUrl: basePath || "/" })} />;
}

function AppFrame({ children, role, name, email, onSignOut }: { children: ReactNode; role: string; name: string; email: string; onSignOut: () => void }) {
  const [menu, setMenu] = useState(false);
  return <div className="workspace">
    <aside className={`sidebar ${menu ? "sidebar-open" : ""}`}><div className="sidebar-brand"><a className="brand" href={basePath || "/"} data-testid="link-sidebar-home"><span className="brand-mark"><Sparkles size={15} /></span>Campus<span className="brand-highlight">Track</span></a><button className="mobile-close" onClick={() => setMenu(false)} aria-label="Close menu" data-testid="button-close-menu"><X size={18} /></button></div>
      <div className="sidebar-caption">YOUR WORKSPACE</div><div className="side-note"><span className="side-note-icon">{role === "faculty" ? <GraduationCap size={17} /> : <BookOpen size={17} />}</span><div><b>{role === "faculty" ? "Faculty desk" : "Student planner"}</b><small>{role === "faculty" ? "Groups & progress" : "Your plans & groups"}</small></div></div>
      <div className="sidebar-bottom"><div className="sidebar-tip"><Sparkles size={16} /><span>Small steps count.<br />Keep showing up.</span></div><div className="account-row"><div className="account-avatar">{name.slice(0, 1).toUpperCase() || email.slice(0, 1).toUpperCase()}</div><div className="account-meta"><b data-testid="text-account-name">{name || "CampusTrack member"}</b><small>{email}</small></div><button className="logout-button" title="Sign out" onClick={onSignOut} data-testid="button-sign-out"><LogOut size={16} /></button></div></div>
    </aside>
    {menu && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMenu(false)} data-testid="button-dismiss-menu" />}
    <main className="main-content"><header className="page-header"><button className="mobile-menu" onClick={() => setMenu(true)} aria-label="Open menu" data-testid="button-open-menu"><Menu size={21} /></button><div><p className="date-kicker">{dateToday()}</p><h1>{role === "faculty" ? "Your groups, in focus." : `Welcome back${name ? `, ${name.split(" ")[0]}` : ""}.`}</h1></div><span className="role-pill">{role === "faculty" ? "Faculty" : "Student"}</span></header>{children}</main>
  </div>;
}

function StudentPortal({ profile, clerkName, onSignOut }: { profile: { displayName: string; email: string }; clerkName: string; onSignOut: () => void }) {
  const qc = useQueryClient();
  const tasksQ = useListTasks({ query: { queryKey: getListTasksQueryKey() } });
  const statsQ = useGetTaskStats({ query: { queryKey: getGetTaskStatsQueryKey() } });
  const groupsQ = useListGroups({ query: { queryKey: getListGroupsQueryKey() } });
  const pointsQ = useGetMyPoints({ query: { queryKey: getGetMyPointsQueryKey() } });
  const status = useUpdateTaskStatus({ mutation: { onSuccess: () => { void qc.invalidateQueries({ queryKey: getListTasksQueryKey() }); void qc.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() }); void qc.invalidateQueries({ queryKey: getGetMyPointsQueryKey() }); } } });
  const createTask = useCreateTask({ mutation: { onSuccess: () => { void qc.invalidateQueries({ queryKey: getListTasksQueryKey() }); void qc.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() }); setTaskOpen(false); } } });
  const editTask = useUpdateTask({ mutation: { onSuccess: () => { void qc.invalidateQueries({ queryKey: getListTasksQueryKey() }); void qc.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() }); setEditing(null); } } });
  const deleteTask = useDeleteTask({ mutation: { onSuccess: () => { void qc.invalidateQueries({ queryKey: getListTasksQueryKey() }); void qc.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() }); } } });
  const joinGroup = useJoinGroup({ mutation: { onSuccess: () => { void qc.invalidateQueries({ queryKey: getListGroupsQueryKey() }); setJoinCode(""); setJoinOpen(false); } } });
  const [filter, setFilter] = useState<"all" | "today" | "done">("all");
  const [search, setSearch] = useState("");
  const [taskOpen, setTaskOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [adminGroup, setAdminGroup] = useState<GroupSummary | null>(null);
  const adminGroupId = adminGroup?.id ?? 0;
  const adminMembersQ = useListGroupMembers(adminGroupId, { query: { enabled: !!adminGroup, queryKey: getListGroupMembersQueryKey(adminGroupId) } });
  const groupAssignment = useCreateGroupAssignment({ mutation: { onSuccess: () => { void qc.invalidateQueries({ queryKey: getListTasksQueryKey() }); void qc.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() }); setAdminGroup(null); } } });
  const tasks = tasksQ.data ?? [];
  const visibleTasks = useMemo(() => tasks.filter(t => (filter === "all" || (filter === "today" && t.dueDate.slice(0, 10) === localDateInputValue()) || (filter === "done" && t.isCompleted)) && `${t.title} ${t.category}`.toLowerCase().includes(search.toLowerCase())), [tasks, filter, search]);
  const personalTasks = visibleTasks.filter(t => t.assignmentId === null);
  const assignedTasks = visibleTasks.filter(t => t.assignmentId !== null);
  const displayName = profile.displayName || clerkName || "Student";
  const onTaskSubmit = (draft: TaskDraft) => {
    if (editing) editTask.mutate({ taskId: editing.id, data: draft });
    else createTask.mutate({ data: { ...draft, recurrence: "None" } });
  };
  return <AppFrame role="student" name={displayName} email={profile.email} onSignOut={onSignOut}>
    <section className="welcome-panel student-welcome"><div><span className="overline">YOUR SPACE</span><h2>One step at a time.</h2><p>{statsQ.data?.dueSoon ?? 0} tasks coming up this week. You’re building a good rhythm.</p></div><div className="welcome-graphic"><span>WEEKLY<br />RHYTHM</span><strong>{statsQ.data?.completionRate ?? 0}<small>%</small></strong></div></section>
    <section className="metric-row"><Metric label="Tasks in your plan" value={statsQ.data?.total ?? tasks.length} icon={<ListTodo size={18} />} tone="peach" /><Metric label="Completed" value={statsQ.data?.completed ?? tasks.filter(t => t.isCompleted).length} icon={<CheckCircle2 size={18} />} tone="sage" /><Metric label="Points earned" value={pointsQ.data?.total ?? 0} icon={<Award size={18} />} tone="gold" /></section>
    <section className="content-section">
      <div className="section-header"><div><span className="overline">YOUR PLANNER</span><h2>Tasks</h2></div><button className="btn btn-primary" onClick={() => { setEditing(null); setTaskOpen(true); }} data-testid="button-add-personal-task"><Plus size={16} /> Add personal task</button></div>
      <div className="task-tools"><div className="tabs">{(["all", "today", "done"] as const).map(v => <button key={v} onClick={() => setFilter(v)} className={filter === v ? "tab active" : "tab"} data-testid={`filter-tasks-${v}`}>{v === "all" ? "All tasks" : v === "today" ? "Today" : "Completed"}</button>)}</div><label className="search-control"><Search size={15} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks" aria-label="Search tasks" data-testid="input-search-tasks" /></label></div>
        {tasksQ.isLoading ? <SkeletonList /> : tasksQ.isError ? <PanelState title="Your tasks are taking a moment" detail="We couldn’t load your planner. Try again shortly." action={<button className="btn btn-outline" onClick={() => void tasksQ.refetch()} data-testid="button-retry-tasks">Try again</button>} /> : <><TaskGroup title="Assigned to you" tasks={assignedTasks} onToggle={t => status.mutate({ taskId: t.id, data: { isCompleted: !t.isCompleted } })} onEdit={() => undefined} onDelete={() => undefined} busy={status.isPending} assigned />
         {personalTasks.length ? <TaskGroup title="Your personal tasks" tasks={personalTasks} onToggle={t => status.mutate({ taskId: t.id, data: { isCompleted: !t.isCompleted } })} onEdit={t => { setEditing(t); setTaskOpen(true); }} onDelete={t => { if (window.confirm(`Delete “${t.title}”?`)) deleteTask.mutate({ taskId: t.id }); }} busy={status.isPending || deleteTask.isPending} /> : <PanelState title={search ? "No tasks found" : "A little space for your first plan"} detail={search ? "Try a different search." : "Add one specific thing you want to move forward today."} action={!search ? <button className="btn btn-primary" onClick={() => setTaskOpen(true)} data-testid="button-first-task"><Plus size={15} /> Add a task</button> : null} />}</>}
    </section>
    <section className="lower-grid">
      <div className="surface-card"><div className="section-header compact"><div><span className="overline">YOUR CIRCLES</span><h2>Groups</h2></div><button className="btn btn-outline btn-small" onClick={() => setJoinOpen(true)} data-testid="button-join-group"><Plus size={15} /> Join a group</button></div>
        {groupsQ.isLoading ? <SkeletonList /> : groupsQ.isError ? <InlineError retry={() => void groupsQ.refetch()} testId="button-retry-groups" /> : (groupsQ.data ?? []).length ? <div className="group-list">{groupsQ.data!.map(g => <article className="group-row" key={g.id} data-testid={`group-card-${g.id}`}><span className="group-avatar"><Users size={17} /></span><div className="grow"><b>{g.name}</b><small>{g.memberCount} members · {g.accessRole === "admin" ? "Group admin" : "Member"}</small></div><span className="group-code">{g.joinCode}</span>{g.accessRole === "admin" && <button className="btn btn-outline btn-small" onClick={() => setAdminGroup(g)} data-testid={`button-admin-assign-${g.id}`}>Assign work</button>}</article>)}</div> : <p className="muted-copy">No groups yet. Join with a code from your faculty.</p>}
      </div>
      <div className="surface-card points-card"><div className="section-header compact"><div><span className="overline">MOMENTUM</span><h2>Points history</h2></div><div className="points-total"><strong>{pointsQ.data?.total ?? "—"}</strong><small>total points</small></div></div>
        {pointsQ.isLoading ? <SkeletonList /> : pointsQ.isError ? <InlineError retry={() => void pointsQ.refetch()} testId="button-retry-points" /> : pointsQ.data?.entries.length ? <div className="history-list">{pointsQ.data.entries.slice(0, 6).map(entry => <div className="history-row" key={entry.id} data-testid={`point-entry-${entry.id}`}><span className={`history-icon ${entry.points < 0 ? "negative" : ""}`}>{entry.points < 0 ? <ArrowDownRight size={16} /> : <Award size={16} />}</span><div className="grow"><b>{entry.reason}</b><small>{dateTime(entry.createdAt)}</small></div><strong className={entry.points < 0 ? "negative-text" : "positive-text"}>{entry.points > 0 ? "+" : ""}{entry.points}</strong></div>)}</div> : <p className="muted-copy">Your point history will appear here as work is completed.</p>}
        <p className="points-rule" data-testid="text-points-rule">Task points: 20 before the due date, 10 on the due date, 0 one day late, −5 at 2–4 days late, and −10 after 4 days. Due dates use an end-of-day cutoff.</p>
      </div>
    </section>
    {joinOpen && <Modal title="Join a group" subtitle="Use the code shared by your faculty." close={() => setJoinOpen(false)}><form onSubmit={e => { e.preventDefault(); if (joinCode.trim()) joinGroup.mutate({ data: { code: joinCode.trim() } }); }}><Field label="Group code"><input className="input" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="e.g. BIO-204" maxLength={24} required data-testid="input-group-code" /></Field>{joinGroup.isError && <p className="error-copy">That code didn’t work. Check it and try again.</p>}<ModalActions close={() => setJoinOpen(false)} saving={joinGroup.isPending} submitLabel="Join group" testId="button-submit-join" /></form></Modal>}
    {taskOpen && <TaskModal task={editing} saving={createTask.isPending || editTask.isPending} error={createTask.isError || editTask.isError} close={() => { setTaskOpen(false); setEditing(null); }} submit={onTaskSubmit} />}
    {adminGroup && adminMembersQ.isLoading && <Modal title="Loading group members" subtitle={`Preparing an assignment for ${adminGroup.name}.`} close={() => setAdminGroup(null)}><SkeletonList /></Modal>}
    {adminGroup && adminMembersQ.isError && <Modal title="Group members unavailable" subtitle="Try loading the member list again." close={() => setAdminGroup(null)}><InlineError retry={() => void adminMembersQ.refetch()} testId="button-retry-admin-assignment-members" /></Modal>}
    {adminGroup && !adminMembersQ.isLoading && !adminMembersQ.isError && <AssignmentModal group={adminGroup} members={adminMembersQ.data ?? []} saving={groupAssignment.isPending} error={groupAssignment.isError} close={() => setAdminGroup(null)} submit={data => groupAssignment.mutate({ groupId: adminGroup.id, data })} />}
  </AppFrame>;
}

type TaskDraft = { title: string; category: string; dueDate: string; priority: Priority };
function TaskGroup({ title, tasks, onToggle, onEdit, onDelete, busy, assigned = false }: { title: string; tasks: Task[]; onToggle: (task: Task) => void; onEdit: (task: Task) => void; onDelete: (task: Task) => void; busy: boolean; assigned?: boolean }) {
  return <div className="task-group"><h3 className="list-label">{title}<span>{tasks.length}</span></h3>{tasks.length ? tasks.map(task => <article className={`task-item ${task.isCompleted ? "is-done" : ""}`} key={task.id} data-testid={`task-row-${task.id}`}><button className={`task-toggle ${task.isCompleted ? "toggled" : ""}`} onClick={() => onToggle(task)} disabled={busy} aria-label={task.isCompleted ? "Mark not finished" : "Report finished"} data-testid={`button-task-status-${task.id}`}>{task.isCompleted && <Check size={14} />}</button><div className="task-info"><b>{task.title}</b><small><span className="category-mark" />{task.category}<i />Due {formatTaskDate(task.dueDate)}</small>{task.isCompleted && <span className="completion-note">Reported finished · {task.pointsAwarded} points</span>}{task.isCompleted && task.pointsAwarded === 0 && <span className="late-note">Completed one day late — this task earned 0 points. Turning it in still counts.</span>}</div><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>{assigned ? <span className="assigned-tag">Assigned</span> : <div className="row-actions"><button onClick={() => onEdit(task)} aria-label="Edit task" title="Edit task" data-testid={`button-edit-task-${task.id}`}><span className="sr-only">Edit</span><ChevronDown size={15} /></button><button onClick={() => onDelete(task)} aria-label="Delete task" title="Delete task" data-testid={`button-delete-task-${task.id}`}><span className="sr-only">Delete</span><X size={15} /></button></div>}</article>) : <p className="muted-copy small-empty">{assigned ? "Group assignments will show here." : "Nothing in this view yet."}</p>}</div>;
}

function TaskModal({ task, close, submit, saving, error }: { task: Task | null; close: () => void; submit: (draft: TaskDraft) => void; saving: boolean; error: boolean }) {
  const [draft, setDraft] = useState<TaskDraft>({ title: task?.title ?? "", category: task?.category ?? "Coursework", dueDate: taskDateInputValue(task?.dueDate) || localDateInputValue(), priority: task?.priority ?? "Medium" });
  return <Modal title={task ? "Adjust your plan" : "Add a personal task"} subtitle="Keep it clear and manageable." close={close}><form onSubmit={e => { e.preventDefault(); if (draft.title.trim()) submit({ ...draft, title: draft.title.trim() }); }}><Field label="Task"><input className="input" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} required maxLength={200} placeholder="What needs doing?" data-testid="input-task-title" /></Field><div className="field-grid"><Field label="Category"><select className="input" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} data-testid="select-task-category">{categories.map(c => <option key={c}>{c}</option>)}</select></Field><Field label="Due date"><input className="input" type="date" value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} required data-testid="input-task-due-date" /></Field></div><Field label="Priority"><select className="input" value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value as Priority })} data-testid="select-task-priority">{["Low", "Medium", "High"].map(p => <option key={p}>{p}</option>)}</select></Field>{error && <p className="error-copy">We couldn’t save this task. Please try again.</p>}<ModalActions close={close} saving={saving} submitLabel={task ? "Save changes" : "Add task"} testId="button-submit-task" /></form></Modal>;
}

function FacultyPortal({ profile, onSignOut }: { profile: { displayName: string; email: string }; onSignOut: () => void }) {
  const qc = useQueryClient();
  const groupsQ = useListGroups({ query: { queryKey: getListGroupsQueryKey() } });
  const facultyQ = useListFaculty({ query: { queryKey: getListFacultyQueryKey() } });
  const createGroup = useCreateGroup({ mutation: { onSuccess: () => { void qc.invalidateQueries({ queryKey: getListGroupsQueryKey() }); setGroupName(""); setCreateOpen(false); } } });
  const addFaculty = useAddFaculty({ mutation: { onSuccess: () => { void qc.invalidateQueries({ queryKey: getListFacultyQueryKey() }); setFacultyEmail(""); } } });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [facultyEmail, setFacultyEmail] = useState("");
  const groups = groupsQ.data ?? [];
  const selected = groups.find(g => g.id === selectedId) ?? groups[0] ?? null;
  const selectedGroupId = selected?.id ?? 0;
  const membersQ = useListGroupMembers(selectedGroupId, { query: { enabled: !!selected, queryKey: getListGroupMembersQueryKey(selectedGroupId) } });
  const reportQ = useGetGroupReport(selectedGroupId, { query: { enabled: !!selected && selected.accessRole === "faculty", queryKey: getGetGroupReportQueryKey(selectedGroupId) } });
  const memberRole = useUpdateGroupMemberRole({ mutation: { onSuccess: () => { if (selected) void qc.invalidateQueries({ queryKey: getListGroupMembersQueryKey(selected.id) }); } } });
  const assignment = useCreateGroupAssignment({ mutation: { onSuccess: () => { if (selected) void qc.invalidateQueries({ queryKey: getGetGroupReportQueryKey(selected.id) }); setAssignmentOpen(false); } } });
  const award = useAwardPoints({ mutation: { onSuccess: () => { if (selected) void qc.invalidateQueries({ queryKey: getGetGroupReportQueryKey(selected.id) }); setAwardTarget(null); } } });
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [awardTarget, setAwardTarget] = useState<GroupMember | null>(null);
  const memberList = membersQ.data ?? [];
  return <AppFrame role="faculty" name={profile.displayName} email={profile.email} onSignOut={onSignOut}>
    <section className="faculty-intro"><div><span className="overline">FACULTY OVERVIEW</span><h2>Good coordination starts with clarity.</h2><p>Manage your groups, share the right work, and see how students are progressing.</p></div><div className="faculty-stat"><Users size={18} /><strong>{groups.reduce((sum, g) => sum + g.memberCount, 0)}</strong><span>students across groups</span></div></section>
    <section className="faculty-layout">
      <aside className="group-rail"><div className="rail-heading"><div><span className="overline">YOUR GROUPS</span><h2>Groups</h2></div><button className="square-button" aria-label="Create group" onClick={() => setCreateOpen(true)} data-testid="button-create-group"><Plus size={17} /></button></div>
        {groupsQ.isLoading ? <SkeletonList /> : groupsQ.isError ? <InlineError retry={() => void groupsQ.refetch()} testId="button-retry-faculty-groups" /> : groups.length ? groups.map(g => <button className={`group-select ${selected?.id === g.id ? "selected" : ""}`} key={g.id} onClick={() => setSelectedId(g.id)} data-testid={`button-select-group-${g.id}`}><span className="group-select-mark"><Users size={16} /></span><span className="grow"><b>{g.name}</b><small>{g.memberCount} students</small></span><ArrowRight size={15} /></button>) : <PanelState title="Start with a group" detail="Create a group to coordinate your students." action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)} data-testid="button-first-group"><Plus size={15} /> Create group</button>} />}
        {selected && <div className="join-code-box"><span className="overline">SHARE TO INVITE</span><div><b data-testid="text-join-code">{selected.joinCode}</b><button title="Copy join code" onClick={() => void navigator.clipboard?.writeText(selected.joinCode)} data-testid="button-copy-join-code"><Copy size={15} /></button></div><small>Students can join with this code.</small></div>}
        <div className="faculty-list"><span className="overline">FACULTY ACCESS</span>{facultyQ.isLoading ? <span className="skeleton skeleton-line" /> : facultyQ.isError ? <InlineError retry={() => void facultyQ.refetch()} testId="button-retry-faculty" /> : (facultyQ.data ?? []).map(f => <div key={f.id} className="faculty-person" data-testid={`faculty-person-${f.id}`}><span className="mini-avatar">{f.displayName.slice(0, 1).toUpperCase()}</span><span><b>{f.displayName}</b><small>{f.email}</small></span></div>)}
          <form className="faculty-add" onSubmit={e => { e.preventDefault(); if (facultyEmail.trim()) addFaculty.mutate({ data: { email: facultyEmail.trim() } }); }}><input aria-label="Additional faculty email" type="email" value={facultyEmail} onChange={e => setFacultyEmail(e.target.value)} placeholder="Faculty email" required data-testid="input-faculty-email" /><button title="Add faculty" disabled={addFaculty.isPending} data-testid="button-add-faculty"><Plus size={15} /></button></form>{addFaculty.isError && <p className="error-copy">Could not add this faculty account.</p>}</div>
      </aside>
      <div className="faculty-main">{!selected ? <PanelState title="Your groups are ready to take shape" detail="Create your first group to start sharing work and tracking progress." action={null} /> : <><div className="selected-group-heading"><div><span className="overline">GROUP WORKSPACE</span><h2>{selected.name}</h2><p>{selected.memberCount} students · Created {dateTime(selected.createdAt)}</p></div><button className="btn btn-primary" onClick={() => setAssignmentOpen(true)} data-testid="button-assign-task"><Plus size={16} /> Assign task</button></div>
          {selected.accessRole === "faculty" ? <FacultyGroupDetail group={selected} members={memberList} membersLoading={membersQ.isLoading} membersError={membersQ.isError} retryMembers={() => void membersQ.refetch()} report={reportQ.data ?? []} reportLoading={reportQ.isLoading} reportError={reportQ.isError} retryReport={() => void reportQ.refetch()} roleBusy={memberRole.isPending} changeRole={(m, role) => memberRole.mutate({ groupId: selected.id, userId: m.userId, data: { role } })} awardStudent={setAwardTarget} /> : <GroupAdminDetail members={memberList} loading={membersQ.isLoading} error={membersQ.isError} retry={() => void membersQ.refetch()} report={reportQ.data ?? []} reportLoading={reportQ.isLoading} />}
        </>}</div>
    </section>
    {createOpen && <Modal title="Create a group" subtitle="Give your group a name students will recognize." close={() => setCreateOpen(false)}><form onSubmit={e => { e.preventDefault(); if (groupName.trim()) createGroup.mutate({ data: { name: groupName.trim() } }); }}><Field label="Group name"><input className="input" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. Biology seminar" maxLength={100} required data-testid="input-group-name" /></Field>{createGroup.isError && <p className="error-copy">We couldn’t create this group. Try another name.</p>}<ModalActions close={() => setCreateOpen(false)} saving={createGroup.isPending} submitLabel="Create group" testId="button-submit-group" /></form></Modal>}
    {selected && assignmentOpen && <AssignmentModal group={selected} members={memberList} saving={assignment.isPending} error={assignment.isError} close={() => setAssignmentOpen(false)} submit={data => assignment.mutate({ groupId: selected.id, data })} />}
    {selected && awardTarget && <AwardModal student={awardTarget} saving={award.isPending} error={award.isError} close={() => setAwardTarget(null)} submit={(points, reason) => award.mutate({ data: { groupId: selected.id, userId: awardTarget.userId, points, reason } })} />}
  </AppFrame>;
}

function FacultyGroupDetail({ group, members, membersLoading, membersError, retryMembers, report, reportLoading, reportError, retryReport, roleBusy, changeRole, awardStudent }: { group: GroupSummary; members: GroupMember[]; membersLoading: boolean; membersError: boolean; retryMembers: () => void; report: GroupReportEntry[]; reportLoading: boolean; reportError: boolean; retryReport: () => void; roleBusy: boolean; changeRole: (m: GroupMember, role: "member" | "admin") => void; awardStudent: (m: GroupMember) => void }) {
  const assignments = useMemo(() => { const map = new Map<number, GroupReportEntry[]>(); for (const r of report) map.set(r.assignmentId, [...(map.get(r.assignmentId) ?? []), r]); return [...map.entries()]; }, [report]);
  return <><section className="surface-card faculty-members"><div className="section-header compact"><div><span className="overline">PEOPLE</span><h2>Members <small>{members.length}</small></h2></div></div>{membersLoading ? <SkeletonList /> : membersError ? <InlineError retry={retryMembers} testId="button-retry-members" /> : members.length ? <div className="member-table">{members.map(member => <MemberRow key={member.userId} member={member} faculty roleBusy={roleBusy} changeRole={role => changeRole(member, role)} award={() => awardStudent(member)} />)}</div> : <p className="muted-copy">Members will appear as students join with your code.</p>}</section>
    <section className="surface-card report-section"><div className="section-header compact"><div><span className="overline">PROGRESS</span><h2>Assignment report</h2></div><span className="report-summary">{report.filter(r => r.isCompleted).length} of {report.length} complete</span></div>{reportLoading ? <SkeletonList /> : reportError ? <InlineError retry={retryReport} testId="button-retry-report" /> : assignments.length ? <div className="assignment-report">{assignments.map(([id, rows]) => <article className="report-assignment" key={id} data-testid={`report-assignment-${id}`}><div className="report-assignment-head"><div><b>{rows[0].assignmentTitle}</b><small>Due {formatTaskDate(rows[0].dueDate)} · {rows[0].priority} priority</small></div><span>{rows.filter(r => r.isCompleted).length}/{rows.length}</span></div><div className="report-rows">{rows.map(row => <div className="report-row" key={row.userId}><span className={`status-dot ${row.isCompleted ? "done" : ""}`} /><span className="grow"><b>{row.studentName}</b><small>{row.studentEmail}</small></span><span className={row.isCompleted ? "positive-text" : "muted-copy"}>{row.isCompleted ? `Finished · ${row.pointsAwarded} pts` : "Not finished"}</span></div>)}</div></article>)}</div> : <PanelState title="No assignment reports yet" detail="Assign work to this group to see student progress here." action={null} />}</section></>;
}

function GroupAdminDetail({ members, loading, error, retry, report, reportLoading }: { members: GroupMember[]; loading: boolean; error: boolean; retry: () => void; report: GroupReportEntry[]; reportLoading: boolean }) {
  return <section className="surface-card faculty-members"><div className="section-header compact"><div><span className="overline">GROUP ADMIN VIEW</span><h2>Members <small>{members.length}</small></h2></div></div><p className="admin-notice">You can view members and assign work to selected students. Faculty-only reports and point adjustments aren’t available in this view.</p>{loading ? <SkeletonList /> : error ? <InlineError retry={retry} testId="button-retry-admin-members" /> : members.length ? <div className="member-table">{members.map(member => <MemberRow key={member.userId} member={member} faculty={false} roleBusy={false} changeRole={() => undefined} award={() => undefined} />)}</div> : <p className="muted-copy">Group members will appear here.</p>}{reportLoading && <span className="sr-only">{report.length} assignment records loading</span>}</section>;
}

function MemberRow({ member, faculty, roleBusy, changeRole, award }: { member: GroupMember; faculty: boolean; roleBusy: boolean; changeRole: (role: "member" | "admin") => void; award: () => void }) {
  return <div className="member-row" data-testid={`member-row-${member.userId}`}><span className="mini-avatar">{member.displayName.slice(0, 1).toUpperCase()}</span><span className="grow"><b>{member.displayName}</b><small>{member.email}</small></span><span className={member.role === "admin" ? "admin-label" : "member-label"}>{member.role === "admin" ? "Group admin" : "Student"}</span>{faculty && <div className="member-actions"><button className="text-action" disabled={roleBusy} onClick={() => changeRole(member.role === "admin" ? "member" : "admin")} data-testid={`button-role-${member.userId}`}>{member.role === "admin" ? "Remove admin" : "Make admin"}</button><button className="text-action award-action" onClick={award} data-testid={`button-award-${member.userId}`}><Award size={14} /> Points</button></div>}</div>;
}

type AssignmentDraft = { title: string; category: string; dueDate: string; priority: Priority; studentIds?: string[] };
function AssignmentModal({ group, members, close, submit, saving, error }: { group: GroupSummary; members: GroupMember[]; close: () => void; submit: (data: AssignmentDraft) => void; saving: boolean; error: boolean }) {
  const [draft, setDraft] = useState<AssignmentDraft>({ title: "", category: "Coursework", dueDate: localDateInputValue(), priority: "Medium" });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [target, setTarget] = useState<"all" | "selected">("all");
  const [selectionError, setSelectionError] = useState(false);
  const adminOnly = group.accessRole === "admin";
  const needsSelection = adminOnly || target === "selected";
  return <Modal title="Assign group work" subtitle={adminOnly ? "Group admins can assign only to selected students." : "Choose the students this work belongs to."} close={close}><form onSubmit={e => { e.preventDefault(); if (needsSelection && selectedIds.length === 0) { setSelectionError(true); return; } if (draft.title.trim()) submit({ ...draft, title: draft.title.trim(), studentIds: needsSelection ? selectedIds : undefined }); }}><Field label="Assignment title"><input className="input" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} required maxLength={200} placeholder="e.g. Week 4 reflection" data-testid="input-assignment-title" /></Field><div className="field-grid"><Field label="Category"><input className="input" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} required maxLength={100} data-testid="input-assignment-category" /></Field><Field label="Due date"><input className="input" type="date" value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} required data-testid="input-assignment-due-date" /></Field></div><Field label="Priority"><select className="input" value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value as Priority })} data-testid="select-assignment-priority">{["Low", "Medium", "High"].map(p => <option key={p}>{p}</option>)}</select></Field>{!adminOnly && <div className="assignment-target"><span className="field-caption">Assign to</span><div className="tabs"><button type="button" className={target === "all" ? "tab active" : "tab"} onClick={() => setTarget("all")} data-testid="button-assignment-all">Whole group</button><button type="button" className={target === "selected" ? "tab active" : "tab"} onClick={() => setTarget("selected")} data-testid="button-assignment-selected">Selected students</button></div></div>}{needsSelection && <div className="student-picker">{members.map(m => <label className="student-pick" key={m.userId}><input type="checkbox" checked={selectedIds.includes(m.userId)} onChange={e => { setSelectionError(false); setSelectedIds(e.target.checked ? [...selectedIds, m.userId] : selectedIds.filter(id => id !== m.userId)); }} data-testid={`checkbox-assignment-student-${m.userId}`} /><span><b>{m.displayName}</b><small>{m.email}{m.role === "admin" ? " · Group admin" : ""}</small></span></label>)}{members.length === 0 && <p className="muted-copy">No students are available to select yet.</p>}</div>}{selectionError && <p className="error-copy">Select at least one student for this assignment.</p>}{error && <p className="error-copy">The assignment could not be created.</p>}<ModalActions close={close} saving={saving} submitLabel="Assign task" testId="button-submit-assignment" /></form></Modal>;
}

function AwardModal({ student, close, submit, saving, error }: { student: GroupMember; close: () => void; submit: (points: number, reason: string) => void; saving: boolean; error: boolean }) {
  const [points, setPoints] = useState("5");
  const [reason, setReason] = useState("");
  return <Modal title="Adjust points" subtitle={`For ${student.displayName}. Use a positive or negative value.`} close={close}><form onSubmit={e => { e.preventDefault(); if (reason.trim() && Number(points) !== 0) submit(Number(points), reason.trim()); }}><Field label="Points to add or deduct"><input className="input" type="number" min={-1000} max={1000} value={points} onChange={e => setPoints(e.target.value)} required data-testid="input-point-adjustment" /></Field><Field label="Reason"><input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Add context for this adjustment" maxLength={300} required data-testid="input-point-reason" /></Field>{error && <p className="error-copy">The point adjustment wasn’t saved.</p>}<ModalActions close={close} saving={saving} submitLabel="Save adjustment" testId="button-submit-points" /></form></Modal>;
}

function Metric({ label, value, icon, tone }: { label: string; value: number; icon: ReactNode; tone: string }) { return <article className={`metric ${tone}`} data-testid={`metric-${label.toLowerCase().replaceAll(" ", "-")}`}><span className="metric-icon">{icon}</span><span><small>{label}</small><b>{value}</b></span></article>; }
function PanelState({ title, detail, action }: { title: string; detail: string; action: ReactNode }) { return <div className="panel-state"><span className="empty-mark"><Sparkles size={20} /></span><h3>{title}</h3><p>{detail}</p>{action}</div>; }
function SkeletonList() { return <div className="skeleton-list"><span /><span /><span /></div>; }
function InlineError({ retry, testId }: { retry: () => void; testId: string }) { return <div className="inline-error"><span>Couldn’t load this section.</span><button onClick={retry} data-testid={testId}>Retry</button></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Modal({ title, subtitle, close, children }: { title: string; subtitle: string; close: () => void; children: ReactNode }) { return <div className="modal-scrim" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><header className="modal-head"><div><span className="overline">CAMPUS TRACK</span><h2>{title}</h2><p>{subtitle}</p></div><button className="modal-close" onClick={close} aria-label="Close dialog" data-testid="button-close-dialog"><X size={18} /></button></header>{children}</section></div>; }
function ModalActions({ close, saving, submitLabel, testId }: { close: () => void; saving: boolean; submitLabel: string; testId: string }) { return <div className="modal-actions"><button type="button" className="btn btn-quiet" onClick={close} data-testid="button-cancel-dialog">Cancel</button><button className="btn btn-primary" disabled={saving} data-testid={testId}>{saving ? "Saving…" : submitLabel} {!saving && <ArrowRight size={15} />}</button></div>; }
function Loading() { return <div className="loading-screen"><span className="brand-mark"><Sparkles size={17} /></span><span>Opening your workspace</span><div className="loading-bars"><i /><i /><i /></div></div>; }
function RoutedBoundary({ children }: { children: ReactNode }) { const [path] = useLocation(); return <ErrorBoundary resetKey={path}>{children}</ErrorBoundary>; }
function ClerkRoutes() {
  const [, navigate] = useLocation();
  const strip = (path: string) => basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: "Welcome back", subtitle: "Pick up where you left off." } }, signUp: { start: { title: "Create your space", subtitle: "A clearer semester starts here." } } }} routerPush={to => navigate(strip(to))} routerReplace={to => navigate(strip(to), { replace: true })}><RoutedBoundary><Switch><Route path="/" component={HomeRedirect} /><Route path="/sign-in/*?" component={() => <div className="auth-page"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>} /><Route path="/sign-up/*?" component={() => <div className="auth-page"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>} /><Route path="/dashboard" component={Dashboard} /><Route component={NotFound} /></Switch></RoutedBoundary></ClerkProvider>;
}
function App() { return <QueryClientProvider client={queryClient}><WouterRouter base={basePath}><ClerkRoutes /></WouterRouter></QueryClientProvider>; }
export default App;
