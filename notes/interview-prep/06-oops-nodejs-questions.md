# OOPS in Node.js Interview Questions & Answers
## For 10+ Years Experienced Node.js Developer

---

## Table of Contents
1. [OOP Concepts in Node.js](#oop-concepts-in-nodejs)
2. [Classes & Objects](#classes--objects)
3. [Inheritance](#inheritance)
4. [Encapsulation](#encapsulation)
5. [Polymorphism](#polymorphism)
6. [Design Patterns](#design-patterns)
7. [Complex Scenarios](#complex-scenarios)

---

## OOP Concepts in Node.js

### Q1: Explain OOP principles and how they apply to Node.js.

**Answer:**

**OOP Principles:**

```
1. Encapsulation - Bundling data and methods
2. Inheritance - Creating new classes from existing ones
3. Polymorphism - Same interface, different implementations
4. Abstraction - Hiding complex implementation details
```

**Implementation in Node.js:**

```javascript
/**
 * 1. Encapsulation
 * Using closures to create private properties
 */
class BankAccount {
  constructor(initialBalance) {
    // Private property using closure
    let _balance = initialBalance;
    let _transactionHistory = [];

    // Public methods
    this.getBalance = () => _balance;
    
    this.deposit = (amount) => {
      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }
      _balance += amount;
      _transactionHistory.push({
        type: 'deposit',
        amount,
        balance: _balance,
        timestamp: new Date()
      });
    };

    this.withdraw = (amount) => {
      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }
      if (amount > _balance) {
        throw new Error('Insufficient balance');
      }
      _balance -= amount;
      _transactionHistory.push({
        type: 'withdrawal',
        amount,
        balance: _balance,
        timestamp: new Date()
      });
    };

    this.getTransactionHistory = () => [..._transactionHistory];
  }
}

// Using ES6 private fields (#)
class User {
  #id; // Private field
  #email;
  #password;

  constructor(id, email, password) {
    this.#id = id;
    this.#email = email;
    this.#password = this.hashPassword(password);
  }

  hashPassword(password) {
    // Simulated hashing
    return password.split('').reverse().join('');
  }

  verifyPassword(password) {
    return this.hashPassword(password) === this.#password;
  }

  getEmail() {
    return this.#email;
  }

  setEmail(newEmail) {
    if (!this.isValidEmail(newEmail)) {
      throw new Error('Invalid email format');
    }
    this.#email = newEmail;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * 2. Inheritance
 * Extending classes and method overriding
 */
class Animal {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  speak() {
    return `${this.name} makes a sound`;
  }

  eat() {
    return `${this.name} is eating`;
  }

  sleep() {
    return `${this.name} is sleeping`;
  }
}

class Dog extends Animal {
  constructor(name, age, breed) {
    super(name, age);
    this.breed = breed;
  }

  speak() {
    return `${this.name} barks: Woof!`;
  }

  fetch() {
    return `${this.name} is fetching the ball`;
  }
}

class Cat extends Animal {
  constructor(name, age, color) {
    super(name, age);
    this.color = color;
  }

  speak() {
    return `${this.name} meows: Meow!`;
  }

  scratch() {
    return `${this.name} is scratching furniture`;
  }
}

// Multiple inheritance simulation using composition
class FlyingMixin {
  fly() {
    return `${this.name} is flying`;
  }

  land() {
    return `${this.name} is landing`;
  }
}

class SwimmingMixin {
  swim() {
    return `${this.name} is swimming`;
  }

  dive() {
    return `${this.name} is diving`;
  }
}

class Duck extends Animal {}
Object.assign(Duck.prototype, FlyingMixin.prototype, SwimmingMixin.prototype);

/**
 * 3. Polymorphism
 * Method overriding and interfaces
 */
class PaymentProcessor {
  processPayment(amount) {
    throw new Error('Method must be implemented by subclass');
  }

  refundPayment(transactionId) {
    throw new Error('Method must be implemented by subclass');
  }
}

class CreditCardProcessor extends PaymentProcessor {
  processPayment(amount) {
    return `Processing credit card payment of $${amount}`;
  }

  refundPayment(transactionId) {
    return `Refunding credit card transaction ${transactionId}`;
  }
}

class PayPalProcessor extends PaymentProcessor {
  processPayment(amount) {
    return `Processing PayPal payment of $${amount}`;
  }

  refundPayment(transactionId) {
    return `Refunding PayPal transaction ${transactionId}`;
  }
}

class CryptoProcessor extends PaymentProcessor {
  processPayment(amount) {
    return `Processing crypto payment of $${amount}`;
  }

  refundPayment(transactionId) {
    return `Refunding crypto transaction ${transactionId}`;
  }
}

// Polymorphic usage
function processAllPayments(processors, amount) {
  return processors.map(processor => processor.processPayment(amount));
}

const processors = [
  new CreditCardProcessor(),
  new PayPalProcessor(),
  new CryptoProcessor()
];

console.log(processAllPayments(processors, 100));

/**
 * 4. Abstraction
 * Using abstract classes and interfaces
 */
class Shape {
  constructor(color) {
    this.color = color;
  }

  // Abstract method
  calculateArea() {
    throw new Error('calculateArea must be implemented');
  }

  calculatePerimeter() {
    throw new Error('calculatePerimeter must be implemented');
  }

  // Concrete method
  describe() {
    return `A ${this.color} shape with area ${this.calculateArea()}`;
  }
}

class Rectangle extends Shape {
  constructor(width, height, color) {
    super(color);
    this.width = width;
    this.height = height;
  }

  calculateArea() {
    return this.width * this.height;
  }

  calculatePerimeter() {
    return 2 * (this.width + this.height);
  }
}

class Circle extends Shape {
  constructor(radius, color) {
    super(color);
    this.radius = radius;
  }

  calculateArea() {
    return Math.PI * this.radius * this.radius;
  }

  calculatePerimeter() {
    return 2 * Math.PI * this.radius;
  }
}
```

---

## Classes & Objects

### Q2: Implement a robust class system with factory pattern and static methods.

**Answer:**

```javascript
/**
 * Factory Pattern
 * Creating objects without specifying exact class
 */
class Logger {
  constructor(config) {
    this.level = config.level || 'info';
    this.format = config.format || 'json';
    this.outputs = config.outputs || ['console'];
  }

  log(message, level = 'info') {
    const logEntry = {
      timestamp: new Date(),
      level,
      message
    };

    if (this.format === 'json') {
      logEntry = JSON.stringify(logEntry);
    } else {
      logEntry = `[${logEntry.timestamp}] [${logEntry.level.toUpperCase()}] ${logEntry.message}`;
    }

    this.outputs.forEach(output => {
      if (output === 'console') {
        console.log(logEntry);
      } else if (output === 'file') {
        this.writeToFile(logEntry);
      }
    });
  }

  info(message) {
    this.log(message, 'info');
  }

  warn(message) {
    this.log(message, 'warn');
  }

  error(message) {
    this.log(message, 'error');
  }

  writeToFile(logEntry) {
    // Implementation for file logging
    fs.appendFileSync('app.log', logEntry + '\n');
  }

  // Static factory method
  static createConsoleLogger(level = 'info') {
    return new Logger({
      level,
      format: 'json',
      outputs: ['console']
    });
  }

  static createFileLogger(level = 'info') {
    return new Logger({
      level,
      format: 'text',
      outputs: ['file']
    });
  }

  static createCombinedLogger(level = 'info') {
    return new Logger({
      level,
      format: 'json',
      outputs: ['console', 'file']
    });
  }
}

/**
 * Singleton Pattern
 * Ensure only one instance exists
 */
class DatabaseConnection {
  constructor(connectionString) {
    if (DatabaseConnection.instance) {
      return DatabaseConnection.instance;
    }

    this.connectionString = connectionString;
    this.connected = false;
    DatabaseConnection.instance = this;
  }

  connect() {
    console.log(`Connecting to ${this.connectionString}`);
    this.connected = true;
  }

  disconnect() {
    console.log('Disconnecting from database');
    this.connected = false;
  }

  static getInstance(connectionString) {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(connectionString);
    }
    return DatabaseConnection.instance;
  }

  static resetInstance() {
    DatabaseConnection.instance = null;
  }
}

/**
 * Builder Pattern
 * Building complex objects step by step
 */
class QueryBuilder {
  constructor() {
    this.query = {
      select: [],
      from: null,
      where: [],
      groupBy: [],
      orderBy: [],
      limit: null,
      offset: null
    };
  }

  select(...fields) {
    this.query.select = fields;
    return this;
  }

  from(table) {
    this.query.from = table;
    return this;
  }

  where(condition) {
    this.query.where.push(condition);
    return this;
  }

  groupBy(...fields) {
    this.query.groupBy = fields;
    return this;
  }

  orderBy(field, direction = 'ASC') {
    this.query.orderBy.push({ field, direction });
    return this;
  }

  limit(count) {
    this.query.limit = count;
    return this;
  }

  offset(count) {
    this.query.offset = count;
    return this;
  }

  build() {
    let sql = `SELECT ${this.query.select.join(', ') || '*'} FROM ${this.query.from}`;

    if (this.query.where.length > 0) {
      sql += ` WHERE ${this.query.where.join(' AND ')}`;
    }

    if (this.query.groupBy.length > 0) {
      sql += ` GROUP BY ${this.query.groupBy.join(', ')}`;
    }

    if (this.query.orderBy.length > 0) {
      sql += ` ORDER BY ${this.query.orderBy.map(o => `${o.field} ${o.direction}`).join(', ')}`;
    }

    if (this.query.limit) {
      sql += ` LIMIT ${this.query.limit}`;
    }

    if (this.query.offset) {
      sql += ` OFFSET ${this.query.offset}`;
    }

    return sql;
  }
}

// Usage
const query = new QueryBuilder()
  .select('id', 'name', 'email')
  .from('users')
  .where('active = true')
  .where('created_at > NOW() - INTERVAL \'30 days\'')
  .orderBy('created_at', 'DESC')
  .limit(10)
  .build();

console.log(query);

/**
 * Prototype-based Inheritance
 * JavaScript's native inheritance model
 */
const vehiclePrototype = {
  start() {
    return `${this.type} is starting`;
  },

  stop() {
    return `${this.type} is stopping`;
  },

  drive() {
    return `${this.type} is driving`;
  }
};

function createVehicle(type, make, model) {
  const vehicle = Object.create(vehiclePrototype);
  vehicle.type = type;
  vehicle.make = make;
  vehicle.model = model;
  return vehicle;
}

const car = createVehicle('Car', 'Toyota', 'Camry');
console.log(car.start()); // "Car is starting"

/**
 * Class with getters and setters
 */
class Temperature {
  constructor(celsius) {
    this._celsius = celsius;
  }

  get celsius() {
    return this._celsius;
  }

  set celsius(value) {
    this._celsius = value;
  }

  get fahrenheit() {
    return (this._celsius * 9 / 5) + 32;
  }

  set fahrenheit(value) {
    this._celsius = (value - 32) * 5 / 9;
  }

  get kelvin() {
    return this._celsius + 273.15;
  }

  set kelvin(value) {
    this._celsius = value - 273.15;
  }
}

const temp = new Temperature(25);
console.log(temp.fahrenheit); // 77
temp.fahrenheit = 100;
console.log(temp.celsius); // 37.77...
```

---

## Inheritance

### Q3: Implement deep inheritance with method chaining and super calls.

**Answer:**

```javascript
/**
 * Multi-level inheritance with proper super calls
 */
class Person {
  constructor(name, age, email) {
    this.name = name;
    this.age = age;
    this.email = email;
  }

  introduce() {
    return `Hi, I'm ${this.name}, ${this.age} years old`;
  }

  contact() {
    return `Contact me at ${this.email}`;
  }
}

class Employee extends Person {
  constructor(name, age, email, employeeId, department, salary) {
    super(name, age, email);
    this.employeeId = employeeId;
    this.department = department;
    this.salary = salary;
  }

  introduce() {
    return `${super.introduce()} and I work in ${this.department}`;
  }

  getSalary() {
    return this.salary;
  }

  setSalary(newSalary) {
    if (newSalary < 0) {
      throw new Error('Salary cannot be negative');
    }
    this.salary = newSalary;
  }

  work() {
    return `${this.name} is working in ${this.department}`;
  }
}

class Manager extends Employee {
  constructor(name, age, email, employeeId, department, salary, teamSize) {
    super(name, age, email, employeeId, department, salary);
    this.teamSize = teamSize;
  }

  introduce() {
    return `${super.introduce()} managing a team of ${this.teamSize}`;
  }

  manageTeam() {
    return `${this.name} is managing ${this.teamSize} employees`;
  }

  work() {
    return `${super.work()} and leading the team`;
  }

  promoteTeamMember(employee, newPosition) {
    return `${this.name} promoted ${employee.name} to ${newPosition}`;
  }
}

/**
 * Method chaining with fluent interface
 */
class UserBuilder {
  constructor() {
    this.user = {
      name: '',
      email: '',
      age: 0,
      address: null,
      preferences: {}
    };
  }

  setName(name) {
    this.user.name = name;
    return this;
  }

  setEmail(email) {
    if (!this.validateEmail(email)) {
      throw new Error('Invalid email format');
    }
    this.user.email = email;
    return this;
  }

  setAge(age) {
    if (age < 0 || age > 150) {
      throw new Error('Invalid age');
    }
    this.user.age = age;
    return this;
  }

  setAddress(address) {
    this.user.address = address;
    return this;
  }

  addPreference(key, value) {
    this.user.preferences[key] = value;
    return this;
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  build() {
    return new User(this.user);
  }
}

class User {
  constructor(data) {
    this.name = data.name;
    this.email = data.email;
    this.age = data.age;
    this.address = data.address;
    this.preferences = data.preferences;
  }

  getSummary() {
    return `${this.name} (${this.age}) - ${this.email}`;
  }
}

// Usage
const user = new UserBuilder()
  .setName('John Doe')
  .setEmail('john@example.com')
  .setAge(30)
  .setAddress('123 Main St')
  .addPreference('theme', 'dark')
  .addPreference('notifications', true)
  .build();

console.log(user.getSummary());

/**
 * Mixin pattern for multiple inheritance
 */
const Timestampable = {
  setCreatedAt() {
    this.createdAt = new Date();
  },

  setUpdatedAt() {
    this.updatedAt = new Date();
  }
};

const Identifiable = {
  setId(id) {
    this.id = id;
  },

  generateId() {
    this.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
};

const Validateable = {
  validate() {
    throw new Error('validate method must be implemented');
  }
};

function applyMixins(constructor, ...mixins) {
  mixins.forEach(mixin => {
    Object.getOwnPropertyNames(mixin).forEach(name => {
      Object.defineProperty(
        constructor.prototype,
        name,
        Object.getOwnPropertyDescriptor(mixin, name)
      );
    });
  });
}

class BaseEntity {
  constructor() {
    this.generateId();
    this.setCreatedAt();
    this.setUpdatedAt();
  }

  save() {
    this.setUpdatedAt();
    console.log(`Saved entity with ID: ${this.id}`);
  }
}

// Apply mixins
applyMixins(BaseEntity, Timestampable, Identifiable, Validateable);

class UserEntity extends BaseEntity {
  constructor(name, email) {
    super();
    this.name = name;
    this.email = email;
  }

  validate() {
    const errors = [];

    if (!this.name || this.name.length < 2) {
      errors.push('Name must be at least 2 characters');
    }

    if (!this.email || !this.email.includes('@')) {
      errors.push('Invalid email format');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    return true;
  }
}

class ProductEntity extends BaseEntity {
  constructor(name, price) {
    super();
    this.name = name;
    this.price = price;
  }

  validate() {
    const errors = [];

    if (!this.name) {
      errors.push('Name is required');
    }

    if (this.price <= 0) {
      errors.push('Price must be positive');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    return true;
  }
}

// Usage
const user = new UserEntity('John Doe', 'john@example.com');
user.validate();
user.save();

const product = new ProductEntity('Laptop', 999.99);
product.validate();
product.save();
```

---

## Encapsulation

### Q4: Implement encapsulation with getters, setters, and private methods.

**Answer:**

```javascript
/**
 * Encapsulation with ES6 private fields (#)
 * and public getters/setters
 */
class BankAccount {
  #balance;
  #accountNumber;
  #accountHolder;
  #transactions;
  #dailyWithdrawalLimit;
  #withdrawalsToday;
  #dailyLimitResetTime;

  constructor(accountHolder, accountNumber, initialBalance = 0) {
    this.#accountHolder = accountHolder;
    this.#accountNumber = accountNumber;
    this.#balance = initialBalance;
    this.#transactions = [];
    this.#dailyWithdrawalLimit = 500;
    this.#withdrawalsToday = 0;
    this.#dailyLimitResetTime = this.getTomorrow();
  }

  // Private method
  getTomorrow() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  // Private method
  checkDailyLimit() {
    const now = new Date();
    if (now >= this.#dailyLimitResetTime) {
      this.#withdrawalsToday = 0;
      this.#dailyLimitResetTime = this.getTomorrow();
    }
    return this.#withdrawalsToday < this.#dailyWithdrawalLimit;
  }

  // Private method
  recordTransaction(type, amount, description = '') {
    const transaction = {
      id: Date.now(),
      type,
      amount,
      balanceAfter: this.#balance,
      description,
      timestamp: new Date()
    };
    this.#transactions.push(transaction);
    return transaction;
  }

  // Public getter for balance
  get balance() {
    return this.#balance;
  }

  // Public getter for account number
  get accountNumber() {
    return this.#accountNumber;
  }

  // Public getter for account holder
  get accountHolder() {
    return this.#accountHolder;
  }

  // Public getter for transactions
  get transactions() {
    return [...this.#transactions]; // Return copy to prevent modification
  }

  // Public getter for daily limit
  get dailyWithdrawalLimit() {
    return this.#dailyWithdrawalLimit;
  }

  // Public setter for daily limit
  set dailyWithdrawalLimit(limit) {
    if (limit < 0) {
      throw new Error('Daily limit cannot be negative');
    }
    this.#dailyWithdrawalLimit = limit;
  }

  deposit(amount) {
    if (amount <= 0) {
      throw new Error('Deposit amount must be positive');
    }

    this.#balance += amount;
    return this.recordTransaction('deposit', amount, 'Cash deposit');
  }

  withdraw(amount, description = '') {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be positive');
    }

    if (amount > this.#balance) {
      throw new Error('Insufficient balance');
    }

    if (!this.checkDailyLimit()) {
      throw new Error('Daily withdrawal limit exceeded');
    }

    if (this.#withdrawalsToday + amount > this.#dailyWithdrawalLimit) {
      throw new Error(`Withdrawal exceeds daily limit of ${this.#dailyWithdrawalLimit}`);
    }

    this.#balance -= amount;
    this.#withdrawalsToday += amount;
    return this.recordTransaction('withdrawal', amount, description);
  }

  transfer(toAccount, amount) {
    if (!toAccount || !(toAccount instanceof BankAccount)) {
      throw new Error('Invalid account');
    }

    if (amount <= 0) {
      throw new Error('Transfer amount must be positive');
    }

    if (amount > this.#balance) {
      throw new Error('Insufficient balance');
    }

    this.withdraw(amount, `Transfer to account ${toAccount.accountNumber}`);
    toAccount.deposit(amount);
    
    return {
      success: true,
      from: this.#accountNumber,
      to: toAccount.#accountNumber,
      amount,
      timestamp: new Date()
    };
  }

  getMiniStatement(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.#transactions
      .filter(t => t.timestamp >= cutoffDate)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
}

/**
 * Encapsulation with Module Pattern
 */
const ShoppingCart = (() => {
  // Private variables
  let items = [];
  let discounts = [];

  // Private methods
  function calculateItemTotal(price, quantity) {
    return price * quantity;
  }

  function calculateDiscount(total) {
    let discount = 0;
    for (const d of discounts) {
      if (total >= d.minAmount) {
        discount = Math.max(discount, d.amount);
      }
    }
    return discount;
  }

  return {
    // Public methods
    addItem(product, quantity = 1) {
      const existingItem = items.find(item => item.product.id === product.id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.total = calculateItemTotal(existingItem.product.price, existingItem.quantity);
      } else {
        items.push({
          product,
          quantity,
          total: calculateItemTotal(product.price, quantity)
        });
      }
    },

    removeItem(productId) {
      items = items.filter(item => item.product.id !== productId);
    },

    updateQuantity(productId, newQuantity) {
      const item = items.find(item => item.product.id === productId);
      
      if (item) {
        if (newQuantity <= 0) {
          this.removeItem(productId);
        } else {
          item.quantity = newQuantity;
          item.total = calculateItemTotal(item.product.price, item.quantity);
        }
      }
    },

    getItems() {
      return [...items]; // Return copy
    },

    getSubtotal() {
      return items.reduce((sum, item) => sum + item.total, 0);
    },

    addDiscount(minAmount, amount) {
      discounts.push({ minAmount, amount });
    },

    getTotal() {
      const subtotal = this.getSubtotal();
      const discount = calculateDiscount(subtotal);
      return subtotal - discount;
    },

    clear() {
      items = [];
    }
  };
})();

// Usage
const cart = ShoppingCart;
cart.addItem({ id: 1, name: 'Laptop', price: 999.99 }, 1);
cart.addItem({ id: 2, name: 'Mouse', price: 29.99 }, 2);

console.log('Items:', cart.getItems());
console.log('Subtotal:', cart.getSubtotal());

cart.addDiscount(500, 50);
console.log('Total:', cart.getTotal());
```

---

## Design Patterns

### Q5: Implement common design patterns in Node.js.

**Answer:**

```javascript
/**
 * 1. Observer Pattern
 * One-to-many dependency between objects
 */
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  off(event, listener) {
    if (!this.events[event]) {
      return this;
    }
    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }

  emit(event, data) {
    if (!this.events[event]) {
      return this;
    }
    this.events[event].forEach(listener => listener(data));
    return this;
  }

  once(event, listener) {
    const onceListener = (data) => {
      listener(data);
      this.off(event, onceListener);
    };
    return this.on(event, onceListener);
  }
}

class NewsAgency extends EventEmitter {
  publish(news) {
    console.log(`Publishing news: ${news}`);
    this.emit('news', news);
  }
}

class Subscriber {
  constructor(name) {
    this.name = name;
  }

  receive(news) {
    console.log(`${this.name} received: ${news}`);
  }
}

// Usage
const agency = new NewsAgency();
const subscriber1 = new Subscriber('Alice');
const subscriber2 = new Subscriber('Bob');

agency.on('news', (news) => subscriber1.receive(news));
agency.on('news', (news) => subscriber2.receive(news));

agency.publish('Breaking: New technology released!');

/**
 * 2. Strategy Pattern
 * Define a family of algorithms, encapsulate each one
 */
class PaymentStrategy {
  pay(amount) {
    throw new Error('Pay method must be implemented');
  }
}

class CreditCardPayment extends PaymentStrategy {
  constructor(cardNumber, cvv, expiryDate) {
    super();
    this.cardNumber = cardNumber;
    this.cvv = cvv;
    this.expiryDate = expiryDate;
  }

  pay(amount) {
    console.log(`Paying $${amount} with credit card ending in ${this.cardNumber.slice(-4)}`);
    return { success: true, method: 'credit_card' };
  }
}

class PayPalPayment extends PaymentStrategy {
  constructor(email) {
    super();
    this.email = email;
  }

  pay(amount) {
    console.log(`Paying $${amount} via PayPal account ${this.email}`);
    return { success: true, method: 'paypal' };
  }
}

class CryptoPayment extends PaymentStrategy {
  constructor(walletAddress) {
    super();
    this.walletAddress = walletAddress;
  }

  pay(amount) {
    console.log(`Paying $${amount} from crypto wallet ${this.walletAddress}`);
    return { success: true, method: 'crypto' };
  }
}

class ShoppingCart {
  constructor() {
    this.paymentStrategy = null;
    this.items = [];
  }

  setPaymentStrategy(strategy) {
    this.paymentStrategy = strategy;
  }

  addItem(item, price) {
    this.items.push({ item, price });
  }

  calculateTotal() {
    return this.items.reduce((sum, { price }) => sum + price, 0);
  }

  checkout() {
    if (!this.paymentStrategy) {
      throw new Error('Payment strategy not set');
    }

    const total = this.calculateTotal();
    return this.paymentStrategy.pay(total);
  }
}

// Usage
const cart = new ShoppingCart();
cart.addItem('Laptop', 999.99);
cart.addItem('Mouse', 29.99);

cart.setPaymentStrategy(new CreditCardPayment('4111111111111111', '123', '12/25'));
cart.checkout();

cart.setPaymentStrategy(new PayPalPayment('user@example.com'));
cart.checkout();

/**
 * 3. Repository Pattern
 * Abstraction layer for data access
 */
class UserRepository {
  constructor(database) {
    this.db = database;
  }

  async findById(id) {
    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }

  async findByEmail(email) {
    return this.db.query('SELECT * FROM users WHERE email = ?', [email]);
  }

  async create(userData) {
    return this.db.query('INSERT INTO users SET ?', [userData]);
  }

  async update(id, userData) {
    return this.db.query('UPDATE users SET ? WHERE id = ?', [userData, id]);
  }

  async delete(id) {
    return this.db.query('DELETE FROM users WHERE id = ?', [id]);
  }
}

/**
 * 4. Dependency Injection
 * Inject dependencies instead of creating them
 */
class EmailService {
  constructor(smtpConfig) {
    this.smtpConfig = smtpConfig;
  }

  sendEmail(to, subject, body) {
    console.log(`Sending email to ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
  }
}

class UserService {
  constructor(userRepository, emailService) {
    this.userRepository = userRepository;
    this.emailService = emailService;
  }

  async registerUser(userData) {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    
    if (existingUser) {
      throw new Error('User already exists');
    }

    const user = await this.userRepository.create(userData);
    
    // Send welcome email
    this.emailService.sendEmail(
      user.email,
      'Welcome to our platform',
      'Thank you for registering!'
    );

    return user;
  }

  async getUserProfile(userId) {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}

// Dependency injection container
class Container {
  constructor() {
    this.dependencies = new Map();
  }

  register(name, factory) {
    this.dependencies.set(name, factory);
  }

  resolve(name) {
    const factory = this.dependencies.get(name);
    if (!factory) {
      throw new Error(`Dependency ${name} not found`);
    }
    return factory(this);
  }
}

// Usage
const container = new Container();

container.register('database', () => ({
  query: (sql, params) => Promise.resolve({ id: 1, ...params[0] })
}));

container.register('emailService', (container) => {
  const smtpConfig = {
    host: 'smtp.example.com',
    port: 587
  };
  return new EmailService(smtpConfig);
});

container.register('userRepository', (container) => {
  const db = container.resolve('database');
  return new UserRepository(db);
});

container.register('userService', (container) => {
  const userRepository = container.resolve('userRepository');
  const emailService = container.resolve('emailService');
  return new UserService(userRepository, emailService);
});

const userService = container.resolve('userService');
```

---

## Summary

**Key Takeaways:**
1. **Encapsulation** - Use private fields (#) and closures
2. **Inheritance** - Extends classes, super() calls
3. **Polymorphism** - Method overriding, interfaces
4. **Abstraction** - Abstract classes, hide complexity
5. **Design Patterns** - Factory, Singleton, Builder, Observer
6. **Composition over Inheritance** - Prefer composition
7. **SOLID Principles** - Single responsibility, Open/Closed, etc.
8. **Prototypes** - Understand JavaScript's prototype chain
9. **Getters/Setters** - Control property access
10. **Mixins** - Share behavior between classes