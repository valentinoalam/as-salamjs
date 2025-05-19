import { PrismaClient, jenisProduk, HewanStatus, CaraBayar, PaymentStatus, Role, Prisma, JenisHewan, TransactionType } from "@prisma/client"
import { hash } from "bcryptjs"
const prisma = new PrismaClient()

export async function generateHewanId(tipeId: number): Promise<string> {
  // 1. Ambil data TipeHewan
  const tipeHewan = await prisma.tipeHewan.findUnique({
    where: { id: tipeId },
    select: {
      nama: true,
      jenis: true,
      target: true
    }
  });

  if (!tipeHewan) {
    throw new Error('TipeHewan tidak ditemukan');
  }

  // 2. Hitung total hewan dengan tipe ini
  const totalHewan = await prisma.hewanQurban.count({
    where: { tipeId }
  });

  // 3. Tentukan apakah perlu grup khusus
  type SingleQurban = 'KAMBING' | 'DOMBA';
  const isSingleQurban = (jenis: JenisHewan): jenis is SingleQurban => {
    return jenis === JenisHewan.KAMBING || jenis === JenisHewan.DOMBA;
  };
  
  // Kemudian di dalam fungsi:
  const inLargeQuota =  isSingleQurban(tipeHewan.jenis) || tipeHewan.target > 100;

  // 4. Generate ID sesuai logika
  if (inLargeQuota) {
    const groupIndex = Math.floor(totalHewan / 50);
    const remainder = totalHewan % 50;
    const currentNumber = remainder + 1;
    
    const groupChar = String.fromCharCode(65 + groupIndex);
    const formattedNumber = currentNumber.toString().padStart(2, '0');
    
    return `${tipeHewan.nama}_${groupChar}-${formattedNumber}`;
  }
  
  // Untuk kasus normal (non-kambing/domba dan target ≤ 100)
  return `${tipeHewan.nama}_${totalHewan + 1}`;
}

