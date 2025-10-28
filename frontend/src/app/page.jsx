"use client";
import { useAuth,useUser } from "@clerk/nextjs";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import DarkVeil from "@/components/gsap/DarkVeil";
import { Box } from "@mui/material";
import { useEffect } from "react";
import { FadeIn } from "@/components/motion/MotionPrimitives";

export default function Home() {
  const { getToken } = useAuth();
  const {user} = useUser();

  useEffect(() => {
    // Only run the effect if the user object is loaded and exists
    if (user) {
      const fetchToken = async () => {
        try {
          const token = await getToken({ template: "long-token" });
          console.log("user_id", user.id);
          console.log(token);
        } catch (e) {
          console.error("Error fetching token:", e);
        }
      };
      fetchToken();
    }
  }, [user, getToken]);
  
  return (<>
    <div >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
        }}>
        {/* <DarkVeil
          // colorStops={["#C0C0C0", "#001F3F", "#00FFFF"]}
          colorStops={["#A1FFCE", "#FAFFD1", "#00C9FF"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5} /> */}
          
      </Box>
      <FadeIn>
        <Hero />
      </FadeIn>
       <Footer />      
    </div>
  </>);
}
