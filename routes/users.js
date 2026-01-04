const express = require("express");
const db = require("../db/db");
const { requireFields } = require("../middleware/validators");

const router = express.Router();

/**
 * POST /users
 * body: { username }
 * - 400 if missing username
 * - 409 if username already exists
 */
router.post("/", requireFields(["username"]), (req, res) => {
  const { username } = req.body;

  const sql = "INSERT INTO User (username) VALUES (?)";
  db.query(sql, [username], (err, result) => {
    if (err) {
      return res.status(409).json({ message: "Username already exists" });
    }

    res.status(201).json({
      user_id: result.insertId,
      username,
      points: 0
    });
  });
});

/**
 * GET /users
 */
router.get("/", (req, res) => {
  db.query("SELECT user_id, username, points FROM User", (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(results);
  });
});

/**
 * GET /users/:user_id
 * - 404 if user not found
 */
router.get("/:user_id", (req, res) => {
  const user_id = Number(req.params.user_id);

  db.query(
    "SELECT user_id, username, points FROM User WHERE user_id = ?",
    [user_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });

      if (results.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(results[0]);
    }
  );
});

/**
 * PUT /users/:user_id
 * body: { username, points }
 * - 404 if user not found
 * - 409 if username already exists
 */
router.put("/:user_id", (req, res) => {
  const user_id = Number(req.params.user_id);
  const { username, points } = req.body;

  // Minimal validation (brief shows updating username and points)
  if (username === undefined || points === undefined) {
    return res.status(400).json({ message: "Missing username or points" });
  }

  // First check user exists
  db.query("SELECT * FROM User WHERE user_id = ?", [user_id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    // Update user
    db.query(
      "UPDATE User SET username = ?, points = ? WHERE user_id = ?",
      [username, points, user_id],
      (err2) => {
        if (err2) {
          return res.status(409).json({ message: "Username already exists" });
        }

        res.json({ user_id, username, points });
      }
    );
  });
});

module.exports = router;
