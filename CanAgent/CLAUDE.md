# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Node.js Implementation
- **Install dependencies**: `npm install`
- **Run the agent**: `node index-fixed.js` (use the fixed version with corrected imports)
- **Run tests**: `npm test`
- **Development mode**: `npm run dev`

### Python Implementation  
- **Install dependencies**: `pip install -r requirements.txt`
- **Run the agent**: `python3 main.py`

### Environment Setup
Create a `.env` file with:
```
NOTION_API_KEY=your_api_key_here
TODO_DATABASE_ID=your_todo_database_id
CONFERENCE_DATABASE_ID=your_conference_database_id
RESEARCH_DATABASE_ID=your_research_database_id
PROJECT_DATABASE_ID=your_project_database_id
STAKEHOLDER_DATABASE_ID=your_stakeholder_database_id
```

## Architecture

This is a **Notion Agent System** that automates tasks by reading from Notion databases and updating results back to Notion. The codebase has parallel implementations in both Node.js and Python.

### Core Components

1. **Notion Integration Layer** (`client.js`, `helper.js`, `notion_integration.py`)
   - Handles Notion API authentication, rate limiting, and CRUD operations
   - Provides helper functions for common Notion operations

2. **Task Execution Modules**
   - **Conference Tracker** (`conference.js`): Searches web sources for conferences and updates Notion
   - **Research Parser** (`research.js`): Finds and summarizes research articles
   - **Project Tracker** (`project.js`): Monitors project milestones and progress
   - **Stakeholder Monitor** (`stakeholder.js`): Tracks stakeholder engagement

3. **Task Scheduling** (`parser.js`)
   - Parses todo items from Notion database
   - Determines which tasks are due for execution
   - Updates task status during execution

### Known Issues

The Node.js implementation has incorrect import paths. Files expect a `src/` directory structure that doesn't exist. All module files are in the root directory but imports reference subdirectories like `./notion/client` and `./tasks/parser`.

To run the Node.js version, use `index-fixed.js` which has corrected import paths, or fix the imports in all files to reference the correct paths (e.g., `./client` instead of `./notion/client`).