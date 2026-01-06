CREATE TABLE `payment_methods` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`position` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipping_methods` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL DEFAULT '0',
	`active` boolean NOT NULL DEFAULT true,
	`position` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `shipping_methods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `payment_methods_name_idx` ON `payment_methods` (`name`);--> statement-breakpoint
CREATE INDEX `shipping_methods_name_idx` ON `shipping_methods` (`name`);