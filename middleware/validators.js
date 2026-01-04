// Simple validation middleware helpers
// Keep it basic so you can explain during interview/demo

function requireFields(fields) {
  return (req, res, next) => {
    for (let i = 0; i < fields.length; i++) {
      const key = fields[i];
      if (req.body[key] === undefined || req.body[key] === null || req.body[key] === "") {
        return res.status(400).json({ message: `Missing field: ${key}` });
      }
    }
    next();
  };
}

module.exports = { requireFields };
