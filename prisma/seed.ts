import { JenisProduk, Role, TransactionType, JenisHewan, CaraBayar, PaymentStatus, StatusKupon } from "@prisma/client"
import { hash } from "bcryptjs"
import { faker } from '@faker-js/faker/locale/id_ID';
import prisma from "#@/lib/server/prisma.ts";
import { createMudhohi } from "#@/lib/server/repositories/createMudhohi.ts";
import { getProdukForAnimal } from "#@/lib/server/services/tipe-hewan.ts";
import moment from "moment-hijri"
import { DEFAULT_FRONTEND_SETTINGS } from "#@/config/settings.ts";

async function main() {
  console.log("🌱 Starting seeding...")

  // Clean up existing data
  console.log("🧹 Cleaning up existing data...")
  await prisma.user.deleteMany({})
    
  await prisma.image.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.transactionCategory.deleteMany({});
  await prisma.setting.deleteMany();
  await prisma.customGroup.deleteMany();

  await prisma.hewanQurban.deleteMany({})
  await prisma.tipeHewan.deleteMany({})
  await prisma.produkHewan.deleteMany({})
  await prisma.penerima.deleteMany({})
  await prisma.distribusi.deleteMany({})
  await prisma.mudhohi.deleteMany({})
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
  const settingsPromises = Object.entries(DEFAULT_FRONTEND_SETTINGS)
    .filter(([key]) => key !== 'customGroups') // Exclude custom groups
    .map(([key, value]) => {
      const dbValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value);
      
      return prisma.setting.upsert({
        where: { key },
        update: { value: dbValue },
        create: { key, value: dbValue },
      });
    });

  // Create custom groups
  const customGroupsPromises = DEFAULT_FRONTEND_SETTINGS.customGroups.map(group => 
    prisma.customGroup.upsert({
      where: { id: group.id },
      update: {
        name: group.name,
        itemCount: group.itemCount,
        description: group.description || '',
        animalType: group.animalType,
        isActive: group.isActive,
      },
      create: {
        id: group.id,
        name: group.name,
        itemCount: group.itemCount,
        description: group.description || '',
        animalType: group.animalType,
        isActive: group.isActive,
      },
    })
  );

  // Execute all operations
  await Promise.all([...settingsPromises, ...customGroupsPromises]);
  // Create Admin User with password
  const adminPassword = await hash("admin123", 10)
  const admin = await prisma.user.upsert({
    where: { email: "admin@qurban.org" },
    update: {
      roles: {
        create: {
          role: Role.ADMIN
        }
      },
      password: adminPassword,
    },
    create: {
      email: "admin@qurban.org",
      name: "Admin",
      roles: {
        create: {
          role: Role.ADMIN
        }
      },
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
      roles: {
        create: {
          role: Role.PETUGAS_PENDAFTARAN
        }
      },
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
      roles: {
        create: {
          role: Role.PETUGAS_INVENTORY
        }
      },
      password: staffPassword,
    },
  })
  console.log(petugasInventory)
  const petugasTimbang = await prisma.user.upsert({
    where: { email: "penyembelihan@qurban.org" },
    update: {
      password: staffPassword,
    },
    create: {
      email: "penyembelihan@qurban.org",
      name: "Petugas Timbang",
      roles: {
        create: {
          role: Role.PETUGAS_TIMBANG
        }
      },
      password: staffPassword,
    },
  })
  console.log(petugasTimbang)
  // Create TipeHewan
  const count = await prisma.tipeHewan.count();
  if (count === 0) {
    console.log('TipeHewan table is empty. Creating initial data...');
    const initialTipeHewanData = [
      {
        id: 1,
        nama: 'sapi',
        target: 60,
        jenis: 'SAPI' as const,
        icon: '🐮',
        harga: 24150000,
        hargaKolektif: 3450000,
        note: 'Sapi (berat ±300 kg)',
      },
      {
        id: 2,
        nama: 'domba',
        target: 350,
        jenis: 'DOMBA' as const,
        icon: '🐐',
        harga: 2700000,
        // If domba doesn't always have hargaKolektif, you might need to make it optional in your schema
        // or provide a default/null if applicable. Assuming it's nullable here.
        hargaKolektif: null,
        note: 'Domba (berat 23-26 kg)',
      },
    ];

    await prisma.tipeHewan.createMany({
      data: initialTipeHewanData,
      skipDuplicates: true // Optional: Add this if you want to prevent errors if some IDs somehow already exist
    });
  }
  const tipeHewan = await prisma.tipeHewan.findMany()
  // Create ProdukHewan
  const produkHewanData = [
    // Sapi products
    {
      nama: "Daging Sapi 1kg",
      JenisHewan: JenisHewan.SAPI,
      berat: 1.0,
      targetPaket: 300,
      JenisProduk: JenisProduk.DAGING,
    },
    {
      nama: "Daging Sapi 5kg",
      JenisHewan: JenisHewan.SAPI,
      berat: 5.0,
      targetPaket: 1454,
      JenisProduk: JenisProduk.DAGING,
    },
    {
      nama: "Kepala Sapi",
      JenisHewan: JenisHewan.SAPI,
      JenisProduk: JenisProduk.KEPALA,
    },
    {
      nama: "Kulit Sapi",
      JenisHewan: JenisHewan.SAPI,
      JenisProduk: JenisProduk.KULIT,
    },
    {
      nama: "Kaki Sapi",
      JenisHewan: JenisHewan.SAPI,
      JenisProduk: JenisProduk.KAKI,
    },
    // Domba products
    {
      nama: "Daging Domba 5kg",
      JenisHewan: JenisHewan.DOMBA,
      berat: 5.0,
      targetPaket: 1476,
      JenisProduk: JenisProduk.DAGING,
    },
    {
      nama: "Kepala Domba",
      JenisHewan: JenisHewan.DOMBA,
      JenisProduk: JenisProduk.KEPALA,
    },
    {
      nama: "Kulit Domba",
      JenisHewan: JenisHewan.DOMBA,
      JenisProduk: JenisProduk.KULIT,
    },
    {
      nama: "Kaki Belakang Domba",
      JenisHewan: JenisHewan.DOMBA,
      JenisProduk: JenisProduk.KAKI,
    },
  ]

  for (let i = 0; i < produkHewanData.length; i++) {
    await prisma.produkHewan.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        ...produkHewanData[i],
      },
    })
  }
  const produkHewan = await prisma.produkHewan.findMany()


  const users = [];
  const generatedNames = faker.helpers.uniqueArray(faker.person.fullName, 410)
  const namesSet = new Set(generatedNames);
  const names = Array.from(namesSet);
  for (let i = 0; i < 10; i++) {
    const [firstName, lastName] = names[i].split(" ", 2); // Split original name

    users.push(await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email: faker.internet.email({ firstName, lastName }),
        password: faker.internet.password(),
        roles: {
          create: {
            role: Role.MEMBER
          }
        },
        phone: faker.phone.number({style:'human'}),
        image: faker.image.avatar(),
      }
    }));
  }

  const distribusiKategori = ['Mudhohi', 'Mustahik', 'Panitia', 'Yatim', 'Dhuafa'];
  const distribusiList = await Promise.all(
    distribusiKategori.map(kategori => 
      prisma.distribusi.upsert({
        where: { kategori: kategori },
        update: {},
        create: {
          kategori,
          target: faker.number.int({ min: 50, max: 200 }),
          realisasi: faker.number.int({ min: 30, max: 150 }),
        }
      })
    )
  );

  // 5. Seed Mudhohi dan relasinya
  const caraBayarOptions: CaraBayar[] = ['TRANSFER', 'TUNAI'];
  const paymentStatusOptions: PaymentStatus[] = [
    'BELUM_BAYAR', 
    'MENUNGGU_KONFIRMASI', 
    'LUNAS', 
    'DOWN_PAYMENT',
    'LUNAS',
    'BATAL'
  ];

  const allMudhohi = [];

  let totalSapiCount = 0;
  const MAX_SAPI = 25; // Maximum total Sapi to be generated
  let totalDombaCount = 0;
  const MIN_DOMBA_TARGET = 200; 
  // Set a maximum number of iterations to prevent infinite loops,
  // especially if animal targets are hard to reach with certain random distributions.
  const MAX_MUDHOHI_ITERATIONS = names.length - 10; // Sufficient iterations to hit Domba target

  for (let i = 0; i < MAX_MUDHOHI_ITERATIONS; i++) {
    // Check if both animal targets have been sufficiently met
    if (totalSapiCount >= MAX_SAPI && totalDombaCount >= MIN_DOMBA_TARGET) {
      console.log("Animal targets met. Breaking Mudhohi creation loop.");
      break;
    }
    const user = faker.helpers.arrayElement(users);
    let hewanType;
    let possibleHewanTypes = [...tipeHewan]; // Start with all animal types

    // Filter out 'Sapi' if the maximum limit for Sapi is already reached
    if (totalSapiCount >= MAX_SAPI) {
      possibleHewanTypes = possibleHewanTypes.filter(h => h.jenis.toLowerCase() !== 'sapi');
    }

    // Prioritize 'Domba' if the minimum target for Domba has not been met yet
    if (totalDombaCount < MIN_DOMBA_TARGET) {
      const dombaType = possibleHewanTypes.find(h => h.jenis.toLowerCase() === 'domba');
      if (dombaType) {
        // 70% chance to pick Domba if target not met and Domba is available
        if (Math.random() < 0.7) {
          hewanType = dombaType;
        } else {
          // Otherwise, pick randomly from remaining available types (could be Kambing or Sapi if not maxed)
          hewanType = faker.helpers.arrayElement(possibleHewanTypes);
        }
      } else {
        // Fallback if Domba somehow wasn't available in possibleHewanTypes (unlikely with initial setup)
        hewanType = faker.helpers.arrayElement(possibleHewanTypes);
      }
    } else {
      // If Domba target is met, just pick randomly from the remaining possible types
      hewanType = faker.helpers.arrayElement(possibleHewanTypes);
    }

    // If no suitable animal type can be picked (e.g., all limits are met or no types left),
    // it means we can stop trying to create more Mudhohi entries for animals.
    if (!hewanType) {
      console.warn("No suitable animal type found to create more Mudhohi entries. Breaking loop.");
      break;
    }

    // Determine if the purchase is collective (`isKolektif`)
    let isKolektif = false;
    // Sapi has a higher chance to be collective if its hargaKolektif is available
    if (hewanType.jenis.toLowerCase() === 'Sapi' && hewanType.hargaKolektif !== null) {
      isKolektif = Math.random() < 0.85; // 85% chance for Sapi to be collective
    } else if (hewanType.hargaKolektif !== null) {
      // For other animal types that support collective pricing, use default boolean chance
      isKolektif = faker.datatype.boolean();
    }

    // Determine the quantity of animals for this Mudhohi entry
    let quantity;
    if (isKolektif) {
      // For collective purchases, quantity can be between 1 and 7 (as per original logic)
      quantity = faker.number.int({ min: 1, max: 7 });
    } else {
      // For individual purchases: usually 1, but sometimes 2 or 3 (80% for 1, 10% for 2, 10% for 3)
      quantity = faker.helpers.arrayElement([1, 1, 1, 1, 1, 1, 2, 3, 4]); // Slightly adjusted for more variety
    }

    // Pre-check and adjust quantity to prevent exceeding Sapi limit
    if (hewanType.jenis.toLowerCase() === 'Sapi' && (totalSapiCount + quantity) > MAX_SAPI) {
      if (totalSapiCount < MAX_SAPI) {
        // If there's still some room for Sapi, take only the remaining quantity needed
        quantity = MAX_SAPI - totalSapiCount;
        if (quantity <= 0) { // If no room or already exactly at limit, skip this Sapi entry
          continue;
        }
      } else {
        // Sapi limit already reached, skip creating this Sapi entry
        continue;
      }
    }
    const unitPrice = isKolektif ? hewanType.hargaKolektif! : hewanType.harga;
    const totalAmount = unitPrice * quantity;
    // Randomly select jatah products (0-2 items)
    let jatahPengqurban: number[] = [];
    const availableProducts = getProdukForAnimal(hewanType.jenis);
    if (availableProducts.length > 0) {
      // Determine how many unique products you want to select (up to 3 in your original logic)
      // To ensure uniqueness from availableProducts, it's better to pick from a shuffled array
      // or keep track of already chosen items.
      const numProductsToSelect = Math.min(Math.floor(Math.random() * 3) + 1, availableProducts.length); // At least 1, up to 3, and not more than available products

      // Create a Set to store unique product IDs
      const uniqueProductIds = new Set<number>();

      // To avoid repeatedly picking the same randomProduct (from availableProducts)
      // and to ensure we get 'numProductsToSelect' distinct types of products,
      // it's good practice to shuffle availableProducts and pick from the start.
      const shuffledAvailableProducts = [...availableProducts].sort(() => 0.5 - Math.random());

      for (let i = 0; i < numProductsToSelect; i++) {
        const randomProductType = shuffledAvailableProducts[i]; // Get a unique product type from the shuffled list

        // Find a matching product in the master produkHewan list
        const foundProduct = produkHewan.find(
            (product) =>
                product.JenisProduk.toLowerCase()  === randomProductType.toLowerCase()  && // Compare directly if both are enums/strings
                product.JenisHewan === hewanType.jenis
        );

        if (foundProduct?.id) { // Only add if foundProduct exists and has an ID
            uniqueProductIds.add(foundProduct.id);
        }
      }

      // Convert the Set of unique IDs back to an array
      jatahPengqurban = Array.from(uniqueProductIds);
    }
    const date = moment().iYear(); // Get current Hijri year
    const hijriDate = moment(`${date}-12-10`, 'iYYYY-iMM-iDD');
    const dzulhijjah10 = hijriDate.toDate();
    // Generate random transaction date from 10 Dzulhijjah to 30 days before
    const daysBefore = faker.number.int({ min: 0, max: 30 }); // Random days to subtract (0 to 30)
    const createdAt = moment(dzulhijjah10).subtract(daysBefore, 'days').toDate();
    const nama_pengqurban = names[i+10];

    const [firstName, lastName] = nama_pengqurban.split(" ", 2); // Split original name

    const mudhohi = await createMudhohi({
      createdAt,
      nama_pengqurban,
      nama_peruntukan: faker.helpers.maybe(() => faker.person.fullName()),
      email: faker.internet.email({firstName, lastName}),
      phone: user.phone || faker.phone.number({ style: 'human' }),
      alamat: faker.location.streetAddress(),
      pesan_khusus: faker.helpers.maybe(() => faker.lorem.sentence()),
      keterangan: faker.helpers.maybe(() => faker.lorem.sentence()),
      potong_sendiri: faker.datatype.boolean(),
      ambil_daging: faker.datatype.boolean(),
      cara_bayar: faker.helpers.arrayElement(caraBayarOptions),
      paymentStatus: faker.helpers.arrayElement(paymentStatusOptions),
      urlTandaBukti: faker.helpers.maybe(() => faker.image.url()),
      dibayarkan: faker.number.float({ min: 0, max: totalAmount }),
      kodeResi: faker.helpers.maybe(() => faker.string.alphanumeric(10)),
      quantity,
      isKolektif,
      tipeHewanId: hewanType.id,
      jatahPengqurban,
    });
    allMudhohi.push(mudhohi);
    
    // Update total animal counts
    if (hewanType.jenis.toLowerCase() === 'sapi') {
      totalSapiCount += quantity;
    } else if (hewanType.jenis.toLowerCase() === 'domba') {
      totalDombaCount += quantity;
    }

    // Optional: Log progress
    console.log(`Mudhohi ${mudhohi.data.id.substring(0, 4)}... created: ${hewanType.jenis} x ${quantity}. Kolektif: ${isKolektif}. Current Sapi: ${totalSapiCount}/${MAX_SAPI}, Domba: ${totalDombaCount}/${MIN_DOMBA_TARGET}`);
  }
  // 6. Seed Kupon
  const kuponStatuses: StatusKupon[] = ['AVAILABLE', 'DISTRIBUTED'];
  const kuponList = [];

  for (let i = 0; i < 50; i++) {
    const kupon = await prisma.kupon.create({
      data: {
        status: faker.helpers.arrayElement(kuponStatuses),
      }
    });
    kuponList.push(kupon);
  }


  console.log('✅ Database seeded successfully!');
  console.log(`📊 Created: 
  - ${tipeHewan.length} tipe hewan
  - ${produkHewan.length} produk hewan
  - ${distribusiList.length} distribusi
  - ${users.length} users
  - ${allMudhohi.length} mudhohi
  - ${kuponList.length} kupon`);
  console.log("Database has been seeded with authentication data!")
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:\n', e instanceof Error ? e.stack : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
