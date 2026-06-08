import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

import testsRouter from "./routes/tests.routes";

app.use("/api/tests", testsRouter);

app.get("/", (req, res) => {
  res.json({ message: "Hello from Express in Turborepo!" });
});

app.listen(port, () => {
  console.log(`API Server is running on port ${port}`);
});
