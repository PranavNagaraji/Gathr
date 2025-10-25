"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState, useRef } from "react";
import { useJsApiLoader, StandaloneSearchBox } from "@react-google-maps/api";
import 'leaflet/dist/leaflet.css';
// Leaflet must be loaded only on the client to avoid SSR 'window is not defined'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import AnimatedButton from "@/components/ui/AnimatedButton";

const containerStyle = {
  width: "100%",
  height: "150px",
};

const Checkout = () => {

  const leafletMapRef = useRef(null);
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
    let isMounted = true;
    if (typeof window === 'undefined') return;
    (async () => {
      try {
        const L = (await import('leaflet')).default;
        const defaultIcon = L.icon({
          iconUrl: markerIcon,
          iconRetinaUrl: markerIcon2x,
          shadowUrl: markerShadow,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });
        if (isMounted) {
          L.Marker.prototype.options.icon = defaultIcon;
        }
      } catch {}
    })();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const getAddresses = async () => {
      try {
        const token = await getToken();
        console.log(token);
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
      console.log(user.id); 
        try{
            const token = await getToken();
            console.log(token);
            const res = await axios.get(`${API_URL}/api/order/getCheckout/${user.id}`,{
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log("Checkout details:", res.data);
            console.log(res.data);

            setCheckOutDetails(res.data);
        }catch(error){
            console.log('hi');
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
    if (!selectedAddressId) {
      toast.error("Please select a delivery address");
      return;
    }
    
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    try {
      const token = await getToken();

     if (paymentMethod == "cod") {
        try {
          const token = await getToken();
          console.log(token);
          const payload = {
            clerkId: user.id,
            shop_id: checkOutDetails.shop_id || checkOutDetails.shopId,
            cart_id: checkOutDetails.cart_id || checkOutDetails.cartId,
            payment_method: "cod",
            amount: Number(checkOutDetails.totalPrice || 0),
            address_id: selectedAddressId,
            payment_status: "pending",
          };

          console.log("COD payload:", payload);

          const response = await axios.post(`${API_URL}/api/order/placeOrder`, payload, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          console.log("COD Order result:", response.data);

          if (response.status === 200 || response.data.message === "Order placed successfully") {
            toast.success("Order placed successfully");
            router.push("/customer/cart");
          } else {
            throw new Error("Unexpected response: " + JSON.stringify(response.data));
          }
        } catch (error) {
          console.error("COD Checkout Error:", error.response?.data || error.message);
          toast.error(
            error.response?.data?.message || "Failed to place COD order. Please try again."
          );
        }
      }
    else if (paymentMethod === "online") {
        // Handle Stripe Online Payment
        // Step 1: Create order from cart with selected address
        const orderResponse = await axios.post(
          `${API_URL}/stripe/create-order-from-cart`,
          { 
            clerkId: user.id,
            addressId: selectedAddressId 
          },
          { 
            headers: { 
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}` 
            } 
          }
        );
        
        const orderId = orderResponse.data.order.id;
        
        // Step 2: Create Stripe checkout session
        const checkoutResponse = await axios.post(
          `${API_URL}/stripe/create-checkout-session`,
          { 
            orderId: orderId, 
            clerkId: user.id 
          },
          { 
            headers: { 
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}` 
            } 
          }
        );
        
        // Step 3: Redirect to Stripe Checkout
        window.location.href = checkoutResponse.data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to place order. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-6 sm:px-10 lg:px-20 py-12">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Address + Payment */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Select a Shipping Address</h2>

            <div className="grid md:grid-cols-2 gap-4" role="list" aria-label="Saved addresses">
          {addresses.map((address,idx) => (
            <label
              key={idx}
              role="listitem"
              className={`border rounded-xl p-4 cursor-pointer transition-all ${
                selectedAddressId === address.id
                  ? "border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary),white_88%)] text-[var(--foreground)] shadow-sm dark:bg-[color-mix(in_oklab,var(--primary),black_75%)] dark:text-white"
                  : "border-[var(--border)] hover:border-[var(--ring)]/60 bg-[var(--card)]"
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="radio"
                  name="address"
                  value={address.id}
                  checked={selectedAddressId === address.id}
                  onChange={() => handleSelect(address.id)}
                  className="mt-1 accent-[var(--primary)]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-base">{address.title}</p>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteAddress(address.id);
                      }}
                      className="text-[var(--destructive)] hover:opacity-70 transition"
                      aria-label="Delete address"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">{address.address}</p>
                  {address.description && (
                    <p className="text-xs text-[var(--muted-foreground)] mb-1">{address.description}</p>
                  )}
                  <p className="text-sm flex items-center gap-1">📞 {address.mobile_no}</p>
                </div>
              </div>

              {/* Map */}
              {address.location?.lat && address.location?.long && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)] mt-3 relative z-0">
                  <MiniLeafletMap
                    style={containerStyle}
                    center={[address.location.lat, address.location.long]}
                    zoom={15}
                    marker={{ position: [address.location.lat, address.location.long], draggable: false }}
                  />
                </div>
              )}
            </label>
          ))}
          <button
            onClick={()=>setAddressToggle(!addressToggle)}
            className="min-h-[200px] border-2 border-dashed border-[var(--border)] rounded-xl flex flex-col items-center justify-center hover:bg-[var(--muted)]/40 hover:border-[var(--primary)]/50 transition-all group"
            aria-label="Add new address"
          >
            <div className="text-5xl text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors mb-2">+</div>
            <span className="text-sm text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors">Add Address</span>
          </button>

        {addressToggle && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center">
            <div className="bg-[var(--popover)] text-[var(--popover-foreground)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-2xl relative space-y-4 h-3/4 overflow-y-auto ">
            {/* Close button */}
            <button
                onClick={() => setAddressToggle(false)}
                className="absolute top-3 right-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xl font-bold"
                aria-label="Close"
            >
                ✕
            </button>

            <p className="text-sm text-[var(--muted-foreground)] mb-2">Create a new address</p>

            <div className="flex flex-col space-y-3">
                {/* Title */}
                <label className="text-[var(--card-foreground)]">Title</label>
                <input
                type="text"
                placeholder="Title (e.g., Home, Office)"
                value={addAddress.title || ""}
                onChange={(e) =>
                    setAddAddress((prev) => ({ ...prev, title: e.target.value }))
                }
                className="border border-[var(--border)] p-2 rounded-md w-full bg-[var(--card)] text-[var(--card-foreground)]"
                />

                {/* Description */}
                <label className="text-[var(--card-foreground)]">Description</label>
                <input
                type="text"
                placeholder="Description"
                value={addAddress.desc || ""}
                onChange={(e) =>
                    setAddAddress((prev) => ({ ...prev, desc: e.target.value }))
                }
                className="border border-[var(--border)] p-2 rounded-md w-full bg-[var(--card)] text-[var(--card-foreground)]"
                />

                {/* Mobile */}
                <label className="text-[var(--card-foreground)]">Mobile</label>
                <input
                type="tel"
                placeholder="Mobile Number"
                value={addAddress.mobile || ""}
                onChange={(e) =>
                    setAddAddress((prev) => ({ ...prev, mobile: e.target.value }))
                }
                className="border border-[var(--border)] p-2 rounded-md w-full bg-[var(--card)] text-[var(--card-foreground)]"
                />

                {/* Google Places Autocomplete */}
                <label className="text-[var(--card-foreground)]">Address</label>        
                
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
                    if (leafletMapRef.current) {
                      leafletMapRef.current.setView([place.geometry.location.lat(), place.geometry.location.lng()], 15);
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
                    className="border border-[var(--border)] p-2 rounded-md w-full bg-[var(--card)] text-[var(--card-foreground)]"
                />
                </StandaloneSearchBox>

                {/* Map */}
                <MiniLeafletMap
                  style={{ width: "100%", height: "250px" }}
                  center={
                    addAddress.location?.latitude
                      ? [addAddress.location.latitude, addAddress.location.longitude]
                      : [20, 77]
                  }
                  zoom={addAddress.location?.latitude ? 15 : 4}
                  marker={addAddress.location?.latitude && addAddress.location?.longitude ? {
                    position: [addAddress.location.latitude, addAddress.location.longitude],
                    draggable: true,
                    onDragEnd: (ll) => setAddAddress(prev => ({ ...prev, location: { latitude: ll.lat, longitude: ll.lng } }))
                  } : null}
                  onMapClick={(ll) => setAddAddress(prev => ({ ...prev, location: { latitude: ll.lat, longitude: ll.lng } }))}
                  mapRefOut={leafletMapRef}
                />

                {/* Submit button */}
                <div className="mt-4">
                <AnimatedButton onClick={() => handleAddAddress(addAddress)} variant="primary" rounded="lg" >
                  Add Address
                </AnimatedButton>
                </div>
            </div>
            </div>
        </div>
        )}

            </div>
          </div>

          <div className="bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
            <div className="flex flex-col space-y-3">
              <label className="flex items-center gap-3">
                <input type="radio" name="payment" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="accent-[var(--primary)]" />
                <span>Cash on Delivery</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="payment" value="online" checked={paymentMethod === "online"} onChange={() => setPaymentMethod("online")} className="accent-[var(--primary)]" />
                <span>Online Payment</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] rounded-2xl p-6 sticky top-24">
            <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Items</span><span>{checkOutDetails?.cartItems?.length ?? 0}</span></div>
              <div className="flex justify-between"><span>Subtotal</span><span>₹{checkOutDetails?.totalPrice?.toFixed(2) ?? "0.00"}</span></div>
            </div>
            <div className="mt-4 border-t border-[var(--border)] pt-4 flex justify-between font-semibold">
              <span>Total</span>
              <span>₹{checkOutDetails?.totalPrice?.toFixed(2) ?? "0.00"}</span>
            </div>
            <div className="mt-4">
            <AnimatedButton onClick={handleCheckOut} className="" size="lg" rounded="lg" variant="primary" >
              Checkout
            </AnimatedButton>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
};

export default Checkout;

function MiniLeafletMap({ style, center, zoom = 13, marker, onMapClick, mapRefOut }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!divRef.current) return;

    let leaflet;
    (async () => {
      try {
        leaflet = (await import('leaflet')).default;

        if (!mapRef.current) {
          const map = leaflet.map(divRef.current, {
            center,
            zoom,
            zoomControl: false,
          });
          leaflet
            .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap contributors',
            })
            .addTo(map);
          if (onMapClick) {
            map.on('click', (e) => onMapClick(e.latlng));
          }
          mapRef.current = map;
          if (mapRefOut) mapRefOut.current = map;
        } else {
          mapRef.current.setView(center, zoom);
        }

        if (marker) {
          const { position, draggable = false, onDragEnd } = marker;
          if (!markerRef.current) {
            const icon = leaflet.icon({ iconUrl: '/destination.png', iconSize: [32,32], iconAnchor: [16,32], popupAnchor: [0,-28] });
            const m = leaflet.marker(position, { draggable, icon }).addTo(mapRef.current);
            if (draggable && onDragEnd) {
              m.on('dragend', (e) => onDragEnd(e.target.getLatLng()));
            }
            markerRef.current = m;
          } else {
            markerRef.current.setLatLng(position);
            markerRef.current.dragging && markerRef.current.dragging[draggable ? 'enable' : 'disable']?.();
          }
        } else if (markerRef.current) {
          mapRef.current.removeLayer(markerRef.current);
          markerRef.current = null;
        }
      } catch {}
    })();
  }, [center?.[0], center?.[1], zoom, marker?.position?.[0], marker?.position?.[1], marker?.draggable, onMapClick]);

  return <div style={style} ref={divRef} />;
}
