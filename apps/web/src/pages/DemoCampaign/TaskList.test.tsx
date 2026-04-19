import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TaskList from './TaskList.tsx'

const mockFetch = vi.fn()
global.fetch = mockFetch

const inProgressTask = {
  id: 't1', title: '首次游玩', description: '游玩一次',
  type: 'once', targetCount: 1, trigger: 'play', prizeId: 'p1',
  currentCount: 0, status: 'in_progress',
}
const completedTask = {
  id: 't2', title: '累计3次', description: '游玩3次',
  type: 'cumulative', targetCount: 3, trigger: 'play', prizeId: 'p1',
  currentCount: 3, status: 'completed',
}
const claimedTask = {
  id: 't3', title: '赢得奖品', description: '赢一次',
  type: 'once', targetCount: 1, trigger: 'win', prizeId: 'p2',
  currentCount: 1, status: 'claimed',
}

const defaultProps = {
  campaignId: 'demo-grid9',
  playCount: 0,
  onClaimed: vi.fn(),
}

beforeEach(() => {
  mockFetch.mockClear()
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ tasks: [inProgressTask, completedTask, claimedTask] }),
  })
})

describe('TaskList', () => {
  it('renders task titles', async () => {
    render(<TaskList {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('首次游玩')).toBeInTheDocument()
      expect(screen.getByText('累计3次')).toBeInTheDocument()
    })
  })

  it('shows Claim button only for completed tasks', async () => {
    render(<TaskList {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '领取奖励' })).toBeInTheDocument()
    })
    // in_progress task has no button
    expect(screen.queryAllByRole('button', { name: '领取奖励' })).toHaveLength(1)
  })

  it('shows claimed label for claimed tasks', async () => {
    render(<TaskList {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText(/已领取/)).toBeInTheDocument()
    })
  })

  it('renders progress bar width correctly for cumulative task', async () => {
    render(<TaskList {...defaultProps} />)
    await waitFor(() => screen.getByText('累计3次'))
    const fills = document.querySelectorAll('.task-progress-fill')
    // completedTask: 3/3 = 100%, inProgressTask: 0/1 = 0%
    const widths = Array.from(fills).map((el) => (el as HTMLElement).style.width)
    expect(widths).toContain('0%')
    expect(widths).toContain('100%')
  })

  it('re-fetches when playCount changes', async () => {
    const { rerender } = render(<TaskList {...defaultProps} playCount={0} />)
    await waitFor(() => screen.getByText('首次游玩'))
    expect(mockFetch).toHaveBeenCalledTimes(1)
    rerender(<TaskList {...defaultProps} playCount={1} />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  })

  it('calls onClaimed after successful claim', async () => {
    const onClaimed = vi.fn()
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ tasks: [completedTask] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ prize: { id: 'p1', name: '积分×10', type: 'virtual' } }) })

    render(<TaskList {...defaultProps} onClaimed={onClaimed} />)
    await waitFor(() => screen.getByRole('button', { name: '领取奖励' }))
    fireEvent.click(screen.getByRole('button', { name: '领取奖励' }))
    await waitFor(() => expect(onClaimed).toHaveBeenCalledWith('积分×10'))
  })
})
