const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PerformanceTestRunner {
  constructor() {
    this.resultsDir = path.join(__dirname, 'results');
    this.reportsDir = path.join(__dirname, 'reports');
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async runLoadTests() {
    console.log('🚀 Starting Load Tests...');
    
    const scenarios = [
      {
        name: 'auth-load-test',
        script: 'auth-load.js',
        description: 'Authentication service load testing'
      },
      {
        name: 'content-load-test',
        script: 'content-load.js',
        description: 'Content service load testing'
      },
      {
        name: 'api-gateway-load-test',
        script: 'api-gateway-load.js',
        description: 'API Gateway load testing'
      }
    ];

    const results = [];

    for (const scenario of scenarios) {
      console.log(`\n📊 Running ${scenario.description}...`);
      
      try {
        const result = await this.runK6Test(scenario);
        results.push({
          scenario: scenario.name,
          success: true,
          result: result
        });
        console.log(`✅ ${scenario.name} completed successfully`);
      } catch (error) {
        console.error(`❌ ${scenario.name} failed:`, error.message);
        results.push({
          scenario: scenario.name,
          success: false,
          error: error.message
        });
      }
    }

    await this.generateLoadTestReport(results);
    return results;
  }

  async runStressTests() {
    console.log('🔥 Starting Stress Tests...');
    
    const stressScenarios = [
      {
        name: 'content-creation-stress',
        script: 'content-stress.js',
        description: 'Content creation stress testing'
      },
      {
        name: 'concurrent-users-stress',
        script: 'concurrent-stress.js',
        description: 'Concurrent users stress testing'
      }
    ];

    const results = [];

    for (const scenario of stressScenarios) {
      console.log(`\n🔨 Running ${scenario.description}...`);
      
      try {
        const result = await this.runK6Test(scenario, { stress: true });
        results.push({
          scenario: scenario.name,
          success: true,
          result: result
        });
        console.log(`✅ ${scenario.name} completed successfully`);
      } catch (error) {
        console.error(`❌ ${scenario.name} failed:`, error.message);
        results.push({
          scenario: scenario.name,
          success: false,
          error: error.message
        });
      }
    }

    await this.generateStressTestReport(results);
    return results;
  }

  async runK6Test(scenario, options = {}) {
    const scriptPath = path.join(__dirname, 'scripts', scenario.script);
    const resultPath = path.join(this.resultsDir, `${scenario.name}-${Date.now()}.json`);
    
    let command = `k6 run --out json=${resultPath}`;
    
    if (options.stress) {
      command += ' --stage 1m:100,2m:200,1m:300,2m:400,1m:0';
    }
    
    command += ` ${scriptPath}`;
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: 600000 // 10 minutes
      });
      
      // Parse results
      const resultData = fs.readFileSync(resultPath, 'utf8');
      const metrics = this.parseK6Results(resultData);
      
      return {
        output: output,
        metrics: metrics,
        resultFile: resultPath
      };
    } catch (error) {
      throw new Error(`K6 test failed: ${error.message}`);
    }
  }

  parseK6Results(resultData) {
    const lines = resultData.trim().split('\n');
    const metrics = {
      http_req_duration: [],
      http_req_rate: [],
      http_req_failed: [],
      vus: [],
      iterations: 0
    };

    lines.forEach(line => {
      try {
        const data = JSON.parse(line);
        if (data.type === 'Point' && data.metric) {
          switch (data.metric) {
            case 'http_req_duration':
              metrics.http_req_duration.push(data.data.value);
              break;
            case 'http_reqs':
              metrics.http_req_rate.push(data.data.value);
              break;
            case 'http_req_failed':
              metrics.http_req_failed.push(data.data.value);
              break;
            case 'vus':
              metrics.vus.push(data.data.value);
              break;
            case 'iterations':
              metrics.iterations += data.data.value;
              break;
          }
        }
      } catch (e) {
        // Skip invalid JSON lines
      }
    });

    return {
      avgResponseTime: this.calculateAverage(metrics.http_req_duration),
      maxResponseTime: Math.max(...metrics.http_req_duration),
      minResponseTime: Math.min(...metrics.http_req_duration),
      p95ResponseTime: this.calculatePercentile(metrics.http_req_duration, 95),
      errorRate: this.calculateAverage(metrics.http_req_failed) * 100,
      totalRequests: metrics.http_req_rate.reduce((sum, val) => sum + val, 0),
      maxVUs: Math.max(...metrics.vus),
      totalIterations: metrics.iterations
    };
  }

  calculateAverage(array) {
    if (array.length === 0) return 0;
    return array.reduce((sum, val) => sum + val, 0) / array.length;
  }

  calculatePercentile(array, percentile) {
    if (array.length === 0) return 0;
    const sorted = array.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  async generateLoadTestReport(results) {
    const reportPath = path.join(this.reportsDir, `load-test-report-${Date.now()}.html`);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 8px; }
        .scenario { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .success { border-left: 5px solid #4CAF50; }
        .failure { border-left: 5px solid #f44336; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .metric { background: #f9f9f9; padding: 10px; border-radius: 4px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #333; }
        .metric-label { font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Load Test Report</h1>
        <p>Generated on: ${new Date().toISOString()}</p>
        <p>Total Scenarios: ${results.length}</p>
        <p>Successful: ${results.filter(r => r.success).length}</p>
        <p>Failed: ${results.filter(r => !r.success).length}</p>
    </div>

    ${results.map(result => `
        <div class="scenario ${result.success ? 'success' : 'failure'}">
            <h3>${result.scenario}</h3>
            ${result.success ? `
                <div class="metrics">
                    <div class="metric">
                        <div class="metric-value">${result.result.metrics.avgResponseTime.toFixed(2)}ms</div>
                        <div class="metric-label">Avg Response Time</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${result.result.metrics.p95ResponseTime.toFixed(2)}ms</div>
                        <div class="metric-label">95th Percentile</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${result.result.metrics.errorRate.toFixed(2)}%</div>
                        <div class="metric-label">Error Rate</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${result.result.metrics.totalRequests}</div>
                        <div class="metric-label">Total Requests</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${result.result.metrics.maxVUs}</div>
                        <div class="metric-label">Max Virtual Users</div>
                    </div>
                </div>
            ` : `
                <div class="error">
                    <p><strong>Error:</strong> ${result.error}</p>
                </div>
            `}
        </div>
    `).join('')}
</body>
</html>`;

    fs.writeFileSync(reportPath, html);
    console.log(`📊 Load test report generated: ${reportPath}`);
  }

  async generateStressTestReport(results) {
    const reportPath = path.join(this.reportsDir, `stress-test-report-${Date.now()}.html`);
    
    // Similar to load test report but with stress-specific metrics
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Stress Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 8px; }
        .scenario { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .success { border-left: 5px solid #4CAF50; }
        .failure { border-left: 5px solid #f44336; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .metric { background: #f9f9f9; padding: 10px; border-radius: 4px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #333; }
        .metric-label { font-size: 12px; color: #666; }
        .breaking-point { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Stress Test Report</h1>
        <p>Generated on: ${new Date().toISOString()}</p>
        <p>Total Scenarios: ${results.length}</p>
    </div>

    ${results.map(result => `
        <div class="scenario ${result.success ? 'success' : 'failure'}">
            <h3>${result.scenario}</h3>
            ${result.success ? `
                <div class="metrics">
                    <div class="metric">
                        <div class="metric-value">${result.result.metrics.maxVUs}</div>
                        <div class="metric-label">Peak Concurrent Users</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${result.result.metrics.maxResponseTime.toFixed(2)}ms</div>
                        <div class="metric-label">Max Response Time</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${result.result.metrics.errorRate.toFixed(2)}%</div>
                        <div class="metric-label">Peak Error Rate</div>
                    </div>
                </div>
                <div class="breaking-point">
                    <strong>Breaking Point Analysis:</strong>
                    System performance degraded significantly at ${result.result.metrics.maxVUs} concurrent users
                    with error rate reaching ${result.result.metrics.errorRate.toFixed(2)}%
                </div>
            ` : `
                <div class="error">
                    <p><strong>Error:</strong> ${result.error}</p>
                </div>
            `}
        </div>
    `).join('')}
</body>
</html>`;

    fs.writeFileSync(reportPath, html);
    console.log(`🔥 Stress test report generated: ${reportPath}`);
  }

  async runMemoryLeakTests() {
    console.log('🧠 Starting Memory Leak Tests...');
    
    // This would typically use tools like clinic.js or 0x for Node.js memory profiling
    try {
      const command = 'node --expose-gc --inspect memory-leak-test.js';
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: path.join(__dirname, 'scripts'),
        timeout: 300000 // 5 minutes
      });
      
      console.log('✅ Memory leak test completed');
      return { success: true, output };
    } catch (error) {
      console.error('❌ Memory leak test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PerformanceTestRunner;
