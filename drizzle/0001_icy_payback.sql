CREATE TABLE `ai_chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`tenantId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_chat_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_chat_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`branchId` int,
	`policyId` int,
	`assetCode` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` enum('camera','nvr_dvr','access_control','alarm','sensor','network','server','ups','other') NOT NULL DEFAULT 'other',
	`brand` varchar(100),
	`model` varchar(100),
	`serialNumber` varchar(200),
	`status` enum('active','inactive','maintenance','obsolete','disposed') NOT NULL DEFAULT 'active',
	`criticality` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
	`location` varchar(255),
	`installDate` date,
	`warrantyExpiry` date,
	`usefulLifeYears` int,
	`purchaseCost` decimal(12,2),
	`currentValue` decimal(12,2),
	`depreciationRate` decimal(5,2),
	`depreciationMethod` enum('straight_line','declining_balance','sum_of_years') DEFAULT 'straight_line',
	`replacementCost` decimal(12,2),
	`maintenanceCostYearly` decimal(12,2),
	`riskScore` int DEFAULT 0,
	`notes` text,
	`imageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`userId` int,
	`userName` varchar(255),
	`action` varchar(100) NOT NULL,
	`module` varchar(100) NOT NULL,
	`entityType` varchar(100),
	`entityId` int,
	`description` text,
	`oldData` json,
	`newData` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50),
	`address` text,
	`city` varchar(100),
	`state` varchar(100),
	`country` varchar(100) DEFAULT 'México',
	`phone` varchar(32),
	`contactName` varchar(255),
	`contactEmail` varchar(320),
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`branchId` int,
	`policyId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('preventive','corrective','predictive') NOT NULL DEFAULT 'preventive',
	`frequency` enum('weekly','monthly','quarterly','biannual','annual','on_demand') NOT NULL DEFAULT 'monthly',
	`status` enum('active','paused','completed','cancelled') NOT NULL DEFAULT 'active',
	`assignedUserId` int,
	`startDate` date,
	`endDate` date,
	`nextExecutionDate` date,
	`estimatedDurationHours` decimal(5,2),
	`estimatedCost` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenance_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`planId` int NOT NULL,
	`assetId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('pending','in_progress','completed','cancelled','rescheduled') NOT NULL DEFAULT 'pending',
	`assignedUserId` int,
	`scheduledDate` date,
	`completedDate` date,
	`durationHours` decimal(5,2),
	`actualCost` decimal(12,2),
	`findings` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenance_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`branchId` int,
	`policyNumber` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('draft','active','suspended','expired','cancelled') NOT NULL DEFAULT 'draft',
	`type` enum('maintenance','warranty','support','comprehensive') NOT NULL DEFAULT 'maintenance',
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`renewalDate` date,
	`monthlyValue` decimal(12,2),
	`annualValue` decimal(12,2),
	`currency` varchar(10) DEFAULT 'MXN',
	`clientName` varchar(255),
	`clientContact` varchar(255),
	`clientEmail` varchar(320),
	`clientPhone` varchar(32),
	`assignedUserId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policy_coverages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`policyId` int NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`coverageType` enum('preventive','corrective','emergency','parts','labor','travel') NOT NULL,
	`maxIncidents` int,
	`maxAmount` decimal(12,2),
	`isUnlimited` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `policy_coverages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policy_exclusions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`policyId` int NOT NULL,
	`tenantId` int NOT NULL,
	`description` text NOT NULL,
	`category` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `policy_exclusions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policy_operational_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`policyId` int NOT NULL,
	`tenantId` int NOT NULL,
	`ruleType` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`value` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `policy_operational_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policy_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`policyId` int NOT NULL,
	`tenantId` int NOT NULL,
	`serviceName` varchar(255) NOT NULL,
	`serviceCode` varchar(50),
	`description` text,
	`frequency` enum('on_demand','monthly','quarterly','biannual','annual') DEFAULT 'on_demand',
	`isIncluded` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `policy_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policy_sla_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`policyId` int NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`priority` enum('critical','high','medium','low') NOT NULL,
	`responseTimeHours` int NOT NULL,
	`resolutionTimeHours` int NOT NULL,
	`escalationTimeHours` int,
	`penaltyPerHour` decimal(10,2),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `policy_sla_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sla_monitoring` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`ticketId` int NOT NULL,
	`slaRuleId` int,
	`policyId` int,
	`responseDeadline` timestamp,
	`resolutionDeadline` timestamp,
	`respondedAt` timestamp,
	`resolvedAt` timestamp,
	`responseBreached` boolean DEFAULT false,
	`resolutionBreached` boolean DEFAULT false,
	`responseBreachMinutes` int,
	`resolutionBreachMinutes` int,
	`penaltyAmount` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sla_monitoring_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`rfc` varchar(20),
	`address` text,
	`phone` varchar(32),
	`email` varchar(320),
	`logoUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`plan` enum('basic','professional','enterprise') NOT NULL DEFAULT 'professional',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `ticket_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`comment` text NOT NULL,
	`isInternal` boolean DEFAULT false,
	`attachmentUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticket_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int,
	`action` varchar(100) NOT NULL,
	`fieldChanged` varchar(100),
	`oldValue` text,
	`newValue` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticket_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`branchId` int,
	`policyId` int,
	`ticketNumber` varchar(50) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`operationalStatus` enum('open','assigned','technician_on_route','waiting_parts','resolved') NOT NULL DEFAULT 'open',
	`contractualStatus` enum('covered','not_covered','pending_approval','outside_sla','billable') NOT NULL DEFAULT 'pending_approval',
	`priority` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
	`category` enum('corrective','preventive','emergency','installation','inspection') NOT NULL DEFAULT 'corrective',
	`assignedUserId` int,
	`reportedByUserId` int,
	`assetId` int,
	`slaRuleId` int,
	`responseDeadline` timestamp,
	`resolutionDeadline` timestamp,
	`respondedAt` timestamp,
	`resolvedAt` timestamp,
	`closedAt` timestamp,
	`estimatedCost` decimal(12,2),
	`actualCost` decimal(12,2),
	`isBillable` boolean DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','supervisor','technician','client','user') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;