import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql'
import { Column, Entity, PrimaryColumn } from 'typeorm'

export enum UserRole {
  Admin = 'Admin',
  User = 'User',
}
registerEnumType(UserRole, { name: 'UserRole' })

export enum UserStatus {
  Active = 'Active',
  Disabled = 'Disabled',
}
registerEnumType(UserStatus, { name: 'UserStatus' })

@ObjectType()
@Entity()
export class User {
  @Field(() => ID)
  @PrimaryColumn()
  id!: string

  @Field()
  @Column({ nullable: true })
  name!: string

  @Field()
  @Column({ unique: true })
  email!: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  phoneNumber?: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  pictureUrl?: string

  @Field(() => [UserRole])
  @Column({
    type: 'enum',
    enum: UserRole,
    array: true,
    default: [UserRole.User],
    nullable: true,
  })
  roles?: UserRole[]

  @Column({ nullable: true })
  isEmailVerified?: boolean

  @Column({
    type: 'enum',
    enum: UserStatus,
    nullable: true,
  })
  status!: UserStatus

  @Field(() => Date, { nullable: true })
  @Column({ nullable: true })
  createdAt?: Date

  @Field(() => Date, { nullable: true })
  @Column({ nullable: true })
  updatedAt?: Date
}
