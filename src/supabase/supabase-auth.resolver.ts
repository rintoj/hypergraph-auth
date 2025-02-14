import { Args, Context, Mutation, Resolver } from '@nestjs/graphql'
import { Public } from '../auth.guard'
import { SigninResponse } from '../auth.response'
import { RequestContext } from '../common/context'
import { SupabaseAuthService } from './supabase-auth.service'

@Resolver()
export class SupabaseAuthResolver {
  constructor(private readonly supabaseService: SupabaseAuthService) {}

  @Public()
  @Mutation(() => SigninResponse)
  signinWithCode(
    @Args('code') code: string,
    @Args('provider') provider: string,
    @Context() context: RequestContext,
  ) {
    return this.supabaseService.signinWithCode(code, provider, context.res)
  }
}
