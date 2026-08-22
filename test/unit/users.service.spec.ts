/**
 * @fileoverview Unit test suite for UsersService.
 * Isolates TypeORM User entity repository queries and user registration persistence.
 *
 * @module test/unit/users.service.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../../src/users/users.service';
import { User } from '../../src/users/entities/users.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  /**
   * Mock instance of a User entity.
   */
  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    createdAt: new Date(),
    memberships: [],
  };

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  describe('checkExistingUser', () => {
    /**
     * @test Verifies that searching by an existing email returns the corresponding User entity.
     */
    it('should return a user entity when email exists', async () => {
      repo.findOne.mockResolvedValue(mockUser);

      const result = await service.checkExistingUser('test@example.com');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    /**
     * @test Verifies that searching by a non-existent email returns null.
     */
    it('should return null when user does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.checkExistingUser('nonexistent@example.com');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    /**
     * @test Verifies creating and persisting a new User entity.
     */
    it('should create and save a new user', async () => {
      const payload: Partial<User> = {
        email: 'new@example.com',
        name: 'New User',
        password: 'hashed-password-123',
      };

      repo.create.mockReturnValue(mockUser);
      repo.save.mockResolvedValue(mockUser);

      const result = await service.createUser(payload);

      expect(repo.create).toHaveBeenCalledWith(payload);
      expect(repo.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findOneById', () => {
    /**
     * @test Verifies returning a user entity when found by UUID.
     */
    it('should return user when found by ID', async () => {
      repo.findOne.mockResolvedValue(mockUser);

      const result = await service.findOneById('user-uuid-1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
      });
      expect(result).toEqual(mockUser);
    });

    /**
     * @test Verifies returning null when user UUID does not exist.
     */
    it('should return null when user is not found by ID', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findOneById('unknown-id');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'unknown-id' },
      });
      expect(result).toBeNull();
    });
  });
});
