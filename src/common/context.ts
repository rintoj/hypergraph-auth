import type { Request, Response } from 'express'
export interface RequestContext {
  req: Request
  res: Response
}
