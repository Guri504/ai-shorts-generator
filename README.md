# AI YouTube Shorts Generator

A professional web application that automatically generates styled vertical YouTube Shorts from a single topic or title using Gemini API, Edge TTS (Hindi/English support with word-by-word active captioning), and Pexels/Pixabay stock videos.

---

## Step-by-Step API Key Generation Guide

To run this application, you will need to configure API keys in the `.env` file in the root directory. Follow these instructions to obtain them:

### 1. Google Gemini API Key
Used for generating scripts, scene breakdowns, visual prompts, YouTube titles, SEO descriptions, and tags.
1. Visit the **[Google AI Studio Portal](https://aistudio.google.com/)**.
2. Sign in with your Google account.
3. Click on the **"Get API key"** button in the top left sidebar.
4. Click **"Create API key"**. You can choose to associate it with an existing Google Cloud Project or create a new one.
5. Copy the generated key (e.g., `AIzaSy...`) and paste it into the `GEMINI_API_KEY` field in your `.env` file.

### 2. Pexels API Key
Used to search and download high-quality vertical stock videos for generic scenes.
1. Go to the **[Pexels Developer Portal](https://www.pexels.com/api/)**.
2. Sign in or create a free Pexels account.
3. Click **"Your API Key"** or click on **"Get Started"** under the API documentation section.
4. Fill out the brief developer application form (you can describe it as a "personal project for automated video generation").
5. Your API key will be generated instantly.
6. Copy this key and paste it into the `PEXELS_API_KEY` field in your `.env` file.

### 3. Pixabay API Key (Optional)
Used as an alternate fallback provider for stock videos.
1. Visit the **[Pixabay API Documentation](https://pixabay.com/api/docs/)**.
2. Sign in or sign up for a free Pixabay account.
3. Scroll down to the **"Parameters"** section in the documentation.
4. Under the table, you will see your unique API key displayed in a gray box (visible only when logged in).
5. Copy this key and paste it into the `PIXABAY_API_KEY` field in your `.env` file.

---

## How to Install and Run

### System Prerequisites
Ensure you have **Node.js** (v18+) and **FFmpeg** installed and added to your system's environment `PATH` variable. (This application has verified FFmpeg 8.x is installed on your system).

### Running the Application

1. **Configure Environment Variables**:
   Open `.env` in the root folder and enter your API keys.

2. **Run Backend (Express server)**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Run Frontend (Next.js client)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the App**:
   Open your browser and navigate to `http://localhost:3000`.
