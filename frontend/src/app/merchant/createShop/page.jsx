'use client'
import { useState, useEffect, useRef, useCallback } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Button, Checkbox, FormControlLabel, Typography } from "@mui/material";
import { Select, ConfigProvider, theme } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useUser, useAuth } from "@clerk/nextjs";
import { useTheme } from '@/components/theme/ThemeProvider';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const containerStyle = { width: "100%", height: "300px" };

export default function createShop() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const { theme: currentTheme } = useTheme();
  const router = useRouter();

  const [formData, setFormData] = useState({
    owner_id: "",
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
  const [autocomplete, setAutocomplete] = useState(null);
  const addressRef = useRef();
  const categoriesOptions = [
    "Grocery", "Electronics", "Clothing", "Food", "Books", "Other",
    "Pharmacy", "Home & Kitchen", "Beauty", "Stationery", "Toys"
  ];
  const [catOpen, setCatOpen] = useState(false); // no-op after switch, kept to avoid logic changes
  const [otherCategory, setOtherCategory] = useState("");

  const { isLoaded: mapLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  // Redirect if shop already exists for this owner
  useEffect(() => {
    const checkExistingShop = async () => {
      try {
        if (!user) return;
        const token = await getToken();
        const res = await axios.post(
          `${API_URL}/api/merchant/get_shop`,
          { owner_id: user.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res?.data?.shop) {
          router.push('/merchant/dashboard');
        }
      } catch (e) {
        // ignore errors; user likely has no shop yet
      }
    };
    checkExistingShop();
  }, [user, getToken, API_URL, router]);

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

  // Text inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Category toggle
  const handleCategoryToggle = (cat) => {
    setFormData(prev => ({
      ...prev,
      category: prev.category.includes(cat)
        ? prev.category.filter(c => c !== cat)
        : [...prev.category, cat]
    }));
  };

  // Google Places Autocomplete
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

  // Leaflet map refs and handlers
  const mapDivRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapDivRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapDivRef.current, {
        center: [formData.location.latitude, formData.location.longitude],
        zoom: 15,
        zoomControl: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setFormData(prev => ({ ...prev, location: { latitude: lat, longitude: lng } }));
      });
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([formData.location.latitude, formData.location.longitude]);
    }

    const map = mapInstanceRef.current;
    if (!markerRef.current) {
      const m = L.marker([formData.location.latitude, formData.location.longitude], { draggable: true }).addTo(map);
      m.on('dragend', (e) => {
        const ll = e.target.getLatLng();
        setFormData(prev => ({ ...prev, location: { latitude: ll.lat, longitude: ll.lng } }));
      });
      markerRef.current = m;
    } else {
      markerRef.current.setLatLng([formData.location.latitude, formData.location.longitude]);
    }
  }, [formData.location.latitude, formData.location.longitude]);

  // Image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        image: reader.result // store base64 string in formData.image
      }));
    };
    if (file) reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
  }

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = await getToken();
    const body = {
      ...formData,
      owner_id: user.id,
      Location: formData.location,
    };
    // console.log("Image",formData.image);
    const res = await fetch(`${API_URL}/api/merchant/add_shop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (res.ok) alert("Shop details saved!");
    else alert(`Error saving shop details: ${data.message}`);
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
        }
      }}
    >
      <div className="min-h-screen p-4 md:p-8 bg-[var(--background)] text-[var(--foreground)]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Shop Registration</h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            {/* LEFT: Details */}
            <form onSubmit={handleSubmit} className="md:col-span-3 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['shop_name', 'contact', 'account_no', 'mobile_no'].map(field => (
                  <div key={field}>
                    <Typography variant="subtitle2" sx={{ color: 'var(--muted-foreground)', fontWeight: 600, mb: 0.5 }}>
                      {field.replace('_', ' ').toUpperCase()}
                    </Typography>
                    <input
                      type="text"
                      name={field}
                      value={formData[field]}
                      onChange={handleChange}
                      className="w-full bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] text-base p-2 focus:outline-none focus:ring-0 focus:border-[var(--ring)] transition-colors"
                      required
                    />
                  </div>
                ))}
              </div>

              <div>
                <Typography variant="subtitle2" sx={{ color: 'var(--muted-foreground)', fontWeight: 600, mb: 0.5 }}>Address</Typography>
                <input
                  type="text"
                  name="address"
                  ref={addressRef}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Start typing your address..."
                  className="w-full bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] text-base p-2 focus:outline-none focus:ring-0 focus:border-[var(--ring)] transition-colors"
                  required
                />
              </div>

              <div>
                <Typography variant="subtitle2" sx={{ color: 'var(--muted-foreground)', fontWeight: 600, mb: 1 }}>Categories</Typography>
                <Select
                  mode="multiple"
                  value={formData.category}
                  onChange={(values) => setFormData(prev => ({ ...prev, category: values }))}
                  style={{ width: '100%' }}
                  placeholder="Select categories"
                  maxTagCount="responsive"
                  suffixIcon={
                    <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                      <span>{formData.category.length}</span>
                      <DownOutlined />
                    </span>
                  }
                  options={[...new Set([...categoriesOptions, 'Other'])].map(v => ({ value: v, label: v }))}
                />
                {formData.category.includes('Other') && (
                  <div className="mt-3">
                    <Typography variant="subtitle2" sx={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Enter custom category</Typography>
                    <input
                      type="text"
                      value={otherCategory}
                      onChange={(e) => setOtherCategory(e.target.value)}
                      onBlur={() => {
                        if (otherCategory.trim()) {
                          setFormData(prev => ({
                            ...prev,
                            category: prev.category.filter(c => c !== 'Other').concat(otherCategory.trim())
                          }));
                          setOtherCategory("");
                        }
                      }}
                      className="w-full mt-2 bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] p-2 focus:outline-none focus:border-[var(--ring)]"
                      placeholder="Type new category"
                    />
                    <Typography variant="caption" sx={{ color: 'var(--muted-foreground)', mt: 0.5, display: 'block' }}>
                      Blur the input to add it and replace "Other".
                    </Typography>
                  </div>
                )}
              </div>

              <div className="w-full h-64 rounded-xl overflow-hidden border border-[var(--border)]">
                <div style={containerStyle} ref={mapDivRef} />
              </div>

              <Button
                type="submit"
                variant="contained"
                sx={{ mt: 1, width: 'fit-content', px: 5, py: 1.5, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
              >
                Save Shop
              </Button>
            </form>

            {/* RIGHT: Image */}
            <div className="md:col-span-2 md:order-last md:sticky md:top-8 h-fit">
              <label className="text-sm font-medium mb-2 block text-[var(--muted-foreground)]">Shop Image</label>
              <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                <div className="relative aspect-square w-full">
                  {formData.image ? (
                    <img src={formData.image} alt="Shop" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-[var(--muted-foreground)]">No image</div>
                  )}
                  {formData.image && (
                    <button type="button" onClick={clearImage} className="absolute top-2 right-2 h-8 px-3 rounded-full bg-red-600 text-white text-sm">Delete</button>
                  )}
                </div>
              </div>

              <label htmlFor="shop-image-upload" className="mt-4 block w-full text-center py-3 px-4 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] font-medium cursor-pointer transition-colors">Upload Image</label>
              <input id="shop-image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}
