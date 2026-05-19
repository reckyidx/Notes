# BookMyShow - Pseudocode Solutions

This document contains pseudocode for all major components of the BookMyShow system, organized by domain and design pattern used.

---

## Table of Contents

1. [User Service](#1-user-service)
2. [Movie Service](#2-movie-service)
3. [Theater Service](#3-theater-service)
4. [Show Service](#4-show-service)
5. [Seat Locking Service](#5-seat-locking-service)
6. [Booking Service (Saga Pattern)](#6-booking-service-saga-pattern)
7. [Payment Service (Strategy Pattern)](#7-payment-service-strategy-pattern)
8. [Notification Service (Factory Pattern)](#8-notification-service-factory-pattern)
9. [Ticket Service](#9-ticket-service)
10. [API Gateway](#10-api-gateway)

---

## 1. User Service

### Design Patterns Used
- **Repository Pattern**: Data access abstraction
- **Factory Pattern**: User creation
- **Strategy Pattern**: Password hashing strategies

### Pseudocode

```pseudocode
// ==================== ENTITIES ====================

ENTITY User
    id: UUID
    name: String
    email: String
    phone: String
    password_hash: String
    salt: String
    role: UserRole  // CUSTOMER, THEATER_OWNER, ADMIN
    is_verified: Boolean
    is_active: Boolean
    created_at: Timestamp
    updated_at: Timestamp

ENUM UserRole
    CUSTOMER
    THEATER_OWNER
    ADMIN

// ==================== REPOSITORY LAYER ====================

INTERFACE IUserRepository
    create(user: User): User
    findById(id: UUID): User?
    findByEmail(email: String): User?
    findByPhone(phone: String): User?
    update(user: User): User
    delete(id: UUID): Boolean

CLASS UserRepository IMPLEMENTS IUserRepository
    PRIVATE database: Database
    
    CONSTRUCTOR(database: Database)
        this.database = database
    
    METHOD create(user: User): User
        query = "INSERT INTO users (id, name, email, phone, password_hash, salt, role, is_verified, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        database.execute(query, [user.id, user.name, user.email, user.phone, user.password_hash, user.salt, user.role, user.is_verified, user.is_active])
        RETURN user
    
    METHOD findById(id: UUID): User?
        query = "SELECT * FROM users WHERE id = ?"
        result = database.queryOne(query, [id])
        IF result IS NULL
            RETURN NULL
        RETURN mapToUser(result)
    
    METHOD findByEmail(email: String): User?
        query = "SELECT * FROM users WHERE email = ?"
        result = database.queryOne(query, [email])
        IF result IS NULL
            RETURN NULL
        RETURN mapToUser(result)
    
    METHOD findByPhone(phone: String): User?
        query = "SELECT * FROM users WHERE phone = ?"
        result = database.queryOne(query, [phone])
        IF result IS NULL
            RETURN NULL
        RETURN mapToUser(result)
    
    METHOD update(user: User): User
        query = "UPDATE users SET name = ?, email = ?, phone = ?, is_verified = ?, is_active = ?, updated_at = NOW() WHERE id = ?"
        database.execute(query, [user.name, user.email, user.phone, user.is_verified, user.is_active, user.id])
        RETURN user
    
    METHOD delete(id: UUID): Boolean
        query = "DELETE FROM users WHERE id = ?"
        result = database.execute(query, [id])
        RETURN result.rowsAffected > 0
    
    PRIVATE METHOD mapToUser(row: Row): User
        RETURN User(
            id = row.id,
            name = row.name,
            email = row.email,
            phone = row.phone,
            password_hash = row.password_hash,
            salt = row.salt,
            role = UserRole.valueOf(row.role),
            is_verified = row.is_verified,
            is_active = row.is_active,
            created_at = row.created_at,
            updated_at = row.updated_at
        )

// ==================== PASSWORD STRATEGY ====================

INTERFACE IPasswordHasher
    hash(password: String, salt: String): String
    generateSalt(): String
    verify(password: String, hash: String, salt: String): Boolean

CLASS BcryptPasswordHasher IMPLEMENTS IPasswordHasher
    PRIVATE rounds: Integer = 12
    
    METHOD hash(password: String, salt: String): String
        RETURN bcrypt.hash(password + salt, this.rounds)
    
    METHOD generateSalt(): String
        RETURN randomString(32)
    
    METHOD verify(password: String, hash: String, salt: String): Boolean
        RETURN bcrypt.compare(password + salt, hash)

// ==================== JWT SERVICE ====================

CLASS JwtService
    PRIVATE secret: String
    PRIVATE accessTokenExpiry: Integer = 900  // 15 minutes
    PRIVATE refreshTokenExpiry: Integer = 604800  // 7 days
    
    CONSTRUCTOR(secret: String)
        this.secret = secret
    
    METHOD generateAccessToken(user: User): String
        payload = {
            user_id: user.id,
            email: user.email,
            role: user.role,
            type: "access"
        }
        RETURN jwt.encode(payload, this.secret, { expiresIn: this.accessTokenExpiry })
    
    METHOD generateRefreshToken(user: User): String
        payload = {
            user_id: user.id,
            type: "refresh"
        }
        RETURN jwt.encode(payload, this.secret, { expiresIn: this.refreshTokenExpiry })
    
    METHOD verifyToken(token: String): TokenPayload?
        TRY
            RETURN jwt.decode(token, this.secret)
        CATCH JwtError
            RETURN NULL
    
    METHOD refreshAccessToken(refreshToken: String): String?
        payload = this.verifyToken(refreshToken)
        IF payload IS NULL OR payload.type != "refresh"
            RETURN NULL
        user = userRepository.findById(payload.user_id)
        IF user IS NULL
            RETURN NULL
        RETURN this.generateAccessToken(user)

// ==================== SERVICE LAYER ====================

CLASS AuthService
    PRIVATE userRepository: IUserRepository
    PRIVATE passwordHasher: IPasswordHasher
    PRIVATE jwtService: JwtService
    PRIVATE cache: RedisClient
    
    CONSTRUCTOR(userRepository: IUserRepository, passwordHasher: IPasswordHasher, jwtService: JwtService, cache: RedisClient)
        this.userRepository = userRepository
        this.passwordHasher = passwordHasher
        this.jwtService = jwtService
        this.cache = cache
    
    METHOD signup(request: SignupRequest): AuthResponse
        // Validate input
        IF request.email IS NOT validEmail
            THROW ValidationException("Invalid email format")
        
        IF request.password.length < 8
            THROW ValidationException("Password must be at least 8 characters")
        
        // Check if user exists
        existingUser = this.userRepository.findByEmail(request.email)
        IF existingUser IS NOT NULL
            THROW ConflictException("Email already registered")
        
        // Create user
        salt = this.passwordHasher.generateSalt()
        passwordHash = this.passwordHasher.hash(request.password, salt)
        
        user = User(
            id = generateUUID(),
            name = request.name,
            email = request.email,
            phone = request.phone,
            password_hash = passwordHash,
            salt = salt,
            role = UserRole.CUSTOMER,
            is_verified = false,
            is_active = true
        )
        
        createdUser = this.userRepository.create(user)
        
        // Generate tokens
        accessToken = this.jwtService.generateAccessToken(createdUser)
        refreshToken = this.jwtService.generateRefreshToken(createdUser)
        
        // Store refresh token in cache
        this.cache.setex("refresh_token:" + createdUser.id, 604800, refreshToken)
        
        RETURN AuthResponse(
            user = createdUser.toPublic(),
            access_token = accessToken,
            refresh_token = refreshToken
        )
    
    METHOD login(request: LoginRequest): AuthResponse
        // Find user by email
        user = this.userRepository.findByEmail(request.email)
        IF user IS NULL
            THROW AuthenticationException("Invalid credentials")
        
        // Verify password
        IF NOT this.passwordHasher.verify(request.password, user.password_hash, user.salt)
            THROW AuthenticationException("Invalid credentials")
        
        // Check if user is active
        IF NOT user.is_active
            THROW AuthenticationException("Account is deactivated")
        
        // Generate tokens
        accessToken = this.jwtService.generateAccessToken(user)
        refreshToken = this.jwtService.generateRefreshToken(user)
        
        // Store refresh token in cache
        this.cache.setex("refresh_token:" + user.id, 604800, refreshToken)
        
        // Update last login
        user.last_login = now()
        this.userRepository.update(user)
        
        RETURN AuthResponse(
            user = user.toPublic(),
            access_token = accessToken,
            refresh_token = refreshToken
        )
    
    METHOD logout(userId: UUID): Boolean
        // Invalidate refresh token
        this.cache.del("refresh_token:" + userId)
        RETURN true
    
    METHOD refreshToken(refreshToken: String): TokenResponse
        // Verify refresh token
        payload = this.jwtService.verifyToken(refreshToken)
        IF payload IS NULL OR payload.type != "refresh"
            THROW AuthenticationException("Invalid refresh token")
        
        // Check if token matches stored token
        storedToken = this.cache.get("refresh_token:" + payload.user_id)
        IF storedToken != refreshToken
            THROW AuthenticationException("Token has been revoked")
        
        // Generate new access token
        accessToken = this.jwtService.refreshAccessToken(refreshToken)
        IF accessToken IS NULL
            THROW AuthenticationException("Could not refresh token")
        
        RETURN TokenResponse(access_token = accessToken)

// ==================== CONTROLLER LAYER ====================

CLASS AuthController
    PRIVATE authService: AuthService
    
    CONSTRUCTOR(authService: AuthService)
        this.authService = authService
    
    METHOD signup(request: Request): Response
        TRY
            result = this.authService.signup(request.body)
            RETURN Response.status(201).json(result)
        CATCH ValidationException AS e
            RETURN Response.status(400).json({ error: e.message })
        CATCH ConflictException AS e
            RETURN Response.status(409).json({ error: e.message })
    
    METHOD login(request: Request): Response
        TRY
            result = this.authService.login(request.body)
            RETURN Response.status(200).json(result)
        CATCH AuthenticationException AS e
            RETURN Response.status(401).json({ error: e.message })
    
    METHOD logout(request: Request): Response
        userId = request.user.id  // From JWT middleware
        this.authService.logout(userId)
        RETURN Response.status(200).json({ message: "Logged out successfully" })
    
    METHOD refreshToken(request: Request): Response
        TRY
            result = this.authService.refreshToken(request.body.refresh_token)
            RETURN Response.status(200).json(result)
        CATCH AuthenticationException AS e
            RETURN Response.status(401).json({ error: e.message })
```

---

## 2. Movie Service

### Design Patterns Used
- **Repository Pattern**: Data access abstraction
- **Builder Pattern**: Movie entity construction
- **Specification Pattern**: Search criteria

### Pseudocode

```pseudocode
// ==================== ENTITIES ====================

ENTITY Movie
    id: UUID
    title: String
    description: String
    duration_minutes: Integer
    genre: String
    language: String
    release_date: Date
    poster_url: String
    rating: Decimal
    is_active: Boolean
    created_at: Timestamp
    updated_at: Timestamp

// ==================== REPOSITORY ====================

INTERFACE IMovieRepository
    create(movie: Movie): Movie
    findById(id: UUID): Movie?
    findAll(criteria: SearchCriteria): List<Movie>
    update(movie: Movie): Movie
    delete(id: UUID): Boolean

CLASS MovieRepository IMPLEMENTS IMovieRepository
    PRIVATE database: Database
    
    METHOD findById(id: UUID): Movie?
        query = "SELECT * FROM movies WHERE id = ? AND is_active = true"
        result = this.database.queryOne(query, [id])
        IF result IS NULL
            RETURN NULL
        RETURN this.mapToMovie(result)
    
    METHOD findAll(criteria: SearchCriteria): List<Movie>
        query = "SELECT * FROM movies WHERE is_active = true"
        params = []
        
        IF criteria.genre IS NOT NULL
            query += " AND genre = ?"
            params.add(criteria.genre)
        
        IF criteria.language IS NOT NULL
            query += " AND language = ?"
            params.add(criteria.language)
        
        IF criteria.search IS NOT NULL
            query += " AND (title ILIKE ? OR description ILIKE ?)"
            params.add("%" + criteria.search + "%")
            params.add("%" + criteria.search + "%")
        
        query += " ORDER BY release_date DESC LIMIT ? OFFSET ?"
        params.add(criteria.limit)
        params.add(criteria.offset)
        
        results = this.database.query(query, params)
        RETURN results.map(this.mapToMovie)
    
    PRIVATE METHOD mapToMovie(row: Row): Movie
        RETURN Movie(
            id = row.id,
            title = row.title,
            description = row.description,
            duration_minutes = row.duration_minutes,
            genre = row.genre,
            language = row.language,
            release_date = row.release_date,
            poster_url = row.poster_url,
            rating = row.rating,
            is_active = row.is_active,
            created_at = row.created_at,
            updated_at = row.updated_at
        )

// ==================== SERVICE ====================

CLASS MovieService
    PRIVATE movieRepository: IMovieRepository
    PRIVATE cache: RedisClient
    PRIVATE searchService: SearchService
    
    METHOD getMovies(criteria: SearchCriteria): MovieListResponse
        // Try cache first
        cacheKey = "movies:" + hashCriteria(criteria)
        cachedResult = this.cache.get(cacheKey)
        IF cachedResult IS NOT NULL
            RETURN JSON.parse(cachedResult)
        
        // Get from database
        movies = this.movieRepository.findAll(criteria)
        total = this.movieRepository.count(criteria)
        
        response = MovieListResponse(
            movies = movies,
            total = total,
            page = criteria.page,
            limit = criteria.limit
        )
        
        // Cache for 5 minutes
        this.cache.setex(cacheKey, 300, JSON.stringify(response))
        
        RETURN response
    
    METHOD getMovieById(id: UUID): Movie
        movie = this.movieRepository.findById(id)
        IF movie IS NULL
            THROW NotFoundException("Movie not found")
        RETURN movie
    
    METHOD createMovie(request: CreateMovieRequest): Movie
        // Validate
        IF request.title IS EMPTY
            THROW ValidationException("Title is required")
        
        // Create movie
        movie = Movie(
            id = generateUUID(),
            title = request.title,
            description = request.description,
            duration_minutes = request.duration_minutes,
            genre = request.genre,
            language = request.language,
            release_date = request.release_date,
            poster_url = request.poster_url,
            rating = 0,
            is_active = true
        )
        
        createdMovie = this.movieRepository.create(movie)
        
        // Index in search service
        this.searchService.indexMovie(createdMovie)
        
        // Invalidate cache
        this.cache.del("movies:*")
        
        RETURN createdMovie
```

---

## 3. Theater Service

### Design Patterns Used
- **Repository Pattern**: Data access
- **Strategy Pattern**: Location detection strategies

### Pseudocode

```pseudocode
// ==================== ENTITIES ====================

ENTITY Theater
    id: UUID
    name: String
    city: String
    address: String
    latitude: Decimal
    longitude: Decimal
    phone: String
    owner_id: UUID
    is_active: Boolean
    created_at: Timestamp
    updated_at: Timestamp

ENTITY Screen
    id: UUID
    theater_id: UUID
    name: String
    total_seats: Integer
    screen_type: ScreenType  // IMAX, 3D, 2D
    seat_layout: JSON
    is_active: Boolean

ENTITY Seat
    id: UUID
    screen_id: UUID
    row_number: Integer
    seat_number: Integer
    seat_type: SeatType  // NORMAL, PREMIUM, RECLINER
    is_active: Boolean

ENUM ScreenType
    TWO_D = "2D"
    THREE_D = "3D"
    IMAX = "IMAX"
    IMAX_3D = "IMAX_3D"

ENUM SeatType
    NORMAL = "NORMAL"
    PREMIUM = "PREMIUM"
    RECLINER = "RECLINER"

// ==================== LOCATION STRATEGY ====================

INTERFACE ILocationStrategy
    detectLocation(request: Request): Location

CLASS GeoIPLocationStrategy IMPLEMENTS ILocationStrategy
    METHOD detectLocation(request: Request): Location
        ip = request.headers["X-Forwarded-For"] OR request.connection.remoteAddress
        geoData = geoIPService.lookup(ip)
        RETURN Location(
            city = geoData.city,
            latitude = geoData.latitude,
            longitude = geoData.longitude
        )

CLASS GPSLocationStrategy IMPLEMENTS ILocationStrategy
    METHOD detectLocation(request: Request): Location
        // User explicitly provides location
        RETURN Location(
            city = request.body.city,
            latitude = request.body.latitude,
            longitude = request.body.longitude
        )

CLASS LocationService
    PRIVATE strategies: Map<String, ILocationStrategy>
    
    CONSTRUCTOR()
        this.strategies = {
            "geo_ip": new GeoIPLocationStrategy(),
            "gps": new GPSLocationStrategy()
        }
    
    METHOD detectLocation(request: Request, strategy: String): Location
        locationStrategy = this.strategies[strategy] OR this.strategies["geo_ip"]
        RETURN locationStrategy.detectLocation(request)

// ==================== THEATER SERVICE ====================

CLASS TheaterService
    PRIVATE theaterRepository: ITheaterRepository
    PRIVATE screenRepository: IScreenRepository
    PRIVATE locationService: LocationService
    PRIVATE cache: RedisClient
    
    METHOD getTheatersByLocation(location: Location, radius: Integer): List<Theater>
        // Try cache
        cacheKey = "theaters:" + location.city + ":" + radius
        cached = this.cache.get(cacheKey)
        IF cached IS NOT NULL
            RETURN JSON.parse(cached)
        
        // Query database with geospatial query
        query = """
            SELECT * FROM theaters 
            WHERE is_active = true 
            AND ST_DWithin(
                ST_MakePoint(longitude, latitude)::geography,
                ST_MakePoint(?, ?)::geography,
                ?
            )
            ORDER BY ST_Distance(
                ST_MakePoint(longitude, latitude)::geography,
                ST_MakePoint(?, ?)::geography
            )
        """
        theaters = this.theaterRepository.query(query, [
            location.longitude, location.latitude, radius * 1000,
            location.longitude, location.latitude
        ])
        
        // Cache for 10 minutes
        this.cache.setex(cacheKey, 600, JSON.stringify(theaters))
        
        RETURN theaters
    
    METHOD getTheaterWithScreens(theaterId: UUID): TheaterDetail
        theater = this.theaterRepository.findById(theaterId)
        IF theater IS NULL
            THROW NotFoundException("Theater not found")
        
        screens = this.screenRepository.findByTheaterId(theaterId)
        
        RETURN TheaterDetail(
            theater = theater,
            screens = screens
        )
    
    METHOD getScreenSeatMap(screenId: UUID): SeatMap
        screen = this.screenRepository.findById(screenId)
        IF screen IS NULL
            THROW NotFoundException("Screen not found")
        
        seats = this.seatRepository.findByScreenId(screenId)
        
        // Build seat map grid
        seatMap = this.buildSeatMapGrid(seats, screen)
        
        RETURN SeatMap(
            screen = screen,
            seats = seatMap
        )
    
    PRIVATE METHOD buildSeatMapGrid(seats: List<Seat>, screen: Screen): SeatMapGrid
        grid = Array(screen.total_seats)
        
        FOR each seat IN seats
            grid[seat.row_number][seat.seat_number] = SeatInfo(
                seat_id = seat.id,
                row = seat.row_number,
                number = seat.seat_number,
                type = seat.seat_type,
                status = "AVAILABLE"
            )
        
        RETURN grid
```

---

## 4. Show Service

### Design Patterns Used
- **Repository Pattern**: Data access
- **Builder Pattern**: Show creation
- **Observer Pattern**: Show status changes

### Pseudocode

```pseudocode
// ==================== ENTITIES ====================

ENTITY Show
    id: UUID
    movie_id: UUID
    screen_id: UUID
    theater_id: UUID
    start_time: Timestamp
    end_time: Timestamp
    base_price: Decimal
    status: ShowStatus
    created_at: Timestamp
    updated_at: Timestamp

ENUM ShowStatus
    SCHEDULED = "SCHEDULED"
    OPEN_FOR_BOOKING = "OPEN_FOR_BOOKING"
    BOOKING_CLOSED = "BOOKING_CLOSED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

// ==================== SHOW SERVICE ====================

CLASS ShowService
    PRIVATE showRepository: IShowRepository
    PRIVATE showSeatRepository: IShowSeatRepository
    PRIVATE cache: RedisClient
    PRIVATE eventPublisher: EventPublisher
    
    METHOD getShowsByMovieAndCity(movieId: UUID, city: String, date: Date): List<ShowDetail>
        // Try cache
        cacheKey = "shows:" + movieId + ":" + city + ":" + date
        cached = this.cache.get(cacheKey)
        IF cached IS NOT NULL
            RETURN JSON.parse(cached)
        
        // Get shows
        shows = this.showRepository.findByMovieAndCityAndDate(movieId, city, date)
        
        // Enrich with theater and availability info
        showDetails = []
        FOR each show IN shows
            theater = this.theaterRepository.findById(show.theater_id)
            availableSeats = this.showSeatRepository.countAvailableSeats(show.id)
            
            showDetails.add(ShowDetail(
                show = show,
                theater = theater,
                available_seats = availableSeats
            ))
        
        // Cache for 2 minutes
        this.cache.setex(cacheKey, 120, JSON.stringify(showDetails))
        
        RETURN showDetails
    
    METHOD getShowWithSeatMap(showId: UUID): ShowSeatMap
        show = this.showRepository.findById(showId)
        IF show IS NULL
            THROW NotFoundException("Show not found")
        
        // Get all seats with their status
        showSeats = this.showSeatRepository.findByShowId(showId)
        
        // Build seat map with real-time status
        seatMap = this.buildSeatMapWithStatus(showSeats, show.screen_id)
        
        RETURN ShowSeatMap(
            show = show,
            seat_map = seatMap
        )
    
    METHOD createShow(request: CreateShowRequest): Show
        // Validate screen availability
        existingShows = this.showRepository.findByScreenAndTimeRange(
            request.screen_id,
            request.start_time,
            request.end_time
        )
        
        IF existingShows.length > 0
            THROW ConflictException("Screen is not available for the selected time")
        
        // Create show
        show = Show(
            id = generateUUID(),
            movie_id = request.movie_id,
            screen_id = request.screen_id,
            theater_id = request.theater_id,
            start_time = request.start_time,
            end_time = request.end_time,
            base_price = request.base_price,
            status = ShowStatus.SCHEDULED
        )
        
        createdShow = this.showRepository.create(show)
        
        // Create show_seats for all seats in the screen
        seats = this.seatRepository.findByScreenId(request.screen_id)
        FOR each seat IN seats
            showSeat = ShowSeat(
                id = generateUUID(),
                show_id = createdShow.id,
                seat_id = seat.id,
                status = SeatStatus.AVAILABLE,
                price = this.calculateSeatPrice(request.base_price, seat.seat_type)
            )
            this.showSeatRepository.create(showSeat)
        
        // Publish event
        this.eventPublisher.publish("show.created", createdShow)
        
        RETURN createdShow
    
    METHOD updateShowStatus(showId: UUID, status: ShowStatus): Show
        show = this.showRepository.findById(showId)
        IF show IS NULL
            THROW NotFoundException("Show not found")
        
        // Validate status transition
        IF NOT this.isValidStatusTransition(show.status, status)
            THROW ValidationException("Invalid status transition")
        
        show.status = status
        updatedShow = this.showRepository.update(show)
        
        // Publish event
        this.eventPublisher.publish("show.status_changed", {
            show_id: showId,
            old_status: show.status,
            new_status: status
        })
        
        // Invalidate cache
        this.cache.del("shows:*")
        
        RETURN updatedShow
    
    PRIVATE METHOD calculateSeatPrice(basePrice: Decimal, seatType: SeatType): Decimal
        SWITCH seatType
            CASE SeatType.PREMIUM:
                RETURN basePrice * 1.5
            CASE SeatType.RECLINER:
                RETURN basePrice * 2.0
            DEFAULT:
                RETURN basePrice
```

---

## 5. Seat Locking Service

### Design Patterns Used
- **Distributed Lock Pattern**: Redis-based locking
- **Idempotency Pattern**: Prevents duplicate operations

### Pseudocode

```pseudocode
// ==================== ENTITIES ====================

ENTITY SeatLock
    lock_id: UUID
    show_id: UUID
    seat_ids: List<UUID>
    user_id: UUID
    locked_at: Timestamp
    expires_at: Timestamp
    status: LockStatus

ENUM SeatStatus
    AVAILABLE = "AVAILABLE"
    LOCKED = "LOCKED"
    BOOKED = "BOOKED"

ENUM LockStatus
    ACTIVE = "ACTIVE"
    RELEASED = "RELEASED"
    EXPIRED = "EXPIRED"
    CONFIRMED = "CONFIRMED"

// ==================== SEAT LOCK SERVICE ====================

CLASS SeatLockService
    PRIVATE redis: RedisClient
    PRIVATE showSeatRepository: IShowSeatRepository
    PRIVATE lockTTL: Integer = 300  // 5 minutes
    
    METHOD lockSeats(request: LockSeatsRequest): SeatLockResponse
        // Validate max seats
        IF request.seat_ids.length > 5
            THROW ValidationException("Cannot book more than 5 seats")
        
        // Check if seats are available
        FOR each seatId IN request.seat_ids
            IF NOT this.isSeatAvailable(request.show_id, seatId)
                THROW ConflictException("Seat " + seatId + " is not available")
        
        // Acquire distributed locks
        lockId = generateUUID()
        acquiredLocks = []
        
        TRY
            // Sort seat IDs to prevent deadlocks (ordered locking)
            sortedSeatIds = sort(request.seat_ids)
            
            FOR each seatId IN sortedSeatIds
                lockKey = "seat_lock:" + request.show_id + ":" + seatId
                
                // Use SET NX EX for atomic lock acquisition
                acquired = this.redis.set(
                    lockKey,
                    lockId + ":" + request.user_id,
                    "NX",  // Only set if not exists
                    "EX", this.lockTTL
                )
                
                IF NOT acquired
                    // Release all acquired locks
                    this.releaseLocks(request.show_id, acquiredLocks, lockId)
                    THROW ConflictException("Could not acquire lock for seat " + seatId)
                
                acquiredLocks.add(seatId)
            
            // Update database status
            this.showSeatRepository.updateStatus(
                request.show_id,
                request.seat_ids,
                SeatStatus.LOCKED,
                request.user_id,
                lockId
            )
            
            RETURN SeatLockResponse(
                lock_id = lockId,
                show_id = request.show_id,
                seat_ids = request.seat_ids,
                expires_at = now() + this.lockTTL,
                amount = this.calculateAmount(request.show_id, request.seat_ids)
            )
        
        CATCH Exception AS e
            // Release all locks on failure
            this.releaseLocks(request.show_id, acquiredLocks, lockId)
            THROW e
    
    METHOD releaseLock(lockId: UUID): Boolean
        // Find lock details
        lockKey = "seat_lock_meta:" + lockId
        lockData = this.redis.get(lockKey)
        
        IF lockData IS NULL
            RETURN false
        
        lock = JSON.parse(lockData)
        
        // Release all seat locks
        FOR each seatId IN lock.seat_ids
            seatLockKey = "seat_lock:" + lock.show_id + ":" + seatId
            this.redis.del(seatLockKey)
        
        // Update database status
        this.showSeatRepository.releaseLock(lock.show_id, lock.seat_ids)
        
        // Delete lock metadata
        this.redis.del(lockKey)
        
        RETURN true
    
    METHOD extendLock(lockId: UUID): Boolean
        lockKey = "seat_lock_meta:" + lockId
        lockData = this.redis.get(lockKey)
        
        IF lockData IS NULL
            THROW NotFoundException("Lock not found or expired")
        
        lock = JSON.parse(lockData)
        
        // Check if lock is still valid
        IF lock.expires_at < now()
            THROW ValidationException("Lock has already expired")
        
        // Extend TTL for all seat locks
        FOR each seatId IN lock.seat_ids
            seatLockKey = "seat_lock:" + lock.show_id + ":" + seatId
            this.redis.expire(seatLockKey, this.lockTTL)
        
        // Update lock metadata
        lock.expires_at = now() + this.lockTTL
        this.redis.setex(lockKey, this.lockTTL, JSON.stringify(lock))
        
        RETURN true
    
    METHOD isSeatAvailable(showId: UUID, seatId: UUID): Boolean
        // Check Redis lock first
        lockKey = "seat_lock:" + showId +