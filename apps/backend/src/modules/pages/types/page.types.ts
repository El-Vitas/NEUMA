import type { PageLifecycle } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import type { UserRole } from '@company-brain/shared';
import type { SchemaPropertyValues } from '../../../common/domain/schema.domain.types';
import type { PageParentReference } from '../domain/page.domain.types';

export interface CreatePageInput {
  readonly content: Prisma.InputJsonValue;
  readonly createdById: string;
  readonly parentId: null | string;
  readonly propertyValues: SchemaPropertyValues | null;
  readonly role: UserRole;
  readonly spaceId: string;
  readonly title: string;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface UpdatePageInput {
  readonly content: Prisma.InputJsonValue;
  readonly pageId: string;
  readonly propertyValues: SchemaPropertyValues | null;
  readonly role: UserRole;
  readonly title: string;
  readonly updatedById: string;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface PageSummary {
  readonly content: Prisma.JsonValue;
  readonly id: string;
  readonly lifecycle: PageLifecycle;
  readonly order: number;
  readonly parentId: null | string;
  readonly propertyValues: SchemaPropertyValues | null;
  readonly spaceId: string;
  readonly title: string;
  readonly version: number;
}

export interface PageMoveContext {
  readonly pageId: string;
  readonly pages: readonly PageParentReference[];
  readonly propertyValues: SchemaPropertyValues | null;
  readonly title: string;
}

export interface PageListOptions {
  readonly includeTrashed: boolean;
}

export interface PageRepositoryContract {
  readonly create: (input: CreatePageInput) => Promise<PageSummary | null>;
  readonly findReadablePageIds: (
    pageIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<readonly string[]>;
  readonly getAccessible: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<PageSummary | null>;
  readonly findMoveContext: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<PageMoveContext | null>;
  readonly move: (
    pageId: string,
    parentId: null | string,
    userId: string,
    workspaceId: string,
    role: UserRole,
    mutationId: string,
  ) => Promise<PageSummary | null>;
  readonly parentBelongsToSpace: (parentId: string, spaceId: string) => Promise<boolean>;
  readonly listAccessible: (
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    includeTrashed: boolean,
  ) => Promise<readonly PageSummary[]>;
  readonly setLifecycle: (
    pageId: string,
    lifecycle: PageLifecycle,
    userId: string,
    workspaceId: string,
    role: UserRole,
    mutationId: string,
  ) => Promise<boolean>;
  readonly update: (input: UpdatePageInput) => Promise<PageSummary | null>;
}
