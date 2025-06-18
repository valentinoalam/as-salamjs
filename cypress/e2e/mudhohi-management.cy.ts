describe("Mudhohi Management", () => {
  beforeEach(() => {
    cy.seedDatabase()
    cy.loginAsAdmin()
  })

  afterEach(() => {
    cy.cleanDatabase()
  })

  it("should display mudhohi list", () => {
    cy.visit("/dashboard/mudhohi")

    cy.contains("Manajemen Pengqurban").should("be.visible")
    cy.get('[data-testid="mudhohi-table"]').should("be.visible")
  })

  it("should allow adding new mudhohi", () => {
    cy.visit("/dashboard/mudhohi")

    cy.getByTestId("add-mudhohi-button").click()

    cy.getByTestId("nama-pengqurban-input").type("Test Pengqurban")
    cy.getByTestId("email-input").type("test@example.com")
    cy.getByTestId("no-hp-input").type("081234567890")
    cy.getByTestId("alamat-input").type("Test Address")

    cy.getByTestId("submit-button").click()

    cy.contains("Test Pengqurban").should("be.visible")
  })

  it("should allow editing mudhohi", () => {
    cy.visit("/dashboard/mudhohi")

    cy.get('[data-testid="edit-mudhohi-button"]').first().click()

    cy.getByTestId("nama-pengqurban-input").clear().type("Updated Name")
    cy.getByTestId("submit-button").click()

    cy.contains("Updated Name").should("be.visible")
  })

  it("should allow deleting mudhohi", () => {
    cy.visit("/dashboard/mudhohi")

    cy.get('[data-testid="delete-mudhohi-button"]').first().click()
    cy.getByTestId("confirm-delete-button").click()

    cy.contains("Mudhohi berhasil dihapus").should("be.visible")
  })

  it("should filter mudhohi by payment status", () => {
    cy.visit("/dashboard/mudhohi")

    cy.getByTestId("payment-status-filter").select("LUNAS")

    cy.get('[data-testid="mudhohi-table"] tbody tr').should("have.length.greaterThan", 0)
  })

  it("should search mudhohi by name", () => {
    cy.visit("/dashboard/mudhohi")

    cy.getByTestId("search-input").type("Ahmad")

    cy.contains("Ahmad").should("be.visible")
  })
})
