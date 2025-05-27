-- CreateTable
CREATE TABLE `User` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL DEFAULT 'password123',
    `urlAvatar` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'PETUGAS_PENDAFTARAN', 'PETUGAS_KEUANGAN', 'PETUGAS_INVENTORY', 'PETUGAS_PENYEMBELIHAN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` VARCHAR(191) NULL,
    `access_token` VARCHAR(191) NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` VARCHAR(191) NULL,
    `session_state` VARCHAR(191) NULL,

    UNIQUE INDEX `Account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    UNIQUE INDEX `VerificationToken_identifier_token_key`(`identifier`, `token`)
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
    `alamat` VARCHAR(191) NULL,
    `pesan_khusus` VARCHAR(500) NULL,
    `keterangan` VARCHAR(500) NULL,
    `potong_sendiri` BOOLEAN NOT NULL,
    `ambil_daging` BOOLEAN NULL,
    `mengambilDaging` BOOLEAN NOT NULL DEFAULT false,
    `dash_code` VARCHAR(191) NOT NULL,
    `barcode_image` VARCHAR(191) NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HewanQurban` (
    `id` VARCHAR(191) NOT NULL,
    `tipeId` INTEGER NOT NULL,
    `hewanId` VARCHAR(191) NOT NULL,
    `status` ENUM('TERDAFTAR', 'SIAP_SEMBELIH', 'DISEMBELIH', 'DITIMBANG', 'DIINVENTORI', 'DIDISTRIBUSI') NOT NULL DEFAULT 'TERDAFTAR',
    `slaughtered` BOOLEAN NOT NULL DEFAULT false,
    `slaughteredAt` DATETIME(3) NULL,
    `meatPackageCount` INTEGER NOT NULL DEFAULT 0,
    `onInventory` BOOLEAN NOT NULL DEFAULT false,
    `receivedByMdhohi` BOOLEAN NOT NULL DEFAULT false,
    `isKolektif` BOOLEAN NOT NULL DEFAULT false,
    `isCustom` BOOLEAN NOT NULL DEFAULT false,
    `slotTersisa` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HewanQurban_hewanId_key`(`hewanId`),
    INDEX `HewanQurban_tipeId_idx`(`tipeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TipeHewan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `target` INTEGER NOT NULL,
    `harga` INTEGER NOT NULL,
    `hargaKolektif` INTEGER NULL,
    `note` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `jenis` ENUM('UNTA', 'SAPI', 'DOMBA', 'KAMBING') NOT NULL,

    UNIQUE INDEX `TipeHewan_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProdukHewan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `tipeId` INTEGER NULL,
    `berat` DOUBLE NULL,
    `avgProdPerHewan` INTEGER NOT NULL DEFAULT 1,
    `targetPaket` INTEGER NOT NULL DEFAULT 0,
    `diTimbang` INTEGER NOT NULL DEFAULT 0,
    `diInventori` INTEGER NOT NULL DEFAULT 0,
    `sdhDiserahkan` INTEGER NOT NULL DEFAULT 0,
    `JenisProduk` ENUM('KEPALA', 'BADAN', 'KULIT', 'TULANG', 'TORPEDO', 'KAKI', 'DAGING', 'LAINNYA') NOT NULL,

    UNIQUE INDEX `ProdukHewan_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProdukDikirim` (
    `id` VARCHAR(191) NOT NULL,
    `putaranId` INTEGER NOT NULL,
    `produkId` INTEGER NOT NULL,
    `jumlah` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LogPutaranPickup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `statusPengiriman` ENUM('PENDING', 'DIKIRIM', 'DITERIMA') NOT NULL DEFAULT 'PENDING',
    `waktuPengiriman` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `waktuDiterima` DATETIME(3) NULL,

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
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('PEMASUKAN', 'PENGELUARAN') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `description` TEXT NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `type` ENUM('PEMASUKAN', 'PENGELUARAN') NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
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
    `categoryId` INTEGER NOT NULL,
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
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_mudhohiId_fkey` FOREIGN KEY (`mudhohiId`) REFERENCES `Mudhohi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mudhohi` ADD CONSTRAINT `Mudhohi_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HewanQurban` ADD CONSTRAINT `HewanQurban_tipeId_fkey` FOREIGN KEY (`tipeId`) REFERENCES `TipeHewan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProdukHewan` ADD CONSTRAINT `ProdukHewan_tipeId_fkey` FOREIGN KEY (`tipeId`) REFERENCES `TipeHewan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProdukDikirim` ADD CONSTRAINT `ProdukDikirim_produkId_fkey` FOREIGN KEY (`produkId`) REFERENCES `ProdukHewan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProdukDikirim` ADD CONSTRAINT `ProdukDikirim_putaranId_fkey` FOREIGN KEY (`putaranId`) REFERENCES `LogPutaranPickup`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductLog` ADD CONSTRAINT `ProductLog_produkId_fkey` FOREIGN KEY (`produkId`) REFERENCES `ProdukHewan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ErrorLog` ADD CONSTRAINT `ErrorLog_produkId_fkey` FOREIGN KEY (`produkId`) REFERENCES `ProdukHewan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DistribusiLog` ADD CONSTRAINT `DistribusiLog_penerimaId_fkey` FOREIGN KEY (`penerimaId`) REFERENCES `Penerima`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Penerima` ADD CONSTRAINT `Penerima_distributionId_fkey` FOREIGN KEY (`distributionId`) REFERENCES `Distribution`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `images` ADD CONSTRAINT `images_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_HewanQurbanToMudhohi` ADD CONSTRAINT `_HewanQurbanToMudhohi_A_fkey` FOREIGN KEY (`A`) REFERENCES `HewanQurban`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_HewanQurbanToMudhohi` ADD CONSTRAINT `_HewanQurbanToMudhohi_B_fkey` FOREIGN KEY (`B`) REFERENCES `Mudhohi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DistribusiLogToProdukHewan` ADD CONSTRAINT `_DistribusiLogToProdukHewan_A_fkey` FOREIGN KEY (`A`) REFERENCES `DistribusiLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DistribusiLogToProdukHewan` ADD CONSTRAINT `_DistribusiLogToProdukHewan_B_fkey` FOREIGN KEY (`B`) REFERENCES `ProdukHewan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
