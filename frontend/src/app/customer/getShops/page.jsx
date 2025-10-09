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
        if (!("geolocation" in navigator)) {
          console.error("Geolocation not supported");
          return;
        }

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
          {
            // Replace with dynamic coordinates if needed
            lat: 15.750366871923427,
            long: 78.03934675615315,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const shopList = result.data.shops || [];
        setShops(shopList);

        // Extract unique categories for filter
        const allCategories = new Set();
        shopList.forEach((shop) => {
          shop.category?.forEach((cat) => allCategories.add(cat));
        });
        setCategories(["All", ...Array.from(allCategories)]);
      } catch (err) {
        console.error("Error fetching shops:", err);
      }
    };
    get_shops();
  }, [isLoaded, isSignedIn, user]);

  // Filter shops based on search + category
  const filteredShops = shops.filter((shop) => {
    const matchesSearch = shop.shop_name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" ||
      shop.category?.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] px-8 py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Shops in Your Locality
      </h1>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
        {/* Search Bar */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for a shop..."
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

      {/* Shop Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredShops.length > 0 ? (
          filteredShops.map((shop) => (
            <Link
              href={`/customer/getShops/${shop.id}`}
              key={shop.id}
              className="bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition transform hover:-translate-y-1"
            >
              <div className="h-48 w-full overflow-hidden rounded-t-2xl">
                <img
                  src={shop.image?.url || "/placeholder.png"}
                  alt={shop.shop_name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-4">
                <h2 className="text-lg font-semibold mb-1 text-[#111827]">
                  {shop.shop_name}
                </h2>
                <p className="text-sm text-gray-600 mb-2">{shop.address}</p>

                <div className="flex flex-wrap gap-2 mt-2">
                  {shop.category?.map((category, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-[#D4AF37]/20 text-[#111827] px-2 py-1 rounded-full"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-center text-gray-500 col-span-full">
            No shops found.
          </p>
        )}
      </div>
    </div>
  );
}
