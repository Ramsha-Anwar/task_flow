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

  async findTasksByColumnId(columnId: string): Promise<Task[]> {
    const column = await this.columnRepository.findOne({
      where: { id: columnId },
    });
    if (!column) {
      throw new NotFoundException('Column not found');
    }

    return this.taskRepository.find({ where: { columnId } });
  }

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