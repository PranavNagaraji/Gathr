import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
export default async function customerDashboard(){
    const {user}=useUser();
    const [location, setLocation]=useState({});
    const {isLoaded, isSignedIn, getToken}=useAuth();
    const API_URL=process.env.NEXT_PUBLIC_BACKEND_URL;
    useEffect(()=>{
        if(!isLoaded || !isSignedIn || !user)
            return;
        async function getLocation() {
            if (!("geolocation" in navigator)) {
                throw new Error("Geolocation not supported");
            }
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            const { latitude, longitude } = position.coords;

            const location = { lat: latitude, long: longitude };

            localStorage.setItem("userLocation", JSON.stringify(location));
            setLocation(location);
        }
        getLocation();
        async function getShops(){
            const token=await getToken();
            const result=await axios.post(`${API_URL}/api/customer/getShops`, {
                lat:location.lat,
                long:location.long
            },
            {headers:{
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            }}
        );}
    }, []);
    
}