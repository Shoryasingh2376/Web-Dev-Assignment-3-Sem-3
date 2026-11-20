import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
dotenv.config();
const app = express();
app.use(express.json());
app.use("/api/products", productRoutes);

app.get("/", (req, res) => {
  res.send("Product Inventory Management API is running");
});
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
  });
};
startServer();