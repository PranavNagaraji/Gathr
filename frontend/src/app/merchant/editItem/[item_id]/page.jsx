'use client'
import { useEffect, useState, useMemo } from "react" // 🔹 Added useMemo
import { useParams, useRouter } from "next/navigation"
import { useUser, useAuth } from "@clerk/nextjs"
import axios from "axios"
// 🔹 Import AntD components
import { Select, Input, ConfigProvider, theme, Spin } from "antd"

export default function EditItemPage() {
  const router = useRouter()
  const { item_id } = useParams()
  const { user } = useUser()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL

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
    })
  }
  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

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

  // 🔹 Cleaner loading state with Spin
  if (loading) return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <Spin size="large" />
    </div>
  )

  return (
    // 🔹 Wrap with AntD provider for dark theme
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#3b82f6', // blue-500
          colorBgBase: '#111827', // bg-gray-900
          colorBgContainer: '#1f2937', // bg-gray-800
          colorBorder: '#374151', // border-gray-700
          colorText: 'white',
        },
        components: {
          Select: {
            colorBgContainer: 'transparent',
            colorBorder: '#374151', // border-gray-700
            controlHeight: 48, // Taller select
          },
          Input: {
            colorBgContainer: 'transparent',
            colorBorder: '#374151', // border-gray-700
            controlHeight: 48, // Taller input
          },
        }
      }}
    >
      <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">Edit Item</h1>

          {/* 🔹 Responsive 60/40 Grid Layout
            - 1 column on mobile (default)
            - 5 columns on desktop (md:)
          */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12">

            {/* 🔹 RIGHT COLUMN (Images)
              - Appears FIRST in JSX for mobile-first layout
              - Spans 2/5 of the width on desktop
              - Pushed to the right and made sticky on desktop
            */}
            <div className="md:col-span-2 md:order-last md:sticky md:top-8 h-fit">
              <label className="text-sm font-medium text-gray-400 mb-2 block">Item Images</label>

              <div className="grid grid-cols-3 gap-4 mb-4">
                {formData.images?.map((img, i) => (
                  <div key={i} className="relative aspect-square">
                    <img
                      src={img.url || img}
                      alt={`preview-${i}`}
                      className="w-full h-full object-cover rounded-lg border-2 border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 transition-colors"
                      aria-label="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <label
                htmlFor="file-upload"
                className="block w-full text-center py-3 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium cursor-pointer transition-colors"
              >
                Upload More Images
              </label>
              <input
                id="file-upload"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>


            {/* 🔹 LEFT COLUMN (Details)
              - Appears SECOND in JSX
              - Spans 3/5 of the width on desktop
            */}
            <form onSubmit={handleSubmit} className="md:col-span-3 flex flex-col gap-8">

              {/* Name */}
              <div>
                <label className="text-sm font-medium text-gray-400">Item Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b-2 border-gray-700 text-white text-lg p-2 focus:outline-none focus:ring-0 focus:border-blue-500 transition-colors"
                  placeholder="Enter item name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-gray-400">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-transparent border-b-2 border-gray-700 text-white text-lg p-2 focus:outline-none focus:ring-0 focus:border-blue-500 transition-colors"
                  placeholder="Enter description"
                />
              </div>

              {/* Quantity & Price (Side-by-side) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Quantity */}
                <div>
                  <label className="text-sm font-medium text-gray-400">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="w-full bg-transparent border-b-2 border-gray-700 text-white text-lg p-2 focus:outline-none focus:ring-0 focus:border-blue-500 transition-colors"
                    placeholder="Enter quantity"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="text-sm font-medium text-gray-400">Price</label>
                  <input
                    type="number"
                    name="price"
                    min={1}
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full bg-transparent border-b-2 border-gray-700 text-white text-lg p-2 focus:outline-none focus:ring-0 focus:border-blue-500 transition-colors"
                    placeholder="Enter price"
                  />
                </div>
              </div>

              {/* 🔹 NEW: Categories Select */}
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Categories</label>
                <Select
                  mode="multiple"
                  allowClear
                  style={{ width: '100%' }}
                  placeholder="Select categories"
                  value={formData.category}
                  onChange={handleCategorySelectChange}
                  options={allCategoryOptions}
                  size="large" // Makes it taller
                  className="bg-transparent"
                />

                {/* 🔹 NEW: Conditional "Other" Input */}
                {formData.category.includes('Other') && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-400">New Category Name</label>
                    <Input
                      type="text"
                      value={otherCategory}
                      onChange={(e) => setOtherCategory(e.target.value)}
                      onBlur={handleAddNewCategory}
                      onKeyDown={handleAddNewCategory}
                      className="w-full mt-2 bg-transparent !border-gray-700 text-white !text-lg p-2 focus:border-blue-500"
                      placeholder="Type new category and press Enter"
                      size="large"
                    />
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg mt-4"
              >
                {saving ? "Updating..." : "Update Item"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </ConfigProvider>
  )
}