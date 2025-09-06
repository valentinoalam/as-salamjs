/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import prisma from '#@/lib/server/prisma.ts';
import { createMudhohi } from '#@/lib/server/repositories/createMudhohi.ts';
import { sendOrderConfirmationEmail } from '#@/lib/server/services/email.ts';
import { PaymentStatus, CaraBayar, Role, HewanStatus, JenisHewan, StatusKupon, JenisDistribusi } from '@prisma/client';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';

// Mock the external service functions
jest.mock('../src/services/kolektifHewanService', () => ({
  findOrCreateKolektifHewan: jest.fn(() => ({
    id: 'mock-kolektif-parent-id',
    hewanId: 'mock-kolektif-hewan-id',
    slotTersisa: 6, // Contoh sisa slot setelah 1 part dibeli
  })),
}));
jest.mock('../src/services/hewanIdGenerator', () => ({
  generateHewanId: jest.fn(() => 'mock-hewan-id-individual'),
}));
jest.mock('../src/services/dashCodeGenerator', () => ({
  generateDashCode: jest.fn(() => 'DASHCODE123'),
}));
jest.mock('../src/services/qrCodeGenerator', () => ({
  generateQRCodeToFile: jest.fn(() => 'http://localhost/qr-codes/DASHCODE123.png'),
}));

// Mock sendOrderConfirmationEmail
jest.mock('../src/services/mudhohiService', () => ({
  ...jest.requireActual('../src/services/mudhohiService'), // Keep actual implementations for other exports
  sendOrderConfirmationEmail: jest.fn(),
}));

// Cast prisma to DeepMockProxy type for better type hinting
const mockPrisma = prisma as unknown as DeepMockProxy<typeof prisma>;

