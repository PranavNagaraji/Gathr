"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function CustomerDashboard() {
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [location, setLocation] = useState(null);
  const [shops, setShops] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState([]);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    async function fetchLocation() {
      try {
        if (!("geolocation" in navigator)) return;

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const { latitude, longitude } = position.coords;
        const loc = { lat: latitude, long: longitude };

        localStorage.setItem("userLocation", JSON.stringify(loc));
        setLocation(loc);
      } catch (err) {
        console.error("Error getting location:", err);
      }
    }

    fetchLocation();

    const get_shops = async () => {
      try {
        const token = await getToken();
        const result = await axios.post(
          `${API_URL}/api/customer/getShops`,
          { lat: 15.750366871923427, long: 78.03934675615315 },
          { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );

        const shopList = result.data.shops || [];
        setShops(shopList);

        const allCategories = new Set();
        shopList.forEach((shop) => shop.category?.forEach((cat) => allCategories.add(cat)));
        setCategories(["All", ...Array.from(allCategories)]);
      } catch (err) {
        console.error("Error fetching shops:", err);
      }
    };
    get_shops();
  }, [isLoaded, isSignedIn, user]);

  const filteredShops = shops.filter((shop) => {
    const matchesSearch = shop.shop_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || shop.category?.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#121212] px-6 sm:px-10 lg:px-16 py-12">
      {/* Header */}
      <h1 className="text-3xl sm:text-4xl font-semibold text-center mb-10 text-[#0B132B] tracking-tight">
        Explore Shops Near You
      </h1>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 max-w-4xl mx-auto">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shops..."
          className="w-full sm:w-2/3 px-4 py-2 border border-[#0B132B]/30 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00ADB5] shadow-sm bg-white text-[#121212] placeholder-gray-500 font-medium transition"
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

      {/* Shops Grid */}
      <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredShops.length > 0 ? (
          filteredShops.map((shop) => (
            <Link
              href={`/customer/getShops/${shop.id}`}
              key={shop.id}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition transform hover:-translate-y-1 duration-300 flex flex-col overflow-hidden"
            >
              <div className="h-52 w-full overflow-hidden rounded-t-2xl">
                <img
                  src={shop.image?.url || "/placeholder.png"}
                  alt={shop.shop_name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h2 className="text-lg sm:text-xl font-semibold mb-1">{shop.shop_name}</h2>
                <p className="text-sm text-gray-600 mb-3">{shop.address}</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  {shop.category?.map((category, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium bg-[#E8C547]/20 text-[#121212] px-3 py-1 rounded-full"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-center text-gray-500 col-span-full text-lg">
            No shops found.
          </p>
        )}
      </div>
    </div>
  );
}
