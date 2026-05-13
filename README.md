# Nintendo Switch & PC Games Library
A modern, responsive web application for managing your Nintendo Switch and PC game collections. Track your gaming progress, automatically fetch box art, and organize your library across two separate libraries.

<img width="1346" height="902" alt="Skärmbild 2025-11-18 150835" src="https://github.com/user-attachments/assets/b301b7f1-cf8c-4b44-8515-2a88158b7c66" />


## Features
**Dual Library Support** - Separate libraries for Nintendo Switch (`/`) and PC (`/pc`) games, each with independent collections

**Game Collection Management** - Add, remove, and organize your games with an intuitive interface

**Automatic Artwork Fetching** - High-quality box art automatically loaded from IGDB when adding games

**Smart Search** - Real-time game search with dropdown selection and instant results

**Collection Statistics** - Live counter showing total games in your library

**Completion Tracking** - Simple toggle to mark games as completed

**Grid/List View** - Switch between grid and list view modes

**Local Storage** - Your entire collection saves automatically in your browser - no account needed

**Export/Import** - Backup your collection with dated JSON exports and restore anytime

## Live Demo
<a href="https://games-library.frontend-erik.se/">Try it now!</a>

No installation required - your game collection saves directly in your browser.

## Tech Stack
**Frontend:** React 19, Vite, CSS3

**Routing:** React Router DOM

**Data Storage:** Browser localStorage

**Game Data:** IGDB API (Twitch)

**Deployment:** Netlify (with Netlify Functions for API proxying)

**Styling:** Custom CSS with Nintendo Switch color palette

## How to Use
### Navigating Between Libraries
- The Nintendo Switch library is available at the root path (`/`)
- The PC library is available at `/pc`

### Adding Games
1. Search for any game in the search box

2. Select the correct game from the dropdown results

3. Click "Add Game" - box art and details are automatically loaded

4. Your game appears in the library grid

### Managing Your Collection
- **Mark Complete:** Click the toggle button on any game card

- **Remove Games:** Use the × button in the top-right corner

- **Sort Collection:** Organize by title or completion status

- **Grid/List View:** Toggle between view modes

- **Export Backup:** Download your collection with automatic date-stamping

- **Import Restore:** Upload a previous backup to restore your library
