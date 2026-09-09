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

/**
 * Exposes routes for listing, uploading, and downloading attachments on a task.
 */
@Controller('workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks/:taskId/attachments')
export class AttachmentController {
  constructor(private attachmentService: AttachmentService) {}

  /**
   * Lists all attachments on the given task, oldest first. Open route, no auth required.
   * @param taskId - The parent task's UUID.
   * @returns An array of Attachment documents.
   */
  @Get()
  async getAttachments(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.attachmentService.findAttachmentsByTaskId(taskId);
  }

  /**
   * Uploads a new file attachment to the given task. Any workspace member or admin may upload.
   * @param taskId - The parent task's UUID.
   * @param workspaceId - The parent workspace's UUID.
   * @param file - The uploaded file, populated by FileInterceptor/Multer.
   * @param req - The incoming request; req.user.id identifies the uploader (event actor).
   * @returns The newly created Attachment document.
   * @throws {UnauthorizedException} If no valid JWT is provided.
   * @throws {ForbiddenException} If the user isn't a member of the workspace.
   * @throws {NotFoundException} If no file was uploaded, or the task doesn't exist.
   */
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

  /**
   * Streams the given attachment's file back to the client as a download.
   * Open route, no auth required.
   * @param attachmentId - The attachment's Mongo ObjectId (as a string).
   * @param res - The raw Express response, used to trigger the file download.
   * @throws {NotFoundException} If no attachment with that ID exists.
   */
  @Get(':attachmentId/download')
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const attachment = await this.attachmentService.findAttachmentById(attachmentId);
    res.download(attachment.filePath, attachment.originalName);
  }
}