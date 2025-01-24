import { Context, Mutation, Resolver } from '@nestjs/graphql';
import { RequestContext } from '../context';
import { Public } from './auth.guard';
import { AuthService } from './auth.service';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Mutation(() => Boolean)
  async signout(@Context() context: RequestContext) {
    await this.authService.signout(context.res);
    return true;
  }
}
