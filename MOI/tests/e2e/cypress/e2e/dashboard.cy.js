describe('Dashboard E2E Tests', () => {
  beforeEach(() => {
    cy.resetDatabase()
    cy.createUser({
      username: 'dashboarduser',
      email: 'dashboard@example.com',
      password: 'Password123!'
    })
    cy.loginUser('dashboard@example.com', 'Password123!')
  })

  describe('Dashboard Overview', () => {
    beforeEach(() => {
      // Mock analytics data
      cy.intercept('GET', '/api/analytics/overview', {
        statusCode: 200,
        body: {
          totalPosts: 45,
          totalEngagement: 1250,
          totalReach: 15000,
          totalImpressions: 28000,
          engagementRate: 8.3,
          weeklyGrowth: {
            posts: 12,
            engagement: 15.5,
            reach: 8.2
          }
        }
      }).as('getOverview')

      cy.intercept('GET', '/api/analytics/recent-performance', {
        statusCode: 200,
        body: {
          chartData: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
              label: 'Engagement',
              data: [120, 150, 180, 140, 220, 190, 250]
            }]
          }
        }
      }).as('getPerformance')
    })

    it('should display key metrics on dashboard load', () => {
      cy.visit('/dashboard')
      
      cy.wait(['@getOverview', '@getPerformance'])
      
      cy.get('[data-cy=total-posts]').should('contain', '45')
      cy.get('[data-cy=total-engagement]').should('contain', '1,250')
      cy.get('[data-cy=total-reach]').should('contain', '15,000')
      cy.get('[data-cy=engagement-rate]').should('contain', '8.3%')
      
      cy.get('[data-cy=weekly-growth-posts]').should('contain', '+12')
      cy.get('[data-cy=weekly-growth-engagement]').should('contain', '+15.5%')
    })

    it('should display performance chart', () => {
      cy.visit('/dashboard')
      
      cy.wait('@getPerformance')
      
      cy.get('[data-cy=performance-chart]').should('be.visible')
      cy.get('canvas').should('exist')
    })

    it('should handle loading states', () => {
      cy.intercept('GET', '/api/analytics/overview', {
        delay: 2000,
        statusCode: 200,
        body: { totalPosts: 45 }
      }).as('getOverviewSlow')

      cy.visit('/dashboard')
      
      cy.get('[data-cy=loading-skeleton]').should('be.visible')
      
      cy.wait('@getOverviewSlow')
      
      cy.get('[data-cy=loading-skeleton]').should('not.exist')
      cy.get('[data-cy=total-posts]').should('be.visible')
    })

    it('should handle error states gracefully', () => {
      cy.intercept('GET', '/api/analytics/overview', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('getOverviewError')

      cy.visit('/dashboard')
      
      cy.wait('@getOverviewError')
      
      cy.get('[data-cy=error-message]').should('contain', 'Failed to load analytics data')
      cy.get('[data-cy=retry-button]').should('be.visible')
    })

    it('should allow data refresh', () => {
      cy.visit('/dashboard')
      
      cy.wait(['@getOverview', '@getPerformance'])
      
      cy.get('[data-cy=refresh-button]').click()
      
      cy.wait(['@getOverview', '@getPerformance'])
      
      cy.get('[data-cy=last-updated]').should('contain', 'Just now')
    })
  })

  describe('Quick Actions', () => {
    it('should allow quick content creation from dashboard', () => {
      cy.visit('/dashboard')
      
      cy.get('[data-cy=quick-create-content]').click()
      
      cy.url().should('include', '/content/create')
      cy.get('[data-cy=content-form]').should('be.visible')
    })

    it('should allow quick navigation to different sections', () => {
      cy.visit('/dashboard')
      
      cy.get('[data-cy=quick-nav-analytics]').click()
      cy.url().should('include', '/analytics')
      
      cy.get('[data-cy=nav-dashboard]').click()
      cy.get('[data-cy=quick-nav-content]').click()
      cy.url().should('include', '/content')
      
      cy.get('[data-cy=nav-dashboard]').click()
      cy.get('[data-cy=quick-nav-schedule]').click()
      cy.url().should('include', '/schedule')
    })

    it('should display recent activity feed', () => {
      cy.intercept('GET', '/api/activity/recent', {
        statusCode: 200,
        body: [
          {
            id: 1,
            type: 'content_published',
            message: 'Post "New Product Launch" was published to Twitter',
            timestamp: new Date().toISOString()
          },
          {
            id: 2,
            type: 'content_scheduled',
            message: 'Post "Weekly Update" was scheduled for tomorrow',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          }
        ]
      }).as('getActivity')

      cy.visit('/dashboard')
      
      cy.wait('@getActivity')
      
      cy.get('[data-cy=activity-feed]').should('be.visible')
      cy.get('[data-cy=activity-item]').should('have.length', 2)
      cy.get('[data-cy=activity-item]').first().should('contain', 'New Product Launch')
    })
  })

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      cy.viewport('iphone-x')
      cy.visit('/dashboard')
      
      cy.get('[data-cy=mobile-menu-toggle]').should('be.visible')
      cy.get('[data-cy=sidebar]').should('not.be.visible')
      
      cy.get('[data-cy=mobile-menu-toggle]').click()
      cy.get('[data-cy=mobile-sidebar]').should('be.visible')
    })

    it('should adapt to tablet viewport', () => {
      cy.viewport('ipad-2')
      cy.visit('/dashboard')
      
      cy.get('[data-cy=sidebar]').should('be.visible')
      cy.get('[data-cy=metrics-grid]').should('have.class', 'tablet-layout')
    })

    it('should work on desktop viewport', () => {
      cy.viewport(1920, 1080)
      cy.visit('/dashboard')
      
      cy.get('[data-cy=sidebar]').should('be.visible')
      cy.get('[data-cy=metrics-grid]').should('have.class', 'desktop-layout')
      cy.get('[data-cy=chart-container]').should('have.css', 'min-height', '400px')
    })
  })

  describe('Real-time Updates', () => {
    it('should update metrics when new data is available', () => {
      cy.visit('/dashboard')
      
      // Initial load
      cy.intercept('GET', '/api/analytics/overview', {
        statusCode: 200,
        body: { totalPosts: 45, totalEngagement: 1250 }
      }).as('getInitialOverview')
      
      cy.wait('@getInitialOverview')
      cy.get('[data-cy=total-posts]').should('contain', '45')
      
      // Simulate real-time update
      cy.intercept('GET', '/api/analytics/overview', {
        statusCode: 200,
        body: { totalPosts: 46, totalEngagement: 1275 }
      }).as('getUpdatedOverview')
      
      // Trigger refresh (simulating real-time update)
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('analytics-update'))
      })
      
      cy.wait('@getUpdatedOverview')
      cy.get('[data-cy=total-posts]').should('contain', '46')
      cy.get('[data-cy=total-engagement]').should('contain', '1,275')
    })

    it('should show notifications for new activity', () => {
      cy.visit('/dashboard')
      
      // Simulate new notification
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('new-notification', {
          detail: {
            type: 'content_published',
            message: 'Your post was successfully published to Facebook'
          }
        }))
      })
      
      cy.get('[data-cy=notification-toast]').should('be.visible')
      cy.get('[data-cy=notification-message]').should('contain', 'successfully published to Facebook')
      
      // Notification should auto-dismiss
      cy.wait(5000)
      cy.get('[data-cy=notification-toast]').should('not.exist')
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      cy.visit('/dashboard')
      
      cy.get('body').tab()
      cy.focused().should('have.attr', 'data-cy', 'skip-to-content')
      
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-cy').and('match', /nav-/)
      
      cy.focused().tab({ shift: true })
      cy.focused().should('have.attr', 'data-cy', 'skip-to-content')
    })

    it('should have proper ARIA labels', () => {
      cy.visit('/dashboard')
      
      cy.get('[data-cy=metrics-grid]').should('have.attr', 'role', 'region')
      cy.get('[data-cy=metrics-grid]').should('have.attr', 'aria-label', 'Key Performance Metrics')
      
      cy.get('[data-cy=performance-chart]').should('have.attr', 'role', 'img')
      cy.get('[data-cy=performance-chart]').should('have.attr', 'aria-label')
      
      cy.get('[data-cy=activity-feed]').should('have.attr', 'role', 'feed')
      cy.get('[data-cy=activity-feed]').should('have.attr', 'aria-label', 'Recent Activity Feed')
    })

    it('should support screen readers', () => {
      cy.visit('/dashboard')
      
      cy.get('[data-cy=total-posts]').should('have.attr', 'aria-live', 'polite')
      cy.get('[data-cy=total-engagement]').should('have.attr', 'aria-live', 'polite')
      
      cy.get('[data-cy=loading-skeleton]').should('have.attr', 'aria-label', 'Loading content')
      cy.get('[data-cy=error-message]').should('have.attr', 'role', 'alert')
    })
  })
})
