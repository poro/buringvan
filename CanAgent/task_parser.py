"""
Task Parser and Scheduler

This module handles parsing todo items from Notion and scheduling appropriate tasks.
"""

import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

class TaskParser:
    """
    Parses todo items from Notion and identifies task types and parameters.
    """
    
    def __init__(self, notion_helper):
        """
        Initialize the task parser.
        
        Args:
            notion_helper: NotionHelper instance for Notion interactions
        """
        self.notion_helper = notion_helper
        self.task_types = {
            "conference": ["conference", "conf", "event", "workshop", "symposium"],
            "research": ["research", "article", "paper", "publication", "study"],
            "project": ["project", "milestone", "development", "progress"],
            "stakeholder": ["stakeholder", "contact", "follow-up", "meeting", "client"]
        }
    
    def parse_todo_item(self, item: Dict) -> Dict:
        """
        Parse a todo item and identify its type and parameters.
        
        Args:
            item: Todo item from Notion
            
        Returns:
            Dictionary with task type and parameters
        """
        # Extract basic properties
        task_name = self._get_property_value(item, "Name", "title")
        task_type = self._get_property_value(item, "Type", "select")
        task_params = self._get_property_value(item, "Parameters", "rich_text")
        task_status = self._get_property_value(item, "Status", "select")
        
        # Determine task type if not explicitly set
        if not task_type:
            task_type = self._infer_task_type(task_name)
        
        # Parse parameters
        parameters = self._parse_parameters(task_params, task_name, task_type)
        
        # Create task object
        task = {
            "id": item.get("id"),
            "name": task_name,
            "type": task_type,
            "parameters": parameters,
            "status": task_status or "Not Started",
            "last_run": self._get_property_value(item, "Last Run", "date"),
            "next_run": self._get_property_value(item, "Next Run", "date"),
            "frequency": self._get_property_value(item, "Frequency", "select") or "Once",
            "result_page": self._get_property_value(item, "Result Page", "relation")
        }
        
        return task
    
    def _infer_task_type(self, task_name: str) -> str:
        """
        Infer task type from task name.
        
        Args:
            task_name: Name of the task
            
        Returns:
            Inferred task type
        """
        if not task_name:
            return "unknown"
        
        task_name_lower = task_name.lower()
        
        for task_type, keywords in self.task_types.items():
            for keyword in keywords:
                if keyword in task_name_lower:
                    return task_type
        
        return "unknown"
    
    def _parse_parameters(self, params_str: str, task_name: str, task_type: str) -> Dict:
        """
        Parse parameters from string or infer from task name.
        
        Args:
            params_str: Parameters string (JSON or text)
            task_name: Name of the task
            task_type: Type of the task
            
        Returns:
            Parameters dictionary
        """
        # Try to parse as JSON
        if params_str:
            try:
                return json.loads(params_str)
            except json.JSONDecodeError:
                # Not valid JSON, treat as text
                pass
        
        # Infer parameters from task name and type
        parameters = {}
        
        if task_type == "conference":
            # Extract topics from task name
            topics = self._extract_topics(task_name)
            parameters["topics"] = topics
            parameters["timeframe"] = "upcoming"
        
        elif task_type == "research":
            # Extract topics from task name
            topics = self._extract_topics(task_name)
            parameters["topics"] = topics
            parameters["timeframe"] = "recent"
        
        elif task_type == "project":
            # Extract project name from task name
            project_name = task_name.replace("Track", "").replace("Monitor", "").strip()
            parameters["project_name"] = project_name
        
        elif task_type == "stakeholder":
            # Extract stakeholder info from task name
            stakeholder_name = task_name.replace("Contact", "").replace("Follow up with", "").strip()
            parameters["stakeholder_name"] = stakeholder_name
        
        return parameters
    
    def _extract_topics(self, text: str) -> List[str]:
        """
        Extract topics from text.
        
        Args:
            text: Text to extract topics from
            
        Returns:
            List of topics
        """
        # Remove common words
        common_words = ["track", "monitor", "update", "find", "search", "get", "list", "of", "on", "for", "about", "the", "and", "in"]
        
        # Split text into words
        words = text.split()
        
        # Remove common words and create topics
        topics = []
        current_topic = []
        
        for word in words:
            word_lower = word.lower().strip(",.;:()[]{}\"'")
            
            if word_lower not in common_words and word_lower:
                current_topic.append(word)
            elif current_topic:
                topics.append(" ".join(current_topic))
                current_topic = []
        
        # Add last topic if exists
        if current_topic:
            topics.append(" ".join(current_topic))
        
        # If no topics found, use default
        if not topics:
            if "AI" in text or "ai" in text.lower():
                topics.append("AI")
            if "game" in text.lower():
                topics.append("Game")
        
        return topics
    
    def _get_property_value(self, page: Dict, property_name: str, property_type: str) -> Any:
        """
        Extract property value from a Notion page.
        
        Args:
            page: Notion page dictionary
            property_name: Name of the property
            property_type: Type of the property (title, rich_text, etc.)
            
        Returns:
            Property value or None if not found
        """
        try:
            properties = page.get("properties", {})
            property_data = properties.get(property_name, {})
            
            if property_type == "title" or property_type == "rich_text":
                text_items = property_data.get(property_type, [])
                if text_items:
                    return text_items[0].get("text", {}).get("content")
            elif property_type == "select":
                return property_data.get("select", {}).get("name")
            elif property_type == "multi_select":
                return [item.get("name") for item in property_data.get("multi_select", [])]
            elif property_type == "date":
                return property_data.get("date", {}).get("start")
            elif property_type == "url":
                return property_data.get("url")
            elif property_type == "relation":
                relation_items = property_data.get("relation", [])
                if relation_items:
                    return relation_items[0].get("id")
            
            return None
        
        except Exception:
            return None


