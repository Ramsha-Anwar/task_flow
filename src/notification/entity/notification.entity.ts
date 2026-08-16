import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  recipientId: string; // Postgres User id

  @Prop({ required: true })
  actorId: string; // who triggered it

  @Prop({ required: true })
  workspaceId: string;

  @Prop({ required: true })
  taskId: string;

  @Prop({ required: true, enum: ['TASK_ASSIGNED', 'TASK_MOVED', 'COMMENT_ADDED', 'ATTACHMENT_ADDED'] })
  type: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);