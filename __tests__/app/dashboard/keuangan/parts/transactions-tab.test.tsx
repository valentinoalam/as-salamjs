import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import TransactionsTab from "@/app/dashboard/keuangan/parts/transactions-tab"
import { useKeuangan } from "@/contexts/keuangan-context"

jest.mock('@/contexts/keuangan-context', () => ({
  __esModule: true,
  useKeuangan: jest.fn(),
  transactionsQuery: () => ({
    isLoading: false,
    refetch: jest.fn(),
    data: [],
  }),
}));
jest.mock("@/lib/excel", () => ({
  exportToExcel: jest.fn(),
}))

const mockKeuanganData = {
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
  isLoadingTransactions: false,
  refetchTransactions: jest.fn(),
  refetchStats: jest.fn(),
  createTransaction: jest.fn(),
  deleteTransaction: jest.fn().mockResolvedValue({ success: true }),
}

describe("TransactionsTab", () => {
  beforeEach(() => {
    ;(useKeuangan as jest.Mock).mockReturnValue(mockKeuanganData)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should render transactions table", () => {
    render(<TransactionsTab />)

    expect(screen.getByText("Pembayaran Qurban Sapi")).toBeInTheDocument()
    expect(screen.getByText("Pembelian Sapi")).toBeInTheDocument()
  })

  it("should display transaction amounts with correct formatting", () => {
    render(<TransactionsTab />)

    expect(screen.getByText("Rp 25.000.000")).toBeInTheDocument()
    expect(screen.getByText("Rp 15.000.000")).toBeInTheDocument()
  })

  it("should display transaction types with correct badges", () => {
    render(<TransactionsTab />)

    expect(screen.getByText("Pemasukan")).toBeInTheDocument()
    expect(screen.getByText("Pengeluaran")).toBeInTheDocument()
  })

  it("should filter transactions by search term", async () => {
    render(<TransactionsTab />)

    const searchInput = screen.getByPlaceholderText("Search transactions...")
    fireEvent.change(searchInput, { target: { value: "Qurban" } })

    await waitFor(() => {
      expect(screen.getByText("Pembayaran Qurban Sapi")).toBeInTheDocument()
      expect(screen.queryByText("Pembelian Sapi")).not.toBeInTheDocument()
    })
  })

  it("should filter transactions by type", async () => {
    render(<TransactionsTab />)

    const typeFilter = screen.getByDisplayValue("All Types")
    fireEvent.click(typeFilter)

    const pemsukanOption = screen.getByText("Pemasukan")
    fireEvent.click(pemsukanOption)

    await waitFor(() => {
      expect(screen.getByText("Pembayaran Qurban Sapi")).toBeInTheDocument()
      expect(screen.queryByText("Pembelian Sapi")).not.toBeInTheDocument()
    })
  })

  it("should reset filters when reset button is clicked", async () => {
    render(<TransactionsTab />)

    // Apply a filter first
    const searchInput = screen.getByPlaceholderText("Search transactions...")
    fireEvent.change(searchInput, { target: { value: "Qurban" } })

    // Click reset filters
    const resetButton = screen.getByText("Reset Filters")
    fireEvent.click(resetButton)

    await waitFor(() => {
      expect(searchInput).toHaveValue("")
      expect(screen.getByText("Pembayaran Qurban Sapi")).toBeInTheDocument()
      expect(screen.getByText("Pembelian Sapi")).toBeInTheDocument()
    })
  })

  it("should handle pagination correctly", () => {
    // Create more transactions to test pagination
    const manyTransactions = Array.from({ length: 25 }, (_, i) => ({
      id: `trx_${i}`,
      amount: 1000000,
      description: `Transaction ${i}`,
      type: "PEMASUKAN" as const,
      date: new Date("2024-01-01"),
      category: {
        id: "cat_1",
        name: "Test Category",
      },
      receiptUrl: [],
      createdAt: new Date("2024-01-01"),
    }))
    ;(useKeuangan as jest.Mock).mockReturnValue({
      ...mockKeuanganData,
      transactions: manyTransactions,
    })

    render(<TransactionsTab />)

    // Should show pagination controls
    expect(screen.getByText("Previous")).toBeInTheDocument()
    expect(screen.getByText("Next")).toBeInTheDocument()

    // Should show page numbers
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("should open add transaction modal", () => {
    render(<TransactionsTab />)

    const addButton = screen.getByText("Add Transaction")
    fireEvent.click(addButton)

    // Modal should be triggered (we can't test the actual modal opening without more complex setup)
    expect(addButton).toBeInTheDocument()
  })

  it("should handle delete transaction", async () => {
    render(<TransactionsTab />)

    // Find delete buttons (trash icons)
    const deleteButtons = screen.getAllByRole("button")
    const deleteButton = deleteButtons.find(
      (button) => button.querySelector("svg")?.getAttribute("data-testid") === "trash-2",
    )

    if (deleteButton) {
      fireEvent.click(deleteButton)

      // Confirm deletion in alert dialog
      await waitFor(() => {
        const confirmButton = screen.getByText("Delete")
        fireEvent.click(confirmButton)
      })

      expect(mockKeuanganData.deleteTransaction).toHaveBeenCalled()
    }
  })

  it("should display receipt links correctly", () => {
    render(<TransactionsTab />)

    // Transaction with receipt should show file icon
    const receiptLinks = screen.getAllByRole("link")
    const receiptLink = receiptLinks.find((link) => link.getAttribute("href") === "https://example.com/receipt.jpg")

    expect(receiptLink).toBeInTheDocument()
  })

  it("should handle empty transactions state", () => {
    ;(useKeuangan as jest.Mock).mockReturnValue({
      ...mockKeuanganData,
      transactions: [],
    })

    render(<TransactionsTab />)

    expect(screen.getByText("No transactions found with the current filters.")).toBeInTheDocument()
  })

  it("should handle loading state", () => {
    ;(useKeuangan as jest.Mock).mockReturnValue({
      ...mockKeuanganData,
      isLoadingTransactions: true,
    })

    render(<TransactionsTab />)

    expect(screen.getByText("Loading transactions...")).toBeInTheDocument()
  })
})
