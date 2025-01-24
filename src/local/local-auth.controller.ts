import { BadRequestException, Body, Controller, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { Public } from '../auth.guard'
import { LoginWithUsernameInput } from './local-auth.input'
import { LocalAuthService } from './local-auth.service'

@Controller('/auth')
export class LocalAuthController {
  constructor(private readonly localAuthService: LocalAuthService) {}

  @Public()
  @Post('/signin')
  async signin(@Res() response: Response, @Body() input: LoginWithUsernameInput) {
    if (!input?.username || !input?.password) {
      throw new BadRequestException('Username and password are required')
    }
    const user = await this.localAuthService.signinWithUsername(
      input?.username,
      input?.password,
      response,
    )
    return response.status(200).json(user)
  }

  @Public()
  @Post('/signup')
  async signup(@Body() input: LoginWithUsernameInput) {
    if (!input?.username || !input?.password) {
      throw new BadRequestException('Username and password are required')
    }
    return this.localAuthService.signupWithUsername(input.username, input.password)
  }

  @Post('/signout')
  async signout(@Res() response: Response) {
    await this.localAuthService.signout(response)
    return response.json({ user: null })
  }
}
