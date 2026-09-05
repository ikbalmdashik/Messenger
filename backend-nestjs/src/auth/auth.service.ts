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
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error("Unknown error occurred");
    }
  }

  // login
  async validateUser(loginDto: LoginDto) {
    const { email, password, otp } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      return {
        success: false,
        message: 'Email not found!',
      };
    }

    // =====================================================
    // LOGIN USING OTP
    // =====================================================
    if (otp) {
      const otpRecord = await this.auth_repo.findOne({
        where: {
          userId: user.userId,
          token: otp,
          type: 'VERIFY_LOGIN',
          used: false,
        },
      });

      if (!otpRecord) {
        return {
          success: false,
          message: 'Invalid or already used OTP',
        };
      }

      // Check OTP expiration
      if (new Date() > new Date(otpRecord.expiresAt)) {
        return {
          success: false,
          message: 'OTP has expired',
        };
      }

      // Mark OTP as used
      otpRecord.used = true;
      await this.auth_repo.save(otpRecord);

      return user;
    }

    // =====================================================
    // LOGIN USING PASSWORD
    // =====================================================
    if (password) {
      const isPasswordValid = await bcrypt.compare(
        password,
        user.password,
      );

      console.log(password)

      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Wrong password',
        };
      }

      return user;
    }

    // =====================================================
    // NEITHER PASSWORD NOR OTP PROVIDED
    // =====================================================
    return {
      success: false,
      message: 'Password or OTP is required',
    };
  }

  async validateTokenAndProcess(token: string) {
    const record = await this.auth_repo.findOne({
      where: { token },
    });

    if (!record) {
      throw new NotFoundException('Token Not Found');
    }

    if (record.used) {
      throw new BadRequestException('Token already used');
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

      await this.auth_repo.update({ id: record.id }, { used: true });

      return {
        success: true,
        action: 'EMAIL_VERIFIED',
        message: 'Email successfully verified',
        isUsed: record.used,
        email: user.email,
      };
    }

    if (record.type === 'RESET_PASSWORD') {
      return {
        success: true,
        action: 'RESET_PASSWORD',
        message: 'You can reset your password now.',
        isUsed: record.used,
        email: user.email,
      };
    }

    if (record.type === 'VERIFY_LOGIN') {
      return {
        success: true,
        action: 'VERIFY_LOGIN',
        message: 'You login is verified.',
        isUsed: record.used,
        email: user.email,
      };
    }

    return {
      success: true,
      action: 'SOME_ACTIONS',
      message: 'Some message.',
      isUsed: record.used,
      email: user.email,
    };
  }

  async change_password(token: string, newPassword: string) {
    // 1️ Find token in DB
    const resetToken = await this.auth_repo.findOne({
      where: { token },
    });

    if (!resetToken) {
      throw new NotFoundException('Token not found.');
    }

    if (resetToken.used) {
      throw new BadRequestException('Token already used');
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
    // await this.auth_repo.delete({ id: resetToken.id });
    await this.auth_repo.update({ id: resetToken.id }, { used: true });

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
