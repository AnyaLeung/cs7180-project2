import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../../hooks/useAuth';

vi.mock('../../utils/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

import { api } from '../../utils/api';
const mockPost = vi.mocked(api.post);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initialises as unauthenticated when no token in localStorage', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it('initialises as authenticated when token exists in localStorage', () => {
    localStorage.setItem('token', 'existing-jwt');
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('existing-jwt');
  });

  it('login stores JWT and updates state', async () => {
    mockPost.mockResolvedValueOnce({ token: 'new-jwt-token' });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('user@test.com', 'password123');
    });

    expect(mockPost).toHaveBeenCalledWith('/api/auth/login', {
      email: 'user@test.com',
      password: 'password123',
    });
    expect(localStorage.getItem('token')).toBe('new-jwt-token');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('new-jwt-token');
  });

  it('login throws on API error', async () => {
    mockPost.mockRejectedValueOnce(new Error('Invalid credentials'));
    const { result } = renderHook(() => useAuth());

    await expect(
      act(async () => {
        await result.current.login('bad@test.com', 'wrong');
      })
    ).rejects.toThrow('Invalid credentials');

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('register calls API with correct payload', async () => {
    mockPost.mockResolvedValueOnce({ id: 'user-1', email: 'new@test.com' });
    const { result } = renderHook(() => useAuth());

    let response: unknown;
    await act(async () => {
      response = await result.current.register('new@test.com', 'password123');
    });

    expect(mockPost).toHaveBeenCalledWith('/api/auth/register', {
      email: 'new@test.com',
      password: 'password123',
    });
    expect(response).toEqual({ id: 'user-1', email: 'new@test.com' });
  });

  it('logout clears token and updates state', async () => {
    localStorage.setItem('token', 'some-jwt');
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
  });
});
