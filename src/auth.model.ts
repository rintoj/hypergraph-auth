import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity()
export class AuthMetadata {
  @PrimaryColumn()
  id!: string

  @Column()
  identifier!: string

  @Column()
  provider!: string

  @Column()
  userId!: string

  @Column({ nullable: true })
  passwordHash?: string

  @Column({ nullable: true })
  authCode?: string

  @Column({ nullable: true })
  authCodeExpiresAt?: Date

  @Column({ nullable: true })
  lastSigninAt?: Date

  @Column({ nullable: true })
  refreshTokenHash?: string

  @Column()
  createdAt!: Date

  @Column({ nullable: true })
  updatedAt?: Date
}

export interface AuthInfo {
  userId: string
  identifier: string
  roles: string[]
}

export interface UserMetadata {
  identifier: string
  provider: string
  providerId: string
  name?: string
  email?: string
  phoneNumber?: string
  pictureUrl?: string
}

export interface Credentials {
  password?: string
  refreshToken?: string
}
