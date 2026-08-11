import { Column, PrimaryGeneratedColumn , Entity, CreateDateColumn } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column()
  password!: string;
  
  @CreateDateColumn()
  createdAt!: Date;
}
