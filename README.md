# Open Runner

![Open Runner Game](data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏃</text></svg>)

Open Runner is a 3D endless runner game built with Three.js. Race through procedurally generated terrain, collect coins, avoid obstacles, and see how far you can go!

## Features

- **Procedurally generated terrain** - Every run is unique
- **Multiple environments** - Forest and desert levels with unique obstacles and enemies
- **Increasing difficulty** - Player speed increases over time
- **Collectibles** - Gather coins to increase your score
- **Power-ups** - Find magnet power-ups to attract nearby coins
- **Enemies** - Avoid various enemies with different behaviors
- **Mobile support** - Play on desktop or mobile devices
- **Performance settings** - Adjust quality based on your device capabilities

## How to Run the Game

1. Clone the repository:
   ```bash
   git clone https://github.com/aaronson2012/open-runner.git
   cd open-runner
   ```

2. Serve the files using a local web server. You can use any of these methods:
   - Using npx: `npx serve`
   - Using Python: `python -m http.server 3000`
   - Using PHP: `php -S localhost:3000`
   - Or any other web server of your choice

3. Open your browser and navigate to http://localhost:3000

## How to Play

### Controls

- **Desktop**:
  - **WASD** or **Arrow Keys**: Move/turn the player
  - **ESC**: Pause game
  - **R**: Restart after game over
  - **F**: Toggle FPS counter

- **Mobile**:
  - **Left/Right buttons**: Turn the player
  - **Pause button**: Pause the game

### Gameplay

- **Objective**: Run as far as possible while collecting coins to increase your score
- **Obstacles**: Avoid trees, rocks, cacti, and other obstacles
- **Enemies**: Different enemies have unique behaviors - some chase you, others roam around
- **Power-ups**: Collect magnet power-ups to attract nearby coins
- **Speed**: Your speed increases over time, making the game progressively more challenging

## Game Environments

### Forest Level
- Green terrain with trees, rocks, and logs
- Enemies include bears, squirrels, and deer
- Collect coins and magnet power-ups

### Desert Level
- Sandy terrain with cacti, rocks, and tumbleweeds
- Enemies include coyotes, rattlesnakes, and scorpions
- Watch out for rolling tumbleweeds that can knock you over

## Screenshots

*Screenshots will be added here. To add your own screenshots:*

1. Take a screenshot of the game in action
2. Save it to the `screenshots` directory
3. Update this README to include your screenshot using the following format:

```markdown
![Description of screenshot](screenshots/your-screenshot-filename.png)
```

## Technical Details

Open Runner is built with:
- **Three.js** - 3D rendering
- **JavaScript modules** - Modern ES6+ structure
- **Procedural generation** - Dynamic terrain and object placement
- **Component-based architecture** - Modular code organization
- **Adaptive performance** - Adjusts quality based on device capabilities

## Development

### Project Structure

- `index.html` - Main entry point
- `style.css` - Global styles
- `js/` - JavaScript modules
  - `core/` - Core game engine components
  - `config/` - Configuration files for game settings
  - `entities/` - Game objects (player, enemies, etc.)
  - `managers/` - System managers (audio, assets, etc.)
  - `physics/` - Collision detection and physics
  - `rendering/` - 3D rendering and visual effects
  - `utils/` - Utility functions and helpers
  - `levels/` - Level-specific configurations

### Adding New Features

- **New Enemies**: Add a new file in `js/entities/enemies/` and update the enemy manager
- **New Objects**: Add object definitions in the level config files and create models in `js/rendering/models/`
- **New Levels**: Create a new level config file in `js/levels/` following the existing pattern

## Contributing

Contributions are welcome! If you'd like to contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b new-feature`
3. Make your changes
4. Commit your changes: `git commit -m 'Add new feature'`
5. Push to the branch: `git push origin new-feature`
6. Submit a pull request

### Code Style Guidelines

- Use ES6+ JavaScript features
- Follow modular design patterns
- Document your code with JSDoc comments
- Keep performance in mind - this game runs in the browser

## License

This project is open source and available under the [MIT License](LICENSE).
