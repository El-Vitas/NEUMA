const TRUE_VALUE = 'true';
const FALSE_VALUE = 'false';

export const parseTrustProxy = (raw: string | undefined): boolean | string => {
  if (!raw || raw === FALSE_VALUE) {
    return false;
  }
  if (raw === TRUE_VALUE) {
    return true;
  }
  return raw;
};

export const getTrustProxy = (): boolean | string => parseTrustProxy(process.env.TRUST_PROXY);
