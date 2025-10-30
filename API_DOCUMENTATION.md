# SinhgadConnect Backend API Documentation

## Base URL
```
http://localhost:5000
```

## Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## API Endpoints

### Authentication Routes

#### 1. Register User
**POST** `/api/auth/register`

**Description:** Register a new user with @sinhgad.edu email validation

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@sinhgad.edu",
  "password": "password123",
  "department": "Computer",
  "year": "TE"
}
```

**Validation Rules:**
- `name`: Required, max 50 characters
- `email`: Required, must end with @sinhgad.edu
- `password`: Required, minimum 6 characters
- `department`: Required, one of: Computer, IT, Mechanical, Civil, Electronics, Electrical
- `year`: Required, one of: FE, SE, TE, BE

**Success Response (201):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "68b18f23094c...",
    "name": "John Doe",
    "email": "john.doe@sinhgad.edu",
    "department": "Computer",
    "year": "TE"
  }
}
```

**Error Response (400):**
```json
{
  "message": "User already exists"
}
```

---

#### 2. Login User
**POST** `/api/auth/login`

**Description:** Login existing user and receive JWT token

**Request Body:**
```json
{
  "email": "john.doe@sinhgad.edu",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "68b18f23094c...",
    "name": "John Doe",
    "email": "john.doe@sinhgad.edu",
    "department": "Computer",
    "year": "TE"
  }
}
```

**Error Response (400):**
```json
{
  "message": "Invalid credentials"
}
```

---

#### 3. Get Current User
**GET** `/api/auth/me`

**Description:** Get current logged-in user information (Protected Route)

**Headers Required:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "68b18f23094c...",
    "name": "John Doe",
    "email": "john.doe@sinhgad.edu",
    "department": "Computer",
    "year": "TE"
  }
}
```

**Error Response (401):**
```json
{
  "message": "No token, authorization denied"
}
```

---

## User API

#### 1. Get Current User
**GET** `/api/auth/me`

**Description:** Get the currently authenticated user's profile

**Headers:**
- `Authorization: Bearer <token>` (required)

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john.doe@sinhgad.edu",
    "department": "Computer",
    "year": "TE",
    "bio": "I'm a computer science student",
    "createdAt": "2023-01-15T10:00:00.000Z"
  }
}
```

---

#### 2. Update User Profile
**PATCH** `/api/auth/me`

**Description:** Update the current user's profile

**Headers:**
- `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "name": "Updated Name",
  "department": "IT",
  "year": "BE",
  "bio": "Updated bio"
}
```

