import { DynamicModule, Module } from '@nestjs/common'
import { AuthModule } from '../auth.module'
import { GoogleAuthConfig } from './google-auth.config'
import { GoogleAuthController } from './google-auth.controller'
import { GoogleAuthResolver } from './google-auth.resolver'
import { GoogleAuthService } from './google-auth.service'

@Module({})
export class GoogleAuthModule {
  static forRoot(config: GoogleAuthConfig): DynamicModule {
    return {
      module: GoogleAuthModule,
      imports: [AuthModule],
      providers: [
        GoogleAuthConfig,
        GoogleAuthService,
        GoogleAuthResolver,
        { provide: GoogleAuthConfig, useValue: config },
      ],
      exports: [GoogleAuthService],
      controllers: [GoogleAuthController],
    }
  }
}
