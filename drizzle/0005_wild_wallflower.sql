ALTER TABLE `cctv_cameras` ADD `invoiceNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `cctv_cameras` ADD `amount` decimal(12,2);--> statement-breakpoint
ALTER TABLE `cctv_idfs` ADD `invoiceNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `cctv_idfs` ADD `amount` decimal(12,2);--> statement-breakpoint
ALTER TABLE `cctv_licenses` ADD `invoiceNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `cctv_licenses` ADD `amount` decimal(12,2);--> statement-breakpoint
ALTER TABLE `cctv_monitors` ADD `invoiceNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `cctv_monitors` ADD `amount` decimal(12,2);--> statement-breakpoint
ALTER TABLE `cctv_servers` ADD `invoiceNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `cctv_servers` ADD `amount` decimal(12,2);--> statement-breakpoint
ALTER TABLE `cctv_switches` ADD `invoiceNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `cctv_switches` ADD `amount` decimal(12,2);--> statement-breakpoint
ALTER TABLE `cctv_ups` ADD `invoiceNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `cctv_ups` ADD `amount` decimal(12,2);