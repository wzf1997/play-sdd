import type { GamePlugin } from './types.js'

const registry = new Map<string, GamePlugin>()

export function registerGame(plugin: GamePlugin): void {
  registry.set(plugin.id, plugin)
}

export function getGame(id: string): GamePlugin | undefined {
  return registry.get(id)
}

/** Test helper only — clears registry between tests */
export function clearRegistry(): void {
  registry.clear()
}
