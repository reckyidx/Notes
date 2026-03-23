import * as cheerio from 'cheerio';
import Logger from '../utils/logger.js';
import config from '../config/config.js';

// Strategy Pattern for different parsing strategies
class ParserStrategy {
  parse(html) {
    throw new Error('Must implement parse() method');
  }
}

// CSS Selector Parser Strategy
class CSSSelectorParser extends ParserStrategy {
  constructor(selectors) {
    super();
    this.selectors = selectors;
    this.logger = Logger.getInstance();
  }

  parse(html) {
    const $ = cheerio.load(html);
    const jobs = [];

    $(this.selectors.jobCard).each((index, element) => {
      try {
        const job = this.extractJobData($, element);
        if (job && this.validateJobData(job)) {
          jobs.push(job);
        }
      } catch (error) {
        this.logger.warn(`Failed to parse job card at index ${index}`, {
          error: error.message,
        });
      }
    });

    this.logger.info(`Parsed ${jobs.length} jobs from HTML`);
    return jobs;
  }

  extractJobData($, element) {
    const $element = $(element);

    const job = {
      title: this.getText($element, this.selectors.jobTitle),
      jobId: this.getText($element, this.selectors.jobId),
      location: this.getText($element, this.selectors.location),
      department: this.getText($element, this.selectors.department),
      jobType: this.getText($element, this.selectors.jobType),
      workModel: this.getText($element, this.selectors.workModel),
      experienceLevel: this.getText($element, this.selectors.experienceLevel),
      salary: this.parseSalary(this.getText($element, this.selectors.salary)),
      description: this.getText($element, this.selectors.description),
      requirements: this.extractList($element, this.selectors.requirements),
      responsibilities: this.extractList($element, this.selectors.responsibilities),
      skills: this.extractList($element, this.selectors.skills),
      postedDate: this.parseDate(this.getText($element, this.selectors.postedDate)),
      applicationDeadline: this.parseDate(this.getText($element, this.selectors.applicationDeadline)),
      applyUrl: this.extractUrl($element, this.selectors.applyUrl),
      company: 'Kotak',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return job;
  }

  getText($element, selector) {
    if (!selector) return null;
    const $target = $element.find(selector).first();
    return $target.length ? $target.text().trim() : null;
  }

  extractList($element, selector) {
    if (!selector) return [];
    const items = [];
    $element.find(selector).each((index, item) => {
      const text = $(item).text().trim();
      if (text) items.push(text);
    });
    return items;
  }

  extractUrl($element, selector) {
    if (!selector) return null;
    const $target = $element.find(selector).first();
    if ($target.length) {
      return $target.attr('href') || $target.find('a').first().attr('href');
    }
    return null;
  }

  parseSalary(salaryText) {
    if (!salaryText) return null;

    // Parse salary range (e.g., "₹10,00,000 - ₹15,00,000 per annum")
    const match = salaryText.match(/₹?([\d,]+)\s*-\s*₹?([\d,]+)/);
    if (match) {
      const min = parseInt(match[1].replace(/,/g, ''), 10);
      const max = parseInt(match[2].replace(/,/g, ''), 10);
      return {
        min,
        max,
        currency: 'INR',
        text: salaryText,
      };
    }

    return {
      text: salaryText,
      currency: 'INR',
    };
  }

  parseDate(dateText) {
    if (!dateText) return null;

    // Try parsing various date formats
    const parsed = new Date(dateText);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    // Handle relative dates (e.g., "2 days ago")
    const relativeMatch = dateText.match(/(\d+)\s+(day|days|week|weeks|month|months)\s+ago/i);
    if (relativeMatch) {
      const value = parseInt(relativeMatch[1], 10);
      const unit = relativeMatch[2].toLowerCase();
      const date = new Date();

      if (unit.startsWith('day')) {
        date.setDate(date.getDate() - value);
      } else if (unit.startsWith('week')) {
        date.setDate(date.getDate() - value * 7);
      } else if (unit.startsWith('month')) {
        date.setMonth(date.getMonth() - value);
      }

      return date;
    }

    return null;
  }

  validateJobData(job) {
    // Job must have at least a title and jobId
    if (!job.title || !job.jobId) {
      return false;
    }

    return true;
  }
}

// Main Parser class using Factory Pattern
class JobParser {
  constructor(selectors = config.parser.selectors) {
    this.selectors = selectors;
    this.logger = Logger.getInstance();
  }

  static createParser(type = 'css-selector', options = {}) {
    switch (type) {
      case 'css-selector':
        return new JobParser(options.selectors);
      case 'xpath':
        throw new Error('XPath parser not yet implemented');
      case 'headless':
        throw new Error('Headless parser not yet implemented');
      default:
        throw new Error(`Unknown parser type: ${type}`);
    }
  }

  parse(html) {
    const strategy = new CSSSelectorParser(this.selectors);
    return strategy.parse(html);
  }

  parsePagination(html, baseUrl) {
    const $ = cheerio.load(html);
    const pagination = {
      currentPage: 1,
      totalPages: 1,
      hasNextPage: false,
      nextUrl: null,
    };

    // Try to extract pagination information
    const paginationElement = $(this.selectors.pagination).first();
    if (paginationElement.length) {
      // Extract current page
      const currentPageText = paginationElement.find('.current, .active').first().text();
      if (currentPageText) {
        pagination.currentPage = parseInt(currentPageText, 10) || 1;
      }

      // Extract total pages
      const totalPagesText = paginationElement.find('a').last().text();
      if (totalPagesText && !isNaN(parseInt(totalPagesText, 10))) {
        pagination.totalPages = parseInt(totalPagesText, 10);
      }

      // Check for next page
      const nextLink = paginationElement.find(this.selectors.nextPage).first();
      if (nextLink.length) {
        pagination.hasNextPage = true;
        const nextUrl = nextLink.attr('href');
        if (nextUrl) {
          pagination.nextUrl = nextUrl.startsWith('http')
            ? nextUrl
            : new URL(nextUrl, baseUrl).href;
        }
      }
    }

    return pagination;
  }
}

export default JobParser;