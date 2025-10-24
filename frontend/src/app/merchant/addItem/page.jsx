'use client'
import { useState } from 'react';
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Select, ConfigProvider, theme, Input as AntInput } from 'antd'
import { useTheme } from '@/components/theme/ThemeProvider'

export default function addItemPage() {
    const { theme: currentTheme } = useTheme();
    const categoryOptions = [
        "Fruits", "Vegetables", "Dairy", "Bakery", "Beverages",
        "Snacks", "Frozen", "Meat", "Seafood", "Grains",
        "Spices", "Condiments", "Breakfast", "Coffee & Tea", "Juices",
        "Personal Care", "Cleaning", "Pet Food", "Organic", "Health"
    ];

    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    const router = useRouter();
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const { user } = useUser();
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        quantity: "",
        price: "",
        category: [],
        images: [],
    });
    const [activeIndex, setActiveIndex] = useState(0)

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const handleCategoryChange = (e) => {
        const { value, checked } = e.target;

        setFormData((prev) => {
            if (checked) {
                // Add category if checked
                return { ...prev, category: [...prev.category, value] };
            } else {
                // Remove category if unchecked
                return { ...prev, category: prev.category.filter((cat) => cat !== value) };
            }
        });
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        const readers = [];

        files.forEach((file) => {
            const reader = new FileReader();
            readers.push(
                new Promise((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                })
            );
        });

        Promise.all(readers).then((base64Images) => {
            setFormData((prev) => ({
                ...prev,
                images: [...prev.images, ...base64Images], // append to existing images
            }));
        });
    };
    const handleRemoveImage = (index) => {
        setFormData((prev) => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index),
        }))
        setActiveIndex((prev) => {
            if (index === prev) return Math.max(0, prev - 1)
            if (index < prev) return prev - 1
            return prev
        })
    }
    const goPrev = () => {
        setActiveIndex((prev) => (formData.images.length ? (prev - 1 + formData.images.length) % formData.images.length : 0))
    }
    const goNext = () => {
        setActiveIndex((prev) => (formData.images.length ? (prev + 1) % formData.images.length : 0))
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isLoaded || !isSignedIn || !user) return;
        const token = await getToken();
        const body = {
            ...formData,
            owner_id: user.id,
        };
        const res = await fetch(`${API_URL}/api/merchant/add_items`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        if (res.ok) {
            alert("Item details saved!");
            router.push("/merchant/dashboard");
        }

        else alert(`Error saving item details: ${data.message}`);
    };
    return (
        <ConfigProvider
            theme={{
                algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: {
                    colorPrimary: 'var(--primary)',
                    colorBgBase: 'var(--background)',
                    colorBgContainer: 'var(--card)',
                    colorBorder: 'var(--border)',
                    colorText: 'var(--foreground)'
                },
                components: {
                    Select: { colorBgContainer: 'transparent', colorBorder: 'var(--border)' },
                    Input: { colorBgContainer: 'transparent', colorBorder: 'var(--border)' }
                }
            }}
        >
            <div className="min-h-screen p-4 md:p-8 bg-[var(--background)] text-[var(--foreground)]">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl md:text-4xl font-bold mb-6">Add Item</h1>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
                        {/* Details - LEFT (3/5) */}
                        <form onSubmit={handleSubmit} className="md:col-span-3 flex flex-col gap-6">
                            <div>
                                <label className="text-sm font-medium text-[var(--muted-foreground)]">Item Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter item name"
                                    className="w-full bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] text-lg p-2 focus:outline-none focus:ring-0 focus:border-[var(--primary)] transition-colors"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-[var(--muted-foreground)]">Description</label>
                                <textarea
                                    name="description"
                                    placeholder="Enter description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] text-lg p-2 focus:outline-none focus:ring-0 focus:border-[var(--primary)] transition-colors"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-[var(--muted-foreground)]">Quantity</label>
                                    <input
                                        type="number"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        name="quantity"
                                        placeholder="Enter quantity"
                                        className="w-full bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] text-lg p-2 focus:outline-none focus:ring-0 focus:border-[var(--primary)] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-[var(--muted-foreground)]">Price</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={handleChange}
                                        name="price"
                                        placeholder="Enter price"
                                        min={1}
                                        className="w-full bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] text-lg p-2 focus:outline-none focus:ring-0 focus:border-[var(--primary)] transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-[var(--muted-foreground)] mb-2 block">Categories</label>
                                <Select
                                    mode="multiple"
                                    allowClear
                                    style={{ width: '100%' }}
                                    placeholder="Select categories"
                                    value={formData.category}
                                    onChange={(values) => setFormData(prev => ({ ...prev, category: values }))}
                                    options={categoryOptions.map(cat => ({ label: cat, value: cat }))}
                                    size="large"
                                    className="bg-transparent text-[var(--foreground)]"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-[var(--primary)] hover:opacity-90 text-[var(--primary-foreground)] font-semibold py-3 rounded-lg transition-all duration-300"
                            >
                                Add Item
                            </button>
                        </form>

                        {/* Images - RIGHT (2/5) */}
                        <div className="md:col-span-2 md:order-last md:sticky md:top-8 h-fit">
                            <label className="text-sm font-medium mb-2 block text-[var(--muted-foreground)]">Item Images</label>
                            <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                                <div className="relative aspect-square w-full">
                                    {formData.images && formData.images.length > 0 ? (
                                        <img
                                            src={formData.images[activeIndex]}
                                            alt={`image-${activeIndex}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-sm text-[var(--muted-foreground)]">No images</div>
                                    )}
                                    {formData.images && formData.images.length > 1 && (
                                        <>
                                            <button type="button" onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-[var(--popover)]/80 text-[var(--popover-foreground)] border border-[var(--border)] hover:bg-[var(--accent)]/50 transition">‹</button>
                                            <button type="button" onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-[var(--popover)]/80 text-[var(--popover-foreground)] border border-[var(--border)] hover:bg-[var(--accent)]/50 transition">›</button>
                                        </>
                                    )}
                                </div>

                                {formData.images && formData.images.length > 0 && (
                                    <div className="grid grid-cols-5 gap-2 p-3 bg-[var(--card)] border-t border-[var(--border)]">
                                        {formData.images.map((img, i) => (
                                            <button
                                                type="button"
                                                key={i}
                                                onClick={() => setActiveIndex(i)}
                                                className={`relative aspect-square rounded-md overflow-hidden border ${i === activeIndex ? 'border-[var(--primary)]' : 'border-[var(--border)]'}`}
                                                aria-label={`Select image ${i + 1}`}
                                            >
                                                <img src={img} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(i) }}
                                                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                                    aria-label={`Remove image ${i + 1}`}
                                                >
                                                    ✕
                                                </button>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <label
                                htmlFor="file-upload"
                                className="mt-4 block w-full text-center py-3 px-4 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] font-medium cursor-pointer transition-colors"
                            >
                                Upload Images
                            </label>
                            <input
                                id="file-upload"
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
}