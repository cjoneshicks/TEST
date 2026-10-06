"use client";

import {
  AlertCircle,
  AtSign,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckSquare2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  Home,
  Eye,
  ExternalLink,
  LayoutTemplate,
  Link2,
  ListTodo,
  LockKeyhole,
  Menu,
  MessageCircle,
  MessagesSquare,
  Moon,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Settings,
  Sun,
  Trash2,
  UserPlus,
  UserCog,
  Users,
  Upload,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { threePeTemplates } from "./3pe-templates";

type Owner = "CSS" | "Client" | "Both";
type AssignableOwner = Owner | "";
type Status = "On track" | "3 overdue" | "Blocked";
type UserRole = "Admin" | "CSS" | "Client";
type AccountStatus = "Demo" | "Not activated" | "Active" | "Deactivated";
type ResourceAudience = "CSS" | "Client" | "Both";

type ResourceLink = {
  id: string;
  title: string;
  url: string;
  description: string;
  audience: ResourceAudience;
};

type LaunchPlan = {
  id: string;
  clientId: string;
  client: string;
  initials: string;
  title: string;
  progress: number;
  targetDate: string | null;
  status: Status;
  tint: string;
  phases?: PlanPhase[];
};

type Task = {
  id: number;
  title: string;
  due: string;
  owner: Owner;
  complete: boolean;
};

type TodoItem = {
  id: string;
  clientId: string;
  title: string;
  complete: boolean;
  createdAt: string;
  createdByName: string;
  createdByRole: UserRole;
};

type CommentVisibility = "Shared" | "Internal";

type TaskComment = {
  id: number;
  planId: string;
  taskId: string;
  author: string;
  authorRole: "CSS" | "Client";
  visibility: CommentVisibility;
  timestamp: string;
  body: string;
  mentionedUserIds?: string[];
};

type DirectMessage = {
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

type PortalAttachment = {
  id: string;
  clientId: string;
  planId: string | null;
  taskId: string | null;
  messageId: string | null;
  fileName: string;
  contentType: string;
  size: number;
  uploadedByName: string;
  uploadedByRole: string;
  visibility: "Shared" | "Internal";
  createdAt: string;
};

type PlanTaskItem = {
  id: string;
  title: string;
  owner: Owner;
  due: string;
  complete: boolean;
  visibility: "Shared" | "SeatGeek only";
};

type PlanPhase = {
  phase: string;
  progress?: string;
  tasks: PlanTaskItem[];
};

type ActivityEntry = {
  id: number;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
  createdAt: string;
};

type PersistStatus = "Loading" | "Saved" | "Saving" | "Unavailable";

type PlanTemplate = {
  id: string;
  title: string;
  overview?: string;
  venue?: string;
  phases: { name: string; tasks: string[] }[];
  awaitingChecklist?: boolean;
};

type ClientRecord = {
  id: string;
  name: string;
  initials: string;
  tint: string;
  cssContacts: string[];
  clientEmails: string[];
};

type DemoUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: UserRole;
  accountStatus?: AccountStatus;
  clientId?: string;
  clientIds: string[];
};

const clientDirectory: ClientRecord[] = [
  {
    id: "kc-current",
    name: "KC Current",
    initials: "KC",
    tint: "coral",
    cssContacts: ["Chad Jones-Hicks"],
    clientEmails: ["client@demo.kccurrent.com"],
  },
  {
    id: "sporting-kc",
    name: "SKC",
    initials: "SKC",
    tint: "mint",
    cssContacts: ["Chad Jones-Hicks"],
    clientEmails: [],
  },
  {
    id: "cleveland-monsters",
    name: "Cleveland Monsters",
    initials: "CM",
    tint: "lilac",
    cssContacts: ["Chad Jones-Hicks"],
    clientEmails: [],
  },
];

const demoUsers: DemoUser[] = [
  {
    id: "admin-demo",
    name: "SeatGeek Admin",
    email: "admin@demo.seatgeek.com",
    initials: "SA",
    role: "Admin",
    accountStatus: "Demo",
    clientIds: clientDirectory.map((client) => client.id),
  },
  {
    id: "css-chad",
    name: "Chad Jones-Hicks",
    email: "chad@demo.seatgeek.com",
    initials: "CJH",
    role: "CSS",
    accountStatus: "Demo",
    clientIds: clientDirectory.map((client) => client.id),
  },
  {
    id: "client-kc-current",
    name: "KC Current Team",
    email: "client@demo.kccurrent.com",
    initials: "KC",
    role: "Client",
    accountStatus: "Demo",
    clientId: "kc-current",
    clientIds: ["kc-current"],
  },
];

const protectedAdminEmails = new Set([
  "cjoneshicks@seatgeek.com",
  "dsimpson@seatgeek.com",
]);

function isProtectedAdmin(user: DemoUser) {
  return (
    user.id === "admin-demo" ||
    protectedAdminEmails.has(user.email.trim().toLowerCase())
  );
}

const templateLibrary: PlanTemplate[] = [
  {
    id: "schedule-release",
    title: "Schedule Release",
    phases: [
      {
        name: "External Kickoff",
        tasks: [
          "Gather information from client",
          "Review task list and sign off on client responsibilities",
          "Establish and agree on timelines with client",
          "Build out task list with assigned timelines and responsibilities",
          "Send client best practices on event build configurations for Unify and SGO",
        ],
      },
      {
        name: "Internal Kickoff",
        tasks: [
          "Prepare Airtable for SGE Calendar",
          "Review Client Summary/Blueprint for unique workflows",
        ],
      },
      {
        name: "Mapping",
        tasks: [
          "If manifest changes occurred, file a ticket to update online maps",
          "Verify all sections have VFS or 3D images updated",
          "If floor or sponsorship branding changed, file a ticket to update online maps",
        ],
      },
      {
        name: "Marketing / Strategic Account / Marketplace Operations",
        tasks: [
          "Provide Season Ticket Holder email list to Partner Marketing",
          "Confirm fees with Strategic Account Manager",
          "Confirm box office fees",
          "Confirm internet fees",
          "Confirm buyer and seller fees with Marketplace Operations",
        ],
      },
      {
        name: "Client Pre-Schedule Configurations",
        tasks: [
          "Build placeholder events in Unify for games, parking, and ancillary events",
          "Confirm all events have the appropriate Event Barcode Type",
          "Provide updated seat perks for the upcoming season",
          "Set SeatGeek Online Ticket Management Rules",
          "Set Price Type Availability Rules at the Template Type level",
          "Set ticket fees on the Product Type or Template Type level",
          "Provide new images and media assets for the upcoming season",
          "Review mobile ticket proofs and Rally widgets",
          "Configure presales using the Presale/Onsale Configuration Wizard",
        ],
      },
      {
        name: "SeatGeek CSS Pre-Schedule Configurations",
        tasks: [
          "Input event information into Airtable",
          "Confirm events are properly mapped and hidden in Catalog",
          "Confirm ticket management rules and restrictions",
          "Confirm Open is the only marketplace enabled for all events",
          "Update Rally configurations if applicable",
          "Configure Terms and Conditions for applicable sales flows",
          "Sell test tickets to validate mobile ticket proofs and event images",
        ],
      },
      {
        name: "Client Schedule Announce Configurations",
        tasks: [
          "Update placeholder events and confirm updates flow to Catalog",
          "Confirm SG API sales period and event visibility rules",
          "Assign price lists for regular and subscriber tickets",
          "Remove events from Storefront visibility if subscriptions are already on sale",
          "Confirm Fortress Access Control sync remains active",
          "Run Event Release wizard for Season Ticket accounts",
          "Run Batch Barcode Generation for game and parking tickets",
        ],
      },
      {
        name: "SeatGeek CSS Schedule Announce Configurations",
        tasks: [
          "Spot check client updates on events",
          "Update all pertinent information in Airtable",
          "Confirm Fortress Access Control sync remains active after date updates",
          "Validate event links and QA the sales flow using Staff Tester",
          "Re-run Deal Score in Rufus after Event Release",
          "Confirm mobile ticket configurations for all events and parking",
        ],
      },
      {
        name: "SeatGeek CSS Onsale Validations",
        tasks: [
          "Confirm all events display on SeatGeek.com per the visibility rule",
          "Confirm sales activate per the Sales Period Rules",
          "Validate Online Ticket Management Rules",
          "Coordinate with internal teams to monitor public onsale performance",
          "Complete a test purchase of primary tickets",
        ],
      },
    ],
  },
  {
    id: "season-ticket-renewals",
    title: "Season Ticket Renewals",
    phases: [
      {
        name: "Client Prep",
        tasks: [
          "Review Series Documentation",
          "Select a renewal method",
          "Commit to timeline for renewals launch and other key dates",
          "Complete mapping prep",
        ],
      },
      {
        name: "Internal Prep",
        tasks: [
          "Review relevant Blueprint sections",
          "Review Renewals Playbook",
          "Add Renewals launch dates to Airtable for the SGE Events calendar",
          "Ensure Airtable pushed Renewals launch dates to the SGE calendar",
        ],
      },
      {
        name: "Client Pre-Launch Configuration",
        tasks: [
          "Create Season and Series for the upcoming season ticket package",
          "Complete Draft Invoice prep if applicable",
          "Design Draft Invoice document",
          "Create Draft Invoice Purpose",
          "Confirm whether Renewal Method 1 will be used",
          "Bulk Sell Subscriptions as unpaid subscriptions",
          "Bulk Draft Invoice unpaid subscriptions",
          "Confirm whether Renewal Method 2 will be used",
          "Bulk Reserve Subscriptions onto accounts",
          "Bulk Draft Invoice reserved subscriptions",
          "Confirm whether Renewal Method 3 will be used",
          "Use Bulk Reserve Subscriptions for the upcoming season",
          "Confirm the default payment plan is created",
          "Establish when reservations will be confirmed",
          "Bulk confirm reservations onto the payment plan",
          "Bulk Draft Invoice processed subscriptions",
          "Create Ticket Scheme for playoff or tournament packages if applicable",
          "Provide SeatGeek requirements for the Playoff offer",
          "Configure Payment Method Availability Rules",
          "Apply account credit if applicable",
          "Provide SeatGeek requirements for the Account Manager offer",
        ],
      },
      {
        name: "SeatGeek Pre-Launch Configuration",
        tasks: [
          "Confirm client provided Account Manager offer details",
          "Create subscription reservation confirmation offer when no Draft Invoice is used",
          "Create Draft Invoice offer when required",
          "Create checkout page survey if required",
          "Create terms and conditions in Open Admin if required",
          "Configure Ad Hoc Payments for payment plans if applicable",
          "Configure Playoff offer if applicable",
        ],
      },
      {
        name: "Client Pre-Launch Validation and Testing",
        tasks: [
          "Complete SeatGeek Open Validation Checklist",
          "Confirm Series is reported to league if applicable",
          "Validate Renewal offer in Account Manager",
          "Validate checkout page",
          "Complete test purchase and post-purchase validation",
          "Complete test renewal",
          "Review SeatGeek confirmation email",
          "Review Account Manager post-purchase experience",
          "Confirm Ticket Scheme offer if applicable",
          "Confirm scheduled queries are running properly",
        ],
      },
      {
        name: "SeatGeek Pre-Launch Validations",
        tasks: [
          "Confirm offer inputs are correctly configured",
          "Confirm client completed pre-launch validation and testing",
          "Review client test transaction",
          "Complete Fee Audit if applicable",
          "Handle non-actor customers",
          "Update the Client Summary/Blueprint with non-standard workflows",
        ],
      },
    ],
  },
  {
    id: "playoffs",
    title: "Playoffs",
    phases: [
      {
        name: "Planning and Kickoff",
        tasks: [
          "Internal SG Kickoff",
          "Client signs off on tasks and responsibilities",
          "Collaborate on and publish timeline of events with client",
          "SGO Configuration questions answered by client",
          "Review Client Summary/Blueprint for any past or unique workflows related to the playoffs",
          "CSM to confirm if client is using any SGIQ configuration for these events",
        ],
      },
      {
        name: "Client Pre-Clinch Configurations",
        tasks: [
          "(IF APPLICABLE) If using a dummy series, create dummy series to be linked to ticket scheme",
          "Ensure all playoff events created in Unify",
          "Approve and assign pricing to all playoff events",
          "Complete reservations into ticket scheme for all relevant playoff games",
          "(IF APPLICABLE) If using auto-enrollment in playoffs, link CC's to ticket schemes in bulk",
          "Communicate to STH process for updating playoff credit cards in Account Manager",
          "Configure SG event fees (if applicable)",
          "Run CC test fulfillment again to catch expired credit cards",
        ],
      },
      {
        name: "Playoff Invoicing - PDF Draft Invoices",
        tasks: [
          "Invoice Document Design Updated",
          "Sign off of final document design from Client",
          "Test invoice documents",
          "New invoice purpose(s) set",
          "Customers bulk draft invoiced",
          "Draft invoices sent to printhouse",
        ],
      },
      {
        name: "Playoff Invoicing - Online Draft Invoices",
        tasks: [
          "Online invoice offer details received from client",
          "Create and configure online draft invoice offer",
          "Change all Show On Seatgeek.com Display Names to match PDF Invoice",
          "Determine and set client types for offer",
          "Clients signs off on online offer flow",
          "Block payment of online invoice offer if applicable",
        ],
      },
      {
        name: "SG Pre-Clinch Configuration",
        tasks: [
          "Confirm Distribution Partner setup configured",
          "Confirm Post Season Fees",
          "Map and Configure SG Events",
          "Determine instant payout structure for playoffs",
          "Set up posting status for playoff events if applicable",
          "If applicable, ensure credit card opt-in offer has been active throughout the season",
          "If NFL, share the event IDs with SGO Product and ensure SGO Product has sent these to Ticketmaster ahead of the onsale",
          "If NFL, configure events to be sold on the NFL Ticket Exchange",
          "SG Internal Communications",
        ],
      },
      {
        name: "@ Clinch SG Config",
        tasks: [
          "Once event details known, confirm events updated and pulled into SG",
          "Ensure event goes onsale smoothly and is monitored",
          "QA Event Build",
          "Unhide all events in NRO if applicable",
        ],
      },
      {
        name: "@ Clinch Client Config",
        tasks: [
          "Update SeatGeek.com Display Name Field names once Opponent is known",
          "Lock down inventory prior to onsale",
          "Run fulfillments on ticket schemes",
          "Run ticket scheme error report and handle failed fulfillments",
        ],
      },
      {
        name: "Post-Configuration",
        tasks: [
          "Update the Client Summary/Blueprint with any non-standard workflows applied or uncovered",
        ],
      },
    ],
  },
  ...threePeTemplates,
];

const plans: LaunchPlan[] = [
  {
    id: "skc-renewals",
    clientId: "sporting-kc",
    client: "SKC",
    initials: "SKC",
    title: "2027 Renewals",
    progress: 68,
    targetDate: "Aug 15",
    status: "On track",
    tint: "mint",
  },
  {
    id: "kc-schedule",
    clientId: "kc-current",
    client: "KC Current",
    initials: "KC",
    title: "Schedule Release",
    progress: 42,
    targetDate: null,
    status: "3 overdue",
    tint: "coral",
  },
  {
    id: "cleveland-playoffs",
    clientId: "cleveland-monsters",
    client: "Cleveland Monsters",
    initials: "CM",
    title: "Playoffs",
    progress: 81,
    targetDate: "Sep 1",
    status: "Blocked",
    tint: "lilac",
  },
];

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Review renewal timeline",
    due: "Jul 31",
    owner: "CSS",
    complete: false,
  },
  {
    id: 2,
    title: "Confirm pricing files",
    due: "Aug 2",
    owner: "Client",
    complete: false,
  },
  {
    id: 3,
    title: "Complete playoff setup",
    due: "Aug 6",
    owner: "Both",
    complete: true,
  },
];

const planTasks: PlanPhase[] = [
  {
    phase: "External kickoff",
    progress: "2 of 3 complete",
    tasks: [
      {
        id: "gather-renewal-info",
        title: "Gather renewal information from client",
        owner: "Client",
        due: "Jul 29",
        complete: true,
        visibility: "Shared",
      },
      {
        id: "review-responsibilities",
        title: "Review responsibilities and timeline",
        owner: "Both",
        due: "Jul 31",
        complete: false,
        visibility: "Shared",
      },
      {
        id: "confirm-pricing-files",
        title: "Confirm pricing files",
        owner: "Client",
        due: "Aug 2",
        complete: false,
        visibility: "Shared",
      },
    ],
  },
  {
    phase: "Internal setup",
    progress: "1 of 2 complete",
    tasks: [
      {
        id: "prepare-sge-calendar",
        title: "Prepare SGE calendar",
        owner: "CSS",
        due: "Aug 4",
        complete: true,
        visibility: "SeatGeek only",
      },
      {
        id: "validate-offer-configuration",
        title: "Validate offer configuration",
        owner: "CSS",
        due: "Aug 6",
        complete: false,
        visibility: "SeatGeek only",
      },
    ],
  },
];

const initialComments: TaskComment[] = [
  {
    id: 1,
    planId: "kc-schedule",
    taskId: "review-responsibilities",
    author: "Chad Jones-Hicks",
    authorRole: "CSS",
    visibility: "Shared",
    timestamp: "Today at 10:14 AM",
    body: "I added the recommended milestone dates. Please review them before our kickoff call.",
  },
  {
    id: 2,
    planId: "kc-schedule",
    taskId: "review-responsibilities",
    author: "KC Current",
    authorRole: "Client",
    visibility: "Shared",
    timestamp: "Today at 11:02 AM",
    body: "The dates work for our team. We will confirm the final launch contact on the call.",
  },
  {
    id: 3,
    planId: "kc-schedule",
    taskId: "review-responsibilities",
    author: "Chad Jones-Hicks",
    authorRole: "CSS",
    visibility: "Internal",
    timestamp: "Today at 11:10 AM",
    body: "Confirm the Account Manager can attend before sending the final agenda.",
  },
  {
    id: 4,
    planId: "kc-schedule",
    taskId: "confirm-pricing-files",
    author: "KC Current",
    authorRole: "Client",
    visibility: "Shared",
    timestamp: "Yesterday at 3:42 PM",
    body: "Our finance team is reviewing the pricing file now. We expect to upload it tomorrow.",
  },
];

