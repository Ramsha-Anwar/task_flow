import { Injectable,ConflictException, UnauthorizedException } from '@nestjs/common';
import {hash} from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/users.entity';
import { SignupDto } from './dto/signup.dto';
import { JwtService } from '@nestjs/jwt';
import {compare} from 'bcrypt';


@Injectable()
export class AuthService {
    
    constructor(private usersService: UsersService,private jwtService: JwtService) {}

   async hashPassword(password: string): Promise<string> {
          return hash(password, 10);
    }

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
