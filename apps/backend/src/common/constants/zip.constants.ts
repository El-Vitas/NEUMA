export const ZIP_LOCAL_HEADER_SIGNATURE = 0x04_03_4b_50;
export const ZIP_CENTRAL_HEADER_SIGNATURE = 0x02_01_4b_50;
export const ZIP_END_OF_DIRECTORY_SIGNATURE = 0x06_05_4b_50;

/** The oldest reader that understands a deflated entry with folders. */
export const ZIP_VERSION_NEEDED = 20;

/** Says the names are UTF-8, which is what lets a page called «Diseño» arrive called that. */
export const ZIP_UTF8_FLAG = 0x08_00;

export const ZIP_DEFLATE_METHOD = 8;

/**
 * The first moment the format can express, used for every entry.
 *
 * A real timestamp would make the same export produce different bytes each
 * time, and an export one cannot compare against the last one is worth less
 * than the clock inside it.
 */
export const ZIP_FIXED_DOS_TIME = 0;
export const ZIP_FIXED_DOS_DATE = 0x00_21;

/** The polynomial every zip checks its bytes with, written the way the format writes it: backwards. */
export const ZIP_CRC_POLYNOMIAL = 0xed_b8_83_20;

export const ZIP_CRC_TABLE_SIZE = 256;
export const ZIP_CRC_SEED = 0xff_ff_ff_ff;
