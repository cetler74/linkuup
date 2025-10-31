import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'

// Mock the API client
vi.mock('../../services/api/client', () => ({
  APIClient: vi.fn().mockImplementation(() => ({
    request: vi.fn()
  }))
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with no user and not authenticated', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('handles successful login', async () => {
    const mockAPIClient = {
      request: vi.fn().mockResolvedValue({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        token_type: 'bearer',
        expires_in: 3600
      })
    }

    vi.mocked(require('../../services/api/client').APIClient).mockImplementation(() => mockAPIClient)

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper()
    })

    await act(async () => {
      await result.current.login('test@example.com', 'password123')
    })

    expect(mockAPIClient.request).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    })
  })

  it('handles login error', async () => {
    const mockAPIClient = {
      request: vi.fn().mockRejectedValue(new Error('Invalid credentials'))
    }

    vi.mocked(require('../../services/api/client').APIClient).mockImplementation(() => mockAPIClient)

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper()
    })

    await act(async () => {
      try {
        await result.current.login('test@example.com', 'wrongpassword')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Invalid credentials')
      }
    })
  })

  it('handles successful registration', async () => {
    const mockAPIClient = {
      request: vi.fn().mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User'
      })
    }

    vi.mocked(require('../../services/api/client').APIClient).mockImplementation(() => mockAPIClient)

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper()
    })

    await act(async () => {
      await result.current.register({
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
        phone: '+1234567890'
      })
    })

    expect(mockAPIClient.request).toHaveBeenCalledWith('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
        phone: '+1234567890'
      })
    })
  })

  it('handles logout', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper()
    })

    await act(async () => {
      result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('persists authentication state', () => {
    // Mock localStorage
    const mockLocalStorage = {
      getItem: vi.fn().mockReturnValue('mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }
    
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper()
    })

    // Should check localStorage for existing token
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('access_token')
  })
})
