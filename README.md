# Bandcamp Discovery Player

A modern web application for discovering and streaming music from Bandcamp with enhanced listening controls and quick navigation. Built for music enthusiasts who want to efficiently explore new artists and tracks.

![Bandcamp Discovery Player Main](main-image.png)

## What This App Does

This app addresses the limitations of Bandcamp's native discovery page by providing:

- **Quick Track Listening**: Listen to featured tracks immediately without navigating away
- **Volume Controls**: Adjustable volume settings for better listening experience
- **Rapid Navigation**: Keyboard shortcuts for fast browsing between artists
- **Easy Link Sharing**: One-click copying of album links when you find something you like
- **Streamlined Workflow**: Skip tracks you don't like and move to the next artist instantly
- **Dual Mode Discovery**: Switch between "New Releases" and "Hot" (best selling) breakcore albums

## Why This Exists

Bandcamp's discovery page is great for finding new music, but their featured track controls are limited. This app provides a more efficient way to:

- Preview tracks quickly
- Navigate between artists seamlessly
- Copy album links when you discover something you enjoy
- Control volume and playback settings

## Keyboard Shortcuts

- **Q**: Previous album
- **E**: Next album
- **W**: Copy album link to clipboard
- **S**: Open album page in new tab
- **Space**: Play/pause current track
- **←**: Seek backward 10 seconds
- **→**: Seek forward 10 seconds
- **↑**: Increase volume
- **↓**: Decrease volume
- **/**: Focus genre search
- **Escape**: Close help modal

## Project Structure

```
bandcamp-discovery-player/
├── api/
│   └── index.ts                # Vercel serverless entry point
├── src/
│   ├── server/
│   │   ├── app.ts              # Main Express app configuration
│   │   ├── index.ts            # Server entry point
│   │   ├── types.ts            # Shared TypeScript types
│   │   ├── routes/
│   │   │   └── albums.ts       # Album API routes
│   │   └── middleware/
│   │       └── static.ts       # Static file serving middleware
├── public/                     # Frontend static assets
├── dist/                       # Compiled production code (gitignored)
├── package.json
├── tsconfig.json               # TypeScript configuration
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd bandcamp-discovery-player
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm run build`: Compile TypeScript to JavaScript in the `dist/` directory
- `npm start`: Start the production server using the compiled code
- `npm run dev`: Start the development server with `tsx` for real-time updates
- `npm run lint`: Run ESLint with TypeScript support
- `npm run format`: Format code with Prettier

## API Endpoints

- `GET /api/albums?page=1`: Fetch albums with pagination
- `GET /health`: Health check endpoint

## Performance Optimizations

- **Image Preloading**: Next 3 album covers are preloaded
- **Caching**: Static assets cached for 24 hours
- **Pagination**: Efficient cursor-based pagination
- **Duplicate Prevention**: Prevents duplicate albums using link tracking

## Browser Support

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details
