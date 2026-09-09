import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Columns } from './entity/column.entity';
import { BoardService } from '../board/board.service';

/**
 * Handles column creation and lookup, scoped to a parent board.
 */
@Injectable()
export class ColumnService {
  constructor(
    @InjectRepository(Columns)
    private columnRepository: Repository<Columns>,
    private boardService: BoardService,
  ) {}

  /**
   * Looks up a board by ID, throwing if it doesn't exist.
   * Used internally before creating or listing columns under it.
   * @param boardId - The parent board's UUID.
   * @returns The matching Board entity.
   * @throws {NotFoundException} If the board doesn't exist.
   */
  async findBoardById(boardId: string) {
    const board = await this.boardService.findBoardById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    return board;
  }

  /**
   * Lists all columns belonging to a given board.
   * @param boardId - The parent board's UUID.
   * @returns An array of Columns entities.
   * @throws {NotFoundException} If the board doesn't exist.
   */
  async findColumnsByBoardId(boardId: string) {
    const board = await this.findBoardById(boardId);
    const columns = await this.columnRepository.find({ where: { board: { id: board.id } } });
    return columns;
  }

  /**
   * Creates a new column under a board.
   * @param name - The name of the new column.
   * @param position - The column's display order on the board.
   * @param boardId - The parent board's UUID.
   * @returns The newly created Columns entity.
   * @throws {NotFoundException} If the board doesn't exist.
   */
  async createColumn(name: string, position: number, boardId: string) {
    const column = this.columnRepository.create({
      name,
      position,
      board: await this.findBoardById(boardId),
    });
    return this.columnRepository.save(column);
  }
}