import { Args, Context, Mutation, Resolver } from '@nestjs/graphql'
import { Public } from '../auth.guard'
import { SigninResponse } from '../auth.response'
import { RequestContext } from '../common/context'
import { GoogleAuthService } from './google-auth.service'

@Resolver()
export class GoogleAuthResolver {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  @Public()
  @Mutation(() => SigninResponse)
  signinWithCode(
    @Args('code') code: string,
    @Args('provider') provider: string,
    @Context() context: RequestContext,
  ) {
    return this.googleAuthService.signinWithCode(code, provider, context.res)
  }
}
