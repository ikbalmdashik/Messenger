"use client"

import API_ENDPOINTS from "@/app/routes/api";
import Routes from "@/app/routes/routes";
import axios from "axios";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm } from 'react-hook-form';

type FormData = {
    email: string;
    password: string;
};

const LoginComponent: React.FC = () => {
    const Router = useRouter();
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

    const AuthLogin = async (email: string, password: string) => {
        try {
            return await axios.post(API_ENDPOINTS.LoginAuth, {
                email: email,
                password: password
            });
        } catch (error) {
            console.log(error);
        }
    }

    const onSubmit = async (data: FormData) => {
        const result = await AuthLogin(data.email, data.password);
        if (result?.data.userId != null) {
            sessionStorage.setItem("loginId", `${result.data.userId}`);
            Router.push(Routes.Chat);
        } else {
            alert(result?.data.message);
        }
    };

    return (
        <>
            <div className="flex items-center justify-center min-h-screen">
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="border dark:border-white/20 border-black/30 rounded shadow-md w-full max-w-md"
                >
                    <div className="w-md grid grid-cols-9 border-b dark:border-white/20 border-black/30 mb-8">
                        <div className='w-10 h-10 col-span-1 absolute  rounded overflow-hidden'>
                            {/* <BackButton /> */}
                        </div>
                        <h2 className="col-span-8 text-2xl font-bold text-center py-2">Log In</h2>
                    </div>
                    <div className="mb-4 mx-8">
                        <label className="block mb-2 text-sm font-medium">Email</label>
                        <input
                            type="text"
                            placeholder="example@company.com"
                            {...register('email', {
                                required: 'Email is required',
                                pattern: { value: /\S+@\S+\.\S+/, message: 'Email is required in valid formate' }
                            })}
                            className={`bg-transparent h-10 outline outline-2 dark:outline-white/20 outline-black/30 duration-300 focus:outline-4 p-2 mb-1 w-full rounded ${errors.email ? 'outline-pink-700' : 'outline-white/20'}`}
                        />
                        {errors.email && <p className="text-pink-700 font-semibold text-sm">{errors.email.message}</p>}
                    </div>
                    <div className="mb-4 mx-8">
                        <label className="block mb-2 text-sm font-medium">Password</label>
                        <input
                            type="password"
                            placeholder="•••••••"
                            {...register('password', {
                                required: 'Password is required',
                                // pattern: { value: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+])[0-9a-zA-Z!@#$%^&*()_+]{8,}$/, message: "Password is required in valid formate" }
                            })}
                            className={`tracking-[5px] text-2xl h-10 bg-transparent outline outline-2 dark:outline-white/20 outline-black/30 duration-300 focus:outline-4 p-2 mb-1 w-full rounded ${errors.password ? 'outline-pink-700' : 'outline-white/20'}`}
                        />
                        {errors.password && <p className="text-pink-700 font-semibold text-sm">{errors.password.message}</p>}
                    </div>
                    <button
                        type="submit"
                        className="flex justify-center items-center gap-2 mx-8 w-[86%] bg-blue-500 text-white p-2 mb-2 rounded-md hover:bg-blue-600 transition"
                    >
                        Log In
                    </button>
                    <div className="flex items-center justify-center">
                        <hr className="flex-grow border-gray-500" />
                        <span className="mx-2 text-gray-500">Or</span>
                        <hr className="flex-grow border-gray-500" />
                    </div>
                    <button
                        type="button"
                        onClick={() => { Router.push(Routes.Register) }}
                        className="mx-8 mb-6 w-[86%] border dark:border-white/20 border-black/30 p-2 mt-2 rounded duration-300 dark:hover:bg-white/10 hover:bg-black/30"
                    >
                        Register
                    </button>
                </form>
            </div>
        </>
    );
}

export default LoginComponent;
