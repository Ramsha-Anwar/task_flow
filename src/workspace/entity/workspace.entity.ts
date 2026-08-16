import { Column, PrimaryGeneratedColumn, Entity, CreateDateColumn, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { WorkspaceMember } from "./workspace-member.entity";
import { Project } from "../../projects/entity/project.entity";
import { User } from "../../users/entities/users.entity";

@Entity()
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @Column()
  name!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => WorkspaceMember, (workspaceMember) => workspaceMember.workspace)
  members!: WorkspaceMember[];

  @OneToMany(() => Project, (project) => project.workspace)
  projects!: Project[];
}