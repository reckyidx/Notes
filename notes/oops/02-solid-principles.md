# SOLID Principles - In-Depth Analysis

## Table of Contents
1. [Introduction](#introduction)
2. [Single Responsibility Principle (SRP)](#single-responsibility-principle-srp)
3. [Open/Closed Principle (OCP)]#openclosed-principle-ocp)
4. [Liskov Substitution Principle (LSP)](#liskov-substitution-principle-lsp)
5. [Interface Segregation Principle (ISP)](#interface-segregation-principle-isp)
6. [Dependency Inversion Principle (DIP)](#dependency-inversion-principle-dip)
7. [SOLID in Practice](#solid-in-practice)
8. [Common Violations](#common-violations)
9. [Real-World Complex Scenarios](#real-world-complex-scenarios)

---

## Introduction

The **SOLID principles** are five design principles intended to make software designs more understandable, flexible, and maintainable. They were introduced by Robert C. Martin (Uncle Bob) and are essential for building robust, scalable systems.

### Why SOLID Matters for Senior Developers:

1. **Maintainability**: Systems are easier to modify when requirements change
2. **Testability**: Components are easier to unit test in isolation
3. **Extensibility**: New features can be added without modifying existing code
4. **Readability**: Code is more self-documenting and easier to understand
5. **Collaboration**: Multiple developers can work on different modules simultaneously

---

## Single Responsibility Principle (SRP)

**Definition**: A class should have one, and only one, reason to change.

### Key Concepts:

- **One Responsibility**: One job, one purpose
- **Reason to Change**: Each class should change for only one reason
- **Cohesion**: Highly related functionality should be grouped together
- **Separation of Concerns**: Different concerns should be in different classes

### Bad Example - Violating SRP:

```java
public class UserService {
    
    public void createUser(String username, String password, String email) {
        // Validation logic
        if (username == null || username.length() < 5) {
            throw new ValidationException("Username too short");
        }
        if (!email.contains("@")) {
            throw new ValidationException("Invalid email");
        }
        
        // Password hashing
        String hashedPassword = BCrypt.hashpw(password, BCrypt.gensalt());
        
        // Database operations
        String sql = "INSERT INTO users (username, password, email) VALUES (?, ?, ?)";
        jdbcTemplate.update(sql, username, hashedPassword, email);
        
        // Email sending
        EmailService emailService = new EmailService();
        emailService.sendWelcomeEmail(email, username);
        
        // Logging
        Logger.info("User created: " + username);
        
        // Audit logging
        AuditLogger.log("USER_CREATED", username);
    }
}
```

**Problems**:
- Class changes when validation rules change
- Class changes when hashing algorithm changes
- Class changes when database schema changes
- Class changes when email service changes
- Class changes when logging format changes

### Good Example - Following SRP:

```java
// Validation Service - Handles validation logic
public class UserValidator {
    private static final int MIN_USERNAME_LENGTH = 5;
    
    public void validateUser(String username, String password, String email) {
        validateUsername(username);
        validateEmail(email);
        validatePassword(password);
    }
    
    private void validateUsername(String username) {
        if (username == null || username.length() < MIN_USERNAME_LENGTH) {
            throw new ValidationException("Username must be at least " + MIN_USERNAME_LENGTH + " characters");
        }
    }
    
    private void validateEmail(String email) {
        if (email == null || !EmailValidator.isValid(email)) {
            throw new ValidationException("Invalid email address");
        }
    }
    
    private void validatePassword(String password) {
        if (password == null || password.length() < 8) {
            throw new ValidationException("Password must be at least 8 characters");
        }
    }
}

// Password Service - Handles password operations
public class PasswordService {
    private PasswordHasher hasher;
    
    public PasswordService(PasswordHasher hasher) {
        this.hasher = hasher;
    }
    
    public String hashPassword(String plainPassword) {
        return hasher.hash(plainPassword);
    }
    
    public boolean verifyPassword(String plainPassword, String hashedPassword) {
        return hasher.verify(plainPassword, hashedPassword);
    }
}

// User Repository - Handles database operations
public class UserRepository {
    private JdbcTemplate jdbcTemplate;
    
    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }
    
    public User save(User user) {
        String sql = "INSERT INTO users (username, password, email) VALUES (?, ?, ?)";
        jdbcTemplate.update(sql, user.getUsername(), user.getPassword(), user.getEmail());
        return user;
    }
    
    public Optional<User> findByUsername(String username) {
        String sql = "SELECT * FROM users WHERE username = ?";
        List<User> users = jdbcTemplate.query(sql, new UserRowMapper(), username);
        return users.isEmpty() ? Optional.empty() : Optional.of(users.get(0));
    }
}

// Email Service - Handles email operations
public class EmailService {
    private EmailSender sender;
    private EmailTemplateRenderer templateRenderer;
    
    public EmailService(EmailSender sender, EmailTemplateRenderer templateRenderer) {
        this.sender = sender;
        this.templateRenderer = templateRenderer;
    }
    
    public void sendWelcomeEmail(String email, String username) {
        String content = templateRenderer.renderWelcomeEmail(username);
        Email emailToSend = new Email(email, "Welcome to Our Platform", content);
        sender.send(emailToSend);
    }
}

// Audit Service - Handles audit logging
public class AuditService {
    private AuditLogRepository auditLogRepository;
    
    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }
    
    public void logUserCreation(String username) {
        AuditLog log = new AuditLog("USER_CREATED", username, LocalDateTime.now());
        auditLogRepository.save(log);
    }
}

// User Service - Orchestrates the workflow
public class UserService {
    private UserValidator validator;
    private PasswordService passwordService;
    private UserRepository userRepository;
    private EmailService emailService;
    private AuditService auditService;
    
    public UserService(UserValidator validator, PasswordService passwordService,
                      UserRepository userRepository, EmailService emailService,
                      AuditService auditService) {
        this.validator = validator;
        this.passwordService = passwordService;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.auditService = auditService;
    }
    
    public User createUser(CreateUserRequest request) {
        // Validate input
        validator.validateUser(request.getUsername(), request.getPassword(), request.getEmail());
        
        // Hash password
        String hashedPassword = passwordService.hashPassword(request.getPassword());
        
        // Create user entity
        User user = new User(request.getUsername(), hashedPassword, request.getEmail());
        
        // Save to database
        User savedUser = userRepository.save(user);
        
        // Send welcome email
        emailService.sendWelcomeEmail(request.getEmail(), request.getUsername());
        
        // Log audit
        auditService.logUserCreation(request.getUsername());
        
        return savedUser;
    }
}
```

### Benefits:

1. **Each class has one reason to change**
2. **Easy to test**: Each component can be tested independently
3. **Easy to reuse**: Components can be reused in different contexts
4. **Easy to understand**: Clear responsibilities make code self-documenting

---

## Open/Closed Principle (OCP)

**Definition**: Software entities (classes, modules, functions, etc.) should be open for extension but closed for modification.

### Key Concepts:

- **Open for Extension**: Behavior can be extended by adding new code
- **Closed for Modification**: Existing code should not need to change
- **Polymorphism**: Use interfaces and abstract classes
- **Strategy Pattern**: Swap algorithms at runtime

### Bad Example - Violating OCP:

```java
public class OrderProcessor {
    
    public void processOrder(Order order) {
        String paymentType = order.getPaymentType();
        
        if (paymentType.equals("CREDIT_CARD")) {
            processCreditCardPayment(order);
        } else if (paymentType.equals("PAYPAL")) {
            processPayPalPayment(order);
        } else if (paymentType.equals("BITCOIN")) {
            processBitcoinPayment(order);
        } else if (paymentType.equals("BANK_TRANSFER")) {
            processBankTransferPayment(order);
        }
        // What happens when we add Apple Pay? Need to modify this class!
    }
    
    private void processCreditCardPayment(Order order) {
        CreditCardValidator validator = new CreditCardValidator();
        validator.validate(order.getCardDetails());
        
        CreditCardGateway gateway = new CreditCardGateway();
        gateway.charge(order.getAmount(), order.getCardDetails());
    }
    
    private void processPayPalPayment(Order order) {
        PayPalValidator validator = new PayPalValidator();
        validator.validate(order.getPaypalEmail());
        
        PayPalGateway gateway = new PayPalGateway();
        gateway.charge(order.getAmount(), order.getPaypalEmail());
    }
    
    // ... other payment methods
}
```

**Problems**:
- Must modify OrderProcessor for every new payment type
- Risk of breaking existing functionality
- Class grows indefinitely
- Difficult to test

### Good Example - Following OCP:

```java
// Payment Processor Interface
public interface PaymentProcessor {
    PaymentResult process(PaymentRequest request);
    void validate(PaymentRequest request);
}

// Credit Card Implementation
public class CreditCardPaymentProcessor implements PaymentProcessor {
    private CreditCardValidator validator;
    private CreditCardGateway gateway;
    
    public CreditCardPaymentProcessor(CreditCardValidator validator, CreditCardGateway gateway) {
        this.validator = validator;
        this.gateway = gateway;
    }
    
    @Override
    public void validate(PaymentRequest request) {
        validator.validate(request.getCardDetails());
    }
    
    @Override
    public PaymentResult process(PaymentRequest request) {
        GatewayResponse response = gateway.charge(request.getAmount(), request.getCardDetails());
        return new PaymentResult(response.isSuccess(), response.getTransactionId());
    }
}

// PayPal Implementation
public class PayPalPaymentProcessor implements PaymentProcessor {
    private PayPalValidator validator;
    private PayPalGateway gateway;
    
    public PayPalPaymentProcessor(PayPalValidator validator, PayPalGateway gateway) {
        this.validator = validator;
        this.gateway = gateway;
    }
    
    @Override
    public void validate(PaymentRequest request) {
        validator.validate(request.getPaypalEmail());
    }
    
    @Override
    public PaymentResult process(PaymentRequest request) {
        GatewayResponse response = gateway.charge(request.getAmount(), request.getPaypalEmail());
        return new PaymentResult(response.isSuccess(), response.getTransactionId());
    }
}

// Apple Pay Implementation - NEW! No need to modify existing code
public class ApplePayPaymentProcessor implements PaymentProcessor {
    private ApplePayValidator validator;
    private ApplePayGateway gateway;
    
    public ApplePayPaymentProcessor(ApplePayValidator validator, ApplePayGateway gateway) {
        this.validator = validator;
        this.gateway = gateway;
    }
    
    @Override
    public void validate(PaymentRequest request) {
        validator.validate(request.getApplePayToken());
    }
    
    @Override
    public PaymentResult process(PaymentRequest request) {
        GatewayResponse response = gateway.charge(request.getAmount(), request.getApplePayToken());
        return new PaymentResult(response.isSuccess(), response.getTransactionId());
    }
}

// Order Processor - Closed for modification, open for extension
public class OrderProcessor {
    private Map<PaymentType, PaymentProcessor> processors;
    
    public OrderProcessor(Map<PaymentType, PaymentProcessor> processors) {
        this.processors = processors;
    }
    
    public void processOrder(Order order) {
        PaymentType paymentType = order.getPaymentType();
        PaymentProcessor processor = processors.get(paymentType);
        
        if (processor == null) {
            throw new UnsupportedPaymentTypeException("Payment type not supported: " + paymentType);
        }
        
        PaymentRequest request = buildPaymentRequest(order);
        processor.validate(request);
        PaymentResult result = processor.process(request);
        
        order.setStatus(result.isSuccess() ? OrderStatus.PAID : OrderStatus.PAYMENT_FAILED);
    }
    
    private PaymentRequest buildPaymentRequest(Order order) {
        return new PaymentRequest(
            order.getAmount(),
            order.getCurrency(),
            order.getPaymentDetails()
        );
    }
}

// Configuration
@Configuration
public class PaymentConfig {
    
    @Bean
    public Map<PaymentType, PaymentProcessor> paymentProcessors(
            CreditCardPaymentProcessor creditCardProcessor,
            PayPalPaymentProcessor payPalProcessor,
            ApplePayPaymentProcessor applePayProcessor) {
        
        Map<PaymentType, PaymentProcessor> processors = new HashMap<>();
        processors.put(PaymentType.CREDIT_CARD, creditCardProcessor);
        processors.put(PaymentType.PAYPAL, payPalProcessor);
        processors.put(PaymentType.APPLE_PAY, applePayProcessor);
        return processors;
    }
    
    @Bean
    public CreditCardPaymentProcessor creditCardPaymentProcessor(
            CreditCardValidator validator, CreditCardGateway gateway) {
        return new CreditCardPaymentProcessor(validator, gateway);
    }
    
    @Bean
    public PayPalPaymentProcessor payPalPaymentProcessor(
            PayPalValidator validator, PayPalGateway gateway) {
        return new PayPalPaymentProcessor(validator, gateway);
    }
    
    @Bean
    public ApplePayPaymentProcessor applePayPaymentProcessor(
            ApplePayValidator validator, ApplePayGateway gateway) {
        return new ApplePayPaymentProcessor(validator, gateway);
    }
}
```

### Benefits:

1. **Add new payment types without modifying OrderProcessor**
2. **Each payment type is independently testable**
3. **Reduced risk of breaking existing functionality**
4. **Better separation of concerns**

---

## Liskov Substitution Principle (LSP)

**Definition**: Objects of a superclass should be replaceable with objects of its subclasses without breaking the application.

### Key Concepts:

- **Behavioral Subtyping**: Subtype must honor the contract of supertype
- **Preconditions**: Cannot be strengthened in subtype
- **Postconditions**: Cannot be weakened in subtype
- **Invariants**: Must be preserved in subtype

### Bad Example - Violating LSP:

```java
public class Rectangle {
    protected int width;
    protected int height;
    
    public void setWidth(int width) {
        this.width = width;
    }
    
    public void setHeight(int height) {
        this.height = height;
    }
    
    public int getWidth() {
        return width;
    }
    
    public int getHeight() {
        return height;
    }
    
    public int getArea() {
        return width * height;
    }
}

// Square inherits from Rectangle - but violates LSP!
public class Square extends Rectangle {
    
    @Override
    public void setWidth(int width) {
        this.width = width;
        this.height = width;  // Must maintain square property
    }
    
    @Override
    public void setHeight(int height) {
        this.height = height;
        this.width = height;  // Must maintain square property
    }
}

// Client code that breaks with Square
public class RectangleTest {
    public void testRectangle(Rectangle rectangle) {
        rectangle.setWidth(5);
        rectangle.setHeight(4);
        
        // Expected area: 5 * 4 = 20
        // With Square: 4 * 4 = 16 (WRONG!)
        assert rectangle.getArea() == 20;
    }
    
    public static void main(String[] args) {
        Rectangle rectangle = new Rectangle();
        Rectangle square = new Square();  // Substituting Rectangle with Square
        
        RectangleTest test = new RectangleTest();
        test.testRectangle(rectangle);  // Passes
        test.testRectangle(square);     // FAILS!
    }
}
```

### Good Example - Following LSP:

```java
// Abstract base class for shapes
public abstract class Shape {
    public abstract int getArea();
    public abstract int getPerimeter();
}

// Rectangle implementation
public class Rectangle extends Shape {
    private int width;
    private int height;
    
    public Rectangle(int width, int height) {
        this.width = width;
        this.height = height;
    }
    
    public int getWidth() {
        return width;
    }
    
    public int getHeight() {
        return height;
    }
    
    @Override
    public int getArea() {
        return width * height;
    }
    
    @Override
    public int getPerimeter() {
        return 2 * (width + height);
    }
}

// Square is a separate class, not a Rectangle
public class Square extends Shape {
    private int side;
    
    public Square(int side) {
        this.side = side;
    }
    
    public int getSide() {
        return side;
    }
    
    @Override
    public int getArea() {
        return side * side;
    }
    
    @Override
    public int getPerimeter() {
        return 4 * side;
    }
}

// LSP-compliant - can substitute any Shape
public class ShapeUtils {
    public static double getAverageArea(List<Shape> shapes) {
        return shapes.stream()
            .mapToInt(Shape::getArea)
            .average()
            .orElse(0);
    }
    
    public static void scale(Shape shape, double factor) {
        // Each shape implements its own scaling logic
        // LSP: Subtypes honor the contract
    }
}
```

### Another LSP Violation Example:

```java
// BAD: Bird that can fly
public class Bird {
    public void fly() {
        System.out.println("Flying...");
    }
}

public class Ostrich extends Bird {
    @Override
    public void fly() {
        throw new UnsupportedOperationException("Ostriches can't fly!");
    }
}

// LSP Violation - Cannot substitute Bird with Ostrich
public class BirdHandler {
    public void makeBirdFly(Bird bird) {
        bird.fly();  // Throws exception for Ostrich
    }
}

// GOOD: Separate interfaces
public interface Bird {
    void eat();
    void sleep();
}

public interface Flyable {
    void fly();
}

public interface Swimmable {
    void swim();
}

// Eagle can fly
public class Eagle implements Bird, Flyable {
    @Override
    public void fly() {
        System.out.println("Eagle flying high");
    }
    
    @Override
    public void eat() {
        System.out.println("Eagle eating");
    }
    
    @Override
    public void sleep() {
        System.out.println("Eagle sleeping");
    }
}

// Ostrich cannot fly
public class Ostrich implements Bird {
    @Override
    public void eat() {
        System.out.println("Ostrich eating");
    }
    
    @Override
    public void sleep() {
        System.out.println("Ostrich sleeping");
    }
}

// Duck can fly and swim
public class Duck implements Bird, Flyable, Swimmable {
    @Override
    public void fly() {
        System.out.println("Duck flying");
    }
    
    @Override
    public void swim() {
        System.out.println("Duck swimming");
    }
    
    @Override
    public void eat() {
        System.out.println("Duck eating");
    }
    
    @Override
    public void sleep() {
        System.out.println("Duck sleeping");
    }
}

// LSP Compliant - Each implementation honors the contract
public class BirdHandler {
    public void makeBirdSleep(Bird bird) {
        bird.sleep();  // Works for any Bird implementation
    }
    
    public void makeBirdFly(Flyable flyable) {
        flyable.fly();  // Only works for Flyable birds
    }
}
```

### Benefits:

1. **Substitutability**: Can replace supertype with any subtype
2. **Reliability**: Code behavior is predictable
3. **Prevents runtime errors**: No unexpected exceptions
4. **Better design**: Cleaner, more intuitive class hierarchies

---

## Interface Segregation Principle (ISP)

**Definition**: Clients should not be forced to depend on interfaces they don't use.

### Key Concepts:

- **Role-based interfaces**: Interfaces should be cohesive
- **Fat interfaces**: Avoid interfaces with too many methods
- **Interface pollution**: Don't force clients to implement methods they don't need
- **Single-purpose interfaces**: Each interface should serve one purpose

### Bad Example - Violating ISP:

```java
// Fat interface - too many responsibilities
public interface Worker {
    void work();
    void eat();
    void sleep();
}

// Robot doesn't need to eat or sleep
public class Robot implements Worker {
    @Override
    public void work() {
        System.out.println("Robot working");
    }
    
    @Override
    public void eat() {
        throw new UnsupportedOperationException("Robots don't eat");
    }
    
    @Override
    public void sleep() {
        throw new UnsupportedOperationException("Robots don't sleep");
    }
}

// Human implements all methods
public class Human implements Worker {
    @Override
    public void work() {
        System.out.println("Human working");
    }
    
    @Override
    public void eat() {
        System.out.println("Human eating");
    }
    
    @Override
    public void sleep() {
        System.out.println("Human sleeping");
    }
}
```

### Good Example - Following ISP:

```java
// Segregated interfaces - each has single responsibility
public interface Workable {
    void work();
}

public interface Eatable {
    void eat();
}

public interface Sleepable {
    void sleep();
}

// Robot only implements Workable
public class Robot implements Workable {
    @Override
    public void work() {
        System.out.println("Robot working");
    }
}

// Human implements all interfaces
public class Human implements Workable, Eatable, Sleepable {
    @Override
    public void work() {
        System.out.println("Human working");
    }
    
    @Override
    public void eat() {
        System.out.println("Human eating");
    }
    
    @Override
    public void sleep() {
        System.out.println("Human sleeping");
    }
}

// Another example - Printer interface
public interface Printer {
    void print(Document document);
}

public interface Scanner {
    void scan(Document document);
}

public interface FaxMachine {
    void fax(Document document);
}

// Basic printer - only prints
public class BasicPrinter implements Printer {
    @Override
    public void print(Document document) {
        System.out.println("Printing: " + document.getName());
    }
}

// All-in-one printer - prints, scans, and faxes
public class AllInOnePrinter implements Printer, Scanner, FaxMachine {
    @Override
    public void print(Document document) {
        System.out.println("Printing: " + document.getName());
    }
    
    @Override
    public void scan(Document document) {
        System.out.println("Scanning: " + document.getName());
    }
    
    @Override
    public void fax(Document document) {
        System.out.println("Faxing: " + document.getName());
    }
}
```

### Real-World Enterprise Example:

```java
// BAD: Fat interface for user operations
public interface UserService {
    User createUser(CreateUserRequest request);
    User getUser(Long userId);
    List<User> getAllUsers();
    void updateUser(Long userId, UpdateUserRequest request);
    void deleteUser(Long userId);
    void resetPassword(Long userId);
    void changePassword(Long userId, ChangePasswordRequest request);
    void assignRole(Long userId, String roleName);
    void removeRole(Long userId, String roleName);
    void activateUser(Long userId);
    void deactivateUser(Long userId);
    List<User> searchUsers(UserSearchCriteria criteria);
    User findByUsername(String username);
    User findByEmail(String email);
    boolean isUsernameAvailable(String username);
    boolean isEmailAvailable(String email);
    void uploadProfilePicture(Long userId, MultipartFile file);
    byte[] getProfilePicture(Long userId);
    void deleteProfilePicture(Long userId);
}

// Client that only needs to read users
public class UserReportService implements UserService {
    // Must implement ALL methods, even though most are not used!
    @Override
    public User createUser(CreateUserRequest request) {
        throw new UnsupportedOperationException();
    }
    
    @Override
    public User getUser(Long userId) {
        // This is what we actually need
        return userRepository.findById(userId);
    }
    
    @Override
    public List<User> getAllUsers() {
        // This is what we actually need
        return userRepository.findAll();
    }
    
    // ... 20 more unnecessary implementations
}

// GOOD: Segregated interfaces
public interface UserReader {
    Optional<User> getUser(Long userId);
    List<User> getAllUsers();
    List<User> searchUsers(UserSearchCriteria criteria);
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
}

public interface UserWriter {
    User createUser(CreateUserRequest request);
    User updateUser(Long userId, UpdateUserRequest request);
    void deleteUser(Long userId);
    void activateUser(Long userId);
    void deactivateUser(Long userId);
}

public interface UserPasswordManager {
    void resetPassword(Long userId);
    void changePassword(Long userId, ChangePasswordRequest request);
}

public interface UserRoleManager {
    void assignRole(Long userId, String roleName);
    void removeRole(Long userId, String roleName);
}

public interface UserProfileManager {
    void uploadProfilePicture(Long userId, MultipartFile file);
    byte[] getProfilePicture(Long userId);
    void deleteProfilePicture(Long userId);
}

// UserReportService - only depends on UserReader
public class UserReportService {
    private UserReader userReader;
    
    public UserReportService(UserReader userReader) {
        this.userReader = userReader;
    }
    
    public Report generateUserReport() {
        List<User> users = userReader.getAllUsers();
        // Generate report...
        return report;
    }
}

// UserRegistrationService - depends on UserReader, UserWriter, UserPasswordManager
public class UserRegistrationService {
    private UserReader userReader;
    private UserWriter userWriter;
    private UserPasswordManager passwordManager;
    
    public UserRegistrationService(UserReader userReader, UserWriter userWriter,
                                  UserPasswordManager passwordManager) {
        this.userReader = userReader;
        this.userWriter = userWriter;
        this.passwordManager = passwordManager;
    }
    
    public void registerUser(CreateUserRequest request) {
        userReader.findByUsername(request.getUsername())
            .ifPresent(u -> { throw new UserExistsException("Username already exists"); });
        
        userReader.findByEmail(request.getEmail())
            .ifPresent(u -> { throw new UserExistsException("Email already exists"); });
        
        User user = userWriter.createUser(request);
        passwordManager.resetPassword(user.getId());
    }
}
```

### Benefits:

1. **Clients only depend on what they use**
2. **Reduced coupling**: Changes to one interface don't affect clients that don't use it
3. **Better testability**: Easier to mock only the methods needed
4. **Self-documenting**: Interfaces clearly express intent

---

## Dependency Inversion Principle (DIP)

**Definition**: High-level modules should not depend on low-level modules. Both should depend on abstractions. Abstractions should not depend on details. Details should depend on abstractions.

### Key Concepts:

- **Dependency Inversion**: Depend on abstractions, not concretions
- **Inversion of Control**: Control flow is inverted
- **Dependency Injection**: Dependencies are injected, not created internally
- **Loose Coupling**: High-level and low-level modules are decoupled

### Bad Example - Violating DIP:

```java
// High-level module depends on low-level module
public class LightSwitch {
    private LightBulb lightBulb;
    
    public LightSwitch() {
        this.lightBulb = new LightBulb();  // Direct dependency on concrete class
    }
    
    public void turnOn() {
        lightBulb.turnOn();
    }
    
    public void turnOff() {
        lightBulb.turnOff();
    }
}

public class LightBulb {
    public void turnOn() {
        System.out.println("Light bulb turned on");
    }
    
    public void turnOff() {
        System.out.println("Light bulb turned off");
    }
}

// Problems:
// 1. LightSwitch is tightly coupled to LightBulb
// 2. Cannot switch to LED, CFL, or Fan without changing LightSwitch
// 3. Cannot test LightSwitch without LightBulb
// 4. Cannot easily change LightBulb implementation
```

### Good Example - Following DIP:

```java
// Abstraction
public interface Switchable {
    void turnOn();
    void turnOff();
}

// Low-level modules depend on abstraction
public class LightBulb implements Switchable {
    @Override
    public void turnOn() {
        System.out.println("Light bulb turned on");
    }
    
    @Override
    public void turnOff() {
        System.out.println("Light bulb turned off");
    }
}

public class CeilingFan implements Switchable {
    @Override
    public void turnOn() {
        System.out.println("Ceiling fan turned on");
    }
    
    @Override
    public void turnOff() {
        System.out.println("Ceiling fan turned off");
    }
}

public class LEDLight implements Switchable {
    @Override
    public void turnOn() {
        System.out.println("LED light turned on");
    }
    
    @Override
    public void turnOff() {
        System.out.println("LED light turned off");
    }
}

// High-level module depends on abstraction
public class Switch {
    private Switchable device;
    
    // Dependency Injection - device is injected
    public Switch(Switchable device) {
        this.device = device;
    }
    
    public void turnOn() {
        device.turnOn();
    }
    
    public void turnOff() {
        device.turnOff();
    }
}

// Usage - high flexibility
public class Main {
    public static void main(String[] args) {
        Switchable lightBulb = new LightBulb();
        Switch lightSwitch = new Switch(lightBulb);
        lightSwitch.turnOn();
        
        Switchable fan = new CeilingFan();
        Switch fanSwitch = new Switch(fan);
        fanSwitch.turnOn();
        
        Switchable led = new LEDLight();
        Switch ledSwitch = new Switch(led);
        ledSwitch.turnOn();
    }
}
```

### Real-World Enterprise Example:

```java
// Abstractions
public interface NotificationService {
    void sendNotification(Notification notification);
}

public interface MessageQueue {
    void publish(Message message);
    Message consume();
}

public interface Cache {
    void put(String key, Object value);
    Object get(String key);
    void remove(String key);
}

// Low-level implementations
public class EmailNotificationService implements NotificationService {
    private EmailSender emailSender;
    
    public EmailNotificationService(EmailSender emailSender) {
        this.emailSender = emailSender;
    }
    
    @Override
    public void sendNotification(Notification notification) {
        Email email = new Email(notification.getRecipient(), notification.getSubject(), notification.getBody());
        emailSender.send(email);
    }
}

public class SMSNotificationService implements NotificationService {
    private SMSSender smsSender;
    
    public SMSNotificationService(SMSSender smsSender) {
        this.smsSender = smsSender;
    }
    
    @Override
    public void sendNotification(Notification notification) {
        SMS sms = new SMS(notification.getRecipient(), notification.getBody());
        smsSender.send(sms);
    }
}

public class RabbitMQMessageQueue implements MessageQueue {
    private RabbitMQTemplate template;
    
    public RabbitMQMessageQueue(RabbitMQTemplate template) {
        this.template = template;
    }
    
    @Override
    public void publish(Message message) {
        template.convertAndSend(message.getQueue(), message);
    }
    
    @Override
    public Message consume() {
        return template.receiveAndConvert(message.getQueue(), Message.class);
    }
}

public class RedisCache implements Cache {
    private RedisTemplate<String, Object> redisTemplate;
    
    public RedisCache(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    
    @Override
    public void put(String key, Object value) {
        redisTemplate.opsForValue().set(key, value);
    }
    
    @Override
    public Object get(String key) {
        return redisTemplate.opsForValue().get(key);
    }
    
    @Override
    public void remove(String key) {
        redisTemplate.delete(key);
    }
}

// High-level module depends on abstractions
public class OrderService {
    private NotificationService notificationService;
    private MessageQueue messageQueue;
    private Cache cache;
    
    // Constructor injection - all dependencies injected
    public OrderService(NotificationService notificationService,
                       MessageQueue messageQueue,
                       Cache cache) {
        this.notificationService = notificationService;
        this.messageQueue = messageQueue;
        this.cache = cache;
    }
    
    public void placeOrder(Order order) {
        // Business logic...
        order.validate();
        order.calculateTotal();
        
        // Cache the order
        cache.put("order:" + order.getId(), order);
        
        // Send notification
        Notification notification = new Notification(
            order.getCustomer().getEmail(),
            "Order Placed",
            "Your order has been placed successfully"
        );
        notificationService.sendNotification(notification);
        
        // Publish to message queue for order processing
        Message message = new Message("order.placed", order);
        messageQueue.publish(message);
    }
}

// Configuration with different implementations for different environments
@Configuration
public class AppConfig {
    
    @Bean
    public NotificationService notificationService(
            EmailSender emailSender, SMSSender smsSender) {
        // Can easily switch between Email and SMS based on configuration
        if (useEmailNotifications()) {
            return new EmailNotificationService(emailSender);
        } else {
            return new SMSNotificationService(smsSender);
        }
    }
    
    @Bean
    public MessageQueue messageQueue(RabbitMQTemplate rabbitTemplate, 
                                     KafkaTemplate<String, Message> kafkaTemplate) {
        // Can easily switch between RabbitMQ and Kafka
        if (useRabbitMQ()) {
            return new RabbitMQMessageQueue(rabbitTemplate);
        } else {
            return new KafkaMessageQueue(kafkaTemplate);
        }
    }
    
    @Bean
    public Cache cache(RedisTemplate<String, Object> redisTemplate,
                       MemcachedClient memcachedClient) {
        // Can easily switch between Redis and Memcached
        if (useRedis()) {
            return new RedisCache(redisTemplate);
        } else {
            return new MemcachedCache(memcachedClient);
        }
    }
}

// Test configuration - use mocks
@TestConfiguration
public class TestConfig {
    
    @Bean
    public NotificationService notificationService() {
        return new MockNotificationService();
    }
    
    @Bean
    public MessageQueue messageQueue() {
        return new MockMessageQueue();
    }
    
    @Bean
    public Cache cache() {
        return new MockCache();
    }
}
```

### Benefits:

1. **Loose coupling**: High-level and low-level modules are decoupled
2. **Flexibility**: Can easily swap implementations
3. **Testability**: Easy to mock dependencies for unit tests
4. **Maintainability**: Changes in low-level modules don't affect high-level modules

---

## SOLID in Practice

### Design Checklist:

#### Before Writing Code:
- [ ] What is the single responsibility of this class?
- [ ] Can this class be extended without modification?
- [ ] Can this class be substituted with its subclasses?
- [ ] Do clients use all methods of this interface?
- [ ] Does this class depend on abstractions?

#### During Code Review:
- [ ] Does the class have multiple reasons to change? (SRP violation)
- [ ] Are there switch statements that grow with new types? (OCP violation)
- [ ] Do subclasses violate the contract of their superclass? (LSP violation)
- [ ] Are clients forced to implement methods they don't use? (ISP violation)
- [ ] Does the class depend on concrete implementations? (DIP violation)

#### Refactoring Opportunities:
1. **Extract methods/classes** to separate responsibilities
2. **Create interfaces** for extensibility
3. **Replace inheritance with composition** where appropriate
4. **Split large interfaces** into smaller, cohesive ones
5. **Introduce dependency injection** to reduce coupling

---

## Common Violations

### 1. God Class

**Problem**: A class that does too much

```java
// BAD: God Class
public class UserService {
    // Validation
    public void validateUser(User user) { }
    
    // Database operations
    public void saveUser(User user) { }
    public User findUser(Long id) { }
    
    // Email operations
    public void sendWelcomeEmail(User user) { }
    public void sendPasswordResetEmail(User user) { }
    
    // Logging
    public void logUserAction(User user, String action) { }
    
    // Caching
    public void cacheUser(User user) { }
    public User getUserFromCache(Long id) { }
    
    // Authentication
    public boolean authenticate(String username, String password) { }
    
    // Authorization
    public boolean hasPermission(User user, String permission) { }
}
```

**Solution**: Split into focused classes

### 2. Shotgun Surgery

**Problem**: One change requires modifying many files

**Solution**: Better encapsulation and cohesion

### 3. Feature Envy

**Problem**: Method uses more data from other classes than its own

```java
// BAD: Feature Envy
public class OrderService {
    public double calculateOrderTotal(Order order) {
        double total = 0;
        for (OrderItem item : order.getItems()) {
            total += item.getQuantity() * item.getPrice();
            // Order data accessed repeatedly
            // Should be in Order class
        }
        return total;
    }
}

// GOOD: Move method to Order class
public class Order {
    public double calculateTotal() {
        return items.stream()
            .mapToDouble(item -> item.getQuantity() * item.getPrice())
            .sum();
    }
}
```

### 4. Inappropriate Intimacy

**Problem**: Classes know too much about each other's internals

**Solution**: Better encapsulation and interfaces

---

## Real-World Complex Scenarios

### Scenario 1: E-commerce Order Processing

```java
// Domain Models
public class Order {
    private OrderId id;
    private CustomerId customerId;
    private List<OrderItem> items;
    private OrderStatus status;
    private Money totalAmount;
    private LocalDateTime createdAt;
    
    public void addItem(Product product, int quantity) {
        validateStatus();
        OrderItem item = new OrderItem(product, quantity);
        items.add(item);
        recalculateTotal();
    }
    
    public void placeOrder() {
        if (items.isEmpty()) {
            throw new InvalidOrderException("Order cannot be empty");
        }
        this.status = OrderStatus.PLACED;
        EventPublisher.publish(new OrderPlacedEvent(this.id));
    }
    
    private void validateStatus() {
        if (status != OrderStatus.DRAFT) {
            throw new InvalidOrderException("Cannot modify " + status + " order");
        }
    }
    
    private void recalculateTotal() {
        this.totalAmount = items.stream()
            .map(item -> item.getSubtotal())
            .reduce(Money.ZERO, Money::add);
    }
}

// Repository - Data access abstraction
public interface OrderRepository {
    Order save(Order order);
    Optional<Order> findById(OrderId id);
    List<Order> findByCustomer(CustomerId customerId);
}

// Domain Service - Orchestration
public class OrderService {
    private OrderRepository orderRepository;
    private ProductRepository productRepository;
    private CustomerRepository customerRepository;
    private InventoryService inventoryService;
    private PaymentService paymentService;
    private NotificationService notificationService;
    
    @Transactional
    public OrderId placeOrder(PlaceOrderCommand command) {
        // Validate customer exists
        Customer customer = customerRepository.findById(command.getCustomerId())
            .orElseThrow(() -> new CustomerNotFoundException(command.getCustomerId()));
        
        // Validate products exist and have enough inventory
        List<OrderItem> items = validateAndPrepareItems(command.getItems());
        
        // Create order
        Order order = Order.createDraft(customer.getId(), items);
        
        // Check inventory availability
        inventoryService.reserveInventory(order);
        
        // Process payment
        PaymentResult paymentResult = paymentService.processPayment(
            command.getPaymentMethod(),
            order.getTotalAmount()
        );
        
        if (!paymentResult.isSuccess()) {
            throw new PaymentFailedException(paymentResult.getErrorMessage());
        }
        
        // Place order
        order.placeOrder();
        orderRepository.save(order);
        
        // Send confirmation
        notificationService.sendOrderConfirmation(customer, order);
        
        return order.getId();
    }
    
    private List<OrderItem> validateAndPrepareItems(List<CreateOrderItemCommand> items) {
        return items.stream()
            .map(item -> {
                Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ProductNotFoundException(item.getProductId()));
                return new OrderItem(product, item.getQuantity());
            })
            .collect(Collectors.toList());
    }
}

// Application Service - Use case orchestration
public class PlaceOrderUseCase {
    private OrderService orderService;
    
    public OrderId execute(PlaceOrderRequest request) {
        PlaceOrderCommand command = mapToCommand(request);
        return orderService.placeOrder(command);
    }
    
    private PlaceOrderCommand mapToCommand(PlaceOrderRequest request) {
        // Map DTO to domain command
        return new PlaceOrderCommand(
            request.getCustomerId(),
            request.getItems(),
            request.getPaymentMethod()
        );
    }
}
```

### Benefits of SOLID in This Scenario:

1. **SRP**: Each class has one clear responsibility
2. **OCP**: Can add new payment methods, notification channels without modifying existing code
3. **LSP**: Can substitute different implementations of repositories and services
4. **ISP**: Different clients depend only on interfaces they need
5. **DIP**: High-level business logic doesn't depend on low-level implementations

---

## Summary for Senior Developers

### Key Takeaways:

1. **SOLID principles guide maintainable design**
2. **Apply principles pragmatically** - don't over-engineer
3. **Refactor iteratively** - improve code over time
4. **Use design patterns** - patterns often embody SOLID principles
5. **Think in terms of abstractions** - program to interfaces

### Decision Framework:

| Principle | Question to Ask | When to Apply |
|-----------|-----------------|---------------|
| SRP | Does this class have multiple reasons to change? | Always |
| OCP | Will this need new types in the future? | When anticipating extension points |
| LSP | Can I substitute this with its subtype? | When creating class hierarchies |
| ISP | Do clients use all methods? | When designing interfaces |
| DIP | Does this depend on concrete implementations? | For flexibility and testability |

### Common Mistakes:

1. **Applying principles blindly** without understanding the problem
2. **Over-engineering** simple scenarios
3. **Creating too many abstractions** too early
4. **Ignoring performance** implications
5. **Not refactoring** existing code

### Best Practices:

1. **Start simple**, refactor when needed
2. **Design for testability** from the start
3. **Use dependency injection** frameworks appropriately
4. **Write unit tests** to verify SOLID compliance
5. **Review code** with SOLID principles in mind

### Next Steps:
- Explore real-world OOPS scenarios → [OOPS Real-World Scenarios](03-oops-real-world-scenarios.md)
- Learn LLD fundamentals → [LLD Fundamentals](04-lld-fundamentals.md)