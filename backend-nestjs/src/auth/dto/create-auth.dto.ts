export class CreateAuthDto {}

export class CreateUserDto {
    userId: number;
    fullName: string;
    phone: string;
    email: string;
    password: string;
    role: string;
}

export class LoginDto {
    email: string;
    password: string;
}
