import { createRepository, StorageModule } from '@hgraph/storage/nestjs'
import { Global, Module } from '@nestjs/common'
import { User } from './user.model'
import { UserResolver } from './user.resolver'
import { UserService } from './user.service'

@Global()
@Module({
  imports: [StorageModule.forFeature([User])],
  providers: [UserService, UserResolver, createRepository(User)],
  exports: [UserService, createRepository(User)],
})
export class UserModule {}
