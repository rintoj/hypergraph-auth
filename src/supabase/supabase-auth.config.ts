import { AuthStrategy, AuthStrategyType } from '../auth.config'

export class SupabaseAuthConfig {
  public type: AuthStrategyType.Supabase
  public supabaseUrl: string
  public supabaseAnonKey: string
  public redirectUrl: string
  public providers: string[]
}

export function createSupabaseAuthStrategy(config: Omit<SupabaseAuthConfig, 'type'>): AuthStrategy {
  return {
    type: AuthStrategyType.Supabase,
    ...config,
  }
}