const navItems = [
  { label: "Home", icon: Home },
  { label: "Launch plans", icon: LayoutTemplate },
  { label: "Tasks", icon: CheckSquare2 },
  { label: "To-do list", icon: ListTodo },
  { label: "Messages", icon: MessagesSquare },
  { label: "Resources", icon: FileText },
  { label: "Clients", icon: Users },
  { label: "Users & access", icon: UserCog },
  { label: "Settings", icon: Settings },
];

const initialResources: ResourceLink[] = [];

function makeInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function makeMentionHandle(user: DemoUser) {
  const emailName = user.email.split("@")[0]?.trim().toLowerCase();
  const source = emailName || user.name.replace(/\s+/g, "").toLowerCase();
  return source.replace(/[^a-z0-9._-]/g, "");
}

function getMentionQuery(value: string) {
  const match = value.match(/(?:^|\s)@([a-z0-9._-]*)$/i);
  return match ? match[1].toLowerCase() : null;
}

function renderCommentBody(body: string, portalUsers: DemoUser[]) {
  const handles = new Set(
    portalUsers.map((user) => makeMentionHandle(user)).filter(Boolean),
  );
  return body.split(/(@[a-z0-9._-]+)/gi).map((part, index) => {
    const handle = part.startsWith("@") ? part.slice(1).toLowerCase() : "";
    return handles.has(handle) ? (
      <mark className="comment-mention" key={`${part}-${index}`}>
        {part}
      </mark>
    ) : (
      part
    );
  });
}

function formatNotificationTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function makeRecordId(value: string, existingIds: string[]) {
  const base =
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "record";
  let candidate = base;
  let suffix = 2;
  while (existingIds.includes(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function normalizeResourceUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function getResourceHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function parseClientEmails(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function makeNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "Client user";
  const name = localPart
    .replace(/[._+-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
  return name || "Client user";
}

type AuthenticatedPortalUser = {
  email: string;
  displayName: string;
} | null;

type SessionAccess = {
  mode: "authenticated" | "preview";
  email: string | null;
  userId: string;
  name: string;
  role: UserRole;
};

export default function PortalClient({
  authenticatedUser,
  signOutUrl,
}: {
  authenticatedUser: AuthenticatedPortalUser;
  signOutUrl: string;
}) {
  const [workspaceSection, setWorkspaceSection] = useState<
    | "Home"
    | "Plans"
    | "Tasks"
    | "Todo"
    | "Messages"
    | "Clients"
    | "Access"
    | "Resources"
    | "Settings"
  >("Home");
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "My work";
    const tab = new URLSearchParams(window.location.search).get("view");
    return tab === "all-plans"
      ? "All plans"
      : tab === "templates"
        ? "Templates"
        : "My work";
  });
  const [tasks, setTasks] = useState(initialTasks);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [todoDraft, setTodoDraft] = useState("");
  const [todoClientId, setTodoClientId] = useState("");
  const [todoFilterClientId, setTodoFilterClientId] = useState("All clients");
  const [clients, setClients] = useState(clientDirectory);
  const [users, setUsers] = useState(demoUsers);
  const [resources, setResources] = useState(initialResources);
  const [clientFilter, setClientFilter] = useState("All clients");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [activeUserId, setActiveUserId] = useState("admin-demo");
  const [sessionAccess, setSessionAccess] = useState<SessionAccess | null>(null);
  const [clientPreviewId, setClientPreviewId] = useState<string | null>(null);
  const signedInUser =
    users.find((user) => user.id === activeUserId) ?? users[1] ?? demoUsers[1];
  const previewClient = clients.find((client) => client.id === clientPreviewId);
  const isAuthenticatedAdmin =
    sessionAccess?.mode === "authenticated" && sessionAccess.role === "Admin";
  const isAdminClientPreview =
    sessionAccess?.role === "Admin" && Boolean(previewClient);
  const isAdminCssPreview =
    isAuthenticatedAdmin &&
    !previewClient &&
    signedInUser.role === "CSS" &&
    signedInUser.id !== sessionAccess.userId;
  const isAdminRolePreview = isAdminClientPreview || isAdminCssPreview;
  const notificationPreviewQuery = isAdminCssPreview
    ? `?notificationPreviewUserId=${encodeURIComponent(signedInUser.id)}`
    : isAdminClientPreview && previewClient
      ? `?notificationPreviewClientId=${encodeURIComponent(previewClient.id)}`
      : "";
  const activeUser: DemoUser =
    isAdminClientPreview && previewClient
      ? {
          id: `client-preview-${previewClient.id}`,
          name: `${previewClient.name} Client Preview`,
          email: "",
          initials: previewClient.initials,
          role: "Client",
          accountStatus: "Demo",
          clientId: previewClient.id,
          clientIds: [previewClient.id],
        }
      : signedInUser;
  const role = activeUser.role;
  const clientView = role === "Client";
  const adminView = role === "Admin";
  const [launchPlans, setLaunchPlans] = useState(plans);
  const [drawerPlan, setDrawerPlan] = useState<LaunchPlan | null>(null);
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [attachments, setAttachments] = useState<PortalAttachment[]>([]);
  const [selectedMessageClientId, setSelectedMessageClientId] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [messageFile, setMessageFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [openTaskId, setOpenTaskId] = useState<string | null>(
    "review-responsibilities",
  );
  const [commentVisibility, setCommentVisibility] =
    useState<CommentVisibility>("Shared");
  const [commentDraft, setCommentDraft] = useState("");
  const [newPlanStep, setNewPlanStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<PlanTemplate["id"] | null>(null);
  const [planClient, setPlanClient] = useState("");
  const [planTargetDate, setPlanTargetDate] = useState("");
  const [ownerAssignments, setOwnerAssignments] = useState<
    Record<string, AssignableOwner>
  >({});
  const [planTaskCompletion, setPlanTaskCompletion] = useState<
    Record<string, boolean>
  >({});
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [drawerTab, setDrawerTab] = useState<"Tasks" | "Activity" | "Files">(
    "Tasks",
  );
  const [persistStatus, setPersistStatus] =
    useState<PersistStatus>("Loading");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [emailNotificationsConfigured, setEmailNotificationsConfigured] =
    useState(false);
  const [adminModal, setAdminModal] = useState<
    "client" | "user" | null
  >(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCssIds, setNewClientCssIds] = useState<string[]>([]);
  const [newClientEmails, setNewClientEmails] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("Client");
  const [userClientIds, setUserClientIds] = useState<string[]>([]);
  const [adminFormError, setAdminFormError] = useState("");
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceAudience, setResourceAudience] =
    useState<ResourceAudience>("Both");
  const [resourceFormError, setResourceFormError] = useState("");
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const idSequence = useRef(10_000);

  useEffect(() => {
    const stored = window.localStorage.getItem("seatgeek-portal-theme");
    const nextTheme = stored === "dark" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("seatgeek-portal-theme", nextTheme);
  }

  useEffect(() => {
    let active = true;

    async function loadPilotState() {
      try {
        const response = await fetch("/api/pilot-state", { cache: "no-store" });
        const errorPayload = !response.ok
          ? ((await response.json().catch(() => null)) as { error?: string } | null)
          : null;
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error(
              errorPayload?.error ??
                "Your account does not have access to this workspace yet.",
            );
          }
          throw new Error("Storage unavailable");
        }
        const payload = (await response.json()) as {
          state?: {
            launchPlans?: LaunchPlan[];
            tasks?: Task[];
            todoItems?: TodoItem[];
            comments?: TaskComment[];
            clients?: ClientRecord[];
            users?: DemoUser[];
            resources?: ResourceLink[];
            directMessages?: DirectMessage[];
            notifications?: PortalNotification[];
            planTaskCompletion?: Record<string, boolean>;
          } | null;
          activity?: ActivityEntry[];
          updatedAt?: string | null;
          emailNotificationsConfigured?: boolean;
          session?: SessionAccess;
        };
        if (!active) return;
        setSessionAccess(payload.session ?? null);
        if (payload.state) {
          const storedClients = (payload.state.clients ?? clientDirectory).map(
            (client) => ({
              ...client,
              cssContacts: Array.isArray(client.cssContacts)
                ? client.cssContacts
                : [],
              clientEmails: Array.isArray(client.clientEmails)
                ? client.clientEmails
                : [],
            }),
          );
          const storedUsers = (payload.state.users ?? demoUsers).map((user) => ({
            ...user,
            clientIds: Array.isArray(user.clientIds)
              ? Array.from(new Set(user.clientIds))
              : user.clientId
                ? [user.clientId]
                : [],
          }));
          const authenticatedEmail = authenticatedUser?.email.toLowerCase();
          const sessionUserId = payload.session?.userId;
          if (
            payload.session?.mode === "authenticated" &&
            sessionUserId === "admin-demo" &&
            authenticatedEmail
          ) {
            const adminIndex = storedUsers.findIndex(
              (user) => user.id === "admin-demo",
            );
            const adminName =
              authenticatedUser?.displayName || payload.session.name || "SeatGeek Admin";
            const adminUser: DemoUser = {
              id: "admin-demo",
              name: adminName,
              email: authenticatedEmail,
              initials: makeInitials(adminName),
              role: "Admin",
              accountStatus: "Active",
              clientIds: storedClients.map((client) => client.id),
            };
            if (adminIndex >= 0) storedUsers[adminIndex] = adminUser;
            else storedUsers.unshift(adminUser);
          }
          const usedUserIds = new Set(storedUsers.map((user) => user.id));
          for (const client of storedClients) {
            for (const email of client.clientEmails ?? []) {
              const normalizedEmail = email.toLowerCase();
              if (
                storedUsers.some(
                  (user) => user.email.toLowerCase() === normalizedEmail,
                )
              ) {
                continue;
              }
              const name = makeNameFromEmail(normalizedEmail);
              const userId = makeRecordId(
                normalizedEmail.split("@")[0],
                Array.from(usedUserIds),
              );
              usedUserIds.add(userId);
              storedUsers.push({
                id: userId,
                name,
                email: normalizedEmail,
                initials: makeInitials(name),
                role: "Client",
                accountStatus: "Not activated",
                clientId: client.id,
                clientIds: [client.id],
              });
            }
          }
          const hydratedClients = storedClients.map(
            (client) => {
              const linkedCssNames = storedUsers
                .filter(
                  (user) =>
                    user.role === "CSS" && user.clientIds.includes(client.id),
                )
                .map((user) => user.name);
              const linkedClientEmails = storedUsers
                .filter(
                  (user) =>
                    user.role === "Client" &&
                    (user.clientId === client.id ||
                      user.clientIds.includes(client.id)),
                )
                .map((user) => user.email.toLowerCase());
              return {
                ...client,
                cssContacts: Array.from(
                  new Set([...(client.cssContacts ?? []), ...linkedCssNames]),
                ).slice(0, 6),
                clientEmails: Array.from(
                  new Set([
                    ...((client as ClientRecord).clientEmails ?? []),
                    ...linkedClientEmails,
                  ]),
                ),
              };
            },
          );
          setLaunchPlans(payload.state.launchPlans ?? plans);
          setTasks(payload.state.tasks ?? initialTasks);
          setTodoItems(
            Array.isArray(payload.state.todoItems)
              ? payload.state.todoItems
              : [],
          );
          setComments(payload.state.comments ?? initialComments);
          setClients(hydratedClients);
          setUsers(storedUsers);
          setResources(
            Array.isArray(payload.state.resources)
              ? payload.state.resources
              : initialResources,
          );
          setDirectMessages(
            Array.isArray(payload.state.directMessages)
              ? payload.state.directMessages
              : [],
          );
          setNotifications(
            Array.isArray(payload.state.notifications)
              ? payload.state.notifications
              : [],
          );
          if (sessionUserId && storedUsers.some((user) => user.id === sessionUserId)) {
            setActiveUserId(sessionUserId);
          }
          setPlanTaskCompletion(payload.state.planTaskCompletion ?? {});
        }
        setActivity(payload.activity ?? []);
        setEmailNotificationsConfigured(
          Boolean(payload.emailNotificationsConfigured),
        );
        const filesResponse = await fetch("/api/files", { cache: "no-store" });
        if (filesResponse.ok) {
          const filesPayload = (await filesResponse.json()) as {
            attachments?: PortalAttachment[];
          };
          setAttachments(filesPayload.attachments ?? []);
        }
        setLastSavedAt(payload.updatedAt ?? null);
        setPersistStatus("Saved");
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : "Storage unavailable";
          if (message.includes("access") || message.includes("activated") || message.includes("signed in")) {
            setAccessError(message);
          }
          setPersistStatus("Unavailable");
        }
      }
    }

    void loadPilotState();
    return () => {
      active = false;
    };
  }, [authenticatedUser]);

  useEffect(() => {
    if (!sessionAccess?.userId) return;
    let active = true;

    async function refreshNotifications() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch(
          `/api/pilot-state${notificationPreviewQuery}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as {
          state?: { notifications?: PortalNotification[] } | null;
        };
        if (active && Array.isArray(payload.state?.notifications)) {
          setNotifications(payload.state.notifications);
        }
      } catch {
        // The next interval or window focus will retry without interrupting the user.
      }
    }

    if (notificationPreviewQuery) setNotifications([]);
    void refreshNotifications();
    const intervalId = window.setInterval(() => {
      void refreshNotifications();
    }, 8_000);
    const handleFocus = () => void refreshNotifications();
    window.addEventListener("focus", handleFocus);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [notificationPreviewQuery, sessionAccess?.userId]);

  useEffect(() => {
    const handlePopState = () => {
      const tab = new URLSearchParams(window.location.search).get("view");
      setActiveTab(
        tab === "all-plans"
          ? "All plans"
          : tab === "templates"
            ? "Templates"
            : "My work",
      );
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const visiblePlans = useMemo(() => {
    if (activeTab === "Templates") return [];
    return launchPlans.filter((plan) => {
      if (!activeUser.clientIds.includes(plan.clientId)) return false;
      const clientMatch =
        clientView ||
        clientFilter === "All clients" ||
        plan.client === clientFilter;
      const statusMatch =
        statusFilter === "All statuses" || plan.status === statusFilter;
      return clientMatch && statusMatch;
    });
  }, [
    activeTab,
    activeUser.clientIds,
    clientFilter,
    clientView,
    launchPlans,
    statusFilter,
  ]);

  const accessibleClients = useMemo(
    () =>
      adminView
        ? clients
        : clients.filter((client) => activeUser.clientIds.includes(client.id)),
    [activeUser.clientIds, adminView, clients],
  );

  useEffect(() => {
    if (
      todoClientId &&
      accessibleClients.some((client) => client.id === todoClientId)
    ) {
      return;
    }
    setTodoClientId(accessibleClients[0]?.id ?? "");
    setTodoFilterClientId("All clients");
  }, [accessibleClients, todoClientId]);

  const visibleTodoItems = useMemo(() => {
    const accessibleClientIds = new Set(
      accessibleClients.map((client) => client.id),
    );
    return todoItems
      .filter(
        (item) =>
          accessibleClientIds.has(item.clientId) &&
          (clientView ||
            todoFilterClientId === "All clients" ||
            item.clientId === todoFilterClientId),
      )
      .sort((left, right) => {
        if (left.complete !== right.complete) return left.complete ? 1 : -1;
        return (
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
        );
      });
  }, [accessibleClients, clientView, todoFilterClientId, todoItems]);

  useEffect(() => {
    if (
      selectedMessageClientId &&
      accessibleClients.some((client) => client.id === selectedMessageClientId)
    ) {
      return;
    }
    setSelectedMessageClientId(accessibleClients[0]?.id ?? "");
  }, [accessibleClients, selectedMessageClientId]);

  const selectedMessageClient = accessibleClients.find(
    (client) => client.id === selectedMessageClientId,
  );
  const visibleDirectMessages = directMessages.filter(
    (message) => message.clientId === selectedMessageClientId,
  );

  const visibleResources = useMemo(
    () =>
      adminView
        ? resources
        : resources.filter(
            (resource) =>
              resource.audience === "Both" || resource.audience === role,
          ),
    [adminView, resources, role],
  );

  const taskWorkspaceLaunchPlans = useMemo(
    () =>
      launchPlans
        .filter((plan) => {
          if (!activeUser.clientIds.includes(plan.clientId)) return false;
          const clientMatch =
            clientView ||
            clientFilter === "All clients" ||
            plan.client === clientFilter;
          const statusMatch =
            statusFilter === "All statuses" || plan.status === statusFilter;
          return clientMatch && statusMatch;
        }),
    [
      activeUser.clientIds,
      clientFilter,
      clientView,
      launchPlans,
      statusFilter,
    ],
  );

  const taskWorkspacePlans = useMemo(
    () =>
      taskWorkspaceLaunchPlans
        .map((plan) => ({
          plan,
          tasks: (plan.phases ?? []).flatMap((phase) =>
            phase.tasks
              .filter(
                (task) => !clientView || task.visibility !== "SeatGeek only",
              )
              .map((task) => ({ ...task, phase: phase.phase })),
          ),
        }))
        .filter((group) => group.tasks.length > 0),
    [clientView, taskWorkspaceLaunchPlans],
  );

  const visiblePriorityTasks = useMemo(
    () => tasks.filter((task) => !clientView || task.owner !== "CSS"),
    [clientView, tasks],
  );

  const visiblePlanTaskCount = taskWorkspacePlans.reduce(
    (total, group) => total + group.tasks.length,
    0,
  );
  const completedPlanTaskCount = taskWorkspacePlans.reduce(
    (total, group) =>
      total +
      group.tasks.filter(
        (task) =>
          planTaskCompletion[`${group.plan.id}:${task.id}`] ?? task.complete,
      ).length,
    0,
  );
  const completedPriorityTaskCount = visiblePriorityTasks.filter(
    (task) => task.complete,
  ).length;

  const mentionableUsers = useMemo(() => {
    if (!drawerPlan) return [];
    return users.filter((user) => {
      if (!(["Admin", "CSS", "Client"] as UserRole[]).includes(user.role)) {
        return false;
      }
      if (user.accountStatus === "Deactivated" || user.accountStatus === "Not activated") {
        return false;
      }
      if (!user.clientIds.includes(drawerPlan.clientId)) return false;
      if (user.id === activeUser.id || user.email === activeUser.email) return false;
      return commentVisibility === "Shared" || user.role !== "Client";
    });
  }, [activeUser.email, activeUser.id, commentVisibility, drawerPlan, users]);

  const mentionQuery = getMentionQuery(commentDraft);
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    return mentionableUsers
      .filter((user) => {
        const haystack = `${user.name} ${user.email} ${makeMentionHandle(user)}`.toLowerCase();
        return haystack.includes(mentionQuery);
      })
      .slice(0, 6);
  }, [mentionQuery, mentionableUsers]);

  const mentionableMessageUsers = useMemo(() => {
    if (!selectedMessageClientId) return [];
    return users.filter((user) => {
      if (!(["Admin", "CSS", "Client"] as UserRole[]).includes(user.role)) {
        return false;
      }
      if (user.accountStatus === "Deactivated" || user.accountStatus === "Not activated") {
        return false;
      }
      if (!user.clientIds.includes(selectedMessageClientId)) return false;
      return user.id !== activeUser.id && user.email !== activeUser.email;
    });
  }, [activeUser.email, activeUser.id, selectedMessageClientId, users]);

  const messageMentionQuery = getMentionQuery(messageDraft);
  const messageMentionSuggestions = useMemo(() => {
    if (messageMentionQuery === null) return [];
    return mentionableMessageUsers
      .filter((user) => {
        const haystack = `${user.name} ${user.email} ${makeMentionHandle(user)}`.toLowerCase();
        return haystack.includes(messageMentionQuery);
      })
      .slice(0, 6);
  }, [messageMentionQuery, mentionableMessageUsers]);

  const latestNotifications = useMemo(
    () =>
      [...notifications]
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
        .slice(0, 20),
    [notifications],
  );
  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.readAt,
  ).length;

  if (accessError) {
    return (
      <main className="access-gate">
        <section className="access-gate-card" aria-labelledby="access-gate-title">
          <div className="access-gate-icon">
            <LockKeyhole size={24} />
          </div>
          <p className="eyebrow">SeatGeek Client Launch Hub</p>
          <h1 id="access-gate-title">Access needs an admin review</h1>
          <p>{accessError}</p>
          {authenticatedUser?.email && (
            <p className="access-gate-email">
              Signed in as {authenticatedUser.email}
            </p>
          )}
          <a className="primary-button" href={signOutUrl}>
            Sign in with a different account
          </a>
        </section>
      </main>
    );
  }

  function savePilotState(
    overrides: Partial<{
      launchPlans: LaunchPlan[];
      tasks: Task[];
      todoItems: TodoItem[];
      comments: TaskComment[];
      clients: ClientRecord[];
      users: DemoUser[];
      resources: ResourceLink[];
      directMessages: DirectMessage[];
      notifications: PortalNotification[];
      planTaskCompletion: Record<string, boolean>;
    }>,
    event: {
      action: string;
      entityType: string;
      entityId: string;
      detail: string;
      notification?:
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
    },
  ) {
    const snapshot = {
      launchPlans: overrides.launchPlans ?? launchPlans,
      tasks: overrides.tasks ?? tasks,
      todoItems: overrides.todoItems ?? todoItems,
      comments: overrides.comments ?? comments,
      clients: overrides.clients ?? clients,
      users: overrides.users ?? users,
      resources: overrides.resources ?? resources,
      directMessages: overrides.directMessages ?? directMessages,
      notifications: overrides.notifications ?? notifications,
      planTaskCompletion:
        overrides.planTaskCompletion ?? planTaskCompletion,
    };

    setPersistStatus("Saving");
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch("/api/pilot-state", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            state: snapshot,
            actorId: activeUser.id,
            actorName: activeUser.name,
            ...event,
          }),
        });
        if (!response.ok) throw new Error("Unable to save");
        const payload = (await response.json()) as {
          updatedAt?: string;
          activity?: ActivityEntry[];
        };
        setLastSavedAt(payload.updatedAt ?? new Date().toISOString());
        setActivity(payload.activity ?? []);
        setPersistStatus("Saved");
      })
      .catch(() => {
        setPersistStatus("Unavailable");
      });
  }

  function markNotificationRead(notificationId: string) {
    if (isAdminRolePreview) return;
    const current = notifications.find(
      (notification) => notification.id === notificationId,
    );
    if (!current || current.readAt) return;
    const readAt = new Date().toISOString();
    const nextNotifications = notifications.map((notification) =>
      notification.id === notificationId
        ? { ...notification, readAt }
        : notification,
    );
    setNotifications(nextNotifications);
    savePilotState(
      { notifications: nextNotifications },
      {
        action: "Read notification",
        entityType: "notification",
        entityId: notificationId,
        detail: current.title,
      },
    );
  }

  function markAllNotificationsRead() {
    if (!unreadNotificationCount) return;
    const readAt = new Date().toISOString();
    const nextNotifications = notifications.map((notification) =>
      notification.readAt ? notification : { ...notification, readAt },
    );
    setNotifications(nextNotifications);
    savePilotState(
      { notifications: nextNotifications },
      {
        action: "Read all notifications",
        entityType: "notification",
        entityId: sessionAccess?.userId ?? activeUser.id,
        detail: `${unreadNotificationCount} notifications marked read`,
      },
    );
  }

  function openNotification(notification: PortalNotification) {
    markNotificationRead(notification.id);
    setNotificationOpen(false);
    if (notification.kind === "message" || notification.messageId) {
      setSelectedMessageClientId(notification.clientId);
      setWorkspaceSection("Messages");
      setDrawerPlan(null);
      return;
    }
    if (notification.planId) {
      const plan = launchPlans.find(
        (candidate) => candidate.id === notification.planId,
      );
      if (plan) {
        setDrawerPlan(plan);
        setDrawerTab("Tasks");
        setOpenTaskId(notification.taskId ?? null);
      }
    }
  }

  function switchUser(userId: string) {
    const nextUser = users.find((user) => user.id === userId);
    if (!nextUser) return;
    setClientPreviewId(null);
    setActiveUserId(userId);
    setWorkspaceSection("Home");
    setActiveTab("My work");
    setClientFilter("All clients");
    setStatusFilter("All statuses");
    setCommentVisibility("Shared");
    setDrawerPlan(null);
    setNewPlanOpen(false);
    setMobileNav(false);
    setToast(`Signed in as ${nextUser.name}`);
    window.setTimeout(() => setToast(null), 2600);
  }

  function startCssPreview(userId: string) {
    if (!isAuthenticatedAdmin) return;
    const cssUser = users.find(
      (user) =>
        user.id === userId &&
        user.role === "CSS" &&
        user.accountStatus !== "Deactivated" &&
        user.accountStatus !== "Not activated",
    );
    if (!cssUser) return;
    switchUser(cssUser.id);
    setToast(`Previewing ${cssUser.name}'s CSS workspace`);
    window.setTimeout(() => setToast(null), 2800);
  }

  function startClientPreview(clientId: string) {
    if (sessionAccess?.role !== "Admin") return;
    const client = clients.find((item) => item.id === clientId);
    if (!client) return;
    setClientPreviewId(client.id);
    setWorkspaceSection("Home");
    setActiveTab("My work");
    setClientFilter("All clients");
    setStatusFilter("All statuses");
    setCommentVisibility("Shared");
    setDrawerPlan(null);
    setNewPlanOpen(false);
    setMobileNav(false);
    setToast(`Previewing the ${client.name} client experience`);
    window.setTimeout(() => setToast(null), 2800);
  }

  function exitRolePreview() {
    setClientPreviewId(null);
    if (sessionAccess?.userId) setActiveUserId(sessionAccess.userId);
    setWorkspaceSection("Home");
    setActiveTab("My work");
    setClientFilter("All clients");
    setStatusFilter("All statuses");
    setCommentVisibility("Shared");
    setDrawerPlan(null);
    setToast("Returned to Admin access");
    window.setTimeout(() => setToast(null), 2400);
  }

  function changeAdminDemoView(value: string) {
    if (value === "admin") {
      exitRolePreview();
      return;
    }
    if (value.startsWith("css:")) {
      startCssPreview(value.slice(4));
      return;
    }
    if (value.startsWith("client:")) {
      startClientPreview(value.slice(7));
    }
  }

  function openClientManager(client?: ClientRecord) {
    const linkedCssIds = client
      ? users
          .filter(
            (user) =>
              user.role === "CSS" &&
              (user.clientIds.includes(client.id) ||
                client.cssContacts.includes(user.name)),
          )
          .map((user) => user.id)
          .slice(0, 6)
      : [];
    const linkedClientEmails = client
      ? Array.from(
          new Set([
            ...(client.clientEmails ?? []),
            ...users
              .filter(
                (user) =>
                  user.role === "Client" &&
                  (user.clientId === client.id ||
                    user.clientIds.includes(client.id)),
              )
              .map((user) => user.email.toLowerCase()),
          ]),
        )
      : [];
    setEditingClientId(client?.id ?? null);
    setNewClientName(client?.name ?? "");
    setNewClientCssIds(linkedCssIds);
    setNewClientEmails(linkedClientEmails.join("\n"));
    setAdminFormError("");
    setAdminModal("client");
  }

  function openUserManager(user?: DemoUser) {
    setEditingUserId(user?.id ?? null);
    setUserName(user?.name ?? "");
    setUserEmail(user?.email ?? "");
    setUserRole(user?.role ?? "Client");
    setUserClientIds(user?.clientIds ?? []);
    setAdminFormError("");
    setAdminModal("user");
  }

  function closeAdminManager() {
    setAdminModal(null);
    setEditingClientId(null);
    setEditingUserId(null);
    setAdminFormError("");
  }

  function openResourceManager(resource?: ResourceLink) {
    setEditingResourceId(resource?.id ?? null);
    setResourceTitle(resource?.title ?? "");
    setResourceUrl(resource?.url ?? "");
    setResourceDescription(resource?.description ?? "");
    setResourceAudience(resource?.audience ?? "Both");
    setResourceFormError("");
    setResourceModalOpen(true);
  }

  function closeResourceManager() {
    setResourceModalOpen(false);
    setEditingResourceId(null);
    setResourceFormError("");
  }

  function saveResourceLink() {
    const title = resourceTitle.trim();
    const url = normalizeResourceUrl(resourceUrl);
    const description = resourceDescription.trim();
    if (!title) {
      setResourceFormError("Enter a name for this resource.");
      return;
    }
    if (!url) {
      setResourceFormError("Enter a valid http or https web address.");
      return;
    }

    const priorResource = resources.find(
      (resource) => resource.id === editingResourceId,
    );
    const resourceId =
      priorResource?.id ??
      makeRecordId(
        title,
        resources.map((resource) => resource.id),
      );
    const nextResource: ResourceLink = {
      id: resourceId,
      title,
      url,
      description,
      audience: resourceAudience,
    };
    const nextResources = priorResource
      ? resources.map((resource) =>
          resource.id === priorResource.id ? nextResource : resource,
        )
      : [...resources, nextResource];

    setResources(nextResources);
    savePilotState(
      { resources: nextResources },
      {
        action: priorResource ? "Updated resource link" : "Added resource link",
        entityType: "resource",
        entityId: resourceId,
        detail: `${title} · ${resourceAudience}`,
      },
    );
    closeResourceManager();
    setToast(
      priorResource
        ? `${title} was updated`
        : `${title} was added to Resources`,
    );
    window.setTimeout(() => setToast(null), 2800);
  }

  function deleteResourceLink(resource: ResourceLink) {
    const confirmed = window.confirm(
      `Delete ${resource.title}? This removes the link for every audience.`,
    );
    if (!confirmed) return;
    const nextResources = resources.filter((item) => item.id !== resource.id);
    setResources(nextResources);
    savePilotState(
      { resources: nextResources },
      {
        action: "Deleted resource link",
        entityType: "resource",
        entityId: resource.id,
        detail: `${resource.title} · ${resource.audience}`,
      },
    );
    setToast(`${resource.title} was deleted`);
    window.setTimeout(() => setToast(null), 2600);
  }

  function saveClientRecord() {
    const name = newClientName.trim();
    const selectedCss = users.filter(
      (user) => user.role === "CSS" && newClientCssIds.includes(user.id),
    );
    const clientEmails = parseClientEmails(newClientEmails);
    if (!name) {
      setAdminFormError("Enter the client name.");
      return;
    }
    if (
      clients.some(
        (client) =>
          client.name.toLowerCase() === name.toLowerCase() &&
          client.id !== editingClientId,
      )
    ) {
      setAdminFormError("That client is already in the directory.");
      return;
    }
    if (selectedCss.length > 6) {
      setAdminFormError("A client can have no more than six CSS users.");
      return;
    }
    const invalidEmail = clientEmails.find(
      (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    );
    if (invalidEmail) {
      setAdminFormError(`Enter a valid client email instead of ${invalidEmail}.`);
      return;
    }
    const emailConflict = clientEmails.find((email) =>
      clients.some(
        (client) =>
          client.id !== editingClientId &&
          (client.clientEmails ?? []).some(
            (savedEmail) => savedEmail.toLowerCase() === email,
          ),
      ),
    );
    if (emailConflict) {
      setAdminFormError(
        `${emailConflict} is already approved for another client workspace.`,
      );
      return;
    }
    const userEmailConflict = clientEmails.find((email) => {
      const existingUser = users.find(
        (user) => user.email.toLowerCase() === email,
      );
      if (!existingUser) return false;
      if (existingUser.role !== "Client") return true;
      return existingUser.clientIds.some((id) => id !== editingClientId);
    });
    if (userEmailConflict) {
      setAdminFormError(
        `${userEmailConflict} already belongs to another user or client workspace.`,
      );
      return;
    }

    const existingClient = clients.find(
      (client) => client.id === editingClientId,
    );
    const clientId =
      existingClient?.id ??
      makeRecordId(
        name,
        clients.map((client) => client.id),
      );
    const tints = ["coral", "mint", "lilac"];
    const nextClient: ClientRecord = {
      id: clientId,
      name,
      initials: makeInitials(name),
      tint: existingClient?.tint ?? tints[clients.length % tints.length],
      cssContacts: selectedCss.map((user) => user.name),
      clientEmails,
    };
    const nextClients = existingClient
      ? clients.map((client) =>
          client.id === existingClient.id ? nextClient : client,
        )
      : [...clients, nextClient];
    const updatedUsers = users.map((user) => {
      if (user.role === "Admin") {
        return {
          ...user,
          clientIds: Array.from(new Set([...user.clientIds, clientId])),
        };
      }
      if (user.role === "CSS") {
        const withoutClient = user.clientIds.filter((id) => id !== clientId);
        return newClientCssIds.includes(user.id)
          ? { ...user, clientIds: [...withoutClient, clientId] }
          : { ...user, clientIds: withoutClient };
      }
      if (user.role === "Client") {
        const belongsToClient =
          user.clientId === clientId || user.clientIds.includes(clientId);
        const shouldBelongToClient = clientEmails.includes(
          user.email.toLowerCase(),
        );
        if (shouldBelongToClient) {
          return {
            ...user,
            clientId,
            clientIds: [clientId],
          };
        }
        if (belongsToClient) {
          return {
            ...user,
            clientId: undefined,
            clientIds: user.clientIds.filter((id) => id !== clientId),
          };
        }
      }
      return user;
    });
    const existingEmails = new Set(
      updatedUsers.map((user) => user.email.toLowerCase()),
    );
    const usedUserIds = new Set(updatedUsers.map((user) => user.id));
    const createdPendingUsers = clientEmails
      .filter((email) => !existingEmails.has(email))
      .map((email) => {
        const name = makeNameFromEmail(email);
        const userId = makeRecordId(
          email.split("@")[0],
          Array.from(usedUserIds),
        );
        usedUserIds.add(userId);
        return {
          id: userId,
          name,
          email,
          initials: makeInitials(name),
          role: "Client" as const,
          accountStatus: "Not activated" as const,
          clientId,
          clientIds: [clientId],
        };
      });
    const nextUsers = [...updatedUsers, ...createdPendingUsers];
    setClients(nextClients);
    setUsers(nextUsers);
    savePilotState(
      { clients: nextClients, users: nextUsers },
      {
        action: existingClient ? "Updated client" : "Added client",
        entityType: "client",
        entityId: clientId,
        detail: `${name} · ${selectedCss.length} CSS · ${clientEmails.length} approved client ${
          clientEmails.length === 1 ? "email" : "emails"
        } · ${createdPendingUsers.length} pending ${
          createdPendingUsers.length === 1 ? "user" : "users"
        } created`,
      },
    );
    closeAdminManager();
    setToast(
      existingClient
        ? `${name} was updated`
        : `${name} added—CSS assignment can be added later`,
    );
    window.setTimeout(() => setToast(null), 3000);
  }

  function deleteClientRecord(client: ClientRecord) {
    const linkedPlanCount = launchPlans.filter(
      (plan) => plan.clientId === client.id,
    ).length;
    const confirmed = window.confirm(
      linkedPlanCount > 0
        ? `Delete ${client.name}? This will also delete ${linkedPlanCount} linked launch ${
            linkedPlanCount === 1 ? "plan" : "plans"
          }. This cannot be undone.`
        : `Delete ${client.name}? This cannot be undone.`,
    );
    if (!confirmed) return;

    const nextClients = clients.filter((item) => item.id !== client.id);
    const nextPlans = launchPlans.filter((plan) => plan.clientId !== client.id);
    const nextUsers = users.map((user) => ({
      ...user,
      clientId: user.clientId === client.id ? undefined : user.clientId,
      clientIds: user.clientIds.filter((id) => id !== client.id),
    }));
    setClients(nextClients);
    setLaunchPlans(nextPlans);
    setUsers(nextUsers);
    savePilotState(
      {
        clients: nextClients,
        launchPlans: nextPlans,
        users: nextUsers,
      },
      {
        action: "Deleted client",
        entityType: "client",
        entityId: client.id,
        detail: `${client.name} and ${linkedPlanCount} linked ${
          linkedPlanCount === 1 ? "plan" : "plans"
        } removed`,
      },
    );
    setToast(`${client.name} was deleted`);
    window.setTimeout(() => setToast(null), 3000);
  }

  function saveUserRecord() {
    const name = userName.trim();
    const email = userEmail.trim().toLowerCase();
    if (!name) {
      setAdminFormError("Enter the user’s full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAdminFormError("Enter a valid work email.");
      return;
    }
    if (
      users.some(
        (user) =>
          user.email.toLowerCase() === email && user.id !== editingUserId,
      )
    ) {
      setAdminFormError("A user with that email already exists.");
      return;
    }
    if (userRole === "Client" && userClientIds.length > 0) {
      const selectedClientId = userClientIds[0];
      const emailConflict = clients.find(
        (client) =>
          client.id !== selectedClientId &&
          (client.clientEmails ?? []).some(
            (savedEmail) => savedEmail.toLowerCase() === email,
          ),
      );
      if (emailConflict) {
        setAdminFormError(
          `${email} is already approved for ${emailConflict.name}.`,
        );
        return;
      }
    }

    if (userRole === "CSS") {
      const overCapacityClient = clients.find((client) => {
        if (!userClientIds.includes(client.id)) return false;
        const otherLinkedCssCount = users.filter(
          (user) =>
            user.role === "CSS" &&
            user.id !== editingUserId &&
            user.clientIds.includes(client.id),
        ).length;
        return otherLinkedCssCount >= 6;
      });
      if (overCapacityClient) {
        setAdminFormError(
          `${overCapacityClient.name} already has the maximum of six CSS users.`,
        );
        return;
      }
    }

    const allowedClientIds =
      userRole === "Admin"
        ? clients.map((client) => client.id)
        : userRole === "Client"
          ? userClientIds.slice(0, 1)
          : userClientIds;
    const priorUser = users.find((user) => user.id === editingUserId);
    const userId =
      priorUser?.id ??
      makeRecordId(
        email.split("@")[0],
        users.map((user) => user.id),
      );
    const nextUser: DemoUser = {
      id: userId,
      name,
      email,
      initials: makeInitials(name),
      role: userRole,
      accountStatus: priorUser?.accountStatus ?? "Not activated",
      clientId: userRole === "Client" ? allowedClientIds[0] : undefined,
      clientIds: allowedClientIds,
    };
    const nextUsers = priorUser
      ? users.map((user) => (user.id === priorUser.id ? nextUser : user))
      : [...users, nextUser];
    const nextClients = clients.map((client) => {
      const priorWasLinked =
        priorUser?.role === "CSS" && priorUser.clientIds.includes(client.id);
      const isNowLinked =
        nextUser.role === "CSS" && nextUser.clientIds.includes(client.id);
      let contacts = client.cssContacts.filter(
        (contact) => contact !== priorUser?.name,
      );
      if (isNowLinked) contacts = Array.from(new Set([...contacts, nextUser.name]));
      if (!priorWasLinked && !isNowLinked) contacts = client.cssContacts;
      const emailsWithoutPrior =
        priorUser?.role === "Client"
          ? (client.clientEmails ?? []).filter(
              (savedEmail) => savedEmail !== priorUser.email.toLowerCase(),
            )
          : client.clientEmails ?? [];
      const clientEmails =
        nextUser.role === "Client" && nextUser.clientIds.includes(client.id)
          ? Array.from(new Set([...emailsWithoutPrior, nextUser.email]))
          : emailsWithoutPrior;
      return { ...client, cssContacts: contacts, clientEmails };
    });

    setUsers(nextUsers);
    setClients(nextClients);
    savePilotState(
      { users: nextUsers, clients: nextClients },
      {
        action: priorUser ? "Updated user access" : "Saved user record",
        entityType: "user",
        entityId: userId,
        detail: `${name} · ${userRole} · ${allowedClientIds.length} linked ${
          allowedClientIds.length === 1 ? "client" : "clients"
        }`,
      },
    );
    closeAdminManager();
    setToast(
      priorUser
        ? `${name}’s access was updated`
        : `${name} was saved—no invitation was sent`,
    );
    window.setTimeout(() => setToast(null), 3200);
  }

  function setUserActivation(user: DemoUser, activate: boolean) {
    if (
      isProtectedAdmin(user) ||
      user.id === activeUser.id ||
      user.accountStatus === "Demo"
    ) {
      return;
    }
    if (activate && user.role !== "Admin" && user.clientIds.length === 0) {
      setToast(`Link ${user.name} to a client before activating access`);
      window.setTimeout(() => setToast(null), 3200);
      return;
    }
    const nextStatus: AccountStatus = activate ? "Active" : "Deactivated";
    const nextUsers = users.map((item) =>
      item.id === user.id ? { ...item, accountStatus: nextStatus } : item,
    );
    setUsers(nextUsers);
    savePilotState(
      { users: nextUsers },
      {
        action: activate ? "Activated user access" : "Deactivated user access",
        entityType: "user",
        entityId: user.id,
        detail: `${user.name} · ${user.role} · ${user.email}`,
      },
    );
    setToast(
      activate
        ? `${user.name} is active—no invitation was sent`
        : `${user.name}’s access was deactivated`,
    );
    window.setTimeout(() => setToast(null), 3200);
  }

  function deleteUserRecord(user: DemoUser) {
    if (
      isProtectedAdmin(user) ||
      user.id === activeUser.id ||
      user.accountStatus === "Demo"
    ) {
      return;
    }
    const confirmed = window.confirm(
      `Delete ${user.name}? Their saved access record will be removed and they will be unlinked from every client. This cannot be undone.`,
    );
    if (!confirmed) return;

    const nextUsers = users.filter((item) => item.id !== user.id);
    const nextClients = clients.map((client) => ({
      ...client,
      cssContacts:
        user.role === "CSS"
          ? client.cssContacts.filter((contact) => contact !== user.name)
          : client.cssContacts,
      clientEmails:
        user.role === "Client"
          ? (client.clientEmails ?? []).filter(
              (email) => email !== user.email.toLowerCase(),
            )
          : client.clientEmails ?? [],
    }));
    setUsers(nextUsers);
    setClients(nextClients);
    savePilotState(
      { users: nextUsers, clients: nextClients },
      {
        action: "Deleted user",
        entityType: "user",
        entityId: user.id,
        detail: `${user.name} · ${user.role} removed`,
      },
    );
    setToast(`${user.name} was deleted`);
    window.setTimeout(() => setToast(null), 3000);
  }

  function chooseTab(tab: string) {
    setActiveTab(tab);
    const value =
      tab === "My work"
        ? "my-work"
        : tab === "All plans"
          ? "all-plans"
          : "templates";
    const url = new URL(window.location.href);
    url.searchParams.set("view", value);
    window.history.pushState({}, "", url);
  }

  function finishTask(task: Task) {
    if (!task.complete && task.owner !== "CSS") {
      setConfirmTask(task);
      return;
    }
    toggleTask(task.id);
  }

  function toggleTask(id: number) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const nextTasks = tasks.map((item) =>
      item.id === id ? { ...item, complete: !item.complete } : item,
    );
    setTasks(nextTasks);
    savePilotState(
      { tasks: nextTasks },
      {
        action: task.complete ? "Reopened task" : "Completed task",
        entityType: "task",
        entityId: String(task.id),
        detail: task.title,
      },
    );
    setToast(task?.complete ? "Task reopened" : "Task completed");
    window.setTimeout(() => setToast(null), 2600);
  }

  function addTodoItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = todoDraft.trim();
    const clientId = clientView
      ? accessibleClients[0]?.id ?? ""
      : todoClientId;
    const client = accessibleClients.find((item) => item.id === clientId);
    if (!title || !client) return;

    const nextItem: TodoItem = {
      id: crypto.randomUUID(),
      clientId,
      title,
      complete: false,
      createdAt: new Date().toISOString(),
      createdByName: activeUser.name,
      createdByRole: role,
    };
    const nextTodoItems = [nextItem, ...todoItems];
    setTodoItems(nextTodoItems);
    setTodoDraft("");
    savePilotState(
      { todoItems: nextTodoItems },
      {
        action: "Added to-do",
        entityType: "todo",
        entityId: nextItem.id,
        detail: `${client.name} · ${title}`,
      },
    );
    setToast(`To-do added for ${client.name}`);
    window.setTimeout(() => setToast(null), 2600);
  }

  function toggleTodoItem(item: TodoItem) {
    const nextTodoItems = todoItems.map((candidate) =>
      candidate.id === item.id
        ? { ...candidate, complete: !candidate.complete }
        : candidate,
    );
    setTodoItems(nextTodoItems);
    savePilotState(
      { todoItems: nextTodoItems },
      {
        action: item.complete ? "Reopened to-do" : "Completed to-do",
        entityType: "todo",
        entityId: item.id,
        detail: item.title,
      },
    );
    setToast(item.complete ? "To-do reopened" : "To-do completed");
    window.setTimeout(() => setToast(null), 2400);
  }

  function attentionView() {
    setWorkspaceSection("Tasks");
    setStatusFilter("All statuses");
    setToast("Showing tasks for your current workspace");
    window.setTimeout(() => setToast(null), 2600);
  }

  function addComment(taskId: string) {
    const body = commentDraft.trim();
    if (!body || !drawerPlan) return;

    const visibility = clientView ? "Shared" : commentVisibility;
    const mentionedUserIds = mentionableUsers
      .filter((user) =>
        body.toLowerCase().includes(`@${makeMentionHandle(user)}`),
      )
      .map((user) => user.id);
    idSequence.current += 1;
    const nextComment: TaskComment = {
      id: idSequence.current,
      planId: drawerPlan.id,
      taskId,
      author: activeUser.name,
      authorRole: clientView ? "Client" : "CSS",
      visibility,
      timestamp: "Just now",
      body,
      mentionedUserIds,
    };
    const nextComments = [...comments, nextComment];
    setComments(nextComments);
    savePilotState(
      { comments: nextComments },
      {
        action:
          visibility === "Internal"
            ? "Added internal note"
            : "Posted shared comment",
        entityType: "plan",
        entityId: drawerPlan.id,
        detail: mentionedUserIds.length
          ? `${body} · ${mentionedUserIds.length} mentioned`
          : body,
        notification: isAdminRolePreview
          ? undefined
          : {
              kind: "comment",
              planId: drawerPlan.id,
              taskId,
              commentId: nextComment.id,
            },
      },
    );
    setCommentDraft("");
    setToast(visibility === "Internal" ? "Internal note added" : "Comment posted");
    window.setTimeout(() => setToast(null), 2600);
  }

  async function uploadAttachment(
    file: File,
    options: {
      clientId: string;
      planId?: string;
      taskId?: string;
      messageId?: string;
      visibility?: CommentVisibility;
    },
  ) {
    const form = new FormData();
    form.append("file", file);
    form.append("clientId", options.clientId);
    if (options.planId) form.append("planId", options.planId);
    if (options.taskId) form.append("taskId", options.taskId);
    if (options.messageId) form.append("messageId", options.messageId);
    form.append("visibility", options.visibility ?? "Shared");
    const response = await fetch("/api/files", { method: "POST", body: form });
    const payload = (await response.json().catch(() => null)) as {
      attachment?: PortalAttachment;
      error?: string;
    } | null;
    if (!response.ok || !payload?.attachment) {
      throw new Error(payload?.error ?? "The file could not be uploaded.");
    }
    setAttachments((current) => [payload.attachment!, ...current]);
    return payload.attachment;
  }

  async function sendDirectMessage() {
    const body = messageDraft.trim();
    if ((!body && !messageFile) || !selectedMessageClient) return;
    setUploadingFile(true);
    try {
      const messageId = crypto.randomUUID();
      const mentionedUserIds = mentionableMessageUsers
        .filter((user) =>
          body.toLowerCase().includes(`@${makeMentionHandle(user)}`),
        )
        .map((user) => user.id);
      const uploaded = messageFile
        ? await uploadAttachment(messageFile, {
            clientId: selectedMessageClient.id,
            messageId,
          })
        : null;
      const message: DirectMessage = {
        id: messageId,
        clientId: selectedMessageClient.id,
        authorId: activeUser.id,
        author: activeUser.name,
        authorRole: activeUser.role,
        body: body || `Shared ${uploaded?.fileName ?? "a file"}`,
        timestamp: new Date().toISOString(),
        mentionedUserIds,
        attachmentIds: uploaded ? [uploaded.id] : [],
      };
      const nextMessages = [...directMessages, message];
      setDirectMessages(nextMessages);
      savePilotState(
        { directMessages: nextMessages },
        {
          action: "Sent client message",
          entityType: "message",
          entityId: message.id,
          detail: mentionedUserIds.length
            ? `${selectedMessageClient.name}: ${message.body} · ${mentionedUserIds.length} mentioned`
            : `${selectedMessageClient.name}: ${message.body}`,
          notification: isAdminRolePreview
            ? undefined
            : {
                kind: "message",
                clientId: selectedMessageClient.id,
                messageId: message.id,
              },
        },
      );
      setMessageDraft("");
      setMessageFile(null);
      setToast("Message sent");
      window.setTimeout(() => setToast(null), 2600);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to send message");
      window.setTimeout(() => setToast(null), 3400);
    } finally {
      setUploadingFile(false);
    }
  }

  async function uploadTaskFile(file: File) {
    if (!drawerPlan) return;
    setUploadingFile(true);
    try {
      await uploadAttachment(file, {
        clientId: drawerPlan.clientId,
        planId: drawerPlan.id,
        taskId: openTaskId ?? undefined,
        visibility: clientView ? "Shared" : commentVisibility,
      });
      setToast("File uploaded securely");
      window.setTimeout(() => setToast(null), 2600);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Upload failed");
      window.setTimeout(() => setToast(null), 3400);
    } finally {
      setUploadingFile(false);
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function openNewPlan(templateId?: PlanTemplate["id"]) {
    setPlanClient("");
    setPlanTargetDate("");
    setOwnerAssignments({});
    setSelectedTemplateId(templateId ?? null);
    setNewPlanStep(templateId ? 2 : 1);
    setNewPlanOpen(true);
  }

  const selectedTemplate =
    templateLibrary.find((template) => template.id === selectedTemplateId) ?? null;
  const selectedTemplateTasks =
    selectedTemplate?.phases.flatMap((phase) =>
      phase.tasks.map((title, index) => ({
        id: `${selectedTemplate.id}-${phase.name}-${index}`,
        title,
      })),
    ) ?? [];
  const assignedOwnerCount = selectedTemplateTasks.filter(
    (task) => ownerAssignments[task.id],
  ).length;

  function chooseTemplate(templateId: PlanTemplate["id"]) {
    setSelectedTemplateId(templateId);
    setOwnerAssignments({});
    setNewPlanStep(2);
  }

  function assignAllOwners(owner: Owner) {
    setOwnerAssignments(
      Object.fromEntries(selectedTemplateTasks.map((task) => [task.id, owner])),
    );
  }

  function createPlan() {
    if (!selectedTemplate || assignedOwnerCount !== selectedTemplateTasks.length) {
      return;
    }
    const client = clients.find(
      (item) =>
        item.id === planClient && activeUser.clientIds.includes(item.id),
    );
    if (!client) return;
    idSequence.current += 1;
    const planId = `${selectedTemplate.id}-${client.id}-${idSequence.current}`;
    const newPlan: LaunchPlan = {
        id: planId,
        clientId: client.id,
        client: client.name,
        initials: client.initials,
        title: selectedTemplate.title,
        progress: 0,
        targetDate: planTargetDate
          ? new Date(`${planTargetDate}T12:00:00`).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : null,
        status: "On track",
        tint: client.tint,
        phases: selectedTemplate.phases.map((phase, phaseIndex) => {
          const internalPhase =
            /internal|seatgeek|(^|\s)sg($|\s)|@ clinch sg/i.test(phase.name);
          return {
            phase: phase.name,
            tasks: phase.tasks.map((title, taskIndex) => {
              const assignmentId = `${selectedTemplate.id}-${phase.name}-${taskIndex}`;
              const internalTask =
                internalPhase ||
                /internal sg|sg internal|seatgeek/i.test(title);
              return {
                id: `${planId}-${phaseIndex}-${taskIndex}`,
                title,
                owner: ownerAssignments[assignmentId] as Owner,
                due: "No due date",
                complete: false,
                visibility: internalTask ? "SeatGeek only" : "Shared",
              };
            }),
          };
        }),
      };
    const nextPlans = [newPlan, ...launchPlans];
    setLaunchPlans(nextPlans);
    savePilotState(
      { launchPlans: nextPlans },
      {
        action: "Created launch plan",
        entityType: "plan",
        entityId: planId,
        detail: `${selectedTemplate.title} for ${client.name}`,
      },
    );
    setNewPlanOpen(false);
    setToast(`${selectedTemplate.title} plan created for ${client.name}`);
    window.setTimeout(() => setToast(null), 3000);
  }

  function togglePlanTask(task: PlanTaskItem) {
    if (!drawerPlan) return;
    const completionKey = `${drawerPlan.id}:${task.id}`;
    const currentComplete =
      planTaskCompletion[completionKey] ?? task.complete;
    const nextCompletion = {
      ...planTaskCompletion,
      [completionKey]: !currentComplete,
    };
    let nextPlans = launchPlans;
    let nextDrawerPlan = drawerPlan;

    if (drawerPlan.phases) {
      const totalTasks = drawerPlan.phases.flatMap((phase) => phase.tasks);
      const completedCount = totalTasks.filter((item) => {
        const key = `${drawerPlan.id}:${item.id}`;
        return nextCompletion[key] ?? item.complete;
      }).length;
      const progress = Math.round((completedCount / totalTasks.length) * 100);
      nextPlans = launchPlans.map((plan) =>
        plan.id === drawerPlan.id ? { ...plan, progress } : plan,
      );
      nextDrawerPlan = { ...drawerPlan, progress };
      setLaunchPlans(nextPlans);
      setDrawerPlan(nextDrawerPlan);
    }

    setPlanTaskCompletion(nextCompletion);
    savePilotState(
      {
        launchPlans: nextPlans,
        planTaskCompletion: nextCompletion,
      },
      {
        action: currentComplete ? "Reopened task" : "Completed task",
        entityType: "plan",
        entityId: drawerPlan.id,
        detail: task.title,
        notification:
          currentComplete || isAdminRolePreview
            ? undefined
            : {
                kind: "task_completed",
                planId: drawerPlan.id,
                taskId: task.id,
              },
      },
    );
    setToast(currentComplete ? "Task reopened and saved" : "Task completed and saved");
    window.setTimeout(() => setToast(null), 2600);
  }

  function insertMention(user: DemoUser) {
    const handle = makeMentionHandle(user);
    setCommentDraft((current) =>
      current.replace(/(^|\s)@[a-z0-9._-]*$/i, `$1@${handle} `),
    );
  }

  function insertMessageMention(user: DemoUser) {
    const handle = makeMentionHandle(user);
    setMessageDraft((current) =>
      current.replace(/(^|\s)@[a-z0-9._-]*$/i, `$1@${handle} `),
    );
  }

  return (
    <main className={`app-shell ${clientView ? "client-mode" : ""}`}>
      <button
        className="mobile-menu"
        onClick={() => setMobileNav(true)}
        aria-label="Open navigation"
      >
        <Menu size={22} />
      </button>

      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <div className="brand-row">
          <span className="brand">SeatGeek</span>
          <button
            className="mobile-close"
            onClick={() => setMobileNav(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Main navigation">
          {navItems
            .filter((item) =>
              clientView
                ? [
                    "Home",
                    "Launch plans",
                    "Tasks",
                    "To-do list",
                    "Messages",
                    "Resources",
                  ].includes(item.label)
                : adminView || item.label !== "Users & access",
            )
            .map((item) => {
              const Icon = item.icon;
              const active =
                item.label === "Clients"
                  ? workspaceSection === "Clients"
                  : item.label === "Launch plans"
                    ? workspaceSection === "Plans"
                    : item.label === "Tasks"
                    ? workspaceSection === "Tasks"
                    : item.label === "To-do list"
                      ? workspaceSection === "Todo"
                    : item.label === "Messages"
                      ? workspaceSection === "Messages"
                    : item.label === "Users & access"
                    ? workspaceSection === "Access"
                    : item.label === "Resources"
                      ? workspaceSection === "Resources"
                      : item.label === "Settings"
                        ? workspaceSection === "Settings"
                        : item.label === "Home" && workspaceSection === "Home";
              return (
                <button
                  key={item.label}
                  className={`nav-item ${active ? "active" : ""}`}
                  onClick={() => {
                    if (item.label === "Clients") setWorkspaceSection("Clients");
                    if (item.label === "Launch plans") {
                      setWorkspaceSection("Plans");
                      chooseTab("All plans");
                    }
                    if (item.label === "Tasks") {
                      setWorkspaceSection("Tasks");
                    }
                    if (item.label === "To-do list") {
                      setWorkspaceSection("Todo");
                    }
                    if (item.label === "Messages") {
                      setWorkspaceSection("Messages");
                    }
                    if (item.label === "Users & access") {
                      setWorkspaceSection("Access");
                    }
                    if (item.label === "Resources") {
                      setWorkspaceSection("Resources");
                    }
                    if (item.label === "Settings") {
                      setWorkspaceSection("Settings");
                    }
                    if (item.label === "Home") setWorkspaceSection("Home");
                    setMobileNav(false);
                  }}
                >
                  <Icon size={20} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>

        <div className="profile">
          <div className="avatar">{activeUser.initials}</div>
          <div className="profile-copy">
            <strong>{activeUser.name}</strong>
            <span>
              {isAdminClientPreview
                ? "Client preview · Admin testing"
                : isAdminCssPreview
                  ? "CSS preview · Admin testing"
                : sessionAccess?.mode === "authenticated"
                ? `${activeUser.role} · Secure access`
                : `${activeUser.role} demo account`}
            </span>
          </div>
          <ChevronDown size={16} />
        </div>
      </aside>

      {mobileNav && (
        <button
          className="nav-scrim"
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation"
        />
      )}

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="product-name">Client Launch Hub</p>
            <span
              className={`prototype-badge storage-${persistStatus.toLowerCase()}`}
              title={
                lastSavedAt
                  ? `Last saved ${new Date(lastSavedAt).toLocaleString()}`
                  : "Pilot storage status"
              }
            >
              {persistStatus === "Loading"
                ? "Loading saved data"
                : persistStatus === "Saving"
                  ? "Saving changes"
                  : persistStatus === "Saved"
                    ? "Saved pilot"
                    : "Storage unavailable"}
            </span>
          </div>
          <div className="workspace-actions">
            <div className="portal-notification-center">
                <button
                  type="button"
                  className="portal-notification-button"
                  onClick={() => setNotificationOpen((open) => !open)}
                  aria-label={`Notifications${
                    unreadNotificationCount
                      ? `, ${unreadNotificationCount} unread`
                      : ""
                  }`}
                  aria-expanded={notificationOpen}
                  title={
                    isAdminRolePreview
                      ? `${role} notification preview`
                      : "Notifications"
                  }
                >
                  <Bell size={18} />
                  {unreadNotificationCount > 0 && (
                    <span>
                      {unreadNotificationCount > 99
                        ? "99+"
                        : unreadNotificationCount}
                    </span>
                  )}
                </button>
                {notificationOpen && (
                  <div
                    className="portal-notification-panel"
                    role="dialog"
                    aria-label="Portal notifications"
                  >
                    <header>
                      <div>
                        <strong>
                          {isAdminRolePreview
                            ? `${role} notifications`
                            : "Notifications"}
                        </strong>
                        <span>
                          {isAdminRolePreview
                            ? unreadNotificationCount
                              ? `Preview inbox · ${unreadNotificationCount} unread`
                              : "Preview inbox · no unread alerts"
                            : unreadNotificationCount
                              ? `${unreadNotificationCount} unread`
                              : "You’re all caught up"}
                        </span>
                      </div>
                      {!isAdminRolePreview && unreadNotificationCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                        >
                          <Check size={14} /> Mark all read
                        </button>
                      )}
                    </header>
                    <div className="portal-notification-list">
                      {latestNotifications.length ? (
                        latestNotifications.map((notification) => (
                          <button
                            type="button"
                            className={`portal-notification-item ${
                              notification.readAt ? "" : "unread"
                            }`}
                            onClick={() => openNotification(notification)}
                            key={notification.id}
                          >
                            <span className={`notification-kind ${notification.kind}`}>
                              {notification.kind === "mention" ? (
                                <AtSign size={16} />
                              ) : notification.kind === "task_completed" ? (
                                <CheckSquare2 size={16} />
                              ) : notification.kind === "message" ? (
                                <MessagesSquare size={16} />
                              ) : (
                                <MessageCircle size={16} />
                              )}
                            </span>
                            <span>
                              <span className="notification-item-heading">
                                <strong>{notification.title}</strong>
                                <time>
                                  {formatNotificationTime(notification.createdAt)}
                                </time>
                              </span>
                              <span className="notification-item-body">
                                {notification.body}
                              </span>
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="portal-notification-empty">
                          <Bell size={24} />
                          <strong>No notifications yet</strong>
                          <span>
                            Comments, mentions, messages, and completed tasks will
                            appear here.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Use light mode" : "Use dark mode"}
              title={theme === "dark" ? "Use light mode" : "Use dark mode"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            {isAuthenticatedAdmin ? (
              <label className="client-preview-control">
                <Eye size={17} />
                <span className="sr-only">Switch demo role and workspace</span>
                <select
                  aria-label="Switch demo role and workspace"
                  value={
                    isAdminClientPreview && previewClient
                      ? `client:${previewClient.id}`
                      : isAdminCssPreview
                        ? `css:${activeUser.id}`
                        : "admin"
                  }
                  onChange={(event) => changeAdminDemoView(event.target.value)}
                >
                  <option value="admin">Admin · Full access</option>
                  <optgroup label="CSS view">
                    {users
                      .filter(
                        (user) =>
                          user.role === "CSS" &&
                          user.accountStatus !== "Deactivated" &&
                          user.accountStatus !== "Not activated",
                      )
                      .map((user) => (
                        <option key={user.id} value={`css:${user.id}`}>
                          CSS · {user.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Client view">
                    {clients.map((client) => (
                      <option key={client.id} value={`client:${client.id}`}>
                        Client · {client.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
            ) : null}
            {!clientView && (
              <button className="primary-button" onClick={() => openNewPlan()}>
                <Plus size={18} />
                New launch plan
              </button>
            )}
          </div>
        </header>

        {isAdminRolePreview && (
          <div className="client-preview-banner" role="status">
            <Eye size={20} />
            <div>
              <strong>
                {isAdminClientPreview && previewClient
                  ? `Viewing the portal as ${previewClient.name}`
                  : `Viewing the portal as ${activeUser.name} · CSS`}
              </strong>
              <span>
                {isAdminClientPreview
                  ? "Internal tasks and notes are hidden. Actions taken in this view are saved as client activity."
                  : "Admin controls are hidden. This view is limited to the clients assigned to this CSS user."}
              </span>
            </div>
            <button onClick={exitRolePreview}>Return to Admin</button>
          </div>
        )}

        <div
          className={`dashboard-grid ${
            workspaceSection !== "Home" ? "clients-grid" : ""
          }`}
        >
          <div className="dashboard-main">
            {workspaceSection === "Messages" ? (
              <section className="messages-workspace">
                <div className="clients-hero">
                  <div>
                    <p className="eyebrow">Client conversations</p>
                    <h1>Messages</h1>
                    <p>
                      Send a shared message without attaching it to a launch task.
                      Conversations and files stay inside the selected client workspace.
                    </p>
                  </div>
                  <span className="secure-message-chip">
                    <LockKeyhole size={15} /> Client-scoped
                  </span>
                </div>

                <div className="messages-layout">
                  <aside className="conversation-list" aria-label="Client conversations">
                    <header>
                      <strong>Conversations</strong>
                      <span>{accessibleClients.length}</span>
                    </header>
                    {accessibleClients.map((client) => {
                      const clientMessages = directMessages.filter(
                        (message) => message.clientId === client.id,
                      );
                      const lastMessage = clientMessages.at(-1);
                      return (
                        <button
                          className={
                            selectedMessageClientId === client.id ? "selected" : ""
                          }
                          onClick={() => setSelectedMessageClientId(client.id)}
                          key={client.id}
                        >
                          <span className={`plan-avatar ${client.tint}`}>
                            {client.initials}
                          </span>
                          <span>
                            <strong>{client.name}</strong>
                            <small>
                              {lastMessage?.body ?? "Start a conversation"}
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </aside>

                  <div className="conversation-panel">
                    {selectedMessageClient ? (
                      <>
                        <header>
                          <div>
                            <strong>{selectedMessageClient.name}</strong>
                            <span>CSS and approved client users</span>
                          </div>
                          <ShieldCheck size={20} />
                        </header>
                        <div className="message-thread" aria-live="polite">
                          {visibleDirectMessages.length ? (
                            visibleDirectMessages.map((message) => {
                              const messageAttachments = attachments.filter((attachment) =>
                                message.attachmentIds?.includes(attachment.id),
                              );
                              const ownMessage = message.authorId === activeUser.id;
                              return (
                                <article
                                  className={`message-bubble ${ownMessage ? "own" : ""}`}
                                  key={message.id}
                                >
                                  <header>
                                    <strong>{message.author}</strong>
                                    <span>{message.authorRole}</span>
                                  </header>
                                  <p>{renderCommentBody(message.body, users)}</p>
                                  {messageAttachments.map((attachment) => (
                                    <a
                                      className="message-attachment"
                                      href={`/api/files/${attachment.id}`}
                                      key={attachment.id}
                                    >
                                      <FileText size={16} />
                                      <span>
                                        <strong>{attachment.fileName}</strong>
                                        <small>{formatFileSize(attachment.size)}</small>
                                      </span>
                                      <Download size={15} />
                                    </a>
                                  ))}
                                  <time>
                                    {new Date(message.timestamp).toLocaleString()}
                                  </time>
                                </article>
                              );
                            })
                          ) : (
                            <div className="message-empty-state">
                              <MessagesSquare size={28} />
                              <strong>No messages yet</strong>
                              <span>Start the shared conversation for this client.</span>
                            </div>
                          )}
                        </div>
                        <div className="message-composer">
                          <div className="message-input-wrap">
                            <textarea
                              value={messageDraft}
                              onChange={(event) => setMessageDraft(event.target.value)}
                              placeholder={`Message ${selectedMessageClient.name}… Type @ to tag someone.`}
                              rows={3}
                            />
                            {messageMentionQuery !== null && (
                              <div
                                className="mention-menu"
                                role="listbox"
                                aria-label="People you can mention"
                              >
                                {messageMentionSuggestions.length ? (
                                  messageMentionSuggestions.map((user) => (
                                    <button
                                      type="button"
                                      role="option"
                                      aria-selected="false"
                                      onClick={() => insertMessageMention(user)}
                                      key={user.id}
                                    >
                                      <span>{user.initials}</span>
                                      <span>
                                        <strong>{user.name}</strong>
                                        <small>
                                          @{makeMentionHandle(user)} · {user.role}
                                        </small>
                                      </span>
                                    </button>
                                  ))
                                ) : (
                                  <p>No matching users for this client.</p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="message-composer-actions">
                            <label className="attachment-picker">
                              <Paperclip size={16} />
                              <span>{messageFile ? messageFile.name : "Attach file"}</span>
                              <input
                                type="file"
                                accept=".pdf,.docx,.xlsx,.csv,.txt,.jpg,.jpeg,.png"
                                onChange={(event) =>
                                  setMessageFile(event.target.files?.[0] ?? null)
                                }
                              />
                            </label>
                            <button
                              onClick={() => void sendDirectMessage()}
                              disabled={
                                uploadingFile || (!messageDraft.trim() && !messageFile)
                              }
                            >
                              <Send size={15} />
                              {uploadingFile ? "Sending…" : "Send message"}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="message-empty-state">
                        <MessageCircle size={28} />
                        <strong>No client workspace is available</strong>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ) : workspaceSection === "Settings" ? (
              <section className="notification-settings">
                <div className="clients-hero">
                  <div>
                    <p className="eyebrow">Communication preferences</p>
                    <h1>Notifications</h1>
                    <p>
                      See when the portal alerts CSS and client users about task
                      activity.
                    </p>
                  </div>
                  <span
                    className={`notification-status ${
                      emailNotificationsConfigured ? "connected" : "pending"
                    }`}
                  >
                    {emailNotificationsConfigured
                      ? "Email sender connected"
                      : "Email sender connection needed"}
                  </span>
                </div>

                <div className="notification-rule-grid">
                  <article>
                    <span><AtSign size={20} /></span>
                    <div>
                      <strong>@mentions</strong>
                      <p>
                        Tag a linked CSS or client user from a task comment using
                        their portal handle.
                      </p>
                    </div>
                  </article>
                  <article>
                    <span><MessageCircle size={20} /></span>
                    <div>
                      <strong>New task comments</strong>
                      <p>
                        Active users linked to that client are selected for an
                        email alert when a shared comment is posted.
                      </p>
                    </div>
                  </article>
                  <article>
                    <span><CheckSquare2 size={20} /></span>
                    <div>
                      <strong>Task completion</strong>
                      <p>
                        Active linked users are selected for an email alert when
                        a launch-plan task is completed.
                      </p>
                    </div>
                  </article>
                </div>

                <div className="notification-privacy-card">
                  <ShieldCheck size={21} />
                  <div>
                    <strong>Notifications follow portal access</strong>
                    <span>
                      Shared activity can notify linked CSS and client users.
                      Internal notes stay with CSS, and Admin client-preview activity
                      never sends an email.
                    </span>
                  </div>
                </div>

                {!emailNotificationsConfigured && (
                  <div className="notification-connection-card">
                    <strong>The portal rules are ready; email delivery needs a sender.</strong>
                    <p>
                      Connect a SeatGeek-approved Outlook/Power Automate webhook or
                      an approved transactional email service to begin delivering
                      these messages.
                    </p>
                  </div>
                )}
              </section>
            ) : workspaceSection === "Resources" ? (
              <section className="resources-directory">
                <div className="clients-hero">
                  <div>
                    <p className="eyebrow">Role-based link library</p>
                    <h1>Resources</h1>
                    <p>
                      {adminView
                        ? "Manage the external links available to CSS and client users."
                        : clientView
                          ? "Helpful links selected for your client workspace."
                          : "Helpful links for the CSS team."}
                    </p>
                  </div>
                  {adminView && (
                    <button
                      className="primary-button"
                      onClick={() => openResourceManager()}
                    >
                      <Link2 size={18} /> Add resource
                    </button>
                  )}
                </div>

                {adminView && (
                  <div className="access-rule-card">
                    <ShieldCheck size={20} />
                    <div>
                      <strong>Each link has its own audience</strong>
                      <span>
                        Choose CSS, Client, or Both. Users only receive the links
                        assigned to their role, and links open in a separate tab.
                      </span>
                    </div>
                  </div>
                )}

                {visibleResources.length ? (
                  <div className="resource-card-grid">
                    {visibleResources.map((resource) => (
                      <article className="resource-card" key={resource.id}>
                        <header>
                          <span className="resource-icon">
                            <Link2 size={20} />
                          </span>
                          {adminView && (
                            <span
                              className={`resource-audience audience-${resource.audience.toLowerCase()}`}
                            >
                              {resource.audience === "Both"
                                ? "CSS + Client"
                                : resource.audience}
                            </span>
                          )}
                        </header>
                        <div className="resource-card-copy">
                          <strong>{resource.title}</strong>
                          <p>
                            {resource.description ||
                              "Open this resource in a new browser tab."}
                          </p>
                          <span>{getResourceHost(resource.url)}</span>
                        </div>
                        <div className="resource-card-actions">
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open resource <ExternalLink size={15} />
                          </a>
                          {adminView && (
                            <>
                              <button onClick={() => openResourceManager(resource)}>
                                <Pencil size={14} /> Edit
                              </button>
                              <button
                                className="danger-action"
                                onClick={() => deleteResourceLink(resource)}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="resource-empty-state">
                    <Link2 size={28} />
                    <strong>
                      {adminView
                        ? "No resource links have been added yet"
                        : "No resources are available for your role yet"}
                    </strong>
                    <p>
                      {adminView
                        ? "Add a link and choose whether CSS, clients, or both can see it."
                        : "An Admin can add links to this page when they are ready."}
                    </p>
                    {adminView && (
                      <button onClick={() => openResourceManager()}>
                        Add the first resource
                      </button>
                    )}
                  </div>
                )}
              </section>
            ) : workspaceSection === "Clients" && !clientView ? (
              <section className="clients-directory">
                <div className="clients-hero">
                  <div>
                    <p className="eyebrow">Stored relationships</p>
                    <h1>Clients and CSS access</h1>
                    <p>
                      Each plan belongs to one client. Client users see only that
                      client’s plans and the CSS contacts linked to their organization.
                    </p>
                  </div>
                  {adminView ? (
                    <button
                      className="primary-button"
                      onClick={() => openClientManager()}
                    >
                      <Building2 size={18} /> Add client
                    </button>
                  ) : (
                    isAdminRolePreview ? (
                      <button
                        className="secondary-button"
                        onClick={exitRolePreview}
                      >
                        <ShieldCheck size={18} /> Return to Admin to manage
                      </button>
                    ) : null
                  )}
                </div>
                {adminView ? (
                  <div className="admin-management-banner">
                    <ShieldCheck size={20} />
                    <div>
                      <strong>Client management stays available after launch</strong>
                      <span>
                        Add a client now or later. Use Edit on any client to manage
                        up to six CSS assignments and its approved user emails.
                      </span>
                    </div>
                    <button onClick={() => openUserManager()}>
                      <UserPlus size={17} /> Add portal user
                    </button>
                  </div>
                ) : (
                  <div className="access-rule-card">
                    <LockKeyhole size={20} />
                    <div>
                      <strong>This is the CSS read-only directory</strong>
                      <span>
                        {isAdminRolePreview
                          ? "Return to your Admin view to add, edit, or delete clients and manage approved client-user emails."
                          : "An Admin can add, edit, or delete clients and manage approved client-user emails."}
                      </span>
                    </div>
                  </div>
                )}
                <div className="access-rule-card">
                  <LockKeyhole size={20} />
                  <div>
                    <strong>Client-level access is enforced by the relationship</strong>
                    <span>
                      KC Current cannot view SKC or Cleveland Monsters plans, comments,
                      files, or internal SeatGeek notes.
                    </span>
                  </div>
                </div>
                <div className="client-directory-grid">
                  {accessibleClients.map((client) => {
                    const clientPlans = launchPlans.filter(
                      (plan) => plan.clientId === client.id,
                    );
                    return (
                      <article className="client-record-card" key={client.id}>
                        <header>
                          <span className={`plan-avatar ${client.tint}`}>
                            {client.initials}
                          </span>
                          <span>
                            <strong>{client.name}</strong>
                            <small>
                              {clientPlans.length} active{" "}
                              {clientPlans.length === 1 ? "plan" : "plans"}
                            </small>
                          </span>
                          <span className="linked-chip">
                            <LockKeyhole size={12} /> Private
                          </span>
                        </header>
                        <div className="client-link-row">
                          <span>Assigned CSS · {client.cssContacts.length} of 6</span>
                          <strong>
                            {client.cssContacts.length
                              ? client.cssContacts.join(", ")
                              : "Not assigned"}
                          </strong>
                        </div>
                        <div className="client-link-row">
                          <span>Approved client emails</span>
                          <strong>
                            {(client.clientEmails ?? []).length
                              ? (client.clientEmails ?? []).join(", ")
                              : "None added yet"}
                          </strong>
                        </div>
                        <div className="client-link-row">
                          <span>Client workspace</span>
                          <strong>{client.name} users only</strong>
                        </div>
                        <div className="record-card-actions">
                          <button
                            onClick={() => {
                              setClientFilter(client.name);
                              setWorkspaceSection("Home");
                              setActiveTab("All plans");
                            }}
                          >
                            View plans <ChevronRight size={17} />
                          </button>
                          {adminView && (
                            <>
                              <button onClick={() => openClientManager(client)}>
                                <Pencil size={15} /> Edit CSS &amp; emails
                              </button>
                              <button
                                className="danger-action"
                                onClick={() => deleteClientRecord(client)}
                              >
                                <Trash2 size={15} /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : workspaceSection === "Access" && adminView ? (
              <section className="access-directory">
                <div className="clients-hero">
                  <div>
                    <p className="eyebrow">Admin user management</p>
                    <h1>Users and access</h1>
                    <p>
                      Save Admin, CSS, and client users by work email, then apply the
                      appropriate level of workspace access. Passwords are never collected.
                    </p>
                  </div>
                  <div className="access-header-actions">
                    <span className="access-mode-chip">
                      <ShieldCheck size={16} /> No automatic invites
                    </span>
                    <button
                      className="secondary-button"
                      onClick={() => openClientManager()}
                    >
                      <Building2 size={18} /> Add client
                    </button>
                    <button
                      className="primary-button"
                      onClick={() => openUserManager()}
                    >
                      <UserPlus size={18} /> Add user
                    </button>
                  </div>
                </div>

                <div className="access-rule-card">
                  <LockKeyhole size={20} />
                  <div>
                    <strong>Activation is always an Admin decision</strong>
                    <span>
                      Client emails become linked pending users automatically. Activate
                      or deactivate each account here; this checkpoint sends no email.
                    </span>
                  </div>
                </div>

                <div className="user-card-grid">
                  {users.map((user) => {
                    const linkedClients = clients.filter((client) =>
                      user.clientIds.includes(client.id),
                    );
                    return (
                      <article
                        className={`user-access-card ${
                          activeUser.id === user.id ? "current" : ""
                        }`}
                        key={user.id}
                      >
                        <header>
                          <span className={`user-avatar role-${user.role.toLowerCase()}`}>
                            {user.initials}
                          </span>
                          <span>
                            <strong>{user.name}</strong>
                            <small>{user.email}</small>
                          </span>
                          <em>{user.role}</em>
                        </header>
                        <span
                          className={`activation-chip ${
                            user.accountStatus === "Active"
                              ? "active"
                              : user.accountStatus === "Deactivated"
                                ? "deactivated"
                                : user.accountStatus === "Not activated"
                                  ? "pending"
                                  : "demo"
                          }`}
                        >
                          {user.accountStatus ?? "Demo"}
                        </span>
                        <div className="user-access-detail">
                          <span>Client access</span>
                          <strong>
                            {user.role === "Admin"
                              ? "All clients"
                              : linkedClients.length
                                ? linkedClients
                                    .map((client) => client.name)
                                    .join(", ")
                                : "Not linked yet"}
                          </strong>
                        </div>
                        <div className="user-access-detail">
                          <span>Internal notes</span>
                          <strong>
                            {user.role === "Client" ? "Hidden" : "Visible"}
                          </strong>
                        </div>
                        <div className="record-card-actions">
                          {!isProtectedAdmin(user) &&
                            user.id !== activeUser.id &&
                            user.accountStatus !== "Demo" && (
                              <button
                                className={
                                  user.accountStatus === "Active"
                                    ? "deactivate-action"
                                    : "activate-action"
                                }
                                onClick={() =>
                                  setUserActivation(
                                    user,
                                    user.accountStatus !== "Active",
                                  )
                                }
                              >
                                {user.accountStatus === "Active" ? (
                                  <>
                                    <LockKeyhole size={15} /> Deactivate
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck size={15} /> Activate access
                                  </>
                                )}
                              </button>
                            )}
                          <button
                            onClick={() => openUserManager(user)}
                            disabled={
                              activeUser.id === user.id || isProtectedAdmin(user)
                            }
                          >
                            {activeUser.id === user.id ? (
                              <>
                                <Check size={15} /> Current account
                              </>
                            ) : isProtectedAdmin(user) ? (
                              <>
                                <ShieldCheck size={15} /> Protected Admin
                              </>
                            ) : (
                              <>
                                Edit{" "}
                                <ChevronRight size={16} />
                              </>
                            )}
                          </button>
                          {!isProtectedAdmin(user) &&
                            user.id !== activeUser.id &&
                            user.accountStatus !== "Demo" && (
                            <button
                              className="danger-action"
                              onClick={() => deleteUserRecord(user)}
                            >
                              <Trash2 size={15} /> Delete
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="permission-matrix">
                  <div className="section-heading">
                    <div>
                      <h2>Permission checks</h2>
                      <p>What each pilot role is allowed to do.</p>
                    </div>
                    <ShieldCheck size={20} />
                  </div>
                  <div className="permission-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Capability</th>
                          <th>Admin</th>
                          <th>CSS</th>
                          <th>Client</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["View launch plans", "All clients", "Linked clients", "Own client"],
                          ["Create launch plans", "Yes", "Yes", "No"],
                          ["Complete assigned tasks", "Yes", "Yes", "Yes"],
                          ["Add shared to-dos", "Yes", "Yes", "Yes"],
                          ["Post shared comments", "Yes", "Yes", "Yes"],
                          ["Tag CSS or client users", "Yes", "Yes", "Yes"],
                          ["View internal tasks and notes", "Yes", "Yes", "Hidden"],
                          ["Manage users and relationships", "Yes", "No", "No"],
                        ].map((row) => (
                          <tr key={row[0]}>
                            {row.map((cell, index) => (
                              <td
                                key={`${row[0]}-${index}`}
                                data-label={
                                  index === 0
                                    ? undefined
                                    : ["", "Admin", "CSS", "Client"][index]
                                }
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ) : workspaceSection === "Todo" ? (
              <section className="todo-workspace">
                <div className="clients-hero task-workspace-hero">
                  <div>
                    <p className="eyebrow">Shared client follow-up</p>
                    <h1>To-do list</h1>
                    <p>
                      Add quick follow-up items outside a launch plan. CSS and
                      client users can update the same list for their shared
                      workspace.
                    </p>
                  </div>
                  {!clientView && (
                    <label className="todo-filter">
                      <span className="sr-only">Filter to-dos by client</span>
                      <select
                        value={todoFilterClientId}
                        onChange={(event) =>
                          setTodoFilterClientId(event.target.value)
                        }
                      >
                        <option value="All clients">All clients</option>
                        {accessibleClients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <form className="todo-composer" onSubmit={addTodoItem}>
                  <span className="todo-composer-icon">
                    <ListTodo size={21} />
                  </span>
                  {!clientView ? (
                    <label>
                      <span>Client</span>
                      <select
                        value={todoClientId}
                        onChange={(event) => setTodoClientId(event.target.value)}
                      >
                        {accessibleClients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div className="todo-client-lock">
                      <span>Client</span>
                      <strong>{accessibleClients[0]?.name ?? "Your workspace"}</strong>
                    </div>
                  )}
                  <label className="todo-title-field">
                    <span>New to-do</span>
                    <input
                      value={todoDraft}
                      onChange={(event) => setTodoDraft(event.target.value)}
                      placeholder="Example: Confirm final on-sale date"
                      maxLength={180}
                    />
                  </label>
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={!todoDraft.trim() || !todoClientId}
                  >
                    <Plus size={17} /> Add to-do
                  </button>
                </form>

                <section className="todo-summary" aria-label="To-do summary">
                  <div>
                    <span>Open</span>
                    <strong>
                      {visibleTodoItems.filter((item) => !item.complete).length}
                    </strong>
                  </div>
                  <div>
                    <span>Completed</span>
                    <strong>
                      {visibleTodoItems.filter((item) => item.complete).length}
                    </strong>
                  </div>
                </section>

                <div className="todo-list-card">
                  {visibleTodoItems.length ? (
                    visibleTodoItems.map((item) => {
                      const client = clients.find(
                        (candidate) => candidate.id === item.clientId,
                      );
                      return (
                        <article
                          className={`todo-row ${item.complete ? "complete" : ""}`}
                          key={item.id}
                        >
                          <button
                            type="button"
                            className="task-check"
                            onClick={() => toggleTodoItem(item)}
                            aria-label={
                              item.complete
                                ? `Reopen ${item.title}`
                                : `Complete ${item.title}`
                            }
                          >
                            {item.complete && <Check size={17} strokeWidth={3} />}
                          </button>
                          <div>
                            <strong>{item.title}</strong>
                            <span>
                              Added by {item.createdByName} · {item.createdByRole} ·{" "}
                              {new Date(item.createdAt).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                          </div>
                          <span className="todo-client-chip">
                            {client?.name ?? "Client"}
                          </span>
                        </article>
                      );
                    })
                  ) : (
                    <div className="todo-empty-state">
                      <ListTodo size={28} />
                      <strong>No to-dos yet</strong>
                      <span>Add the first follow-up item above.</span>
                    </div>
                  )}
                </div>
              </section>
            ) : workspaceSection === "Tasks" ? (
              <section className="task-workspace">
                <div className="clients-hero task-workspace-hero">
                  <div>
                    <p className="eyebrow">Role-based work queue</p>
                    <h1>Tasks</h1>
                    <p>
                      {clientView
                        ? "Review the shared work for your organization and open a launch plan to complete or discuss a task."
                        : "Review task work across the launch plans available in this workspace."}
                    </p>
                  </div>
                  <div className="task-workspace-filters">
                    {!clientView && (
                      <label>
                        <span className="sr-only">Filter tasks by client</span>
                        <select
                          value={clientFilter}
                          onChange={(event) => setClientFilter(event.target.value)}
                        >
                          <option>All clients</option>
                          {accessibleClients.map((client) => (
                            <option key={client.id}>{client.name}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      <span className="sr-only">Filter tasks by plan status</span>
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                      >
                        <option>All statuses</option>
                        <option>On track</option>
                        <option>3 overdue</option>
                        <option>Blocked</option>
                      </select>
                    </label>
                  </div>
                </div>

                <section className="task-summary-strip" aria-label="Task summary">
                  <div>
                    <span>Open tasks</span>
                    <strong>
                      {visiblePlanTaskCount - completedPlanTaskCount +
                        visiblePriorityTasks.length -
                        completedPriorityTaskCount}
                    </strong>
                  </div>
                  <div>
                    <span>Completed</span>
                    <strong>
                      {completedPlanTaskCount + completedPriorityTaskCount}
                    </strong>
                  </div>
                  <div>
                    <span>Launch plans</span>
                    <strong>{taskWorkspaceLaunchPlans.length}</strong>
                  </div>
                </section>

                <section className="priority-task-card">
                  <header>
                    <div>
                      <p className="eyebrow">Demo-ready work queue</p>
                      <h2>Upcoming priority tasks</h2>
                    </div>
                    <span className="task-count">
                      {visiblePriorityTasks.filter((task) => !task.complete).length}
                    </span>
                  </header>
                  <div className="task-list">
                    {visiblePriorityTasks.map((task) => (
                      <div
                        className={`task-item ${task.complete ? "complete" : ""}`}
                        key={task.id}
                      >
                        <button
                          className="task-check"
                          onClick={() => finishTask(task)}
                          aria-label={
                            task.complete
                              ? `Reopen ${task.title}`
                              : `Complete ${task.title}`
                          }
                        >
                          {task.complete && <Check size={17} strokeWidth={3} />}
                        </button>
                        <div className="task-copy">
                          <strong>{task.title}</strong>
                          <span>
                            <CalendarDays size={15} />
                            {task.due}
                          </span>
                        </div>
                        <span className={`owner-chip owner-${task.owner.toLowerCase()}`}>
                          {clientView && task.owner === "Client"
                            ? "Your team"
                            : task.owner}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="task-plan-list">
                  {taskWorkspacePlans.map(({ plan, tasks: planTasks }) => {
                    const completedCount = planTasks.filter(
                      (task) =>
                        planTaskCompletion[`${plan.id}:${task.id}`] ?? task.complete,
                    ).length;
                    return (
                      <article className="task-plan-card" key={plan.id}>
                        <header>
                          <span className={`plan-avatar ${plan.tint}`}>
                            {plan.initials}
                          </span>
                          <div>
                            <small>{plan.client}</small>
                            <h2>{plan.title}</h2>
                            <span>
                              {completedCount} of {planTasks.length} tasks complete
                            </span>
                          </div>
                          <span
                            className={`status-pill status-${plan.status
                              .toLowerCase()
                              .replace(" ", "-")}`}
                          >
                            {plan.status}
                          </span>
                        </header>
                        <div className="workspace-task-list">
                          {planTasks.map((task) => {
                            const complete =
                              planTaskCompletion[`${plan.id}:${task.id}`] ??
                              task.complete;
                            return (
                              <button
                                className={`workspace-task-row ${complete ? "complete" : ""}`}
                                key={`${plan.id}:${task.id}`}
                                onClick={() => {
                                  setDrawerPlan(plan);
                                  setDrawerTab("Tasks");
                                  setOpenTaskId(task.id);
                                }}
                              >
                                <span className="workspace-task-status">
                                  {complete ? <Check size={15} strokeWidth={3} /> : null}
                                </span>
                                <span className="workspace-task-copy">
                                  <strong>{task.title}</strong>
                                  <small>{task.phase} · {task.due}</small>
                                </span>
                                <span className={`owner-chip owner-${task.owner.toLowerCase()}`}>
                                  {clientView && task.owner === "Client"
                                    ? "Your team"
                                    : task.owner}
                                </span>
                                <ChevronRight size={18} />
                              </button>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                  {taskWorkspacePlans.length === 0 && (
                    <div className="empty-state">
                      <CheckSquare2 size={26} />
                      <strong>No detailed launch-plan tasks match these filters</strong>
                      <button
                        onClick={() => {
                          setClientFilter("All clients");
                          setStatusFilter("All statuses");
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <>
            <section className="hero">
              <p className="eyebrow">
                {workspaceSection === "Plans"
                  ? "Launch plan workspace"
                  : clientView
                  ? `${previewClient?.name ?? accessibleClients[0]?.name ?? "Client"} workspace`
                  : `${activeUser.role} workspace`}
              </p>
              <h1>
                {workspaceSection === "Plans"
                  ? "Launch plans"
                  : clientView
                  ? "Your launch work, all in one place"
                  : `Good afternoon, ${activeUser.name.split(" ")[0]}`}
              </h1>
              <p>
                {workspaceSection === "Plans"
                  ? "Open a plan to review tasks, progress, comments, and activity."
                  : clientView
                  ? "See what’s complete, what SeatGeek is handling, and what needs your attention next."
                  : "Here’s what needs your attention across active launch plans."}
              </p>
            </section>

            {workspaceSection === "Home" && (
            <button className="attention-card" onClick={attentionView}>
              <span className="attention-icon">
                <AlertCircle size={25} />
              </span>
              <span className="attention-copy">
                <strong>
                  {clientView
                    ? "2 tasks are ready for your team"
                    : "3 items need your attention"}
                </strong>
                <span>
                  {clientView
                    ? "Review upcoming client tasks to keep your launch on track."
                    : "Review overdue tasks and blocked items to keep plans on track."}
                </span>
              </span>
              <span className="text-action">
                View tasks <ChevronRight size={18} />
              </span>
            </button>
            )}

            <div className="controls">
              <div className="tabs" role="tablist" aria-label="Launch plan views">
                {["My work", "All plans", "Templates"]
                  .filter((tab) => !(clientView && tab === "Templates"))
                  .map((tab) => (
                    <button
                      key={tab}
                      className={activeTab === tab ? "selected" : ""}
                      onClick={() => chooseTab(tab)}
                      role="tab"
                      aria-selected={activeTab === tab}
                    >
                      {clientView && tab === "My work" ? "My tasks" : tab}
                    </button>
                  ))}
              </div>
              <div className="filters">
                {!clientView && (
                  <label>
                    <span className="sr-only">Filter by client</span>
                    <select
                      value={clientFilter}
                      onChange={(event) => setClientFilter(event.target.value)}
                    >
                      <option>All clients</option>
                      {accessibleClients.map((client) => (
                        <option key={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  <span className="sr-only">Filter by status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option>All statuses</option>
                    <option>On track</option>
                    <option>3 overdue</option>
                    <option>Blocked</option>
                  </select>
                </label>
              </div>
            </div>

            <section className="summary-strip" aria-label="Launch summary">
              <div>
                <span className="summary-icon teal">
                  <FileText size={21} />
                </span>
                <span>
                  <small>{clientView ? "Active plans" : "Active plans"}</small>
                  <strong>{visiblePlans.length}</strong>
                </span>
              </div>
              <div>
                <span className="summary-icon amber">
                  <CalendarDays size={21} />
                </span>
                <span>
                  <small>Due this week</small>
                  <strong>2</strong>
                </span>
              </div>
              <div>
                <span className="summary-icon coral">
                  <AlertCircle size={21} />
                </span>
                <span>
                  <small>Needs attention</small>
                  <strong>{clientView ? "1" : "2"}</strong>
                </span>
              </div>
            </section>

            {activeTab === "Templates" ? (
              <section className="templates-section">
                <div className="section-heading">
                  <div>
                    <h2>Plan templates</h2>
                    <p>Start with a proven SeatGeek workflow.</p>
                  </div>
                  <Search size={20} />
                </div>
                <div className="template-grid">
                  {templateLibrary.map((template, index) => {
                    const taskCount = template.phases.reduce(
                      (total, phase) => total + phase.tasks.length,
                      0,
                    );
                    return (
                      <button
                        key={template.id}
                        className="template-card"
                        onClick={() => {
                          if (template.awaitingChecklist) {
                            setToast("Send the Playoffs checklist to finish this template");
                            window.setTimeout(() => setToast(null), 3000);
                            return;
                          }
                          openNewPlan(template.id);
                        }}
                        aria-disabled={template.awaitingChecklist}
                      >
                        <span className={`template-icon template-${(index % 3) + 1}`}>
                          <LayoutTemplate size={22} />
                        </span>
                        <strong>{template.title}</strong>
                        <span>
                          {template.awaitingChecklist
                            ? "Awaiting your checklist"
                            : `${template.overview ? `${template.overview} · ` : ""}${
                                template.venue ? `${template.venue} · ` : ""
                              }${taskCount} tasks · ${template.phases.length} phases`}
                        </span>
                        <ChevronRight size={18} />
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="plans-section">
                <div className="section-heading">
                  <div>
                    <h2>{clientView ? "Your active launch plan" : "Active launch plans"}</h2>
                    <p>
                      {visiblePlans.length}{" "}
                      {visiblePlans.length === 1
                        ? "plan"
                        : "plans"}{" "}
                      shown
                    </p>
                  </div>
                </div>
                <div className="plan-list">
                  {visiblePlans.map((plan) => (
                    <button
                      className="plan-row"
                      key={plan.id}
                      onClick={() => {
                        setDrawerPlan(plan);
                        setDrawerTab("Tasks");
                      }}
                    >
                      <span className={`plan-avatar ${plan.tint}`}>
                        {plan.initials}
                      </span>
                      <span className="plan-identity">
                        <small>{plan.client}</small>
                        <strong>{plan.title}</strong>
                      </span>
                      <span className="plan-progress">
                        <strong>{plan.progress}%</strong>
                        <span className="progress-track">
                          <span
                            style={{ width: `${plan.progress}%` }}
                            className={plan.status === "3 overdue" ? "overdue" : ""}
                          />
                        </span>
                      </span>
                      <span className="plan-date">
                        <CalendarDays size={17} />
                        {plan.targetDate ?? "No target date"}
                      </span>
                      <span
                        className={`status-pill status-${plan.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {plan.status}
                      </span>
                      <ChevronRight className="row-chevron" size={20} />
                    </button>
                  ))}
                  {!clientView && visiblePlans.length === 0 && (
                    <div className="empty-state">
                      <Search size={24} />
                      <strong>No launch plans match these filters</strong>
                      <button
                        onClick={() => {
                          setClientFilter("All clients");
                          setStatusFilter("All statuses");
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
              </>
            )}
          </div>

          {workspaceSection === "Home" && (
          <aside className="tasks-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">Next actions</span>
                <h2>Upcoming tasks</h2>
              </div>
              <span className="task-count">
                {tasks.filter((task) => !task.complete).length}
              </span>
            </div>
            <div className="task-list">
              {tasks
                .filter((task) => !clientView || task.owner !== "CSS")
                .map((task) => (
                  <div className={`task-item ${task.complete ? "complete" : ""}`} key={task.id}>
                    <button
                      className="task-check"
                      onClick={() => finishTask(task)}
                      aria-label={
                        task.complete
                          ? `Reopen ${task.title}`
                          : `Complete ${task.title}`
                      }
                    >
                      {task.complete && <Check size={17} strokeWidth={3} />}
                    </button>
                    <div className="task-copy">
                      <strong>{task.title}</strong>
                      <span>
                        <CalendarDays size={15} />
                        {task.due}
                      </span>
                    </div>
                    <span className={`owner-chip owner-${task.owner.toLowerCase()}`}>
                      {clientView && task.owner === "Client" ? "Your team" : task.owner}
                    </span>
                  </div>
                ))}
            </div>
            <button className="panel-action" onClick={attentionView}>
              View all tasks <ChevronRight size={18} />
            </button>
            <div className="help-card">
              <CircleHelp size={20} />
              <div>
                <strong>Need help?</strong>
                <span>
                  {clientView
                    ? "Ask your CSS a question from any task."
                    : "Open the launch playbook or ask the portal assistant."}
                </span>
              </div>
            </div>
          </aside>
          )}
        </div>
      </section>

      {sessionAccess?.mode !== "authenticated" && (
      <div className="account-switcher" aria-label="Demo sign-in accounts">
        <span className="account-switcher-label">
          <LockKeyhole size={12} /> Demo sign-in
        </span>
        {users
          .filter((user) => (user.accountStatus ?? "Demo") === "Demo")
          .map((user) => (
          <button
            className={activeUser.id === user.id ? "active" : ""}
            onClick={() => switchUser(user.id)}
            key={user.id}
            title={`${user.name} · ${user.role}`}
            aria-pressed={activeUser.id === user.id}
          >
            <span>{user.initials}</span>
            {user.role}
          </button>
          ))}
      </div>
      )}

      {resourceModalOpen && (
        <div
          className="modal-layer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resource-modal-title"
        >
          <button
            className="modal-scrim"
            onClick={closeResourceManager}
            aria-label="Close resource management"
          />
          <section className="modal-card admin-modal-card">
            <div className="modal-header">
              <div>
                <span className="modal-step">Resource library</span>
                <h2 id="resource-modal-title">
                  {editingResourceId ? "Edit resource" : "Add a resource"}
                </h2>
                <p>
                  Add an external web link and choose which portal roles can see it.
                </p>
              </div>
              <button onClick={closeResourceManager} aria-label="Close">
                <X size={21} />
              </button>
            </div>
            <div className="admin-form">
              <label>
                <span>Resource name</span>
                <input
                  autoFocus
                  value={resourceTitle}
                  onChange={(event) => {
                    setResourceTitle(event.target.value);
                    setResourceFormError("");
                  }}
                  placeholder="Example: SeatGeek Help Center"
                />
              </label>
              <label>
                <span>Web address</span>
                <input
                  type="url"
                  value={resourceUrl}
                  onChange={(event) => {
                    setResourceUrl(event.target.value);
                    setResourceFormError("");
                  }}
                  placeholder="https://example.com"
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  value={resourceDescription}
                  onChange={(event) => {
                    setResourceDescription(event.target.value);
                    setResourceFormError("");
                  }}
                  placeholder="Optional short explanation of when to use this link."
                />
              </label>
              <label>
                <span>Who can see this link?</span>
                <select
                  value={resourceAudience}
                  onChange={(event) => {
                    setResourceAudience(event.target.value as ResourceAudience);
                    setResourceFormError("");
                  }}
                >
                  <option value="Both">CSS and Client</option>
                  <option value="CSS">CSS only</option>
                  <option value="Client">Client only</option>
                </select>
              </label>
              <div className="admin-form-notice">
                <ShieldCheck size={17} />
                <span>
                  The saved link will appear only for the selected audience and will
                  open in a separate browser tab.
                </span>
              </div>
              {resourceFormError && (
                <p className="form-error" role="alert">
                  {resourceFormError}
                </p>
              )}
              <div className="modal-footer admin-modal-footer">
                <button className="secondary-button" onClick={closeResourceManager}>
                  Cancel
                </button>
                <button className="primary-button" onClick={saveResourceLink}>
                  <Link2 size={17} />
                  {editingResourceId ? "Save changes" : "Save resource"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {adminModal && (
        <div
          className="modal-layer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-modal-title"
        >
          <button
            className="modal-scrim"
            onClick={closeAdminManager}
            aria-label="Close user management"
          />
          <section className="modal-card admin-modal-card">
            <div className="modal-header">
              <div>
                <span className="modal-step">
                  {adminModal === "client" ? "Client directory" : "User directory"}
                </span>
                <h2 id="admin-modal-title">
                  {adminModal === "client"
                    ? editingClientId
                      ? "Edit client"
                      : "Add a client"
                    : editingUserId
                      ? "Manage user access"
                      : "Add a user"}
                </h2>
                <p>
                  {adminModal === "client"
                    ? "Assign up to six CSS users and add the client emails approved for this workspace. Both can be updated later."
                    : "Save the person’s role and client access. This will not send an invitation."}
                </p>
              </div>
              <button onClick={closeAdminManager} aria-label="Close">
                <X size={21} />
              </button>
            </div>

            {adminModal === "client" ? (
              <div className="admin-form">
                <label>
                  <span>Client name</span>
                  <input
                    autoFocus
                    value={newClientName}
                    onChange={(event) => {
                      setNewClientName(event.target.value);
                      setAdminFormError("");
                    }}
                    placeholder="Example: KC Current"
                  />
                </label>
                <fieldset className="client-access-picker">
                  <legend>Assigned CSS users · {newClientCssIds.length} of 6</legend>
                  <p>
                    Optional. Choose up to six CSS users now, or link them later.
                  </p>
                  <div>
                    {users.filter((user) => user.role === "CSS").length ? (
                      users
                        .filter((user) => user.role === "CSS")
                        .map((user) => {
                          const checked = newClientCssIds.includes(user.id);
                          const atLimit = newClientCssIds.length >= 6 && !checked;
                          return (
                            <label
                              className={`${checked ? "selected" : ""} ${
                                atLimit ? "disabled" : ""
                              }`}
                              key={user.id}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={atLimit}
                                onChange={(event) => {
                                  setNewClientCssIds((current) =>
                                    event.target.checked
                                      ? current.length < 6
                                        ? Array.from(new Set([...current, user.id]))
                                        : current
                                      : current.filter((id) => id !== user.id),
                                  );
                                  setAdminFormError("");
                                }}
                              />
                              <span className="user-avatar role-css">
                                {user.initials}
                              </span>
                              <strong>{user.name}</strong>
                            </label>
                          );
                        })
                    ) : (
                      <p className="empty-picker-copy">
                        No CSS users have been added yet. You can save this client
                        and assign CSS users later.
                      </p>
                    )}
                  </div>
                </fieldset>
                <label>
                  <span>
                    Approved client-user emails <small>Optional</small>
                  </span>
                  <textarea
                    value={newClientEmails}
                    onChange={(event) => {
                      setNewClientEmails(event.target.value);
                      setAdminFormError("");
                    }}
                    rows={4}
                    placeholder={"alex@client.com\njordan@client.com"}
                  />
                  <small className="field-help">
                    Enter one email per line, or separate addresses with commas.
                    Saving does not send an invitation.
                  </small>
                </label>
                <div className="admin-form-notice">
                  <LockKeyhole size={17} />
                  <span>
                    Clients and CSS users can still be added, edited, linked, or
                    removed after the portal launches.
                  </span>
                </div>
                {adminFormError && (
                  <p className="form-error" role="alert">
                    {adminFormError}
                  </p>
                )}
                <div className="modal-footer admin-modal-footer">
                  <button className="secondary-button" onClick={closeAdminManager}>
                    Cancel
                  </button>
                  <button className="primary-button" onClick={saveClientRecord}>
                    <Building2 size={17} />{" "}
                    {editingClientId ? "Save changes" : "Save client"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="admin-form">
                <div className="admin-form-row">
                  <label>
                    <span>Full name</span>
                    <input
                      autoFocus
                      value={userName}
                      onChange={(event) => {
                        setUserName(event.target.value);
                        setAdminFormError("");
                      }}
                      placeholder="Full name"
                    />
                  </label>
                  <label>
                    <span>Work email</span>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(event) => {
                        setUserEmail(event.target.value);
                        setAdminFormError("");
                      }}
                      placeholder="name@organization.com"
                    />
                  </label>
                </div>
                <label>
                  <span>Role</span>
                  <select
                    value={userRole}
                    onChange={(event) => {
                      const nextRole = event.target.value as UserRole;
                      setUserRole(nextRole);
                      setUserClientIds((current) =>
                        nextRole === "Admin"
                          ? clients.map((client) => client.id)
                          : nextRole === "Client"
                            ? current.slice(0, 1)
                            : current,
                      );
                      setAdminFormError("");
                    }}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Client">Client</option>
                    <option value="CSS">CSS</option>
                  </select>
                </label>
                {userRole === "Admin" ? (
                  <div className="admin-form-notice">
                    <ShieldCheck size={17} />
                    <span>
                      <strong>Admins receive full portal control.</strong> They can see
                      every client and plan and manage clients, users, assignments,
                      tasks, comments, notes, activation, and activity history.
                    </span>
                  </div>
                ) : (
                  <fieldset className="client-access-picker">
                    <legend>
                      {userRole === "Client"
                        ? "Client workspace"
                        : "Assigned clients"}
                    </legend>
                    <p>
                      {userRole === "Client"
                        ? "Optional. A client user can be saved now and linked to one client workspace later."
                        : "Optional. A CSS can be saved now and assigned clients later."}
                    </p>
                    <div>
                    {userRole === "Client" && (
                      <label className={userClientIds.length === 0 ? "selected" : ""}>
                        <input
                          type="radio"
                          name="user-client-access"
                          checked={userClientIds.length === 0}
                          onChange={() => {
                            setUserClientIds([]);
                            setAdminFormError("");
                          }}
                        />
                        <span className="plan-avatar coral">—</span>
                        <strong>Not linked yet</strong>
                      </label>
                    )}
                    {clients.map((client) => {
                      const checked = userClientIds.includes(client.id);
                      const otherLinkedCssCount = users.filter(
                        (user) =>
                          user.role === "CSS" &&
                          user.id !== editingUserId &&
                          user.clientIds.includes(client.id),
                      ).length;
                      const cssLimitReached =
                        userRole === "CSS" &&
                        !checked &&
                        otherLinkedCssCount >= 6;
                      return (
                        <label
                          className={`${checked ? "selected" : ""} ${
                            cssLimitReached ? "disabled" : ""
                          }`}
                          key={client.id}
                        >
                          <input
                            type={userRole === "Client" ? "radio" : "checkbox"}
                            name="user-client-access"
                            checked={checked}
                            disabled={cssLimitReached}
                            onChange={(event) => {
                              setUserClientIds((current) => {
                                if (userRole === "Client") return [client.id];
                                if (event.target.checked && cssLimitReached) {
                                  return current;
                                }
                                return event.target.checked
                                  ? Array.from(new Set([...current, client.id]))
                                  : current.filter((id) => id !== client.id);
                              });
                              setAdminFormError("");
                            }}
                          />
                          <span className={`plan-avatar ${client.tint}`}>
                            {client.initials}
                          </span>
                          <strong>
                            {client.name}
                            {cssLimitReached ? " · 6 CSS assigned" : ""}
                          </strong>
                        </label>
                      );
                    })}
                    </div>
                  </fieldset>
                )}
                <div className="admin-form-notice">
                  <ShieldCheck size={17} />
                  <span>
                    New users, including Admins, remain <strong>Not activated</strong>.
                    A current Admin can activate them later; saving never creates a
                    portal password.
                  </span>
                </div>
                {adminFormError && (
                  <p className="form-error" role="alert">
                    {adminFormError}
                  </p>
                )}
                <div className="modal-footer admin-modal-footer">
                  <button className="secondary-button" onClick={closeAdminManager}>
                    Cancel
                  </button>
                  <button className="primary-button" onClick={saveUserRecord}>
                    <UserPlus size={17} />{" "}
                    {editingUserId ? "Save changes" : "Save user record"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {newPlanOpen && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button
            className="modal-scrim"
            onClick={() => setNewPlanOpen(false)}
            aria-label="Close new launch plan"
          />
          <section className="modal-card">
            <div className="modal-header">
              <div>
                <span className="modal-step">Step {newPlanStep} of 3</span>
                <h2 id="modal-title">
                  {newPlanStep === 1
                    ? "Choose a task list"
                    : newPlanStep === 2
                      ? "Set up the plan"
                      : "Assign every task"}
                </h2>
                <p>
                  {newPlanStep === 1
                    ? "Start with one of the task lists you provided."
                    : newPlanStep === 2
                      ? "Choose a stored client. A target date is optional."
                      : "Ownership starts blank. The CSS chooses CSS, Client, or Both."}
                </p>
              </div>
              <button onClick={() => setNewPlanOpen(false)} aria-label="Close">
                <X size={21} />
              </button>
            </div>
            {newPlanStep === 1 && (
              <>
                <div className="modal-options">
                  {templateLibrary.map((template, index) => {
                    const taskCount = template.phases.reduce(
                      (total, phase) => total + phase.tasks.length,
                      0,
                    );
                    return (
                      <button
                        className="modal-option"
                        key={template.id}
                        onClick={() => {
                          if (template.awaitingChecklist) {
                            setToast("Send the Playoffs checklist to finish this template");
                            window.setTimeout(() => setToast(null), 3000);
                            return;
                          }
                          chooseTemplate(template.id);
                        }}
                        aria-disabled={template.awaitingChecklist}
                      >
                        <span className={`template-icon template-${(index % 3) + 1}`}>
                          <LayoutTemplate size={22} />
                        </span>
                        <span>
                          <strong>{template.title}</strong>
                          <small>
                            {template.awaitingChecklist
                              ? "Ready for the checklist you send"
                              : `${template.overview ? `${template.overview} · ` : ""}${
                                  template.venue ? `${template.venue} · ` : ""
                                }${taskCount} tasks across ${template.phases.length} phases`}
                          </small>
                        </span>
                        <ChevronRight size={19} />
                      </button>
                    );
                  })}
                </div>
                <button className="blank-plan">
                  <Plus size={17} /> Start with a custom plan
                </button>
              </>
            )}

            {newPlanStep === 2 && selectedTemplate && (
              <div className="plan-setup">
                <div className="selected-template-summary">
                  <span className="template-icon template-1">
                    <LayoutTemplate size={22} />
                  </span>
                  <span>
                    <small>Selected task list</small>
                    <strong>{selectedTemplate.title}</strong>
                  </span>
                  <button onClick={() => setNewPlanStep(1)}>Change</button>
                </div>
                <label className="form-field">
                  <span>Client or organization</span>
                  <select
                    value={planClient}
                    onChange={(event) => setPlanClient(event.target.value)}
                    autoFocus
                  >
                    <option value="">Choose a stored client</option>
                    {accessibleClients.map((client) => (
                      <option value={client.id} key={client.id}>
                        {client.name} · CSS:{" "}
                        {client.cssContacts.length
                          ? client.cssContacts.join(", ")
                          : "Not assigned"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>
                    Target launch date <small>Optional</small>
                  </span>
                  <input
                    type="date"
                    value={planTargetDate}
                    onChange={(event) => setPlanTargetDate(event.target.value)}
                  />
                </label>
                <div className="modal-footer">
                  <button className="secondary-button" onClick={() => setNewPlanStep(1)}>
                    Back
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => setNewPlanStep(3)}
                    disabled={!planClient}
                  >
                    Assign task owners <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            )}

            {newPlanStep === 3 && selectedTemplate && (
              <div className="owner-assignment">
                <div className="owner-assignment-toolbar">
                  <span>
                    <strong>
                      {assignedOwnerCount} of {selectedTemplateTasks.length} assigned
                    </strong>
                    <small>Every task starts with no owner.</small>
                  </span>
                  <div>
                    <button onClick={() => assignAllOwners("CSS")}>All CSS</button>
                    <button onClick={() => assignAllOwners("Client")}>All Client</button>
                    <button onClick={() => assignAllOwners("Both")}>All Both</button>
                  </div>
                </div>
                <div className="owner-assignment-list">
                  {selectedTemplate.phases.map((phase) => (
                    <section key={phase.name}>
                      <h3>{phase.name}</h3>
                      {phase.tasks.map((taskTitle, taskIndex) => {
                        const taskId = `${selectedTemplate.id}-${phase.name}-${taskIndex}`;
                        return (
                          <label className="owner-assignment-row" key={taskId}>
                            <span>{taskTitle}</span>
                            <select
                              value={ownerAssignments[taskId] ?? ""}
                              onChange={(event) =>
                                setOwnerAssignments((current) => ({
                                  ...current,
                                  [taskId]: event.target.value as AssignableOwner,
                                }))
                              }
                              aria-label={`Owner for ${taskTitle}`}
                            >
                              <option value="">Choose owner</option>
                              <option value="CSS">CSS</option>
                              <option value="Client">Client</option>
                              <option value="Both">Both</option>
                            </select>
                          </label>
                        );
                      })}
                    </section>
                  ))}
                </div>
                <div className="modal-footer owner-footer">
                  <button className="secondary-button" onClick={() => setNewPlanStep(2)}>
                    Back
                  </button>
                  <button
                    className="primary-button"
                    onClick={createPlan}
                    disabled={assignedOwnerCount !== selectedTemplateTasks.length}
                  >
                    Create plan
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {confirmTask && (
        <div className="modal-layer confirmation" role="dialog" aria-modal="true">
          <button
            className="modal-scrim"
            onClick={() => setConfirmTask(null)}
            aria-label="Cancel"
          />
          <section className="confirm-card">
            <span className="confirm-icon">
              <CheckSquare2 size={24} />
            </span>
            <h2>Mark this task complete?</h2>
            <p>
              “{confirmTask.title}” is assigned to{" "}
              {confirmTask.owner === "Client" ? "the client" : "both teams"}.
            </p>
            <div>
              <button className="secondary-button" onClick={() => setConfirmTask(null)}>
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  toggleTask(confirmTask.id);
                  setConfirmTask(null);
                }}
              >
                Mark complete
              </button>
            </div>
          </section>
        </div>
      )}

      {drawerPlan && (
        <div className="drawer-layer">
          <button
            className="drawer-scrim"
            onClick={() => setDrawerPlan(null)}
            aria-label="Close launch plan"
          />
          <aside className="plan-drawer" aria-label={`${drawerPlan.title} details`}>
            <div className="drawer-header">
              <button onClick={() => setDrawerPlan(null)} aria-label="Close">
                <X size={21} />
              </button>
              <span className={`plan-avatar ${drawerPlan.tint}`}>
                {drawerPlan.initials}
              </span>
              <div>
                <small>{drawerPlan.client}</small>
                <h2>{drawerPlan.title}</h2>
              </div>
              <span className={`status-pill status-${drawerPlan.status.toLowerCase().replace(" ", "-")}`}>
                {drawerPlan.status}
              </span>
            </div>
            <div className="drawer-progress">
              <span>
                <strong>{drawerPlan.progress}% complete</strong>
                <small>
                  {drawerPlan.targetDate
                    ? `Target launch: ${drawerPlan.targetDate}`
                    : "No target launch date"}
                </small>
              </span>
              <span className="progress-track">
                <span style={{ width: `${drawerPlan.progress}%` }} />
              </span>
            </div>
            <div className="drawer-tabs">
              {(["Tasks", "Activity", "Files"] as const).map((tab) => (
                <button
                  className={drawerTab === tab ? "active" : ""}
                  onClick={() => setDrawerTab(tab)}
                  key={tab}
                >
                  {tab}
                </button>
              ))}
            </div>
            {drawerTab === "Tasks" && (
            <div className="drawer-phases">
              {(drawerPlan.phases ?? planTasks)
                .filter(
                  (group) =>
                    !clientView ||
                    group.tasks.some((task) => task.visibility === "Shared"),
                )
                .map((group) => (
                <section key={group.phase}>
                  <div className="phase-heading">
                    <div>
                      <h3>{group.phase}</h3>
                      <span>
                        {
                          group.tasks.filter(
                            (task) =>
                              planTaskCompletion[
                                `${drawerPlan.id}:${task.id}`
                              ] ?? task.complete,
                          ).length
                        }{" "}
                        of {group.tasks.length} complete
                      </span>
                    </div>
                    <ChevronDown size={18} />
                  </div>
                  {group.tasks
                    .filter((task) => !clientView || task.visibility === "Shared")
                    .map((task) => {
                      const taskComments = comments.filter(
                        (comment) =>
                          comment.planId === drawerPlan.id &&
                          comment.taskId === task.id &&
                          (!clientView || comment.visibility === "Shared"),
                      );
                      const isOpen = openTaskId === task.id;
                      const taskComplete =
                        planTaskCompletion[`${drawerPlan.id}:${task.id}`] ??
                        task.complete;

                      return (
                        <div
                          className={`drawer-task-shell ${isOpen ? "conversation-open" : ""}`}
                          key={task.title}
                        >
                          <div className="drawer-task">
                            <button
                              className={`mini-check ${taskComplete ? "checked" : ""}`}
                              onClick={() => togglePlanTask(task)}
                              aria-label={
                                taskComplete
                                  ? `Reopen ${task.title}`
                                  : `Complete ${task.title}`
                              }
                            >
                              {taskComplete && <Check size={13} strokeWidth={3} />}
                            </button>
                            <span>
                              <strong>{task.title}</strong>
                              <small>
                                {task.due} · {task.owner}
                              </small>
                              <button
                                className="comment-trigger"
                                onClick={() => {
                                  setOpenTaskId(isOpen ? null : task.id);
                                  setCommentDraft("");
                                  setCommentVisibility("Shared");
                                }}
                                aria-expanded={isOpen}
                              >
                                <MessageCircle size={13} />
                                {taskComments.length === 0
                                  ? "Add comment"
                                  : `${taskComments.length} ${
                                      taskComments.length === 1 ? "comment" : "comments"
                                    }`}
                              </button>
                            </span>
                            {task.visibility === "SeatGeek only" && (
                              <span className="private-chip">
                                <LockKeyhole size={12} /> Internal
                              </span>
                            )}
                          </div>

                          {isOpen && (
                            <div className="task-conversation">
                              <div className="conversation-heading">
                                <div>
                                  <span>Task conversation</span>
                                  <small>
                                    {clientView
                                      ? "Shared with your team and SeatGeek"
                                      : "Choose who can see your message"}
                                  </small>
                                </div>
                                {!clientView && (
                                  <div
                                    className="visibility-switch"
                                    aria-label="Comment visibility"
                                  >
                                    <button
                                      className={
                                        commentVisibility === "Shared" ? "active shared" : ""
                                      }
                                      onClick={() => setCommentVisibility("Shared")}
                                    >
                                      <Users size={12} /> Shared
                                    </button>
                                    <button
                                      className={
                                        commentVisibility === "Internal"
                                          ? "active internal"
                                          : ""
                                      }
                                      onClick={() => setCommentVisibility("Internal")}
                                    >
                                      <LockKeyhole size={12} /> Internal note
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="comment-list">
                                {taskComments.length === 0 ? (
                                  <div className="no-comments">
                                    <MessageCircle size={18} />
                                    <span>No comments yet. Start the conversation.</span>
                                  </div>
                                ) : (
                                  taskComments.map((comment) => (
                                    <article
                                      className={`comment-card ${
                                        comment.visibility === "Internal" ? "internal" : ""
                                      }`}
                                      key={comment.id}
                                    >
                                      <span className="comment-avatar">
                                        {makeInitials(comment.author)}
                                      </span>
                                      <div>
                                        <header>
                                          <strong>{comment.author}</strong>
                                          {comment.visibility === "Internal" && (
                                            <span>
                                              <LockKeyhole size={10} /> SeatGeek only
                                            </span>
                                          )}
                                          <time>{comment.timestamp}</time>
                                        </header>
                                        <p>{renderCommentBody(comment.body, users)}</p>
                                      </div>
                                    </article>
                                  ))
                                )}
                              </div>

                              <div
                                className={`comment-composer ${
                                  commentVisibility === "Internal" && !clientView
                                    ? "internal"
                                    : ""
                                }`}
                              >
                                <div className="comment-input-wrap">
                                  <textarea
                                    value={commentDraft}
                                    onChange={(event) => setCommentDraft(event.target.value)}
                                    placeholder={
                                      commentVisibility === "Internal" && !clientView
                                        ? "Add a SeatGeek-only note… Type @ to tag a CSS or Admin."
                                        : "Write a shared comment… Type @ to tag someone."
                                    }
                                    rows={3}
                                  />
                                  {mentionQuery !== null && (
                                    <div
                                      className="mention-menu"
                                      role="listbox"
                                      aria-label="People you can mention"
                                    >
                                      {mentionSuggestions.length ? (
                                        mentionSuggestions.map((user) => (
                                          <button
                                            type="button"
                                            role="option"
                                            aria-selected="false"
                                            onClick={() => insertMention(user)}
                                            key={user.id}
                                          >
                                            <span>{user.initials}</span>
                                            <span>
                                              <strong>{user.name}</strong>
                                              <small>
                                                @{makeMentionHandle(user)} · {user.role}
                                              </small>
                                            </span>
                                          </button>
                                        ))
                                      ) : (
                                        <p>No matching users for this client.</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <span>
                                    {commentVisibility === "Internal" && !clientView ? (
                                      <>
                                        <LockKeyhole size={12} /> Only SeatGeek employees can
                                        see this
                                      </>
                                    ) : (
                                      <>
                                        <AtSign size={12} /> Type @ to tag a portal user
                                      </>
                                    )}
                                  </span>
                                  <button
                                    onClick={() => addComment(task.id)}
                                    disabled={!commentDraft.trim()}
                                  >
                                    <Send size={13} /> Post
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </section>
                ))}
            </div>
            )}
            {drawerTab === "Activity" && (
              <div className="activity-panel">
                <div className="activity-intro">
                  <ShieldCheck size={19} />
                  <span>
                    <strong>Saved activity history</strong>
                    <small>Changes are recorded with the demo account that made them.</small>
                  </span>
                </div>
                <div className="activity-list">
                  {activity.filter(
                    (entry) =>
                      entry.entityId === drawerPlan.id ||
                      entry.entityType === "workspace",
                  ).length === 0 ? (
                    <div className="activity-empty">
                      <MessageCircle size={20} />
                      <span>No saved activity for this plan yet.</span>
                    </div>
                  ) : (
                    activity
                      .filter(
                        (entry) =>
                          entry.entityId === drawerPlan.id ||
                          entry.entityType === "workspace",
                      )
                      .map((entry) => (
                        <article className="activity-row" key={entry.id}>
                          <span className="activity-dot" />
                          <div>
                            <strong>{entry.action}</strong>
                            <span>{entry.detail}</span>
                            <small>
                              {entry.actorName} ·{" "}
                              {new Date(entry.createdAt).toLocaleString()}
                            </small>
                          </div>
                        </article>
                      ))
                  )}
                </div>
              </div>
            )}
            {drawerTab === "Files" && (
              <div className="files-panel">
                <div className="files-upload-card">
                  <div>
                    <span className="files-icon"><Upload size={20} /></span>
                    <div>
                      <strong>Attach a file to this task</strong>
                      <span>
                        PDF, Word, Excel, CSV, text, JPG, or PNG · 10 MB maximum
                      </span>
                    </div>
                  </div>
                  <div className="files-upload-actions">
                    {!clientView && (
                      <select
                        value={commentVisibility}
                        onChange={(event) =>
                          setCommentVisibility(event.target.value as CommentVisibility)
                        }
                        aria-label="File visibility"
                      >
                        <option value="Shared">Shared with client</option>
                        <option value="Internal">SeatGeek only</option>
                      </select>
                    )}
                    <label className="file-upload-button">
                      <Paperclip size={16} />
                      {uploadingFile ? "Uploading…" : "Choose file"}
                      <input
                        type="file"
                        disabled={uploadingFile}
                        accept=".pdf,.docx,.xlsx,.csv,.txt,.jpg,.jpeg,.png"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadTaskFile(file);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="file-list">
                  {attachments.filter(
                    (attachment) =>
                      attachment.planId === drawerPlan.id &&
                      (!clientView || attachment.visibility !== "Internal"),
                  ).length ? (
                    attachments
                      .filter(
                        (attachment) =>
                          attachment.planId === drawerPlan.id &&
                          (!clientView || attachment.visibility !== "Internal"),
                      )
                      .map((attachment) => {
                        const linkedTask = drawerPlan.phases
                          ?.flatMap((phase) => phase.tasks)
                          .find((task) => task.id === attachment.taskId);
                        return (
                          <article className="file-row" key={attachment.id}>
                            <span className="files-icon"><FileText size={18} /></span>
                            <div>
                              <strong>{attachment.fileName}</strong>
                              <span>
                                {linkedTask?.title ?? "Launch plan file"} · {formatFileSize(attachment.size)}
                              </span>
                              <small>
                                {attachment.uploadedByName} · {attachment.visibility}
                              </small>
                            </div>
                            <a href={`/api/files/${attachment.id}`}>
                              <Download size={16} /> Download
                            </a>
                          </article>
                        );
                      })
                  ) : (
                    <div className="files-empty-state">
                      <FileText size={26} />
                      <strong>No files attached yet</strong>
                      <span>Files added here stay with this launch plan and task.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </main>
  );
}
