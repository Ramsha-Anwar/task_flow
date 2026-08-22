/**
 * @fileoverview Unit test suite for ProjectService.
 * Validates project creation, parent workspace validation, and workspace-scoped queries.
 *
 * @module test/unit/project.service.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProjectService } from '../../src/projects/project.service';
import { Project } from '../../src/projects/entity/project.entity';
import { WorkspaceService } from '../../src/workspace/workspace.service';
import { Workspace } from '../../src/workspace/entity/workspace.entity';

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepo: jest.Mocked<Repository<Project>>;
  let workspaceService: jest.Mocked<WorkspaceService>;

  /**
   * Mock instance of a parent Workspace entity.
   */
  const mockWorkspace: Workspace = {
    id: 'ws-uuid-1',
    name: 'Workspace One',
    ownerId: 'user-uuid-1',
    createdAt: new Date(),
    owner: {} as any,
    members: [],
    projects: [],
  };

  /**
   * Mock instance of a Project entity.
   */
  const mockProject: Project = {
    id: 'prj-uuid-1',
    name: 'Test Project',
    createdAt: new Date(),
    workspace: mockWorkspace,
    boards: [],
  };

  beforeEach(async () => {
    const mockProjectRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockWorkspaceService = {
      findWorkspaceById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepo,
        },
        {
          provide: WorkspaceService,
          useValue: mockWorkspaceService,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    projectRepo = module.get(getRepositoryToken(Project));
    workspaceService = module.get(WorkspaceService);
  });

  describe('findWorkspaceById', () => {
    /**
     * @test Verifies returning parent workspace when found by ID.
     */
    it('should return workspace if found', async () => {
      workspaceService.findWorkspaceById.mockResolvedValue(mockWorkspace);

      const result = await service.findWorkspaceById('ws-uuid-1');

      expect(workspaceService.findWorkspaceById).toHaveBeenCalledWith(
        'ws-uuid-1',
      );
      expect(result).toEqual(mockWorkspace);
    });

    /**
     * @test Verifies throwing NotFoundException if parent workspace does not exist.
     */
    it('should throw NotFoundException if workspace not found', async () => {
      workspaceService.findWorkspaceById.mockResolvedValue(null);

      await expect(service.findWorkspaceById('unknown-ws')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findProjectById', () => {
    /**
     * @test Verifies returning project entity when found by UUID.
     */
    it('should return project when found', async () => {
      projectRepo.findOne.mockResolvedValue(mockProject);

      const result = await service.findProjectById('prj-uuid-1');

      expect(projectRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'prj-uuid-1' },
      });
      expect(result).toEqual(mockProject);
    });

    /**
     * @test Verifies returning null when project is not found.
     */
    it('should return null when project not found', async () => {
      projectRepo.findOne.mockResolvedValue(null);

      const result = await service.findProjectById('unknown-prj');

      expect(result).toBeNull();
    });
  });

  describe('findProjectsByWorkspaceById', () => {
    /**
     * @test Verifies retrieving all projects belonging to a parent workspace.
     */
    it('should return all projects in workspace', async () => {
      workspaceService.findWorkspaceById.mockResolvedValue(mockWorkspace);
      projectRepo.find.mockResolvedValue([mockProject]);

      const result = await service.findProjectsByWorkspaceById('ws-uuid-1');

      expect(projectRepo.find).toHaveBeenCalledWith({
        where: { workspace: { id: mockWorkspace.id } },
      });
      expect(result).toEqual([mockProject]);
    });

    /**
     * @test Verifies throwing NotFoundException when querying projects for a non-existent workspace.
     */
    it('should throw NotFoundException if workspace does not exist', async () => {
      workspaceService.findWorkspaceById.mockResolvedValue(null);

      await expect(
        service.findProjectsByWorkspaceById('unknown-ws'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createProject', () => {
    /**
     * @test Verifies creating and persisting a new project linked to a verified parent workspace.
     */
    it('should create and save project under workspace', async () => {
      workspaceService.findWorkspaceById.mockResolvedValue(mockWorkspace);
      projectRepo.create.mockReturnValue(mockProject);
      projectRepo.save.mockResolvedValue(mockProject);

      const result = await service.createProject('Backend Revamp', 'ws-uuid-1');

      expect(projectRepo.create).toHaveBeenCalledWith({
        name: 'Backend Revamp',
        workspace: mockWorkspace,
      });
      expect(projectRepo.save).toHaveBeenCalledWith(mockProject);
      expect(result).toEqual(mockProject);
    });
  });
});
