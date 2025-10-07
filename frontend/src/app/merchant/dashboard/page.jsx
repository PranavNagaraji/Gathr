'use client'
import { useState, useEffect, useMemo } from 'react';
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@mui/material';

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

    // ✨ NEW: Main container with a soft slate background
    return (
        <div className="flex flex-col items-center w-full min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="w-full max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold text-slate-800 mb-6 tracking-tight">Merchant Dashboard</h1>

                {/* ✨ NEW: Styled filter and search controls */}
                <div className="w-full flex flex-col md:flex-row gap-4 mb-8 bg-white p-4 rounded-lg shadow-sm">
                    <input
                        type="text"
                        placeholder="Search by name or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                
                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                        {filteredItems.map((item) => (
                            // ✨ NEW: Restyled item card with hover effects
                            <div key={item.id} className="bg-white rounded-lg shadow-md flex flex-col justify-between overflow-hidden border border-slate-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                                <div>
                                    {item.images && item.images.length > 0 && (
                                        <div className="w-full h-48">
                                            <img
                                                src={item.images[0].url}
                                                alt={item.name}
                                                className="object-cover w-full h-full"
                                            />
                                        </div>
                                    )}
                                    <div className="p-4">
                                        <h2 className="text-xl font-bold text-slate-900">{item.name}</h2>
                                        <p className="text-slate-600 text-sm mt-1">{item.description}</p>
                                        <p className="mt-4"><strong className="text-slate-800">Price:</strong> <span className="font-semibold text-indigo-600">${item.price}</span></p>
                                        <p><strong className="text-slate-800">Quantity:</strong> {item.quantity}</p>
                                        
                                        {/* ✨ NEW: Category tags */}
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {item.category.map(cat => (
                                                <span key={cat} className="text-xs font-medium bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full">
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
                                    <button
                                        className="flex-1 bg-slate-200 text-slate-800 hover:bg-slate-300 font-semibold px-4 py-2 rounded-md transition-colors text-sm"
                                        onClick={() => handleEdit(item.id)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 font-semibold px-4 py-2 rounded-md transition-colors text-sm"
                                        onClick={() => handleDelete(item.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                        <p className="text-xl text-slate-500">No items match your filter criteria.</p>
                    </div>
                )}


                <div className="mt-12 text-center">
                    <Button variant="contained" size="large" onClick={() => router.push("/merchant/addItem")}>
                        Add New Item
                    </Button>
                </div>
            </div>
        </div>
    );
}