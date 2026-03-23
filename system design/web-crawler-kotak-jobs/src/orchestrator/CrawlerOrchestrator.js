import { createFetcher } from '../fetchers/HTTPFetcher.js';
import JobParser from '../parsers/JobParser.js';
import JobRepository from '../repositories/JobRepository.js';
import Logger from '../utils/logger.js';
import config from '../config/config.js';

// Facade Pattern for orchestrating crawler operations
class CrawlerOrchestrator {
  constructor(dbClient, redisClient) {
    this.dbClient = dbClient;
    this.redisClient = redisClient;
    this.fetcher = createFetcher(redisClient);
    this.parser = new JobParser();
    this.jobRepository = new JobRepository(dbClient, config.mongodb.database);
    this.logger = Logger.getInstance();
    
    this.crawlMetrics = {
      totalUrls: 0,
      successfulFetches: 0,
      failedFetches: 0,
      jobsExtracted: 0,
      jobsSaved: 0,
      startTime: null,
      endTime: null,
    };
  }

  async initialize() {
    try {
      await this.jobRepository.initializeIndexes();
      this.logger.info('Crawler orchestrator initialized');
    } catch (error) {
      this.logger.error('Failed to initialize crawler orchestrator', {
        error: error.message,
      });
      throw error;
    }
  }

  async startCrawl(startUrl, options = {}) {
    const crawlId = this.generateCrawlId();
    this.logger.info(`Starting crawl ${crawlId}`, { startUrl, options });

    this.crawlMetrics = {
      crawlId,
      totalUrls: 0,
      successfulFetches: 0,
      failedFetches: 0,
      jobsExtracted: 0,
      jobsSaved: 0,
      startTime: new Date(),
      endTime: null,
    };

    const visitedUrls = new Set();
    const urlQueue = [startUrl];
    const maxPages = options.maxPages || config.parser.pagination.maxPages;
    let pageCount = 0;

    try {
      while (urlQueue.length > 0 && pageCount < maxPages) {
        const url = urlQueue.shift();
        
        if (visitedUrls.has(url)) {
          continue;
        }

        visitedUrls.add(url);
        pageCount++;
        this.crawlMetrics.totalUrls++;

        try {
          const result = await this.fetchUrl(url);
          this.crawlMetrics.successfulFetches++;

          const jobs = this.parser.parse(result.data);
          this.crawlMetrics.jobsExtracted += jobs.length;

          // Save jobs
          if (jobs.length > 0) {
            await this.jobRepository.bulkSave(jobs);
            this.crawlMetrics.jobsSaved += jobs.length;
          }

          // Extract pagination
          const pagination = this.parser.parsePagination(result.data, url);
          if (pagination.hasNextPage && pagination.nextUrl) {
            urlQueue.push(pagination.nextUrl);
          }

          this.logger.info(`Crawled page ${pageCount}: ${url}`, {
            jobsFound: jobs.length,
            hasNextPage: pagination.hasNextPage,
          });

        } catch (error) {
          this.crawlMetrics.failedFetches++;
          this.logger.error(`Failed to crawl ${url}`, {
            error: error.message,
            pageCount,
          });
        }
      }

      this.crawlMetrics.endTime = new Date();
      await this.logCrawlSummary(crawlId);

      return this.crawlMetrics;
    } catch (error) {
      this.crawlMetrics.endTime = new Date();
      this.logger.error(`Crawl ${crawlId} failed`, { error: error.message });
      throw error;
    }
  }

  async fetchUrl(url) {
    this.logger.debug(`Fetching URL: ${url}`);
    return await this.fetcher.fetch(url);
  }

  generateCrawlId() {
    return `crawl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async logCrawlSummary(crawlId) {
    const duration = this.crawlMetrics.endTime - this.crawlMetrics.startTime;
    const durationMinutes = (duration / 1000 / 60).toFixed(2);
    const jobsPerMinute = (this.crawlMetrics.jobsExtracted / durationMinutes).toFixed(2);

    const summary = {
      crawlId,
      totalUrls: this.crawlMetrics.totalUrls,
      successfulFetches: this.crawlMetrics.successfulFetches,
      failedFetches: this.crawlMetrics.failedFetches,
      jobsExtracted: this.crawlMetrics.jobsExtracted,
      jobsSaved: this.crawlMetrics.jobsSaved,
      duration: `${durationMinutes} minutes`,
      jobsPerMinute,
      successRate: `${((this.crawlMetrics.successfulFetches / this.crawlMetrics.totalUrls) * 100).toFixed(2)}%`,
    };

    this.logger.info('Crawl summary', summary);
    return summary;
  }

  async getJobs(filters = {}, options = {}) {
    return await this.jobRepository.findByFilters(filters, options);
  }

  async getRecentJobs(limit = 10) {
    return await this.jobRepository.getRecentJobs(limit);
  }

  async getJobStatistics() {
    return await this.jobRepository.getJobStatistics();
  }

  async searchJobs(searchTerm, options = {}) {
    return await this.jobRepository.search(searchTerm, options);
  }

  async getMetrics() {
    return this.crawlMetrics;
  }

  async cleanupOldJobs(daysOld = 90) {
    return await this.jobRepository.deleteOldJobs(daysOld);
  }
}

export default CrawlerOrchestrator;