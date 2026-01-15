<div align="center">

  <img src="public/logo.png" alt="NBA Predictor Logo" width="100" height="100" />

# 🏀 NBA Playoff Predictor

**Compete with friends, predict the bracket, and track live scores.**

A modern, interactive Progressive Web App (PWA) built for NBA fans.

[Live Demo](https://nba-app-five.vercel.app)

  <br />

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)

</div>

<br />

## 📋 About The Project

**NBA Playoff Predictor** is a full-stack web application that allows users to create private leagues, predict the NBA regular season standings, and fill out the full playoff bracket. The app uses a unique "Golf Scoring" system (lower is better) and updates scores in real-time based on actual NBA results.

It is built as a **PWA (Progressive Web App)**, allowing users to install it on their mobile devices for a native-like experience.

## ✨ Key Features

### 🎮 User Experience

- **Drag & Drop Interface:** Easily rank teams for the East/West conference standings using a smooth drag-and-drop UI.
- **Interactive Bracket:** A visual, dynamic playoff bracket that handles dependencies (e.g., selecting a winner in Round 1 automatically advances them to Round 2).
- **League System:** Create private leagues or join existing ones via a unique code.
- **Leaderboard:** Real-time ranking with "Golf Rules" scoring (Linear or Squared penalties).
- **PWA Support:** Installable on iOS and Android with offline capabilities.

### 🛡️ Admin & Security

- **Super Admin Panel:** A secure dashboard to update official NBA results and sync live standings.
- **Authentication:** Secure email/password login via Supabase Auth.
- **Row Level Security (RLS):** Ensures users can only modify their own predictions.
- **Locking Mechanism:** Leagues can be locked by the admin to prevent changes after the playoffs start.

## 🛠️ Tech Stack

- **Frontend:** React (Vite), TypeScript
- **Styling:** Tailwind CSS (Dark Mode aesthetic)
- **State Management:** React Hooks
- **Backend / DB:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Drag & Drop:** `@hello-pangea/dnd`
- **Deployment:** Vercel

## 🚀 Getting Started

Follow these steps to run the project locally.

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1.  **Clone the repo**

    ```sh
    git clone [https://github.com/harel3782/nba-app.git](https://github.com/harel3782/nba-app.git)
    cd nba-app
    ```

2.  **Install dependencies**

    ```sh
    npm install
    ```

3.  **Environment Variables**
    Create a `.env` file in the root directory and add your Supabase credentials:

    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the App**
    ```sh
    npm run dev
    ```

## 📐 Database Schema

The project uses a normalized PostgreSQL schema hosted on Supabase:

- `users`: Managed by Supabase Auth.
- `leagues`: Stores league settings (name, scoring type, lock date).
- `league_members`: Links users to leagues.
- `predictions`: Stores regular season ranking predictions.
- `tournament_predictions`: Stores bracket picks (Play-in to Finals).
- `official_standings` & `official_playoff_results`: The "Truth" tables updated by the Admin.
- `leaderboard`: A materialised table updated via Triggers for performance.

## 📸 Screenshots

|         Dashboard         |          Bracket          |
| :-----------------------: | :-----------------------: |
| _(Place screenshot here)_ | _(Place screenshot here)_ |

## 👤 Author

**Harel Mashiah**

- Project Link: [https://github.com/your-username/nba-predictor](https://github.com/harel3782/nba-app)
