# API Interview Questions & Answers
## For 10+ Years Experienced Node.js Developer

---

## Table of Contents
1. [RESTful API Design](#restful-api-design)
2. [HTTP Methods & Status Codes](#http-methods--status-codes)
3. [API Versioning](#api-versioning)
4. [API Security](#api-security)
5. [Rate Limiting](#rate-limiting)
6. [API Documentation](#api-documentation)
7. [GraphQL vs REST](#graphql-vs-rest)
8. [Complex Scenarios](#complex-scenarios)

---

## RESTful API Design

### Q1: Design a RESTful API for an e-commerce platform with proper resource naming and relationships.

**Answer:**

**Resource Structure:**

```
/users              - List users
/users/{id}         - Get specific user
/users/{id}/orders  - Get orders for user
/orders             - List orders
/orders/{id}        - Get specific order
/orders/{id}/items  - Get items in order
/products           - List products
/products/{id}      - Get specific product
/products/{id}/reviews - Get reviews for product
/categories         - List categories
/categories/{id}/products - Get products in category
/cart               - Get user's cart
/cart/items         - Add item to cart
/cart/items/{id}    - Update/remove cart item
```

**API Endpoints Design:**

```javascript
// routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validation');

/**
 * User Endpoints
 */
router.get('/users', authMiddleware.requireAdmin, userController.getUsers);
router.get('/users/:id', authMiddleware.requireAuth, userController.getUser);
router.put('/users/:id', authMiddleware.requireAuth, validate.updateUser, userController.updateUser);
router.delete('/users/:id', authMiddleware.requireAuth, userController.deleteUser);

router.get('/users/:id/orders', authMiddleware.requireAuth, userController.getUserOrders);
router.get('/users/:id/addresses', authMiddleware.requireAuth, userController.getUserAddresses);

/**
 * Product Endpoints
 */
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProduct);
router.get('/products/:id/reviews', productController.getProductReviews);
router.get('/products/:id/variants', productController.getProductVariants);

router.post('/products', authMiddleware.requireAdmin, validate.createProduct, productController.createProduct);
router.put('/products/:id', authMiddleware.requireAdmin, validate.updateProduct, productController.updateProduct);
router.delete('/products/:id', authMiddleware.requireAdmin, productController.deleteProduct);

/**
 * Category Endpoints
 */
router.get('/categories', productController.getCategories);
router.get('/categories/:id', productController.getCategory);
router.get('/categories/:id/products', productController.getCategoryProducts);

/**
 * Order Endpoints
 */
router.get('/orders', authMiddleware.requireAdmin, orderController.getOrders);
router.get('/orders/:id', authMiddleware.requireAuth, orderController.getOrder);
router.post('/orders', authMiddleware.requireAuth, validate.createOrder, orderController.createOrder);
router.put('/orders/:id/status', authMiddleware.requireAdmin, orderController.updateOrderStatus);
router.get('/orders/:id/items', authMiddleware.requireAuth, orderController.getOrderItems);

/**
 * Cart Endpoints
 */
router.get('/cart', authMiddleware.requireAuth, cartController.getCart);
router.post('/cart/items', authMiddleware.requireAuth, validate.addToCart, cartController.addToCart);
router.put('/cart/items/:id', authMiddleware.requireAuth, validate.updateCartItem, cartController.updateCartItem);
router.delete('/cart/items/:id', authMiddleware.requireAuth, cartController.removeFromCart);
router.delete('/cart', authMiddleware.requireAuth, cartController.clearCart);

/**
 * Search & Filter Endpoints
 */
router.get('/search', productController.searchProducts);
router.get('/products/filters', productController.getProductFilters);

/**
 * Review Endpoints
 */
router.get('/reviews', productController.getReviews);
router.get('/reviews/:id', productController.getReview);
router.post('/products/:id/reviews', authMiddleware.requireAuth, validate.createReview, productController.createReview);

module.exports = router;
```

**Controller Implementation Example:**

```javascript
// controllers/productController.js
const Product = require('../models/Product');
const Review = require('../models/Review');
const Category = require('../models/Category');
const { Op } = require('sequelize');

class ProductController {
  /**
   * Get products with pagination, filtering, and sorting
   * GET /products?page=1&limit=20&category=1&minPrice=10&maxPrice=100&sort=price&order=asc
   */
  async getProducts(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        minPrice,
        maxPrice,
        search,
        sort = 'createdAt',
        order = 'DESC',
        inStock
      } = req.query;

      const offset = (page - 1) * limit;

      // Build where clause
      const where = { active: true };

      if (category) {
        where.categoryId = category;
      }

      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price[Op.gte] = minPrice;
        if (maxPrice) where.price[Op.lte] = maxPrice;
      }

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (inStock === 'true') {
        where.stock = { [Op.gt]: 0 };
      }

      const { count, rows: products } = await Product.findAndCountAll({
        where,
        include: [
          {
            model: Category,
            attributes: ['id', 'name']
          }
        ],
        order: [[sort, order.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        attributes: { exclude: ['deletedAt'] }
      });

      res.json({
        success: true,
        data: products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get single product by ID
   * GET /products/:id
   */
  async getProduct(req, res) {
    try {
      const { id } = req.params;
      const includeReviews = req.query.includeReviews === 'true';

      const product = await Product.findByPk(id, {
        include: [
          {
            model: Category,
            attributes: ['id', 'name']
          },
          ...(includeReviews ? [{
            model: Review,
            as: 'reviews',
            where: { approved: true },
            required: false
          }] : [])
        ]
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create new product (admin only)
   * POST /products
   */
  async createProduct(req, res) {
    try {
      const product = await Product.create(req.body);
      
      res.status(201).json({
        success: true,
        data: product
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update product (admin only)
   * PUT /products/:id
   */
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const [updated] = await Product.update(req.body, {
        where: { id },
        returning: true
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      const product = await Product.findByPk(id);
      
      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete product (soft delete)
   * DELETE /products/:id
   */
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const deleted = await Product.destroy({
        where: { id }
      });

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Search products
   * GET /search?q=laptop&category=1&minPrice=500&maxPrice=2000
   */
  async searchProducts(req, res) {
    try {
      const { q, category, minPrice, maxPrice, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const where = {
        active: true,
        [Op.or]: [
          { name: { [Op.iLike]: `%${q}%` } },
          { description: { [Op.iLike]: `%${q}%` } },
          { sku: { [Op.iLike]: `%${q}%` } }
        ]
      };

      if (category) {
        where.categoryId = category;
      }

      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price[Op.gte] = minPrice;
        if (maxPrice) where.price[Op.lte] = maxPrice;
      }

      const { count, rows: products } = await Product.findAndCountAll({
        where,
        include: [
          {
            model: Category,
            attributes: ['id', 'name']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: products,
        query: q,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get product reviews
   * GET /products/:id/reviews
   */
  async getProductReviews(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, sort = 'createdAt', order = 'DESC' } = req.query;
      const offset = (page - 1) * limit;

      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      const { count, rows: reviews } = await Review.findAndCountAll({
        where: {
          productId: id,
          approved: true
        },
        include: [
          {
            model: User,
            attributes: ['id', 'name', 'avatar']
          }
        ],
        order: [[sort, order.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Calculate average rating
      const ratingStats = await Review.findOne({
        where: { productId: id, approved: true },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalReviews']
        ]
      });

      res.json({
        success: true,
        data: reviews,
        ratingStats: {
          averageRating: parseFloat(ratingStats.dataValues.averageRating).toFixed(1),
          totalReviews: parseInt(ratingStats.dataValues.totalReviews)
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create product review
   * POST /products/:id/reviews
   */
  async createReview(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { rating, comment } = req.body;

      // Check if product exists
      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      // Check if user already reviewed
      const existingReview = await Review.findOne({
        where: { productId: id, userId }
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          error: 'You have already reviewed this product'
        });
      }

      const review = await Review.create({
        productId: id,
        userId,
        rating,
        comment,
        approved: true // Auto-approve or set to false for manual review
      });

      res.status(201).json({
        success: true,
        data: review
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new ProductController();
```

---

## HTTP Methods & Status Codes

### Q2: Explain proper use of HTTP methods and status codes in REST APIs.

**Answer:**

**HTTP Methods:**

```javascript
/**
 * GET - Retrieve resource(s)
 * Safe and idempotent
 */
router.get('/users', async (req, res) => {
  const users = await User.findAll();
  res.status(200).json(users);
});

/**
 * POST - Create new resource
 * Not idempotent (multiple requests create multiple resources)
 */
router.post('/users', async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
});

/**
 * PUT - Update/replace entire resource
 * Idempotent
 */
router.put('/users/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  await user.update(req.body);
  res.status(200).json(user);
});

/**
 * PATCH - Partially update resource
 * Idempotent (if the same changes are applied)
 */
router.patch('/users/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Update only provided fields
  const allowedUpdates = ['name', 'email', 'phone'];
  const updates = {};
  
  for (const key of allowedUpdates) {
    if (req.body[key]) {
      updates[key] = req.body[key];
    }
  }
  
  await user.update(updates);
  res.status(200).json(user);
});

/**
 * DELETE - Remove resource
 * Idempotent
 */
router.delete('/users/:id', async (req, res) => {
  const deleted = await User.destroy({
    where: { id: req.params.id }
  });
  
  if (!deleted) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.status(204).send(); // No content
});

/**
 * HEAD - Get headers only (no body)
 */
router.head('/users/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) {
    return res.status(404).end();
  }
  
  res.set('Content-Type', 'application/json');
  res.set('Last-Modified', user.updatedAt);
  res.set('ETag', generateETag(user));
  res.status(200).end();
});

/**
 * OPTIONS - Get allowed methods
 */
router.options('/users', async (req, res) => {
  res.set('Allow', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.status(204).end();
});
```

**HTTP Status Codes:**

```javascript
/**
 * 2xx Success
 */

// 200 OK - Standard response for successful HTTP requests
router.get('/users/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  res.status(200).json(user);
});

// 201 Created - Request succeeded and new resource created
router.post('/users', async (req, res) => {
  const user = await User.create(req.body);
  res.status(201)
    .location(`/users/${user.id}`)
    .json(user);
});

// 202 Accepted - Request accepted for processing
router.post('/orders', async (req, res) => {
  // Order will be processed asynchronously
  const orderId = await createOrderAsync(req.body);
  res.status(202).json({
    message: 'Order accepted for processing',
    orderId,
    status: 'pending'
  });
});

// 204 No Content - Successful request but no content to return
router.delete('/users/:id', async (req, res) => {
  await User.destroy({ where: { id: req.params.id } });
  res.status(204).send();
});

/**
 * 3xx Redirection
 */

// 301 Moved Permanently - Resource permanently moved
app.get('/old-endpoint', (req, res) => {
  res.redirect(301, '/new-endpoint');
});

// 304 Not Modified - Resource not modified (conditional GET)
router.get('/users/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  const etag = generateETag(user);
  
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).send();
  }
  
  res.set('ETag', etag);
  res.json(user);
});

/**
 * 4xx Client Error
 */

// 400 Bad Request - Malformed request or invalid data
router.post('/users', async (req, res) => {
  const { error } = validateUser(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details
    });
  }
  // ...
});

// 401 Unauthorized - Authentication required
router.get('/profile', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  // ...
});

// 403 Forbidden - Authenticated but not authorized
router.delete('/users/:id', async (req, res) => {
  const userId = req.params.id;
  
  // User can only delete themselves unless admin
  if (req.user.id !== userId && !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to perform this action'
    });
  }
  // ...
});

// 404 Not Found - Resource does not exist
router.get('/users/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }
  // ...
});

// 405 Method Not Allowed - Method not supported for resource
app.get('/users', (req, res) => {
  res.set('Allow', 'GET, POST');
  res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
});

// 409 Conflict - Request conflicts with current state
router.post('/users', async (req, res) => {
  const { email } = req.body;
  
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'User with this email already exists'
    });
  }
  // ...
});

// 422 Unprocessable Entity - Syntax is correct but semantic errors
router.post('/orders', async (req, res) => {
  const { items } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(422).json({
      success: false,
      error: 'Order must contain at least one item'
    });
  }
  // ...
});

// 429 Too Many Requests - Rate limit exceeded
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later'
    });
  }
});

/**
 * 5xx Server Error
 */

// 500 Internal Server Error - Unexpected server error
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 501 Not Implemented - Feature not implemented
router.get('/webhook', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Webhook feature not yet implemented'
  });
});

// 503 Service Unavailable - Service temporarily unavailable
router.get('/users', async (req, res) => {
  if (isUnderMaintenance()) {
    return res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable',
      retryAfter: 3600 // seconds
    });
  }
  // ...
});

// 504 Gateway Timeout - Upstream server timeout
router.get('/external-data', async (req, res) => {
  try {
    const data = await fetchFromExternalService();
    res.json(data);
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        success: false,
        error: 'Gateway timeout - external service not responding'
      });
    }
    throw error;
  }
});
```

---

## API Versioning

### Q3: Implement API versioning in Express.js.

**Answer:**

**Versioning Strategies:**

```javascript
// 1. URL Path Versioning (Recommended)
/**
 * Structure:
 * /api/v1/users
 * /api/v2/users
 */

const express = require('express');
const app = express();

// v1 Routes
const v1Router = express.Router();
v1Router.get('/users', (req, res) => {
  res.json({ version: 'v1', data: [] });
});

// v2 Routes
const v2Router = express.Router();
v2Router.get('/users', async (req, res) => {
  const users = await User.findAll({
    include: ['profile']
  });
  res.json({ version: 'v2', data: users });
});

// Mount routers
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

/**
 * 2. Header Versioning
 * Accept: application/vnd.myapi.v1+json
 */
app.use('/api/users', (req, res) => {
  const version = req.headers.accept?.match(/vnd\.myapi\.v(\d+)/)?.[1] || '1';
  
  if (version === '1') {
    res.json({ version: 'v1', data: [] });
  } else if (version === '2') {
    res.json({ version: 'v2', data: [] });
  }
});

/**
 * 3. Query Parameter Versioning
 * /api/users?version=2
 */
app.get('/api/users', (req, res) => {
  const version = req.query.version || '1';
  
  if (version === '1') {
    res.json({ version: 'v1', data: [] });
  } else if (version === '2') {
    res.json({ version: 'v2', data: [] });
  }
});
```

**Complete Versioning Implementation:**

```javascript
// app.js
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// API Version Routers
const v1Router = require('./routes/v1');
const v2Router = require('./routes/v2');

// Mount API routes
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// Default to latest version
app.use('/api', v2Router);

// Version endpoint
app.get('/api/version', (req, res) => {
  res.json({
    latest: 'v2',
    versions: {
      v1: '/api/v1',
      v2: '/api/v2'
    },
    deprecationNotice: 'v1 will be deprecated on 2025-01-01'
  });
});

// routes/v1/index.js
const express = require('express');
const router = express.Router();

const userRoutes = require('./users');
const productRoutes = require('./products');
const orderRoutes = require('./orders');

router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);

// Add version metadata
router.use((req, res, next) => {
  res.setHeader('API-Version', '1.0');
  next();
});

module.exports = router;

// routes/v1/users.js
const express = require('express');
const router = express.Router();
const userController = require('../../controllers/v1/userController');
const { validateUser } = require('../../middleware/validation');

/**
 * @swagger
 * /v1/users:
 *   get:
 *     summary: Get all users (v1)
 *     deprecated: true
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.post('/', validateUser, userController.createUser);
router.put('/:id', validateUser, userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;

// routes/v2/index.js
const express = require('express');
const router = express.Router();

const userRoutes = require('./users');
const productRoutes = require('./products');
const orderRoutes = require('./orders');

router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);

// Add version metadata and deprecation notice for v1
router.use((req, res, next) => {
  res.setHeader('API-Version', '2.0');
  next();
});

module.exports = router;

// routes/v2/users.js
const express = require('express');
const router = express.Router();
const userController = require('../../controllers/v2/userController');
const { validateUser } = require('../../middleware/validation');

/**
 * v2 improvements:
 * - Added filtering and pagination
 * - Better error messages
 * - Include related data
 * - Performance optimizations
 */
router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.post('/', validateUser, userController.createUser);
router.put('/:id', validateUser, userController.updateUser);
router.delete('/:id', userController.deleteUser);

// New endpoints in v2
router.get('/:id/orders', userController.getUserOrders);
router.get('/:id/settings', userController.getUserSettings);
router.put('/:id/settings', userController.updateUserSettings);

module.exports = router;

// controllers/v2/userController.js
const User = require('../../models/User');
const Order = require('../../models/Order');

class UserControllerV2 {
  async getUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = 'createdAt',
        order = 'DESC',
        search,
        role,
        active
      } = req.query;

      const offset = (page - 1) * limit;

      const where = {};

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (role) {
        where.role = role;
      }

      if (active !== undefined) {
        where.active = active === 'true';
      }

      const { count, rows: users } = await User.findAndCountAll({
        where,
        include: ['profile'],
        order: [[sort, order]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        attributes: { exclude: ['password', 'deletedAt'] }
      });

      res.json({
        success: true,
        data: users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getUser(req, res) {
    try {
      const { id } = req.params;
      const includeOrders = req.query.includeOrders === 'true';

      const user = await User.findByPk(id, {
        include: [
          'profile',
          ...(includeOrders ? [{
            model: Order,
            as: 'orders',
            limit: 10,
            order: [['createdAt', 'DESC']]
          }] : [])
        ],
        attributes: { exclude: ['password', 'deletedAt'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ... other methods
}

module.exports = new UserControllerV2();

// middleware/versionValidation.js
/**
 * Middleware to validate and handle API versions
 */
const validateAPIVersion = (req, res, next) => {
  const supportedVersions = ['1', '2'];
  const defaultVersion = '2';

  // Get version from URL path
  const pathMatch = req.path.match(/^\/api\/v(\d+)/);
  const version = pathMatch ? pathMatch[1] : defaultVersion;

  if (!supportedVersions.includes(version)) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported API version',
      supportedVersions,
      latestVersion: '2'
    });
  }

  // Check for deprecated version
  if (version === '1') {
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-API-Sunset', '2025-01-01');
    
    // Log deprecated version usage
    console.warn(`Deprecated API v1 used: ${req.method} ${req.path}`);
  }

  req.apiVersion = version;
  next();
};

module.exports = validateAPIVersion;
```

---

## API Security

### Q4: Implement comprehensive API security measures.

**Answer:**

```javascript
// security/index.js
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');

/**
 * Security Middleware Stack
 */
const setupSecurity = (app) => {
  // 1. HTTP Headers Security
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:']
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // 2. CORS Configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // 3. Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'Too many requests from this IP, please try again later'
      });
    }
  });

  const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'Too many requests, please slow down'
      });
    }
  });

  app.use('/api/', limiter);
  app.use('/api/auth/login', strictLimiter);
  app.use('/api/auth/register', strictLimiter);

  // 4. Prevent HTTP Parameter Pollution
  app.use(hpp());

  // 5. XSS Protection
  app.use(xss());

  // 6. NoSQL Injection Protection
  app.use(mongoSanitize());

  // 7. Body Size Limit
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // 8. Disable X-Powered-By header
  app.disable('x-powered-by');

  // 9. Content Security Policy for API responses
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
};

/**
 * Authentication Middleware
 */
const authMiddleware = require('../middleware/auth');

// middleware/auth.js
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');

class AuthMiddleware {
  /**
   * Verify JWT token and attach user to request
   */
  async protect(req, res, next) {
    try {
      // 1. Get token from header
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'You are not logged in. Please log in to get access.'
        });
      }

      // 2. Verify token
      const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

      // 3. Check if user still exists
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'The user belonging to this token no longer exists.'
        });
      }

      // 4. Check if user changed password after token was issued
      if (user.changedPasswordAfter(decoded.iat)) {
        return res.status(401).json({
          success: false,
          error: 'User recently changed password. Please log in again.'
        });
      }

      // 5. Grant access to protected route
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired. Please log in again.'
        });
      }
      next(error);
    }
  }

  /**
   * Check if user is admin
   */
  requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: 'You do not have permission to perform this action'
      });
    }
  }

  /**
   * Check if user has specific role
   */
  requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to perform this action'
        });
      }

      next();
    };
  }

  /**
   * Optional authentication - attach user if token provided
   */
  async optional(req, res, next) {
    try {
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (token) {
        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);
        if (user) {
          req.user = user;
        }
      }

      next();
    } catch (error) {
      // Continue without user if token is invalid
      next();
    }
  }
}

module.exports = new AuthMiddleware();

/**
 * Input Validation Middleware
 */
// middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const validate = {
  // User validation
  createUser: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
    body('phone')
      .optional()
      .isMobilePhone().withMessage('Invalid phone number'),
    handleValidationErrors
  ],

  updateUser: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('phone')
      .optional()
      .isMobilePhone().withMessage('Invalid phone number'),
    handleValidationErrors
  ],

  // Product validation
  createProduct: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 3, max: 200 }).withMessage('Name must be between 3 and 200 characters'),
    body('price')
      .notEmpty().withMessage('Price is required')
      .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('stock')
      .optional()
      .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('categoryId')
      .notEmpty().withMessage('Category is required')
      .isInt().withMessage('Invalid category ID'),
    handleValidationErrors
  ],

  // Order validation
  createOrder: [
    body('items')
      .isArray({ min: 1 }).withMessage('Order must contain at least one item'),
    body('items.*.productId')
      .notEmpty().withMessage('Product ID is required')
      .isInt().withMessage('Invalid product ID'),
    body('items.*.quantity')
      .notEmpty().withMessage('Quantity is required')
      .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('shippingAddress')
      .notEmpty().withMessage('Shipping address is required')
      .isObject().withMessage('Shipping address must be an object'),
    handleValidationErrors
  ],

  // Parameter validation
  id: [
    param('id')
      .isInt().withMessage('Invalid ID format')
      .toInt(),
    handleValidationErrors
  ],

  // Query validation
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
      .toInt(),
    handleValidationErrors
  ]
};

module.exports = validate;

/**
 * Request Logging & Auditing
 */
// middleware/audit.js
const auditLog = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function (data) {
    res.responseData = data;
    originalSend.call(this, data);
  };
  
  res.on('finish', () => {
    const auditLog = {
      timestamp: new Date(),
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime
    };
    
    // Log sensitive operations
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      console.log('Audit Log:', auditLog);
      
      // Store in database for security auditing
      // AuditLog.create(auditLog);
    }
  });
  
  next();
};

module.exports = auditLog;
```

---

## Rate Limiting

### Q5: Implement advanced rate limiting strategies.

**Answer:**

```javascript
// middleware/rateLimit.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

/**
 * General API Rate Limiter
 */
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'ratelimit:api:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      retryAfter: Math.ceil((15 * 60 * 1000) / 1000)
    });
  }
});

/**
 * Strict Rate Limiter for sensitive endpoints
 */
const strictLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'ratelimit:strict:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many attempts, please try again later',
      retryAfter: Math.ceil((15 * 60 * 1000) / 1000)
    });
  }
});

/**
 * User-based Rate Limiter
 */
const userRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'ratelimit:user:',
    expiry: 60 // 60 seconds
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per user
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for admin users
    return req.user?.role === 'admin';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded for this user',
      retryAfter: 60
    });
  }
});

/**
 * IP-based Rate Limiter
 */
const ipRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'ratelimit:ip:',
    expiry: 3600 // 1 hour
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour per IP
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'IP rate limit exceeded',
      retryAfter: 3600
    });
  }
});

/**
 * Token Bucket Algorithm for API Keys
 */
const tokenBucketLimiter = (capacity, refillRate) => {
  const buckets = new Map();

  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }

    const now = Date.now();
    let bucket = buckets.get(apiKey);

    if (!bucket) {
      bucket = { tokens: capacity, lastRefill: now };
    }

    // Refill tokens
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      buckets.set(apiKey, bucket);
      
      res.setHeader('X-RateLimit-Limit', capacity);
      res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens));
      
      next();
    } else {
      const retryAfter = Math.ceil((1 - bucket.tokens) / refillRate);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', capacity);
      res.setHeader('X-RateLimit-Remaining', 0);
      
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter
      });
    }
  };
};

/**
 * Sliding Window Rate Limiter
 */
const slidingWindowLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'ratelimit:sliding:',
    expiry: 3600
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  standardHeaders: true,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded'
    });
  }
});

module.exports = {
  apiLimiter,
  strictLimiter,
  userRateLimiter,
  ipRateLimiter,
  tokenBucketLimiter,
  slidingWindowLimiter
};

// Usage in routes
const express = require('express');
const router = express.Router();
const { apiLimiter, strictLimiter, userRateLimiter } = require('../middleware/rateLimit');
const auth = require('../middleware/auth');

// Apply general API rate limiter
router.use(apiLimiter);

// Apply strict rate limiter to auth endpoints
router.post('/auth/login', strictLimiter);
router.post('/auth/register', strictLimiter);
router.post('/auth/forgot-password', strictLimiter);

// Apply user-based rate limiter to protected routes
router.get('/users', auth.protect, userRateLimiter);

// Apply different limits based on user plan
router.get('/api/data', auth.protect, async (req, res) => {
  const limits = {
    free: 100,
    pro: 1000,
    enterprise: 10000
  };

  const max = limits[req.user.plan] || limits.free;
  
  const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max,
    keyGenerator: (req) => req.user.id
  });

  limiter(req, res, () => {
    res.json({ data: '...' });
  });
});
```

---

## Advanced API Patterns for Production

### Q9: How do you design APIs for high-scale systems with proper observability and resilience?

**Answer:**

**1. Distributed Tracing for API Requests**

```javascript
const express = require('express');
const { trace, context, propagation } = require('@opentelemetry/api');
const { NodeTracerProvider } = require('@opentelemetry/node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { registerInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

class APIObservability {
  static setupTracing() {
    const provider = new NodeTracerProvider();
    const jaegerExporter = new JaegerExporter({
      endpoint: 'http://localhost:14268/api/traces',
    });

    provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));
    trace.setGlobalTracerProvider(provider);

    registerInstrumentations();
  }

  static createRequestTracer(app) {
    // Middleware to trace all requests
    app.use((req, res, next) => {
      const tracer = trace.getTracer('express-tracer');
      const span = tracer.startSpan(`${req.method} ${req.path}`);

      span.setAttributes({
        'http.method': req.method,
        'http.url': req.url,
        'http.target': req.path,
        'http.client_ip': req.ip,
        'http.user_agent': req.get('user-agent')
      });

      // Propagate trace context
      const ctx = trace.setSpan(context.active(), span);

      context.with(ctx, () => {
        const originalJson = res.json;

        // Capture response
        res.json = function(data) {
          span.setAttributes({
            'http.status_code': res.statusCode,
            'http.response_content_length': JSON.stringify(data).length
          });

          if (res.statusCode >= 400) {
            span.setStatus({ code: SpanStatusCode.ERROR });
          }

          span.end();
          return originalJson.call(this, data);
        };

        next();
      });
    });
  }
}
```

**2. Request/Response Caching with Stampede Prevention**

```javascript
class APIResponseCache {
  constructor(cache, ttl = 300) {
    this.cache = cache;
    this.ttl = ttl;
    this.lockTimeout = 5000;
  }

  // Cache with write-through lock (prevents thundering herd)
  async getCachedResponse(key, generator) {
    const cached = await this.cache.get(key);
    if (cached) {
      return cached;
    }

    // Attempt to lock and generate
    const lockKey = `lock:${key}`;
    const lockValue = `lock_${Date.now()}`;

    const acquired = await this.cache.set(lockKey, lockValue, this.lockTimeout, 'NX');

    if (!acquired) {
      // Wait for other requester to populate cache
      const startTime = Date.now();
      while (Date.now() - startTime < this.lockTimeout) {
        const result = await this.cache.get(key);
        if (result) return result;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('Cache generation timeout');
    }

    try {
      const result = await generator();
      await this.cache.set(key, result, this.ttl);
      return result;
    } finally {
      await this.cache.del(lockKey);
    }
  }

  // Middleware for caching GET requests
  cacheMiddleware(keyGenerator) {
    return async (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = keyGenerator(req);
      
      try {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          res.set('X-Cache', 'HIT');
          return res.json(cached);
        }

        res.set('X-Cache', 'MISS');

        // Intercept res.json to cache result
        const originalJson = res.json;
        res.json = function(data) {
          this.cache.set(cacheKey, data, this.ttl).catch(console.error);
          return originalJson.call(this, data);
        }.bind({ cache: this.cache, ttl: this.ttl });
      } catch (error) {
        console.error('Cache error:', error);
      }

      next();
    };
  }
}
```

**3. API Gateway with Request Coalescing**

```javascript
class APIGateway {
  constructor() {
    this.requestDeduplication = new Map();
    this.inFlightRequests = new Map();
  }

  // Prevent duplicate concurrent requests
  async deduplicateRequest(key, operation) {
    if (this.inFlightRequests.has(key)) {
      // Wait for in-flight request
      return this.inFlightRequests.get(key);
    }

    const promise = operation();
    this.inFlightRequests.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.inFlightRequests.delete(key);
    }
  }

  // Aggregate multiple requests to reduce database load
  async batchRequests(requests, batchProcessor, maxWaitTime = 50) {
    return new Promise((resolve, reject) => {
      const batch = [...requests];
      const timer = setTimeout(() => {
        processBatch();
      }, maxWaitTime);

      const processBatch = async () => {
        clearTimeout(timer);
        try {
          const result = await batchProcessor(batch);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      if (batch.length >= 100) {
        processBatch();
      }
    });
  }
}
```

**4. API Versioning with Backward Compatibility**

```javascript
class APIVersionManager {
  constructor() {
    this.routes = new Map();
    this.deprecations = new Map();
  }

  registerRoute(version, method, path, handler) {
    const key = `${version}:${method}:${path}`;
    this.routes.set(key, handler);
  }

  deprecateRoute(version, method, path, message, sunsetting Date) {
    const key = `${version}:${method}:${path}`;
    this.deprecations.set(key, {
      message,
      sunsettingDate,
      replacement: null
    });
  }

  handleRequest(req, res, next) {
    const version = req.headers['api-version'] || 'v1';
    const key = `${version}:${req.method}:${req.route.path}`;

    const deprecation = this.deprecations.get(key);
    if (deprecation) {
      res.set('Deprecation', 'true');
      res.set('Sunset', new Date(deprecation.sunsettingDate).toUTCString());
      res.set('Warning', `299 - "${deprecation.message}"`);
    }

    const handler = this.routes.get(key);
    if (!handler) {
      // Fall back to previous version
      return this.handleFallback(req, res, next, version);
    }

    return handler(req, res, next);
  }

  async handleFallback(req, res, next, version) {
    // Implement backward compatibility logic
    // Convert request/response formats between versions
    next();
  }
}
```

**5. Advanced Request Validation**

```javascript
const { body, param, query, validationResult } = require('express-validator');
const Joi = require('joi');

class AdvancedValidation {
  // Custom async validator
  static customAsyncValidator(field, validator) {
    return body(field).custom(async (value) => {
      const result = await validator(value);
      if (!result.valid) {
        throw new Error(result.error);
      }
      return true;
    });
  }

  // Nested object validation
  static validateNested(schema) {
    return body().custom((value) => {
      const { error, value: validated } = Joi.object(schema).validate(value);
      if (error) {
        throw new Error(error.message);
      }
      return validated;
    });
  }

  // Validate idempotency key
  static validateIdempotencyKey() {
    return (req, res, next) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const idempotencyKey = req.headers['idempotency-key'];
        
        if (!idempotencyKey) {
          return res.status(400).json({
            error: 'Idempotency-Key header is required'
          });
        }

        if (!/^[a-zA-Z0-9-]{1,36}$/.test(idempotencyKey)) {
          return res.status(400).json({
            error: 'Invalid Idempotency-Key format'
          });
        }

        req.idempotencyKey = idempotencyKey;
      }

      next();
    };
  }

  // Content negotiation validation
  static validateContentNegotiation(supportedFormats = ['json', 'xml', 'csv']) {
    return (req, res, next) => {
      const accept = req.get('Accept') || 'application/json';
      const format = accept.split('/')[1].split(';')[0];

      if (!supportedFormats.includes(format)) {
        return res.status(406).json({
          error: `Not acceptable. Supported formats: ${supportedFormats.join(', ')}`
        });
      }

      req.responseFormat = format;
      next();
    };
  }
}

// Usage
app.post('/users',
  AdvancedValidation.customAsyncValidator('email', async (email) => {
    const exists = await User.findOne({ email });
    return {
      valid: !exists,
      error: exists ? 'Email already registered' : null
    };
  }),
  AdvancedValidation.validateIdempotencyKey(),
  AdvancedValidation.validateContentNegotiation(['json', 'xml']),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Handle request
  }
);
```

---

## Summary

**Key Takeaways:**
1. **RESTful principles** - Proper resource naming, HTTP methods, status codes
2. **API versioning** - Use URL path versioning for clear version management
3. **Security first** - Implement authentication, authorization, input validation
4. **Rate limiting** - Protect against abuse and DDoS attacks
5. **Proper error handling** - Use appropriate status codes and error messages
6. **Documentation** - Use OpenAPI/Swagger for API documentation
7. **Pagination** - Implement efficient pagination for large datasets
8. **Filtering & sorting** - Provide flexible query options
9. **CORS configuration** - Control cross-origin requests
10. **Distributed tracing** - Full request visibility across services
11. **Response caching** - Reduce database load with intelligent caching
12. **Request deduplication** - Prevent thundering herd and duplicate processing
13. **Backward compatibility** - Maintain APIs with graceful deprecation
14. **Content negotiation** - Support multiple response formats
10. **Validation** - Validate all input data