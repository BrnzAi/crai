import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';

/**
 * Request logging middleware
 */
export function requestLogger(
  request: FastifyRequest,
  _reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  // Skip logging for health checks
  if (request.url === '/health') {
    return done();
  }

  request.log.info({
    type: 'request',
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  });

  done();
}
