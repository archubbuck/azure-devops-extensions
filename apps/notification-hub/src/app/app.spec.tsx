import { render, screen } from '@testing-library/react';
import App from './app';

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('should have the notification hub title', () => {
    render(<App />);
    expect(screen.getByText('Notification Hub')).toBeTruthy();
  });
});
