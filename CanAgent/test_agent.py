"""
Test Script for Notion Agent System

This script tests the Notion Agent System with a sample todo list.
"""

import os
import json
import time
from datetime import datetime
from dotenv import load_dotenv

# Import the agent system
from main import NotionAgentSystem

# Load environment variables from .env file if it exists
load_dotenv()

# Configuration
API_KEY = os.getenv("NOTION_API_KEY", "test_api_key")
TODO_DATABASE_ID = os.getenv("TODO_DATABASE_ID", "test_todo_db")
CONFERENCE_DATABASE_ID = os.getenv("CONFERENCE_DATABASE_ID", "test_conference_db")
RESEARCH_DATABASE_ID = os.getenv("RESEARCH_DATABASE_ID", "test_research_db")

# Mock data for testing without actual API keys
MOCK_MODE = True

class MockNotionAPI:
    """Mock Notion API for testing without actual API keys."""
    
    def __init__(self):
        self.databases = {
            "test_todo_db": {
                "items": [
                    {
                        "id": "task1",
                        "properties": {
                            "Name": {"title": [{"text": {"content": "Track AI conferences"}}]},
                            "Type": {"select": {"name": "conference"}},
                            "Parameters": {"rich_text": [{"text": {"content": '{"topics": ["AI", "Machine Learning"], "timeframe": "upcoming"}'}}]},
                            "Status": {"select": {"name": "Not Started"}},
                            "Frequency": {"select": {"name": "Monthly"}}
                        }
                    },
                    {
                        "id": "task2",
                        "properties": {
                            "Name": {"title": [{"text": {"content": "Find research on game AI"}}]},
                            "Type": {"select": {"name": "research"}},
                            "Parameters": {"rich_text": [{"text": {"content": '{"topics": ["Game AI", "Reinforcement Learning"], "timeframe": "recent"}'}}]},
                            "Status": {"select": {"name": "Not Started"}},
                            "Frequency": {"select": {"name": "Weekly"}}
                        }
                    }
                ]
            },
            "test_conference_db": {"items": []},
            "test_research_db": {"items": []}
        }
        self.pages = {}
        self.blocks = {}
    
    def test_connection(self):
        return True
    
    def read_database(self, database_id):
        if database_id in self.databases:
            return {"id": database_id, "title": [{"text": {"content": "Test Database"}}]}
        return {"error": "Database not found"}
    
    def query_database(self, database_id, **kwargs):
        if database_id in self.databases:
            return {"results": self.databases[database_id]["items"], "has_more": False}
        return {"error": "Database not found", "results": []}
    
    def read_page(self, page_id):
        if page_id in self.pages:
            return self.pages[page_id]
        return {"id": page_id, "properties": {"Name": {"title": [{"text": {"content": "Test Page"}}]}}}
    
    def get_block_children(self, block_id, **kwargs):
        if block_id in self.blocks:
            return {"results": self.blocks[block_id], "has_more": False}
        return {"results": [], "has_more": False}
    
    def create_page(self, parent_id, is_database, properties, children=None):
        page_id = f"page_{len(self.pages) + 1}"
        self.pages[page_id] = {
            "id": page_id,
            "parent": {"database_id" if is_database else "page_id": parent_id},
            "properties": properties
        }
        if children:
            self.blocks[page_id] = children
        return {"id": page_id}
    
    def update_page(self, page_id, properties):
        if page_id in self.pages:
            self.pages[page_id]["properties"].update(properties)
        else:
            self.pages[page_id] = {"id": page_id, "properties": properties}
        return {"id": page_id}
    
    def append_blocks(self, block_id, children):
        if block_id not in self.blocks:
            self.blocks[block_id] = []
        self.blocks[block_id].extend(children)
        return {"id": block_id}
    
    def update_block(self, block_id, block_data):
        return {"id": block_id}
    
    def delete_block(self, block_id):
        if block_id in self.blocks:
            del self.blocks[block_id]
        return {"id": block_id}

