import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Dashboard from '../Dashboard';
import { AuthProvider } from '../../contexts/AuthContext';
import * as analyticsService from '../../services/analyticsService';
import * as contentService from '../../services/contentService';

// Mock services
jest.mock('../../services/analyticsService');
jest.mock('../../services/contentService');

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>,
}));

const theme = createTheme();

const MockedDashboard = () => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful API responses
    analyticsService.getOverviewStats.mockResolvedValue({
      success: true,
      stats: {
        totalContent: 45,
        publishedContent: 32,
        pendingApproval: 8,
        totalEngagement: 1250,
        avgEngagementRate: 4.2,
        topPerformingPlatform: 'LinkedIn'
      }
    });

    analyticsService.getEngagementTrends.mockResolvedValue({
      success: true,
      trends: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Engagement',
          data: [65, 59, 80, 81, 56, 55, 40],
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      }
    });

    analyticsService.getPlatformPerformance.mockResolvedValue({
      success: true,
      performance: {
        labels: ['LinkedIn', 'Twitter', 'Instagram', 'TikTok'],
        datasets: [{
          label: 'Engagement Rate',
          data: [4.2, 3.8, 5.1, 6.2],
          backgroundColor: [
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)'
          ]
        }]
      }
    });

    contentService.getRecentContent.mockResolvedValue({
      success: true,
      content: [
        {
          id: '1',
          title: 'AI Revolution in Marketing',
          status: 'published',
          platforms: ['linkedin'],
          createdAt: '2025-05-20T10:00:00Z',
          engagementMetrics: { likes: 45, shares: 12, comments: 8 }
        },
        {
          id: '2',
          title: 'Future of Social Media',
          status: 'pending',
          platforms: ['twitter', 'instagram'],
          createdAt: '2025-05-19T14:30:00Z',
          engagementMetrics: { likes: 23, shares: 5, comments: 3 }
        }
      ]
    });
  });

  describe('Dashboard Loading and Rendering', () => {
    it('should render dashboard with all main sections', async () => {
      render(<MockedDashboard />);

      // Check for main dashboard title
      expect(screen.getByText('Dashboard')).toBeInTheDocument();

      // Wait for API calls to complete and content to render
      await waitFor(() => {
        // Check for stats cards
        expect(screen.getByText('Total Content')).toBeInTheDocument();
        expect(screen.getByText('Published')).toBeInTheDocument();
        expect(screen.getByText('Pending Approval')).toBeInTheDocument();
        expect(screen.getByText('Total Engagement')).toBeInTheDocument();
      });

      // Check for charts
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should display correct stats from API', async () => {
      render(<MockedDashboard />);

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument(); // Total content
        expect(screen.getByText('32')).toBeInTheDocument(); // Published content
        expect(screen.getByText('8')).toBeInTheDocument(); // Pending approval
        expect(screen.getByText('1,250')).toBeInTheDocument(); // Total engagement
      });
    });

    it('should display recent content list', async () => {
      render(<MockedDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Recent Content')).toBeInTheDocument();
        expect(screen.getByText('AI Revolution in Marketing')).toBeInTheDocument();
        expect(screen.getByText('Future of Social Media')).toBeInTheDocument();
      });
    });
  });

  describe('API Error Handling', () => {
    it('should handle analytics API errors gracefully', async () => {
      analyticsService.getOverviewStats.mockRejectedValue(new Error('API Error'));
      analyticsService.getEngagementTrends.mockRejectedValue(new Error('API Error'));
      analyticsService.getPlatformPerformance.mockRejectedValue(new Error('API Error'));

      render(<MockedDashboard />);

      await waitFor(() => {
        // Should still render the dashboard structure
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Charts should not be rendered if data fails to load
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });

    it('should handle content API errors gracefully', async () => {
      contentService.getRecentContent.mockRejectedValue(new Error('Content API Error'));

      render(<MockedDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Recent content section should handle the error
      expect(screen.queryByText('AI Revolution in Marketing')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render grid layout for stats cards', async () => {
      render(<MockedDashboard />);

      await waitFor(() => {
        const statsContainer = screen.getByText('Total Content').closest('[class*="MuiGrid-container"]');
        expect(statsContainer).toBeInTheDocument();
      });
    });
  });

  describe('Performance Metrics Display', () => {
    it('should format engagement numbers correctly', async () => {
      render(<MockedDashboard />);

      await waitFor(() => {
        // Check that large numbers are formatted with commas
        expect(screen.getByText('1,250')).toBeInTheDocument();
      });
    });

    it('should display percentage metrics', async () => {
      render(<MockedDashboard />);

      await waitFor(() => {
        // Should display engagement rate as percentage
        expect(screen.getByText(/4\.2%/)).toBeInTheDocument();
      });
    });
  });

  describe('Content Status Indicators', () => {
    it('should show different status badges for content', async () => {
      render(<MockedDashboard />);

      await waitFor(() => {
        // Check for published status
        const publishedBadges = screen.getAllByText(/published/i);
        expect(publishedBadges.length).toBeGreaterThan(0);

        // Check for pending status
        const pendingBadges = screen.getAllByText(/pending/i);
        expect(pendingBadges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Platform Integration', () => {
    it('should display platform-specific information', async () => {
      render(<MockedDashboard />);

      await waitFor(() => {
        // Should show LinkedIn as top performing platform
        expect(screen.getByText('LinkedIn')).toBeInTheDocument();
      });
    });
  });

  describe('User Interaction', () => {
    it('should have clickable recent content items', async () => {
      render(<MockedDashboard />);

      await waitFor(() => {
        const contentItem = screen.getByText('AI Revolution in Marketing');
        expect(contentItem.closest('a') || contentItem.closest('[role="button"]')).toBeInTheDocument();
      });
    });
  });
});
