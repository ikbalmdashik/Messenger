import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer'
import * as nodemailer from 'nodemailer'
import { Email_Template } from './email.template';
import { AuthOtpEntity, AuthTokenEntity, UsersEntity } from 'src/auth/entities/auth.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { customAlphabet } from 'nanoid';
import * as bcrypt from 'bcrypt';

@Injectable()
export class MailService {
    private readonly transporter: Transporter;

    constructor(
        private configService: ConfigService,
        @InjectRepository(AuthTokenEntity)
        private auth_repo: Repository<AuthTokenEntity>,

        @InjectRepository(UsersEntity)
        private user_repo: Repository<UsersEntity>,

        @InjectRepository(AuthOtpEntity)
        private otp_einity: Repository<AuthOtpEntity>

    ) {
        // Initialize transporter
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('EMAIL_SERVICE'),
            port: this.configService.get('EMAIL_PORT'),
            // service: this.configService.get('EMAIL_SERVICE'),
            auth: {
                user: this.configService.get('EMAIL_USER'),
                pass: this.configService.get('EMAIL_PASSWORD'),
            },
        });
    }

    async generate_string(length: number) {
        const generateToken = customAlphabet(
            '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
            length,
        );

        return generateToken()
    }


    // Send Email
    async Send_Link(
        to: string,
        action: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'VERIFY_OTP',
    ) {
        const tokenLength = action === 'VERIFY_OTP' ? 8 : 64;

        const token = await this.generate_string(tokenLength);

        const link = `${this.configService.get(
            'FRONTEND_URL',
        )}/pages/validation/${token}`;

        const mailOptions = {
            from: this.configService.get('EMAIL_USER'),
            to,

            subject:
                action === 'RESET_PASSWORD'
                    ? 'Reset Your Password'
                    : action === 'VERIFY_OTP'
                        ? 'Login Verification'
                        : 'Verify Your Email',

            html: await Email_Template({
                action,
                link,
                otp: action === 'VERIFY_OTP' ? token : undefined,
            }),
        };

        try {
            const user = await this.user_repo.findOneBy({
                email: to,
            });

            if (!user) {
                throw new Error('User not found');
            }

            if (
                action === 'VERIFY_EMAIL' &&
                user.isEmailVerified === true
            ) {
                return {
                    message: 'Email is already verified.',
                };
            }

            await this.auth_repo.save({
                userId: user.userId,
                token: token,
                usedFor: action,
                createdAt: new Date(),
                expiresAt: new Date(
                    Date.now() + 1000 * 60 * 15,
                ),
                used: false,
            });

            await this.transporter.sendMail(mailOptions);

            return {
                success: true,
                message:
                    action === 'VERIFY_EMAIL'
                        ? 'Verification email sent'
                        : action === 'RESET_PASSWORD'
                            ? 'Password reset email sent'
                            : 'Login verification code sent',
            };
        } catch (error) {
            throw new Error(
                `Error sending email: ${error instanceof Error ? error.message : error}`,
            );
        }
    }

      private async hash_string(string: string) {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(string, salt);
      }

    async send_otp(to: string) {
        const otp = await this.generate_string(8);

        const mailOptions = {
            from: this.configService.get('EMAIL_USER'),
            to,

            subject: "Please Verify Your Identity",

            html: await Email_Template({ action: "VERIFY_OTP", otp: otp })
        };

        try {
            const user = await this.user_repo.findOneBy({
                email: to,
            });

            if (!user) {
                throw new Error('User not found');
            }

            const new_otp_entity = await this.otp_einity.save({
                userId: user.userId,
                user: user,
                otpHash: await this.hash_string(otp) ,
                usedFor: "unused!",
                expiresAt: new Date(Date.now() + 1000 * 60 * 15),
                createdAt: new Date()
            });

            await this.transporter.sendMail(mailOptions);

            return new_otp_entity;

        } catch (error) {
            
        }

    }
}