# Mock the conference and research modules for testing
def mock_conference_tracker(topics, timeframe):
    return [
        {
            "name": "International Conference on AI and Games",
            "url": "https://example.com/conf1",
            "start_date": "2025-08-15",
            "end_date": "2025-08-18",
            "location": "Virtual",
            "submission_deadline": "2025-06-01",
            "source": "Test",
            "topics": topics
        },
        {
            "name": "Machine Learning Summit",
            "url": "https://example.com/conf2",
            "start_date": "2025-09-10",
            "end_date": "2025-09-12",
            "location": "New York, USA",
            "submission_deadline": "2025-07-15",
            "source": "Test",
            "topics": topics
        }
    ]

def mock_research_articles(topics, timeframe):
    return [
        {
            "title": "Advances in Game AI: A Comprehensive Survey",
            "url": "https://example.com/paper1",
            "authors": ["John Smith", "Jane Doe"],
            "publication_date": "2025-04-15",
            "summary": "This paper provides a comprehensive survey of recent advances in game AI.",
            "source": "Test",
            "topics": topics,
            "publication": "Journal of AI Research"
        },
        {
            "title": "Reinforcement Learning for Strategic Games",
            "url": "https://example.com/paper2",
            "authors": ["Alice Johnson", "Bob Brown"],
            "publication_date": "2025-05-01",
            "summary": "This paper explores the application of reinforcement learning to strategic games.",
            "source": "Test",
            "topics": topics,
            "publication": "Conference on Neural Information Processing Systems"
        }
    ]

def run_tests():
    """Run tests for the Notion Agent System."""
    print("Starting Notion Agent System tests...")
    
    if MOCK_MODE:
        print("Running in mock mode (no actual API calls)")
        
        # Create a mock agent system
        agent = NotionAgentSystem(
            API_KEY,
            TODO_DATABASE_ID,
            CONFERENCE_DATABASE_ID,
            RESEARCH_DATABASE_ID
        )
        
        # Replace API with mock
        agent.notion_api = MockNotionAPI()
        agent.notion_helper.api = agent.notion_api
        
        # Mock the conference tracker
        original_search_conferences = agent.conference_tracker.search_conferences
        agent.conference_tracker.search_conferences = lambda topics, timeframe: mock_conference_tracker(topics, timeframe)
        
        # Mock the research parser
        original_search_research_articles = agent.research_parser.search_research_articles
        agent.research_parser.search_research_articles = lambda topics, timeframe: mock_research_articles(topics, timeframe)
    else:
        # Use actual API keys
        if API_KEY == "test_api_key" or TODO_DATABASE_ID == "test_todo_db":
            print("Error: Actual API keys not provided. Set environment variables or .env file.")
            return
        
        # Create the agent system with actual credentials
        agent = NotionAgentSystem(
            API_KEY,
            TODO_DATABASE_ID,
            CONFERENCE_DATABASE_ID,
            RESEARCH_DATABASE_ID
        )
    
    # Test connection
    print("\nTesting connection to Notion API...")
    if agent.test_connection():
        print("✅ Successfully connected to Notion API")
    else:
        print("❌ Failed to connect to Notion API")
        return
    
    # Run the agent
    print("\nRunning agent system...")
    results = agent.run()
    
    # Print results
    print("\nExecution results:")
    for i, result in enumerate(results):
        print(f"\nTask {i+1}:")
        print(f"  Status: {result.get('status')}")
        print(f"  Message: {result.get('message')}")
        print(f"  Result Page: {result.get('result_page_id')}")
    
    # Print log
    print("\nExecution log:")
    for entry in agent.get_log():
        print(f"  {entry.get('timestamp')}: {entry.get('task')} - {entry.get('result')}")
    
    if MOCK_MODE:
        # Print mock database state
        print("\nMock database state after execution:")
        print(f"  Todo database: {len(agent.notion_api.databases['test_todo_db']['items'])} items")
        print(f"  Pages created: {len(agent.notion_api.pages)} pages")
        print(f"  Blocks created: {len(agent.notion_api.blocks)} block sets")
        
        # Restore original methods if we mocked them
        agent.conference_tracker.search_conferences = original_search_conferences
        agent.research_parser.search_research_articles = original_search_research_articles
    
    print("\nTests completed!")

if __name__ == "__main__":
    run_tests()
