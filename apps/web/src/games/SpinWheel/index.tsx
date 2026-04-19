// apps/web/src/games/SpinWheel/index.tsx
import { useState, useEffect } from 'react'
import type { GameProps } from '@paly-sdd/game-core'
import './SpinWheel.css'

interface Sector { label: string; color: string }

function getUserToken(): string {
  let token = localStorage.getItem('user-token')
  if (!token) { token = crypto.randomUUID(); localStorage.setItem('user-token', token) }
  return token
}

function buildSectorPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const x1 = cx + r * Math.cos(toRad(startAngle))
  const y1 = cy + r * Math.sin(toRad(startAngle))
  const x2 = cx + r * Math.cos(toRad(endAngle))
  const y2 = cy + r * Math.sin(toRad(endAngle))
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}

export default function SpinWheel({ campaignId, onResult }: GameProps) {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [remainingPlays, setRemainingPlays] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)

  useEffect(() => {
    fetch('/api/game/spin-wheel/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getUserToken() },
      body: JSON.stringify({ campaignId }),
    })
      .then((r) => r.json())
      .then((data) => {
        setSectors(data.config.sectors ?? [])
        setRemainingPlays(data.remainingPlays)
      })
  }, [campaignId])

  async function handleSpin() {
    if (isSpinning || remainingPlays <= 0 || sectors.length === 0) return
    setIsSpinning(true)

    const res = await fetch('/api/game/spin-wheel/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getUserToken() },
      body: JSON.stringify({ campaignId }),
    })
    const data = await res.json()

    const sectorAngle = 360 / sectors.length
    const winIndex = data.winIndex ?? 0
    const targetAngle = 360 * 5 + (360 - winIndex * sectorAngle - sectorAngle / 2)

    setRotation((prev) => prev + targetAngle)

    setTimeout(() => {
      setIsSpinning(false)
      setRemainingPlays(data.remainingPlays)
      onResult(data.prize)
    }, 4000)
  }

  const cx = 150, cy = 150, r = 140
  const sectorAngle = sectors.length > 0 ? 360 / sectors.length : 0

  return (
    <div className="spinwheel-container">
      <div className="spinwheel-wrapper">
        <div className="spinwheel-pointer">▼</div>
        <svg
          width="300"
          height="300"
          className="spinwheel-svg"
          style={{ transform: `rotate(${rotation}deg)`, transition: isSpinning ? 'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none' }}
        >
          {sectors.map((s, i) => {
            const start = i * sectorAngle - 90
            const end = start + sectorAngle
            const midAngle = ((start + end) / 2) * (Math.PI / 180)
            const labelR = r * 0.65
            return (
              <g key={i}>
                <path
                  className="wheel-sector"
                  d={buildSectorPath(cx, cy, r, start, end)}
                  fill={s.color}
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="1.5"
                />
                <text
                  x={cx + labelR * Math.cos(midAngle)}
                  y={cy + labelR * Math.sin(midAngle)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize="12"
                >
                  {s.label}
                </text>
              </g>
            )
          })}
          {/* 中心 Hub：红底金边圆 + "转"字 — 对齐设计稿 hub 80×80 */}
          <circle cx={cx} cy={cy} r={40} fill="#CC0000" stroke="#F5C842" strokeWidth="3" />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#F5C842"
            fontSize="28"
            fontWeight="800"
          >转</text>
        </svg>
      </div>
      <div className="spinwheel-remaining">今日剩余次数：{remainingPlays} 次</div>
      <button
        className="spinwheel-btn"
        onClick={handleSpin}
        disabled={isSpinning || remainingPlays <= 0}
      >
        {isSpinning ? '旋转中...' : '立即转盘'}
      </button>
    </div>
  )
}
