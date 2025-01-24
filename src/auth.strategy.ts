import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { parse } from 'cookie';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ACCESS_TOKEN } from './auth.input';
import { AuthConfig } from './auth.config';

@Injectable()
export class AuthStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly authConfig: AuthConfig) {
    super({
      secretOrKey: authConfig.jwtConfig.secret,
      ignoreExpiration: false,
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromHeader(ACCESS_TOKEN),
        ExtractJwt.fromUrlQueryParameter('token'),
        ExtractJwt.fromHeader('token'),
        (req) => {
          const cookies = parse(req.headers.cookie ?? '');
          return cookies[ACCESS_TOKEN];
        },
      ]),
    });
  }

  validate(data, verified) {
    if (data.userId) {
      verified(null, data);
    }
    return verified(new UnauthorizedException());
  }
}
