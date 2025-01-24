import { generateIdOf, generateNumericId } from '@hgraph/storage';
import { InjectRepo, Repository } from '@hgraph/storage/nestjs';
import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { AuthConfig, UserServiceSpec } from './auth.config';
import { ACCESS_TOKEN } from './auth.input';
import {
  AuthInfo,
  AuthMetadata,
  Credentials,
  UserMetadata,
} from './auth.model';
import { calculateExpiresAt, expirationToSeconds } from './auth.utils';

const DEFAULT_HASH_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authConfig: AuthConfig,
    @InjectRepo(AuthMetadata)
    private readonly authMetadataRepository: Repository<AuthMetadata>,
    @Inject('UserService')
    private readonly userService: UserServiceSpec,
  ) {}

  private async generateHash(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(
      this.authConfig.hashSaltRounds || DEFAULT_HASH_SALT_ROUNDS,
    );
    return await bcrypt.hash(password, salt);
  }

  private generateTokens(payload: AuthInfo) {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.authConfig.jwtConfig.secret,
      expiresIn: this.authConfig.jwtConfig.expiry,
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.authConfig.jwtConfig.refreshSecret,
      expiresIn: this.authConfig.jwtConfig.refreshExpiry,
    });
    return { accessToken, refreshToken };
  }

  private attachTokensToResponse(response: Response, accessToken: string) {
    response.header(ACCESS_TOKEN, accessToken);
    response.cookie(ACCESS_TOKEN, accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: expirationToSeconds(this.authConfig.jwtConfig.expiry) * 1000,
      ...(this.authConfig.cookieConfig ?? {}),
    });
  }

  private generateAuthMetadataId({
    provider,
    identifier,
  }: Pick<AuthMetadata, 'provider' | 'identifier'>) {
    return generateIdOf(`${provider}:${identifier}`);
  }

  findByIdentifier(identifier: string): Promise<AuthInfo | undefined> {
    return this.userService.findByIdentifier(identifier);
  }

  findByProvider(
    identifier: string,
    provider: string,
  ): Promise<AuthMetadata | undefined> {
    return this.authMetadataRepository.findOne((q) =>
      q
        .whereEqualTo('identifier', identifier)
        .whereEqualTo('provider', provider),
    );
  }

  async findByAuthCode(
    authCode: string,
    provider: string,
  ): Promise<AuthMetadata | undefined> {
    return await this.authMetadataRepository.findOne((q) =>
      q
        .whereEqualTo('authCode', authCode)
        .whereEqualTo('provider', provider)
        .whereMoreThanOrEqual('authCodeExpiresAt', new Date()),
    );
  }

  async createUser(
    input: UserMetadata,
    credentials?: Credentials,
  ): Promise<AuthInfo> {
    let user = await this.userService.findByIdentifier(input.identifier);
    if (!user) {
      user = await this.userService.createUser(input);
    }
    await this.authMetadataRepository.save({
      id: this.generateAuthMetadataId(input),
      userId: user.userId,
      provider: input.provider,
      identifier: input.identifier,
      passwordHash: credentials?.password
        ? await this.generateHash(credentials.password)
        : null,
      refreshTokenHash: credentials?.refreshToken
        ? await this.generateHash(credentials.refreshToken)
        : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return user;
  }

  async issueTokens(authMetadataId: string, response: Response) {
    const authMeta = await this.authMetadataRepository.findById(authMetadataId);
    if (!authMeta) {
      throw new UnauthorizedException('Authentication failed: User not found');
    }
    const user = await this.userService.findById(authMeta.userId);
    const authInfo: AuthInfo = {
      userId: user.userId,
      identifier: user.identifier,
      roles: user.roles,
    };
    const { accessToken } = this.generateTokens(authInfo);
    await this.authMetadataRepository.update({
      id: authMeta.id,
      lastSigninAt: new Date(),
    });
    this.attachTokensToResponse(response, accessToken);
    return { accessToken, authInfo };
  }

  async issueAuthCode(identifier: string, provider: string) {
    const authMetadata = await this.findByProvider(identifier, provider);
    if (!authMetadata) {
      throw new NotFoundException(
        'Authentication failed: Auth metadata not found',
      );
    }
    const code = generateNumericId();
    await this.authMetadataRepository.update({
      id: authMetadata.id,
      authCode: code,
      authCodeExpiresAt: new Date(
        calculateExpiresAt(this.authConfig.authCodeExpiry ?? '5m'),
      ),
    });
    return code;
  }

  async clearAuthCode(id: string) {
    await this.authMetadataRepository.update({
      id,
      authCode: null,
      authCodeExpiresAt: null,
    });
  }

  async signout(response: Response) {
    response.clearCookie(ACCESS_TOKEN);
  }
}
