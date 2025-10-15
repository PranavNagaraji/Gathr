"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

const ItemDetailsPage = () => {
  const { user, isLoaded:isUserLoaded } = useUser();
  const { isLoaded, getToken } = useAuth();
  const { item_id } = useParams();
  const router=useRouter();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [userId, setUserId]=useState(0);
  const [item, setItem] = useState({});
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 1000,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    adaptiveHeight: true,
    autoplay: true,
    autoplaySpeed: 3000
  };

  // --- Fetch item and comments ---
  useEffect(() => {
    if (!item_id) return;

    const fetchData = async () => {
      const token = await getToken();
      setIsLoading(true);
      try {
        const [itemResult, commentsResult, userIdResult] = await Promise.all([
          axios.get(`${API_URL}/api/customer/getItem/${item_id}`),
          axios.get(`${API_URL}/api/customer/getComments/${item_id}`),
          axios.get(`${API_URL}/api/customer/getUserId/${user.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        ]);
        setItem(itemResult.data.item || {});
        setComments(commentsResult.data.comments || []);
        // console.log(userIdResult.data);
        setUserId(userIdResult.data.user_id);
      } catch (error) {
        console.error("Failed to fetch item details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [item_id, API_URL, isUserLoaded, isLoaded]);

  // --- Handlers ---
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment || !user) return;
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/api/customer/addComment`,
        { itemId: item_id, comment: newComment, clerkId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newCommentData = {
        ...res.data.comment,
        username: user.fullName || "Anonymous",
        imageUrl: user.imageUrl,
      };
      setComments((prev) => [...prev, newCommentData]);
      setNewComment("");
      // router.push(window.location.pathname);
      window.location.reload(true)
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleDeleteComment = async (commentId) => {
    if (!user) return;

    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/api/customer/deleteComment`,
        { commentId: commentId, clerkId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      router.push(window.location.pathname);
    } catch (err) {
      console.error(err);
    }
  };


  const handleAddRating = async (e) => {
    e.preventDefault();
    if (newRating <= 0 || newRating > 5 || !user) return;
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
    if (!user) return;
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
    return <span className="text-[#F85B57] text-xl">{filled}{empty}</span>;
  };

  const listVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen bg-[#FAEDE7] flex justify-center items-center">
        <p className="text-2xl font-bold text-[#0B132B]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAEDE7] text-[#0B132B] px-6 sm:px-10 lg:px-20 py-12 relative overflow-hidden">
      {/* Animated Background Shapes */}
      <motion.div
        className="absolute top-10 left-10 w-24 h-24 bg-[#ff3b3b] rounded-full mix-blend-multiply filter blur-xl opacity-70"
        animate={{ y: [0, 40, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-10 right-16 w-28 h-28 bg-[#b4ff00] rounded-[2rem] mix-blend-multiply filter blur-xl opacity-70"
        animate={{ x: [0, -30, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-6xl mx-auto z-10 relative space-y-16">
        {/* ITEM INFO */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Image Carousel */}
         <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="h-96 w-full" // Ensure parent has fixed height
              >
                {item.images?.length > 0 ? (
                  <Slider {...sliderSettings}>
                    {item.images.map((img, idx) => (
                      <div key={idx} className="h-96 w-full relative">
                        <img
                          src={img.url}
                          alt={`${item.name} image ${idx + 1}`}
                          className="h-full w-full object-cover rounded-2xl shadow-2xl"
                        />
                      </div>
                    ))}
                  </Slider>
                ) : (
                  <div className="h-96 w-full bg-gray-200 rounded-2xl flex items-center justify-center">
                    <p>No Image</p>
                  </div>
                )}
              </motion.div>


          {/* Item Details */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col space-y-5"
          >
            <h1 className="font-extrabold text-4xl sm:text-5xl tracking-tight">{item.name}</h1>

            <p className="flex items-center gap-2">
              {item.rating ? renderStars(item.rating) : <span className="text-gray-500">Not rated yet</span>}
              <span className="text-gray-600">({item.rating?.toFixed(1) || '0'})</span>
            </p>

            <p className="text-[#23323A] text-lg leading-relaxed">{item.description}</p>

            <div className="flex flex-wrap gap-2">
              {item.category?.map((cat, i) => (
                <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full bg-[#0B132B] text-white">{cat}</span>
              ))}
            </div>

            <p className="text-4xl font-bold text-[#00ADB5]">₹{item.price}</p>

            <div className="flex items-center gap-4 pt-4">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 text-center text-lg font-semibold bg-[#1C1C1C] text-white border-2 border-[#F85B57] rounded-full shadow-md focus:outline-none focus:ring-4 focus:ring-[#F85B57]/40 transition-all hover:scale-105"
                placeholder="Quantity"
                min={1}
              />
              <motion.button
                onClick={handleAddToCart}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 bg-[#F85B57] text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg hover:opacity-90 transition-opacity"
              >
                Add to Cart
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* RATING & COMMENT */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Rating Form */}
          <motion.div initial="hidden" animate="show" variants={itemVariants} className="bg-[#1C1C1C] text-white p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Rate this Product</h3>
            <form onSubmit={handleAddRating} className="flex items-center gap-4">
              <input
                type="number"
                value={newRating}
                onChange={(e) => setNewRating(e.target.value)}
                className="border border-[#F85B57] rounded-md p-2 w-24 text-center focus:outline-none focus:ring-2 focus:ring-[#F85B57] bg-white text-[#1C1C1C]"
                min={1} max={5} placeholder="1-5"
              />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="bg-[#F85B57] text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition">
                Submit
              </motion.button>
            </form>
          </motion.div>

          {/* Comment Form */}
          <motion.div initial="hidden" animate="show" variants={itemVariants} className="bg-[#1C1C1C] text-white p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Share your Thoughts</h3>
            <form onSubmit={handleAddComment} className="flex flex-col gap-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                placeholder="Write your review here..."
                className="w-full border border-[#F85B57] rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#F85B57] bg-white text-[#1C1C1C]"
              />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="bg-[#F85B57] text-white px-6 py-2 rounded-lg font-semibold self-start hover:opacity-90 transition">
                Post Comment
              </motion.button>
            </form>
          </motion.div>
        </div>

        {/* CUSTOMER REVIEWS */}
        <div>
          <h2 className="font-extrabold text-3xl sm:text-4xl tracking-tight mb-8">Customer Reviews</h2>
          <motion.div initial="hidden" animate="show" variants={listVariants} className="space-y-6">
            <AnimatePresence>
              {comments.length > 0 ? (
                comments.map((c, idx) => <motion.div
                key={c.id || idx}
                variants={itemVariants}
                exit={{ opacity: 0, x: -50 }}
                className="bg-[#1C1C1C] text-white p-5 rounded-2xl shadow-lg relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={c.imageUrl} />
                      <AvatarFallback>{c.username?.charAt(0) || 'A'}</AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-lg">{c.username || "Anonymous"}</span>
                  </div>
                  {/* Delete Button */}
                  {userId === c.user_id && (
                  <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg shadow-md transition-all hover:scale-105"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p className="text-gray-300 pl-16">{c.comment}</p>
              </motion.div>
                )
              ) : (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-gray-500 py-8">
                  Be the first to share your thoughts on this item!
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailsPage;
