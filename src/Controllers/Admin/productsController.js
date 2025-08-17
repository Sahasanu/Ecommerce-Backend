import db from "../../config/db.js";
import cloudinary from '../../config/cloudinery.js';

  export const createProduct = async (req, res) => {
    try {
      const { name, description, price, category, stock } = req.body;

      // Validate required fields
      if (!name || !description || price === undefined) {
        return res.status(400).json({ 
          message: 'Missing required fields',
          details: {
            name: !name ? 'Name is required' : undefined,
            description: !description ? 'Description is required' : undefined,
            price: price === undefined ? 'Price is required' : undefined
          }
        });
      }

      // Validate price is a positive number
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ 
          message: 'Price must be a positive number' 
        });
      }

      // Validate stock if provided
      let parsedStock = 0;
      if (stock !== undefined) {
        parsedStock = parseInt(stock);
        if (isNaN(parsedStock) || parsedStock < 0) {
          return res.status(400).json({ 
            message: 'Stock must be a non-negative integer' 
          });
        }
      }

      // Handle image upload if present
      let imageUrl = null;
      if (req.file) {
        try {
          // Upload to Cloudinary
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'ecommerce_uploads'
          });
          imageUrl = result.secure_url;
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          return res.status(500).json({ 
            message: 'Failed to upload product image' 
          });
        }
      }

      // Insert product
      const [result] = await db.query(
        'INSERT INTO products (name, description, price, category, stock, imageurl) VALUES (?, ?, ?, ?, ?, ?)',
        [
          name, 
          description, 
          parsedPrice, 
          category || null, 
          parsedStock,
          imageUrl
        ]
      );

      res.status(201).json({
        message: 'Product created successfully',
        product: {
          id: result.insertId,
          name,
          description,
          price: parsedPrice,
          category: category || null,
          stock: parsedStock,
          imageUrl
        }
      });

    } catch (error) {
      console.error('Error creating product:', error);
      
      // Cleanup uploaded image if DB operation failed
      if (req.file && req.file.path) {
        try {
          const publicId = req.file.path.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`ecommerce_uploads/${publicId}`);
        } catch (e) {
          console.error('Error cleaning up uploaded image:', e);
        }
      }
      
      res.status(500).json({ 
        message: 'Server error while creating product',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, stock } = req.body;
    console.log('Updating product ID:', id);

    // Fetch existing product
    const [existingRows] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const existingProduct = existingRows[0];
    let imageUrl = existingProduct.image_url;

    // Handle image update only if file is uploaded
    if (req.file) {
      // Remove old image from Cloudinary if it exists
      if (existingProduct.image_url) {
        const publicId = existingProduct.image_url.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`ecommerce_uploads/${publicId}`);
      }
      imageUrl = req.file.path; // This should be the Cloudinary URL
    }

    // Prepare the update query and parameters
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (price !== undefined) {
      updateFields.push('price = ?');
      updateValues.push(parseFloat(price));
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (stock !== undefined) {
      updateFields.push('stock = ?');
      updateValues.push(parseInt(stock));
    }
    if (req.file) {
      updateFields.push('image_url = ?');
      updateValues.push(imageUrl);
    }

    // Only proceed with update if there are fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateValues.push(id); // Add ID for WHERE clause

    // Build and execute the update query
    const updateQuery = `
      UPDATE products 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await db.query(updateQuery, updateValues);

    res.status(200).json({
      message: 'Product updated successfully',
      data: {
        id,
        name: name || existingProduct.name,
        description: description || existingProduct.description,
        price: price !== undefined ? parseFloat(price) : existingProduct.price,
        category: category || existingProduct.category,
        stock: stock !== undefined ? parseInt(stock) : existingProduct.stock,
        imageUrl
      }
    });

  } catch (error) {
    console.error('Error updating product:', error);
    
    // Cleanup new image if update failed
    if (req.file && req.file.path) {
      try {
        const publicId = req.file.path.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`ecommerce_uploads/${publicId}`);
      } catch (e) {
        console.error('Error cleaning up uploaded image:', e);
      }
    }
    
    res.status(500).json({ 
      message: 'Server error while updating product',
      error: error.message
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing product image URL
    const [product] = await db.query(
      'SELECT image_url FROM products WHERE id = ?', 
      [id]
    );

    if (product.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Delete Cloudinary image
    if (product[0].image_url) {
      try {
        const publicId = product[0].image_url.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`ecommerce_uploads/${publicId}`);
      } catch (e) {}
    }

    // Delete from DB
    await db.query("DELETE FROM products WHERE id = ?", [id]);

    res.status(200).json({ message: "Product deleted successfully" });

  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: "Failed to delete product" });
  }
};
