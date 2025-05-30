/**
 * tests/tasks.test.js
 * Tests for task modules
 */

// Mock dependencies
jest.mock('../src/notion/client');
jest.mock('../src/notion/helper');
jest.mock('axios');

const { TaskParser, TaskScheduler } = require('./parser');
const ConferenceTracker = require('./conference');
const ResearchArticleParser = require('./research');
const ProjectTracker = require('./project');
const StakeholderMonitoring = require('./stakeholder');

describe('Task Parser', () => {
  let taskParser;
  let mockHelper;
  
  beforeEach(() => {
    mockHelper = {
      getPropertyValue: jest.fn()
    };
    taskParser = new TaskParser(mockHelper);
  });
  
  test('should parse todo item', () => {
    // Mock helper responses
    mockHelper.getPropertyValue
      .mockReturnValueOnce('Test Task') // Name
      .mockReturnValueOnce('conference') // Type
      .mockReturnValueOnce('{"topics":["AI","Games"]}') // Parameters
      .mockReturnValueOnce('Not Started') // Status
      .mockReturnValueOnce('2023-01-01') // Last Run
      .mockReturnValueOnce('2023-02-01') // Next Run
      .mockReturnValueOnce('Weekly') // Frequency
      .mockReturnValueOnce('page-id'); // Result Page
    
    const item = { id: 'task-id' };
    const result = taskParser.parseTodoItem(item);
    
    expect(result.id).toBe('task-id');
    expect(result.name).toBe('Test Task');
    expect(result.type).toBe('conference');
    expect(result.parameters).toEqual({ topics: ['AI', 'Games'] });
    expect(result.status).toBe('Not Started');
    expect(result.frequency).toBe('Weekly');
  });
  
  test('should infer task type from name', () => {
    expect(taskParser._inferTaskType('Find AI conferences')).toBe('conference');
    expect(taskParser._inferTaskType('Track research papers on games')).toBe('research');
    expect(taskParser._inferTaskType('Monitor project progress')).toBe('project');
    expect(taskParser._inferTaskType('Follow up with stakeholder')).toBe('stakeholder');
    expect(taskParser._inferTaskType('Random task')).toBe('unknown');
  });
  
  test('should extract topics from text', () => {
    const topics = taskParser._extractTopics('Find AI conferences on machine learning');
    expect(topics).toContain('AI conferences');
    expect(topics).toContain('machine learning');
  });
});

describe('Task Scheduler', () => {
  let taskScheduler;
  let mockHelper;
  let mockParser;
  
  beforeEach(() => {
    mockHelper = {
      getAllDatabaseItems: jest.fn(),
      client: {
        readPage: jest.fn(),
        updatePage: jest.fn()
      }
    };
    mockParser = {
      parseTodoItem: jest.fn()
    };
    taskScheduler = new TaskScheduler(mockHelper, mockParser);
  });
  
  test('should get tasks from database', async () => {
    // Mock database items
    mockHelper.getAllDatabaseItems.mockResolvedValue([
      { id: 'task1' },
      { id: 'task2' }
    ]);
    
    // Mock parser results
    mockParser.parseTodoItem
      .mockReturnValueOnce({ id: 'task1', name: 'Task 1' })
      .mockReturnValueOnce({ id: 'task2', name: 'Task 2' });
    
    const tasks = await taskScheduler.getTasksFromDatabase('db-id');
    
    expect(tasks.length).toBe(2);
    expect(tasks[0].id).toBe('task1');
    expect(tasks[1].name).toBe('Task 2');
    expect(mockHelper.getAllDatabaseItems).toHaveBeenCalledWith('db-id');
  });
  
  test('should identify due tasks', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tasks = [
      { id: 'task1', status: 'Complete', nextRun: tomorrow.toISOString() },
      { id: 'task2', status: 'Not Started', nextRun: null },
      { id: 'task3', status: 'Not Started', nextRun: yesterday.toISOString() },
      { id: 'task4', status: 'Not Started', nextRun: tomorrow.toISOString() }
    ];
    
    const dueTasks = taskScheduler.getDueTasks(tasks);
    
    expect(dueTasks.length).toBe(2);
    expect(dueTasks[0].id).toBe('task2'); // No next run date
    expect(dueTasks[1].id).toBe('task3'); // Past next run date
  });
});

