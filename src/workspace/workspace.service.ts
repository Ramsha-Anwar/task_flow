import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Workspace } from './entity/workspace.entity';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { User } from '../users/entities/users.entity';

/**
 * Handles workspace creation, lookup, and membership management.
 */
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

  /**
   * Creates a new workspace and adds its creator as an admin member.
   * Runs both inserts in a single transaction — if either fails, both roll back,
   * so a workspace can never exist without its owner also being a member.
   * @param name - The name of the new workspace.
   * @param ownerId - The ID of the user creating the workspace (becomes its first admin).
   * @returns The newly created Workspace entity.
   */
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

  /**
   * Looks up a single workspace by ID.
   * @param workspaceId - The workspace's UUID.
   * @returns The matching Workspace entity, or null if it doesn't exist.
   */
  async findWorkspaceById(workspaceId: string): Promise<Workspace | null> {
    return this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });
  }

  /**
   * Lists every workspace a given user belongs to.
   * Queries through WorkspaceMember (not a direct field on Workspace),
   * since membership is the only link between a user and a workspace.
   * @param userId - The user's ID.
   * @returns An array of Workspace entities the user is a member of.
   */
  async findWorkspacesByUserId(userId: string): Promise<Workspace[]> {
    const memberships = await this.workspaceMemberRepository.find({
      where: { user: { id: userId } },
      relations: { workspace: true },
    });
    return memberships.map((membership) => membership.workspace);
  }

  /**
   * Adds a user as a member of a workspace with the given role.
   * @param workspaceId - The workspace to add the member to.
   * @param dto - Contains the userId to add and the role to assign.
   * @returns The newly created WorkspaceMember record.
   * @throws {NotFoundException} If the workspace doesn't exist.
   * @throws {BadRequestException} If the user is already a member of this workspace.
   */
  async addMember(workspaceId: string, dto: { userId: string; role: string }): Promise<WorkspaceMember> {
    const workspace = await this.workspaceRepository.findOne({ where: { id: workspaceId } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const existing = await this.workspaceMemberRepository.findOne({
      where: { workspace: { id: workspaceId }, user: { id: dto.userId } },
    });
    if (existing) {
      throw new BadRequestException('User is already a member of this workspace');
    }

    const member = this.workspaceMemberRepository.create({
      workspace: { id: workspaceId } as Workspace,
      user: { id: dto.userId } as User,
      role: dto.role,
    });

    return this.workspaceMemberRepository.save(member);
  }
}