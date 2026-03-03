import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer'
import * as nodemailer from 'nodemailer'
import { Email_Template } from './email.template';
import { AuthTokenEntity, UsersEntity } from 'src/auth/entities/auth.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { customAlphabet } from 'nanoid';

@Injectable()
export class MailService {
    private readonly transporter: Transporter;

    constructor(
        private configService: ConfigService,
        @InjectRepository(AuthTokenEntity)
        private auth_repo: Repository<AuthTokenEntity>,

        @InjectRepository(UsersEntity)
        private user_repo: Repository<UsersEntity>,

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


    // Send Email
    async Send_Link(to: string, type: 'VERIFY_EMAIL' | 'RESET_PASSWORD') {
        const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 64);
        const token = nanoid();
        const link = `${this.configService.get("FRONTEND_URL")}/pages/validation/${token}`;

        const mailOptions = {
            from: this.configService.get('EMAIL_USER'),
            to,
            subject: `Request For ${type == "RESET_PASSWORD" ? "Rest Password." : "Verify Email."}`,
            html: await Email_Template(type, link)
        };

        try {
            const user = await this.user_repo.findOneBy({ email: to });

            if (type === "VERIFY_EMAIL" && user.isEmailVerified === true) {
                return { message: "Email is already verified." }
            } else {
                await this.auth_repo.save({
                    userId: user.userId,
                    token: token,
                    type: type,
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + 1000 * 60 * 15),
                });

                await this.transporter.sendMail(mailOptions);

                return {
                    message:
                        type === 'VERIFY_EMAIL'
                            ? 'Verification email sent'
                            : 'Password reset email sent',
                }
            }
        } catch (error) {
            throw new Error(`Error sending email: ${error.message}`);
        }
    }
}