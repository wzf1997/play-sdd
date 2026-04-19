import { useState, useRef } from 'react'
import { getGame } from '@paly-sdd/game-core'
import type { Prize } from '@paly-sdd/game-core'
import GameTabs from './GameTabs.tsx'
import PrizeHistory, { type PrizeHistoryRef } from './PrizeHistory.tsx'
import TaskList from './TaskList.tsx'
import './DemoCampaign.css'

const GAME_TABS = [
  { id: 'grid9', label: '九宫格', campaignId: 'demo-grid9' },
  { id: 'spin-wheel', label: '转盘', campaignId: 'demo-spin-wheel' },
  { id: 'blind-box', label: '盲盒', campaignId: 'demo-blind-box' },
]

export default function DemoCampaign() {
  const [activeGameId, setActiveGameId] = useState('grid9')
  const [playCount, setPlayCount] = useState(0)
  const historyRef = useRef<PrizeHistoryRef>(null)

  const activeTab = GAME_TABS.find((t) => t.id === activeGameId)!
  const plugin = getGame(activeGameId)
  const GameComponent = plugin?.component

  function handleResult(_prize: Prize | null) {
    historyRef.current?.refresh()
    setPlayCount((c) => c + 1)
  }

  return (
    <div className="skin-default demo-page">
      {/* Banner */}
      <div className="demo-banner">
        <div className="demo-banner-text">
          <h1>限时活动</h1>
          <p>多种玩法，好礼等你拿</p>
        </div>
      </div>

      {/* Game Tabs */}
      <GameTabs
        tabs={GAME_TABS.map((t) => ({ id: t.id, label: t.label }))}
        activeId={activeGameId}
        onChange={(id) => setActiveGameId(id)}
      />

      {/* Game Area */}
      <div className="demo-game-area">
        {GameComponent ? (
          <GameComponent
            campaignId={activeTab.campaignId}
            maxPlays={3}
            onResult={handleResult}
          />
        ) : (
          <p style={{ color: 'var(--color-text-muted)' }}>游戏加载中...</p>
        )}
      </div>

      {/* Task List */}
      <TaskList
        campaignId={activeTab.campaignId}
        playCount={playCount}
        onClaimed={() => {}}
      />

      {/* Prize History */}
      <PrizeHistory
        ref={historyRef}
        gameId={activeGameId}
        campaignId={activeTab.campaignId}
      />
    </div>
  )
}
