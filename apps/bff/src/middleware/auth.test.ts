import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import { authMiddleware } from './auth.js'

describe('authMiddleware', () => {
  it('returns 401 when x-user-token is missing', async () => {
    const app = Fastify()
    app.addHook('onRequest', authMiddleware)
    app.get('/test', async () => ({ ok: true }))

    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.body)).toEqual({ error: 'unauthorized' })
  })

  it('passes through when x-user-token is present', async () => {
    const app = Fastify()
    app.addHook('onRequest', authMiddleware)
    app.get('/test', async () => ({ ok: true }))

    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { 'x-user-token': 'test-user-uuid' },
    })
    expect(res.statusCode).toBe(200)
  })
})
