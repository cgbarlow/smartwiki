import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import userEvent from '@testing-library/user-event';

// Custom render function that includes providers
interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const user = userEvent.setup();
  
  return {
    user,
    ...render(ui, { wrapper: AllTheProviders, ...options }),
  };
};

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user' as const,
  avatar: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockDocument = (overrides = {}) => ({
  id: '1',
  title: 'Test Document',
  content: '# Test Document\n\nThis is a test document.',
  excerpt: 'This is a test document.',
  tags: ['test', 'mock'],
  category: 'general',
  isPublic: true,
  authorId: '1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  viewCount: 0,
  version: 1,
  ...overrides,
});

export const createMockTenant = (overrides = {}) => ({
  id: '1',
  name: 'Test Organization',
  slug: 'test-org',
  domain: 'test.smartwiki.com',
  settings: {
    theme: 'light',
    features: {
      ai: true,
      collaboration: true,
      analytics: true,
    },
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Mock API responses
export const mockApiResponse = <T>(data: T, delay = 0) => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export const mockApiError = (message = 'API Error', status = 500, delay = 0) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error(message);
      (error as any).status = status;
      reject(error);
    }, delay);
  });
};

// Component testing helpers
export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

export const expectElementToBeVisible = (element: HTMLElement) => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
};

export const expectElementToHaveAccessibleName = (
  element: HTMLElement,
  name: string
) => {
  expect(element).toHaveAccessibleName(name);
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
export { userEvent };