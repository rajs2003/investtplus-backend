# Authentication API Testing Guide

## Overview
This document provides comprehensive testing scenarios for all authentication endpoints in the InvesttPlus Backend API. The authentication module handles user registration, login, logout, token management, password reset, and role verification.

## Base URL
```
http://localhost:3000/v1/auth
```

## Authentication Flow
1. **Register** → User creation with credentials
2. **Login** → Receive access & refresh tokens
3. **Access Protected Routes** → Use access token
4. **Token Expired** → Refresh tokens
5. **Logout** → Invalidate refresh token

---

## API Endpoints Summary

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/register` | POST | No | Register new user |
| `/login` | POST | No | User login |
| `/logout` | POST | No | User logout |
| `/refresh-tokens` | POST | No | Refresh authentication tokens |
| `/forgot-password` | POST | No | Request password reset email |
| `/reset-password` | POST | No | Reset password with token |
| `/verify-role` | GET | Yes | Verify user role and permissions |

---

## 1. User Registration

### Endpoint
```
POST /v1/auth/register
```

### Request Body
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "Password@123",
  "ldap": "john123",
  "role": "user",
  "phoneNumber": "9876543210"
}
```

### Field Validations
- **name**: Required, string
- **email**: Required, valid email format, must be unique
- **password**: Required, minimum 8 characters, at least one number and one letter
- **ldap**: Required, must be unique
- **role**: Required, enum: ['user', 'operator', 'superadmin', 'driver']
- **phoneNumber**: Required, must be unique, valid phone number

### Success Response (201)
```json
{
  "user": {
    "id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "ldap": "john123",
    "role": "user",
    "phoneNumber": "9876543210",
    "isEmailVerified": false
  },
  "tokens": {
    "access": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires": "2024-01-15T10:30:00.000Z"
    },
    "refresh": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires": "2024-02-14T10:00:00.000Z"
    }
  }
}
```

### Error Responses
```json
// 400 - Duplicate Email
{
  "code": 400,
  "message": "Email already taken"
}

// 400 - Duplicate Phone Number
{
  "code": 400,
  "message": "Phone number already taken"
}

// 400 - Validation Error
{
  "code": 400,
  "message": "\"password\" length must be at least 8 characters long"
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "Password@123",
    "ldap": "john123",
    "role": "user",
    "phoneNumber": "9876543210"
  }'
```

---

## 2. User Login

### Endpoint
```
POST /v1/auth/login
```

### Request Body
```json
{
  "phoneNumber": "9876543210",
  "password": "Password@123"
}
```

### Field Validations
- **phoneNumber**: Required, valid phone number
- **password**: Required, string

### Success Response (200)
```json
{
  "user": {
    "id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "ldap": "john123",
    "role": "user",
    "phoneNumber": "9876543210",
    "isEmailVerified": false
  },
  "tokens": {
    "access": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires": "2024-01-15T10:30:00.000Z"
    },
    "refresh": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires": "2024-02-14T10:00:00.000Z"
    }
  }
}
```

### Error Responses
```json
// 401 - Invalid Credentials
{
  "code": 401,
  "message": "Incorrect phoneNumber or password"
}

// 400 - Validation Error
{
  "code": 400,
  "message": "\"phoneNumber\" is required"
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "password": "Password@123"
  }'
```

---

## 3. User Logout

### Endpoint
```
POST /v1/auth/logout
```

### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Field Validations
- **refreshToken**: Required, valid JWT token

### Success Response (204)
```
No Content
```

### Error Responses
```json
// 404 - Token Not Found
{
  "code": 404,
  "message": "Not found"
}

// 400 - Validation Error
{
  "code": 400,
  "message": "\"refreshToken\" is required"
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

## 4. Refresh Authentication Tokens

### Endpoint
```
POST /v1/auth/refresh-tokens
```

### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Field Validations
- **refreshToken**: Required, valid JWT token

### Success Response (200)
```json
{
  "access": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires": "2024-01-15T11:30:00.000Z"
  },
  "refresh": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires": "2024-02-14T11:00:00.000Z"
  }
}
```

### Error Responses
```json
// 401 - Invalid Token
{
  "code": 401,
  "message": "Please authenticate"
}

