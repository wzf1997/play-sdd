interface Tab { id: string; label: string }

interface GameTabsProps {
  tabs: Tab[]
  activeId: string
  onChange: (id: string) => void
}

export default function GameTabs({ tabs, activeId, onChange }: GameTabsProps) {
  return (
    <div className="game-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`game-tab ${activeId === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
