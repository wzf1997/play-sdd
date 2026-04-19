import type { FastifyRequest, FastifyReply } from 'fastify'

export async function authMiddleware(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = req.headers['x-user-token']

}
