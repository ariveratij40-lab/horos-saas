ALTER TABLE `cctv_maintenance_program_items` ADD `area` varchar(255);--> statement-breakpoint
ALTER TABLE `cctv_maintenance_program_items` ADD `requiresLift` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `cctv_maintenance_program_items` ADD `noTechnicians` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `cctv_maintenance_program_items` ADD `observations` text;--> statement-breakpoint
ALTER TABLE `cctv_maintenance_program_items` ADD `sortOrder` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `cctv_maintenance_programs` ADD `schedule` varchar(100);--> statement-breakpoint
ALTER TABLE `cctv_maintenance_programs` ADD `visitWeekStart` date;