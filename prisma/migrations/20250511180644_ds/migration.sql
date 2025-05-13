-- DropForeignKey
ALTER TABLE `mudhohi` DROP FOREIGN KEY `Mudhohi_userId_fkey`;

-- DropIndex
DROP INDEX `Mudhohi_userId_fkey` ON `mudhohi`;

-- AddForeignKey
ALTER TABLE `Mudhohi` ADD CONSTRAINT `Mudhohi_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