**Allowed Fields to Update:**
- `name` (string, max 50 characters)
- `department` (string, must be one of: Computer, IT, Mechanical, Civil, Electronics, Electrical)
- `year` (string, must be one of: FE, SE, TE, BE)
- `bio` (string, optional)

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "Updated Name",
    "email": "john.doe@sinhgad.edu",
    "department": "IT",
    "year": "BE",
    "bio": "Updated bio",
    "createdAt": "2023-01-15T10:00:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "message": "Invalid updates!"
}
```

---

### Posts API

#### 1. Get All Posts
**GET** `/api/posts`

**Description:** Get all posts with pagination and filtering

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `department` - Filter by department (optional)
- `sortBy` - Field to sort by: 'createdAt', 'upvotes', 'comments' (default: 'createdAt')
- `sortOrder` - Sort order: 'asc' or 'desc' (default: 'desc')

**Success Response (200):**
```json
{
  "success": true,
  "posts": [
    {
      "_id": "post_id",
      "title": "Post Title",
      "content": "Post content",
      "department": "Computer",
      "author": {
        "_id": "user_id",
        "name": "User Name",
        "department": "Computer",
        "year": "TE"
      },
      "upvoteCount": 5,
      "downvoteCount": 1,
      "netVotes": 4,
      "commentCount": 3,
      "createdAt": "2023-10-30T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalPosts": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

#### 2. Get Single Post
**GET** `/api/posts/:id`

**Description:** Get a single post by ID

**URL Parameters:**
- `id` - Post ID (required)

**Success Response (200):**
```json
{
  "success": true,
  "post": {
    "_id": "post_id",
    "title": "Post Title",
    "content": "Post content",
    "department": "Computer",
    "author": {
      "_id": "user_id",
      "name": "User Name",
      "department": "Computer",
      "year": "TE"
    },
    "upvoteCount": 5,
    "downvoteCount": 1,
    "netVotes": 4,
    "commentCount": 3,
    "createdAt": "2023-10-30T10:00:00.000Z"
  }
}
```

---

#### 3. Get Posts by Department
**GET** `/api/posts/department/:department`

**Description:** Get paginated and sorted posts by department

**URL Parameters:**
- `department` - Department name (e.g., 'Computer', 'IT')

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `sortBy` - Field to sort by: 'createdAt', 'upvotes', 'comments' (default: 'createdAt')
- `sortOrder` - Sort order: 'asc' or 'desc' (default: 'desc')

**Success Response (200):**
```json
{
  "success": true,
  "posts": [
    {
      "_id": "post_id",
      "title": "Post Title",
      "content": "Post content",
      "department": "Computer",
      "author": {
        "_id": "user_id",
        "name": "User Name",
        "department": "Computer",
        "year": "TE"
      },
      "upvoteCount": 5,
      "downvoteCount": 1,
      "netVotes": 4,
      "commentCount": 3,
      "createdAt": "2023-10-30T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalPosts": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### Notifications API

#### 1. Get Notifications
**GET** `/api/notifications`

**Description:** Get all notifications for the current user (most recent first)

**Headers:**
- `Authorization: Bearer <token>` (required)

**Query Parameters:**
- `limit` - Maximum number of notifications to return (default: 50)

**Success Response (200):**
```json
[
  {
    "_id": "notification_id",
    "type": "like",
    "sender": {
      "_id": "user_id",
      "name": "John Doe"
    },
    "post": {
      "_id": "post_id",
      "title": "Post Title"
    },
    "read": false,
    "createdAt": "2023-10-30T10:00:00.000Z"
  }
]
```

---

#### 2. Mark All Notifications as Read
**PUT** `/api/notifications/read-all`

**Description:** Mark all unread notifications as read for the current user

**Headers:**
- `Authorization: Bearer <token>` (required)

**Success Response (200):**
```json
{
  "message": "All notifications marked as read"
}
```

---

#### 3. Mark Notification as Read
**PUT** `/api/notifications/:id/read`

**Description:** Mark a specific notification as read

**Headers:**
- `Authorization: Bearer <token>` (required)

**URL Parameters:**
- `id` - Notification ID to mark as read

**Success Response (200):**
```json
{
  "_id": "notification_id",
  "read": true,
  "updatedAt": "2023-10-30T10:05:00.000Z"
}
```

**Error Response (404):**
```json
{
  "message": "Notification not found"
}
```

---

## 🛠️ Frontend Integration Examples

### React/JavaScript Examples

#### 1. User Registration
```javascript
const registerUser = async (userData) => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Usage
const userData = {
  name: "John Doe",
  email: "john.doe@sinhgad.edu",
  password: "password123",
  department: "Computer",
  year: "TE"
};

registerUser(userData);
```

#### 2. User Login
```javascript
const loginUser = async (email, password) => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
```

#### 3. Protected API Calls
```javascript
const getAuthenticatedUser = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch('http://localhost:5000/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Auth error:', error);
    // Redirect to login if token is invalid
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    throw error;
  }
};
```

#### 4. Axios Configuration (Alternative)
```javascript
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000',
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Usage
const register = (userData) => api.post('/api/auth/register', userData);
const login = (credentials) => api.post('/api/auth/login', credentials);
const getCurrentUser = () => api.get('/api/auth/me');
```

---

## 📝 Form Validation (Frontend)

---

## 📚 Complete API Reference

### 👤 User API

#### 1. Get Current User (Protected)
**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john.doe@sinhgad.edu",
    "department": "Computer",
    "year": "TE"
  }
}
```

---

### 📝 Posts API

### 📝 Posts API

#### 1. Get Posts by Department
**GET** `/api/posts/department/:department`

**Description:** Get paginated and sorted posts by department

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `sortBy` - Field to sort by: 'createdAt', 'upvotes', 'comments' (default: 'createdAt')
- `sortOrder` - Sort order: 'asc' or 'desc' (default: 'desc')

**Success Response (200):**
```json
{
  "posts": [
    {
      "_id": "post_id",
      "title": "Post Title",
      "content": "Post content...",
      "author": {
        "_id": "user_id",
        "name": "User Name",
        "department": "Computer",
        "year": "TE"
      },
      "department": "Computer",
      "upvotes": ["user_id1", "user_id2"],
      "downvotes": [],
      "commentCount": 5,
      "createdAt": "2023-10-30T10:00:00.000Z",
      "updatedAt": "2023-10-30T10:00:00.000Z"
    }
  ],
  "totalPosts": 1,
  "totalPages": 1,
  "currentPage": 1
}
```

#### 2. Get Single Post
**GET** `/api/posts/:id`

**Description:** Get a single post by ID

**Success Response (200):**
```json
{
  "_id": "post_id",
  "title": "Post Title",
  "content": "Post content...",
  "author": {
    "_id": "user_id",
    "name": "User Name",
    "department": "Computer",
    "year": "TE"
  },
  "department": "Computer",
  "upvotes": ["user_id1", "user_id2"],
  "downvotes": [],
  "commentCount": 5,
  "createdAt": "2023-10-30T10:00:00.000Z",
  "updatedAt": "2023-10-30T10:00:00.000Z"
}
```

#### 3. Create Post (Protected)
**POST** `/api/posts`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Post Title",
  "content": "Post content...",
  "department": "Computer"
}
```

**Success Response (201):**
```json
{
  "_id": "new_post_id",
  "title": "Post Title",
  "content": "Post content...",
  "author": "user_id",
  "department": "Computer",
  "upvotes": [],
  "downvotes": [],
  "commentCount": 0,
  "createdAt": "2023-10-30T10:00:00.000Z",
  "updatedAt": "2023-10-30T10:00:00.000Z"
}
```

#### 4. Update Post (Protected) (Not yet used in frontend )
**PUT** `/api/posts/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "content": "Updated content..."
}
```

**Success Response (200):**
```json
{
  "_id": "post_id",
  "title": "Updated Title",
  "content": "Updated content...",
  "updatedAt": "2023-10-30T10:05:00.000Z"
}
```

#### 5. Delete Post (Protected) (Not yet used in frontend )
**DELETE** `/api/posts/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
{
  "message": "Post deleted successfully"
}
```

#### 6. Get User's Vote Status for Post (Protected)
**GET** `/api/posts/:id/vote-status`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
{
  "hasVoted": true,
  "voteType": "upvote" // or "downvote" if downvoted, null if no vote
}
```

