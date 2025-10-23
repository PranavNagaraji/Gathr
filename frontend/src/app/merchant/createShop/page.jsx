'use client'
import { useState, useEffect, useRef, useCallback } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import { Select } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useUser, useAuth } from "@clerk/nextjs";

const containerStyle = { width: "100%", height: "300px" };

export default function createShop() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-2xl w-full max-w-2xl space-y-4 border border-gray-700">
        <h2 className="text-3xl font-semibold text-white mb-4 text-center">Shop Registration</h2>

        {/* Shop Image */}
        <div>
          <label className="text-gray-300 mb-1 block">Shop Image</label>
          <input type="file" accept="image/*" onChange={handleImageChange} className="text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600"/>
          {imagePreview && (
            <img src={imagePreview} alt="Preview" className="mt-2 w-48 h-48 object-cover rounded-lg border border-gray-500" />
          )}
        </div>

        {/* Shop Info Inputs */}
        {["shop_name", "contact", "account_no", "mobile_no", "upi_id"].map(field => (
          <div key={field}>
            <label className="text-gray-300 mb-1 block">{field.replace("_", " ").toUpperCase()}</label>
            <input
              type="text"
              name={field}
              value={formData[field]}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
        ))}

        {/* Address */}
        <div>
          <label className="text-gray-300 mb-1 block">Address</label>
          <input
            type="text"
            name="address"
            ref={addressRef}
            value={formData.address}
            onChange={handleChange}
            placeholder="Start typing your address..."
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          />
        </div>

        {/* Categories - Antd Select */}
        <div>
          <label className="text-gray-300 mb-1 block">Categories</label>
          <Select
            mode="multiple"
            value={formData.category}
            onChange={(values)=>setFormData(prev=>({...prev, category: values}))}
            style={{ width: '100%' }}
            placeholder="Select categories"
            maxTagCount="responsive"
            suffixIcon={
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <span>{formData.category.length}</span>
                <DownOutlined />
              </span>
            }
            options={[...new Set([...categoriesOptions, 'Other'])].map(v => ({ value: v, label: v }))}
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
                      category: prev.category.filter(c=>c!== 'Other').concat(otherCategory.trim())
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

        {/* Map */}
        <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-700">
          <div style={containerStyle} ref={mapDivRef} />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="contained"
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
        >
          Save Shop
        </Button>
      </form>
    </div>
  );
}
