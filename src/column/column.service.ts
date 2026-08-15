import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Columns } from './entity/column.entity';
import { BoardService } from '../board/board.service';

@Injectable()
export class ColumnService {
  constructor(
    @InjectRepository(Columns)
    private columnRepository: Repository<Columns>,
    private boardService: BoardService,
  ) {}

  async findBoardById(boardId: string) {
    const board = await this.boardService.findBoardById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    return board;
  }

  async findColumnsByBoardId(boardId: string) {
    const board = await this.findBoardById(boardId);
    const columns = await this.columnRepository.find({ where: { board: { id: board.id } } });
    return columns;
  }

  async createColumn(name: string, position: number, boardId: string) {
    const column = this.columnRepository.create({
      name,
      position,
      board: await this.findBoardById(boardId),
    });
    return this.columnRepository.save(column);
  }
}