/*
  Warnings:

  - You are about to drop the column `category` on the `transaction` table. All the data in the column will be lost.
  - You are about to drop the column `receiptUrl` on the `transaction` table. All the data in the column will be lost.
  - You are about to drop the `hasiltimbang` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inventory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inventoryhistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `progresdomba` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `progressapi` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `timbanghistory` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `categoryId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `inventoryhistory` DROP FOREIGN KEY `InventoryHistory_inventory_id_fkey`;

-- DropForeignKey
ALTER TABLE `timbanghistory` DROP FOREIGN KEY `TimbangHistory_hasil_timbang_id_fkey`;

-- AlterTable
ALTER TABLE `transaction` DROP COLUMN `category`,
    DROP COLUMN `receiptUrl`,
    ADD COLUMN `categoryId` VARCHAR(191) NOT NULL,
    MODIFY `description` TEXT NOT NULL;

-- DropTable
DROP TABLE `hasiltimbang`;

-- DropTable
DROP TABLE `inventory`;

-- DropTable
DROP TABLE `inventoryhistory`;

-- DropTable
DROP TABLE `progresdomba`;

-- DropTable
DROP TABLE `progressapi`;

-- DropTable
DROP TABLE `timbanghistory`;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('PEMASUKAN', 'PENGELUARAN') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `images` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budgets` (
    `id` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `images` ADD CONSTRAINT `images_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `hewanqurban` RENAME INDEX `HewanQurban_tipeId_fkey` TO `HewanQurban_tipeId_idx`;
