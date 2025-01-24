import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Req,
  Res,
} from '@nestjs/common'
import { Provider } from '@supabase/supabase-js'
import type { Request, Response } from 'express'
import { Public } from '../auth.guard'
import { SupabaseAuthConfig } from './supabase-auth.config'
import { SupabaseAuthService } from './supabase-auth.service'

const providers = [
  'apple',
  'azure',
  'bitbucket',
  'discord',
  'facebook',
  'figma',
  'github',
  'gitlab',
  'google',
  'kakao',
  'keycloak',
  'linkedin',
  'linkedin_oidc',
  'notion',
  'slack',
  'slack_oidc',
  'spotify',
  'twitch',
  'twitter',
  'workos',
  'zoom',
  'fly',
]

@Controller('/auth/supabase')
export class SupabaseAuthController {
  constructor(
    private readonly config: SupabaseAuthConfig,
    private readonly supabaseService: SupabaseAuthService,
  ) {}

  private validateNextUrl(next: string | undefined) {
    if (!next) return
    if (!this.config.redirectUrl.split(',').includes(next)) {
      throw new BadRequestException('Invalid redirect URL')
    }
  }

  @Public()
  @Get('/callback')
  async handleCallback(@Req() request: Request, @Res() res: Response) {
    const { code, next } = request.query as any
    this.validateNextUrl(next)
    const output = await this.supabaseService.exchangeCodeForSession(code)
    res.redirect(
      `${next ?? this.config.redirectUrl}?code=${output.code}&provider=${output.provider}`,
    )
  }

  @Public()
  @Post('/token')
  async signWithCode(@Res() response: Response, @Body() input: { code: string; provider: string }) {
    if (!input?.code || !input?.provider) {
      throw new BadRequestException('Provider is missing. Please provide a valid provider.')
    }
    const user = await this.supabaseService.signinWithCode(input.code, input.provider, response)
    return response.status(200).json(user)
  }

  @Public()
  @Get('/:provider')
  async signinWithProvider(@Req() request: Request, @Res() res: Response) {
    const { provider } = request.params
    if (!providers.includes(provider)) {
      throw new NotFoundException()
    }
    const host = `${request.protocol}://${request.get('host')}`
    const { next } = request?.query as any
    this.validateNextUrl(next)
    const response = await this.supabaseService.signinWithProvider(
      host,
      provider as unknown as Provider,
      next,
    )
    if (!response?.data?.url) {
      throw new InternalServerErrorException('Invalid redirect URL')
    }
    res.redirect(response?.data?.url)
  }
}
