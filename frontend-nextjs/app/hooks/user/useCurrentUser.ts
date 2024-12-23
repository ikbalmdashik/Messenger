import API_ENDPOINTS from "@/app/routes/api";
import axios from "axios";
import { useEffect, useState } from "react";
import { User } from "./useAllUsers";

export const initialUser: User = {
    userId: null,
    fullName: null,
    phone: null,
    email: null,
    role: null
}

const useCurrentUser = (userId: number | null): User => {
    const [user, setUser] = useState<User>(initialUser);
    
    // fetch currently login data
    useEffect(() => {
        const FetchDataById = async (id: number) => {
            try {
                const response = await axios.get(API_ENDPOINTS.GetUserById + id);
                setUser(response.data);
            } catch (error) {
                console.log(error);
            }
        }

        if(userId != null) {
            FetchDataById(+userId);
        }
    }, [userId]);

    return user ;
}

export default useCurrentUser;