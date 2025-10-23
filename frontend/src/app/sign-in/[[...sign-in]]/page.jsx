"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useSignIn } from '@clerk/nextjs';

const Login = () => {
    const { isLoaded, signIn, setActive } = useSignIn();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isLoaded) {
        return null; // Or a loading spinner
    }

    // Email/Password sign-in
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await signIn.create({
                identifier: email,
                password,
            });

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId });
                // Redirect to home page after successful sign-in
                window.location.href = '/';
            } else {
                // Handle other states like 2FA if needed
                console.log(JSON.stringify(result, null, 2));
            }
        } catch (err) {
            console.error('Sign-in error:', JSON.stringify(err, null, 2));
            // You can add state to show an error message to the user here
        } finally {
            setIsLoading(false);
        }
    };

    // OAuth sign-in (Google/GitHub)
    const handleOAuth = async (provider) => {
        try {
            await signIn.authenticateWithRedirect({
                strategy: provider, // "oauth_google" | "oauth_github"
                redirectUrl: '/sso-callback',
                redirectUrlComplete: '/',
            });
        } catch (err) {
            console.error('OAuth error:', JSON.stringify(err, null, 2));
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-300 md:grid md:grid-cols-2">
            {/* Image - left on desktop, hidden on mobile */}
            <div className="relative hidden md:block">
                <img
                    src="/sign-in.jpg"
                    alt="Sign in"
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                />
            </div>

            {/* Form - right side */}
            <div className="flex items-center justify-center p-6 sm:p-10">
                <div className="w-full max-w-md rounded-2xl p-0 sm:p-2">
                    {/* Heading */}
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                        <p className="text-gray-400 text-sm mt-1">Sign in to continue to your account</p>
                    </div>

                    {/* Social Auth */}
                    <div className="flex flex-col gap-3 mb-6">
                        <button
                            onClick={() => handleOAuth("oauth_google")}
                            className="w-full flex items-center justify-center gap-2 border border-gray-700 rounded-lg py-2 hover:bg-gray-800 transition"
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                            <span className="text-sm font-medium text-gray-200">Continue with Google</span>
                        </button>
                        <button
                            onClick={() => handleOAuth("oauth_github")}
                            className="w-full flex items-center justify-center gap-2 border border-gray-700 rounded-lg py-2 hover:bg-gray-800 transition"
                        >
                            <img src="https://www.svgrepo.com/show/512317/github-142.svg" alt="GitHub" className="w-5 h-5 bg-white rounded-full" />
                            <span className="text-sm font-medium text-gray-200">Continue with GitHub</span>
                        </button>
                    </div>

                    <div className="relative flex items-center mb-6">
                        <div className="flex-grow border-t border-gray-700"></div>
                        <span className="mx-2 text-sm text-gray-500">OR</span>
                        <div className="flex-grow border-t border-gray-700"></div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition font-semibold disabled:bg-green-800 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Signing In..." : "Sign In"}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-sm text-gray-400 text-center mt-6">
                        Don&apos;t have an account?{' '}
                        <Link href="/sign-up" className="text-green-400 hover:underline font-medium">Sign Up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;