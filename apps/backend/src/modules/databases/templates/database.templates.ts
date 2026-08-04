import { DatabasePropertyType, DatabaseTemplate, DatabaseViewType } from '@company-brain/db';
import type {
  DatabasePropertyDefinition,
  DatabaseTemplateDefinition,
  DatabaseViewDefinition,
} from '../types/database.types';

const titleProperty: DatabasePropertyDefinition = {
  key: 'title',
  label: 'Title',
  options: null,
  required: true,
  type: DatabasePropertyType.TITLE,
};

const tableView = (name: string): DatabaseViewDefinition => ({
  configuration: { columns: [] },
  isDefault: true,
  name,
  type: DatabaseViewType.TABLE,
});

const boardView = (name: string): DatabaseViewDefinition => ({
  configuration: { groupBy: 'status' },
  isDefault: false,
  name,
  type: DatabaseViewType.BOARD,
});

const taskTemplate: DatabaseTemplateDefinition = {
  name: 'Tasks',
  properties: [
    titleProperty,
    {
      key: 'status',
      label: 'Status',
      type: DatabasePropertyType.SELECT,
      required: true,
      options: ['todo', 'in_progress', 'done'],
    },
    { key: 'assignee', label: 'Assignee', type: DatabasePropertyType.PERSON, required: false, options: null },
    {
      key: 'priority',
      label: 'Priority',
      type: DatabasePropertyType.SELECT,
      required: false,
      options: ['low', 'medium', 'high'],
    },
    { key: 'dueDate', label: 'Due date', type: DatabasePropertyType.DATE, required: false, options: null },
    { key: 'description', label: 'Description', type: DatabasePropertyType.RICH_TEXT, required: false, options: null },
  ],
  views: [tableView('Table'), boardView('Board')],
};

const projectTemplate: DatabaseTemplateDefinition = {
  name: 'Projects',
  properties: [
    titleProperty,
    {
      key: 'status',
      label: 'Status',
      type: DatabasePropertyType.SELECT,
      required: true,
      options: ['planned', 'active', 'done'],
    },
    { key: 'owner', label: 'Owner', type: DatabasePropertyType.PERSON, required: false, options: null },
    { key: 'startDate', label: 'Start date', type: DatabasePropertyType.DATE, required: false, options: null },
    { key: 'endDate', label: 'End date', type: DatabasePropertyType.DATE, required: false, options: null },
    {
      key: 'team',
      label: 'Team',
      type: DatabasePropertyType.MULTI_SELECT,
      required: false,
      options: ['engineering', 'design', 'operations'],
    },
    { key: 'description', label: 'Description', type: DatabasePropertyType.RICH_TEXT, required: false, options: null },
  ],
  views: [tableView('Table'), boardView('Board')],
};

export const getDatabaseTemplate = (template: DatabaseTemplate): DatabaseTemplateDefinition => {
  if (template === DatabaseTemplate.TASKS) return taskTemplate;
  if (template === DatabaseTemplate.PROJECTS) return projectTemplate;
  return {
    name: 'Database',
    properties: [titleProperty],
    views: [tableView('Table')],
  };
};
