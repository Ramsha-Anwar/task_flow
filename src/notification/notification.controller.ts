import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findMine(@Req() req) {
    return this.notificationService.findAllForUser(req.user.id);
  }

  @Patch(':notificationId/read')
  @UseGuards(AuthGuard('jwt'))
  markAsRead(@Param('notificationId') notificationId: string, @Req() req) {
    return this.notificationService.markAsRead(notificationId, req.user.id);
  }
}