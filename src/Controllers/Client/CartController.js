import db from '../../config/db.js';

// Get cart for logged-in user
export const getCart = async (req, res) => {
  try {
    const [cart] = await db.query(
      'SELECT id FROM carts WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (!cart.length) {
      return res.json({ items: [] });
    }

    const [items] = await db.query(
      `SELECT ci.id, ci.product_id, p.name, ci.variant, ci.quantity, ci.price 
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cart[0].id]
    );

    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching cart' });
  }
};

// Add to cart
export const addToCart = async (req, res) => {
  try {
    const { product_id, variant, quantity } = req.body;
    if (!product_id || !quantity) {
      return res.status(400).json({ message: 'Product ID and quantity are required' });
    }

    // Get product price
    const [productRows] = await db.query(
      'SELECT price FROM products WHERE id = ?',
      [product_id]
    );
    if (!productRows.length) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const price = productRows[0].price;

    // Get or create cart
    let [cart] = await db.query('SELECT id FROM carts WHERE user_id = ?', [req.user.id]);
    let cartId;
    if (!cart.length) {
      const [result] = await db.query(
        'INSERT INTO carts (user_id) VALUES (?)',
        [req.user.id]
      );
      cartId = result.insertId;
    } else {
      cartId = cart[0].id;
    }

    // Check if item with same product & variant exists
    const [existing] = await db.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant = ?',
      [cartId, product_id, variant || null]
    );

    if (existing.length) {
      await db.query(
        'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
        [quantity, existing[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO cart_items (cart_id, product_id, variant, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [cartId, product_id, variant || null, quantity, price]
      );
    }

    res.json({ message: 'Item added to cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding to cart' });
  }
};

// Update quantity
export const updateQuantity = async (req, res) => {
  try {
    const { item_id, quantity } = req.body;
    if (!item_id || quantity < 1) {
      return res.status(400).json({ message: 'Valid item_id and quantity required' });
    }

    await db.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, item_id]);
    res.json({ message: 'Quantity updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating quantity' });
  }
};

// Remove from cart
export const removeFromCart = async (req, res) => {
  try {
    const { item_id } = req.params;
    await db.query('DELETE FROM cart_items WHERE id = ?', [item_id]);
    res.json({ message: 'Item removed from cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error removing item' });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const [cart] = await db.query(
      'SELECT id FROM carts WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );

    if (cart.length) {
      await db.query('DELETE FROM cart_items WHERE cart_id = ?', [cart[0].id]);
    }

    res.json({ message: 'Cart cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error clearing cart' });
  }
};