class TaskScheduler:
    """
    Schedules tasks based on priority and due dates.
    """
    
    def __init__(self, notion_helper, task_parser):
        """
        Initialize the task scheduler.
        
        Args:
            notion_helper: NotionHelper instance for Notion interactions
            task_parser: TaskParser instance for parsing tasks
        """
        self.notion_helper = notion_helper
        self.task_parser = task_parser
    
    def get_tasks_from_database(self, database_id: str) -> List[Dict]:
        """
        Get all tasks from a Notion database.
        
        Args:
            database_id: Notion database ID
            
        Returns:
            List of parsed tasks
        """
        # Get all items from database
        items = self.notion_helper.get_all_database_items(database_id)
        
        # Parse each item
        tasks = []
        for item in items:
            task = self.task_parser.parse_todo_item(item)
            tasks.append(task)
        
        return tasks
    
    def get_due_tasks(self, tasks: List[Dict]) -> List[Dict]:
        """
        Get tasks that are due for execution.
        
        Args:
            tasks: List of tasks
            
        Returns:
            List of due tasks
        """
        due_tasks = []
        now = datetime.now()
        
        for task in tasks:
            # Skip completed tasks
            if task.get("status") == "Complete":
                continue
            
            # Check if task is due
            next_run = task.get("next_run")
            if not next_run:
                # Task has never been run
                due_tasks.append(task)
                continue
            
            # Parse next run date
            try:
                next_run_date = datetime.strptime(next_run, "%Y-%m-%d")
                if next_run_date <= now:
                    due_tasks.append(task)
            except (ValueError, TypeError):
                # Invalid date format, consider due
                due_tasks.append(task)
        
        return due_tasks
    
    def update_task_status(self, task_id: str, status: str, result_page_id: Optional[str] = None) -> Dict:
        """
        Update task status and schedule next run.
        
        Args:
            task_id: Notion page ID of the task
            status: New status (In Progress, Complete, Error)
            result_page_id: ID of the result page
            
        Returns:
            Result of update operation
        """
        # Calculate next run date based on frequency
        task_page = self.notion_helper.api.read_page(task_id)
        task = self.task_parser.parse_todo_item(task_page)
        
        now = datetime.now()
        next_run = None
        
        if status != "Complete" or task.get("frequency") != "Once":
            frequency = task.get("frequency", "Once")
            
            if frequency == "Daily":
                next_run = now + timedelta(days=1)
            elif frequency == "Weekly":
                next_run = now + timedelta(weeks=1)
            elif frequency == "Monthly":
                next_run = now + timedelta(days=30)
            elif frequency == "Quarterly":
                next_run = now + timedelta(days=90)
            elif frequency == "Yearly":
                next_run = now + timedelta(days=365)
        
        # Create properties to update
        properties = {
            "Status": {
                "select": {
                    "name": status
                }
            },
            "Last Run": {
                "date": {
                    "start": now.strftime("%Y-%m-%d")
                }
            }
        }
        
        if next_run:
            properties["Next Run"] = {
                "date": {
                    "start": next_run.strftime("%Y-%m-%d")
                }
            }
        
        if result_page_id:
            properties["Result Page"] = {
                "relation": [
                    {
                        "id": result_page_id
                    }
                ]
            }
        
        # Update the task
        return self.notion_helper.api.update_page(task_id, properties)
