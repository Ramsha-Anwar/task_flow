import { Get, Post, Patch, Body, Controller, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { Roles } from '../workspace/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { WorkspaceRolesGuard } from '../workspace/workspace-roles.guard';

@Controller('workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId')
export class TaskController {
  constructor(private taskService: TaskService) {}

  @Get('tasks')
  async getTasksByColumnId(@Param('columnId', ParseUUIDPipe) columnId: string) {
    return this.taskService.findTasksByColumnId(columnId);
  }

  @UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
  @Roles('admin')
  @Post('tasks')
  async createTask(
    @Param('columnId', ParseUUIDPipe) columnId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.taskService.createTask(columnId, workspaceId, dto);
  }

  @UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
  @Roles('admin')
  @Patch('tasks/:taskId/move')
  async moveTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: MoveTaskDto,
  ) {
    return this.taskService.moveTask(taskId, dto);
  }
}