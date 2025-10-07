'use client'
import {useState} from 'react';
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function addItemPage(){
    const categoryOptions = [
        "Fruits", "Vegetables", "Dairy", "Bakery", "Beverages", 
        "Snacks", "Frozen", "Meat", "Seafood", "Grains", 
        "Spices", "Condiments", "Breakfast", "Coffee & Tea", "Juices",
        "Personal Care", "Cleaning", "Pet Food", "Organic", "Health"
    ];
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    const router=useRouter();
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
            images: base64Images, // array of Base64 strings
            }));
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(!isLoaded || !isSignedIn || !user) return;
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
        if (res.ok) alert("Item details saved!");
        else alert(`Error saving item details: ${data.message}`);
    };
    return (
        <div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {/* Item images */}
                <div>
                <label className="text-gray-300 mb-1 block">Add Images</label>
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                />
                </div>

                {/* Item name */}
                <div>
                <label className="text-gray-300 mb-1 block">Item Name</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter item name"
                    className="w-full rounded-md p-2 bg-gray-800 text-white"
                />
                </div>

                {/* Description */}
                <div>
                <label className="text-gray-300 mb-1 block">Description</label>
                <textarea
                    name="description"
                    placeholder="Enter description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full rounded-md p-2 bg-gray-800 text-white"
                    rows={3}
                />
                </div>

                {/* Quantity */}
                <div>
                <label className="text-gray-300 mb-1 block">Quantity</label>
                <input
                    type="number"
                    value={formData.quantity}
                    onChange={handleChange}
                    name="quantity"
                    placeholder="Enter quantity"
                    className="w-full rounded-md p-2 bg-gray-800 text-white"
                />
                </div>

                {/* Price */}
                <div>
                <label className="text-gray-300 mb-1 block">Price</label>
                <input
                    type="number"
                    value={formData.price}
                    onChange={handleChange}
                    name="price"
                    placeholder="Enter price"
                    min={1}
                    className="w-full rounded-md p-2 bg-gray-800 text-white"
                />
                </div>

                {/* Category */}
                <div>
                    <label className="text-gray-300 mb-1 block">Categories</label>
                    <div className="max-h-48 overflow-y-auto border border-gray-700 rounded-md p-2 flex flex-wrap gap-2">
                        {categoryOptions.map((cat) => (
                        <label key={cat} className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded hover:bg-gray-700 cursor-pointer">
                            <input
                            type="checkbox"
                            value={cat}
                            checked={formData.category.includes(cat)}
                            onChange={handleCategoryChange}
                            className="w-4 h-4"
                            />
                            <span className="text-white text-sm">{cat}</span>
                        </label>
                        ))}
                    </div>
                </div>

                {/* Submit */}
                <button
                type="submit"
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md"
                >
                Add Item
                </button>
            </form>
        </div>
    );
}