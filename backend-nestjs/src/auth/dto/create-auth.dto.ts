export class CreateUserDto {
    userId: number;
    fullName: string;
    phone: string;
    email: string;
    publicId: string;
    password: string;
    role: string;
    isEmailVerified: boolean
}

export class LoginDto {
    email: string;
    password?: string;
    otp?: string;
}
