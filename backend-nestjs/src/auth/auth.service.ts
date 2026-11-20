import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto, LoginDto } from './dto/create-auth.dto';
import { JwtService } from '@nestjs/jwt';
import {
  AuthOtpEntity,
  AuthTokenEntity,
  DEFAULT_GROUP_SETTINGS,
  DEFAULT_PRIVACY,
  GroupInviteLevel,
  UserGroupSettings,
  ProfileVisibility,
  UserAddress,
  UserContact,
  UserEducation,
  UserPrivacy,
  UsersEntity,
  UserSessionEntity,
  UserSocialLink,
} from './entities/auth.entity';
import { UserBlockEntity } from './entities/user-block.entity';
import { MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from "bcrypt";
import { customAlphabet } from 'nanoid';
import { AuthLinkAction } from '@/mailer/mail.service';

const MAX_EDUCATION_ENTRIES = 10;
const MAX_SOCIAL_LINKS = 8;

const VISIBILITY_LEVELS: ProfileVisibility[] = [
  'EVERYONE',
  'CONTACTS',
  'ONLY_ME',
];

/**
 * Accept only http(s) links (blocks javascript: etc.).
 * Adds https:// when the scheme is missing.
 */
const cleanUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim().slice(0, 300);

  if (!trimmed) {
    return undefined;
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Trim a free-text field and cap its length.
 * Returns undefined for empty values.
 */
const cleanText = (
  value: unknown,
  maxLength: number,
): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim().slice(0, maxLength);

  return trimmed ? trimmed : undefined;
};

const cleanYear = (
  value: unknown,
): number | null => {
  const year = Number(value);

  if (
    value === null ||
    value === undefined ||
    value === '' ||
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 2100
  ) {
    return null;
  }

  return year;
};

export interface SavedAccountSummary {
  userId: number;
  fullName: string;
  email: string;
  publicId: string;
  isEmailVerified: boolean;
  isActive: boolean;
}

export interface ValidateLinkOptions {
  token: string;
  newPassword?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UsersEntity)
    private userRepository: Repository<UsersEntity>,

    @InjectRepository(AuthTokenEntity)
    private auth_repo: Repository<AuthTokenEntity>,

    @InjectRepository(AuthOtpEntity)
    private auth_otp_repo: Repository<AuthOtpEntity>,

    @InjectRepository(UserSessionEntity)
    private userSessionRepository: Repository<UserSessionEntity>,

    @InjectRepository(UserBlockEntity)
    private blockRepository: Repository<UserBlockEntity>,

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

      if (isEmailExist) {
        return { message: "Email is already exist!" };
      }

      // Generate unique publicId
      const basePublicId = createUserDto.email.split('@')[0];
      let publicId = basePublicId;
      let isPublicIdExist = await this.userRepository.findOne({ where: { publicId } });

      while (isPublicIdExist) {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit suffix
        const candidateId = `${basePublicId}${randomSuffix}`;

        isPublicIdExist = await this.userRepository.findOne({ where: { publicId: candidateId } });

        if (!isPublicIdExist) {
          publicId = candidateId;
        }
      }

      const hashedPassword = await this.HashPassword(createUserDto.password);

      const user: UsersEntity = new UsersEntity();
      user.fullName = createUserDto.fullName;
      user.email = createUserDto.email;
      user.publicId = publicId;
      user.phone = createUserDto.phone;
      user.password = hashedPassword;
      user.role = createUserDto.role;

      await this.userRepository.save(user);

      return { message: "User created." };
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

  async validateTokenAndLogin(
    token: string,
    client: { userAgent?: string; ipAddress?: string } = {},
  ) {

    if (!token) {
      throw new BadRequestException("Token is required!")
    }

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

    record.used = true;
    record.usedFor = 'LOGIN';
    await this.auth_repo.save(record);

    // A deactivated profile can log in, but stays
    // deactivated until it is explicitly reactivated
    // (see ReactivateMyAccount).

    // One session per login so each device shows up
    // separately under "Where you're logged in".

    const sessionJwt = this.jwtService.sign({
      sub: {
        user: user.userId
      },
      jti: customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)(),
    }, {
      secret: process.env.JWT_SECRET,
      expiresIn: '1d'
    });

    const newSession = await this.userSessionRepository.save({
      userId: user.userId,
      user: user,
      tokenIdentifier: sessionJwt,
      deviceInfo: (client.userAgent ?? '').slice(0, 300) || 'Unknown device',
      ipAddress: (client.ipAddress ?? '').slice(0, 64) || 'Unknown',
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { userId: user.userId, access_token: newSession.tokenIdentifier };
  }

  async logout(token: string) {
    const session = await this.userSessionRepository.findOne({
      where: {
        tokenIdentifier: token,
      },
    });

    if (!session) {
      return;
    }

    session.expiresAt = new Date();
    session.lastActiveAt = new Date();

    await this.userSessionRepository.save(session);
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

  async findValidToken(token: string) {
    const tokenRecord = await this.userSessionRepository.findOne({
      where: {
        tokenIdentifier: token,
      }, relations: {
        user: true
      }
    });

    if (!tokenRecord) {
      return null;
    }

    if (tokenRecord.expiresAt < new Date()) {
      return null;
    }

    return tokenRecord;
  }

  async searchByPublicId(publicId: string): Promise<UsersEntity[]> {
    const search = publicId.trim();

    // Don't search for empty or very short values
    if (search.length < 2) {
      return [];
    }

    return this.userRepository
      .createQueryBuilder("user")
      .select([
        "user.userId",
        "user.fullName",
        "user.publicId",
        "user.isEmailVerified",
      ])
      .where("user.publicId ILIKE :publicId", {
        publicId: `${search}%`,
      })
      .andWhere('"user"."isDeactivated" = false')
      .orderBy("user.publicId", "ASC")
      .limit(10)
      .getMany();
  }

  async getUserByToken(token: string) {
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

    return this.ToSafeUser(session.user);
  }

  /**
   * Fields that are safe to send to the browser
   * (no password hash).
   */
  ToSafeUser(user: UsersEntity) {
    return {
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      publicId: user.publicId,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isDeactivated: Boolean(user.isDeactivated),
    };
  }

  /**
   * Public profile. Sections are filtered by the
   * owner's privacy settings and who is viewing:
   *
   * EVERYONE -> anyone
   * CONTACTS -> people who share a conversation
   * ONLY_ME  -> the owner only
   */
  async GetDataByPublicId(
    publicId: string,
    viewerId: number | null = null,
  ) {
    const user = await this.userRepository.findOne({
      where: { publicId },
      select: {
        userId: true,
        fullName: true,
        phone: true,
        email: true,
        publicId: true,
        role: true,
        isEmailVerified: true,
        address: true,
        education: true,
        contact: true,
        privacy: true,
        isDeactivated: true,
      },
    });

    if (!user) {
      return null;
    }

    const isOwner = viewerId !== null && viewerId === user.userId;

    if (user.isDeactivated && !isOwner) {
      return null;
    }

    const privacy = { ...DEFAULT_PRIVACY, ...(user.privacy ?? {}) };

    const block =
      viewerId !== null && !isOwner
        ? await this.GetBlockStatus(viewerId, user.userId)
        : { blockedByMe: false, blockedMe: false };

    const isContact =
      !isOwner && viewerId !== null
        ? await this.SharesConversation(user.userId, viewerId)
        : false;

    const canSee = (visibility: ProfileVisibility) =>
      isOwner ||
      (!block.blockedMe &&
        (visibility === 'EVERYONE' ||
          (visibility === 'CONTACTS' && isContact)));

    const showContact = canSee(privacy.contact);
    const showEducation = canSee(privacy.education);
    const showLocation = canSee(privacy.location);

    return {
      userId: user.userId,
      fullName: user.fullName,
      publicId: user.publicId,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isOwner,
      blockedByMe: block.blockedByMe,
      blockedMe: block.blockedMe,

      email: showContact ? user.email : null,
      phone: showContact ? user.phone || null : null,
      contact: showContact ? user.contact ?? null : null,

      education: showEducation ? user.education ?? [] : null,

      location:
        showLocation && user.address
          ? {
              city: user.address.city ?? null,
              state: user.address.state ?? null,
              country: user.address.country ?? null,
            }
          : null,

      /*
       * Lets the page say "hidden" instead of
       * "nothing added".
       */
      hidden: {
        contact: !showContact,
        education: !showEducation,
        location: !showLocation,
      },

      ...(isOwner ? { privacy } : {}),
    };
  }

  private async SharesConversation(
    userId: number,
    otherUserId: number,
  ): Promise<boolean> {
    const rows = await this.userRepository.query(
      `
        SELECT 1
        FROM "conversation_participants" a
        JOIN "conversation_participants" b
          ON a."conversationId" = b."conversationId"
        WHERE a."userId" = $1 AND b."userId" = $2
        LIMIT 1
      `,
      [Number(userId), Number(otherUserId)],
    );

    return Array.isArray(rows) && rows.length > 0;
  }

  /*
   * ============================================================
   * MY PROFILE (personal, contact, address, education, privacy)
   * ============================================================
   */

  async GetMyProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { userId: Number(userId) },
      select: {
        userId: true,
        fullName: true,
        email: true,
        phone: true,
        publicId: true,
        role: true,
        isEmailVerified: true,
        address: true,
        education: true,
        contact: true,
        privacy: true,
        groupSettings: true,
        isDeactivated: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? '',
      publicId: user.publicId,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      address: user.address ?? null,
      education: user.education ?? [],
      contact: user.contact ?? null,
      privacy: { ...DEFAULT_PRIVACY, ...(user.privacy ?? {}) },
      groupSettings: this.ResolveGroupSettings(user.groupSettings),
      isDeactivated: Boolean(user.isDeactivated),
    };
  }

  ResolveGroupSettings(
    settings: UserGroupSettings | null | undefined,
  ): UserGroupSettings {
    return {
      defaults: {
        ...DEFAULT_GROUP_SETTINGS.defaults,
        ...(settings?.defaults ?? {}),
      },
      whoCanAddMe:
        settings?.whoCanAddMe ?? DEFAULT_GROUP_SETTINGS.whoCanAddMe,
    };
  }

  async GetGroupSettings(userId: number): Promise<UserGroupSettings> {
    const user = await this.userRepository.findOne({
      where: { userId: Number(userId) },
      select: { userId: true, groupSettings: true },
    });

    return this.ResolveGroupSettings(user?.groupSettings);
  }

  async UpdateGroupSettings(
    userId: number,
    body: {
      verificationToken?: unknown;
      defaults?: unknown;
      whoCanAddMe?: unknown;
    },
  ) {
    await this.VerifyActionToken(
      userId,
      body.verificationToken,
      'UPDATE_GROUP_SETTINGS',
    );

    const settings = await this.GetGroupSettings(userId);

    if (body.defaults !== undefined) {
      if (!body.defaults || typeof body.defaults !== 'object') {
        throw new BadRequestException('Invalid group defaults.');
      }

      const raw = body.defaults as Record<string, unknown>;

      for (const key of Object.keys(settings.defaults) as Array<
        keyof UserGroupSettings['defaults']
      >) {
        const value = raw[key];

        if (value === undefined) {
          continue;
        }

        if (value !== 'ALL' && value !== 'ADMINS') {
          throw new BadRequestException(`Invalid value for ${key}.`);
        }

        settings.defaults[key] = value;
      }
    }

    if (body.whoCanAddMe !== undefined) {
      const levels: GroupInviteLevel[] = ['EVERYONE', 'CONTACTS', 'NOBODY'];

      if (!levels.includes(body.whoCanAddMe as GroupInviteLevel)) {
        throw new BadRequestException('Invalid value for who can add you.');
      }

      settings.whoCanAddMe = body.whoCanAddMe as GroupInviteLevel;
    }

    await this.userRepository.update(
      { userId: Number(userId) },
      { groupSettings: settings },
    );

    return settings;
  }

  /*
   * ============================================================
   * SESSIONS (where you're logged in)
   * ============================================================
   */

  async ListSessions(userId: number, currentToken?: string) {
    const sessions = await this.userSessionRepository.find({
      where: {
        userId: Number(userId),
        expiresAt: MoreThan(new Date()),
      },
      order: { lastActiveAt: 'DESC', createdAt: 'DESC' },
    });

    return sessions.map((session) => ({
      sessionId: session.sessionId,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt ?? session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: session.tokenIdentifier === currentToken,
    }));
  }

  async RevokeSession(
    userId: number,
    sessionId: number,
    verificationToken: unknown,
  ) {
    await this.VerifyActionToken(userId, verificationToken, 'REVOKE_SESSION');

    const session = await this.userSessionRepository.findOne({
      where: { sessionId: Number(sessionId), userId: Number(userId) },
    });

    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    session.expiresAt = new Date();
    await this.userSessionRepository.save(session);

    return { success: true };
  }

  async RevokeOtherSessions(
    userId: number,
    currentToken: string | undefined,
    verificationToken: unknown,
  ) {
    await this.VerifyActionToken(
      userId,
      verificationToken,
      'REVOKE_OTHER_SESSIONS',
    );

    const sessions = await this.userSessionRepository.find({
      where: { userId: Number(userId), expiresAt: MoreThan(new Date()) },
    });

    const others = sessions.filter(
      (session) => session.tokenIdentifier !== currentToken,
    );

    for (const session of others) {
      session.expiresAt = new Date();
    }

    await this.userSessionRepository.save(others);

    return { success: true, revoked: others.length };
  }

  /**
   * Keep "last active" fresh without a DB write on
   * every request.
   */
  async TouchSession(session: UserSessionEntity) {
    const last = session.lastActiveAt
      ? new Date(session.lastActiveAt).getTime()
      : 0;

    if (Date.now() - last < 5 * 60 * 1000) {
      return;
    }

    await this.userSessionRepository.update(
      { sessionId: session.sessionId },
      { lastActiveAt: new Date() },
    );
  }

  /*
   * ============================================================
   * DEACTIVATE
   * ============================================================
   */

  async DeactivateMyAccount(userId: number, verificationToken: unknown) {
    await this.VerifyActionToken(userId, verificationToken, 'DEACTIVATE');

    await this.userRepository.update(
      { userId: Number(userId) },
      { isDeactivated: true, deactivatedAt: new Date() },
    );

    // Sign out everywhere.
    await this.userSessionRepository.update(
      { userId: Number(userId), expiresAt: MoreThan(new Date()) },
      { expiresAt: new Date() },
    );

    return { success: true };
  }

  async ReactivateMyAccount(userId: number, verificationToken: unknown) {
    await this.VerifyActionToken(userId, verificationToken, 'REACTIVATE');

    await this.userRepository.update(
      { userId: Number(userId) },
      { isDeactivated: false, deactivatedAt: null },
    );

    return { success: true };
  }

  async IsDeactivated(userId: number) {
    const user = await this.userRepository.findOne({
      where: { userId: Number(userId) },
      select: { userId: true, isDeactivated: true },
    });

    return Boolean(user?.isDeactivated);
  }

  /**
   * "Reset account" (profile part): clears contact,
   * address, education and blocks, and restores
   * default privacy and group settings. Name, email,
   * phone and password are kept.
   */
  async ResetProfileData(userId: number) {
    await this.userRepository.update(
      { userId: Number(userId) },
      {
        contact: null,
        address: null,
        education: null,
        privacy: null,
        groupSettings: null,
      },
    );

    await this.blockRepository.delete({ blockerId: Number(userId) });
  }

  /*
   * ============================================================
   * REMEMBERED ACCOUNTS (login page)
   * ============================================================
   */

  /**
   * Summaries for user IDs remembered on this browser.
   * Deleted users are dropped.
   */
  async ResolveRememberedAccounts(userIds: number[]) {
    if (userIds.length === 0) {
      return [];
    }

    const users = await this.userRepository.find({
      where: userIds.map((userId) => ({ userId })),
      select: {
        userId: true,
        fullName: true,
        email: true,
        publicId: true,
        isEmailVerified: true,
      },
    });

    const byId = new Map(users.map((user) => [user.userId, user]));

    return userIds
      .map((id) => byId.get(id))
      .filter((user): user is UsersEntity => Boolean(user));
  }

  /*
   * ============================================================
   * BLOCKING
   * ============================================================
   */

  async GetBlockStatus(userId: number, otherUserId: number) {
    const rows = await this.blockRepository.find({
      where: [
        { blockerId: Number(userId), blockedId: Number(otherUserId) },
        { blockerId: Number(otherUserId), blockedId: Number(userId) },
      ],
    });

    return {
      blockedByMe: rows.some((row) => row.blockerId === Number(userId)),
      blockedMe: rows.some((row) => row.blockerId === Number(otherUserId)),
    };
  }

  async IsBlockedEitherWay(userId: number, otherUserId: number) {
    const status = await this.GetBlockStatus(userId, otherUserId);

    return status.blockedByMe || status.blockedMe;
  }

  async BlockUser(userId: number, targetUserId: number) {
    if (Number(userId) === Number(targetUserId)) {
      throw new BadRequestException("You can't block yourself.");
    }

    const target = await this.userRepository.findOne({
      where: { userId: Number(targetUserId) },
      select: { userId: true },
    });

    if (!target) {
      throw new NotFoundException('User not found.');
    }

    const existing = await this.blockRepository.findOne({
      where: { blockerId: Number(userId), blockedId: Number(targetUserId) },
    });

    if (!existing) {
      await this.blockRepository.save(
        this.blockRepository.create({
          blockerId: Number(userId),
          blockedId: Number(targetUserId),
        }),
      );
    }

    return this.GetBlockStatus(userId, targetUserId);
  }

  async UnblockUser(userId: number, targetUserId: number) {
    await this.blockRepository.delete({
      blockerId: Number(userId),
      blockedId: Number(targetUserId),
    });

    return this.GetBlockStatus(userId, targetUserId);
  }

  async ListBlocked(userId: number) {
    const rows = await this.blockRepository.find({
      where: { blockerId: Number(userId) },
      relations: { blocked: true },
      order: { createdAt: 'DESC' },
    });

    return rows
      .filter((row) => row.blocked)
      .map((row) => ({
        userId: row.blocked.userId,
        fullName: row.blocked.fullName,
        publicId: row.blocked.publicId,
        blockedAt: row.createdAt,
      }));
  }

  /**
   * IDs the user blocked or was blocked by.
   */
  async GetBlockedIds(userId: number): Promise<Set<number>> {
    const rows = await this.blockRepository.find({
      where: [
        { blockerId: Number(userId) },
        { blockedId: Number(userId) },
      ],
    });

    return new Set(
      rows.map((row) =>
        row.blockerId === Number(userId) ? row.blockedId : row.blockerId,
      ),
    );
  }

  /**
   * Whether `userId` may add `targetId` to a group,
   * per the target's "who can add me" setting.
   */
  async CanAddToGroup(userId: number, targetId: number) {
    if (await this.IsBlockedEitherWay(userId, targetId)) {
      return false;
    }

    const target = await this.userRepository.findOne({
      where: { userId: Number(targetId) },
      select: { userId: true, groupSettings: true, isDeactivated: true },
    });

    if (!target || target.isDeactivated) {
      return false;
    }

    const level = this.ResolveGroupSettings(target.groupSettings).whoCanAddMe;

    if (level === 'EVERYONE') {
      return true;
    }

    if (level === 'NOBODY') {
      return false;
    }

    return this.SharesDirectChat(userId, targetId);
  }

  private async SharesDirectChat(userId: number, otherUserId: number) {
    const rows = await this.userRepository.query(
      `
        SELECT 1
        FROM "conversation_participants" a
        JOIN "conversation_participants" b
          ON a."conversationId" = b."conversationId"
        JOIN "conversations" c
          ON c."conversationId" = a."conversationId"
        WHERE a."userId" = $1 AND b."userId" = $2 AND c."type" = 'DIRECT'
        LIMIT 1
      `,
      [Number(userId), Number(otherUserId)],
    );

    return Array.isArray(rows) && rows.length > 0;
  }

  /**
   * Consume a one-time verification token issued by
   * /auth/validateUser (the password / OTP modal).
   *
   * The token must belong to `userId`, be unused and
   * unexpired. It is marked used, so each sensitive
   * action needs a fresh verification.
   */
  async VerifyActionToken(
    userId: number,
    token: unknown,
    action: string,
  ) {
    if (typeof token !== 'string' || !token) {
      throw new UnauthorizedException(
        'Please verify it is you to continue.',
      );
    }

    const record = await this.auth_repo.findOne({ where: { token } });

    if (
      !record ||
      record.used ||
      Number(record.userId) !== Number(userId) ||
      record.expiresAt < new Date()
    ) {
      throw new UnauthorizedException(
        'Verification expired or invalid. Please verify again.',
      );
    }

    record.used = true;
    record.usedFor = action.slice(0, 60);

    await this.auth_repo.save(record);
  }

  /**
   * Update the authenticated user's own profile.
   * Requires the current password. Only the fields
   * present in `body` change.
   */
  async UpdateMyProfile(
    userId: number,
    body: {
      verificationToken?: unknown;
      fullName?: unknown;
      phone?: unknown;
      address?: unknown;
      education?: unknown;
      contact?: unknown;
      privacy?: unknown;
    },
  ) {
    await this.VerifyActionToken(
      userId,
      body.verificationToken,
      'UPDATE_PROFILE',
    );

    const updates: Partial<UsersEntity> = {};

    if (body.fullName !== undefined) {
      const fullName = cleanText(body.fullName, 100);

      if (!fullName) {
        throw new BadRequestException('Name is required.');
      }

      updates.fullName = fullName;
    }

    if (body.phone !== undefined) {
      const phone =
        typeof body.phone === 'string' ? body.phone.trim() : '';

      if (phone && !/^[+\d][\d\s().-]{4,24}$/.test(phone)) {
        throw new BadRequestException('Enter a valid phone number.');
      }

      updates.phone = phone;
    }

    if (body.address !== undefined) {
      updates.address = this.CleanAddress(body.address);
    }

    if (body.education !== undefined) {
      updates.education = this.CleanEducation(body.education);
    }

    if (body.contact !== undefined) {
      updates.contact = this.CleanContact(body.contact);
    }

    if (body.privacy !== undefined) {
      updates.privacy = this.CleanPrivacy(body.privacy);
    }

    if (Object.keys(updates).length > 0) {
      await this.userRepository.update(
        { userId: Number(userId) },
        updates,
      );
    }

    return this.GetMyProfile(userId);
  }

  /**
   * Delete the authenticated user's own account
   * after confirming the password.
   */
  async DeleteMyAccount(userId: number, verificationToken: unknown) {
    await this.VerifyActionToken(userId, verificationToken, 'DELETE_ACCOUNT');

    await this.userSessionRepository.update(
      { userId: Number(userId) },
      { expiresAt: new Date() },
    );

    await this.userRepository.delete(Number(userId));

    return { success: true };
  }

  private CleanAddress(value: unknown): UserAddress | null {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'object') {
      throw new BadRequestException('Invalid address.');
    }

    const raw = value as Record<string, unknown>;

    const address: UserAddress = {
      line1: cleanText(raw.line1, 200),
      line2: cleanText(raw.line2, 200),
      city: cleanText(raw.city, 100),
      state: cleanText(raw.state, 100),
      postalCode: cleanText(raw.postalCode, 20),
      country: cleanText(raw.country, 100),
    };

    return Object.values(address).some(Boolean) ? address : null;
  }

  private CleanEducation(value: unknown): UserEducation[] | null {
    if (!Array.isArray(value)) {
      throw new BadRequestException('Education must be a list.');
    }

    if (value.length > MAX_EDUCATION_ENTRIES) {
      throw new BadRequestException(
        `You can add up to ${MAX_EDUCATION_ENTRIES} education entries.`,
      );
    }

    const education: UserEducation[] = [];

    for (const item of value) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const raw = item as Record<string, unknown>;

      const institution = cleanText(raw.institution, 200);

      if (!institution) {
        throw new BadRequestException(
          'Each education entry needs a school or institution name.',
        );
      }

      const startYear = cleanYear(raw.startYear);
      const current = raw.current === true;
      const endYear = current ? null : cleanYear(raw.endYear);

      if (startYear !== null && endYear !== null && endYear < startYear) {
        throw new BadRequestException(
          `End year can't be before start year (${institution}).`,
        );
      }

      education.push({
        institution,
        degree: cleanText(raw.degree, 150),
        fieldOfStudy: cleanText(raw.fieldOfStudy, 150),
        startYear,
        endYear,
        current,
        description: cleanText(raw.description, 500),
      });
    }

    return education.length > 0 ? education : null;
  }

  private CleanContact(value: unknown): UserContact | null {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'object') {
      throw new BadRequestException('Invalid contact details.');
    }

    const raw = value as Record<string, unknown>;

    const website = cleanUrl(raw.website);

    if (raw.website && !website) {
      throw new BadRequestException(
        'Website must be a valid http(s) link.',
      );
    }

    const socials: UserSocialLink[] = [];

    if (raw.socials !== undefined) {
      if (!Array.isArray(raw.socials)) {
        throw new BadRequestException('Invalid social links.');
      }

      if (raw.socials.length > MAX_SOCIAL_LINKS) {
        throw new BadRequestException(
          `You can add up to ${MAX_SOCIAL_LINKS} social links.`,
        );
      }

      for (const item of raw.socials) {
        const entry = (item ?? {}) as Record<string, unknown>;

        const platform = cleanText(entry.platform, 40);
        const url = cleanUrl(entry.url);

        if (!platform && !entry.url) {
          continue;
        }

        if (!platform || !url) {
          throw new BadRequestException(
            'Each social link needs a name and a valid http(s) link.',
          );
        }

        socials.push({ platform, url });
      }
    }

    if (!website && socials.length === 0) {
      return null;
    }

    return {
      website,
      socials,
    };
  }

  private CleanPrivacy(value: unknown): UserPrivacy {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Invalid privacy settings.');
    }

    const raw = value as Record<string, unknown>;

    const privacy: UserPrivacy = { ...DEFAULT_PRIVACY };

    for (const key of Object.keys(DEFAULT_PRIVACY) as Array<
      keyof UserPrivacy
    >) {
      const level = raw[key];

      if (level === undefined) {
        continue;
      }

      if (!VISIBILITY_LEVELS.includes(level as ProfileVisibility)) {
        throw new BadRequestException(`Invalid visibility for ${key}.`);
      }

      privacy[key] = level as ProfileVisibility;
    }

    return privacy;
  }

  /*
   * ============================================================
   * SAVED ACCOUNTS
   * ============================================================
   */

  /**
   * Validate saved session tokens and return the
   * accounts they belong to. Invalid/expired tokens
   * and duplicates (same user) are dropped.
   */
  async ResolveSavedSessions(
    tokens: string[],
    activeToken?: string,
  ): Promise<{
    accounts: SavedAccountSummary[];
    validTokens: string[];
    tokenByUserId: Map<number, string>;
  }> {
    const accounts: SavedAccountSummary[] = [];
    const validTokens: string[] = [];
    const tokenByUserId = new Map<number, string>();

    for (const token of tokens) {
      const session = await this.findValidToken(token);

      if (!session?.user) {
        continue;
      }

      const user = session.user;

      if (tokenByUserId.has(user.userId)) {
        continue;
      }

      tokenByUserId.set(user.userId, token);
      validTokens.push(token);

      accounts.push({
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        publicId: user.publicId,
        isEmailVerified: user.isEmailVerified,
        isActive: token === activeToken,
      });
    }

    return {
      accounts,
      validTokens,
      tokenByUserId,
    };
  }
}
