import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class SigninResponse {
  @Field()
  accessToken!: string

  @Field()
  userId!: string
}

@ObjectType()
export class SignupResponse {
  @Field()
  userId!: string
}
