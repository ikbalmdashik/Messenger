import API_ENDPOINTS from "@/app/routes/api";
import axios from "axios";
import { useEffect, useState } from "react";

export interface User {
    userId: number | null;
    fullName: string | null;
    phone: string | null;
    email: string | null;
    role: string | null;
}

const useAllUsers = () => {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    // fetch currently login data
    useEffect(() => {
        const userId = sessionStorage.getItem("loginId");

        const FetchDataById = async () => {
            try {
                const response = await axios.get(API_ENDPOINTS.GetAllUsers);
                setAllUsers(response.data);
            } catch (error) {
                console.log(error);
            }
        }

        if(userId != null) {
            FetchDataById();
        }
    }, []);

    return allUsers ;
}

export default useAllUsers;