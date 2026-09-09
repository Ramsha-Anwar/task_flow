import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ActivityLogDocument = ActivityLog & Document;

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ required: true })
  workspaceId: string;

  @Prop({ required: true })
  actorId: string;

  @Prop({ required: true })
  action: string; // matches Events values, e.g. 'task.moved'

  @Prop({ required: true })
  entityType: string; // 'task' | 'comment' | 'attachment'

  @Prop({ required: true })
  entityId: string;

  @Prop({ required: true })
  description: string; // human-readable, e.g. "moved task 'Fix login bug' to Done"
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);