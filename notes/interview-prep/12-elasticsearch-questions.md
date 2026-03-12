# Elasticsearch Interview Questions & Answers
## For 10+ Years Experienced Node.js Developer

---

## Table of Contents
1. [Elasticsearch Fundamentals](#elasticsearch-fundamentals)
2. [Indexing & Mappings](#indexing--mappings)
3. [Queries & Search](#queries--search)
4. [Aggregations](#aggregations)
5. [Performance Optimization](#performance-optimization)
6. [Cluster Architecture](#cluster-architecture)
7. [Complex Scenarios](#complex-scenarios)

---

## Elasticsearch Fundamentals

### Q1: Explain Elasticsearch architecture and core concepts.

**Answer:**

```javascript
/**
 * Elasticsearch Core Concepts
 */

const elasticsearchConcepts = {
  /**
   * 1. Node
   * Single server that stores data and participates in cluster
   */
  node: {
    types: [
      'Master-eligible: Cluster management',
      'Data: Stores data and executes search',
      'Coordinating: Handles requests and delegates',
      'Ingest: Pre-processes documents before indexing'
    ],
    configuration: {
      node.name: 'node-1',
      node.roles: ['master', 'data', 'ingest'],
      cluster.name: 'production-cluster'
    }
  },

  /**
   * 2. Cluster
   * Collection of one or more nodes
   */
  cluster: {
    components: [
      'Master node: Cluster state management',
      'Data nodes: Shard storage',
      'Coordinating nodes: Query routing'
    ],
    settings: {
      cluster.name: 'my-application',
      'number of master-eligible nodes': 3,
      'discovery type': 'zen'
    }
  },

  /**
   * 3. Index
   * Collection of documents with similar characteristics
   * Like a database in relational databases
   */
  index: {
    definition: 'Logical namespace for documents',
    properties: [
      'Type: Document type (deprecated in ES 7+)',
      'Mapping: Schema definition',
      'Settings: Configuration',
      'Aliases: Alternative names'
    ],
    example: 'products, users, orders'
  },

  /**
   * 4. Document
   * Basic unit of information that can be indexed
   * Like a row in relational databases
   */
  document: {
    structure: {
      _index: 'products',
      _id: 'unique-id',
      _source: 'actual JSON data',
      _version: 'document version',
      _score: 'relevance score'
    },
    example: {
      name: 'Laptop',
      price: 999.99,
      category: 'Electronics',
      in_stock: true
    }
  },

  /**
   * 5. Shard
   * Horizontal split of index data across nodes
   */
  shard: {
    types: [
      'Primary shard: Main data holder',
      'Replica shard: Copy of primary shard'
    ],
    configuration: {
      'number_of_shards': 5,
      'number_of_replicas': 1
    },
    purpose: [
      'Distribute data across nodes',
      'Enable parallel processing',
      'Provide high availability'
    ]
  },

  /**
   * 6. Segment
   * Immutable files storing actual index data
   */
  segment: {
    properties: [
      'Immutable: Cannot be modified',
      'Written to disk: When Lucene commits',
      'Merged: Periodically by merge process'
    ],
    lifecycle: [
      'Index buffer (memory)',
      'New segment (created)',
      'Segment merge (optimized)',
      'Deleted documents (marked)'
    ]
  }
};

/**
 * Elasticsearch Implementation with Node.js
 */

const { Client } = require('@elastic/elasticsearch');

class ElasticsearchManager {
  constructor(config) {
    this.client = new Client({
      node: config.node || 'http://localhost:9200',
      auth: config.auth,
      maxRetries: 3,
      requestTimeout: 60000,
      sniffOnStart: false,
      sniffInterval: false
    });
  }

  /**
   * Check cluster health
   */
  async getClusterHealth() {
    const { body } = await this.client.cluster.health();
    return {
      cluster_name: body.cluster_name,
      status: body.status, // green, yellow, red
      number_of_nodes: body.number_of_nodes,
      number_of_data_nodes: body.number_of_data_nodes,
      active_primary_shards: body.active_primary_shards,
      active_shards: body.active_shards,
      relocating_shards: body.relocating_shards,
      initializing_shards: body.initializing_shards,
      unassigned_shards: body.unassigned_shards
    };
  }

  /**
   * Get cluster stats
   */
  async getClusterStats() {
    const { body } = await this.client.cluster.stats();
    return {
      nodes: {
        count: body.nodes.count,
        os: body.nodes.os,
        jvm: body.nodes.jvm,
        fs: body.nodes.fs
      },
      indices: {
        count: body.indices.count,
        docs: body.indices.docs,
        store: body.indices.store
      }
    };
  }

  /**
   * Get node stats
   */
  async getNodeStats() {
    const { body } = await this.client.nodes.stats();
    return body.nodes;
  }
}
```

---

## Indexing & Mappings

### Q2: Explain index mappings and how to optimize them.

**Answer:**

```javascript
/**
 * Mapping Definition
 * Defines schema and field types for an index
 */

class IndexManager {
  constructor(client) {
    this.client = client;
  }

  /**
   * Create index with optimized mappings
   */
  async createProductIndex() {
    const indexName = 'products';

    const mappings = {
      mappings: {
        properties: {
          // Text type with keyword sub-field
          name: {
            type: 'text',
            analyzer: 'english',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256
              }
            }
          },

          // Description: text with English analyzer
          description: {
            type: 'text',
            analyzer: 'english'
          },

          // Price: scaled_float for precision
          price: {
            type: 'scaled_float',
            scaling_factor: 100
          },

          // Category: keyword for exact matches
          category: {
            type: 'keyword'
          },

          // Stock: integer
          stock: {
            type: 'integer'
          },

          // Tags: array of keywords
          tags: {
            type: 'keyword'
          },

          // Attributes: nested objects
          attributes: {
            type: 'nested',
            properties: {
              key: { type: 'keyword' },
              value: { type: 'keyword' }
            }
          },

          // Created at: date
          created_at: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis'
          },

          // Location: geo_point for geospatial queries
          location: {
            type: 'geo_point'
          },

          // Rating: float
          rating: {
            type: 'float'
          },

          // In stock: boolean
          in_stock: {
            type: 'boolean'
          },

          // SKU: keyword for product codes
          sku: {
            type: 'keyword'
          }
        }
      },

      settings: {
        number_of_shards: 3,
        number_of_replicas: 2,
        'index.refresh_interval': '30s',
        'index.max_result_window': 100000,
        analysis: {
          analyzer: {
            english: {
              tokenizer: 'standard',
              filter: ['lowercase', 'english_stop', 'english_stemmer']
            }
          }
        }
      }
    };

    const { body, warnings, statusCode } = await this.client.indices.create({
      index: indexName,
      body: mappings
    });

    console.log(`Index ${indexName} created successfully`);
    return body;
  }

  /**
   * Create index with dynamic mapping templates
   */
  async createIndexTemplate() {
    const templateName = 'logs-template';

    const template = {
      index_patterns: ['logs-*'],
      priority: 1,
      template: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          'index.lifecycle.name': 'logs-policy',
          'index.lifecycle.rollover_alias': 'logs'
        },
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            level: { type: 'keyword' },
            message: { type: 'text' },
            service: { type: 'keyword' },
            host: { type: 'keyword' }
          }
        }
      }
    };

    const { body } = await this.client.indices.putIndexTemplate({
      name: templateName,
      body: template
    });

    return body;
  }

  /**
   * Update index mapping
   */
  async updateMapping(indexName) {
    const mappingUpdate = {
      properties: {
        // Add new field
        discount: {
          type: 'integer'
        },
        // Update existing field (only certain properties)
        stock: {
          type: 'integer',
          doc_values: false // Disable doc_values to save space
        }
      }
    };

    const { body } = await this.client.indices.putMapping({
      index: indexName,
      body: mappingUpdate
    });

    return body;
  }

  /**
   * Get mapping information
   */
  async getMapping(indexName) {
    const { body } = await this.client.indices.getMapping({
      index: indexName
    });

    return body[indexName].mappings;
  }
}

/**
 * Indexing Strategies
 */

class BulkIndexer {
  constructor(client) {
    this.client = client;
    this.bulkOperations = [];
    this.bulkSize = 5000; // Number of operations per bulk
  }

  /**
   * Add document to bulk queue
   */
  async addToBulk(indexName, document, id = null) {
    const operation = { index: { _index: indexName } };
    if (id) {
      operation.index._id = id;
    }

    this.bulkOperations.push({ index: operation });
    this.bulkOperations.push(document);

    if (this.bulkOperations.length >= this.bulkSize * 2) {
      await this.executeBulk();
    }
  }

  /**
   * Execute bulk operations
   */
  async executeBulk() {
    if (this.bulkOperations.length === 0) {
      return;
    }

    const { body } = await this.client.bulk({
      body: this.bulkOperations,
      refresh: false
    });

    // Check for errors
    if (body.errors) {
      const items = body.items;
      items.forEach((item, index) => {
        if (item.index.error) {
          console.error(`Error indexing item at position ${index}:`, item.index.error);
        }
      });
    }

    console.log(`Bulk indexed ${this.bulkOperations.length / 2} documents`);
    this.bulkOperations = [];
  }

  /**
   * Reindex data with transformations
   */
  async reindex(sourceIndex, targetIndex, script = null) {
    const reindexBody = {
      source: {
        index: sourceIndex
      },
      dest: {
        index: targetIndex
      },
      conflicts: 'proceed' // Continue on version conflicts
    };

    if (script) {
      reindexBody.script = script;
    }

    const { body } = await this.client.reindex({
      body: reindexBody,
      wait_for_completion: false // Run asynchronously
    });

    return body;
  }

  /**
   * Update by query
   */
  async updateByQuery(indexName, query, script) {
    const { body } = await this.client.updateByQuery({
      index: indexName,
      body: {
        query: query,
        script: script
      },
      conflicts: 'proceed',
      refresh: true
    });

    return body;
  }
}
```

---

## Queries & Search

### Q3: Implement various search queries and filters.

**Answer:**

```javascript
class SearchBuilder {
  constructor(client) {
    this.client = client;
  }

  /**
   * 1. Match Query (Full-text search)
   */
  async matchSearch(indexName, field, text) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        query: {
          match: {
            [field]: text
          }
        }
      }
    });

    return body.hits.hits;
  }

  /**
   * 2. Multi-match Query (Search multiple fields)
   */
  async multiMatchSearch(indexName, text, fields) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        query: {
          multi_match: {
            query: text,
            fields: fields,
            type: 'best_fields', // most_fields, cross_fields, phrase, phrase_prefix
            fuzziness: 'AUTO'
          }
        }
      }
    });

    return body.hits.hits;
  }

  /**
   * 3. Term Query (Exact match)
   */
  async termSearch(indexName, field, value) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        query: {
          term: {
            [field]: value
          }
        }
      }
    });

    return body.hits.hits;
  }

  /**
   * 4. Terms Query (Multiple exact matches)
   */
  async termsSearch(indexName, field, values) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        query: {
          terms: {
            [field]: values
          }
        }
      }
    });

    return body.hits.hits;
  }

  /**
   * 5. Range Query
   */
  async rangeSearch(indexName, field, range) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        query: {
          range: {
            [field]: range
          }
        }
      }
    });

    return body.hits.hits;
  }

  /**
   * 6. Boolean Query (Combine queries)
   */
  async booleanSearch(indexName, queries) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        query: {
          bool: {
            must: queries.must || [],       // AND
            should: queries.should || [],     // OR
            must_not: queries.must_not || [], // NOT
            filter: queries.filter || []      // Fast filter, no scoring
          }
        }
      }
    });

    return body.hits.hits;
  }

  /**
   * 7. Nested Query
   */
  async nestedSearch(indexName, path, query) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        query: {
          nested: {
            path: path,
            query: query
          }
        }
      }
    });

    return body.hits.hits;
  }

  /**
   * 8. Geo-distance Query
   */
  async geoDistanceSearch(indexName, location, distance) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        query: {
          geo_distance: {
            distance: distance,
            location: location
          }
        },
        sort: [
          {
            _geo_distance: {
              location: location,
              unit: 'km',
              order: 'asc'
            }
          }
        ]
      }
    });

    return body.hits.hits;
  }

  /**
   * 9. Prefix Query (Autocomplete)
   */
  async prefixSearch(indexName, field, prefix) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        query: {
          prefix: {
            [field]: prefix
          }
        }
      }
    });

    return body.hits.hits;
  }

  /**
   * 10. Wildcard Query
   */
  async wildcardSearch(indexName, field, pattern) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        query: {
          wildcard: {
            [field]: pattern
          }
        }
      }
    });

    return body.hits.hits;
  }

  /**
   * 11. Fuzzy Query
   */
  async fuzzySearch(indexName, field, value, fuzziness = 'AUTO') {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        query: {
          match: {
            [field]: {
              query: value,
              fuzziness: fuzziness
            }
          }
        }
      }
    });

    return body.hits.hits;
  }

  /**
   * 12. Complex product search example
   */
  async searchProducts(searchCriteria) {
    const {
      query = '',
      category = null,
      minPrice = null,
      maxPrice = null,
      inStock = null,
      location = null,
      maxDistance = null,
      tags = [],
      page = 1,
      size = 20,
      sort = 'relevance'
    } = searchCriteria;

    const mustClauses = [];
    const filterClauses = [];

    // Full-text search
    if (query) {
      mustClauses.push({
        multi_match: {
          query: query,
          fields: ['name^3', 'description^2', 'tags^1.5'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }

    // Category filter
    if (category) {
      filterClauses.push({
        term: { category: category }
      });
    }

    // Price range
    if (minPrice || maxPrice) {
      const priceRange = {};
      if (minPrice) priceRange.gte = minPrice;
      if (maxPrice) priceRange.lte = maxPrice;
      filterClauses.push({
        range: { price: priceRange }
      });
    }

    // Stock filter
    if (inStock !== null) {
      filterClauses.push({
        term: { in_stock: inStock }
      });
    }

    // Tags filter
    if (tags.length > 0) {
      filterClauses.push({
        terms: { tags: tags }
      });
    }

    // Build sort
    let sortClause = ['_score'];
    if (sort === 'price-asc') {
      sortClause = ['price'];
    } else if (sort === 'price-desc') {
      sortClause = [{ price: 'desc' }];
    } else if (sort === 'date') {
      sortClause = [{ created_at: 'desc' }];
    }

    // Geo distance sort
    if (location && maxDistance) {
      filterClauses.push({
        geo_distance: {
          distance: `${maxDistance}km`,
          location: location
        }
      });
      sortClause = [{
        _geo_distance: {
          location: location,
          unit: 'km',
          order: 'asc'
        }
      }];
    }

    const searchBody = {
      query: {
        bool: {
          must: mustClauses,
          filter: filterClauses
        }
      },
      sort: sortClause,
      from: (page - 1) * size,
      size: size,
      highlight: {
        fields: {
          name: {},
          description: {}
        }
      }
    };

    const { body } = await this.client.search({
      index: 'products',
      body: searchBody
    });

    return {
      results: body.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        source: hit._source,
        highlight: hit.highlight
      })),
      total: body.hits.total.value,
      page: page,
      size: size,
      totalPages: Math.ceil(body.hits.total.value / size)
    };
  }

  /**
   * Search after (for deep pagination)
   */
  async searchAfter(indexName, query, size = 20, searchAfter = null) {
    const searchBody = {
      query: query,
      size: size,
      sort: [
        { created_at: 'desc' },
        { _id: 'asc' }
      ]
    };

    if (searchAfter) {
      searchBody.search_after = searchAfter;
    }

    const { body } = await this.client.search({
      index: indexName,
      body: searchBody
    });

    return {
      results: body.hits.hits,
      total: body.hits.total.value,
      nextSearchAfter: body.hits.hits.length > 0 
        ? body.hits.hits[body.hits.hits.length - 1].sort 
        : null
    };
  }
}
```

---

## Aggregations

### Q4: Implement various aggregation types.

**Answer:**

```javascript
class AggregationBuilder {
  constructor(client) {
    this.client = client;
  }

  /**
   * 1. Terms Aggregation (Group by field)
   */
  async termsAggregation(indexName, field, size = 10) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        size: 0,
        aggregations: {
          categories: {
            terms: {
              field: field,
              size: size
            }
          }
        }
      }
    });

    return body.aggregations.categories.buckets;
  }

  /**
   * 2. Stats Aggregation
   */
  async statsAggregation(indexName, field) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        size: 0,
        aggregations: {
          price_stats: {
            stats: {
              field: field
            }
          }
        }
      }
    });

    return body.aggregations.price_stats;
  }

  /**
   * 3. Date Histogram Aggregation
   */
  async dateHistogramAggregation(indexName, field, interval = '1d') {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        size: 0,
        aggregations: {
          sales_over_time: {
            date_histogram: {
              field: field,
              calendar_interval: interval
            },
            aggregations: {
              total_sales: {
                sum: {
                  field: 'price'
                }
              }
            }
          }
        }
      }
    });

    return body.aggregations.sales_over_time.buckets;
  }

  /**
   * 4. Histogram Aggregation
   */
  async histogramAggregation(indexName, field, interval) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        size: 0,
        aggregations: {
          price_distribution: {
            histogram: {
              field: field,
              interval: interval
            }
          }
        }
      }
    });

    return body.aggregations.price_distribution.buckets;
  }

  /**
   * 5. Range Aggregation
   */
  async rangeAggregation(indexName, field, ranges) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        size: 0,
        aggregations: {
          price_ranges: {
            range: {
              field: field,
              ranges: ranges
            }
          }
        }
      }
    });

    return body.aggregations.price_ranges.buckets;
  }

  /**
   * 6. Nested Aggregation
   */
  async nestedAggregation(indexName, path, subAggregation) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        size: 0,
        aggregations: {
          products_by_category: {
            nested: {
              path: path
            },
            aggregations: subAggregation
          }
        }
      }
    });

    return body.aggregations.products_by_category;
  }

  /**
   * 7. Composite Aggregation (Multi-bucket)
   */
  async compositeAggregation(indexName, sources) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        size: 0,
        aggregations: {
          composite_result: {
            composite: {
              sources: sources,
              size: 100
            }
          }
        }
      }
    });

    return body.aggregations.composite_result;
  }

  /**
   * 8. Complex e-commerce dashboard aggregations
   */
  async getEcommerceDashboard() {
    const { body } = await this.client.search({
      index: 'orders',
      body: {
        size: 0,
        query: {
          range: {
            created_at: {
              gte: 'now-30d/d'
            }
          }
        },
        aggregations: {
          // Sales by category
          sales_by_category: {
            terms: {
              field: 'category',
              size: 10
            },
            aggregations: {
              total_revenue: {
                sum: {
                  field: 'total'
                }
              },
              total_orders: {
                value_count: {
                  field: '_id'
                }
              }
            }
          },

          // Sales over time
          sales_over_time: {
            date_histogram: {
              field: 'created_at',
              calendar_interval: '1d',
              format: 'yyyy-MM-dd'
            },
            aggregations: {
              total_revenue: {
                sum: {
                  field: 'total'
                }
              },
              total_orders: {
                value_count: {
                  field: '_id'
                }
              }
            }
          },

          // Average order value
          avg_order_value: {
            avg: {
              field: 'total'
            }
          },

          // Top selling products
          top_products: {
            terms: {
              field: 'product_name',
              size: 10,
              order: {
                total_revenue: 'desc'
              }
            },
            aggregations: {
              total_revenue: {
                sum: {
                  field: 'total'
                }
              },
              units_sold: {
                sum: {
                  field: 'quantity'
                }
              }
            }
          },

          // Customer segments by spend
          customer_segments: {
            range: {
              field: 'total_spend',
              ranges: [
                { key: 'low', to: 100 },
                { key: 'medium', from: 100, to: 500 },
                { key: 'high', from: 500 }
              ]
            },
            aggregations: {
              customer_count: {
                cardinality: {
                  field: 'user_id'
                }
              }
            }
          },

          // Geographic distribution
          geo_distribution: {
            geohash_grid: {
              field: 'location',
              precision: 5
            }
          }
        }
      }
    });

    return body.aggregations;
  }

  /**
   * 9. Percentiles Aggregation
   */
  async percentilesAggregation(indexName, field, percents = [1, 5, 25, 50, 75, 95, 99]) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        size: 0,
        aggregations: {
          price_percentiles: {
            percentiles: {
              field: field,
              percents: percents
            }
          }
        }
      }
    });

    return body.aggregations.price_percentiles;
  }

  /**
   * 10. Cardinality Aggregation (Unique count)
   */
  async cardinalityAggregation(indexName, field) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        size: 0,
        aggregations: {
          unique_users: {
            cardinality: {
              field: field,
              precision_threshold: 40000
            }
          }
        }
      }
    });

    return body.aggregations.unique_users.value;
  }
}
```

---

## Performance Optimization

### Q5: Explain and implement Elasticsearch performance optimization.

**Answer:**

```javascript
/**
 * Elasticsearch Performance Optimization
 */

class PerformanceOptimizer {
  constructor(client) {
    this.client = client;
  }

  /**
   * 1. Refresh Interval Optimization
   * Default: 1s, Increase to 30s for bulk indexing
   */
  async optimizeRefreshInterval(indexName, interval) {
    const { body } = await this.client.indices.putSettings({
      index: indexName,
      body: {
        'index.refresh_interval': interval
      }
    });

    return body;
  }

  /**
   * 2. Translog Optimization
   * async: Faster but less durable
   * fsync: Slower but fully durable
   */
  async optimizeTranslog(indexName, durability) {
    const { body } = await this.client.indices.putSettings({
      index: indexName,
      body: {
        'index.translog.durability': durability // async, request, fsync
      }
    });

    return body;
  }

  /**
   * 3. Number of Replicas Optimization
   * Reduce replicas for heavy indexing, increase for search
   */
  async optimizeReplicas(indexName, replicaCount) {
    const { body } = await this.client.indices.putSettings({
      index: indexName,
      body: {
        'index.number_of_replicas': replicaCount
      }
    });

    return body;
  }

  /**
   * 4. Use Filter Context instead of Query Context
   * Filters don't calculate scores, are cached
   */
  async optimizedSearch(indexName, filters) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        query: {
          bool: {
            filter: filters // Use filter, not must
          }
        }
      }
    });

    return body.hits.hits;
  }

  /**
   * 5. Use Source Filtering
   * Return only required fields
   */
  async sourceFiltering(indexName, query, fields) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        query: query,
        _source: fields // Return only specified fields
      }
    });

    return body.hits.hits;
  }

  /**
   * 6. Use Doc Values Freq
   * Disable doc_values for fields you don't need to sort or aggregate on
   */
  async disableDocValues(indexName, field) {
    const { body } = await this.client.indices.putMapping({
      index: indexName,
      body: {
        properties: {
          [field]: {
            type: 'text',
            doc_values: false
          }
        }
      }
    });

    return body;
  }

  /**
   * 7. Force Merge Index
   * Merge segments to reduce number of segments
   */
  async forceMerge(indexName, maxNumSegments = 1) {
    const { body } = await this.client.indices.forcemerge({
      index: indexName,
      max_num_segments: maxNumSegments,
      wait_for_merge: false
    });

    return body;
  }

  /**
   * 8. Get Index Stats
   */
  async getIndexStats(indexName) {
    const { body } = await this.client.indices.stats({
      index: indexName
    });

    return body.indices[indexName];
  }

  /**
   * 9. Analyze Slow Logs
   */
  async getSlowLogs() {
    const { body } = await this.client.search({
      index: '.logs-*/_search/slowlog',
      body: {
        query: {
          range: {
            took: {
              gte: 5000 // 5 seconds
            }
          }
        },
        sort: [
          { took: 'desc' }
        ],
        size: 100
      }
    });

    return body.hits.hits;
  }

  /**
   * 10. Optimize Indexing Settings
   */
  async optimizeForIndexing(indexName) {
    const settings = {
      'index.refresh_interval': '30s',
      'index.translog.durability': 'async',
      'index.number_of_replicas': 0,
      'index.merge.policy.max_merged_segment': '5gb',
      'index.buffer_size': '512mb'
    };

    const { body } = await this.client.indices.putSettings({
      index: indexName,
      body: settings
    });

    return body;
  }

  /**
   * 11. Optimize Index for Searching
   */
  async optimizeForSearching(indexName) {
    const settings = {
      'index.refresh_interval': '1s',
      'index.translog.durability': 'request',
      'index.number_of_replicas': 2,
      'index.query.default_field': ['name', 'description']
    };

    const { body } = await this.client.indices.putSettings({
      index: indexName,
      body: settings
    });

    return body;
  }

  /**
   * 12. Use Routing for Specific Shards
   * Direct queries to specific shards
   */
  async searchWithRouting(indexName, query, routingValue) {
    const { body } = await this.client.search({
      index: indexName,
      routing: routingValue,
      body: {
        query: query
      }
    });

    return body.hits.hits;
  }

  /**
   * 13. Index Warming
   * Warm up index after creation
   */
  async warmIndex(indexName) {
    const { body } = await this.client.search({
      index: indexName,
      body: {
        query: {
          match_all: {}
        },
        size: 0,
        aggregations: {
          warmup_agg: {
            terms: {
              field: 'category',
              size: 10
            }
          }
        }
      }
    });

    return body;
  }
}

/**
 * Index Lifecycle Management (ILM)
 */

class ILMManager {
  constructor(client) {
    this.client = client;
  }

  /**
   * Create ILM Policy
   */
  async createILMPolicy() {
    const policyName = 'logs-policy';

    const policy = {
      policy: {
        phases: {
          hot: {
            actions: {
              rollover: {
                max_size: '50gb',
                max_age: '30d'
              }
            }
          },
          warm: {
            min_age: '30d',
            actions: {
              forcemerge: {
                max_num_segments: 1
              },
              shrink: {
                number_of_shards: 1
              }
            }
          },
          cold: {
            min_age: '90d',
            actions: {
              allocate: {
                number_of_replicas: 0
              }
            }
          },
          delete: {
            min_age: '180d',
            actions: {
              delete: {}
            }
          }
        }
      }
    };

    const { body } = await this.client.ilm.putLifecycle({
      name: policyName,
      body: policy
    });

    return body;
  }

  /**
   * Create Rollover Alias
   */
  async createRolloverAlias(indexPattern, alias) {
    const { body } = await this.client.indices.create({
      index: `${indexPattern}-000001`,
      body: {
        aliases: {
          [alias]: {
            is_write_index: true
          }
        }
      }
    });

    return body;
  }
}
```

---

## Cluster Architecture

### Q6: Explain Elasticsearch cluster architecture and scaling.

**Answer:**

```javascript
/**
 * Elasticsearch Cluster Architecture
 */

const clusterArchitecture = {
  /**
   * Node Roles
   */
  nodeRoles: {
    masterEligible: {
      purpose: 'Cluster state management',
      responsibilities: [
        'Create/delete indices',
        'Track cluster nodes',
        'Decide shard allocation',
        'Handle cluster state changes'
      ],
      configuration: {
        'node.roles': ['master'],
        'discovery.zen.minimum_master_nodes': 2 // (master_eligible_nodes / 2) + 1
      },
      bestPractices: [
        '3 or 5 master-eligible nodes (odd number)',
        'Dedicated hardware with fast SSD',
        'Minimum 8GB RAM',
        'Place in separate availability zones'
      ]
    },

    dataNode: {
      purpose: 'Store data and execute search',
      responsibilities: [
        'Store index shards',
        'Execute CRUD operations',
        'Execute search and aggregation',
        'Perform merging'
      ],
      configuration: {
        'node.roles': ['data'],
        'node.roles.data': ['content', 'hot', 'warm', 'cold']
      },
      scaling: [
        'Add more nodes for horizontal scaling',
        'Increase RAM for better caching',
        'Use SSD for better performance',
        'Separate hot/warm/cold tiers'
      ]
    },

    coordinatingNode: {
      purpose: 'Handle client requests',
      responsibilities: [
        'Distribute requests',
        'Gather results',
        'Reduce response size'
      ],
      configuration: {
        'node.roles': []
      },
      bestPractices: [
        'High CPU for processing',
        'More memory for result aggregation',
        'Don\'t store data'
      ]
    },

    ingestNode: {
      purpose: 'Pre-process documents before indexing',
      responsibilities: [
        'Execute ingest pipelines',
        'Transform documents',
        'Enrich data'
      ],
      configuration: {
        'node.roles': ['ingest']
      }
    },

    machineLearningNode: {
      purpose: 'Run ML jobs',
      responsibilities: [
        'Anomaly detection',
        'Outlier detection',
        'Forecasting'
      ],
      configuration: {
        'node.roles': ['ml', 'remote_cluster_client']
      }
    }
  },

  /**
   * Shard Strategy
   */
  shardStrategy: {
    numberOfShards: {
      guidelines: [
        'Small indices (< 10GB): 1 shard',
        'Medium indices (10-100GB): 3-5 shards',
        'Large indices (> 100GB): 5-10 shards',
        'Avoid too many shards (overhead per shard)'
      ],
      formula: 'shard_size = index_size / number_of_shards',
      targetSize: '20-50GB per shard'
    },

    numberOfReplicas: {
      purpose: 'High availability',
      guidelines: [
        'Production: 2 replicas (3 copies total)',
        'Development: 0 replicas',
        'Hot tier: 1-2 replicas',
        'Cold tier: 0 replicas'
      ]
    },

    shardAllocation: {
      awareness: {
        attributes: ['zone', 'rack', 'host']
      },
      filtering: {
        require: '_name:node-1,node-2',
        include: '_tier:prefers_data',
        exclude: '_tier:cold'
      }
    }
  },

  /**
   * Scaling Strategies
   */
  scaling: {
    verticalScaling: {
      when: 'Single node, small dataset',
      actions: [
        'Increase RAM (heap max 31GB)',
        'Increase CPU cores',
        'Use faster SSD storage',
        'Increase network bandwidth'
      ],
      limitations: [
        'Single point of failure',
        'Limited by physical hardware',
        'Downtime during upgrade'
      ]
    },

    horizontalScaling: {
      when: 'Large dataset, high traffic',
      actions: [
        'Add more data nodes',
        'Distribute shards across nodes',
        'Use coordinating nodes for load balancing',
        'Implement master-eligible quorum'
      ],
      benefits: [
        'High availability',
        'Better performance',
        'No single point of failure',
        'Zero-downtime scaling'
      ]
    },

    tieredArchitecture: {
      hot: {
        purpose: 'Recent, frequently accessed data',
        hardware: 'High-performance SSD, more RAM',
        replicas: 1-2,
        refresh: '1s'
      },
      warm: {
        purpose: 'Less frequently accessed data',
        hardware: 'Standard SSD, less RAM',
        replicas: 0-1,
        refresh: '30s'
      },
      cold: {
        purpose: 'Archived data',
        hardware: 'HDD, minimal RAM',
        replicas: 0,
        refresh: '60s'
      }
    }
  }
};

/**
 * Cluster Manager
 */

class ClusterManager {
  constructor(client) {
    this.client = client;
  }

  /**
   * Add node to cluster
   */
  async addNodeToCluster(nodeName) {
    const { body } = await this.client.cluster.putSettings({
      body: {
        transient: {
          'cluster.routing.allocation.exclude._name': ''
        }
      }
    });

    return body;
  }

  /**
   * Exclude node from allocation
   */
  async excludeNode(nodeName) {
    const { body } = await this.client.cluster.putSettings({
      body: {
        transient: {
          'cluster.routing.allocation.exclude._name': nodeName
        }
      }
    });

    return body;
  }

  /**
   * Monitor shard allocation
   */
  async getShardAllocation() {
    const { body } = await this.client.cat.shards({
      format: 'json'
    });

    return body;
  }

  /**
   * Rebalance shards
   */
  async rebalanceShards() {
    const { body } = await this.client.cluster.reroute({
      body: {
        commands: [
          {
            allocate_empty_primary: {
              index: 'products',
              shard: 0,
              node: 'node-1',
              accept_data_loss: true
            }
          }
        ]
      }
    });

    return body;
  }

  /**
   * Check disk usage
   */
  async getDiskUsage() {
    const { body } = await this.client.cat.allocation({
      format: 'json',
      bytes: 'gb'
    });

    return body;
  }

  /**
   * Set watermark settings
   */
  async setWatermarks(low = '85%', high = '90%', flood_stage = '95%') {
    const { body } = await this.client.cluster.putSettings({
      body: {
        transient: {
          'cluster.routing.allocation.disk.watermark.low': low,
          'cluster.routing.allocation.disk.watermark.high': high,
          'cluster.routing.allocation.disk.watermark.flood_stage': flood_stage
        }
      }
    });

    return body;
  }
}
```

---

## Summary

**Key Takeaways:**
1. **Node Roles** - Master, Data, Coordinating, Ingest, ML nodes
2. **Indexing** - Mappings define schema, optimize for use case
3. **Queries** - Match, term, bool, nested, geo queries
4. **Aggregations** - Terms, stats, date histogram, nested
5. **Performance** - Optimize refresh interval, use filters, source filtering
6. **Sharding** - Distribute data horizontally for scalability
7. **Replicas** - Provide high availability
8. **ILM** - Manage index lifecycle (hot/warm/cold/delete)
9. **Scaling** - Vertical vs horizontal scaling strategies
10. **Monitoring** - Track cluster health, shard allocation, disk usage