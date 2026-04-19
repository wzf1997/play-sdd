// apps/web/src/games/BlindBox/BlindBox.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BlindBox from './index.tsx'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ config: { boxTheme: 'default' }, remainingPlays: 3 }),
  })
})

describe('BlindBox', () => {
  it('renders open button', async () => {
    render(<BlindBox campaignId="demo-blind-box" maxPlays={3} onResult={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /开启盲盒/ })).toBeInTheDocument()
    })
  })

  it('shows "今日次数已用完" when no plays remain', async () => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ config: { boxTheme: 'default' }, remainingPlays: 0 }),
    })
    render(<BlindBox campaignId="demo-blind-box" maxPlays={0} onResult={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/今日次数已用完/)).toBeInTheDocument()
    })
  })
})
