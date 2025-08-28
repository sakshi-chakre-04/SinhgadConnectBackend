// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// A simple test route to make sure server is running
app.get('/', (req, res) => {
  res.send('Sinhgad Connect Backend is running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});