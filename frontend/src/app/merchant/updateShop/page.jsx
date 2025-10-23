'use client'
import { useState, useEffect, useRef, useCallback } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import axios from "axios";

const containerStyle = { width: "100%", height: "300px" };
const categoriesOptions = ["Grocery", "Electronics", "Clothing", "Food", "Books", "Other"];

const UpdateShop = () => {
    const router = useRouter();
    const { user } = useUser();
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

    // 🔹 State to hold form data, initialized with empty values
    const [formData, setFormData] = useState({
        shop_name: "",
        address: "",
        contact: "",
        account_no: "",
        mobile_no: "",
        upi_id: "",
        category: [],
        image: null, // Will hold the new base64 image if changed
        location: { latitude: 20.5937, longitude: 78.9629 }, // Default center
    });
    const [imagePreview, setImagePreview] = useState(null); // For displaying current or new image
    const [autocomplete, setAutocomplete] = useState(null);
    const addressRef = useRef();

    // 🔹 Hook for loading Google Maps API
    const { isLoaded: mapLoaded } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        libraries: ["places"],
    });

    // Leaflet default icon fix
    useEffect(() => {
        const defaultIcon = L.icon({
            iconUrl: markerIcon,
            iconRetinaUrl: markerIcon2x,
            shadowUrl: markerShadow,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });
        L.Marker.prototype.options.icon = defaultIcon;
    }, []);

    // 🔹 Fetch existing shop data and populate the form
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
            } catch (error) {
                console.error("Error converting URL to Base64:", error);
                return null;
            }
        };

        const getShop = async () => {
            const token = await getToken();
            try {
                const res = await axios.post(`${API_URL}/api/merchant/get_shop`, { owner_id: user.id }, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    }
                });
                
                const shopData = res.data.shop;
                let base64Image = null;
                if (shopData.image) {
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
                        image: base64Image, // Reset image field, will be set only on new upload
                    });
                    // Set the preview to the existing image URL
                    
                }
            } catch (err) {
                console.error("Error getting shop:", err);
            }
        };
        getShop();
    }, [user, isSignedIn, isLoaded, getToken, API_URL]);

    // 🔹 Handle text input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 🔹 Handle category checkbox toggles
    const handleCategoryToggle = (cat) => {
        setFormData(prev => ({
            ...prev,
            category: prev.category.includes(cat)
                ? prev.category.filter(c => c !== cat)
                : [...prev.category, cat]
        }));
    };

    // 🔹 Initialize Google Places Autocomplete
    useEffect(() => {
        if (mapLoaded && addressRef.current && !autocomplete) {
            const options = { types: ["geocode"] };
            const auto = new window.google.maps.places.Autocomplete(addressRef.current, options);
            auto.addListener("place_changed", () => {
                const place = auto.getPlace();
                if (place.geometry) {
                    setFormData(prev => ({
                        ...prev,
                        address: place.formatted_address || "",
                        location: {
                            latitude: place.geometry.location.lat(),
                            longitude: place.geometry.location.lng()
                        }
                    }));
                }
            });
            setAutocomplete(auto);
        }
    }, [mapLoaded, autocomplete]);

    // 🔹 Handle new image selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Store new image as base64 string
                setFormData(prev => ({ ...prev, image: reader.result }));
                // Update preview to show the new image
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Leaflet map refs
    const mapDivRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        if (!mapDivRef.current || !formData.location) return;
        const { latitude, longitude } = formData.location;
        if (!mapInstanceRef.current) {
            const map = L.map(mapDivRef.current, {
                center: [latitude, longitude],
                zoom: 15,
                zoomControl: true,
            });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
            map.on('click', (e) => {
                const { lat, lng } = e.latlng;
                setFormData(prev => ({ ...prev, location: { latitude: lat, longitude: lng } }));
            });
            mapInstanceRef.current = map;
        } else {
            mapInstanceRef.current.setView([latitude, longitude], 15);
        }

        const map = mapInstanceRef.current;
        if (!markerRef.current) {
            const m = L.marker([latitude, longitude], { draggable: true }).addTo(map);
            m.on('dragend', (e) => {
                const ll = e.target.getLatLng();
                setFormData(prev => ({ ...prev, location: { latitude: ll.lat, longitude: ll.lng } }));
            });
            markerRef.current = m;
        } else {
            markerRef.current.setLatLng([latitude, longitude]);
        }
    }, [formData.location?.latitude, formData.location?.longitude]);

    // 🔹 Submit handler (placeholder for your logic)
    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Form data to be updated:", formData);
        const token = await getToken();

        const result = await axios.put(`${API_URL}/api/merchant/update_shop`, formData, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        if (result.status === 200) {
            alert("Shop details updated successfully!");
            router.push("/merchant/dashboard");
        } else {
            alert(result.data.message || "Error updating shop details");
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
            <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-2xl space-y-4">
                <h2 className="text-3xl font-semibold text-white mb-4 text-center">Update Shop Details</h2>

                <div>
                    <label className="text-gray-300 mb-1 block">Shop Image</label>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                    {imagePreview && (
                        <img src={imagePreview} alt="Shop Preview" className="mt-4 w-48 h-48 object-cover rounded-lg border-2 border-gray-500" />
                    )}
                </div>

                {["shop_name", "contact", "account_no", "mobile_no", "upi_id"].map(field => (
                    <div key={field}>
                        <label className="text-gray-300 mb-1 block capitalize">{field.replace("_", " ")}</label>
                        <input
                            type="text"
                            name={field}
                            value={formData[field]}
                            onChange={handleChange}
                            className="w-full p-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                ))}

                <div>
                    <label className="text-gray-300 mb-1 block">Address</label>
                    <input
                        type="text"
                        name="address"
                        ref={addressRef}
                        defaultValue={formData.address} // Use defaultValue for uncontrolled updates from autocomplete
                        onChange={handleChange}
                        placeholder="Start typing your address..."
                        className="w-full p-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="text-gray-300 mb-1 block">Categories</label>
                    <div className="flex flex-wrap gap-2">
                        {categoriesOptions.map(cat => (
                            <FormControlLabel
                                key={cat}
                                control={
                                    <Checkbox
                                        checked={formData.category.includes(cat)}
                                        onChange={() => handleCategoryToggle(cat)}
                                        sx={{ color: "white", '&.Mui-checked': { color: '#3b82f6' } }}
                                    />
                                }
                                label={<span className="text-white">{cat}</span>}
                            />
                        ))}
                    </div>
                </div>

                <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-500">
                    <div style={containerStyle} ref={mapDivRef} />
                </div>

                <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    sx={{ py: 1.5, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
                >
                    Update Shop
                </Button>
            </form>
        </div>
    );
};

export default UpdateShop;