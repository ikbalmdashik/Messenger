const defaultURL = process.env.NEXT_PUBLIC_DEFAULT_API_URL

const API_ENDPOINTS = {
    // Default URL
    DefaultURL: defaultURL,

    // Auth related endpoints
    CreateUser: defaultURL + "/auth/createUser",
    IsEmailExist: defaultURL + "/auth/isEmailExist",
    LoginAuth: defaultURL + "/auth/loginAuth",
    
    // User related endpoints
    GetAllUsers: defaultURL + "/auth/getAllUsers",
    GetUserById: defaultURL + "/auth/getUser/",

    // Chat related endpoints
    CreateChat: defaultURL + "/chat/createChat",
    GetChats: defaultURL + "/chat/getConversation"
}

export default API_ENDPOINTS;