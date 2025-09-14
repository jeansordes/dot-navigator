import { parsePath, constructNewPath } from '../src/utils/PathUtils';
import { createMockApp, createMockFolder } from './setup';

describe('PathUtils', () => {
    describe('parsePath', () => {
        it('should parse directory-based paths correctly', () => {
            const result = parsePath('Notes/test.md', '.md');
            expect(result).toEqual({
                directory: 'Notes',
                name: 'test'
            });
        });

        it('should parse hierarchical dot notation paths correctly', () => {
            const result = parsePath('journal.2025.weeks.37.test.md', '.md');
            expect(result).toEqual({
                directory: 'journal.2025.weeks.37',
                name: 'test'
            });
        });

        it('should parse mixed directory and hierarchical paths correctly', () => {
            const result = parsePath('Notes/journal.2025.weeks.37.test.md', '.md');
            expect(result).toEqual({
                directory: 'Notes/journal.2025.weeks.37',
                name: 'test'
            });
        });

        it('should handle single dot in filename as regular name', () => {
            const result = parsePath('Notes/simple.test.md', '.md');
            expect(result).toEqual({
                directory: 'Notes',
                name: 'simple.test'
            });
        });

        it('should handle paths without directories', () => {
            const result = parsePath('simple.test.md', '.md');
            expect(result).toEqual({
                directory: 'simple',
                name: 'test'
            });
        });

        it('should handle paths without extensions', () => {
            const result = parsePath('Notes/journal.2025.weeks.37.test', '');
            expect(result).toEqual({
                directory: 'Notes/journal.2025.weeks.37',
                name: 'test'
            });
        });

        it('should handle plain names without dots', () => {
            const result = parsePath('Notes/simple', '');
            expect(result).toEqual({
                directory: 'Notes',
                name: 'simple'
            });
        });

        it('should handle root level files', () => {
            const result = parsePath('test.md', '.md');
            expect(result).toEqual({
                directory: '',
                name: 'test'
            });
        });
    });

    describe('constructNewPath', () => {
        const mockApp = createMockApp();

        it('should construct directory-based paths with slash separator when folder exists', () => {
            // Mock that 'Notes' folder exists
            jest.spyOn(mockApp.vault, 'getAbstractFileByPath').mockReturnValue(createMockFolder('Notes'));
            const result = constructNewPath('Notes', 'test', '.md', 'Notes/old.md', mockApp);
            expect(result).toBe('Notes/test.md');
        });

        it('should construct hierarchical paths with dot separator when folder does not exist', () => {
            // Mock that 'journal.2025' folder does not exist
            jest.spyOn(mockApp.vault, 'getAbstractFileByPath').mockReturnValue(null);
            const result = constructNewPath('journal.2025', 'test', '.md', 'journal.2025.old.md', mockApp);
            expect(result).toBe('journal.2025.test.md');
        });

        it('should handle empty path values', () => {
            const result = constructNewPath('', 'test', '.md', 'old.md', mockApp);
            expect(result).toBe('test.md');
        });

        it('should handle trailing slash as directory indicator', () => {
            // Even if folder doesn't exist, trailing slash forces directory separator
            jest.spyOn(mockApp.vault, 'getAbstractFileByPath').mockReturnValue(null);
            const result = constructNewPath('Notes/', 'test', '.md', 'Notes/old.md', mockApp);
            expect(result).toBe('Notes/test.md');
        });
    });
});
