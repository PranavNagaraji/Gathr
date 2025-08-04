import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import DarkVeil from "@/components/gsap/DarkVeil";
import { Box } from "@mui/material";

export default function Home() {
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
        <DarkVeil
          colorStops={["#C0C0C0", "#001F3F", "#00FFFF"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5} />
      </Box>
      <Navbar />
      <Hero />
    </div>
  </>);
}
