const defaultURL = process.env.NEXT_PUBLIC_DEFAULT_API_URL

const API_ENDPOINTS = {
    // Default URL
    DefaultURL: defaultURL,

    // Auth related endpoints
    IsEmailExist: defaultURL + "/auth/isEmailExist",
    ValidateUser: defaultURL + "/auth/validateUser",
    Login: defaultURL + "/auth/login",
    Logout: defaultURL + "/auth/logout",
    SendPasswordResetLink: defaultURL + "/auth/sendPasswordResetLink",
    SendEmailVerificationLink: defaultURL + "/auth/sendEmailVerifyLink",
    ValidateLink: defaultURL + "/auth/validateLink",
    SendOtp: defaultURL + "/auth/sendOtp",
    VerifyOtp: defaultURL + "/auth/",
    UpdatePassword: defaultURL + "/auth/resetPassword",
    ResetPassword: defaultURL + "/",
    
    // User related endpoints
    CreateUser: defaultURL + "/auth/createUser",
    GetAllUsers: defaultURL + "/auth/getAllUsers",
    GetUserById: defaultURL + "/auth/getUser/",
    GetUserByToken: defaultURL + "/auth/getUserByToken",
    UpdateUser: defaultURL + "/auth/updateUser",
    DeleteUser: defaultURL + "/auth/deleteUser",

    // Chat related endpoints
    CreateChat: defaultURL + "/chat/createChat",
    GetChats: defaultURL + "/chat/getConversation"
}

export default API_ENDPOINTS;