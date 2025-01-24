# Hypergraph Auth (@hgraph/auth)

The Hypergraph Auth module is designed to be used with NestJS, providing a flexible and powerful way
to configure various authentication strategies. This module supports a wide range of authentication
providers, including popular services like Google, GitHub, Facebook, and many more.

## Installation

To install the Hypergraph Auth module, use either npm or yarn:

```bash
npm install @hgraph/auth
```

or

```bash
yarn add @hgraph/auth
```

## Usage

To use the Hypergraph Auth module in your NestJS application, follow the example below. This example
demonstrates how to configure the module with both local and Supabase authentication strategies.

### Example

```ts
import { Module } from '@nestjs/common'
import { UserModule } from './user/user.module'
import { UserService } from './user/user.service'
import { AuthModule } from '@hgraph/auth'
import { createLocalStrategy } from '@hgraph/auth/local'
import { createSupabaseAuthStrategy } from '@hgraph/auth/supabase'

@Module({
  imports: [
    UserModule,
    AuthModule.forRoot({
      userService: UserService,
      strategies: [
        createLocalStrategy({
          enableGraphQLAPI: true,
          enableRestAPI: true,
        }),
        createSupabaseAuthStrategy({
          supabaseUrl: config.SUPABASE_URL,
          supabaseAnonKey: config.SUPABASE_ANON_KEY,
          redirectUrl: config.AUTH_REDIRECT_URL,
          providers: ['google', 'github', 'facebook'],
        }),
      ],
      jwtConfig: {
        secret: config.JWT_SECRET,
        expiry: config.JWT_EXPIRY,
        refreshSecret: config.JWT_REFRESH_SECRET,
        refreshExpiry: config.JWT_REFRESH_EXPIRY,
      },
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

## Endpoints

The Hypergraph Auth module provides several RESTful endpoints to handle user authentication. Below
is a detailed explanation of each endpoint and its usage.

### REST Endpoints

1. **Sign Up**: This endpoint allows a new user to create an account by providing a username and
   password.

   - **Endpoint**: `POST /auth/signup`
   - **Request Body**: `{ username: string, password: string }`

2. **Sign In**: This endpoint allows an existing user to log in by providing their username and
   password.

   - **Endpoint**: `POST /auth/signin`
   - **Request Body**: `{ username: string, password: string }`
   - **Response Body**: `{ accessToken: string, userId: string }`

3. **Sign Out**: This endpoint allows a user to log out of their account.

   - **Endpoint**: `POST /auth/signout`

4. **Supabase Authentication**: This endpoint allows users to authenticate using various providers
   supported by Supabase.

   - **Endpoint**: `POST /auth/supabase/{provider}`
   - **Example**:
     - `POST /auth/supabase/google`
     - `POST /auth/supabase/github`

5. **OAuth Access Token**: This endpoint allows users to access token from the OAuth code and
   provider.
   - **Endpoint**: `POST /auth/token`
   - **Request Body**: `{ code: string, provider: string }`
   - **Response Body**: `{ accessToken: string, userId: string }`

### GraphQL

In addition to RESTful endpoints, the Hypergraph Auth module also supports GraphQL for more flexible
and powerful queries and mutations. Below is a detailed explanation of the GraphQL schema and its
usage.

```gql
scalar DateTime

type Mutation {
  signupWithUsername(password: String!, username: String!): SignupResponse!
  signinWithUsername(password: String!, username: String!): SigninResponse!
  signinWithCode(code: String!, provider: String!): SigninResponse!
  signout: Boolean!
}

type Query {
  me: User
}

type SigninResponse {
  accessToken: String!
  userId: String!
}

type SignupResponse {
  userId: String!
}

type User {
  createdAt: DateTime
  email: String!
  id: ID!
  name: String!
  phoneNumber: String
  pictureUrl: String
  roles: [UserRole!]!
  updatedAt: DateTime
}

enum UserRole {
  Admin
  User
}
```

### Explanation

1. **Mutations**:

   - `signupWithUsername`: Allows a new user to sign up with a username and password. Returns a
     `SignupResponse` containing the user ID.
   - `signinWithUsername`: Allows an existing user to sign in with a username and password. Returns
     a `SigninResponse` containing an access token and user ID.
   - `signinWithCode`: Allows a user to sign in using a code from a provider (e.g., Google, GitHub).
     Returns a `SigninResponse`.
   - `signout`: Allows a user to sign out. Returns a boolean indicating success.

2. **Queries**:

   - `me`: Retrieves the current authenticated user's information.

3. **Types**:
   - `SigninResponse`: Contains the access token and user ID.
   - `SignupResponse`: Contains the user ID.
   - `User`: Represents a user with fields such as `createdAt`, `email`, `id`, `name`,
     `phoneNumber`, `pictureUrl`, `roles`, and `updatedAt`.
   - `UserRole`: Enum representing user roles, such as `Admin` and `User`.

By using these endpoints and GraphQL schema, you can efficiently manage user authentication and
authorization in your application.

## User Service

To integrate the user service seamlessly into your application, you need to implement a version of
the user service. This will help you maintain the user table within your application's scope while
leveraging the capabilities of this library. Below is a detailed guide and sample implementation to
help you get started.

### Sample Implementation

Here is a sample implementation of the user service using NestJS and the Hypergraph library.

#### Step-by-Step Implementation

1. **Import Necessary Modules:** Start by importing the required modules and classes from the
   Hypergraph library and NestJS.

2. **Define the UserService Class:** Create a class UserService that implements the UserServiceSpec
   interface. This class will contain methods to handle user-related operations.

3. **Find User by ID:** Implement a method findById to find a user by their ID and return their
   authentication information.

4. **Find User by Identifier:** Implement a method `findByIdentifier` to locate a user based on
   their email identifier. The identifier serves as the primary unique information for tracking
   users. This could be an email address, phone number, or a unique username.
5. **Create a New User:** Implement a method createUser to create a new user in the database. This
   method takes user metadata as input and returns the authentication information of the newly
   created user.

```ts
import { generateIdOf } from '@hgraph/storage'
import { InjectRepo, Repository } from '@hgraph/storage/nestjs'
import { Injectable } from '@nestjs/common'
import { UserServiceSpec } from '@hgraph/auth'
import { AuthInfo, UserMetadata } from '@hgraph/auth'
import { User, UserStatus } from './user.model'

@Injectable()
export class UserService implements UserServiceSpec {
  constructor(@InjectRepo(User) protected readonly userRepository: Repository<User>) {}

  protected toAuthInfo(user: User | undefined): AuthInfo | undefined {
    if (!user) return
    return {
      userId: user.id,
      identifier: user.email,
      roles: user.roles,
    }
  }

  protected generateId(identifier: string) {
    return generateIdOf('email:' + identifier?.toLocaleLowerCase().trim())
  }

  async findById(id: string): Promise<AuthInfo> {
    return this.toAuthInfo(await this.userRepository.findById(id))
  }

  async findByIdentifier(identifier: string): Promise<AuthInfo> {
    const user = await this.userRepository.findOne(q => q.whereEqualTo('email', identifier))
    return this.toAuthInfo(user)
  }

  async createUser(input: UserMetadata): Promise<AuthInfo> {
    const id = this.generateId(input.identifier)
    const user = await this.userRepository.insert({
      id,
      name: input.name,
      email: input.identifier,
      phoneNumber: input.phoneNumber,
      pictureUrl: input.pictureUrl,
      status: UserStatus.Active,
    })
    return this.toAuthInfo(user)
  }
}
```
