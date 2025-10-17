'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button, TextField, Typography, Box, Paper } from '@mui/material';
import axios from 'axios';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function UpdateCarrier() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [form, setForm] = useState({
    phone: '',
    licenseNumber: '',
    aadharNumber: '',
    bankAccount: '',
    profilePic: null,
  });
  const [preview, setPreview] = useState(null);

  // Fetch carrier info on mount
  useEffect(() => {
    const fetchCarrier = async () => {
      if (!user) return;
      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/api/delivery/getCarrier/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data.carrier.delivery_details || {};
        setForm({
          phone: data.phone || '',
          licenseNumber: data.licenseNumber || '',
          aadharNumber: data.aadharNumber || '',
          bankAccount: data.bankAccount || '',
          profilePic: data.profile || null,
        });
        console.log(res.data.carrier.delivery_details);
        setPreview(data.profile?.url || null);
      } catch (error) {
        console.error('Error fetching carrier:', error);
      }
    };
    fetchCarrier();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm((prev) => ({ ...prev, profilePic: file }));
      setPreview(URL.createObjectURL(file));
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

    let imageData = form.profilePic;
    if (form.profilePic && typeof form.profilePic !== 'string' && !form.profilePic.url) {
      imageData = await toBase64(form.profilePic);
    }

    const carrierData = {
      licenseNumber: form.licenseNumber,
      bankAccount: form.bankAccount,
      profile: imageData,
      phone: form.phone,
      aadharNumber: form.aadharNumber,
    };

    try {
      const token = await getToken();
      await axios.post(
        `${API_URL}/api/delivery/updateCarrier`,
        { carrierData, clerkId: user.id, profile: imageData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Carrier updated successfully!');
      router.push('/carrier/dashboard');
    } catch (error) {
      console.error('Error updating carrier:', error);
      alert('Failed to update carrier. Check console for details.');
    }
  };

  return (
    <Box className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <Paper className="w-full max-w-md p-6 rounded-3xl shadow-lg">
        <Typography variant="h4" className="text-center mb-6 font-bold">
          Update Carrier
        </Typography>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            label="Phone Number"
            value={form.phone}
            fullWidth
            variant="outlined"
            disabled
          />


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
            fullWidth
            variant="outlined"
            disabled
            />

          <TextField
            label="Bank Account"
            value={form.bankAccount}
            name="bankAccount"
            onChange={handleChange}
            fullWidth
            variant="outlined"
          />

          <Box>
            <Button variant="contained" component="label" fullWidth>
              Upload Profile Picture
              <input type="file" hidden accept="image/*" onChange={handleImage} />
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
            Update Carrier
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
