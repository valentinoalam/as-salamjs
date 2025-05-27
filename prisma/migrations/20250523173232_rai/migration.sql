-- AlterTable
ALTER TABLE `pembayaran` ADD COLUMN `kodeResi` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `produkhewan` ADD COLUMN `kumulatif` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `tipehewan` MODIFY `target` INTEGER NOT NULL DEFAULT 0,
    MODIFY `harga` INTEGER NOT NULL DEFAULT 0,
    MODIFY `note` VARCHAR(191) NULL;
