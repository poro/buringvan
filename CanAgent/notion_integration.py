"""
Notion API Integration Layer

This module handles all interactions with the Notion API, including authentication,
reading from databases/pages, and writing results back to Notion.
"""

import os
import json
import time
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union

class NotionAPI:
    """
    Handles all interactions with the Notion API.
    """
    
    BASE_URL = "https://api.notion.com/v1"
    
    def __init__(self, api_key: str):
        """
        Initialize the Notion API client.
        
        Args:
            api_key: Notion API integration token
        """
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Notion-Version": "2022-06-28",  # Update to latest version as needed
            "Content-Type": "application/json"
        }
        self.rate_limit_remaining = 1000  # Default rate limit
        self.rate_limit_reset = time.time() + 60  # Default reset time
    
    def _handle_rate_limits(self):
        """Handle API rate limits by waiting if necessary."""
        current_time = time.time()
        if self.rate_limit_remaining <= 1 and current_time < self.rate_limit_reset:
            sleep_time = self.rate_limit_reset - current_time + 1
            print(f"Rate limit reached. Waiting for {sleep_time:.2f} seconds...")
            time.sleep(sleep_time)
    
    def _update_rate_limits(self, response):
        """Update rate limit information from response headers."""
        if "x-ratelimit-remaining" in response.headers:
            self.rate_limit_remaining = int(response.headers["x-ratelimit-remaining"])
        if "x-ratelimit-reset-time" in response.headers:
            self.rate_limit_reset = int(response.headers["x-ratelimit-reset-time"])
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """
        Make a request to the Notion API with rate limit handling.
        
        Args:
            method: HTTP method (GET, POST, PATCH, etc.)
            endpoint: API endpoint (without base URL)
            data: Request payload
            
        Returns:
            Response data as dictionary
        """
        self._handle_rate_limits()
        
        url = f"{self.BASE_URL}{endpoint}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=self.headers)
            elif method == "POST":
                response = requests.post(url, headers=self.headers, json=data)
            elif method == "PATCH":
                response = requests.patch(url, headers=self.headers, json=data)
            elif method == "DELETE":
                response = requests.delete(url, headers=self.headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            self._update_rate_limits(response)
            
            if response.status_code >= 400:
                print(f"Error: {response.status_code} - {response.text}")
                return {"error": response.text, "status_code": response.status_code}
            
            return response.json()
        
        except Exception as e:
            print(f"Request error: {str(e)}")
            return {"error": str(e)}
    
    def test_connection(self) -> bool:
        """
        Test the API connection and authentication.
        
        Returns:
            True if connection is successful, False otherwise
        """
        response = self._make_request("GET", "/users/me")
        return "error" not in response
    
    def read_database(self, database_id: str) -> Dict:
        """
        Retrieve database metadata.
        
        Args:
            database_id: Notion database ID
            
        Returns:
            Database metadata
        """
        return self._make_request("GET", f"/databases/{database_id}")
    
    def query_database(self, database_id: str, filter_params: Optional[Dict] = None, 
                      sorts: Optional[List] = None, start_cursor: Optional[str] = None,
                      page_size: int = 100) -> Dict:
        """
        Query a database with optional filters and sorting.
        
        Args:
            database_id: Notion database ID
            filter_params: Filter criteria
            sorts: Sort criteria
            start_cursor: Pagination cursor
            page_size: Number of results per page
            
        Returns:
            Query results
        """
        data = {
            "page_size": page_size
        }
        
        if filter_params:
            data["filter"] = filter_params
        
        if sorts:
            data["sorts"] = sorts
            
        if start_cursor:
            data["start_cursor"] = start_cursor
        
        return self._make_request("POST", f"/databases/{database_id}/query", data)
    
    def read_page(self, page_id: str) -> Dict:
        """
        Retrieve a page's content.
        
        Args:
            page_id: Notion page ID
            
        Returns:
            Page content
        """
        return self._make_request("GET", f"/pages/{page_id}")
    
    def get_block_children(self, block_id: str, start_cursor: Optional[str] = None) -> Dict:
        """
        Retrieve a block's children blocks.
        
        Args:
            block_id: Notion block ID (can be a page ID)
            start_cursor: Pagination cursor
            
        Returns:
            Block children
        """
        endpoint = f"/blocks/{block_id}/children"
        if start_cursor:
            endpoint += f"?start_cursor={start_cursor}"
        
        return self._make_request("GET", endpoint)
    
    def create_page(self, parent_id: str, is_database: bool, properties: Dict, 
                   children: Optional[List] = None) -> Dict:
        """
        Create a new page.
        
        Args:
            parent_id: Parent page or database ID
            is_database: True if parent is a database, False if parent is a page
            properties: Page properties
            children: Page content blocks
            
        Returns:
            Created page data
        """
        parent_type = "database_id" if is_database else "page_id"
        
        data = {
            "parent": {
                parent_type: parent_id
            },
            "properties": properties
        }
        
        if children:
            data["children"] = children
        
        return self._make_request("POST", "/pages", data)
    
    def update_page(self, page_id: str, properties: Dict) -> Dict:
        """
        Update page properties.
        
        Args:
            page_id: Notion page ID
            properties: Updated properties
            
        Returns:
            Updated page data
        """
        return self._make_request("PATCH", f"/pages/{page_id}", {"properties": properties})
    
    def append_blocks(self, block_id: str, children: List[Dict]) -> Dict:
        """
        Append blocks to a page or block.
        
        Args:
            block_id: Parent block ID (can be a page ID)
            children: Blocks to append
            
        Returns:
            Result of append operation
        """
        return self._make_request("PATCH", f"/blocks/{block_id}/children", {"children": children})
    
    def update_block(self, block_id: str, block_data: Dict) -> Dict:
        """
        Update a block's content.
        
        Args:
            block_id: Notion block ID
            block_data: Updated block data
            
        Returns:
            Updated block data
        """
        return self._make_request("PATCH", f"/blocks/{block_id}", block_data)
    
    def delete_block(self, block_id: str) -> Dict:
        """
        Delete a block.
        
        Args:
            block_id: Notion block ID
            
        Returns:
            Result of delete operation
        """
        return self._make_request("DELETE", f"/blocks/{block_id}")


class NotionHelper:
    """
    Helper class with utility functions for common Notion operations.
    """
    
    def __init__(self, api: NotionAPI):
        """
        Initialize the helper with a NotionAPI instance.
        
        Args:
            api: NotionAPI instance
        """
        self.api = api
    
    def get_all_database_items(self, database_id: str, filter_params: Optional[Dict] = None, 
                              sorts: Optional[List] = None) -> List[Dict]:
        """
        Get all items from a database, handling pagination.
        
        Args:
            database_id: Notion database ID
            filter_params: Filter criteria
            sorts: Sort criteria
            
        Returns:
            List of all database items
        """
        all_items = []
        has_more = True
        start_cursor = None
        
        while has_more:
            response = self.api.query_database(
                database_id, 
                filter_params=filter_params,
                sorts=sorts,
                start_cursor=start_cursor
            )
            
            if "error" in response:
                print(f"Error fetching database items: {response['error']}")
                break
            
            all_items.extend(response.get("results", []))
            has_more = response.get("has_more", False)
            start_cursor = response.get("next_cursor")
            
            if not has_more or not start_cursor:
                break
        
        return all_items
    
    def get_all_block_children(self, block_id: str) -> List[Dict]:
        """
        Get all children blocks, handling pagination.
        
        Args:
            block_id: Notion block ID (can be a page ID)
            
        Returns:
            List of all child blocks
        """
        all_blocks = []
        has_more = True
        start_cursor = None
        
        while has_more:
            response = self.api.get_block_children(block_id, start_cursor)
            
            if "error" in response:
                print(f"Error fetching block children: {response['error']}")
                break
            
            all_blocks.extend(response.get("results", []))
            has_more = response.get("has_more", False)
            start_cursor = response.get("next_cursor")
            
            if not has_more or not start_cursor:
                break
        
        return all_blocks
    
    def create_text_block(self, content: str, block_type: str = "paragraph") -> Dict:
        """
        Create a text block for page content.
        
        Args:
            content: Text content
            block_type: Block type (paragraph, heading_1, heading_2, etc.)
            
        Returns:
            Block data structure
        """
        return {
            "object": "block",
            "type": block_type,
            block_type: {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {
                            "content": content
                        }
                    }
                ]
            }
        }
    
    def create_heading_block(self, content: str, level: int = 1) -> Dict:
        """
        Create a heading block.
        
        Args:
            content: Heading text
            level: Heading level (1, 2, or 3)
            
        Returns:
            Heading block data
        """
        if level not in [1, 2, 3]:
            level = 1
        
        return self.create_text_block(content, f"heading_{level}")
    
    def create_bulleted_list_item(self, content: str) -> Dict:
        """
        Create a bulleted list item block.
        
        Args:
            content: List item text
            
        Returns:
            Bulleted list item block data
        """
        return self.create_text_block(content, "bulleted_list_item")
    
    def create_numbered_list_item(self, content: str) -> Dict:
        """
        Create a numbered list item block.
        
        Args:
            content: List item text
            
        Returns:
            Numbered list item block data
        """
        return self.create_text_block(content, "numbered_list_item")
    
    def create_to_do_item(self, content: str, checked: bool = False) -> Dict:
        """
        Create a to-do item block.
        
        Args:
            content: To-do item text
            checked: Whether the item is checked
            
        Returns:
            To-do item block data
        """
        block = self.create_text_block(content, "to_do")
        block["to_do"]["checked"] = checked
        return block
    
    def create_link_block(self, url: str, title: Optional[str] = None) -> Dict:
        """
        Create a bookmark block with a URL.
        
        Args:
            url: URL to bookmark
            title: Optional title for the bookmark
            
        Returns:
            Bookmark block data
        """
        block = {
            "object": "block",
            "type": "bookmark",
            "bookmark": {
                "url": url
            }
        }
        
        if title:
            block["bookmark"]["caption"] = [
                {
                    "type": "text",
                    "text": {
                        "content": title
                    }
                }
            ]
        
        return block
    
    def create_divider_block(self) -> Dict:
        """
        Create a divider block.
        
        Returns:
            Divider block data
        """
        return {
            "object": "block",
            "type": "divider",
            "divider": {}
        }
    
    def create_callout_block(self, content: str, icon: str = "💡") -> Dict:
        """
        Create a callout block.
        
        Args:
            content: Callout text
            icon: Emoji for the callout
            
        Returns:
            Callout block data
        """
        return {
            "object": "block",
            "type": "callout",
            "callout": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {
                            "content": content
                        }
                    }
                ],
                "icon": {
                    "type": "emoji",
                    "emoji": icon
                }
            }
        }
    
    def create_table_block(self, rows: List[List[str]]) -> List[Dict]:
        """
        Create a table with content.
        
        Args:
            rows: List of rows, where each row is a list of cell values
            
        Returns:
            List of blocks representing the table
        """
        if not rows or not rows[0]:
            return []
        
        num_columns = len(rows[0])
        table_block = {
            "object": "block",
            "type": "table",
            "table": {
                "table_width": num_columns,
                "has_column_header": True,
                "has_row_header": False,
                "children": []
            }
        }
        
        for row in rows:
            row_block = {
                "object": "block",
                "type": "table_row",
                "table_row": {
                    "cells": [
                        [{"type": "text", "text": {"content": cell}}] for cell in row
                    ]
                }
            }
            table_block["table"]["children"].append(row_block)
        
        return [table_block]
    
    def format_date_property(self, date_value: Union[str, datetime], include_time: bool = False) -> Dict:
        """
        Format a date for Notion properties.
        
        Args:
(Content truncated due to size limit. Use line ranges to read in chunks)