import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { verticalMeta } from "@operationhub/verticals";

const apiUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");

type Session = {
  token: string;
  user: {
    id: string;
    orgId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    customerId?: string | null;
  };
};

type Dashboard = {
  taskBreakdown: { status: string; count: string }[];
  submissionCount: number;
  templatesByVertical: { vertical: string; count: string }[];
  siteCount: number;
  assetCount: number;
  teamCount: number;
  userCount: number;
  customerCount: number;
  contractCount: number;
};

type ChecklistItem = { key: string; label: string; type: string; required?: boolean; options?: string[] };
type Site = {
  id: string;
  customer_id?: string;
  customer_name?: string;
  name: string;
  address: string;
  vertical: string;
  description?: string;
};
type Asset = {
  id: string;
  site_id: string;
  site_name: string;
  name: string;
  asset_type: string;
  vertical: string;
  status: string;
  serial_number?: string;
  description?: string;
};
type Device = {
  id: string;
  site_id: string;
  asset_id?: string;
  site_name: string;
  asset_name?: string;
  name: string;
  device_type: string;
  vertical: string;
  status: string;
  identifier?: string;
  last_seen?: string;
  latest_payload?: Record<string, unknown>;
};
type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  customer_id?: string | null;
  customer_name?: string | null;
  created_at: string;
};
type Team = {
  id: string;
  name: string;
  vertical: string;
  description?: string;
  member_count: string;
  leads?: string;
};
type Customer = {
  id: string;
  name: string;
  vertical: string;
  contact_name?: string;
  contact_email?: string;
  phone?: string;
  notes?: string;
};
type Contract = {
  id: string;
  customer_id: string;
  customer_name: string;
  name: string;
  vertical: string;
  status: string;
  start_date?: string;
  end_date?: string;
  sla_notes?: string;
};
type AutomationRule = {
  id: string;
  name: string;
  vertical?: string | null;
  trigger_source: string;
  event_type?: string | null;
  comparator?: string | null;
  threshold_min?: number | null;
  threshold_max?: number | null;
  severity_filter?: string | null;
  task_status?: string | null;
  action_type: string;
  action_title: string;
  action_message: string;
  target_team_id?: string | null;
  target_team_name?: string | null;
  enabled: boolean;
};
type Template = {
  id: string;
  name: string;
  description: string;
  category: string;
  vertical: string;
  recurrence: string;
  items: ChecklistItem[];
};
type Task = {
  id: string;
  site_id?: string;
  asset_id?: string;
  parent_task_id?: string;
  title: string;
  description: string;
  vertical: string;
  status: string;
  due_date: string;
  site_name?: string;
  asset_name?: string;
  team_id?: string;
  team_name?: string;
  assignee_name?: string;
  schedule_type: string;
  recurrence_rule?: string;
  review_notes?: string;
  reviewed_at?: string;
  items: ChecklistItem[];
};
type Submission = {
  id: string;
  task_id: string;
  site_id?: string;
  asset_id?: string;
  task_title: string;
  vertical: string;
  site_name?: string;
  asset_name?: string;
  status?: string;
  notes: string;
  payload?: unknown;
  photo_urls?: string[];
  created_at: string;
};
type TelemetryEvent = {
  id: string;
  device_id: string;
  site_id: string;
  asset_id?: string;
  device_name: string;
  site_name: string;
  asset_name?: string;
  vertical: string;
  event_type: string;
  reading_value?: number;
  reading_text?: string;
  severity: string;
  payload?: Record<string, unknown>;
  created_at: string;
};
type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  related_task_id?: string;
  is_read: boolean;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
};
type NotificationPolicy = {
  id: string;
  name: string;
  notification_type?: string | null;
  channel: string;
  target_role?: string | null;
  delay_minutes: number;
  repeat_count: number;
  enabled: boolean;
};
type NotificationDelivery = {
  id: string;
  notification_id: string;
  policy_id?: string | null;
  channel: string;
  status: string;
  scheduled_for: string;
  delivered_at?: string | null;
  attempt_number: number;
  title: string;
  type: string;
  related_task_id?: string | null;
};
type AuditLog = {
  id: string;
  user_id?: string | null;
  user_name?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: Record<string, unknown>;
  created_at: string;
};
type ReportRun = {
  id: string;
  report_type: string;
  vertical?: string | null;
  period_days: number;
  format: string;
  file_name: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  generated_by_name?: string | null;
};

type PlannerTask = {
  id: string;
  title: string;
  description?: string;
  vertical: string;
  status: string;
  due_date?: string;
  schedule_type: string;
  recurrence_rule?: string;
  site_name?: string;
  asset_name?: string;
  team_name?: string;
  assignee_name?: string;
};

type WorkspaceView =
  | "overview"
  | "demo"
  | "enterprise"
  | "planner"
  | "tasks"
  | "templates"
  | "sites"
  | "monitoring"
  | "alerts"
  | "admin"
  | "submissions"
  | "audit"
  | "reports";
type ResponseValue = string | boolean;

async function request<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Request failed");
  }

  return response.json();
}

function buildResponseState(items: ChecklistItem[]) {
  return Object.fromEntries(items.map((item) => [item.key, item.type === "checkbox" ? false : ""])) as Record<
    string,
    ResponseValue
  >;
}

function formatDate(date?: string | null) {
  return date ? new Date(date).toLocaleString() : "No due date";
}

function describeSchedule(task: Pick<Task, "schedule_type" | "recurrence_rule">) {
  return task.schedule_type === "recurring"
    ? `Recurring · ${task.recurrence_rule || "custom rule"}`
    : "One-time";
}

function formatPlannerDay(date?: string | null) {
  if (!date) return "Unscheduled";
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function summarizeAuditDetails(details?: Record<string, unknown>) {
  if (!details) return "No details";
  const entries = Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 4);
  if (!entries.length) return "No details";
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
}

function getDemoStatus(done: boolean, active = false) {
  if (done) return "complete";
  if (active) return "ready";
  return "pending";
}

const enterpriseCapabilities = [
  ["Multi-tenant workspace", "built", "Organization and customer scoped records."],
  ["Vertical products", "built", "FireOps, ParkOps, and PoolOps on the same core model."],
  ["Task lifecycle", "built", "Start, submit, review, approve, reopen, close, and corrective child tasks."],
  ["Compliance proof", "built", "Evidence files, audit log, PDF reports, CSV exports, report history."],
  ["Customer portal", "built", "Read-only viewer access scoped to one customer."],
  ["Observability", "built", "Prometheus, Grafana, Postgres exporter, cAdvisor, node-exporter."],
  ["Recovery", "built", "Postgres plus uploads backup archive and restore runbook."]
];

const enterpriseGaps = [
  ["SSO/OIDC + MFA", "high", "Enterprise identity provider integration and stronger account controls."],
  ["Fine-grained RBAC", "high", "Permissions by module, customer, site, team, and action."],
  ["Offline mobile sync", "high", "Android field app with offline queue, photo retry, conflict handling."],
  ["SLA escalation", "high", "Business hours, on-call schedules, acknowledgement deadlines, escalation ladders."],
  ["Sensor ingestion hardening", "high", "Device API keys, webhooks, deduplication, replay protection."],
  ["Object storage", "medium", "Move evidence and reports from local disk to S3-compatible storage."],
  ["Immutable audit retention", "medium", "Tamper-evident exports, legal holds, retention policies."],
  ["CI/CD and secrets", "medium", "Image builds, migration gates, rollback path, managed secrets."],
  ["Billing and tenant admin", "medium", "Plans, quotas, subscription state, tenant lifecycle."]
];

