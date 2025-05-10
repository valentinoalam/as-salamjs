import { PrismaClient, jenisProduk, HewanStatus, CaraBayar, PaymentStatus, Role } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
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
      nama: "Sapi",
      icon: "🐮",
      jmlKantong: 7,
      harga: 24150000,
      note: "Sapi (berat ±300 kg)",
    },
  })

  const domba = await prisma.tipeHewan.upsert({
    where: { id: 2 },
    update: {
      nama: "Domba",
      harga: 2700000,
      note: "Domba (berat 23-26 kg)",
    },
    create: {
      id: 2,
      nama: "Domba",
      icon: "🐐",
      jmlKantong: 2,
      harga: 2700000,
      note: "Domba (berat 23-26 kg)",
    },
  })

  const sapiKolektif = await prisma.tipeHewan.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      nama: "Sapi Kolektif",
      icon: "🐮",
      jmlKantong: 1,
      harga: 3450000,
      note: "Sapi Patungan (berat ±300 kg)",
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

  // Create HewanQurban (50 sapi)
  for (let i = 1; i <= 50; i++) {
    await prisma.hewanQurban.upsert({
      where: { animalId: i },
      update: {},
      create: {
        animalId: i,
        tipeId: 1, // Sapi
        status: HewanStatus.TERDAFTAR,
        slaughtered: false,
        meatPackageCount: 0,
        onInventory: false,
        receivedByMdhohi: false,
        isKolektif: false,
      },
    })
  }

  // Create HewanQurban (350 domba)
  for (let i = 51; i <= 400; i++) {
    await prisma.hewanQurban.upsert({
      where: { animalId: i },
      update: {},
      create: {
        animalId: i,
        tipeId: 2, // Domba
        status: HewanStatus.TERDAFTAR,
        slaughtered: false,
        meatPackageCount: 0,
        onInventory: false,
        receivedByMdhohi: false,
        isKolektif: false,
      },
    })
  }

  // Create some Mudhohi with Pembayaran
  for (let i = 1; i <= 20; i++) {
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
          connect: [{ animalId: i }],
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
