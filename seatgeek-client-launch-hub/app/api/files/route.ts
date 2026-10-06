import { desc } from "drizzle-orm";
import { activityLog, fileAttachments } from "../../../db/schema";
import {
  canAccessClient,
  getFilesBucket,
  getPortalFileContext,
} from "./file-access";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "text/csv",
  "text/plain",
]);

export async function GET(request: Request) {
  try {
    const context = await getPortalFileContext(request);
    if ("error" in context) {
      return Response.json({ error: context.error }, { status: context.status });
    }
    const rows = await context.db
      .select({
        id: fileAttachments.id,
        clientId: fileAttachments.clientId,
        planId: fileAttachments.planId,
        taskId: fileAttachments.taskId,
        messageId: fileAttachments.messageId,
        fileName: fileAttachments.fileName,
        contentType: fileAttachments.contentType,
        size: fileAttachments.size,
        uploadedByName: fileAttachments.uploadedByName,
        uploadedByRole: fileAttachments.uploadedByRole,
        visibility: fileAttachments.visibility,
        createdAt: fileAttachments.createdAt,
      })
      .from(fileAttachments)
      .orderBy(desc(fileAttachments.createdAt));
    const attachments = rows.filter(
      (row) =>
        canAccessClient(context.session, row.clientId) &&
        (context.session.role !== "Client" || row.visibility !== "Internal"),
    );
    return Response.json({ attachments });
  } catch {
    return Response.json(
      { error: "Secure file storage is temporarily unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  let objectKey: string | null = null;
  try {
    const context = await getPortalFileContext(request);
    if ("error" in context) {
      return Response.json({ error: context.error }, { status: context.status });
    }
    const form = await request.formData();
    const file = form.get("file");
    const clientId = String(form.get("clientId") ?? "").trim();
    const planId = String(form.get("planId") ?? "").trim() || null;
    const taskId = String(form.get("taskId") ?? "").trim() || null;
    const messageId = String(form.get("messageId") ?? "").trim() || null;
    const requestedVisibility = String(form.get("visibility") ?? "Shared");
    const visibility = requestedVisibility === "Internal" ? "Internal" : "Shared";

    if (!(file instanceof File) || !clientId) {
      return Response.json({ error: "Choose a file and client." }, { status: 400 });
    }
    if (!canAccessClient(context.session, clientId)) {
      return Response.json({ error: "You cannot upload to this client." }, { status: 403 });
    }
    if (context.session.role === "Client" && visibility === "Internal") {
      return Response.json({ error: "Clients can only upload shared files." }, { status: 403 });
    }
    if (!file.size || file.size > MAX_FILE_BYTES) {
      return Response.json({ error: "Files must be between 1 byte and 10 MB." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        { error: "Use a PDF, Word, Excel, CSV, text, JPG, or PNG file." },
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    objectKey = `${clientId}/${id}`;
    const bucket = getFilesBucket();
    await bucket.put(objectKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    await context.db.insert(fileAttachments).values({
      id,
      clientId,
      planId,
      taskId,
      messageId,
      objectKey,
      fileName: file.name.slice(0, 180),
      contentType: file.type,
      size: file.size,
      uploadedById: context.session.userId,
      uploadedByName: context.session.name,
      uploadedByRole: context.session.role,
      visibility,
    });
    await context.db.insert(activityLog).values({
      actorId: context.session.userId,
      actorName: context.session.name,
      requesterEmail: context.session.email,
      action: "Uploaded file",
      entityType: planId ? "plan" : "message",
      entityId: planId ?? messageId ?? clientId,
      detail: file.name.slice(0, 180),
    });
    return Response.json({
      attachment: {
        id,
        clientId,
        planId,
        taskId,
        messageId,
        fileName: file.name.slice(0, 180),
        contentType: file.type,
        size: file.size,
        uploadedByName: context.session.name,
        uploadedByRole: context.session.role,
        visibility,
        createdAt: new Date().toISOString(),
      },
    });
  } catch {
    if (objectKey) {
      try {
        await getFilesBucket().delete(objectKey);
      } catch {}
    }
    return Response.json(
      { error: "The file could not be uploaded. Please try again." },
      { status: 500 },
    );
  }
}
