// apps/web/src/games/Grid9/Grid9.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Grid9 from './index.tsx'

const mockFetch = vi.fn()
global.fetch = mockFetch

const defaultProps = {
  campaignId: 'demo-grid9',
  maxPlays: 3,
  onResult: vi.fn(),
}

describe('Grid9', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        config: { prizes: Array(9).fill({ label: '测试奖品' }) },
        remainingPlays: 3,
      }),
    })
  })

  it('renders 9 cells', async () => {
    render(<Grid9 {...defaultProps} />)
    await waitFor(() => {
      const cells = document.querySelectorAll('.grid9-cell')
      expect(cells).toHaveLength(9)
    })
  })

  it('shows remaining plays count', async () => {
    render(<Grid9 {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText(/剩余.*3/)).toBeInTheDocument()
    })
  })

  it('disables button when no plays remain', async () => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ config: { prizes: Array(9).fill({ label: '奖' }) }, remainingPlays: 0 }),
    })
    render(<Grid9 {...defaultProps} maxPlays={0} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /开始抽奖/ })).toBeDisabled()
    })
  })
})
