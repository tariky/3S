CREATE TABLE `collection_products` (
	`id` varchar(36) NOT NULL,
	`collection_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`is_manual` boolean NOT NULL DEFAULT false,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `collection_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collection_rules` (
	`id` varchar(36) NOT NULL,
	`collection_id` varchar(36) NOT NULL,
	`rule_type` varchar(50) NOT NULL,
	`operator` varchar(50) NOT NULL,
	`value` text NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `collection_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`image` text,
	`rule_match` varchar(10) NOT NULL DEFAULT 'all',
	`sort_order` varchar(50) NOT NULL DEFAULT 'manual',
	`active` boolean NOT NULL DEFAULT true,
	`seo_title` varchar(255),
	`seo_description` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `collections_id` PRIMARY KEY(`id`),
	CONSTRAINT `collections_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `collection_products` ADD CONSTRAINT `collection_products_collection_id_collections_id_fk` FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collection_products` ADD CONSTRAINT `collection_products_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collection_rules` ADD CONSTRAINT `collection_rules_collection_id_collections_id_fk` FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `collection_products_collectionId_idx` ON `collection_products` (`collection_id`);--> statement-breakpoint
CREATE INDEX `collection_products_productId_idx` ON `collection_products` (`product_id`);--> statement-breakpoint
CREATE INDEX `collection_products_position_idx` ON `collection_products` (`position`);--> statement-breakpoint
CREATE INDEX `collection_rules_collectionId_idx` ON `collection_rules` (`collection_id`);--> statement-breakpoint
CREATE INDEX `collection_rules_ruleType_idx` ON `collection_rules` (`rule_type`);--> statement-breakpoint
CREATE INDEX `collections_slug_idx` ON `collections` (`slug`);--> statement-breakpoint
CREATE INDEX `collections_active_idx` ON `collections` (`active`);