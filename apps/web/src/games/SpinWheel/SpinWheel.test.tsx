// apps/web/src/games/SpinWheel/SpinWheel.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SpinWheel from './index.tsx'

const mockFetch = vi.fn()
global.fetch = mockFetch

const sectors = [
  { label: '大奖', color: '#FF6B6B' },
  { label: '优惠券', color: '#4ECDC4' },
  { label: '谢谢参与', color: '#95E1D3' },
  { label: '积分', color: '#F8B400' },
]

beforeEach(() => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ config: { sectors }, remainingPlays: 3 }),
  })
})

describe('SpinWheel', () => {
  it('renders SVG wheel with correct sector count', async () => {
    render(<SpinWheel campaignId="demo-spin-wheel" maxPlays={3} onResult={vi.fn()} />)
    await waitFor(() => {
      const paths = document.querySelectorAll('.wheel-sector')
      expect(paths).toHaveLength(4)
    })
  })

  it('renders spin button', async () => {
    render(<SpinWheel campaignId="demo-spin-wheel" maxPlays={3} onResult={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /转动/ })).toBeInTheDocument()
    })
  })
})
