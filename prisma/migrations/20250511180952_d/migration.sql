-- DropForeignKey
ALTER TABLE `pembayaran` DROP FOREIGN KEY `Pembayaran_mudhohiId_fkey`;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_mudhohiId_fkey` FOREIGN KEY (`mudhohiId`) REFERENCES `Mudhohi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