// 401 - Token Expired
{
  "code": 401,
  "message": "Please authenticate"
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/v1/auth/refresh-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

## 5. Forgot Password

### Endpoint
```
POST /v1/auth/forgot-password
```

### Request Body
```json
{
  "email": "john.doe@example.com"
}
```

### Field Validations
- **email**: Required, valid email format

### Success Response (204)
```
No Content
```
*Note: A password reset email will be sent to the user*

### Error Responses
```json
// 404 - User Not Found
{
  "code": 404,
  "message": "No users found with this email"
}

// 400 - Validation Error
{
  "code": 400,
  "message": "\"email\" must be a valid email"
}
```

### cURL Command
```bash
curl -X POST http://localhost:3000/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com"
  }'
```

---

## 6. Reset Password

### Endpoint
```
POST /v1/auth/reset-password?token={resetToken}
```

### Query Parameters
- **token**: Required, password reset token (sent via email)

### Request Body
```json
{
  "password": "NewPassword@456"
}
```

### Field Validations
- **password**: Required, minimum 8 characters, at least one number and one letter

### Success Response (204)
```
No Content
```

### Error Responses
```json
// 401 - Invalid or Expired Token
{
  "code": 401,
  "message": "Password reset failed"
}

// 400 - Validation Error
{
  "code": 400,
  "message": "\"password\" length must be at least 8 characters long"
}
```

### cURL Command
```bash
curl -X POST "http://localhost:3000/v1/auth/reset-password?token=abc123xyz456" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewPassword@456"
  }'
```

---

## 7. Verify User Role

### Endpoint
```
GET /v1/auth/verify-role
```

### Headers
```
Authorization: Bearer {accessToken}
```

### Success Response (200)
```json
{
  "user": {
    "id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "user",
    "phoneNumber": "9876543210"
  },
  "message": "Role verified successfully"
}
```

### Error Responses
```json
// 401 - Unauthorized
{
  "code": 401,
  "message": "Please authenticate"
}

// 403 - Forbidden
{
  "code": 403,
  "message": "Forbidden"
}
```

### cURL Command
```bash
curl -X GET http://localhost:3000/v1/auth/verify-role \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Test Cases

### TC-AUTH-01: Successful User Registration
**Objective**: Verify user can register with valid credentials  
**Pre-conditions**: User details not already in database  
**Steps**:
1. Send POST request to `/register` with valid user data
2. Verify response status is 201
3. Verify response contains user object and tokens
4. Verify user ID is generated
5. Verify access and refresh tokens are present

**Expected Result**: User created successfully with tokens returned

---

### TC-AUTH-02: Registration with Duplicate Email
**Objective**: Verify system prevents duplicate email registration  
**Pre-conditions**: Email already exists in database  
**Steps**:
1. Send POST request with existing email
2. Verify response status is 400
3. Verify error message indicates duplicate email

**Expected Result**: Registration rejected with appropriate error

---

### TC-AUTH-03: Registration with Duplicate Phone Number
**Objective**: Verify system prevents duplicate phone registration  
**Pre-conditions**: Phone number already exists in database  
**Steps**:
1. Send POST request with existing phone number
2. Verify response status is 400
3. Verify error message indicates duplicate phone

**Expected Result**: Registration rejected with appropriate error

---

### TC-AUTH-04: Registration with Invalid Email Format
**Objective**: Verify email validation  
**Steps**:
1. Send POST request with invalid email (e.g., "notanemail")
2. Verify response status is 400
3. Verify validation error for email field

**Expected Result**: Registration rejected with validation error

---

### TC-AUTH-05: Registration with Weak Password
**Objective**: Verify password strength validation  
**Steps**:
1. Send POST request with password < 8 characters or without number/letter
2. Verify response status is 400
3. Verify password validation error

**Expected Result**: Registration rejected with password requirements error

---

### TC-AUTH-06: Registration with Invalid Role
**Objective**: Verify role validation  
**Steps**:
1. Send POST request with invalid role (e.g., "admin123")
2. Verify response status is 400
3. Verify role validation error

**Expected Result**: Registration rejected with valid role options

---

### TC-AUTH-07: Registration with Missing Required Fields
**Objective**: Verify all required fields are validated  
**Steps**:
1. Send POST request with missing fields (name, email, password, etc.)
2. Verify response status is 400
3. Verify error lists all missing required fields

**Expected Result**: Registration rejected with missing field errors

---

### TC-AUTH-08: Successful User Login
**Objective**: Verify user can login with valid credentials  
**Pre-conditions**: User exists in database  
**Steps**:
1. Send POST request to `/login` with valid phone and password
2. Verify response status is 200
3. Verify response contains user object and tokens
4. Verify tokens have expiration dates

**Expected Result**: Login successful with user data and tokens

---

### TC-AUTH-09: Login with Invalid Phone Number
**Objective**: Verify login fails with non-existent phone  
**Steps**:
1. Send POST request with phone number not in database
2. Verify response status is 401
3. Verify error message for invalid credentials

**Expected Result**: Login rejected with authentication error

---

### TC-AUTH-10: Login with Incorrect Password
**Objective**: Verify login fails with wrong password  
**Pre-conditions**: User exists in database  
**Steps**:
1. Send POST request with correct phone but wrong password
2. Verify response status is 401
3. Verify error message for invalid credentials

**Expected Result**: Login rejected with authentication error

---

### TC-AUTH-11: Login with Missing Credentials
**Objective**: Verify required field validation on login  
**Steps**:
1. Send POST request without phoneNumber or password
2. Verify response status is 400
3. Verify validation error

**Expected Result**: Login rejected with validation error

---

### TC-AUTH-12: Successful Token Refresh
**Objective**: Verify tokens can be refreshed with valid refresh token  
**Pre-conditions**: User is logged in with valid refresh token  
**Steps**:
1. Send POST request to `/refresh-tokens` with refresh token
2. Verify response status is 200
3. Verify new access and refresh tokens are returned
4. Verify old tokens are different from new tokens

**Expected Result**: New tokens generated successfully

---

### TC-AUTH-13: Token Refresh with Invalid Token
**Objective**: Verify refresh fails with invalid token  
**Steps**:
1. Send POST request with invalid/expired refresh token
2. Verify response status is 401
3. Verify authentication error

**Expected Result**: Refresh rejected with unauthorized error

---

### TC-AUTH-14: Token Refresh with Missing Token
**Objective**: Verify refresh token is required  
**Steps**:
1. Send POST request without refreshToken
2. Verify response status is 400
3. Verify validation error

**Expected Result**: Refresh rejected with validation error

---

### TC-AUTH-15: Successful Logout
**Objective**: Verify user can logout  
**Pre-conditions**: User is logged in with valid refresh token  
**Steps**:
1. Send POST request to `/logout` with refresh token
2. Verify response status is 204
3. Verify no content returned
4. Attempt to use refresh token again - should fail

**Expected Result**: Logout successful, token invalidated

---

### TC-AUTH-16: Logout with Invalid Token
**Objective**: Verify logout handles invalid tokens  
**Steps**:
1. Send POST request with invalid refresh token
2. Verify response status is 404
3. Verify error message

**Expected Result**: Logout rejected with not found error

---

### TC-AUTH-17: Successful Forgot Password Request
**Objective**: Verify password reset email can be requested  
**Pre-conditions**: User email exists in database  
**Steps**:
1. Send POST request to `/forgot-password` with valid email
2. Verify response status is 204
3. Verify reset email is sent (check email or logs)

**Expected Result**: Password reset email sent successfully

---

### TC-AUTH-18: Forgot Password with Non-existent Email
**Objective**: Verify forgot password handles unknown email  
**Steps**:
1. Send POST request with email not in database
2. Verify response status is 404
3. Verify error message

**Expected Result**: Request rejected with not found error

---

### TC-AUTH-19: Forgot Password with Invalid Email Format
**Objective**: Verify email validation on forgot password  
**Steps**:
1. Send POST request with invalid email format
2. Verify response status is 400
3. Verify validation error

**Expected Result**: Request rejected with validation error

---

### TC-AUTH-20: Successful Password Reset
**Objective**: Verify password can be reset with valid token  
**Pre-conditions**: Reset token generated via forgot password  
**Steps**:
1. Send POST request to `/reset-password` with token and new password
2. Verify response status is 204
3. Login with new password
4. Verify login successful

**Expected Result**: Password reset successfully, can login with new password

---

### TC-AUTH-21: Password Reset with Invalid Token
**Objective**: Verify reset fails with invalid/expired token  
**Steps**:
1. Send POST request with invalid reset token
2. Verify response status is 401
3. Verify error message

**Expected Result**: Reset rejected with unauthorized error

---

### TC-AUTH-22: Password Reset with Weak Password
**Objective**: Verify password strength validation on reset  
**Steps**:
1. Send POST request with weak password
2. Verify response status is 400
3. Verify password validation error

**Expected Result**: Reset rejected with password requirements error

---

### TC-AUTH-23: Password Reset with Missing Password
**Objective**: Verify password is required for reset  
**Steps**:
1. Send POST request without password field
2. Verify response status is 400
3. Verify validation error

**Expected Result**: Reset rejected with validation error

---

### TC-AUTH-24: Successful Role Verification
**Objective**: Verify authenticated user can verify their role  
**Pre-conditions**: User is logged in with valid access token  
**Steps**:
1. Send GET request to `/verify-role` with Bearer token
2. Verify response status is 200
3. Verify user details and role returned

**Expected Result**: Role verified successfully with user data

---

### TC-AUTH-25: Role Verification without Authentication
**Objective**: Verify role verification requires authentication  
**Steps**:
1. Send GET request without Authorization header
2. Verify response status is 401
3. Verify authentication error

**Expected Result**: Request rejected with unauthorized error

---

### TC-AUTH-26: Role Verification with Invalid Token
**Objective**: Verify role verification validates token  
**Steps**:
1. Send GET request with invalid/expired access token
2. Verify response status is 401
3. Verify authentication error

**Expected Result**: Request rejected with unauthorized error

---

### TC-AUTH-27: Access Token Expiration
**Objective**: Verify access token expires after designated time  
**Pre-conditions**: User logged in with access token  
**Steps**:
1. Wait for access token to expire
2. Attempt to access protected route
3. Verify response status is 401
4. Refresh tokens using refresh token
5. Access protected route with new access token

**Expected Result**: Expired token rejected, new token works

---

### TC-AUTH-28: Refresh Token Expiration
**Objective**: Verify refresh token expires after designated time  
**Pre-conditions**: User logged in with refresh token  
**Steps**:
1. Wait for refresh token to expire (30 days)
2. Attempt to refresh tokens
3. Verify response status is 401
4. Verify user must login again

**Expected Result**: Expired refresh token rejected, re-login required

---

### TC-AUTH-29: Multiple Device Login
**Objective**: Verify user can login from multiple devices  
**Steps**:
1. Login from device 1, save tokens
2. Login from device 2, save tokens
3. Use both access tokens to access protected routes
4. Verify both work independently

**Expected Result**: User can be logged in on multiple devices

---

### TC-AUTH-30: Complete Authentication Flow
**Objective**: Verify complete user authentication lifecycle  
**Steps**:
1. Register new user
2. Login with credentials
3. Access protected route with access token
4. Wait for access token to expire
5. Refresh tokens
6. Access protected route with new token
7. Logout
8. Verify tokens no longer work

**Expected Result**: All steps succeed, complete flow works correctly

---

## Complete Workflow Test Scenario

### Scenario: New User Registration to First API Call

```bash
# Step 1: Register new user
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test.user@example.com",
    "password": "TestPass@123",
    "ldap": "test456",
    "role": "user",
    "phoneNumber": "9988776655"
  }'

