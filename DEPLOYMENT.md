# Deployment Guide for Render

## Environment Variables Required

You need to set the following environment variables in your Render dashboard:

### Required Variables:
1. **MONGO_URI** - Your MongoDB connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority`
   - Or for local MongoDB: `mongodb://localhost:27017/database_name`

2. **JWT_SECRET** - Secret key for JWT token generation
   - Can be any random string, e.g., `your-super-secret-jwt-key-here`

### Optional Variables:
3. **PORT** - Server port (defaults to 5000 if not set)

## How to Set Environment Variables in Render:

1. Go to your Render dashboard
2. Select your service
3. Go to "Environment" tab
4. Add the following key-value pairs:
   - Key: `MONGO_URI`, Value: `your-mongodb-connection-string`
   - Key: `JWT_SECRET`, Value: `your-jwt-secret-key`

## MongoDB Setup:

### Option 1: MongoDB Atlas (Recommended for production)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Replace `<password>` with your database user password
5. Add the connection string as `MONGO_URI` environment variable

### Option 2: Local MongoDB
- Use `mongodb://localhost:27017/cricket-auction` as your MONGO_URI

## Common Issues and Solutions:

### 1. MongoDB Connection Timeout
- Ensure your MONGO_URI is correct
- Check if your MongoDB instance is accessible from Render's servers
- For MongoDB Atlas, ensure your IP whitelist includes `0.0.0.0/0` (all IPs)

### 2. JWT Secret Missing
- Set the JWT_SECRET environment variable
- Use a strong, random string

### 3. Port Issues
- Render automatically sets the PORT environment variable
- Your app should use `process.env.PORT || 5000`

## Testing the Deployment:

After setting up environment variables:

1. Your app should be available at: `https://your-app-name.onrender.com`
2. Test the health check endpoint: `https://your-app-name.onrender.com/`
3. You should see "API is running!" message

## Master Account:

The system automatically creates a master account with these credentials:
- Email: `master@auction.com`
- Password: `master@2025`
- Role: `master`

Use these credentials to log in and manage the system.
