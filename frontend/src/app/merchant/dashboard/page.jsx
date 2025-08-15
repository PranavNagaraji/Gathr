'use client'
import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { user, isLoaded } = useUser(); // added isLoaded to ensure user is ready
  const { getToken } = useAuth();

  const [token, setToken] = useState("");
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [formData, setFormData] = useState({
    owner_id: "",
    Location: "",
    address: "",
    shop_name: "",
    contact: "",
    account_no: "",
    mobile_no: "",
    upi_id: "",
  });

  // Get token
  useEffect(() => {
    const fetchToken = async () => {
      const t = await getToken();
      setToken(t || "");
    };
    fetchToken();
  }, [getToken]);

  // Set owner_id once user is loaded
  useEffect(() => {
    if (isLoaded && user) {
      setFormData((prev) => ({ ...prev, owner_id: user.id }));
    }
  }, [isLoaded, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const parseLocationString = (str) => {
    try {
      const [lat, lng] = str.split(",").map((v) => parseFloat(v.trim()));
      return { latitude: lat, longitude: lng };
    } catch {
      return { latitude: null, longitude: null };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.owner_id) {
      alert("User not loaded yet. Please wait.");
      return;
    }

    const updatedData = {
      ...formData,
      location: parseLocationString(formData.Location),
    };
    setToken(await getToken());

    const res = await fetch(`${API_URL}/api/merchant/add_shop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(updatedData),
    });

    if (res.ok) {
      alert("Shop details saved!");
    } else {
      alert("Error saving shop details.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-md"
      >
        <h2 className="text-2xl font-semibold text-white mb-4">
          Shop Registration
        </h2>

        <input type="hidden" name="owner_id" value={formData.owner_id} />

        {[
          { name: "Location", label: "Location (lat, lng)" },
          { name: "address", label: "Address" },
          { name: "shop_name", label: "Shop Name" },
          { name: "contact", label: "Contact" },
          { name: "account_no", label: "Account No" },
          { name: "mobile_no", label: "Mobile No" },
          { name: "upi_id", label: "UPI ID" },
        ].map((field) => (
          <div key={field.name} className="mb-4">
            <label className="block text-gray-300 mb-1">{field.label}</label>
            <input
              type="text"
              name={field.name}
              value={formData[field.name]}
              onChange={handleChange}
              required
              className="w-full p-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={!isLoaded || !formData.owner_id}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition disabled:opacity-50"
        >
          Save Shop
        </button>
      </form>
    </div>
  );
}
