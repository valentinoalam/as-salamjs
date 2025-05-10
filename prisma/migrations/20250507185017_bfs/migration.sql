/*
  Warnings:

  - You are about to drop the column `image` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `image`,
    MODIFY `password` VARCHAR(191) NULL DEFAULT 'password123';

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `type` ENUM('PEMASUKAN', 'PENGELUARAN') NOT NULL,
    `category` ENUM('QURBAN_PAYMENT', 'OPERATIONAL', 'SUPPLIES', 'TRANSPORT', 'SALARY', 'OTHER') NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `receiptUrl` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
