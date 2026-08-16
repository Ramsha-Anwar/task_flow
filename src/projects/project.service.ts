import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entity/project.entity';
import { WorkspaceService } from '../workspace/workspace.service';

/**
 * Handles project creation and lookup, scoped to a parent workspace.
 */
@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private workspaceService: WorkspaceService,
  ) {}

  /**
   * Looks up a workspace by ID, throwing if it doesn't exist.
   * Used internally before creating or listing projects under it.
   * @param workspaceId - The parent workspace's UUID.
   * @returns The matching Workspace entity.
   * @throws {NotFoundException} If the workspace doesn't exist.
   */
  async findWorkspaceById(workspaceId: string) {
    const workspace = await this.workspaceService.findWorkspaceById(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  /**
   * Looks up a single project by ID.
   * @param projectId - The project's UUID.
   * @returns The matching Project entity, or null if it doesn't exist.
   */
  async findProjectById(projectId: string): Promise<Project | null> {
    return this.projectRepository.findOne({ where: { id: projectId } });
  }

  /**
   * Lists all projects belonging to a given workspace.
   * @param workspaceId - The parent workspace's UUID.
   * @returns An array of Project entities.
   * @throws {NotFoundException} If the workspace doesn't exist.
   */
  async findProjectsByWorkspaceById(workspaceId: string) {
    const workspace = await this.findWorkspaceById(workspaceId);
    const projects = await this.projectRepository.find({ where: { workspace: { id: workspace.id } } });
    return projects;
  }

  /**
   * Creates a new project under a workspace.
   * @param name - The name of the new project.
   * @param workspaceId - The parent workspace's UUID.
   * @returns The newly created Project entity.
   * @throws {NotFoundException} If the workspace doesn't exist.
   */
  async createProject(name: string, workspaceId: string) {
    const project = this.projectRepository.create({ name, workspace: await this.findWorkspaceById(workspaceId) });
    return this.projectRepository.save(project);
  }
}