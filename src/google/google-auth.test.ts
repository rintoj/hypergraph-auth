import { RepositoryType, StorageModule } from '@hgraph/storage/nestjs'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { Controller, Get, INestApplication } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { Test, TestingModule } from '@nestjs/testing'
import * as supertest from 'supertest'
import { App } from 'supertest/types'
import { URL } from 'url'
import { AuthStrategyType } from '../auth.config'
import { Public } from '../auth.guard'
import { AuthModule } from '../auth.module'
import { UserModule } from '../user/user.module'
import { UserService } from '../user/user.service'
import { createGoogleAuthStrategy } from './google-auth.config'
import { GoogleAuthService } from './google-auth.service'

const request = supertest as any as (app: App) => supertest.SuperTest<supertest.Test>

@Controller()
export class GoogleAuthTestController {
  @Get('/protected')
  protectedLink() {
    return { public: false }
  }

  @Public()
  @Get('/public')
  publicLink() {
    return { public: true }
  }
}
const config = {
  type: AuthStrategyType.Google,
  clientId: 'clientId',
  clientSecret: 'clientSecret',
  redirectUrl: 'http://localhost:2212',
  googleAuthUrl: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=clientId',
}

describe('Google Auth', () => {
  let module: TestingModule
  let app: INestApplication
  let service: any

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          playground: true,
          autoSchemaFile: './schema-test.gql',
          path: '/graphql',
          introspection: true,
          sortSchema: true,
          installSubscriptionHandlers: false,
          context: ({ req, res }) => ({ req, res }),
        }),
        StorageModule.forTest({
          repositoryType: RepositoryType.TypeORM,
        }),
        UserModule,
        AuthModule.forRoot({
          userService: UserService,
          strategies: [createGoogleAuthStrategy(config)],
          jwtConfig: {
            secret: 'secret1',
            expiry: '1h',
            refreshSecret: 'secret2',
            refreshExpiry: '7d',
          },
        }),
      ],
      controllers: [GoogleAuthTestController],
    }).compile()

    app = module.createNestApplication()
    await app.init()
    service = module.get(GoogleAuthService)
    service.signin = jest.fn().mockResolvedValue({
      data: {
        url: config.googleAuthUrl,
      },
    })
    service.getUserInfo = jest.fn().mockResolvedValue({
      sub: '123456789012345678901',
      name: 'Test User',
      given_name: 'Test',
      family_name: 'User',
      picture: 'https://lh3.googleusercontent.com/a/AATXAJzZ1m_g_g_g_g-g-g-g-g-g-g',
      email: 'test.user@example.com',
      email_verified: true,
      locale: 'en-US',
    })
    service.getSession = jest.fn().mockResolvedValue({
      access_token: 'mock_access_token',
      expires_in: 3599,
      token_type: 'Bearer',
      scope:
        'openid profile email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      refresh_token: 'mock_refresh_token',
      id_token: 'mock_id_token',
    })
  })

  test('should redirect to Google Google OAuth URL', async () => {
    await request(app.getHttpServer())
      .get('/auth/google')
      .expect(302)
      .expect(res => {
        expect(res.headers.location).toContain(config.googleAuthUrl)
      })
  })

  test('should redirect to Google Google OAuth URL with valid redirect URL', async () => {
    await request(app.getHttpServer())
      .get(`/auth/google?next=${config.redirectUrl}`)
      .expect(302)
      .expect(res => {
        expect(res.headers.location).toMatch(config.googleAuthUrl)
      })
  })

  test('should exchange code for session and redirect with auth code and provider', async () => {
    const code = 'code'
    const exchangeCodeForSession = jest.spyOn(service, 'exchangeCodeForSession')
    await request(app.getHttpServer())
      .get(`/auth/google/callback?code=${code}&next=${config.redirectUrl}`)
      .expect(302)
      .expect(res => {
        expect(res.headers.location).toMatch(config.redirectUrl)
        const url = new URL(res.headers.location)
        const authCode = url.searchParams.get('code')
        const provider = url.searchParams.get('provider')
        expect(authCode).toBeDefined()
        expect(provider).toEqual('google')
      })
    expect(exchangeCodeForSession).toHaveBeenCalled()
  })

  test('should exchange code for session and return access token and user ID', async () => {
    const code = 'code'
    const { authCode, provider } = await request(app.getHttpServer())
      .get(`/auth/google/callback?code=${code}`)
      .expect(302)
      .then(res => {
        expect(res.headers.location).toMatch(config.redirectUrl)
        const url = new URL(res.headers.location)
        const authCode = url.searchParams.get('code')
        const provider = url.searchParams.get('provider')
        return { authCode, provider }
      })
    await request(app.getHttpServer())
      .post('/auth/google/token')
      .send({ code: authCode, provider })
      .expect(200)
      .expect(res => {
        expect(res.body).toMatchObject({
          accessToken: expect.any(String),
          userId: expect.any(String),
        })
      })
  })

  test('should exchange code for session and return access token and user ID via GraphQL', async () => {
    const code = 'code'
    const { authCode, provider } = await request(app.getHttpServer())
      .get(`/auth/google/callback?code=${code}`)
      .expect(302)
      .then(res => {
        expect(res.headers.location).toMatch(config.redirectUrl)
        const url = new URL(res.headers.location)
        const authCode = url.searchParams.get('code')
        const provider = url.searchParams.get('provider')
        return { authCode, provider }
      })

    const graphqlQuery = {
      query: `
        mutation signinWithCode($code: String!, $provider: String!) {
          signinWithCode(code: $code, provider: $provider) {
            accessToken
            userId
          }
        }
      `,
      variables: { code: authCode, provider },
    }
    await request(app.getHttpServer())
      .post('/graphql')
      .send(graphqlQuery)
      .expect(200)
      .expect(res => {
        expect(res.body.data.signinWithCode).toMatchObject({
          accessToken: expect.any(String),
          userId: expect.any(String),
        })
      })
  })

  test('should access protected route with valid authentication', async () => {
    const code = 'code'
    const { authCode, provider } = await request(app.getHttpServer())
      .get(`/auth/google/callback?code=${code}`)
      .expect(302)
      .then(res => {
        expect(res.headers.location).toMatch(config.redirectUrl)
        const url = new URL(res.headers.location)
        const authCode = url.searchParams.get('code')
        const provider = url.searchParams.get('provider')
        return { authCode, provider }
      })
    const { accessToken } = await request(app.getHttpServer())
      .post('/auth/google/token')
      .send({ code: authCode, provider })
      .expect(200)
      .then(res => res.body)
    await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual({
          public: false,
        })
      })
  })

  test('should access protected route with valid "token" in the header', async () => {
    const code = 'code'
    const { authCode, provider } = await request(app.getHttpServer())
      .get(`/auth/google/callback?code=${code}`)
      .expect(302)
      .then(res => {
        expect(res.headers.location).toMatch(config.redirectUrl)
        const url = new URL(res.headers.location)
        const authCode = url.searchParams.get('code')
        const provider = url.searchParams.get('provider')
        return { authCode, provider }
      })
    const { accessToken } = await request(app.getHttpServer())
      .post('/auth/google/token')
      .send({ code: authCode, provider })
      .expect(200)
      .then(res => res.body)
    await request(app.getHttpServer())
      .get('/protected')
      .set('token', accessToken)
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual({
          public: false,
        })
      })
  })

  test('should access protected route with valid "token" in the query parameter', async () => {
    const code = 'code'
    const { authCode, provider } = await request(app.getHttpServer())
      .get(`/auth/google/callback?code=${code}`)
      .expect(302)
      .then(res => {
        expect(res.headers.location).toMatch(config.redirectUrl)
        const url = new URL(res.headers.location)
        const authCode = url.searchParams.get('code')
        const provider = url.searchParams.get('provider')
        return { authCode, provider }
      })
    const { accessToken } = await request(app.getHttpServer())
      .post('/auth/google/token')
      .send({ code: authCode, provider })
      .expect(200)
      .then(res => res.body)
    await request(app.getHttpServer())
      .get(`/protected?token=${accessToken}`)
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual({
          public: false,
        })
      })
  })

  test('should return error for invalid code during session exchange', async () => {
    await request(app.getHttpServer())
      .post('/auth/google/token')
      .send({ code: 'invalid_code', provider: 'google:google' })
      .expect(400)
      .expect(res => {
        expect(res.body).toEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid authentication code. Please try again.',
        })
      })
  })

  test('should return error for invalid code during session exchange via GraphQL', async () => {
    const graphqlQuery = {
      query: `
        mutation signinWithCode($code: String!, $provider: String!) {
          signinWithCode(code: $code, provider: $provider) {
            accessToken
            userId
          }
        }
      `,
      variables: { code: 'invalid_code', provider: 'google:google' },
    }
    await request(app.getHttpServer())
      .post('/graphql')
      .send(graphqlQuery)
      .expect(200)
      .expect(res => {
        expect(res.body.errors[0].message).toEqual('Invalid authentication code. Please try again.')
      })
  })

  test('should return 400 for invalid redirect URL', async () => {
    await request(app.getHttpServer())
      .get('/auth/google?next=/invalid/url')
      .expect(400)
      .expect(res => {
        expect(res.body).toEqual({
          statusCode: 400,
          message: 'Invalid redirect URL',
          error: 'Bad Request',
        })
      })
  })

  test('should return 401 for missing authorization code during session exchange', async () => {
    await request(app.getHttpServer())
      .get('/auth/google/callback')
      .expect(401)
      .expect(res => {
        expect(res.body).toEqual({
          statusCode: 401,
          message: 'Authorization code is missing. Please provide a valid code.',
          error: 'Unauthorized',
        })
      })
  })

  test('should return 404 for non-existent endpoint', async () => {
    await request(app.getHttpServer())
      .get('/auth/google/nonexistent')
      .expect(404)
      .expect(res => {
        expect(res.body).toEqual({
          statusCode: 404,
          error: 'Not Found',
          message: 'Cannot GET /auth/google/nonexistent',
        })
      })
  })

  test('should return 401 for protected route without authentication', async () => {
    await request(app.getHttpServer())
      .get('/protected')
      .expect(401)
      .expect(res => {
        expect(res.body).toEqual({
          statusCode: 401,
          message: 'Unauthorized',
        })
      })
  })

  test('should return 200 for public route without authentication', async () => {
    await request(app.getHttpServer())
      .get('/public')
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual({
          public: true,
        })
      })
  })

  test('should return 400 for missing provider during session exchange', async () => {
    await request(app.getHttpServer())
      .post('/auth/google/token')
      .send({ code: 'valid_code' })
      .expect(400)
      .expect(res => {
        expect(res.body).toEqual({
          statusCode: 400,
          message: 'Provider is missing. Please provide a valid provider.',
          error: 'Bad Request',
        })
      })
  })
})
