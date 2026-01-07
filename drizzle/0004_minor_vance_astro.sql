CREATE TABLE `navigation` (
	`id` varchar(36) NOT NULL,
	`parent_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`url` varchar(500) NOT NULL,
	`icon` varchar(100),
	`position` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `navigation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `navigation` ADD CONSTRAINT `navigation_parentId_navigation_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `navigation`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `navigation_parentId_idx` ON `navigation` (`parent_id`);--> statement-breakpoint
CREATE INDEX `navigation_position_idx` ON `navigation` (`position`);