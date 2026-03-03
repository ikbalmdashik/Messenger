import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, Query, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto, CreateUserDto, LoginDto, UpdateUserDto } from './dto/create-auth.dto';
import { MailService } from 'src/mailer/mail.service';
import { Request, Response } from 'express';
import { ResetPasswordDto } from './dto/update-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly mailService: MailService) { }

  @Post("/createUser")
  async CreateUser(@Body() createUserDto: CreateUserDto) {
    return await this.authService.CreateUser(createUserDto);
  }

  @Post("/isEmailExist")
  async isEmialExist(@Body() email: { email: string }) {
    return await this.authService.IsEmailExist(email.email);
  }

  @Post("/loginAuth")
  async validateUser(@Body() loginDto: LoginDto) {
    return await this.authService.validateUser(loginDto);
  }

  @Post('/sendLink')
  async sendLink(
    @Body('email') email: string,
    @Body('type') type: 'VERIFY_EMAIL' | 'RESET_PASSWORD',
  ) {
    return await this.mailService.Send_Link(email, type);
  }

  @Get('/validate')
  async validateToken(@Query('token') token: string, @Res({ passthrough: true }) res: Response) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    const result = await this.authService.validateTokenAndProcess(token);

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: false,       // true in production (HTTPS)
      sameSite: 'lax',     // allows sending cookie cross-origin on localhost
      maxAge: 1000 * 60 * 15, // 15 minutes
    });

    return result;
  }

  @Post('/resetPassword')
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    const { newPassword } = dto;
    const token = req.cookies?.token;

    if (!token || !newPassword) {
      throw new BadRequestException('Token and password are required.');
    }

    // Call your service to validate token and update password
    const result = await this.authService.change_password(token, newPassword);

    return result; // { success: true }
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
