describe("Dashboard", () => {
  beforeEach(() => {
    cy.seedDatabase()
    cy.loginAsAdmin()
  })

  afterEach(() => {
    cy.cleanDatabase()
  })

  it("should display dashboard statistics", () => {
    cy.visit("/dashboard")

    cy.contains("Dashboard Qurban").should("be.visible")
    cy.contains("Total Pengqurban").should("be.visible")
    cy.contains("Total Hewan").should("be.visible")
    cy.contains("Total Pendapatan").should("be.visible")
  })

  it("should show payment status overview", () => {
    cy.visit("/dashboard")

    cy.contains("Status Pembayaran").should("be.visible")
    cy.contains("Lunas").should("be.visible")
    cy.contains("Menunggu").should("be.visible")
  })

  it("should display animal types distribution", () => {
    cy.visit("/dashboard")

    cy.contains("Jenis Hewan").should("be.visible")
    cy.contains("Sapi").should("be.visible")
    cy.contains("Kambing").should("be.visible")
  })

  it("should show recent transactions", () => {
    cy.visit("/dashboard")

    cy.contains("Transaksi Terbaru").should("be.visible")
  })

  it("should navigate to quick actions", () => {
    cy.visit("/dashboard")

    cy.contains("Kelola Pengqurban").click()
    cy.url().should("include", "/dashboard/mudhohi")
  })
})
