import { Injectable } from '@nestjs/common'
import { CookieOptions } from 'express'
import { ClassType } from 'tsds-tools'
import { AuthInfo, UserMetadata } from './auth.model'
import { LocalAuthConfig } from './local'
import { SupabaseAuthConfig } from './supabase/supabase-auth.config'

export enum AuthStrategyType {
  Local = 'local',
  Supabase = 'Supabase',
}

export type AuthStrategy = LocalAuthConfig | SupabaseAuthConfig

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