export function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem("operationhub.session");
    return raw ? JSON.parse(raw) : null;
  });
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [plannerTasks, setPlannerTasks] = useState<PlannerTask[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryEvent[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationPolicies, setNotificationPolicies] = useState<NotificationPolicy[]>([]);
  const [notificationDeliveries, setNotificationDeliveries] = useState<NotificationDelivery[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reportRuns, setReportRuns] = useState<ReportRun[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeView, setActiveView] = useState<WorkspaceView>("overview");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [taskResponse, setTaskResponse] = useState<Record<string, ResponseValue>>({});
  const [taskNotes, setTaskNotes] = useState("");
  const [taskPhotos, setTaskPhotos] = useState<FileList | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [taskActionLoading, setTaskActionLoading] = useState(false);
  const [syncingRecurring, setSyncingRecurring] = useState(false);
  const [savingDevice, setSavingDevice] = useState(false);
  const [sendingTelemetry, setSendingTelemetry] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [savingMembership, setSavingMembership] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [savingNotificationPolicy, setSavingNotificationPolicy] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [reportForm, setReportForm] = useState({
    vertical: "all",
    days: "30",
    csvDataset: "tasks"
  });
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    vertical: "fire",
    templateId: "",
    siteId: "",
    assetId: "",
    assignedTo: "",
    teamId: "",
    dueDate: "",
    scheduleType: "one_time",
    recurrenceRule: ""
  });
  const [siteForm, setSiteForm] = useState({
    customerId: "",
    name: "",
    address: "",
    vertical: "fire",
    description: ""
  });
  const [assetForm, setAssetForm] = useState({
    siteId: "",
    name: "",
    assetType: "",
    vertical: "fire",
    status: "active",
    serialNumber: "",
    description: ""
  });
  const [deviceForm, setDeviceForm] = useState({
    siteId: "",
    assetId: "",
    name: "",
    deviceType: "pool-probe",
    vertical: "pool",
    identifier: ""
  });
  const [telemetryForm, setTelemetryForm] = useState({
    deviceId: "",
    eventType: "ph",
    readingValue: "7.4",
    readingText: "",
    severity: "info"
  });
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "worker",
    customerId: ""
  });
  const [teamForm, setTeamForm] = useState({
    name: "",
    vertical: "fire",
    description: ""
  });
  const [membershipForm, setMembershipForm] = useState({
    teamId: "",
    userId: "",
    memberRole: "member"
  });
  const [customerForm, setCustomerForm] = useState({
    name: "",
    vertical: "fire",
    contactName: "",
    contactEmail: "",
    phone: "",
    notes: ""
  });
  const [contractForm, setContractForm] = useState({
    customerId: "",
    name: "",
    vertical: "fire",
    status: "active",
    startDate: "",
    endDate: "",
    slaNotes: ""
  });
  const [ruleForm, setRuleForm] = useState({
    name: "",
    vertical: "fire",
    triggerSource: "telemetry",
    eventType: "",
    comparator: "lt",
    thresholdMin: "",
    thresholdMax: "",
    severityFilter: "warning",
    taskStatus: "pending",
    actionType: "create_task",
    actionTitle: "",
    actionMessage: "",
    targetTeamId: ""
  });
  const [notificationPolicyForm, setNotificationPolicyForm] = useState({
    name: "",
    notificationType: "rule",
    channel: "email",
    targetRole: "manager",
    delayMinutes: "0",
    repeatCount: "1"
  });

  const templatesForVertical = useMemo(
    () => templates.filter((template) => template.vertical === taskForm.vertical),
    [templates, taskForm.vertical]
  );
  const sitesForVertical = useMemo(
    () => sites.filter((site) => site.vertical === taskForm.vertical),
    [sites, taskForm.vertical]
  );
  const assetsForVertical = useMemo(
    () =>
      assets.filter(
        (asset) =>
          asset.vertical === taskForm.vertical &&
          (!taskForm.siteId || asset.site_id === taskForm.siteId)
      ),
    [assets, taskForm.vertical, taskForm.siteId]
  );
  const usersForVertical = useMemo(() => users.filter((user) => user.role !== "viewer"), [users]);
  const teamsForVertical = useMemo(
    () => teams.filter((team) => team.vertical === taskForm.vertical),
    [teams, taskForm.vertical]
  );
  const customersForVertical = useMemo(
    () => customers.filter((customer) => customer.vertical === siteForm.vertical),
    [customers, siteForm.vertical]
  );
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );
  const selectedTaskSubmissions = useMemo(
    () => submissions.filter((submission) => submission.task_id === selectedTaskId),
    [submissions, selectedTaskId]
  );
  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? null,
    [sites, selectedSiteId]
  );
  const siteAssets = useMemo(
    () => assets.filter((asset) => asset.site_id === selectedSiteId),
    [assets, selectedSiteId]
  );
  const monitoringDevices = useMemo(
    () => devices.filter((device) => !selectedSiteId || device.site_id === selectedSiteId),
    [devices, selectedSiteId]
  );
  const demoSourceTask = useMemo(
    () =>
      tasks.find((task) => task.title.toLowerCase().includes("workflow verification")) ??
      tasks.find((task) => task.status === "awaiting_review") ??
      tasks[0] ??
      null,
    [tasks]
  );
  const demoCorrectiveTasks = useMemo(
    () => tasks.filter((task) => task.parent_task_id === demoSourceTask?.id),
    [tasks, demoSourceTask]
  );
  const demoSubmission = useMemo(
    () => submissions.find((submission) => submission.task_id === demoSourceTask?.id) ?? null,
    [submissions, demoSourceTask]
  );
  const demoReport = useMemo(() => reportRuns[0] ?? null, [reportRuns]);
  const demoSteps = useMemo(
    () => [
      {
        title: "Choose a vertical template",
        detail: "Use FireOps, ParkOps, or PoolOps checklist packs as the operational product skin.",
        status: getDemoStatus(templates.length > 0),
        view: "templates" as WorkspaceView
      },
      {
        title: "Dispatch a site task",
        detail: demoSourceTask
          ? `${demoSourceTask.title} is ${demoSourceTask.status.replace("_", " ")} at ${demoSourceTask.site_name ?? "a site"}.`
          : "Create a task from a template and assign it to a site, asset, team, and worker.",
        status: getDemoStatus(Boolean(demoSourceTask)),
        view: "tasks" as WorkspaceView
      },
      {
        title: "Worker submits evidence",
        detail: demoSubmission
          ? `${demoSubmission.task_title} has submitted evidence and ${demoSubmission.photo_urls?.length ?? 0} photo(s).`
          : "Start the task, fill the checklist, attach evidence, and submit for manager review.",
        status: getDemoStatus(Boolean(demoSubmission), Boolean(demoSourceTask)),
        view: "tasks" as WorkspaceView
      },
      {
        title: "Failed check creates corrective work",
        detail: demoCorrectiveTasks.length
          ? `${demoCorrectiveTasks.length} corrective task(s) were generated from failed checklist evidence.`
          : "A failed checkbox, bad pool reading, or fault/offline choice creates a child corrective task.",
        status: getDemoStatus(demoCorrectiveTasks.length > 0, Boolean(demoSubmission)),
        view: "tasks" as WorkspaceView
      },
      {
        title: "Manager closes and proves compliance",
        detail: demoSourceTask?.status === "closed"
          ? "The source task is closed with manager review notes."
          : "Manager approves or reopens the submitted task, then generates the compliance pack.",
        status: getDemoStatus(demoSourceTask?.status === "closed", Boolean(demoSubmission)),
        view: "reports" as WorkspaceView
      },
      {
        title: "Client portal validates the audit trail",
        detail: demoReport
          ? `${demoReport.file_name} is available in report history.`
          : "Viewer users can only read their scoped customer data and download their own reports.",
        status: getDemoStatus(Boolean(demoReport), demoSourceTask?.status === "closed"),
        view: "reports" as WorkspaceView
      }
    ],
    [demoCorrectiveTasks.length, demoReport, demoSourceTask, demoSubmission, templates.length]
  );
  const plannerBuckets = useMemo(() => {
    const grouped = plannerTasks.reduce<Record<string, PlannerTask[]>>((accumulator, task) => {
      const key = formatPlannerDay(task.due_date);
      accumulator[key] = accumulator[key] ?? [];
      accumulator[key].push(task);
      return accumulator;
    }, {});

    return Object.entries(grouped);
  }, [plannerTasks]);
  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );
  const siteTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.site_id === selectedSiteId && (!selectedAssetId || task.asset_id === selectedAssetId)
      ),
    [tasks, selectedSiteId, selectedAssetId]
  );
  const siteSubmissions = useMemo(
    () =>
      submissions.filter(
        (submission) =>
          submission.site_id === selectedSiteId &&
          (!selectedAssetId || submission.asset_id === selectedAssetId)
      ),
    [submissions, selectedSiteId, selectedAssetId]
  );

  async function loadWorkspace(activeSession: Session) {
    const [dashboardData, taskData, templateData, siteData, assetData, userData, teamData, customerData, contractData, ruleData, plannerData, deviceData, telemetryData, notificationData, notificationPolicyData, notificationDeliveryData, auditLogData, reportRunData, submissionData] =
      await Promise.all([
        request<Dashboard>("/api/dashboard", activeSession.token),
        request<Task[]>("/api/tasks", activeSession.token),
        request<Template[]>("/api/templates", activeSession.token),
        request<Site[]>("/api/sites", activeSession.token),
        request<Asset[]>("/api/assets", activeSession.token),
        request<User[]>("/api/users", activeSession.token),
        request<Team[]>("/api/teams", activeSession.token),
        request<Customer[]>("/api/customers", activeSession.token),
        request<Contract[]>("/api/contracts", activeSession.token),
        request<AutomationRule[]>("/api/rules", activeSession.token),
        request<PlannerTask[]>("/api/planner", activeSession.token),
        request<Device[]>("/api/devices", activeSession.token),
        request<TelemetryEvent[]>("/api/telemetry", activeSession.token),
        request<NotificationItem[]>("/api/notifications", activeSession.token),
        request<NotificationPolicy[]>("/api/notification-policies", activeSession.token),
        request<NotificationDelivery[]>("/api/notification-deliveries", activeSession.token),
        request<AuditLog[]>("/api/audit-logs", activeSession.token),
        request<ReportRun[]>("/api/reports", activeSession.token),
        request<Submission[]>("/api/submissions", activeSession.token)
      ]);

    setDashboard(dashboardData);
    setTasks(taskData);
    setTemplates(templateData);
    setSites(siteData);
    setAssets(assetData);
    setUsers(userData);
    setTeams(teamData);
    setCustomers(customerData);
    setContracts(contractData);
    setRules(ruleData);
    setPlannerTasks(plannerData);
    setDevices(deviceData);
    setTelemetry(telemetryData);
    setNotifications(notificationData);
    setNotificationPolicies(notificationPolicyData);
    setNotificationDeliveries(notificationDeliveryData);
    setAuditLogs(auditLogData);
    setReportRuns(reportRunData);
    setSubmissions(submissionData);
  }

  useEffect(() => {
    if (!session) return;
    localStorage.setItem("operationhub.session", JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    loadWorkspace(session)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session]);

  useEffect(() => {
    if (session?.user.role !== "viewer") return;
    if (["admin", "audit", "alerts", "monitoring", "templates"].includes(activeView)) {
      setActiveView("overview");
    }
  }, [activeView, session]);

  useEffect(() => {
    if (!selectedTask) {
      setTaskResponse({});
      setTaskNotes("");
      setTaskPhotos(null);
      return;
    }

    setTaskResponse(buildResponseState(selectedTask.items ?? []));
    setTaskNotes("");
    setTaskPhotos(null);
  }, [selectedTask]);

  useEffect(() => {
    if (!selectedSiteId && sites[0]) {
      setSelectedSiteId(sites[0].id);
    }
  }, [sites, selectedSiteId]);

  useEffect(() => {
    const firstAsset = siteAssets[0]?.id ?? "";
    if (selectedAssetId && siteAssets.some((asset) => asset.id === selectedAssetId)) return;
    setSelectedAssetId(firstAsset);
  }, [siteAssets, selectedAssetId]);

  useEffect(() => {
    if (!taskForm.templateId) return;
    const template = templates.find((entry) => entry.id === taskForm.templateId);
    if (!template) return;

    setTaskForm((current) => ({
      ...current,
      scheduleType: template.recurrence ? "recurring" : current.scheduleType,
      recurrenceRule: template.recurrence ?? current.recurrenceRule
    }));
  }, [taskForm.templateId, templates]);

  useEffect(() => {
    setReviewNotes(selectedTask?.review_notes ?? "");
  }, [selectedTask]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const data = await request<Session>("/api/auth/login", undefined, {
        method: "POST",
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password
        })
      });
      setSession(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    try {
      await request("/api/tasks", session.token, {
        method: "POST",
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          vertical: taskForm.vertical,
          templateId: taskForm.templateId || undefined,
          siteId: taskForm.siteId || undefined,
          assetId: taskForm.assetId || undefined,
          assignedTo: taskForm.assignedTo || undefined,
          teamId: taskForm.teamId || undefined,
          dueDate: taskForm.dueDate || undefined,
          scheduleType: taskForm.scheduleType,
          recurrenceRule: taskForm.scheduleType === "recurring" ? taskForm.recurrenceRule || undefined : undefined
        })
      });
      await loadWorkspace(session);
      setActiveView("tasks");
      setTaskForm({
        title: "",
        description: "",
        vertical: "fire",
        templateId: "",
        siteId: "",
        assetId: "",
        assignedTo: "",
        teamId: "",
        dueDate: "",
        scheduleType: "one_time",
        recurrenceRule: ""
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleUseTemplate(template: Template) {
    const firstSite = sites.find((site) => site.vertical === template.vertical);

    setSelectedTemplateId(template.id);
    setTaskForm({
      title: template.name,
      description: template.description,
      vertical: template.vertical,
      templateId: template.id,
      siteId: firstSite?.id ?? "",
      assetId: "",
      assignedTo: "",
      teamId: "",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      scheduleType: template.recurrence ? "recurring" : "one_time",
      recurrenceRule: template.recurrence ?? ""
    });
    setActiveView("tasks");
  }

  async function handleCreateSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    try {
      await request("/api/sites", session.token, {
        method: "POST",
        body: JSON.stringify({
          customerId: siteForm.customerId || undefined,
          name: siteForm.name,
          address: siteForm.address,
          vertical: siteForm.vertical,
          description: siteForm.description
        })
      });
      await loadWorkspace(session);
      setSiteForm({
        customerId: "",
        name: "",
        address: "",
        vertical: "fire",
        description: ""
      });
      setActiveView("sites");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    try {
      await request("/api/assets", session.token, {
        method: "POST",
        body: JSON.stringify(assetForm)
      });
      await loadWorkspace(session);
      setSelectedSiteId(assetForm.siteId);
      setAssetForm({
        siteId: "",
        name: "",
        assetType: "",
        vertical: "fire",
        status: "active",
        serialNumber: "",
        description: ""
      });
      setActiveView("sites");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    setSavingDevice(true);
    try {
      await request("/api/devices", session.token, {
        method: "POST",
        body: JSON.stringify({
          siteId: deviceForm.siteId,
          assetId: deviceForm.assetId || undefined,
          name: deviceForm.name,
          deviceType: deviceForm.deviceType,
          vertical: deviceForm.vertical,
          identifier: deviceForm.identifier || undefined
        })
      });
      await loadWorkspace(session);
      setDeviceForm({
        siteId: "",
        assetId: "",
        name: "",
        deviceType: "pool-probe",
        vertical: "pool",
        identifier: ""
      });
      setActiveView("monitoring");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingDevice(false);
    }
  }

  async function handleSendTelemetry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    setSendingTelemetry(true);
    try {
      await request("/api/telemetry", session.token, {
        method: "POST",
        body: JSON.stringify({
          deviceId: telemetryForm.deviceId,
          eventType: telemetryForm.eventType,
          readingValue: telemetryForm.readingValue ? Number(telemetryForm.readingValue) : undefined,
          readingText: telemetryForm.readingText || undefined,
          severity: telemetryForm.severity
        })
      });
      await loadWorkspace(session);
      setActiveView("alerts");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSendingTelemetry(false);
    }
  }

  async function handleMarkNotificationRead(id: string) {
    if (!session) return;
    try {
      await request(`/api/notifications/${id}/read`, session.token, { method: "POST" });
      await loadWorkspace(session);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleAcknowledgeNotification(id: string) {
    if (!session) return;
    try {
      await request(`/api/notifications/${id}/acknowledge`, session.token, { method: "POST" });
      await loadWorkspace(session);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleResolveNotification(id: string) {
    if (!session) return;
    try {
      await request(`/api/notifications/${id}/resolve`, session.token, { method: "POST" });
      await loadWorkspace(session);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    setSavingUser(true);
    try {
      await request("/api/users", session.token, {
        method: "POST",
        body: JSON.stringify({
          ...userForm,
          customerId: userForm.role === "viewer" && userForm.customerId ? userForm.customerId : undefined
        })
      });
      await loadWorkspace(session);
      setUserForm({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "worker",
        customerId: ""
      });
      setActiveView("admin");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingUser(false);
    }
  }

  async function handleCreateTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    setSavingTeam(true);
    try {
      await request("/api/teams", session.token, {
        method: "POST",
        body: JSON.stringify(teamForm)
      });
      await loadWorkspace(session);
      setTeamForm({
        name: "",
        vertical: "fire",
        description: ""
      });
      setActiveView("admin");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingTeam(false);
    }
  }

  async function handleAssignTeamMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    setSavingMembership(true);
    try {
      await request(`/api/teams/${membershipForm.teamId}/members`, session.token, {
        method: "POST",
        body: JSON.stringify({
          userId: membershipForm.userId,
          memberRole: membershipForm.memberRole
        })
      });
      await loadWorkspace(session);
      setMembershipForm({
        teamId: "",
        userId: "",
        memberRole: "member"
      });
      setActiveView("admin");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingMembership(false);
    }
  }

  async function handleCreateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    try {
      await request("/api/customers", session.token, {
        method: "POST",
        body: JSON.stringify(customerForm)
      });
      await loadWorkspace(session);
      setCustomerForm({
        name: "",
        vertical: "fire",
        contactName: "",
        contactEmail: "",
        phone: "",
        notes: ""
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    try {
      await request("/api/contracts", session.token, {
        method: "POST",
        body: JSON.stringify(contractForm)
      });
      await loadWorkspace(session);
      setContractForm({
        customerId: "",
        name: "",
        vertical: "fire",
        status: "active",
        startDate: "",
        endDate: "",
        slaNotes: ""
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    setSavingRule(true);
    try {
      await request("/api/rules", session.token, {
        method: "POST",
        body: JSON.stringify({
          name: ruleForm.name,
          vertical: ruleForm.vertical || null,
          triggerSource: ruleForm.triggerSource,
          eventType: ruleForm.triggerSource === "telemetry" ? ruleForm.eventType || undefined : undefined,
          comparator: ruleForm.triggerSource === "telemetry" ? ruleForm.comparator : "any",
          thresholdMin: ruleForm.thresholdMin ? Number(ruleForm.thresholdMin) : undefined,
          thresholdMax: ruleForm.thresholdMax ? Number(ruleForm.thresholdMax) : undefined,
          severityFilter: ruleForm.triggerSource === "telemetry" ? ruleForm.severityFilter : undefined,
          taskStatus: ruleForm.triggerSource === "task_overdue" ? ruleForm.taskStatus : undefined,
          actionType: ruleForm.actionType,
          actionTitle: ruleForm.actionTitle,
          actionMessage: ruleForm.actionMessage,
          targetTeamId: ruleForm.targetTeamId || undefined
        })
      });
      await loadWorkspace(session);
      setRuleForm({
        name: "",
        vertical: "fire",
        triggerSource: "telemetry",
        eventType: "",
        comparator: "lt",
        thresholdMin: "",
        thresholdMax: "",
        severityFilter: "warning",
        taskStatus: "pending",
        actionType: "create_task",
        actionTitle: "",
        actionMessage: "",
        targetTeamId: ""
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingRule(false);
    }
  }

  async function handleToggleRule(id: string, enabled: boolean) {
    if (!session) return;
    setError("");
    try {
      await request(`/api/rules/${id}/enabled`, session.token, {
        method: "PATCH",
        body: JSON.stringify({ enabled })
      });
      await loadWorkspace(session);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateNotificationPolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    setSavingNotificationPolicy(true);
    try {
      await request("/api/notification-policies", session.token, {
        method: "POST",
        body: JSON.stringify({
          name: notificationPolicyForm.name,
          notificationType: notificationPolicyForm.notificationType || undefined,
          channel: notificationPolicyForm.channel,
          targetRole: notificationPolicyForm.targetRole || undefined,
          delayMinutes: Number(notificationPolicyForm.delayMinutes || "0"),
          repeatCount: Number(notificationPolicyForm.repeatCount || "1")
        })
      });
      await loadWorkspace(session);
      setNotificationPolicyForm({
        name: "",
        notificationType: "rule",
        channel: "email",
        targetRole: "manager",
        delayMinutes: "0",
        repeatCount: "1"
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingNotificationPolicy(false);
    }
  }

  async function handleToggleNotificationPolicy(id: string, enabled: boolean) {
    if (!session) return;
    setError("");
    try {
      await request(`/api/notification-policies/${id}/enabled`, session.token, {
        method: "PATCH",
        body: JSON.stringify({ enabled })
      });
      await loadWorkspace(session);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSubmitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedTask) return;
    setError("");

    const missingRequired = (selectedTask.items ?? [])
      .filter((item) => item.required)
      .filter((item) => {
        if (item.type === "photo") return !taskPhotos?.length;
        const value = taskResponse[item.key];
        if (item.type === "checkbox") return typeof value !== "boolean";
        return value === undefined || value === null || String(value).trim() === "";
      })
      .map((item) => item.label);

    if (missingRequired.length) {
      setError(`Missing required checklist evidence: ${missingRequired.join(", ")}`);
      return;
    }

    setSubmittingTask(true);

    try {
      const formData = new FormData();
      formData.append("taskId", selectedTask.id);
      formData.append("notes", taskNotes);
      formData.append(
        "payload",
        JSON.stringify(
          selectedTask.items.map((item) => ({
            key: item.key,
            label: item.label,
            type: item.type,
            value: taskResponse[item.key] ?? null
          }))
        )
      );
      Array.from(taskPhotos ?? []).forEach((file) => formData.append("photos", file));

      const response = await fetch(`${apiUrl}/api/submissions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: formData
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to submit task");
      }

      await loadWorkspace(session);
      setSelectedTaskId("");
      setActiveView("submissions");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmittingTask(false);
    }
  }

  async function handleTaskAction(action: "start" | "approve" | "reopen" | "mark_overdue") {
    if (!session || !selectedTask) return;
    setError("");
    setTaskActionLoading(true);

    try {
      await request(`/api/tasks/${selectedTask.id}/review`, session.token, {
        method: "POST",
        body: JSON.stringify({
          action,
          reviewNotes: reviewNotes || undefined
        })
      });
      await loadWorkspace(session);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTaskActionLoading(false);
    }
  }

  async function handleRunRecurringSync() {
    if (!session) return;
    setError("");
    setSyncingRecurring(true);

    try {
      await request("/api/automation/run-recurring", session.token, { method: "POST" });
      await loadWorkspace(session);
      setActiveView("tasks");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSyncingRecurring(false);
    }
  }

  async function handleDownloadComplianceReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    setGeneratingReport(true);

    try {
      const params = new URLSearchParams({ days: reportForm.days });
      if (reportForm.vertical !== "all") {
        params.set("vertical", reportForm.vertical);
      }

      const response = await fetch(`${apiUrl}/api/reports/compliance.pdf?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `operationhub-compliance-${reportForm.vertical}-${reportForm.days}d.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      await loadWorkspace(session);
      setActiveView("reports");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGeneratingReport(false);
    }
  }

  async function downloadBlob(path: string, filename: string) {
    if (!session) return;
    const response = await fetch(`${apiUrl}${path}`, {
      headers: { Authorization: `Bearer ${session.token}` }
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to download file");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async function handleDownloadCsvExport() {
    if (!session) return;
    setError("");
    setExportingCsv(true);

    try {
      const params = new URLSearchParams({
        dataset: reportForm.csvDataset,
        days: reportForm.days
      });
      if (reportForm.vertical !== "all") {
        params.set("vertical", reportForm.vertical);
      }

      await downloadBlob(
        `/api/reports/export.csv?${params.toString()}`,
        `operationhub-${reportForm.csvDataset}-${reportForm.vertical}-${reportForm.days}d.csv`
      );
      await loadWorkspace(session);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExportingCsv(false);
    }
  }

  async function handleDownloadReportRun(report: ReportRun) {
    if (!session) return;
    setError("");
    try {
      await downloadBlob(`/api/reports/${report.id}/download`, report.file_name);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleTaskFieldChange(item: ChecklistItem, event: ChangeEvent<HTMLInputElement>) {
    setTaskResponse((current) => ({
      ...current,
      [item.key]: item.type === "checkbox" ? event.target.checked : event.target.value
    }));
  }

  function renderTaskInput(item: ChecklistItem) {
    const label = `${item.label}${item.required ? " *" : ""}`;

    if (item.type === "checkbox") {
      return (
        <label className="check-row" key={item.key}>
          <input
            type="checkbox"
            checked={Boolean(taskResponse[item.key])}
            onChange={(event) => handleTaskFieldChange(item, event)}
          />
          <span>{label}</span>
        </label>
      );
    }

    if (item.type === "choice") {
      return (
        <label className="field-stack" key={item.key}>
          <span>{label}</span>
          <select
            value={String(taskResponse[item.key] ?? "")}
            onChange={(event) => setTaskResponse((current) => ({ ...current, [item.key]: event.target.value }))}
            required={item.required}
          >
            <option value="">Select result</option>
            {(item.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (item.type === "photo") {
      return (
        <div className="checklist-line" key={item.key}>
          <strong>{label}</strong>
          <span>Attach using Evidence photos below</span>
        </div>
      );
    }

    return (
      <label className="field-stack" key={item.key}>
        <span>{label}</span>
        <input
          type={item.type === "number" ? "number" : "text"}
          value={String(taskResponse[item.key] ?? "")}
          onChange={(event) => handleTaskFieldChange(item, event)}
          placeholder={item.type === "number" ? "Enter reading" : "Enter response"}
          required={item.required}
        />
      </label>
    );
  }

  if (!session) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p className="eyebrow">operations.example.com</p>
          <h1>OperationHub</h1>
          <p className="subcopy">
            Shared operations control for fire inspections, smart parking, and pool compliance.
          </p>
          <form onSubmit={handleLogin} className="stack" autoComplete="off">
            <input type="text" name="username" autoComplete="username" tabIndex={-1} aria-hidden="true" style={{ display: "none" }} />
            <input type="password" name="password" autoComplete="current-password" tabIndex={-1} aria-hidden="true" style={{ display: "none" }} />
            <input
              name="operationhub-email"
              type="email"
              placeholder="Email"
              autoComplete="off"
              value={loginForm.email}
              onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
            <input
              name="operationhub-password"
              type="password"
              placeholder="Password"
              autoComplete="new-password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
            <button type="submit">Sign In</button>
          </form>
          {error ? <p className="error">{error}</p> : null}
        </div>
      </div>
    );
  }

  const isViewer = session.user.role === "viewer";
  const allNavItems: { id: WorkspaceView; label: string; hint: string }[] = [
    { id: "overview", label: "Overview", hint: "Workspace status" },
    { id: "demo", label: "Demo", hint: "Interview walkthrough" },
    { id: "enterprise", label: "Enterprise", hint: "Gaps and roadmap" },
    { id: "planner", label: "Planner", hint: "Due dates and dispatch" },
    { id: "tasks", label: "Tasks", hint: "Run operational work" },
    { id: "templates", label: "Templates", hint: "Checklist packs" },
    { id: "sites", label: "Sites & Assets", hint: "Equipment and locations" },
    { id: "monitoring", label: "Monitoring", hint: "Devices and telemetry" },
    { id: "alerts", label: "Alerts", hint: "Notifications and issues" },
    { id: "admin", label: "Admin", hint: "Users and teams" },
    { id: "submissions", label: "Evidence", hint: "Completed proof" },
    { id: "audit", label: "Audit", hint: "Change history" },
    { id: "reports", label: "Reports", hint: "Compliance packs" }
  ];
  const viewerNavItems: WorkspaceView[] = ["overview", "demo", "enterprise", "planner", "tasks", "sites", "submissions", "reports"];
  const navItems = allNavItems.filter((item) => (isViewer ? viewerNavItems.includes(item.id) : true));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div>
            <p className="eyebrow">OperationHub</p>
            <h2>
              {session.user.firstName} {session.user.lastName}
            </h2>
            <p>{session.user.email}</p>
          </div>
          <nav className="nav-list">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-button ${activeView === item.id ? "active" : ""}`}
                onClick={() => setActiveView(item.id)}
              >
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </button>
            ))}
          </nav>
        </div>
        <button
          className="secondary"
          onClick={() => {
            localStorage.removeItem("operationhub.session");
            setSession(null);
          }}
        >
          Sign Out
        </button>
      </aside>

      <main className="content">
        <section className="hero">
          <div>
            <p className="eyebrow">Operational Workspace</p>
            <h1>Multi-vertical field operations environment</h1>
            <p className="subcopy">
              Manage sites, register operational assets, schedule recurring work, and capture evidence from the field.
            </p>
          </div>
          <div className="vertical-grid">
            {Object.entries(verticalMeta).map(([key, meta]) => (
                <button
                  type="button"
                  key={key}
                  className="vertical-card"
                style={{ borderColor: meta.accent }}
                onClick={() => {
                  setTaskForm((current) => ({ ...current, vertical: key, templateId: "", siteId: "", assetId: "" }));
                  setActiveView("templates");
                }}
              >
                <span>{meta.title}</span>
                <p>{meta.summary}</p>
              </button>
                ))}
              </div>
            </section>

        {error ? <p className="error">{error}</p> : null}
        {loading ? <p>Loading workspace…</p> : null}

        <section className="metrics">
          {dashboard?.taskBreakdown.map((item) => (
            <article key={item.status} className="metric-card">
              <span>{item.status.replace("_", " ")}</span>
              <strong>{item.count}</strong>
            </article>
          ))}
          <article className="metric-card">
            <span>submissions</span>
            <strong>{dashboard?.submissionCount ?? 0}</strong>
          </article>
          <article className="metric-card">
            <span>sites</span>
            <strong>{dashboard?.siteCount ?? 0}</strong>
          </article>
          <article className="metric-card">
            <span>assets</span>
            <strong>{dashboard?.assetCount ?? 0}</strong>
          </article>
          <article className="metric-card">
            <span>teams</span>
            <strong>{dashboard?.teamCount ?? 0}</strong>
          </article>
          <article className="metric-card">
            <span>users</span>
            <strong>{dashboard?.userCount ?? 0}</strong>
          </article>
          <article className="metric-card">
            <span>customers</span>
            <strong>{dashboard?.customerCount ?? 0}</strong>
          </article>
          <article className="metric-card">
            <span>contracts</span>
            <strong>{dashboard?.contractCount ?? 0}</strong>
          </article>
        </section>

        <section className="workspace-grid">
          <article className="panel">
            <div className="panel-header">
              <h3>Control Desk</h3>
            <p>
              {activeView === "sites"
                ? "Register locations and the operational assets that live there."
                : activeView === "demo"
                  ? "Run the showcase in a deliberate order: template, dispatch, evidence, corrective action, approval, report."
                : activeView === "enterprise"
                  ? "Explain what is already enterprise-shaped and what still needs hardening."
                : activeView === "planner"
                    ? "Review due work across days, teams, and assignees before dispatch."
                  : activeView === "monitoring"
                    ? "Register devices and simulate telemetry to demonstrate sensor-driven workflows."
                    : activeView === "alerts"
                      ? "Review notifications raised by telemetry, automation, and task lifecycle events."
                    : activeView === "admin"
                      ? "Create users, stand up teams, and shape who owns operational work."
                    : activeView === "audit"
                      ? "Inspect immutable operational history across users, tasks, alerts, rules, and assets."
                    : activeView === "reports"
                      ? "Generate compliance packs for customers, auditors, and operational reviews."
                  : "Create one-time or recurring work orders from your checklist library."}
              </p>
              <div className="button-row">
                {activeView === "overview" ? (
                  <button type="button" className="secondary" onClick={handleRunRecurringSync} disabled={syncingRecurring}>
                    {syncingRecurring ? "Syncing schedules..." : "Run recurring sync"}
                  </button>
                ) : null}
                {activeView === "demo" ? (
                  <button type="button" className="secondary" onClick={() => setActiveView("templates")}>
                    Start with templates
                  </button>
                ) : null}
                {activeView === "enterprise" ? (
                  <button type="button" className="secondary" onClick={() => setActiveView("demo")}>
                    Open demo path
                  </button>
                ) : null}
              </div>
            </div>

            {activeView === "reports" ? (
              <form onSubmit={handleDownloadComplianceReport} className="stack">
                <h4>Generate compliance pack</h4>
                <select
                  value={reportForm.vertical}
                  onChange={(event) => setReportForm({ ...reportForm, vertical: event.target.value })}
                >
                  <option value="all">All verticals</option>
                  <option value="fire">Fire</option>
                  <option value="parking">Parking</option>
                  <option value="pool">Pool</option>
                </select>
                <select
                  value={reportForm.days}
                  onChange={(event) => setReportForm({ ...reportForm, days: event.target.value })}
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last 365 days</option>
                </select>
                <button type="submit" disabled={generatingReport}>
                  {generatingReport ? "Generating..." : "Generate PDF report"}
                </button>
                <h4>Export CSV</h4>
                <select
                  value={reportForm.csvDataset}
                  onChange={(event) => setReportForm({ ...reportForm, csvDataset: event.target.value })}
                >
                  <option value="tasks">Tasks</option>
                  <option value="submissions">Submissions</option>
                  <option value="audit">Audit trail</option>
                </select>
                <button type="button" className="secondary" onClick={handleDownloadCsvExport} disabled={exportingCsv}>
                  {exportingCsv ? "Exporting..." : "Download CSV export"}
                </button>
                <p className="muted-line">
                  PDF packs and CSV exports are saved into report history for later download.
                </p>
              </form>
            ) : activeView === "demo" ? (
              <div className="stack">
                <h4>Showcase controls</h4>
                <p className="muted-line">
                  Use this sequence in the interview. It maps directly to the live modules and proves the platform model.
                </p>
                <div className="demo-mini-list">
                  <button type="button" className="secondary" onClick={() => setActiveView("templates")}>
                    1. Template library
                  </button>
                  <button type="button" className="secondary" onClick={() => setActiveView("tasks")}>
                    2. Active work queue
                  </button>
                  <button type="button" className="secondary" onClick={() => setActiveView("submissions")}>
                    3. Evidence log
                  </button>
                  <button type="button" className="secondary" onClick={() => setActiveView("reports")}>
                    4. Compliance reports
                  </button>
                </div>
                <p className="muted-line">
                  For role separation, log in as worker to submit, manager to approve, and viewer to inspect customer-scoped proof.
                </p>
              </div>
            ) : activeView === "enterprise" ? (
              <div className="stack">
                <h4>Enterprise posture</h4>
                <p className="muted-line">
                  Current build proves the platform pattern. The roadmap hardens identity, permissions, mobile reliability, sensor ingestion, and operations.
                </p>
                <button type="button" onClick={() => setActiveView("reports")}>
                  Show compliance layer
                </button>
                <button type="button" className="secondary" onClick={() => setActiveView("monitoring")}>
                  Show monitoring layer
                </button>
              </div>
            ) : isViewer ? (
              <div className="stack">
                <h4>Customer portal</h4>
                <p className="muted-line">
                  Viewer access is read-only. Use the workspace panels to inspect assigned operational records and generate your own compliance exports.
                </p>
              </div>
            ) : activeView === "sites" ? (
              <div className="stack">
                <form onSubmit={handleCreateSite} className="stack">
                  <h4>Create site</h4>
                  <select
                    value={siteForm.customerId}
                    onChange={(event) => setSiteForm({ ...siteForm, customerId: event.target.value })}
                  >
                    <option value="">Select customer</option>
                    {customersForVertical.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={siteForm.name}
                    onChange={(event) => setSiteForm({ ...siteForm, name: event.target.value })}
                    placeholder="Site name"
                    required
                  />
                  <input
                    value={siteForm.address}
                    onChange={(event) => setSiteForm({ ...siteForm, address: event.target.value })}
                    placeholder="Address"
                  />
                  <select
                    value={siteForm.vertical}
                    onChange={(event) => setSiteForm({ ...siteForm, vertical: event.target.value, customerId: "" })}
                  >
                    <option value="fire">Fire</option>
                    <option value="parking">Parking</option>
                    <option value="pool">Pool</option>
                  </select>
                  <textarea
                    rows={3}
                    value={siteForm.description}
                    onChange={(event) => setSiteForm({ ...siteForm, description: event.target.value })}
                    placeholder="Operational notes or location summary"
                  />
                  <button type="submit">Create site</button>
                </form>

                <form onSubmit={handleCreateAsset} className="stack">
                  <h4>Create asset</h4>
                  <select
                    value={assetForm.siteId}
                    onChange={(event) => {
                      const site = sites.find((entry) => entry.id === event.target.value);
                      setAssetForm({
                        ...assetForm,
                        siteId: event.target.value,
                        vertical: site?.vertical ?? assetForm.vertical
                      });
                    }}
                    required
                  >
                    <option value="">Select site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={assetForm.name}
                    onChange={(event) => setAssetForm({ ...assetForm, name: event.target.value })}
                    placeholder="Asset name"
                    required
                  />
                  <input
                    value={assetForm.assetType}
                    onChange={(event) => setAssetForm({ ...assetForm, assetType: event.target.value })}
                    placeholder="Asset type"
                    required
                  />
                  <select
                    value={assetForm.status}
                    onChange={(event) => setAssetForm({ ...assetForm, status: event.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="attention">Attention</option>
                    <option value="offline">Offline</option>
                  </select>
                  <input
                    value={assetForm.serialNumber}
                    onChange={(event) => setAssetForm({ ...assetForm, serialNumber: event.target.value })}
                    placeholder="Serial or asset tag"
                  />
                  <textarea
                    rows={3}
                    value={assetForm.description}
                    onChange={(event) => setAssetForm({ ...assetForm, description: event.target.value })}
                    placeholder="Asset notes"
                  />
                  <button type="submit">Create asset</button>
                </form>
              </div>
            ) : activeView === "monitoring" ? (
              <div className="stack">
                <form onSubmit={handleCreateDevice} className="stack">
                  <h4>Create device</h4>
                  <select
                    value={deviceForm.siteId}
                    onChange={(event) => {
                      const site = sites.find((entry) => entry.id === event.target.value);
                      setDeviceForm({
                        ...deviceForm,
                        siteId: event.target.value,
                        assetId: "",
                        vertical: site?.vertical ?? deviceForm.vertical
                      });
                    }}
                    required
                  >
                    <option value="">Select site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={deviceForm.assetId}
                    onChange={(event) => setDeviceForm({ ...deviceForm, assetId: event.target.value })}
                  >
                    <option value="">Select asset</option>
                    {assets
                      .filter((asset) => !deviceForm.siteId || asset.site_id === deviceForm.siteId)
                      .map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                  </select>
                  <input
                    value={deviceForm.name}
                    onChange={(event) => setDeviceForm({ ...deviceForm, name: event.target.value })}
                    placeholder="Device name"
                    required
                  />
                  <input
                    value={deviceForm.deviceType}
                    onChange={(event) => setDeviceForm({ ...deviceForm, deviceType: event.target.value })}
                    placeholder="Device type"
                    required
                  />
                  <input
                    value={deviceForm.identifier}
                    onChange={(event) => setDeviceForm({ ...deviceForm, identifier: event.target.value })}
                    placeholder="Device identifier"
                  />
                  <button type="submit" disabled={savingDevice}>
                    {savingDevice ? "Saving..." : "Create device"}
                  </button>
                </form>

                <form onSubmit={handleSendTelemetry} className="stack">
                  <h4>Send telemetry event</h4>
                  <select
                    value={telemetryForm.deviceId}
                    onChange={(event) => setTelemetryForm({ ...telemetryForm, deviceId: event.target.value })}
                    required
                  >
                    <option value="">Select device</option>
                    {devices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={telemetryForm.eventType}
                    onChange={(event) => setTelemetryForm({ ...telemetryForm, eventType: event.target.value })}
                    placeholder="Event type, e.g. ph, pressure, occupancy"
                    required
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={telemetryForm.readingValue}
                    onChange={(event) => setTelemetryForm({ ...telemetryForm, readingValue: event.target.value })}
                    placeholder="Reading value"
                  />
                  <input
                    value={telemetryForm.readingText}
                    onChange={(event) => setTelemetryForm({ ...telemetryForm, readingText: event.target.value })}
                    placeholder="Optional text reading"
                  />
                  <select
                    value={telemetryForm.severity}
                    onChange={(event) => setTelemetryForm({ ...telemetryForm, severity: event.target.value })}
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                  <button type="submit" disabled={sendingTelemetry}>
                    {sendingTelemetry ? "Sending..." : "Send telemetry"}
                  </button>
                </form>
              </div>
            ) : activeView === "admin" ? (
              <div className="stack">
                <form onSubmit={handleCreateUser} className="stack">
                  <h4>Create user</h4>
                  <input
                    value={userForm.firstName}
                    onChange={(event) => setUserForm({ ...userForm, firstName: event.target.value })}
                    placeholder="First name"
                    required
                  />
                  <input
                    value={userForm.lastName}
                    onChange={(event) => setUserForm({ ...userForm, lastName: event.target.value })}
                    placeholder="Last name"
                    required
                  />
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
                    placeholder="Email"
                    required
                  />
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
                    placeholder="Temporary password"
                    required
                  />
                  <select
                    value={userForm.role}
                    onChange={(event) => setUserForm({ ...userForm, role: event.target.value, customerId: "" })}
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="worker">Worker</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  {userForm.role === "viewer" ? (
                    <select
                      value={userForm.customerId}
                      onChange={(event) => setUserForm({ ...userForm, customerId: event.target.value })}
                    >
                      <option value="">No customer scope</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <button type="submit" disabled={savingUser}>
                    {savingUser ? "Saving..." : "Create user"}
                  </button>
                </form>

                <form onSubmit={handleCreateTeam} className="stack">
                  <h4>Create team</h4>
                  <input
                    value={teamForm.name}
                    onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })}
                    placeholder="Team name"
                    required
                  />
                  <select
                    value={teamForm.vertical}
                    onChange={(event) => setTeamForm({ ...teamForm, vertical: event.target.value })}
                  >
                    <option value="fire">Fire</option>
                    <option value="parking">Parking</option>
                    <option value="pool">Pool</option>
                  </select>
                  <textarea
                    rows={3}
                    value={teamForm.description}
                    onChange={(event) => setTeamForm({ ...teamForm, description: event.target.value })}
                    placeholder="Operational responsibility"
                  />
                  <button type="submit" disabled={savingTeam}>
                    {savingTeam ? "Saving..." : "Create team"}
                  </button>
                </form>

                <form onSubmit={handleAssignTeamMember} className="stack">
                  <h4>Assign team member</h4>
                  <select
                    value={membershipForm.teamId}
                    onChange={(event) => setMembershipForm({ ...membershipForm, teamId: event.target.value })}
                    required
                  >
                    <option value="">Select team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={membershipForm.userId}
                    onChange={(event) => setMembershipForm({ ...membershipForm, userId: event.target.value })}
                    required
                  >
                    <option value="">Select user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={membershipForm.memberRole}
                    onChange={(event) => setMembershipForm({ ...membershipForm, memberRole: event.target.value })}
                  >
                    <option value="member">Member</option>
                    <option value="lead">Lead</option>
                  </select>
                  <button type="submit" disabled={savingMembership}>
                    {savingMembership ? "Saving..." : "Assign member"}
                  </button>
                </form>

                <form onSubmit={handleCreateCustomer} className="stack">
                  <h4>Create customer</h4>
                  <input
                    value={customerForm.name}
                    onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })}
                    placeholder="Customer name"
                    required
                  />
                  <select
                    value={customerForm.vertical}
                    onChange={(event) => setCustomerForm({ ...customerForm, vertical: event.target.value })}
                  >
                    <option value="fire">Fire</option>
                    <option value="parking">Parking</option>
                    <option value="pool">Pool</option>
                  </select>
                  <input
                    value={customerForm.contactName}
                    onChange={(event) => setCustomerForm({ ...customerForm, contactName: event.target.value })}
                    placeholder="Contact name"
                  />
                  <input
                    type="email"
                    value={customerForm.contactEmail}
                    onChange={(event) => setCustomerForm({ ...customerForm, contactEmail: event.target.value })}
                    placeholder="Contact email"
                  />
                  <input
                    value={customerForm.phone}
                    onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })}
                    placeholder="Phone"
                  />
                  <textarea
                    rows={3}
                    value={customerForm.notes}
                    onChange={(event) => setCustomerForm({ ...customerForm, notes: event.target.value })}
                    placeholder="Customer notes"
                  />
                  <button type="submit">Create customer</button>
                </form>

                <form onSubmit={handleCreateContract} className="stack">
                  <h4>Create contract</h4>
                  <select
                    value={contractForm.customerId}
                    onChange={(event) => setContractForm({ ...contractForm, customerId: event.target.value })}
                    required
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={contractForm.name}
                    onChange={(event) => setContractForm({ ...contractForm, name: event.target.value })}
                    placeholder="Contract name"
                    required
                  />
                  <select
                    value={contractForm.vertical}
                    onChange={(event) => setContractForm({ ...contractForm, vertical: event.target.value })}
                  >
                    <option value="fire">Fire</option>
                    <option value="parking">Parking</option>
                    <option value="pool">Pool</option>
                  </select>
                  <select
                    value={contractForm.status}
                    onChange={(event) => setContractForm({ ...contractForm, status: event.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                  </select>
                  <input
                    type="date"
                    value={contractForm.startDate}
                    onChange={(event) => setContractForm({ ...contractForm, startDate: event.target.value })}
                  />
                  <input
                    type="date"
                    value={contractForm.endDate}
                    onChange={(event) => setContractForm({ ...contractForm, endDate: event.target.value })}
                  />
                  <textarea
                    rows={3}
                    value={contractForm.slaNotes}
                    onChange={(event) => setContractForm({ ...contractForm, slaNotes: event.target.value })}
                    placeholder="SLA notes"
                  />
                  <button type="submit">Create contract</button>
                </form>

                <form onSubmit={handleCreateRule} className="stack">
                  <h4>Create automation rule</h4>
                  <input
                    value={ruleForm.name}
                    onChange={(event) => setRuleForm({ ...ruleForm, name: event.target.value })}
                    placeholder="Rule name"
                    required
                  />
                  <select
                    value={ruleForm.vertical}
                    onChange={(event) => setRuleForm({ ...ruleForm, vertical: event.target.value, targetTeamId: "" })}
                  >
                    <option value="fire">Fire</option>
                    <option value="parking">Parking</option>
                    <option value="pool">Pool</option>
                  </select>
                  <select
                    value={ruleForm.triggerSource}
                    onChange={(event) => setRuleForm({ ...ruleForm, triggerSource: event.target.value })}
                  >
                    <option value="telemetry">Telemetry</option>
                    <option value="task_overdue">Task overdue</option>
                  </select>
                  {ruleForm.triggerSource === "telemetry" ? (
                    <>
                      <input
                        value={ruleForm.eventType}
                        onChange={(event) => setRuleForm({ ...ruleForm, eventType: event.target.value })}
                        placeholder="Event type, e.g. ph, pressure, occupancy"
                        required
                      />
                      <select
                        value={ruleForm.comparator}
                        onChange={(event) => setRuleForm({ ...ruleForm, comparator: event.target.value })}
                      >
                        <option value="lt">Less than</option>
                        <option value="gt">Greater than</option>
                        <option value="outside_range">Outside range</option>
                        <option value="equals">Equals</option>
                        <option value="any">Any</option>
                      </select>
                      <input
                        type="number"
                        step="0.1"
                        value={ruleForm.thresholdMin}
                        onChange={(event) => setRuleForm({ ...ruleForm, thresholdMin: event.target.value })}
                        placeholder="Threshold min"
                      />
                      {ruleForm.comparator === "outside_range" ? (
                        <input
                          type="number"
                          step="0.1"
                          value={ruleForm.thresholdMax}
                          onChange={(event) => setRuleForm({ ...ruleForm, thresholdMax: event.target.value })}
                          placeholder="Threshold max"
                        />
                      ) : null}
                      <select
                        value={ruleForm.severityFilter}
                        onChange={(event) => setRuleForm({ ...ruleForm, severityFilter: event.target.value })}
                      >
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="critical">Critical</option>
                      </select>
                    </>
                  ) : (
                    <select
                      value={ruleForm.taskStatus}
                      onChange={(event) => setRuleForm({ ...ruleForm, taskStatus: event.target.value })}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="awaiting_review">Awaiting review</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  )}
                  <select
                    value={ruleForm.actionType}
                    onChange={(event) => setRuleForm({ ...ruleForm, actionType: event.target.value })}
                  >
                    <option value="create_task">Create task</option>
                    <option value="notify">Notify</option>
                    <option value="mark_overdue">Mark overdue</option>
                  </select>
                  <select
                    value={ruleForm.targetTeamId}
                    onChange={(event) => setRuleForm({ ...ruleForm, targetTeamId: event.target.value })}
                  >
                    <option value="">Select target team</option>
                    {teams
                      .filter((team) => team.vertical === ruleForm.vertical)
                      .map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                  </select>
                  <input
                    value={ruleForm.actionTitle}
                    onChange={(event) => setRuleForm({ ...ruleForm, actionTitle: event.target.value })}
                    placeholder="Action title"
                    required
                  />
                  <textarea
                    rows={3}
                    value={ruleForm.actionMessage}
                    onChange={(event) => setRuleForm({ ...ruleForm, actionMessage: event.target.value })}
                    placeholder="Action message"
                    required
                  />
                  <button type="submit" disabled={savingRule}>
                    {savingRule ? "Saving..." : "Create rule"}
                  </button>
                </form>

                <form onSubmit={handleCreateNotificationPolicy} className="stack">
                  <h4>Create notification policy</h4>
                  <input
                    value={notificationPolicyForm.name}
                    onChange={(event) => setNotificationPolicyForm({ ...notificationPolicyForm, name: event.target.value })}
                    placeholder="Policy name"
                    required
                  />
                  <select
                    value={notificationPolicyForm.notificationType}
                    onChange={(event) => setNotificationPolicyForm({ ...notificationPolicyForm, notificationType: event.target.value })}
                  >
                    <option value="rule">Rule</option>
                    <option value="telemetry">Telemetry</option>
                    <option value="escalation">Escalation</option>
                  </select>
                  <select
                    value={notificationPolicyForm.channel}
                    onChange={(event) => setNotificationPolicyForm({ ...notificationPolicyForm, channel: event.target.value })}
                  >
                    <option value="in_app">In-app</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="slack">Slack</option>
                  </select>
                  <select
                    value={notificationPolicyForm.targetRole}
                    onChange={(event) => setNotificationPolicyForm({ ...notificationPolicyForm, targetRole: event.target.value })}
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="worker">Worker</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={notificationPolicyForm.delayMinutes}
                    onChange={(event) => setNotificationPolicyForm({ ...notificationPolicyForm, delayMinutes: event.target.value })}
                    placeholder="Delay minutes"
                  />
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={notificationPolicyForm.repeatCount}
                    onChange={(event) => setNotificationPolicyForm({ ...notificationPolicyForm, repeatCount: event.target.value })}
                    placeholder="Repeat count"
                  />
                  <button type="submit" disabled={savingNotificationPolicy}>
                    {savingNotificationPolicy ? "Saving..." : "Create policy"}
                  </button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleCreateTask} className="stack">
                <input
                  value={taskForm.title}
                  onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                  placeholder="Task title"
                  required
                />
                <textarea
                  value={taskForm.description}
                  onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })}
                  placeholder="Description"
                  rows={3}
                />
                <select
                  value={taskForm.vertical}
                  onChange={(event) =>
                    setTaskForm({
                      ...taskForm,
                      vertical: event.target.value,
                      templateId: "",
                      siteId: "",
                      assetId: ""
                    })
                  }
                >
                  <option value="fire">Fire</option>
                  <option value="parking">Parking</option>
                  <option value="pool">Pool</option>
                </select>
                <select
                  value={taskForm.templateId}
                  onChange={(event) => setTaskForm({ ...taskForm, templateId: event.target.value })}
                >
                  <option value="">Select template</option>
                  {templatesForVertical.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <select
                  value={taskForm.siteId}
                  onChange={(event) =>
                    setTaskForm({ ...taskForm, siteId: event.target.value, assetId: "" })
                  }
                >
                  <option value="">Select site</option>
                  {sitesForVertical.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
                <select
                  value={taskForm.assetId}
                  onChange={(event) => setTaskForm({ ...taskForm, assetId: event.target.value })}
                >
                  <option value="">Select asset</option>
                  {assetsForVertical.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </select>
                <select
                  value={taskForm.teamId}
                  onChange={(event) => setTaskForm({ ...taskForm, teamId: event.target.value })}
                >
                  <option value="">Select team</option>
                  {teamsForVertical.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <select
                  value={taskForm.assignedTo}
                  onChange={(event) => setTaskForm({ ...taskForm, assignedTo: event.target.value })}
                >
                  <option value="">Select assignee</option>
                  {usersForVertical.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} · {user.role}
                    </option>
                  ))}
                </select>
                <select
                  value={taskForm.scheduleType}
                  onChange={(event) => setTaskForm({ ...taskForm, scheduleType: event.target.value })}
                >
                  <option value="one_time">One-time</option>
                  <option value="recurring">Recurring</option>
                </select>
                {taskForm.scheduleType === "recurring" ? (
                  <input
                    value={taskForm.recurrenceRule}
                    onChange={(event) => setTaskForm({ ...taskForm, recurrenceRule: event.target.value })}
                    placeholder="Cron expression, e.g. 0 8 * * *"
                  />
                ) : null}
                <input
                  type="datetime-local"
                  value={taskForm.dueDate}
                  onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })}
                />
                <button type="submit">Create task</button>
              </form>
            )}
          </article>

          <article className="panel">
            <div className="panel-header">
              <h3>
                {activeView === "templates"
                  ? "Template library"
                  : activeView === "demo"
                    ? "Live showcase path"
                  : activeView === "enterprise"
                    ? "Enterprise model"
                  : activeView === "planner"
                    ? "Dispatch planner"
                  : activeView === "tasks"
                    ? "Active work queue"
                    : activeView === "sites"
                      ? "Site register"
                      : activeView === "monitoring"
                        ? "Live monitoring"
                        : activeView === "alerts"
                          ? "Notification center"
                        : activeView === "admin"
                          ? "Users and teams"
                      : activeView === "submissions"
                        ? "Evidence log"
                      : activeView === "audit"
                        ? "Audit log"
                      : activeView === "reports"
                        ? "Compliance reports"
                        : "Operations board"}
              </h3>
              <p>
                {activeView === "templates"
                  ? "Inspect checklist packs and the recurrence they imply."
                  : activeView === "demo"
                    ? "A scripted enterprise story using the current workspace data."
                  : activeView === "enterprise"
                    ? "Current capabilities, remaining gaps, and the next logical hardening path."
                  : activeView === "planner"
                    ? "Group upcoming work by day, then inspect team and assignee coverage."
                  : activeView === "tasks"
                    ? "Open tasks, inspect schedules, and complete field work."
                    : activeView === "sites"
                      ? "Sites are the anchor. Assets live inside them and tasks should target both."
                      : activeView === "monitoring"
                        ? "Devices, latest status, and the latest telemetry events."
                        : activeView === "alerts"
                          ? "Notifications created by telemetry and workflow automation."
                        : activeView === "admin"
                          ? "Manage your operational roster and the teams that own each vertical."
                      : activeView === "submissions"
                        ? "Completed records with timestamps and operator notes."
                      : activeView === "audit"
                        ? "Every tracked change, operator action, automation event, and compliance-relevant update."
                      : activeView === "reports"
                        ? "Generate customer-ready proof packs from current operational data."
                        : "Use the workspace modules to move from planning to execution to proof."}
              </p>
            </div>

            {activeView === "overview" ? (
              <div className="overview-stack">
                <div className="list">
                  {tasks.slice(0, 4).map((task) => (
                    <button
                      type="button"
                      key={task.id}
                      className="list-card selectable"
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        setActiveView("tasks");
                      }}
                    >
                      <div className="card-row">
                        <strong>{task.title}</strong>
                        <span className={`badge ${task.vertical}`}>{task.vertical}</span>
                      </div>
                      <p>{task.description}</p>
                      <small>{task.site_name || "No site"} · {describeSchedule(task)}</small>
                    </button>
                  ))}
                </div>
                <div className="detail-card">
                  <h4>How the environment now works</h4>
                  <div className="checklist-list">
                    <div className="checklist-line">
                      <strong>Sites</strong>
                      <span>Physical operating locations by vertical.</span>
                    </div>
                    <div className="checklist-line">
                      <strong>Assets</strong>
                      <span>Individual units like extinguishers, barriers, chargers, or test points.</span>
                    </div>
                    <div className="checklist-line">
                      <strong>Recurring tasks</strong>
                      <span>Scheduled work linked to templates and optionally to assets.</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeView === "demo" ? (
              <div className="demo-board">
                <div className="demo-timeline">
                  {demoSteps.map((step, index) => (
                    <button
                      type="button"
                      key={step.title}
                      className={`demo-step ${step.status}`}
                      onClick={() => {
                        if (step.view === "tasks" && demoSourceTask) {
                          setSelectedTaskId(demoSourceTask.id);
                        }
                        setActiveView(step.view);
                      }}
                    >
                      <span className="demo-index">{index + 1}</span>
                      <div>
                        <strong>{step.title}</strong>
                        <p>{step.detail}</p>
                      </div>
                      <small>{step.status}</small>
                    </button>
                  ))}
                </div>
                <div className="detail-card">
                  <h4>Interview narrative</h4>
                  <p>
                    OperationHub is one multi-tenant platform powering multiple operational products: FireOps,
                    ParkOps, and PoolOps. The workflow is not a generic task list; it captures proof, timestamps,
                    evidence, corrective actions, reports, and customer-scoped access.
                  </p>
                  <div className="checklist-list">
                    <div className="checklist-line">
                      <strong>Platform layer</strong>
                      <span>Postgres, API, RBAC, audit, reports, monitoring containers.</span>
                    </div>
                    <div className="checklist-line">
                      <strong>Product layer</strong>
                      <span>Vertical templates, sites, assets, telemetry, and branded workflows.</span>
                    </div>
                    <div className="checklist-line">
                      <strong>Compliance layer</strong>
                      <span>Evidence, review notes, corrective tasks, PDFs, CSV exports, viewer portal.</span>
                    </div>
                  </div>
                  {demoSourceTask ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTaskId(demoSourceTask.id);
                        setActiveView("tasks");
                      }}
                    >
                      Open current demo task
                    </button>
                  ) : (
                    <button type="button" onClick={() => setActiveView("templates")}>
                      Create first demo task
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {activeView === "enterprise" ? (
              <div className="enterprise-board">
                <div className="detail-card">
                  <h4>Built now</h4>
                  <p className="muted-line">
                    These are the parts that make the app credible as a platform-engineering showcase today.
                  </p>
                  <div className="checklist-list">
                    {enterpriseCapabilities.map(([title, status, detail]) => (
                      <div key={title} className="roadmap-line built">
                        <div>
                          <strong>{title}</strong>
                          <div className="muted-line">{detail}</div>
                        </div>
                        <span>{status}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="detail-card">
                  <h4>Enterprise gaps</h4>
                  <p className="muted-line">
                    These are the honest next steps to reach a production enterprise model.
                  </p>
                  <div className="checklist-list">
                    {enterpriseGaps.map(([title, priority, detail]) => (
                      <div key={title} className={`roadmap-line ${priority}`}>
                        <div>
                          <strong>{title}</strong>
                          <div className="muted-line">{detail}</div>
                        </div>
                        <span>{priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="detail-card enterprise-wide">
                  <h4>Recommended build order</h4>
                  <div className="roadmap-steps">
                    {[
                      "Keep the web/platform showcase stable for the interview.",
                      "Add Grafana alert rules and backup cron.",
                      "Build the Android field-worker app and test on Pixel 6.",
                      "Add offline queue, photo retry, and sync conflict handling.",
                      "Add SSO/OIDC, stronger RBAC, and device API keys.",
                      "Move uploads/reports to S3-compatible object storage."
                    ].map((step, index) => (
                      <div key={step} className="roadmap-step">
                        <span>{index + 1}</span>
                        <p>{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {activeView === "planner" ? (
              <div className="planner-stack">
                {plannerBuckets.length ? (
                  plannerBuckets.map(([day, dayTasks]) => (
                    <div key={day} className="detail-card planner-day">
                      <div className="card-row">
                        <h4>{day}</h4>
                        <span>{dayTasks.length} task(s)</span>
                      </div>
                      <div className="checklist-list">
                        {dayTasks.map((task) => (
                          <button
                            type="button"
                            key={task.id}
                            className="checklist-line selectable-line"
                            onClick={() => {
                              setSelectedTaskId(task.id);
                              setActiveView("tasks");
                            }}
                          >
                            <div>
                              <strong>{task.title}</strong>
                              <div className="muted-line">
                                {task.site_name || "No site"} · {task.team_name || "No team"} · {task.assignee_name || "Unassigned"}
                              </div>
                              <div className="muted-line">
                                {task.asset_name || "No asset"} · {describeSchedule(task as Task)}
                              </div>
                            </div>
                            <span>{task.status}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No scheduled tasks found in the planner window.</p>
                )}
              </div>
            ) : null}

            {activeView === "templates" ? (
              <div className="split-panel">
                <div className="list">
                  {templates.map((template) => (
                    <button
                      type="button"
                      key={template.id}
                      className={`list-card selectable ${selectedTemplateId === template.id ? "selected" : ""}`}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <div className="card-row">
                        <strong>{template.name}</strong>
                        <span className={`badge ${template.vertical}`}>{template.vertical}</span>
                      </div>
                      <p>{template.description}</p>
                      <small>{template.category} · {template.recurrence || "manual"}</small>
                    </button>
                  ))}
                </div>
                <div className="detail-card">
                  {selectedTemplate ? (
                    <>
                      <div className="card-row">
                        <h4>{selectedTemplate.name}</h4>
                        <span className={`badge ${selectedTemplate.vertical}`}>{selectedTemplate.vertical}</span>
                      </div>
                      <p>{selectedTemplate.description}</p>
                      <small>{selectedTemplate.category} · {selectedTemplate.recurrence || "manual"}</small>
                      <div className="checklist-list">
                        {selectedTemplate.items.map((item) => (
                          <div key={item.key} className="checklist-line">
                            <strong>{item.label}{item.required ? " *" : ""}</strong>
                            <span>{item.type}</span>
                          </div>
                        ))}
                      </div>
                      {!isViewer ? (
                        <button type="button" onClick={() => handleUseTemplate(selectedTemplate)}>
                          Use template to create task
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <p>Select a template to inspect its checklist and built-in recurrence pattern.</p>
                  )}
                </div>
              </div>
            ) : null}

            {activeView === "tasks" ? (
              <div className="split-panel">
                <div className="list">
                  {tasks.map((task) => (
                    <button
                      type="button"
                      key={task.id}
                      className={`list-card selectable ${selectedTaskId === task.id ? "selected" : ""}`}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <div className="card-row">
                        <strong>{task.title}</strong>
                        <span className={`badge ${task.vertical}`}>{task.vertical}</span>
                      </div>
                      <p>{task.description}</p>
                      <small>
                        {task.site_name || "No site"} · {task.asset_name || "No asset"} · {task.status} · {describeSchedule(task)}
                      </small>
                    </button>
                  ))}
                </div>
                <div className="detail-card">
                  {selectedTask ? (
                    <>
                      <div className="card-row">
                        <h4>{selectedTask.title}</h4>
                        <span className={`badge ${selectedTask.vertical}`}>{selectedTask.vertical}</span>
                      </div>
                      <p>{selectedTask.description || "No description"}</p>
                      <small>
                        {selectedTask.site_name || "No site"} · {selectedTask.asset_name || "No asset"} · {selectedTask.status} · {formatDate(selectedTask.due_date)}
                      </small>
                      <p className="schedule-pill">{describeSchedule(selectedTask)}</p>
                      {selectedTask.reviewed_at ? (
                        <p className="muted-line">Reviewed {new Date(selectedTask.reviewed_at).toLocaleString()}</p>
                      ) : null}
                      {selectedTask.status === "closed" || selectedTask.status === "completed" ? (
                        <>
                          <p>This task is closed. Check the evidence log for the submission record and review notes.</p>
                          {selectedTask.review_notes ? <p>{selectedTask.review_notes}</p> : null}
                        </>
                      ) : selectedTask.status === "awaiting_review" ? (
                        <div className="stack">
                          <textarea
                            rows={3}
                            value={reviewNotes}
                            onChange={(event) => setReviewNotes(event.target.value)}
                            placeholder="Review notes or follow-up instructions"
                          />
                          {(session.user.role === "admin" || session.user.role === "manager") ? (
                            <div className="button-row">
                              <button type="button" onClick={() => handleTaskAction("approve")} disabled={taskActionLoading}>
                                {taskActionLoading ? "Saving..." : "Approve and close"}
                              </button>
                              <button type="button" className="secondary" onClick={() => handleTaskAction("reopen")} disabled={taskActionLoading}>
                                Return to in progress
                              </button>
                            </div>
                          ) : (
                            <p>Waiting for manager review.</p>
                          )}
                        </div>
                      ) : selectedTask.status === "pending" ? (
                        <div className="stack">
                          <button type="button" onClick={() => handleTaskAction("start")} disabled={taskActionLoading}>
                            {taskActionLoading ? "Updating..." : "Start task"}
                          </button>
                          <p className="muted-line">Start the task before capturing the checklist evidence.</p>
                        </div>
                      ) : (
                        <form className="stack" onSubmit={handleSubmitTask}>
                          <div className="checklist-list">
                            {selectedTask.items?.length ? (
                              selectedTask.items.map((item) => renderTaskInput(item))
                            ) : (
                              <p>No checklist items were attached to this task.</p>
                            )}
                          </div>
                          <textarea
                            rows={4}
                            value={taskNotes}
                            onChange={(event) => setTaskNotes(event.target.value)}
                            placeholder="Notes, findings, exceptions, or remediation summary"
                          />
                          <label className="field-stack">
                            <span>Evidence photos</span>
                            <input type="file" multiple accept="image/*" onChange={(event) => setTaskPhotos(event.target.files)} />
                          </label>
                          <div className="button-row">
                            <button type="submit" disabled={submittingTask}>
                              {submittingTask ? "Submitting..." : "Submit for review"}
                            </button>
                            <button type="button" className="secondary" onClick={() => handleTaskAction("mark_overdue")} disabled={taskActionLoading}>
                              Flag overdue
                            </button>
                          </div>
                        </form>
                      )}
                      <div className="section-spacer">
                        <h4>Evidence history</h4>
                        {selectedTaskSubmissions.length ? (
                          <div className="checklist-list">
                            {selectedTaskSubmissions.map((submission) => (
                              <div key={submission.id} className="evidence-card">
                                <div className="card-row">
                                  <strong>{new Date(submission.created_at).toLocaleString()}</strong>
                                  <span>{submission.status}</span>
                                </div>
                                {submission.notes ? <p>{submission.notes}</p> : null}
                                {Array.isArray(submission.payload) ? (
                                  <div className="evidence-grid">
                                    {submission.payload.map((entry) => {
                                      const item = entry as { key: string; label?: string; value?: unknown };
                                      return (
                                        <div key={item.key} className="evidence-item">
                                          <span>{item.label ?? item.key}</span>
                                          <strong>{String(item.value ?? "n/a")}</strong>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : null}
                                {submission.photo_urls?.length ? (
                                  <div className="photo-strip">
                                    {submission.photo_urls.map((url) => (
                                      <a key={url} href={`${apiUrl}${url}`} target="_blank" rel="noreferrer">
                                        Evidence photo
                                      </a>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="muted-line">No evidence has been submitted for this task yet.</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p>Select an active task to open its checklist and submit the work.</p>
                  )}
                </div>
              </div>
            ) : null}

            {activeView === "sites" ? (
              <div className="split-panel">
                <div className="list">
                  {sites.map((site) => (
                    <button
                      type="button"
                      key={site.id}
                      className={`list-card selectable ${selectedSiteId === site.id ? "selected" : ""}`}
                      onClick={() => setSelectedSiteId(site.id)}
                    >
                      <div className="card-row">
                        <strong>{site.name}</strong>
                        <span className={`badge ${site.vertical}`}>{site.vertical}</span>
                      </div>
                      <p>{site.description || site.address || "No description"}</p>
                      <small>{site.address || "No address"}</small>
                    </button>
                  ))}
                </div>
                <div className="detail-card">
                  {selectedSite ? (
                    <>
                      <div className="card-row">
                        <h4>{selectedSite.name}</h4>
                        <span className={`badge ${selectedSite.vertical}`}>{selectedSite.vertical}</span>
                      </div>
                      <p>{selectedSite.description || "No description"}</p>
                      <small>{selectedSite.address || "No address"}</small>
                      {selectedSite.customer_name ? (
                        <p className="muted-line">Customer: {selectedSite.customer_name}</p>
                      ) : null}
                      <div className="section-spacer">
                        <h4>Assets at this site</h4>
                        <div className="checklist-list">
                          {siteAssets.length ? (
                            siteAssets.map((asset) => (
                              <button
                                type="button"
                                key={asset.id}
                                className={`checklist-line selectable-line ${selectedAssetId === asset.id ? "selected-line" : ""}`}
                                onClick={() => setSelectedAssetId(asset.id)}
                              >
                                <div>
                                  <strong>{asset.name}</strong>
                                  <div className="muted-line">{asset.asset_type}</div>
                                </div>
                                <span>{asset.status}</span>
                              </button>
                            ))
                          ) : (
                            <p>No assets registered for this site yet.</p>
                          )}
                        </div>
                      </div>
                      <div className="section-spacer">
                        <h4>{selectedAsset ? `${selectedAsset.name} history` : "Site task history"}</h4>
                        <div className="checklist-list">
                          {siteTasks.length ? (
                            siteTasks.slice(0, 6).map((task) => (
                              <div key={task.id} className="checklist-line">
                                <div>
                                  <strong>{task.title}</strong>
                                  <div className="muted-line">{task.asset_name || "No asset"} · {describeSchedule(task)}</div>
                                </div>
                                <span>{task.status}</span>
                              </div>
                            ))
                          ) : (
                            <p>No tasks for this scope yet.</p>
                          )}
                        </div>
                      </div>
                      <div className="section-spacer">
                        <h4>{selectedAsset ? `${selectedAsset.name} submissions` : "Site submissions"}</h4>
                        <div className="checklist-list">
                          {siteSubmissions.length ? (
                            siteSubmissions.slice(0, 6).map((submission) => (
                              <div key={submission.id} className="checklist-line">
                                <div>
                                  <strong>{submission.task_title}</strong>
                                  <div className="muted-line">{submission.asset_name || "No asset"} · {new Date(submission.created_at).toLocaleString()}</div>
                                </div>
                                <span>{submission.status || "logged"}</span>
                              </div>
                            ))
                          ) : (
                            <p>No submissions for this scope yet.</p>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p>Select a site to inspect its registered assets.</p>
                  )}
                </div>
              </div>
            ) : null}

            {activeView === "monitoring" ? (
              <div className="split-panel">
                <div className="list">
                  {monitoringDevices.map((device) => (
                    <div key={device.id} className="list-card">
                      <div className="card-row">
                        <strong>{device.name}</strong>
                        <span className={`badge ${device.vertical}`}>{device.vertical}</span>
                      </div>
                      <p>{device.device_type}</p>
                      <small>
                        {device.site_name} · {device.asset_name || "No asset"} · {device.status} · {formatDate(device.last_seen)}
                      </small>
                    </div>
                  ))}
                </div>
                <div className="detail-card">
                  <h4>Latest telemetry events</h4>
                  <div className="checklist-list">
                    {telemetry.slice(0, 12).map((event) => (
                      <div key={event.id} className="checklist-line">
                        <div>
                          <strong>{event.device_name}</strong>
                          <div className="muted-line">
                            {event.event_type} · {event.reading_value ?? event.reading_text ?? "n/a"} · {event.site_name}
                          </div>
                        </div>
                        <span>{event.severity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {activeView === "alerts" ? (
              <div className="split-panel">
                <div className="list">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="list-card">
                      <div className="card-row">
                        <strong>{notification.title}</strong>
                        <span>
                          {notification.resolved_at
                            ? "resolved"
                            : notification.acknowledged_at
                              ? "acknowledged"
                              : notification.is_read
                                ? "read"
                                : "new"}
                        </span>
                      </div>
                      <p>{notification.message}</p>
                      <small>
                        {new Date(notification.created_at).toLocaleString()}
                        {notification.acknowledged_at ? ` · acknowledged ${new Date(notification.acknowledged_at).toLocaleString()}` : ""}
                        {notification.resolved_at ? ` · resolved ${new Date(notification.resolved_at).toLocaleString()}` : ""}
                      </small>
                      <div className="section-spacer">
                        <div className="button-row">
                          {!notification.acknowledged_at ? (
                            <button type="button" className="secondary" onClick={() => handleAcknowledgeNotification(notification.id)}>
                              Acknowledge
                            </button>
                          ) : null}
                          {!notification.resolved_at ? (
                            <button type="button" className="secondary" onClick={() => handleResolveNotification(notification.id)}>
                              Resolve
                            </button>
                          ) : null}
                          {!notification.is_read ? (
                          <button type="button" className="secondary" onClick={() => handleMarkNotificationRead(notification.id)}>
                            Mark read
                          </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="detail-card">
                  <h4>Delivery queue</h4>
                  <div className="checklist-list">
                    {notificationDeliveries.map((delivery) => (
                      <div key={delivery.id} className="checklist-line">
                        <div>
                          <strong>{delivery.title}</strong>
                          <div className="muted-line">
                            {delivery.channel} · attempt {delivery.attempt_number} · {delivery.type}
                          </div>
                          <div className="muted-line">
                            scheduled {new Date(delivery.scheduled_for).toLocaleString()}
                          </div>
                        </div>
                        <span>{delivery.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {activeView === "admin" ? (
              <div className="split-panel">
                <div className="list">
                  {teams.map((team) => (
                    <div key={team.id} className="list-card">
                      <div className="card-row">
                        <strong>{team.name}</strong>
                        <span className={`badge ${team.vertical}`}>{team.vertical}</span>
                      </div>
                      <p>{team.description || "No description"}</p>
                      <small>
                        {team.member_count} member(s) · leads: {team.leads || "none"}
                      </small>
                    </div>
                  ))}
                  {customers.map((customer) => (
                    <div key={customer.id} className="list-card">
                      <div className="card-row">
                        <strong>{customer.name}</strong>
                        <span className={`badge ${customer.vertical}`}>{customer.vertical}</span>
                      </div>
                      <p>{customer.contact_name || "No contact"}</p>
                      <small>{customer.contact_email || customer.phone || "No contact details"}</small>
                    </div>
                  ))}
                </div>
                <div className="detail-card">
                  <h4>User directory</h4>
                  <div className="checklist-list">
                    {users.map((user) => (
                      <div key={user.id} className="checklist-line">
                        <div>
                          <strong>
                            {user.first_name} {user.last_name}
                          </strong>
                          <div className="muted-line">
                            {user.email}
                            {user.customer_name ? ` · ${user.customer_name}` : ""}
                          </div>
                        </div>
                        <span>{user.role}</span>
                      </div>
                    ))}
                  </div>
                  <div className="section-spacer">
                    <h4>Service contracts</h4>
                    <div className="checklist-list">
                      {contracts.map((contract) => (
                        <div key={contract.id} className="checklist-line">
                          <div>
                            <strong>{contract.name}</strong>
                            <div className="muted-line">
                              {contract.customer_name} · {contract.start_date || "No start"} to {contract.end_date || "No end"}
                            </div>
                          </div>
                          <span>{contract.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="section-spacer">
                    <h4>Automation rules</h4>
                    <div className="checklist-list">
                      {rules.map((rule) => (
                        <div key={rule.id} className="checklist-line">
                          <div>
                            <strong>{rule.name}</strong>
                            <div className="muted-line">
                              {(rule.vertical || "all").toString()} · {rule.trigger_source} · {rule.action_type}
                            </div>
                            <div className="muted-line">
                              {rule.trigger_source === "telemetry"
                                ? `${rule.event_type || "event"} ${rule.comparator || "any"} ${rule.threshold_min ?? ""}${rule.threshold_max !== null && rule.threshold_max !== undefined ? `-${rule.threshold_max}` : ""}`
                                : `status ${rule.task_status || "any"}`}
                            </div>
                          </div>
                          <div className="button-row">
                            <span>{rule.enabled ? "live" : "off"}</span>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                            >
                              {rule.enabled ? "Disable" : "Enable"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="section-spacer">
                    <h4>Notification policies</h4>
                    <div className="checklist-list">
                      {notificationPolicies.map((policy) => (
                        <div key={policy.id} className="checklist-line">
                          <div>
                            <strong>{policy.name}</strong>
                            <div className="muted-line">
                              {(policy.notification_type || "all")} · {policy.channel} · {policy.target_role || "all roles"}
                            </div>
                            <div className="muted-line">
                              delay {policy.delay_minutes}m · repeats {policy.repeat_count}
                            </div>
                          </div>
                          <div className="button-row">
                            <span>{policy.enabled ? "live" : "off"}</span>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => handleToggleNotificationPolicy(policy.id, !policy.enabled)}
                            >
                              {policy.enabled ? "Disable" : "Enable"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeView === "submissions" ? (
              <div className="list">
                {submissions.map((submission) => (
                  <div key={submission.id} className="list-card">
                    <div className="card-row">
                      <strong>{submission.task_title}</strong>
                      <span className={`badge ${submission.vertical}`}>{submission.vertical}</span>
                    </div>
                    <p>{submission.notes || "No notes"}</p>
                    <small>
                      {submission.site_name || "No site"} · {submission.asset_name || "No asset"} · {new Date(submission.created_at).toLocaleString()}
                    </small>
                  </div>
                ))}
              </div>
            ) : null}

            {activeView === "audit" ? (
              <div className="list">
                {auditLogs.length ? (
                  auditLogs.map((entry) => (
                    <div key={entry.id} className="list-card">
                      <div className="card-row">
                        <strong>{entry.action.replaceAll("_", " ")}</strong>
                        <span>{entry.resource_type}</span>
                      </div>
                      <p>{summarizeAuditDetails(entry.details)}</p>
                      <small>
                        {entry.user_name || "System"} · {new Date(entry.created_at).toLocaleString()}
                        {entry.resource_id ? ` · ${entry.resource_id}` : ""}
                      </small>
                    </div>
                  ))
                ) : (
                  <p>No audit entries have been recorded yet.</p>
                )}
              </div>
            ) : null}

            {activeView === "reports" ? (
              <div className="overview-stack">
                <div className="detail-card">
                  <h4>Report contents</h4>
                  <div className="checklist-list">
                    <div className="checklist-line">
                      <strong>Task summary</strong>
                      <span>Status counts and recent operational work.</span>
                    </div>
                    <div className="checklist-line">
                      <strong>Evidence</strong>
                      <span>Submitted checklists, operators, timestamps, and photo counts.</span>
                    </div>
                    <div className="checklist-line">
                      <strong>Alerts</strong>
                      <span>Notification lifecycle with new, read, acknowledged, or resolved state.</span>
                    </div>
                    <div className="checklist-line">
                      <strong>Audit trail</strong>
                      <span>Recent tracked platform actions for compliance review.</span>
                    </div>
                  </div>
                </div>
                <div className="detail-card">
                  <h4>Report history</h4>
                  <div className="checklist-list">
                    {reportRuns.length ? (
                      reportRuns.slice(0, 12).map((report) => (
                        <div key={report.id} className="checklist-line">
                          <div>
                            <strong>{report.report_type.replaceAll("_", " ")}</strong>
                            <div className="muted-line">
                              {report.format.toUpperCase()} · {report.vertical || "all"} · {report.period_days}d · {new Date(report.created_at).toLocaleString()}
                            </div>
                            <div className="muted-line">{report.generated_by_name || "System"}</div>
                          </div>
                          <button type="button" className="secondary" onClick={() => handleDownloadReportRun(report)}>
                            Download
                          </button>
                        </div>
                      ))
                    ) : (
                      <p>No generated reports yet.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </article>
        </section>
      </main>
    </div>
  );
}
