'use client'
import { useState, useRef } from 'react';
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Select, ConfigProvider, theme, Input as AntInput } from 'antd'
import { useTheme } from '@/components/theme/ThemeProvider'

export default function addItemPage() {
    const { theme: currentTheme } = useTheme();
    const categoryOptions = [
        "Fruits", "Vegetables", "Dairy", "Bakery", "Beverages",
        "Snacks", "Frozen", "Meat", "Seafood", "Grains",
        "Spices", "Condiments", "Breakfast", "Coffee & Tea", "Juices",
        "Personal Care", "Cleaning", "Pet Food", "Organic", "Health"
    ];

    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    const router = useRouter();
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const { user } = useUser();
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        quantity: "",
        price: "",
        category: [],
        images: [],
    });

    const cropMarginsBase64 = (base64, marginPct = 0.08) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const w = img.width, h = img.height;
            const mx = Math.round(w * marginPct), my = Math.round(h * marginPct);
            const cw = Math.max(1, w - 2*mx), ch = Math.max(1, h - 2*my);
            const canvas = document.createElement('canvas');
            canvas.width = cw; canvas.height = ch;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, mx, my, cw, ch, 0, 0, cw, ch);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    });

    const cropBottomBandBase64 = (base64, bandRatio = 0.35) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const w = img.width, h = img.height;
            const bandH = Math.max(1, Math.round(h * bandRatio));
            const y = Math.max(0, h - bandH);
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = bandH;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, y, w, bandH, 0, 0, w, bandH);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    });

    const ensureTesseract = () => new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && window.Tesseract) return resolve(window.Tesseract);
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/dist/tesseract.min.js';
        s.onload = () => resolve(window.Tesseract);
        s.onerror = reject;
        document.head.appendChild(s);
    });

    const ocrDigits = async (dataUrl) => {
        try {
            const T = await ensureTesseract();
            const result = await T.recognize(dataUrl, 'eng', { tessedit_char_whitelist: '0123456789' });
            const text = result?.data?.text || '';
            const digits = String(text).replace(/\D+/g, '');
            if (digits.length >= 8) {
                const m = digits.match(/(\d{13}|\d{12}|\d{14}|\d{8,})/);
                return m ? m[1] : digits;
            }
            return '';
        } catch { return ''; }
    };

    const mirrorBase64 = (base64) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    });

    const loadImageEl = (dataUrl) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });

    const decodeWithNative = async (dataUrl) => {
        try {
            if (!('BarcodeDetector' in window)) return '';
            const formats = ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf'];
            const det = new window.BarcodeDetector({ formats });
            const img = await loadImageEl(dataUrl);
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const results = await det.detect(canvas);
            const val = Array.isArray(results) && results[0] && results[0].rawValue;
            return val ? String(val).trim() : '';
        } catch { return ''; }
    };

    const cropCenterBandBase64 = (base64, bandRatio = 0.5) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const w = img.width, h = img.height;
            const bandH = Math.max(1, Math.round(h * bandRatio));
            const y = Math.round((h - bandH) / 2);
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = bandH;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, y, w, bandH, 0, 0, w, bandH);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    });
    const [activeIndex, setActiveIndex] = useState(0)
    const [otherCategory, setOtherCategory] = useState("")
    const [aiLoading, setAiLoading] = useState(false)
    const [barcodeBusy, setBarcodeBusy] = useState(false)
    const [barcodeMenuOpen, setBarcodeMenuOpen] = useState(false)
    const barcodeCameraRef = useRef(null)
    const barcodeUploadRef = useRef(null)
    const [barcodeLastImage, setBarcodeLastImage] = useState('')
    const [bandRatio, setBandRatio] = useState(45) // percent
    // image center/crop modal
    const [cropOpen, setCropOpen] = useState(false)
    const [cropScale, setCropScale] = useState(1)
    const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
    const cropDrag = useRef(null)
    // barcode centering modal
    const [barcodeCenterOpen, setBarcodeCenterOpen] = useState(false)
    const [barcodeCenterScale, setBarcodeCenterScale] = useState(1)
    const [barcodeCenterOffset, setBarcodeCenterOffset] = useState({ x: 0, y: 0 })
    const [barcodeCenterRotate, setBarcodeCenterRotate] = useState(0)
    const barcodeCenterDrag = useRef(null)
    const [isScanning, setIsScanning] = useState(false)
    const [notifModal, setNotifModal] = useState({ open: false, message: '', resolve: null })
    const [confirmModal, setConfirmModal] = useState({ open: false, message: '', resolve: null })

    const showNotificationModal = (message) => new Promise((resolve) => {
        setNotifModal({ open: true, message, resolve });
    })
    const showConfirmModal = (message) => new Promise((resolve) => {
        setConfirmModal({ open: true, message, resolve });
    })

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const [barcodeManual, setBarcodeManual] = useState('');
    const handleManualBarcodeLookup = async () => {
        const code = String(barcodeManual || '').replace(/\D+/g, '');
        if (!code) return;
        setBarcodeBusy(true);
        try {
            const prod = await fetchProductByBarcode(code);
            if (!prod) {
                await showNotificationModal(`No product info found for barcode ${code}.`);
                return;
            }
            let imgB64 = '';
            if (prod.img) {
                try { imgB64 = await fetchImageUrlToBase64(prod.img); } catch {}
            }
            let priceVal = prod.price;
            if (!priceVal && prod.img) {
              const hints = [prod.name, ...(prod.categories||[])].filter(Boolean).join(', ');
              priceVal = await estimatePriceFromImage(prod.img, hints);
            }
            setFormData(prev => ({
                ...prev,
                name: prod.name || prev.name,
                description: prod.desc || prev.description,
                category: Array.from(new Set([...(prev.category||[]), ...((prod.categories||[]))])),
                images: imgB64 ? [imgB64, ...(prev.images||[])] : prev.images,
                price: priceVal ? String(priceVal) : prev.price
            }));
            setActiveIndex(0);
        } finally {
            setBarcodeBusy(false);
        }
    };

    const readSingleFileAsBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const fetchImageUrlToBase64 = async (url) => {
        const res = await fetch(url);
        const blob = await res.blob();
        return await new Promise((resolve) => {
            const fr = new FileReader();
            fr.onloadend = () => resolve(String(fr.result || ''));
            fr.readAsDataURL(blob);
        });
    };

    const rotateBase64 = (base64, deg) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const rad = (deg * Math.PI) / 180;
            const w = img.width, h = img.height;
            if (deg % 180 === 0) { canvas.width = w; canvas.height = h; }
            else { canvas.width = h; canvas.height = w; }
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(rad);
            ctx.drawImage(img, -w / 2, -h / 2);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    });

    const preprocessBase64 = (base64, { grayscale = true, invert = false, contrast = 1.3, threshold = null, maxSize = 2000, minSize = 980 } = {}) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const maxDim = Math.max(img.width, img.height);
            const targetMax = Math.min(Math.max(maxDim, minSize), maxSize);
            const scale = targetMax / maxDim;
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                let r = data[i], g = data[i+1], b = data[i+2];
                if (grayscale) {
                    const y = 0.299*r + 0.587*g + 0.114*b;
                    r = g = b = y;
                }
                // contrast around mid-gray
                if (contrast && contrast !== 1) {
                    r = (r - 128) * contrast + 128;
                    g = (g - 128) * contrast + 128;
                    b = (b - 128) * contrast + 128;
                }
                if (threshold != null) {
                    const avg = (r+g+b)/3;
                    r = g = b = avg > threshold ? 255 : 0;
                }
                if (invert) {
                    r = 255 - r; g = 255 - g; b = 255 - b;
                }
                data[i] = Math.max(0, Math.min(255, r));
                data[i+1] = Math.max(0, Math.min(255, g));
                data[i+2] = Math.max(0, Math.min(255, b));
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    });

    const sharpenBase64 = (base64, strength = 0.6) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const w = img.width, h = img.height;
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0);
            const src = ctx.getImageData(0, 0, w, h);
            const dst = ctx.createImageData(w, h);
            const k = [
                0, -strength, 0,
                -strength, 1 + 4*strength, -strength,
                0, -strength, 0
            ];
            const s = src.data, d = dst.data;
            const idx = (x,y)=> (y*w + x) * 4;
            for (let y=1;y<h-1;y++){
                for (let x=1;x<w-1;x++){
                    let r=0,g=0,b=0,a=0, ki=0;
                    for (let j=-1;j<=1;j++){
                        for (let i=-1;i<=1;i++){
                            const p = idx(x+i,y+j);
                            const kval = k[ki++];
                            r += s[p]*kval; g += s[p+1]*kval; b += s[p+2]*kval; a += s[p+3]*kval;
                        }
                    }
                    const q = idx(x,y);
                    d[q] = Math.max(0, Math.min(255, r));
                    d[q+1] = Math.max(0, Math.min(255, g));
                    d[q+2] = Math.max(0, Math.min(255, b));
                    d[q+3] = s[q+3];
                }
            }
            ctx.putImageData(dst,0,0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    });

    const ensureZXing = () => new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && window.ZXing) return resolve(window.ZXing);
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/umd/index.min.js';
        s.onload = () => resolve(window.ZXing);
        s.onerror = reject;
        document.head.appendChild(s);
    });

    const decodeWithZXing = async (dataUrl) => {
        try {
            const ZX = await ensureZXing();
            const hints = new Map();
            if (ZX.DecodeHintType) {
                try { hints.set(ZX.DecodeHintType.TRY_HARDER, true); } catch {}
                try { hints.set(ZX.DecodeHintType.POSSIBLE_FORMATS, [
                    ZX.BarcodeFormat.EAN_13,
                    ZX.BarcodeFormat.EAN_8,
                    ZX.BarcodeFormat.UPC_A,
                    ZX.BarcodeFormat.UPC_E,
                    ZX.BarcodeFormat.CODE_128,
                    ZX.BarcodeFormat.CODE_39,
                ]); } catch {}
            }
            const reader = new ZX.BrowserMultiFormatReader(hints);
            const res = await reader.decodeFromImageUrl(dataUrl);
            const text = res && (res.text || (res.getText && res.getText())) || '';
            return String(text || '').trim();
        } catch { return ''; }
    };

    const ensureQuagga = () => new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && window.Quagga) return resolve(window.Quagga);
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@ericblade/quagga2@2.0.0-beta.3/dist/quagga.min.js';
        s.onload = () => resolve(window.Quagga);
        s.onerror = reject;
        document.head.appendChild(s);
    });

    const decodeWithQuagga = async (dataUrl) => {
        try {
            const Quagga = await ensureQuagga();
            const tryOnce = (patchSize) => new Promise((resolve) => {
                Quagga.decodeSingle({
                    src: dataUrl,
                    numOfWorkers: 0,
                    inputStream: { size: 1280 },
                    locate: true,
                    locator: { halfSample: true, patchSize },
                    decoder: { readers: ['ean_reader','ean_8_reader','upc_reader','upc_e_reader','code_128_reader','code_39_reader','i2of5_reader','code_93_reader','codabar_reader'] }
                }, (result) => {
                    const code = result && result.codeResult && result.codeResult.code;
                    resolve(code ? String(code).trim() : '');
                });
            });
            const sizes = ['medium','large','x-large'];
            for (const s of sizes) {
                const out = await tryOnce(s);
                if (out) return out;
            }
            return '';
        } catch { return ''; }
    };

    const decodeAny = async (dataUrl) => {
        const angles = [0, -7, -5, -3, 3, 5, 7, 90, 180, 270];
        for (const a of angles) {
            const candidate = a === 0 ? dataUrl : await rotateBase64(dataUrl, a);
            let code = await decodeWithNative(candidate);
            if (code) return code;
            code = await decodeWithZXing(candidate);
            if (code) return code;
            code = await decodeWithQuagga(candidate);
            if (code) return code;
            // OCR fallback on bottom digits
            const bottom = await cropBottomBandBase64(candidate, 0.45);
            code = await ocrDigits(bottom);
            if (code) return code;
        }
        return '';
    };

    const decodeBarcodeFromBase64 = async (base64) => {
        const url = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
        const processed = [
            url,
            await preprocessBase64(url, { grayscale: true, contrast: 1.6, threshold: 128 }),
            await preprocessBase64(url, { grayscale: true, contrast: 1.8, threshold: 110 }),
            await preprocessBase64(url, { grayscale: true, contrast: 1.4, threshold: 150 }),
            await preprocessBase64(url, { grayscale: true, invert: true, contrast: 1.5, threshold: 135 }),
            await mirrorBase64(url),
            await cropCenterBandBase64(url, 0.45),
            await cropCenterBandBase64(url, 0.35),
            await sharpenBase64(await preprocessBase64(url, { grayscale: true, contrast: 1.7, threshold: 120 })),
            await cropMarginsBase64(url, 0.06),
            await cropMarginsBase64(url, 0.12),
            await preprocessBase64(url, { grayscale: true, contrast: 2.0, threshold: 100 }),
            await preprocessBase64(url, { grayscale: true, contrast: 1.9, threshold: 160 }),
        ];
        for (const imgUrl of processed) {
            const code = await decodeAny(imgUrl);
            if (code) return code;
        }
        // Try Quagga across variants and rotations (last attempt)
        for (const imgUrl of processed) {
            const code = await decodeWithQuagga(imgUrl);
            if (code) return code;
        }
        return '';
    };

    const fetchProductByBarcode = async (code) => {
        try {
            const resp = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`);
            const data = await resp.json();
            if (data && data.status === 1) {
                const p = data.product || {};
                const name = p.product_name || p.generic_name || '';
                const desc = [p.generic_name, p.brands, p.categories].filter(Boolean).join(' • ');
                const img = p.image_front_url || p.image_url || p.image_small_url || '';
                const categories = String(p.categories || '')
                  .toLowerCase()
                  .split(',')
                  .map(s=>s.trim())
                  .filter(Boolean);
                const mappedCats = categoryOptions.filter(opt => categories.some(c => c.includes(opt.toLowerCase())));
                // try parse price if available (rare)
                let price = null;
                if (typeof p.price === 'number') price = Math.round(p.price);
                if (typeof p.price === 'string') {
                  const m = p.price.match(/\d+(?:\.\d+)?/);
                  if (m) price = Math.round(parseFloat(m[0]));
                }
                return { name, desc, img, categories: mappedCats, price };
            }
        } catch {}
        return null;
    };

    const estimatePriceFromImage = async (imgUrl, hints) => {
        try {
            const token = await getToken();
            const base64 = await fetchImageUrlToBase64(imgUrl);
            const b64 = base64.includes(',') ? base64.split(',')[1] : base64;
            const resp = await fetch(`${API_URL}/api/merchant/ai/generateFromImage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ clerkId: user.id, base64Image: b64, hints })
            });
            const data = await resp.json().catch(()=>({}));
            if (resp.ok && typeof data?.price === 'number' && data.price > 0) return Math.round(data.price);
        } catch {}
        return null;
    };

    const onBarcodeImageChosen = async (file) => {
        if (!file) return;
        try {
            const base64 = await readSingleFileAsBase64(file);
            setBarcodeLastImage(base64);
            setBarcodeCenterScale(1);
            setBarcodeCenterOffset({ x: 0, y: 0 });
            setBarcodeCenterRotate(0);
            setBarcodeCenterOpen(true);
            setBarcodeMenuOpen(false);
        } finally {
            if (barcodeCameraRef.current) barcodeCameraRef.current.value = '';
            if (barcodeUploadRef.current) barcodeUploadRef.current.value = '';
        }
    };

    const handleScanToggle = () => {
        if (barcodeBusy) return;
        if (!isScanning) {
            setIsScanning(true);
            setBarcodeMenuOpen(true);
        } else {
            setBarcodeMenuOpen(false);
            setBarcodeCenterOpen(false);
            setCropOpen(false);
            setIsScanning(false);
        }
    };
    const handleCategoryChange = (e) => {
        const { value, checked } = e.target;

        setFormData((prev) => {
            if (checked) {
                // Add category if checked
                return { ...prev, category: [...prev.category, value] };
            } else {
                // Remove category if unchecked
                return { ...prev, category: prev.category.filter((cat) => cat !== value) };
            }
        });
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        const readers = [];

        files.forEach((file) => {
            const reader = new FileReader();
            readers.push(
                new Promise((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                })
            );
        });

        Promise.all(readers).then((base64Images) => {
            setFormData((prev) => ({
                ...prev,
                images: [...prev.images, ...base64Images], // append to existing images
            }));
        });
    };
    const handleRemoveImage = (index) => {
        setFormData((prev) => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index),
        }))
        setActiveIndex((prev) => {
            if (index === prev) return Math.max(0, prev - 1)
            if (index < prev) return prev - 1
            return prev
        })
    }
    const goPrev = () => {
        setActiveIndex((prev) => (formData.images.length ? (prev - 1 + formData.images.length) % formData.images.length : 0))
    }
    const goNext = () => {
        setActiveIndex((prev) => (formData.images.length ? (prev + 1) % formData.images.length : 0))
    }

    const handleGenerateAI = async () => {
        if (!isLoaded || !isSignedIn || !user) return;
        if (!formData.images || formData.images.length === 0) {
            await showNotificationModal('Please upload at least one image first.');
            return;
        }
        try {
            setAiLoading(true);
            const token = await getToken();
            const first = formData.images[0] || '';
            const base64 = first.includes(',') ? first.split(',')[1] : first;
            const hints = [formData.name, ...(formData.category||[])].filter(Boolean).join(', ');
            const resp = await fetch(`${API_URL}/api/merchant/ai/generateFromImage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ clerkId: user.id, base64Image: base64, hints })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.message || 'AI generation failed');
            setFormData(prev => ({
                ...prev,
                description: data?.description ?? prev.description,
                price: typeof data?.price === 'number' ? String(data.price) : prev.price,
                category: Array.from(new Set([...(prev.category||[]), ...((data?.categories||[]) )]))
            }));
        } catch (e) {
            const raw = String(e && e.message ? e.message : '');
            const lower = raw.toLowerCase();
            const friendly = lower.includes('model did not return expected json')
                ? 'AI could not generate description right now. Please try again.'
                : (raw ? `AI error: ${raw}` : 'AI error: Something went wrong while generating description.');
            await showNotificationModal(friendly);
        } finally {
            setAiLoading(false);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isLoaded || !isSignedIn || !user) return;
        const token = await getToken();
        const body = {
            ...formData,
            owner_id: user.id,
        };
        const res = await fetch(`${API_URL}/api/merchant/add_items`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        if (res.ok) {
            await showNotificationModal("Item details saved!");
            router.push("/merchant/dashboard");
        }

        else await showNotificationModal(`Error saving item details: ${data.message}`);
    };
    return (
        <ConfigProvider
            theme={{
                algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: {
                    colorPrimary: 'var(--primary)',
                    colorBgBase: 'var(--background)',
                    colorBgContainer: 'var(--card)',
                    colorBorder: 'var(--border)',
                    colorText: 'var(--foreground)'
                },
                components: {
                    Select: {
                        colorBgContainer: 'var(--card)',
                        colorBgElevated: 'var(--popover)',
                        colorText: 'var(--foreground)',
                        colorTextPlaceholder: 'var(--muted-foreground)',
                        colorBorder: 'var(--border)',
                        optionSelectedBg: 'var(--accent)',
                        optionSelectedColor: 'var(--accent-foreground)',
                        optionActiveBg: 'var(--muted)',
                        controlItemBgHover: 'var(--muted)'
                    },
                    Input: { colorBgContainer: 'var(--card)', colorBorder: 'var(--border)', colorText: 'var(--foreground)' }
                }
            }}
        >
            <div className="min-h-screen p-4 md:p-8 bg-[var(--background)] text-[var(--foreground)]">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl md:text-4xl font-bold mb-6">Add Item</h1>
                    {/* Top Scan/Lookup Section */}
                    <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 md:p-5 shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={handleScanToggle}
                            disabled={barcodeBusy}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-60 ${isScanning ? 'ring-2 ring-[var(--ring)]' : ''}`}
                          >
                            {isScanning ? 'Scanning…' : 'Scan'}
                          </button>
                          {barcodeMenuOpen && (
                            <div className="absolute z-[10000] mt-2 w-56 rounded-md border border-[var(--border)] bg-[var(--popover)] text-[var(--popover-foreground)] shadow-2xl">
                              <button type="button" className="w-full text-left px-3 py-2 hover:bg-[var(--muted)]/50" onClick={() => barcodeCameraRef.current && barcodeCameraRef.current.click()} disabled={barcodeBusy}>Use Camera</button>
                              <button type="button" className="w-full text-left px-3 py-2 hover:bg-[var(--muted)]/50" onClick={() => barcodeUploadRef.current && barcodeUploadRef.current.click()} disabled={barcodeBusy}>Upload Photo</button>
                            </div>
                          )}
                          <input ref={barcodeCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e)=> onBarcodeImageChosen(e.target.files?.[0])} />
                          <input ref={barcodeUploadRef} type="file" accept="image/*" className="hidden" onChange={(e)=> onBarcodeImageChosen(e.target.files?.[0])} />
                        </div>
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Enter barcode manually"
                            value={barcodeManual}
                            onChange={(e)=> setBarcodeManual(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)]"
                          />
                          <button type="button" onClick={handleManualBarcodeLookup} disabled={barcodeBusy || !barcodeManual.trim()} className="px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] disabled:opacity-60">Lookup</button>
                        </div>
                      </div>
                      {/* advanced band slider removed in favor of visual centering modal */}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
                        {/* Details - LEFT (3/5) */}
                        <form onSubmit={handleSubmit} className="md:col-span-3 flex flex-col gap-6">
                            <div>
                                <label className="text-sm font-medium text-[var(--muted-foreground)]">Item Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter item name"
                                    className="w-full bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] text-lg p-2 focus:outline-none focus:ring-0 focus:border-[var(--primary)] transition-colors"
                                />
                            </div>

                            {/* advanced scan moved to top section */}

                            <div>
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-[var(--muted-foreground)]">Description</label>
                                    <button type="button" onClick={handleGenerateAI} disabled={aiLoading || !(formData.images && formData.images.length)} className={`text-xs px-3 py-1 rounded border border-[var(--border)] ${aiLoading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[var(--muted)]'}`}>
                                        {aiLoading ? 'Generating…' : 'Generate with AI'}
                                    </button>
                                </div>
                                <textarea
                                    name="description"
                                    placeholder="Enter description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] text-lg p-2 focus:outline-none focus:ring-0 focus:border-[var(--primary)] transition-colors"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-[var(--muted-foreground)]">Quantity</label>
                                    <input
                                        type="number"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        name="quantity"
                                        placeholder="Enter quantity"
                                        className="w-full bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] text-lg p-2 focus:outline-none focus:ring-0 focus:border-[var(--primary)] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-[var(--muted-foreground)]">Price</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={handleChange}
                                        name="price"
                                        placeholder="Enter price"
                                        min={1}
                                        className="w-full bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] text-lg p-2 focus:outline-none focus:ring-0 focus:border-[var(--primary)] transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-[var(--muted-foreground)] mb-2 block">Categories</label>
                                <Select
                                    mode="multiple"
                                    allowClear
                                    style={{ width: '100%' }}
                                    placeholder="Select categories"
                                    value={formData.category}
                                    onChange={(values) => setFormData(prev => ({ ...prev, category: values }))}
                                    options={[...new Set([...categoryOptions, 'Other'])].map(cat => ({ label: cat, value: cat }))}
                                    size="large"
                                    dropdownStyle={{ background: 'var(--popover)', color: 'var(--popover-foreground)' }}
                                />
                                {formData.category.includes('Other') && (
                                    <div className="mt-4">
                                        <label className="text-sm font-medium text-[var(--muted-foreground)]">New Category Name</label>
                                        <input
                                            type="text"
                                            value={otherCategory}
                                            onChange={(e) => setOtherCategory(e.target.value)}
                                            onBlur={() => {
                                                const newCat = otherCategory.trim();
                                                if (newCat) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        category: [...new Set(prev.category.filter(c => c !== 'Other').concat(newCat))]
                                                    }));
                                                    setOtherCategory("");
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const newCat = otherCategory.trim();
                                                    if (newCat) {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            category: [...new Set(prev.category.filter(c => c !== 'Other').concat(newCat))]
                                                        }));
                                                        setOtherCategory("");
                                                    }
                                                }
                                            }}
                                            className="w-full mt-2 bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] text-lg p-2 focus:outline-none focus:border-[var(--primary)]"
                                            placeholder="Type new category and press Enter"
                                        />
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-[var(--primary)] hover:opacity-90 text-[var(--primary-foreground)] font-semibold py-3 rounded-lg transition-all duration-300"
                            >
                                Add Item
                            </button>
                        </form>

                        {/* Images - RIGHT (2/5) */}
                        <div className="md:col-span-2 md:order-last md:sticky md:top-8 h-fit">
                            <label className="text-sm font-medium mb-2 block text-[var(--muted-foreground)]">Item Images</label>
                            <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                                <div className="relative aspect-square w-full">
                                    {formData.images && formData.images.length > 0 ? (
                                        <img
                                            src={formData.images[activeIndex]}
                                            alt={`image-${activeIndex}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-sm text-[var(--muted-foreground)]">No images</div>
                                    )}
                                    {formData.images && formData.images.length > 0 && (
                                      <button type="button" onClick={()=>{ setCropOpen(true); setCropScale(1); setCropOffset({x:0,y:0}); }} className="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-[var(--popover)]/80 border border-[var(--border)] text-sm">Edit & Center</button>
                                    )}
                                    {formData.images && formData.images.length > 1 && (
                                        <>
                                            <button type="button" onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-[var(--popover)]/80 text-[var(--popover-foreground)] border border-[var(--border)] hover:bg-[var(--accent)]/50 transition">‹</button>
                                            <button type="button" onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-[var(--popover)]/80 text-[var(--popover-foreground)] border border-[var(--border)] hover:bg-[var(--accent)]/50 transition">›</button>
                                        </>
                                    )}
                                </div>

                                {formData.images && formData.images.length > 0 && (
                                    <div className="grid grid-cols-5 gap-2 p-3 bg-[var(--card)] border-t border-[var(--border)]">
                                        {formData.images.map((img, i) => (
                                            <div
                                                key={i}
                                                onClick={() => setActiveIndex(i)}
                                                onKeyDown={(e)=> { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveIndex(i); } }}
                                                role="button"
                                                tabIndex={0}
                                                className={`relative aspect-square rounded-md overflow-hidden border cursor-pointer ${i === activeIndex ? 'border-[var(--primary)]' : 'border-[var(--border)]'}`}
                                                aria-label={`Select image ${i + 1}`}
                                            >
                                                <img src={img} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(i) }}
                                                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                                    aria-label={`Remove image ${i + 1}`}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <label
                                htmlFor="file-upload"
                                className="mt-4 block w-full text-center py-3 px-4 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] font-medium cursor-pointer transition-colors"
                            >
                                Upload Images
                            </label>
                            <input
                                id="file-upload"
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />

                            {/* Scan section moved to top */}
                        </div>
                    </div>
                </div>
            </div>
            {/* Image Center/Crop Modal */}
            {cropOpen && (
              <div className="fixed inset-0 z-[10000] bg-black/60 grid place-items-center">
                <div className="w-[90vw] max-w-3xl rounded-xl bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] shadow-2xl overflow-hidden">
                  <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
                    <div className="font-semibold">Center image</div>
                    <button type="button" onClick={()=> setCropOpen(false)} className="px-2 py-1 rounded-md border border-[var(--border)] hover:bg-[var(--muted)]">Close</button>
                  </div>
                  <div className="p-4 grid gap-4">
                    <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-[var(--muted)]">
                      <div
                        className="absolute inset-0 cursor-grab active:cursor-grabbing"
                        onPointerDown={(e)=>{ e.currentTarget.setPointerCapture(e.pointerId); cropDrag.current = { x: e.clientX, y: e.clientY, start: { ...cropOffset } }; }}
                        onPointerMove={(e)=>{ if (!cropDrag.current) return; const dx = e.clientX - cropDrag.current.x; const dy = e.clientY - cropDrag.current.y; setCropOffset({ x: cropDrag.current.start.x + dx, y: cropDrag.current.start.y + dy }); }}
                        onPointerUp={()=>{ cropDrag.current = null; }}
                      >
                        <img src={formData.images?.[activeIndex] || ''} alt="crop" style={{ transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropScale})`, transformOrigin: 'center center' }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none" />
                        {/* Center guides */}
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute inset-y-0 left-1/2 w-px bg-white/40" />
                          <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-[var(--muted-foreground)]">Zoom</label>
                      <input type="range" min={0.5} max={3} step={0.01} value={cropScale} onChange={(e)=> setCropScale(parseFloat(e.target.value))} className="flex-1" />
                      <button type="button" onClick={()=>{ setCropOffset({x:0,y:0}); setCropScale(1); }} className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)]">Reset</button>
                      <button type="button" onClick={async ()=>{
                        // export canvas square
                        const imgSrc = formData.images?.[activeIndex] || '';
                        const img = new Image();
                        img.onload = () => {
                          const size = 1024;
                          const canvas = document.createElement('canvas');
                          canvas.width = size; canvas.height = size;
                          const ctx = canvas.getContext('2d');
                          ctx.fillStyle = '#fff'; ctx.fillRect(0,0,size,size);
                          const cx = size/2 + cropOffset.x;
                          const cy = size/2 + cropOffset.y;
                          const iw = img.width * cropScale;
                          const ih = img.height * cropScale;
                          ctx.drawImage(img, cx - iw/2, cy - ih/2, iw, ih);
                          const out = canvas.toDataURL('image/png');
                          setFormData(prev => {
                            const arr = [...(prev.images||[])];
                            arr[activeIndex] = out;
                            return { ...prev, images: arr };
                          });
                          setCropOpen(false);
                        };
                        img.src = imgSrc;
                      }} className="px-3 py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)]">Apply</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {barcodeCenterOpen && (
              <div className="fixed inset-0 z-[10000] bg-black/60 grid place-items-center">
                <div className="w-[92vw] max-w-3xl rounded-xl bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] shadow-2xl overflow-hidden">
                  <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
                    <div className="font-semibold">Center barcode image</div>
                    <button type="button" onClick={()=> { setBarcodeCenterOpen(false); setIsScanning(false); }} className="px-2 py-1 rounded-md border border-[var(--border)] hover:bg-[var(--muted)]">Close</button>
                  </div>
                  <div className="p-4 grid gap-4 relative">
                    {barcodeBusy && (
                      <div className="absolute inset-0 z-10 grid place-items-center bg-[var(--background)]/60">
                        <div className="w-12 h-12 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
                      </div>
                    )}
                    <div className="relative w-full aspect-video overflow-hidden rounded-lg bg-[var(--muted)]">
                      <div
                        className="absolute inset-0 cursor-grab active:cursor-grabbing"
                        onPointerDown={(e)=>{ e.currentTarget.setPointerCapture(e.pointerId); barcodeCenterDrag.current = { x: e.clientX, y: e.clientY, start: { ...barcodeCenterOffset } }; }}
                        onPointerMove={(e)=>{ if (!barcodeCenterDrag.current) return; const dx = e.clientX - barcodeCenterDrag.current.x; const dy = e.clientY - barcodeCenterDrag.current.y; setBarcodeCenterOffset({ x: barcodeCenterDrag.current.start.x + dx, y: barcodeCenterDrag.current.start.y + dy }); }}
                        onPointerUp={()=>{ barcodeCenterDrag.current = null; }}
                      >
                        <img src={barcodeLastImage || ''} alt="barcode-center" style={{ transform: `translate(${barcodeCenterOffset.x}px, ${barcodeCenterOffset.y}px) scale(${barcodeCenterScale}) rotate(${barcodeCenterRotate}deg)`, transformOrigin: 'center center' }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none" />
                        {/* Guides */}
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
                          <div className="absolute inset-y-0 left-1/2 w-px bg-white/40" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="text-sm text-[var(--muted-foreground)]">Zoom</label>
                      <input type="range" min={0.5} max={3} step={0.01} value={barcodeCenterScale} onChange={(e)=> setBarcodeCenterScale(parseFloat(e.target.value))} className="flex-1" />
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={()=> setBarcodeCenterRotate(r => (r - 90 + 360) % 360)} className="px-2 py-1 rounded-md border border-[var(--border)]">Rotate -90°</button>
                        <button type="button" onClick={()=> setBarcodeCenterRotate(r => (r + 90) % 360)} className="px-2 py-1 rounded-md border border-[var(--border)]">Rotate +90°</button>
                      </div>
                      <button type="button" onClick={()=> { setBarcodeCenterScale(1); setBarcodeCenterOffset({x:0,y:0}); setBarcodeCenterRotate(0); }} className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)]">Reset</button>
                      <button type="button" disabled={barcodeBusy} onClick={async ()=>{
                        setBarcodeBusy(true);
                        try {
                          // render a new aligned image into canvas for decode
                          const img = new Image();
                          img.onload = async () => {
                            const W = 1280, H = 720; // wide canvas for barcode
                            const canvas = document.createElement('canvas');
                            canvas.width = W; canvas.height = H;
                            const ctx = canvas.getContext('2d');
                            ctx.fillStyle = '#fff';
                            ctx.fillRect(0,0,W,H);
                            ctx.save();
                            ctx.translate(W/2 + barcodeCenterOffset.x, H/2 + barcodeCenterOffset.y);
                            ctx.rotate((barcodeCenterRotate * Math.PI)/180);
                            const iw = img.width * barcodeCenterScale;
                            const ih = img.height * barcodeCenterScale;
                            ctx.drawImage(img, -iw/2, -ih/2, iw, ih);
                            ctx.restore();
                            const aligned = canvas.toDataURL('image/png');
                            const code = await decodeAny(aligned);
                            if (!code) {
                              await showNotificationModal('No barcode detected after centering. Try adjusting zoom/position/rotation.');
                              return;
                            }
                            const prod = await fetchProductByBarcode(code, formData.price);
                            if (!prod) {
                              await showNotificationModal(`No product info found for barcode ${code}.`);
                              return;
                            }
                            let imgB64 = '';
                            if (prod.img) { try { imgB64 = await fetchImageUrlToBase64(prod.img); } catch {} }
                            let priceVal = prod.price;
                            if (!priceVal && prod.img) {
                              const hints = [prod.name, ...(prod.categories||[])].filter(Boolean).join(', ');
                              priceVal = await estimatePriceFromImage(prod.img, hints);
                            }
                            setFormData(prev => ({
                              ...prev,
                              name: prod.name || prev.name,
                              description: prod.desc || prev.description,
                              category: Array.from(new Set([...(prev.category||[]), ...((prod.categories||[]))])),
                              images: imgB64 ? [imgB64, ...(prev.images||[])] : prev.images,
                              price: priceVal ? String(priceVal) : prev.price
                            }));
                            setActiveIndex(0);
                            setBarcodeCenterOpen(false);
                            setIsScanning(false);
                          };
                          img.src = barcodeLastImage || '';
                        } finally {
                          setBarcodeBusy(false);
                        }
                      }} className="px-4 py-2 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-60">{barcodeBusy ? 'Decoding…' : 'Apply & Decode'}</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {notifModal.open && (
              <div className="fixed inset-0 z-[10000] bg-black/60 grid place-items-center">
                <div className="w-[90vw] max-w-md rounded-xl bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-[var(--border)] font-semibold">Notice</div>
                  <div className="p-5 text-sm">{notifModal.message}</div>
                  <div className="p-3 border-t border-[var(--border)] flex justify-end gap-2">
                    <button type="button" onClick={()=>{ const r = notifModal.resolve; setNotifModal({ open: false, message: '', resolve: null }); if (typeof r === 'function') r(true); }} className="px-3 py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)]">OK</button>
                  </div>
                </div>
              </div>
            )}
            {confirmModal.open && (
              <div className="fixed inset-0 z-[10000] bg-black/60 grid place-items-center">
                <div className="w-[90vw] max-w-md rounded-xl bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-[var(--border)] font-semibold">Confirm</div>
                  <div className="p-5 text-sm">{confirmModal.message}</div>
                  <div className="p-3 border-t border-[var(--border)] flex justify-end gap-2">
                    <button type="button" onClick={()=>{ const r = confirmModal.resolve; setConfirmModal({ open: false, message: '', resolve: null }); if (typeof r === 'function') r(false); }} className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)]">No</button>
                    <button type="button" onClick={()=>{ const r = confirmModal.resolve; setConfirmModal({ open: false, message: '', resolve: null }); if (typeof r === 'function') r(true); }} className="px-3 py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)]">Yes</button>
                  </div>
                </div>
              </div>
            )}
          </ConfigProvider>
    );
}