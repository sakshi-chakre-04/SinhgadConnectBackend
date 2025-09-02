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

## 📋 API Endpoints

### 🔐 Authentication Routes

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

### Registration Form Validation
```javascript
const validateRegistration = (formData) => {
  const errors = {};
  
  // Name validation
  if (!formData.name || formData.name.trim().length === 0) {
    errors.name = 'Name is required';
  } else if (formData.name.length > 50) {
    errors.name = 'Name cannot exceed 50 characters';
  }
  
  // Email validation
  if (!formData.email) {
    errors.email = 'Email is required';
  } else if (!formData.email.endsWith('@sinhgad.edu')) {
    errors.email = 'Please use your @sinhgad.edu email address';
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

For any backend-related questions or issues, contact the backend developer.

**Next Features Coming Soon:**
- Posts API (Create, Read, Update, Delete)
- Comments API (Threaded comments)
- Department-based filtering
- Upvote/Downvote system