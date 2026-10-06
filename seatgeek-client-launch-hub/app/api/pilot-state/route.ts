import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { activityLog, portalState } from "../../../db/schema";

type UserRole = "Admin" | "CSS" | "Client";

type PortalUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus?: string;
  clientId?: string;
  clientIds: string[];
  [key: string]: unknown;
};

type LaunchPlan = {
  id: string;
  clientId: string;
  phases?: Array<{
    phase: string;
    tasks: Array<{ visibility?: string; [key: string]: unknown }>;
  }>;
  [key: string]: unknown;
};

type ClientRecord = {
  id: string;
  clientEmails?: string[];
  [key: string]: unknown;
};

type PortalComment = {
  id?: number;
  planId: string;
  taskId?: string;
  body?: string;
  mentionedUserIds?: string[];
  visibility?: string;
  [key: string]: unknown;
};

type PortalTask = {
  id: number;
  owner?: string;
  [key: string]: unknown;
};

type PortalTodoItem = {
  id: string;
  clientId: string;
  title: string;
  complete: boolean;
  createdAt: string;
  createdByName: string;
  createdByRole: UserRole;
};

type PortalResource = {
  id: string;
  title: string;
  url: string;
  description: string;
  audience: "CSS" | "Client" | "Both";
  [key: string]: unknown;
};

type PortalDirectMessage = {
  id: string;
  clientId: string;
  authorId: string;
  author: string;
  authorRole: UserRole;
  body: string;
  timestamp: string;
  mentionedUserIds?: string[];
  attachmentIds?: string[];
};

type PortalNotificationKind =
  | "comment"
  | "mention"
  | "task_completed"
  | "message";

type PortalNotification = {
  id: string;
  recipientUserId: string;
  clientId: string;
  kind: PortalNotificationKind;
  title: string;
  body: string;
  actorName: string;
  createdAt: string;
  readAt?: string | null;
  planId?: string;
  taskId?: string;
  messageId?: string;
};

type PilotState = {
  launchPlans: LaunchPlan[];
  tasks: PortalTask[];
  todoItems: PortalTodoItem[];
  comments: PortalComment[];
  clients: ClientRecord[];
  users: PortalUser[];
  resources: PortalResource[];
  directMessages: PortalDirectMessage[];
  notifications: PortalNotification[];
  planTaskCompletion: Record<string, boolean>;
};

type SavePayload = {
  state?: unknown;
  action?: string;
  entityType?: string;
  entityId?: string;
  detail?: string;
  notification?: NotificationRequest;
};

type NotificationRequest =
  | {
      kind: "comment";
      planId: string;
      taskId: string;
      commentId: number;
    }
  | {
      kind: "task_completed";
      planId: string;
      taskId: string;
    }
  | {
      kind: "message";
      clientId: string;
      messageId: string;
    };

type NotificationDelivery = {
  status: "sent" | "not_configured" | "suppressed" | "failed";
  recipientCount: number;
};

type PortalSession = {
  mode: "authenticated" | "preview";
  email: string | null;
  userId: string;
  name: string;
  role: UserRole;
  clientIds: string[];
};

const ADMIN_EMAILS = new Set([
  "cjoneshicks@seatgeek.com",
  "dsimpson@seatgeek.com",
]);

type NotificationRuntime = typeof globalThis & {
  __SEATGEEK_PORTAL_ENV__?: {
    EMAIL_NOTIFICATION_WEBHOOK_URL?: string;
    RESEND_API_KEY?: string;
    NOTIFICATION_FROM_EMAIL?: string;
  };
};

class AccessError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
  }
}

function isPilotState(value: unknown): value is PilotState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const state = value as Record<string, unknown>;
  return (
    Array.isArray(state.launchPlans) &&
    Array.isArray(state.tasks) &&
    Array.isArray(state.comments) &&
    Array.isArray(state.clients) &&
    Array.isArray(state.users) &&
    state.planTaskCompletion !== null &&
    typeof state.planTaskCompletion === "object" &&
    !Array.isArray(state.planTaskCompletion)
  );
}

function isNotificationRequest(value: unknown): value is NotificationRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const notification = value as Record<string, unknown>;
  if (notification.kind === "message") {
    return (
      typeof notification.clientId === "string" &&
      typeof notification.messageId === "string"
    );
  }
  if (
    typeof notification.planId !== "string" ||
    typeof notification.taskId !== "string"
  ) {
    return false;
  }
  return notification.kind === "task_completed"
    ? true
    : notification.kind === "comment" &&
        typeof notification.commentId === "number";
}

