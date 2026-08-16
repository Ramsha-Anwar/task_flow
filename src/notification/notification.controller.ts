import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';

/**
 * Exposes routes for a user to list their own notifications and mark
 * one as read. All routes are scoped to the authenticated user via req.user.id.
 */
@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  /**
   * Lists all notifications for the authenticated user, newest first.
   * @param req - The incoming request; req.user.id identifies the recipient.
   * @returns An array of Notification documents belonging to the caller.
   * @throws {UnauthorizedException} If no valid JWT is provided.
   */
  @Get()
  @UseGuards(AuthGuard('jwt'))
  findMine(@Req() req) {
    return this.notificationService.findAllForUser(req.user.id);
  }

  /**
   * Marks a single notification as read.
   * @param notificationId - The notification's Mongo ObjectId (as a string).
   * @param req - The incoming request; req.user.id must match the notification's recipient.
   * @returns The updated Notification document.
   * @throws {UnauthorizedException} If no valid JWT is provided.
   * @throws {NotFoundException} If no notification with that ID exists (including malformed IDs).
   * @throws {ForbiddenException} If the notification belongs to a different user.
   */
  @Patch(':notificationId/read')
  @UseGuards(AuthGuard('jwt'))
  markAsRead(@Param('notificationId') notificationId: string, @Req() req) {
    return this.notificationService.markAsRead(notificationId, req.user.id);
  }
}