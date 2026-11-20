import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();

    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "SKU already exists" });
    }

    res.status(400).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const filter = {};

    if (req.query.category) {
      filter.category = {
        $regex: req.query.category,
        $options: "i"
      };
    }

    if (req.query.search) {
      filter.name = {
        $regex: req.query.search,
        $options: "i"
      };
    }
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};

      if (req.query.minPrice) {
        filter.price.$gte = Number(req.query.minPrice);
      }

      if (req.query.maxPrice) {
        filter.price.$lte = Number(req.query.maxPrice);
      }
    }

    const sort = {};

    if (req.query.sort) {
      sort[req.query.sort] = req.query.order === "asc" ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      total: total,
      page: page,
      totalPages: Math.ceil(total / limit),
      count: products.length,
      products: products
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/low-stock", async (req, res) => {
  try {
    const products = await Product.find({
      $expr: {
        $lte: ["$quantity", "$reorderLevel"]
      }
    });

    res.status(200).json({
      count: products.length,
      lowStockItems: products
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const result = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalStockValue: {
            $sum: { $multiply: ["$price", "$quantity"] }
          },
          avgPrice: { $avg: "$price" }
        }
      }
    ]);

    res.status(200).json({
      categories: result.length,
      summary: result
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/stock", async (req, res) => {
  try {
    const id = req.params.id;
    const change = Number(req.body.change);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    if (!Number.isFinite(change)) {
      return res.status(400).json({ message: "Enter a valid stock change" });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.quantity + change < 0) {
      return res.status(400).json({ message: "Stock cannot be negative" });
    }

    product.quantity = product.quantity + change;
    await product.save();

    res.status(200).json({
      message: "Stock updated",
      product: product
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "SKU already exists" });
    }

    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      message: "Product deleted",
      id: product._id
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;