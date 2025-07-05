import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { SearchBar } from './SearchBar';

// Mock the search functionality
const mockOnSearch = vi.fn();
const mockOnClear = vi.fn();

describe('SearchBar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(
      <SearchBar 
        placeholder="Search documents..." 
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search documents...');
    expect(searchInput).toBeInTheDocument();
  });

  it('calls onSearch when typing in input', async () => {
    const { user } = render(
      <SearchBar 
        placeholder="Search documents..." 
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search documents...');
    
    await user.type(searchInput, 'test query');
    
    // Wait for debounced search
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test query');
    }, { timeout: 600 }); // Account for debounce delay
  });

  it('calls onClear when clear button is clicked', async () => {
    const { user } = render(
      <SearchBar 
        placeholder="Search documents..." 
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        value="existing query"
      />
    );

    const clearButton = screen.getByRole('button', { name: /clear/i });
    
    await user.click(clearButton);
    
    expect(mockOnClear).toHaveBeenCalled();
  });

  it('handles keyboard shortcuts', async () => {
    const { user } = render(
      <SearchBar 
        placeholder="Search documents..." 
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search documents...');
    
    // Test Escape key to clear
    await user.type(searchInput, 'test query');
    await user.keyboard('{Escape}');
    
    expect(mockOnClear).toHaveBeenCalled();
  });

  it('shows loading state during search', () => {
    render(
      <SearchBar 
        placeholder="Search documents..." 
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        isLoading={true}
      />
    );

    const loadingIndicator = screen.getByTestId('search-loading');
    expect(loadingIndicator).toBeInTheDocument();
  });

  it('is accessible via keyboard navigation', async () => {
    const { user } = render(
      <SearchBar 
        placeholder="Search documents..." 
        onSearch={mockOnSearch}
        onClear={mockOnClear}
      />
    );

    // Tab to search input
    await user.tab();
    
    const searchInput = screen.getByPlaceholderText('Search documents...');
    expect(searchInput).toHaveFocus();
  });

  it('maintains proper ARIA attributes', () => {
    render(
      <SearchBar 
        placeholder="Search documents..." 
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        'aria-label'="Document search"
      />
    );

    const searchInput = screen.getByLabelText('Document search');
    expect(searchInput).toHaveAttribute('aria-label', 'Document search');
    expect(searchInput).toHaveAttribute('role', 'searchbox');
  });

  describe('Performance', () => {
    it('debounces search calls to avoid excessive API calls', async () => {
      const { user } = render(
        <SearchBar 
          placeholder="Search documents..." 
          onSearch={mockOnSearch}
          onClear={mockOnClear}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search documents...');
      
      // Type multiple characters quickly
      await user.type(searchInput, 'quick typing test');
      
      // Should only call onSearch once after debounce period
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledTimes(1);
        expect(mockOnSearch).toHaveBeenLastCalledWith('quick typing test');
      }, { timeout: 600 });
    });
  });

  describe('Error Handling', () => {
    it('handles search errors gracefully', async () => {
      const mockOnSearchWithError = vi.fn().mockRejectedValue(new Error('Search failed'));
      
      const { user } = render(
        <SearchBar 
          placeholder="Search documents..." 
          onSearch={mockOnSearchWithError}
          onClear={mockOnClear}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search documents...');
      
      await user.type(searchInput, 'test query');
      
      // Component should handle error without crashing
      await waitFor(() => {
        expect(mockOnSearchWithError).toHaveBeenCalled();
      });
      
      // Check that component is still functional
      expect(searchInput).toBeInTheDocument();
    });
  });
});