function getNotificationRuntime() {
  return (globalThis as NotificationRuntime).__SEATGEEK_PORTAL_ENV__;
}

function emailNotificationsConfigured() {
  const runtime = getNotificationRuntime();
  return Boolean(
    runtime?.EMAIL_NOTIFICATION_WEBHOOK_URL?.trim() ||
      (runtime?.RESEND_API_KEY?.trim() &&
        runtime?.NOTIFICATION_FROM_EMAIL?.trim()),
  );
}

function userClientIds(user: PortalUser) {
  return user.clientIds ?? (user.clientId ? [user.clientId] : []);
}

function findPlanTaskTitle(plan: LaunchPlan, taskId: string) {
  for (const phase of plan.phases ?? []) {
    const task = phase.tasks.find((candidate) => candidate.id === taskId);
    if (task && typeof task.title === "string") return task.title;
  }
  return "a launch task";
}

function findPlanTask(plan: LaunchPlan, taskId: string) {
  for (const phase of plan.phases ?? []) {
    const task = phase.tasks.find((candidate) => candidate.id === taskId);
    if (task) return task;
  }
  return undefined;
}

function createPortalNotifications(
  state: PilotState,
  session: PortalSession,
  notification: NotificationRequest | undefined,
  createdAt: string,
): PortalNotification[] {
  if (!notification || session.mode !== "authenticated") return [];

  let clientId = "";
  let planId: string | undefined;
  let taskId: string | undefined;
  let messageId: string | undefined;
  let titleBase = "New portal activity";
  let body = "Open the Client Launch Hub to review the update.";
  let internalOnly = false;
  let mentionedUserIds = new Set<string>();

  if (notification.kind === "message") {
    const message = state.directMessages.find(
      (candidate) =>
        candidate.id === notification.messageId &&
        candidate.clientId === notification.clientId,
    );
    if (!message) return [];
    clientId = message.clientId;
    messageId = message.id;
    mentionedUserIds = new Set(message.mentionedUserIds ?? []);
    titleBase = `${session.name} sent a message`;
    body = message.body;
  } else {
    const plan = state.launchPlans.find(
      (candidate) => candidate.id === notification.planId,
    );
    if (!plan) return [];
    clientId = plan.clientId;
    planId = plan.id;
    taskId = notification.taskId;
    const task = findPlanTask(plan, notification.taskId);
    const taskTitle = findPlanTaskTitle(plan, notification.taskId);

    if (notification.kind === "comment") {
      const comment = state.comments.find(
        (candidate) =>
          candidate.id === notification.commentId &&
          candidate.planId === notification.planId &&
          candidate.taskId === notification.taskId,
      );
      if (!comment) return [];
      internalOnly = comment.visibility === "Internal";
      mentionedUserIds = new Set(comment.mentionedUserIds ?? []);
      titleBase = `${session.name} commented on ${taskTitle}`;
      body = String(comment.body ?? "New comment");
    } else {
      internalOnly = task?.visibility === "SeatGeek only";
      titleBase = `${session.name} completed ${taskTitle}`;
      body = `${String(plan.title ?? "Launch plan")} · ${String(
        plan.client ?? "Client workspace",
      )}`;
    }
  }

  if (
    !clientId ||
    (session.role !== "Admin" && !session.clientIds.includes(clientId))
  ) {
    return [];
  }

  const recipients = state.users.filter((user) => {
    if (!(["Admin", "CSS", "Client"] as string[]).includes(user.role)) {
      return false;
    }
    if (user.id !== "admin-demo" && user.accountStatus !== "Active") {
      return false;
    }
    if (user.role !== "Admin" && !userClientIds(user).includes(clientId)) {
      return false;
    }
    if (user.id === session.userId) return false;
    if (session.email && user.email.trim().toLowerCase() === session.email) {
      return false;
    }
    return !internalOnly || user.role !== "Client";
  });

  return recipients.map((recipient) => {
    const wasMentioned = mentionedUserIds.has(recipient.id);
    const title = wasMentioned
      ? notification.kind === "message"
        ? `${session.name} mentioned you in a message`
        : `${session.name} mentioned you in a task comment`
      : titleBase;
    return {
      id: crypto.randomUUID(),
      recipientUserId: recipient.id,
      clientId,
      kind: wasMentioned ? "mention" : notification.kind,
      title,
      body: body.slice(0, 600),
      actorName: session.name,
      createdAt,
      readAt: null,
      planId,
      taskId,
      messageId,
    };
  });
}

