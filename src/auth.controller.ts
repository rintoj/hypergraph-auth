import { Controller, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { AuthService } from './auth.service'

@Controller('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/signout')
  async signout(@Res() response: Response) {
    await this.authService.signout(response)
    return response.json({ user: null })
  }
}
