# JavaScript Interview Questions & Answers
## For 10+ Years Experienced Node.js Developer

---

## Table of Contents
1. [Core JavaScript Concepts](#core-javascript-concepts)
2. [Asynchronous JavaScript](#asynchronous-javascript)
3. [ES6+ Features](#es6-features)
4. [Closures & Scope](#closures--scope)
5. [Prototypes & Inheritance](#prototypes--inheritance)
6. [Event Loop](#event-loop)
7. [Complex Scenarios](#complex-scenarios)

---

## Core JavaScript Concepts

### Q1: Explain hoisting, temporal dead zone, and variable declaration differences.

**Answer:**

```javascript
/**
 * 1. Hoisting
 * Variable and function declarations are moved to the top
 */

// Function declarations are hoisted entirely
console.log(sayHello()); // Works! "Hello"

function sayHello() {
  return 'Hello';
}

// Function expressions are NOT hoisted
// console.log(sayGoodbye()); // Error: sayGoodbye is not a function

const sayGoodbye = function() {
  return 'Goodbye';
};

// var hoisting - undefined
console.log(x); // undefined
var x = 5;

// let/const hoisting - ReferenceError
// console.log(y); // ReferenceError: Cannot access 'y' before initialization
let y = 10;

/**
 * 2. Temporal Dead Zone (TDZ)
 * Time between entering scope and variable declaration
 */
{
  // TDZ for variable starts here
  // console.log(a); // ReferenceError
  
  let a = 10; // TDZ ends
  
  console.log(a); // 10
}

/**
 * 3. Variable Declaration Differences
 */

// var - Function-scoped, hoisted, can be redeclared
function testVar() {
  if (true) {
    var x = 10;
  }
  console.log(x); // 10 (accessible outside block)
}

testVar();

var z = 1;
var z = 2; // Redeclaration allowed

// let - Block-scoped, hoisted with TDZ, cannot be redeclared
function testLet() {
  if (true) {
    let y = 10;
  }
  // console.log(y); // ReferenceError: y is not defined
}

// let w = 1;
// let w = 2; // SyntaxError: Identifier 'w' has already been declared

// const - Block-scoped, hoisted with TDZ, cannot be redeclared or reassigned
const PI = 3.14159;
// PI = 3.14; // TypeError: Assignment to constant variable

// Objects declared with const can be modified
const user = { name: 'John' };
user.name = 'Jane'; // OK
// user = {}; // TypeError

/**
 * 4. Practical Examples
 */

// Example 1: Hoisting with functions
console.log(double(5)); // 10 - Works due to hoisting

function double(n) {
  return n * 2;
}

// Example 2: TDZ with const and let
const numbers = [1, 2, 3];
for (let i = 0; i < numbers.length; i++) {
  console.log(numbers[i]);
}

// Example 3: Understanding block scope with let
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log('var:', i), 100);
}
// Output: var: 3, var: 3, var: 3

for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log('let:', j), 100);
}
// Output: let: 0, let: 1, let: 2
```

---

## Asynchronous JavaScript

### Q2: Implement various async patterns and handle errors properly.

**Answer:**

```javascript
/**
 * 1. Callback Pattern
 * Traditional asynchronous pattern in Node.js
 */

function fetchDataCallback(callback) {
  setTimeout(() => {
    const data = { id: 1, name: 'John' };
    callback(null, data); // Error-first callback
  }, 1000);
}

// Usage
fetchDataCallback((error, data) => {
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Data:', data);
});

/**
 * 2. Promise Pattern
 * Modern asynchronous pattern
 */

function fetchDataPromise() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const success = Math.random() > 0.5;
      if (success) {
        resolve({ id: 1, name: 'John' });
      } else {
        reject(new Error('Failed to fetch data'));
      }
    }, 1000);
  });
}

// Usage
fetchDataPromise()
  .then(data => console.log('Data:', data))
  .catch(error => console.error('Error:', error));

/**
 * 3. Async/Await Pattern
 * Syntactic sugar over promises
 */

async function fetchDataAsync() {
  try {
    const data = await fetchDataPromise();
    console.log('Data:', data);
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error; // Re-throw for caller to handle
  }
}

// Usage
fetchDataAsync().catch(error => console.error('Caught error:', error));

/**
 * 4. Promise.all - Parallel execution
 */

function fetchMultipleData() {
  const promises = [
    fetch('https://api.example.com/users').then(r => r.json()),
    fetch('https://api.example.com/products').then(r => r.json()),
    fetch('https://api.example.com/orders').then(r => r.json())
  ];

  return Promise.all(promises);
}

async function loadAllData() {
  try {
    const [users, products, orders] = await fetchMultipleData();
    console.log('Users:', users);
    console.log('Products:', products);
    console.log('Orders:', orders);
    return { users, products, orders };
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}

/**
 * 5. Promise.allSettled - All complete regardless of success/failure
 */

async function fetchWithAllSettled() {
  const promises = [
    fetch('https://api.example.com/users').then(r => r.json()),
    fetch('https://api.example.com/products').then(r => r.json()),
    fetch('https://api.example.com/orders').then(r => r.json())
  ];

  const results = await Promise.allSettled(promises);
  
  return results.map((result, index) => ({
    index,
    status: result.status,
    data: result.status === 'fulfilled' ? result.value : result.reason.message
  }));
}

/**
 * 6. Promise.race - First to complete
 */

function fetchWithTimeout(url, timeout = 5000) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), timeout)
  );

  const fetchPromise = fetch(url);

  return Promise.race([fetchPromise, timeoutPromise]);
}

/**
 * 7. Promise.any - First successful
 */

async function fetchFirstSuccessful(urls) {
  const promises = urls.map(url => fetch(url).then(r => r.json()));
  
  try {
    return await Promise.any(promises);
  } catch (error) {
    throw new Error('All promises failed');
  }
}

/**
 * 8. Sequential execution with async/await
 */

async function processSequentially(items) {
  const results = [];
  
  for (const item of items) {
    const result = await processData(item);
    results.push(result);
  }
  
  return results;
}

/**
 * 9. Parallel execution with limited concurrency
 */

async function processWithConcurrency(items, concurrency = 3) {
  const results = [];
  const executing = [];

  for (const item of items) {
    const promise = processData(item).then(result => {
      results.push(result);
      executing.splice(executing.indexOf(promise), 1);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * 10. Error handling in async/await
 */

async function fetchWithRetry(url, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * 11. Async function utilities
 */

// Debounce async function
function debounceAsync(fn, delay) {
  let timeoutId;
  let pendingPromise = null;

  return function(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (pendingPromise) {
      return pendingPromise;
    }

    pendingPromise = new Promise(async (resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn.apply(this, args);
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          timeoutId = null;
          pendingPromise = null;
        }
      }, delay);
    });

    return pendingPromise;
  };
}

// Throttle async function
function throttleAsync(fn, limit) {
  let inProgress = false;

  return async function(...args) {
    if (inProgress) {
      return;
    }

    inProgress = true;
    try {
      const result = await fn.apply(this, args);
      return result;
    } finally {
      inProgress = false;
    }
  };
}

// Memoize async function
function memoizeAsync(fn) {
  const cache = new Map();

  return async function(...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const promise = fn.apply(this, args).then(result => {
      cache.set(key, result);
      return result;
    });

    cache.set(key, promise);
    return promise;
  };
}

// Usage examples
const memoizedFetch = memoizeAsync(async (url) => {
  const response = await fetch(url);
  return response.json();
});

// Parallel execution with error handling
async function safeParallel(promises) {
  const results = await Promise.allSettled(promises);
  
  const successes = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
  
  const failures = results
    .filter(r => r.status === 'rejected')
    .map(r => r.reason);

  return { successes, failures };
}
```

---

## ES6+ Features

### Q3: Implement modern JavaScript features (ES6+).

**Answer:**

```javascript
/**
 * 1. Destructuring
 */

// Object destructuring
const user = {
  name: 'John',
  age: 30,
  email: 'john@example.com',
  address: {
    city: 'New York',
    country: 'USA'
  }
};

const { name, age, email } = user;
const { city, country } = user.address;

// Renaming
const { name: userName, age: userAge } = user;

// Default values
const { role = 'user' } = user;

// Array destructuring
const numbers = [1, 2, 3, 4, 5];
const [first, second, ...rest] = numbers;
console.log(first, second, rest); // 1 2 [3, 4, 5]

// Function parameter destructuring
function greet({ name, greeting = 'Hello' }) {
  return `${greeting}, ${name}!`;
}

/**
 * 2. Spread and Rest Operators
 */

// Spread with objects
const obj1 = { a: 1, b: 2 };
const obj2 = { c: 3, d: 4 };
const merged = { ...obj1, ...obj2 };
console.log(merged); // { a: 1, b: 2, c: 3, d: 4 }

// Spread with arrays
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2];
console.log(combined); // [1, 2, 3, 4, 5, 6]

// Rest parameters
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}
console.log(sum(1, 2, 3, 4)); // 10

// Spread in function calls
function add(a, b, c) {
  return a + b + c;
}
const nums = [1, 2, 3];
console.log(add(...nums)); // 6

/**
 * 3. Template Literals
 */

const firstName = 'John';
const lastName = 'Doe';

const greeting = `Hello, ${firstName} ${lastName}!`;
console.log(greeting);

// Multiline strings
const html = `
  <div>
    <h1>${greeting}</h1>
    <p>Welcome to our website</p>
  </div>
`;

// Tagged template literals
function highlight(strings, ...values) {
  return strings.reduce((result, string, i) => {
    const value = values[i] ? `<strong>${values[i]}</strong>` : '';
    return result + string + value;
  }, '');
}

const name = 'Alice';
const message = highlight`Hello, ${name}!`;
console.log(message); // "Hello, <strong>Alice</strong>!"

/**
 * 4. Arrow Functions
 */

// Different syntaxes
const add1 = (a, b) => a + b;
const add2 = (a, b) => { return a + b; };
const square = x => x * x;
const log = () => console.log('Logging');

// Arrow functions and 'this'
const calculator = {
  value: 10,
  
  double() {
    return function() {
      return this.value * 2;
    };
  },
  
  doubleArrow() {
    return () => this.value * 2;
  }
};

const calc = calculator;
const normalDouble = calc.double();
const arrowDouble = calc.doubleArrow();

console.log(normalDouble()); // undefined (this lost)
console.log(arrowDouble()); // 20 (this preserved from surrounding scope)

/**
 * 5. Classes
 */

class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  greet() {
    return `Hello, I'm ${this.name}`;
  }

  static getSpecies() {
    return 'Homo sapiens';
  }
}

class Employee extends Person {
  constructor(name, age, employeeId) {
    super(name, age);
    this.employeeId = employeeId;
  }

  greet() {
    return `${super.greet()} (ID: ${this.employeeId})`;
  }
}

const employee = new Employee('John', 30, 'EMP001');
console.log(employee.greet());
console.log(Person.getSpecies());

/**
 * 6. Modules
 */

// export (user.js)
export class User {
  constructor(name) {
    this.name = name;
  }
}

export const ADMIN_ROLE = 'admin';

export function validateEmail(email) {
  return email.includes('@');
}

// export default
export default class Database {
  connect() {
    console.log('Connected to database');
  }
}

// import (app.js)
import User, { ADMIN_ROLE, validateEmail } from './user.js';
import Database from './database.js';

const db = new Database();
db.connect();

/**
 * 7. Optional Chaining (?.)
 */

const user = {
  profile: {
    address: {
      city: 'New York'
    }
  }
};

console.log(user.profile?.address?.city); // "New York"
console.log(user.settings?.theme); // undefined

// With function calls
const result = user.getData?.()?.value;

/**
 * 8. Nullish Coalescing (??)
 */

const value = null ?? 'default'; // 'default'
const value2 = 0 ?? 'default'; // 0
const value3 = '' ?? 'default'; // ''
const value4 = false ?? 'default'; // false

// Comparison with ||
const value5 = 0 || 'default'; // 'default'
const value6 = '' || 'default'; // 'default'

/**
 * 9. Object and Array Methods
 */

// Object.keys, values, entries
const obj = { a: 1, b: 2, c: 3 };
console.log(Object.keys(obj)); // ['a', 'b', 'c']
console.log(Object.values(obj)); // [1, 2, 3]
console.log(Object.entries(obj)); // [['a', 1], ['b', 2], ['c', 3]]

// Array methods
const numbers = [1, 2, 3, 4, 5];

// map
const doubled = numbers.map(n => n * 2);

// filter
const evens = numbers.filter(n => n % 2 === 0);

// reduce
const sum = numbers.reduce((acc, n) => acc + n, 0);

// find
const found = numbers.find(n => n > 3);

// some, every
const hasEven = numbers.some(n => n % 2 === 0);
const allPositive = numbers.every(n => n > 0);

// flat, flatMap
const nested = [[1, 2], [3, 4], [5]];
const flattened = nested.flat();
const flatMapped = nested.flatMap(arr => arr.map(n => n * 2));

/**
 * 10. Generators
 */

function* generateSequence() {
  yield 1;
  yield 2;
  yield 3;
}

const generator = generateSequence();
console.log(generator.next().value); // 1
console.log(generator.next().value); // 2
console.log(generator.next().value); // 3

// Infinite generator
function* idGenerator() {
  let id = 1;
  while (true) {
    yield id++;
  }
}

const idGen = idGenerator();
console.log(idGen.next().value); // 1
console.log(idGen.next().value); // 2

/**
 * 11. Iterators and Iterables
 */

class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;

    return {
      next() {
        if (current <= end) {
          return { value: current++, done: false };
        }
        return { done: true };
      }
    };
  }
}

const range = new Range(1, 5);
for (const num of range) {
  console.log(num); // 1, 2, 3, 4, 5
}
```

---

## Closures & Scope

### Q4: Explain closures with practical examples.

**Answer:**

```javascript
/**
 * Closure: Function + Lexical Environment
 * Inner function has access to outer function's variables
 */

/**
 * 1. Basic Closure Example
 */
function createCounter() {
  let count = 0;

  return {
    increment() {
      count++;
      return count;
    },
    decrement() {
      count--;
      return count;
    },
    getCount() {
      return count;
    }
  };
}

const counter = createCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.decrement()); // 1
console.log(counter.getCount()); // 1

/**
 * 2. Function Factory
 */
function createMultiplier(multiplier) {
  return function(number) {
    return number * multiplier;
  };
}

const double = createMultiplier(2);
const triple = createMultiplier(3);

console.log(double(5)); // 10
console.log(triple(5)); // 15

/**
 * 3. Private Variables
 */
function createBankAccount(initialBalance) {
  let balance = initialBalance;
  let transactions = [];

  return {
    deposit(amount) {
      balance += amount;
      transactions.push({ type: 'deposit', amount, balance });
      return balance;
    },
    withdraw(amount) {
      if (amount > balance) {
        throw new Error('Insufficient balance');
      }
      balance -= amount;
      transactions.push({ type: 'withdraw', amount, balance });
      return balance;
    },
    getBalance() {
      return balance;
    },
    getTransactions() {
      return [...transactions];
    }
  };
}

const account = createBankAccount(100);
account.deposit(50);
account.withdraw(30);
console.log(account.getBalance()); // 120

/**
 * 4. Memoization with Closure
 */
function memoize(fn) {
  const cache = new Map();

  return function(...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

function expensiveComputation(n) {
  console.log('Computing...');
  let result = 0;
  for (let i = 0; i < n; i++) {
    result += i;
  }
  return result;
}

const memoizedComputation = memoize(expensiveComputation);
console.log(memoizedComputation(100)); // Computes
console.log(memoizedComputation(100)); // From cache

/**
 * 5. Event Handlers with Closure
 */
function setupButtons() {
  const buttons = document.querySelectorAll('button');

  buttons.forEach((button, index) => {
    button.addEventListener('click', function() {
      // Closure captures index
      console.log(`Button ${index} clicked`);
    });
  });
}

/**
 * 6. Closure in Async Operations
 */
function fetchData(url) {
  const cache = new Map();

  return async function(endpoint) {
    const fullUrl = `${url}${endpoint}`;

    if (cache.has(fullUrl)) {
      console.log('From cache:', fullUrl);
      return cache.get(fullUrl);
    }

    console.log('Fetching:', fullUrl);
    const response = await fetch(fullUrl);
    const data = await response.json();

    cache.set(fullUrl, data);
    return data;
  };
}

const apiClient = fetchData('https://api.example.com');

/**
 * 7. Closure in Module Pattern
 */
const ShoppingCart = (() => {
  const cart = [];
  let totalPrice = 0;

  return {
    addItem(item) {
      cart.push(item);
      totalPrice += item.price;
      console.log(`Added ${item.name}, Total: ${totalPrice}`);
    },
    removeItem(index) {
      if (index >= 0 && index < cart.length) {
        totalPrice -= cart[index].price;
        cart.splice(index, 1);
        console.log(`Removed item at ${index}, Total: ${totalPrice}`);
      }
    },
    getTotal() {
      return totalPrice;
    },
    getItems() {
      return [...cart];
    }
  };
})();

ShoppingCart.addItem({ name: 'Laptop', price: 999 });
ShoppingCart.addItem({ name: 'Mouse', price: 29 });
console.log('Total:', ShoppingCart.getTotal());

/**
 * 8. Closure for Debouncing
 */
function debounce(func, wait) {
  let timeout;

  return function(...args) {
    const context = this;
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

const debouncedSearch = debounce((query) => {
  console.log('Searching for:', query);
}, 300);

// Usage in input event
// input.addEventListener('input', (e) => debouncedSearch(e.target.value));

/**
 * 9. Closure for Throttling
 */
function throttle(func, limit) {
  let inThrottle;

  return function(...args) {
    const context = this;

    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

const throttledScroll = throttle(() => {
  console.log('Scrolled');
}, 100);

// window.addEventListener('scroll', throttledScroll);

/**
 * 10. Common Closure Pitfalls
 */

// Pitfall 1: Loop with closures
// WRONG
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log('Wrong:', i), 100);
}
// Output: Wrong: 3, Wrong: 3, Wrong: 3

// CORRECT with IIFE
for (var i = 0; i < 3; i++) {
  (function(j) {
    setTimeout(() => console.log('Correct:', j), 100);
  })(i);
}

// CORRECT with let (block scope)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log('Correct:', i), 100);
}

// Pitfall 2: Memory leaks with closures
function createLeakyFunction() {
  const largeData = new Array(1000000).fill('data');

  return function() {
    console.log('Large data is still in memory');
  };
}

// To fix, explicitly nullify references
function createNonLeakyFunction() {
  const largeData = new Array(1000000).fill('data');

  return function() {
    console.log('Function called');
    largeData = null; // Allow garbage collection
  };
}
```

---

## Prototypes & Inheritance

### Q5: Explain JavaScript's prototype chain and implement inheritance.

**Answer:**

```javascript
/**
 * 1. Prototype Chain
 */

function Person(name) {
  this.name = name;
}

Person.prototype.greet = function() {
  return `Hello, I'm ${this.name}`;
};

const john = new Person('John');

// Prototype chain lookup
console.log(john.greet()); // "Hello, I'm John"
console.log(john.toString()); // [object Object] - from Object.prototype

/**
 * 2. Constructor Function with Prototype
 */

function Animal(name) {
  this.name = name;
}

Animal.prototype.speak = function() {
  return `${this.name} makes a sound`;
};

Animal.prototype.eat = function() {
  return `${this.name} is eating`;
};

function Dog(name, breed) {
  Animal.call(this, name); // Call parent constructor
  this.breed = breed;
}

// Inherit prototype
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;

// Override method
Dog.prototype.speak = function() {
  return `${this.name} barks: Woof!`;
};

// Add new method
Dog.prototype.fetch = function() {
  return `${this.name} fetches the ball`;
};

const dog = new Dog('Buddy', 'Golden Retriever');
console.log(dog.speak()); // "Buddy barks: Woof!"
console.log(dog.eat()); // "Buddy is eating" - from Animal prototype
console.log(dog.fetch()); // "Buddy fetches the ball"

/**
 * 3. ES6 Classes (Syntactic Sugar over Prototypes)
 */

class Vehicle {
  constructor(make, model) {
    this.make = make;
    this.model = model;
  }

  start() {
    return `${this.make} ${this.model} is starting`;
  }

  stop() {
    return `${this.make} ${this.model} is stopping`;
  }
}

class Car extends Vehicle {
  constructor(make, model, year) {
    super(make, model);
    this.year = year;
  }

  drive() {
    return `${this.year} ${this.make} ${this.model} is driving`;
  }
}

const car = new Car('Toyota', 'Camry', 2024);
console.log(car.start()); // "Toyota Camry is starting"
console.log(car.drive()); // "2024 Toyota Camry is driving"

/**
 * 4. Object.create()
 */

const personPrototype = {
  greet() {
    return `Hello, I'm ${this.name}`;
  }
};

const person1 = Object.create(personPrototype);
person1.name = 'Alice';

const person2 = Object.create(personPrototype);
person2.name = 'Bob';

console.log(person1.greet()); // "Hello, I'm Alice"
console.log(person2.greet()); // "Hello, I'm Bob"

/**
 * 5. Prototypal Inheritance Pattern
 */

const vehicle = {
  init(make, model) {
    this.make = make;
    this.model = model;
  },
  start() {
    return `${this.make} ${this.model} is starting`;
  }
};

const motorcycle = Object.create(vehicle);
motorcycle.init('Harley-Davidson', 'Street 750');

const bicycle = Object.create(vehicle);
bicycle.init('Trek', 'FX 2');

console.log(motorcycle.start()); // "Harley-Davidson Street 750 is starting"
console.log(bicycle.start()); // "Trek FX 2 is starting"

/**
 * 6. Mixin Pattern
 */

const Timestampable = {
  setTimestamp() {
    this.timestamp = new Date();
  }
};

const Identifiable = {
  setId(id) {
    this.id = id;
  }
};

const Validateable = {
  isValid() {
    return true;
  }
};

function applyMixins(target, ...sources) {
  Object.assign(target, ...sources);
}

class Entity {}

applyMixins(Entity.prototype, Timestampable, Identifiable, Validateable);

const entity = new Entity();
entity.setTimestamp();
entity.setId('ENT-001');
console.log(entity.isValid()); // true

/**
 * 7. Checking Prototype Relationships
 */

console.log(car instanceof Car); // true
console.log(car instanceof Vehicle); // true
console.log(car instanceof Object); // true

console.log(Car.prototype.isPrototypeOf(car)); // true
console.log(Vehicle.prototype.isPrototypeOf(Car.prototype)); // true

/**
 * 8. Property Descriptors
 */

const obj = {
  name: 'John',
  age: 30
};

const descriptor = Object.getOwnPropertyDescriptor(obj, 'name');
console.log(descriptor);
// {
//   value: 'John',
//   writable: true,
//   enumerable: true,
//   configurable: true
// }

// Define property with getter/setter
Object.defineProperty(obj, 'fullName', {
  get() {
    return `${this.name}`;
  },
  set(value) {
    const parts = value.split(' ');
    this.name = parts[0];
    this.age = parts[1];
  }
});

obj.fullName = 'John 30';
console.log(obj.fullName); // "John 30"

/**
 * 9. Object.create() vs new
 */

// Using Object.create()
const prototypeObj = {
  greet() {
    return `Hello, ${this.name}`;
  }
};

const obj1 = Object.create(prototypeObj);
obj1.name = 'Alice';

// Using constructor function
function Greeter(name) {
  this.name = name;
}

Greeter.prototype = prototypeObj;

const obj2 = new Greeter('Bob');

console.log(obj1.greet()); // "Hello, Alice"
console.log(obj2.greet()); // "Hello, Bob"

/**
 * 10. __proto__ vs prototype
 */

function User(name) {
  this.name = name;
}

User.prototype.greet = function() {
  return `Hello, ${this.name}`;
};

const user = new User('Charlie');

console.log(user.__proto__ === User.prototype); // true
console.log(User.prototype.__proto__ === Object.prototype); // true
console.log(Object.prototype.__proto__ === null); // true

// Don't use __proto__ in production code
// Use Object.getPrototypeOf() and Object.setPrototypeOf() instead
const proto = Object.getPrototypeOf(user);
console.log(proto === User.prototype); // true
```

---

## Event Loop

### Q6: Explain the JavaScript event loop and execution order.

**Answer:**

```javascript
/**
 * Event Loop Components:
 * 1. Call Stack - Synchronous code execution
 * 2. Task Queue (Macrotasks) - setTimeout, setInterval, setImmediate
 * 3. Microtask Queue - Promises, queueMicrotask
 * 4. Web APIs - DOM, fetch, etc. (browser-specific)
 */

console.log('1. Script start');

setTimeout(() => {
  console.log('2. setTimeout');
}, 0);

Promise.resolve().then(() => {
  console.log('3. Promise.then');
});

console.log('4. Script end');

// Output:
// 1. Script start
// 4. Script end
// 3. Promise.then (microtask)
// 2. setTimeout (macrotask)

/**
 * Execution Order Examples
 */

console.log('=== Example 1 ===');

setTimeout(() => console.log('A'), 0);
Promise.resolve().then(() => console.log('B'));
Promise.resolve().then(() => console.log('C'));
console.log('D');

// Output: D, B, C, A

console.log('=== Example 2 ===');

setTimeout(() => console.log('1'), 0);
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
Promise.resolve().then(() => console.log('4'));

// Output: 3, 4, 1, 2

console.log('=== Example 3: Nested ===');

setTimeout(() => {
  console.log('A');
  Promise.resolve().then(() => console.log('B'));
}, 0);

Promise.resolve().then(() => {
  console.log('C');
  setTimeout(() => console.log('D'), 0);
});

// Output: C, A, B, D

/**
 * Microtasks vs Macrotasks
 */

console.log('Start');

setTimeout(() => {
  console.log('Timeout 1');
}, 0);

queueMicrotask(() => {
  console.log('Microtask 1');
  queueMicrotask(() => {
    console.log('Microtask 2');
  });
});

setTimeout(() => {
  console.log('Timeout 2');
}, 0);

Promise.resolve().then(() => {
  console.log('Promise 1');
});

console.log('End');

// Output: Start, End, Microtask 1, Microtask 2, Promise 1, Timeout 1, Timeout 2

/**
 * Async/Await and Event Loop
 */

async function asyncFunction() {
  console.log('Inside async function');
  await Promise.resolve();
  console.log('After await');
}

console.log('Before async call');
asyncFunction();
console.log('After async call');

// Output:
// Before async call
// Inside async function
// After async call
// After await
// (Await yields control back to event loop)

/**
 * setImmediate vs setTimeout vs process.nextTick
 */

console.log('=== setImmediate vs setTimeout vs nextTick ===');

setImmediate(() => console.log('setImmediate'));
setTimeout(() => console.log('setTimeout 0'), 0);
process.nextTick(() => console.log('nextTick 1'));
process.nextTick(() => console.log('nextTick 2'));

// Output: nextTick 1, nextTick 2, setImmediate, setTimeout 0

/**
 * Complex Event Loop Scenario
 */

console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => {
  console.log('3');
  setTimeout(() => console.log('4'), 0);
});

console.log('5');

queueMicrotask(() => {
  console.log('6');
  Promise.resolve().then(() => console.log('7'));
});

// Output: 1, 5, 3, 6, 7, 2, 4

/**
 * Event Loop in Node.js with I/O
 */

const fs = require('fs');

console.log('Start reading file');

fs.readFile('example.txt', 'utf8', (err, data) => {
  console.log('File read complete');
  process.nextTick(() => {
    console.log('NextTick in callback');
  });
});

console.log('Continue execution');

// Output: Start reading file, Continue execution, File read complete, NextTick in callback

/**
 * Understanding Promise Execution
 */

Promise.resolve()
  .then(() => {
    console.log('Promise 1');
    return Promise.resolve();
  })
  .then(() => {
    console.log('Promise 2');
  });

setTimeout(() => {
  console.log('Timeout');
}, 0);

// Output: Promise 1, Promise 2, Timeout

/**
 * Async Function and Promise Chain
 */

async function async1() {
  console.log('Async 1 start');
  await Promise.resolve();
  console.log('Async 1 end');
}

async function async2() {
  console.log('Async 2 start');
  await Promise.resolve();
  console.log('Async 2 end');
}

async1();
async2();

// Output:
// Async 1 start
// Async 2 start
// Async 1 end
// Async 2 end
```

---

## Advanced JavaScript Patterns for Production

### Q8: Memory Management, Garbage Collection, and Performance Optimization

**Answer:**

```javascript
/**
 * Memory Management in V8 Engine
 */

// 1. Heap Memory vs Stack Memory
// Stack - Fixed size, function calls, primitive values
// Heap - Dynamic size, objects, arrays, strings

function memoryExample() {
  // Stack (primitive)
  const count = 42;
  
  // Heap (object)
  const user = { name: 'John', age: 30 };
  
  // When function ends, stack is freed
  // Heap objects freed when no references exist
}

/**
 * 2. Garbage Collection Principles
 */

// Automatic GC - Mark and Sweep algorithm
class GarbageCollectionExample {
  constructor() {
    this.objects = [];
  }

  createObjects() {
    // Create objects that will be garbage collected
    const temp = new Array(1000).fill({});
    this.objects.push(temp);
  }

  // Mark phase: Identify reachable objects
  // Sweep phase: Delete unreachable objects
  // Compact phase: Move data to reduce fragmentation
}

/**
 * 3. Memory Leaks - Common Patterns to Avoid
 */

// MEMORY LEAK #1: Orphaned timers
class BadTimer {
  constructor() {
    this.interval = setInterval(() => {
      // If not cleared, this runs forever and holds memory
    }, 1000);
  }

  destroy() {
    clearInterval(this.interval); // Must do this!
  }
}

// MEMORY LEAK #2: Listener accumulation
class BadEventListener {
  constructor(element) {
    this.element = element;
    this.element.addEventListener('click', () => {
      this.handleClick();
    }); // No cleanup!
  }

  destroy() {
    // Should remove listener
    element.removeEventListener('click', this.boundHandler);
  }
}

// MEMORY LEAK #3: Global variables
window.globalCache = []; // If not managed, grows indefinitely

class ProperMemoryManagement {
  constructor() {
    this.timerId = null;
    this.events = [];
  }

  // Detachable resources
  addTimer(fn, interval) {
    this.timerId = setInterval(fn, interval);
  }

  addEventListener(element, event, handler) {
    this.boundHandler = handler.bind(this);
    element.addEventListener(event, this.boundHandler);
    this.events.push({ element, event, handler: this.boundHandler });
  }

  // Cleanup method following cleanup pattern
  cleanup() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }

    this.events.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });

    this.events = [];
  }
}

