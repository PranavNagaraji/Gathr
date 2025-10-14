"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const ItemDetails = () => {
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { item_id } = useParams();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [item, setItem] = useState({});
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const getItem = async () => {
      try {
        const result = await axios.get(`${API_URL}/api/customer/getItem/${item_id}`);
        setItem(result.data.item || {});
      } catch (error) {
        console.error(error);
      }
    };

    const getComments = async () => {
      try {
        const result = await axios.get(`${API_URL}/api/customer/getComments/${item_id}`);
        setComments(result.data.comments || []);
      } catch (error) {
        console.error(error);
      }
    };

    getItem();
    getComments();
  }, [item_id]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment) return;
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/api/customer/addComment`,
        { itemId: item_id, comment: newComment, clerkId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments((prev) => [...prev, res.data.comment]);
      setNewComment("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRating = async (e) => {
    e.preventDefault();
    if (newRating < 0 || newRating > 5) return;
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/api/customer/addRating`,
        { itemId: item_id, rating: newRating, clerkId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItem((prev) => ({ ...prev, rating: res.data.average }));
      setNewRating(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToCart = async () => {
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/api/customer/addToCart`,
        { itemId: item_id, quantity: quantity, clerkId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.message === "Not enough stock available") {
        alert("Not enough stock available");
        setItem((prev) => ({ ...prev, quantity: res.data.stock }));
      } else {
        alert("Item added to cart");
        setItem((prev) => ({ ...prev, quantity: item.quantity - quantity }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderStars = (rating) => {
    const filled = "★".repeat(Math.round(rating));
    const empty = "☆".repeat(5 - Math.round(rating));
    return <span className="text-[#E8C547] text-lg">{filled}{empty}</span>;
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#121212] p-6 lg:p-12 space-y-12">
      
      {/* Item Images */}
      <div className="flex gap-4 overflow-x-auto pb-2 border-b border-[#0B132B]/20">
        {item.images?.map((img, idx) => (
          <img
            key={idx}
            src={img.url}
            alt={`${item.name} image ${idx + 1}`}
            className="h-72 w-auto object-cover rounded-xl shadow-lg hover:scale-105 transition-transform"
          />
        ))}
      </div>

      {/* Item Info + Cart */}
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="bg-[#0B132B] text-[#F5F5F5] p-6 rounded-2xl shadow-lg flex flex-col space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold">{item.name}</h1>
          <p className="text-gray-200">{item.description}</p>
          <p className="text-xl font-semibold">
            Price: <span className="text-[#E8C547]">${item.price}</span>
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-[#F5F5F5] text-[#121212] p-2 rounded-md w-24 focus:outline-none focus:ring-2 focus:ring-[#00ADB5]"
              min={1}
            />
            <button
              onClick={handleAddToCart}
              className="bg-[#00ADB5] text-[#F5F5F5] px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition"
            >
              Add to Cart
            </button>
          </div>
          <p>Category: <span className="text-[#E8C547]">{item.category?.join(", ")}</span></p>
          <p className="flex items-center gap-2">
            Rating: {item.rating ? renderStars(item.rating) : "Not rated yet"}
          </p>
        </div>

        {/* Ratings & Comments Summary */}
        <div className="space-y-6">
          {/* Add Rating */}
          <div className="bg-[#0B132B] text-[#F5F5F5] p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Add Your Rating</h3>
            <form onSubmit={handleAddRating} className="flex items-center gap-4">
              <input
                type="number"
                value={newRating}
                onChange={(e) => setNewRating(e.target.value)}
                className="border border-[#E8C547] rounded-md p-2 w-24 text-center focus:outline-none focus:ring-2 focus:ring-[#E8C547] bg-[#F5F5F5] text-[#121212]"
                min={0}
                max={5}
              />
              <button
                type="submit"
                className="bg-[#E8C547] text-[#121212] px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
                disabled={newRating < 0 || newRating > 5}
              >
                Submit
              </button>
            </form>
          </div>

          {/* Add Comment */}
          <div className="bg-[#0B132B] text-[#F5F5F5] p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Write a Comment</h3>
            <form onSubmit={handleAddComment} className="flex flex-col gap-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
                placeholder="Share your thoughts about this product..."
                className="w-full border border-[#E8C547] rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#E8C547] bg-[#F5F5F5] text-[#121212]"
              />
              <button
                type="submit"
                className="bg-[#E8C547] text-[#121212] px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
              >
                Submit Comment
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-[#0B132B]">Customer Reviews</h2>
        {comments.length === 0 ? (
          <p className="text-gray-700">No comments yet.</p>
        ) : (
          comments.map((c, idx) => (
            <div
              key={idx}
              className="bg-[#0B132B] text-[#F5F5F5] p-4 rounded-2xl shadow-lg flex flex-col gap-2"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={c.imageUrl} />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <span className="font-semibold">{c.username || "Anonymous"}</span>
              </div>
              <p>{c.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ItemDetails;
