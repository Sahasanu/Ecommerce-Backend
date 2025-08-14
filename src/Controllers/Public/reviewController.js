import db from '../../config/db.js';

// 📌 Get all reviews for a product (public)
export const getProductReviewsPublic = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const [reviews] = await db.query(
      `SELECT r.id, r.rating, r.comment, r.image_url, r.created_at, 
              u.name AS user_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`,
      [productId]
    );

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching public reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 📌 Get a single review by ID (public)
export const getSingleReviewPublic = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const [review] = await db.query(
      `SELECT r.id, r.rating, r.comment, r.image_url, r.created_at, 
              u.name AS user_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [reviewId]
    );

    if (!review.length) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json(review[0]);
  } catch (error) {
    console.error('Error fetching single public review:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
