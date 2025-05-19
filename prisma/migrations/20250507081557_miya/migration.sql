-- CreateTable
CREATE TABLE `User` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pembayaran` (
    `id` CHAR(36) NOT NULL,
    `mudhohiId` VARCHAR(191) NOT NULL,
    `cara_bayar` ENUM('TUNAI', 'TRANSFER') NOT NULL,
    `paymentStatus` ENUM('BELUM_BAYAR', 'MENUNGGU_KONFIRMASI', 'LUNAS', 'BATAL') NOT NULL,
    `dibayarkan` INTEGER NOT NULL,
    `urlTandaBukti` VARCHAR(191) NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Pembayaran_mudhohiId_key`(`mudhohiId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mudhohi` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `nama_pengqurban` VARCHAR(200) NULL,
    `nama_peruntukan` VARCHAR(200) NULL,
    `pesan_khusus` VARCHAR(500) NULL,
    `keterangan` VARCHAR(500) NULL,
    `potong_sendiri` BOOLEAN NOT NULL,
    `ambil_daging` BOOLEAN NULL,
    `dash_code` VARCHAR(191) NOT NULL,
    `barcode_image` VARCHAR(191) NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HewanQurban` (
    `id` VARCHAR(191) NOT NULL,
    `tipeId` INTEGER NOT NULL,
    `hewanId` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('TERDAFTAR', 'SIAP_SEMBELIH', 'DISEMBELIH', 'DITIMBANG', 'DIINVENTORI', 'DIDISTRIBUSI') NOT NULL DEFAULT 'TERDAFTAR',
    `slaughtered` BOOLEAN NOT NULL DEFAULT false,
    `slaughteredAt` DATETIME(3) NULL,
    `meatPackageCount` INTEGER NOT NULL DEFAULT 0,
    `onInventory` BOOLEAN NOT NULL DEFAULT false,
    `receivedByMdhohi` BOOLEAN NOT NULL DEFAULT false,
    `isKolektif` BOOLEAN NOT NULL DEFAULT false,
    `slotTersisa` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HewanQurban_hewanId_key`(`hewanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TipeHewan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `jmlKantong` INTEGER NULL,
    `harga` INTEGER NOT NULL,
    `note` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TipeHewan_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProdukHewan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `tipeId` INTEGER NULL,
    `berat` DOUBLE NULL,
    `targetPaket` INTEGER NOT NULL DEFAULT 0,
    `pkgOrigin` INTEGER NOT NULL DEFAULT 0,
    `pkgReceived` INTEGER NOT NULL DEFAULT 0,
    `pkgDelivered` INTEGER NOT NULL DEFAULT 0,
    `jenisProduk` ENUM('KEPALA', 'BADAN', 'KULIT', 'TORPEDO', 'KAKI', 'DAGING') NOT NULL,

    UNIQUE INDEX `ProdukHewan_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `produkId` INTEGER NOT NULL,
    `event` VARCHAR(191) NOT NULL,
    `place` ENUM('INVENTORY', 'PENYEMBELIHAN') NOT NULL,
    `value` INTEGER NOT NULL,
    `note` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ErrorLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `produkId` INTEGER NOT NULL,
    `event` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Distribution` (
    `id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `target` INTEGER NOT NULL DEFAULT 0,
    `realized` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DistribusiLog` (
    `id` VARCHAR(191) NOT NULL,
    `penerimaId` VARCHAR(191) NOT NULL,
    `numberOfPackages` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Penerima` (
    `id` CHAR(36) NOT NULL,
    `distributionId` VARCHAR(191) NOT NULL,
    `noKupon` VARCHAR(191) NULL,
    `receivedBy` VARCHAR(191) NULL,
    `institusi` VARCHAR(191) NULL,
    `noKk` VARCHAR(191) NULL,
    `alamat` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `receivedAt` DATETIME(3) NULL,
    `keterangan` VARCHAR(500) NULL,
    `tanda_terima` VARCHAR(1000) NULL,
    `isDiterima` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProgresSapi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sembelih` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProgresDomba` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sembelih` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HasilTimbang` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `hasil` INTEGER NOT NULL DEFAULT 0,
    `target_value` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `HasilTimbang_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimbangHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hasil_timbang_id` INTEGER NOT NULL,
    `operation` VARCHAR(191) NOT NULL,
    `value` INTEGER NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `hasil` INTEGER NOT NULL DEFAULT 0,
    `target_value` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Inventory_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventory_id` INTEGER NOT NULL,
    `operation` VARCHAR(191) NOT NULL,
    `value` INTEGER NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_HewanQurbanToMudhohi` (
    `A` VARCHAR(191) NOT NULL,
    `B` CHAR(36) NOT NULL,

    UNIQUE INDEX `_HewanQurbanToMudhohi_AB_unique`(`A`, `B`),
    INDEX `_HewanQurbanToMudhohi_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_DistribusiLogToProdukHewan` (
    `A` VARCHAR(191) NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_DistribusiLogToProdukHewan_AB_unique`(`A`, `B`),
    INDEX `_DistribusiLogToProdukHewan_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_mudhohiId_fkey` FOREIGN KEY (`mudhohiId`) REFERENCES `Mudhohi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mudhohi` ADD CONSTRAINT `Mudhohi_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HewanQurban` ADD CONSTRAINT `HewanQurban_tipeId_fkey` FOREIGN KEY (`tipeId`) REFERENCES `TipeHewan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProdukHewan` ADD CONSTRAINT `ProdukHewan_tipeId_fkey` FOREIGN KEY (`tipeId`) REFERENCES `TipeHewan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductLog` ADD CONSTRAINT `ProductLog_produkId_fkey` FOREIGN KEY (`produkId`) REFERENCES `ProdukHewan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ErrorLog` ADD CONSTRAINT `ErrorLog_produkId_fkey` FOREIGN KEY (`produkId`) REFERENCES `ProdukHewan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DistribusiLog` ADD CONSTRAINT `DistribusiLog_penerimaId_fkey` FOREIGN KEY (`penerimaId`) REFERENCES `Penerima`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Penerima` ADD CONSTRAINT `Penerima_distributionId_fkey` FOREIGN KEY (`distributionId`) REFERENCES `Distribution`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimbangHistory` ADD CONSTRAINT `TimbangHistory_hasil_timbang_id_fkey` FOREIGN KEY (`hasil_timbang_id`) REFERENCES `HasilTimbang`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryHistory` ADD CONSTRAINT `InventoryHistory_inventory_id_fkey` FOREIGN KEY (`inventory_id`) REFERENCES `Inventory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_HewanQurbanToMudhohi` ADD CONSTRAINT `_HewanQurbanToMudhohi_A_fkey` FOREIGN KEY (`A`) REFERENCES `HewanQurban`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_HewanQurbanToMudhohi` ADD CONSTRAINT `_HewanQurbanToMudhohi_B_fkey` FOREIGN KEY (`B`) REFERENCES `Mudhohi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DistribusiLogToProdukHewan` ADD CONSTRAINT `_DistribusiLogToProdukHewan_A_fkey` FOREIGN KEY (`A`) REFERENCES `DistribusiLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DistribusiLogToProdukHewan` ADD CONSTRAINT `_DistribusiLogToProdukHewan_B_fkey` FOREIGN KEY (`B`) REFERENCES `ProdukHewan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
