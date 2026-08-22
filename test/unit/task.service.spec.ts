/**
 * @fileoverview Unit test suite for TaskService.
 * Validates task creation, assignee workspace membership verification,
 * column task queries, cross-board move constraints, and domain event emissions (TASK_CREATED, TASK_MOVED).
 *
 * @module test/unit/task.service.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskService } from '../../src/task/task.service';
import { Task } from '../../src/task/entity/task.entity';
import { Columns } from '../../src/column/entity/column.entity';
import { WorkspaceMember } from '../../src/workspace/entity/workspace-member.entity';
import { Events } from '../../src/common/event';
import { TaskPriority } from '../../src/task/entity/task-priority.enum';

describe('TaskService', () => {
  let service: TaskService;
  let taskRepo: jest.Mocked<Repository<Task>>;
  let columnRepo: jest.Mocked<Repository<Columns>>;
  let memberRepo: jest.Mocked<Repository<WorkspaceMember>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  /**
   * Mock instance of starting Column 1 on Board 1.
   */
  const mockColumn1: Columns = {
    id: 'col-uuid-1',
    name: 'To Do',
    position: 1,
    createdAt: new Date(),
    board: { id: 'brd-uuid-1' } as any,
  };

  /**
   * Mock instance of destination Column 2 on Board 1.
   */
  const mockColumn2: Columns = {
    id: 'col-uuid-2',
    name: 'Done',
    position: 2,
    createdAt: new Date(),
    board: { id: 'brd-uuid-1' } as any,
  };

  /**
   * Mock instance of a Column located on a different Board.
   */
  const mockOtherBoardColumn: Columns = {
    id: 'col-uuid-3',
    name: 'Backlog',
    position: 1,
    createdAt: new Date(),
    board: { id: 'brd-uuid-other' } as any,
  };

  /**
   * Mock instance of a Task entity.
   */
  const mockTask: Task = {
    id: 'task-uuid-1',
    title: 'Test Task',
    description: 'Task description',
    priority: TaskPriority.HIGH,
    dueDate: null,
    columnId: 'col-uuid-1',
    assigneeId: 'assignee-uuid-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    column: mockColumn1,
    assignee: {} as any,
  };

  beforeEach(async () => {
    const mockTaskRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockColumnRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockMemberRepo = {
      findOne: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepo,
        },
        {
          provide: getRepositoryToken(Columns),
          useValue: mockColumnRepo,
        },
        {
          provide: getRepositoryToken(WorkspaceMember),
          useValue: mockMemberRepo,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    taskRepo = module.get(getRepositoryToken(Task));
    columnRepo = module.get(getRepositoryToken(Columns));
    memberRepo = module.get(getRepositoryToken(WorkspaceMember));
    eventEmitter = module.get(EventEmitter2);
  });

  describe('createTask', () => {
    const createTaskDto = {
      title: 'New Task',
      description: 'Some desc',
      priority: TaskPriority.HIGH,
      assigneeId: 'assignee-uuid-1',
    };

    /**
     * @test Verifies creating a task when the column exists and assignee is a member of the workspace,
     * confirming the TASK_CREATED domain event is emitted with all expected metadata.
     */
    it('should create task and emit TASK_CREATED event', async () => {
      columnRepo.findOne.mockResolvedValue(mockColumn1);
      memberRepo.findOne.mockResolvedValue({ id: 'member-1' } as any);
      taskRepo.create.mockReturnValue(mockTask);
      taskRepo.save.mockResolvedValue(mockTask);

      const result = await service.createTask(
        'col-uuid-1',
        'ws-uuid-1',
        createTaskDto,
        'actor-uuid-1',
      );

      expect(columnRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'col-uuid-1' },
        relations: { board: true },
      });
      expect(memberRepo.findOne).toHaveBeenCalledWith({
        where: {
          workspace: { id: 'ws-uuid-1' },
          user: { id: createTaskDto.assigneeId },
        },
      });
      expect(taskRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(Events.TASK_CREATED, {
        taskId: mockTask.id,
        taskTitle: mockTask.title,
        workspaceId: 'ws-uuid-1',
        boardId: mockColumn1.board.id,
        columnId: mockTask.columnId,
        assigneeId: mockTask.assigneeId,
        actorId: 'actor-uuid-1',
      });
      expect(result).toEqual(mockTask);
    });

    /**
     * @test Verifies throwing NotFoundException if the target column does not exist.
     */
    it('should throw NotFoundException if column does not exist', async () => {
      columnRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createTask(
          'unknown-col',
          'ws-uuid-1',
          createTaskDto,
          'actor-uuid-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * @test Verifies throwing BadRequestException if assignee is not a member of the workspace.
     */
    it('should throw BadRequestException if assignee is not a member', async () => {
      columnRepo.findOne.mockResolvedValue(mockColumn1);
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createTask(
          'col-uuid-1',
          'ws-uuid-1',
          createTaskDto,
          'actor-uuid-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findTasksByColumnId', () => {
    /**
     * @test Verifies retrieving all tasks belonging to a specified column ID.
     */
    it('should return tasks for column', async () => {
      columnRepo.findOne.mockResolvedValue(mockColumn1);
      taskRepo.find.mockResolvedValue([mockTask]);

      const result = await service.findTasksByColumnId('col-uuid-1');

      expect(taskRepo.find).toHaveBeenCalledWith({
        where: { columnId: 'col-uuid-1' },
      });
      expect(result).toEqual([mockTask]);
    });

    /**
     * @test Verifies throwing NotFoundException when column is not found.
     */
    it('should throw NotFoundException if column does not exist', async () => {
      columnRepo.findOne.mockResolvedValue(null);

      await expect(service.findTasksByColumnId('unknown-col')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('moveTask', () => {
    /**
     * @test Verifies successfully moving a task between columns on the same board
     * and emitting the TASK_MOVED domain event.
     */
    it('should move task to target column on same board and emit TASK_MOVED', async () => {
      taskRepo.findOne.mockResolvedValue({ ...mockTask });
      columnRepo.findOne
        .mockResolvedValueOnce(mockColumn1)
        .mockResolvedValueOnce(mockColumn2);
      taskRepo.save.mockImplementation(async (t: any) => t);

      const result = await service.moveTask(
        'task-uuid-1',
        'ws-uuid-1',
        { targetColumnId: 'col-uuid-2' },
        'actor-uuid-1',
      );

      expect(result.columnId).toBe('col-uuid-2');
      expect(eventEmitter.emit).toHaveBeenCalledWith(Events.TASK_MOVED, {
        taskId: mockTask.id,
        taskTitle: mockTask.title,
        workspaceId: 'ws-uuid-1',
        boardId: mockColumn2.board.id,
        fromColumnId: 'col-uuid-1',
        toColumnId: 'col-uuid-2',
        assigneeId: mockTask.assigneeId,
        actorId: 'actor-uuid-1',
      });
    });

    /**
     * @test Verifies throwing NotFoundException when moving a non-existent task.
     */
    it('should throw NotFoundException if task not found', async () => {
      taskRepo.findOne.mockResolvedValue(null);

      await expect(
        service.moveTask(
          'unknown-task',
          'ws-uuid-1',
          { targetColumnId: 'col-uuid-2' },
          'actor-uuid-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * @test Verifies that moving a task to a column on a different board is forbidden.
     */
    it('should throw ForbiddenException for cross-board move', async () => {
      taskRepo.findOne.mockResolvedValue({ ...mockTask });
      columnRepo.findOne
        .mockResolvedValueOnce(mockColumn1)
        .mockResolvedValueOnce(mockOtherBoardColumn);

      await expect(
        service.moveTask(
          'task-uuid-1',
          'ws-uuid-1',
          { targetColumnId: 'col-uuid-3' },
          'actor-uuid-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
