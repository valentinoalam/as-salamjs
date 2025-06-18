import type React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { useSession } from "next-auth/react"
import MudhohiPage from "@/app/dashboard/mudhohi/page"
import prisma from "@/lib/prisma"

// Mock dependencies
jest.mock("next-auth/react")
jest.mock("@/lib/prisma", () => ({
  mudhohi: {
    findMany: jest.fn(),
  },
}))

jest.mock("next/link", () => {
  // eslint-disable-next-line react/display-name
  return ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
})

const mockSession = {
  user: {
    id: "1",
    name: "Test User",
    email: "test@example.com",
    role: "ADMIN",
  },
}

const mockMudhohiData = [
  {
    id: "mudhohi_1",
    nama_pengqurban: "Ahmad Suryanto",
    nama_peruntukan: "Keluarga Ahmad",
    alamat: "Jl. Merdeka No. 123, Jakarta",
    no_hp: "081234567890",
    email: "ahmad@email.com",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    pembayaran: {
      id: "pay_1",
      tipeid: 1,
      quantity: 1,
      isKolektif: false,
      totalAmount: 25000000,
      paymentStatus: "LUNAS",
      dibayarkan: 25000000,
      kodeResi: "TRX001",
      tipe: {
        nama: "Sapi Lokal",
        icon: "🐄",
        harga: 25000000,
        hargaKolektif: 3500000,
      },
    },
    hewan: [
      {
        id: "hewan_1",
        tipe: {
          nama: "Sapi Lokal",
          icon: "🐄",
        },
      },
    ],
  },
  {
    id: "mudhohi_2",
    nama_pengqurban: "Siti Nurhaliza",
    nama_peruntukan: "Almarhum Bapak",
    alamat: "Jl. Sudirman No. 456, Bandung",
    no_hp: "081234567891",
    email: "siti@email.com",
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
    pembayaran: {
      id: "pay_2",
      tipeid: 1,
      quantity: 1,
      isKolektif: true,
      totalAmount: 3500000,
      paymentStatus: "MENUNGGU_KONFIRMASI",
      dibayarkan: 3500000,
      kodeResi: "TRX002",
      tipe: {
        nama: "Sapi Lokal",
        icon: "🐄",
        harga: 25000000,
        hargaKolektif: 3500000,
      },
    },
    hewan: [],
  },
]

describe("Mudhohi Page", () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: "authenticated",
    })
    ;(prisma.mudhohi.findMany as jest.Mock).mockResolvedValue(mockMudhohiData)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should render page title and description", async () => {
    render(<MudhohiPage />)

    await waitFor(() => {
      expect(screen.getByText("Manajemen Pengqurban")).toBeInTheDocument()
      expect(screen.getByText("Kelola data pengqurban dan status pembayaran")).toBeInTheDocument()
    })
  })

  it("should display statistics cards", async () => {
    render(<MudhohiPage />)

    await waitFor(() => {
      expect(screen.getByText("Total Pengqurban")).toBeInTheDocument()
      expect(screen.getByText("Lunas")).toBeInTheDocument()
      expect(screen.getByText("Menunggu Konfirmasi")).toBeInTheDocument()
      expect(screen.getByText("Belum Bayar")).toBeInTheDocument()
    })

    // Check statistics values
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument() // Total
      expect(screen.getByText("1")).toBeInTheDocument() // Lunas
      expect(screen.getByText("1")).toBeInTheDocument() // Menunggu Konfirmasi
    })
  })

  it("should display mudhohi data in table", async () => {
    render(<MudhohiPage />)

    await waitFor(() => {
      expect(screen.getByText("Ahmad Suryanto")).toBeInTheDocument()
      expect(screen.getByText("ahmad@email.com")).toBeInTheDocument()
      expect(screen.getByText("Siti Nurhaliza")).toBeInTheDocument()
      expect(screen.getByText("siti@email.com")).toBeInTheDocument()
    })
  })

  it("should display payment status badges correctly", async () => {
    render(<MudhohiPage />)

    await waitFor(() => {
      expect(screen.getByText("Lunas")).toBeInTheDocument()
      expect(screen.getByText("Menunggu Konfirmasi")).toBeInTheDocument()
    })
  })

  it("should display kolektif badge for collective payments", async () => {
    render(<MudhohiPage />)

    await waitFor(() => {
      expect(screen.getByText("Kolektif")).toBeInTheDocument()
    })
  })

  it("should format currency correctly", async () => {
    render(<MudhohiPage />)

    await waitFor(() => {
      expect(screen.getByText("Rp 25.000.000")).toBeInTheDocument()
      expect(screen.getByText("Rp 3.500.000")).toBeInTheDocument()
    })
  })

  it("should display action buttons", async () => {
    render(<MudhohiPage />)

    await waitFor(() => {
      const viewButtons = screen.getAllByRole("link")
      const editButtons = screen.getAllByRole("button")

      expect(viewButtons.length).toBeGreaterThan(0)
      expect(editButtons.length).toBeGreaterThan(0)
    })
  })

  it("should handle empty data state", async () => {
    ;(prisma.mudhohi.findMany as jest.Mock).mockResolvedValue([])

    render(<MudhohiPage />)

    await waitFor(() => {
      expect(screen.getByText("Belum ada data pengqurban")).toBeInTheDocument()
    })
  })

  it("should display add mudhohi button", async () => {
    render(<MudhohiPage />)

    await waitFor(() => {
      expect(screen.getByText("Tambah Pengqurban")).toBeInTheDocument()
    })
  })

  it("should display filter and search components", async () => {
    render(<MudhohiPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Cari nama pengqurban, email, atau kode...")).toBeInTheDocument()
      expect(screen.getByText("Status Pembayaran")).toBeInTheDocument()
      expect(screen.getByText("Jenis Hewan")).toBeInTheDocument()
    })
  })
})
