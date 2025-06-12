import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import type { Response } from 'express'
import { UserMetadata } from '../auth.model'
import { AuthService } from '../auth.service'
import { GoogleAuthConfig } from './google-auth.config'
import { GetSessionRequest, GoogleAuthSession, GoogleUserInfo } from './google-auth.types'

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly authService: AuthService,
    private readonly config: GoogleAuthConfig,
  ) {}

  async signin(
    scopes: string[] = ['openid', 'profile', 'email'],
    redirectUri: string,
    next: string,
  ): Promise<{ data: { url: string } }> {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new UnauthorizedException('Missing clientId or clientSecret')
    }
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: next,
    })
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    return { data: { url } }
  }

  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (response.ok) {
      return response.json()
    } else {
      const errorText = await response.text()
      throw new Error(`Failed to fetch user info: ${response.status} ${errorText}`)
    }
  }

  async getSession(request: GetSessionRequest): Promise<GoogleAuthSession> {
    const { code, refreshToken, type, redirect_uri } = request as any
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new BadRequestException('Google OAuth client ID and secret are not configured')
    } else if (type === 'authorization_code') {
      if (!code) {
        throw new BadRequestException(`Authorization code is required for "${type}" exchange`)
      } else if (!redirect_uri) {
        throw new BadRequestException(`Redirect uri is required for "${type}" exchange`)
      }
    } else if (type === 'refresh_token' && !refreshToken) {
      throw new BadRequestException(`Refresh token is required for "${type}" exchange`)
    }
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        access_type: 'offline',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        ...(type === 'refresh_token'
          ? {
              refresh_token: refreshToken,
              grant_type: 'refresh_token',
            }
          : {}),
        ...(type === 'authorization_code'
          ? {
              code: code,
              grant_type: 'authorization_code',
              redirect_uri,
            }
          : {}),
      }),
    })
    if (response.ok) {
      const data = await response.json()
      return data
    } else {
      const errorText = await response.text()
      throw new Error(`Failed to refresh access token: ${response.status} ${errorText}`)
    }
  }

  async exchangeCodeForSession(code: string | undefined, redirectUri: string) {
    if (!code) {
      throw new UnauthorizedException('Authorization code is missing. Please provide a valid code.')
    }
    const session = await this.getSession({ code, type: 'authorization_code', redirectUri })
    if (!session || !session.access_token) {
      throw new UnauthorizedException(
        'Failed to exchange authorization code for session. Please try again.',
      )
    }
    const user = await this.getUserInfo(session.access_token)
    if (!user) {
      throw new UnauthorizedException(
        'Failed to exchange authorization code for session. Please try again.',
      )
    }
    const provider = `google`
    const userMetadata: UserMetadata = {
      provider,
      providerId: user.sub,
      name: user.name,
      email: user.email,
      identifier: user.email,
      pictureUrl: user.picture,
    }
    await this.authService.createUser(userMetadata)
    const issuedCode = await this.authService.issueAuthCode(
      userMetadata.identifier,
      userMetadata.provider,
    )
    return { code: issuedCode, provider }
  }

  async signinWithCode(code: string, provider: string, response: Response) {
    const authMetadata = await this.authService.findByAuthCode(code, provider)
    if (!authMetadata) {
      throw new BadRequestException('Invalid authentication code. Please try again.')
    }
    await this.authService.clearAuthCode(authMetadata.id)
    const { accessToken, authInfo } = await this.authService.issueTokens(authMetadata.id, response)
    return { accessToken, userId: authInfo.userId }
  }
}
