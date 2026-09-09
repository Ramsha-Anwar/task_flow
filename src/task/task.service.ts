import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Task } from './entity/task.entity';
import { Columns } from '../column/entity/column.entity';
import { WorkspaceMember } from '../workspace/entity/workspace-member.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { Events } from '../common/event';

/**
 * Handles task creation, lookup, and moving tasks between columns.
 * Emits events on create/move so Notification and ActivityLog listeners
 * (see PR 5) can react without this service knowing they exist.
 */
@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Columns)
    private readonly columnRepository: Repository<Columns>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a new task in the given column, assigned to a workspace member.
   * Emits a TASK_CREATED event after saving.
   * @param columnId - The column this task belongs to.
   * @param workspaceId - The workspace this task belongs to (needed for the event payload).
   * @param dto - Task details: title, description, priority, dueDate, assigneeId.
   * @param actorId - The ID of the user creating the task (the event's actor).
   * @returns The newly created Task entity.
   * @throws {NotFoundException} If the column doesn't exist.
   * @throws {BadRequestException} If the assignee isn't a member of this workspace.
   */
  async createTask(
    columnId: string,
    workspaceId: string,
    dto: CreateTaskDto,
    actorId: string,
  ): Promise<Task> {
    const column = await this.columnRepository.findOne({
      where: { id: columnId },
      relations: { board: true },
    });
    if (!column) {
      throw new NotFoundException('Column not found');
    }

    // filter through relations since WorkspaceMember has no flat FK columns
    const isMember = await this.workspaceMemberRepository.findOne({
      where: {
        workspace: { id: workspaceId },
        user: { id: dto.assigneeId },
      },
    });
    if (!isMember) {
      throw new BadRequestException(
        'Assignee must be a member of this workspace',
      );
    }

    const task = this.taskRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      priority: dto.priority,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      columnId: column.id,
      assigneeId: dto.assigneeId,
    });

    const savedTask = await this.taskRepository.save(task);

    this.eventEmitter.emit(Events.TASK_CREATED, {
      taskId: savedTask.id,
      taskTitle: savedTask.title,
      workspaceId,
      boardId: column.board.id,
      columnId: savedTask.columnId,
      assigneeId: savedTask.assigneeId,
      actorId,
    });

    return savedTask;
  }

  /**
   * Lists all tasks in a given column.
   * @param columnId - The column's UUID.
   * @returns An array of Task entities.
   * @throws {NotFoundException} If the column doesn't exist.
   */
  async findTasksByColumnId(columnId: string): Promise<Task[]> {
    const column = await this.columnRepository.findOne({
      where: { id: columnId },
    });
    if (!column) {
      throw new NotFoundException('Column not found');
    }

    return this.taskRepository.find({ where: { columnId } });
  }

  /**
   * Moves a task to a different column, as long as the target column
   * is on the same board. Emits a TASK_MOVED event after saving.
   * @param taskId - The task to move.
   * @param workspaceId - The workspace this task belongs to (needed for the event payload).
   * @param dto - Contains the targetColumnId to move the task into.
   * @param actorId - The ID of the user moving the task (the event's actor).
   * @returns The updated Task entity.
   * @throws {NotFoundException} If the task, current column, or target column doesn't exist.
   * @throws {ForbiddenException} If the target column is on a different board.
   */
  async moveTask(
    taskId: string,
    workspaceId: string,
    dto: MoveTaskDto,
    actorId: string,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const fromColumnId = task.columnId;

    const currentColumn = await this.columnRepository.findOne({
      where: { id: task.columnId },
      relations: { board: true },
    });
    const targetColumn = await this.columnRepository.findOne({
      where: { id: dto.targetColumnId },
      relations: { board: true },
    });

    if (!currentColumn) {
      throw new NotFoundException('Current column not found');
    }
    if (!targetColumn) {
      throw new NotFoundException('Target column not found');
    }

    // cross-board moves not supported yet
    if (currentColumn.board.id !== targetColumn.board.id) {
      throw new ForbiddenException(
        'Cannot move a task to a column on a different board',
      );
    }

    task.columnId = targetColumn.id;
    const savedTask = await this.taskRepository.save(task);

    this.eventEmitter.emit(Events.TASK_MOVED, {
      taskId: savedTask.id,
      taskTitle: savedTask.title,
      workspaceId,
      boardId: targetColumn.board.id,
      fromColumnId,
      toColumnId: savedTask.columnId,
      assigneeId: savedTask.assigneeId,
      actorId,
    });

    return savedTask;
  }
}