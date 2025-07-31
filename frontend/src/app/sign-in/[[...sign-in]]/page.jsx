import React from 'react'
import { SignIn } from '@clerk/nextjs';

const Login = () => {
return (
    <section className="flex items-center justify-center h-screen w-full">
        <SignIn routing='path' path='/sign-in' signUpUrl='/sign-up'
            fallbackRedirectUrl='/'
            forceRedirectUrl='/'
        />
    </section>
)
}
export default Login