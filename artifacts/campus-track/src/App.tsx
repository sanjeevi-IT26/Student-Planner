import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Filter,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Repeat2,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGetTaskStatsQueryKey,
  getListTasksQueryKey,
  useCompleteTask,
  useCreateTask,
  useDeleteTask,
  useGetTaskStats,
  useListTasks,
  useUpdateTask,
} from "@workspace/api-client-react";
import type { Task } from "@workspace/api-client-react";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import {
  formatTaskDate,
  isTaskDueSoon,
  isTaskDueToday,
  localDateInputValue,
  taskDateInputValue,
} from "@/lib/task-date";
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#e85d42",
    colorForeground: "#19302a",
    colorMutedForeground: "#6b7d74",
    colorDanger: "#c83e43",
    colorBackground: "#fffaf1",
    colorInput: "#fffdf8",
    colorInputForeground: "#19302a",
    colorNeutral: "#d8e2d7",
    fontFamily: "Manrope, sans-serif",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#fffaf1] rounded-[24px] w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#19302a] font-display",
    headerSubtitle: "text-[#6b7d74]",
    socialButtonsBlockButtonText: "text-[#19302a]",
    formFieldLabel: "text-[#19302a]",
    footerActionLink: "text-[#e85d42] font-semibold",
    footerActionText: "text-[#6b7d74]",
    dividerText: "text-[#6b7d74]",
    identityPreviewEditButton: "text-[#e85d42]",
    formFieldSuccessText: "text-[#39785d]",
    alertText: "text-[#c83e43]",
    logoBox: "mb-4",
    logoImage: "w-10 h-10",
    socialButtonsBlockButton: "border-[#d8e2d7] hover:bg-[#f3eee4]",
    formButtonPrimary: "bg-[#e85d42] hover:bg-[#cf4f36] text-white shadow-md",
    formFieldInput: "bg-[#fffdf8] border-[#d8e2d7] text-[#19302a]",
    footerAction: "border-t border-[#e5e3da] mt-4 pt-4",
    dividerLine: "bg-[#d8e2d7]",
    alert: "bg-[#fff0ed] border-[#f2c8bd]",
    otpCodeFieldInput: "border-[#d8e2d7] text-[#19302a]",
    formFieldRow: "gap-2",
    main: "px-2",
  },
};

type Priority = "Low" | "Medium" | "High";
type Recurrence = "None" | "Daily" | "Weekly" | "Monthly";
type FilterValue = "All" | "Today" | "Completed";
type TaskDraft = {
  title: string;
  category: string;
  dueDate: string;
  priority: Priority;
  recurrence: Recurrence;
};

const categories = ["Coursework", "Personal", "Clubs", "Wellbeing"];
const priorities: Priority[] = ["Low", "Medium", "High"];
const recurrences: Recurrence[] = ["None", "Daily", "Weekly", "Monthly"];

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen />;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <Landing />;
}

