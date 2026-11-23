# WinGo Player Game Page — Windows VS Code Setup Guide

This package contains the standalone **WinGo Player Game Page** (mobile-first React + TypeScript + Vite + Tailwind CSS with 25 languages and zero demo data).

It connects directly to the real **WinGo Backend API** included in `wingo-admin-panel.zip`.

## Prerequisites
- Node.js 20+ installed (https://nodejs.org)
- VS Code installed
- The **WinGo Admin Panel & Backend API** (`wingo-admin-panel`) running locally on `http://localhost:3000`

## Quick Start in Windows VS Code
1. Extract `wingo-game-page.zip` and open the `wingo-game-page` folder in VS Code.
2. Open a terminal in VS Code (`Ctrl + ``) and run:
   ```powershell
   copy .env.example .env
   npm install
   npm run dev
   ```
3. Open **http://localhost:5173** in your browser.
   - All `/api/*` requests automatically proxy to `http://localhost:3000` (your local WinGo Backend API + PostgreSQL database).
   - For separate hosting / Capacitor Android builds, set `VITE_API_BASE_URL` in `.env` to your backend URL and run `npm run build`.
