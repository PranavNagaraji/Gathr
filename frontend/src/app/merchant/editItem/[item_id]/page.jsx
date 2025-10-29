'use client'
import { useEffect, useState, useMemo } from "react" // 🔹 Added useMemo
import { useParams, useRouter } from "next/navigation"
import { useUser, useAuth } from "@clerk/nextjs"
import axios from "axios"
// 🔹 Import AntD components
import { Select, Input, ConfigProvider, theme, Spin } from "antd"
import { useTheme } from "@/components/theme/ThemeProvider"

export default function EditItemPage() {
  const router = useRouter()
  const { item_id } = useParams()
  const { user } = useUser()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL
  const { theme: currentTheme } = useTheme()

  const categoryOptions = [
    "Fruits", "Vegetables", "Dairy", "Bakery", "Beverages",
    "Snacks", "Frozen", "Meat", "Seafood", "Grains",
    "Spices", "Condiments", "Breakfast", "Coffee & Tea", "Juices",
    "Personal Care", "Cleaning", "Pet Food", "Organic", "Health"
  ]

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    quantity: "",
    price: "",
    category: [],
    images: [],
    id: ""
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // 🔹 State for the "Other" category input
  const [otherCategory, setOtherCategory] = useState("")
  // 🔹 Carousel state
  const [activeIndex, setActiveIndex] = useState(0)

  // ... (useEffect and fetchItem logic is unchanged) ...
  useEffect(() => {
    if (!user || !isLoaded || !isSignedIn) return
    const fetchItem = async () => {
      try {
        const token = await getToken()

        const urlToBase64 = async (url) => {
          const res = await fetch(url)
          const blob = await res.blob()
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        }

        const res = await axios.post(
          `${API_URL}/api/merchant/get_item`,
          { item_id, owner_id: user.id },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        )
        if (res.status === 200) {
          const item = res.data.item
          const images = await Promise.all(
            item.images?.map(img => urlToBase64(img.url)) || []
          )
          setFormData({
            name: item.name || "",
            description: item.description || "",
            quantity: item.quantity || "",
            price: item.price || "",
            category: item.category || [],
            images: images,
          })
        }
      } catch (err) {
        console.error("Error fetching item:", err)
        alert("Failed to load item details")
      } finally {
        setLoading(false)
      }
    }

    fetchItem()
  }, [user, isLoaded, isSignedIn, item_id, API_URL, getToken])

  // 🔹 Handle text input changes (unchanged)
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // 🔹 NEW: Handler for AntD Select
  const handleCategorySelectChange = (selectedValues) => {
    setFormData(prev => ({
      ...prev,
      category: selectedValues
    }));
  };

  // 🔹 NEW: Handler to add a new category from the "Other" input
  const handleAddNewCategory = (e) => {
    // Check for 'Enter' key or 'blur' event
    if (e.type === 'blur' || (e.type === 'keydown' && e.key === 'Enter')) {
      e.preventDefault();
      const newCat = otherCategory.trim();
      if (newCat) {
        setFormData(prev => ({
          ...prev,
          // Add the new category, remove 'Other', and keep existing ones
          category: [...new Set([...prev.category.filter(c => c !== 'Other'), newCat])]
        }));
        // Clear the input
        setOtherCategory("");
      }
    }
  };

  // 🔹 Generate options for the Select, including custom ones
  const allCategoryOptions = useMemo(() => {
    const customCategories = formData.category.filter(c => !categoryOptions.includes(c) && c !== 'Other');
    const combined = [...categoryOptions, ...customCategories, 'Other'];
    return [...new Set(combined)].map(cat => ({ label: cat, value: cat }));
  }, [formData.category]);

  // ... (handleImageChange and handleRemoveImage logic is unchanged) ...
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    const readers = files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
    )
    Promise.all(readers).then((base64Images) => {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...base64Images],
      }))
      setActiveIndex((prev) => (prev === 0 && formData.images.length === 0 ? 0 : prev))
    })
  }
  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setActiveIndex((prev) => {
      if (index === prev) {
        return Math.max(0, prev - 1)
      }
      if (index < prev) return prev - 1
      return prev
    })
  };

  const goPrev = () => {
    setActiveIndex((prev) => (formData.images.length ? (prev - 1 + formData.images.length) % formData.images.length : 0))
  }
  const goNext = () => {
    setActiveIndex((prev) => (formData.images.length ? (prev + 1) % formData.images.length : 0))
  }

  // ... (handleSubmit logic is unchanged) ...
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user || !isLoaded || !isSignedIn) return
    setSaving(true)

    try {
      const token = await getToken()
      const res = await axios.put(
        `${API_URL}/api/merchant/update_items`,
        { ...formData, owner_id: user.id, id: item_id },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (res.status === 200) {
        alert("Item updated successfully!")
        router.push("/merchant/dashboard")
      } else {
        alert(res.data.message || "Error updating item")
      }
    } catch (err) {
      console.error("Error updating item:", err)
      alert("Failed to update item.")
    } finally {
      setSaving(false)
    }
  }

  

  // 🔹 Skeleton loading state
  if (loading) return (
    <div className="min-h-screen p-4 md:p-8 bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-7xl mx-auto animate-pulse">
        <div className="h-10 w-48 bg-[var(--muted)] rounded mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
          <div className="md:col-span-2 md:order-last">
            <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <div className="aspect-square w-full bg-[var(--muted)]" />
              <div className="grid grid-cols-5 gap-2 p-3 border-t border-[var(--border)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-[var(--muted)] rounded-md" />
                ))}
              </div>
            </div>
            <div className="mt-4 h-12 bg-[var(--muted)] rounded" />
          </div>
          <div className="md:col-span-3 flex flex-col gap-8">
            <div className="h-12 bg-[var(--muted)] rounded" />
            <div className="h-28 bg-[var(--muted)] rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="h-12 bg-[var(--muted)] rounded" />
              <div className="h-12 bg-[var(--muted)] rounded" />
            </div>
            <div className="h-16 bg-[var(--muted)] rounded" />
            <div className="h-12 bg-[var(--muted)] rounded" />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <ConfigProvider
      theme={{
        algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: 'var(--primary)',
          colorBgBase: 'var(--background)',
          colorBgContainer: 'var(--card)',
          colorBorder: 'var(--border)',
          colorText: 'var(--foreground)',
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
            controlItemBgHover: 'var(--muted)',
            controlHeight: 48,
          },
          Input: {
            colorBgContainer: 'var(--card)',
            colorText: 'var(--foreground)',
            colorBorder: 'var(--border)',
            controlHeight: 48,
          },
        }
      }}
    >
      <div className="min-h-screen p-4 md:p-8 bg-[var(--background)] text-[var(--foreground)]">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-[var(--foreground)]">Edit Item</h1>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
            {/* Images (right on desktop) */}
            <div className="md:col-span-2 md:order-last md:sticky md:top-8 h-fit">
              <label className="text-sm font-medium mb-2 block text-[var(--muted-foreground)]">Item Images</label>
              <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                <div className="relative aspect-square w-full">
                  {formData.images && formData.images.length > 0 ? (
                    <img src={formData.images[activeIndex]?.url || formData.images[activeIndex]} alt={`image-${activeIndex}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-[var(--muted-foreground)]">No images</div>
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
                      <button type="button" key={i} onClick={() => setActiveIndex(i)} className={`relative aspect-square rounded-md overflow-hidden border ${i === activeIndex ? 'border-[var(--primary)]' : 'border-[var(--border)]'}`} aria-label={`Select image ${i + 1}`}>
                        <img src={img.url || img} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveImage(i) }} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs" aria-label={`Remove image ${i + 1}`}>✕</button>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <label htmlFor="file-upload" className="mt-4 block w-full text-center py-3 px-4 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] font-medium cursor-pointer transition-colors">Upload More Images</label>
              <input id="file-upload" type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>

            {/* Details (left on desktop) */}
            <form onSubmit={handleSubmit} className="md:col-span-3 flex flex-col gap-8">
              <div>
                <label className="text-sm font-medium text-[var(--muted-foreground)]">Item Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] text-lg p-2 focus:outline-none focus:ring-0 focus:border-[var(--primary)] transition-colors" placeholder="Enter item name" />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--muted-foreground)]">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] text-lg p-2 focus:outline-none focus:ring-0 focus:border-[var(--primary)] transition-colors" placeholder="Enter description" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">Quantity</label>
                  <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] text-lg p-2 focus:outline-none focus:ring-0 focus:border-[var(--primary)] transition-colors" placeholder="Enter quantity" />
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">Price</label>
                  <input type="number" name="price" min={1} value={formData.price} onChange={handleChange} className="w-full bg-transparent border-b-2 border-[var(--border)] text-[var(--foreground)] text-lg p-2 focus:outline-none focus:ring-0 focus:border-[var(--primary)] transition-colors" placeholder="Enter price" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--muted-foreground)] mb-2 block">Categories</label>
                <Select mode="multiple" allowClear style={{ width: '100%' }} placeholder="Select categories" value={formData.category} onChange={handleCategorySelectChange} options={allCategoryOptions} size="large" dropdownStyle={{ background: 'var(--popover)', color: 'var(--popover-foreground)' }} />
                {formData.category.includes('Other') && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-[var(--muted-foreground)]">New Category Name</label>
                    <Input type="text" value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)} onBlur={handleAddNewCategory} onKeyDown={handleAddNewCategory} className="w-full mt-2 bg-transparent !border-[var(--border)] text-[var(--foreground)] !text-lg p-2 focus:!border-[var(--primary)]" placeholder="Type new category and press Enter" size="large" />
                  </div>
                )}
              </div>
              <button type="submit" disabled={saving} className="w-full bg-[var(--primary)] hover:opacity-90 text-[var(--primary-foreground)] font-semibold py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg mt-4">{saving ? 'Updating...' : 'Update Item'}</button>
            </form>
          </div>
        </div>
      </div>
    </ConfigProvider>
  )
}