import { afterEach, describe, expect, it } from 'bun:test';
import { DARK_THEME_CLASS, THEME_ROOT_ATTRIBUTE } from '@/shared/constants/theme.constants';
import { watchTheDiagramGround } from '@/shared/lib/diagram.ground.lib';

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const createGround = (): HTMLElement => {
  const ground = document.createElement('div');
  ground.setAttribute(THEME_ROOT_ATTRIBUTE, 'true');
  document.body.append(ground);
  return ground;
};

describe('watchTheDiagramGround', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('says so when the page goes from day to night and back', async () => {
    const ground = createGround();
    let changes = 0;
    watchTheDiagramGround(() => {
      changes += 1;
    });

    ground.classList.add(DARK_THEME_CLASS);
    await settle();
    ground.classList.remove(DARK_THEME_CLASS);
    await settle();

    expect(changes).toBe(2);
  });

  /** La raíz del tema lleva otras clases: redibujar cada diagrama por ellas sería dibujarlos todos de nuevo para nada. */
  it('says nothing when the root changes a class that is not day or night', async () => {
    const ground = createGround();
    let changes = 0;
    watchTheDiagramGround(() => {
      changes += 1;
    });

    ground.classList.add('text-foreground');
    await settle();

    expect(changes).toBe(0);
  });

  it('stops saying anything once it is let go', async () => {
    const ground = createGround();
    let changes = 0;
    const stop = watchTheDiagramGround(() => {
      changes += 1;
    });

    stop();
    ground.classList.add(DARK_THEME_CLASS);
    await settle();

    expect(changes).toBe(0);
  });
});
