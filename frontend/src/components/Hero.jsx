'use client';
import { useState, useEffect } from 'react';
import { Box, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import TextType from './gsap/TextType';
import RotatingText from './gsap/RotatingText';

export default function Hero() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [show, setShow] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => setShow(true), 2000);
        return () => clearTimeout(timeout);
    }, []);
    return (
        <Box
            sx={{
                minHeight: '100vh',
                position: 'relative',
                minHeight: '100vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: { xs: 'column-reverse', md: 'row' },
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: { xs: 6, sm: 8, md: 10 },
                px: { xs: 2, sm: 4, md: 12 },
                py: { xs: 4, sm: 6, md: 8 },
                color: 'white',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background:
                        'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08) 0%, transparent 50%)',
                    animation: 'pulse 15s infinite',
                },
            }}
            role="banner"
            aria-label="E-commerce hero section">
            <Box
                sx={{
                    zIndex: 1,
                    flex: 1,
                    maxWidth: { md: '50%' },
                    textAlign: { xs: 'center', md: 'left' },

                }}>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}>
                    <Typography
                        variant="h2"
                        component="h1"
                        sx={{
                            fontWeight: 700,
                            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                            lineHeight: 1.2,
                            fontFamily: "'Outfit', 'Inter', sans-serif"
                        }}>
                        <TextType
                            text={["Redefining How You Shop"]}
                            typingSpeed={75}
                            pauseDuration={1500}
                            showCursor={true}
                            cursorCharacter="|" />
                    </Typography>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.0, duration: 0.8 }}
                >
                    <Typography
                        variant={isMobile ? 'h4' : 'h3'}
                        component="h2"
                        sx={{
                            fontWeight: 200,
                            fontSize: { xs: '1rem', sm: '1.5rem', md: '2rem' },
                            lineHeight: 1.2,
                            mt: 2,
                            fontFamily: "'Outfit', 'Inter', sans-serif"
                        }}>
                        {show &&
                            <div className="w-[200px] sm:w-[250px] md:w-[300px] mx-auto md:mx-0">
                                <RotatingText
                                    texts={['Scroll', 'Select', 'Secure', 'Repeat']}
                                    mainClassName="px-2 sm:px-2 md:px-3 bg-white/10 backdrop-blur-md text-lime-400 overflow-hidden py-0.5 sm:py-1 md:py-2 justify-center rounded-lg"
                                    staggerFrom="last"
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "-120%" }}
                                    staggerDuration={0.025}
                                    splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                                    rotationInterval={2000}
                                />
                            </div>
                        }
                    </Typography>
                </motion.div>
            </Box>
            <Box sx={{
                zIndex: 1,
                flex: 1,
                maxWidth: { md: '50%' },
                display: 'flex',
                justifyContent: 'center',
            }}>
                <img
                    src="/HeroPic.jpeg"
                    alt="Sample image"
                    style={{
                        width: '100%',
                        maxWidth: '500px',
                        height: 'auto',
                        borderRadius: '16px',
                        objectFit: 'cover',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    }}
                />
            </Box>
        </Box>
    );
}  