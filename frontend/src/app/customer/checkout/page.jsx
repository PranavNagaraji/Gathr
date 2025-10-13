"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";



const Checkout = () => {
    const { user } = useUser();
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [addresses,setaddresses] = useState([]);
    const [filladdress, setFillAddress] = useState({});
    const [order, setOrder] = useState({});

    useEffect(()=>{
        if(!isLoaded || !isSignedIn || !user) return;
        try {
            const getAddresses = async () => {
                const token = await getToken();
                const res = await axios.get(`${API_URL}/api/customer/getAddressesByUser/${user.id}`,{
                    headers: {
                         "Authorization": `Bearer ${token}` 
                    },
                });
                setaddresses(res.data.addresses);
                console.log(res.data.addresses);
            }
            getAddresses();
            
            if(addresses.length > 0){
                addresses.map((address)=>{
                    if(address.isDefault){
                        setFillAddress(address);
                    }
                })
            }
        } catch (error) {
            
        }
    },[user,isSignedIn,isLoaded]);

    return (
    <div>Checkout</div>
  )
}

export default Checkout