/** What one parameter of an address holds: nothing, once, or repeated. */
export type RouteSearchParamValue = string | string[] | undefined;

/** Every parameter of an address, as a page route receives them. */
export type RouteSearchParams = Record<string, RouteSearchParamValue>;
