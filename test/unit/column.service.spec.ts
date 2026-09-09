/**
 * @fileoverview Unit test suite for ColumnService.
 * Validates Column persistence, position ordering, and board association validation.
 *
 * @module test/unit/column.service.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ColumnService } from '../../src/column/column.service';
import { Columns } from '../../src/column/entity/column.entity';
import { BoardService } from '../../src/board/board.service';
import { Board } from '../../src/board/entity/board.entity';

describe('ColumnService', () => {
  let service: ColumnService;
  let columnRepo: jest.Mocked<Repository<Columns>>;
  let boardService: jest.Mocked<BoardService>;

  /**
   * Mock instance of a parent Board entity.
   */
  const mockBoard: Board = {
    id: 'brd-uuid-1',
    name: 'Kanban Board',
    createdAt: new Date(),
    project: {} as any,
    columns: [],
  };

  /**
   * Mock instance of a Columns entity.
   */
  const mockColumn: Columns = {
    id: 'col-uuid-1',
    name: 'To Do',
    position: 1,
    createdAt: new Date(),
    board: mockBoard,
  };

  beforeEach(async () => {
    const mockColumnRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockBoardService = {
      findBoardById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColumnService,
        {
          provide: getRepositoryToken(Columns),
          useValue: mockColumnRepo,
        },
        {
          provide: BoardService,
          useValue: mockBoardService,
        },
      ],
    }).compile();

    service = module.get<ColumnService>(ColumnService);
    columnRepo = module.get(getRepositoryToken(Columns));
    boardService = module.get(BoardService);
  });

  describe('findBoardById', () => {
    /**
     * @test Verifies returning parent Board entity if found by ID.
     */
    it('should return board if found', async () => {
      boardService.findBoardById.mockResolvedValue(mockBoard);

      const result = await service.findBoardById('brd-uuid-1');

      expect(boardService.findBoardById).toHaveBeenCalledWith('brd-uuid-1');
      expect(result).toEqual(mockBoard);
    });

    /**
     * @test Verifies throwing NotFoundException if parent board is not found.
     */
    it('should throw NotFoundException if board not found', async () => {
      boardService.findBoardById.mockResolvedValue(null);

      await expect(service.findBoardById('unknown-brd')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findColumnsByBoardId', () => {
    /**
     * @test Verifies listing all columns for a given board ID.
     */
    it('should return list of columns for board', async () => {
      boardService.findBoardById.mockResolvedValue(mockBoard);
      columnRepo.find.mockResolvedValue([mockColumn]);

      const result = await service.findColumnsByBoardId('brd-uuid-1');

      expect(columnRepo.find).toHaveBeenCalledWith({
        where: { board: { id: mockBoard.id } },
      });
      expect(result).toEqual([mockColumn]);
    });
  });

  describe('createColumn', () => {
    /**
     * @test Verifies creating and persisting a new column under a board.
     */
    it('should create and save column under board', async () => {
      boardService.findBoardById.mockResolvedValue(mockBoard);
      columnRepo.create.mockReturnValue(mockColumn);
      columnRepo.save.mockResolvedValue(mockColumn);

      const result = await service.createColumn('To Do', 1, 'brd-uuid-1');

      expect(columnRepo.create).toHaveBeenCalledWith({
        name: 'To Do',
        position: 1,
        board: mockBoard,
      });
      expect(columnRepo.save).toHaveBeenCalledWith(mockColumn);
      expect(result).toEqual(mockColumn);
    });
  });
});