# Response: Save both tokens
# ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# REFRESH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Step 2: Verify role with access token
curl -X GET http://localhost:3000/v1/auth/verify-role \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Step 3: Wait for access token to expire or simulate expiry

# Step 4: Refresh tokens
curl -X POST http://localhost:3000/v1/auth/refresh-tokens \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"${REFRESH_TOKEN}\"
  }"

# Response: Save new tokens
# NEW_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# NEW_REFRESH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Step 5: Access protected route with new token
curl -X GET http://localhost:3000/v1/auth/verify-role \
  -H "Authorization: Bearer ${NEW_ACCESS_TOKEN}"

# Step 6: Logout
curl -X POST http://localhost:3000/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"${NEW_REFRESH_TOKEN}\"
  }"

# Step 7: Verify token no longer works
curl -X GET http://localhost:3000/v1/auth/verify-role \
  -H "Authorization: Bearer ${NEW_ACCESS_TOKEN}"
# Should return 401 Unauthorized
```

### Scenario: Password Reset Flow

```bash
# Step 1: Request password reset
curl -X POST http://localhost:3000/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.user@example.com"
  }'

# Step 2: Check email for reset token (or retrieve from logs/database)
# RESET_TOKEN=abc123xyz456

# Step 3: Reset password with token
curl -X POST "http://localhost:3000/v1/auth/reset-password?token=${RESET_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewSecurePass@789"
  }'

