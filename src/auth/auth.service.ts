import { Injectable,ConflictException, UnauthorizedException } from '@nestjs/common';
import {hash} from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/users.entity';
import { SignupDto } from './dto/signup.dto';
import { JwtService } from '@nestjs/jwt';
import {compare} from 'bcrypt';

/**
 * Handles user authentication: signup, login, and password hashing.
 * Delegates all user persistence to UsersService and issues JWTs via JwtService.
 */
@Injectable()
export class AuthService {

    constructor(private usersService: UsersService,private jwtService: JwtService) {}

   /**
    * Hashes a plaintext password using bcrypt before it's stored.
    * @param password - The plaintext password to hash.
    * @returns The bcrypt hash of the password.
    */
   async hashPassword(password: string): Promise<string> {
          return hash(password, 10);
    }

    /**
     * Registers a new user account.
     * @param dto - Signup payload containing email, name, and plaintext password.
     * @returns The newly created user, with the password field stripped out.
     * @throws {ConflictException} If a user with this email already exists.
     */
    async signUp(dto:SignupDto): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.checkExistingUser(dto.email);
    if (user) {
      throw new ConflictException('User with this email already exists');
    }
    const hashedPassword = await this.hashPassword(dto.password);
    const newUser = await this.usersService.createUser({
      email: dto.email,
      name: dto.name,
      password: hashedPassword,
    });
    const { password, ...result } = newUser;
    return result;
  }

  /**
   * Authenticates a user and issues a JWT access token.
   * Uses an enumeration-safe error: both "no such user" and "wrong password"
   * return the same message, so a caller can't tell which one failed.
   * @param email - The user's email address.
   * @param password - The plaintext password to verify.
   * @returns An object containing the signed JWT access token.
   * @throws {UnauthorizedException} If the email doesn't exist or the password doesn't match.
   */
  async login(email: string, password: string): Promise<{ accessToken: string }> {
    const user = await this.usersService.checkExistingUser(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const accessToken = this.jwtService.sign({sub: user.id });
    return { accessToken };

  }
}