function Landing() {
  const [, setLocation] = useLocation();
  return (
    <main className="landing-page">
      <nav className="landing-nav page-width">
        <a className="brand" href={basePath || "/"}>
          <span className="brand-mark"><Sparkles size={17} /></span>
          <span>Campus<span className="brand-accent">Track</span></span>
        </a>
        <div className="landing-nav-actions">
          <button className="button button-ghost" onClick={() => setLocation("/sign-in")}>Sign in</button>
          <button className="button button-dark" onClick={() => setLocation("/sign-up")}>Get started <ArrowRight size={16} /></button>
        </div>
      </nav>

      <section className="landing-hero page-width">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> Your semester, in focus</div>
          <h1>Make space for<br /><em>what matters.</em></h1>
          <p className="hero-lede">CampusTrack keeps coursework, campus life, and the small things moving forward in one calm, clear place.</p>
          <div className="hero-actions">
            <button className="button button-primary button-large" onClick={() => setLocation("/sign-up")}>Start tracking free <ArrowRight size={18} /></button>
            <span className="hero-note"><Check size={15} /> Built for busy students</span>
          </div>
        </div>
        <div className="hero-art" aria-label="CampusTrack preview">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-card hero-card-main">
            <div className="mini-card-top"><span>Tuesday, Oct 08</span><span className="mini-dot" /></div>
            <div className="mini-greeting">Good morning, Alex</div>
            <div className="mini-subtitle">Here’s your day at a glance.</div>
            <div className="mini-progress"><span /><b>3 of 7 complete</b></div>
            <div className="mini-task done"><span className="mini-check"><Check size={11} /></span><div><strong>Read chapter 4</strong><small>Coursework · Today</small></div></div>
            <div className="mini-task"><span className="mini-check empty" /><div><strong>Submit UX research</strong><small>Coursework · Today</small></div><span className="mini-priority high">High</span></div>
            <div className="mini-task"><span className="mini-check empty" /><div><strong>Pick up club flyers</strong><small>Clubs · Tomorrow</small></div></div>
          </div>
          <div className="hero-card hero-card-float">
            <span className="float-icon"><Target size={17} /></span>
            <div><strong>68%</strong><small>weekly rhythm</small></div>
            <div className="float-bars"><i /><i /><i /><i /><i /><i /></div>
          </div>
        </div>
      </section>

      <section className="landing-features page-width">
        <div className="feature-heading"><span>Everything has a place</span><span className="feature-line" /></div>
        <div className="feature-grid">
          <Feature icon={<ListTodo size={20} />} title="One clear list" copy="See every task without the mental clutter. Filter by what needs you now." />
          <Feature icon={<Repeat2 size={20} />} title="Keep your rhythm" copy="Set daily, weekly, or monthly tasks once. CampusTrack keeps the loop going." />
          <Feature icon={<BarChart3 size={20} />} title="Notice your progress" copy="Small wins add up. A simple dashboard makes the momentum visible." />
        </div>
      </section>
      <footer className="landing-footer page-width"><span>CampusTrack</span><span>Make room for your next win.</span></footer>
    </main>
  );
}

function Feature({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return <article className="feature"><span className="feature-icon">{icon}</span><h3>{title}</h3><p>{copy}</p></article>;
}

function Dashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <Redirect to="/" />;
  return <DashboardShell />;
}

