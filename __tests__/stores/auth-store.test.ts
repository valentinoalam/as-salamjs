import { useAuthStore } from "@/stores/auth-store"
import { Role } from "@prisma/client"

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
})

describe("Auth Store", () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      accessiblePages: [],
    })
  })

  it("should initialize with default state", () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(true)
    expect(state.accessiblePages).toEqual([])
  })

  it("should set user and update authentication state", () => {
    const mockUser = {
      id: "1",
      name: "Test User",
      email: "test@example.com",
      role: Role.MEMBER,
    }

    useAuthStore.getState().setUser(mockUser)
    const state = useAuthStore.getState()

    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it("should handle logout correctly", () => {
    const mockUser = {
      id: "1",
      name: "Test User",
      email: "test@example.com",
      role: Role.MEMBER,
    }

    // First set a user
    useAuthStore.getState().setUser(mockUser)
    useAuthStore.getState().setAccessiblePages(["dashboard", "profile"])

    // Then logout
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()

    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.accessiblePages).toEqual([])
  })

  it("should set loading state", () => {
    useAuthStore.getState().setLoading(false)
    expect(useAuthStore.getState().isLoading).toBe(false)

    useAuthStore.getState().setLoading(true)
    expect(useAuthStore.getState().isLoading).toBe(true)
  })

  it("should set accessible pages", () => {
    const pages = ["dashboard", "profile", "settings"]
    useAuthStore.getState().setAccessiblePages(pages)
    expect(useAuthStore.getState().accessiblePages).toEqual(pages)
  })
})
