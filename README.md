# FastAPI Real-Time Chat Application

A high-performance, real-time chat application built with Python FastAPI, PostgreSQL, and Vanilla JavaScript. Features seamless WebSocket integration for instant messaging and multi-user group chats.

![UI Sneak Peek](https://img.shields.io/badge/UI-Glassmorphism-blueviolet?style=for-the-badge) ![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi) ![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql)

## ✨ Features

- **Real-Time Messaging**: Lightning-fast message delivery using WebSockets.
- **Direct & Group Chats**: Support for personalized 1-to-1 conversations and broadcasting to multiple users in custom groups.
- **PostgreSQL Database**: Persistent storage for chat histories, groups, and member relationships using SQLAlchemy ORM.
- **Glassmorphism UI**: A beautiful, modern, responsive frontend layout with sleek transparency and blur effects.
- **Live Notifications**: Visual unread badges and system announcements when users create new groups.

## 🚀 Installation & Setup

### Prerequisites
- Python 3.9+
- PostgreSQL (Ensure it is running locally on port `5432`)

### 1. Clone the Repository
```bash
git clone https://github.com/Abhijain01/chat-application.git
cd chat-application
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Variables
Create a `.env` file in the root directory (or ensure the fallback URL matches your database).
```ini
DATABASE_URL=postgresql+asyncpg://postgres:1234@127.0.0.1/chat_db
```
*(Make sure to update the username/password to match your local PostgreSQL configuration)*

### 4. Database Initialization
Ensure `chat_db` exists in your PostgreSQL instance. 
Then simply start the server! SQLAlchemy will automatically generate the required tables (`messages`, `groups`, `group_members`) on the first boot.

### 5. Start the Server
Run the Uvicorn ASGI server:
```bash
uvicorn app.main:app --reload
```

### 6. Access the Application
Open your browser and navigate to:
[http://127.0.0.1:8000/static/index.html](http://127.0.0.1:8000/static/index.html)

*(Tip: Open the URL in two separate browser windows to test chatting between different users!)*

## 🛠️ Tech Stack
* **Backend:** FastAPI, Uvicorn, SQLAlchemy, Asyncpg, Python WebSockets
* **Frontend:** HTML5, Vanilla JavaScript (app.js), CSS3 (Glassmorphism layout)
* **Database:** PostgreSQL
