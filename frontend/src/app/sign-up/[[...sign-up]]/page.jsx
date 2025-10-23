"use client";
import React, { useState } from "react";
import { useSignUp } from "@clerk/nextjs";

const roles = [
  { value: "customer", label: "Customer - Shop and buy products" },
  { value: "merchant", label: "Merchant - Sell products" },
  { value: "carrier", label: "Carrier - Deliver orders" },
];

const Signup = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [role, setRole] = useState("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

  if (!isLoaded) return null;

  // Email/Password signup
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signUp.create({
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      console.error("Error:", JSON.stringify(err, null, 2));
    }
  };

  // Email verification
  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        window.location.href = `/auth-callback?role=${role}`;
      }
    } catch (err) {
      console.error("Verification error:", JSON.stringify(err, null, 2));
    }
  };

  // OAuth signup (Google/GitHub)
  const handleOAuth = async (provider) => {
    try {
      await signUp.authenticateWithRedirect({
        strategy: provider, // "oauth_google" | "oauth_github"
        redirectUrl: "/auth-callback?role=" + role,
        redirectUrlComplete: `/auth-callback?role=${role}`,
      });
    } catch (err) {
      console.error("OAuth error:", JSON.stringify(err, null, 2));
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 md:grid md:grid-cols-2">
      <div className="flex items-center justify-center px-8 sm:px-12 lg:px-20">
        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white">Create your account</h2>
            <p className="text-gray-400 text-sm mt-1">
              Sign up with email, social account, and choose your role
            </p>
          </div>

          {/* Social Auth */}
          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={() => handleOAuth("oauth_google")}
              className="w-full flex items-center justify-center gap-2 border border-gray-700 rounded-lg py-2 hover:bg-gray-800 transition"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
              />
              <span className="text-sm font-medium text-gray-200">
                Continue with Google
              </span>
            </button>
            <button
              onClick={() => handleOAuth("oauth_github")}
              className="w-full flex items-center justify-center gap-2 border border-gray-700 rounded-lg py-2 hover:bg-gray-800 transition"
            >
              <img
                src="https://www.svgrepo.com/show/512317/github-142.svg"
                alt="GitHub"
                className="w-5 h-5 bg-white rounded-full" // Added bg and rounded for better visibility
              />
              <span className="text-sm font-medium text-gray-200">
                Continue with GitHub
              </span>
            </button>
          </div>

          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t border-gray-700"></div>
            <span className="mx-2 text-sm text-gray-500">OR</span>
            <div className="flex-grow border-t border-gray-700"></div>
          </div>

          {!pendingVerification ? (
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

              {/* Role selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300">Select Role</label>
                <div className="relative mt-1">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full appearance-none px-3 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:bg-gray-800/90 transition"
                  >
                    {roles.map((r) => (
                      <option key={r.value} value={r.value} className="bg-gray-800 text-white">
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-gray-400">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                    </svg>
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  {roles.find((r) => r.value === role)?.label}
                </p>
              </div>

              {/* Clerk Smart CAPTCHA mount point */}
              <div id="clerk-captcha"></div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition font-semibold"
              >
                Sign Up with Email
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Enter verification code sent to {email}
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition font-semibold"
              >
                Verify & Continue
              </button>
            </form>
          )}

          {/* Footer */}
          <p className="text-xs text-gray-500 text-center mt-6">
            already have an account?{" "}
            <a href="/sign-in" className="text-green-500 hover:underline">Sign In</a>
          </p>
        </div>
      </div>
      <div className="relative hidden md:block">
        <img
          src="/sign-up.jpg"
          alt="Sign up"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default Signup;