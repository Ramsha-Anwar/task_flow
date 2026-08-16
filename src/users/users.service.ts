import {Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/users.entity';
import { SignupDto } from '../auth/dto/signup.dto';
import { AuthService } from '../auth/auth.service';

/**
 * Handles direct database access for User records.
 * No controller — user creation/lookup happens exclusively through AuthService.
 */
@Injectable()
export class UsersService {
    constructor(
  @InjectRepository(User)
  private  userRepository: Repository<User>
) {}

  /**
   * Looks up a user by email, used to check for duplicate signups and during login.
   * @param email - The email address to search for.
   * @returns The matching User entity, or null if no user has this email.
   */
  async checkExistingUser(email:string){
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return null;
    }
    return user;
  }

  /**
   * Creates and persists a new user record.
   * Expects the password to already be hashed — this method does not hash it.
   * @param user - Partial User data (email, name, hashed password).
   * @returns The newly created User entity.
   */
  async createUser(user: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create(user);
    return this.userRepository.save(newUser);
  }

  /**
   * Looks up a user by their ID.
   * @param id - The user's UUID.
   * @returns The matching User entity, or null if no user has this ID.
   */
  async findOneById(id: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if(!user){
      return null;
    }
    return user;
  }
}