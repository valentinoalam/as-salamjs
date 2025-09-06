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



/**
 * // cypress/e2e/auth.cy.ts

describe('Authentication Flow', () => {
  const testUser = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!',
    invalidPassword: 'wrongpassword'
  };

  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => {
      win.localStorage.clear();
    });
    cy.clearCookies();
  });

  describe('Registration', () => {
    it('should successfully register a new user', () => {
      cy.get('header').find('a[href="/register"]').click();
      cy.url().should('include', '/register');

      // Fill registration form
      cy.get('input[name="name"]').type(testUser.name);
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('input[name="confirmPassword"]').type(testUser.password);
      
      // Submit form
      cy.get('button[type="submit"]').click();

      // Verify successful registration
      cy.url().should('include', '/login');
      cy.contains('Registration Successful').should('be.visible');
      cy.contains('Your account has been created').should('be.visible');
    });

    it('should show error when passwords do not match', () => {
      cy.visit('/register');
      
      // Fill form with mismatched passwords
      cy.get('input[name="name"]').type(testUser.name);
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('input[name="confirmPassword"]').type('differentpassword');
      
      // Submit form
      cy.get('button[type="submit"]').click();

      // Verify error message
      cy.contains('Passwords don\'t match').should('be.visible');
      cy.contains('Please make sure your passwords match').should('be.visible');
    });

    it('should show error for existing email', () => {
      cy.visit('/register');
      
      // Fill form with existing email
      cy.get('input[name="name"]').type(testUser.name);
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('input[name="confirmPassword"]').type(testUser.password);
      
      // Submit form
      cy.get('button[type="submit"]').click();

      // Verify error message
      cy.contains('Registration Failed').should('be.visible');
      cy.contains('Email already registered').should('be.visible');
    });

    it('should register with Google account', () => {
      cy.visit('/register');
      
      // Mock Google login
      cy.intercept('GET', '/api/auth/signin/google', (req) => {
        req.reply({
          status: 302,
          headers: {
            Location: '/dashboard'
          }
        });
      });

      // Click Google button
      cy.contains('button', 'Google').click();
      
      // Verify redirect
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Login', () => {
    beforeEach(() => {
      // Create test user
      cy.request('POST', '/api/register', {
        name: testUser.name,
        email: testUser.email,
        password: testUser.password
      });
    });

    it('should successfully login with valid credentials', () => {
      cy.visit('/login');
      
      // Fill login form
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      
      // Submit form
      cy.get('button[type="submit"]').click();

      // Verify successful login
      cy.url().should('include', '/dashboard');
      cy.get('header').should('contain', testUser.name);
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');
      
      // Fill form with invalid credentials
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.invalidPassword);
      
      // Submit form
      cy.get('button[type="submit"]').click();

      // Verify error message
      cy.contains('Email atau password salah').should('be.visible');
    });

    it('should login with Google account', () => {
      cy.visit('/login');
      
      // Mock Google login
      cy.intercept('GET', '/api/auth/signin/google', (req) => {
        req.reply({
          status: 302,
          headers: {
            Location: '/dashboard'
          }
        });
      });

      // Click Google button
      cy.contains('button', 'Google').click();
      
      // Verify redirect
      cy.url().should('include', '/dashboard');
    });

    it('should persist session after page reload', () => {
      // Login
      cy.visit('/login');
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      
      // Verify dashboard
      cy.url().should('include', '/dashboard');
      
      // Reload page
      cy.reload();
      
      // Verify session persists
      cy.get('header').should('contain', testUser.name);
      cy.url().should('include', '/dashboard');
    });

    it('should redirect authenticated user away from login page', () => {
      // Login
      cy.visit('/login');
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      
      // Try to access login page again
      cy.visit('/login');
      
      // Should be redirected to dashboard
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      // Login
      cy.visit('/login');
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/dashboard');
    });

    it('should successfully logout', () => {
      // Open user menu
      cy.get('header').find('button[aria-haspopup="true"]').click();
      
      // Click logout
      cy.contains('Log out').click();
      
      // Verify redirect to home page
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      
      // Verify login button is visible
      cy.get('header').find('a[href="/login"]').should('be.visible');
    });

    it('should not show dashboard to logged out user', () => {
      // Logout
      cy.get('header').find('button[aria-haspopup="true"]').click();
      cy.contains('Log out').click();
      
      // Try to access dashboard
      cy.visit('/dashboard');
      
      // Should be redirected to login page
      cy.url().should('include', '/login');
    });
  });

  describe('UI State Persistence', () => {
    it('should remember register button visibility', () => {
      // Verify register button is visible
      cy.get('header').find('a[href="/register"]').should('be.visible');
      
      // Register
      cy.get('header').find('a[href="/register"]').click();
      cy.get('input[name="name"]').type(testUser.name);
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('input[name="confirmPassword"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      
      // Login
      cy.get('input[name="email"]').type(testUser.email);
      cy.get('input[name="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();
      
      // Reload page
      cy.reload();
      
      // Verify register button is hidden
      cy.get('header').find('a[href="/register"]').should('not.exist');
      
      // Logout
      cy.get('header').find('button[aria-haspopup="true"]').click();
      cy.contains('Log out').click();
      
      // Verify register button is visible again
      cy.get('header').find('a[href="/register"]').should('be.visible');
    });
  });
});
 */