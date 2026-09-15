CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`label` text NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text,
	`revoked_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_hash` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_keys_user` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE TABLE `audio_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`content_hash` text NOT NULL,
	`text_value` text NOT NULL,
	`voice` text NOT NULL,
	`provider` text NOT NULL,
	`object_key` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audio_assets_hash` ON `audio_assets` (`content_hash`);--> statement-breakpoint
CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`due` text NOT NULL,
	`stability` real DEFAULT 0 NOT NULL,
	`difficulty` real DEFAULT 0 NOT NULL,
	`elapsed_days` integer DEFAULT 0 NOT NULL,
	`scheduled_days` integer DEFAULT 0 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`state` integer DEFAULT 0 NOT NULL,
	`last_review` text,
	`suspended_at` text,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cards_note_type` ON `cards` (`note_id`,`type`);--> statement-breakpoint
CREATE INDEX `cards_user_due` ON `cards` (`user_id`,`due`);--> statement-breakpoint
CREATE TABLE `decks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`card_types` text NOT NULL,
	`archived_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `decks_user_name` ON `decks` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`deck_id` text NOT NULL,
	`lemma` text NOT NULL,
	`normalized_lemma` text NOT NULL,
	`article` text,
	`gender` text,
	`part_of_speech` text NOT NULL,
	`translations` text NOT NULL,
	`ipa` text,
	`example_fr` text,
	`example_en` text,
	`audio_url` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`cefr_level` text,
	`needs_review` integer DEFAULT false NOT NULL,
	`source` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notes_user_deck_lemma_part` ON `notes` (`user_id`,`deck_id`,`normalized_lemma`,`part_of_speech`);--> statement-breakpoint
CREATE INDEX `notes_user_deck` ON `notes` (`user_id`,`deck_id`);--> statement-breakpoint
CREATE TABLE `review_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`client_event_id` text NOT NULL,
	`card_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`state_before` integer NOT NULL,
	`due_before` text NOT NULL,
	`stability_before` real NOT NULL,
	`difficulty_before` real NOT NULL,
	`state_after` integer NOT NULL,
	`due_after` text NOT NULL,
	`stability_after` real NOT NULL,
	`difficulty_after` real NOT NULL,
	`elapsed_days` integer NOT NULL,
	`scheduled_days` integer NOT NULL,
	`reviewed_at` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`answer_method` text NOT NULL,
	`asr_transcript` text,
	`asr_overridden` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_logs_client_event` ON `review_logs` (`user_id`,`client_event_id`);--> statement-breakpoint
CREATE INDEX `review_logs_user_time` ON `review_logs` (`user_id`,`reviewed_at`);--> statement-breakpoint
CREATE INDEX `review_logs_card_time` ON `review_logs` (`card_id`,`reviewed_at`);--> statement-breakpoint
CREATE TABLE `user_snapshots` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL
);
