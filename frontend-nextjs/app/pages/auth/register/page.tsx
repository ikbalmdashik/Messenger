import RegisterComponent from "@/app/components/auth/register/register";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Register"
}

const Register = () => {
    return(
        <>
            <RegisterComponent />
        </>
    );
}

export default Register;