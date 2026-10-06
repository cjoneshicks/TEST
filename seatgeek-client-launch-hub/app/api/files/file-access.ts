import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { portalState } from "../../../db/schema";

type UserRole = "Admin" | "CSS" | "Client";

type PortalFileObject = {
  body: ReadableStream;
};

type PortalFilesBucket = {
  put(
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<PortalFileObject | null>;
  delete(key: string): Promise<void>;
};

type PortalUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus?: string;
  clientId?: string;
  clientIds?: string[];
};

type StoredState = {
  clients?: Array<{ id: string }>;
  users?: PortalUser[];
};

export type PortalFileSession = {
  email: string | null;
  userId: string;
  name: string;
  role: UserRole;
  clientIds: string[];
};

type FileRuntime = typeof globalThis & {
  __SEATGEEK_PORTAL_ENV__?: { FILES?: PortalFilesBucket };
};

const ADMIN_EMAILS = new Set([
  "cjoneshicks@seatgeek.com",
  "dsimpson@seatgeek.com",
]);

function isLocalPreview(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "terminal.local" || hostname === "localhost";
}

function decodeForwardedName(request: Request) {
  const value = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get(
    "oai-authenticated-user-full-name-encoding",
  );
  if (!value || encoding !== "percent-encoded-utf-8") return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export async function getPortalFileContext(request: Request) {
  const db = getDb();
  const rows = await db
    .select()
    .from(portalState)
    .where(eq(portalState.id, 1))
    .limit(1);
  const state = rows[0]?.stateJson
    ? (JSON.parse(rows[0].stateJson) as StoredState)
    : null;
  const email = request.headers
    .get("oai-authenticated-user-email")
    ?.trim()
    .toLowerCase();
  const forwardedName = decodeForwardedName(request);

  if (!email) {
    if (!isLocalPreview(request)) {
      return { error: "Please sign in to access files.", status: 401 as const };
    }
    return {
      db,
      state,
      session: {
        email: null,
        userId: "admin-demo",
        name: "SeatGeek Admin",
        role: "Admin" as const,
        clientIds: state?.clients?.map((client) => client.id) ?? [],
      },
    };
  }

  if (ADMIN_EMAILS.has(email)) {
    return {
      db,
      state,
      session: {
        email,
        userId: "admin-demo",
        name: forwardedName ?? email,
        role: "Admin" as const,
        clientIds: state?.clients?.map((client) => client.id) ?? [],
      },
    };
  }

  const user = state?.users?.find(
    (candidate) => candidate.email.trim().toLowerCase() === email,
  );
  if (!user || user.accountStatus !== "Active") {
    return { error: "Your portal account is not active.", status: 403 as const };
  }
  return {
    db,
    state,
    session: {
      email,
      userId: user.id,
      name: user.name || forwardedName || email,
      role: user.role,
      clientIds: user.clientIds ?? (user.clientId ? [user.clientId] : []),
    },
  };
}

export function canAccessClient(session: PortalFileSession, clientId: string) {
  return session.role === "Admin" || session.clientIds.includes(clientId);
}

export function getFilesBucket() {
  const bucket = (globalThis as FileRuntime).__SEATGEEK_PORTAL_ENV__?.FILES;
  if (!bucket) throw new Error("Secure file storage is unavailable.");
  return bucket;
}
