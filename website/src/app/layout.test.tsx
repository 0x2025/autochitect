import { render, screen } from '@testing-library/react';
import RootLayout from './layout';

describe('RootLayout', () => {
  it('should have claw bot text at the bottom', () => {
    render(<RootLayout>Test Content</RootLayout>);
    expect(screen.getByText(/build and maintain by claw bot/i)).toBeDefined();
  });
});
