import { eq } from "drizzle-orm";
import { fileAttachments } from "../../../../db/schema";
import {
  canAccessClient,
  getFilesBucket,
  getPortalFileContext,
} from "../file-access";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const access = await getPortalFileContext(request);
    if ("error" in access) {
      return Response.json({ error: access.error }, { status: access.status });
    }
    const { id } = await context.params;
    const rows = await access.db
      .select()
      .from(fileAttachments)
      .where(eq(fileAttachments.id, id))
      .limit(1);
    const attachment = rows[0];
    if (
      !attachment ||
      !canAccessClient(access.session, attachment.clientId) ||
      (access.session.role === "Client" && attachment.visibility === "Internal")
    ) {
      return Response.json({ error: "File not found." }, { status: 404 });
    }
    const object = await getFilesBucket().get(attachment.objectKey);
    if (!object) return Response.json({ error: "File not found." }, { status: 404 });
    const safeName = attachment.fileName.replace(/["\\\r\n]/g, "_");
    return new Response(object.body, {
      headers: {
        "content-type": attachment.contentType,
        "content-length": String(attachment.size),
        "content-disposition": `attachment; filename="${safeName}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { error: "The file is temporarily unavailable." },
      { status: 503 },
    );
  }
}
