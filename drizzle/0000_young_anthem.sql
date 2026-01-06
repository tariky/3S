CREATE TABLE `account` (
	`id` varchar(36) NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp(3),
	`refresh_token_expires_at` timestamp(3),
	`scope` text,
	`password` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `addresses` (
	`id` varchar(36) NOT NULL,
	`customer_id` varchar(36),
	`order_id` varchar(36),
	`type` varchar(20) NOT NULL,
	`first_name` varchar(255),
	`last_name` varchar(255),
	`company` varchar(255),
	`address1` varchar(255) NOT NULL,
	`address2` varchar(255),
	`city` varchar(100) NOT NULL,
	`state` varchar(100),
	`zip` varchar(20),
	`country` varchar(100) NOT NULL,
	`phone` varchar(50),
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cart` (
	`id` varchar(36) NOT NULL,
	`customer_id` varchar(36),
	`session_id` varchar(255),
	`discount_id` varchar(36),
	`expires_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `cart_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` varchar(36) NOT NULL,
	`cart_id` varchar(36) NOT NULL,
	`product_id` varchar(36),
	`variant_id` varchar(36),
	`quantity` int NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_metafields` (
	`id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`namespace` varchar(100) NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`type` varchar(50) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_metafields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`first_name` varchar(255),
	`last_name` varchar(255),
	`phone` varchar(50),
	`accepts_marketing` boolean NOT NULL DEFAULT false,
	`total_spent` decimal(10,2) NOT NULL DEFAULT '0',
	`orders_count` int NOT NULL DEFAULT 0,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `definitions` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`values` json NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `definitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discounts` (
	`id` varchar(36) NOT NULL,
	`code` varchar(100) NOT NULL,
	`type` varchar(50) NOT NULL,
	`value` decimal(10,2) NOT NULL,
	`minimum_purchase` decimal(10,2),
	`maximum_discount` decimal(10,2),
	`usage_limit` int,
	`usage_count` int NOT NULL DEFAULT 0,
	`starts_at` timestamp(3),
	`ends_at` timestamp(3),
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `discounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `discounts_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` varchar(36) NOT NULL,
	`variant_id` varchar(36) NOT NULL,
	`available` int NOT NULL DEFAULT 0,
	`reserved` int NOT NULL DEFAULT 0,
	`on_hand` int NOT NULL DEFAULT 0,
	`committed` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_variant_id_unique` UNIQUE(`variant_id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_tracking` (
	`id` varchar(36) NOT NULL,
	`variant_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`quantity` int NOT NULL,
	`previous_available` int NOT NULL,
	`previous_reserved` int NOT NULL,
	`new_available` int NOT NULL,
	`new_reserved` int NOT NULL,
	`reason` text,
	`reference_type` varchar(50),
	`reference_id` varchar(36),
	`user_id` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` varchar(36) NOT NULL,
	`filename` varchar(255) NOT NULL,
	`original_filename` varchar(255) NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`size` int NOT NULL,
	`url` text NOT NULL,
	`alt` text,
	`type` varchar(50) NOT NULL,
	`storage` varchar(50) NOT NULL DEFAULT 'local',
	`metadata` json,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`product_id` varchar(36),
	`variant_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`sku` varchar(100),
	`quantity` int NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`total` decimal(10,2) NOT NULL,
	`variant_title` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_metafields` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`namespace` varchar(100) NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`type` varchar(50) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `order_metafields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`order_number` varchar(50) NOT NULL,
	`customer_id` varchar(36),
	`email` varchar(255),
	`status` varchar(50) NOT NULL,
	`financial_status` varchar(50),
	`fulfillment_status` varchar(50),
	`subtotal` decimal(10,2) NOT NULL,
	`tax` decimal(10,2) NOT NULL DEFAULT '0',
	`shipping` decimal(10,2) NOT NULL DEFAULT '0',
	`discount` decimal(10,2) NOT NULL DEFAULT '0',
	`total` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'BAM',
	`note` text,
	`cancelled_at` timestamp(3),
	`cancelled_reason` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_number_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`excerpt` text,
	`status` varchar(50) NOT NULL DEFAULT 'draft',
	`template` varchar(100),
	`seo_title` varchar(255),
	`seo_description` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `pages_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `product_categories` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`image` text,
	`parent_id` varchar(36),
	`position` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `product_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `product_media` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`media_id` varchar(36) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`is_primary` boolean NOT NULL DEFAULT false,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `product_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_metafields` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`namespace` varchar(100) NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`type` varchar(50) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `product_metafields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_option_values` (
	`id` varchar(36) NOT NULL,
	`option_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `product_option_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_options` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `product_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_tags` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `product_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_tags_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `product_tags_to_products` (
	`product_id` varchar(36) NOT NULL,
	`tag_id` varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_variant_media` (
	`id` varchar(36) NOT NULL,
	`variant_id` varchar(36) NOT NULL,
	`media_id` varchar(36) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`is_primary` boolean NOT NULL DEFAULT false,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `product_variant_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_variant_options` (
	`id` varchar(36) NOT NULL,
	`variant_id` varchar(36) NOT NULL,
	`option_id` varchar(36) NOT NULL,
	`option_value_id` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `product_variant_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`sku` varchar(100),
	`barcode` varchar(100),
	`price` decimal(10,2),
	`compare_at_price` decimal(10,2),
	`cost` decimal(10,2),
	`weight` decimal(10,2),
	`position` int NOT NULL DEFAULT 0,
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`sku` varchar(100),
	`price` decimal(10,2) NOT NULL,
	`compare_at_price` decimal(10,2),
	`cost` decimal(10,2),
	`track_quantity` boolean NOT NULL DEFAULT true,
	`status` varchar(50) NOT NULL DEFAULT 'draft',
	`featured` boolean NOT NULL DEFAULT false,
	`vendor_id` varchar(36),
	`category_id` varchar(36),
	`material` text,
	`weight` decimal(10,2) NOT NULL DEFAULT '1',
	`weight_unit` varchar(10) DEFAULT 'kg',
	`requires_shipping` boolean NOT NULL DEFAULT true,
	`tax_included` boolean NOT NULL DEFAULT false,
	`internal_note` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` varchar(36) NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` text,
	`type` varchar(50) NOT NULL,
	`group` varchar(100),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	`role` text NOT NULL DEFAULT ('customer'),
	`phone_number` text,
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(50),
	`website` varchar(255),
	`address` text,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart` ADD CONSTRAINT `cart_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart` ADD CONSTRAINT `cart_discount_id_discounts_id_fk` FOREIGN KEY (`discount_id`) REFERENCES `discounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cart_id_cart_id_fk` FOREIGN KEY (`cart_id`) REFERENCES `cart`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_metafields` ADD CONSTRAINT `customer_metafields_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_tracking` ADD CONSTRAINT `inventory_tracking_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_tracking` ADD CONSTRAINT `inventory_tracking_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_tracking` ADD CONSTRAINT `inventory_tracking_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_metafields` ADD CONSTRAINT `order_metafields_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_media` ADD CONSTRAINT `pm_product_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_media` ADD CONSTRAINT `pm_media_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_metafields` ADD CONSTRAINT `product_metafields_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_option_values` ADD CONSTRAINT `product_option_values_option_id_product_options_id_fk` FOREIGN KEY (`option_id`) REFERENCES `product_options`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_options` ADD CONSTRAINT `product_options_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_tags_to_products` ADD CONSTRAINT `product_tags_to_products_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_tags_to_products` ADD CONSTRAINT `product_tags_to_products_tag_id_product_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `product_tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variant_media` ADD CONSTRAINT `pvm_variant_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variant_media` ADD CONSTRAINT `pvm_media_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variant_options` ADD CONSTRAINT `pvo_variant_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variant_options` ADD CONSTRAINT `pvo_option_fk` FOREIGN KEY (`option_id`) REFERENCES `product_options`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variant_options` ADD CONSTRAINT `pvo_option_value_fk` FOREIGN KEY (`option_value_id`) REFERENCES `product_option_values`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `addresses_customerId_idx` ON `addresses` (`customer_id`);--> statement-breakpoint
CREATE INDEX `addresses_orderId_idx` ON `addresses` (`order_id`);--> statement-breakpoint
CREATE INDEX `cart_customerId_idx` ON `cart` (`customer_id`);--> statement-breakpoint
CREATE INDEX `cart_sessionId_idx` ON `cart` (`session_id`);--> statement-breakpoint
CREATE INDEX `cart_items_cartId_idx` ON `cart_items` (`cart_id`);--> statement-breakpoint
CREATE INDEX `cart_items_productId_idx` ON `cart_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `cart_items_variantId_idx` ON `cart_items` (`variant_id`);--> statement-breakpoint
CREATE INDEX `customer_metafields_customerId_idx` ON `customer_metafields` (`customer_id`);--> statement-breakpoint
CREATE INDEX `customer_metafields_namespace_key_idx` ON `customer_metafields` (`namespace`,`key`);--> statement-breakpoint
CREATE INDEX `customers_email_idx` ON `customers` (`email`);--> statement-breakpoint
CREATE INDEX `customers_status_idx` ON `customers` (`status`);--> statement-breakpoint
CREATE INDEX `discounts_code_idx` ON `discounts` (`code`);--> statement-breakpoint
CREATE INDEX `discounts_active_idx` ON `discounts` (`active`);--> statement-breakpoint
CREATE INDEX `inventory_variantId_idx` ON `inventory` (`variant_id`);--> statement-breakpoint
CREATE INDEX `inventory_tracking_variantId_idx` ON `inventory_tracking` (`variant_id`);--> statement-breakpoint
CREATE INDEX `inventory_tracking_productId_idx` ON `inventory_tracking` (`product_id`);--> statement-breakpoint
CREATE INDEX `inventory_tracking_type_idx` ON `inventory_tracking` (`type`);--> statement-breakpoint
CREATE INDEX `inventory_tracking_referenceType_referenceId_idx` ON `inventory_tracking` (`reference_type`,`reference_id`);--> statement-breakpoint
CREATE INDEX `inventory_tracking_userId_idx` ON `inventory_tracking` (`user_id`);--> statement-breakpoint
CREATE INDEX `inventory_tracking_createdAt_idx` ON `inventory_tracking` (`created_at`);--> statement-breakpoint
CREATE INDEX `media_type_idx` ON `media` (`type`);--> statement-breakpoint
CREATE INDEX `media_mimeType_idx` ON `media` (`mime_type`);--> statement-breakpoint
CREATE INDEX `order_items_orderId_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_productId_idx` ON `order_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `order_items_variantId_idx` ON `order_items` (`variant_id`);--> statement-breakpoint
CREATE INDEX `order_metafields_orderId_idx` ON `order_metafields` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_metafields_namespace_key_idx` ON `order_metafields` (`namespace`,`key`);--> statement-breakpoint
CREATE INDEX `orders_orderNumber_idx` ON `orders` (`order_number`);--> statement-breakpoint
CREATE INDEX `orders_customerId_idx` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `pages_slug_idx` ON `pages` (`slug`);--> statement-breakpoint
CREATE INDEX `pages_status_idx` ON `pages` (`status`);--> statement-breakpoint
CREATE INDEX `product_categories_parentId_idx` ON `product_categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `product_categories_slug_idx` ON `product_categories` (`slug`);--> statement-breakpoint
CREATE INDEX `product_media_productId_idx` ON `product_media` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_media_mediaId_idx` ON `product_media` (`media_id`);--> statement-breakpoint
CREATE INDEX `product_media_position_idx` ON `product_media` (`position`);--> statement-breakpoint
CREATE INDEX `product_metafields_productId_idx` ON `product_metafields` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_metafields_namespace_key_idx` ON `product_metafields` (`namespace`,`key`);--> statement-breakpoint
CREATE INDEX `product_option_values_optionId_idx` ON `product_option_values` (`option_id`);--> statement-breakpoint
CREATE INDEX `product_options_productId_idx` ON `product_options` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_tags_slug_idx` ON `product_tags` (`slug`);--> statement-breakpoint
CREATE INDEX `product_tags_to_products_productId_idx` ON `product_tags_to_products` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_tags_to_products_tagId_idx` ON `product_tags_to_products` (`tag_id`);--> statement-breakpoint
CREATE INDEX `product_variant_media_variantId_idx` ON `product_variant_media` (`variant_id`);--> statement-breakpoint
CREATE INDEX `product_variant_media_mediaId_idx` ON `product_variant_media` (`media_id`);--> statement-breakpoint
CREATE INDEX `product_variant_media_position_idx` ON `product_variant_media` (`position`);--> statement-breakpoint
CREATE INDEX `product_variant_options_variantId_idx` ON `product_variant_options` (`variant_id`);--> statement-breakpoint
CREATE INDEX `product_variant_options_optionId_idx` ON `product_variant_options` (`option_id`);--> statement-breakpoint
CREATE INDEX `product_variant_options_optionValueId_idx` ON `product_variant_options` (`option_value_id`);--> statement-breakpoint
CREATE INDEX `product_variants_productId_idx` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_variants_sku_idx` ON `product_variants` (`sku`);--> statement-breakpoint
CREATE INDEX `products_slug_idx` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `products_categoryId_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `products_vendorId_idx` ON `products` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `settings_key_idx` ON `settings` (`key`);--> statement-breakpoint
CREATE INDEX `vendors_name_idx` ON `vendors` (`name`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);