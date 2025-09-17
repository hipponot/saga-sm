import { injectable } from 'inversify';

export interface IExampleHelper {
  generateId(): string;
  formatTitle(title: string): string;
  calculatePriority(tags: string[]): 'low' | 'medium' | 'high';
  validateStatus(status: string): boolean;
}

@injectable()
export class ExampleHelper implements IExampleHelper {
  generateId(): string {
    return `example-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  formatTitle(title: string): string {
    return title
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  calculatePriority(tags: string[]): 'low' | 'medium' | 'high' {
    if (tags.includes('urgent') || tags.includes('critical')) {
      return 'high';
    }
    if (tags.includes('important') || tags.includes('feature')) {
      return 'medium';
    }
    return 'low';
  }

  validateStatus(status: string): boolean {
    const validStatuses = ['draft', 'active', 'completed', 'archived'];
    return validStatuses.includes(status);
  }
}
