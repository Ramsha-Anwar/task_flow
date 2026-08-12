
import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Workspace } from './entity/workspace.entity';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { User } from '../users/entities/users.entity';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}


  async createWorkspace(name: string, ownerId: string): Promise<Workspace> {
    return this.dataSource.transaction(async (manager) => {
      const workspace = manager.create(Workspace, { name, ownerId });
      const savedWorkspace = await manager.save(workspace);
      const member = manager.create(WorkspaceMember, {
        workspace: savedWorkspace,
        user: { id: ownerId } as User,
        role: 'admin',
      });
      await manager.save(member);
      return savedWorkspace;
    });
  }
  async findWorkspaceById(workspaceId: string): Promise<Workspace | null> {
    return this.workspaceRepository.findOne({
      where: { id: workspaceId },
      
    });
  }
}
