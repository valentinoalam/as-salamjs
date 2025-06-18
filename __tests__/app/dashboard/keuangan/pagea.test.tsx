import { render, screen, fireEvent } from "@testing-library/react"
import { useSession } from "next-auth/react"
import KeuanganPage from "@/app/dashboard/keuangan/page"
import { useKeuangan } from "@/contexts/keuangan-context"

// Mock dependencies
jest.mock("next-auth/react")
jest.mock("@/contexts/keuangan-context")

const mockSession = {
  user: {
    id: "1",
    name: "Test User",
    email: "test@example.com",
    role: "ADMIN",
  },
}

const mockKeuanganData = {
  stats: {
    totalIncome: 50000000,
    totalExpense: 30000000,
    balance: 20000000,
  },
  transactions: [
    {
      id: "trx_1",
      amount: 25000000,
      description: "Pembayaran Qurban Sapi",
      type: "PEMASUKAN",
      date: new Date("2024-01-01"),
      category: {
        id: "cat_1",
        name: "Penjualan Qurban",
      },
      receiptUrl: [],
      createdAt: new Date("2024-01-01"),
    },
    {
      id: "trx_2",
      amount: 15000000,
      description: "Pembelian Sapi",
      type: "PENGELUARAN",
      date: new Date("2024-01-02"),
      category: {
        id: "cat_2",
        name: "Pembelian Hewan",
      },
      receiptUrl: [
        {
          id: "img_1",
          url: "https://example.com/receipt.jpg",
        },
      ],
      createdAt: new Date("2024-01-02"),
    },
  ],
  categories: [
    {
      id: "cat_1",
      name: "Penjualan Qurban",
      type: "PEMASUKAN",
    },
    {
      id: "cat_2",
      name: "Pembelian Hewan",
      type: "PENGELUARAN",
    },
  ],
  isLoadingStats: false,
  isLoadingTransactions: false,
  refetchTransactions: jest.fn(),
  refetchStats: jest.fn(),
  createTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
}

describe("Keuangan Page", () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: "authenticated",
    })
    ;(useKeuangan as jest.Mock).mockReturnValue(mockKeuanganData)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should render page title", () => {
    render(<KeuanganPage />)
    expect(screen.getByText("Manajemen Keuangan")).toBeInTheDocument()
  })

  it("should display financial summary cards", () => {
    render(<KeuanganPage />)

    expect(screen.getByText("Total Pemasukan")).toBeInTheDocument()
    expect(screen.getByText("Total Pengeluaran")).toBeInTheDocument()
    expect(screen.getByText("Saldo")).toBeInTheDocument()

    // Check formatted currency values
    expect(screen.getByText("Rp 50.000.000")).toBeInTheDocument()
    expect(screen.getByText("Rp 30.000.000")).toBeInTheDocument()
    expect(screen.getByText("Rp 20.000.000")).toBeInTheDocument()
  })

  it("should display positive balance in green", () => {
    render(<KeuanganPage />)

    const balanceElement = screen.getByText("Rp 20.000.000")
    expect(balanceElement).toHaveClass("text-green-600")
  })

  it("should display negative balance in red", () => {
    const mockDataWithNegativeBalance = {
      ...mockKeuanganData,
      stats: {
        ...mockKeuanganData.stats,
        balance: -5000000,
      },
    }
    ;(useKeuangan as jest.Mock).mockReturnValue(mockDataWithNegativeBalance)

    render(<KeuanganPage />)

    const balanceElement = screen.getByText("Rp -5.000.000")
    expect(balanceElement).toHaveClass("text-red-600")
  })

  it("should display loading state for stats", () => {
    const mockLoadingData = {
      ...mockKeuanganData,
      isLoadingStats: true,
    }
    ;(useKeuangan as jest.Mock).mockReturnValue(mockLoadingData)

    render(<KeuanganPage />)

    const loadingElements = screen.getAllByRole("generic")
    const animatedElements = loadingElements.filter((el) => el.className.includes("animate-pulse"))
    expect(animatedElements.length).toBeGreaterThan(0)
  })

  it("should display tabs for different sections", () => {
    render(<KeuanganPage />)

    expect(screen.getByText("Transaksi")).toBeInTheDocument()
    expect(screen.getByText("Kategori")).toBeInTheDocument()
    expect(screen.getByText("Anggaran")).toBeInTheDocument()
  })

  it("should switch between tabs", () => {
    render(<KeuanganPage />)

    const transactionTab = screen.getByText("Transaksi")
    const categoryTab = screen.getByText("Kategori")

    // Initially transactions tab should be active
    expect(transactionTab).toHaveAttribute("data-state", "active")

    // Click on categories tab
    fireEvent.click(categoryTab)
    expect(categoryTab).toHaveAttribute("data-state", "active")
  })

  it("should handle empty stats gracefully", () => {
    const mockEmptyData = {
      ...mockKeuanganData,
      stats: null,
    }
    ;(useKeuangan as jest.Mock).mockReturnValue(mockEmptyData)

    render(<KeuanganPage />)

    expect(screen.getByText("Rp 0")).toBeInTheDocument()
  })
})
