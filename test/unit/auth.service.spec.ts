/**
 * @fileoverview Unit test suite for AuthService.
 * Validates registration (signup), password hashing, enumeration-safe login validation,
 * and JWT access token signing.
 *
 * @module test/unit/auth.service.spec
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { User } from '../../src/users/entities/users.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  /**
   * Mock User entity for auth test cases.
   */
  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password-123',
    createdAt: new Date(),
    memberships: [],
  };

  beforeEach(async () => {
    const mockUsersService = {
      checkExistingUser: jest.fn(),
      createUser: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    const signupDto = {
      email: 'newuser@example.com',
      name: 'New User',
      password: 'PlainPassword123!',
    };

    /**
     * @test Verifies that a valid signup hashes the password, creates the user,
     * and strips the password field from the returned payload.
     */
    it('should register a new user successfully without exposing password', async () => {
      usersService.checkExistingUser.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pass');
      usersService.createUser.mockResolvedValue({
        id: 'new-uuid',
        email: signupDto.email,
        name: signupDto.name,
        password: 'hashed-pass',
        createdAt: new Date(),
        memberships: [],
      });

      const result = await service.signUp(signupDto);

      expect(usersService.checkExistingUser).toHaveBeenCalledWith(
        signupDto.email,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(signupDto.password, 10);
      expect(usersService.createUser).toHaveBeenCalledWith({
        email: signupDto.email,
        name: signupDto.name,
        password: 'hashed-pass',
      });
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(signupDto.email);
    });

    /**
     * @test Verifies that attempting to register with an already registered email
     * immediately throws ConflictException.
     */
    it('should throw ConflictException if email is already taken', async () => {
      usersService.checkExistingUser.mockResolvedValue(mockUser);

      await expect(service.signUp(signupDto)).rejects.toThrow(
        ConflictException,
      );
      expect(usersService.createUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    /**
     * @test Verifies that correct credentials verify the bcrypt password hash
     * and return a signed JWT access token containing the user ID subject claim.
     */
    it('should return an accessToken for valid credentials', async () => {
      usersService.checkExistingUser.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('signed-jwt-token');

      const result = await service.login('test@example.com', 'ValidPass123!');

      expect(usersService.checkExistingUser).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'ValidPass123!',
        mockUser.password,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: mockUser.id });
      expect(result).toEqual({ accessToken: 'signed-jwt-token' });
    });

    /**
     * @test Verifies enumeration safety by throwing UnauthorizedException when email does not exist.
     */
    it('should throw UnauthorizedException if user does not exist', async () => {
      usersService.checkExistingUser.mockResolvedValue(null);

      await expect(
        service.login('unknown@example.com', 'Pass123!'),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    /**
     * @test Verifies enumeration safety by throwing UnauthorizedException when password comparison fails.
     */
    it('should throw UnauthorizedException if password does not match', async () => {
      usersService.checkExistingUser.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login('test@example.com', 'WrongPass!'),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });
});
