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
                const allCategories = new Set(result.data.items.flatMap((item) => item.category));
                setCategories(["All Categories", ...allCategories]);
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
                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10 w-full">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-[var(--card)] text-[var(--card-foreground)] rounded-3xl border border-[var(--border)] shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
                            >
                                <div className="p-4">
                                    <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[var(--muted)]">
                                        {item.images && item.images.length > 0 ? (
                                            <img
                                                src={item.images[0].url}
                                                alt={item.name}
                                                className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : null}
                                    </div>

                                    <div className="pt-4">
                                        <h2 className="text-lg md:text-xl font-semibold truncate">
                                            {item.name}
                                        </h2>
                                        <p className="text-sm mt-1 text-[var(--muted-foreground)] truncate">
                                            {item.description}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {item.category.map((cat) => (
                                                <span
                                                    key={cat}
                                                    className="text-xs font-medium bg-[var(--muted)] text-[var(--muted-foreground)] px-3 py-1 rounded-full"
                                                >
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className="font-semibold text-[var(--primary)]">
                                                ₹{item.price}
                                            </span>
                                            <span className="text-xs text-[var(--muted-foreground)]">
                                                Qty: {item.quantity}
                                            </span>
                                        </div>
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
