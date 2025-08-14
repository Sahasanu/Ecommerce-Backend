import db from '../../config/db.js';
import cloudinary from '../../config/cloudinary.js';

//  Add a review
export const addReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user.id; // from auth middleware

    if (!productId || !rating) {
      return res.status(400).json({ message: 'Product ID and rating are required' });
    }

    let imageUrl = null;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'product_reviews',
      });
      imageUrl = result.secure_url;
    }

    await db.query(
      'INSERT INTO reviews (user_id, product_id, rating, comment, image_url) VALUES (?, ?, ?, ?, ?)',
      [userId, productId, rating, comment || null, imageUrl]
    );

    res.status(201).json({ message: 'Review added successfully' });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

//  Get reviews for a product
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const [reviews] = await db.query(
      `SELECT r.*, u.name AS user_name 
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE product_id = ?
       ORDER BY r.created_at DESC`,
      [productId]
    );
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

//  Update review
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    const [existing] = await db.query('SELECT * FROM reviews WHERE id = ? AND user_id = ?', [reviewId, userId]);
    if (!existing.length) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    let imageUrl = existing[0].image_url;
    if (req.file) {
      if (imageUrl) {
        const publicId = imageUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`product_reviews/${publicId}`);
      }
      const result = await cloudinary.uploader.upload(req.file.path, { folder: 'product_reviews' });
      imageUrl = result.secure_url;
    }

    await db.query(
      'UPDATE reviews SET rating = ?, comment = ?, image_url = ? WHERE id = ?',
      [rating || existing[0].rating, comment || existing[0].comment, imageUrl, reviewId]
    );

    res.json({ message: 'Review updated successfully' });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

//  Delete review (user or admin)
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const [review] = await db.query('SELECT * FROM reviews WHERE id = ?', [reviewId]);
    if (!review.length) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (req.user.role !== 'admin' && req.user.id !== review[0].user_id) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    if (review[0].image_url) {
      const publicId = review[0].image_url.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`product_reviews/${publicId}`);
    }

    await db.query('DELETE FROM reviews WHERE id = ?', [reviewId]);
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
