'use client';
import { useState, useEffect } from 'react';
import { Box, Typography, Button, useMediaQuery, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import TextType from './gsap/TextType';
import RotatingText from './gsap/RotatingText';

export default function HeroPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <Box sx={{ backgroundColor: '#0B132B', color: '#F5F5F5', fontFamily: "'Poppins','Inter',sans-serif" }}>
      
      {/* HERO SECTION */}
      <Box
        sx={{
          minHeight: '90vh',
          display: 'flex',
          flexDirection: { xs: 'column-reverse', md: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 3, sm: 5, md: 12 },
          py: { xs: 6, sm: 8, md: 10 },
          gap: { xs: 6, md: 10 },
          backgroundColor: '#0B132B', // ✅ Plain dark navy background
        }}
      >
        {/* LEFT SIDE */}
        <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '2.5rem', sm: '3.2rem', md: '3.8rem' },
                color: '#E8C547',
                mb: 2,
              }}
            >
              <TextType
                text={['UrbanLocal']}
                typingSpeed={80}
                pauseDuration={1200}
                showCursor
                cursorCharacter="|"
              />
            </Typography>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            <Typography
              variant={isMobile ? 'h5' : 'h4'}
              sx={{
                fontWeight: 300,
                fontSize: { xs: '1.1rem', sm: '1.4rem', md: '1.7rem' },
                mb: 4,
                color: '#F5F5F5',
              }}
            >
              {show && (
                <RotatingText
                  texts={['Shop Local', 'Empower Merchants', 'Deliver Fast']}
                  mainClassName="px-3 text-[#00ADB5] bg-transparent rounded-lg overflow-hidden py-2 justify-center"
                  staggerFrom="last"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '-120%' }}
                  staggerDuration={0.03}
                  splitLevelClassName="overflow-hidden pb-1"
                  transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                  rotationInterval={2000}
                />
              )}
            </Typography>
          </motion.div>

          <Typography
            sx={{
              maxWidth: '480px',
              color: '#CCCCCC',
              mb: 5,
              fontSize: { xs: '1rem', md: '1.1rem' },
              mx: { xs: 'auto', md: 0 },
            }}
          >
            Find unique local goods, empower sellers in your area, and enjoy streamlined delivery right to your door — all in one platform.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'center', md: 'flex-start' } }}>
            <Button
              variant="contained"
              sx={{
                backgroundColor: '#00ADB5',
                color: '#FFFFFF',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '10px',
                px: 4,
                py: 1.3,
                '&:hover': { backgroundColor: '#019CA3' },
              }}
            >
              Explore Local
            </Button>
            <Button
              variant="outlined"
              sx={{
                borderColor: '#E8C547',
                color: '#E8C547',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '10px',
                px: 4,
                py: 1.3,
                '&:hover': { backgroundColor: '#E8C547', color: '#0B132B' },
              }}
            >
              Become a Merchant
            </Button>
          </Box>
        </Box>

        {/* RIGHT SIDE IMAGE */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            src="/HeroPic.jpeg"
            alt="Marketplace image"
            style={{
              width: '100%',
              maxWidth: '500px',
              borderRadius: '16px',
              objectFit: 'cover',
              boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
            }}
          />
        </Box>
      </Box>

      {/* SHOP LOCAL SECTION */}
      <Box
        sx={{
          py: { xs: 8, md: 10 },
          px: { xs: 3, sm: 5, md: 12 },
          backgroundColor: '#F5F5F5', // ✅ Plain light background
          color: '#121212',
          textAlign: 'center',
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Buy From Your Neighborhood
        </Typography>
        <Typography sx={{ maxWidth: '720px', mx: 'auto', mb: 5, color: '#444' }}>
          Your purchases fuel local businesses and keep money in your community. Browse one-of-a-kind items from shops you can visit — all from your screen.
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          {[
            { title: 'Authentic Goods', desc: 'Each listing reflects real local culture and craftsmanship.' },
            { title: 'Direct Chat', desc: 'Talk one-on-one with sellers to ask questions or request custom work.' },
            { title: 'Eco Friendly', desc: 'Short transport distances reduce emissions and packaging waste.' },
          ].map((item, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Box
                component={motion.div}
                whileHover={{ scale: 1.03 }}
                sx={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  p: 4,
                  boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                  height: '100%',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#00ADB5' }}>
                  {item.title}
                </Typography>
                <Typography sx={{ color: '#333', fontSize: '0.95rem' }}>{item.desc}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* MERCHANT SECTION */}
      <Box
        sx={{
          py: { xs: 8, md: 10 },
          px: { xs: 3, sm: 5, md: 12 },
          backgroundColor: '#0B132B', // ✅ Plain dark background
          color: '#F5F5F5',
          textAlign: 'center',
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 700, color: '#E8C547', mb: 2 }}>
          For Merchants & Sellers
        </Typography>
        <Typography sx={{ maxWidth: '720px', mx: 'auto', mb: 5, color: '#DDD' }}>
          Open your digital storefront, list your products, and reach nearby customers. No fuss, no heavy setup — get started fast.
        </Typography>

        <Button
          variant="contained"
          sx={{
            backgroundColor: '#00ADB5',
            color: '#FFFFFF',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '10px',
            px: 4,
            py: 1.3,
            '&:hover': { backgroundColor: '#019CA3' },
          }}
        >
          Start Selling Now
        </Button>
      </Box>

      {/* DELIVERY SECTION */}
      <Box
        sx={{
          py: { xs: 8, md: 10 },
          px: { xs: 3, sm: 5, md: 12 },
          backgroundColor: '#E8C547', // ✅ Plain gold accent background
          color: '#121212',
          textAlign: 'center',
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Fast & Reliable Delivery
        </Typography>
        <Typography sx={{ maxWidth: '720px', mx: 'auto', mb: 5, color: '#333' }}>
          From the nearby shop to your location — we ensure prompt, secure delivery with live tracking and real-time updates.
        </Typography>

        <Button
          variant="outlined"
          sx={{
            borderColor: '#121212',
            color: '#121212',
            fontWeight: 600,
            borderRadius: '10px',
            px: 4,
            py: 1.3,
            textTransform: 'none',
            '&:hover': { backgroundColor: '#121212', color: '#E8C547' },
          }}
        >
          Learn About Delivery
        </Button>
      </Box>

      {/* FINAL CTA */}
      <Box sx={{ py: 6, px: 3, textAlign: 'center', backgroundColor: '#0B132B' }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 500, color: '#F5F5F5' }}>
          Ready to transform your local shopping experience?
        </Typography>
        <Button
          variant="contained"
          sx={{
            backgroundColor: '#00ADB5',
            color: '#FFFFFF',
            borderRadius: '10px',
            px: 4,
            py: 1.3,
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': { backgroundColor: '#019CA3' },
          }}
        >
          Get Started Today
        </Button>
      </Box>
    </Box>
  );
}
