import express from "express";

import { addToCart, removeFromCart, clearCart,updateQuantity, getCart} from "../Controllers/Client/CartController.js";
import { getFavorites, clearFavorites,removeFavorite,addFavorite } from "../Controllers/Client/favoriteController.js";

const router = express.Router();


router.get("/cart", getCart);
router.post("/cart", addToCart);
router.delete("/cart/:itemId", removeFromCart);
router.delete("/cart", clearCart);
router.patch("/cart/:itemId", updateQuantity);
router.get("/favorites",  getFavorites);
router.post("/favorites",  addFavorite);
router.delete("/favorites/:productId",  removeFavorite);
router.delete("/favorites",  clearFavorites);

// router.get("/orderhistory", registerClient);

export default router;