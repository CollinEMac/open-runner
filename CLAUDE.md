# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- Run local server: `npx serve` or `python -m http.server 3000`
- Navigate to http://localhost:3000 to view the game
- Debug mode: Add `?logLevel=DEBUG` to the URL for verbose logging

## Code Style Guidelines
- Use ES6+ modules with explicit imports/exports
- Follow JSDoc commenting standards for all public functions
- Maintain modular code organization with clear separation of concerns
- Use camelCase for variables/functions, PascalCase for classes
- Classes should be in separate files matching their class name
- Log errors using the logger utility with appropriate log levels
- Wrap try/catch blocks around async operations and DOM interactions
- Use existing patterns for error handling via logger.error()
- Monitor performance - use performanceManager for CPU-intensive operations
- Keep classes < 300 lines; refactor larger files
- Write console logs for debugging/monitoring purposes

## Architecture Patterns
- Use event-driven communication via eventBus when appropriate
- Utilize manager classes for system-wide functionality
- Maintain clean separation between rendering, physics, and game logic
- Ensure mobile and desktop compatibility with deviceUtils