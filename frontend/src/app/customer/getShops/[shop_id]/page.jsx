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

        // Extract unique categories
        const allCategories = new Set(
          fetchedItems.flatMap((item) => item.category || [])
        );
        setCategories(["All", ...Array.from(allCategories)]);
      } catch (err) {
        console.error("Error fetching items:", err);
      }
    };

    getItems();
  }, [user, isLoaded, isSignedIn, getToken, shop_id, API_URL]);

  // Filter items based on search + category
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" ||
      item.category?.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] px-8 py-10">
      <h1 className="text-3xl font-bold mb-8 text-center text-[#111827]">
        Items Available in This Shop
      </h1>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
        {/* Search Bar */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for an item..."
          className="w-full sm:w-1/2 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#D4AF37] shadow-sm transition"
        />

        {/* Category Dropdown */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full sm:w-1/4 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#D4AF37] shadow-sm transition bg-white"
        >
          {categories.map((cat, idx) => (
            <option key={idx} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Items Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <Link
              key={item.id}
              href={`/customer/getShops/${shop_id}/item/${item.id}`}
              className="bg-white border border-gray-800 rounded-2xl shadow-md hover:shadow-xl transition transform hover:-translate-y-1"
            >
              {/* Image */}
              <div className="h-48 w-full overflow-hidden rounded-t-2xl bg-gray-100">
                <img
                  src={item.images?.[0]?.url || "/placeholder.png"}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-1">{item.name}</h2>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {item.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {item.category?.map((cat, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-[#D4AF37]/20 text-[#111827] px-2 py-1 rounded-full"
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-md font-bold text-[#D4AF37]">
                    ₹{item.price}
                  </p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-center text-gray-500 col-span-full">
            No items found.
          </p>
        )}
      </div>
    </div>
  );
}
