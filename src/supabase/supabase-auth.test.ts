import { RepositoryType, StorageModule } from '@hgraph/storage/nestjs'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { Controller, Get, INestApplication } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { Test, TestingModule } from '@nestjs/testing'
import * as supertest from 'supertest'
import { App } from 'supertest/types'
import { URL } from 'url'
import { Public } from '../auth.guard'
import { AuthModule } from '../auth.module'
import { UserModule } from '../user/user.module'
import { UserService } from '../user/user.service'
import { createSupabaseAuthStrategy } from './supabase-auth.config'
import { SupabaseAuthService } from './supabase-auth.service'

const request = supertest as any as (app: App) => supertest.SuperTest<supertest.Test>

@Controller()
export class TestController {
  @Get('/protected')
  protected() {
    return { public: false }
  }

  @Public()
  @Get('/public')
  public() {
    return { public: true }
  }
}
const config = {
  supabaseUrl: 'https://example.supabase.co',
  supabaseAnonKey: 'supabase-key',
  redirectUrl: 'http://localhost:2212',
  providers: ['google'],
}

describe('Supabase Auth', () => {
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
          strategies: [createSupabaseAuthStrategy(config)],
          jwtConfig: {
            secret: 'secret1',
            expiry: '1h',
            refreshSecret: 'secret2',
            refreshExpiry: '7d',
          },
        }),
      ],
      controllers: [TestController],
    }).compile()

    app = module.createNestApplication()
    await app.init()
    service = module.get(SupabaseAuthService)
    service.supabase = {
      auth: {
        signInWithOAuth: async () => {
          return {
            data: { url: config.supabaseUrl },
            error: null,
          }
        },
        exchangeCodeForSession: () => ({
          data: {
            session: {
              user: {
                user_metadata: {
                  id: 'asdfs23d',
                  full_name: 'John Doe',
                  email: 'john@mail.com',
                  phone_number: '1234567890',
                  avatar_url: 'https://example.com/avatar.png',
                },
                app_metadata: {
                  provider: 'google',
                },
              },
            },
          },
        }),
      },
    }
  })

  test('should redirect to Supabase Google OAuth URL', async () => {
    await request(app.getHttpServer())
      .get('/auth/supabase/google')
      .expect(302)
      .expect(res => {
        expect(res.headers.location).toContain(config.supabaseUrl)
      })
  })

  test('should redirect to Supabase Google OAuth URL with valid redirect URL', async () => {
    await request(app.getHttpServer())
      .get(`/auth/supabase/google?next=${config.redirectUrl}`)
      .expect(302)
      .expect(res => {
        expect(res.headers.location).toMatch(config.supabaseUrl)
      })
  })

  test('should exchange code for session and redirect with auth code and provider', async () => {
    const code = 'code'
    const exchangeCodeForSession = jest.spyOn(service, 'exchangeCodeForSession')
    await request(app.getHttpServer())
      .get(`/auth/supabase/callback?code=${code}`)
      .expect(302)
      .expect(res => {
        expect(res.headers.location).toMatch(config.redirectUrl)
        const url = new URL(res.headers.location)
        const authCode = url.searchParams.get('code')
        const provider = url.searchParams.get('provider')
        expect(authCode).toMatch(/[0-9]+/)
        expect(provider).toEqual('supabase:google')
      })
    expect(exchangeCodeForSession).toHaveBeenCalled()
  })

  test('should exchange code for session and return access token and user ID', async () => {
    const code = 'code'
    const { authCode, provider } = await request(app.getHttpServer())
      .get(`/auth/supabase/callback?code=${code}`)
      .expect(302)
      .then(res => {
        expect(res.headers.location).toMatch(config.redirectUrl)
        const url = new URL(res.headers.location)
        const authCode = url.searchParams.get('code')
        const provider = url.searchParams.get('provider')
        return { authCode, provider }
      })
    await request(app.getHttpServer())
      .post('/auth/supabase/token')
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
      .get(`/auth/supabase/callback?code=${code}`)
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
      .get(`/auth/supabase/callback?code=${code}`)
      .expect(302)
      .then(res => {
        expect(res.headers.location).toMatch(config.redirectUrl)
        const url = new URL(res.headers.location)
        const authCode = url.searchParams.get('code')
        const provider = url.searchParams.get('provider')
        return { authCode, provider }
      })
    const { accessToken } = await request(app.getHttpServer())
      .post('/auth/supabase/token')
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
      .get(`/auth/supabase/callback?code=${code}`)
      .expect(302)
      .then(res => {
        expect(res.headers.location).toMatch(config.redirectUrl)
        const url = new URL(res.headers.location)
        const authCode = url.searchParams.get('code')
        const provider = url.searchParams.get('provider')
        return { authCode, provider }
      })
    const { accessToken } = await request(app.getHttpServer())
      .post('/auth/supabase/token')
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
      .get(`/auth/supabase/callback?code=${code}`)
      .expect(302)
      .then(res => {
        expect(res.headers.location).toMatch(config.redirectUrl)
        const url = new URL(res.headers.location)
        const authCode = url.searchParams.get('code')
        const provider = url.searchParams.get('provider')
        return { authCode, provider }
      })
    const { accessToken } = await request(app.getHttpServer())
      .post('/auth/supabase/token')
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
      .post('/auth/supabase/token')
      .send({ code: 'invalid_code', provider: 'supabase:google' })
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
      variables: { code: 'invalid_code', provider: 'supabase:google' },
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
      .get('/auth/supabase/google?next=/invalid/url')
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
      .get('/auth/supabase/callback')
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
      .get('/auth/supabase/nonexistent')
      .expect(404)
      .expect(res => {
        expect(res.body).toEqual({
          statusCode: 404,
          message: 'Not Found',
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
      .post('/auth/supabase/token')
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
