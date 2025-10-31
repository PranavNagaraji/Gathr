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
    location: { latitude: 20.5937, longitude: 78.9629 }, // Default location
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otherCategory, setOtherCategory] = useState("");
  const addressRef = useRef();
  const mapDivRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [lowThreshold, setLowThreshold] = useState(5);
  const [LVar, setL] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const sessionTokenRef = useRef(null);

  // ✅ Load Google Maps Places API
  const { isLoaded: mapLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });
  const placesReady = typeof window !== 'undefined' && mapLoaded && !!(window.google?.maps?.places);

  // ✅ Dynamically import Leaflet on client and set default icons
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof window === 'undefined') return;
      const Leaflet = (await import('leaflet')).default;
      try {
        delete Leaflet.Icon.Default.prototype._getIconUrl;
        Leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
          iconUrl: require('leaflet/dist/images/marker-icon.png'),
          shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
        });
      } catch {}
      if (mounted) setL(Leaflet);
    })();
    return () => { mounted = false; };
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
          // --- FIX 1: Correctly parse Location and ensure values are numbers ---
          const defaultLoc = { latitude: 20.5937, longitude: 78.9629 };
          const loc = shopData.Location; // Use uppercase 'L' from backend
          
          const safeLocation = {
            latitude: Number(loc?.latitude) || defaultLoc.latitude,
            longitude: Number(loc?.longitude) || defaultLoc.longitude
          };
          // --- End of Fix 1 ---

          setFormData({
            shop_name: shopData.shop_name || "",
            address: shopData.address || "",
            contact: shopData.contact || "",
            account_no: shopData.account_no || "",
            mobile_no: shopData.mobile_no || "",
            upi_id: shopData.upi_id || "",
            category: shopData.category || [],
            location: safeLocation, // Set the safe, numbered location
            owner_id: user.id,
            image: base64Image,
          });
        }
      } catch (err) {
        console.error("Error fetching shop:", err);
      } finally {
        setLoading(false);
      }
    };
    getShop();
  }, [user, isSignedIn, isLoaded, getToken, API_URL]);

  // ✅ Low stock threshold persistence
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(`lowStockThreshold:${user?.id}`));
      if (!Number.isNaN(v) && v >= 0) setLowThreshold(v);
    } catch {}
  }, [user?.id]);

  const saveThreshold = () => {
    try {
      const v = Math.max(0, Number(lowThreshold) || 0);
      setLowThreshold(v);
      localStorage.setItem(`lowStockThreshold:${user?.id}`, String(v));
    } catch {}
  };

  // ✅ Handle field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Address input with Places fallback predictions
  const handleAddressInputChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, address: value }));
    if (!placesReady) return;
    if (!sessionTokenRef.current) sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    if (value.trim().length < 3) { setPredictions([]); return; }
    const svc = new window.google.maps.places.AutocompleteService();
    const opts = { input: value, sessionToken: sessionTokenRef.current, componentRestrictions: { country: 'in' }, types: ['geocode'] };
    svc.getPlacePredictions(opts, (res, status) => {
      if (status !== window.google.maps.places.PlacesServiceStatus.OK || !res) {
        console.warn('Places predictions status:', status);
        setPredictions([]);
        return;
      }
      setPredictions(res);
    });
  };

  const pickPrediction = (prediction) => {
    if (!placesReady) return;
    const svc = new window.google.maps.places.PlacesService(document.createElement('div'));
    svc.getDetails({ placeId: prediction.place_id, fields: ['formatted_address','geometry'] }, (place, status) => {
      if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.geometry) return;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setFormData((prev) => ({ ...prev, address: place.formatted_address || prediction.description, location: { latitude: lat, longitude: lng } }));
      setPredictions([]);
      try {
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15);
          markerRef.current.setLatLng([lat, lng]);
        }
      } catch {}
    });
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

  // ✅ Google Places Autocomplete initialization
  useEffect(() => {
    if (!mapLoaded || !window.google || !window.google.maps?.places || !addressRef.current) return;
    if (autocompleteRef.current) return;
    console.log("Initializing autocomplete");

    autocompleteRef.current = new window.google.maps.places.Autocomplete(addressRef.current, {
      fields: ["geometry", "formatted_address"],
      types: ["geocode"],
    });

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      if (!place.geometry) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const address = place.formatted_address;

      setFormData((prev) => ({
        ...prev,
        address,
        location: { latitude: lat, longitude: lng },
      }));

      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.setView([lat, lng], 15);
        markerRef.current.setLatLng([lat, lng]);
      }
    });
  }, [mapLoaded]);

  // ✅ Render Leaflet map
  useEffect(() => {
    if (!mapDivRef.current || !LVar) return;
    
    // Ensure location has valid numbers before trying to render
    const lat = Number(formData.location.latitude) || 20.5937;
    const lng = Number(formData.location.longitude) || 78.9629;

    if (!mapInstanceRef.current) {
      const map = LVar.map(mapDivRef.current).setView([lat, lng], 15);
      LVar.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "OpenStreetMap",
      }).addTo(map);

      const marker = LVar.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on("dragend", (e) => {
        const { lat, lng } = e.target.getLatLng();
        setFormData((prev) => ({
          ...prev,
          location: { latitude: lat, longitude: lng },
        }));
      });

      markerRef.current = marker;
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lng]);
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [formData.location.latitude, formData.location.longitude, loading, LVar]); // Depend on Leaflet load

  // ✅ Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = await getToken();

    // --- FIX 2: Map frontend 'location' to backend 'Location' ---
    const dataToSend = {
      ...formData,
      location: formData.location,
      Location: formData.location, // include both to satisfy backend variations
    };

    // --- End of Fix 2 ---

    try {
      const result = await axios.put(`${API_URL}/api/merchant/update_shop`, dataToSend, { // Send the corrected data
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
      <div className="min-h-screen flex items-center justify-center text-[var(--muted-foreground)]">
        Loading shop details...
      </div>
    );
  }

  // ✅ Final UI
  return (
    <ConfigProvider
      theme={{
        algorithm: currentTheme === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "var(--primary)",
          colorBgBase: "var(--background)",
          colorBgContainer: "var(--card)",
          colorBorder: "var(--border)",
          colorText: "var(--foreground)",
        },
      }}
    >
      <div className="min-h-screen flex flex-col md:flex-row bg-[var(--background)] text-[var(--foreground)] relative">
        {/* LEFT SIDE */}
        <div className="flex-1 p-10 flex flex-col justify-center space-y-6 relative ">
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

          {/* --- FIX 3: Removed 'relative z-50' to fix Places API --- */}
          <div className="max-w-2xl relative"> 
            <label className="block text-[var(--muted-foreground)] mb-1">Address</label>
            <input
              type="text"
              name="address"
              ref={addressRef}
              value={formData.address}
              onChange={handleAddressInputChange}
              placeholder="Start typing your address..."
              className="w-full rounded-lg bg-[var(--card)] text-[var(--foreground)] px-3 py-2 border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <div className="mt-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${placesReady ? 'bg-[color-mix(in_oklab,var(--success),white_85%)] text-[var(--success)]' : 'bg-[color-mix(in_oklab,var(--destructive),white_85%)] text-[var(--destructive)]'}`}>
                Google Places: {placesReady ? 'Ready' : 'Unavailable'}
              </span>
            </div>
            {(predictions.length > 0 || (formData.address?.trim()?.length >= 3 && predictions.length === 0)) && (
              <div className="absolute left-0 right-0 top-full mt-1 z-[99999] bg-[var(--card)] border border-[var(--border)] rounded-md shadow-lg overflow-hidden">
                {predictions.length > 0 ? (
                  predictions.map((p) => (
                    <button type="button" key={p.place_id} onClick={() => pickPrediction(p)} className="w-full text-left px-3 py-2 hover:bg-[var(--muted)] text-sm">
                      {p.description}
                    </button>
                  ))
                ) : (
                    <div/>    
                )}
              </div>
            )}
          </div>
          {/* --- End of Fix 3 --- */}


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
              dropdownStyle={{ background: "var(--popover)", color: "var(--popover-foreground)" }}
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
        <div className="md:w-1/2 w-full h-[50vh] md:h-screen relative z-10">
          <div
            ref={mapDivRef}
            className="w-full h-full rounded-xl z-10"
            style={{ minHeight: "400px" }}
          />
        </div>
      </div>
    </ConfigProvider>
  );
};

export default dynamic(() => Promise.resolve(UpdateShop), { ssr: false });