"use client"
import React from 'react'
import { SignUp } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';

const signup = () => {
    const searchParams = useSearchParams();
    const role = searchParams.get("role") || "customer";
    return (
        <div className='flex items-center justify-center h-screen w-full'>
            <SignUp routing='path' path='/sign-up' signInUrl='/sign-in'
                fallbackRedirectUrl='/'
                forceRedirectUrl={`/auth-callback?role=${role}`}
            />
        </div>
    )
}
export default signup;