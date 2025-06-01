import React from 'react';
import { render } from '@testing-library/react-native';
jest.mock('../../contexts/AppContext', () => ({
  useApp: jest.fn(),
}));
import { useApp } from '../../contexts/AppContext';
import LoadingOverlay from '../LoadingOverlay';

describe('LoadingOverlay', () => {
  it('should not be visible when loading is false', () => {
    (useApp as jest.Mock).mockReturnValue({ isLoading: false });
    const { queryByTestId } = render(<LoadingOverlay />);
    expect(queryByTestId('loading-overlay')).toBeNull();
  });

  it('should be visible when loading is true', () => {
    (useApp as jest.Mock).mockReturnValue({ isLoading: true });
    const { getByTestId } = render(<LoadingOverlay />);
    expect(getByTestId('loading-overlay')).toBeTruthy();
  });

  it('should render ActivityIndicator', () => {
    (useApp as jest.Mock).mockReturnValue({ isLoading: true });
    const { getByTestId } = render(<LoadingOverlay />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });
}); 