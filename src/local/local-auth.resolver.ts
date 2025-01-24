import { Args, Context, Mutation, Resolver } from '@nestjs/graphql'
import { Public } from '../auth.guard'
import { SigninResponse, SignupResponse } from '../auth.response'
import { RequestContext } from '../common/context'
import { LocalAuthService } from './local-auth.service'

@Resolver()
export class LocalAuthResolver {
  constructor(private readonly localAuthService: LocalAuthService) {}

  @Public()
  @Mutation(() => SigninResponse)
  signinWithUsername(
    @Args('username') username: string,
    @Args('password') password: string,
    @Context() context: RequestContext,
  ) {
    return this.localAuthService.signinWithUsername(username, password, context.res)
  }

  @Public()
  @Mutation(() => SignupResponse)
  signupWithUsername(@Args('username') username: string, @Args('password') password: string) {
    return this.localAuthService.signupWithUsername(username, password)
  }
}
