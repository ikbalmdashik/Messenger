import API_ENDPOINTS from "@/app/routes/api";
import axios from "axios";
import { useEffect, useState } from "react";

export interface User {
  userId: number | null;
  fullName: string | null;
  phone: string | null;
  email: string | null;
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

        console.log("GetAllUsers response:", response.data);

        if (Array.isArray(response.data)) {
          setAllUsers(response.data);
        } else {
          console.error(
            "GetAllUsers response is not an array:",
            response.data
          );

          setAllUsers([]);
        }
      } catch (error) {
        console.error("Failed to fetch all users:", error);
        setAllUsers([]);
      }
    };

    fetchAllUsers();
  }, []);

  return allUsers;
};

export default useAllUsers;