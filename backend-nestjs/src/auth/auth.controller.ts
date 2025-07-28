import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto, CreateUserDto, LoginDto, UpdateUserDto } from './dto/create-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("/createUser")
  async CreateUser(@Body() createUserDto: CreateUserDto) {
    return await this.authService.CreateUser(createUserDto);
  }

  @Post("/isEmailExist")
  async isEmialExist(@Body() email: {email: string}) {
    return await this.authService.IsEmailExist(email.email);
  }

  @Post("/loginAuth")
  async validateUser(@Body() loginDto: LoginDto ) {
    return await this.authService.validateUser(loginDto);
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
  async DeleteUser(@Body() id: {id: number}) {
    return await this.authService.DeleteUser(id.id);
  }
}
