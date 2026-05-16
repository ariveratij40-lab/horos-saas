ALTER TABLE `tickets` ADD `resolutionNotes` text;--> statement-breakpoint
ALTER TABLE `tickets` ADD `resolutionEvidenceUrls` json;--> statement-breakpoint
ALTER TABLE `tickets` ADD `resolutionSignatureUrl` text;--> statement-breakpoint
ALTER TABLE `tickets` ADD `resolutionReportUrl` text;--> statement-breakpoint
ALTER TABLE `tickets` ADD `resolutionReportKey` varchar(500);--> statement-breakpoint
ALTER TABLE `tickets` ADD `resolvedByName` varchar(255);--> statement-breakpoint
ALTER TABLE `tickets` ADD `notificationSentAt` timestamp;