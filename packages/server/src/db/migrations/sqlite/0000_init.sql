CREATE TABLE `activity` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`kind` text NOT NULL,
	`actor` text,
	`summary` text NOT NULL,
	`url` text,
	`at` text NOT NULL,
	`seen_at` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_item_idx` ON `activity` (`item_id`,`at`);--> statement-breakpoint
CREATE INDEX `activity_seen_idx` ON `activity` (`seen_at`);--> statement-breakpoint
CREATE TABLE `digests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sent_at` text NOT NULL,
	`kind` text NOT NULL,
	`notifier` text NOT NULL,
	`payload_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `digests_kind_idx` ON `digests` (`kind`,`sent_at`);--> statement-breakpoint
CREATE INDEX `digests_hash_idx` ON `digests` (`payload_hash`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`repo` text NOT NULL,
	`owner` text NOT NULL,
	`state` text NOT NULL,
	`is_draft` integer DEFAULT false NOT NULL,
	`author` text NOT NULL,
	`labels` text DEFAULT '[]' NOT NULL,
	`assignees` text DEFAULT '[]' NOT NULL,
	`roles` text DEFAULT '[]' NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`linked_prs` text DEFAULT '[]' NOT NULL,
	`is_answered` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_activity_at` text NOT NULL,
	`last_activity_by` text,
	`hidden` text DEFAULT 'none' NOT NULL,
	`hidden_at` text,
	`muted_activity_at` text,
	`first_seen_at` text NOT NULL,
	`last_synced_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `items_repo_idx` ON `items` (`repo`);--> statement-breakpoint
CREATE INDEX `items_last_activity_idx` ON `items` (`last_activity_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`ok` integer,
	`error` text,
	`rate_remaining` integer,
	`rate_reset_at` text,
	`github_login` text,
	`counts` text
);
--> statement-breakpoint
CREATE INDEX `sync_runs_started_idx` ON `sync_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `views` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`query` text NOT NULL,
	`builtin` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL
);
