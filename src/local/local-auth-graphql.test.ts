import { RepositoryType, StorageModule } from '@hgraph/storage/nestjs';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { INestApplication } from '@nestjs/common';
import {
  Field,
  GraphQLModule,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { Test, TestingModule } from '@nestjs/testing';
import * as supertest from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '..';
import { Public } from '../auth.guard';
import { UserModule } from '../../user/user.module';
import { UserService } from '../../user/user.service';
import { createLocalStrategy } from '.';

const request = supertest as any as (
  app: App,
) => supertest.SuperTest<supertest.Test>;

@ObjectType()
export class TestResult {
  @Field()
  public: boolean;
}

@Resolver()
export class TestResolver {
  @Query(() => TestResult)
  protectedData() {
    return { public: false };
  }

  @Public()
  @Query(() => TestResult)
  publicData() {
    return { public: true };
  }
}

describe('Local Auth with GraphQL', () => {
  let module: TestingModule;
  let app: INestApplication;

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
          strategies: [createLocalStrategy({})],
          jwtConfig: {
            secret: 'secret1',
            expiry: '1h',
            refreshSecret: 'secret2',
            refreshExpiry: '7d',
          },
        }),
      ],
      providers: [TestResolver],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  function signup() {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation signupWithUsername($username: String!, $password: String!) {
            signupWithUsername(username: $username, password: $password) {
              userId
            }
          }
        `,
        variables: { username: 'user1', password: 'password1' },
      });
  }

  function signin() {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation signinWithUsername($username: String!, $password: String!) {
            signinWithUsername(username: $username, password: $password) {
              accessToken
              userId
            }
          }
        `,
        variables: { username: 'user1', password: 'password1' },
      });
  }

  function accessPublic() {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          query publicQuery {
            publicData {
              public
            }
          }
        `,
      })
      .expect(200)
      .expect('Content-Type', /json/);
  }

  function accessProtected() {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          query protectedQuery {
            protectedData {
              public
            }
          }
        `,
      });
  }

  test('should successfully sign up a new user and return userId using graphql', async () => {
    await signup()
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          data: {
            signupWithUsername: {
              userId: expect.any(String),
            },
          },
        });
      });
  });

  test('should successfully sign in an existing user and return userId', async () => {
    const user = await signup()
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res) => res.body.data.signupWithUsername);
    await signin()
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          data: {
            signinWithUsername: {
              accessToken: expect.any(String),
              userId: user.userId,
            },
          },
        });
      });
  });

  test('should successfully access public endpoint', async () => {
    await accessPublic().expect((res) => {
      expect(res.body).toEqual({
        data: {
          publicData: {
            public: true,
          },
        },
      });
    });
  });

  test('should successfully access protected endpoint with authentication using Bearer token', async () => {
    await signup().expect(200).expect('Content-Type', /json/);
    const { accessToken } = await signin()
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res) => res.body.data.signinWithUsername);
    await accessProtected()
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          data: {
            protectedData: {
              public: false,
            },
          },
        });
      });
  });

  test('should successfully access protected endpoint with authentication using token', async () => {
    await signup().expect(200).expect('Content-Type', /json/);
    const { accessToken } = await signin()
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res) => res.body.data.signinWithUsername);
    await accessProtected()
      .set('token', accessToken)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          data: {
            protectedData: {
              public: false,
            },
          },
        });
      });
  });

  test('should successfully access protected endpoint with authentication using token in query parameter', async () => {
    await signup().expect(200).expect('Content-Type', /json/);
    const { accessToken } = await signin()
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res) => res.body.data.signinWithUsername);
    await request(app.getHttpServer())
      .post(`/graphql?token=${accessToken}`)
      .send({
        query: `
          query protectedQuery {
            protectedData {
              public
            }
          }
        `,
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          data: {
            protectedData: {
              public: false,
            },
          },
        });
      });
  });

  test('should return 401 error when accessing protected endpoint without authentication', async () => {
    await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          query protectedQuery {
            protectedData {
              public
            }
          }
        `,
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body.errors[0].message).toBe('Unauthorized');
      });
  });

  test('should return 400 error when invalid credentials are provided during signin', async () => {
    await signup().expect(200).expect('Content-Type', /json/);
    await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation signinWithUsername($username: String!, $password: String!) {
            signinWithUsername(username: $username, password: $password) {
              accessToken
              userId
            }
          }
        `,
        variables: { username: 'user1', password: 'wrongpassword' },
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body.errors[0].message).toBe(
          'Invalid username or password. Please verify your credentials and try again.',
        );
      });
  });
});
