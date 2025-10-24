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
  const { user, isLoaded: isUserLoaded } = useUser();
  const { isLoaded, getToken } = useAuth();
  const { item_id } = useParams();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [userId, setUserId] = useState(0);
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
          axios.get(`${API_URL}/api/customer/getUserId/${user?.id}`, {
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
      <div className="min-h-screen bg-[var(--background)] flex justify-center items-center">
        <p className="text-2xl font-bold text-[var(--foreground)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-6 sm:px-10 lg:px-20 py-12 relative">
      <div className="max-w-6xl mx-auto z-10 relative space-y-16">
        {/* ITEM INFO */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Image Carousel */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="h-96 w-full"
          >
            {item.images?.length > 0 ? (
              <Slider {...sliderSettings}>
                {item.images.map((img, idx) => (
                  <div key={idx} className="h-96 w-full relative">
                    <img
                      src={img.url}
                      alt={`${item.name} image ${idx + 1}`}
                      className="h-full w-full object-cover rounded-2xl shadow-xl"
                    />
                  </div>
                ))}
              </Slider>
            ) : (
              <div className="h-96 w-full bg-[var(--muted)] text-[var(--muted-foreground)] rounded-2xl flex items-center justify-center">
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
              {item.rating ? renderStars(item.rating) : <span className="text-[var(--muted-foreground)]">Not rated yet</span>}
              <span className="text-[var(--muted-foreground)]">({item.rating?.toFixed(1) || '0'})</span>
            </p>

            <p className="text-[var(--muted-foreground)] text-lg leading-relaxed">{item.description}</p>

            <div className="flex flex-wrap gap-2">
              {item.category?.map((cat, i) => (
                <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">{cat}</span>
              ))}
            </div>

            <p className="text-4xl font-bold text-[var(--primary)]">₹{item.price}</p>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="h-9 w-9 rounded-lg bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] hover:bg-[var(--muted)]/60 grid place-items-center select-none transition-colors"
              >
                −
              </button>
              <div
                className="min-w-12 px-3 h-9 rounded-lg bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] grid place-items-center text-base font-semibold"
                aria-live="polite"
              >
                {quantity}
              </div>
              <button
                type="button"
                onClick={() => setQuantity((q) => (item?.quantity ? Math.min(q + 1, item.quantity) : q + 1))}
                aria-label="Increase quantity"
                className="h-9 w-9 rounded-lg bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] hover:bg-[var(--muted)]/60 grid place-items-center select-none transition-colors"
              >
                +
              </button>
              <motion.button
                onClick={handleAddToCart}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="ml-2 flex-1 bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-lg font-bold text-lg shadow-sm hover:opacity-90 transition-opacity"
              >
                Add to Cart
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* RATING & COMMENT */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Rating Form */}
          <motion.div initial="hidden" animate="show" variants={itemVariants} className="bg-[var(--card)] text-[var(--card-foreground)] p-6 rounded-2xl shadow-sm border border-[var(--border)]">
            <h3 className="text-xl font-semibold mb-4">Rate this Product</h3>
            <form onSubmit={handleAddRating} className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNewRating(n)}
                    className={`text-2xl ${n <= newRating ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'} hover:scale-110 transition`}
                    aria-label={`Rate ${n} star`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition">
                Submit
              </motion.button>
            </form>
          </motion.div>

          {/* Comment Form */}
          <motion.div initial="hidden" animate="show" variants={itemVariants} className="bg-[var(--card)] text-[var(--card-foreground)] p-6 rounded-2xl shadow-sm border border-[var(--border)]">
            <h3 className="text-xl font-semibold mb-4">Share your Thoughts</h3>
            <form onSubmit={handleAddComment} className="flex flex-col gap-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                placeholder="Write your review here..."
                className="w-full border border-[var(--border)] rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40 bg-[var(--popover)] text-[var(--popover-foreground)]"
              />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-2 rounded-lg font-semibold self-start hover:opacity-90 transition">
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
                  className="bg-[var(--card)] text-[var(--card-foreground)] p-5 rounded-2xl shadow-sm border border-[var(--border)] relative"
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
                        className="flex items-center gap-1 px-3 py-1 bg-[color-mix(in_oklab,var(--destructive),white_85%)] text-[var(--destructive)] hover:opacity-90 font-semibold text-sm rounded-md shadow-sm transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <p className="text-[var(--muted-foreground)] pl-16">{c.comment}</p>
                </motion.div>
                )
              ) : (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-[var(--muted-foreground)] py-8">
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