describe('createMudhohi', () => {
  const commonTipeHewan = {
    id: 1,
    nama: 'Sapi',
    jenis: JenisHewan.SAPI,
    target: 7,
    harga: 25000000,
    hargaKolektif: 3571428,
    icon: null,
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseMudhohiData = {
    nama_pengqurban: 'Test Pengqurban',
    email: 'test@example.com',
    phone: '081234567890',
    potong_sendiri: false,
    ambil_daging: true,
    tipeHewanId: commonTipeHewan.id,
    isKolektif: false,
    quantity: 1,
    cara_bayar: CaraBayar.TRANSFER,
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma)); // Mock transaction to run callback directly
    // Mock tipeHewan.findUnique for all tests unless overridden
    mockPrisma.tipeHewan.findUnique.mockResolvedValue(commonTipeHewan);
  });

  // --- A. Skenario Pengunjung Baru (Guest Checkout) ---
  describe('A.1: New Guest Checkout User - First Transaction', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // No user by ID
      mockPrisma.user.findFirst.mockResolvedValue(null); // No user by email/name
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-guest-user-id',
        name: baseMudhohiData.nama_pengqurban,
        email: baseMudhohiData.email,
        phone: baseMudhohiData.phone,
        password: 'password123',
        image: null,
        role: Role.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: null
      });
      mockPrisma.mudhohi.create.mockResolvedValue({
        id: 'mudhohi-id-1',
        userId: 'new-guest-user-id',
        dash_code: 'DASHCODE123',
        nama_pengqurban: baseMudhohiData.nama_pengqurban,
        nama_peruntukan: null,
        pesan_khusus: null,
        keterangan: null,
        potong_sendiri: false,
        ambil_daging: true,
        createdAt: new Date(),
        qrcode_url: null,
        alamat: null,
        jatahQurbanid: 'penerima-id-1'
      });
      mockPrisma.mudhohi.update.mockResolvedValue(true as any); // Mock the update for QR code
      mockPrisma.pembayaran.create.mockResolvedValue({
        id: 'payment-id-1',
        mudhohiId: 'mudhohi-id-1',
        cara_bayar: CaraBayar.TRANSFER,
        paymentStatus: PaymentStatus.BELUM_BAYAR,
        totalAmount: commonTipeHewan.harga,
        quantity: 1,
        isKolektif: false,
        tipeid: commonTipeHewan.id,
        urlTandaBukti: null,
        dibayarkan: 0,
        kodeResi: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.hewanQurban.create.mockResolvedValue({
        id: 'hewan-record-id-1',
        tipeId: commonTipeHewan.id,
        hewanId: 'mock-hewan-id-individual',
        isKolektif: false,
        slotTersisa: null,
        keterangan: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: HewanStatus.TERDAFTAR,
        slaughtered: false,
        slaughteredAt: null,
        meatPackageCount: 0,
        onInventory: false,
        receivedByMdhohi: false,
        isCustom: false
      });
      mockPrisma.distribusi.upsert.mockResolvedValue({
        id: 'distribusi-id-1',
        kategori: 'Mudhohi',
        target: 1,
        realisasi: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.penerima.create.mockResolvedValue({
        id: 'penerima-id-1',
        distribusiId: 'distribusi-id-1',
        nama: baseMudhohiData.nama_pengqurban,
        jenis: JenisDistribusi.INDIVIDU,
        sudahMenerima: false,
        createdAt: new Date(),
        alamat: null,
        keterangan: null,
        diterimaOleh: null,
        noIdentitas: null,
        jenisId: null,
        telepon: null,
        waktuTerima: null
      });
    });

    it('should create a new user and mudhohi record for a first-time guest', async () => {
      const result = await createMudhohi(baseMudhohiData);

      // Verify User Creation
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: '' } }); // userId is empty
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ email: baseMudhohiData.email }, { name: baseMudhohiData.nama_pengqurban }] },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: baseMudhohiData.email,
          name: baseMudhohiData.nama_pengqurban,
          phone: baseMudhohiData.phone,
          password: 'password123',
        }),
      );
      expect(result.data.isNewUser).toBe(true);
      expect(result.data.user.id).toBe('new-guest-user-id');

      // Verify Mudhohi Creation
      expect(mockPrisma.mudhohi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'new-guest-user-id',
          nama_pengqurban: baseMudhohiData.nama_pengqurban,
          payment: {
            create: expect.objectContaining({
              totalAmount: commonTipeHewan.harga,
              quantity: 1,
            }),
          },
        }),
      );

      // Verify Email Sending
      expect(sendOrderConfirmationEmail).toHaveBeenCalledWith(
        baseMudhohiData.email,
        expect.objectContaining({
          orderId: 'mudhohi-id-1',
          dashCode: 'DASHCODE123',
        }),
        true, // isNewUser
        false, // isGoogleAuth
      );
      expect(console.log).toHaveBeenCalledWith(
        'TODO: Buat session login untuk user ID: new-guest-user-id (jika belum ada)',
      );
    });
  });

  // --- B. Skenario Pengunjung Berulang (Guest Checkout / Manual) ---
  describe('B.1: Returning Guest - Email Already Exists', () => {
    const existingUser = {
      id: 'existing-guest-user-id',
      email: 'existing@example.com',
      name: 'Existing User',
      phone: '0987654321',
      password: 'hashedpassword',
      image: null,
      role: Role.MEMBER,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: new Date()
    };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // No user by ID
      mockPrisma.user.findFirst.mockResolvedValue(existingUser); // User found by email
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        phone: baseMudhohiData.phone,
        emailVerified: null
      });
      mockPrisma.mudhohi.create.mockResolvedValue({
        id: 'mudhohi-id-2',
        userId: existingUser.id,
        dash_code: 'DASHCODE123',
        nama_pengqurban: baseMudhohiData.nama_pengqurban,
        nama_peruntukan: null,
        pesan_khusus: null,
        keterangan: null,
        potong_sendiri: false,
        ambil_daging: true,
        createdAt: new Date(),
        qrcode_url: null,
        alamat: null,
        jatahQurbanid: 'penerima-id-2'
      });
      mockPrisma.mudhohi.update.mockResolvedValue({
        id: 'mudhohi-id-2',
        userId: existingUser.id,
        nama_pengqurban: baseMudhohiData.nama_pengqurban,
        nama_peruntukan: null,
        alamat: null,
        pesan_khusus: null,
        keterangan: null,
        ambil_daging: true,
        potong_sendiri: false,
        dash_code: 'DASHCODE123',
        qrcode_url: 'http://localhost/qr-codes/DASHCODE123.png',
        jatahQurbanid: 'penerima-id-2',
        createdAt: new Date()
      });
      mockPrisma.pembayaran.create.mockResolvedValue({
        id: 'payment-id-2',
        mudhohiId: 'mudhohi-id-2',
        cara_bayar: CaraBayar.TRANSFER,
        paymentStatus: PaymentStatus.BELUM_BAYAR,
        totalAmount: commonTipeHewan.harga,
        quantity: 1,
        isKolektif: false,
        tipeid: commonTipeHewan.id,
        urlTandaBukti: null,
        dibayarkan: 0,
        kodeResi: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.hewanQurban.create.mockResolvedValue({
        id: 'hewan-record-id-2',
        tipeId: commonTipeHewan.id,
        hewanId: 'mock-hewan-id-individual',
        isKolektif: false,
        slotTersisa: null,
        keterangan: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: HewanStatus.TERDAFTAR,
        slaughtered: false,
        slaughteredAt: null,
        meatPackageCount: 0,
        onInventory: false,
        receivedByMdhohi: false,
        isCustom: false
      });
      mockPrisma.distribusi.upsert.mockResolvedValue({
        id: 'distribusi-id-2',
        kategori: 'Mudhohi',
        target: 1,
        realisasi: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.penerima.create.mockResolvedValue({
        id: 'penerima-id-2',
        distribusiId: 'distribusi-id-2',
        nama: baseMudhohiData.nama_pengqurban,
        jenis: JenisDistribusi.INDIVIDU,
        sudahMenerima: false,
        createdAt: new Date(),
        alamat: null,
        keterangan: null,
        diterimaOleh: null,
        noIdentitas: null,
        jenisId: null,
        telepon: null,
        waktuTerima: null
      });
    });

    it('should find and update existing user and create mudhohi for returning guest', async () => {
      const data = { ...baseMudhohiData, email: existingUser.email, nama_pengqurban: 'Updated Pengqurban Name' };
      const result = await createMudhohi(data);

      // Verify User finding and update
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ email: data.email }, { name: data.nama_pengqurban }] },
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled(); // No new user created
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: existingUser.id },
          data: expect.objectContaining({
            email: data.email,
            phone: data.phone,
            name: 'Updated Pengqurban Name', // Should update if it was null or different
          }),
        }),
      );
      expect(result.data.isNewUser).toBe(false);
      expect(result.data.user.id).toBe(existingUser.id);

      // Verify Mudhohi Creation
      expect(mockPrisma.mudhohi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: existingUser.id,
        }),
      );

      // Verify Email Sending
      expect(sendOrderConfirmationEmail).toHaveBeenCalledWith(
        data.email,
        expect.anything(),
        false, // isNewUser
        false, // isGoogleAuth
      );
    });
  });

  // --- C. Skenario Login dengan Google ---
  describe('C.1: New User - Sign Up with Google', () => {
    const googleUserData = {
      email: 'new.google@example.com',
      name: 'New Google User',
      accountProvider: 'google',
      accountProviderId: 'google-id-new-user',
      phone: '08111222333',
    };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // No user by ID
      mockPrisma.account.findUnique.mockResolvedValue(null); // No account found
      mockPrisma.user.findFirst.mockResolvedValue(null); // No user by email/name
      mockPrisma.user.create.mockResolvedValue({
        id: 'google-new-user-id',
        email: googleUserData.email,
        name: googleUserData.name,
        phone: googleUserData.phone,
        password: 'password123',
        image: null,
        role: Role.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: null
      });
      mockPrisma.account.create.mockResolvedValue({
        id: 'account-id-new',
        userId: 'google-new-user-id',
        type: 'oauth',
        provider: googleUserData.accountProvider,
        providerAccountId: googleUserData.accountProviderId,
        refresh_token: null,
        access_token: null,
        expires_at: null,
        token_type: null,
        scope: null,
        id_token: null,
        session_state: null,
      });
      mockPrisma.mudhohi.create.mockResolvedValue({
        id: 'mudhohi-id-3',
        userId: 'google-new-user-id',
        dash_code: 'DASHCODE123',
        nama_pengqurban: googleUserData.name,
        nama_peruntukan: null,
        pesan_khusus: null,
        keterangan: null,
        potong_sendiri: false,
        ambil_daging: true,
        createdAt: new Date(),
        qrcode_url: null,
        alamat: null,
        jatahQurbanid: 'penerima-id-3'
      });
      mockPrisma.mudhohi.update.mockResolvedValue(true as any);
      mockPrisma.pembayaran.create.mockResolvedValue({
        id: 'payment-id-3',
        mudhohiId: 'mudhohi-id-3',
        cara_bayar: CaraBayar.TRANSFER,
        paymentStatus: PaymentStatus.BELUM_BAYAR,
        totalAmount: commonTipeHewan.harga,
        quantity: 1,
        isKolektif: false,
        tipeid: commonTipeHewan.id,
        urlTandaBukti: null,
        dibayarkan: 0,
        kodeResi: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.hewanQurban.create.mockResolvedValue({
        id: 'hewan-record-id-3',
        tipeId: commonTipeHewan.id,
        hewanId: 'mock-hewan-id-individual',
        isKolektif: false,
        slotTersisa: null,
        keterangan: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: HewanStatus.TERDAFTAR,
        slaughtered: false,
        slaughteredAt: null,
        meatPackageCount: 0,
        onInventory: false,
        receivedByMdhohi: false,
        isCustom: false
      });
      mockPrisma.distribusi.upsert.mockResolvedValue({
        id: 'distribusi-id-3',
        kategori: 'Mudhohi',
        target: 1,
        realisasi: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.penerima.create.mockResolvedValue({
        id: 'penerima-id-3',
        distribusiId: 'distribusi-id-3',
        nama: googleUserData.name,
        jenis: JenisDistribusi.INDIVIDU,
        sudahMenerima: false,
        createdAt: new Date(),
        alamat: null,
        keterangan: null,
        diterimaOleh: null,
        noIdentitas: null,
        jenisId: null,
        telepon: null,
        waktuTerima: null
      });
    });

    it('should create new user and account when signing up with Google for the first time', async () => {
      const data = { ...baseMudhohiData, ...googleUserData };
      const result = await createMudhohi(data);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: googleUserData.email,
          name: googleUserData.name,
          phone: googleUserData.phone,
        }),
      );
      expect(mockPrisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'google-new-user-id',
          provider: googleUserData.accountProvider,
          providerAccountId: googleUserData.accountProviderId,
        }),
      );
      expect(result.data.isNewUser).toBe(true);
      expect(result.data.user.id).toBe('google-new-user-id');

      expect(sendOrderConfirmationEmail).toHaveBeenCalledWith(
        googleUserData.email,
        expect.anything(),
        true, // isNewUser
        true, // isGoogleAuth
      );
    });
  });

  describe('C.3: Existing User - First Google Login (email already in manual system)', () => {
    const existingManualUser = {
      id: 'manual-user-id',
      email: 'manual@example.com',
      name: 'Manual User',
      phone: '08555444333',
      password: 'manualhashedpassword',
      image: null,
      role: Role.MEMBER,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: null
    };
    const googleLoginData = {
      email: existingManualUser.email,
      name: 'Updated Google Name', // Name from Google might be different
      accountProvider: 'google',
      accountProviderId: 'google-id-for-manual-user',
      phone: '08555444333',
    };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // No user by ID
      mockPrisma.account.findUnique.mockResolvedValue(null); // No account found by providerId
      mockPrisma.user.findFirst.mockResolvedValue(existingManualUser); // Found user by email
      mockPrisma.user.update.mockResolvedValue({
        ...existingManualUser,
        name: googleLoginData.name,
        emailVerified: null
      });
      mockPrisma.account.create.mockResolvedValue({
        id: 'account-id-linked',
        userId: existingManualUser.id,
        type: 'oauth',
        provider: googleLoginData.accountProvider,
        providerAccountId: googleLoginData.accountProviderId,
        refresh_token: null,
        access_token: null,
        expires_at: null,
        token_type: null,
        scope: null,
        id_token: null,
        session_state: null,
      });
      mockPrisma.mudhohi.create.mockResolvedValue({
        id: 'mudhohi-id-4',
        userId: existingManualUser.id,
        dash_code: 'DASHCODE123',
        nama_pengqurban: googleLoginData.name,
        nama_peruntukan: null,
        pesan_khusus: null,
        keterangan: null,
        potong_sendiri: false,
        ambil_daging: true,
        createdAt: new Date(),
        qrcode_url: null,
        alamat: null,
        jatahQurbanid: 'penerima-id-4'
      });
      mockPrisma.mudhohi.update.mockResolvedValue(true as any);
      mockPrisma.pembayaran.create.mockResolvedValue({
        id: 'payment-id-4',
        mudhohiId: 'mudhohi-id-4',
        cara_bayar: CaraBayar.TRANSFER,
        paymentStatus: PaymentStatus.BELUM_BAYAR,
        totalAmount: commonTipeHewan.harga,
        quantity: 1,
        isKolektif: false,
        tipeid: commonTipeHewan.id,
        urlTandaBukti: null,
        dibayarkan: 0,
        kodeResi: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.hewanQurban.create.mockResolvedValue({
        id: 'hewan-record-id-4',
        tipeId: commonTipeHewan.id,
        hewanId: 'mock-hewan-id-individual',
        isKolektif: false,
        slotTersisa: null,
        keterangan: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: HewanStatus.TERDAFTAR,
        slaughtered: false,
        slaughteredAt: null,
        meatPackageCount: 0,
        onInventory: false,
        receivedByMdhohi: false,
        isCustom: false
      });
      mockPrisma.distribusi.upsert.mockResolvedValue({
        id: 'distribusi-id-4',
        kategori: 'Mudhohi',
        target: 1,
        realisasi: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.penerima.create.mockResolvedValue({
        id: 'penerima-id-4',
        distribusiId: 'distribusi-id-4',
        nama: googleLoginData.name,
        jenis: JenisDistribusi.INDIVIDU,
        sudahMenerima: false,
        createdAt: new Date(),
        alamat: null,
        keterangan: null,
        diterimaOleh: null,
        noIdentitas: null,
        jenisId: null,
        telepon: null,
        waktuTerima: null
      });
    });

    it('should link existing manual user to a new Google account', async () => {
      const data = { ...baseMudhohiData, ...googleLoginData };
      const result = await createMudhohi(data);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ email: data.email }, { name: data.nama_pengqurban }] },
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled(); // No new user created
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: existingManualUser.id },
          data: expect.objectContaining({
            email: googleLoginData.email,
            name: googleLoginData.name, // Name should be updated from Google
          }),
        }),
      );
      expect(mockPrisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: existingManualUser.id,
          provider: googleLoginData.accountProvider,
          providerAccountId: googleLoginData.accountProviderId,
        }),
      );
      expect(result.data.isNewUser).toBe(false);
      expect(result.data.user.id).toBe(existingManualUser.id);

      expect(sendOrderConfirmationEmail).toHaveBeenCalledWith(
        googleLoginData.email,
        expect.anything(),
        false, // isNewUser
        true, // isGoogleAuth
      );
    });
  });

  // --- D. Skenario User Sudah Login ---
  describe('D.1: Logged-in User - Normal Transaction', () => {
    const loggedInUser = {
      id: 'logged-in-user-id',
      email: 'loggedin@example.com',
      name: 'Logged In User',
      phone: '08123456789',
      password: 'hashedpassword',
      image: null,
      role: Role.MEMBER,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: null
    };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(loggedInUser); // User found by userId
      mockPrisma.user.update.mockResolvedValue(loggedInUser); // Simulate no update needed
      mockPrisma.mudhohi.create.mockResolvedValue({
        id: 'mudhohi-id-5',
        userId: loggedInUser.id,
        dash_code: 'DASHCODE123',
        nama_pengqurban: loggedInUser.name,
        nama_peruntukan: null,
        pesan_khusus: null,
        keterangan: null,
        potong_sendiri: false,
        ambil_daging: true,
        createdAt: new Date(),
        qrcode_url: null,
        alamat: null,
        jatahQurbanid: 'penerima-id-5'
      });
      mockPrisma.mudhohi.update.mockResolvedValue(true as any);
      mockPrisma.pembayaran.create.mockResolvedValue({
        id: 'payment-id-5',
        mudhohiId: 'mudhohi-id-5',
        cara_bayar: CaraBayar.TRANSFER,
        paymentStatus: PaymentStatus.BELUM_BAYAR,
        totalAmount: commonTipeHewan.harga,
        quantity: 1,
        isKolektif: false,
        tipeid: commonTipeHewan.id,
        urlTandaBukti: null,
        dibayarkan: 0,
        kodeResi: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.hewanQurban.create.mockResolvedValue({
        id: 'hewan-record-id-5',
        tipeId: commonTipeHewan.id,
        hewanId: 'mock-hewan-id-individual',
        isKolektif: false,
        slotTersisa: null,
        keterangan: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'TERDAFTAR',
        slaughtered: false,
        slaughteredAt: null,
        meatPackageCount: 0,
        onInventory: false,
        receivedByMdhohi: false,
        isCustom: false
      });
      mockPrisma.distribusi.upsert.mockResolvedValue({
        id: 'distribusi-id-5',
        kategori: 'Mudhohi',
        target: 1,
        realisasi: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.penerima.create.mockResolvedValue({
        id: 'penerima-id-5',
        distribusiId: 'distribusi-id-5',
        nama: loggedInUser.name,
        jenis: 'INDIVIDU',
        sudahMenerima: false,
        createdAt: new Date(),
        alamat: null,
        keterangan: null,
        diterimaOleh: null,
        noIdentitas: null,
        jenisId: null,
        telepon: null,
        waktuTerima: null
      });
    });

    it('should use the existing logged-in user and create mudhohi', async () => {
      const data = { ...baseMudhohiData, userId: loggedInUser.id, email: loggedInUser.email, nama_pengqurban: loggedInUser.name };
      const result = await createMudhohi(data);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: loggedInUser.id } });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: loggedInUser.id } }),
        expect.objectContaining({
          data: expect.objectContaining({
            email: loggedInUser.email,
            phone: loggedInUser.phone,
          }),
        }),
      ); // Email and phone might be updated if different
      expect(result.data.isNewUser).toBe(false);
      expect(result.data.user.id).toBe(loggedInUser.id);

      expect(sendOrderConfirmationEmail).toHaveBeenCalledWith(
        loggedInUser.email,
        expect.anything(),
        false, // isNewUser
        false, // isGoogleAuth
      );
    });
  });

  // --- E. Skenario Error Handling ---
  describe('E.1: Tipe Hewan Not Found', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'temp-user-id',
        email: 'temp@example.com',
        name: 'Temp User',
        phone: '123',
        password: '123',
        image: null,
        role: Role.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: null
      });
      mockPrisma.tipeHewan.findUnique.mockResolvedValue(null); // Simulate type not found
    });

    it('should throw an error if tipeHewan is not found', async () => {
      const data = { ...baseMudhohiData, tipeHewanId: 999 }; // Non-existent ID
      await expect(createMudhohi(data)).rejects.toThrow('Tipe hewan tidak ditemukan');

      // Ensure no database writes happened after the error point
      expect(mockPrisma.mudhohi.create).not.toHaveBeenCalled();
      expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
    });
  });

  describe('E.2: Database Error During Mudhohi Creation', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'temp-user-id-2',
        email: 'temp2@example.com',
        name: 'Temp User 2',
        phone: '123',
        password: '123',
        image: null,
        role: Role.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: null
      });
      mockPrisma.mudhohi.create.mockRejectedValue(new Error('Database write failed')); // Simulate DB error
    });

    it('should throw an error and rollback transaction if mudhohi creation fails', async () => {
      await expect(createMudhohi(baseMudhohiData)).rejects.toThrow('Database write failed');

      // Ensure that transaction was attempted but likely rolled back,
      // and post-transaction actions are not called.
      expect(mockPrisma.user.create).toHaveBeenCalled(); // User creation might succeed before mudhohi.create fails
      expect(sendOrderConfirmationEmail).not.toHaveBeenCalled(); // No email sent on failure
    });
  });
});