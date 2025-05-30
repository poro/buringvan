# Notion Agent System User Guide

## Overview

The Notion Agent System is an automated solution that interacts with Notion to perform various tasks based on todo items. The system monitors Notion todo lists, performs specified actions, and updates results back to designated Notion pages.

## Features

- **Conference Tracking**: Automatically searches for and updates information about upcoming conferences on specified topics
- **Research Article Parsing**: Finds and summarizes new research articles in games and AI
- **Project Tracking**: Monitors project milestones and progress
- **Stakeholder Monitoring**: Tracks stakeholder engagement and identifies follow-up needs

## System Requirements

- Python 3.8+ runtime environment
- Notion API credentials
- Internet access for API calls and web searches
- Scheduled execution capability (cron, scheduler service)
- Secure storage for API tokens and credentials

## Setup Instructions

### 1. Notion API Setup

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name your integration (e.g., "Notion Agent System")
4. Select the workspace where you want to use the agent
5. Set appropriate capabilities (Read content, Update content, Insert content)
6. Submit and copy your API key

### 2. Database Setup

Create the following databases in your Notion workspace:

#### Todo Database
- **Name**: Task name/description
- **Type**: Task category (Conference, Research, Project, Stakeholder)
- **Parameters**: JSON or text field with task-specific parameters
- **Frequency**: How often to execute (Daily, Weekly, Monthly, Once)
- **Status**: Current status (Not Started, In Progress, Complete, Error)
- **Last Run**: Date/time of last execution
- **Next Run**: Scheduled next execution
- **Result Page**: Link to page with results

#### Conference Database
- **Name**: Conference name
- **Topic**: Primary topic/focus
- **Dates**: Conference dates
- **Location**: Physical or virtual location
- **Submission Deadline**: Paper/proposal deadline
- **Website**: Conference URL
- **Notes**: Additional information
- **Last Updated**: When entry was last refreshed

#### Research Article Database
- **Title**: Article title
- **Authors**: Author list
- **Publication**: Journal/conference
- **Date**: Publication date
- **Topics**: Relevant topics
- **URL**: Link to article
- **Summary**: Brief summary
- **Key Findings**: Notable results
- **Last Updated**: When entry was last refreshed

### 3. Share Databases with Integration

1. Open each database in Notion
2. Click "Share" in the top right
3. Add your integration by name
4. Set appropriate permissions (Can edit)

### 4. Environment Setup

1. Clone the repository to your server
2. Install required dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Create a `.env` file with your API keys and database IDs:
   ```
   NOTION_API_KEY=your_api_key_here
   TODO_DATABASE_ID=your_todo_database_id
   CONFERENCE_DATABASE_ID=your_conference_database_id
   RESEARCH_DATABASE_ID=your_research_database_id
   ```

## Usage

### Creating Todo Items

Create todo items in your Todo database with the following format:

1. **Name**: Descriptive task name (e.g., "Track AI conferences")
2. **Type**: Select task type (conference, research, project, stakeholder)
3. **Parameters**: (Optional) JSON string with task parameters
   ```json
   {"topics": ["AI", "Machine Learning"], "timeframe": "upcoming"}
   ```
4. **Frequency**: How often to run the task

### Running the Agent

Run the agent manually:
```
python main.py
```

Set up scheduled execution (e.g., using cron):
```
0 9 * * * cd /path/to/notion_agent_system && python main.py
```

### Viewing Results

After execution, the agent will:
1. Update the status of todo items
2. Create result pages linked to the todo items
3. Update the relevant databases with new information

## Troubleshooting

### Common Issues

- **API Connection Errors**: Verify your API key and internet connection
- **Permission Errors**: Ensure your integration has access to all databases
- **Rate Limiting**: If you encounter rate limits, reduce execution frequency

### Logs

Check the execution logs for detailed information about any errors:
```
python main.py --verbose
```

## Extending the System

The modular design allows for:
- Adding new task types by creating additional execution modules
- Enhancing existing modules with more sophisticated processing
- Integrating with additional data sources beyond web searches

## Support

For issues or questions, please contact the development team or open an issue in the repository.
