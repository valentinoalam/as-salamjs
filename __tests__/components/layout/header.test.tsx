/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent } from "@testing-library/react"
import { useAuthStore } from "@/stores/auth-store"
import { useUIStore } from "@/stores/ui-store"
import Header from "@/components/layout/header"
import { Role } from "@prisma/client"

// Mock the stores
jest.mock("@/stores/auth-store")
jest.mock("@/stores/ui-store")

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>
const mockUseUIStore = useUIStore as jest.MockedFunction<typeof useUIStore>

describe("Header Component", () => {
  const mockSetMobileMenu = jest.fn()

  beforeEach(() => {
    mockUseUIStore.mockReturnValue({
      isMobileMenuOpen: false,
      setMobileMenu: mockSetMobileMenu,
      // Add other UI store properties as needed
    } as any)
  })

  it("renders header with logo", () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      accessiblePages: [],
    } as any)

    render(<Header />)
    expect(screen.getByText("Qurban Management")).toBeInTheDocument()
  })

  it("shows login button when not authenticated", () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      accessiblePages: [],
    } as any)

    render(<Header />)
    expect(screen.getByText("Login")).toBeInTheDocument()
  })

  it("shows user avatar when authenticated", () => {
    const mockUser = {
      id: "1",
      name: "Test User",
      email: "test@example.com",
      role: Role.MEMBER,
      image: null,
    }

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      accessiblePages: ["dashboard"],
    } as any)

    render(<Header />)
    expect(screen.getByText("TU")).toBeInTheDocument() // Initials
  })

  it("shows admin-only navigation for admin users", () => {
    const mockUser = {
      id: "1",
      name: "Admin User",
      email: "admin@example.com",
      role: Role.ADMIN,
      image: null,
    }

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      accessiblePages: ["dashboard", "panitia"],
    } as any)

    render(<Header />)
    expect(screen.getByText("Panitia")).toBeInTheDocument()
  })

  it("toggles mobile menu when menu button is clicked", () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      accessiblePages: [],
    } as any)

    render(<Header />)

    // Find and click the mobile menu button
    const menuButton = screen.getByRole("button", { name: /menu/i })
    fireEvent.click(menuButton)

    expect(mockSetMobileMenu).toHaveBeenCalledWith(true)
  })
})
