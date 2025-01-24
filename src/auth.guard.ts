import { ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common'
import { APP_GUARD, Reflector } from '@nestjs/core'
import { GqlExecutionContext } from '@nestjs/graphql'
import { AuthGuard } from '@nestjs/passport'
import { getContextFromExecutionCtx } from './auth.decorator'

export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super()
  }

  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context)
    return ctx.getContext().req
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) {
      return true
    }
    return super.canActivate(context)
  }

  handleRequest(err, auth, info, executionContext) {
    if (err || !auth) {
      throw err || new UnauthorizedException()
    }
    const context = getContextFromExecutionCtx(executionContext)
    context.auth = auth
    return auth
  }
}

export const GlobalAuthGuard = { provide: APP_GUARD, useClass: JwtAuthGuard }