function DashboardShell() {
  const [navOpen, setNavOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterValue>("All");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { user } = useUser();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const tasksQuery = useListTasks();
  const statsQuery = useGetTaskStats();
  const completeMutation = useCompleteTask({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() });
      },
    },
  });
  const deleteMutation = useDeleteTask({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() });
      },
    },
  });
  const tasks = tasksQuery.data ?? [];
  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const matchesFilter = activeFilter === "All" || (activeFilter === "Today" && isTaskDueToday(task.dueDate)) || (activeFilter === "Completed" && task.isCompleted);
    const matchesSearch = `${task.title} ${task.category}`.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }), [activeFilter, search, tasks]);
  const firstName = user?.firstName || "there";

  function openCreate() {
    setEditingTask(null);
    setIsModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingTask(null);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${navOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand"><a className="brand" href={basePath || "/"}><span className="brand-mark"><Sparkles size={16} /></span><span>Campus<span className="brand-accent">Track</span></span></a><button className="mobile-close" onClick={() => setNavOpen(false)}><X size={19} /></button></div>
        <div className="side-label">Workspace</div>
        <button className="side-link active"><LayoutDashboard size={18} /> Overview</button>
        <button className="side-link" onClick={() => setActiveFilter("All")}><ListTodo size={18} /> All tasks <span className="side-count">{tasks.length}</span></button>
        <button className="side-link" onClick={() => setActiveFilter("Today")}><CalendarDays size={18} /> Today</button>
        <button className="side-link" onClick={() => setActiveFilter("Completed")}><CheckCircle2 size={18} /> Completed</button>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><Sparkles size={16} /><div><strong>Small steps count</strong><span>Keep showing up for your future self.</span></div></div>
          <div className="user-row"><div className="avatar">{(user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress?.[0] || "A").toUpperCase()}</div><div className="user-meta"><strong>{user?.firstName || "Student"}</strong><span>{user?.primaryEmailAddress?.emailAddress}</span></div><button className="logout-icon" title="Log out" onClick={() => void signOut({ redirectUrl: basePath || "/" })}><LogOut size={16} /></button></div>
        </div>
      </aside>
      {navOpen && <button className="sidebar-scrim" onClick={() => setNavOpen(false)} aria-label="Close navigation" />}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <button className="mobile-menu" onClick={() => setNavOpen(true)}><Menu size={21} /></button>
          <div><p className="header-kicker">Tuesday, October 08, 2026</p><h1>Good morning, {firstName}.</h1></div>
          <div className="header-actions"><button className="icon-button" title="Search"><Search size={18} /></button><button className="user-avatar">{(user?.firstName?.[0] || "A").toUpperCase()}</button></div>
        </header>
        <section className="welcome-strip"><div><span className="welcome-overline">Your focus, today</span><h2>Make it a good one.</h2><p>You have {statsQuery.data?.dueSoon ?? "a few"} tasks in the next 7 days.</p></div><div className="welcome-spark"><Sparkles size={29} /></div></section>
        <section className="stats-grid">
          <StatCard label="Total tasks" value={statsQuery.data?.total} icon={<ListTodo size={19} />} tone="coral" />
          <StatCard label="Due this week" value={statsQuery.data?.dueSoon} icon={<Clock3 size={19} />} tone="mint" />
          <StatCard label="Completed" value={statsQuery.data?.completed} icon={<CheckCircle2 size={19} />} tone="lavender" />
          <StatCard label="Completion rate" value={statsQuery.data ? `${statsQuery.data.completionRate}%` : undefined} icon={<BarChart3 size={19} />} tone="gold" />
        </section>
        <section className="tasks-section">
          <div className="section-heading"><div><span className="section-overline">Your planner</span><h2>Tasks</h2></div><button className="button button-primary" onClick={openCreate}><Plus size={17} /> Add task</button></div>
          <div className="task-toolbar"><div className="filter-pills">{(["All", "Today", "Completed"] as FilterValue[]).map((filter) => <button key={filter} className={`filter-pill ${activeFilter === filter ? "selected" : ""}`} onClick={() => setActiveFilter(filter)}>{filter}{filter === "All" && <span>{tasks.length}</span>}</button>)}</div><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks..." /></label><button className="filter-button"><Filter size={16} /> Filter</button></div>
          <div className="task-list">
            {tasksQuery.isLoading ? <TaskListSkeleton /> : tasksQuery.isError ? <StateCard title="Could not load your tasks" copy="The server did not respond. Try refreshing in a moment." action={<button className="button button-outline" onClick={() => void tasksQuery.refetch()}>Try again</button>} /> : visibleTasks.length === 0 ? <StateCard title={search || activeFilter !== "All" ? "No tasks match this view" : "Your list is ready for its first task"} copy={search || activeFilter !== "All" ? "Try a different search or filter." : "Add one small, specific thing you want to move forward today."} action={<button className="button button-primary" onClick={openCreate}><Plus size={16} /> Add your first task</button>} /> : visibleTasks.map((task) => <TaskRow key={task.id} task={task} onComplete={() => completeMutation.mutate({ taskId: task.id })} onEdit={() => openEdit(task)} onDelete={() => deleteMutation.mutate({ taskId: task.id })} isCompleting={completeMutation.isPending && completeMutation.variables?.taskId === task.id} isDeleting={deleteMutation.isPending && deleteMutation.variables?.taskId === task.id} />)}
          </div>
        </section>
      </main>
      {isModalOpen && <TaskModal task={editingTask} onClose={closeModal} />}
    </div>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value?: number | string; icon: ReactNode; tone: string }) {
  return <article className={`stat-card stat-${tone}`}><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value ?? <span className="stat-loading" />}</strong></div></article>;
}

