import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService,ConfigModule} from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';


@Module({
    imports: [
        UsersModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET'),
            signOptions: { expiresIn: '1h' },
        }),
}),
],    
    controllers: [AuthController],
    providers: [
        JwtStrategy,
        AuthService],
})
export class AuthModule { }
