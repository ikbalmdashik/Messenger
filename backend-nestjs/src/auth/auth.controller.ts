import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, Query, Res, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto, CreateUserDto, LoginDto, UpdateUserDto } from './dto/create-auth.dto';
import { MailService } from 'src/mailer/mail.service';
import { Request, Response } from 'express';
import { ResetPasswordDto } from './dto/update-auth.dto';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly mailService: MailService, private readonly jwtService: JwtService) { }

  @Post("/createUser")
  async CreateUser(@Body() createUserDto: CreateUserDto) {
    return await this.authService.CreateUser(createUserDto);
  }

  @Post("/isEmailExist")
  async isEmialExist(@Body() email: { email: string }) {
    return await this.authService.IsEmailExist(email.email);
  }

  @Post("/validateUser")
  async validateUser(@Body() loginDto: LoginDto) {
    return await this.authService.validateUser(loginDto);
  }

  // @Post("/login")
  // async login(@Body('token') token: string) {
  //   return await this.authService.validateTokenAndLogin(token);
  // }


  @Post('/login')
  async login(
    @Body('token') token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    // 1. Validate token and get user details
    const result = await this.authService.validateTokenAndLogin(token);

    if (!result || !result.userId) {
      throw new UnauthorizedException('Invalid token');
    }

    // 2. Set an HTTP-only cookie unique to this user ID/session
    const cookieName = `auth_token_${result.userId}`;

    response.cookie("access_token", result.access_token, {
      httpOnly: true,                                  // Prevents client-side JS access (XSS protection)
      secure: false,                                   // Transmit only over HTTPS in production
      sameSite: 'lax',                                 // Protects against CSRF attacks
      maxAge: 1 * 24 * 60 * 60 * 1000,                 // Expiration time (e.g., 1 days in milliseconds)
      path: '/',                                       // Cookie available across the whole site
    });

    return {
      user: result.userId,
      access_token: result.access_token
    };
  }


  @Post('/sendLink')
  async sendLink(
    @Body('email') email: string,
    @Body('type') type: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'VERIFY_OTP',
  ) {
    return await this.mailService.Send_Link(email, type);
  }

  @Post('/sendOtp')
  async sendOtp (@Body('email') email: string) {
    return await this.mailService.send_otp(email)
  }

  // @Get('/validate')
  // async validateToken(@Query('token') token: string) {
  //   if (!token) {
  //     throw new BadRequestException('Token is required');
  //   }
  //   const result = await this.authService.validateTokenAndLogin(token);
  //   return result;
  // }

  @Post('/resetPassword')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const { token, newPassword } = dto;

    if (!token || !newPassword) {
      throw new BadRequestException('Token and password are required.');
    }

    // Call your service to validate token and update password
    const result = await this.authService.change_password(token, newPassword);

    return result; // { success: true }
  }

  @Post('/getUserByToken')
  async getUserByToken(@Req() req: Request) {
    const token = req.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException('Authentication cookie not found');
    }

    return await this.authService.getUserByToken(token);
  }


  @Get("/getAllUsers")
  async GetAllUsers() {
    return this.authService.GetAllUsers();
  }

  @Get('getUser/:id')
  async GetDataById(@Param('id') id: number) {
    return this.authService.GetDataById(+id);
  }

  @Post('/updateUser')
  async UpdateUser(@Body() updateUserDto: Partial<UpdateUserDto>) {
    return await this.authService.UpdateUser(updateUserDto);
  }

  @Post('/deleteUser')
  async DeleteUser(@Body() id: { id: number }) {
    return await this.authService.DeleteUser(id.id);
  }
}
