import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const portalState = sqliteTable("portal_state", {
  id: integer("id").primaryKey(),
  stateJson: text("state_json").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("updated_by").notNull().default("Pilot user"),
});

export const activityLog = sqliteTable("activity_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorId: text("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  requesterEmail: text("requester_email"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const fileAttachments = sqliteTable(
  "file_attachments",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull(),
    planId: text("plan_id"),
    taskId: text("task_id"),
    messageId: text("message_id"),
    objectKey: text("object_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    uploadedById: text("uploaded_by_id").notNull(),
    uploadedByName: text("uploaded_by_name").notNull(),
    uploadedByRole: text("uploaded_by_role").notNull(),
    visibility: text("visibility").notNull().default("Shared"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_file_attachments_client_id").on(table.clientId),
    index("idx_file_attachments_plan_id").on(table.planId),
  ],
);