describe('Conference Tracker', () => {
  let conferenceTracker;
  let mockHelper;
  
  beforeEach(() => {
    mockHelper = {
      getAllDatabaseItems: jest.fn(),
      getPropertyValue: jest.fn(),
      client: {
        createPage: jest.fn(),
        updatePage: jest.fn(),
        appendBlocks: jest.fn(),
        deleteBlock: jest.fn()
      }
    };
    conferenceTracker = new ConferenceTracker(mockHelper);
    
    // Mock private methods for testing
    conferenceTracker._searchWikicfp = jest.fn();
    conferenceTracker._searchConferenceAlerts = jest.fn();
    conferenceTracker._searchAIDeadlines = jest.fn();
  });
  
  test('should search conferences across sources', async () => {
    // Mock search results
    conferenceTracker._searchWikicfp.mockResolvedValue([
      { name: 'Conf 1', source: 'WikiCFP' }
    ]);
    conferenceTracker._searchConferenceAlerts.mockResolvedValue([
      { name: 'Conf 2', source: 'Conference Alerts' }
    ]);
    conferenceTracker._searchAIDeadlines.mockResolvedValue([
      { name: 'Conf 3', source: 'AI Deadlines' }
    ]);
    
    const conferences = await conferenceTracker.searchConferences(['AI'], 'upcoming');
    
    expect(conferences.length).toBe(3);
    expect(conferences[0].name).toBe('Conf 1');
    expect(conferences[1].name).toBe('Conf 2');
    expect(conferences[2].name).toBe('Conf 3');
  });
  
  test('should parse date strings', () => {
    expect(conferenceTracker._parseDate('2023-01-15')).toBe('2023-01-15');
    expect(conferenceTracker._parseDate('Jan 15, 2023')).toBe('2023-01-15');
    expect(conferenceTracker._parseDate('15 Jan 2023')).toBe('2023-01-15');
  });
  
  test('should check if date is in timeframe', () => {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + 30);
    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - 30);
    
    expect(conferenceTracker._isInTimeframe(futureDate.toISOString().split('T')[0], 'upcoming')).toBe(true);
    expect(conferenceTracker._isInTimeframe(pastDate.toISOString().split('T')[0], 'upcoming')).toBe(false);
  });
});

// Additional tests for other modules would follow similar patterns
describe('Research Article Parser', () => {
  let researchParser;
  
  beforeEach(() => {
    const mockHelper = {
      getAllDatabaseItems: jest.fn(),
      getPropertyValue: jest.fn(),
      client: {
        createPage: jest.fn(),
        updatePage: jest.fn(),
        appendBlocks: jest.fn(),
        deleteBlock: jest.fn()
      }
    };
    researchParser = new ResearchArticleParser(mockHelper);
    
    // Mock private methods for testing
    researchParser._searchArxiv = jest.fn();
    researchParser._searchSemanticScholar = jest.fn();
  });
  
  test('should generate article summary', () => {
    const article = {
      title: 'Test Article',
      authors: ['Author One', 'Author Two'],
      publication: 'Test Journal',
      publicationDate: '2023-01-15',
      summary: null,
      topics: ['AI', 'Games']
    };
    
    const summary = researchParser.generateSummary(article);
    
    expect(summary).toContain('Test Article');
    expect(summary).toContain('Author One and Author Two');
    expect(summary).toContain('Test Journal');
    expect(summary).toContain('2023-01-15');
    expect(summary).toContain('AI, Games');
  });
  
  test('should check if article is relevant', () => {
    expect(researchParser._isRelevant('AI in Game Development', 'AI')).toBe(true);
    expect(researchParser._isRelevant('Machine Learning Applications', 'AI')).toBe(true);
    expect(researchParser._isRelevant('Database Optimization', 'AI')).toBe(false);
  });
});

