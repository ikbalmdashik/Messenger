import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto, LoginDto } from './dto/create-auth.dto';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenEntity, UsersEntity } from './entities/auth.entity';
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

    @InjectRepository(AuthTokenEntity)
    private auth_repo: Repository<AuthTokenEntity>,

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

  async validateTokenAndProcess(token: string) {
    const record = await this.auth_repo.findOne({
      where: { token },
    });

    if (!record) {
      throw new BadRequestException('Invalid token');
    }

    // Check expiration
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Token expired');
    }

    // Load user
    const user = await this.userRepository.findOne({
      where: { userId: record.userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // If token is for email verification
    if (record.type === 'VERIFY_EMAIL') {
      user.isEmailVerified = true;
      await this.userRepository.save(user);

      // optionally delete token after use
      // await this.auth_repo.delete({ id: record.id });

      return {
        success: true,
        action: 'EMAIL_VERIFIED',
        message: 'Email successfully verified',
        email: user.email,
      };
    }

    // If token is for password reset
    if (record.type === 'RESET_PASSWORD') {
      return {
        success: true,
        action: 'RESET_PASSWORD_ALLOWED',
        message: 'Token valid. You can reset password now.',
        token: token, // frontend will reuse this
        userId: user.userId,
        email: user.email,
      };
    }
  }

  async change_password(token: string, newPassword: string) {
    // 1️ Find token in DB
    const resetToken = await this.auth_repo.findOne({
      where: { token },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid token.');
    }

    // 2️ Check expiry
    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Token expired.');
    }

    // 3️ Get the user
    const user = await this.userRepository.findOne({
      where: { userId: resetToken.userId },
    });

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    // 4️ Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 5️ Update password
    user.password = hashedPassword;
    await this.userRepository.save(user);

    // 6️ Invalidate token (delete or mark as used)
    await this.auth_repo.delete({ id: resetToken.id });

    return { success: true };
  }

  // get data by id
  async GetDataById(id: number) {
    const result = await this.userRepository.createQueryBuilder('user')
      .select([
        'user.userId',
        'user.fullName',
        'user.phone',
        'user.email',
        'user.role',
        'user.isEmailVerified'
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
