import { SPACE_HOME_ACTIVITY_LIMIT, SPACE_HOME_MAIN_PAGES_LIMIT } from '../constants/spaces.home.constants';
import type { SpaceHomeActivity, SpaceHomePage } from '../types/spaces.home.types';

export const selectSpaceHomeMainPages = (pages: readonly SpaceHomePage[]): readonly SpaceHomePage[] =>
  pages.slice(0, SPACE_HOME_MAIN_PAGES_LIMIT);

export const selectSpaceHomeActivity = (activity: readonly SpaceHomeActivity[]): readonly SpaceHomeActivity[] =>
  [...activity]
    .toSorted((first, second) => second.editedAt.getTime() - first.editedAt.getTime())
    .slice(0, SPACE_HOME_ACTIVITY_LIMIT);
