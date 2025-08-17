import express from "express";
import { signup, login, logout, changePassword, deleteAccount } from "../controllers/Auth/authController.js";
import { protectRoute } from "../middlewares/AuthMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.put("/change-password", protectRoute, changePassword);
router.delete("/delete-account", protectRoute, deleteAccount);
router.get("/me", protectRoute, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user, 
  });
});

export default router;
