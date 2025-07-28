import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto, LoginDto } from './dto/create-auth.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersEntity } from './entities/auth.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from "bcrypt";
import { ChatMessageEntity } from 'src/chat/entities/chat.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UsersEntity)
    private userRepository: Repository<UsersEntity>,

    @InjectRepository(ChatMessageEntity)
    private chatRepository: Repository<ChatMessageEntity>,
    
    private jwtService: JwtService
  ) { };

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

      if (!isEmailExist) {
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

    if (isEmailExist) {
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

  async UpdateUser(updateUserDto: Partial<CreateUserDto>) {
    const { userId } = updateUserDto;

    // 1. Ensure userId is provided
    if (!userId) {
      throw new BadRequestException("User ID is required");
    }

    // 2. Fetch the existing user
    const user = await this.GetDataById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // 3. Prepare updated data, keeping old values where new ones are missing
    const updatedUser = {
      fullName: updateUserDto.fullName ?? user.fullName,
      email: updateUserDto.email ?? user.email,
      phone: updateUserDto.phone ?? user.phone,
      password: updateUserDto.password ?? user.password,
      role: updateUserDto.role ?? user.role,
    };

    // 4. Perform update
    await this.userRepository.update(userId, updatedUser);

    // 5. Return the updated user
    return this.GetDataById(userId);
  }

  async DeleteUser(id: number) {
    // 1. Ensure userId is provided
    if (!id) {
      throw new BadRequestException("User ID is required");
    }

    // 2. Fetch the existing user
    const user = await this.GetDataById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return await this.userRepository.delete(user);
  }
}
