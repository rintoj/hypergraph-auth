import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SignInResponse {
  @Field()
  accessToken!: string;

  @Field()
  userId!: string;
}

@ObjectType()
export class SignUpResponse {
  @Field()
  userId!: string;
}
