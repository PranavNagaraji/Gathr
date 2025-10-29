'use client'
import { useState, useEffect, useRef, useCallback } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import 'leaflet/dist/leaflet.css';
// import L from 'leaflet'; // REMOVED: This causes the "window is not defined" error
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

  // ADDED: State to hold the Leaflet instance once loaded
  const [L, setL] = useState(null);

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

  // MODIFIED: Leaflet dynamic import and icon fix
  useEffect(() => {
    // This function now runs only once on the client
    const initLeaflet = async () => {
      // Dynamically import Leaflet
      const Leaflet = (await import('leaflet')).default;

      // Set up the default icon
      const defaultIcon = Leaflet.icon({
        iconUrl: markerIcon.src, // FIXED: Use .src for static image imports
        iconRetinaUrl: markerIcon2x.src, // FIXED: Use .src
        shadowUrl: markerShadow.src, // FIXED: Use .src
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      Leaflet.Marker.prototype.options.icon = defaultIcon;

      // Save the loaded Leaflet instance to state to trigger map render
      setL(Leaflet);
    };

    initLeaflet();
  }, []); // Empty dependency array ensures this runs only once on mount

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

  // MODIFIED: This useEffect now depends on L and will only run once L is loaded
  useEffect(() => {
    // ADDED: Guard to wait for Leaflet to be loaded
    if (!mapDivRef.current || !L) return;

    // --- Existing Logic (unchanged) ---
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
    const storeIcon = L.icon({ iconUrl: '/store.png', iconSize: [32,32], iconAnchor: [16,32], popupAnchor: [0,-28] });
    if (!markerRef.current) {
      const m = L.marker([formData.location.latitude, formData.location.longitude], { draggable: true, icon: storeIcon }).addTo(map);
      m.on('dragend', (e) => {
        const ll = e.target.getLatLng();
        setFormData(prev => ({ ...prev, location: { latitude: ll.lat, longitude: ll.lng } }));
      });
      markerRef.current = m;
    } else {
      markerRef.current.setLatLng([formData.location.latitude, formData.location.longitude]);
      markerRef.current.setIcon(storeIcon);
    }
  }, [formData.location.latitude, formData.location.longitude, L]); // ADDED: L as a dependency

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
      location: formData.location, // Note: Backend might expect 'location', not 'Location'
    };
    const res = await fetch(`${API_URL}/api/merchant/add_shop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
  };

  if (!L) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-[var(--background)] text-[var(--foreground)]">
        <div className="max-w-7xl mx-auto animate-pulse">
          <div className="h-10 w-64 bg-[var(--muted)] rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            <div className="md:col-span-3 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-[var(--muted)] rounded" />
                ))}
              </div>
              <div className="w-full h-64 rounded-xl bg-[var(--muted)]" />
              <div className="h-10 w-40 bg-[var(--muted)] rounded" />
            </div>
            <div className="md:col-span-2">
              <div className="aspect-square w-full rounded-xl bg-[var(--muted)]" />
              <div className="mt-4 h-12 bg-[var(--muted)] rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgContainer: 'var(--card)',
          colorText: 'var(--foreground)',
          colorTextPlaceholder: 'var(--muted-foreground)',
          colorBorder: 'var(--border)',
          optionSelectedBg: 'var(--accent)',
          optionSelectedColor: 'var(--accent-foreground)',
          optionActiveBg: 'var(--muted)',
          controlItemBgHover: 'var(--muted)',
          colorBgElevated: 'var(--popover)'
        }
      }}
    >
      <div className="min-h-screen p-4 md:p-8 bg-[var(--background)] text-[var(--foreground)]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Shop Registration</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            <form onSubmit={handleSubmit} className="md:col-span-3 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['shop_name', 'contact', 'account_no', 'mobile_no'].map((field) => (
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