import { render, screen } from "@testing-library/react"
import { useSession } from "next-auth/react"
import KeuanganPage from "@/app/dashboard/keuangan/page"
import { useKeuangan } from "@/contexts/keuangan-context"
import { createMockKeuanganContext } from "../../../helpers/keuangan-mocks"
import type { Session } from "node_modules/next-auth/core/types"

// Mock the hooks
jest.mock("@/contexts/keuangan-context")
jest.mock("next-auth/react")

const mockUseKeuangan = useKeuangan as jest.MockedFunction<typeof useKeuangan>
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

describe("Keuangan Page - Simple Tests", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "1", name: "Test", email: "test@test.com", role: "ADMIN" },
        expires: "2599"
      },
      status: "authenticated",
      update: function (): Promise<Session | null> {
        throw new Error("Function not implemented.")
      }
    })
  })

  it("should render with default data", () => {
    mockUseKeuangan.mockReturnValue(createMockKeuanganContext())

    render(<KeuanganPage />)

    expect(screen.getByText("Manajemen Keuangan")).toBeInTheDocument()
  })

  it("should show loading state", () => {
    mockUseKeuangan.mockReturnValue(
      createMockKeuanganContext({
        isLoadingStats: true,
        stats: undefined,
      }),
    )

    render(<KeuanganPage />)

    // Check for loading indicators
    expect(screen.getByTestId("stats-loading")).toBeInTheDocument()
  })

  it("should handle errors", () => {
    mockUseKeuangan.mockReturnValue(
      createMockKeuanganContext({
        statsError: new Error("Failed to load"),
        stats: undefined,
      }),
    )

    render(<KeuanganPage />)

    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
})
