'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase.js';
import { Button, TextField, Typography, Box, Paper } from '@mui/material';
import axios from 'axios';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function CreateCarrier() {
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const router = useRouter();

  const [form, setForm] = useState({
    phone: '',
    otp: '',
    otpSent: false,
    isVerified: false,
    licenseNumber: '',
    aadharNumber: '',
    bankAccount: '',
    profilePic: null,
  });
  const [preview, setPreview] = useState(null);
  const recaptchaRef = useRef(null);
  const [confirmationResult, setConfirmationResult] = useState(null);

  useEffect(() => {
    if (!auth) return;

    if (!window.recaptchaVerifier && recaptchaRef.current) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: 'invisible',
      });
    }
  }, [auth]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, profilePic: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const sendOtp = async () => {
    if (!form.phone) return alert('Enter phone number');
    let phoneNumber = form.phone;

    if (process.env.NODE_ENV === 'development') {
      phoneNumber = '+919999999999'; // Replace with a valid Firebase test number
      alert('Using test number in dev mode. OTP is 123456');
      setForm({ ...form, otpSent: true });
      return;
    }

    try {
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setForm({ ...form, otpSent: true });
      alert('OTP sent!');
    } catch (err) {
      console.error(err);
      alert('Failed to send OTP. Check the phone number format (+91...) or try again.');
    }
  };

  const verifyOtp = async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        if (form.otp === '123456') {
          setForm({ ...form, isVerified: true });
          alert('Phone verified ✅ (dev test number)');
          return;
        } else {
          alert('Invalid OTP for test number ❌');
          return;
        }
      }

      if (confirmationResult) {
        await confirmationResult.confirm(form.otp);
        setForm({ ...form, isVerified: true });
        alert('Phone verified ✅');
      }
    } catch (err) {
      console.error(err);
      alert('Invalid OTP ❌');
    }
  };

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.isVerified) return alert('Please verify your phone number first!');

    const formData = new FormData();
    formData.append('phone', form.phone);
    formData.append('licenseNumber', form.licenseNumber);
    formData.append('aadharNumber', form.aadharNumber);
    formData.append('bankAccount', form.bankAccount || '');
    formData.append('verified', form.isVerified);

    let imageData = null;
    if (form.profilePic) {
      if (typeof form.profilePic === "string" && form.profilePic.startsWith("http")) {
        imageData = form.profilePic;
      } else {
        imageData = await toBase64(form.profilePic);
      }
    }

    const carrierData = {
      phone: form.phone,
      licenseNumber: form.licenseNumber,
      aadharNumber: form.aadharNumber,
      bankAccount: form.bankAccount,
      verified: form.isVerified,
    };

    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/api/delivery/updateCarrier`,
        {carrierData: carrierData, clerkId: user.id, profile: imageData},
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert('Carrier created successfully!');
      router.push('/carrier/dashboard'); 
    } catch (error) {
      console.error('Error creating carrier:', error);
      alert('Failed to create carrier. Please try again.');
    }
  };

  return (
    <Box className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <Paper className="w-full max-w-md p-6 rounded-3xl shadow-lg">
        <Typography variant="h4" className="text-center mb-6 font-bold">
          Create Carrier
        </Typography>

        {!form.isVerified ? (
          <Box className="flex flex-col gap-4">
            <TextField
              label="Phone Number"
              placeholder="+91XXXXXXXXXX"
              value={form.phone}
              name="phone"
              onChange={handleChange}
              fullWidth
              variant="outlined"
              disabled={form.otpSent}
            />

            {!form.otpSent ? (
              <Button variant="contained" onClick={sendOtp} fullWidth>
                Send OTP
              </Button>
            ) : (
              <>
                <TextField
                  label="Enter OTP"
                  value={form.otp}
                  name="otp"
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                />
                <Button variant="contained" color="success" onClick={verifyOtp} fullWidth>
                  Verify OTP
                </Button>
              </>
            )}
          </Box>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField
              label="License Number"
              value={form.licenseNumber}
              name="licenseNumber"
              onChange={handleChange}
              fullWidth
              variant="outlined"
              required
            />

            <TextField
              label="Aadhar Number"
              value={form.aadharNumber}
              name="aadharNumber"
              onChange={handleChange}
              fullWidth
              variant="outlined"
              required
            />

            <TextField
              label="Bank Account (optional)"
              value={form.bankAccount}
              name="bankAccount"
              onChange={handleChange}
              fullWidth
              variant="outlined"
            />

            <Box>
              <Button variant="contained" component="label" fullWidth>
                Upload Profile Picture
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImage}
                />
              </Button>
              {preview && (
                <Box className="mt-4 flex justify-center">
                  <Image
                    src={preview}
                    alt="Profile Preview"
                    width={120}
                    height={120}
                    className="rounded-full object-cover"
                  />
                </Box>
              )}
            </Box>

            <Button type="submit" variant="contained" color="success" fullWidth>
              Create Carrier
            </Button>
          </form>
        )}

        <div ref={recaptchaRef} id="recaptcha-container" className="mt-4"></div>
      </Paper>
    </Box>
  );
}