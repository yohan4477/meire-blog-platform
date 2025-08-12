// Jest setup file
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock Next.js image component
jest.mock('next/image', () => {
  const MockedImage = (props) => {
    const { src, alt, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} {...rest} />;
  };
  MockedImage.displayName = 'MockedImage';
  return MockedImage;
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  disconnect: jest.fn(),
  observe: jest.fn(),
  unobserve: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  disconnect: jest.fn(),
  observe: jest.fn(),
  unobserve: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Mock Next.js server components for testing
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((input, init = {}) => ({
    url: input,
    method: init.method || 'GET',
    headers: new Map(Object.entries(init.headers || {})),
    json: jest.fn().mockImplementation(() => {
      try {
        return Promise.resolve(JSON.parse(init.body || '{}'));
      } catch (e) {
        return Promise.reject(new SyntaxError('Invalid JSON'));
      }
    }),
    text: jest.fn().mockResolvedValue(init.body || ''),
    nextUrl: {
      searchParams: new URLSearchParams(),
    },
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, init = {}) => ({
      json: () => Promise.resolve(data),
      status: init.status || 200,
      headers: {
        get: jest.fn().mockImplementation((name) => {
          const headers = init.headers || {};
          return headers[name] || (name === 'Content-Type' ? 'application/json' : undefined);
        }),
        set: jest.fn(),
      },
    })),
  },
}));

// Custom render function for components that use providers
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const renderWithProviders = (ui, options = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const AllProviders = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return render(ui, { wrapper: AllProviders, ...options });
};