#### 7. Vote on Post (Protected)
**POST** `/api/posts/:id/vote`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "voteType": "upvote" // or "downvote" or "remove"
}
```

**Success Response (200):**
```json
{
  "message": "Vote updated",
  "upvotes": ["user_id1", "user_id2"],
  "downvotes": []
}
```

### 💬 Comments API

#### 0. Get Single Comment
**GET** `/api/comments/:id`

**Description:** Get a single comment by ID

**Success Response (200):**
```json
{
  "_id": "comment_id",
  "content": "Comment content...",
  "author": {
    "_id": "user_id",
    "name": "User Name",
    "department": "Computer",
    "year": "TE"
  },
  "post": "post_id",
  "parentComment": null,
  "upvotes": ["user_id1"],
  "downvotes": [],
  "createdAt": "2023-10-30T10:15:00.000Z"
}
```

#### 1. Get User's Vote Status for Comment (Protected)
**GET** `/api/comments/:id/vote-status`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
{
  "hasVoted": true,
  "voteType": "upvote" // or "downvote" if downvoted, null if no vote
}
```

#### 2. Get Comments for Post

#### 2. Get Comments for Post
**GET** `/api/comments/post/:postId`

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `sortBy` - Field to sort by: 'createdAt', 'upvotes' (default: 'createdAt')(not yet used in frontend)
- `sortOrder` - Sort order: 'asc' or 'desc' (default: 'desc')(not yet used in frontend)

**Success Response (200):**
```json
{
  "comments": [
    {
      "_id": "comment_id",
      "content": "Comment content...",
      "author": {
        "_id": "user_id",
        "name": "User Name",
        "department": "Computer",
        "year": "TE"
      },
      "post": "post_id",
      "parentComment": null,(no multilevel comments yet implemented)
      "upvotes": ["user_id1"],
      "downvotes": [],
      "upvoteCount": 1,
      "downvoteCount": 0,
      "netVotes": 1,
      "createdAt": "2023-10-30T10:15:00.000Z"
    }
  ],
  "totalComments": 1,
  "totalPages": 1,
  "currentPage": 1
}
```

