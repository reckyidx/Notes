import { MongoClient, ObjectId } from 'mongodb';
import Logger from '../utils/logger.js';
import config from '../config/config.js';

// Repository Pattern for data access
class JobRepository {
  constructor(dbClient, dbName) {
    this.db = dbClient;
    this.dbName = dbName;
    this.collectionName = 'jobs';
    this.logger = Logger.getInstance();
  }

  get collection() {
    return this.db.db(this.dbName).collection(this.collectionName);
  }

  async initializeIndexes() {
    try {
      await this.collection.createIndex({ jobId: 1 }, { unique: true });
      await this.collection.createIndex({ title: 'text', description: 'text' });
      await this.collection.createIndex({ location: 1 });
      await this.collection.createIndex({ department: 1 });
      await this.collection.createIndex({ createdAt: -1 });
      await this.collection.createIndex({ updatedAt: -1 });
      await this.collection.createIndex({ 'salary.min': 1 });
      await this.collection.createIndex({ 'salary.max': 1 });
      
      // TTL index for automatic cleanup after 90 days
      await this.collection.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 90 * 24 * 60 * 60 }
      );
      
      this.logger.info('Job repository indexes created successfully');
    } catch (error) {
      this.logger.error('Failed to create indexes', { error: error.message });
      throw error;
    }
  }

  async save(jobData) {
    try {
      const result = await this.collection.updateOne(
        { jobId: jobData.jobId },
        { 
          $set: { 
            ...jobData, 
            updatedAt: new Date() 
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );

      this.logger.debug(`Saved job ${jobData.jobId}`, {
        upsertedId: result.upsertedId,
        modifiedCount: result.modifiedCount,
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to save job ${jobData.jobId}`, {
        error: error.message,
      });
      throw error;
    }
  }

  async bulkSave(jobs) {
    try {
      const operations = jobs.map(job => ({
        updateOne: {
          filter: { jobId: job.jobId },
          update: {
            $set: {
              ...job,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          upsert: true,
        },
      }));

      const result = await this.collection.bulkWrite(operations, { ordered: false });

      this.logger.info(`Bulk saved ${jobs.length} jobs`, {
        insertedCount: result.insertedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to bulk save jobs', { error: error.message });
      throw error;
    }
  }

  async findById(jobId) {
    try {
      return await this.collection.findOne({ jobId });
    } catch (error) {
      this.logger.error(`Failed to find job ${jobId}`, { error: error.message });
      throw error;
    }
  }

  async findByFilters(filters = {}, options = {}) {
    try {
      const query = this.buildQuery(filters);
      const skip = options.skip || 0;
      const limit = options.limit || 100;
      const sort = options.sort || { createdAt: -1 };

      const jobs = await this.collection
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .toArray();

      const total = await this.collection.countDocuments(query);

      return {
        jobs,
        total,
        skip,
        limit,
        hasMore: skip + jobs.length < total,
      };
    } catch (error) {
      this.logger.error('Failed to query jobs by filters', { error: error.message });
      throw error;
    }
  }

  async search(searchTerm, options = {}) {
    try {
      const skip = options.skip || 0;
      const limit = options.limit || 100;

      const result = await this.collection
        .find({ $text: { $search: searchTerm } }, { score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .sort({ score: { $meta: 'textScore' } })
        .toArray();

      const total = await this.collection.countDocuments({
        $text: { $search: searchTerm },
      });

      return {
        jobs: result,
        total,
        skip,
        limit,
        hasMore: skip + result.length < total,
      };
    } catch (error) {
      this.logger.error('Failed to search jobs', { error: error.message });
      throw error;
    }
  }

  async getRecentJobs(limit = 10) {
    try {
      return await this.collection
        .find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      this.logger.error('Failed to get recent jobs', { error: error.message });
      throw error;
    }
  }

  async getJobStatistics() {
    try {
      const pipeline = [
        {
          $group: {
            _id: '$location',
            count: { $sum: 1 },
            avgSalary: { $avg: '$salary.min' },
            jobs: {
              $push: {
                title: '$title',
                jobId: '$jobId',
                department: '$department',
              },
            },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ];

      const byLocation = await this.collection.aggregate(pipeline).toArray();

      const totalJobs = await this.collection.countDocuments();
      const avgSalary = await this.collection
        .aggregate([
          { $match: { 'salary.min': { $exists: true } } },
          {
            $group: {
              _id: null,
              avgMinSalary: { $avg: '$salary.min' },
              avgMaxSalary: { $avg: '$salary.max' },
            },
          },
        ])
        .toArray();

      const byDepartment = await this.collection
        .aggregate([
          {
            $group: {
              _id: '$department',
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ])
        .toArray();

      return {
        totalJobs,
        byLocation,
        byDepartment,
        avgSalary: avgSalary[0] || { avgMinSalary: 0, avgMaxSalary: 0 },
      };
    } catch (error) {
      this.logger.error('Failed to get job statistics', { error: error.message });
      throw error;
    }
  }

  async update(jobId, updates) {
    try {
      const result = await this.collection.updateOne(
        { jobId },
        { $set: { ...updates, updatedAt: new Date() } }
      );

      this.logger.debug(`Updated job ${jobId}`, {
        modifiedCount: result.modifiedCount,
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to update job ${jobId}`, { error: error.message });
      throw error;
    }
  }

  async delete(jobId) {
    try {
      const result = await this.collection.deleteOne({ jobId });

      this.logger.debug(`Deleted job ${jobId}`, {
        deletedCount: result.deletedCount,
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to delete job ${jobId}`, { error: error.message });
      throw error;
    }
  }

  async deleteOldJobs(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.collection.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      this.logger.info(`Deleted ${result.deletedCount} jobs older than ${daysOld} days`);

      return result;
    } catch (error) {
      this.logger.error('Failed to delete old jobs', { error: error.message });
      throw error;
    }
  }

  buildQuery(filters) {
    const query = {};

    if (filters.location) {
      query.location = new RegExp(filters.location, 'i');
    }

    if (filters.department) {
      query.department = filters.department;
    }

    if (filters.jobType) {
      query.jobType = filters.jobType;
    }

    if (filters.workModel) {
      query.workModel = filters.workModel;
    }

    if (filters.experienceLevel) {
      query.experienceLevel = filters.experienceLevel;
    }

    if (filters.salaryMin) {
      query['salary.min'] = { $gte: filters.salaryMin };
    }

    if (filters.salaryMax) {
      query['salary.max'] = { $lte: filters.salaryMax };
    }

    if (filters.postedAfter) {
      query.postedDate = { $gte: new Date(filters.postedAfter) };
    }

    if (filters.postedBefore) {
      query.postedDate = { $lte: new Date(filters.postedBefore) };
    }

    if (filters.title) {
      query.title = new RegExp(filters.title, 'i');
    }

    return query;
  }
}

export default JobRepository;