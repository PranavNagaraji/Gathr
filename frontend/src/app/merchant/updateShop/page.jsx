"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import "leaflet/dist/leaflet.css";
import { Button } from "@mui/material";
import { Select, ConfigProvider, theme } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useTheme } from "@/components/theme/ThemeProvider";

// ✅ Dynamically import leaflet safely
const L = typeof window !== "undefined" ? require("leaflet") : null;

const categoriesOptions = [
    "Grocery", "Electronics", "Clothing", "Food", "Books", "Other",
    "Pharmacy", "Home & Kitchen", "Beauty", "Stationery", "Toys"
];

const UpdateShop = () => {
    const router = useRouter();
    const { user } = useUser();
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    const { theme: currentTheme } = useTheme();

    const [formData, setFormData] = useState({
        shop_name: "",
        address: "",
        contact: "",
        account_no: "",
        mobile_no: "",
        upi_id: "",
        category: [],
        image: null,
        location: { latitude: 20.5937, longitude: 78.9629 },
    });

    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [otherCategory, setOtherCategory] = useState("");
    const [autocomplete, setAutocomplete] = useState(null);
    const addressRef = useRef();
    const mapDivRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    // ✅ Google Maps API loader
    const { isLoaded: mapLoaded } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        libraries: ["places"],
    });

    // ✅ Setup Leaflet icons
    useEffect(() => {
        if (typeof window === "undefined" || !L) return;
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
            iconUrl: require("leaflet/dist/images/marker-icon.png"),
            shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
        });
    }, []);

    // ✅ Fetch shop data
    useEffect(() => {
        if (!isLoaded || !isSignedIn || !user) return;

        const urlToBase64 = async (url) => {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch {
                return null;
            }
        };

        const getShop = async () => {
            const token = await getToken();
            try {
                const res = await axios.post(
                    `${API_URL}/api/merchant/get_shop`,
                    { owner_id: user.id },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const shopData = res.data.shop;
                let base64Image = null;
                if (shopData?.image?.url) {
                    base64Image = await urlToBase64(shopData.image.url);
                    setImagePreview(base64Image);
                }

                if (shopData) {
                    setFormData({
                        shop_name: shopData.shop_name || "",
                        address: shopData.address || "",
                        contact: shopData.contact || "",
                        account_no: shopData.account_no || "",
                        mobile_no: shopData.mobile_no || "",
                        upi_id: shopData.upi_id || "",
                        category: shopData.category || [],
                        location: shopData.location || { latitude: 20.5937, longitude: 78.9629 },
                        owner_id: user.id,
                        image: base64Image,
                    });
                }
            } catch (err) {
                console.error("Error fetching shop:", err);
            } finally { setLoading(false); }
        };
        getShop();
    }, [user, isSignedIn, isLoaded, getToken, API_URL]);

    // ✅ Handle inputs
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData((prev) => ({ ...prev, image: reader.result }));
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    // ✅ Google Autocomplete
    useEffect(() => {
        if (mapLoaded && addressRef.current && !autocomplete) {
            const auto = new window.google.maps.places.Autocomplete(addressRef.current, {
                types: ["geocode"],
            });
            auto.addListener("place_changed", () => {
                const place = auto.getPlace();
                if (place.geometry) {
                    setFormData((prev) => ({
                        ...prev,
                        address: place.formatted_address || "",
                        location: {
                            latitude: place.geometry.location.lat(),
                            longitude: place.geometry.location.lng(),
                        },
                    }));
                }
            });
            setAutocomplete(auto);
        }
    }, [mapLoaded, autocomplete]);

    // ✅ Render Leaflet map
    useEffect(() => {
        if (typeof window === "undefined" || !L || !mapDivRef.current) return;
        const { latitude, longitude } = formData.location;

        if (!mapInstanceRef.current) {
            const map = L.map(mapDivRef.current).setView([latitude, longitude], 15);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "&copy; OpenStreetMap contributors",
            }).addTo(map);

            const storeIcon = L.icon({ iconUrl: '/store.png', iconSize: [32,32], iconAnchor: [16,32], popupAnchor: [0,-28] });
            const marker = L.marker([latitude, longitude], { draggable: true, icon: storeIcon }).addTo(map);
            marker.on("dragend", (e) => {
                const { lat, lng } = e.target.getLatLng();
                setFormData((prev) => ({ ...prev, location: { latitude: lat, longitude: lng } }));
            });
            markerRef.current = marker;
            mapInstanceRef.current = map;
        } else {
            mapInstanceRef.current.setView([latitude, longitude]);
            markerRef.current.setLatLng([latitude, longitude]);
            const storeIcon = L.icon({ iconUrl: '/store.png', iconSize: [32,32], iconAnchor: [16,32], popupAnchor: [0,-28] });
            markerRef.current.setIcon(storeIcon);
        }
    }, [formData.location.latitude, formData.location.longitude]);

    // ✅ Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = await getToken();
        try {
            const result = await axios.put(`${API_URL}/api/merchant/update_shop`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (result.status === 200) {
                alert("Shop updated successfully!");
                router.push("/merchant/dashboard");
            }
        } catch {
            alert("Error updating shop");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col md:flex-row bg-[var(--background)] text-[var(--foreground)] p-8 animate-pulse">
                <div className="flex-1 pr-8 space-y-5 max-w-2xl">
                    <div className="h-10 w-64 bg-[var(--muted)] rounded" />
                    <div className="h-4 w-80 bg-[var(--muted)] rounded" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {Array.from({length:4}).map((_,i)=>(
                            <div key={i} className="h-12 bg-[var(--muted)] rounded" />
                        ))}
                    </div>
                    <div className="h-12 bg-[var(--muted)] rounded w-full" />
                    <div className="h-12 bg-[var(--muted)] rounded w-full" />
                    <div className="h-10 w-40 bg-[var(--muted)] rounded" />
                </div>
                <div className="md:w-1/2 w-full h-[50vh] md:h-auto mt-8 md:mt-0">
                    <div className="w-full h-full bg-[var(--muted)] rounded-xl" />
                </div>
            </div>
        );
    }

    // ✅ Final UI
    return (
        <ConfigProvider
            theme={{
                algorithm: currentTheme === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: {
                    colorPrimary: 'var(--primary)',
                    colorBgBase: 'var(--background)',
                    colorBgContainer: 'var(--card)',
                    colorBorder: 'var(--border)',
                    colorText: 'var(--foreground)'
                },
                components: {
                    Select: {
                        colorBgContainer: 'var(--card)',
                        colorBgElevated: 'var(--popover)',
                        colorText: 'var(--foreground)',
                        colorTextPlaceholder: 'var(--muted-foreground)',
                        colorBorder: 'var(--border)',
                        optionSelectedBg: 'var(--accent)',
                        optionSelectedColor: 'var(--accent-foreground)',
                        optionActiveBg: 'var(--muted)',
                        controlItemBgHover: 'var(--muted)'
                    }
                }
            }}
        >
        <div className="min-h-screen flex flex-col md:flex-row bg-[var(--background)] text-[var(--foreground)]">
            {/* LEFT SIDE */}
            <div className="flex-1 p-10 flex flex-col justify-center space-y-6">
                <h1 className="text-4xl font-bold text-[var(--primary)] mb-2">Update Shop</h1>
                <p className="text-[var(--muted-foreground)] text-sm mb-6">
                    Modify your shop details and pinpoint your location on the map.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
                    {["shop_name", "contact", "account_no", "mobile_no", "upi_id"].map((field) => (
                        <div key={field}>
                            <label className="block text-[var(--muted-foreground)] mb-1 capitalize">
                                {field.replace("_", " ")}
                            </label>
                            <input
                                type="text"
                                name={field}
                                value={formData[field]}
                                onChange={handleChange}
                                className="w-full rounded-lg bg-[var(--card)] text-[var(--foreground)] px-3 py-2 border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                            />
                        </div>
                    ))}
                </div>

                <div className="max-w-2xl">
                    <label className="block text-[var(--muted-foreground)] mb-1">Address</label>
                    <input
                        type="text"
                        name="address"
                        ref={addressRef}
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Start typing your address..."
                        className="w-full rounded-lg bg-[var(--card)] text-[var(--foreground)] px-3 py-2 border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    />
                </div>

                <div className="max-w-2xl">
                    <label className="block text-[var(--muted-foreground)] mb-1">Categories</label>
                    <Select
                        mode="multiple"
                        value={formData.category}
                        onChange={(values) => setFormData((p) => ({ ...p, category: values }))}
                        style={{ width: "100%" }}
                        placeholder="Select categories"
                        maxTagCount="responsive"
                        size="large"
                        dropdownStyle={{ background: 'var(--popover)', color: 'var(--popover-foreground)' }}
                        suffixIcon={
                            <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                                <span>{formData.category?.length || 0}</span>
                                <DownOutlined />
                            </span>
                        }
                        options={[...new Set([...categoriesOptions, "Other"])].map((v) => ({
                            value: v,
                            label: v,
                        }))}
                    />
                    {formData.category?.includes("Other") && (
                        <div className="mt-3">
                            <input
                                type="text"
                                value={otherCategory}
                                onChange={(e) => setOtherCategory(e.target.value)}
                                onBlur={() => {
                                    if (otherCategory.trim()) {
                                        setFormData((p) => ({
                                            ...p,
                                            category: p.category
                                                .filter((c) => c !== "Other")
                                                .concat(otherCategory.trim()),
                                        }));
                                        setOtherCategory("");
                                    }
                                }}
                                placeholder="Type custom category"
                                className="w-full rounded-lg bg-[var(--card)] text-[var(--foreground)] px-3 py-2 border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                            />
                        </div>
                    )}
                </div>

                <div className="max-w-2xl">
                    <label className="block text-[var(--muted-foreground)] mb-1">Shop Image</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="text-[var(--muted-foreground)]"
                    />
                    {imagePreview && (
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="mt-3 w-48 h-48 object-cover rounded-lg border border-[var(--border)]"
                        />
                    )}
                </div>

                <Button
                    type="submit"
                    onClick={handleSubmit}
                    variant="contained"
                    sx={{
                        mt: 2,
                        width: "fit-content",
                        px: 5,
                        py: 1.5,
                        bgcolor: "#16a34a",
                        "&:hover": { bgcolor: "#15803d" },
                    }}
                >
                    Save Changes
                </Button>
            </div>

            {/* RIGHT SIDE MAP */}
            <div className="md:w-1/2 w-full h-[50vh] md:h-auto">
                <div ref={mapDivRef} className="w-full h-full" />
            </div>
        </div>
        </ConfigProvider>
    );
};

export default dynamic(() => Promise.resolve(UpdateShop), { ssr: false });
