CREATE TABLE `email_verification_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_verification_tokens_token_unique` ON `email_verification_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_token_unique` ON `password_reset_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`bids_used` integer DEFAULT 0 NOT NULL,
	`services_used` integer DEFAULT 0 NOT NULL,
	`current_period_start` text NOT NULL,
	`current_period_end` text NOT NULL,
	`cancelled_at` text,
	`payment_reference` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_user_id_unique` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bio` text,
	`headline` text,
	`skills` text,
	`location` text,
	`hourly_rate` real,
	`currency` text DEFAULT 'ZAR',
	`portfolio_urls` text,
	`website` text,
	`response_time` text,
	`completion_rate` real,
	`total_earnings` real DEFAULT 0,
	`total_spent` real DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_user_id_unique` ON `user_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`document_type` text NOT NULL,
	`document_url` text NOT NULL,
	`selfie_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`rejection_reason` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text,
	`role` text DEFAULT 'user' NOT NULL,
	`is_email_verified` integer DEFAULT false NOT NULL,
	`is_id_verified` integer DEFAULT false NOT NULL,
	`is_suspended` integer DEFAULT false NOT NULL,
	`suspended_reason` text,
	`last_login_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `bids` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`bidder_id` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'ZAR',
	`proposal` text NOT NULL,
	`delivery_days` integer NOT NULL,
	`proposed_milestones` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`is_read` integer DEFAULT false,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bidder_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`icon` text,
	`parent_id` text,
	`sort_order` integer DEFAULT 0,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer_id` text NOT NULL,
	`category_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`budget_type` text DEFAULT 'fixed' NOT NULL,
	`budget_min` real NOT NULL,
	`budget_max` real NOT NULL,
	`currency` text DEFAULT 'ZAR',
	`deadline` text,
	`expected_duration` text,
	`skills` text,
	`attachments` text,
	`bid_count` integer DEFAULT 0,
	`view_count` integer DEFAULT 0,
	`status` text DEFAULT 'draft' NOT NULL,
	`is_outsourced` integer DEFAULT false,
	`original_owner_id` text,
	`awarded_bid_id` text,
	`awarded_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text,
	FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`original_owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`category_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`short_description` text,
	`pricing_tiers` text NOT NULL,
	`images` text,
	`thumbnail_url` text,
	`tags` text,
	`max_revisions` integer DEFAULT 2,
	`delivery_days` integer NOT NULL,
	`view_count` integer DEFAULT 0,
	`order_count` integer DEFAULT 0,
	`average_rating` real,
	`review_count` integer DEFAULT 0,
	`status` text DEFAULT 'draft' NOT NULL,
	`rejection_reason` text,
	`is_active` integer DEFAULT true NOT NULL,
	`is_featured` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`amount` integer NOT NULL,
	`sort_order` integer DEFAULT 0,
	`due_date` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`funded_at` text,
	`delivered_at` text,
	`released_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `order_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`milestone_id` text,
	`message` text NOT NULL,
	`attachments` text,
	`delivery_type` text DEFAULT 'initial' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`buyer_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`order_type` text NOT NULL,
	`service_id` text,
	`project_id` text,
	`bid_id` text,
	`service_tier` text,
	`requirements` text,
	`attachments` text,
	`subtotal` integer NOT NULL,
	`buyer_fee` integer NOT NULL,
	`seller_fee` integer NOT NULL,
	`total_amount` integer NOT NULL,
	`seller_earnings` integer NOT NULL,
	`currency` text DEFAULT 'ZAR',
	`delivery_days` integer NOT NULL,
	`delivery_deadline` text,
	`delivered_at` text,
	`accepted_at` text,
	`revisions_allowed` integer DEFAULT 2,
	`revisions_used` integer DEFAULT 0,
	`status` text DEFAULT 'pending_payment' NOT NULL,
	`cancelled_by` text,
	`cancellation_reason` text,
	`buyer_has_reviewed` integer DEFAULT false,
	`seller_has_reviewed` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bid_id`) REFERENCES `bids`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cancelled_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE TABLE `revision_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`delivery_id` text NOT NULL,
	`reason` text NOT NULL,
	`details` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`responded_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`delivery_id`) REFERENCES `order_deliveries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text,
	`milestone_id` text,
	`subscription_id` text,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'ZAR',
	`provider` text NOT NULL,
	`provider_reference` text,
	`provider_status` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`participant1_id` text NOT NULL,
	`participant2_id` text NOT NULL,
	`order_id` text,
	`last_message_at` text,
	`last_message_preview` text,
	`participant1_unread_count` integer DEFAULT 0,
	`participant2_unread_count` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`participant1_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`participant2_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `dispute_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`dispute_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`message` text NOT NULL,
	`attachments` text,
	`is_from_admin` integer DEFAULT false,
	`is_internal` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`dispute_id`) REFERENCES `disputes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `disputes` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`raised_by_id` text NOT NULL,
	`against_id` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`evidence` text,
	`status` text DEFAULT 'open' NOT NULL,
	`resolution` text,
	`resolution_notes` text,
	`resolution_amount` integer,
	`assigned_to` text,
	`resolved_by` text,
	`resolved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`raised_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`against_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`favorited_user_id` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`favorited_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`content` text NOT NULL,
	`attachments` text,
	`message_type` text DEFAULT 'text' NOT NULL,
	`offer_amount` integer,
	`offer_status` text,
	`is_read` integer DEFAULT false,
	`read_at` text,
	`is_deleted_by_sender` integer DEFAULT false,
	`is_deleted_by_receiver` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`is_read` integer DEFAULT false,
	`read_at` text,
	`email_sent` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`reviewee_id` text NOT NULL,
	`review_type` text NOT NULL,
	`overall_rating` integer NOT NULL,
	`communication_rating` integer,
	`quality_rating` integer,
	`value_rating` integer,
	`timeliness_rating` integer,
	`title` text,
	`comment` text NOT NULL,
	`seller_response` text,
	`seller_response_at` text,
	`is_visible` integer DEFAULT true,
	`is_reported` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shortlist` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`shortlisted_user_id` text NOT NULL,
	`category_id` text,
	`notes` text,
	`priority` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shortlisted_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`actor_email` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`changes` text,
	`metadata` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `feature_flags` (
	`key` text PRIMARY KEY NOT NULL,
	`is_enabled` integer DEFAULT false NOT NULL,
	`description` text,
	`enabled_for_users` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outsource_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`outsource_request_id` text NOT NULL,
	`invited_user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`message` text,
	`responded_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`outsource_request_id`) REFERENCES `outsource_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `outsource_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`original_order_id` text NOT NULL,
	`outsourcer_id` text NOT NULL,
	`outsourced_to_id` text,
	`category_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`requirements` text,
	`attachments` text,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'ZAR',
	`delivery_days` integer NOT NULL,
	`deadline` text,
	`status` text DEFAULT 'open' NOT NULL,
	`is_anonymous` integer DEFAULT true NOT NULL,
	`child_order_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`original_order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`outsourcer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`outsourced_to_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`child_order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updated_by` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`price_monthly` integer NOT NULL,
	`price_annual` integer,
	`features` text,
	`max_services` integer,
	`max_bids` integer,
	`can_outsource` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`sort_order` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
