import { useUser, useAuth} from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { user } = useUser();
  const {getToken}=useAuth();
  const userId = user?.id || "";
  let token;
    useEffect(()=>{
        const fun = async ()=>{
            token=await getToken();
        }
        fun();
    }, []);
  const [formData, setFormData] = useState({
    owner_id: userId,
    location: "",
    address: "",
    shop_name: "",
    contact: "",
    account_no: "",
    mobile_no: "",
    upi_id: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // send data to backend
    const res = await fetch("/api/merchant/add_shop", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(formData),
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

        {/* Hidden owner_id field */}
        <input type="hidden" name="owner_id" value={formData.owner_id} />

        {[
          { name: "location", label: "Location" },
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
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition"
        >
          Save Shop
        </button>
      </form>
    </div>
  );
}
