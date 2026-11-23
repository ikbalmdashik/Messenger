import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, Query, Res, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService, ValidateLinkOptions } from './auth.service';
import { CreateUserDto, LoginDto } from './dto/create-auth.dto';
import { AuthLinkAction, MailService } from 'src/mailer/mail.service';
import { Request, Response } from 'express';
import { ResetPasswordDto } from './dto/update-auth.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './auth.guard';
import { CookieOptions } from 'express';

/**
 * Same attributes for setting and clearing,
 * otherwise browsers may keep the old cookie.
 */
const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
};

const ACCESS_TOKEN_MAX_AGE = 1 * 24 * 60 * 60 * 1000;

/**
 * HTTP-only list of session tokens for every
 * account signed in on this browser.
 */
const SAVED_SESSIONS_COOKIE = 'saved_sessions';
const SAVED_SESSIONS_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const MAX_SAVED_ACCOUNTS = 5;

const readSavedTokens = (request: Request): string[] => {
  const raw = request.cookies?.[SAVED_SESSIONS_COOKIE];

  if (!raw || typeof raw !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(
          (token): token is string =>
            typeof token === 'string' && token.length > 0,
        )
      : [];
  } catch {
    return [];
  }
};

const writeSavedTokens = (response: Response, tokens: string[]) => {
  const unique = [...new Set(tokens)].slice(0, MAX_SAVED_ACCOUNTS);

  if (unique.length === 0) {
    response.clearCookie(SAVED_SESSIONS_COOKIE, AUTH_COOKIE_OPTIONS);
    return;
  }

  response.cookie(SAVED_SESSIONS_COOKIE, JSON.stringify(unique), {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: SAVED_SESSIONS_MAX_AGE,
  });
};

/**
 * Accounts that logged in on this browser, kept
 * after logout so the login page can list them.
 * Signed, so the list can't be edited to reveal
 * other users.
 */
const REMEMBERED_COOKIE = 'remembered_accounts';
const REMEMBERED_MAX_AGE = 180 * 24 * 60 * 60 * 1000;
const MAX_REMEMBERED = 10;

