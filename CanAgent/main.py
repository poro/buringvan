"""
Main Agent System

This module ties together all components of the Notion Agent System and provides
the main execution flow.
"""

import os
import time
import json
from datetime import datetime
from typing import Dict, List, Any, Optional

# Import Notion API integration
from notion_integration import NotionAPI, NotionHelper

# Import task modules
from task_modules.task_parser import TaskParser, TaskScheduler
from task_modules.conference_tracker import ConferenceTracker
from task_modules.research_article_parser import ResearchArticleParser

class NotionAgentSystem:
    """
    Main agent system that orchestrates all components.
    """
    
    def __init__(self, api_key: str, todo_database_id: str, 
                conference_database_id: str, research_database_id: str):
        """
        Initialize the Notion Agent System.
        
        Args:
            api_key: Notion API integration token
            todo_database_id: ID of the todo list database
            conference_database_id: ID of the conference database
            research_database_id: ID of the research article database
        """
        # Initialize Notion API
        self.notion_api = NotionAPI(api_key)
        self.notion_helper = NotionHelper(self.notion_api)
        
        # Store database IDs
        self.todo_database_id = todo_database_id
        self.conference_database_id = conference_database_id
        self.research_database_id = research_database_id
        
        # Initialize task parser and scheduler
        self.task_parser = TaskParser(self.notion_helper)
        self.task_scheduler = TaskScheduler(self.notion_helper, self.task_parser)
        
        # Initialize task modules
        self.conference_tracker = ConferenceTracker(self.notion_helper)
        self.research_parser = ResearchArticleParser(self.notion_helper)
        
        # Initialize execution log
        self.log = []
    
    def test_connection(self) -> bool:
        """
        Test the connection to Notion API.
        
        Returns:
            True if connection is successful, False otherwise
        """
        return self.notion_api.test_connection()
    
    def run(self) -> List[Dict]:
        """
        Run the agent system once.
        
        Returns:
            List of execution results
        """
        results = []
        
        try:
            # Get all tasks from todo database
            tasks = self.task_scheduler.get_tasks_from_database(self.todo_database_id)
            
            # Get tasks due for execution
            due_tasks = self.task_scheduler.get_due_tasks(tasks)
            
            # Execute each due task
            for task in due_tasks:
                result = self.execute_task(task)
                results.append(result)
                
                # Add to log
                self.log.append({
                    "timestamp": datetime.now().isoformat(),
                    "task": task.get("name"),
                    "type": task.get("type"),
                    "result": result.get("status")
                })
            
            return results
        
        except Exception as e:
            error_result = {
                "status": "Error",
                "message": f"Error running agent system: {str(e)}",
                "task_id": None,
                "result_page_id": None
            }
            
            # Add to log
            self.log.append({
                "timestamp": datetime.now().isoformat(),
                "task": "System Execution",
                "type": "system",
                "result": "Error",
                "error": str(e)
            })
            
            return [error_result]
    
    def execute_task(self, task: Dict) -> Dict:
        """
        Execute a specific task.
        
        Args:
            task: Task dictionary
            
        Returns:
            Execution result
        """
        task_id = task.get("id")
        task_type = task.get("type")
        task_name = task.get("name")
        parameters = task.get("parameters", {})
        
        # Update task status to In Progress
        self.task_scheduler.update_task_status(task_id, "In Progress")
        
        try:
            result_page_id = None
            
            # Execute based on task type
            if task_type == "conference":
                result_page_id = self._execute_conference_task(task)
            elif task_type == "research":
                result_page_id = self._execute_research_task(task)
            elif task_type == "project":
                result_page_id = self._execute_project_task(task)
            elif task_type == "stakeholder":
                result_page_id = self._execute_stakeholder_task(task)
            else:
                raise ValueError(f"Unknown task type: {task_type}")
            
            # Update task status to Complete
            self.task_scheduler.update_task_status(task_id, "Complete", result_page_id)
            
            return {
                "status": "Complete",
                "message": f"Successfully executed task: {task_name}",
                "task_id": task_id,
                "result_page_id": result_page_id
            }
        
        except Exception as e:
            # Update task status to Error
            self.task_scheduler.update_task_status(task_id, "Error")
            
            return {
                "status": "Error",
                "message": f"Error executing task {task_name}: {str(e)}",
                "task_id": task_id,
                "result_page_id": None,
                "error": str(e)
            }
    
    def _execute_conference_task(self, task: Dict) -> Optional[str]:
        """
        Execute a conference tracking task.
        
        Args:
            task: Task dictionary
            
        Returns:
            Result page ID if successful, None otherwise
        """
        parameters = task.get("parameters", {})
        topics = parameters.get("topics", [])
        timeframe = parameters.get("timeframe", "upcoming")
        
        # Search for conferences
        conferences = self.conference_tracker.search_conferences(topics, timeframe)
        
        # Update conference database
        updated_ids = self.conference_tracker.update_conference_database(
            self.conference_database_id, conferences
        )
        
        # Create result page
        result_page_id = self._create_result_page(
            task.get("name"),
            "Conference Tracking Results",
            f"Found and updated {len(conferences)} conferences on topics: {', '.join(topics)}",
            updated_ids
        )
        
        return result_page_id
    
    def _execute_research_task(self, task: Dict) -> Optional[str]:
        """
        Execute a research article parsing task.
        
        Args:
            task: Task dictionary
            
        Returns:
            Result page ID if successful, None otherwise
        """
        parameters = task.get("parameters", {})
        topics = parameters.get("topics", [])
        timeframe = parameters.get("timeframe", "recent")
        
        # Search for research articles
        articles = self.research_parser.search_research_articles(topics, timeframe)
        
        # Update research database
        updated_ids = self.research_parser.update_article_database(
            self.research_database_id, articles
        )
        
        # Create result page
        result_page_id = self._create_result_page(
            task.get("name"),
            "Research Article Results",
            f"Found and updated {len(articles)} research articles on topics: {', '.join(topics)}",
            updated_ids
        )
        
        return result_page_id
    
    def _execute_project_task(self, task: Dict) -> Optional[str]:
        """
        Execute a project tracking task.
        
        Args:
            task: Task dictionary
            
        Returns:
            Result page ID if successful, None otherwise
        """
        # This is a placeholder for project tracking functionality
        # In a real implementation, this would interact with project management tools
        
        parameters = task.get("parameters", {})
        project_name = parameters.get("project_name", "Unknown Project")
        
        # Create result page
        result_page_id = self._create_result_page(
            task.get("name"),
            "Project Tracking Results",
            f"Project tracking for {project_name} completed.",
            []
        )
        
        return result_page_id
    
    def _execute_stakeholder_task(self, task: Dict) -> Optional[str]:
        """
        Execute a stakeholder monitoring task.
        
        Args:
            task: Task dictionary
            
        Returns:
            Result page ID if successful, None otherwise
        """
        # This is a placeholder for stakeholder monitoring functionality
        # In a real implementation, this would interact with CRM tools
        
        parameters = task.get("parameters", {})
        stakeholder_name = parameters.get("stakeholder_name", "Unknown Stakeholder")
        
        # Create result page
        result_page_id = self._create_result_page(
            task.get("name"),
            "Stakeholder Monitoring Results",
            f"Stakeholder monitoring for {stakeholder_name} completed.",
            []
        )
        
        return result_page_id
    
    def _create_result_page(self, task_name: str, title: str, summary: str, 
                           related_pages: List[str]) -> Optional[str]:
        """
        Create a result page in Notion.
        
        Args:
            task_name: Name of the task
            title: Title for the result page
            summary: Summary of the results
            related_pages: List of related page IDs
            
        Returns:
            Created page ID if successful, None otherwise
        """
        # Create page properties
        properties = {
            "Name": {
                "title": [
                    {
                        "text": {
                            "content": f"{title} - {datetime.now().strftime('%Y-%m-%d')}"
                        }
                    }
                ]
            },
            "Task": {
                "rich_text": [
                    {
                        "text": {
                            "content": task_name
                        }
                    }
                ]
            },
            "Date": {
                "date": {
                    "start": datetime.now().strftime("%Y-%m-%d")
                }
            }
        }
        
        # Create content blocks
        blocks = [
            self.notion_helper.create_heading_block(title),
            self.notion_helper.create_text_block(summary),
            self.notion_helper.create_divider_block(),
            self.notion_helper.create_heading_block("Details", level=2)
        ]
        
        # Add related pages
        if related_pages:
            blocks.append(self.notion_helper.create_heading_block("Related Pages", level=2))
            
            for page_id in related_pages:
                # Get page details
                page = self.notion_api.read_page(page_id)
                page_title = self._get_page_title(page)
                
                if page_title:
                    # Create a link to the page
                    blocks.append(self.notion_helper.create_text_block(f"- {page_title}"))
        
        # Create the page (in the todo database for simplicity)
        result = self.notion_api.create_page(self.todo_database_id, True, properties, blocks)
        
        if "error" in result:
            print(f"Error creating result page: {result.get('error')}")
            return None
        
        return result.get("id")
    
    def _get_page_title(self, page: Dict) -> Optional[str]:
        """
        Get the title of a Notion page.
        
        Args:
            page: Notion page dictionary
            
        Returns:
            Page title or None if not found
        """
        try:
            properties = page.get("properties", {})
            title_property = properties.get("Name", {}) or properties.get("Title", {})
            title_items = title_property.get("title", [])
            
            if title_items:
                return title_items[0].get("text", {}).get("content")
            
            return None
        
        except Exception:
            return None
    
    def get_log(self) -> List[Dict]:
        """
        Get the execution log.
        
        Returns:
            List of log entries
        """
        return self.log


# Example usage for testing
if __name__ == "__main__":
    # This would be loaded from environment variables or config in production
    API_KEY = "your_notion_api_key"
    TODO_DATABASE_ID = "your_todo_database_id"
    CONFERENCE_DATABASE_ID = "your_conference_database_id"
    RESEARCH_DATABASE_ID = "your_research_database_id"
    
    # Initialize the agent system
    agent = NotionAgentSystem(
        API_KEY,
        TODO_DATABASE_ID,
        CONFERENCE_DATABASE_ID,
        RESEARCH_DATABASE_ID
    )
    
    # Test connection
    if agent.test_connection():
        print("Successfully connected to Notion API")
    else:
        print("Failed to connect to Notion API")
        exit(1)
    
    # Run the agent
    results = agent.run()
    
    # Print results
    for result in results:
        print(f"Task: {result.get('task_id')}")
        print(f"Status: {result.get('status')}")
        print(f"Message: {result.get('message')}")
        print(f"Result Page: {result.get('result_page_id')}")
        print("---")
