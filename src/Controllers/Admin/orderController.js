import db from "../../config/db.js";

/**
 * Get single order details (user or admin)
 * - Users can see only their own orders
 * - Admins can see any order
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
 * Admin: Get all orders (with user info)
 */
export const getAllOrders = async (req, res) => {
  try {
    // Optional: paginate with LIMIT/OFFSET
    const [orders] = await db.query(
      `SELECT o.id, o.user_id, u.name as user_name, u.email, o.total, o.status, o.created_at, o.updated_at
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );
    res.json(orders);
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Admin: Update order status (and optionally tracking number)
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, tracking_number } = req.body;

    const allowedStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    await db.query(
      "UPDATE orders SET status = ?, tracking_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, tracking_number || null, orderId]
    );

    res.json({ message: "Order status updated" });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

