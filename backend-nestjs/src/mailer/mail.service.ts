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

export enum AuthLinkAction {
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  VERIFY_OTP = 'VERIFY_OTP',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

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
            secure: false,
            // service: this.configService.get('EMAIL_SERVICE'),
            auth: {
                user: this.configService.get('EMAIL_USER'),
                pass: this.configService.get('EMAIL_PASSWORD'),
            },
            family: 4
        });
    }

    private async generate_string(length: number) {
        const generateToken = customAlphabet(
            '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
            length,
        );

        return generateToken()
    }

    private async hash_string(string: string) {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(string, salt);
    }


    // Send Email
    async Send_Link(
        to: string,
        action: AuthLinkAction,
    ) {
        const token = await this.generate_string(128);

        const link = `${this.configService.get(
            'FRONTEND_URL',
        )}/pages/validation/${token}`;

        const mailOptions = {
            from: this.configService.get('EMAIL_USER'),
            to,

            subject:
                action === AuthLinkAction.RESET_PASSWORD
                    ? 'Reset Your Password'
                    : 'Verify Your Email',

            html: await Email_Template({
                action,
                link,
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
                action === AuthLinkAction.VERIFY_EMAIL &&
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
                    action === AuthLinkAction.VERIFY_EMAIL
                        ? 'Verification email sent'
                        : 'Password reset email sent'
            };
        } catch (error) {
            throw new Error(
                `Error sending email: ${error instanceof Error ? error.message : error}`,
            );
        }
    }

    async send_otp(to: string, action: AuthLinkAction) {
        const otp = await this.generate_string(16);

        const mailOptions = {
            from: this.configService.get('EMAIL_USER'),
            to,

            subject: "Please Verify Your Identity",

            html: await Email_Template({ action: AuthLinkAction.VERIFY_OTP, otp: otp })
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
                otpHash: await this.hash_string(otp),
                usedFor: action,
                expiresAt: new Date(Date.now() + 1000 * 60 * 15),
                createdAt: new Date()
            });

            await this.transporter.sendMail(mailOptions);

            return new_otp_entity;

        } catch (error) {

        }

    }
}