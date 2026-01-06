ALTER TABLE `shipping_methods` ADD COLUMN `is_free_shipping` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `shipping_methods` ADD COLUMN `minimum_order_amount` decimal(10,2);

