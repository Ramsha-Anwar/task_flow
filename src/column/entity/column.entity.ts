import { CreateDateColumn, Entity, PrimaryGeneratedColumn , Column, ManyToOne } from "typeorm";
import { Board } from "../../board/entity/board.entity";

@Entity('columns')
export class Columns {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column()
  position!: number;

  @ManyToOne(() => Board, (board) => board.columns)
  board!: Board;
}