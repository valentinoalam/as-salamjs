/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Custom commands for authentication
Cypress.Commands.add("login", (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit("/auth/login")
    cy.get('[data-testid="email-input"]').type(email)
    cy.get('[data-testid="password-input"]').type(password)
    cy.get('[data-testid="login-button"]').click()
    cy.url().should("not.include", "/auth/login")
  })
})

Cypress.Commands.add("loginAsAdmin", () => {
  cy.login("admin@example.com", "admin123")
})

Cypress.Commands.add("loginAsUser", () => {
  cy.login("user@example.com", "user123")
})

// Custom commands for database operations
Cypress.Commands.add("seedDatabase", () => {
  cy.task("db:seed")
})

Cypress.Commands.add("cleanDatabase", () => {
  cy.task("db:clean")
})

// Custom commands for UI interactions
Cypress.Commands.add("getByTestId", (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`)
})

/// <reference types="cypress" />
