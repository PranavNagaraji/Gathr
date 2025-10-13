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
        console.log(result.data.comments);
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
        { itemId:item_id, comment: newComment, clerkId: user.id},
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
        { itemId:item_id, rating: newRating, clerkId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItem((prev) => ({ ...prev, rating: res.data.average }));
      setNewRating(0);
    } catch (err) {
      console.error(err);
    }
  };

  const renderStars = (rating) => {
    const filled = "★".repeat(Math.round(rating));
    const empty = "☆".repeat(5 - Math.round(rating));
    return (
      <span style={{ color: "#D4AF37", fontSize: "1.2rem" }}>{filled}{empty}</span>
    );
  };

  const handleAddToCart = async () =>{
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/api/customer/addToCart`,
        { itemId:item_id, quantity: quantity, clerkId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.data.message === "Not enough stock available") {
        alert("Not enough stock available");
        setItem((prev) => ({ ...prev, quantity: res.data.stock }));
      }
      else{
        alert("Item added to cart");
        setItem((prev) => ({ ...prev, quantity: item.quantity - quantity }));
      }
      console.log(res.data);
    } catch (err) {
      console.error(err);
    }
  }


  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] p-6">
      {/* Item Images */}
      <div className="flex gap-4 overflow-x-auto mb-8">
        {item.images?.map((img, idx) => (
          <img
            key={idx}
            src={img.url}
            alt={`${item.name} image ${idx + 1}`}
            className="h-72 object-cover rounded-xl shadow-md hover:scale-105 transition-transform"
          />
        ))}
      </div>

      {/* Item Info */}
      <div className="mb-12 grid md:grid-cols-2 gap-8">
        <div className="bg-[#111827] text-[#F9FAFB] p-6 rounded-xl shadow-md">
          <h1 className="text-3xl font-bold mb-4">{item.name}</h1>
          <p className="mb-2">{item.description}</p>
          <p className="text-xl font-semibold mb-2">
            Price: <span className="text-[#D4AF37]">${item.price}</span>
          </p>
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value) }className="bg-white text-black p-2" />
          <button className="bg-yellow-400 p-2 ml-2 rounded-md" onClick={handleAddToCart}>Add to Cart</button>
          <p className="mb-1">Category: {item.category?.join(", ")}</p>
          <p className="flex items-center gap-2">
            Rating: {item.rating ? renderStars(item.rating) : "Not rated yet"}
          </p>
        </div>
      </div>

      {/* Comments */}
      <div className="mb-12">
        <h2 className="text-3xl font-semibold mb-6">Customer Reviews</h2>
        {comments.length === 0 ? (
          <p>No comments yet.</p>
        ) : (
          comments.map((c, idx) => (
            <div key={idx} className="bg-[#111827] text-[#F9FAFB] p-4 rounded-lg mb-4">
              
              <div className="flex  items-center mb-2">
                <Avatar>
                  <AvatarImage src={c.imageUrl} />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <p className="font-semibold flex justify-center ml-2">
                
                {c.username ? `${c.username}` : "Anonymous"}
                </p>
              </div>
              <p>{c.comment}</p>
            </div>
          ))
        )}
      </div>

      {/* Add Comment */}
      <div className="mb-8 bg-[#111827] text-[#F9FAFB] p-6 rounded-xl shadow-md">
        <h3 className="text-2xl font-semibold mb-4">Write a Comment</h3>
        <form onSubmit={handleAddComment} className="flex flex-col gap-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full border border-[#D4AF37] rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-[#F9FAFB] text-[#111827]"
            rows={4}
            placeholder="Share your thoughts about this product..."
          />
          <button
            type="submit"
            className="bg-[#D4AF37] text-[#111827] px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Submit Comment
          </button>
        </form>
      </div>

      {/* Add Rating */}
      <div className="mb-8 bg-[#111827] text-[#F9FAFB] p-6 rounded-xl shadow-md">
        <h3 className="text-2xl font-semibold mb-4">Add Your Rating</h3>
        <form onSubmit={handleAddRating} className="flex items-center gap-4">
          <input
            type="number"
            value={newRating}
            onChange={(e) => setNewRating(e.target.value)}
            className="border border-[#D4AF37] rounded-lg p-2 w-24 text-center focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-[#F9FAFB] text-[#111827]"
            min={0}
            max={5}
          />
          <button
            type="submit"
            className="bg-[#D4AF37] text-[#111827] px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
            disabled={newRating < 0 || newRating > 5}
            onClick={handleAddRating  }
          >
            Submit Rating
          </button>
        </form>
      </div>
    </div>
  );
};

export default ItemDetails;