/**
 * 4. Preventing Memory Leaks with WeakMap & WeakSet
 */

class WeakRefExample {
  constructor() {
    // Strong reference - object stays in memory
    this.cache = new Map();
    // Weak reference - object can be garbage collected
    this.weakCache = new WeakMap();
  }

  // Bad: Keeps objects alive
  // user -> cache -> user (circular)
  strongCacheBad(user) {
    this.cache.set(user.id, {
      data: user,
      lastAccessed: Date.now()
    });
  }

  // Good: Objects can be GC'd if no other references
  weakCacheGood(user) {
    this.weakCache.set(user, {
      lastAccessed: Date.now()
    });
  }
}

/**
 * 5. String Optimization
 */

class StringOptimization {
  // BAD: Creates many intermediate strings
  buildStringBad(items) {
    let result = '';
    for (const item of items) {
      result += item + ', '; // Creates new string each iteration
    }
    return result;
  }

  // GOOD: Single allocation
  buildStringGood(items) {
    return items.join(', ');
  }

  // GOOD: Template literals with single expression
  buildTemplateGood(items) {
    return `Items: ${items.join(', ')}`;
  }
}

/**
 * 6. Object Pooling - Reuse objects instead of creating new ones
 */

class ObjectPool {
  constructor(Factory, initialSize = 10) {
    this.Factory = Factory;
    this.available = [];
    this.inUse = new Set();

    // Pre-allocate objects
    for (let i = 0; i < initialSize; i++) {
      this.available.push(new Factory());
    }
  }

