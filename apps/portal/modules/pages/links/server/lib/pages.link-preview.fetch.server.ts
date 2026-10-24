import 'server-only';

import { lookup } from 'node:dns/promises';
import type { IncomingMessage } from 'node:http';
import { request } from 'node:https';
import type { LookupFunction } from 'node:net';
import {
  LINK_PREVIEW_MAXIMUM_HOPS,
  PAGE_LINK_PREVIEW_READ_LIMIT,
  PAGE_LINK_PREVIEW_TIMEOUT_MS,
} from '../../constants/pages.link-preview.constants';
import { isReachableLinkPreviewAddress } from '../../lib/pages.link-preview.address.lib';
import { readTextUpToLimit } from '../../lib/pages.link-preview.body.lib';
import { resolvePublicAddresses } from '../../lib/pages.link-preview.lookup.lib';
import type { LinkPreviewResolvedAddress } from '../../types/pages.link-preview.types';

const resolveWithDns = async (hostname: string): Promise<readonly LinkPreviewResolvedAddress[]> =>
  lookup(hostname, { all: true });

const answerLookup = async (
  hostname: string,
  isListWanted: boolean,
  callback: Parameters<LookupFunction>[2],
): Promise<void> => {
  try {
    const addresses = await resolvePublicAddresses(hostname, resolveWithDns);
    const [first] = addresses;
    if (isListWanted || first === undefined) callback(null, [...addresses]);
    else callback(null, first.address, first.family);
  } catch (error) {
    callback(error instanceof Error ? Object.assign(error, { code: 'ENOTFOUND' }) : new Error('lookup failed'), '', 0);
  }
};

/** The socket connects to the addresses that passed the check, so a name cannot change its answer between. */
const lookupPublicAddress: LookupFunction = (hostname, options, callback) => {
  void answerLookup(hostname, options.all === true, callback);
};

const getOnce = (address: URL): Promise<IncomingMessage> =>
  new Promise((resolve, reject) => {
    const outgoing = request(
      address,
      {
        headers: { accept: 'text/html' },
        lookup: lookupPublicAddress,
        signal: AbortSignal.timeout(PAGE_LINK_PREVIEW_TIMEOUT_MS),
      },
      resolve,
    );
    outgoing.on('error', reject);
    outgoing.end();
  });

const isRedirect = (answer: IncomingMessage): boolean =>
  (answer.statusCode ?? 0) >= 300 && (answer.statusCode ?? 0) < 400 && answer.headers.location !== undefined;

const isHtml = (answer: IncomingMessage): boolean =>
  answer.statusCode === 200 && (answer.headers['content-type'] ?? '').includes('text/html');

/**
 * Redirects are followed by hand so every hop passes the address guard and the pinned lookup.
 * Returns null when the site cannot be asked or does not answer with a page.
 */
export const fetchLinkPreviewHtml = async (address: string): Promise<string | null> => {
  let here = address;
  for (let hop = 0; hop <= LINK_PREVIEW_MAXIMUM_HOPS; hop += 1) {
    if (!isReachableLinkPreviewAddress(here)) return null;
    const answer = await getOnce(new URL(here));
    if (isRedirect(answer)) {
      answer.destroy();
      here = new URL(answer.headers.location ?? '', here).toString();
      continue;
    }
    if (!isHtml(answer)) {
      answer.destroy();
      return null;
    }
    try {
      return await readTextUpToLimit(answer, PAGE_LINK_PREVIEW_READ_LIMIT);
    } finally {
      answer.destroy();
    }
  }
  return null;
};