async function main() {
  console.log("🌱 Starting seeding...")

  // Clean up existing data
  console.log("🧹 Cleaning up existing data...")
  await prisma.user.deleteMany({})
    
  await prisma.image.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.transactionCategory.deleteMany({});
  await prisma.setting.deleteMany({});

  await prisma.hewanQurban.deleteMany({})
  await prisma.tipeHewan.deleteMany({})
  await prisma.produkHewan.deleteMany({})
  await prisma.penerima.deleteMany({})
  await prisma.distribution.deleteMany({})

  // Default Categories for INCOME
  const incomeCategories = [
    { name: 'Donasi Qurban', type: TransactionType.PEMASUKAN },
    { name: 'Sedekah Idul Adha', type: TransactionType.PEMASUKAN },
    { name: 'Penjualan Kulit Hewan', type: TransactionType.PEMASUKAN },
    { name: 'Lain-lain (Pemasukan)', type: TransactionType.PEMASUKAN },
  ];
  //   QURBAN_PAYMENT
  //   OPERATIONAL
  //   SUPPLIES
  //   TRANSPORT
  //   SALARY
  //   OTHER
  // Default Categories for PENGELUARAN
  const expenseCategories = [
    { name: 'Pembelian Hewan Qurban - Sapi', type: TransactionType.PENGELUARAN },
    { name: 'Pembelian Hewan Qurban - Kambing', type: TransactionType.PENGELUARAN },
    { name: 'Pembelian Hewan Qurban - Domba', type: TransactionType.PENGELUARAN },
    { name: 'Biaya Perawatan Hewan', type: TransactionType.PENGELUARAN },
    { name: 'Biaya Pemotongan & Pengulitan', type: TransactionType.PENGELUARAN },
    { name: 'Biaya Distribusi Daging', type: TransactionType.PENGELUARAN },
    { name: 'Belanja Bumbu & Bahan Masakan', type: TransactionType.PENGELUARAN },
    { name: 'Transportasi & Akomodasi', type: TransactionType.PENGELUARAN },
    { name: 'Sewa Alat', type: TransactionType.PENGELUARAN },
    { name: 'Lain-lain (Pengeluaran)', type: TransactionType.PENGELUARAN },
  ];
  
  // Create default categories
  for (const category of [...incomeCategories, ...expenseCategories]) {
    await prisma.transactionCategory.create({
      data: category,
    });
  }
  
  // Default Settings
  await prisma.setting.create({
    data: {
      key: 'currency',
      value: 'IDR',
    },
  });

  // Create Admin User with password
  const adminPassword = await hash("admin123", 10)
  const admin = await prisma.user.upsert({
    where: { email: "admin@qurban.org" },
    update: {
      role: Role.ADMIN,
      password: adminPassword,
    },
    create: {
      email: "admin@qurban.org",
      name: "Admin",
      role: Role.ADMIN,
      password: adminPassword,
    },
  })

  // Create other staff users with passwords
  const staffPassword = await hash("staff123", 10)

  const petugasPendaftaran = await prisma.user.upsert({
    where: { email: "pendaftaran@qurban.org" },
    update: {
      password: staffPassword,
    },
    create: {
      email: "pendaftaran@qurban.org",
      name: "Petugas Pendaftaran",
      role: Role.PETUGAS_PENDAFTARAN,
      password: staffPassword,
    },
  })

  const petugasInventory = await prisma.user.upsert({
    where: { email: "inventory@qurban.org" },
    update: {
      password: staffPassword,
    },
    create: {
      email: "inventory@qurban.org",
      name: "Petugas Inventory",
      role: Role.PETUGAS_INVENTORY,
      password: staffPassword,
    },
  })

  const petugasPenyembelihan = await prisma.user.upsert({
    where: { email: "penyembelihan@qurban.org" },
    update: {
      password: staffPassword,
    },
    create: {
      email: "penyembelihan@qurban.org",
      name: "Petugas Penyembelihan",
      role: Role.PETUGAS_PENYEMBELIHAN,
      password: staffPassword,
    },
  })

  // Create TipeHewan
  const sapi = await prisma.tipeHewan.upsert({
    where: { id: 1 },
    update: {
      harga: 24150000,
      note: "Sapi (berat ±300 kg)",
    },
    create: {
      id: 1,
      nama: "sapi",
      target: 60,
      jenis: "SAPI",
      icon: "🐮",
      jmlKantong: 7,
      harga: 24150000,
      note: "Sapi (berat ±300 kg)",
    },
  })

  const domba = await prisma.tipeHewan.upsert({
    where: { id: 2 },
    update: {
      nama: "domba",
      harga: 2700000,
      note: "Domba (berat 23-26 kg)",
    },
    create: {
      id: 2,
      nama: "domba",
      target: 350,
      jenis: "DOMBA",
      icon: "🐐",
      jmlKantong: 2,
      harga: 2700000,
      note: "Domba (berat 23-26 kg)",
    },
  })

  // Create ProdukHewan
  const produkHewan = [
    // Sapi products
    {
      nama: "Daging Sapi 1kg",
      tipeId: 1,
      berat: 1.0,
      targetPaket: 300,
      jenisProduk: jenisProduk.DAGING,
    },
    {
      nama: "Daging Sapi 3kg",
      tipeId: 1,
      berat: 3.0,
      targetPaket: 100,
      jenisProduk: jenisProduk.DAGING,
    },
    {
      nama: "Kepala Sapi",
      tipeId: 1,
      jenisProduk: jenisProduk.KEPALA,
    },
    {
      nama: "Kulit Sapi",
      tipeId: 1,
      jenisProduk: jenisProduk.KULIT,
    },
    {
      nama: "Kaki Sapi",
      tipeId: 1,
      jenisProduk: jenisProduk.KAKI,
    },
    // Domba products
    {
      nama: "Daging Domba 0.5kg",
      tipeId: 2,
      berat: 0.5,
      targetPaket: 150,
      jenisProduk: jenisProduk.DAGING,
    },
    {
      nama: "Kepala Domba",
      tipeId: 2,
      jenisProduk: jenisProduk.KEPALA,
    },
    {
      nama: "Kulit Domba",
      tipeId: 2,
      jenisProduk: jenisProduk.KULIT,
    },
    {
      nama: "Kaki Domba",
      tipeId: 2,
      jenisProduk: jenisProduk.KAKI,
    },
  ]

  for (let i = 0; i < produkHewan.length; i++) {
    await prisma.produkHewan.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        id: i + 1,
        ...produkHewan[i],
      },
    })
  }

  // Create Distribution categories
  const distributionCategories = [
    { id: "dist1", category: "Pengqurban Sapi", target: 100 },
    { id: "dist2", category: "Pengqurban Domba", target: 150 },
    { id: "dist3", category: "Panitia", target: 50 },
    { id: "dist4", category: "RT RW", target: 200 },
    { id: "dist5", category: "Lembaga", target: 100 },
  ]

  for (const category of distributionCategories) {
    await prisma.distribution.upsert({
      where: { id: category.id },
      update: {},
      create: category,
    })
  }
  async function generateMudhohi(i:number, hewanId: string) {
    const mudhohi = await prisma.mudhohi.create({
      data: {
        userId: admin.id,
        paymentId: `pay-${i}`,
        nama_pengqurban: `Pengqurban ${i}`,
        nama_peruntukan: `Peruntukan ${i}`,
        potong_sendiri: i % 3 === 0,
        ambil_daging: i % 2 === 0,
        mengambilDaging: i % 2 === 0,
        dash_code: `DASH-${i}`,
        hewan: {
          connect: [{ hewanId }],
        },
      },
    })

    await prisma.pembayaran.create({
      data: {
        mudhohiId: mudhohi.id,
        cara_bayar: i % 2 === 0 ? CaraBayar.TUNAI : CaraBayar.TRANSFER,
        paymentStatus: PaymentStatus.LUNAS,
        dibayarkan: i % 2 === 0 ? 24150000 : 2700000,
      },
    })
  } 

  const totalSapi = await prisma.hewanQurban.count({
    where: {
      tipeId: 1
    }
  });
  if(totalSapi< 51)
    // Create HewanQurban (50 sapi)
    for (let i = 1; i <= 50; i++) {
      const tipeId = 1
      const hewanId = await generateHewanId(tipeId)
      try {
        await prisma.hewanQurban.create({
          data: {
            tipeId, // Sapi
            hewanId,
            status: HewanStatus.TERDAFTAR,
            slaughtered: false,
            meatPackageCount: 0,
            onInventory: false,
            receivedByMdhohi: false,
            isKolektif: false,
          },
        })
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          console.error('ID hewan sudah ada:', hewanId);
        }
      }
      generateMudhohi(i, hewanId)
    }
  // Create HewanQurban (350 domba)
  for (let i = 51; i <= 400; i++) {
    const tipeId = 2
    const hewanId = await generateHewanId(tipeId)
    await prisma.hewanQurban.create({
      data: {
        hewanId,
        tipeId, // Domba
        status: HewanStatus.TERDAFTAR,
        slaughtered: false,
        meatPackageCount: 0,
        onInventory: false,
        receivedByMdhohi: false,
        isKolektif: false,
      },
    })
    generateMudhohi(i, hewanId)
  }



  // Create some Penerima
  for (let i = 1; i <= 50; i++) {
    const distributionId = distributionCategories[i % 5].id
    await prisma.penerima.create({
      data: {
        distributionId,
        noKupon: `KP-${i}`,
        receivedBy: `Penerima ${i}`,
        institusi: i % 3 === 0 ? `Institusi ${i}` : null,
        noKk: `KK-${i}`,
        alamat: `Alamat ${i}`,
        phone: `08123456${i.toString().padStart(4, "0")}`,
        isDiterima: i % 4 !== 0, // 75% have received
        receivedAt: i % 4 !== 0 ? new Date() : null,
      },
    })
  }

  console.log("Database has been seeded with authentication data!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
