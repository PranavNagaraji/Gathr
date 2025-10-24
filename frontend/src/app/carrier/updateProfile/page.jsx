'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button, TextField, Typography, Box, Paper } from '@mui/material';
import axios from 'axios';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

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
            toast.success('Carrier updated successfully!');
            router.push('/carrier/dashboard');
        } catch (error) {
            console.error('Error updating carrier:', error);
            toast.error('Failed to update carrier. Check console for details.');
        }
    };

    return (
        <Box className="flex justify-center items-center min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 md:p-10">
            <Paper className="w-full max-w-5xl p-8 md:p-10 rounded-3xl shadow-lg border border-[var(--border)]" style={{ background: 'var(--card)', color: 'var(--card-foreground)' }}>
                <Typography variant="h4" className="text-center mb-8 font-bold" component="h1" sx={{ color: 'var(--foreground)' }}>
                    Update Carrier
                </Typography>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
                    {/* LEFT: Details */}
                    <form onSubmit={handleSubmit} className="md:col-span-3 flex flex-col gap-6">
                        <TextField
                            label="Phone Number"
                            value={form.phone}
                            fullWidth
                            variant="outlined"
                            disabled
                            InputLabelProps={{ style: { color: 'var(--muted-foreground)' } }}
                            inputProps={{ style: { color: 'var(--card-foreground)' } }}
                            sx={{
                                '& .MuiInputLabel-root': { color: 'var(--muted-foreground)', fontFamily: 'inherit' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ring)' },
                                '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'var(--foreground)' }
                            }}
                        />

                        <TextField
                            label="License Number"
                            value={form.licenseNumber}
                            name="licenseNumber"
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            required
                            InputLabelProps={{ style: { color: 'var(--muted-foreground)' } }}
                            inputProps={{ style: { color: 'var(--card-foreground)' } }}
                            sx={{
                                '& .MuiInputLabel-root': { color: 'var(--muted-foreground)', fontFamily: 'inherit' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ring)' }
                            }}
                        />

                        <TextField
                            label="Aadhar Number"
                            value={form.aadharNumber}
                            fullWidth
                            variant="outlined"
                            disabled
                            InputLabelProps={{ style: { color: 'var(--muted-foreground)' } }}
                            inputProps={{ style: { color: 'var(--card-foreground)' } }}
                            sx={{
                                '& .MuiInputLabel-root': { color: 'var(--muted-foreground)', fontFamily: 'inherit' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ring)' },
                                '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'var(--foreground)' }
                            }}
                        />

                        <TextField
                            label="Bank Account"
                            value={form.bankAccount}
                            name="bankAccount"
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            InputLabelProps={{ style: { color: 'var(--muted-foreground)' } }}
                            inputProps={{ style: { color: 'var(--card-foreground)' } }}
                            sx={{
                                '& .MuiInputLabel-root': { color: 'var(--muted-foreground)', fontFamily: 'inherit' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ring)' }
                            }}
                        />

                        <Button type="submit" variant="contained" fullWidth style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                            Update Carrier
                        </Button>
                    </form>

                    {/* RIGHT: Image */}
                    <div className="md:col-span-2 md:order-last md:sticky md:top-8 h-fit">
                        <Typography variant="subtitle2" sx={{ color: 'var(--muted-foreground)', fontWeight: 600, mb: 1 }}>Profile Picture</Typography>
                        <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                            <div className="relative aspect-square w-full">
                                {preview ? (
                                    <Image src={preview} alt="Profile Preview" fill style={{ objectFit: 'cover' }} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-sm text-[var(--muted-foreground)]">No image</div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex gap-3">
                            {preview && (
                                <Button onClick={() => { setForm(prev => ({ ...prev, profilePic: null })); setPreview(null); }} variant="contained" sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}>
                                    Delete
                                </Button>
                            )}
                            <Button variant="contained" component="label" sx={{ bgcolor: 'var(--muted)', color: 'var(--muted-foreground)', '&:hover': { bgcolor: 'var(--accent)', color: 'var(--accent-foreground)' } }}>
                                Replace Image
                                <input type="file" hidden accept="image/*" onChange={handleImage} />
                            </Button>
                        </div>
                    </div>
                </div>
            </Paper>
        </Box>
    );
}