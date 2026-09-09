import { Column, PrimaryGeneratedColumn , Entity, CreateDateColumn,OneToMany } from "typeorm";
import {WorkspaceMember} from "./workspace-member.entity";

@Entity()
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  ownerId!: string;
  
  @Column()
  name!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => WorkspaceMember, (workspaceMember) => workspaceMember.workspace)
  members!: WorkspaceMember[];

}
