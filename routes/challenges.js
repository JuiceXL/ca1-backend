const express = require("express");
const db = require("../db/db");
const { requireFields } = require("../middleware/validators");

const router = express.Router();

/**
 * POST /challenges
 * body: { user_id, description, points }
 * - 400 missing fields
 */
router.post("/", requireFields(["user_id", "description", "points"]), (req, res) => {
  const { user_id, description, points } = req.body;

  const sql =
    "INSERT INTO WellnessChallenge (creator_id, description, points) VALUES (?, ?, ?)";

  db.query(sql, [user_id, description, points], (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });

    res.status(201).json({
      challenge_id: result.insertId,
      creator_id: user_id,
      description,
      points
    });
  });
});

/**
 * GET /challenges
 */
router.get("/", (req, res) => {
  db.query(
    "SELECT challenge_id, creator_id, description, points FROM WellnessChallenge",
    (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json(results);
    }
  );
});

/**
 * PUT /challenges/:challenge_id
 * body: { user_id, description, points }
 * - 400 missing fields
 * - 404 if challenge not found
 * - 403 if user_id not owner
 */
router.put("/:challenge_id", requireFields(["user_id", "description", "points"]), (req, res) => {
  const challenge_id = Number(req.params.challenge_id);
  const { user_id, description, points } = req.body;

  db.query(
    "SELECT creator_id FROM WellnessChallenge WHERE challenge_id = ?",
    [challenge_id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (rows.length === 0) return res.status(404).json({ message: "Challenge not found" });

      const creator_id = rows[0].creator_id;
      if (Number(creator_id) !== Number(user_id)) {
        return res.status(403).json({ message: "Forbidden: not the owner" });
      }

      db.query(
        "UPDATE WellnessChallenge SET description = ?, points = ? WHERE challenge_id = ?",
        [description, points, challenge_id],
        (err2) => {
          if (err2) return res.status(500).json({ message: "Database error" });

          res.json({
            challenge_id,
            creator_id: user_id,
            description,
            points
          });
        }
      );
    }
  );
});

/**
 * DELETE /challenges/:challenge_id
 * - 404 if challenge not found
 * - also delete completions for that challenge
 */
router.delete("/:challenge_id", (req, res) => {
  const challenge_id = Number(req.params.challenge_id);

  db.query(
    "SELECT challenge_id FROM WellnessChallenge WHERE challenge_id = ?",
    [challenge_id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (rows.length === 0) return res.status(404).json({ message: "Challenge not found" });

      // Delete completions first (cascade behavior requested)
      db.query(
        "DELETE FROM UserCompletion WHERE challenge_id = ?",
        [challenge_id],
        (err2) => {
          if (err2) return res.status(500).json({ message: "Database error" });

          db.query(
            "DELETE FROM WellnessChallenge WHERE challenge_id = ?",
            [challenge_id],
            (err3) => {
              if (err3) return res.status(500).json({ message: "Database error" });
              res.status(204).send();
            }
          );
        }
      );
    }
  );
});

/**
 * POST /challenges/:challenge_id
 * create a completion record
 * body: { user_id, details }
 * - 404 if user or challenge not found
 * - award points to user (add challenge points)
 */
router.post("/:challenge_id", requireFields(["user_id", "details"]), (req, res) => {
  const challenge_id = Number(req.params.challenge_id);
  const { user_id, details } = req.body;

  // Check challenge exists + get points
  db.query(
    "SELECT points FROM WellnessChallenge WHERE challenge_id = ?",
    [challenge_id],
    (err, challengeRows) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (challengeRows.length === 0) return res.status(404).json({ message: "Challenge not found" });

      const challengePoints = Number(challengeRows[0].points);

      // Check user exists
      db.query(
        "SELECT points FROM User WHERE user_id = ?",
        [user_id],
        (err2, userRows) => {
          if (err2) return res.status(500).json({ message: "Database error" });
          if (userRows.length === 0) return res.status(404).json({ message: "User not found" });

          // Insert completion
          db.query(
            "INSERT INTO UserCompletion (challenge_id, user_id, details) VALUES (?, ?, ?)",
            [challenge_id, user_id, details],
            (err3, result) => {
              if (err3) return res.status(500).json({ message: "Database error" });

              // Award points
              db.query(
                "UPDATE User SET points = points + ? WHERE user_id = ?",
                [challengePoints, user_id],
                (err4) => {
                  if (err4) return res.status(500).json({ message: "Database error" });

                  res.status(201).json({
                    completion_id: result.insertId,
                    challenge_id,
                    user_id,
                    details
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

/**
 * GET /challenges/:challenge_id
 * list attempts (user_id + details)
 * - 404 if no attempts
 */
router.get("/:challenge_id", (req, res) => {
  const challenge_id = Number(req.params.challenge_id);

  db.query(
    "SELECT user_id, details FROM UserCompletion WHERE challenge_id = ?",
    [challenge_id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (rows.length === 0) return res.status(404).json({ message: "No attempts found" });
      res.json(rows);
    }
  );
});

module.exports = router;
