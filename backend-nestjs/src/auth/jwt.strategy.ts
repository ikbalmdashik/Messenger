import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  PassportStrategy,
} from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

  constructor(
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Cookie
        (request: any) => {
          return request?.cookies?.access_token;
        },

        // Authorization: Bearer <token>
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),

      ignoreExpiration: false,

      secretOrKey: process.env.JWT_SECRET || 'yourSecretKey',

      // IMPORTANT
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    payload: any,
  ) {

    // ==========================================
    // 1. Get token from request
    // ==========================================

    const token =
      request.cookies?.access_token ||
      request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }


    // ==========================================
    // 2. Check token in database
    // ==========================================

    const dbToken = await this.authService.findValidToken(token);

    if (!dbToken) {
      throw new UnauthorizedException(
        'Token is invalid or has been revoked',
      );
    }

    // ==========================================
    // 3. Return authenticated user
    // ==========================================

    return dbToken.user;
  }
}