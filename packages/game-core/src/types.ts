import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ComponentType } from 'react'

export interface Prize {
  id: string
  name: string
  type: 'virtual' | 'physical' | 'coupon'
}

export interface GameProps {
  campaignId: string
  maxPlays: number
  skin?: string
  onResult: (prize: Prize | null) => void
}

export type RouteHandler = (
  req: FastifyRequest,
  reply: FastifyReply
) => Promise<void>

export interface BffRoute {
  method: 'GET' | 'POST'
  path: string
  handler: RouteHandler
}

export interface GamePlugin {
  id: string
  component: ComponentType<GameProps>
  bffRoutes: BffRoute[]
}
