# Hypergraph Auth: Seamless Authentication for Your NestJS Applications (`@hgraph/auth`)

**Embark on a journey to effortless user management with Hypergraph Auth, your trusted companion for
implementing robust authentication in NestJS.** This module empowers you to swiftly integrate a wide
array of authentication providers, from social giants like Google and GitHub to a bespoke local
strategy, all within a unified and elegant framework.

## The Story of Secure Access

Imagine building a vibrant online community. Your users arrive, eager to join, but a cumbersome
registration process stands in their way. Frustration mounts, and potential members are lost. This
is where Hypergraph Auth steps in. Like a skilled concierge, it streamlines the entry process,
offering a welcoming hand to each user, regardless of their preferred sign-in method.

With Hypergraph Auth, you craft a seamless experience. Users can authenticate with their existing
social accounts, or register directly, all while you maintain control and security behind the
scenes. This library acts as your silent guardian, handling the complexities of authentication so
you can focus on building the heart of your application.

## Installation

Begin your integration journey by installing the Hypergraph Auth module using npm or yarn:

```bash
npm install @hgraph/auth
```

or

```bash
yarn add @hgraph/auth
```

## Usage

Integrating Hypergraph Auth into your NestJS application is a straightforward process. The following
example illustrates how to configure the module with both a local strategy for traditional
username/password authentication and a Supabase strategy for leveraging social logins and other
advanced features.

### Example Configuration

```typescript
import { Module } from '@nestjs/common'
import { UserModule } from './user/user.module'
import { UserService } from './user/user.service'
import { AuthModule } from '@hgraph/auth'
import { createLocalStrategy } from '@hgraph/auth/local'
import { createSupabaseAuthStrategy } from '@hgraph/auth/supabase'
import { createGoogleAuthStrategy } from '@hgraph/auth/google'

@Module({
  imports: [
    UserModule, // Your custom module to manage user data
    AuthModule.forRoot({
      userService: UserService, // Your implementation of the user service (explained below)
      strategies: [
        createLocalStrategy({
          enableGraphQLAPI: true, // Expose local auth via GraphQL
          enableRestAPI: true, // Expose local auth via REST
        }),
        createSupabaseAuthStrategy({
          supabaseUrl: config.SUPABASE_URL, // Your Supabase project URL
          supabaseAnonKey: config.SUPABASE_ANON_KEY, // Your Supabase anon key
          redirectUrl: config.AUTH_REDIRECT_URL, // URL to redirect after OAuth login
          providers: ['google', 'github', 'facebook'], // Enabled OAuth providers
        }),
        createGoogleAuthStrategy({
          clientId: config.GOOGLE_CLIENT_ID,
          clientSecret: config.GOOGLE_CLIENT_SECRET,
          redirectUrl: config.GOOGLE_REDIRECT_URL,
        }),
      ],
      jwtConfig: {
        secret: config.JWT_SECRET, // Secret key for signing JWTs
        expiry: config.JWT_EXPIRY, // Expiration time for access tokens
        refreshSecret: config.JWT_REFRESH_SECRET, // Secret for refresh tokens
        refreshExpiry: config.JWT_REFRESH_EXPIRY, // Expiration for refresh tokens
      },
    }),
  ],
  controllers: [AppController], // Your application's main controller
})
export class AppModule {}
```

