# Object-Oriented Programming (OOPS) Fundamentals

## Table of Contents
1. [Core OOPS Principles](#core-oops-principles)
2. [Advanced OOPS Concepts](#advanced-oops-concepts)
3. [Common Pitfalls](#common-pitfalls)
4. [When to Use OOPS](#when-to-use-oops)
5. [When NOT to Use OOPS](#when-not-to-use-oops)

---

## Core OOPS Principles

### 1. Encapsulation

**Definition**: Bundling data and methods that operate on that data within a single unit (class), and restricting direct access to some of an object's components.

#### Key Concepts:
- **Access Modifiers**: Public, Private, Protected, Package/Private
- **Getters/Setters**: Controlled access to internal state
- **Immutability**: Creating objects whose state cannot be modified after creation
- **Information Hiding**: Exposing only necessary details

#### Real-World Example: Banking System

```java
public class BankAccount {
    // Private fields - encapsulated
    private String accountNumber;
    private double balance;
    private String ownerName;
    private List<Transaction> transactions;
    
    // Public constructor
    public BankAccount(String accountNumber, String ownerName, double initialBalance) {
        this.accountNumber = accountNumber;
        this.ownerName = ownerName;
        this.balance = initialBalance;
        this.transactions = new ArrayList<>();
    }
    
    // Controlled access through methods
    public void deposit(double amount) throws InvalidTransactionException {
        if (amount <= 0) {
            throw new InvalidTransactionException("Amount must be positive");
        }
        this.balance += amount;
        this.transactions.add(new Transaction(amount, TransactionType.DEPOSIT));
        this.notifyObservers();
    }
    
    public void withdraw(double amount) throws InsufficientFundsException {
        if (amount <= 0) {
            throw new InvalidTransactionException("Amount must be positive");
        }
        if (amount > this.balance) {
            throw new InsufficientFundsException("Insufficient balance");
        }
        this.balance -= amount;
        this.transactions.add(new Transaction(amount, TransactionType.WITHDRAWAL));
        this.notifyObservers();
    }
    
    // Read-only access to balance
    public double getBalance() {
        return this.balance;
    }
    
    // No setter for balance - balance can only change through transactions
    public List<Transaction> getTransactionHistory() {
        return Collections.unmodifiableList(this.transactions);
    }
}
```

#### Benefits for Senior Developers:
1. **Change Management**: Can modify internal implementation without affecting external code
2. **Validation**: Ensures invariants are maintained (e.g., balance never negative)
3. **Debugging**: Easier to track where state changes occur
4. **Testing**: Mock objects easier to create with controlled interfaces

---

### 2. Inheritance

**Definition**: Mechanism where a new class derives properties and characteristics from an existing class.

#### Key Concepts:
- **Superclass/Subclass**: Parent/Child relationship
- **Method Overriding**: Redefining parent class methods
- **`super` keyword**: Accessing parent class members
- **Abstract Classes**: Classes that cannot be instantiated
- **Final Classes/Methods**: Preventing inheritance/overriding

#### Real-World Example: E-commerce Payment System

```java
// Base abstract class
public abstract class PaymentProcessor {
    protected String merchantId;
    protected PaymentConfig config;
    
    public PaymentProcessor(String merchantId, PaymentConfig config) {
        this.merchantId = merchantId;
        this.config = config;
    }
    
    // Template method - defines algorithm structure
    public PaymentResult processPayment(PaymentRequest request) {
        validateRequest(request);
        PaymentGatewayResponse response = executePayment(request);
        return processResponse(response);
    }
    
    protected abstract void validateRequest(PaymentRequest request);
    protected abstract PaymentGatewayResponse executePayment(PaymentRequest request);
    protected abstract PaymentResult processResponse(PaymentGatewayResponse response);
    
    // Common functionality shared by all payment processors
    protected void logTransaction(PaymentRequest request, PaymentResult result) {
        Logger.info("Payment processed: " + request.getPaymentId() + 
                   ", Status: " + result.getStatus());
    }
}

// Credit Card Payment Implementation
public class CreditCardPaymentProcessor extends PaymentProcessor {
    private CreditCardValidator validator;
    private CreditCardGateway gateway;
    
    public CreditCardPaymentProcessor(String merchantId, PaymentConfig config) {
        super(merchantId, config);
        this.validator = new CreditCardValidator();
        this.gateway = new CreditCardGateway(config);
    }
    
    @Override
    protected void validateRequest(PaymentRequest request) {
        CreditCardDetails card = request.getCardDetails();
        validator.validateCardNumber(card.getNumber());
        validator.validateExpiryDate(card.getExpiry());
        validator.validateCVV(card.getCvv());
    }
    
    @Override
    protected PaymentGatewayResponse executePayment(PaymentRequest request) {
        return gateway.chargeCard(merchantId, request.getAmount(), 
                                 request.getCardDetails());
    }
}

// PayPal Payment Implementation
public class PayPalPaymentProcessor extends PaymentProcessor {
    private PayPalGateway gateway;
    
    public PayPalPaymentProcessor(String merchantId, PaymentConfig config) {
        super(merchantId, config);
        this.gateway = new PayPalGateway(config);
    }
    
    @Override
    protected void validateRequest(PaymentRequest request) {
        if (request.getPaypalEmail() == null || !request.getPaypalEmail().contains("@")) {
            throw new InvalidPaymentRequestException("Invalid PayPal email");
        }
    }
    
    @Override
    protected PaymentGatewayResponse executePayment(PaymentRequest request) {
        return gateway.processPayment(merchantId, request.getAmount(), 
                                    request.getPaypalEmail());
    }
}
```

#### Benefits for Senior Developers:
1. **Code Reuse**: Shared functionality in base class
2. **Polymorphism**: Treat all payment processors uniformly
3. **Extensibility**: Add new payment types without modifying existing code
4. **Consistency**: Enforce common behavior through template methods

---

### 3. Polymorphism

**Definition**: Ability of objects to take many forms. Same method behaves differently based on the object.

#### Types of Polymorphism:

##### a) Compile-Time Polymorphism (Method Overloading)

```java
public class NotificationService {
    
    // Overloaded methods based on parameter types
    public void sendNotification(String message) {
        sendEmail(message, "system@example.com");
    }
    
    public void sendNotification(String message, String recipient) {
        sendEmail(message, recipient);
    }
    
    public void sendNotification(String message, List<String> recipients) {
        for (String recipient : recipients) {
            sendEmail(message, recipient);
        }
    }
    
    public void sendNotification(Notification notification) {
        switch (notification.getType()) {
            case EMAIL:
                sendEmail(notification);
                break;
            case SMS:
                sendSMS(notification);
                break;
            case PUSH:
                sendPushNotification(notification);
                break;
        }
    }
}
```

##### b) Runtime Polymorphism (Method Overriding)

```java
public interface DataProcessor {
    void processData(Data data);
    void validateData(Data data);
}

// CSV Implementation
public class CSVDataProcessor implements DataProcessor {
    @Override
    public void processData(Data data) {
        // CSV-specific processing logic
        CSVParser parser = new CSVParser();
        parser.parse(data.getContent());
    }
    
    @Override
    public void validateData(Data data) {
        CSVValidator validator = new CSVValidator();
        validator.validate(data);
    }
}

// JSON Implementation
public class JSONDataProcessor implements DataProcessor {
    @Override
    public void processData(Data data) {
        // JSON-specific processing logic
        JSONParser parser = new JSONParser();
        parser.parse(data.getContent());
    }
    
    @Override
    public void validateData(Data data) {
        JSONValidator validator = new JSONValidator();
        validator.validate(data);
    }
}

// Client code - works with any implementation
public class DataImportService {
    private DataProcessor processor;
    
    // Dependency injection - polymorphism in action
    public DataImportService(DataProcessor processor) {
        this.processor = processor;
    }
    
    public void importData(Data data) {
        processor.validateData(data);
        processor.processData(data);
    }
}

// Usage
DataProcessor csvProcessor = new CSVDataProcessor();
DataProcessor jsonProcessor = new JSONDataProcessor();

DataImportService csvService = new DataImportService(csvProcessor);
DataImportService jsonService = new DataImportService(jsonProcessor);

csvService.importData(csvData);
jsonService.importData(jsonData);
```

#### Real-World Example: Plugin Architecture

```java
// Plugin Interface
public interface Plugin {
    String getName();
    void initialize(PluginContext context);
    void execute(PluginRequest request);
    void shutdown();
}

// Different plugin implementations
public class AuthenticationPlugin implements Plugin {
    @Override
    public String getName() {
        return "Authentication";
    }
    
    @Override
    public void initialize(PluginContext context) {
        // Initialize authentication
    }
    
    @Override
    public void execute(PluginRequest request) {
        // Handle authentication
    }
    
    @Override
    public void shutdown() {
        // Cleanup
    }
}

public class LoggingPlugin implements Plugin {
    @Override
    public String getName() {
        return "Logging";
    }
    
    @Override
    public void initialize(PluginContext context) {
        // Initialize logging
    }
    
    @Override
    public void execute(PluginRequest request) {
        // Handle logging
    }
    
    @Override
    public void shutdown() {
        // Cleanup
    }
}

// Plugin Manager - Works with any plugin
public class PluginManager {
    private List<Plugin> plugins = new ArrayList<>();
    
    public void registerPlugin(Plugin plugin) {
        plugins.add(plugin);
    }
    
    public void initializeAll(PluginContext context) {
        for (Plugin plugin : plugins) {
            plugin.initialize(context);
        }
    }
    
    public void executePlugins(PluginRequest request) {
        for (Plugin plugin : plugins) {
            plugin.execute(request);
        }
    }
}
```

#### Benefits for Senior Developers:
1. **Flexibility**: System behavior can change at runtime
2. **Extensibility**: Add new implementations without modifying existing code
3. **Testability**: Easy to mock implementations for testing
4. **Maintainability**: Changes isolated to specific implementations

---

### 4. Abstraction

**Definition**: Hiding complex implementation details and showing only essential features to the user.

#### Key Concepts:
- **Abstract Classes**: Cannot be instantiated, may have abstract methods
- **Interfaces**: Pure abstraction (in Java 8+, can have default methods)
- **Design by Contract**: Define behavior without implementation

#### Real-World Example: Database Abstraction Layer

```java
// High-level abstraction - defines "what" not "how"
public interface DatabaseRepository {
    <T> T findById(Class<T> entityClass, Serializable id);
    <T> List<T> findAll(Class<T> entityClass);
    <T> void save(T entity);
    <T> void update(T entity);
    <T> void delete(T entity);
    <T> List<T> query(Class<T> entityClass, String query, Object... params);
}

// PostgreSQL Implementation
public class PostgreSQLRepository implements DatabaseRepository {
    private DataSource dataSource;
    
    public PostgreSQLRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }
    
    @Override
    public <T> T findById(Class<T> entityClass, Serializable id) {
        String sql = buildSelectQuery(entityClass);
        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setObject(1, id);
            ResultSet rs = stmt.executeQuery();
            return mapResultSetToEntity(rs, entityClass);
            
        } catch (SQLException e) {
            throw new DataAccessException("Error finding entity", e);
        }
    }
    
    private String buildSelectQuery(Class<?> entityClass) {
        // PostgreSQL-specific query building
        String tableName = getTableName(entityClass);
        return String.format("SELECT * FROM %s WHERE id = ?", tableName);
    }
    
    // Other implementations...
}

// MongoDB Implementation
public class MongoDBRepository implements DatabaseRepository {
    private MongoClient mongoClient;
    private String databaseName;
    
    public MongoDBRepository(MongoClient mongoClient, String databaseName) {
        this.mongoClient = mongoClient;
        this.databaseName = databaseName;
    }
    
    @Override
    public <T> T findById(Class<T> entityClass, Serializable id) {
        MongoDatabase db = mongoClient.getDatabase(databaseName);
        MongoCollection<Document> collection = db.getCollection(getCollectionName(entityClass));
        
        Document query = new Document("_id", id);
        Document result = collection.find(query).first();
        
        return mapDocumentToEntity(result, entityClass);
    }
    
    // Other implementations...
}

// Service layer - works with any database implementation
public class UserService {
    private DatabaseRepository repository;
    
    public UserService(DatabaseRepository repository) {
        this.repository = repository;
    }
    
    public User getUser(Long userId) {
        return repository.findById(User.class, userId);
    }
    
    public void createUser(User user) {
        repository.save(user);
    }
}
```

#### Benefits for Senior Developers:
1. **Database Agnostic**: Can switch databases without changing business logic
2. **Testing**: Easy to mock repository for unit tests
3. **Flexibility**: Different implementations for different environments
4. **Focus**: Business logic separated from data access details

---

## Advanced OOPS Concepts

### 1. Composition vs Inheritance

**Composition**: "Has-a" relationship - object contains another object
**Inheritance**: "Is-a" relationship - object is a type of another object

#### When to Use Composition:

```java
// GOOD: Composition
public class Car {
    private Engine engine;
    private Transmission transmission;
    private Brakes brakes;
    
    public Car(Engine engine, Transmission transmission, Brakes brakes) {
        this.engine = engine;
        this.transmission = transmission;
        this.brakes = brakes;
    }
    
    public void accelerate() {
        engine.increaseRPM();
        transmission.shiftGear();
    }
}

// Better design - flexible, can swap components
Car car1 = new Car(new V8Engine(), new AutomaticTransmission(), new DiscBrakes());
Car car2 = new Car(new ElectricEngine(), new ManualTransmission(), new RegenerativeBrakes());
```

#### When to Use Inheritance:

```java
// GOOD: Inheritance for type hierarchy
public abstract class Vehicle {
    protected String make;
    protected String model;
    
    public Vehicle(String make, String model) {
        this.make = make;
        this.model = model;
    }
    
    public abstract void move();
}

public class Car extends Vehicle {
    @Override
    public void move() {
        // Car-specific movement
    }
}

public class Motorcycle extends Vehicle {
    @Override
    public void move() {
        // Motorcycle-specific movement
    }
}
```

#### Composition Over Inheritance Principle:

```java
// BAD: Deep inheritance hierarchy
public class Dog extends Pet extends Animal extends LivingThing extends Object {
    // Deep hierarchy makes it hard to understand and maintain
}

// GOOD: Composition
public class Dog {
    private PetBehavior petBehavior;
    private MovementBehavior movementBehavior;
    private EatingBehavior eatingBehavior;
    
    public Dog() {
        this.petBehavior = new FriendlyBehavior();
        this.movementBehavior = new FourLeggedMovement();
        this.eatingBehavior = new OmnivorousEating();
    }
}
```

---

### 2. Interfaces vs Abstract Classes

#### Interface:
```java
public interface Flyable {
    void fly();
    void land();
    int getMaxAltitude();
}

public interface Swimmable {
    void swim();
    void dive();
}
```

#### Abstract Class:
```java
public abstract class Bird {
    protected String name;
    protected double weight;
    
    public Bird(String name, double weight) {
        this.name = name;
        this.weight = weight;
    }
    
    public void eat() {
        System.out.println(name + " is eating");
    }
    
    public void sleep() {
        System.out.println(name + " is sleeping");
    }
    
    public abstract void makeSound();
}
```

#### Decision Matrix:

| Aspect | Use Interface | Use Abstract Class |
|--------|---------------|-------------------|
| Multiple Inheritance | ✅ Can implement multiple interfaces | ❌ Can extend only one class |
| Implementation | ❌ Only method signatures (pre-Java 8) | ✅ Can have partial implementation |
| State | ❌ No instance variables | ✅ Can have instance variables |
| Constructor | ❌ No constructors | ✅ Can have constructors |
| Default Methods | ✅ Java 8+ supports default methods | ✅ Can have concrete methods |
| Versioning | Hard to add methods without breaking | Can add methods without breaking |

---

### 3. Method Overriding Rules

```java
public class Parent {
    public void method1() {
        // Can be overridden
    }
    
    public final void method2() {
        // Cannot be overridden
    }
    
    private void method3() {
        // Not visible to child class
    }
    
    static void method4() {
        // Static methods are hidden, not overridden
    }
}

public class Child extends Parent {
    @Override
    public void method1() {
        // Valid override
    }
    
    // @Override
    // public void method2() { }  // Compile error - final method
    
    // @Override
    // private void method3() { }  // Not an override - different method
    
    static void method4() {
        // Hides parent's method, doesn't override
    }
}
```

---

### 4. Covariant Return Types

```java
public class Animal {
    public Animal reproduce() {
        return new Animal();
    }
}

public class Dog extends Animal {
    @Override
    public Dog reproduce() {
        return new Dog();  // More specific return type allowed
    }
}
```

---

## Common Pitfalls

### 1. Over-Inheritance

```java
// BAD: Too deep inheritance hierarchy
Animal -> Mammal -> Dog -> GoldenRetriever -> PoliceGoldenRetriever

// Problems:
// - Fragile base class problem
// - Hard to understand
// - Changes in parent affect all children
// - Violates "composition over inheritance"
```

### 2. Breaking Encapsulation

```java
// BAD: Exposing internal state directly
public class User {
    public String password;  // Should be private
    public List<String> roles;  // Should return unmodifiable copy
}

// GOOD: Proper encapsulation
public class User {
    private String password;
    private List<String> roles;
    
    public String getPassword() {
        // Maybe return hashed version or don't expose at all
        return this.password;
    }
    
    public List<String> getRoles() {
        return Collections.unmodifiableList(new ArrayList<>(roles));
    }
}
```

### 3.滥用 Polymorphism

```java
// BAD: Using polymorphism where simple conditional would suffice
public interface ShapeRenderer {
    void renderCircle();
    void renderSquare();
    void renderTriangle();
}

// BETTER: Just use methods directly
public class ShapeRenderer {
    public void render(Shape shape) {
        if (shape instanceof Circle) {
            renderCircle((Circle) shape);
        } else if (shape instanceof Square) {
            renderSquare((Square) shape);
        }
    }
}
```

### 4. Tight Coupling Through Inheritance

```java
// BAD: Child class depends on parent implementation details
public class Parent {
    public void processData() {
        loadData();
        validateData();
        transformData();
        saveData();
    }
    
    protected void loadData() { /* implementation */ }
    protected void validateData() { /* implementation */ }
    protected void transformData() { /* implementation */ }
    protected void saveData() { /* implementation */ }
}

public class Child extends Parent {
    @Override
    protected void loadData() {
        super.loadData();  // Depends on parent implementation
        // Additional loading logic
    }
}

// BETTER: Use composition with dependency injection
public class DataProcessor {
    private DataLoader loader;
    private DataValidator validator;
    private DataTransformer transformer;
    private DataSaver saver;
    
    public DataProcessor(DataLoader loader, DataValidator validator,
                        DataTransformer transformer, DataSaver saver) {
        this.loader = loader;
        this.validator = validator;
        this.transformer = transformer;
        this.saver = saver;
    }
    
    public void processData() {
        Data data = loader.load();
        validator.validate(data);
        Data transformed = transformer.transform(data);
        saver.save(transformed);
    }
}
```

---

## When to Use OOPS

### Ideal Scenarios:

1. **Complex Business Logic**
   - Domain modeling (e.g., banking, insurance, healthcare)
   - Rule engines
   - Workflow systems

2. **Large-Scale Applications**
   - Enterprise applications
   - Multi-team projects
   - Long-lived systems

3. **Systems Requiring Extensibility**
   - Plugin architectures
   - Framework development
   - SDK development

4. **Domain-Driven Design**
   - Bounded contexts with rich domain models
   - Complex business invariants
   - Behavior-rich entities

### Example: E-commerce Order System

```java
public class Order {
    private OrderId id;
    private Customer customer;
    private List<OrderItem> items;
    private OrderStatus status;
    private ShippingAddress shippingAddress;
    private Payment payment;
    
    public void addItem(Product product, int quantity) {
        if (status != OrderStatus.DRAFT) {
            throw new IllegalStateException("Cannot add items to " + status + " order");
        }
        
        OrderItem item = new OrderItem(product, quantity);
        items.add(item);
    }
    
    public void placeOrder() {
        if (items.isEmpty()) {
            throw new IllegalStateException("Cannot place empty order");
        }
        
        this.status = OrderStatus.PLACED;
        
        // Domain events
        EventPublisher.publish(new OrderPlacedEvent(this.id));
    }
    
    public void cancel(String reason) {
        if (status != OrderStatus.PLACED && status != OrderStatus.PROCESSING) {
            throw new IllegalStateException("Cannot cancel " + status + " order");
        }
        
        this.status = OrderStatus.CANCELLED;
        EventPublisher.publish(new OrderCancelledEvent(this.id, reason));
    }
}
```

---

## When NOT to Use OOPS

### Scenarios Where OOPS May Be Overkill:

1. **Simple Utilities**
```java
// BAD: Over-engineered utility class
public class StringUtility {
    private String internalState;  // No need for state
    
    public StringUtility(String initialState) {
        this.internalState = initialState;
    }
    
    public String toUpperCase() {
        return this.internalState.toUpperCase();
    }
}

// GOOD: Static utility method
public class StringUtils {
    public static String toUpperCase(String input) {
        return input.toUpperCase();
    }
}
```

2. **Data Transfer Objects (DTOs)**
```java
// For simple data holders, use records or plain classes
public record CustomerDTO(String name, String email, String phone) {}
```

3. **Performance-Critical Code**
```java
// For high-performance scenarios, consider procedural approach
public class ArrayProcessor {
    public static void process(int[] array) {
        // Direct array manipulation - no object overhead
        for (int i = 0; i < array.length; i++) {
            array[i] *= 2;
        }
    }
}
```

4. **Functional Programming Paradigms**
```java
// Functional approach - better for data transformations
List<Integer> result = numbers.stream()
    .filter(n -> n > 10)
    .map(n -> n * 2)
    .collect(Collectors.toList());
```

---

## Summary for Senior Developers

### Key Takeaways:

1. **Encapsulation** is your first line of defense against complexity
2. **Composition** over inheritance should be your default choice
3. **Polymorphism** enables flexible, extensible systems
4. **Abstraction** manages complexity by hiding implementation details
5. **Pragmatism** over purity - use OOPS where it provides value

### Decision Framework:

- **Use Inheritance** when: "Is-a" relationship is clear and stable
- **Use Composition** when: "Has-a" relationship or need flexibility
- **Use Interfaces** when: Need contract definition, multiple inheritance
- **Use Abstract Classes** when: Need partial implementation + template methods
- **Avoid OOPS** when: Simple utilities, performance-critical, functional style fits better

### Next Steps:
- Deep dive into SOLID principles → [SOLID Principles](02-solid-principles.md)
- Explore real-world OOPS scenarios → [OOPS Real-World Scenarios](03-oops-real-world-scenarios.md)