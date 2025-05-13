/*
  Warnings:

  - Added the required column `jenis` to the `TipeHewan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `target` to the `TipeHewan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `tipehewan` ADD COLUMN `jenis` ENUM('UNTA', 'SAPI', 'DOMBA', 'KAMBING') NOT NULL,
    ADD COLUMN `target` INTEGER NOT NULL;