**Important Note:** To effectively use the Supabase strategy, you need to configure authentication
providers within your Supabase project. Please refer to the
[Supabase Auth documentation](https://supabase.com/docs/guides/auth) for detailed instructions on
setting up providers like Google, GitHub, and Facebook.

## API Endpoints: Your Gateway to User Authentication

Hypergraph Auth provides a comprehensive suite of RESTful endpoints and a GraphQL API to manage user
authentication effectively.

### RESTful Endpoints

| Endpoint                    | Method | Description                                                                                            | Request Body                             | Response Body                                 |
| :-------------------------- | :----- | :----------------------------------------------------------------------------------------------------- | :--------------------------------------- | :-------------------------------------------- |
| `/auth/signup`              | `POST` | Registers a new user with a username and password.                                                     | `{ username: string, password: string }` | `{ userId: string }`                          |
| `/auth/signin`              | `POST` | Authenticates an existing user with a username and password.                                           | `{ username: string, password: string }` | `{ accessToken: string, userId: string }`     |
| `/auth/signout`             | `POST` | Logs out the currently authenticated user.                                                             | _None_                                   | _None_                                        |
| `/auth/supabase/{provider}` | `POST` | Initiates the Supabase authentication flow for the specified provider (e.g., `/auth/supabase/google`). | _None_                                   | _Redirects to provider's authentication page_ |
| `/auth/google`              | `GET`  | Initiates the Google authentication flow.                                                              | _None_                                   | _Redirects to Google's authentication page_   |
| `/auth/google/callback`     | `GET`  | Handles the Google authentication callback.                                                            | `{ code: string, state: string }`        | `{ code: string, provider: string }`          |
| `/auth/google/token`        | `POST` | Exchanges the Google authentication code for an access token.                                          | `{ code: string, provider: string }`     | `{ accessToken: string, userId: string }`     |
| `/auth/token`               | `POST` | Get token using OAuth Code and provider                                                                | `{ code: string, provider: string }`     | `{ accessToken: string, userId: string }`     |

### GraphQL API: Flexibility and Power

For those who prefer the expressiveness of GraphQL, Hypergraph Auth offers a complete schema to
interact with the authentication system.

#### Schema Definition

```graphql
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

#### Schema Breakdown

- **Mutations:**
  - `signupWithUsername`: Registers a new user.
  - `signinWithUsername`: Logs in an existing user.
  - `signinWithCode`: Logs in a user using OAuth code and provider.
  - `signout`: Logs out the current user.
- **Queries:**
  - `me`: Retrieves information about the currently authenticated user.
- **Types:**
  - `SigninResponse`: Represents a successful sign-in, returning an access token and user ID.
  - `SignupResponse`: Represents a successful sign-up, returning the newly created user's ID.
  - `User`: Defines the structure of a user object.
  - `UserRole`: An enumeration of possible user roles (e.g., `Admin`, `User`).

## The User Service: Bridging Authentication and Your Application

To seamlessly integrate Hypergraph Auth, you need to implement a `UserService` that conforms to the
`UserServiceSpec` interface provided by the library. This service acts as a bridge between the
authentication system and your application's user data.

### `UserServiceSpec` Interface

```typescript
import { AuthInfo, UserMetadata } from '@hgraph/auth'

interface UserServiceSpec {
  findById(id: string): Promise<AuthInfo | undefined>
  findByIdentifier(identifier: string): Promise<AuthInfo | undefined>
  createUser(user: UserMetadata): Promise<AuthInfo>
}
```

### `AuthInfo` and `UserMetadata` Types

```typescript
export type AuthInfo = {
  userId: string
  identifier: string
  roles: string[]
}

export type UserMetadata = {
  identifier: string
  name: string
  phoneNumber?: string
  pictureUrl?: string
}
```

### Sample `UserService` Implementation

Below is an example of how you might implement the `UserService` using NestJS and a hypothetical
`User` entity from a data access layer (e.g., `@hgraph/storage/nestjs`).

```typescript
import { generateIdOf } from '@hgraph/storage'
import { InjectRepo, Repository } from '@hgraph/storage/nestjs'
import { Injectable } from '@nestjs/common'
import { UserServiceSpec, AuthInfo, UserMetadata } from '@hgraph/auth'
import { User, UserStatus } from './user.model' // Your user entity

@Injectable()
export class UserService implements UserServiceSpec {
  constructor(@InjectRepo(User) protected readonly userRepository: Repository<User>) {}

  protected toAuthInfo(user: User | undefined): AuthInfo | undefined {
    if (!user) return
    return {
      userId: user.id,
      identifier: user.email, // Assuming email is the unique identifier
      roles: user.roles,
    }
  }

  protected generateId(identifier: string) {
    return generateIdOf('email:' + identifier?.toLocaleLowerCase().trim())
  }

  async findById(id: string): Promise<AuthInfo | undefined> {
    return this.toAuthInfo(await this.userRepository.findById(id))
  }

  async findByIdentifier(identifier: string): Promise<AuthInfo | undefined> {
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
      status: UserStatus.Active, // Assuming you have a UserStatus enum
      roles: ['User'], // Default role for new users
    })
    return this.toAuthInfo(user)
  }
}
```

**Explanation:**

1.  **`toAuthInfo`:** A utility method to convert your `User` entity to the `AuthInfo` type expected
    by Hypergraph Auth.
2.  **`generateId`:** A utility method to create unique IDs.
3.  **`findById`:** Retrieves a user by their ID and returns their `AuthInfo`.
4.  **`findByIdentifier`:** Retrieves a user by their unique identifier (e.g., email) and returns
    their `AuthInfo`.
5.  **`createUser`:** Creates a new user in your database and returns their `AuthInfo`.

## Conclusion

Hypergraph Auth provides a robust and flexible solution for implementing authentication in your
NestJS applications. By following the guidelines and examples in this documentation, you can quickly
integrate various authentication strategies, manage user data effectively, and focus on building the
core features of your application. Welcome to a world of seamless and secure user access!

---

**Copyright 2025 Rinto Jose**

**Released under the MIT License**
