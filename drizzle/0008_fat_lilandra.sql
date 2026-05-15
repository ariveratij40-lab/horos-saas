CREATE TABLE `rfid_registry` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`rfidTag` varchar(50) NOT NULL,
	`category` enum('cameras','idfs','licenses','monitors','servers','switches','ups') NOT NULL,
	`itemId` int NOT NULL,
	`itemName` varchar(255),
	`itemBrand` varchar(100),
	`itemModel` varchar(100),
	`itemSerial` varchar(100),
	`itemLocation` varchar(255),
	`itemStatus` varchar(50),
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rfid_registry_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cctv_cameras` ADD `rfidTag` varchar(50);--> statement-breakpoint
ALTER TABLE `cctv_idfs` ADD `rfidTag` varchar(50);--> statement-breakpoint
ALTER TABLE `cctv_licenses` ADD `rfidTag` varchar(50);--> statement-breakpoint
ALTER TABLE `cctv_monitors` ADD `rfidTag` varchar(50);--> statement-breakpoint
ALTER TABLE `cctv_servers` ADD `rfidTag` varchar(50);--> statement-breakpoint
ALTER TABLE `cctv_switches` ADD `rfidTag` varchar(50);--> statement-breakpoint
ALTER TABLE `cctv_ups` ADD `rfidTag` varchar(50);