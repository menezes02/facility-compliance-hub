import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { verticalMeta } from "@operationhub/verticals";
const apiUrl = import.meta.env.VITE_API_URL ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");
async function request(path, token, init) {
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
function buildResponseState(items) {
    return Object.fromEntries(items.map((item) => [item.key, item.type === "checkbox" ? false : ""]));
}
function formatDate(date) {
    return date ? new Date(date).toLocaleString() : "No due date";
}
function describeSchedule(task) {
    return task.schedule_type === "recurring"
        ? `Recurring · ${task.recurrence_rule || "custom rule"}`
        : "One-time";
}
function formatPlannerDay(date) {
    if (!date)
        return "Unscheduled";
    return new Date(date).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
    });
}
function summarizeAuditDetails(details) {
    if (!details)
        return "No details";
    const entries = Object.entries(details)
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .slice(0, 4);
    if (!entries.length)
        return "No details";
    return entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
}
function getDemoStatus(done, active = false) {
    if (done)
        return "complete";
    if (active)
        return "ready";
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
    const [session, setSession] = useState(() => {
        const raw = localStorage.getItem("operationhub.session");
        return raw ? JSON.parse(raw) : null;
    });
    const [dashboard, setDashboard] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [sites, setSites] = useState([]);
    const [assets, setAssets] = useState([]);
    const [devices, setDevices] = useState([]);
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [rules, setRules] = useState([]);
    const [plannerTasks, setPlannerTasks] = useState([]);
    const [telemetry, setTelemetry] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [notificationPolicies, setNotificationPolicies] = useState([]);
    const [notificationDeliveries, setNotificationDeliveries] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [reportRuns, setReportRuns] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [activeView, setActiveView] = useState("overview");
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [selectedTaskId, setSelectedTaskId] = useState("");
    const [selectedSiteId, setSelectedSiteId] = useState("");
    const [selectedAssetId, setSelectedAssetId] = useState("");
    const [taskResponse, setTaskResponse] = useState({});
    const [taskNotes, setTaskNotes] = useState("");
    const [taskPhotos, setTaskPhotos] = useState(null);
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
    const templatesForVertical = useMemo(() => templates.filter((template) => template.vertical === taskForm.vertical), [templates, taskForm.vertical]);
    const sitesForVertical = useMemo(() => sites.filter((site) => site.vertical === taskForm.vertical), [sites, taskForm.vertical]);
    const assetsForVertical = useMemo(() => assets.filter((asset) => asset.vertical === taskForm.vertical &&
        (!taskForm.siteId || asset.site_id === taskForm.siteId)), [assets, taskForm.vertical, taskForm.siteId]);
    const usersForVertical = useMemo(() => users.filter((user) => user.role !== "viewer"), [users]);
    const teamsForVertical = useMemo(() => teams.filter((team) => team.vertical === taskForm.vertical), [teams, taskForm.vertical]);
    const customersForVertical = useMemo(() => customers.filter((customer) => customer.vertical === siteForm.vertical), [customers, siteForm.vertical]);
    const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId) ?? null, [templates, selectedTemplateId]);
    const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) ?? null, [tasks, selectedTaskId]);
    const selectedTaskSubmissions = useMemo(() => submissions.filter((submission) => submission.task_id === selectedTaskId), [submissions, selectedTaskId]);
    const selectedSite = useMemo(() => sites.find((site) => site.id === selectedSiteId) ?? null, [sites, selectedSiteId]);
    const siteAssets = useMemo(() => assets.filter((asset) => asset.site_id === selectedSiteId), [assets, selectedSiteId]);
    const monitoringDevices = useMemo(() => devices.filter((device) => !selectedSiteId || device.site_id === selectedSiteId), [devices, selectedSiteId]);
    const demoSourceTask = useMemo(() => tasks.find((task) => task.title.toLowerCase().includes("workflow verification")) ??
        tasks.find((task) => task.status === "awaiting_review") ??
        tasks[0] ??
        null, [tasks]);
    const demoCorrectiveTasks = useMemo(() => tasks.filter((task) => task.parent_task_id === demoSourceTask?.id), [tasks, demoSourceTask]);
    const demoSubmission = useMemo(() => submissions.find((submission) => submission.task_id === demoSourceTask?.id) ?? null, [submissions, demoSourceTask]);
    const demoReport = useMemo(() => reportRuns[0] ?? null, [reportRuns]);
    const demoSteps = useMemo(() => [
        {
            title: "Choose a vertical template",
            detail: "Use FireOps, ParkOps, or PoolOps checklist packs as the operational product skin.",
            status: getDemoStatus(templates.length > 0),
            view: "templates"
        },
        {
            title: "Dispatch a site task",
            detail: demoSourceTask
                ? `${demoSourceTask.title} is ${demoSourceTask.status.replace("_", " ")} at ${demoSourceTask.site_name ?? "a site"}.`
                : "Create a task from a template and assign it to a site, asset, team, and worker.",
            status: getDemoStatus(Boolean(demoSourceTask)),
            view: "tasks"
        },
        {
            title: "Worker submits evidence",
            detail: demoSubmission
                ? `${demoSubmission.task_title} has submitted evidence and ${demoSubmission.photo_urls?.length ?? 0} photo(s).`
                : "Start the task, fill the checklist, attach evidence, and submit for manager review.",
            status: getDemoStatus(Boolean(demoSubmission), Boolean(demoSourceTask)),
            view: "tasks"
        },
        {
            title: "Failed check creates corrective work",
            detail: demoCorrectiveTasks.length
                ? `${demoCorrectiveTasks.length} corrective task(s) were generated from failed checklist evidence.`
                : "A failed checkbox, bad pool reading, or fault/offline choice creates a child corrective task.",
            status: getDemoStatus(demoCorrectiveTasks.length > 0, Boolean(demoSubmission)),
            view: "tasks"
        },
        {
            title: "Manager closes and proves compliance",
            detail: demoSourceTask?.status === "closed"
                ? "The source task is closed with manager review notes."
                : "Manager approves or reopens the submitted task, then generates the compliance pack.",
            status: getDemoStatus(demoSourceTask?.status === "closed", Boolean(demoSubmission)),
            view: "reports"
        },
        {
            title: "Client portal validates the audit trail",
            detail: demoReport
                ? `${demoReport.file_name} is available in report history.`
                : "Viewer users can only read their scoped customer data and download their own reports.",
            status: getDemoStatus(Boolean(demoReport), demoSourceTask?.status === "closed"),
            view: "reports"
        }
    ], [demoCorrectiveTasks.length, demoReport, demoSourceTask, demoSubmission, templates.length]);
    const plannerBuckets = useMemo(() => {
        const grouped = plannerTasks.reduce((accumulator, task) => {
            const key = formatPlannerDay(task.due_date);
            accumulator[key] = accumulator[key] ?? [];
            accumulator[key].push(task);
            return accumulator;
        }, {});
        return Object.entries(grouped);
    }, [plannerTasks]);
    const selectedAsset = useMemo(() => assets.find((asset) => asset.id === selectedAssetId) ?? null, [assets, selectedAssetId]);
    const siteTasks = useMemo(() => tasks.filter((task) => task.site_id === selectedSiteId && (!selectedAssetId || task.asset_id === selectedAssetId)), [tasks, selectedSiteId, selectedAssetId]);
    const siteSubmissions = useMemo(() => submissions.filter((submission) => submission.site_id === selectedSiteId &&
        (!selectedAssetId || submission.asset_id === selectedAssetId)), [submissions, selectedSiteId, selectedAssetId]);
    async function loadWorkspace(activeSession) {
        const [dashboardData, taskData, templateData, siteData, assetData, userData, teamData, customerData, contractData, ruleData, plannerData, deviceData, telemetryData, notificationData, notificationPolicyData, notificationDeliveryData, auditLogData, reportRunData, submissionData] = await Promise.all([
            request("/api/dashboard", activeSession.token),
            request("/api/tasks", activeSession.token),
            request("/api/templates", activeSession.token),
            request("/api/sites", activeSession.token),
            request("/api/assets", activeSession.token),
            request("/api/users", activeSession.token),
            request("/api/teams", activeSession.token),
            request("/api/customers", activeSession.token),
            request("/api/contracts", activeSession.token),
            request("/api/rules", activeSession.token),
            request("/api/planner", activeSession.token),
            request("/api/devices", activeSession.token),
            request("/api/telemetry", activeSession.token),
            request("/api/notifications", activeSession.token),
            request("/api/notification-policies", activeSession.token),
            request("/api/notification-deliveries", activeSession.token),
            request("/api/audit-logs", activeSession.token),
            request("/api/reports", activeSession.token),
            request("/api/submissions", activeSession.token)
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
        if (!session)
            return;
        localStorage.setItem("operationhub.session", JSON.stringify(session));
    }, [session]);
    useEffect(() => {
        if (!session)
            return;
        setLoading(true);
        loadWorkspace(session)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [session]);
    useEffect(() => {
        if (session?.user.role !== "viewer")
            return;
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
        if (selectedAssetId && siteAssets.some((asset) => asset.id === selectedAssetId))
            return;
        setSelectedAssetId(firstAsset);
    }, [siteAssets, selectedAssetId]);
    useEffect(() => {
        if (!taskForm.templateId)
            return;
        const template = templates.find((entry) => entry.id === taskForm.templateId);
        if (!template)
            return;
        setTaskForm((current) => ({
            ...current,
            scheduleType: template.recurrence ? "recurring" : current.scheduleType,
            recurrenceRule: template.recurrence ?? current.recurrenceRule
        }));
    }, [taskForm.templateId, templates]);
    useEffect(() => {
        setReviewNotes(selectedTask?.review_notes ?? "");
    }, [selectedTask]);
    async function handleLogin(event) {
        event.preventDefault();
        setError("");
        try {
            const data = await request("/api/auth/login", undefined, {
                method: "POST",
                body: JSON.stringify({
                    email: loginForm.email,
                    password: loginForm.password
                })
            });
            setSession(data);
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function handleCreateTask(event) {
        event.preventDefault();
        if (!session)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
    }
    function handleUseTemplate(template) {
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
    async function handleCreateSite(event) {
        event.preventDefault();
        if (!session)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function handleCreateAsset(event) {
        event.preventDefault();
        if (!session)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function handleCreateDevice(event) {
        event.preventDefault();
        if (!session)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSavingDevice(false);
        }
    }
    async function handleSendTelemetry(event) {
        event.preventDefault();
        if (!session)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSendingTelemetry(false);
        }
    }
    async function handleMarkNotificationRead(id) {
        if (!session)
            return;
        try {
            await request(`/api/notifications/${id}/read`, session.token, { method: "POST" });
            await loadWorkspace(session);
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function handleAcknowledgeNotification(id) {
        if (!session)
            return;
        try {
            await request(`/api/notifications/${id}/acknowledge`, session.token, { method: "POST" });
            await loadWorkspace(session);
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function handleResolveNotification(id) {
        if (!session)
            return;
        try {
            await request(`/api/notifications/${id}/resolve`, session.token, { method: "POST" });
            await loadWorkspace(session);
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function handleCreateUser(event) {
        event.preventDefault();
        if (!session)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSavingUser(false);
        }
    }
    async function handleCreateTeam(event) {
        event.preventDefault();
        if (!session)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSavingTeam(false);
        }
    }
    async function handleAssignTeamMember(event) {
        event.preventDefault();
        if (!session)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSavingMembership(false);
        }
    }
    async function handleCreateCustomer(event) {
        event.preventDefault();
        if (!session)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function handleCreateContract(event) {
        event.preventDefault();
        if (!session)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function handleCreateRule(event) {
        event.preventDefault();
        if (!session)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSavingRule(false);
        }
    }
    async function handleToggleRule(id, enabled) {
        if (!session)
            return;
        setError("");
        try {
            await request(`/api/rules/${id}/enabled`, session.token, {
                method: "PATCH",
                body: JSON.stringify({ enabled })
            });
            await loadWorkspace(session);
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function handleCreateNotificationPolicy(event) {
        event.preventDefault();
        if (!session)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSavingNotificationPolicy(false);
        }
    }
    async function handleToggleNotificationPolicy(id, enabled) {
        if (!session)
            return;
        setError("");
        try {
            await request(`/api/notification-policies/${id}/enabled`, session.token, {
                method: "PATCH",
                body: JSON.stringify({ enabled })
            });
            await loadWorkspace(session);
        }
        catch (err) {
            setError(err.message);
        }
    }
    async function handleSubmitTask(event) {
        event.preventDefault();
        if (!session || !selectedTask)
            return;
        setError("");
        const missingRequired = (selectedTask.items ?? [])
            .filter((item) => item.required)
            .filter((item) => {
            if (item.type === "photo")
                return !taskPhotos?.length;
            const value = taskResponse[item.key];
            if (item.type === "checkbox")
                return typeof value !== "boolean";
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
            formData.append("payload", JSON.stringify(selectedTask.items.map((item) => ({
                key: item.key,
                label: item.label,
                type: item.type,
                value: taskResponse[item.key] ?? null
            }))));
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
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSubmittingTask(false);
        }
    }
    async function handleTaskAction(action) {
        if (!session || !selectedTask)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setTaskActionLoading(false);
        }
    }
    async function handleRunRecurringSync() {
        if (!session)
            return;
        setError("");
        setSyncingRecurring(true);
        try {
            await request("/api/automation/run-recurring", session.token, { method: "POST" });
            await loadWorkspace(session);
            setActiveView("tasks");
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSyncingRecurring(false);
        }
    }
    async function handleDownloadComplianceReport(event) {
        event.preventDefault();
        if (!session)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setGeneratingReport(false);
        }
    }
    async function downloadBlob(path, filename) {
        if (!session)
            return;
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
        if (!session)
            return;
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
            await downloadBlob(`/api/reports/export.csv?${params.toString()}`, `operationhub-${reportForm.csvDataset}-${reportForm.vertical}-${reportForm.days}d.csv`);
            await loadWorkspace(session);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setExportingCsv(false);
        }
    }
    async function handleDownloadReportRun(report) {
        if (!session)
            return;
        setError("");
        try {
            await downloadBlob(`/api/reports/${report.id}/download`, report.file_name);
        }
        catch (err) {
            setError(err.message);
        }
    }
    function handleTaskFieldChange(item, event) {
        setTaskResponse((current) => ({
            ...current,
            [item.key]: item.type === "checkbox" ? event.target.checked : event.target.value
        }));
    }
    function renderTaskInput(item) {
        const label = `${item.label}${item.required ? " *" : ""}`;
        if (item.type === "checkbox") {
            return (_jsxs("label", { className: "check-row", children: [_jsx("input", { type: "checkbox", checked: Boolean(taskResponse[item.key]), onChange: (event) => handleTaskFieldChange(item, event) }), _jsx("span", { children: label })] }, item.key));
        }
        if (item.type === "choice") {
            return (_jsxs("label", { className: "field-stack", children: [_jsx("span", { children: label }), _jsxs("select", { value: String(taskResponse[item.key] ?? ""), onChange: (event) => setTaskResponse((current) => ({ ...current, [item.key]: event.target.value })), required: item.required, children: [_jsx("option", { value: "", children: "Select result" }), (item.options ?? []).map((option) => (_jsx("option", { value: option, children: option }, option)))] })] }, item.key));
        }
        if (item.type === "photo") {
            return (_jsxs("div", { className: "checklist-line", children: [_jsx("strong", { children: label }), _jsx("span", { children: "Attach using Evidence photos below" })] }, item.key));
        }
        return (_jsxs("label", { className: "field-stack", children: [_jsx("span", { children: label }), _jsx("input", { type: item.type === "number" ? "number" : "text", value: String(taskResponse[item.key] ?? ""), onChange: (event) => handleTaskFieldChange(item, event), placeholder: item.type === "number" ? "Enter reading" : "Enter response", required: item.required })] }, item.key));
    }
    if (!session) {
        return (_jsx("div", { className: "auth-shell", children: _jsxs("div", { className: "auth-card", children: [_jsx("p", { className: "eyebrow", children: "operations.example.com" }), _jsx("h1", { children: "Facility Compliance Hub" }), _jsx("p", { className: "subcopy", children: "Shared operations control for fire inspections, smart parking, and pool compliance." }), _jsxs("form", { onSubmit: handleLogin, className: "stack", autoComplete: "off", children: [_jsx("input", { type: "text", name: "username", autoComplete: "username", tabIndex: -1, "aria-hidden": "true", style: { display: "none" } }), _jsx("input", { type: "password", name: "password", autoComplete: "current-password", tabIndex: -1, "aria-hidden": "true", style: { display: "none" } }), _jsx("input", { name: "operationhub-email", type: "email", placeholder: "Email", autoComplete: "off", value: loginForm.email, onChange: (event) => setLoginForm((current) => ({ ...current, email: event.target.value })), required: true }), _jsx("input", { name: "operationhub-password", type: "password", placeholder: "Password", autoComplete: "new-password", value: loginForm.password, onChange: (event) => setLoginForm((current) => ({ ...current, password: event.target.value })), required: true }), _jsx("button", { type: "submit", children: "Sign In" })] }), error ? _jsx("p", { className: "error", children: error }) : null] }) }));
    }
    const isViewer = session.user.role === "viewer";
    const allNavItems = [
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
    const viewerNavItems = ["overview", "demo", "enterprise", "planner", "tasks", "sites", "submissions", "reports"];
    const navItems = allNavItems.filter((item) => (isViewer ? viewerNavItems.includes(item.id) : true));
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("aside", { className: "sidebar", children: [_jsxs("div", { className: "sidebar-top", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Facility Compliance Hub" }), _jsxs("h2", { children: [session.user.firstName, " ", session.user.lastName] }), _jsx("p", { children: session.user.email })] }), _jsx("nav", { className: "nav-list", children: navItems.map((item) => (_jsxs("button", { type: "button", className: `nav-button ${activeView === item.id ? "active" : ""}`, onClick: () => setActiveView(item.id), children: [_jsx("strong", { children: item.label }), _jsx("span", { children: item.hint })] }, item.id))) })] }), _jsx("button", { className: "secondary", onClick: () => {
                            localStorage.removeItem("operationhub.session");
                            setSession(null);
                        }, children: "Sign Out" })] }), _jsxs("main", { className: "content", children: [_jsxs("section", { className: "hero", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Operational Workspace" }), _jsx("h1", { children: "Multi-vertical field operations environment" }), _jsx("p", { className: "subcopy", children: "Manage sites, register operational assets, schedule recurring work, and capture evidence from the field." })] }), _jsx("div", { className: "vertical-grid", children: Object.entries(verticalMeta).map(([key, meta]) => (_jsxs("button", { type: "button", className: "vertical-card", style: { borderColor: meta.accent }, onClick: () => {
                                        setTaskForm((current) => ({ ...current, vertical: key, templateId: "", siteId: "", assetId: "" }));
                                        setActiveView("templates");
                                    }, children: [_jsx("span", { children: meta.title }), _jsx("p", { children: meta.summary })] }, key))) })] }), error ? _jsx("p", { className: "error", children: error }) : null, loading ? _jsx("p", { children: "Loading workspace\u2026" }) : null, _jsxs("section", { className: "metrics", children: [dashboard?.taskBreakdown.map((item) => (_jsxs("article", { className: "metric-card", children: [_jsx("span", { children: item.status.replace("_", " ") }), _jsx("strong", { children: item.count })] }, item.status))), _jsxs("article", { className: "metric-card", children: [_jsx("span", { children: "submissions" }), _jsx("strong", { children: dashboard?.submissionCount ?? 0 })] }), _jsxs("article", { className: "metric-card", children: [_jsx("span", { children: "sites" }), _jsx("strong", { children: dashboard?.siteCount ?? 0 })] }), _jsxs("article", { className: "metric-card", children: [_jsx("span", { children: "assets" }), _jsx("strong", { children: dashboard?.assetCount ?? 0 })] }), _jsxs("article", { className: "metric-card", children: [_jsx("span", { children: "teams" }), _jsx("strong", { children: dashboard?.teamCount ?? 0 })] }), _jsxs("article", { className: "metric-card", children: [_jsx("span", { children: "users" }), _jsx("strong", { children: dashboard?.userCount ?? 0 })] }), _jsxs("article", { className: "metric-card", children: [_jsx("span", { children: "customers" }), _jsx("strong", { children: dashboard?.customerCount ?? 0 })] }), _jsxs("article", { className: "metric-card", children: [_jsx("span", { children: "contracts" }), _jsx("strong", { children: dashboard?.contractCount ?? 0 })] })] }), _jsxs("section", { className: "workspace-grid", children: [_jsxs("article", { className: "panel", children: [_jsxs("div", { className: "panel-header", children: [_jsx("h3", { children: "Control Desk" }), _jsx("p", { children: activeView === "sites"
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
                                                                                    : "Create one-time or recurring work orders from your checklist library." }), _jsxs("div", { className: "button-row", children: [activeView === "overview" ? (_jsx("button", { type: "button", className: "secondary", onClick: handleRunRecurringSync, disabled: syncingRecurring, children: syncingRecurring ? "Syncing schedules..." : "Run recurring sync" })) : null, activeView === "demo" ? (_jsx("button", { type: "button", className: "secondary", onClick: () => setActiveView("templates"), children: "Start with templates" })) : null, activeView === "enterprise" ? (_jsx("button", { type: "button", className: "secondary", onClick: () => setActiveView("demo"), children: "Open demo path" })) : null] })] }), activeView === "reports" ? (_jsxs("form", { onSubmit: handleDownloadComplianceReport, className: "stack", children: [_jsx("h4", { children: "Generate compliance pack" }), _jsxs("select", { value: reportForm.vertical, onChange: (event) => setReportForm({ ...reportForm, vertical: event.target.value }), children: [_jsx("option", { value: "all", children: "All verticals" }), _jsx("option", { value: "fire", children: "Fire" }), _jsx("option", { value: "parking", children: "Parking" }), _jsx("option", { value: "pool", children: "Pool" })] }), _jsxs("select", { value: reportForm.days, onChange: (event) => setReportForm({ ...reportForm, days: event.target.value }), children: [_jsx("option", { value: "7", children: "Last 7 days" }), _jsx("option", { value: "30", children: "Last 30 days" }), _jsx("option", { value: "90", children: "Last 90 days" }), _jsx("option", { value: "365", children: "Last 365 days" })] }), _jsx("button", { type: "submit", disabled: generatingReport, children: generatingReport ? "Generating..." : "Generate PDF report" }), _jsx("h4", { children: "Export CSV" }), _jsxs("select", { value: reportForm.csvDataset, onChange: (event) => setReportForm({ ...reportForm, csvDataset: event.target.value }), children: [_jsx("option", { value: "tasks", children: "Tasks" }), _jsx("option", { value: "submissions", children: "Submissions" }), _jsx("option", { value: "audit", children: "Audit trail" })] }), _jsx("button", { type: "button", className: "secondary", onClick: handleDownloadCsvExport, disabled: exportingCsv, children: exportingCsv ? "Exporting..." : "Download CSV export" }), _jsx("p", { className: "muted-line", children: "PDF packs and CSV exports are saved into report history for later download." })] })) : activeView === "demo" ? (_jsxs("div", { className: "stack", children: [_jsx("h4", { children: "Showcase controls" }), _jsx("p", { className: "muted-line", children: "Use this sequence in the interview. It maps directly to the live modules and proves the platform model." }), _jsxs("div", { className: "demo-mini-list", children: [_jsx("button", { type: "button", className: "secondary", onClick: () => setActiveView("templates"), children: "1. Template library" }), _jsx("button", { type: "button", className: "secondary", onClick: () => setActiveView("tasks"), children: "2. Active work queue" }), _jsx("button", { type: "button", className: "secondary", onClick: () => setActiveView("submissions"), children: "3. Evidence log" }), _jsx("button", { type: "button", className: "secondary", onClick: () => setActiveView("reports"), children: "4. Compliance reports" })] }), _jsx("p", { className: "muted-line", children: "For role separation, log in as worker to submit, manager to approve, and viewer to inspect customer-scoped proof." })] })) : activeView === "enterprise" ? (_jsxs("div", { className: "stack", children: [_jsx("h4", { children: "Enterprise posture" }), _jsx("p", { className: "muted-line", children: "Current build proves the platform pattern. The roadmap hardens identity, permissions, mobile reliability, sensor ingestion, and operations." }), _jsx("button", { type: "button", onClick: () => setActiveView("reports"), children: "Show compliance layer" }), _jsx("button", { type: "button", className: "secondary", onClick: () => setActiveView("monitoring"), children: "Show monitoring layer" })] })) : isViewer ? (_jsxs("div", { className: "stack", children: [_jsx("h4", { children: "Customer portal" }), _jsx("p", { className: "muted-line", children: "Viewer access is read-only. Use the workspace panels to inspect assigned operational records and generate your own compliance exports." })] })) : activeView === "sites" ? (_jsxs("div", { className: "stack", children: [_jsxs("form", { onSubmit: handleCreateSite, className: "stack", children: [_jsx("h4", { children: "Create site" }), _jsxs("select", { value: siteForm.customerId, onChange: (event) => setSiteForm({ ...siteForm, customerId: event.target.value }), children: [_jsx("option", { value: "", children: "Select customer" }), customersForVertical.map((customer) => (_jsx("option", { value: customer.id, children: customer.name }, customer.id)))] }), _jsx("input", { value: siteForm.name, onChange: (event) => setSiteForm({ ...siteForm, name: event.target.value }), placeholder: "Site name", required: true }), _jsx("input", { value: siteForm.address, onChange: (event) => setSiteForm({ ...siteForm, address: event.target.value }), placeholder: "Address" }), _jsxs("select", { value: siteForm.vertical, onChange: (event) => setSiteForm({ ...siteForm, vertical: event.target.value, customerId: "" }), children: [_jsx("option", { value: "fire", children: "Fire" }), _jsx("option", { value: "parking", children: "Parking" }), _jsx("option", { value: "pool", children: "Pool" })] }), _jsx("textarea", { rows: 3, value: siteForm.description, onChange: (event) => setSiteForm({ ...siteForm, description: event.target.value }), placeholder: "Operational notes or location summary" }), _jsx("button", { type: "submit", children: "Create site" })] }), _jsxs("form", { onSubmit: handleCreateAsset, className: "stack", children: [_jsx("h4", { children: "Create asset" }), _jsxs("select", { value: assetForm.siteId, onChange: (event) => {
                                                            const site = sites.find((entry) => entry.id === event.target.value);
                                                            setAssetForm({
                                                                ...assetForm,
                                                                siteId: event.target.value,
                                                                vertical: site?.vertical ?? assetForm.vertical
                                                            });
                                                        }, required: true, children: [_jsx("option", { value: "", children: "Select site" }), sites.map((site) => (_jsx("option", { value: site.id, children: site.name }, site.id)))] }), _jsx("input", { value: assetForm.name, onChange: (event) => setAssetForm({ ...assetForm, name: event.target.value }), placeholder: "Asset name", required: true }), _jsx("input", { value: assetForm.assetType, onChange: (event) => setAssetForm({ ...assetForm, assetType: event.target.value }), placeholder: "Asset type", required: true }), _jsxs("select", { value: assetForm.status, onChange: (event) => setAssetForm({ ...assetForm, status: event.target.value }), children: [_jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "attention", children: "Attention" }), _jsx("option", { value: "offline", children: "Offline" })] }), _jsx("input", { value: assetForm.serialNumber, onChange: (event) => setAssetForm({ ...assetForm, serialNumber: event.target.value }), placeholder: "Serial or asset tag" }), _jsx("textarea", { rows: 3, value: assetForm.description, onChange: (event) => setAssetForm({ ...assetForm, description: event.target.value }), placeholder: "Asset notes" }), _jsx("button", { type: "submit", children: "Create asset" })] })] })) : activeView === "monitoring" ? (_jsxs("div", { className: "stack", children: [_jsxs("form", { onSubmit: handleCreateDevice, className: "stack", children: [_jsx("h4", { children: "Create device" }), _jsxs("select", { value: deviceForm.siteId, onChange: (event) => {
                                                            const site = sites.find((entry) => entry.id === event.target.value);
                                                            setDeviceForm({
                                                                ...deviceForm,
                                                                siteId: event.target.value,
                                                                assetId: "",
                                                                vertical: site?.vertical ?? deviceForm.vertical
                                                            });
                                                        }, required: true, children: [_jsx("option", { value: "", children: "Select site" }), sites.map((site) => (_jsx("option", { value: site.id, children: site.name }, site.id)))] }), _jsxs("select", { value: deviceForm.assetId, onChange: (event) => setDeviceForm({ ...deviceForm, assetId: event.target.value }), children: [_jsx("option", { value: "", children: "Select asset" }), assets
                                                                .filter((asset) => !deviceForm.siteId || asset.site_id === deviceForm.siteId)
                                                                .map((asset) => (_jsx("option", { value: asset.id, children: asset.name }, asset.id)))] }), _jsx("input", { value: deviceForm.name, onChange: (event) => setDeviceForm({ ...deviceForm, name: event.target.value }), placeholder: "Device name", required: true }), _jsx("input", { value: deviceForm.deviceType, onChange: (event) => setDeviceForm({ ...deviceForm, deviceType: event.target.value }), placeholder: "Device type", required: true }), _jsx("input", { value: deviceForm.identifier, onChange: (event) => setDeviceForm({ ...deviceForm, identifier: event.target.value }), placeholder: "Device identifier" }), _jsx("button", { type: "submit", disabled: savingDevice, children: savingDevice ? "Saving..." : "Create device" })] }), _jsxs("form", { onSubmit: handleSendTelemetry, className: "stack", children: [_jsx("h4", { children: "Send telemetry event" }), _jsxs("select", { value: telemetryForm.deviceId, onChange: (event) => setTelemetryForm({ ...telemetryForm, deviceId: event.target.value }), required: true, children: [_jsx("option", { value: "", children: "Select device" }), devices.map((device) => (_jsx("option", { value: device.id, children: device.name }, device.id)))] }), _jsx("input", { value: telemetryForm.eventType, onChange: (event) => setTelemetryForm({ ...telemetryForm, eventType: event.target.value }), placeholder: "Event type, e.g. ph, pressure, occupancy", required: true }), _jsx("input", { type: "number", step: "0.1", value: telemetryForm.readingValue, onChange: (event) => setTelemetryForm({ ...telemetryForm, readingValue: event.target.value }), placeholder: "Reading value" }), _jsx("input", { value: telemetryForm.readingText, onChange: (event) => setTelemetryForm({ ...telemetryForm, readingText: event.target.value }), placeholder: "Optional text reading" }), _jsxs("select", { value: telemetryForm.severity, onChange: (event) => setTelemetryForm({ ...telemetryForm, severity: event.target.value }), children: [_jsx("option", { value: "info", children: "Info" }), _jsx("option", { value: "warning", children: "Warning" }), _jsx("option", { value: "critical", children: "Critical" })] }), _jsx("button", { type: "submit", disabled: sendingTelemetry, children: sendingTelemetry ? "Sending..." : "Send telemetry" })] })] })) : activeView === "admin" ? (_jsxs("div", { className: "stack", children: [_jsxs("form", { onSubmit: handleCreateUser, className: "stack", children: [_jsx("h4", { children: "Create user" }), _jsx("input", { value: userForm.firstName, onChange: (event) => setUserForm({ ...userForm, firstName: event.target.value }), placeholder: "First name", required: true }), _jsx("input", { value: userForm.lastName, onChange: (event) => setUserForm({ ...userForm, lastName: event.target.value }), placeholder: "Last name", required: true }), _jsx("input", { type: "email", value: userForm.email, onChange: (event) => setUserForm({ ...userForm, email: event.target.value }), placeholder: "Email", required: true }), _jsx("input", { type: "password", value: userForm.password, onChange: (event) => setUserForm({ ...userForm, password: event.target.value }), placeholder: "Temporary password", required: true }), _jsxs("select", { value: userForm.role, onChange: (event) => setUserForm({ ...userForm, role: event.target.value, customerId: "" }), children: [_jsx("option", { value: "admin", children: "Admin" }), _jsx("option", { value: "manager", children: "Manager" }), _jsx("option", { value: "worker", children: "Worker" }), _jsx("option", { value: "viewer", children: "Viewer" })] }), userForm.role === "viewer" ? (_jsxs("select", { value: userForm.customerId, onChange: (event) => setUserForm({ ...userForm, customerId: event.target.value }), children: [_jsx("option", { value: "", children: "No customer scope" }), customers.map((customer) => (_jsx("option", { value: customer.id, children: customer.name }, customer.id)))] })) : null, _jsx("button", { type: "submit", disabled: savingUser, children: savingUser ? "Saving..." : "Create user" })] }), _jsxs("form", { onSubmit: handleCreateTeam, className: "stack", children: [_jsx("h4", { children: "Create team" }), _jsx("input", { value: teamForm.name, onChange: (event) => setTeamForm({ ...teamForm, name: event.target.value }), placeholder: "Team name", required: true }), _jsxs("select", { value: teamForm.vertical, onChange: (event) => setTeamForm({ ...teamForm, vertical: event.target.value }), children: [_jsx("option", { value: "fire", children: "Fire" }), _jsx("option", { value: "parking", children: "Parking" }), _jsx("option", { value: "pool", children: "Pool" })] }), _jsx("textarea", { rows: 3, value: teamForm.description, onChange: (event) => setTeamForm({ ...teamForm, description: event.target.value }), placeholder: "Operational responsibility" }), _jsx("button", { type: "submit", disabled: savingTeam, children: savingTeam ? "Saving..." : "Create team" })] }), _jsxs("form", { onSubmit: handleAssignTeamMember, className: "stack", children: [_jsx("h4", { children: "Assign team member" }), _jsxs("select", { value: membershipForm.teamId, onChange: (event) => setMembershipForm({ ...membershipForm, teamId: event.target.value }), required: true, children: [_jsx("option", { value: "", children: "Select team" }), teams.map((team) => (_jsx("option", { value: team.id, children: team.name }, team.id)))] }), _jsxs("select", { value: membershipForm.userId, onChange: (event) => setMembershipForm({ ...membershipForm, userId: event.target.value }), required: true, children: [_jsx("option", { value: "", children: "Select user" }), users.map((user) => (_jsxs("option", { value: user.id, children: [user.first_name, " ", user.last_name] }, user.id)))] }), _jsxs("select", { value: membershipForm.memberRole, onChange: (event) => setMembershipForm({ ...membershipForm, memberRole: event.target.value }), children: [_jsx("option", { value: "member", children: "Member" }), _jsx("option", { value: "lead", children: "Lead" })] }), _jsx("button", { type: "submit", disabled: savingMembership, children: savingMembership ? "Saving..." : "Assign member" })] }), _jsxs("form", { onSubmit: handleCreateCustomer, className: "stack", children: [_jsx("h4", { children: "Create customer" }), _jsx("input", { value: customerForm.name, onChange: (event) => setCustomerForm({ ...customerForm, name: event.target.value }), placeholder: "Customer name", required: true }), _jsxs("select", { value: customerForm.vertical, onChange: (event) => setCustomerForm({ ...customerForm, vertical: event.target.value }), children: [_jsx("option", { value: "fire", children: "Fire" }), _jsx("option", { value: "parking", children: "Parking" }), _jsx("option", { value: "pool", children: "Pool" })] }), _jsx("input", { value: customerForm.contactName, onChange: (event) => setCustomerForm({ ...customerForm, contactName: event.target.value }), placeholder: "Contact name" }), _jsx("input", { type: "email", value: customerForm.contactEmail, onChange: (event) => setCustomerForm({ ...customerForm, contactEmail: event.target.value }), placeholder: "Contact email" }), _jsx("input", { value: customerForm.phone, onChange: (event) => setCustomerForm({ ...customerForm, phone: event.target.value }), placeholder: "Phone" }), _jsx("textarea", { rows: 3, value: customerForm.notes, onChange: (event) => setCustomerForm({ ...customerForm, notes: event.target.value }), placeholder: "Customer notes" }), _jsx("button", { type: "submit", children: "Create customer" })] }), _jsxs("form", { onSubmit: handleCreateContract, className: "stack", children: [_jsx("h4", { children: "Create contract" }), _jsxs("select", { value: contractForm.customerId, onChange: (event) => setContractForm({ ...contractForm, customerId: event.target.value }), required: true, children: [_jsx("option", { value: "", children: "Select customer" }), customers.map((customer) => (_jsx("option", { value: customer.id, children: customer.name }, customer.id)))] }), _jsx("input", { value: contractForm.name, onChange: (event) => setContractForm({ ...contractForm, name: event.target.value }), placeholder: "Contract name", required: true }), _jsxs("select", { value: contractForm.vertical, onChange: (event) => setContractForm({ ...contractForm, vertical: event.target.value }), children: [_jsx("option", { value: "fire", children: "Fire" }), _jsx("option", { value: "parking", children: "Parking" }), _jsx("option", { value: "pool", children: "Pool" })] }), _jsxs("select", { value: contractForm.status, onChange: (event) => setContractForm({ ...contractForm, status: event.target.value }), children: [_jsx("option", { value: "draft", children: "Draft" }), _jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "expired", children: "Expired" })] }), _jsx("input", { type: "date", value: contractForm.startDate, onChange: (event) => setContractForm({ ...contractForm, startDate: event.target.value }) }), _jsx("input", { type: "date", value: contractForm.endDate, onChange: (event) => setContractForm({ ...contractForm, endDate: event.target.value }) }), _jsx("textarea", { rows: 3, value: contractForm.slaNotes, onChange: (event) => setContractForm({ ...contractForm, slaNotes: event.target.value }), placeholder: "SLA notes" }), _jsx("button", { type: "submit", children: "Create contract" })] }), _jsxs("form", { onSubmit: handleCreateRule, className: "stack", children: [_jsx("h4", { children: "Create automation rule" }), _jsx("input", { value: ruleForm.name, onChange: (event) => setRuleForm({ ...ruleForm, name: event.target.value }), placeholder: "Rule name", required: true }), _jsxs("select", { value: ruleForm.vertical, onChange: (event) => setRuleForm({ ...ruleForm, vertical: event.target.value, targetTeamId: "" }), children: [_jsx("option", { value: "fire", children: "Fire" }), _jsx("option", { value: "parking", children: "Parking" }), _jsx("option", { value: "pool", children: "Pool" })] }), _jsxs("select", { value: ruleForm.triggerSource, onChange: (event) => setRuleForm({ ...ruleForm, triggerSource: event.target.value }), children: [_jsx("option", { value: "telemetry", children: "Telemetry" }), _jsx("option", { value: "task_overdue", children: "Task overdue" })] }), ruleForm.triggerSource === "telemetry" ? (_jsxs(_Fragment, { children: [_jsx("input", { value: ruleForm.eventType, onChange: (event) => setRuleForm({ ...ruleForm, eventType: event.target.value }), placeholder: "Event type, e.g. ph, pressure, occupancy", required: true }), _jsxs("select", { value: ruleForm.comparator, onChange: (event) => setRuleForm({ ...ruleForm, comparator: event.target.value }), children: [_jsx("option", { value: "lt", children: "Less than" }), _jsx("option", { value: "gt", children: "Greater than" }), _jsx("option", { value: "outside_range", children: "Outside range" }), _jsx("option", { value: "equals", children: "Equals" }), _jsx("option", { value: "any", children: "Any" })] }), _jsx("input", { type: "number", step: "0.1", value: ruleForm.thresholdMin, onChange: (event) => setRuleForm({ ...ruleForm, thresholdMin: event.target.value }), placeholder: "Threshold min" }), ruleForm.comparator === "outside_range" ? (_jsx("input", { type: "number", step: "0.1", value: ruleForm.thresholdMax, onChange: (event) => setRuleForm({ ...ruleForm, thresholdMax: event.target.value }), placeholder: "Threshold max" })) : null, _jsxs("select", { value: ruleForm.severityFilter, onChange: (event) => setRuleForm({ ...ruleForm, severityFilter: event.target.value }), children: [_jsx("option", { value: "info", children: "Info" }), _jsx("option", { value: "warning", children: "Warning" }), _jsx("option", { value: "critical", children: "Critical" })] })] })) : (_jsxs("select", { value: ruleForm.taskStatus, onChange: (event) => setRuleForm({ ...ruleForm, taskStatus: event.target.value }), children: [_jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "in_progress", children: "In progress" }), _jsx("option", { value: "awaiting_review", children: "Awaiting review" }), _jsx("option", { value: "overdue", children: "Overdue" })] })), _jsxs("select", { value: ruleForm.actionType, onChange: (event) => setRuleForm({ ...ruleForm, actionType: event.target.value }), children: [_jsx("option", { value: "create_task", children: "Create task" }), _jsx("option", { value: "notify", children: "Notify" }), _jsx("option", { value: "mark_overdue", children: "Mark overdue" })] }), _jsxs("select", { value: ruleForm.targetTeamId, onChange: (event) => setRuleForm({ ...ruleForm, targetTeamId: event.target.value }), children: [_jsx("option", { value: "", children: "Select target team" }), teams
                                                                .filter((team) => team.vertical === ruleForm.vertical)
                                                                .map((team) => (_jsx("option", { value: team.id, children: team.name }, team.id)))] }), _jsx("input", { value: ruleForm.actionTitle, onChange: (event) => setRuleForm({ ...ruleForm, actionTitle: event.target.value }), placeholder: "Action title", required: true }), _jsx("textarea", { rows: 3, value: ruleForm.actionMessage, onChange: (event) => setRuleForm({ ...ruleForm, actionMessage: event.target.value }), placeholder: "Action message", required: true }), _jsx("button", { type: "submit", disabled: savingRule, children: savingRule ? "Saving..." : "Create rule" })] }), _jsxs("form", { onSubmit: handleCreateNotificationPolicy, className: "stack", children: [_jsx("h4", { children: "Create notification policy" }), _jsx("input", { value: notificationPolicyForm.name, onChange: (event) => setNotificationPolicyForm({ ...notificationPolicyForm, name: event.target.value }), placeholder: "Policy name", required: true }), _jsxs("select", { value: notificationPolicyForm.notificationType, onChange: (event) => setNotificationPolicyForm({ ...notificationPolicyForm, notificationType: event.target.value }), children: [_jsx("option", { value: "rule", children: "Rule" }), _jsx("option", { value: "telemetry", children: "Telemetry" }), _jsx("option", { value: "escalation", children: "Escalation" })] }), _jsxs("select", { value: notificationPolicyForm.channel, onChange: (event) => setNotificationPolicyForm({ ...notificationPolicyForm, channel: event.target.value }), children: [_jsx("option", { value: "in_app", children: "In-app" }), _jsx("option", { value: "email", children: "Email" }), _jsx("option", { value: "sms", children: "SMS" }), _jsx("option", { value: "slack", children: "Slack" })] }), _jsxs("select", { value: notificationPolicyForm.targetRole, onChange: (event) => setNotificationPolicyForm({ ...notificationPolicyForm, targetRole: event.target.value }), children: [_jsx("option", { value: "admin", children: "Admin" }), _jsx("option", { value: "manager", children: "Manager" }), _jsx("option", { value: "worker", children: "Worker" }), _jsx("option", { value: "viewer", children: "Viewer" })] }), _jsx("input", { type: "number", min: "0", value: notificationPolicyForm.delayMinutes, onChange: (event) => setNotificationPolicyForm({ ...notificationPolicyForm, delayMinutes: event.target.value }), placeholder: "Delay minutes" }), _jsx("input", { type: "number", min: "1", max: "5", value: notificationPolicyForm.repeatCount, onChange: (event) => setNotificationPolicyForm({ ...notificationPolicyForm, repeatCount: event.target.value }), placeholder: "Repeat count" }), _jsx("button", { type: "submit", disabled: savingNotificationPolicy, children: savingNotificationPolicy ? "Saving..." : "Create policy" })] })] })) : (_jsxs("form", { onSubmit: handleCreateTask, className: "stack", children: [_jsx("input", { value: taskForm.title, onChange: (event) => setTaskForm({ ...taskForm, title: event.target.value }), placeholder: "Task title", required: true }), _jsx("textarea", { value: taskForm.description, onChange: (event) => setTaskForm({ ...taskForm, description: event.target.value }), placeholder: "Description", rows: 3 }), _jsxs("select", { value: taskForm.vertical, onChange: (event) => setTaskForm({
                                                    ...taskForm,
                                                    vertical: event.target.value,
                                                    templateId: "",
                                                    siteId: "",
                                                    assetId: ""
                                                }), children: [_jsx("option", { value: "fire", children: "Fire" }), _jsx("option", { value: "parking", children: "Parking" }), _jsx("option", { value: "pool", children: "Pool" })] }), _jsxs("select", { value: taskForm.templateId, onChange: (event) => setTaskForm({ ...taskForm, templateId: event.target.value }), children: [_jsx("option", { value: "", children: "Select template" }), templatesForVertical.map((template) => (_jsx("option", { value: template.id, children: template.name }, template.id)))] }), _jsxs("select", { value: taskForm.siteId, onChange: (event) => setTaskForm({ ...taskForm, siteId: event.target.value, assetId: "" }), children: [_jsx("option", { value: "", children: "Select site" }), sitesForVertical.map((site) => (_jsx("option", { value: site.id, children: site.name }, site.id)))] }), _jsxs("select", { value: taskForm.assetId, onChange: (event) => setTaskForm({ ...taskForm, assetId: event.target.value }), children: [_jsx("option", { value: "", children: "Select asset" }), assetsForVertical.map((asset) => (_jsx("option", { value: asset.id, children: asset.name }, asset.id)))] }), _jsxs("select", { value: taskForm.teamId, onChange: (event) => setTaskForm({ ...taskForm, teamId: event.target.value }), children: [_jsx("option", { value: "", children: "Select team" }), teamsForVertical.map((team) => (_jsx("option", { value: team.id, children: team.name }, team.id)))] }), _jsxs("select", { value: taskForm.assignedTo, onChange: (event) => setTaskForm({ ...taskForm, assignedTo: event.target.value }), children: [_jsx("option", { value: "", children: "Select assignee" }), usersForVertical.map((user) => (_jsxs("option", { value: user.id, children: [user.first_name, " ", user.last_name, " \u00B7 ", user.role] }, user.id)))] }), _jsxs("select", { value: taskForm.scheduleType, onChange: (event) => setTaskForm({ ...taskForm, scheduleType: event.target.value }), children: [_jsx("option", { value: "one_time", children: "One-time" }), _jsx("option", { value: "recurring", children: "Recurring" })] }), taskForm.scheduleType === "recurring" ? (_jsx("input", { value: taskForm.recurrenceRule, onChange: (event) => setTaskForm({ ...taskForm, recurrenceRule: event.target.value }), placeholder: "Cron expression, e.g. 0 8 * * *" })) : null, _jsx("input", { type: "datetime-local", value: taskForm.dueDate, onChange: (event) => setTaskForm({ ...taskForm, dueDate: event.target.value }) }), _jsx("button", { type: "submit", children: "Create task" })] }))] }), _jsxs("article", { className: "panel", children: [_jsxs("div", { className: "panel-header", children: [_jsx("h3", { children: activeView === "templates"
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
                                                                                                : "Operations board" }), _jsx("p", { children: activeView === "templates"
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
                                                                                                : "Use the workspace modules to move from planning to execution to proof." })] }), activeView === "overview" ? (_jsxs("div", { className: "overview-stack", children: [_jsx("div", { className: "list", children: tasks.slice(0, 4).map((task) => (_jsxs("button", { type: "button", className: "list-card selectable", onClick: () => {
                                                        setSelectedTaskId(task.id);
                                                        setActiveView("tasks");
                                                    }, children: [_jsxs("div", { className: "card-row", children: [_jsx("strong", { children: task.title }), _jsx("span", { className: `badge ${task.vertical}`, children: task.vertical })] }), _jsx("p", { children: task.description }), _jsxs("small", { children: [task.site_name || "No site", " \u00B7 ", describeSchedule(task)] })] }, task.id))) }), _jsxs("div", { className: "detail-card", children: [_jsx("h4", { children: "How the environment now works" }), _jsxs("div", { className: "checklist-list", children: [_jsxs("div", { className: "checklist-line", children: [_jsx("strong", { children: "Sites" }), _jsx("span", { children: "Physical operating locations by vertical." })] }), _jsxs("div", { className: "checklist-line", children: [_jsx("strong", { children: "Assets" }), _jsx("span", { children: "Individual units like extinguishers, barriers, chargers, or test points." })] }), _jsxs("div", { className: "checklist-line", children: [_jsx("strong", { children: "Recurring tasks" }), _jsx("span", { children: "Scheduled work linked to templates and optionally to assets." })] })] })] })] })) : null, activeView === "demo" ? (_jsxs("div", { className: "demo-board", children: [_jsx("div", { className: "demo-timeline", children: demoSteps.map((step, index) => (_jsxs("button", { type: "button", className: `demo-step ${step.status}`, onClick: () => {
                                                        if (step.view === "tasks" && demoSourceTask) {
                                                            setSelectedTaskId(demoSourceTask.id);
                                                        }
                                                        setActiveView(step.view);
                                                    }, children: [_jsx("span", { className: "demo-index", children: index + 1 }), _jsxs("div", { children: [_jsx("strong", { children: step.title }), _jsx("p", { children: step.detail })] }), _jsx("small", { children: step.status })] }, step.title))) }), _jsxs("div", { className: "detail-card", children: [_jsx("h4", { children: "Interview narrative" }), _jsx("p", { children: "Facility Compliance Hub is one multi-tenant platform powering multiple operational products: FireOps, ParkOps, and PoolOps. The workflow is not a generic task list; it captures proof, timestamps, evidence, corrective actions, reports, and customer-scoped access." }), _jsxs("div", { className: "checklist-list", children: [_jsxs("div", { className: "checklist-line", children: [_jsx("strong", { children: "Platform layer" }), _jsx("span", { children: "Postgres, API, RBAC, audit, reports, monitoring containers." })] }), _jsxs("div", { className: "checklist-line", children: [_jsx("strong", { children: "Product layer" }), _jsx("span", { children: "Vertical templates, sites, assets, telemetry, and branded workflows." })] }), _jsxs("div", { className: "checklist-line", children: [_jsx("strong", { children: "Compliance layer" }), _jsx("span", { children: "Evidence, review notes, corrective tasks, PDFs, CSV exports, viewer portal." })] })] }), demoSourceTask ? (_jsx("button", { type: "button", onClick: () => {
                                                            setSelectedTaskId(demoSourceTask.id);
                                                            setActiveView("tasks");
                                                        }, children: "Open current demo task" })) : (_jsx("button", { type: "button", onClick: () => setActiveView("templates"), children: "Create first demo task" }))] })] })) : null, activeView === "enterprise" ? (_jsxs("div", { className: "enterprise-board", children: [_jsxs("div", { className: "detail-card", children: [_jsx("h4", { children: "Built now" }), _jsx("p", { className: "muted-line", children: "These are the parts that make the app credible as a platform-engineering showcase today." }), _jsx("div", { className: "checklist-list", children: enterpriseCapabilities.map(([title, status, detail]) => (_jsxs("div", { className: "roadmap-line built", children: [_jsxs("div", { children: [_jsx("strong", { children: title }), _jsx("div", { className: "muted-line", children: detail })] }), _jsx("span", { children: status })] }, title))) })] }), _jsxs("div", { className: "detail-card", children: [_jsx("h4", { children: "Enterprise gaps" }), _jsx("p", { className: "muted-line", children: "These are the honest next steps to reach a production enterprise model." }), _jsx("div", { className: "checklist-list", children: enterpriseGaps.map(([title, priority, detail]) => (_jsxs("div", { className: `roadmap-line ${priority}`, children: [_jsxs("div", { children: [_jsx("strong", { children: title }), _jsx("div", { className: "muted-line", children: detail })] }), _jsx("span", { children: priority })] }, title))) })] }), _jsxs("div", { className: "detail-card enterprise-wide", children: [_jsx("h4", { children: "Recommended build order" }), _jsx("div", { className: "roadmap-steps", children: [
                                                            "Keep the web/platform showcase stable for the interview.",
                                                            "Add Grafana alert rules and backup cron.",
                                                            "Build the Android field-worker app and test on Pixel 6.",
                                                            "Add offline queue, photo retry, and sync conflict handling.",
                                                            "Add SSO/OIDC, stronger RBAC, and device API keys.",
                                                            "Move uploads/reports to S3-compatible object storage."
                                                        ].map((step, index) => (_jsxs("div", { className: "roadmap-step", children: [_jsx("span", { children: index + 1 }), _jsx("p", { children: step })] }, step))) })] })] })) : null, activeView === "planner" ? (_jsx("div", { className: "planner-stack", children: plannerBuckets.length ? (plannerBuckets.map(([day, dayTasks]) => (_jsxs("div", { className: "detail-card planner-day", children: [_jsxs("div", { className: "card-row", children: [_jsx("h4", { children: day }), _jsxs("span", { children: [dayTasks.length, " task(s)"] })] }), _jsx("div", { className: "checklist-list", children: dayTasks.map((task) => (_jsxs("button", { type: "button", className: "checklist-line selectable-line", onClick: () => {
                                                            setSelectedTaskId(task.id);
                                                            setActiveView("tasks");
                                                        }, children: [_jsxs("div", { children: [_jsx("strong", { children: task.title }), _jsxs("div", { className: "muted-line", children: [task.site_name || "No site", " \u00B7 ", task.team_name || "No team", " \u00B7 ", task.assignee_name || "Unassigned"] }), _jsxs("div", { className: "muted-line", children: [task.asset_name || "No asset", " \u00B7 ", describeSchedule(task)] })] }), _jsx("span", { children: task.status })] }, task.id))) })] }, day)))) : (_jsx("p", { children: "No scheduled tasks found in the planner window." })) })) : null, activeView === "templates" ? (_jsxs("div", { className: "split-panel", children: [_jsx("div", { className: "list", children: templates.map((template) => (_jsxs("button", { type: "button", className: `list-card selectable ${selectedTemplateId === template.id ? "selected" : ""}`, onClick: () => setSelectedTemplateId(template.id), children: [_jsxs("div", { className: "card-row", children: [_jsx("strong", { children: template.name }), _jsx("span", { className: `badge ${template.vertical}`, children: template.vertical })] }), _jsx("p", { children: template.description }), _jsxs("small", { children: [template.category, " \u00B7 ", template.recurrence || "manual"] })] }, template.id))) }), _jsx("div", { className: "detail-card", children: selectedTemplate ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "card-row", children: [_jsx("h4", { children: selectedTemplate.name }), _jsx("span", { className: `badge ${selectedTemplate.vertical}`, children: selectedTemplate.vertical })] }), _jsx("p", { children: selectedTemplate.description }), _jsxs("small", { children: [selectedTemplate.category, " \u00B7 ", selectedTemplate.recurrence || "manual"] }), _jsx("div", { className: "checklist-list", children: selectedTemplate.items.map((item) => (_jsxs("div", { className: "checklist-line", children: [_jsxs("strong", { children: [item.label, item.required ? " *" : ""] }), _jsx("span", { children: item.type })] }, item.key))) }), !isViewer ? (_jsx("button", { type: "button", onClick: () => handleUseTemplate(selectedTemplate), children: "Use template to create task" })) : null] })) : (_jsx("p", { children: "Select a template to inspect its checklist and built-in recurrence pattern." })) })] })) : null, activeView === "tasks" ? (_jsxs("div", { className: "split-panel", children: [_jsx("div", { className: "list", children: tasks.map((task) => (_jsxs("button", { type: "button", className: `list-card selectable ${selectedTaskId === task.id ? "selected" : ""}`, onClick: () => setSelectedTaskId(task.id), children: [_jsxs("div", { className: "card-row", children: [_jsx("strong", { children: task.title }), _jsx("span", { className: `badge ${task.vertical}`, children: task.vertical })] }), _jsx("p", { children: task.description }), _jsxs("small", { children: [task.site_name || "No site", " \u00B7 ", task.asset_name || "No asset", " \u00B7 ", task.status, " \u00B7 ", describeSchedule(task)] })] }, task.id))) }), _jsx("div", { className: "detail-card", children: selectedTask ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "card-row", children: [_jsx("h4", { children: selectedTask.title }), _jsx("span", { className: `badge ${selectedTask.vertical}`, children: selectedTask.vertical })] }), _jsx("p", { children: selectedTask.description || "No description" }), _jsxs("small", { children: [selectedTask.site_name || "No site", " \u00B7 ", selectedTask.asset_name || "No asset", " \u00B7 ", selectedTask.status, " \u00B7 ", formatDate(selectedTask.due_date)] }), _jsx("p", { className: "schedule-pill", children: describeSchedule(selectedTask) }), selectedTask.reviewed_at ? (_jsxs("p", { className: "muted-line", children: ["Reviewed ", new Date(selectedTask.reviewed_at).toLocaleString()] })) : null, selectedTask.status === "closed" || selectedTask.status === "completed" ? (_jsxs(_Fragment, { children: [_jsx("p", { children: "This task is closed. Check the evidence log for the submission record and review notes." }), selectedTask.review_notes ? _jsx("p", { children: selectedTask.review_notes }) : null] })) : selectedTask.status === "awaiting_review" ? (_jsxs("div", { className: "stack", children: [_jsx("textarea", { rows: 3, value: reviewNotes, onChange: (event) => setReviewNotes(event.target.value), placeholder: "Review notes or follow-up instructions" }), (session.user.role === "admin" || session.user.role === "manager") ? (_jsxs("div", { className: "button-row", children: [_jsx("button", { type: "button", onClick: () => handleTaskAction("approve"), disabled: taskActionLoading, children: taskActionLoading ? "Saving..." : "Approve and close" }), _jsx("button", { type: "button", className: "secondary", onClick: () => handleTaskAction("reopen"), disabled: taskActionLoading, children: "Return to in progress" })] })) : (_jsx("p", { children: "Waiting for manager review." }))] })) : selectedTask.status === "pending" ? (_jsxs("div", { className: "stack", children: [_jsx("button", { type: "button", onClick: () => handleTaskAction("start"), disabled: taskActionLoading, children: taskActionLoading ? "Updating..." : "Start task" }), _jsx("p", { className: "muted-line", children: "Start the task before capturing the checklist evidence." })] })) : (_jsxs("form", { className: "stack", onSubmit: handleSubmitTask, children: [_jsx("div", { className: "checklist-list", children: selectedTask.items?.length ? (selectedTask.items.map((item) => renderTaskInput(item))) : (_jsx("p", { children: "No checklist items were attached to this task." })) }), _jsx("textarea", { rows: 4, value: taskNotes, onChange: (event) => setTaskNotes(event.target.value), placeholder: "Notes, findings, exceptions, or remediation summary" }), _jsxs("label", { className: "field-stack", children: [_jsx("span", { children: "Evidence photos" }), _jsx("input", { type: "file", multiple: true, accept: "image/*", onChange: (event) => setTaskPhotos(event.target.files) })] }), _jsxs("div", { className: "button-row", children: [_jsx("button", { type: "submit", disabled: submittingTask, children: submittingTask ? "Submitting..." : "Submit for review" }), _jsx("button", { type: "button", className: "secondary", onClick: () => handleTaskAction("mark_overdue"), disabled: taskActionLoading, children: "Flag overdue" })] })] })), _jsxs("div", { className: "section-spacer", children: [_jsx("h4", { children: "Evidence history" }), selectedTaskSubmissions.length ? (_jsx("div", { className: "checklist-list", children: selectedTaskSubmissions.map((submission) => (_jsxs("div", { className: "evidence-card", children: [_jsxs("div", { className: "card-row", children: [_jsx("strong", { children: new Date(submission.created_at).toLocaleString() }), _jsx("span", { children: submission.status })] }), submission.notes ? _jsx("p", { children: submission.notes }) : null, Array.isArray(submission.payload) ? (_jsx("div", { className: "evidence-grid", children: submission.payload.map((entry) => {
                                                                                    const item = entry;
                                                                                    return (_jsxs("div", { className: "evidence-item", children: [_jsx("span", { children: item.label ?? item.key }), _jsx("strong", { children: String(item.value ?? "n/a") })] }, item.key));
                                                                                }) })) : null, submission.photo_urls?.length ? (_jsx("div", { className: "photo-strip", children: submission.photo_urls.map((url) => (_jsx("a", { href: `${apiUrl}${url}`, target: "_blank", rel: "noreferrer", children: "Evidence photo" }, url))) })) : null] }, submission.id))) })) : (_jsx("p", { className: "muted-line", children: "No evidence has been submitted for this task yet." }))] })] })) : (_jsx("p", { children: "Select an active task to open its checklist and submit the work." })) })] })) : null, activeView === "sites" ? (_jsxs("div", { className: "split-panel", children: [_jsx("div", { className: "list", children: sites.map((site) => (_jsxs("button", { type: "button", className: `list-card selectable ${selectedSiteId === site.id ? "selected" : ""}`, onClick: () => setSelectedSiteId(site.id), children: [_jsxs("div", { className: "card-row", children: [_jsx("strong", { children: site.name }), _jsx("span", { className: `badge ${site.vertical}`, children: site.vertical })] }), _jsx("p", { children: site.description || site.address || "No description" }), _jsx("small", { children: site.address || "No address" })] }, site.id))) }), _jsx("div", { className: "detail-card", children: selectedSite ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "card-row", children: [_jsx("h4", { children: selectedSite.name }), _jsx("span", { className: `badge ${selectedSite.vertical}`, children: selectedSite.vertical })] }), _jsx("p", { children: selectedSite.description || "No description" }), _jsx("small", { children: selectedSite.address || "No address" }), selectedSite.customer_name ? (_jsxs("p", { className: "muted-line", children: ["Customer: ", selectedSite.customer_name] })) : null, _jsxs("div", { className: "section-spacer", children: [_jsx("h4", { children: "Assets at this site" }), _jsx("div", { className: "checklist-list", children: siteAssets.length ? (siteAssets.map((asset) => (_jsxs("button", { type: "button", className: `checklist-line selectable-line ${selectedAssetId === asset.id ? "selected-line" : ""}`, onClick: () => setSelectedAssetId(asset.id), children: [_jsxs("div", { children: [_jsx("strong", { children: asset.name }), _jsx("div", { className: "muted-line", children: asset.asset_type })] }), _jsx("span", { children: asset.status })] }, asset.id)))) : (_jsx("p", { children: "No assets registered for this site yet." })) })] }), _jsxs("div", { className: "section-spacer", children: [_jsx("h4", { children: selectedAsset ? `${selectedAsset.name} history` : "Site task history" }), _jsx("div", { className: "checklist-list", children: siteTasks.length ? (siteTasks.slice(0, 6).map((task) => (_jsxs("div", { className: "checklist-line", children: [_jsxs("div", { children: [_jsx("strong", { children: task.title }), _jsxs("div", { className: "muted-line", children: [task.asset_name || "No asset", " \u00B7 ", describeSchedule(task)] })] }), _jsx("span", { children: task.status })] }, task.id)))) : (_jsx("p", { children: "No tasks for this scope yet." })) })] }), _jsxs("div", { className: "section-spacer", children: [_jsx("h4", { children: selectedAsset ? `${selectedAsset.name} submissions` : "Site submissions" }), _jsx("div", { className: "checklist-list", children: siteSubmissions.length ? (siteSubmissions.slice(0, 6).map((submission) => (_jsxs("div", { className: "checklist-line", children: [_jsxs("div", { children: [_jsx("strong", { children: submission.task_title }), _jsxs("div", { className: "muted-line", children: [submission.asset_name || "No asset", " \u00B7 ", new Date(submission.created_at).toLocaleString()] })] }), _jsx("span", { children: submission.status || "logged" })] }, submission.id)))) : (_jsx("p", { children: "No submissions for this scope yet." })) })] })] })) : (_jsx("p", { children: "Select a site to inspect its registered assets." })) })] })) : null, activeView === "monitoring" ? (_jsxs("div", { className: "split-panel", children: [_jsx("div", { className: "list", children: monitoringDevices.map((device) => (_jsxs("div", { className: "list-card", children: [_jsxs("div", { className: "card-row", children: [_jsx("strong", { children: device.name }), _jsx("span", { className: `badge ${device.vertical}`, children: device.vertical })] }), _jsx("p", { children: device.device_type }), _jsxs("small", { children: [device.site_name, " \u00B7 ", device.asset_name || "No asset", " \u00B7 ", device.status, " \u00B7 ", formatDate(device.last_seen)] })] }, device.id))) }), _jsxs("div", { className: "detail-card", children: [_jsx("h4", { children: "Latest telemetry events" }), _jsx("div", { className: "checklist-list", children: telemetry.slice(0, 12).map((event) => (_jsxs("div", { className: "checklist-line", children: [_jsxs("div", { children: [_jsx("strong", { children: event.device_name }), _jsxs("div", { className: "muted-line", children: [event.event_type, " \u00B7 ", event.reading_value ?? event.reading_text ?? "n/a", " \u00B7 ", event.site_name] })] }), _jsx("span", { children: event.severity })] }, event.id))) })] })] })) : null, activeView === "alerts" ? (_jsxs("div", { className: "split-panel", children: [_jsx("div", { className: "list", children: notifications.map((notification) => (_jsxs("div", { className: "list-card", children: [_jsxs("div", { className: "card-row", children: [_jsx("strong", { children: notification.title }), _jsx("span", { children: notification.resolved_at
                                                                        ? "resolved"
                                                                        : notification.acknowledged_at
                                                                            ? "acknowledged"
                                                                            : notification.is_read
                                                                                ? "read"
                                                                                : "new" })] }), _jsx("p", { children: notification.message }), _jsxs("small", { children: [new Date(notification.created_at).toLocaleString(), notification.acknowledged_at ? ` · acknowledged ${new Date(notification.acknowledged_at).toLocaleString()}` : "", notification.resolved_at ? ` · resolved ${new Date(notification.resolved_at).toLocaleString()}` : ""] }), _jsx("div", { className: "section-spacer", children: _jsxs("div", { className: "button-row", children: [!notification.acknowledged_at ? (_jsx("button", { type: "button", className: "secondary", onClick: () => handleAcknowledgeNotification(notification.id), children: "Acknowledge" })) : null, !notification.resolved_at ? (_jsx("button", { type: "button", className: "secondary", onClick: () => handleResolveNotification(notification.id), children: "Resolve" })) : null, !notification.is_read ? (_jsx("button", { type: "button", className: "secondary", onClick: () => handleMarkNotificationRead(notification.id), children: "Mark read" })) : null] }) })] }, notification.id))) }), _jsxs("div", { className: "detail-card", children: [_jsx("h4", { children: "Delivery queue" }), _jsx("div", { className: "checklist-list", children: notificationDeliveries.map((delivery) => (_jsxs("div", { className: "checklist-line", children: [_jsxs("div", { children: [_jsx("strong", { children: delivery.title }), _jsxs("div", { className: "muted-line", children: [delivery.channel, " \u00B7 attempt ", delivery.attempt_number, " \u00B7 ", delivery.type] }), _jsxs("div", { className: "muted-line", children: ["scheduled ", new Date(delivery.scheduled_for).toLocaleString()] })] }), _jsx("span", { children: delivery.status })] }, delivery.id))) })] })] })) : null, activeView === "admin" ? (_jsxs("div", { className: "split-panel", children: [_jsxs("div", { className: "list", children: [teams.map((team) => (_jsxs("div", { className: "list-card", children: [_jsxs("div", { className: "card-row", children: [_jsx("strong", { children: team.name }), _jsx("span", { className: `badge ${team.vertical}`, children: team.vertical })] }), _jsx("p", { children: team.description || "No description" }), _jsxs("small", { children: [team.member_count, " member(s) \u00B7 leads: ", team.leads || "none"] })] }, team.id))), customers.map((customer) => (_jsxs("div", { className: "list-card", children: [_jsxs("div", { className: "card-row", children: [_jsx("strong", { children: customer.name }), _jsx("span", { className: `badge ${customer.vertical}`, children: customer.vertical })] }), _jsx("p", { children: customer.contact_name || "No contact" }), _jsx("small", { children: customer.contact_email || customer.phone || "No contact details" })] }, customer.id)))] }), _jsxs("div", { className: "detail-card", children: [_jsx("h4", { children: "User directory" }), _jsx("div", { className: "checklist-list", children: users.map((user) => (_jsxs("div", { className: "checklist-line", children: [_jsxs("div", { children: [_jsxs("strong", { children: [user.first_name, " ", user.last_name] }), _jsxs("div", { className: "muted-line", children: [user.email, user.customer_name ? ` · ${user.customer_name}` : ""] })] }), _jsx("span", { children: user.role })] }, user.id))) }), _jsxs("div", { className: "section-spacer", children: [_jsx("h4", { children: "Service contracts" }), _jsx("div", { className: "checklist-list", children: contracts.map((contract) => (_jsxs("div", { className: "checklist-line", children: [_jsxs("div", { children: [_jsx("strong", { children: contract.name }), _jsxs("div", { className: "muted-line", children: [contract.customer_name, " \u00B7 ", contract.start_date || "No start", " to ", contract.end_date || "No end"] })] }), _jsx("span", { children: contract.status })] }, contract.id))) })] }), _jsxs("div", { className: "section-spacer", children: [_jsx("h4", { children: "Automation rules" }), _jsx("div", { className: "checklist-list", children: rules.map((rule) => (_jsxs("div", { className: "checklist-line", children: [_jsxs("div", { children: [_jsx("strong", { children: rule.name }), _jsxs("div", { className: "muted-line", children: [(rule.vertical || "all").toString(), " \u00B7 ", rule.trigger_source, " \u00B7 ", rule.action_type] }), _jsx("div", { className: "muted-line", children: rule.trigger_source === "telemetry"
                                                                                        ? `${rule.event_type || "event"} ${rule.comparator || "any"} ${rule.threshold_min ?? ""}${rule.threshold_max !== null && rule.threshold_max !== undefined ? `-${rule.threshold_max}` : ""}`
                                                                                        : `status ${rule.task_status || "any"}` })] }), _jsxs("div", { className: "button-row", children: [_jsx("span", { children: rule.enabled ? "live" : "off" }), _jsx("button", { type: "button", className: "secondary", onClick: () => handleToggleRule(rule.id, !rule.enabled), children: rule.enabled ? "Disable" : "Enable" })] })] }, rule.id))) })] }), _jsxs("div", { className: "section-spacer", children: [_jsx("h4", { children: "Notification policies" }), _jsx("div", { className: "checklist-list", children: notificationPolicies.map((policy) => (_jsxs("div", { className: "checklist-line", children: [_jsxs("div", { children: [_jsx("strong", { children: policy.name }), _jsxs("div", { className: "muted-line", children: [(policy.notification_type || "all"), " \u00B7 ", policy.channel, " \u00B7 ", policy.target_role || "all roles"] }), _jsxs("div", { className: "muted-line", children: ["delay ", policy.delay_minutes, "m \u00B7 repeats ", policy.repeat_count] })] }), _jsxs("div", { className: "button-row", children: [_jsx("span", { children: policy.enabled ? "live" : "off" }), _jsx("button", { type: "button", className: "secondary", onClick: () => handleToggleNotificationPolicy(policy.id, !policy.enabled), children: policy.enabled ? "Disable" : "Enable" })] })] }, policy.id))) })] })] })] })) : null, activeView === "submissions" ? (_jsx("div", { className: "list", children: submissions.map((submission) => (_jsxs("div", { className: "list-card", children: [_jsxs("div", { className: "card-row", children: [_jsx("strong", { children: submission.task_title }), _jsx("span", { className: `badge ${submission.vertical}`, children: submission.vertical })] }), _jsx("p", { children: submission.notes || "No notes" }), _jsxs("small", { children: [submission.site_name || "No site", " \u00B7 ", submission.asset_name || "No asset", " \u00B7 ", new Date(submission.created_at).toLocaleString()] })] }, submission.id))) })) : null, activeView === "audit" ? (_jsx("div", { className: "list", children: auditLogs.length ? (auditLogs.map((entry) => (_jsxs("div", { className: "list-card", children: [_jsxs("div", { className: "card-row", children: [_jsx("strong", { children: entry.action.replaceAll("_", " ") }), _jsx("span", { children: entry.resource_type })] }), _jsx("p", { children: summarizeAuditDetails(entry.details) }), _jsxs("small", { children: [entry.user_name || "System", " \u00B7 ", new Date(entry.created_at).toLocaleString(), entry.resource_id ? ` · ${entry.resource_id}` : ""] })] }, entry.id)))) : (_jsx("p", { children: "No audit entries have been recorded yet." })) })) : null, activeView === "reports" ? (_jsxs("div", { className: "overview-stack", children: [_jsxs("div", { className: "detail-card", children: [_jsx("h4", { children: "Report contents" }), _jsxs("div", { className: "checklist-list", children: [_jsxs("div", { className: "checklist-line", children: [_jsx("strong", { children: "Task summary" }), _jsx("span", { children: "Status counts and recent operational work." })] }), _jsxs("div", { className: "checklist-line", children: [_jsx("strong", { children: "Evidence" }), _jsx("span", { children: "Submitted checklists, operators, timestamps, and photo counts." })] }), _jsxs("div", { className: "checklist-line", children: [_jsx("strong", { children: "Alerts" }), _jsx("span", { children: "Notification lifecycle with new, read, acknowledged, or resolved state." })] }), _jsxs("div", { className: "checklist-line", children: [_jsx("strong", { children: "Audit trail" }), _jsx("span", { children: "Recent tracked platform actions for compliance review." })] })] })] }), _jsxs("div", { className: "detail-card", children: [_jsx("h4", { children: "Report history" }), _jsx("div", { className: "checklist-list", children: reportRuns.length ? (reportRuns.slice(0, 12).map((report) => (_jsxs("div", { className: "checklist-line", children: [_jsxs("div", { children: [_jsx("strong", { children: report.report_type.replaceAll("_", " ") }), _jsxs("div", { className: "muted-line", children: [report.format.toUpperCase(), " \u00B7 ", report.vertical || "all", " \u00B7 ", report.period_days, "d \u00B7 ", new Date(report.created_at).toLocaleString()] }), _jsx("div", { className: "muted-line", children: report.generated_by_name || "System" })] }), _jsx("button", { type: "button", className: "secondary", onClick: () => handleDownloadReportRun(report), children: "Download" })] }, report.id)))) : (_jsx("p", { children: "No generated reports yet." })) })] })] })) : null] })] })] })] }));
}