  acquire() {
    let obj;
    if (this.available.length > 0) {
      obj = this.available.pop();
    } else {
      obj = new this.Factory();
    }
    this.inUse.add(obj);
    return obj;
  }

  release(obj) {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj);
      obj.reset?.();
      this.available.push(obj);
    }
  }

  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    };
  }
}

// Example: Request object pooling
class Request {
  constructor() {
    this.headers = {};
    this.body = null;
    this.url = '';
  }

  reset() {
    this.headers = {};
    this.body = null;
    this.url = '';
  }
}

const requestPool = new ObjectPool(Request, 100);

// Instead of: new Request() -> GC cleanup
// Do: requestPool.acquire() -> requestPool.release()
```

---

### Q9: Worker Threads, Streams, and Concurrency Patterns

**Answer:**

```javascript
/**
 * Worker Threads - Run CPU-intensive tasks off main thread
 */

// main.js
const { Worker } = require('worker_threads');
const path = require('path');

class WorkerPool {
  constructor(workerPath, poolSize = 4) {
    this.workers = [];
    this.taskQueue = [];
    this.activeWorkers = new Set();

    // Create worker pool
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerPath);
      worker.on('message', this.handleWorkerMessage.bind(this));
      worker.on('error', this.handleWorkerError.bind(this));
      this.workers.push(worker);
    }
  }

  executeTask(data) {
    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject };

      const availableWorker = this.workers.find(
        w => !this.activeWorkers.has(w)
      );

      if (availableWorker) {
        this.executeOnWorker(availableWorker, task);
      } else {
        // Queue task if all workers busy
        this.taskQueue.push(task);
      }
    });
  }

  executeOnWorker(worker, task) {
    this.activeWorkers.add(worker);
    worker.currentTask = task;
    worker.postMessage(task.data);
  }

  handleWorkerMessage(message) {
    const worker = this;
    const { data, resolve } = worker.currentTask;

    resolve(message);
    this.activeWorkers.delete(worker);

    // Process queued tasks
    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue.shift();
      this.executeOnWorker(worker, nextTask);
    }
  }

  handleWorkerError(error) {
    console.error('Worker error:', error);
  }

  terminate() {
    this.workers.forEach(w => w.terminate());
  }
}

