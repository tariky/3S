ALTER TABLE `shipping_methods` ADD `is_free_shipping` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shipping_methods` ADD `minimum_order_amount` decimal(10,2);