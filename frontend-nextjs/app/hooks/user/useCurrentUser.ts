import API_ENDPOINTS from "@/app/routes/api";
import axios from "axios";
import { useEffect, useState } from "react";
import { User } from "./useAllUsers";

export const initialUser: User = {
    userId: null,
    fullName: null,
    phone: null,
    email: null,
    role: null,
    isEmailVerified: null,
};

const useCurrentUser = (userId: number | null): User => {
    const [user, setUser] = useState<User>(initialUser);

    useEffect(() => {
        // No user selected
        if (userId === null) {
            setUser(initialUser);
            return;
        }

        const fetchUserById = async () => {
            try {
                const response = await axios.get(
                    API_ENDPOINTS.GetUserById + Number(userId),
                    {
                        withCredentials: true,
                    }
                );

                if (response.data) {
                    setUser(response.data);
                } else {
                    setUser(initialUser);
                }
            } catch (error) {
                console.error("Failed to fetch user:", error);
                setUser(initialUser);
            }
        };

        fetchUserById();
    }, [userId]);

    return user;
};

export default useCurrentUser;