import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  refreshToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  refreshTokenExpiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
