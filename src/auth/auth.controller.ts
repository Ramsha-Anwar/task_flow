import {Controller, Post, Body,UseGuards,Get,Req} from '@nestjs/common';  
import {SignupDto} from './dto/signup.dto';
import {AuthService} from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('signup')
    signup(@Body() signupDto: SignupDto) {
       return this.authService.signUp(signupDto);
    }
    @Post('login')
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto .email, loginDto.password);
    }

    @UseGuards(AuthGuard('jwt'))
        @Get('profile')
        getProfile(@Req() req) {
              return req.user;
}
}