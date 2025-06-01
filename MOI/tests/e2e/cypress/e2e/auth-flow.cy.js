describe('Authentication Flow E2E Tests', () => {
  beforeEach(() => {
    cy.resetDatabase()
    cy.visit('/')
  })

  describe('User Registration', () => {
    it('should allow new user registration with valid data', () => {
      cy.get('[data-cy=register-button]').click()
      
      cy.get('[data-cy=username-input]').type('testuser')
      cy.get('[data-cy=email-input]').type('test@example.com')
      cy.get('[data-cy=password-input]').type('Password123!')
      cy.get('[data-cy=confirm-password-input]').type('Password123!')
      
      cy.get('[data-cy=register-submit]').click()
      
      cy.url().should('include', '/dashboard')
      cy.get('[data-cy=user-avatar]').should('be.visible')
      cy.get('[data-cy=welcome-message]').should('contain', 'Welcome, testuser')
    })

    it('should show validation errors for invalid registration data', () => {
      cy.get('[data-cy=register-button]').click()
      
      cy.get('[data-cy=username-input]').type('ab') // Too short
      cy.get('[data-cy=email-input]').type('invalid-email')
      cy.get('[data-cy=password-input]').type('weak')
      cy.get('[data-cy=confirm-password-input]').type('different')
      
      cy.get('[data-cy=register-submit]').click()
      
      cy.get('[data-cy=username-error]').should('contain', 'Username must be at least 3 characters')
      cy.get('[data-cy=email-error]').should('contain', 'Please enter a valid email')
      cy.get('[data-cy=password-error]').should('contain', 'Password must be at least 8 characters')
      cy.get('[data-cy=confirm-password-error]').should('contain', 'Passwords do not match')
    })

    it('should prevent registration with existing email', () => {
      // Create user first
      cy.createUser({
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'Password123!'
      })

      cy.get('[data-cy=register-button]').click()
      
      cy.get('[data-cy=username-input]').type('newuser')
      cy.get('[data-cy=email-input]').type('existing@example.com')
      cy.get('[data-cy=password-input]').type('Password123!')
      cy.get('[data-cy=confirm-password-input]').type('Password123!')
      
      cy.get('[data-cy=register-submit]').click()
      
      cy.get('[data-cy=error-message]').should('contain', 'Email already exists')
    })
  })

  describe('User Login', () => {
    beforeEach(() => {
      cy.createUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      })
    })

    it('should allow user login with valid credentials', () => {
      cy.get('[data-cy=login-button]').click()
      
      cy.get('[data-cy=email-input]').type('test@example.com')
      cy.get('[data-cy=password-input]').type('Password123!')
      
      cy.get('[data-cy=login-submit]').click()
      
      cy.url().should('include', '/dashboard')
      cy.get('[data-cy=user-avatar]').should('be.visible')
      cy.get('[data-cy=welcome-message]').should('contain', 'Welcome, testuser')
    })

    it('should show error for invalid credentials', () => {
      cy.get('[data-cy=login-button]').click()
      
      cy.get('[data-cy=email-input]').type('test@example.com')
      cy.get('[data-cy=password-input]').type('wrongpassword')
      
      cy.get('[data-cy=login-submit]').click()
      
      cy.get('[data-cy=error-message]').should('contain', 'Invalid credentials')
      cy.url().should('not.include', '/dashboard')
    })

    it('should remember user session after page refresh', () => {
      cy.loginUser('test@example.com', 'Password123!')
      
      cy.reload()
      
      cy.url().should('include', '/dashboard')
      cy.get('[data-cy=user-avatar]').should('be.visible')
    })
  })

  describe('User Logout', () => {
    beforeEach(() => {
      cy.createUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      })
      cy.loginUser('test@example.com', 'Password123!')
    })

    it('should allow user to logout successfully', () => {
      cy.get('[data-cy=user-menu]').click()
      cy.get('[data-cy=logout-button]').click()
      
      cy.url().should('not.include', '/dashboard')
      cy.get('[data-cy=login-button]').should('be.visible')
      
      // Verify session is cleared
      cy.window().its('localStorage').invoke('getItem', 'token').should('be.null')
    })

    it('should redirect to login when accessing protected route after logout', () => {
      cy.get('[data-cy=user-menu]').click()
      cy.get('[data-cy=logout-button]').click()
      
      cy.visit('/dashboard')
      cy.url().should('include', '/login')
    })
  })

  describe('Token Refresh', () => {
    beforeEach(() => {
      cy.createUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!'
      })
      cy.loginUser('test@example.com', 'Password123!')
    })

    it('should refresh token automatically when expired', () => {
      // Mock expired token
      cy.window().then((win) => {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MmZiYzEyMzQ1Njc4OTAiLCJleHAiOjE2NjA4OTQ0MDB9.invalid'
        win.localStorage.setItem('token', expiredToken)
      })

      // Make API call that should trigger token refresh
      cy.get('[data-cy=content-tab]').click()
      
      // Should remain logged in after token refresh
      cy.get('[data-cy=user-avatar]').should('be.visible')
      cy.get('[data-cy=content-list]').should('be.visible')
    })
  })
})
