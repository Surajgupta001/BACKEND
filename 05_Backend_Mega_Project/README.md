# Backend Mega Project

This project is a comprehensive backend application built with Node.js, Express, and MongoDB. It serves as a feature-rich platform demonstrating various backend concepts including user authentication, video management, social interactions (tweets, comments, likes), playlist creation, and subscription handling.

## About This Project

This "Backend Mega Project" is the culmination of several backend development modules, integrating a wide array of functionalities into a single, cohesive application. It's designed to showcase a production-grade backend setup, focusing on best practices such as modular code structure, robust authentication mechanisms, efficient database interactions with Mongoose, and handling of complex data relationships.

The project simulates a video-sharing and social media platform, allowing users to register, upload videos, create playlists, tweet, comment, like content, and subscribe to other users' channels. It emphasizes secure API development, proper error handling, and the use of modern JavaScript features (ES modules).

Whether you are learning advanced backend development, looking for a reference for building similar applications, or exploring specific features like file uploads with Cloudinary or JWT authentication, this project aims to provide a clear and practical example.

## Features

- **User Management**:
  - User registration with avatar and cover image uploads.
  - Secure login with JWT (Access and Refresh Tokens).
  - Password management (change password).
  - Profile updates (account details, avatar, cover image).
  - Fetch current user details.
  - User channel profile.
  - Watch history.
- **Video Management**:
  - Publish videos with titles, descriptions, thumbnails, and video files.
  - Fetch all videos with pagination, sorting, and querying.
  - Get specific video details by ID (increments view count).
  - Update video details (title, description, thumbnail).
  - Delete videos (owner only).
  - Toggle video publish status.
- **Tweet Management**:
  - Create tweets.
  - Fetch tweets for a specific user with pagination.
  - Update existing tweets (owner only).
  - Delete tweets (owner only).
- **Comment Management**:
  - Add comments to videos.
  - Fetch comments for a specific video with pagination.
  - Update comments (owner only).
  - Delete comments (owner or video owner).
- **Like Management**:
  - Toggle likes on videos, comments, and tweets.
  - Get a list of videos liked by the current user.
- **Playlist Management**:
  - Create playlists with names and descriptions.
  - Fetch playlists for a specific user.
  - Get playlist details by ID, including video information.
  - Add videos to a playlist.
  - Remove videos from a playlist.
  - Update playlist details (name, description).
  - Delete playlists.
- **Subscription Management**:
  - Toggle subscriptions to channels (users).
  - Get a list of subscribers for a channel.
  - Get a list of channels a user is subscribed to.
- **File Uploads**: Utilizes Cloudinary for storing media files (avatars, cover images, video files, thumbnails).
- **Authentication**: JWT-based authentication with access and refresh tokens.
- **Error Handling**: Centralized error handling middleware.
- **Modular Structure**: Organized routes, controllers, models, and utility functions.

## Technologies Used

- **Node.js**: JavaScript runtime environment.
- **Express.js**: Web application framework for Node.js.
- **MongoDB**: NoSQL document database.
- **Mongoose**: ODM (Object Data Modeling) library for MongoDB and Node.js.
- **JSON Web Tokens (JWT)**: For secure authentication.
- **bcrypt**: For password hashing.
- **Cloudinary**: Cloud-based image and video management service.
- **Multer**: Middleware for handling `multipart/form-data` (file uploads).
- **dotenv**: For managing environment variables.
- **cookie-parser**: Middleware for parsing cookies.
- **cors**: Middleware for enabling Cross-Origin Resource Sharing.
- **Prettier**: Code formatter.

## Prerequisites

- Node.js (v18.x or higher recommended)
- npm or yarn
- MongoDB instance (local or cloud-hosted like MongoDB Atlas)
- Cloudinary account (for API key, secret, and cloud name)

## Environment Variables

Create a `.env` file in the root of the `05_Backend_Mega_Project` directory by copying the [`.env.sample`](05_Backend_Mega_Project/.env.sample:1) file and fill in the required values:

```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=*

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## Installation and Setup

1. **Clone the repository** (if you haven't already):

    ```bash
    git clone <repository_url>
    cd <repository_name>/05_Backend_Mega_Project
    ```

2. **Install dependencies**:

    ```bash
    npm install
    # or
    yarn install
    ```

3. **Set up environment variables**:
    Create a `.env` file as described above.

## Running the Application

To start the development server:

```bash
npm run dev
```

The server will typically start on the port specified in your `.env` file (default is 8000).

## API Endpoints Overview

All API endpoints are prefixed with `/api/v1`.

- **Users**: `/users` (e.g., `/users/register`, `/users/login`)
- **Videos**: `/videos`
- **Tweets**: `/tweets`
- **Comments**: `/comments`
- **Likes**: `/likes`
- **Playlists**: `/playlists`
- **Subscriptions**: `/subscriptions`

Refer to the respective route files in `src/routes/` for detailed endpoint definitions and HTTP methods.

## License

This project is licensed under the MIT License. See the [LICENSE](../../LICENSE) file in the main repository for more details.

## Contributing

Contributions are welcome! If you have suggestions for improvements, bug fixes, or new features, please feel free to:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature` or `bugfix/YourBugFix`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add some feature'`).
5. Push to the branch (`git push origin feature/YourFeature`).
6. Open a Pull Request.

Please ensure your code adheres to the existing coding style and includes relevant tests if applicable.

---

This project provides a solid foundation for a complex backend system. Feel free to explore the code, extend its features, or use it as a reference for your own projects.

## Acknowledgments

This project was inspired by the need for a comprehensive backend solution that integrates various functionalities commonly found in modern web applications. It serves as a learning tool and a reference for developers looking to build similar systems.