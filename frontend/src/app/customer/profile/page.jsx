"use client";

import { useEffect, useRef, useState } from "react";
import { UserProfile, useUser, useAuth } from "@clerk/nextjs";
import axios from "axios";
import { Trash2 } from "lucide-react";
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useJsApiLoader, StandaloneSearchBox } from "@react-google-maps/api";
import ProfileShell from "@/components/profile/ProfileShell";

function DotIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" className="h-3 w-3">
      <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z" />
    </svg>
  );
}

export default function CustomerProfilePage() {
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const role = user?.publicMetadata?.role || "customer";
  const name = user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || "User";
  const avatar = user?.imageUrl;
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const [addresses, setAddresses] = useState([]);
  const [addressToggle, setAddressToggle] = useState(false);
  const [addAddress, setAddAddress] = useState({
    title: "",
    address: "",
    desc: "",
    mobile: "",
    location: { latitude: "", longitude: "" },
  });
  const leafletMapRef = useRef(null);
  const [searchBox, setSearchBox] = useState(null);
  const Libraries = ["places"];
  const { isLoaded: mapLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: Libraries,
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
        const res = await axios.get(`${API_URL}/api/customer/getAddressesByUser/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAddresses(res.data.addresses || []);
      } catch (e) {
        console.error("Error fetching addresses:", e);
      }
    };
    getAddresses();
  }, [isLoaded, isSignedIn, user, getToken, API_URL]);

  const handleAddAddress = async () => {
    try {
      const token = await getToken();
      const result = await axios.post(
        `${API_URL}/api/customer/addAddress`,
        {
          title: addAddress.title,
          address: addAddress.address,
          location: {
            lat: Number(addAddress.location.latitude),
            long: Number(addAddress.location.longitude),
          },
          desc: addAddress.desc,
          mobile: addAddress.mobile,
          clerkId: user.id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = result.data.address;
      setAddresses((prev) => [...prev, data]);
      setAddressToggle(false);
      setAddAddress({ title: "", address: "", desc: "", mobile: "", location: { latitude: "", longitude: "" } });
    } catch (e) {
      console.error("Error adding address:", e);
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      const token = await getToken();
      await axios.post(
        `${API_URL}/api/customer/deleteAddress`,
        { clerkId: user.id, addressId: id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error("Error deleting address:", e);
    }
  };
  return (
    <ProfileShell>
      {/* Clerk UserProfile first */}
      <div className="flex flex-col items-stretch w-full">
        <UserProfile
          appearance={{
            variables: {
              colorPrimary: "var(--primary)",
              colorText: "var(--foreground)",
              colorBackground: "var(--card)",
              colorInputBackground: "var(--background)",
              colorInputText: "var(--foreground)",
              colorDanger: "var(--destructive)",
            },
            elements: {
              rootBox: "w-full", // Ensures it spans full parent width
              card:
                "w-full max-w-none bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] shadow-none rounded-xl", // Removed shadow, kept styling consistent
              navbar: "bg-[var(--card)] flex flex-wrap justify-between items-center",
              headerTitle: "text-[var(--foreground)] text-lg sm:text-xl font-semibold",
              profileSection: "bg-[var(--card)] w-full",
              formButtonPrimary:
                "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity duration-200",
              input:
                "bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] w-full",
            },
          }}
          routing="hash"
        >
          <UserProfile.Page label="Addresses" labelIcon={<DotIcon />} url="addresses">
            <div className="bg-[var(--card)] text-[var(--card-foreground)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Your Addresses</h2>
                <button
                  onClick={() => setAddressToggle(true)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                >
                  Add Address
                </button>
              </div>
              {addresses.length === 0 ? (
                <div className="text-sm text-[var(--muted-foreground)]">No addresses added yet.</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {addresses.map((address, idx) => (
                    <div key={idx} className="relative border border-[var(--border)] rounded-xl p-4 bg-[var(--card)]">
                      <button
                        onClick={() => handleDeleteAddress(address.id)}
                        className="absolute top-3 right-3 text-[var(--destructive)] hover:opacity-80"
                        aria-label="Delete address"
                        title="Delete address"
                      >
                        <Trash2 size={18} />
                      </button>
                      <div className="font-semibold mb-1 pr-6">{address.title}</div>
                      <div className="text-sm text-[var(--muted-foreground)] mb-1">{address.address}</div>
                      {address.description && (
                        <div className="text-xs text-[var(--muted-foreground)] mb-1">{address.description}</div>
                      )}
                      {address.mobile_no && (
                        <div className="text-sm">📞 {address.mobile_no}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </UserProfile.Page>
        </UserProfile>
      </div>

      {addressToggle && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center">
          <div className="bg-[var(--popover)] text-[var(--popover-foreground)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-xl relative space-y-3">
              <button
                onClick={() => setAddressToggle(false)}
                className="absolute top-3 right-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xl font-bold"
                aria-label="Close"
              >
                ✕
              </button>
              <h3 className="text-lg font-semibold mb-2">Add New Address</h3>
              <label className="text-sm">Title</label>
              <input
                type="text"
                value={addAddress.title}
                onChange={(e) => setAddAddress((p) => ({ ...p, title: e.target.value }))}
                className="border border-[var(--border)] p-2 rounded-md w-full bg-[var(--card)] text-[var(--card-foreground)]"
              />
              <label className="text-sm">Description</label>
              <input
                type="text"
                value={addAddress.desc}
                onChange={(e) => setAddAddress((p) => ({ ...p, desc: e.target.value }))}
                className="border border-[var(--border)] p-2 rounded-md w-full bg-[var(--card)] text-[var(--card-foreground)]"
              />
              <label className="text-sm">Mobile</label>
              <input
                type="tel"
                value={addAddress.mobile}
                onChange={(e) => setAddAddress((p) => ({ ...p, mobile: e.target.value }))}
                className="border border-[var(--border)] p-2 rounded-md w-full bg-[var(--card)] text-[var(--card-foreground)]"
              />
              <label className="text-sm">Address</label>
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
                  if (leafletMapRef.current) {
                    leafletMapRef.current.setView([place.geometry.location.lat(), place.geometry.location.lng()], 15);
                  }
                }}
              >
                <input
                  type="text"
                  placeholder="Search Address"
                  value={addAddress.address}
                  onChange={(e) => setAddAddress((p) => ({ ...p, address: e.target.value }))}
                  className="border border-[var(--border)] p-2 rounded-md w-full bg-[var(--card)] text-[var(--card-foreground)]"
                />
              </StandaloneSearchBox>
              <div className="rounded-lg overflow-hidden border border-[var(--border)]">
                <MiniLeafletMap
                  style={{ width: "100%", height: "240px" }}
                  center={
                    addAddress.location?.latitude && addAddress.location?.longitude
                      ? [Number(addAddress.location.latitude), Number(addAddress.location.longitude)]
                      : [20, 77]
                  }
                  zoom={addAddress.location?.latitude ? 15 : 4}
                  marker={addAddress.location?.latitude && addAddress.location?.longitude ? {
                    position: [Number(addAddress.location.latitude), Number(addAddress.location.longitude)],
                    draggable: true,
                    onDragEnd: (ll) => setAddAddress((prev) => ({ ...prev, location: { latitude: ll.lat, longitude: ll.lng } })),
                  } : null}
                  onMapClick={(ll) => setAddAddress((prev) => ({ ...prev, location: { latitude: ll.lat, longitude: ll.lng } }))}
                  mapRefOut={leafletMapRef}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setAddressToggle(false)} className="px-3 py-1.5 rounded-lg border border-[var(--border)]">Cancel</button>
                <button onClick={handleAddAddress} className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90">Save</button>
              </div>
            </div>
          </div>
        )}
    </ProfileShell>
  );
}

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
              m.on('dragend', (e) => onMapEnd(e, onDragEnd));
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

    function onMapEnd(e, cb) {
      const ll = e.target.getLatLng();
      cb && cb(ll);
    }
  }, [center?.[0], center?.[1], zoom, marker?.position?.[0], marker?.position?.[1], marker?.draggable]);

  return <div style={style} ref={divRef} />;
}

