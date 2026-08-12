import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,CreateDateColumn} from "typeorm";
import { Workspace } from "./workspace.entity";
import { User } from "../../users/entities/users.entity";

@Entity()
export class WorkspaceMember {
 @PrimaryGeneratedColumn('uuid')
 id!: string;

 @Column ()  
 role!: string;

 @CreateDateColumn()
  createdAt!: Date;

@ManyToOne(() => Workspace, (workspace) => workspace.members)
workspace!: Workspace;

@ManyToOne(() => User, (user) => user.memberships)
user!: User;
}