describe('Project Tracker', () => {
  let projectTracker;
  
  beforeEach(() => {
    const mockHelper = {
      getAllDatabaseItems: jest.fn(),
      getPropertyValue: jest.fn(),
      client: {
        createPage: jest.fn(),
        updatePage: jest.fn(),
        appendBlocks: jest.fn(),
        deleteBlock: jest.fn()
      }
    };
    projectTracker = new ProjectTracker(mockHelper);
  });
  
  test('should generate project summary', () => {
    const projectData = {
      name: 'Test Project',
      status: 'In Progress',
      blockers: [{ description: 'Test blocker' }]
    };
    
    const milestoneData = {
      totalMilestones: 4,
      completedMilestones: 2,
      progressPercentage: 50,
      overdueMilestones: [{ name: 'Overdue milestone' }],
      upcomingMilestones: []
    };
    
    const summary = projectTracker._generateSummary(projectData, milestoneData);
    
    expect(summary).toContain('Test Project');
    expect(summary).toContain('In Progress');
    expect(summary).toContain('50%');
    expect(summary).toContain('2 of 4 milestones');
    expect(summary).toContain('1 overdue milestone');
    expect(summary).toContain('1 blocker');
  });
  
  test('should generate recommendations', () => {
    const projectData = {
      blockers: [{ description: 'Test blocker' }]
    };
    
    const milestoneData = {
      progressPercentage: 50,
      overdueMilestones: [{ name: 'Overdue milestone' }],
      upcomingMilestones: [{ name: 'Upcoming milestone' }]
    };
    
    const recommendations = projectTracker._generateRecommendations(projectData, milestoneData);
    
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations).toContain(expect.stringContaining('overdue milestones'));
    expect(recommendations).toContain(expect.stringContaining('upcoming milestones'));
    expect(recommendations).toContain(expect.stringContaining('blockers'));
  });
});

describe('Stakeholder Monitoring', () => {
  let stakeholderMonitor;
  
  beforeEach(() => {
    const mockHelper = {
      getAllDatabaseItems: jest.fn(),
      getPropertyValue: jest.fn(),
      client: {
        createPage: jest.fn(),
        updatePage: jest.fn(),
        appendBlocks: jest.fn(),
        deleteBlock: jest.fn()
      }
    };
    stakeholderMonitor = new StakeholderMonitoring(mockHelper);
  });
  
  test('should identify stakeholders needing follow-up', async () => {
    const now = new Date();
    const fifteenDaysAgo = new Date(now);
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    const stakeholders = [
      {
        name: 'Stakeholder 1',
        lastContact: fifteenDaysAgo.toISOString().split('T')[0],
        nextScheduledContact: null,
        interactions: []
      },
      {
        name: 'Stakeholder 2',
        lastContact: now.toISOString().split('T')[0],
        nextScheduledContact: null,
        interactions: [
          {
            date: now.toISOString().split('T')[0],
            sentiment: 'Concerned'
          }
        ]
      }
    ];
    
    const followupNeeded = await stakeholderMonitor.identifyFollowupNeeded(stakeholders);
    
    expect(followupNeeded.length).toBe(2);
    expect(followupNeeded[0].stakeholder).toBe('Stakeholder 1');
    expect(followupNeeded[0].reason).toContain('15 days ago');
    expect(followupNeeded[1].stakeholder).toBe('Stakeholder 2');
    expect(followupNeeded[1].reason).toContain('negative sentiment');
  });
  
  test('should determine follow-up priority', () => {
    expect(stakeholderMonitor._determineFollowupPriority(31, false, false, false)).toBe('High');
    expect(stakeholderMonitor._determineFollowupPriority(10, false, true, false)).toBe('High');
    expect(stakeholderMonitor._determineFollowupPriority(10, false, false, true)).toBe('High');
    expect(stakeholderMonitor._determineFollowupPriority(20, true, false, false)).toBe('Medium');
    expect(stakeholderMonitor._determineFollowupPriority(5, false, false, false)).toBe('Low');
  });
});
