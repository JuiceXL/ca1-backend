const express = require("express");
const bodyParser = require("body-parser");

const userRoutes = require("./routes/users");
const challengeRoutes = require("./routes/challenges");

const app = express();
app.use(bodyParser.json());

// Routes
app.use("/users", userRoutes);
app.use("/challenges", challengeRoutes);

// Basic fallback for unknown routes (helps debugging)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
