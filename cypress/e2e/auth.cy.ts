describe("Authentication", () => {
  beforeEach(() => {
    cy.visit("/")
  })

  it("should redirect to login page when not authenticated", () => {
    cy.visit("/dashboard")
    cy.url().should("include", "/auth/login")
  })

  it("should allow user to login with valid credentials", () => {
    cy.visit("/auth/login")

    cy.getByTestId("email-input").type("admin@example.com")
    cy.getByTestId("password-input").type("admin123")
    cy.getByTestId("login-button").click()

    cy.url().should("not.include", "/auth/login")
    cy.contains("Dashboard Qurban").should("be.visible")
  })

  it("should show error message with invalid credentials", () => {
    cy.visit("/auth/login")

    cy.getByTestId("email-input").type("invalid@example.com")
    cy.getByTestId("password-input").type("wrongpassword")
    cy.getByTestId("login-button").click()

    cy.contains("Invalid credentials").should("be.visible")
  })

  it("should allow user to logout", () => {
    cy.loginAsAdmin()
    cy.visit("/dashboard")

    // Click on user avatar
    cy.get('[data-testid="user-avatar"]').click()

    // Click logout
    cy.contains("Log out").click()

    cy.url().should("include", "/")
    cy.contains("Login").should("be.visible")
  })
})
