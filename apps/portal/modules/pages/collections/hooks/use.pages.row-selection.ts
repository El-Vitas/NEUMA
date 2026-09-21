'use client';

import { useContext } from 'react';
import { PAGE_ROW_SELECTION_CONTEXT } from '../constants/pages.row-context.constants';
import type { PagesRowSelection } from '../types/pages.row-selection.types';

/**
 * La selección que se esté llevando alrededor, o ninguna.
 *
 * Devuelve nada donde no hay nadie ofreciéndola —una tabla incrustada en otra
 * página, por ejemplo— para que quien la use pueda no dibujar sus casillas en
 * vez de reventar.
 */
export const usePagesRowSelection = (): null | PagesRowSelection => useContext(PAGE_ROW_SELECTION_CONTEXT);
