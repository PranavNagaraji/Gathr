'use client'
import { useState, useEffect, useRef, useCallback } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
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
  const categoriesOptions = ["Grocery", "Electronics", "Clothing", "Food", "Books", "Other"];

  const { isLoaded: mapLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

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

  // Map click & marker drag
  const handleMapClick = useCallback((e) => {
    setFormData(prev => ({
      ...prev,
      location: { latitude: e.latLng.lat(), longitude: e.latLng.lng() }
    }));
  }, []);

  const handleMarkerDragEnd = useCallback((e) => {
    setFormData(prev => ({
      ...prev,
      location: { latitude: e.latLng.lat(), longitude: e.latLng.lng() }
    }));
  }, []);
  
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
      <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-2xl space-y-4">
        <h2 className="text-3xl font-semibold text-white mb-4 text-center">Shop Registration</h2>

        {/* Shop Image */}
        <div>
          <label className="text-gray-300 mb-1 block">Shop Image</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
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
              className="w-full p-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full p-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Categories */}
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
                    sx={{ color: "white" }}
                  />
                }
                label={<span className="text-white">{cat}</span>}
              />
            ))}
          </div>
        </div>

        {/* Google Map */}
        <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-500">
          {mapLoaded && (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={{ lat: formData.location.latitude, lng: formData.location.longitude }}
              zoom={15}
              onClick={handleMapClick}
              options={{ disableDefaultUI: true }}
            >
              <Marker
                position={{ lat: formData.location.latitude, lng: formData.location.longitude }}
                draggable
                onDragEnd={handleMarkerDragEnd}
              />
            </GoogleMap>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="contained"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
        >
          Save Shop
        </Button>
      </form>
    </div>
  );
}