async function deliverNotification(
  request: Request,
  state: PilotState,
  session: PortalSession,
  notification: NotificationRequest | undefined,
): Promise<NotificationDelivery> {
  if (!notification || session.mode !== "authenticated") {
    return { status: "suppressed", recipientCount: 0 };
  }
  if (notification.kind === "message") {
    return {
      status: emailNotificationsConfigured() ? "suppressed" : "not_configured",
      recipientCount: 0,
    };
  }

  const plan = state.launchPlans.find(
    (candidate) => candidate.id === notification.planId,
  );
  if (
    !plan ||
    (session.role !== "Admin" && !session.clientIds.includes(plan.clientId))
  ) {
    return { status: "suppressed", recipientCount: 0 };
  }

  const comment =
    notification.kind === "comment"
      ? state.comments.find(
          (candidate) =>
            candidate.id === notification.commentId &&
            candidate.planId === notification.planId &&
            candidate.taskId === notification.taskId,
        )
      : undefined;
  if (notification.kind === "comment" && !comment) {
    return { status: "suppressed", recipientCount: 0 };
  }

  const recipients = state.users.filter((user) => {
    if (user.role !== "CSS" && user.role !== "Client") return false;
    if (user.accountStatus !== "Active") return false;
    if (!userClientIds(user).includes(plan.clientId)) return false;
    if (user.id === session.userId) return false;
    if (session.email && user.email.trim().toLowerCase() === session.email) {
      return false;
    }
    if (comment?.visibility === "Internal" && user.role !== "CSS") return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email);
  });
  if (!recipients.length) {
    return { status: "suppressed", recipientCount: 0 };
  }

  const runtime = getNotificationRuntime();
  const webhookUrl = runtime?.EMAIL_NOTIFICATION_WEBHOOK_URL?.trim();
  const resendKey = runtime?.RESEND_API_KEY?.trim();
  const fromEmail = runtime?.NOTIFICATION_FROM_EMAIL?.trim();
  if (!webhookUrl && !(resendKey && fromEmail)) {
    return { status: "not_configured", recipientCount: recipients.length };
  }

  const taskTitle = findPlanTaskTitle(plan, notification.taskId);
  const portalUrl = new URL(request.url).origin;
  const mentionedIds = new Set(comment?.mentionedUserIds ?? []);
  const notificationRows = recipients.map((recipient) => {
    const wasMentioned = mentionedIds.has(recipient.id);
    const subject =
      notification.kind === "task_completed"
        ? `${session.name} completed ${taskTitle}`
        : wasMentioned
          ? `${session.name} mentioned you in ${taskTitle}`
          : `${session.name} commented on ${taskTitle}`;
    const message =
      notification.kind === "task_completed"
        ? `${session.name} marked “${taskTitle}” complete in ${String(plan.title ?? "the launch plan")} for ${String(plan.client ?? "your client")}.`
        : `${session.name} posted a comment on “${taskTitle}” in ${String(plan.title ?? "the launch plan")} for ${String(plan.client ?? "your client")}:\n\n${String(comment?.body ?? "")}`;
    return {
      recipient: {
        id: recipient.id,
        name: recipient.name,
        email: recipient.email,
        role: recipient.role,
      },
      wasMentioned,
      subject,
      text: `${message}\n\nOpen the SeatGeek Client Launch Hub: ${portalUrl}`,
    };
  });

  try {
    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event: notification.kind,
          actor: { name: session.name, email: session.email, role: session.role },
          plan: {
            id: plan.id,
            title: plan.title,
            clientId: plan.clientId,
            client: plan.client,
          },
          task: { id: notification.taskId, title: taskTitle },
          comment:
            notification.kind === "comment"
              ? {
                  id: notification.commentId,
                  body: comment?.body ?? "",
                  visibility: comment?.visibility ?? "Shared",
                  mentionedUserIds: Array.from(mentionedIds),
                }
              : null,
          notifications: notificationRows,
          portalUrl,
        }),
      });
      if (!response.ok) throw new Error("Notification webhook rejected the event");
    } else {
      const responses = await Promise.all(
        notificationRows.map((row) =>
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              authorization: `Bearer ${resendKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [row.recipient.email],
              subject: row.subject,
              text: row.text,
            }),
          }),
        ),
      );
      if (responses.some((response) => !response.ok)) {
        throw new Error("Email provider rejected one or more notifications");
      }
    }
    return { status: "sent", recipientCount: recipients.length };
  } catch {
    return { status: "failed", recipientCount: recipients.length };
  }
}

function normalizePortalState(state: PilotState): PilotState {
  return {
    ...state,
    todoItems: Array.isArray(state.todoItems)
      ? state.todoItems.filter(
          (item): item is PortalTodoItem =>
            Boolean(
              item &&
                typeof item.id === "string" &&
                typeof item.clientId === "string" &&
                typeof item.title === "string" &&
                typeof item.complete === "boolean" &&
                typeof item.createdAt === "string" &&
                typeof item.createdByName === "string" &&
                ["Admin", "CSS", "Client"].includes(item.createdByRole),
            ),
        )
      : [],
    notifications: Array.isArray(state.notifications)
      ? state.notifications
          .filter(
            (notification): notification is PortalNotification =>
              Boolean(
                notification &&
                  typeof notification.id === "string" &&
                  typeof notification.recipientUserId === "string" &&
                  typeof notification.clientId === "string" &&
                  typeof notification.title === "string" &&
                  typeof notification.body === "string" &&
                  typeof notification.actorName === "string" &&
                  typeof notification.createdAt === "string" &&
                  ["comment", "mention", "task_completed", "message"].includes(
                    notification.kind,
                  ),
              ),
          )
          .map((notification) => ({
            ...notification,
            readAt:
              typeof notification.readAt === "string"
                ? notification.readAt
                : null,
          }))
          .slice(-300)
      : [],
    directMessages: Array.isArray(state.directMessages)
      ? state.directMessages
          .filter(
            (message): message is PortalDirectMessage =>
              Boolean(
                message &&
                  typeof message.id === "string" &&
                  typeof message.clientId === "string" &&
                  typeof message.author === "string" &&
                  typeof message.body === "string" &&
                  typeof message.timestamp === "string",
              ),
          )
          .map((message) => ({
            ...message,
            mentionedUserIds: Array.isArray(message.mentionedUserIds)
              ? message.mentionedUserIds.filter(
                  (userId): userId is string => typeof userId === "string",
                )
              : [],
          }))
      : [],
    comments: state.comments.map((comment) => ({
      ...comment,
      mentionedUserIds: Array.isArray(comment.mentionedUserIds)
        ? comment.mentionedUserIds.filter(
            (userId): userId is string => typeof userId === "string",
          )
        : [],
    })),
    resources: Array.isArray(state.resources)
      ? state.resources
          .filter(
            (resource): resource is PortalResource =>
              Boolean(
                resource &&
                  typeof resource === "object" &&
                  typeof resource.id === "string" &&
                  typeof resource.title === "string" &&
                  typeof resource.url === "string" &&
                  ["CSS", "Client", "Both"].includes(resource.audience),
              ),
          )
          .map((resource) => ({
            ...resource,
            description:
              typeof resource.description === "string"
                ? resource.description
                : "",
          }))
      : [],
    clients: state.clients.map((client) => ({
      ...client,
      cssContacts: Array.isArray(client.cssContacts)
        ? client.cssContacts.filter((contact): contact is string =>
            typeof contact === "string",
          )
        : [],
      clientEmails: Array.isArray(client.clientEmails)
        ? client.clientEmails.filter((email): email is string =>
            typeof email === "string",
          )
        : [],
    })),
    users: state.users.map((user) => {
      const clientIds = Array.isArray(user.clientIds)
        ? user.clientIds.filter((clientId): clientId is string =>
            typeof clientId === "string",
          )
        : user.clientId
          ? [user.clientId]
          : [];

      return {
        ...user,
        clientIds: Array.from(new Set(clientIds)),
      };
    }),
  };
}

function isLocalPreview(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "terminal.local" || hostname === "localhost";
}

function resolveSession(request: Request, state: PilotState | null): PortalSession {
  const email = request.headers
    .get("oai-authenticated-user-email")
    ?.trim()
    .toLowerCase();
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get(
    "oai-authenticated-user-full-name-encoding",
  );
  let forwardedName: string | null = null;
  if (encodedName && encoding === "percent-encoded-utf-8") {
    try {
      forwardedName = decodeURIComponent(encodedName);
    } catch {
      forwardedName = null;
    }
  }

  if (!email) {
    if (!isLocalPreview(request)) {
      throw new AccessError("Please sign in to access the Client Launch Hub.", 401);
    }
    return {
      mode: "preview",
      email: null,
      userId: "admin-demo",
      name: "SeatGeek Admin",
      role: "Admin",
      clientIds: state?.clients.map((client) => client.id) ?? [],
    };
  }

  if (ADMIN_EMAILS.has(email)) {
    return {
      mode: "authenticated",
      email,
      userId: "admin-demo",
      name:
        forwardedName ??
        (email === "cjoneshicks@seatgeek.com" ? "Chad Jones-Hicks" : email),
      role: "Admin",
      clientIds: state?.clients.map((client) => client.id) ?? [],
    };
  }

  const user = state?.users.find(
    (candidate) => candidate.email?.trim().toLowerCase() === email,
  );
  if (!user) {
    throw new AccessError(
      "Your email is not linked to a portal user yet. Ask a portal admin to add and activate your account.",
      403,
    );
  }
  if (user.accountStatus === "Not activated") {
    throw new AccessError(
      "Your account is saved but has not been activated by a portal admin yet.",
      403,
    );
  }
  if (user.accountStatus === "Deactivated") {
    throw new AccessError(
      "Your portal access is currently deactivated. Ask a portal admin to restore it.",
      403,
    );
  }
  if (user.accountStatus !== "Active") {
    throw new AccessError(
      "Your account is not ready for secure sign-in yet. Ask a portal admin to activate it.",
      403,
    );
  }

  return {
    mode: "authenticated",
    email,
    userId: user.id,
    name: user.name || forwardedName || email,
    role: user.role,
    clientIds: user.clientIds ?? (user.clientId ? [user.clientId] : []),
  };
}

function filterPlanForClient(plan: LaunchPlan): LaunchPlan {
  if (!plan.phases) return plan;
  return {
    ...plan,
    phases: plan.phases.map((phase) => ({
      ...phase,
      tasks: phase.tasks.filter((task) => task.visibility !== "SeatGeek only"),
    })),
  };
}

function filterStateForSession(
  state: PilotState | null,
  session: PortalSession,
  notificationRecipientUserIds = new Set([session.userId]),
): PilotState | null {
  if (!state) return state;

  const notifications = state.notifications.filter(
    (notification) =>
      notificationRecipientUserIds.has(notification.recipientUserId),
  );
  if (session.role === "Admin") return { ...state, notifications };

  const allowedClientIds = new Set(session.clientIds);
  const plans = state.launchPlans.filter((plan) =>
    allowedClientIds.has(plan.clientId),
  );
  const allowedPlanIds = new Set(plans.map((plan) => plan.id));
  const clients = state.clients
    .filter((client) => allowedClientIds.has(client.id))
    .map((client) =>
      session.role === "Client"
        ? { ...client, clientEmails: session.email ? [session.email] : [] }
        : client,
    );
  const users = state.users.filter((user) => {
    if (user.id === session.userId) return true;
    const userClientIds = user.clientIds ?? (user.clientId ? [user.clientId] : []);
    const sharesClient = userClientIds.some((clientId) =>
      allowedClientIds.has(clientId),
    );
    if (!sharesClient) return false;
    return session.role === "CSS" || user.role === "CSS";
  });
  const comments = state.comments.filter(
    (comment) =>
      allowedPlanIds.has(comment.planId) &&
      (session.role !== "Client" || comment.visibility !== "Internal"),
  );
  const directMessages = state.directMessages.filter((message) =>
    allowedClientIds.has(message.clientId),
  );
  const todoItems = state.todoItems.filter((item) =>
    allowedClientIds.has(item.clientId),
  );
  const completion = Object.fromEntries(
    Object.entries(state.planTaskCompletion).filter(([key]) =>
      Array.from(allowedPlanIds).some((planId) => key.startsWith(`${planId}:`)),
    ),
  );

  return {
    launchPlans:
      session.role === "Client" ? plans.map(filterPlanForClient) : plans,
    tasks:
      session.role === "Client"
        ? state.tasks.filter(
            (task) => task.owner === "Client" || task.owner === "Both",
          )
        : state.tasks,
    comments,
    directMessages,
    todoItems,
    notifications,
    clients,
    users,
    resources: state.resources.filter(
      (resource) =>
        resource.audience === "Both" || resource.audience === session.role,
    ),
    planTaskCompletion: completion,
  };
}

function resolveNotificationRecipientIds(
  request: Request,
  state: PilotState | null,
  session: PortalSession,
) {
  if (!state || session.role !== "Admin") return new Set([session.userId]);

  const searchParams = new URL(request.url).searchParams;
  const previewUserId = searchParams.get("notificationPreviewUserId");
  if (previewUserId) {
    const previewUser = state.users.find(
      (user) =>
        user.id === previewUserId &&
        (user.role === "CSS" || user.role === "Client") &&
        user.accountStatus === "Active",
    );
    return new Set(previewUser ? [previewUser.id] : []);
  }

  const previewClientId = searchParams.get("notificationPreviewClientId");
  if (previewClientId) {
    const previewClientUser = state.users.find(
      (user) =>
        user.role === "Client" &&
        user.accountStatus === "Active" &&
        userClientIds(user).includes(previewClientId),
    );
    return new Set(previewClientUser ? [previewClientUser.id] : []);
  }

  return new Set([session.userId]);
}

function mergeScopedState(
  current: PilotState,
  incoming: PilotState,
  session: PortalSession,
): PilotState {
  if (session.role === "Admin") {
    return {
      ...incoming,
      notifications: [
        ...current.notifications.filter(
          (notification) => notification.recipientUserId !== session.userId,
        ),
        ...incoming.notifications.filter(
          (notification) => notification.recipientUserId === session.userId,
        ),
      ],
    };
  }

  const allowedClientIds = new Set(session.clientIds);
  const allowedPlan = (plan: LaunchPlan) => allowedClientIds.has(plan.clientId);
  const incomingPlans = incoming.launchPlans.filter(allowedPlan);
  const currentAllowedPlanIds = new Set(
    current.launchPlans.filter(allowedPlan).map((plan) => plan.id),
  );
  const allowedPlanIds = new Set([
    ...currentAllowedPlanIds,
    ...incomingPlans.map((plan) => plan.id),
  ]);
  const launchPlans = [
    ...current.launchPlans.filter((plan) => !allowedPlan(plan)),
    ...incomingPlans,
  ];
  const directMessagesOutsideScope = current.directMessages.filter(
    (message) => !allowedClientIds.has(message.clientId),
  );
  const incomingDirectMessages = incoming.directMessages.filter((message) =>
    allowedClientIds.has(message.clientId),
  );
  const todoItems = [
    ...current.todoItems.filter((item) => !allowedClientIds.has(item.clientId)),
    ...incoming.todoItems.filter((item) => allowedClientIds.has(item.clientId)),
  ];
  const commentsOutsideScope = current.comments.filter(
    (comment) => !allowedPlanIds.has(comment.planId),
  );
  const protectedInternalComments =
    session.role === "Client"
      ? current.comments.filter(
          (comment) =>
            allowedPlanIds.has(comment.planId) && comment.visibility === "Internal",
        )
      : [];
  const incomingComments = incoming.comments.filter(
    (comment) =>
      allowedPlanIds.has(comment.planId) &&
      (session.role !== "Client" || comment.visibility !== "Internal"),
  );
  const allowedCompletion = (key: string) =>
    Array.from(allowedPlanIds).some((planId) => key.startsWith(`${planId}:`));
  const planTaskCompletion = {
    ...Object.fromEntries(
      Object.entries(current.planTaskCompletion).filter(
        ([key]) => !allowedCompletion(key),
      ),
    ),
    ...Object.fromEntries(
      Object.entries(incoming.planTaskCompletion).filter(([key]) =>
        allowedCompletion(key),
      ),
    ),
  };
  const notifications = [
    ...current.notifications.filter(
      (notification) => notification.recipientUserId !== session.userId,
    ),
    ...incoming.notifications.filter(
      (notification) => notification.recipientUserId === session.userId,
    ),
  ];

  let tasks = incoming.tasks;
  if (session.role === "Client") {
    const incomingById = new Map(incoming.tasks.map((task) => [task.id, task]));
    tasks = current.tasks.map((task) =>
      task.owner === "Client" || task.owner === "Both"
        ? incomingById.get(task.id) ?? task
        : task,
    );
  }

  return {
    launchPlans,
    tasks,
    comments: [
      ...commentsOutsideScope,
      ...protectedInternalComments,
      ...incomingComments,
    ],
    directMessages: [
      ...directMessagesOutsideScope,
      ...incomingDirectMessages,
    ],
    todoItems,
    notifications,
    clients: current.clients,
    users: current.users,
    resources: current.resources,
    planTaskCompletion,
  };
}

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail =
    error instanceof Error && error.cause instanceof Error
      ? error.cause.message
      : "";
  const combined = `${message}\n${detail}`;

  if (
    combined.includes("no such table") ||
    combined.includes("portal_state") ||
    combined.includes("activity_log")
  ) {
    return "Pilot storage is still being prepared. Please refresh in a moment.";
  }

  return message;
}

export async function GET(request: Request) {
  try {
    const db = getDb();
    const [saved] = await db
      .select()
      .from(portalState)
      .where(eq(portalState.id, 1))
      .limit(1);
    const state = saved
      ? normalizePortalState(JSON.parse(saved.stateJson) as PilotState)
      : null;
    const session = resolveSession(request, state);
    const notificationRecipientUserIds = resolveNotificationRecipientIds(
      request,
      state,
      session,
    );
    const activity = await db
      .select()
      .from(activityLog)
      .orderBy(desc(activityLog.id))
      .limit(40);

    return Response.json({
      state: filterStateForSession(
        state,
        session,
        notificationRecipientUserIds,
      ),
      updatedAt: saved?.updatedAt ?? null,
      updatedBy: saved?.updatedBy ?? null,
      activity: session.role === "Admin" ? activity : [],
      emailNotificationsConfigured: emailNotificationsConfigured(),
      session: {
        mode: session.mode,
        email: session.email,
        userId: session.userId,
        name: session.name,
        role: session.role,
      },
    });
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 500;
    return Response.json({ error: routeError(error) }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SavePayload;
    if (!isPilotState(payload.state)) {
      return Response.json(
        { error: "A complete pilot state is required." },
        { status: 400 },
      );
    }

    const db = getDb();
    const [saved] = await db
      .select()
      .from(portalState)
      .where(eq(portalState.id, 1))
      .limit(1);
    const current = saved
      ? normalizePortalState(JSON.parse(saved.stateJson) as PilotState)
      : null;
    const session = resolveSession(request, current);
    const incoming = normalizePortalState(payload.state);
    const mergedState = current
      ? mergeScopedState(current, incoming, session)
      : incoming;
    const now = new Date().toISOString();
    const notificationRequest = isNotificationRequest(payload.notification)
      ? payload.notification
      : undefined;
    const createdNotifications = createPortalNotifications(
      mergedState,
      session,
      notificationRequest,
      now,
    );
    const nextState: PilotState = {
      ...mergedState,
      notifications: [
        ...mergedState.notifications,
        ...createdNotifications,
      ].slice(-300),
    };
    const stateJson = JSON.stringify(nextState);
    if (stateJson.length > 2_000_000) {
      return Response.json(
        { error: "The pilot state is too large to save." },
        { status: 413 },
      );
    }

    const action = payload.action?.trim() || "Updated pilot";
    const entityType = payload.entityType?.trim() || "workspace";
    const entityId = payload.entityId?.trim() || "pilot";
    const detail = payload.detail?.trim() || "";
    await db.batch([
      db
        .insert(portalState)
        .values({
          id: 1,
          stateJson,
          updatedAt: now,
          updatedBy: session.name,
        })
        .onConflictDoUpdate({
          target: portalState.id,
          set: { stateJson, updatedAt: now, updatedBy: session.name },
        }),
      db.insert(activityLog).values({
        actorId: session.userId,
        actorName: session.name,
        requesterEmail: session.email,
        action,
        entityType,
        entityId,
        detail,
        createdAt: now,
      }),
    ]);

    const notificationDelivery = await deliverNotification(
      request,
      nextState,
      session,
      notificationRequest,
    );

    const activity = await db
      .select()
      .from(activityLog)
      .orderBy(desc(activityLog.id))
      .limit(40);

    return Response.json({
      saved: true,
      updatedAt: now,
      updatedBy: session.name,
      notificationDelivery,
      activity: session.role === "Admin" ? activity : [],
    });
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 500;
    return Response.json({ error: routeError(error) }, { status });
  }
}
