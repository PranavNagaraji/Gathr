import supabase from "../db.js";
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

export const banShop = async (req, res) => {
  try {
    const { shopId, banned, reason } = req.body || {};
    if (!shopId || typeof banned !== "boolean") {
      return res.status(400).json({ message: "Missing shopId or banned" });
    }

    const { data: shop, error: shopErr } = await supabase
      .from("Shops")
      .select("id, owner_id, shop_name")
      .eq("id", shopId)
      .single();
    if (shopErr || !shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const { data: owner, error: ownerErr } = await supabase
      .from("Users")
      .select("id, clerk_id, email, first_name, last_name")
      .eq("id", shop.owner_id)
      .single();
    if (ownerErr || !owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    try {
      await clerk.users.updateUserMetadata(owner.clerk_id, {
        publicMetadata: {
          shop_banned: banned,
          shop_ban_reason: reason || null,
        },
      });
    } catch (e) {
      return res.status(500).json({ message: "Failed to update Clerk metadata", error: e?.message });
    }

    const emailTo = owner.email;
    if (emailTo) {
      try {
        const subject = banned
          ? `Your shop has been banned`
          : `Your shop ban has been lifted`;
        const displayName = [owner.first_name, owner.last_name].filter(Boolean).join(" ") || "Merchant";
        const html = `
          <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111">
            <h2>${subject}</h2>
            <p>Hi ${displayName},</p>
            <p>${banned ? "Your shop has been banned by the admin." : "Your shop is now unbanned."}</p>
            ${reason ? `<p><strong>Reason:</strong> ${String(reason)}</p>` : ""}
            <p>Shop: ${shop.shop_name || "#" + shop.id}</p>
          </div>
        `;
        const { MJ_APIKEY_PUBLIC, MJ_APIKEY_PRIVATE, MJ_SENDER_EMAIL } = process.env;
        if (MJ_APIKEY_PUBLIC && MJ_APIKEY_PRIVATE && MJ_SENDER_EMAIL) {
          const resp = await fetch("https://api.mailjet.com/v3.1/send", {
            method: "POST",
            headers: {
              Authorization: "Basic " + Buffer.from(`${MJ_APIKEY_PUBLIC}:${MJ_APIKEY_PRIVATE}`).toString("base64"),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              Messages: [
                {
                  From: { Email: MJ_SENDER_EMAIL, Name: "Gathr" },
                  To: [{ Email: emailTo, Name: displayName }],
                  Subject: subject,
                  HTMLPart: html,
                },
              ],
            }),
          });
          await resp.json().catch(() => null);
        }
      } catch {}
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: "Internal server error", error: e?.message });
  }
};

export const banCarrier = async (req, res) => {
  try {
    const { clerkId, banned, reason } = req.body || {};
    if (!clerkId || typeof banned !== "boolean") {
      return res.status(400).json({ message: "Missing clerkId or banned" });
    }
    try {
      await clerk.users.updateUserMetadata(clerkId, {
        publicMetadata: {
          carrier_banned: banned,
          carrier_ban_reason: reason || null,
        },
      });
    } catch (e) {
      return res.status(500).json({ message: "Failed to update Clerk metadata", error: e?.message });
    }
    // Optional notification: send email if available
    try {
      const u = await clerk.users.getUser(clerkId);
      const emailTo = u?.emailAddresses?.[0]?.emailAddress;
      if (emailTo) {
        const subject = banned ? `Your carrier access has been banned` : `Your carrier ban has been lifted`;
        const html = `
          <div style=\"font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111\">
            <h2>${subject}</h2>
            ${reason ? `<p><strong>Reason:</strong> ${String(reason)}</p>` : ""}
          </div>
        `;
        const { MJ_APIKEY_PUBLIC, MJ_APIKEY_PRIVATE, MJ_SENDER_EMAIL } = process.env;
        if (MJ_APIKEY_PUBLIC && MJ_APIKEY_PRIVATE && MJ_SENDER_EMAIL) {
          await fetch("https://api.mailjet.com/v3.1/send", {
            method: "POST",
            headers: {
              Authorization: "Basic " + Buffer.from(`${MJ_APIKEY_PUBLIC}:${MJ_APIKEY_PRIVATE}`).toString("base64"),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              Messages: [
                {
                  From: { Email: MJ_SENDER_EMAIL, Name: "Gathr" },
                  To: [{ Email: emailTo }],
                  Subject: subject,
                  HTMLPart: html,
                },
              ],
            }),
          });
        }
      }
    } catch {}
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: "Internal server error", error: e?.message });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { clerkId, blocked, reason } = req.body || {};
    if (!clerkId || typeof blocked !== "boolean") {
      return res.status(400).json({ message: "Missing clerkId or blocked" });
    }
    try {
      await clerk.users.updateUserMetadata(clerkId, {
        publicMetadata: {
          blocked,
          block_reason: reason || null,
        },
      });
    } catch (e) {
      return res.status(500).json({ message: "Failed to update Clerk metadata", error: e?.message });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: "Internal server error", error: e?.message });
  }
};
