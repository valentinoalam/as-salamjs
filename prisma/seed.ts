import { PrismaClient, JenisProduk, Role, TransactionType } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()
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
  await prisma.distribusi.deleteMany({})

  // Default Categories for INCOME
  const incomeCategories = [
    { name: 'Infaq Qurban', type: TransactionType.PEMASUKAN },
    { name: 'Sedekah Idul Adha', type: TransactionType.PEMASUKAN },
    { name: 'Penjualan Kulit Hewan', type: TransactionType.PEMASUKAN },
    { name: 'Lain-lain (Pemasukan)', type: TransactionType.PEMASUKAN },
  ];
  //   QURBAN_PAYMENT
  //   OPERATIONAL
  //   UPAH
  //   SUPPLIES
  //   TRANSPORT
  //   SALARY
  //   OTHER
  // Default Categories for PENGELUARAN
  const expenseCategories = [
    { name: 'Pembayaran Hewan Qurban', type: TransactionType.PENGELUARAN },
    { name: 'Jasa Pemotongan & Pengulitan', type: TransactionType.PENGELUARAN },
    { name: 'Sewa Alat', type: TransactionType.PENGELUARAN },
    { name: 'Biaya Operational', type: TransactionType.PENGELUARAN },
    { name: 'Belanja Kebutuhan Acara', type: TransactionType.PENGELUARAN },
    { name: 'Transportasi & Akomodasi', type: TransactionType.PENGELUARAN },
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
  console.log(admin)
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
  console.log(petugasPendaftaran)
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
  console.log(petugasInventory)
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
  console.log(petugasPenyembelihan)
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
      harga: 24150000,
      hargaKolektif: 3450000,
      note: "Sapi (berat ±300 kg)",
    },
  })
  console.log(sapi)
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
      harga: 2700000,
      note: "Domba (berat 23-26 kg)",
    },
  })
  console.log(domba)
  // Create ProdukHewan
  const produkHewan = [
    // Sapi products
    {
      nama: "Daging Sapi 1kg",
      tipeId: 1,
      berat: 1.0,
      targetPaket: 300,
      JenisProduk: JenisProduk.DAGING,
    },
    {
      nama: "Daging Sapi 5kg",
      tipeId: 1,
      berat: 5.0,
      targetPaket: 1454,
      JenisProduk: JenisProduk.DAGING,
    },
    {
      nama: "Kepala Sapi",
      tipeId: 1,
      JenisProduk: JenisProduk.KEPALA,
    },
    {
      nama: "Kulit Sapi",
      tipeId: 1,
      JenisProduk: JenisProduk.KULIT,
    },
    {
      nama: "Kaki Sapi",
      tipeId: 1,
      JenisProduk: JenisProduk.KAKI,
    },
    // Domba products
    {
      nama: "Daging Domba 5kg",
      tipeId: 2,
      berat: 5.0,
      targetPaket: 1476,
      JenisProduk: JenisProduk.DAGING,
    },
    {
      nama: "Kepala Domba",
      tipeId: 2,
      JenisProduk: JenisProduk.KEPALA,
    },
    {
      nama: "Kulit Domba",
      tipeId: 2,
      JenisProduk: JenisProduk.KULIT,
    },
    {
      nama: "Kaki Domba",
      tipeId: 2,
      JenisProduk: JenisProduk.KAKI,
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
    await prisma.distribusi.upsert({
      where: { id: category.id },
      update: {},
      create: category,
    })
  }
//   async function generateMudhohi(i:number, hewanId: string) {
//     const mudhohi = await prisma.mudhohi.create({
//       data: {
//         userId: admin.id,
//         nama_pengqurban: `Pengqurban ${i}`,
//         nama_peruntukan: `Peruntukan ${i}`,
//         potong_sendiri: i % 3 === 0,
//         ambil_daging: i % 2 === 0,
//         mengambilDaging: i % 2 === 0,
//         dash_code: `DASH-${i}`,
//         hewan: {
//           connect: [{ hewanId }],
//         },
//       },
//     })

//     await prisma.pembayaran.create({
//       data: {
//         mudhohiId: mudhohi.id,
//         cara_bayar: i % 2 === 0 ? CaraBayar.TUNAI : CaraBayar.TRANSFER,
//         paymentStatus: PaymentStatus.LUNAS,
//         dibayarkan: i % 2 === 0 ? 24150000 : 2700000,
//       },
//     })
//   } 

//   const totalSapi = await prisma.hewanQurban.count({
//     where: {
//       tipeId: 1
//     }
//   });
//   if(totalSapi< 51)
//     // Create HewanQurban (50 sapi)
//     for (let i = 1; i <= 50; i++) {
//       const tipeId = 1
//       const hewanId = await generateHewanId(tipeId)
//       try {
//         await prisma.hewanQurban.create({
//           data: {
//             tipeId, // Sapi
//             hewanId,
//             status: HewanStatus.TERDAFTAR,
//             slaughtered: false,
//             meatPackageCount: 0,
//             onInventory: false,
//             receivedByMdhohi: false,
//             isKolektif: false,
//           },
//         })
//       } catch (e) {
//         if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
//           console.error('ID hewan sudah ada:', hewanId);
//         }
//       }
//       generateMudhohi(i, hewanId)
//     }
//   // Create HewanQurban (350 domba)
//   for (let i = 51; i <= 400; i++) {
//     const tipeId = 2
//     const hewanId = await generateHewanId(tipeId)
//     await prisma.hewanQurban.create({
//       data: {
//         hewanId,
//         tipeId, // Domba
//         status: HewanStatus.TERDAFTAR,
//         slaughtered: false,
//         meatPackageCount: 0,
//         onInventory: false,
//         receivedByMdhohi: false,
//         isKolektif: false,
//       },
//     })
//     generateMudhohi(i, hewanId)
//   }



//   // Create some Penerima
//   for (let i = 1; i <= 50; i++) {
//     const distribusiId = distributionCategories[i % 5].id
//     await prisma.penerima.create({
//       data: {
//         distribusiId,
//         noKupon: `KP-${i}`,
//         receivedBy: `Penerima ${i}`,
//         institusi: i % 3 === 0 ? `Institusi ${i}` : null,
//         noKk: `KK-${i}`,
//         alamat: `Alamat ${i}`,
//         phone: `08123456${i.toString().padStart(4, "0")}`,
//         isDiterima: i % 4 !== 0, // 75% have received
//         receivedAt: i % 4 !== 0 ? new Date() : null,
//       },
//     })
//   }

//   console.log("Database has been seeded with authentication data!")
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:\n', e instanceof Error ? e.stack : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
