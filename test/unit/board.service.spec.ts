/**
 * @fileoverview Unit test suite for BoardService.
 * Validates Board persistence, project association validation, and project-scoped board queries.
 *
 * @module test/unit/board.service.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { BoardService } from '../../src/board/board.service';
import { Board } from '../../src/board/entity/board.entity';
import { ProjectService } from '../../src/projects/project.service';
import { Project } from '../../src/projects/entity/project.entity';

describe('BoardService', () => {
  let service: BoardService;
  let boardRepo: jest.Mocked<Repository<Board>>;
  let projectService: jest.Mocked<ProjectService>;

  /**
   * Mock instance of a parent Project entity.
   */
  const mockProject: Project = {
    id: 'prj-uuid-1',
    name: 'Project One',
    createdAt: new Date(),
    workspace: {} as any,
    boards: [],
  };

  /**
   * Mock instance of a Board entity.
   */
  const mockBoard: Board = {
    id: 'brd-uuid-1',
    name: 'Kanban Board',
    createdAt: new Date(),
    project: mockProject,
    columns: [],
  };

  beforeEach(async () => {
    const mockBoardRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockProjectService = {
      findProjectById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardService,
        {
          provide: getRepositoryToken(Board),
          useValue: mockBoardRepo,
        },
        {
          provide: ProjectService,
          useValue: mockProjectService,
        },
      ],
    }).compile();

    service = module.get<BoardService>(BoardService);
    boardRepo = module.get(getRepositoryToken(Board));
    projectService = module.get(ProjectService);
  });

  describe('findProjectById', () => {
    /**
     * @test Verifies returning the parent Project entity when it exists.
     */
    it('should return project if found', async () => {
      projectService.findProjectById.mockResolvedValue(mockProject);

      const result = await service.findProjectById('prj-uuid-1');

      expect(projectService.findProjectById).toHaveBeenCalledWith('prj-uuid-1');
      expect(result).toEqual(mockProject);
    });

    /**
     * @test Verifies throwing NotFoundException when the specified parent project cannot be found.
     */
    it('should throw NotFoundException if project not found', async () => {
      projectService.findProjectById.mockResolvedValue(null);

      await expect(service.findProjectById('unknown-prj')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBoardById', () => {
    /**
     * @test Verifies retrieving a single board entity by UUID.
     */
    it('should return board when found', async () => {
      boardRepo.findOne.mockResolvedValue(mockBoard);

      const result = await service.findBoardById('brd-uuid-1');

      expect(boardRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'brd-uuid-1' },
      });
      expect(result).toEqual(mockBoard);
    });

    /**
     * @test Verifies returning null when a board UUID does not exist.
     */
    it('should return null when board not found', async () => {
      boardRepo.findOne.mockResolvedValue(null);

      const result = await service.findBoardById('unknown-brd');

      expect(result).toBeNull();
    });
  });

  describe('findBoardsByProjectId', () => {
    /**
     * @test Verifies listing all boards belonging to a specified project ID.
     */
    it('should return list of boards for project', async () => {
      projectService.findProjectById.mockResolvedValue(mockProject);
      boardRepo.find.mockResolvedValue([mockBoard]);

      const result = await service.findBoardsByProjectId('prj-uuid-1');

      expect(boardRepo.find).toHaveBeenCalledWith({
        where: { project: { id: mockProject.id } },
      });
      expect(result).toEqual([mockBoard]);
    });
  });

  describe('createBoard', () => {
    /**
     * @test Verifies creating and persisting a new Board under an existing Project.
     */
    it('should create and save board under project', async () => {
      projectService.findProjectById.mockResolvedValue(mockProject);
      boardRepo.create.mockReturnValue(mockBoard);
      boardRepo.save.mockResolvedValue(mockBoard);

      const result = await service.createBoard('Sprint Board', 'prj-uuid-1');

      expect(boardRepo.create).toHaveBeenCalledWith({
        name: 'Sprint Board',
        project: mockProject,
      });
      expect(boardRepo.save).toHaveBeenCalledWith(mockBoard);
      expect(result).toEqual(mockBoard);
    });
  });
});
