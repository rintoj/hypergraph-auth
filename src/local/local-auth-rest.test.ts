import { RepositoryType, StorageModule } from '@hgraph/storage/nestjs';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as supertest from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '..';
import { Public } from '../auth.guard';
import { createLocalStrategy } from '.';
import { UserModule } from '../../user/user.module';
import { UserService } from '../../user/user.service';

const request = supertest as any as (
  app: App,
) => supertest.SuperTest<supertest.Test>;

@Controller()
export class TestController {
  @Get('/protected')
  protected() {
    return { public: false };
  }

  @Public()
  @Get('/public')
  public() {
    return { public: true };
  }
}

describe('Local Auth with Rest', () => {
  let module: TestingModule;
  let app: INestApplication;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
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
      controllers: [TestController],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  test('should successfully sign up a new user and return userId', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username: 'user1', password: 'password1' })
      .expect(201)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          userId: expect.any(String),
        });
      });
  });

  test('should successfully sign in an existing user and return userId', async () => {
    const user = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username: 'user1', password: 'password1' })
      .expect(201)
      .then((res) => res.body);
    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ username: 'user1', password: 'password1' })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          accessToken: expect.any(String),
          userId: user.userId,
        });
      });
  });

  test('should successfully access public endpoint', async () => {
    await request(app.getHttpServer())
      .get('/public')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          public: true,
        });
      });
  });

  test('should successfully access protected endpoint with authentication using Bearer token', async () => {
    const { accessToken } = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username: 'user1', password: 'password1' })
      .expect(201)
      .then(() =>
        request(app.getHttpServer())
          .post('/auth/signin')
          .send({ username: 'user1', password: 'password1' })
          .expect(200)
          .then((res) => res.body),
      );
    await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          public: false,
        });
      });
  });

  test('should successfully access protected endpoint with authentication using token', async () => {
    const { accessToken } = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username: 'user1', password: 'password1' })
      .expect(201)
      .then(() =>
        request(app.getHttpServer())
          .post('/auth/signin')
          .send({ username: 'user1', password: 'password1' })
          .expect(200)
          .then((res) => res.body),
      );
    await request(app.getHttpServer())
      .get('/protected')
      .set('token', accessToken)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          public: false,
        });
      });
  });

  test('should successfully access protected endpoint with authentication using token in query parameter', async () => {
    const { accessToken } = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username: 'user1', password: 'password1' })
      .expect(201)
      .then(() =>
        request(app.getHttpServer())
          .post('/auth/signin')
          .send({ username: 'user1', password: 'password1' })
          .expect(200)
          .then((res) => res.body),
      );
    await request(app.getHttpServer())
      .get(`/protected?token=${accessToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          public: false,
        });
      });
  });

  test('should return 401 error when accessing protected endpoint without authentication', async () => {
    await request(app.getHttpServer())
      .get('/protected')
      .expect(401)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          statusCode: 401,
          message: 'Unauthorized',
        });
      });
  });

  test('should return 400 error when username is missing during signup', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ password: 'password' })
      .expect(400)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Username and password are required',
        });
      });
  });

  test('should return 400 error when username is already in use during signup', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username: 'username1', password: 'password' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username: 'username1', password: 'password' })
      .expect(400)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: `The username 'username1' is already in use. Please verify your username or choose a different one.`,
        });
      });
  });

  test('should return 400 error when password is missing during signup', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username: 'user1' })
      .expect(400)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Username and password are required',
        });
      });
  });

  test('should return 400 error when invalid credentials are provided during signin', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username: 'username1', password: 'password' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ username: 'user1', password: 'wrongpassword' })
      .expect(401)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual({
          statusCode: 401,
          error: 'Unauthorized',
          message:
            'Invalid username or password. Please verify your credentials and try again.',
        });
      });
  });
});
