import { test, expect } from '@playwright/test';

// Page object model for document management
class DocumentPage {
  constructor(page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder('Search documents...');
    this.createButton = page.getByRole('button', { name: 'Create Document' });
    this.titleInput = page.getByLabel('Document Title');
    this.contentEditor = page.getByLabel('Document Content');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.documentList = page.getByTestId('document-list');
  }

  async searchDocuments(query) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  async createDocument(title, content) {
    await this.createButton.click();
    await this.titleInput.fill(title);
    await this.contentEditor.fill(content);
    await this.saveButton.click();
  }

  async getDocumentCount() {
    const documents = await this.documentList.locator('[data-testid="document-card"]').count();
    return documents;
  }
}

test.describe('Document Management E2E', () => {
  let documentPage;

  test.beforeEach(async ({ page }) => {
    documentPage = new DocumentPage(page);
    
    // Login first
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Navigate to documents page
    await page.goto('/documents');
    await expect(page).toHaveTitle(/Documents/);
  });

  test.describe('Document Creation', () => {
    test('creates a new document successfully', async ({ page }) => {
      const title = 'E2E Test Document';
      const content = '# Test Document\n\nThis is a test document created during E2E testing.';

      await documentPage.createDocument(title, content);

      // Verify document was created
      await expect(page.getByText(title)).toBeVisible();
      await expect(page.getByText('Document created successfully')).toBeVisible();
    });

    test('validates required fields', async ({ page }) => {
      await documentPage.createButton.click();
      await documentPage.saveButton.click();

      // Should show validation errors
      await expect(page.getByText('Title is required')).toBeVisible();
      await expect(page.getByText('Content is required')).toBeVisible();
    });

    test('auto-saves draft while typing', async ({ page }) => {
      const title = 'Auto-save Test';
      
      await documentPage.createButton.click();
      await documentPage.titleInput.fill(title);
      
      // Wait for auto-save indicator
      await expect(page.getByText('Draft saved')).toBeVisible({ timeout: 3000 });
    });

    test('supports markdown preview', async ({ page }) => {
      const markdownContent = '# Heading\n\n**Bold text** and *italic text*';
      
      await documentPage.createButton.click();
      await documentPage.titleInput.fill('Markdown Test');
      await documentPage.contentEditor.fill(markdownContent);
      
      // Switch to preview mode
      await page.getByRole('button', { name: 'Preview' }).click();
      
      // Check rendered markdown
      await expect(page.locator('h1')).toContainText('Heading');
      await expect(page.locator('strong')).toContainText('Bold text');
      await expect(page.locator('em')).toContainText('italic text');
    });
  });

  test.describe('Document Search and Filtering', () => {
    test('searches documents by title', async ({ page }) => {
      const searchTerm = 'Test Document';
      
      await documentPage.searchDocuments(searchTerm);
      
      // Wait for search results
      await page.waitForLoadState('networkidle');
      
      // Verify search results contain the term
      const documentCards = page.locator('[data-testid="document-card"]');
      await expect(documentCards.first()).toContainText(searchTerm);
    });

    test('filters documents by tags', async ({ page }) => {
      // Click on a tag filter
      await page.getByTestId('tag-filter-test').click();
      
      // Verify filtered results
      const documentCards = page.locator('[data-testid="document-card"]');
      const count = await documentCards.count();
      
      for (let i = 0; i < count; i++) {
        await expect(documentCards.nth(i)).toContainText('test');
      }
    });

    test('sorts documents by different criteria', async ({ page }) => {
      // Test sorting by date
      await page.getByLabel('Sort by').selectOption('createdAt');
      await page.getByLabel('Sort order').selectOption('desc');
      
      await page.waitForLoadState('networkidle');
      
      // Verify documents are sorted by creation date (newest first)
      const firstDocument = page.locator('[data-testid="document-card"]').first();
      const lastDocument = page.locator('[data-testid="document-card"]').last();
      
      const firstDate = await firstDocument.getAttribute('data-created-at');
      const lastDate = await lastDocument.getAttribute('data-created-at');
      
      expect(new Date(firstDate)).toBeGreaterThanOrEqual(new Date(lastDate));
    });

    test('handles empty search results gracefully', async ({ page }) => {
      await documentPage.searchDocuments('nonexistentsearchterm12345');
      
      await expect(page.getByText('No documents found')).toBeVisible();
      await expect(page.getByText('Try adjusting your search terms')).toBeVisible();
    });
  });

  test.describe('Document Editing', () => {
    test('edits existing document', async ({ page }) => {
      // Click on first document
      await page.locator('[data-testid="document-card"]').first().click();
      
      // Click edit button
      await page.getByRole('button', { name: 'Edit' }).click();
      
      // Modify title and content
      const newTitle = 'Updated Document Title';
      await documentPage.titleInput.fill(newTitle);
      await documentPage.saveButton.click();
      
      // Verify changes were saved
      await expect(page.getByText(newTitle)).toBeVisible();
      await expect(page.getByText('Document updated successfully')).toBeVisible();
    });

    test('shows version history', async ({ page }) => {
      // Click on document
      await page.locator('[data-testid="document-card"]').first().click();
      
      // Click version history button
      await page.getByRole('button', { name: 'Version History' }).click();
      
      // Verify version history modal opens
      await expect(page.getByText('Version History')).toBeVisible();
      await expect(page.locator('[data-testid="version-item"]')).toHaveCount.toBeGreaterThan(0);
    });

    test('reverts to previous version', async ({ page }) => {
      // Open version history
      await page.locator('[data-testid="document-card"]').first().click();
      await page.getByRole('button', { name: 'Version History' }).click();
      
      // Click revert on second version
      await page.locator('[data-testid="version-item"]').nth(1).getByRole('button', { name: 'Revert' }).click();
      
      // Confirm revert
      await page.getByRole('button', { name: 'Confirm Revert' }).click();
      
      // Verify document was reverted
      await expect(page.getByText('Document reverted to previous version')).toBeVisible();
    });
  });

  test.describe('Collaborative Features', () => {
    test('shows real-time collaboration indicators', async ({ page }) => {
      // Open document for editing
      await page.locator('[data-testid="document-card"]').first().click();
      await page.getByRole('button', { name: 'Edit' }).click();
      
      // Verify collaboration status is shown
      await expect(page.getByTestId('collaboration-status')).toBeVisible();
      await expect(page.getByText('You are the only editor')).toBeVisible();
    });

    test('handles concurrent editing gracefully', async ({ page, context }) => {
      // Open document in first tab
      await page.locator('[data-testid="document-card"]').first().click();
      await page.getByRole('button', { name: 'Edit' }).click();
      
      // Open same document in second tab
      const secondPage = await context.newPage();
      await secondPage.goto('/documents');
      await secondPage.locator('[data-testid="document-card"]').first().click();
      await secondPage.getByRole('button', { name: 'Edit' }).click();
      
      // Make changes in both tabs
      await page.getByLabel('Document Content').fill('Changes from first tab');
      await secondPage.getByLabel('Document Content').fill('Changes from second tab');
      
      // Save first tab
      await page.getByRole('button', { name: 'Save' }).click();
      
      // Try to save second tab - should show conflict
      await secondPage.getByRole('button', { name: 'Save' }).click();
      await expect(secondPage.getByText('Conflict detected')).toBeVisible();
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('loads documents efficiently', async ({ page }) => {
      const startTime = Date.now();
      
      // Navigate to documents page
      await page.goto('/documents');
      
      // Wait for documents to load
      await expect(documentPage.documentList).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('is keyboard accessible', async ({ page }) => {
      // Tab through the interface
      await page.keyboard.press('Tab'); // Focus search
      await expect(documentPage.searchInput).toBeFocused();
      
      await page.keyboard.press('Tab'); // Focus create button
      await expect(documentPage.createButton).toBeFocused();
      
      // Test keyboard shortcuts
      await page.keyboard.press('Control+k'); // Search shortcut
      await expect(documentPage.searchInput).toBeFocused();
    });

    test('works with screen readers', async ({ page }) => {
      // Check ARIA labels and roles
      await expect(documentPage.searchInput).toHaveAttribute('aria-label', 'Search documents');
      await expect(documentPage.documentList).toHaveAttribute('role', 'list');
      
      // Check heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      await expect(headings).toHaveCount.toBeGreaterThan(0);
    });

    test('handles offline scenarios', async ({ page, context }) => {
      // Go offline
      await context.setOffline(true);
      
      // Try to create document
      await documentPage.createButton.click();
      await documentPage.titleInput.fill('Offline Test');
      await documentPage.saveButton.click();
      
      // Should show offline message
      await expect(page.getByText('You are currently offline')).toBeVisible();
      await expect(page.getByText('Changes will be saved when connection is restored')).toBeVisible();
      
      // Go back online
      await context.setOffline(false);
      
      // Changes should sync
      await expect(page.getByText('Changes synced successfully')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('works on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify mobile layout
      await expect(page.getByTestId('mobile-menu-button')).toBeVisible();
      
      // Test mobile navigation
      await page.getByTestId('mobile-menu-button').click();
      await expect(page.getByTestId('mobile-menu')).toBeVisible();
    });

    test('touch interactions work correctly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test swipe to delete
      const documentCard = page.locator('[data-testid="document-card"]').first();
      
      // Simulate swipe gesture
      await documentCard.hover();
      await page.mouse.down();
      await page.mouse.move(-100, 0);
      await page.mouse.up();
      
      // Delete action should be visible
      await expect(page.getByTestId('swipe-delete-action')).toBeVisible();
    });
  });
});