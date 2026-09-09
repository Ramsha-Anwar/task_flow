import {PrimaryGeneratedColumn, Column, Entity, CreateDateColumn, OneToMany, ManyToOne} from "typeorm";
import { Project } from "../../projects/entity/project.entity";
import { Columns } from "../../column/entity/column.entity";

@Entity()
export class Board {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @ManyToOne(() => Project, (project) => project.boards)
  project!: Project;

  @OneToMany(() => Columns, (column) => column.board)
  columns!: Columns[];

  @CreateDateColumn()
  createdAt!: Date;

}