"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState, useRef } from "react";
import { GoogleMap, Marker, useJsApiLoader, StandaloneSearchBox } from "@react-google-maps/api";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

const containerStyle = {
  width: "300px",
  height: "250px",
};

const Checkout = () => {

  const mapRef = useRef(null);
  const [searchBox, setSearchBox] = useState(null);
  const router = useRouter();
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [checkOutDetails , setCheckOutDetails] = useState({});

  const [addressToggle, setAddressToggle] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addAddress, setAddAddress] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("");

  const Libraries = ["places"];
    const { isLoaded: mapLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: Libraries, // ← Important! Include "places"
    });

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const getAddresses = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(
          `${API_URL}/api/customer/getAddressesByUser/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = res.data.addresses || [];
        setAddresses(data);

        const defaultAddr = data.find((a) => a.isDefault);
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      } catch (error) {
        console.error("Error fetching addresses:", error);
      }
    };
    getAddresses();
    const getCheckOutDetails = async () => {
        try{
            const token = await getToken();
            const res = await axios.get(`${API_URL}/api/order/getCheckout/${user.id}`,{
                headers: { Authorization: `Bearer ${token}` },
            });
            setCheckOutDetails(res.data);
        }catch(error){
            console.error("Error fetching checkout details:", error);
        }
    }
    getCheckOutDetails();

  }, [isLoaded, isSignedIn, user]);

  const handleSelect = (id) => {
    setSelectedAddressId(id);
  };

  const handleAddAddress = async (addAddress) => {
    const token = await getToken();
    const result = await axios.post(
      `${API_URL}/api/customer/addAddress`,{
        title: addAddress.title,
        address: addAddress.address,
        location: {
          lat: addAddress.location.latitude,
          long: addAddress.location.longitude
        },
        desc :addAddress.desc,
        mobile: addAddress.mobile,
        clerkId: user.id
      },{
        headers: { Authorization: `Bearer ${token}` },
      }
      )
      const data = result.data.address;
      setAddresses((prev) => [...prev, data]);
      setSelectedAddressId(data.id);
      setAddressToggle(false);
  }

  const handleDeleteAddress = async (id) => {
    const token = await getToken();
    await axios.post(`${API_URL}/api/customer/deleteAddress`, { clerkId: user.id , addressId: id },{
      headers: { Authorization: `Bearer ${token}` },
    });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleCheckOut = async () =>{
    const token = await getToken();
    const result = await axios.post(`${API_URL}/api/order/placeOrder`,{
      clerkId: user.id,
      shop_id: checkOutDetails.shop_id,
      cart_id: checkOutDetails.cart_id,
      payment_method: paymentMethod,
      amount: checkOutDetails.totalPrice,
      address_id: selectedAddressId,
      payment_status: (paymentMethod === "cod") ? "pending" : "processing"
    },{
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(result.data);
    if(result.status === 200){
      alert("Order Placed Successfully!");
      router.push("/customer/cart");
    }
  }

  return (
    <div className="flex flex-col p-6 space-y-6">
      <h1 className="text-3xl text-yellow-500 font-bold">Checkout</h1>

      <div>
        <h2 className="text-xl font-semibold mb-4">Select a Shipping Address</h2>

        <div className="grid md:grid-cols-4 gap-4">
          {addresses.map((address) => (
            <label
              key={address.id}
              className={`border rounded-2xl p-4 cursor-pointer transition-all ${
                selectedAddressId === address.id
                  ? "text-black border-yellow-500 bg-yellow-50"
                  : "border-gray-300 hover:border-yellow-400"
              }`}
            >
              <div className="flex flex-col space-y-2">
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="address"
                    value={address.id}
                    checked={selectedAddressId === address.id}
                    onChange={() => handleSelect(address.id)}
                    className="mt-1 accent-yellow-500"
                  />
                  <div className="w-full">
                    <div className="flex justify-between w-full">
                    <p className="font-semibold">{address.title} </p>
                    <Trash2 className="text-red-500" onClick={() => handleDeleteAddress(address.id)}></Trash2>
                    </div>
                    <p className="text-gray-700">{address.address}</p>
                    <p className="text-sm text-gray-500">{address.description}</p>
                    <p className="text-sm text-gray-700">📞 {address.mobile_no}</p>
                  </div>
                </div>

                {/* Google Map */}
                {mapLoaded && address.location?.lat && address.location?.long && (
                  <div className="rounded-lg w-fit border">
                    <GoogleMap
                      mapContainerStyle={containerStyle}
                      center={{
                        lat: address.location.lat,
                        lng: address.location.long,
                      }}
                      zoom={15}
                      options={{ disableDefaultUI: true }}
                    >
                      <Marker
                        position={{
                          lat: address.location.lat,
                          lng: address.location.long,
                        }}
                      />
                    </GoogleMap>
                  </div>
                )}
              </div>
            </label>
          ))}
          <button className="border border-white rounded-lg flex items-center justify-center hover:bg-gray-600">
            <div className="text-6xl" onClick={()=>setAddressToggle(!addressToggle)}>
                +
            </div>
          </button>

        {addressToggle && mapLoaded && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl relative space-y-4 h-3/4 overflow-y-scroll ">
            {/* Close button */}
            <button
                onClick={() => setAddressToggle(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold"
            >
                ✕
            </button>

            <p className="text-sm text-gray-600 mb-2">Create a new address</p>

            <div className="flex flex-col space-y-3">
                {/* Title */}
                <label htmlFor="" className="text-black">Title</label>
                <input
                type="text"
                placeholder="Title (e.g., Home, Office)"
                value={addAddress.title || ""}
                onChange={(e) =>
                    setAddAddress((prev) => ({ ...prev, title: e.target.value }))
                }
                className="border p-2 rounded w-full text-black"
                />

                {/* Description */}
                <label htmlFor="" className="text-black">Description</label>
                <input
                type="text"
                placeholder="Description"
                value={addAddress.desc || ""}
                onChange={(e) =>
                    setAddAddress((prev) => ({ ...prev, desc: e.target.value }))
                }
                className="border p-2 rounded w-full text-black"
                />

                {/* Mobile */}
                <label htmlFor="" className="text-black">Mobile</label>
                <input
                type="tel"
                placeholder="Mobile Number"
                value={addAddress.mobile || ""}
                onChange={(e) =>
                    setAddAddress((prev) => ({ ...prev, mobile: e.target.value }))
                }
                className="border p-2 rounded w-full text-black"
                />

                {/* Google Places Autocomplete */}
                <label htmlFor="" className="text-black">address</label>        
                
                <StandaloneSearchBox
                onLoad={(ref) => setSearchBox(ref)}
                onPlacesChanged={() => {
                    if (!searchBox) return;
                    const places = searchBox.getPlaces();
                    if (!places || places.length === 0) return;
                    const place = places[0];

                    setAddAddress((prev) => ({
                    ...prev,
                    address: place.formatted_address,
                    location: {
                        latitude: place.geometry.location.lat(),
                        longitude: place.geometry.location.lng(),
                    },
                    }));

                    // Center map to selected place
                    if (mapRef.current) {
                    mapRef.current.panTo({
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                    });
                    mapRef.current.setZoom(15);
                    }
                }}
                >
                <input
                    type="text"
                    placeholder="Search Address"
                    value={addAddress.address || ""}
                    onChange={(e) =>
                    setAddAddress((prev) => ({ ...prev, address: e.target.value }))
                    }
                    className="border p-2 rounded w-full text-black"
                />
                </StandaloneSearchBox>

                {/* Google Map */}
                <GoogleMap
                mapContainerStyle={{ width: "100%", height: "250px" }}
                center={
                    addAddress.location?.latitude
                    ? {
                        lat: addAddress.location.latitude,
                        lng: addAddress.location.longitude,
                        }
                    : { lat: 20, lng: 77 }
                }
                zoom={addAddress.location?.latitude ? 15 : 4}
                onClick={(e) =>
                    setAddAddress((prev) => ({
                    ...prev,
                    location: { latitude: e.latLng.lat(), longitude: e.latLng.lng() },
                    }))
                }
                onLoad={(map) => (mapRef.current = map)}
                options={{ disableDefaultUI: true }}
                >
                {addAddress.location?.latitude && addAddress.location?.longitude && (
                    <Marker
                    position={{
                        lat: addAddress.location.latitude,
                        lng: addAddress.location.longitude,
                    }}
                    />
                )}
                </GoogleMap>

                {/* Submit button */}
                <button
                onClick={() => handleAddAddress(addAddress)}
                className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 transition mt-2"
                >
                Add Address
                </button>
            </div>
            </div>
        </div>
        )}

        </div>
      </div>

      {selectedAddressId && (
        <div className="p-4 border-t mt-6">
          <p className="text-sm text-gray-600">
            Selected Address ID:{" "}
            <span className="font-medium">{selectedAddressId}</span>
          </p>
        </div>
      )}
      <h1>Total : ${checkOutDetails.totalPrice}</h1>
       {/* Payment Method */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Select Payment Method</h2>
        <div className="flex flex-col space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="payment"
              value="cod"
              checked={paymentMethod === "cod"}
              onChange={() => setPaymentMethod("cod")}
              className="accent-yellow-500"
            />
            <span>Cash on Delivery</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="payment"
              value="online"
              checked={paymentMethod === "online"}
              onChange={() => setPaymentMethod("online")}
              className="accent-yellow-500"
            />
            <span>Online Payment</span>
          </label>
        </div>
        <button className="bg-green-500 p-2 rounded-lg" onClick={()=>{handleCheckOut()}}>Checkout</button>
      </div>

    </div>

  );
};

export default Checkout;
