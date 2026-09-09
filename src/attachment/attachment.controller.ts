import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AttachmentService } from './attachment.service';
import { WorkspaceRolesGuard } from '../workspace/workspace-roles.guard';
import { multerConfig } from './multer.config';
import { Roles } from '../workspace/roles.decorator';

@Controller('workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks/:taskId/attachments')
export class AttachmentController {
  constructor(private attachmentService: AttachmentService) {}

  @Get()
  async getAttachments(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.attachmentService.findAttachmentsByTaskId(taskId);
  }

  @UseGuards(AuthGuard('jwt'), WorkspaceRolesGuard)
  @Roles('admin', 'member')
  @Post()
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadAttachment(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    if (!file) {
      throw new NotFoundException('No file uploaded');
    }
    return this.attachmentService.createAttachment(taskId, workspaceId, req.user.id, file);
  }

  @Get(':attachmentId/download')
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const attachment = await this.attachmentService.findAttachmentById(attachmentId);
    res.download(attachment.filePath, attachment.originalName);
  }
}