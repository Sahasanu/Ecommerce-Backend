import db from "../../config/db.js";

// Get all favorite products for the logged-in user
export const getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    const [favorites] = await db.query(
      `SELECT f.id, p.id AS productId, p.name, p.price, p.image_url
       FROM favorites f
       JOIN products p ON f.product_id = p.id
       WHERE f.user_id = ?`,
      [userId]
    );

    res.json(favorites);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({ message: "Server error while fetching favorites" });
  }
};

// Add a product to favorites
export const addFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Prevent duplicates
    const [existing] = await db.query(
      `SELECT id FROM favorites WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Product already in favorites" });
    }

    await db.query(
      `INSERT INTO favorites (user_id, product_id) VALUES (?, ?)`,
      [userId, productId]
    );

    res.status(201).json({ message: "Product added to favorites" });
  } catch (error) {
    console.error("Error adding favorite:", error);
    res.status(500).json({ message: "Server error while adding favorite" });
  }
};

// Remove a product from favorites
export const removeFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    await db.query(
      `DELETE FROM favorites WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );

    res.json({ message: "Product removed from favorites" });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res.status(500).json({ message: "Server error while removing favorite" });
  }
};

// Clear all favorites
export const clearFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query(`DELETE FROM favorites WHERE user_id = ?`, [userId]);

    res.json({ message: "All favorites cleared" });
  } catch (error) {
    console.error("Error clearing favorites:", error);
    res.status(500).json({ message: "Server error while clearing favorites" });
  }
};
