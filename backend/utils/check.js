import { verifyToken } from "@clerk/backend";
const CLERK_SECRET_KEY= process.env.CLERK_SECRET_KEY;

export default requireAuth = async (req, res, next) =>{
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
        const user = await verifyToken(token, CLERK_SECRET_KEY);
        req.user = user;
        next();
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(401).json({ message: "Unauthorized" });
    }
}

