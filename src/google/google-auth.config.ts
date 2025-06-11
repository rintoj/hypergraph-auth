import { AuthStrategy, AuthStrategyType } from '../auth.config'

export class GoogleAuthConfig {
  public readonly type: AuthStrategyType.Google
  public readonly clientId: string
  public readonly clientSecret: string
  public readonly redirectUrl: string
}

export function createGoogleAuthStrategy(config: Omit<GoogleAuthConfig, 'type'>): AuthStrategy {
  return {
    type: AuthStrategyType.Google,
    ...config,
  }
}
