import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto, LoginDto } from './dto/create-auth.dto';
import { JwtService } from '@nestjs/jwt';
import { AuthOtpEntity, AuthTokenEntity, UsersEntity, UserSessionEntity } from './entities/auth.entity';
import { MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from "bcrypt";
import { ChatMessageEntity } from 'src/chat/entities/chat.entity';
import { customAlphabet } from 'nanoid';
import { AuthLinkAction } from '@/mailer/mail.service';

  export interface ValidateLinkOptions {
  token: string;
  newPassword?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UsersEntity)
    private userRepository: Repository<UsersEntity>,

    @InjectRepository(ChatMessageEntity)
    private chatRepository: Repository<ChatMessageEntity>,

    @InjectRepository(AuthTokenEntity)
    private auth_repo: Repository<AuthTokenEntity>,

    @InjectRepository(AuthOtpEntity)
    private auth_otp_repo: Repository<AuthOtpEntity>,

    @InjectRepository(UserSessionEntity)
    private userSessionRepository: Repository<UserSessionEntity>,

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

  // validate user and send token
  async validateUser(loginDto: LoginDto) {
    const { email, password, otp } = loginDto;

    // 1. Neither password nor OTP provided
    if (!password && !otp) {
      return {
        success: false,
        message: 'Password or OTP is required',
      };
    }

    // 2. Find user
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      return {
        success: false,
        message: 'Email not found!',
      };
    }

    // 3. Validate credentials (OTP or Password)
    let isAuthenticated = false;

    if (otp) {
      // const otpRecord = await this.auth_repo.findOne({
      //   where: {
      //     userId: user.userId,
      //     token: otp,
      //     used: false,
      //   },
      // });

      const otpRecord = await this.auth_otp_repo.findOne({
        where: {
          userId: user.userId,
          isUsed: false
        }, order: {
          createdAt: 'DESC'
        }
      });

      if (!otpRecord) {
        return {
          success: false,
          message: 'Invalid or already used OTP',
        };
      }

      if (new Date() > new Date(otpRecord.expiresAt)) {
        return {
          success: false,
          message: 'OTP has expired',
        };
      }

      if (otpRecord.attempts >= 5) {
        otpRecord.isUsed = true; // Invalidate OTP due to too many failed attempts
        await this.auth_otp_repo.save(otpRecord);
        throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
      }

      const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);

      if (!isMatch) {
        // Increment failed attempts on wrong code
        otpRecord.attempts += 1;
        await this.auth_otp_repo.save(otpRecord);
        throw new UnauthorizedException('Invalid OTP');
      }

      // Mark the OTP as used
      otpRecord.isUsed = true;
      await this.auth_otp_repo.save(otpRecord);

      isAuthenticated = true;

    } else if (password) {
      const isPasswordValid = await bcrypt.compare(
        password,
        user.password,
      );

      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Wrong password',
        };
      }

      isAuthenticated = true;
    }

    // 4. Common Post-Authentication Workflow (Runs for both OTP and Password)
    if (isAuthenticated) {
      // Invalidate all existing unused active tokens/sessions for this user
      await this.auth_repo.update(
        {
          userId: user.userId,
          used: false,
        },
        {
          used: true,
          usedFor: 'Invalidated by new token request',
        },
      );

      // Generate new active token
      const generateToken = customAlphabet(
        '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        64,
      );
      const token = generateToken();

      const newAuth = await this.auth_repo.save({
        userId: user.userId,
        token: token,
        usedFor: 'Unused!',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes
        used: false,
      });

      return {
        success: true,
        token: newAuth.token,
        user,
      };
    }

    return {
      success: false,
      message: 'Authentication failed',
    };
  }

  async validateLink(options: ValidateLinkOptions) {
    const { token, newPassword } = options;

    // 1. Fetch token record
    const record = await this.auth_repo.findOne({
      where: { token },
    });

    if (!record) {
      throw new NotFoundException('Token not found or invalid');
    }

    if (record.used) {
      throw new BadRequestException('Link has already been used');
    }

    // 2. Check expiration
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Link has expired. Please request a new one.');
    }

    // 3. Fetch user
    const user = await this.userRepository.findOne({
      where: { userId: record.userId },
    });

    if (!user) {
      throw new NotFoundException('User associated with this token no longer exists');
    }

    // 4. Branch based on token's action
    switch (record.usedFor) {
      case AuthLinkAction.VERIFY_EMAIL: {
        if (user.isEmailVerified) {
          record.used = true;
          await this.auth_repo.save(record);
          return { success: true, action: AuthLinkAction.VERIFY_EMAIL, message: 'Email is already verified.' };
        }

        user.isEmailVerified = true;
        record.used = true;

        await this.userRepository.save(user);
        await this.auth_repo.save(record);

        return {
          success: true,
          action: AuthLinkAction.VERIFY_EMAIL,
          message: 'Email verified successfully! You can now log in.',
        };
      }

      case AuthLinkAction.RESET_PASSWORD: {
        // Require newPassword for password reset execution
        if (!newPassword) {
          throw new BadRequestException(
            'newPassword is required to complete password reset',
          );
        }

        user.password = await this.HashPassword(newPassword);
        record.used = true;

        await this.userRepository.save(user);
        await this.auth_repo.save(record);

        return {
          success: true,
          action: AuthLinkAction.RESET_PASSWORD,
          message: 'Password reset successfully. You can now log in.',
        };
      }

      default:
        throw new BadRequestException('Unsupported link action type');
    }
  }

  async validateTokenAndLogin(token: string) {
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

    const existingSession = await this.userSessionRepository.findOne({
      where: {
        userId: user.userId,
        expiresAt: MoreThan(new Date()),
      },
      order: {
        createdAt: "DESC", // Get the most recent active session
      },
    });

    // 2. Return existing valid token if present
    if (existingSession) {
      return { userId: user.userId, access_token: existingSession.tokenIdentifier }
    }

    const sessionJwt = this.jwtService.sign({
      sub: {
        user: user.userId
      }
    }, {
      secret: process.env.JWT_SECRET,
      expiresIn: '1d'
    });

    const newSession = await this.userSessionRepository.save({
      userId: user.userId,
      user: user,
      tokenIdentifier: sessionJwt,
      deviceInfo: "-",
      ipAddress: "-",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { userId: user.userId, access_token: newSession.tokenIdentifier };
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

  async getUserByToken(token: string): Promise<UsersEntity> {
    // 1. Find session matching the token and ensure it is not expired
    if (!token) {
      throw new UnauthorizedException("Token not found!")
    }
    const session = await this.userSessionRepository.findOne({
      where: {
        tokenIdentifier: token,
        expiresAt: MoreThan(new Date()), // Exclude expired sessions
      },

      relations: {
        user: true
      }
    });

    if (!session || !session.user) {
      throw new UnauthorizedException('Invalid or expired session token.');
    }

    return session.user;
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
