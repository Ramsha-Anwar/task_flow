import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entity/project.entity';
import { WorkspaceService } from '../workspace/workspace.service';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private workspaceService: WorkspaceService,
  ) {}

  async findWorkspaceById(workspaceId: string) {
    const workspace = await this.workspaceService.findWorkspaceById(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async findProjectById(projectId: string): Promise<Project | null> {
    return this.projectRepository.findOne({ where: { id: projectId } });
  }

  async findProjectsByWorkspaceById(workspaceId: string) {
    const workspace = await this.findWorkspaceById(workspaceId);
    const projects = await this.projectRepository.find({ where: { workspace: { id: workspace.id } } });
    return projects;
  }

  async createProject(name: string, workspaceId: string) {
    const project = this.projectRepository.create({ name, workspace: await this.findWorkspaceById(workspaceId) });
    return this.projectRepository.save(project);
  }
}