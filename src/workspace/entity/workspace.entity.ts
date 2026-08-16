import { Column, PrimaryGeneratedColumn , Entity, CreateDateColumn,OneToMany } from "typeorm";
import {WorkspaceMember} from "./workspace-member.entity";
import { Project } from "../../projects/entity/project.entity";

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

  @OneToMany(() => Project, (project) => project.workspace)
  projects!: Project[];
}
