# Ideas to make Neuma agent first

Ideas from October 20, 2026 for the "Product Principle: Agent First" in `AGENTS.md`. None of them is in the current scope. They are picked up when a decision is made, and each one that touches the design gets its ADR before any code.

They start from how an agent works: its context is limited, it acts in loops, it needs to cite, and it cannot guess.

## Giving it just the right context

- **Context package.** A tool receives a question and a token budget and assembles the best context to answer it. It brings the most relevant blocks with their title path, their links, who wrote them, whether they are verified and their id to cite, without duplicates and trimmed to the budget. It is built from the search and the graph that already exist.
- **Hybrid search.** Today's text search, plus semantic search with one embedding per block in the same Postgres (pgvector), plus a graph signal: backlinks, recency and verification. It finds by meaning and not only by words.
- **Walking the graph.** From a block, its neighbors up to N hops and within a budget: mentions, backlinks, relations, synced blocks, parent and children.
- **Verifiable citations.** Every fact arrives with its block and its version, and a tool says whether a citation is still current or has changed.

## Knowing what changed

- **Changes since the last visit.** Each agent keeps a cursor and asks what changed since the last time in a space, a page or a collection. It receives only the changed blocks, from the transaction log that already exists.
- **Subscriptions.** The agent subscribes to a scope and gets a notice when something changes, without asking all the time.
- **Read only if it changed.** The agent sends the version it already has, and if nothing changed the response is short and spends no context.

## Acting safely

- **Dry run before writing.** The agent sends its operations in dry-run mode and receives the result and the diff without anything being saved. The transaction is already planned in memory before it is saved, so it is enough not to commit it.
- **Suggestion mode.** The agent proposes changes that a person accepts or rejects, like a document's track changes.
- **Writing by intent.** Operations anchored to the content ("after heading X", "replace the paragraph that says Y") that withstand simultaneous edits, and atomic batches across several pages.
- **The agent as its own actor.** Agents are members with their own identity who act on behalf of a person. The history shows "written by agent X on behalf of Y", with the same permissions as that person.

## Agent memory and work

- **The agent's own memory.** A private space per agent for notes, findings and the state of its work, with search and expiry. What is useful is promoted to shared knowledge.
- **Tasks for agents.** A collection row is assigned to an agent. The agent asks for its tasks with the context already assembled, updates the status and comments.
- **Triggers.** Mentioning an agent or changing a row's status notifies it, with the context package ready. Automations are run by agents.
- **Knowledge health.** The agent detects expired pages, contradictions between pages and lapsed verifications, and proposes fixes in suggestion mode.

## Where to start when this is picked up again

The first four are cheap because they build on what already exists:

1. the context package;
2. changes since the last visit;
3. dry run before writing;
4. read only if it changed.

Semantic search, suggestion mode and agents as their own actors would come after, and they need an ADR.
