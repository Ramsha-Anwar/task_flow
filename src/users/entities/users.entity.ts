import { Column, PrimaryGeneratedColumn , Entity, CreateDateColumn ,OneToMany} from "typeorm";
import { WorkspaceMember } from "../../workspace/entity/workspace-member.entity";

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

  @OneToMany(() => WorkspaceMember, (workspaceMember) => workspaceMember.user)
  memberships!: WorkspaceMember[];
}
