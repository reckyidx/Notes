# React Interview Questions & Answers
## For 10+ Years Experienced Full-Stack Node.js + React Developer

---

## Table of Contents
1. [React Fundamentals](#react-fundamentals)
2. [Components & Hooks](#components--hooks)
3. [State Management](#state-management)
4. [Performance Optimization](#performance-optimization)
5. [Advanced Patterns](#advanced-patterns)
6. [Server-Side Rendering](#server-side-rendering)
7. [Real-World Production Patterns](#real-world-production-patterns)

---

## React Fundamentals

### Q1: Explain React's reconciliation algorithm and fiber architecture

**Answer:**

```javascript
/**
 * React Reconciliation (Virtual DOM)
 * 
 * Process:
 * 1. Render phase - Create new virtual DOM (can be paused/aborted)
 * 2. Commit phase - Apply changes to real DOM (synchronous)
 */

// React Fiber - Internal architecture
const FiberArchitecture = {
  concept: 'Incremental rendering with ability to split work into chunks',
  benefits: [
    'Can pause work and come back later',
    'Can assign priority to different types of work',
    'Can reuse previously completed work',
    'Can abort work if not needed anymore'
  ],

  fiberStructure: {
    // Each fiber is a unit of work
    type: 'Component type or HTML tag',
    props: 'Component props',
    state: 'Component state',
    parent: 'Parent fiber',
    children: 'Child fibers',
    sibling: 'Sibling fibers',
    hooks: 'Hooks state',
    dependencies: 'useEffect dependencies'
  },

  workLoop: `
  1. Start with root fiber
  2. Perform work on current fiber
  3. Move to next fiber (child, sibling, parent)
  4. When done with all fibers, commit phase begins
  5. Update DOM with batched changes
  `
};

// Reconciliation diffing algorithm
const DiffingAlgorithm = {
  algorithm: 'Two assumptions to make O(n) complexity:',
  assumption1: 'Different types produce different trees',
  assumption2: 'Developer can hint which elements are stable with keys',

  example: `
  // Old tree
  <div>
    <span key="a">Item A</span>
    <span key="b">Item B</span>
  </div>

  // New tree
  <div>
    <span key="b">Item B</span>
    <span key="a">Item A</span>
  </div>

  // With keys, React knows only order changed, not content
  // Without keys, React would re-render both and discard both
  `
};

// Deep dive into React's diffing
class ComponentDiffing {
  static exampleDiff() {
    // Case 1: Type changed - entire tree is reconstructed
    const before = <Header />;
    const after = <SideBar />;
    // Result: Header unmounted, SideBar mounted, state lost

    // Case 2: Type same, props different - attributes updated
    const before2 = <Header name="old" />;
    const after2 = <Header name="new" />;
    // Result: Only 'name' prop updated, component instance preserved

    // Case 3: List items with keys
    const before3 = [
      <Item key="1" id={1} />,
      <Item key="2" id={2} />
    ];
    const after3 = [
      <Item key="2" id={2} />,
      <Item key="1" id={1} />
    ];
    // Result: Elements reordered, component state preserved
  }
}
```

---

### Q2: How does React batching work and how do you optimize it?

**Answer:**

```javascript
/**
 * React Batching - Grouping multiple state updates
 * 
 * Before React 18: Only in React event handlers
 * React 18+: Automatic batching in all cases (promises, setTimeout, etc.)
 */

// React 18+ Automatic Batching
function Component() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);

  // Both updates batched together - renders once
  const handleClick = () => {
    setCount(c => c + 1);
    setFlag(f => !f);
  };

  // Also batched in async callbacks
  const handleAsync = async () => {
    await fetchData();
    setCount(c => c + 1); // Batched
    setFlag(f => !f);     // Batched
    // Single render
  };

  // Opt out of batching if needed
  const handleClickWithoutBatching = () => {
    const flushSync = require('react-dom').flushSync;
    
    flushSync(() => {
      setCount(c => c + 1); // Renders immediately
    });
    
    setFlag(f => !f); // Separate render
  };
}

// Performance monitoring for renders
function PerformanceMonitor() {
  useEffect(() => {
    // Performance API to measure render time
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log(`React update: ${entry.duration}ms`);
      }
    });

    observer.observe({ entryTypes: ['measure'] });

    performance.mark('react-render-start');
    
    return () => observer.disconnect();
  }, []);
}

// Micro-batching pattern
class MicroBatcher {
  constructor() {
    this.updates = [];
    this.isScheduled = false;
  }

  schedule(update) {
    this.updates.push(update);
    
    if (!this.isScheduled) {
      this.isScheduled = true;
      
      // Use React's priority system
      flushSync(() => {
        const batch = this.updates.splice(0);
        batch.forEach(u => u());
      });
      
      this.isScheduled = false;
    }
  }
}
```

---

## Components & Hooks

### Q3: Implement custom hooks for data fetching with caching and error handling

**Answer:**

```javascript
/**
 * Advanced Hook: useFetch with caching and error handling
 */

// Cache implementation
const fetchCache = new Map();

function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cacheKey = `${url}:${JSON.stringify(options)}`;
  const cacheTimeout = options.cacheTime || 300000; // 5 minutes

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const fetchData = async () => {
      try {
        // Check cache first
        const cached = fetchCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cacheTimeout) {
          setData(cached.data);
          setLoading(false);
          return;
        }

        setLoading(true);
        const response = await fetch(url, options);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (isMounted) {
          // Cache the result
          fetchCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });

          setData(result);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setData(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [url, cacheKey, cacheTimeout]);

  return { data, loading, error };
}

// Usage
function UserProfile({ userId }) {
  const { data: user, loading, error } = useFetch(`/api/users/${userId}`, {
    cacheTime: 600000 // 10 minutes
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div>{user.name}</div>;
}
```

### Q4: Implement custom hook for managing complex form state

**Answer:**

```javascript
/**
 * Advanced Hook: useForm with validation and submission
 */

function useForm(initialValues, onSubmit, validate) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate single field
  const validateField = useCallback((name, value) => {
    if (!validate) return null;
    
    const fieldErrors = validate({ ...values, [name]: value });
    return fieldErrors[name];
  }, [values, validate]);

  // Handle field change
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setValues(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Validate on change
    const fieldError = validateField(name, newValue);
    setErrors(prev => ({
      ...prev,
      [name]: fieldError
    }));
  }, [validateField]);

  // Handle field blur
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Validate all fields
    if (validate) {
      const newErrors = validate(values);
      setErrors(newErrors);

      if (Object.keys(newErrors).length > 0) {
        return;
      }
    }

    // Mark all fields as touched
    const touchedAll = Object.keys(initialValues).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(touchedAll);

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, onSubmit, validate, initialValues]);

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue: (name, value) => {
      setValues(prev => ({ ...prev, [name]: value }));
    }
  };
}

// Usage
function LoginForm() {
  const form = useForm(
    { email: '', password: '' },
    async (values) => {
      await login(values);
    },
    (values) => {
      const errors = {};
      if (!values.email) errors.email = 'Email required';
      if (!values.password) errors.password = 'Password required';
      return errors;
    }
  );

  return (
    <form onSubmit={form.handleSubmit}>
      <input
        name="email"
        value={form.values.email}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
      />
      {form.touched.email && form.errors.email && (
        <span>{form.errors.email}</span>
      )}
      <button type="submit" disabled={form.isSubmitting}>
        Login
      </button>
    </form>
  );
}
```

---

## State Management

### Q5: Compare state management solutions and implement Redux with middleware

**Answer:**

```javascript
/**
 * State Management Comparison
 */

const stateManagementComparison = {
  useState: {
    use: 'Local component state',
    pros: ['Simple', 'Built-in', 'No setup'],
    cons: ['Prop drilling', 'No persistence', 'Limited DevTools']
  },

  useContext: {
    use: 'Moderate shared state',
    pros: ['No library needed', 'Good for theming'],
    cons: ['Can cause unnecessary re-renders', 'Not optimized for frequent updates']
  },

  Redux: {
    use: 'Complex global state',
    pros: ['Predictable', 'Time-travel debugging', 'Middleware support'],
    cons: ['Boilerplate', 'Learning curve', 'Can be overkill']
  },

  Zustand: {
    use: 'Simple to moderate state',
    pros: ['Minimal boilerplate', 'Simple API', 'Good performance'],
    cons: ['Smaller ecosystem', 'Newer library']
  },

  Jotai: {
    use: 'Atomic state management',
    pros: ['Primitive atoms', 'Flexible composition', 'Good TypeScript support'],
    cons: ['Newer', 'Different mental model']
  }
};

/**
 * Redux with Custom Middleware
 */

// Enhanced store with middleware
function createStore(reducer, initialState) {
  let state = initialState;
  let listeners = [];
  let middlewares = [];

  // Middleware chain
  const dispatch = (action) => {
    let nextAction = action;

    // Run through middleware
    for (const middleware of middlewares) {
      nextAction = middleware(nextAction);
    }

    state = reducer(state, nextAction);
    listeners.forEach(listener => listener(state));
  };

  const subscribe = (listener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  };

  const applyMiddleware = (...mws) => {
    middlewares = mws;
  };

  return {
    dispatch,
    subscribe,
    getState: () => state,
    applyMiddleware
  };
}

// Middleware examples
const loggerMiddleware = (action) => {
  console.log('Action:', action);
  return action;
};

const crashReporterMiddleware = (action) => {
  try {
    // Process action
    return action;
  } catch (err) {
    console.error('Error:', err);
    // Report to error tracking service
    reportError(err);
    throw err;
  }
};

const apiMiddleware = (action) => {
  if (action.type === 'FETCH_DATA') {
    fetch(action.url)
      .then(res => res.json())
      .then(data => {
        // Dispatch success action
      });
  }
  return action;
};

// Usage with React
const store = createStore(rootReducer, initialState);
store.applyMiddleware(loggerMiddleware, crashReporterMiddleware, apiMiddleware);

function App() {
  const [state, setState] = useState(store.getState());

  useEffect(() => {
    return store.subscribe(() => {
      setState(store.getState());
    });
  }, []);

  return (
    <div>
      <button onClick={() => store.dispatch({ type: 'INCREMENT' })}>
        Count: {state.count}
      </button>
    </div>
  );
}
```

---

## Performance Optimization

### Q6: Implement advanced memoization and code splitting strategies

**Answer:**

```javascript
/**
 * Performance Optimization Patterns
 */

// 1. Memoization with deep comparison
const useDeepMemo = (value, deps) => {
  const ref = useRef();
  const signalRef = useRef(0);

  useEffect(() => {
    // Check if value changed deeply
    if (!deepEqual(ref.current, value)) {
      ref.current = value;
      signalRef.current += 1;
    }
  }, [value]);

  return useDeepMemo(() => ref.current, [signalRef.current]);
};

// 2. Advanced useMemo with dependency tracking
const useMemoWithTracking = (factory, deps) => {
  const memoRef = useRef();
  const depsRef = useRef();

  if (!depsRef.current || !arraySame(depsRef.current, deps)) {
    memoRef.current = factory();
    depsRef.current = deps;
  }

  return memoRef.current;
};

// 3. Code splitting with lazy loading
const LazyComponent = lazy(() => import('./HighCostComponent'));

function SplitCodeExample() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}

// 4. Route-based code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

const routes = [
  { path: '/dashboard', component: Dashboard },
  { path: '/settings', component: Settings }
];

function Router() {
  const [page, setPage] = useState('dashboard');

  return (
    <Suspense fallback={<Spinner />}>
      {routes.find(r => r.path === `/${page}`)?.component}
    </Suspense>
  );
}

// 5. Prefetching for better UX
function usePrefetch(path) {
  useEffect(() => {
    const timer = setTimeout(() => {
      import(path);
    }, 2000); // Prefetch after 2 seconds idle

    return () => clearTimeout(timer);
  }, [path]);
}

// 6. String virtualization for large lists
import { FixedSizeList } from 'react-window';

function VirtualizedList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={35}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// 7. Tree shaking and bundle analysis
// In package.json:
// "sideEffects": false // Enables tree shaking
// 
// Use webpack-bundle-analyzer:
// npm install --save-dev webpack-bundle-analyzer
```

---

## Advanced Patterns

### Q7: Implement compound components and render props patterns

**Answer:**

```javascript
/**
 * Compound Component Pattern
 * Components that work together with implicit state
 */

// Dialog compound component
const DialogContext = createContext();

function Dialog({ children, isOpen, onClose }) {
  return (
    <DialogContext.Provider value={{ isOpen, onClose }}>
      {children}
    </DialogContext.Provider>
  );
}

Dialog.Trigger = function DialogTrigger({ children }) {
  const { onClose } = useContext(DialogContext);
  return (
    <button onClick={() => onClose()}>
      {children}
    </button>
  );
};

Dialog.Content = function DialogContent({ children }) {
  const { isOpen } = useContext(DialogContext);
  
  if (!isOpen) return null;
  
  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        {children}
      </div>
    </div>
  );
};

Dialog.Header = function DialogHeader({ children }) {
  return <div className="dialog-header">{children}</div>;
};

Dialog.Body = function DialogBody({ children }) {
  return <div className="dialog-body">{children}</div>;
};

Dialog.Footer = function DialogFooter({ children }) {
  return <div className="dialog-footer">{children}</div>;
};

// Usage
function MyApp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <Dialog.Trigger>Open Dialog</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>Title</Dialog.Header>
        <Dialog.Body>Content</Dialog.Body>
        <Dialog.Footer>Footer</Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

/**
 * Render Props Pattern
 */

class RenderPropsComponent extends React.Component {
  state = { count: 0 };

  render() {
    return this.props.children({
      count: this.state.count,
      increment: () => this.setState(s => ({ count: s.count + 1 }))
    });
  }
}

// Usage
function App() {
  return (
    <RenderPropsComponent>
      {({ count, increment }) => (
        <button onClick={increment}>
          Count: {count}
        </button>
      )}
    </RenderPropsComponent>
  );
}
```

---

## Server-Side Rendering

### Q8: Implement SSR with hydration and implement streaming SSR

**Answer:**

```javascript
/**
 * Server-Side Rendering (SSR) with Node.js
 */

import express from 'express';
import React from 'react';
import { renderToString, renderToStaticMarkup } from 'react-dom/server';

// Server setup
const app = express();

// Streaming SSR with React 18
app.get('/', async (req, res) => {
  const { renderToPipeableStream } = require('react-dom/server');

  let didError = false;

  const { pipe } = renderToPipeableStream(
    <App />,
    {
      onShellReady() {
        // The content above all Suspense components is now ready
        // If there's an error before we start streaming, we can show an error page
        res.statusCode = didError ? 500 : 200;
        res.setHeader('Content-type', 'text/html');
        
        // Send HTML shell
        pipe(res);
      },
      onShellError(error) {
        // Something errored before we could start streaming
        res.statusCode = 500;
        res.send('<!doctype html><p>Error loading page</p>');
      },
      onError(error) {
        didError = true;
        console.error(error);
      }
    }
  );

  res.on('drain', () => {
    // If the pipe backs up, resume
  });
});

// HTML template for hydration
function htmlTemplate(content, initialData) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>My App</title>
      </head>
      <body>
        <div id="root">${content}</div>
        <script>
          window.__INITIAL_STATE__ = ${JSON.stringify(initialData)};
        </script>
        <script src="/js/app.js"></script>
      </body>
    </html>
  `;
}

// Server-side data fetching
async function getInitialData(path) {
  try {
    const data = await fetchDataForPath(path);
    return data;
  } catch (error) {
    return null;
  }
}

// Client-side hydration
import { hydrateRoot } from 'react-dom/client';

const root = hydrateRoot(
  document.getElementById('root'),
  <App initialState={window.__INITIAL_STATE__} />
);

// Handling hydration mismatches
function useHydrationMismatch() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

// Use it to prevent hydration warnings
function Component() {
  const isHydrated = useHydrationMismatch();

  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  return <ActualComponent />;
}
```

---

## Real-World Production Patterns

### Q9: How do you handle error boundaries and error recovery?

**Answer:**

```javascript
/**
 * Advanced Error Boundary
 */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log to error reporting service
    logErrorToService(error, errorInfo, {
      componentStack: errorInfo.componentStack,
      timestamp: new Date(),
      userId: getCurrentUserId()
    });

    // Check error threshold
    if (this.state.errorCount > 3) {
      // Too many errors, redirect to error page
      window.location.href = '/error';
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

// Granular error boundaries
function Page() {
  return (
    <div>
      <ErrorBoundary>
        <Header />
      </ErrorBoundary>
      
      <ErrorBoundary>
        <Sidebar />
      </ErrorBoundary>
      
      <ErrorBoundary>
        <MainContent />
      </ErrorBoundary>
    </div>
  );
}

// Hook for error handling
function useErrorHandler() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (event) => {
      setError(event.error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return error;
}
```

---

## Summary

**Key Takeaways for Senior React Developers:**

1. **Fiber Architecture** - Understand React's internal rendering engine
2. **Batching** - Automatic in React 18, critical for performance
3. **Custom Hooks** - Data fetching, forms, complex state logic
4. **State Management** - Choose right tool (useState, Context, Redux, Zustand)
5. **Performance** - Memoization, code splitting, virtualization
6. **Advanced Patterns** - Compound components, render props
7. **SSR** - Server rendering with hydration and streaming
8. **Error Handling** - Error boundaries, granular error control
9. **TypeScript Integration** - Type-safe components and hooks
10. **Testing** - Unit tests, integration tests, E2E tests
11. **Accessibility** - ARIA attributes, keyboard navigation
12. **Web Vitals** - LCP, FID, CLS optimization
