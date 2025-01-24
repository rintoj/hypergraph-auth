# Entities

The following example show cases entity and repository setup.

- [User](#user)
- [Photo](#photo)
- [Album](#album)

## User

```ts
import { BaseEntity } from 'hypergraph-storage'

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

@Entity('user')
export class UserEntity extends BaseEntity {
  @Column()
  name?: string

  @Column({ nullable: true })
  email?: string

  @Column({ type: 'enum', name: 'role', enum: UserRole, nullable: true })
  role?: UserRole

  @Column({
    type: 'enum',
    name: 'roles',
    array: true,
    enum: UserRole,
    nullable: true,
  })
  roles?: UserRole[]

  @Column('text', { array: true, nullable: true })
  tags?: string[]

  @Column({ nullable: true })
  profileId?: string

  @OneToMany(() => PhotoEntity, photo => photo.user, { nullable: true })
  photos?: PhotoEntity[]
}

export class UserRepository extends Repository<UserEntity> {
  constructor() {
    super(UserEntity)
  }
}
```

## Photo

```ts
@Entity('photo')
export class PhotoEntity extends BaseEntity {
  @Column()
  url?: string

  @ManyToOne(() => UserEntity, user => user.photos)
  user?: UserEntity

  @Column({ nullable: true })
  imageDepth?: number

  @ManyToOne(() => AlbumEntity, album => album.photos, { nullable: true })
  album?: AlbumEntity
}

export class PhotoRepository extends Repository<PhotoEntity> {
  constructor() {
    super(PhotoEntity)
  }
}
```

## Album

```ts
@Entity('album')
export class AlbumEntity extends BaseEntity {
  @Column()
  name?: string

  @Column({ nullable: true })
  ownerId?: string

  @ManyToOne(() => UserEntity, user => user.albums)
  owner?: UserEntity

  @OneToMany(() => PhotoEntity, photo => photo.album, { nullable: true })
  photos?: PhotoEntity[]
}

export class AlbumRepository extends Repository<AlbumEntity> {
  constructor() {
    super(AlbumEntity)
  }
}
```
