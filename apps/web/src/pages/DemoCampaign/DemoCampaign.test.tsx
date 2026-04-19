import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerGame } from '@paly-sdd/game-core'
import { clearRegistry } from '@paly-sdd/game-core/registry'
import type { GamePlugin } from '@paly-sdd/game-core'
import DemoCampaign from './index.tsx'
import { createElement } from 'react'

const mockFetch = vi.fn()
global.fetch = mockFetch

const mockPlugin = (id: string): GamePlugin => ({
  id,
  component: () => createElement('div', { 'data-testid': `game-${id}` }, id),
  bffRoutes: [],
})

beforeEach(() => {
  clearRegistry()
  registerGame(mockPlugin('grid9'))
  registerGame(mockPlugin('spin-wheel'))
  registerGame(mockPlugin('blind-box'))
  // handles both PrizeHistory (records:[]) and TaskList (tasks:[]) fetch calls
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ records: [], tasks: [] }) })
})

describe('DemoCampaign', () => {
  it('renders three tabs', () => {
    render(<DemoCampaign />)
    expect(screen.getByText('九宫格')).toBeInTheDocument()
    expect(screen.getByText('转盘')).toBeInTheDocument()
    expect(screen.getByText('盲盒')).toBeInTheDocument()
  })

  it('shows grid9 game by default', () => {
    render(<DemoCampaign />)
    expect(screen.getByTestId('game-grid9')).toBeInTheDocument()
  })
})
