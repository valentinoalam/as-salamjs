/*
  Warnings:

  - You are about to drop the column `jmlKantong` on the `tipehewan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `hewanqurban` ADD COLUMN `isCustom` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `produkhewan` ADD COLUMN `avgProdPerHewan` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `tipehewan` DROP COLUMN `jmlKantong`;
