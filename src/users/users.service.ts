import {Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/users.entity';
import { SignupDto } from '../auth/dto/signup.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
    constructor(
  @InjectRepository(User)
  private  userRepository: Repository<User>
) {}

  async checkExistingUser(email:string){
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return null;
    }
    return user;
  }

  async createUser(user: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create(user);
    return this.userRepository.save(newUser);
  }

  
}