function TaskRow({ task, onComplete, onEdit, onDelete, isCompleting, isDeleting }: { task: Task; onComplete: () => void; onEdit: () => void; onDelete: () => void; isCompleting: boolean; isDeleting: boolean }) {
  return (
    <article className={`task-row ${task.isCompleted ? "task-done" : ""}`}>
      <button
        className={`task-check ${task.isCompleted ? "checked" : ""}`}
        onClick={onComplete}
        disabled={isCompleting}
        aria-label={task.isCompleted ? "Completed" : "Mark complete"}
      >
        {task.isCompleted && <Check size={15} />}
      </button>
      <div className="task-content">
        <div className="task-title-line">
          <h3>{task.title}</h3>
          {task.recurrence !== "None" && (
            <span className="recurrence-chip"><Repeat2 size={12} /> {task.recurrence}</span>
          )}
        </div>
        <div className="task-details">
          <span className={`category-dot category-${task.category.toLowerCase()}`} />
          {task.category}
          <span className="detail-separator" />
          <CalendarDays size={13} />
          {isTaskDueToday(task.dueDate) ? "Today" : formatTaskDate(task.dueDate)}
        </div>
      </div>
      <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
      <div className="task-actions">
        <button onClick={onEdit} title="Edit task"><Pencil size={15} /></button>
        <button onClick={onDelete} title="Delete task" disabled={isDeleting}><Trash2 size={15} /></button>
      </div>
    </article>
  );
}

function TaskModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const createMutation = useCreateTask({ mutation: { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }); void queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() }); onClose(); } } });
  const updateMutation = useUpdateTask({ mutation: { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }); void queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() }); onClose(); } } });
  const [draft, setDraft] = useState<TaskDraft>({ title: task?.title || "", category: task?.category || "Coursework", dueDate: taskDateInputValue(task?.dueDate) || localDateInputValue(), priority: task?.priority || "Medium", recurrence: task?.recurrence || "None" });
  const titleRef = useRef<HTMLInputElement>(null);
  const saving = createMutation.isPending || updateMutation.isPending;
  useEffect(() => { titleRef.current?.focus(); }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    if (task) updateMutation.mutate({ taskId: task.id, data: draft });
    else createMutation.mutate({ data: draft });
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><div className="modal-heading"><div><span className="section-overline">{task ? "Refine your plan" : "Make it concrete"}</span><h2 id="task-modal-title">{task ? "Edit task" : "Add a task"}</h2></div><button className="close-button" onClick={onClose}><X size={19} /></button></div><form onSubmit={submit}><label className="form-label">What needs doing?<input ref={titleRef} className="form-input form-input-large" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Finish lab report" /></label><div className="form-grid"><label className="form-label">Category<select className="form-input" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="form-label">Due date<input className="form-input" type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></label></div><div className="form-grid"><label className="form-label">Priority<select className="form-input" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label><label className="form-label">Repeat<select className="form-input" value={draft.recurrence} onChange={(event) => setDraft({ ...draft, recurrence: event.target.value as Recurrence })}>{recurrences.map((recurrence) => <option key={recurrence}>{recurrence}</option>)}</select></label></div>{(createMutation.isError || updateMutation.isError) && <p className="form-error">That task could not be saved. Please try again.</p>}<div className="modal-actions"><button type="button" className="button button-ghost" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? "Saving..." : task ? "Save changes" : "Add task"} {!saving && <ArrowRight size={16} />}</button></div></form></section></div>;
}

function StateCard({ title, copy, action }: { title: string; copy: string; action: ReactNode }) {
  return <div className="state-card"><span className="state-icon"><Sparkles size={20} /></span><h3>{title}</h3><p>{copy}</p>{action}</div>;
}

function TaskListSkeleton() {
  return <>{[1, 2, 3].map((item) => <div className="task-row skeleton-row" key={item}><span className="skeleton skeleton-circle" /><span className="skeleton skeleton-long" /><span className="skeleton skeleton-short" /></div>)}</>;
}

function LoadingScreen() {
  return <div className="loading-screen"><span className="brand-mark"><Sparkles size={18} /></span><span className="loading-pulse">Loading your workspace</span></div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const stripBase = (path: string) => basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: "Welcome back", subtitle: "Pick up where you left off." } }, signUp: { start: { title: "Create your space", subtitle: "A clearer semester starts here." } } }} routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}><RoutedErrorBoundary><Switch><Route path="/" component={HomeRedirect} /><Route path="/sign-in/*?" component={() => <div className="auth-page"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>} /><Route path="/sign-up/*?" component={() => <div className="auth-page"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>} /><Route path="/dashboard" component={Dashboard} /><Route component={NotFound} /></Switch></RoutedErrorBoundary></ClerkProvider>;
}

function App() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter></QueryClientProvider>;
}

export default App;