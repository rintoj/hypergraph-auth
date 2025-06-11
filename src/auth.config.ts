import { Injectable } from '@nestjs/common'
import { CookieOptions } from 'express'
import { ClassType } from 'tsds-tools'
import { AuthInfo, UserMetadata } from './auth.model'
import { GoogleAuthConfig } from './google/google-auth.config'
import { LocalAuthConfig } from './local/local-auth.config'
import { SupabaseAuthConfig } from './supabase/supabase-auth.config'

export enum AuthStrategyType {
  Local = 'local',
  Supabase = 'Supabase',
  Google = 'Google',
}

export type AuthStrategy = LocalAuthConfig | SupabaseAuthConfig | GoogleAuthConfig

export interface AuthJwtConfig {
  secret: string
  expiry: string
  refreshSecret: string
  refreshExpiry: string
}

export interface UserServiceSpec {
  findById(id: string): Promise<AuthInfo>
  findByIdentifier(identifier: string): Promise<AuthInfo>
  createUser(user: UserMetadata): Promise<AuthInfo>
}

@Injectable()
export class AuthConfig {
  strategies: AuthStrategy[]
  jwtConfig: AuthJwtConfig
  userService!: ClassType<UserServiceSpec>
  cookieConfig?: Omit<CookieOptions, 'encode'>
  hashSaltRounds?: number
  authCodeExpiry?: string
}
