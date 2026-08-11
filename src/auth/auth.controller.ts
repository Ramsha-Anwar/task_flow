import {Controller, Post, Body} from '@nestjs/common';  
import {SignupDto} from './dto/signup.dto';

@Controller('auth')
export class AuthController {
    @Post('signup')
    signup(@Body() signupDto: SignupDto) {
        // Handle signup logic here
        // return { message: 'User signed up successfully'};
    }
}