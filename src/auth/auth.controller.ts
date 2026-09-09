import {Controller, Post, Body,UseGuards,Get,Req} from '@nestjs/common';  
import {SignupDto} from './dto/signup.dto';
import {AuthService} from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';

/**
 * Exposes authentication routes: signup, login, and the current user's profile.
 */
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    /**
     * Registers a new user account.
     * @param signupDto - Email, name, and password for the new account.
     * @returns The newly created user (without the password field).
     * @throws {ConflictException} If a user with this email already exists.
     */
    @Post('signup')
    signup(@Body() signupDto: SignupDto) {
       return this.authService.signUp(signupDto);
    }

    /**
     * Logs a user in and issues a JWT access token.
     * @param loginDto - Email and password to authenticate with.
     * @returns An object containing the signed JWT access token.
     * @throws {UnauthorizedException} If the credentials are invalid.
     */
    @Post('login')
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto .email, loginDto.password);
    }

    /**
     * Returns the currently authenticated user's profile.
     * Requires a valid JWT — the user object is attached to the request
     * by Passport's JWT strategy after successful token verification.
     * @param req - The incoming request, with `req.user` populated by AuthGuard('jwt').
     * @returns The authenticated user's payload (whatever the JWT strategy attaches).
     * @throws {UnauthorizedException} If no valid JWT is provided.
     */
    @UseGuards(AuthGuard('jwt'))
        @Get('profile')
        getProfile(@Req() req) {
              return req.user;
}
}