CREATE TABLE `cctv_maintenance_program_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programId` int NOT NULL,
	`tenantId` int NOT NULL,
	`category` enum('cameras','idfs','licenses','monitors','servers','switches','ups') NOT NULL,
	`itemId` int NOT NULL,
	`itemName` varchar(255),
	`itemLocation` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cctv_maintenance_program_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cctv_maintenance_programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`policyId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`totalVisits` int NOT NULL,
	`completedVisits` int NOT NULL DEFAULT 0,
	`frequency` enum('monthly','bimonthly','quarterly','biannual','annual','custom') NOT NULL DEFAULT 'quarterly',
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`technician` varchar(255),
	`status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
	`createdByUserId` int,
	`createdByUserName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cctv_maintenance_programs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cctv_maintenance_log` ADD `beforePhotoUrl` text;--> statement-breakpoint
ALTER TABLE `cctv_maintenance_log` ADD `beforePhotoKey` varchar(500);--> statement-breakpoint
ALTER TABLE `cctv_maintenance_log` ADD `afterPhotoUrl` text;--> statement-breakpoint
ALTER TABLE `cctv_maintenance_log` ADD `afterPhotoKey` varchar(500);--> statement-breakpoint
ALTER TABLE `cctv_maintenance_log` ADD `clientSignatureUrl` text;--> statement-breakpoint
ALTER TABLE `cctv_maintenance_log` ADD `clientSignatureKey` varchar(500);--> statement-breakpoint
ALTER TABLE `cctv_maintenance_log` ADD `clientName` varchar(255);--> statement-breakpoint
ALTER TABLE `cctv_maintenance_log` ADD `reportGenerated` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `cctv_maintenance_log` ADD `policyId` int;--> statement-breakpoint
ALTER TABLE `cctv_maintenance_log` ADD `programId` int;