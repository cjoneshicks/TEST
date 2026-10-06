CREATE TABLE `file_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`plan_id` text,
	`task_id` text,
	`message_id` text,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`uploaded_by_id` text NOT NULL,
	`uploaded_by_name` text NOT NULL,
	`uploaded_by_role` text NOT NULL,
	`visibility` text DEFAULT 'Shared' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_file_attachments_client_id` ON `file_attachments` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_file_attachments_plan_id` ON `file_attachments` (`plan_id`);