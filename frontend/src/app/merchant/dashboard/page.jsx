"use client"
import { useState, useEffect, useMemo } from 'react';
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@mui/material';
import AnimatedButton from "@/components/ui/AnimatedButton";
import { motion } from 'framer-motion';

export default function Dashboard() {
    const router = useRouter();
    const [items, setItems] = useState([]);
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const { user } = useUser();
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState(['All Categories']);
    const [selectedCategory, setSelectedCategory] = useState('All Categories');

    useEffect(() => {
        const checkShop = async () => {
            if (!isLoaded || !isSignedIn || !user) return;
            const token = await getToken();

            try {
                await axios.post(
                    `${API_URL}/api/merchant/check_shop_exists`,
                    { owner_id: user.id },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
            } catch (err) {
                console.error("Error checking shop:", err);
                router.push("/merchant/createShop");
            }
        };

        const getItems = async () => {
            if (!isLoaded || !isSignedIn || !user) return;
            const token = await getToken();

            try {
                const result = await axios.post(
                    `${API_URL}/api/merchant/get_items`,
                    { owner_id: user.id },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                setItems(result.data.items);
                
                const allCategories = new Set(result.data.items.flatMap(item => item.category));
                setCategories(['All Categories', ...allCategories]);

            } catch (err) {
                console.log(`err: ${err.message}`);
            }
        };

        checkShop();
        getItems();
    }, [isLoaded, isSignedIn, user, router, API_URL, getToken]);

    const handleDelete = async (itemId) => {
        if (!isLoaded || !isSignedIn || !user) return;
        if (!confirm("Are you sure you want to delete this item?")) return;
        const token = await getToken();

        try {
            const result = await axios.delete(`${API_URL}/api/merchant/delete_item`, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            data: {
                item_id: itemId,
                clerk_id: user.id,
            },
            });

            if (result.status === 200) {
                const updatedItems = items.filter((item) => item.id !== itemId);
                setItems(updatedItems);
            }
        } catch (err) {
            console.error("Error deleting item:", err.response?.data || err.message);
        }
    };

    const handleEdit = (itemId) => {
        router.push(`/merchant/editItem/${itemId}`);
    };
    
    const filteredItems = useMemo(() => {
        return items
            .filter(item => {
                if (selectedCategory === 'All Categories') return true;
                return item.category.includes(selectedCategory);
            })
            .filter(item => {
                if (searchTerm.trim() === '') return true;
                const lowerCaseSearch = searchTerm.toLowerCase();
                return (
                    item.name.toLowerCase().includes(lowerCaseSearch) ||
                    item.description.toLowerCase().includes(lowerCaseSearch)
                );
            });
    }, [items, selectedCategory, searchTerm]);

    // UI-only adjustments: theme tokens and subtle motion
    return (
        <div className="flex flex-col items-center w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8">
            <div className="w-full max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold mb-6 tracking-tight">Merchant Dashboard</h1>

                {/* ✨ NEW: Styled filter and search controls */}
                <div className="w-full flex flex-col md:flex-row gap-4 mb-8 bg-[var(--card)] text-[var(--card-foreground)] p-4 rounded-lg shadow-sm border border-[var(--border)]">
                    <input
                        type="text"
                        placeholder="Search by name or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow p-2 border border-[var(--border)] rounded-md bg-[var(--popover)] text-[var(--popover-foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--ring)] transition"
                    />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="p-2 border border-[var(--border)] rounded-md bg-[var(--popover)] text-[var(--popover-foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--ring)] transition"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                
                {filteredItems.length > 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                        {filteredItems.map((item) => (
                            <motion.div key={item.id} whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="bg-[var(--card)] text-[var(--card-foreground)] rounded-3xl border border-[var(--border)] shadow-sm hover:shadow-md overflow-hidden">
                                <div className="p-4">
                                    <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[var(--muted)]">
                                        {item.images && item.images.length > 0 ? (
                                            <img src={item.images[0].url} alt={item.name} className="object-cover w-full h-full" />
                                        ) : null}
                                    </div>
                                    <div className="pt-4">
                                        <h2 className="text-lg md:text-xl font-semibold truncate">{item.name}</h2>
                                        <p className="text-sm mt-1 text-[var(--muted-foreground)] truncate">{item.description}</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {item.category.map(cat => (
                                                <span key={cat} className="text-xs font-medium bg-[var(--muted)] text-[var(--muted-foreground)] px-2.5 py-1 rounded-full">
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className="font-semibold text-[var(--primary)]">${item.price}</span>
                                            <span className="text-xs text-[var(--muted-foreground)]">Qty: {item.quantity}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-4 pb-4 flex gap-3">
                                    <AnimatedButton onClick={() => handleEdit(item.id)} size="md" rounded="lg" variant="muted" className="flex-1">
                                        Edit
                                    </AnimatedButton>
                                    <AnimatedButton onClick={() => handleDelete(item.id)} size="md" rounded="lg" className="flex-1 bg-[color-mix(in_oklab,var(--destructive),white_85%)] text-[var(--destructive)] border border-[var(--border)]">
                                        Delete
                                    </AnimatedButton>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <div className="text-center py-16 bg-[var(--card)] text-[var(--card-foreground)] rounded-lg shadow-sm border border-[var(--border)]">
                        <p className="text-xl text-[var(--muted-foreground)]">No items match your filter criteria.</p>
                    </div>
                )}


                <div className="mt-12 text-center">
                    <AnimatedButton as="button" onClick={() => router.push("/merchant/addItem")} size="lg" rounded="lg" variant="primary">
                        Add New Item
                    </AnimatedButton>
                </div>
            </div>
        </div>
    );
}