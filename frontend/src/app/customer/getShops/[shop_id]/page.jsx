"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function GetItems() {
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState([]);
  const { shop_id } = useParams();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const getItems = async () => {
      try {
        const token = await getToken();
        const result = await axios.get(
          `${API_URL}/api/customer/getShopItem/${shop_id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const fetchedItems = result.data.items || [];
        setItems(fetchedItems);

        const allCategories = new Set(fetchedItems.flatMap((item) => item.category || []));
        setCategories(["All", ...Array.from(allCategories)]);
      } catch (err) {
        console.error("Error fetching items:", err);
      }
    };

    getItems();
  }, [user, isLoaded, isSignedIn, getToken, shop_id, API_URL]);

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category?.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#121212] px-6 sm:px-10 lg:px-16 py-12">
      {/* Header */}
      <h1 className="text-3xl sm:text-4xl font-semibold text-center mb-10 text-[#0B132B] tracking-tight">
        Items Available in This Shop
      </h1>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 max-w-4xl mx-auto">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="w-full sm:w-2/3 px-4 py-2 border border-[#0B132B]/30 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00ADB5] shadow-sm bg-white text-[#121212] placeholder-gray-400 font-medium transition"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full sm:w-1/3 px-4 py-2 border border-[#0B132B]/30 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00ADB5] shadow-sm bg-white text-[#121212] font-medium transition"
        >
          {categories.map((cat, idx) => (
            <option key={idx} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Items Grid */}
      <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <Link
              key={item.id}
              href={`/customer/getShops/${shop_id}/item/${item.id}`}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition transform hover:-translate-y-1 duration-300 flex flex-col overflow-hidden relative"
            >
              {/* Top Accent */}

              {/* Image */}
              <div className="h-48 w-full overflow-hidden rounded-t-2xl bg-gray-100">
                <img
                  src={item.images?.[0]?.url || "/placeholder.png"}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1">
                <h2 className="text-lg sm:text-xl font-semibold mb-1 text-[#0B132B]">{item.name}</h2>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>

                <div className="mt-auto flex flex-wrap gap-2 mb-3">
                  {item.category?.map((cat, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium bg-[#E8C547]/20 text-[#121212] px-3 py-1 rounded-full"
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-md font-bold text-[#00ADB5]">₹{item.price}</p>
                </div>
              </div>

              {/* Hover Glow */}
              <span className="absolute inset-0 rounded-2xl pointer-events-none transition-shadow duration-300 hover:shadow-[0_0_15px_#00ADB5]/50"></span>
            </Link>
          ))
        ) : (
          <p className="text-center text-gray-500 col-span-full text-lg">No items found.</p>
        )}
      </div>
    </div>
  );
}
