import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Req,
  Res,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { Public } from '../auth.guard'
import { GoogleAuthConfig } from './google-auth.config'
import { GoogleAuthService } from './google-auth.service'

@Controller('/auth/google')
export class GoogleAuthController {
  constructor(
    private readonly config: GoogleAuthConfig,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  private validateNextUrl(next: string | undefined) {
    if (!next) return
    if (!this.config.redirectUrl.split(',').includes(next)) {
      throw new BadRequestException('Invalid redirect URL')
    }
  }

  private getRedirectUrl(request: Request): string {
    const protocol = request.protocol
    const host = request.get('host')
    return `${protocol}://${host}/auth/google/callback`
  }

  @Public()
  @Get('/callback')
  async handleCallback(@Req() request: Request, @Res() res: Response) {
    const { code, state: next } = request.query as any
    this.validateNextUrl(next)
    const redirectUri = this.getRedirectUrl(request)
    const output = await this.googleAuthService.exchangeCodeForSession(code, redirectUri)
    res.redirect(`${next ?? this.config.redirectUrl}?code=${output.code}&provider=google`)
  }

  @Public()
  @Post('/token')
  async signWithCode(@Res() response: Response, @Body() input: { code: string; provider: string }) {
    if (!input?.code || !input?.provider) {
      throw new BadRequestException('Provider is missing. Please provide a valid provider.')
    }
    const user = await this.googleAuthService.signinWithCode(input.code, input.provider, response)
    return response.status(200).json(user)
  }

  @Public()
  @Get('/')
  async signinWithProvider(@Req() request: Request, @Res() res: Response) {
    const { scope, next } = request?.query as any
    this.validateNextUrl(next)
    const redirectUri = this.getRedirectUrl(request)
    const response = await this.googleAuthService.signin(scope, redirectUri, next)
    if (!response?.data?.url) {
      throw new InternalServerErrorException('Invalid redirect URL')
    }
    res.redirect(response?.data?.url)
  }
}
