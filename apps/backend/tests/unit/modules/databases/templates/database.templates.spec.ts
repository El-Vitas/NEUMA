import { describe, expect, it } from 'bun:test';
import { DatabaseTemplate } from '@company-brain/db';
import { getDatabaseTemplate } from '@/modules/databases/templates/database.templates';

describe('database templates', () => {
  it('defines deterministic Tasks properties and a board view', () => {
    const template = getDatabaseTemplate(DatabaseTemplate.TASKS);

    expect(template.properties.map((property) => property.key)).toEqual([
      'title',
      'status',
      'assignee',
      'priority',
      'dueDate',
      'description',
    ]);
    expect(template.views.map((view) => view.type)).toEqual(['TABLE', 'BOARD']);
  });

  it('defines Projects independently from Tasks', () => {
    const template = getDatabaseTemplate(DatabaseTemplate.PROJECTS);

    expect(template.properties.map((property) => property.key)).toEqual([
      'title',
      'status',
      'owner',
      'startDate',
      'endDate',
      'team',
      'description',
    ]);
  });
});
