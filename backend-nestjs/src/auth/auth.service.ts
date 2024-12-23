import { Injectable } from '@nestjs/common';
import { CreateAuthDto, CreateUserDto, LoginDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersEntity } from './entities/auth.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UsersEntity)
    private userRepository: Repository<UsersEntity>,
    private jwtService: JwtService
  ) {};

  //check wether email is exist or not
  async IsEmailExist(email: string) {
    const result = await this.userRepository.findOne({ where: { email: email } });
    return result == null ? false : true;
  }

  // hash password using bcrypt
  async HashPassword(password: string) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  // create user
  async CreateUser(createUserDto: CreateUserDto) {
    try {
      const isEmailExist = await this.IsEmailExist(createUserDto.email);

      if(!isEmailExist) {
        var user: UsersEntity = new UsersEntity();
        const hashedPassword = await this.HashPassword(createUserDto.password);
        user.fullName = createUserDto.fullName;
        user.email = createUserDto.email;
        user.phone = createUserDto.phone;
        user.password = hashedPassword;
        user.role = createUserDto.role;
        await this.userRepository.save(user);
        
        return { message: "User created." } 
      } else {
        return { message: "Email is already exist!" }
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // login
  async validateUser(loginDto: LoginDto) {
    const isEmailExist = await this.IsEmailExist(loginDto.email);

    if(isEmailExist) {
      const getEmailData = await this.userRepository.findOne({ where: { email: loginDto.email } });
      const isPasswordValid = await bcrypt.compare(loginDto.password, getEmailData.password);
      return isPasswordValid ? getEmailData : { message: "Wrong password" };
    } else {
      return { message: "Email not found!" }
    }
  }

  // get data by id
  async GetDataById(id: number) {
    const result = await this.userRepository.createQueryBuilder('user')
      .select([
        'user.userId',
        'user.fullName',
        'user.phone',
        'user.email',
        'user.role'
      ])
      .where('user.userId = :id', { id })
      .getOne();
  
    return result ? result : null;
  }

  // get all users
  async GetAllUsers() {
    const result = await this.userRepository.createQueryBuilder('user')
      .select([
        'user.userId',
        'user.fullName',
        'user.phone',
        'user.email',
        'user.role',
      ])
      .getMany();
    
    return result;
  }
}
