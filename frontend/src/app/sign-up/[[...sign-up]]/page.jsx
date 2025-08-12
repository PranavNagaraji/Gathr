"use client"
import React, { useState } from 'react'
import { SignUp } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import {
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Typography,
    Box,
} from '@mui/material';
const roles = ['customer', 'merchant', 'carrier'];

const signup = () => {
    const searchParams = useSearchParams();
    const [role, setRole] = useState('customer');
    return (
        <div className='flex flex-wrap items-center justify-center h-screen w-full gap-5'>
            <SignUp routing='path' path='/sign-up' signInUrl='/sign-in'
                fallbackRedirectUrl='/'
                forceRedirectUrl={`/auth-callback?role=${role}`}
            />
            <div className="flex flex-col items-center p-6 rounded-xl shadow-md bg-[#fff] w-100 mt-8">
                <Typography
                    variant="h5"
                    sx={{
                        color: 'black',
                        fontWeight: 600,
                        mb: 2,
                        fontFamily: 'Outfit, sans-serif',
                    }}
                >
                    Select your role
                </Typography>

                <FormControl sx={{ width: '100%' }}>
                    <RadioGroup
                        name="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                    >
                        {roles.map((r) => (
                            <FormControlLabel
                                key={r}
                                value={r}
                                control={
                                    <Radio
                                        sx={{
                                            color: '#6366f1',
                                            '&.Mui-checked': {
                                                color: '#6366f1',
                                            },
                                        }}
                                    />
                                }
                                label={
                                    <span className="capitalize text-gray-800">{r}</span>
                                }
                                sx={{
                                    mb: 1,
                                    px: 2,
                                    py: 1,
                                    borderRadius: 2,
                                    border: role === r ? '2px solid #6366f1' : '1px solid #e5e7eb',
                                    transition: '0.2s ease',
                                    '&:hover': {
                                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
                                    },
                                }}
                            />
                        ))}
                    </RadioGroup>
                </FormControl>
            </div>
        </div>
    )
}
export default signup;