#### 3. Create Comment (Protected)
**POST** `/api/comments`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Comment content...",
  "postId": "post_id",
  "parentCommentId": null // or "parent_comment_id" for replies
}
```

**Success Response (201):**
```json
{
  "_id": "new_comment_id",
  "content": "Comment content...",
  "author": "user_id",
  "post": "post_id",
  "parentComment": null,
  "upvotes": [],
  "downvotes": [],
  "createdAt": "2023-10-30T10:15:00.000Z"
}
```

#### 4. Update Comment (Protected)(Not yet used in frontend)
**PUT** `/api/comments/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Updated comment content..."
}
```

**Success Response (200):**
```json
{
  "_id": "comment_id",
  "content": "Updated comment content...",
  "updatedAt": "2023-10-30T10:20:00.000Z"
}
```

#### 5. Delete Comment (Protected)(Not yet used in frontend)
**DELETE** `/api/comments/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
{
  "message": "Comment deleted successfully"
}
```

#### 6. Vote on Comment (Protected)
**POST** `/api/comments/:id/vote`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "voteType": "upvote" // or "downvote" or "remove"
}
```

**Success Response (200):**
```json
{
  "message": "Vote updated",
  "upvotes": ["user_id1"],
  "downvotes": []
}
```

### 🔔 Notifications API

#### 1. Get Notifications (Protected)
**GET** `/api/notifications`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
[
  {
    "_id": "notification_id",
    "type": "comment", // or 'reply', 'upvote', 'downvote'
    "sender": {
      "_id": "user_id",
      "name": "User Name"
    },
    "post": {
      "_id": "post_id",
      "title": "Post Title"
    },
    "read": false,
    "createdAt": "2023-10-30T10:25:00.000Z"
  }
]
```

#### 2. Mark All Notifications as Read (Protected)
**PUT** `/api/notifications/read-all`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
{
  "message": "All notifications marked as read"
}
```

#### 3. Mark Notification as Read (Protected)
**PUT** `/api/notifications/:id/read`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
{
  "_id": "notification_id",
  "read": true
}
```

### 🔍 Search API

#### 1. Search Posts
**GET** `/api/search`

**Query Parameters:**
- `q` - Search query (required)
- `department` - Filter by department
- `sortBy` - 'relevance', 'newest', 'votes' (default: 'relevance')
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Success Response (200):**
```json
{
  "results": [
    {
      "_id": "post_id",
      "title": "Post Title",
      "content": "Matching content...",
      "author": {
        "_id": "user_id",
        "name": "User Name"
      },
      "department": "Computer",
      "upvoteCount": 5,
      "commentCount": 3,
      "createdAt": "2023-10-30T10:00:00.000Z"
    }
  ],
  "totalResults": 1,
  "totalPages": 1,
  "currentPage": 1
}
```

### Registration Form with React Hook Form
```jsx
import { useForm } from 'react-hook-form';

const RegisterForm = () => {
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      department: '',
      year: ''
    }
  });
}
  const departments = ['Computer', 'IT', 'Mechanical', 'Civil', 'Electronics', 'Electrical'];
  const years = ['FE', 'SE', 'TE', 'BE'];

  const onSubmit = async (data) => {
    try {
      // Handle form submission
      console.log('Form data:', data);
    } catch (error) {
      console.error('Submission error:', error);
    }
  
  // Password validation
  if (!formData.password) {
    errors.password = 'Password is required';
  } else if (formData.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }
  
  // Department validation
  const validDepartments = ['Computer', 'IT', 'Mechanical', 'Civil', 'Electronics', 'Electrical'];
  if (!formData.department || !validDepartments.includes(formData.department)) {
    errors.department = 'Please select a valid department';
  }
  
  // Year validation
  const validYears = ['FE', 'SE', 'TE', 'BE'];
  if (!formData.year || !validYears.includes(formData.year)) {
    errors.year = 'Please select a valid year';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
```

---

## 🔒 Security Features

- **Password Hashing:** All passwords are hashed using bcrypt
- **JWT Tokens:** Secure token-based authentication
- **Rate Limiting:** 100 requests per 15 minutes per IP
- **CORS:** Cross-origin requests enabled
- **Helmet:** Security headers added
- **Email Validation:** Only @sinhgad.edu emails allowed

---

## 🚀 Getting Started for Frontend Team

1. **Start the backend server:**
   ```bash
   cd SinhgadConnectBackend
   node server.js
   ```

2. **Test connection:**
   ```bash
   curl http://localhost:5000
   ```

3. **Use the API endpoints** as documented above

4. **Handle errors gracefully** - All endpoints return consistent error messages

5. **Store JWT tokens securely** - Use localStorage or secure cookies

---

## 📞 Contact

For any backend-related questions or issues, dont contact me study yourself.

**Next Features Coming Soon:**
- Posts API (Create, Read, Update, Delete)
- Comments API (Threaded comments)
- Department-based filtering
- Upvote/Downvote system
