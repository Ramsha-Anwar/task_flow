/**
 * @fileoverview Unit test suite for WorkspaceService.
 * Validates transactional creation, single/multi workspace lookups,
 * and workspace membership management (including duplicate prevention).
 *
 * @module test/unit/workspace.service.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkspaceService } from '../../src/workspace/workspace.service';
import { Workspace } from '../../src/workspace/entity/workspace.entity';
import { WorkspaceMember } from '../../src/workspace/entity/workspace-member.entity';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let workspaceRepo: jest.Mocked<Repository<Workspace>>;
  let memberRepo: jest.Mocked<Repository<WorkspaceMember>>;
  let dataSource: jest.Mocked<DataSource>;

  /**
   * Mock instance of a Workspace entity.
   */
  const mockWorkspace: Workspace = {
    id: 'ws-uuid-1',
    name: 'Test Workspace',
    ownerId: 'user-uuid-1',
    createdAt: new Date(),
    owner: {} as any,
    members: [],
    projects: [],
  };

  /**
   * Mock instance of a WorkspaceMember entity.
   */
  const mockMember: WorkspaceMember = {
    id: 'member-uuid-1',
    role: 'admin',
    createdAt: new Date(),
    workspace: mockWorkspace,
    user: { id: 'user-uuid-1' } as any,
  };

  beforeEach(async () => {
    const mockWorkspaceRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockMemberRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        {
          provide: getRepositoryToken(Workspace),
          useValue: mockWorkspaceRepo,
        },
        {
          provide: getRepositoryToken(WorkspaceMember),
          useValue: mockMemberRepo,
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
    workspaceRepo = module.get(getRepositoryToken(Workspace));
    memberRepo = module.get(getRepositoryToken(WorkspaceMember));
    dataSource = module.get(getDataSourceToken());
  });

  describe('createWorkspace', () => {
    /**
     * @test Verifies that creating a workspace executes within an atomic database transaction.
     * Both the Workspace entity and the creator's initial admin WorkspaceMember entity
     * must be saved together to prevent orphaned workspaces.
     */
    it('should create workspace and admin member inside a transaction', async () => {
      dataSource.transaction.mockImplementation(async (callback: any) => {
        const fakeManager = {
          create: jest.fn((entity, data) => data),
          save: jest.fn((data) => Promise.resolve({ id: 'ws-uuid-1', ...data })),
        };
        return callback(fakeManager);
      });

      const result = await service.createWorkspace('Acme Corp', 'user-uuid-1');

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'ws-uuid-1');
      expect(result.name).toBe('Acme Corp');
    });
  });

  describe('findWorkspaceById', () => {
    /**
     * @test Verifies that searching by an existing workspace UUID returns the matching Workspace entity.
     */
    it('should return workspace by ID', async () => {
      workspaceRepo.findOne.mockResolvedValue(mockWorkspace);

      const result = await service.findWorkspaceById('ws-uuid-1');

      expect(workspaceRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'ws-uuid-1' },
      });
      expect(result).toEqual(mockWorkspace);
    });

    /**
     * @test Verifies that searching by a non-existent UUID returns null.
     */
    it('should return null if workspace is not found', async () => {
      workspaceRepo.findOne.mockResolvedValue(null);

      const result = await service.findWorkspaceById('unknown-id');

      expect(result).toBeNull();
    });
  });

  describe('findWorkspacesByUserId', () => {
    /**
     * @test Verifies that all workspaces associated with a given user ID via WorkspaceMember
     * relations are retrieved and properly mapped to an array of Workspaces.
     */
    it('should return list of workspaces for user', async () => {
      memberRepo.find.mockResolvedValue([mockMember]);

      const result = await service.findWorkspacesByUserId('user-uuid-1');

      expect(memberRepo.find).toHaveBeenCalledWith({
        where: { user: { id: 'user-uuid-1' } },
        relations: { workspace: true },
      });
      expect(result).toEqual([mockWorkspace]);
    });
  });

  describe('addMember', () => {
    /**
     * @test Verifies adding a new member to an existing workspace when the user
     * is not currently a member.
     */
    it('should add a new member successfully', async () => {
      workspaceRepo.findOne.mockResolvedValue(mockWorkspace);
      memberRepo.findOne.mockResolvedValue(null);
      memberRepo.create.mockReturnValue(mockMember);
      memberRepo.save.mockResolvedValue(mockMember);

      const result = await service.addMember('ws-uuid-1', {
        userId: 'new-user-id',
        role: 'member',
      });

      expect(workspaceRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'ws-uuid-1' },
      });
      expect(memberRepo.findOne).toHaveBeenCalledWith({
        where: { workspace: { id: 'ws-uuid-1' }, user: { id: 'new-user-id' } },
      });
      expect(memberRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockMember);
    });

    /**
     * @test Verifies that attempting to add a member to a non-existent workspace throws a NotFoundException.
     */
    it('should throw NotFoundException if workspace does not exist', async () => {
      workspaceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addMember('unknown-ws', {
          userId: 'user-id',
          role: 'member',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * @test Verifies that attempting to add a user who is already a member throws a BadRequestException.
     */
    it('should throw BadRequestException if user is already a member', async () => {
      workspaceRepo.findOne.mockResolvedValue(mockWorkspace);
      memberRepo.findOne.mockResolvedValue(mockMember);

      await expect(
        service.addMember('ws-uuid-1', {
          userId: 'user-uuid-1',
          role: 'member',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
