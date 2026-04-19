import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerGame } from '@paly-sdd/game-core'
import type { GamePlugin } from '@paly-sdd/game-core'
import './skins/default/tokens.css'
import App from './App.tsx'
import Grid9 from './games/Grid9/index.tsx'
import SpinWheel from './games/SpinWheel/index.tsx'
import BlindBox from './games/BlindBox/index.tsx'

const grid9Plugin: GamePlugin = {
  id: 'grid9',
  component: Grid9,
  bffRoutes: [],  // routes are registered in BFF app, not web
}

const spinWheelPlugin: GamePlugin = {
  id: 'spin-wheel',
  component: SpinWheel,
  bffRoutes: [],
}

const blindBoxPlugin: GamePlugin = {
  id: 'blind-box',
  component: BlindBox,
  bffRoutes: [],
}

registerGame(grid9Plugin)
registerGame(spinWheelPlugin)
registerGame(blindBoxPlugin)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
