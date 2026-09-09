import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AttachmentDocument = Attachment & Document;

@Schema({ timestamps: true })
export class Attachment {
  @Prop({ required: true })
  taskId: string;

  @Prop({ required: true })
  uploaderId: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  storedFileName: string;

  
  @Prop({ required: true })
  filePath: string;

  @Prop({ required: true })
  mimeType: string;

 
  @Prop({ required: true })
  size: number;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);