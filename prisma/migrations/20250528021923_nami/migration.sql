/*
  Warnings:

  - Made the column `nama_pengqurban` on table `mudhohi` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `mudhohi` MODIFY `nama_pengqurban` VARCHAR(200) NOT NULL;
