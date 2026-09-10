import API_ENDPOINTS from "@/app/routes/api";
import axios from "axios";
import { useEffect, useState } from "react";

export interface User {
  userId: number | null;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  publicId: string | null;
  role: string | null;
  isEmailVerified: boolean | null;
}

const useAllUsers = (): User[] => {
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const response = await axios.get(
          API_ENDPOINTS.GetAllUsers,
          {
            withCredentials: true,
          }
        );

        if (Array.isArray(response.data)) {
          setAllUsers(response.data);
        } else {
          console.log(
            "GetAllUsers response is not an array:",
            response.data
          );

          setAllUsers([]);
        }
      } catch (error) {
        console.log("Failed to fetch all users:", error);
        setAllUsers([]);
      }
    };

    fetchAllUsers();
  }, []);

  return allUsers;
};

export default useAllUsers;