// apps/web/src/games/Grid9/index.tsx
import { useState, useEffect, useRef } from 'react'
import type { GameProps } from '@paly-sdd/game-core'
import './Grid9.css'

interface PrizeCell { label: string }

const ANIMATION_DURATION = 2500  // ms
const CELL_SEQUENCE = [0, 1, 2, 5, 8, 7, 6, 3, 4]  // clockwise path

export default function Grid9({ campaignId, onResult }: GameProps) {
  const [prizes, setPrizes] = useState<PrizeCell[]>(Array(9).fill({ label: '' }))
  const [remainingPlays, setRemainingPlays] = useState(0)
  const [activeCell, setActiveCell] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const pendingPrizeRef = useRef<{ id: string; name: string; type: 'virtual'|'physical'|'coupon' } | null>(null)

  useEffect(() => {
    fetch('/api/game/grid9/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getUserToken() },
      body: JSON.stringify({ campaignId }),
    })
      .then((r) => r.json())
      .then((data) => {
        setPrizes((data.config.prizes as PrizeCell[]) ?? Array(9).fill({ label: '?' }))
        setRemainingPlays(data.remainingPlays)
      })
  }, [campaignId])

  async function handlePlay() {
    if (isAnimating || remainingPlays <= 0) return
    setIsAnimating(true)

    const res = await fetch('/api/game/grid9/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getUserToken() },
      body: JSON.stringify({ campaignId }),
    })
    const data = await res.json()
    pendingPrizeRef.current = data.prize

    let step = 0
    const totalSteps = 24
    const interval = setInterval(() => {
      setActiveCell(CELL_SEQUENCE[step % CELL_SEQUENCE.length])
      step++
      if (step >= totalSteps) {
        clearInterval(interval)
        setActiveCell(null)
        setIsAnimating(false)
        setRemainingPlays(data.remainingPlays)
        onResult(pendingPrizeRef.current)
      }
    }, ANIMATION_DURATION / totalSteps)
  }

  return (
    <div className="grid9-container">
      <div className="grid9-board">
        {prizes.map((cell, i) => {
          // 支持 "emoji|名称" 格式（如 "🏆|特等奖"）或纯文本
          const parts = cell.label.split('|')
          const hasEmoji = parts.length === 2
          return (
            <div key={i} className={`grid9-cell ${activeCell === i ? 'active' : ''}`}>
              {hasEmoji ? (
                <>
                  <span className="cell-emoji">{parts[0]}</span>
                  <span>{parts[1]}</span>
                </>
              ) : (
                cell.label
              )}
            </div>
          )
        })}
      </div>
      <div className="grid9-remaining">今日剩余次数：{remainingPlays} 次</div>
      <button
        className="grid9-btn"
        onClick={handlePlay}
        disabled={isAnimating || remainingPlays <= 0}
      >
        {isAnimating ? '抽奖中...' : '立即抽奖'}
      </button>
    </div>
  )
}

function getUserToken(): string {
  let token = localStorage.getItem('user-token')
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem('user-token', token)
  }
  return token
}