const setAccessToken = (response: Response, token: string) => {
  response.cookie('access_token', token, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly mailService: MailService, private readonly jwtService: JwtService) { }

  private readRemembered(request: Request): number[] {
    const raw = request.cookies?.[REMEMBERED_COOKIE];

    if (!raw || typeof raw !== 'string') {
      return [];
    }

    try {
      const payload = this.jwtService.verify<{ ids?: unknown }>(raw, {
        secret: process.env.JWT_SECRET,
      });

      return Array.isArray(payload.ids)
        ? payload.ids
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0)
        : [];
    } catch {
      return [];
    }
  }

  private writeRemembered(response: Response, ids: number[]) {
    const unique = [...new Set(ids)].slice(0, MAX_REMEMBERED);

    if (unique.length === 0) {
      response.clearCookie(REMEMBERED_COOKIE, AUTH_COOKIE_OPTIONS);
      return;
    }

    const value = this.jwtService.sign(
      { ids: unique },
      { secret: process.env.JWT_SECRET, expiresIn: '180d' },
    );

    response.cookie(REMEMBERED_COOKIE, value, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: REMEMBERED_MAX_AGE,
    });
  }

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
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // 1. Validate token and get user details
    const forwarded = request.headers['x-forwarded-for'];

    const result = await this.authService.validateTokenAndLogin(token, {
      userAgent: request.headers['user-agent'],
      ipAddress:
        (Array.isArray(forwarded) ? forwarded[0] : forwarded)
          ?.split(',')[0]
          ?.trim() || request.ip,
    });

    if (!result || !result.userId) {
      throw new UnauthorizedException('Invalid token');
    }

    // 2. Make the new session the active one
    setAccessToken(response, result.access_token);

    // 3. Remember it (and the previously active session,
    //    if any) so the user can switch between accounts.
    const previousToken = request.cookies?.access_token;

    const { validTokens } =
      await this.authService.ResolveSavedSessions([
        result.access_token,
        ...(previousToken ? [previousToken] : []),
        ...readSavedTokens(request),
      ]);

    writeSavedTokens(response, validTokens);

    this.writeRemembered(response, [
      result.userId,
      ...this.readRemembered(request),
    ]);

    return {
      user: result.userId,
      access_token: result.access_token
    };
  }

  /**
   * Log out the active account. Other saved accounts
   * stay signed in, but none becomes active: the user
   * picks one on the login page.
   *
   * Not guarded, so an already-expired session can
   * still be cleared from the browser.
   */
  @Post('/logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = request.cookies?.access_token;

    if (token) {
      await this.authService.logout(token);
    }

    const { validTokens } = await this.authService.ResolveSavedSessions(
      readSavedTokens(request).filter((saved) => saved !== token),
    );

    writeSavedTokens(response, validTokens);
    response.clearCookie('access_token', AUTH_COOKIE_OPTIONS);

    return {
      success: true,
      message: token ? 'Logged out successfully' : 'Already logged out',
      switchedTo: null,
    };
  }

  /**
   * Accounts signed in on this browser.
   */
  @Post('/savedAccounts')
  async savedAccounts(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const activeToken = request.cookies?.access_token;

    const savedTokens = readSavedTokens(request);

    const { accounts, validTokens } =
      await this.authService.ResolveSavedSessions(
        [
          ...(activeToken ? [activeToken] : []),
          ...savedTokens,
        ],
        activeToken,
      );

    // Drop expired sessions from the cookie.
    if (validTokens.join() !== savedTokens.join()) {
      writeSavedTokens(response, validTokens);
    }

    const signedInIds = new Set(accounts.map((account) => account.userId));

    const remembered = await this.authService.ResolveRememberedAccounts([
      ...new Set(this.readRemembered(request)),
    ]);

    // Signed-in accounts first, then ones that need a password.
    const all = [
      ...accounts.map((account) => ({ ...account, isSignedIn: true })),
      ...remembered
        .filter((user) => !signedInIds.has(user.userId))
        .map((user) => ({
          userId: user.userId,
          fullName: user.fullName,
          email: user.email,
          publicId: user.publicId,
          isEmailVerified: user.isEmailVerified,
          isActive: false,
          isSignedIn: false,
        })),
    ];

    this.writeRemembered(
      response,
      all.map((account) => account.userId),
    );

    return { accounts: all };
  }

  /**
   * Make a saved account the active one.
   */
  @Post('/switchAccount')
  async switchAccount(
    @Body('userId') userId: number,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const activeToken = request.cookies?.access_token;

    const { tokenByUserId, validTokens } =
      await this.authService.ResolveSavedSessions([
        ...(activeToken ? [activeToken] : []),
        ...readSavedTokens(request),
      ]);

    const token = tokenByUserId.get(Number(userId));

    if (!token) {
      writeSavedTokens(response, validTokens);

      throw new UnauthorizedException(
        'That account is no longer signed in. Please log in again.',
      );
    }

    setAccessToken(response, token);
    writeSavedTokens(response, validTokens);

    return { success: true, userId: Number(userId) };
  }

  /**
   * Sign a saved (non-active) account out of this browser.
   */
  @Post('/removeSavedAccount')
  async removeSavedAccount(
    @Body('userId') userId: number,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const activeToken = request.cookies?.access_token;

    const { tokenByUserId, validTokens } =
      await this.authService.ResolveSavedSessions([
        ...(activeToken ? [activeToken] : []),
        ...readSavedTokens(request),
      ]);

    const token = tokenByUserId.get(Number(userId));

    if (!token) {
      writeSavedTokens(response, validTokens);
      return { success: true };
    }

    if (token === activeToken) {
      throw new BadRequestException(
        'Use log out to remove the active account.',
      );
    }

    await this.authService.logout(token);

    writeSavedTokens(
      response,
      validTokens.filter((saved) => saved !== token),
    );

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('/myProfile')
  async myProfile(@Req() request: Request & { user: { userId: number } }) {
    return this.authService.GetMyProfile(request.user.userId);
  }

  /**
   * Requires a one-time `verificationToken` from
   * /auth/validateUser; nothing changes without it.
   */
  @UseGuards(JwtAuthGuard)
  @Post('/updateMyProfile')
  async updateMyProfile(
    @Req() request: Request & { user: { userId: number } },
    @Body()
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
    return this.authService.UpdateMyProfile(request.user.userId, {
      verificationToken: body?.verificationToken,
      fullName: body?.fullName,
      phone: body?.phone,
      address: body?.address,
      education: body?.education,
      contact: body?.contact,
      privacy: body?.privacy,
    });
  }

  /**
   * Remove the current session from this browser's
   * cookies after the account stops being usable.
   */
  private async signOutHere(request: Request, response: Response) {
    const token = request.cookies?.access_token;

    const { validTokens } = await this.authService.ResolveSavedSessions(
      readSavedTokens(request).filter((saved) => saved !== token),
    );

    writeSavedTokens(response, validTokens);
    response.clearCookie('access_token', AUTH_COOKIE_OPTIONS);
  }

  /**
   * Remove an account from this browser entirely:
   * signs it out (if signed in) and forgets it.
   */
  @Post('/forgetAccount')
  async forgetAccount(
    @Body('userId') userId: number,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const target = Number(userId);
    const activeToken = request.cookies?.access_token;

    const { tokenByUserId, validTokens } =
      await this.authService.ResolveSavedSessions([
        ...(activeToken ? [activeToken] : []),
        ...readSavedTokens(request),
      ]);

    const token = tokenByUserId.get(target);

    if (token && token === activeToken) {
      throw new BadRequestException(
        'Log out of this account before removing it.',
      );
    }

    if (token) {
      await this.authService.logout(token);
    }

    writeSavedTokens(
      response,
      validTokens.filter((saved) => saved !== token),
    );

    this.writeRemembered(
      response,
      this.readRemembered(request).filter((id) => id !== target),
    );

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('/reactivateMyAccount')
  async reactivateMyAccount(
    @Req() request: Request & { user: { userId: number } },
    @Body('verificationToken') verificationToken: unknown,
  ) {
    return this.authService.ReactivateMyAccount(
      request.user.userId,
      verificationToken,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('/deleteMyAccount')
  async deleteMyAccount(
    @Req() request: Request & { user: { userId: number } },
    @Body('verificationToken') verificationToken: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.DeleteMyAccount(
      request.user.userId,
      verificationToken,
    );

    await this.signOutHere(request, response);

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('/deactivateMyAccount')
  async deactivateMyAccount(
    @Req() request: Request & { user: { userId: number } },
    @Body('verificationToken') verificationToken: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.DeactivateMyAccount(
      request.user.userId,
      verificationToken,
    );

    await this.signOutHere(request, response);

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('/sessions')
  async sessions(@Req() request: Request & { user: { userId: number } }) {
    return this.authService.ListSessions(
      request.user.userId,
      request.cookies?.access_token,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('/sessions/revoke')
  async revokeSession(
    @Req() request: Request & { user: { userId: number } },
    @Body('sessionId') sessionId: number,
    @Body('verificationToken') verificationToken: unknown,
  ) {
    return this.authService.RevokeSession(
      request.user.userId,
      Number(sessionId),
      verificationToken,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('/sessions/revokeOthers')
  async revokeOtherSessions(
    @Req() request: Request & { user: { userId: number } },
    @Body('verificationToken') verificationToken: unknown,
  ) {
    return this.authService.RevokeOtherSessions(
      request.user.userId,
      request.cookies?.access_token,
      verificationToken,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('/groupSettings')
  async groupSettings(@Req() request: Request & { user: { userId: number } }) {
    return this.authService.GetGroupSettings(request.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/updateGroupSettings')
  async updateGroupSettings(
    @Req() request: Request & { user: { userId: number } },
    @Body()
    body: {
      verificationToken?: unknown;
      defaults?: unknown;
      whoCanAddMe?: unknown;
    },
  ) {
    return this.authService.UpdateGroupSettings(request.user.userId, {
      verificationToken: body?.verificationToken,
      defaults: body?.defaults,
      whoCanAddMe: body?.whoCanAddMe,
    });
  }

  @Post('/sendEmailVerifyLink')
  async sendEmailVerifyLink(@Body('email') email: string) {
    return await this.mailService.Send_Link(email, AuthLinkAction.VERIFY_EMAIL);
  }

  @Post('/sendPasswordResetLink')
  async sendPasswordResetLink(@Body('email') email: string) {
    return await this.mailService.Send_Link(email, AuthLinkAction.RESET_PASSWORD);
  }

  @Post('/sendOtp')
  async sendOtp(@Body('email') email: string) {
    return await this.mailService.send_otp(email, AuthLinkAction.VERIFY_OTP);
  }

  @Post('/validateLink')
  async validateLink(@Body() option: ValidateLinkOptions) {
    if (!option.token) {
      throw new BadRequestException('Token is required');
    }
    const result = await this.authService.validateLink(option);
    return result;
  }

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

  @UseGuards(JwtAuthGuard)
  @Post('/getUserByToken')
  async getUserByToken(@Req() req: Request) {
    const token = req.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException('Authentication cookie not found');
    }

    return await this.authService.getUserByToken(token);
  }

  @Post('/searchByPublicId')
  async searchUsers(
    @Body('publicId') publicId: string,
  ) {
    return this.authService.searchByPublicId(publicId);
  }

  /**
   * Public, but the viewer (if signed in) decides
   * which privacy-restricted sections are shown.
   */
  @Post('/getUserByPublicId')
  async GetDataByPublicId(
    @Body('publicId') publicId: string,
    @Req() request: Request,
  ) {
    const token = request.cookies?.access_token;

    const session = token
      ? await this.authService.findValidToken(token)
      : null;

    return this.authService.GetDataByPublicId(
      publicId,
      session?.userId ?? null,
    );
  }
}
