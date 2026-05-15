CREATE TABLE `cctv_idf_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idfId` int NOT NULL,
	`tenantId` int NOT NULL,
	`url` text NOT NULL,
	`key` text NOT NULL,
	`label` varchar(100) DEFAULT 'Frontal',
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cctv_idf_images_id` PRIMARY KEY(`id`)
);
