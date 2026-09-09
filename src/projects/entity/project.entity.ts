import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { Board } from '../../board/entity/board.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.projects)
  workspace!: Workspace;

  @OneToMany(() => Board, (board) => board.project)
  boards!: Board[];

  @CreateDateColumn()
  createdAt!: Date;
}