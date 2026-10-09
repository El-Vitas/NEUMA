export const ZIP_LOCAL_HEADER_SIGNATURE = 0x04_03_4b_50;
export const ZIP_CENTRAL_HEADER_SIGNATURE = 0x02_01_4b_50;
export const ZIP_END_OF_DIRECTORY_SIGNATURE = 0x06_05_4b_50;

/** Minimum version that reads deflated entries with folders. */
export const ZIP_VERSION_NEEDED = 20;

/** Marks entry names as UTF-8 so non-ASCII page titles survive. */
export const ZIP_UTF8_FLAG = 0x08_00;

export const ZIP_DEFLATE_METHOD = 8;

/** The earliest DOS date, for every entry: real timestamps would make identical exports differ byte for byte. */
export const ZIP_FIXED_DOS_TIME = 0;
export const ZIP_FIXED_DOS_DATE = 0x00_21;

/** CRC-32 polynomial in reversed bit order. */
export const ZIP_CRC_POLYNOMIAL = 0xed_b8_83_20;

export const ZIP_CRC_TABLE_SIZE = 256;
export const ZIP_CRC_SEED = 0xff_ff_ff_ff;
