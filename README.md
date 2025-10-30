# SinhgadConnect Backend

## 🚀 Overview
A robust backend system for SinhgadConnect, a campus-exclusive social platform for SKNCOE students. This backend powers the core functionality including user authentication, posts, comments, and notifications.

## ✨ Features

### 🔐 Authentication
- Email-based registration with @sinhgad.edu validation
- JWT-based authentication
- Protected routes with role-based access

### 📝 Posts
- Create, read, update, and delete posts
- Department-based post filtering
- Upvote/downvote system
- Pagination and sorting

### 💬 Comments
- Threaded comments
- Nested replies
- Voting on comments
- Real-time notifications

### 🔔 Notifications
- Real-time updates
- Mark as read/unread
- Batch operations

## 🛠 Tech Stack

### Core
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM

### Authentication
- JWT (JSON Web Tokens)
- bcryptjs for password hashing
- Express Validator for input validation

### Security
- Helmet.js for HTTP headers
- Rate limiting
- CORS protection
- Data sanitization

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB instance
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/SinhgadConnectBackend.git
   cd SinhgadConnectBackend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=7d
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The server will start on `http://localhost:5000`

## 📚 API Documentation

Comprehensive API documentation is available in [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

Key endpoints:
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create a new post
- `GET /api/comments/post/:postId` - Get comments for a post

## 🏗 Project Structure

```
SinhgadConnectBackend/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── middleware/       # Custom middleware
├── models/           # Database models
├── routes/           # API routes
├── utils/            # Utility functions
├── .env              # Environment variables
├── server.js         # Application entry point
└── package.json      # Project dependencies
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- [Your Name] - Backend Developer
- [Frontend Developer 1]
- [Frontend Developer 2]

## 🙏 Acknowledgments

- Hat tip to anyone whose code was used
- Inspiration
- References