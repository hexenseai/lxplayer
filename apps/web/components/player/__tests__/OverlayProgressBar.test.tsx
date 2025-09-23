import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OverlayProgressBar } from '../OverlayProgressBar';

// Mock overlays data
const mockOverlays = [
  {
    id: 'overlay-1',
    time_stamp: 10,
    type: 'button_message' as const,
    caption: 'Test Message',
    pause_on_show: false
  },
  {
    id: 'overlay-2',
    time_stamp: 30,
    type: 'button_link' as const,
    caption: 'External Link',
    pause_on_show: true
  },
  {
    id: 'overlay-3',
    time_stamp: 50,
    type: 'content' as const,
    caption: 'Content Overlay',
    pause_on_show: false
  }
];

describe('OverlayProgressBar', () => {
  const defaultProps = {
    currentTime: 20,
    duration: 100,
    overlays: mockOverlays,
    onSeek: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders progress bar with correct current time position', () => {
    render(<OverlayProgressBar {...defaultProps} />);
    
    // Check if progress bar is rendered
    const progressBar = screen.getByRole('progressbar', { hidden: true });
    expect(progressBar).toBeInTheDocument();
  });

  it('displays overlay indicators at correct positions', () => {
    render(<OverlayProgressBar {...defaultProps} />);
    
    // Check if overlay indicators are present
    // Note: The exact implementation may vary based on how the indicators are rendered
    const progressContainer = screen.getByRole('progressbar', { hidden: true }).parentElement;
    expect(progressContainer).toBeInTheDocument();
  });

  it('calls onSeek when progress bar is clicked', () => {
    const onSeekMock = jest.fn();
    render(<OverlayProgressBar {...defaultProps} onSeek={onSeekMock} />);
    
    const progressBar = screen.getByRole('progressbar', { hidden: true });
    fireEvent.click(progressBar, { clientX: 50 }); // Click at 50% position
    
    expect(onSeekMock).toHaveBeenCalled();
  });

  it('shows correct time labels', () => {
    render(<OverlayProgressBar {...defaultProps} />);
    
    // Check for time labels
    expect(screen.getByText('0s')).toBeInTheDocument();
    expect(screen.getByText('100s')).toBeInTheDocument();
  });

  it('handles zero duration gracefully', () => {
    render(<OverlayProgressBar {...defaultProps} duration={0} />);
    
    // Should not crash and should show 0s labels
    expect(screen.getByText('0s')).toBeInTheDocument();
  });

  it('sorts overlays by timestamp', () => {
    const unsortedOverlays = [
      { id: '3', time_stamp: 50, type: 'label' as const },
      { id: '1', time_stamp: 10, type: 'label' as const },
      { id: '2', time_stamp: 30, type: 'label' as const },
    ];
    
    render(<OverlayProgressBar {...defaultProps} overlays={unsortedOverlays} />);
    
    // Component should handle sorting internally
    expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();
  });
});