// Usage
// const pool = new WorkerPool('./worker.js', 4);
// const result = await pool.executeTask({ numbers: [1,2,3,4,5] });

/**
 * Streams - Process large data efficiently
 */

const fs = require('fs');
const { Transform, Readable, Writable } = require('stream');

class StreamProcessing {
  // 1. File streaming - Memory efficient
  streamLargeFile(filePath) {
    return fs.createReadStream(filePath, {
      highWaterMark: 64 * 1024 // 64KB chunks
    });
  }

  // 2. Transform stream - Process data while reading
  transformCSVtoJSON() {
    return new Transform({
      transform(chunk, encoding, callback) {
        const lines = chunk.toString().split('\n');
        const [header, ...dataLines] = lines;
        const keys = header.split(',');

        const jsonLines = dataLines
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',');
            const obj = {};
            keys.forEach((key, idx) => {
              obj[key.trim()] = values[idx]?.trim();
            });
            return JSON.stringify(obj) + '\n';
          });

        callback(null, jsonLines.join(''));
      }
    });
  }

  // 3. Backpressure handling - Don't overwhelm consumer
  pipeWithBackpressure(readStream, writeStream) {
    readStream.on('data', (chunk) => {
      // Write returns false if buffer is full
      const canContinue = writeStream.write(chunk);

      if (!canContinue) {
        // Pause reading until write buffer drains
        readStream.pause();
      }
    });

    writeStream.on('drain', () => {
      // Resume reading when write buffer is drained
      readStream.resume();
    });
  }

  // 4. Proper pipeline with error handling
  safePipeline(source, ...transforms) {
    const { pipeline } = require('stream');

    return new Promise((resolve, reject) => {
      pipeline(source, ...transforms, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

/**
 * Concurrency Patterns
 */

class ConcurrencyPatterns {
  // 1. Sequential execution
  async sequentialExecution(operations) {
    const results = [];
    for (const op of operations) {
      results.push(await op());
    }
    return results;
  }

  // 2. Parallel execution (all at once)
  async parallelExecution(operations) {
    return Promise.all(operations.map(op => op()));
  }

  // 3. Controlled concurrency (limit concurrent operations)
  async limitedConcurrency(operations, limit = 5) {
    const results = [];
    const executing = [];

    for (const [index, op] of operations.entries()) {
      const promise = Promise.resolve()
        .then(() => op())
        .then(result => {
          results[index] = result;
          executing.splice(executing.indexOf(promise), 1);
          return result;
        });

      results[index] = promise;
      executing.push(promise);

      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }

    return Promise.all(results);
  }

  // 4. Batch processing
  async batchProcess(items, batchSize = 10, processor) {
    const results = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      );
      results.push(...batchResults);
    }

    return results;
  }

  // 5. Debounce - Delay execution until calls stop
  debounce(fn, delay) {
    let timeoutId;

    return function debounced(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // 6. Throttle - Limit execution frequency
  throttle(fn, interval) {
    let lastCall = 0;

    return function throttled(...args) {
      const now = Date.now();
      if (now - lastCall >= interval) {
        lastCall = now;
        return fn.apply(this, args);
      }
    };
  }
}

/**
 * Buffer Management
 */

class BufferOptimization {
  // Efficient buffer operations
  concatenateBuffers(buffers) {
    // Good: Calculate total size upfront
    const totalSize = buffers.reduce((sum, b) => sum + b.length, 0);
    const result = Buffer.alloc(totalSize);

    let offset = 0;
    for (const buf of buffers) {
      buf.copy(result, offset);
      offset += buf.length;
    }

    return result;
  }

  // Only allocate once, not repeatedly
  readBinaryFile(filePath) {
    const stats = fs.statSync(filePath);
    const buffer = Buffer.alloc(stats.size);

    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, stats.size, 0);
    fs.closeSync(fd);

    return buffer;
  }
}
```

---

### Q10: Performance Profiling, Debugging, and Monitoring

**Answer:**

```javascript
/**
 * Performance Profiling & Debugging
 */

class PerformanceProfiler {
  constructor() {
    this.marks = new Map();
    this.statistics = {
      totalTime: 0,
      callCount: 0,
      minTime: Infinity,
      maxTime: -Infinity
    };
  }

  // Basic timing
  mark(label) {
    this.marks.set(label, Date.now());
  }

  measure(label, startLabel) {
    const startTime = this.marks.get(startLabel) || 0;
    const duration = Date.now() - startTime;

    // Record statistics
    this.statistics.totalTime += duration;
    this.statistics.callCount++;
    this.statistics.minTime = Math.min(this.statistics.minTime, duration);
    this.statistics.maxTime = Math.max(this.statistics.maxTime, duration);

    console.log(`${label}: ${duration}ms`);
    return duration;
  }

  getStats() {
    return {
      ...this.statistics,
      avgTime: (this.statistics.totalTime / this.statistics.callCount).toFixed(2)
    };
  }
}

// Modern Performance API
class ModernProfiling {
  // Use performance.now() for high-resolution timing
  profileFunction(fn) {
    const iterations = 10000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      fn();
    }

    const end = performance.now();
    const avgTime = (end - start) / iterations;

    return {
      totalTime: (end - start).toFixed(2),
      averagePerIteration: avgTime.toFixed(4),
      operationsPerSecond: ((1000 / avgTime) * 1000).toFixed(0)
    };
  }

  // Measure memory usage
  measureMemory(fn) {
    const before = process.memoryUsage();
    
    fn();

    const after = process.memoryUsage();

    return {
      heapUsedDelta: ((after.heapUsed - before.heapUsed) / 1024 / 1024).toFixed(2) + ' MB',
      heapTotalDelta: ((after.heapTotal - before.heapTotal) / 1024 / 1024).toFixed(2) + ' MB',
      rss: (after.rss / 1024 / 1024).toFixed(2) + ' MB'
    };
  }
}

/**
 * Smart Caching Patterns
 */

class CachingStrategies {
  // 1. Memoization for pure functions
  memoize(fn) {
    const cache = new Map();

    return function memoized(...args) {
      const key = JSON.stringify(args);

      if (cache.has(key)) {
        return cache.get(key);
      }

      const result = fn.apply(this, args);
      cache.set(key, result);

      return result;
    };
  }

  // 2. LRU Cache with expiration
  lruCache(maxSize = 100, maxAge = 60000) {
    const cache = new Map();

    return {
      get: (key) => {
        const entry = cache.get(key);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > maxAge) {
          cache.delete(key);
          return null;
        }

        // Move to end (most recently used)
        cache.delete(key);
        cache.set(key, entry);

        return entry.value;
      },

      set: (key, value) => {
        // Remove if exists
        if (cache.has(key)) cache.delete(key);

        // Add to end
        cache.set(key, {
          value,
          timestamp: Date.now()
        });

        // Evict oldest if over capacity
        if (cache.size > maxSize) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
      }
    };
  }
}
```

---

## Summary

**Key Takeaways:**
1. **Hoisting** - Functions and var declarations are hoisted
2. **TDZ** - Temporal Dead Zone for let/const
3. **Async/Await** - Syntactic sugar over promises
4. **Closures** - Function retains access to lexical scope
5. **Prototypes** - JavaScript's inheritance mechanism
6. **Event Loop** - Microtasks before macrotasks
7. **ES6+ Features** - Destructuring, spread, template literals
8. **Promises** - Handle async operations elegantly
9. **This binding** - Arrow functions preserve this
10. **Memory Management** - Awareness of GC and memory leaks
11. **Worker Threads** - Offload CPU-intensive tasks
12. **Streams** - Process large data efficiently
13. **Concurrency** - Control parallelism with limits
14. **Performance** - Profile and optimize critical paths

**Key Takeaways:**
1. **Hoisting** - Functions and var declarations are hoisted
2. **TDZ** - Temporal Dead Zone for let/const
3. **Async/Await** - Syntactic sugar over promises
4. **Closures** - Function retains access to lexical scope
5. **Prototypes** - JavaScript's inheritance mechanism
6. **Event Loop** - Microtasks before macrotasks
7. **ES6+ Features** - Destructuring, spread, template literals
8. **Promises** - Handle async operations elegantly
9. **This binding** - Arrow functions preserve this
10. **Block scope** - let/const vs var