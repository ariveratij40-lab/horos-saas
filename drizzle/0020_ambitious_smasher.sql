CREATE TABLE `floor_plan_shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`tenantId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`name` varchar(255),
	`layers` text,
	`expiresAt` timestamp,
	`viewCount` int DEFAULT 0,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `floor_plan_shares_id` PRIMARY KEY(`id`),
	CONSTRAINT `floor_plan_shares_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `floor_plan_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`layers` text NOT NULL,
	`annotationsSnapshot` text NOT NULL,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `floor_plan_versions_id` PRIMARY KEY(`id`)
);
