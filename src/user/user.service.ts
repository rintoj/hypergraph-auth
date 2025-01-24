import { generateIdOf } from '@hgraph/storage'
import { InjectRepo, Repository } from '@hgraph/storage/nestjs'
import { Injectable } from '@nestjs/common'
import { UserServiceSpec } from '../auth.config'
import { AuthInfo, UserMetadata } from '../auth.model'
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
