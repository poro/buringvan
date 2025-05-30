"""
Conference Tracker Module

This module handles searching for and tracking conferences related to specified topics.
It updates the Notion database with conference information.
"""

import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime
import json
from typing import List, Dict, Any, Optional

class ConferenceTracker:
    """
    Tracks conferences on specified topics and updates Notion database.
    """
    
    def __init__(self, notion_helper):
        """
        Initialize the conference tracker.
        
        Args:
            notion_helper: NotionHelper instance for Notion interactions
        """
        self.notion_helper = notion_helper
        self.sources = [
            "https://www.wikicfp.com/cfp/",
            "https://conferencealerts.com/",
            "https://aideadlin.es/",
            "https://www.acm.org/conferences",
            "https://www.ieee.org/conferences/index.html"
        ]
    
    def search_conferences(self, topics: List[str], timeframe: str = "upcoming") -> List[Dict]:
        """
        Search for conferences on specified topics.
        
        Args:
            topics: List of topics to search for
            timeframe: Time range to search (upcoming, this_month, this_year)
            
        Returns:
            List of conference information dictionaries
        """
        all_conferences = []
        
        for topic in topics:
            # Search WikiCFP
            wikicfp_conferences = self._search_wikicfp(topic, timeframe)
            all_conferences.extend(wikicfp_conferences)
            
            # Search Conference Alerts
            confalerts_conferences = self._search_conferencealerts(topic, timeframe)
            all_conferences.extend(confalerts_conferences)
            
            # Search AI Deadlines if topic is related to AI
            if any(ai_term in topic.lower() for ai_term in ["ai", "artificial intelligence", "machine learning", "deep learning", "neural"]):
                aideadlines_conferences = self._search_aideadlines(timeframe)
                all_conferences.extend(aideadlines_conferences)
        
        # Remove duplicates based on conference name and date
        unique_conferences = self._remove_duplicates(all_conferences)
        
        return unique_conferences
    
    def _search_wikicfp(self, topic: str, timeframe: str) -> List[Dict]:
        """
        Search WikiCFP for conferences.
        
        Args:
            topic: Topic to search for
            timeframe: Time range to search
            
        Returns:
            List of conference information dictionaries
        """
        conferences = []
        
        try:
            # Format the search URL
            search_url = f"https://www.wikicfp.com/cfp/servlet/tool.search?q={topic.replace(' ', '+')}&year=f"
            
            # Send request
            response = requests.get(search_url)
            if response.status_code != 200:
                print(f"Error searching WikiCFP: {response.status_code}")
                return conferences
            
            # Parse HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find conference table
            tables = soup.find_all('table', class_='conftable')
            if not tables:
                return conferences
            
            # Process conference rows
            rows = tables[0].find_all('tr')[1:]  # Skip header row
            
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 5:
                    # Extract conference details
                    conf_name = cells[0].text.strip()
                    conf_link = cells[0].find('a')
                    conf_url = f"https://www.wikicfp.com{conf_link['href']}" if conf_link else ""
                    
                    # Extract dates
                    when = cells[1].text.strip()
                    where = cells[2].text.strip()
                    deadline = cells[3].text.strip()
                    
                    # Parse dates
                    conf_dates = self._parse_date_range(when)
                    deadline_date = self._parse_date(deadline)
                    
                    # Filter by timeframe if needed
                    if timeframe != "all" and not self._is_in_timeframe(conf_dates.get("start"), timeframe):
                        continue
                    
                    # Create conference entry
                    conference = {
                        "name": conf_name,
                        "url": conf_url,
                        "start_date": conf_dates.get("start"),
                        "end_date": conf_dates.get("end"),
                        "location": where,
                        "submission_deadline": deadline_date,
                        "source": "WikiCFP",
                        "topics": [topic]
                    }
                    
                    conferences.append(conference)
            
            return conferences
        
        except Exception as e:
            print(f"Error searching WikiCFP: {str(e)}")
            return conferences
    
    def _search_conferencealerts(self, topic: str, timeframe: str) -> List[Dict]:
        """
        Search Conference Alerts for conferences.
        
        Args:
            topic: Topic to search for
            timeframe: Time range to search
            
        Returns:
            List of conference information dictionaries
        """
        conferences = []
        
        try:
            # Format the search URL
            search_url = f"https://conferencealerts.com/search?search_string={topic.replace(' ', '+')}"
            
            # Send request
            response = requests.get(search_url)
            if response.status_code != 200:
                print(f"Error searching Conference Alerts: {response.status_code}")
                return conferences
            
            # Parse HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find conference listings
            listings = soup.find_all('div', class_='eventBlock')
            
            for listing in listings:
                # Extract conference details
                title_elem = listing.find('h3')
                if not title_elem:
                    continue
                
                conf_name = title_elem.text.strip()
                conf_link = title_elem.find('a')
                conf_url = conf_link['href'] if conf_link else ""
                
                # Extract dates and location
                date_elem = listing.find('div', class_='eventDate')
                location_elem = listing.find('div', class_='eventLocation')
                
                when = date_elem.text.strip() if date_elem else ""
                where = location_elem.text.strip() if location_elem else ""
                
                # Parse dates
                conf_dates = self._parse_date_range(when)
                
                # Filter by timeframe if needed
                if timeframe != "all" and not self._is_in_timeframe(conf_dates.get("start"), timeframe):
                    continue
                
                # Create conference entry
                conference = {
                    "name": conf_name,
                    "url": conf_url,
                    "start_date": conf_dates.get("start"),
                    "end_date": conf_dates.get("end"),
                    "location": where,
                    "submission_deadline": None,  # Not provided in search results
                    "source": "Conference Alerts",
                    "topics": [topic]
                }
                
                conferences.append(conference)
            
            return conferences
        
        except Exception as e:
            print(f"Error searching Conference Alerts: {str(e)}")
            return conferences
    
    def _search_aideadlines(self, timeframe: str) -> List[Dict]:
        """
        Get AI conference deadlines from aideadlin.es.
        
        Args:
            timeframe: Time range to search
            
        Returns:
            List of conference information dictionaries
        """
        conferences = []
        
        try:
            # AI Deadlines provides a JSON API
            response = requests.get("https://aideadlin.es/data/ai_deadlines.json")
            if response.status_code != 200:
                print(f"Error fetching AI Deadlines: {response.status_code}")
                return conferences
            
            data = response.json()
            
            for conf in data.get("conferences", []):
                # Extract conference details
                conf_name = conf.get("title", "")
                conf_url = conf.get("url", "")
                
                # Extract dates
                deadline = conf.get("deadline", "")
                date = conf.get("date", "")
                
                # Parse dates
                deadline_date = self._parse_date(deadline)
                conf_dates = self._parse_date_range(date)
                
                # Filter by timeframe if needed
                if timeframe != "all" and not self._is_in_timeframe(conf_dates.get("start"), timeframe):
                    continue
                
                # Create conference entry
                conference = {
                    "name": conf_name,
                    "url": conf_url,
                    "start_date": conf_dates.get("start"),
                    "end_date": conf_dates.get("end"),
                    "location": conf.get("place", ""),
                    "submission_deadline": deadline_date,
                    "source": "AI Deadlines",
                    "topics": ["AI", "Machine Learning"]
                }
                
                conferences.append(conference)
            
            return conferences
        
        except Exception as e:
            print(f"Error fetching AI Deadlines: {str(e)}")
            return conferences
    
    def _parse_date(self, date_str: str) -> Optional[str]:
        """
        Parse a date string into ISO format.
        
        Args:
            date_str: Date string to parse
            
        Returns:
            ISO format date string or None if parsing fails
        """
        if not date_str:
            return None
        
        try:
            # Try common formats
            for fmt in ["%b %d, %Y", "%d %b %Y", "%Y-%m-%d", "%m/%d/%Y"]:
                try:
                    date_obj = datetime.strptime(date_str, fmt)
                    return date_obj.strftime("%Y-%m-%d")
                except ValueError:
                    continue
            
            # Try to extract date using regex
            date_pattern = r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})'
            match = re.search(date_pattern, date_str)
            if match:
                day, month, year = match.groups()
                if len(year) == 2:
                    year = f"20{year}"
                date_obj = datetime(int(year), int(month), int(day))
                return date_obj.strftime("%Y-%m-%d")
            
            return None
        
        except Exception:
            return None
    
    def _parse_date_range(self, date_range_str: str) -> Dict[str, Optional[str]]:
        """
        Parse a date range string into start and end dates.
        
        Args:
            date_range_str: Date range string to parse
            
        Returns:
            Dictionary with start and end dates in ISO format
        """
        result = {"start": None, "end": None}
        
        if not date_range_str:
            return result
        
        try:
            # Check for range separator
            if " - " in date_range_str:
                start_str, end_str = date_range_str.split(" - ")
                result["start"] = self._parse_date(start_str)
                result["end"] = self._parse_date(end_str)
            else:
                # Single date
                result["start"] = self._parse_date(date_range_str)
                result["end"] = result["start"]
            
            return result
        
        except Exception:
            return result
    
    def _is_in_timeframe(self, date_str: Optional[str], timeframe: str) -> bool:
        """
        Check if a date is within the specified timeframe.
        
        Args:
            date_str: Date string in ISO format
            timeframe: Time range to check (upcoming, this_month, this_year)
            
        Returns:
            True if date is in timeframe, False otherwise
        """
        if not date_str:
            return False
        
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            now = datetime.now()
            
            if timeframe == "upcoming":
                return date_obj >= now
            elif timeframe == "this_month":
                return date_obj.year == now.year and date_obj.month == now.month
            elif timeframe == "this_year":
                return date_obj.year == now.year
            else:
                return True  # "all" timeframe
        
        except Exception:
            return False
    
    def _remove_duplicates(self, conferences: List[Dict]) -> List[Dict]:
        """
        Remove duplicate conferences based on name and date.
        
        Args:
            conferences: List of conference dictionaries
            
        Returns:
            Deduplicated list of conferences
        """
        unique_conferences = {}
        
        for conf in conferences:
            # Create a key based on name and start date
            key = f"{conf['name']}_{conf.get('start_date', '')}"
            
            # If this is a new conference or has more complete information, keep it
            if key not in unique_conferences or self._is_more_complete(conf, unique_conferences[key]):
                unique_conferences[key] = conf
            else:
                # Merge topics if this is a duplicate with different topics
                existing_topics = set(unique_conferences[key].get("topics", []))
                new_topics = set(conf.get("topics", []))
                unique_conferences[key]["topics"] = list(existing_topics.union(new_topics))
        
        return list(unique_conferences.values())
    
    def _is_more_complete(self, conf1: Dict, conf2: Dict) -> bool:
        """
        Check if conf1 has more complete information than conf2.
        
        Args:
            conf1: First conference dictionary
            conf2: Second conference dictionary
            
        Returns:
            True if conf1 is more complete, False otherwise
        """
        # Count non-None values in each conference
        count1 = sum(1 for v in conf1.values() if v is not None)
        count2 = sum(1 for v in conf2.values() if v is not None)
        
        return count1 > count2
    
    def update_conference_database(self, database_id: str, conferences: List[Dict]) -> List[str]:
        """
        Update Notion database with conference information.
        
        Args:
            database_id: Notion database ID
            conferences: List of conference dictionaries
            
        Returns:
            List of updated/created page IDs
        """
        updated_ids = []
        
        # Get existing conferences from database
        existing_conferences = self.notion_helper.get_all_database_items(database_id)
        existing_map = {}
        
        # Create a map of existing conferences by name
        for conf in existing_conferences:
            name = self._get_property_value(conf, "Name", "title")
            if name:
                existing_map[name] = conf
        
  
(Content truncated due to size limit. Use line ranges to read in chunks)