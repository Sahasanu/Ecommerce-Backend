import db from '../../config/db.js'

/**
 * Create Order (User)
 * - Creates an order from the current user's cart
 * - Validates stock, inserts order & order_items in a transaction
 * - Decrements product stock
 * - Clears cart items
 */
export const createOrder = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  let conn;
  try {
    // 1) find cart
    const [cartRows] = await db.query("SELECT id FROM carts WHERE user_id = ? LIMIT 1", [userId]);
    if (!cartRows.length) return res.status(400).json({ message: "Cart is empty" });
    const cartId = cartRows[0].id;

    // 2) get cart items + current product stock/price
    const [items] = await db.query(
      `SELECT ci.id as cart_item_id, ci.product_id, ci.variant, ci.quantity, ci.price, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cartId]
    );

    if (!items.length) return res.status(400).json({ message: "Cart has no items" });

    // 3) validate stock
    for (const it of items) {
      if (it.stock < it.quantity) {
        return res.status(400).json({ message: `Insufficient stock for product ${it.product_id}` });
      }
    }

    // 4) compute total
    const total = items.reduce((s, it) => s + parseFloat(it.price) * it.quantity, 0);

    // 5) begin transaction
    conn = await db.getConnection();
    await conn.beginTransaction();

    // 6) insert order
    const [orderResult] = await conn.query(
      "INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)",
      [userId, total, "pending"]
    );
    const orderId = orderResult.insertId;

    // 7) insert order items (bulk)
    const orderItemsValues = items.map(it => [orderId, it.product_id, it.quantity, it.price]);
    if (orderItemsValues.length) {
      await conn.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?",
        [orderItemsValues]
      );
    }

    // 8) decrement stock for each product
    for (const it of items) {
      await conn.query(
        "UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ?",
        [it.quantity, it.product_id]
      );
    }

    // 9) clear cart items (and optionally the cart row)
    await conn.query("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);
    // optional: keep cart row in place. If you want to remove empty carts:
    // await conn.query("DELETE FROM carts WHERE id = ?", [cartId]);

    // 10) commit
    await conn.commit();
    res.status(201).json({ message: "Order placed successfully", orderId });
  } catch (error) {
    console.error("Error creating order:", error);
    if (conn) {
      try { await conn.rollback(); } catch (e) { /* ignore */ }
    }
    res.status(500).json({ message: "Server error while creating order" });
  } finally {
    if (conn) conn.release();
  }
};
/**
 * Get Orders for current user
 */
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const [orders] = await db.query(
      `SELECT id, total, status, created_at, updated_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(orders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get single order details (user)
 * - Users can see only their own orders
 */
export const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const currentUserId = req.user?.id;
    const currentRole = req.user?.role || "user"; // depends on your middleware

    // fetch order
    const [orderRows] = await db.query("SELECT * FROM orders WHERE id = ? LIMIT 1", [orderId]);
    if (!orderRows.length) return res.status(404).json({ message: "Order not found" });

    const order = orderRows[0];

    // permission check: if not admin, ensure order belongs to user
    if (currentRole !== "admin" && order.user_id !== currentUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // fetch items
    const [items] = await db.query(
      `SELECT oi.id, oi.product_id, p.name, p.imageUrl, oi.quantity, oi.price
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    res.json({ order, items });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Cancel Order (User) - only if order is still pending
 */

export const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user?.id;

    const [rows] = await db.query("SELECT id, status, user_id FROM orders WHERE id = ? LIMIT 1", [orderId]);
    if (!rows.length) return res.status(404).json({ message: "Order not found" });

    const order = rows[0];
    if (order.user_id !== userId) return res.status(403).json({ message: "Forbidden" });

    if (order.status !== "pending") {
      return res.status(400).json({ message: "Only pending orders can be cancelled" });
    }

    await db.query("UPDATE orders SET status = ? WHERE id = ?", ["cancelled", orderId]);

    // optional: restore stock for cancelled items (if needed)
    // you can implement stock restore here if that is desired

    res.json({ message: "Order cancelled" });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ message: "Server error" });
  }
};