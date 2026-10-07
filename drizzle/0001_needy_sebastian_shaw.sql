CREATE TABLE `chat_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`window` integer NOT NULL
);
