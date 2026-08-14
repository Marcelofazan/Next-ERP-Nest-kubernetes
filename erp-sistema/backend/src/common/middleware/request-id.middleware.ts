import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestWithId } from '../types/request-with-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    req.requestId = (req.headers['x-request-id'] as string) ?? randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  }
}