# Step 4: Login with new password
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9988776655",
    "password": "NewSecurePass@789"
  }'

# Should return success with new tokens
```

---

## Test Data Examples

### Valid User Data
```json
{
  "name": "Alice Johnson",
  "email": "alice.j@example.com",
  "password": "Alice@2024",
  "ldap": "alice001",
  "role": "user",
  "phoneNumber": "9123456789"
}
```

### Different Role Examples
```json
// User role
{"role": "user"}

// Operator role
{"role": "operator"}

// Superadmin role
{"role": "superadmin"}

// Driver role
{"role": "driver"}
```

### Invalid Data Examples
```json
// Weak password
{"password": "12345"}

// Invalid email
{"email": "notanemail"}

// Invalid phone
{"phoneNumber": "abc"}

// Missing fields
{"name": "John"} // Missing required fields
```

---

## Test Execution Checklist

### Environment Setup
- [ ] Backend server running on http://localhost:3000
- [ ] MongoDB connected
- [ ] Redis connected
- [ ] Email service configured (for forgot password)
- [ ] Test database cleaned

### Registration Tests
- [ ] TC-AUTH-01: Successful registration
- [ ] TC-AUTH-02: Duplicate email
- [ ] TC-AUTH-03: Duplicate phone
- [ ] TC-AUTH-04: Invalid email format
- [ ] TC-AUTH-05: Weak password
- [ ] TC-AUTH-06: Invalid role
- [ ] TC-AUTH-07: Missing required fields

### Login Tests
- [ ] TC-AUTH-08: Successful login
- [ ] TC-AUTH-09: Invalid phone
- [ ] TC-AUTH-10: Incorrect password
- [ ] TC-AUTH-11: Missing credentials

### Token Management Tests
- [ ] TC-AUTH-12: Successful token refresh
- [ ] TC-AUTH-13: Invalid refresh token
- [ ] TC-AUTH-14: Missing refresh token
- [ ] TC-AUTH-27: Access token expiration
- [ ] TC-AUTH-28: Refresh token expiration

### Logout Tests
- [ ] TC-AUTH-15: Successful logout
- [ ] TC-AUTH-16: Invalid token logout

### Password Management Tests
- [ ] TC-AUTH-17: Forgot password request
- [ ] TC-AUTH-18: Non-existent email
- [ ] TC-AUTH-19: Invalid email format
- [ ] TC-AUTH-20: Successful reset
- [ ] TC-AUTH-21: Invalid reset token
- [ ] TC-AUTH-22: Weak password on reset
- [ ] TC-AUTH-23: Missing password on reset

### Role Verification Tests
- [ ] TC-AUTH-24: Successful verification
- [ ] TC-AUTH-25: No authentication
- [ ] TC-AUTH-26: Invalid token

### Integration Tests
- [ ] TC-AUTH-29: Multiple device login
- [ ] TC-AUTH-30: Complete authentication flow
- [ ] Password reset complete flow
- [ ] Token refresh flow

---

## Notes
- All tokens are JWT (JSON Web Tokens)
- Access tokens typically expire in 30 minutes
- Refresh tokens typically expire in 30 days
- Passwords must be at least 8 characters with at least one number and one letter
- Phone numbers must be unique across all users
- Email addresses must be unique and valid
- Role verification requires authentication for all users ('all' permission)
- Logout invalidates only the specific refresh token provided

---

## Common Issues & Solutions

### Issue 1: Token Expired
**Error**: `Please authenticate`  
**Solution**: Use `/refresh-tokens` endpoint with refresh token to get new access token

### Issue 2: Duplicate Email/Phone
**Error**: `Email already taken` or `Phone number already taken`  
**Solution**: Use different email/phone or login with existing credentials

### Issue 3: Invalid Credentials
**Error**: `Incorrect phoneNumber or password`  
**Solution**: Verify phone number and password are correct, check for typos

### Issue 4: Validation Errors
**Error**: Various validation messages  
**Solution**: Ensure all required fields are provided with correct format and values

### Issue 5: Reset Token Invalid
**Error**: `Password reset failed`  
**Solution**: Request new reset token, tokens may have expired (typically 10 minutes)

---

## Performance Considerations
- Registration: ~200-500ms (includes password hashing)
- Login: ~200-400ms (includes password verification and token generation)
- Token Refresh: ~50-100ms
- Logout: ~50-100ms
- Password Reset: ~100-200ms (plus email sending time)
- Role Verification: ~50-100ms

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**Related Documentation**: 
- [WebSocket Testing Guide](./websocket-testing.md)
- [API Usage Guide](../API_USAGE_GUIDE.md)
