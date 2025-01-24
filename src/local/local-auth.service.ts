import { generateIdOf } from '@hgraph/storage';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { SigninResponse, SignupResponse } from '../auth.response';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalAuthService {
  private readonly provider = 'local';
  constructor(private readonly authService: AuthService) {}

  private async comparePassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
  }
  async verifyWithUsername(username: string, password: string) {
    const user = await this.authService.findByProvider(username, this.provider);
    if (!user?.passwordHash) return;
    if (!(await this.comparePassword(password, user.passwordHash))) return;
    return user;
  }

  async signinWithUsername(
    username: string,
    password: string,
    response: Response,
  ): Promise<SigninResponse> {
    const authMetadata = await this.verifyWithUsername(username, password);
    if (!authMetadata) {
      throw new UnauthorizedException(
        'Invalid username or password. Please verify your credentials and try again.',
      );
    }
    const { accessToken, authInfo } = await this.authService.issueTokens(
      authMetadata.id,
      response,
    );
    return { accessToken, userId: authInfo.userId };
  }

  async signupWithUsername(
    username: string,
    password: string,
  ): Promise<SignupResponse> {
    const existingUser = await this.authService.findByProvider(
      username,
      'local',
    );
    if (existingUser) {
      throw new BadRequestException(
        `The username '${username}' is already in use. Please verify your username or choose a different one.`,
      );
    }
    const id = generateIdOf(username);
    const user = await this.authService.createUser(
      {
        name: username,
        identifier: username,
        providerId: id,
        provider: this.provider,
      },
      { password },
    );
    return { userId: user.userId };
  }

  async signout(response: Response) {
    return await this.authService.signout(response);
  }
}
