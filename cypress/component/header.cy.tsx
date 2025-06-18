import Header from "@/components/header"
import { useAuthStore } from "@/stores/auth-store"
import { useUIStore } from "@/stores/ui-store"
import { Role } from "@prisma/client"

describe("Header Component", () => {
  beforeEach(() => {
    // Mock the stores
    cy.stub(useAuthStore, "getState").returns({
      user: null,
      isAuthenticated: false,
      accessiblePages: [],
    })

    cy.stub(useUIStore, "getState").returns({
      isMobileMenuOpen: false,
      setMobileMenu: cy.stub(),
    })
  })

  it("renders header with logo", () => {
    cy.mount(<Header />)
    cy.contains("Qurban Management").should("be.visible")
  })

  it("shows login button when not authenticated", () => {
    cy.mount(<Header />)
    cy.contains("Login").should("be.visible")
  })

  it("shows user avatar when authenticated", () => {
    cy.stub(useAuthStore, "getState").returns({
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        role: Role.USER,
        image: null,
      },
      isAuthenticated: true,
      accessiblePages: ["dashboard"],
    })

    cy.mount(<Header />)
    cy.contains("TU").should("be.visible") // User initials
  })
})
