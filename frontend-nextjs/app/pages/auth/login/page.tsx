import LoginComponent from "@/app/components/auth/login/login";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login"
}

const Login = () => {
    return(
        <>
            <LoginComponent />
        </>
    );
}

export default Login;