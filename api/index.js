import app from "../Backend/src/server.js";

// Vercel serverless function export
export default (req, res) => {
  return app(req, res);
};
