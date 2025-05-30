"""
Research Article Parser Module

This module handles searching for and parsing research articles related to games and AI.
It updates the Notion database with article information.
"""

import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime
import json
from typing import List, Dict, Any, Optional
import time

class ResearchArticleParser:
    """
    Searches for and parses research articles on games and AI.
    """
    
    def __init__(self, notion_helper):
        """
        Initialize the research article parser.
        
        Args:
            notion_helper: NotionHelper instance for Notion interactions
        """
        self.notion_helper = notion_helper
        self.sources = [
            "https://arxiv.org/",
            "https://scholar.google.com/",
            "https://www.semanticscholar.org/",
            "https://www.researchgate.net/",
            "https://dl.acm.org/",
            "https://ieeexplore.ieee.org/"
        ]
    
    def search_research_articles(self, topics: List[str], timeframe: str = "recent") -> List[Dict]:
        """
        Search for research articles on specified topics.
        
        Args:
            topics: List of topics to search for
            timeframe: Time range to search (recent, this_month, this_year)
            
        Returns:
            List of article information dictionaries
        """
        all_articles = []
        
        for topic in topics:
            # Search arXiv
            arxiv_articles = self._search_arxiv(topic, timeframe)
            all_articles.extend(arxiv_articles)
            
            # Search Semantic Scholar
            semantic_articles = self._search_semantic_scholar(topic, timeframe)
            all_articles.extend(semantic_articles)
            
            # Add delay to avoid rate limiting
            time.sleep(1)
        
        # Remove duplicates based on title and URL
        unique_articles = self._remove_duplicates(all_articles)
        
        return unique_articles
    
    def _search_arxiv(self, topic: str, timeframe: str) -> List[Dict]:
        """
        Search arXiv for research articles.
        
        Args:
            topic: Topic to search for
            timeframe: Time range to search
            
        Returns:
            List of article information dictionaries
        """
        articles = []
        
        try:
            # Format the search URL
            search_query = f"{topic.replace(' ', '+')}"
            if "game" not in search_query.lower() and "ai" not in search_query.lower():
                search_query += "+AND+(game+OR+AI)"
            
            # Set sorting based on timeframe
            sort_by = "submittedDate"
            if timeframe == "recent":
                max_results = 20
            elif timeframe == "this_month":
                max_results = 50
            else:
                max_results = 100
            
            search_url = f"http://export.arxiv.org/api/query?search_query=all:{search_query}&start=0&max_results={max_results}&sortBy={sort_by}&sortOrder=descending"
            
            # Send request
            response = requests.get(search_url)
            if response.status_code != 200:
                print(f"Error searching arXiv: {response.status_code}")
                return articles
            
            # Parse XML
            soup = BeautifulSoup(response.text, 'xml')
            
            # Find entries
            entries = soup.find_all('entry')
            
            for entry in entries:
                # Extract article details
                title_elem = entry.find('title')
                title = title_elem.text.strip() if title_elem else ""
                
                # Skip if title doesn't contain relevant keywords
                if not self._is_relevant(title, topic):
                    continue
                
                # Extract other details
                url_elem = entry.find('id')
                url = url_elem.text.strip() if url_elem else ""
                
                published_elem = entry.find('published')
                published = published_elem.text.strip() if published_elem else ""
                
                summary_elem = entry.find('summary')
                summary = summary_elem.text.strip() if summary_elem else ""
                
                # Extract authors
                author_elems = entry.find_all('author')
                authors = [author.find('name').text.strip() for author in author_elems if author.find('name')]
                
                # Parse date
                pub_date = self._parse_date(published)
                
                # Filter by timeframe if needed
                if timeframe != "all" and not self._is_in_timeframe(pub_date, timeframe):
                    continue
                
                # Create article entry
                article = {
                    "title": title,
                    "url": url,
                    "authors": authors,
                    "publication_date": pub_date,
                    "summary": summary,
                    "source": "arXiv",
                    "topics": [topic],
                    "publication": "arXiv"
                }
                
                articles.append(article)
            
            return articles
        
        except Exception as e:
            print(f"Error searching arXiv: {str(e)}")
            return articles
    
    def _search_semantic_scholar(self, topic: str, timeframe: str) -> List[Dict]:
        """
        Search Semantic Scholar for research articles.
        
        Args:
            topic: Topic to search for
            timeframe: Time range to search
            
        Returns:
            List of article information dictionaries
        """
        articles = []
        
        try:
            # Format the search URL
            search_query = f"{topic.replace(' ', '+')}"
            if "game" not in search_query.lower() and "ai" not in search_query.lower():
                search_query += "+game+AI"
            
            # Set year filter based on timeframe
            year_filter = ""
            current_year = datetime.now().year
            if timeframe == "this_year":
                year_filter = f"&year={current_year}"
            
            search_url = f"https://api.semanticscholar.org/graph/v1/paper/search?query={search_query}&limit=20&fields=title,url,abstract,authors,year,venue{year_filter}"
            
            # Send request
            headers = {
                "Accept": "application/json"
            }
            response = requests.get(search_url, headers=headers)
            if response.status_code != 200:
                print(f"Error searching Semantic Scholar: {response.status_code}")
                return articles
            
            # Parse JSON
            data = response.json()
            
            for paper in data.get("data", []):
                # Extract article details
                title = paper.get("title", "")
                
                # Skip if title doesn't contain relevant keywords
                if not self._is_relevant(title, topic):
                    continue
                
                # Extract other details
                url = paper.get("url", "")
                abstract = paper.get("abstract", "")
                year = paper.get("year")
                venue = paper.get("venue", "")
                
                # Extract authors
                authors = [author.get("name", "") for author in paper.get("authors", [])]
                
                # Create publication date
                pub_date = f"{year}-01-01" if year else None
                
                # Filter by timeframe if needed
                if timeframe != "all" and not self._is_in_timeframe(pub_date, timeframe):
                    continue
                
                # Create article entry
                article = {
                    "title": title,
                    "url": url,
                    "authors": authors,
                    "publication_date": pub_date,
                    "summary": abstract,
                    "source": "Semantic Scholar",
                    "topics": [topic],
                    "publication": venue
                }
                
                articles.append(article)
            
            return articles
        
        except Exception as e:
            print(f"Error searching Semantic Scholar: {str(e)}")
            return articles
    
    def _is_relevant(self, title: str, topic: str) -> bool:
        """
        Check if an article title is relevant to the search topic.
        
        Args:
            title: Article title
            topic: Search topic
            
        Returns:
            True if relevant, False otherwise
        """
        # Convert to lowercase for case-insensitive matching
        title_lower = title.lower()
        topic_lower = topic.lower()
        
        # Check if topic keywords are in the title
        topic_keywords = topic_lower.split()
        
        # Check if any topic keyword is in the title
        for keyword in topic_keywords:
            if keyword in title_lower:
                return True
        
        # Check if title contains "game" or "AI" related terms
        game_terms = ["game", "gaming", "gameplay", "player", "ludology"]
        ai_terms = ["ai", "artificial intelligence", "machine learning", "neural", "deep learning"]
        
        has_game_term = any(term in title_lower for term in game_terms)
        has_ai_term = any(term in title_lower for term in ai_terms)
        
        # If topic is about games, require game term
        if any(term in topic_lower for term in game_terms):
            return has_game_term
        
        # If topic is about AI, require AI term
        if any(term in topic_lower for term in ai_terms):
            return has_ai_term
        
        # Otherwise, require either game or AI term
        return has_game_term or has_ai_term
    
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
            for fmt in ["%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d", "%b %d, %Y", "%d %b %Y", "%m/%d/%Y"]:
                try:
                    date_obj = datetime.strptime(date_str, fmt)
                    return date_obj.strftime("%Y-%m-%d")
                except ValueError:
                    continue
            
            # Try to extract year
            year_pattern = r'\b(19|20)\d{2}\b'
            match = re.search(year_pattern, date_str)
            if match:
                year = match.group(0)
                return f"{year}-01-01"
            
            return None
        
        except Exception:
            return None
    
    def _is_in_timeframe(self, date_str: Optional[str], timeframe: str) -> bool:
        """
        Check if a date is within the specified timeframe.
        
        Args:
            date_str: Date string in ISO format
            timeframe: Time range to check (recent, this_month, this_year)
            
        Returns:
            True if date is in timeframe, False otherwise
        """
        if not date_str:
            return False
        
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            now = datetime.now()
            
            if timeframe == "recent":
                # Last 30 days
                delta = now - date_obj
                return delta.days <= 30
            elif timeframe == "this_month":
                return date_obj.year == now.year and date_obj.month == now.month
            elif timeframe == "this_year":
                return date_obj.year == now.year
            else:
                return True  # "all" timeframe
        
        except Exception:
            return False
    
    def _remove_duplicates(self, articles: List[Dict]) -> List[Dict]:
        """
        Remove duplicate articles based on title and URL.
        
        Args:
            articles: List of article dictionaries
            
        Returns:
            Deduplicated list of articles
        """
        unique_articles = {}
        
        for article in articles:
            # Create a key based on title
            title = article.get("title", "").lower()
            if not title:
                continue
            
            key = title
            
            # If this is a new article or has more complete information, keep it
            if key not in unique_articles or self._is_more_complete(article, unique_articles[key]):
                unique_articles[key] = article
            else:
                # Merge topics if this is a duplicate with different topics
                existing_topics = set(unique_articles[key].get("topics", []))
                new_topics = set(article.get("topics", []))
                unique_articles[key]["topics"] = list(existing_topics.union(new_topics))
        
        return list(unique_articles.values())
    
    def _is_more_complete(self, article1: Dict, article2: Dict) -> bool:
        """
        Check if article1 has more complete information than article2.
        
        Args:
            article1: First article dictionary
            article2: Second article dictionary
            
        Returns:
            True if article1 is more complete, False otherwise
        """
        # Count non-None values in each article
        count1 = sum(1 for v in article1.values() if v is not None and v != "")
        count2 = sum(1 for v in article2.values() if v is not None and v != "")
        
        # Check if article1 has a summary and article2 doesn't
        has_summary1 = article1.get("summary") is not None and article1.get("summary") != ""
        has_summary2 = article2.get("summary") is not None and article2.get("summary") != ""
        
        if has_summary1 and not has_summary2:
            return True
        elif not has_summary1 and has_summary2:
            return False
        
        return count1 > count2
    
    def generate_summary(self, article_data: Dict) -> str:
        """
        Generate a concise summary of the article.
        
        Args:
            article_data: Article information dictionary
            
        Returns:
            Concise summary
        """
        # If article already has a summary, use it
        if article_data.get("summary"):
            # Truncate if too long
            summary = article_data.get("summary", "")
            if len(summary) > 500:
                return summary[:497] + "..."
            return summary
        
        # Otherwise, create a basic summary from available information
        title = article_data.get("title", "")
        authors = article_data.get("authors", [])
        publication = article_data.get("publication", "")
        date = article_data.get("publication_date", "")
        
        summary = f"This article titled '{title}' "
        
        if authors:
            if len(authors) == 1:
                summary += f"by {authors[0]} "
            elif len(authors) == 2:
                summary += f"by {authors[0]} and {authors[1]} "
            else:
                summary += f"by {authors[0]} et al. "
        
        if publication:
            summary += f"published in {publication} "
        
        if date:
            summary += f"on {date} "
        
        summary += "discusses topics related to "
        
        topics = article_data.get("topics", [])
        if topics:
          
(Content truncated due to size limit. Use line ranges to read in chunks)