'use client'
import { useEffect, useState } from "react"
import { Select } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import AnimatedButton from '@/components/ui/AnimatedButton';
import { useParams, useRouter } from "next/navigation"
import { useUser, useAuth } from "@clerk/nextjs"
import axios from "axios"

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
    "Personal Care", "Cleaning", "Pet Food", "Organic", "Health",
    "Household Essentials", "Baby Care", "Pharmacy", "Stationery", "Beauty"
  ]

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    quantity: "",
    price: "",
    category: [],
    images: [],
    id:""
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [otherCategory, setOtherCategory] = useState("")

  // 🔹 Fetch existing item details
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
            images: images ,
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
  }, [user, isLoaded, isSignedIn])

  // 🔹 Handle text input changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // 🔹 Handle category checkbox changes
  const handleCategoryChange = (e) => {
    const { value, checked } = e.target
    setFormData((prev) => {
      if (checked) {
        return { ...prev, category: [...prev.category, value] }
      } else {
        return { ...prev, category: prev.category.filter((cat) => cat !== value) }
      }
    })
  }

  // 🔹 Handle new images
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
  //remove image from the image arraay
  const handleRemoveImage = (index) => {
  setFormData((prev) => ({
    ...prev,
    images: prev.images.filter((_, i) => i !== index),
  }));
    };


  // 🔹 Handle form submit (Update item)
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

  if (loading) return <div className="text-center mt-10 text-gray-400">Loading item details...</div>

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-gray-900 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Edit Item</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Item images */}
        {/* Item images */}
<div>
  <label className="text-gray-300 mb-1 block">Images</label>
  <div className="flex flex-wrap gap-3 mb-3">
    {formData.images?.map((img, i) => (
      <div key={i} className="relative">
            <img
            src={img.url || img} // supports both {url: "..."} or base64 string
            alt={`preview-${i}`}
            className="w-24 h-24 object-cover rounded-md border border-gray-700"
            />
            <button
            type="button"
            onClick={() => handleRemoveImage(i)}
            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
            >
            ✕
            </button>
        </div>
        ))}
    </div>
    <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleImageChange}
        className="text-gray-300"
    />
    </div>


        {/* Name */}
        <div>
          <label className="text-gray-300 mb-1 block">Item Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full rounded-lg px-3 py-2 bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Enter item name"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-gray-300 mb-1 block">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full rounded-lg px-3 py-2 bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Enter description"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="text-gray-300 mb-1 block">Quantity</label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            className="w-full rounded-lg px-3 py-2 bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Enter quantity"
          />
        </div>

        {/* Price */}
        <div>
          <label className="text-gray-300 mb-1 block">Price</label>
          <input
            type="number"
            name="price"
            min={1}
            value={formData.price}
            onChange={handleChange}
            className="w-full rounded-lg px-3 py-2 bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Enter price"
          />
        </div>

        {/* Categories */}
        <div>
          <label className="text-gray-300 mb-1 block">Categories</label>
          <Select
            mode="multiple"
            value={formData.category}
            onChange={(values)=>setFormData(prev=>({...prev, category: values}))}
            style={{ width: '100%' }}
            placeholder="Select categories"
            maxTagCount="responsive"
            suffixIcon={
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <span>{formData.category?.length || 0}</span>
                <DownOutlined />
              </span>
            }
            options={[...categoryOptions.map(c=>({value:c,label:c})), {value:'Other', label:'Other'}]}
          />
          {formData.category?.includes('Other') && (
            <div className="mt-3">
              <label className="text-gray-300 mb-1 block">Enter custom category</label>
              <input
                type="text"
                value={otherCategory}
                onChange={(e)=>setOtherCategory(e.target.value)}
                onBlur={()=>{
                  if(otherCategory.trim()){
                    setFormData(prev=>({
                      ...prev,
                      category: prev.category.filter(c=>c!== 'Other').concat(otherCategory.trim())
                    }));
                    setOtherCategory("");
                  }
                }}
                className="w-full mt-1 rounded-lg px-3 py-2 bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Type new category"
              />
              <p className="text-xs text-gray-500 mt-1">Blur the input to add it and replace "Other".</p>
            </div>
          )}
        </div>

        {/* Submit */}
        <AnimatedButton type="submit" size="md" rounded="full" variant="primary" disabled={saving}>
          {saving ? "Updating..." : "Update Item"}
        </AnimatedButton>
      </form>
    </div>
  )
}
