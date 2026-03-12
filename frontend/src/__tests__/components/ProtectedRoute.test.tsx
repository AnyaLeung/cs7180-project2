import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../../components/ProtectedRoute';

function renderWithRouter(token: string | null) {
  if (token) localStorage.setItem('token', token);

  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <ProtectedRoute>
        <div data-testid="protected-content">Protected</div>
      </ProtectedRoute>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('renders children when token exists', () => {
    renderWithRouter('valid-jwt');
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('does not render children when no token', () => {
    renderWithRouter(null);
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
