"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Input, Select } from "antd";
import AnimatedButton from "@/components/ui/AnimatedButton";

export default function Dashboard() {
    const router = useRouter();
    const [items, setItems] = useState([]);
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const { user } = useUser();
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

    const [searchTerm, setSearchTerm] = useState("");
    const [categories, setCategories] = useState(["All Categories"]);
    const [selectedCategory, setSelectedCategory] = useState("All Categories");
    const [loading, setLoading] = useState(true);

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
                setLoading(true);
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
                const allCategories = new Set(result.data.items.flatMap((item) => item.category));
                setCategories(["All Categories", ...allCategories]);
            } catch (err) {
                console.log(`err: ${err.message}`);
            } finally {
                setLoading(false);
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
            .filter((item) => {
                if (selectedCategory === "All Categories") return true;
                return item.category.includes(selectedCategory);
            })
            .filter((item) => {
                if (searchTerm.trim() === "") return true;
                const lower = searchTerm.toLowerCase();
                return (
                    item.name.toLowerCase().includes(lower) ||
                    item.description.toLowerCase().includes(lower)
                );
            });
    }, [items, selectedCategory, searchTerm]);

    return (
        <div className="flex flex-col items-center w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8">
            <div className="w-full max-w-7xl mx-auto">
                <div className="mt-12 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                        Merchant Dashboard
                    </h1>
                    <AnimatedButton
                        as="button"
                        onClick={() => router.push("/merchant/addItem")}
                        size="lg"
                        rounded="lg"
                        variant="white"
                    >
                        + Add New Item
                    </AnimatedButton>
                </div>

                {/* 🔍 Search and Filter Section */}
                <div className="w-full flex flex-col md:flex-row gap-4 mt-8 text-[var(--card-foreground)] p-5 rounded-2xl">
                    <Input
                        placeholder="Search by name or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 py-2 rounded-lg"
                        size="large"
                    />
                    <Select
                        value={selectedCategory}
                        onChange={(value) => setSelectedCategory(value)}
                        options={categories.map((cat) => ({ label: cat, value: cat }))}
                        className="w-full md:w-60"
                        size="large"
                    />
                </div>

                {/* 🛍️ Items Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10 w-full">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="relative bg-[var(--card)] text-[var(--card-foreground)] rounded-2xl shadow-md overflow-hidden border border-[var(--border)] animate-pulse">
                                <div className="h-44 md:h-48 bg-[var(--muted)]" />
                                <div className="p-4 space-y-3">
                                    <div className="h-5 w-2/3 bg-[var(--muted)] rounded" />
                                    <div className="h-4 w-1/2 bg-[var(--muted)] rounded" />
                                    <div className="h-6 w-1/3 bg-[var(--muted)] rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10 w-full">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className="relative bg-[var(--card)] text-[var(--card-foreground)] rounded-2xl shadow-md overflow-hidden border border-[var(--border)] hover:bg-[var(--muted)]/40 dark:hover:bg-[var(--muted)]/20 transition-colors duration-200"
                            >
                                <div className="h-44 md:h-48 bg-gradient-to-b from-[var(--muted)] to-[var(--card)] overflow-hidden">
                                    {item.images && item.images.length > 0 ? (
                                        <img
                                            src={item.images[0].url}
                                            alt={item.name}
                                            className="w-full h-full object-cover object-center"
                                        />
                                    ) : null}
                                </div>

                                <div className="bg-[var(--card)] p-4 md:p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-lg md:text-xl font-semibold truncate">{item.name}</h2>
                                            <p className="text-sm text-[var(--muted-foreground)] mt-1 truncate">{item.description}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2 min-h-[28px]">
                                        {Array.isArray(item.category) && item.category.map((cat, i) => (
                                            <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">{cat}</span>
                                        ))}
                                    </div>

                                    <div className="mt-4 flex items-center justify-between gap-3">
                                        <p className="text-2xl font-bold text-[var(--primary)]">₹{item.price}</p>
                                        <span className="text-xs px-2 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]">Qty: {item.quantity}</span>
                                    </div>
                                </div>

                                <div className="px-4 pb-4 flex gap-3">
                                    <AnimatedButton
                                        onClick={() => handleEdit(item.id)}
                                        size="md"
                                        rounded="lg"
                                        variant="muted"
                                        className="flex-1"
                                    >
                                        Edit
                                    </AnimatedButton>
                                    <AnimatedButton
                                        onClick={() => handleDelete(item.id)}
                                        size="md"
                                        rounded="lg"
                                        className="flex-1 bg-[color-mix(in_oklab,var(--destructive),white_85%)] text-[var(--destructive)] border border-[var(--border)]"
                                    >
                                        Delete
                                    </AnimatedButton>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-[var(--card)] text-[var(--card-foreground)] rounded-xl shadow-md border border-[var(--border)] mt-10">
                        <p className="text-lg md:text-xl text-[var(--muted-foreground)]">
                            No items match your filter criteria.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
