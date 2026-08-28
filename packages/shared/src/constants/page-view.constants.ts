/**
 * The group that holds whatever carries no value for the property a view groups
 * by.
 *
 * The key is shared because both sides need it: the server puts the rows there,
 * and whoever draws them has to recognize it to name it in the reader's own
 * language. The label the server sends travels in English as a fallback for a
 * reader that does not translate it.
 */
export const UNASSIGNED_GROUP_KEY = 'unassigned';
