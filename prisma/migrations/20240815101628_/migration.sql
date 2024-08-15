/*
  Warnings:

  - You are about to drop the column `name` on the `issue` table. All the data in the column will be lost.
  - Added the required column `descr` to the `Issue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priority` to the `Issue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reporterId` to the `Issue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `summary` to the `Issue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Issue` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `issue` DROP FOREIGN KEY `Issue_listId_fkey`;

-- AlterTable
ALTER TABLE `issue` DROP COLUMN `name`,
    ADD COLUMN `descr` VARCHAR(191) NOT NULL,
    ADD COLUMN `priority` INTEGER NOT NULL,
    ADD COLUMN `reporterId` INTEGER NOT NULL,
    ADD COLUMN `summary` VARCHAR(191) NOT NULL,
    ADD COLUMN `type` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `list` MODIFY `name` VARCHAR(191) NOT NULL DEFAULT 'unnamed list';

-- AlterTable
ALTER TABLE `project` ADD COLUMN `userId` INTEGER NULL,
    MODIFY `descr` VARCHAR(300) NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `profileUrl` VARCHAR(191) NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE `Assignee` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NULL,
    `issueId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Issue` ADD CONSTRAINT `Issue_listId_fkey` FOREIGN KEY (`listId`) REFERENCES `List`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignee` ADD CONSTRAINT `Assignee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignee` ADD CONSTRAINT `Assignee_issueId_fkey` FOREIGN KEY (`issueId`) REFERENCES `Issue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
