// update routes
import supabase from "../db.js";
import cloudinary from "../cloudinary.js";
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

// edit_shop function
export const updateShop = async (req, res) => {
    try {
        const { owner_id, Location, address, shop_name, contact, account_no, mobile_no, upi_id, image, category } = req.body;

        const { data: user, error: userError } = await supabase
            .from('Users')
            .select('id, role')
            .eq('clerk_id', owner_id)
            .single();

        if (userError || !user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role !== 'merchant') {
            return res.status(403).json({ message: "Unauthorized: Only merchants can edit shops" });
        }

        const { data: updatedShop, error: updateError } = await supabase
            .from("Shops")
            .update({
                Location,
                address,
                shop_name,
                contact,
                account_no,
                mobile_no,
                upi_id,
                category
            })
            .eq('owner_id', user.id)
            .select('image') 
            .single();

        if (updateError) {
            throw updateError;
        }

        res.status(200).json({ message: "Shop details updated successfully. Image processing in background." });

        //Handle image update in the background (fire-and-forget)
        if (image) {
            (async () => {
                try {
                    // Delete the old image if it exists
                    const oldImage = updatedShop?.image;
                    if (oldImage && oldImage.public_id) {
                        await cloudinary.uploader.destroy(oldImage.public_id);
                    }

                    // Upload the new image
                    const result = await cloudinary.uploader.upload(image, {
                        folder: `shops/${user.id}`
                    });
                    const imageData = { url: result.secure_url, public_id: result.public_id };

                    // Update the database with the new image URL
                    await supabase
                        .from("Shops")
                        .update({ image: imageData })
                        .eq('owner_id', user.id);
                        
                    console.log(`Successfully updated image for shop owned by user ${user.id}`);
                } catch (error) {
                    console.error("Error in background image processing for editShop:", error);
                }
            })();
        }

    } catch (error) {
        console.error("Error editing shop:", error);
        return res.status(500).json({ message: "Error editing shop", error: error.message });
    }
};


// update_item function
export const updateItem = async (req, res) => {
    try {
        const { name, description, quantity, price, images, category, owner_id, id } = req.body;
        
        const { data: user, error: userError } = await supabase
            .from('Users')
            .select('id, role')
            .eq('clerk_id', owner_id)
            .single();


        if (userError || !user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role !== 'merchant') {
            return res.status(403).json({ message: "Unauthorized: Only merchants can update items" });
        }

        const {data:shop_id} = await supabase
            .from("Shops")
            .select("id")
            .eq("owner_id", user.id)
            .single();

        const { data: updatedItem, error: updateError } = await supabase
            .from("Items")
            .update({ name, description, quantity, price, category })
            .eq('id', id)
            .eq('shop_id', shop_id.id)
            .select('images')
            .single();
        
        if (updateError) {
            throw updateError;
        }
        console.log("hello")
        res.status(200).json({ message: "Item updated successfully. Image processing in background." });

        //Handle image updates in the background if new images are provided
        if (images && images.length > 0) {
            (async () => {
                try {
                    const oldImages = updatedItem?.images;
                    if (oldImages && oldImages.length > 0) {
                        const publicIdsToDelete = oldImages.map(img => img.public_id);
                        await cloudinary.api.delete_resources(publicIdsToDelete);
                    }

                    const uploadedImages = await Promise.all(
                        images.map(async (image) => {
                            const result = await cloudinary.uploader.upload(image, {
                                folder: `items/${user.id}`
                            });
                            return { url: result.secure_url, public_id: result.public_id };
                        })
                    );

                    await supabase
                        .from("Items")
                        .update({ images: uploadedImages })
                        .eq('id', id)
                        .eq('shop_id', shop_id.id);

                    
                    console.log(`Successfully updated images for item ${id}`);
                } catch (error) {
                    console.error(`Error in background image processing for updateItem (item ID: ${id}):`, error);
                }
            })();
        }

    } catch (error) {
        console.error("Error updating item:", error);
        return res.status(500).json({ message: "Error updating item", error: error.message });
    }
};

export const deleteShop = async (req,res) =>{
    try{
        const { owner_id } = req.body;
        const { data: user, error: userError } = await supabase
            .from('Users')
            .select('id, role')
            .eq('clerk_id', owner_id)
            .single();
        if(userError || !user){
            return res.status(404).json({ message: "User not found" });
        }
        if(user.role !== 'merchant')
            return res.status(403).json({ message: "Unauthorized: Only merchants can delete shops" });
        const image = await supabase.from("Shops").select("image").eq("owner_id",user.id).single();
        if(image.data.image && image.data.image.public_id){
            await cloudinary.uploader.destroy(image.data.image.public_id);
        }
        await supabase.from("Shops").delete().eq("owner_id",user.id);   
        return res.status(200).json({ message: "Shop deleted successfully" });

    }catch(error){
        console.error("Error deleting shop:", error);
        return res.status(500).json({ message: "Error deleting shop", error: error.message });
    }
}

export const deleteitem = async(req,res)=>{
    try {
        const { item_id,clerk_id } = req.body;
        const owner = await supabase.from("Users").select("id").eq("clerk_id",clerk_id).single();
        let shop_id = await supabase.from("Shops").select("id").eq("owner_id",owner.data.id).single();
        shop_id = shop_id.data.id
        
        const { data: item, error: itemError } = await supabase
            .from("Items")
            .select("images")
            .eq("id", item_id)
            .eq("shop_id",shop_id)
            .single();
        
        if (itemError || !item) {
            return res.status(404).json({ message: "Item not found" });
        }
        const images = item.images;
        if (images && images.length > 0) {
            const publicIdsToDelete = images.map(img => img.public_id);
            await cloudinary.api.delete_resources(publicIdsToDelete);
        }
        await supabase.from("Items").delete().eq("id", item_id);
        return res.status(200).json({ message: "Item deleted successfully" });
    } catch (error) {
        console.error("Error deleting item:", error);
        return res.status(500).json({ message: "Error deleting item", error: error.message });
    }
}

