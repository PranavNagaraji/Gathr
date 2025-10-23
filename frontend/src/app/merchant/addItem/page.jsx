'use client'
import {useState} from 'react';
import { Select } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function addItemPage(){
    const categoryOptions = [
        "Fruits", "Vegetables", "Dairy", "Bakery", "Beverages", 
        "Snacks", "Frozen", "Meat", "Seafood", "Grains", 
        "Spices", "Condiments", "Breakfast", "Coffee & Tea", "Juices",
        "Personal Care", "Cleaning", "Pet Food", "Organic", "Health",
        "Household Essentials", "Baby Care", "Pharmacy", "Stationery", "Beauty"
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
    const [otherCategory, setOtherCategory] = useState("");
    const handleCategoryChange = (values) => {
        setFormData((prev) => ({ ...prev, category: values }));
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
        <div className="min-h-[70vh] bg-gray-900 text-gray-300 px-6 py-8">
            <h2 className="text-2xl font-semibold text-white mb-6">Add Item</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-2xl">
                {/* Item images */}
                <div>
                <label className="text-gray-300 mb-1 block">Add Images</label>
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-800 file:text-gray-200 hover:file:bg-gray-700"
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
                    className="w-full rounded-lg px-3 py-2 bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                    className="w-full rounded-lg px-3 py-2 bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                    className="w-full rounded-lg px-3 py-2 bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                    className="w-full rounded-lg px-3 py-2 bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                </div>

                {/* Category */}
                <div>
                    <label className="text-gray-300 mb-1 block">Categories</label>
                    <Select
                        mode="multiple"
                        value={formData.category}
                        onChange={handleCategoryChange}
                        style={{ width: '100%' }}
                        placeholder="Select categories"
                        maxTagCount="responsive"
                        suffixIcon={
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                                <span>{formData.category.length}</span>
                                <DownOutlined />
                            </span>
                        }
                        options={[...categoryOptions.map(c=>({value:c,label:c})), {value:'Other', label:'Other'}]}
                    />
                    {formData.category.includes('Other') && (
                        <div className="mt-3">
                            <label className="text-gray-300 mb-1 block">Enter custom category</label>
                            <input
                                type="text"
                                value={otherCategory}
                                onChange={(e)=>setOtherCategory(e.target.value)}
                                onBlur={()=>{
                                    if(otherCategory.trim()){
                                        setFormData(prev=>({
                                            ...prev,
                                            category: prev.category.filter(c=>c!=='Other').concat(otherCategory.trim())
                                        }));
                                        setOtherCategory("");
                                    }
                                }}
                                className="w-full mt-1 rounded-lg px-3 py-2 bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Type new category"
                            />
                            <p className="text-xs text-gray-500 mt-1">Blur the input to add it and replace "Other".</p>
                        </div>
                    )}
                </div>

                {/* Submit */}
                <button
                type="submit"
                className="mt-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg"
                >
                Add Item
                </button>
            </form>
        </div>
    );
}