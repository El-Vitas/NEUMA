import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { announceToOthers, createClient, flush, serverContent, settle } from '../block-sync.engine-harness';
import { FakeBlockServer } from '../block-sync.fake-server';
import { documentOf, heading, paragraph, text } from '../block-sync.fixtures';

const first = paragraph('p1', text('Hello'));
const second = paragraph('p2', text('World'));
const added = paragraph('p3', text('Bloque nuevo desde A'));

const base = documentOf(first, second);
const withAdded = documentOf(first, second, added);

const commandsOf = (server: FakeBlockServer, index: number): readonly string[] =>
  server.receivedTransactions.at(index)?.operations.map((operation) => operation.command) ?? [];

describe('a block that was deleted and comes back', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const startWithADeletedBlock = async () => {
    const server = new FakeBlockServer(base);
    const writer = createClient(server, base, 'user-1');
    const reader = createClient(server, base, 'user-2');
    writer.session.connect();
    reader.session.connect();
    await flush();
    writer.edit(withAdded);
    await settle();
    await announceToOthers(server, [reader]);
    writer.edit(base);
    await settle();
    await announceToOthers(server, [reader]);
    return { reader, server, writer };
  };

  it('is brought back with an update of the block it was, never created a second time', async () => {
    const { server, writer } = await startWithADeletedBlock();
    expect(server.blocks.get('p3')?.alive).toBe(false);
    const sentBefore = server.receivedTransactions.length;

    writer.edit(withAdded);
    await settle();

    expect(server.receivedTransactions.length).toBe(sentBefore + 1);
    expect(commandsOf(server, -1)).not.toContain('set');
    expect(commandsOf(server, -1)).toContain('update');
    expect(server.blocks.get('p3')?.alive).toBe(true);
    expect(server.readChildren('page-1')).toEqual(['p1', 'p2', 'p3']);
    expect(writer.saveStates.at(-1)).toBe('saved');
    expect(serverContent(server)).toEqual(writer.content);
  });

  it('keeps the text it had when it was deleted', async () => {
    const { server, writer } = await startWithADeletedBlock();

    writer.edit(withAdded);
    await settle();

    expect(server.readText('p3', 'title')).toBe('Bloque nuevo desde A');
  });

  it('shows up in the other tab', async () => {
    const { reader, server, writer } = await startWithADeletedBlock();

    writer.edit(withAdded);
    await settle();
    await announceToOthers(server, [reader]);

    expect(reader.content).toEqual(writer.content);
    expect(JSON.stringify(reader.content)).toContain('Bloque nuevo desde A');
  });

  it('keeps the blocks written next to it where they were written', async () => {
    const { reader, server, writer } = await startWithADeletedBlock();
    writer.edit(withAdded);
    await settle();

    const next = documentOf(
      first,
      paragraph('m1', text('Between')),
      second,
      added,
      heading('h1', 2, 'A heading'),
      paragraph('n1', text('Pasted one')),
      paragraph('n2', text('Pasted two')),
    );
    writer.edit(next);
    await settle();
    await announceToOthers(server, [reader]);

    expect(server.readChildren('page-1')).toEqual(['p1', 'm1', 'p2', 'p3', 'h1', 'n1', 'n2']);
    expect(reader.content).toEqual(writer.content);
    expect(serverContent(server)).toEqual(writer.content);
  });
});

describe('what the save state says when the server does not do what was asked', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('says it failed, not saved, while the server keeps refusing', async () => {
    const server = new FakeBlockServer(base);
    const writer = createClient(server, base);
    writer.session.connect();
    await flush();
    for (let refusal = 0; refusal < 8; refusal += 1) server.failNextTransaction('BLOCK_ALREADY_EXISTS');

    writer.edit(documentOf(first, paragraph('p2', text('World!'))));
    await settle();
    await flush();
    await settle();

    expect(writer.saveStates).toContain('failed');
    expect(writer.saveStates.at(-1)).toBe('failed');
  });

  it('says it failed when a transaction is refused, and saved only once the rebuilt one went through', async () => {
    const server = new FakeBlockServer(base);
    const writer = createClient(server, base);
    writer.session.connect();
    await flush();
    server.failNextTransaction('BLOCK_TREE_INVALID');

    writer.edit(documentOf(first, paragraph('p2', text('World!'))));
    await settle();
    await flush();
    await settle();

    const states = writer.saveStates;
    expect(states).toContain('failed');
    expect(states.indexOf('failed')).toBeLessThan(states.lastIndexOf('saved'));
    expect(states.at(-1)).toBe('saved');
    expect(server.readText('p2', 'title')).toBe('World!');
  });

  it('notices a block the server put somewhere else than asked, and puts it right', async () => {
    const server = new FakeBlockServer(base);
    const writer = createClient(server, base);
    writer.session.connect();
    await flush();
    server.afterApply = () => {
      server.afterApply = null;
      const page = server.blocks.get('page-1');
      if (page !== undefined) page.children = [...page.children.filter((id) => id !== 'x'), 'x'];
    };

    writer.edit(documentOf(first, paragraph('x', text('Between')), second));
    await settle();
    await flush();
    await settle();
    await flush();
    await settle();

    expect(writer.saveStates).toContain('failed');
    expect(server.readChildren('page-1')).toEqual(['p1', 'x', 'p2']);
    expect(writer.saveStates.at(-1)).toBe('saved');
  });
});

describe('moving a block within its parent', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('reaches the server and the other tab with one list operation anchored on a live block', async () => {
    const start = documentOf(first, second, heading('h1', 2, 'Title'));
    const server = new FakeBlockServer(start);
    const writer = createClient(server, start, 'user-1');
    const reader = createClient(server, start, 'user-2');
    writer.session.connect();
    reader.session.connect();
    await flush();

    writer.edit(documentOf(first, heading('h1', 2, 'Title'), second));
    await settle();
    await announceToOthers(server, [reader]);

    expect(commandsOf(server, -1)).toEqual(['listAfter']);
    expect(server.readChildren('page-1')).toEqual(['p1', 'h1', 'p2']);
    expect(reader.content).toEqual(writer.content);
  });
});
