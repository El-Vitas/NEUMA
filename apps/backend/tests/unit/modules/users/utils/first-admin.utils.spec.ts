import { describe, expect, it } from 'bun:test';
import { readFirstAdminArguments, readPasswordFromInput } from '@/modules/users/utils/first-admin.utils';

describe('readFirstAdminArguments', () => {
  it('reads the email and the name', () => {
    const result = readFirstAdminArguments(['--email', 'ana@empresa.cl', '--name', 'Ana Pérez']);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual({ email: 'ana@empresa.cl', name: 'Ana Pérez' });
  });

  it('says how to call it when the email or the name is missing', () => {
    const result = readFirstAdminArguments(['--email', 'ana@empresa.cl']);

    expect(result.isFail()).toBe(true);
    expect(result.getError().message).toContain('--name');
  });

  it('refuses a password passed as an argument, since it would stay in the shell history', () => {
    const result = readFirstAdminArguments(['--email', 'a@b.cl', '--name', 'Ana', '--password', 'secreto']);

    expect(result.isFail()).toBe(true);
  });
});

describe('readPasswordFromInput', () => {
  it('takes the piped password without its trailing line break', () => {
    expect(readPasswordFromInput('una-clave-larga\n')).toBe('una-clave-larga');
  });

  it('keeps spaces that belong to the password', () => {
    expect(readPasswordFromInput(' clave con espacios \r\n')).toBe(' clave con espacios ');
  });
});
