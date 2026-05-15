ALTER TABLE `tickets` ADD `slaTier` enum('tier1','tier2','tier3');--> statement-breakpoint
ALTER TABLE `tickets` ADD `assetCategory` varchar(50);--> statement-breakpoint
ALTER TABLE `tickets` ADD `assetName` varchar(255);--> statement-breakpoint
ALTER TABLE `tickets` ADD `slaDeadlineHours` int;