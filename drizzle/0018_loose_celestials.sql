CREATE TABLE `floor_plan_annotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`tenantId` int NOT NULL,
	`layerId` int,
	`type` varchar(50) DEFAULT 'marker',
	`x` varchar(20) NOT NULL,
	`y` varchar(20) NOT NULL,
	`label` varchar(255),
	`color` varchar(20),
	`icon` varchar(10),
	`data` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `floor_plan_annotations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `floor_plan_layers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`label` varchar(255) NOT NULL,
	`color` varchar(20) DEFAULT '#3b82f6',
	`icon` varchar(10) DEFAULT '📍',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `floor_plan_layers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `floor_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`building` varchar(255),
	`floor` varchar(100),
	`format` enum('pdf','dwg','dxf','png','jpg') DEFAULT 'pdf',
	`dimensions` varchar(100),
	`scale` varchar(50) DEFAULT '1:100',
	`status` enum('active','inactive','draft') DEFAULT 'active',
	`fileKey` varchar(500),
	`fileUrl` varchar(1000),
	`fileSize` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `floor_plans_id` PRIMARY KEY(`id`)
);
