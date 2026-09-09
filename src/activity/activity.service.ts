import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActivityLog, ActivityLogDocument } from './entity/activity-log.entity';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(ActivityLog.name)
    private activityLogModel: Model<ActivityLogDocument>,
  ) {}

  async create(data: Partial<ActivityLog>) {
    return this.activityLogModel.create(data);
  }

  async findAllForWorkspace(workspaceId: string) {
    return this.activityLogModel
      .find({ workspaceId })
      .sort({ createdAt: -1 })
      .exec();
  }
}