ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `authProvider` enum('manus','local') DEFAULT 'manus' NOT NULL;