import { Controller, Get, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'

@Controller('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('/signout')
  async signout(@Req() request: Request, @Res() response: Response) {
    await this.authService.signout(response)
    const { redirect_uri } = request.query as any
    response.redirect(redirect_uri)
  }
}
