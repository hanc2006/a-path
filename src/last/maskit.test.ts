import { describe, it, expect } from 'vitest';
import { all, email, first, last, phone } from './Helpers';
import { Maskit } from './Mask';

const maskit = Maskit({
  char: '*',
  separator: '-',
  helpers: { last, first, all, phone, email },
});

describe('Maskit', () => {
  describe('Simple Masking', () => {
    it('should mask a simple string with a number mask', () => {
      const result = maskit.apply({
        obj: { name: 'John Doe' },
        values: [{ key: 'name', mask: 4 }],
      });
      expect(result).toEqual({ name: '****' });
    });

    it('should mask a simple string with a string mask', () => {
      const result = maskit.apply({
        obj: { email: 'john@example.com' },
        values: [{ key: 'email', mask: '*****@*****' }],
      });
      expect(result).toEqual({ email: '*****@*****' });
    });
  });

  describe('Complex Masking with Parameters', () => {
    it('should apply conditional masking based on parameters', () => {
      const user = { name: 'John Doe', role: 'admin' };

      const result = maskit.apply({
        obj: user,
        param: { role: 'user' },
        values: [
          {
            key: 'name',
            mask: (value, config, param) =>
              // Fix it
              param?.role === 'admin'
                ? value
                : value[0] + config.char.repeat(value.length - 1),
            ignore: param => param.role === 'superadmin',
          },
        ],
      });

      expect(result).toEqual({ name: 'John Doe', role: 'admin' });
    });
  });

  describe('Ignoring Properties', () => {
    it('should ignore properties based on the ignore function', () => {
      const user = { name: 'John Doe', email: 'john@example.com', role: 'user' };
      const result = maskit.apply({
        obj: user,
        param: { role: user.role },
        values: [
          { key: 'name', mask: 4 },
          {
            key: 'email',
            mask: value => value.replace(/(.*)@/, '****@'),
            ignore: param => param.role === 'admin',
          },
        ],
      });
      expect(result).toEqual({
        name: 'John***',
        email: '****@example.com',
        role: 'user',
      });
    });
  });

  describe('Nested Objects', () => {
    it('should mask nested object properties', () => {
      const user = {
        name: 'John Doe',
        contact: {
          email: 'john@example.com',
          phone: '123-456-7890',
        },
      };
      const result = maskit.apply({
        obj: user,
        values: [
          { key: 'name', mask: 4 },
          { key: 'contact.email', mask: value => value.replace(/(.*)@/, '****@') },
          {
            key: 'contact.phone',
            mask: value => value.replace(/\d{3}-\d{3}-(\d{4})/, '***-***-$1'),
          },
        ],
      });
      expect(result).toEqual({
        name: 'John***',
        contact: {
          email: '****@example.com',
          phone: '***-***-7890',
        },
      });
    });
  });

  describe('Array Masking', () => {
    it('should mask array elements', () => {
      const data = {
        names: ['John Doe', 'Jane Smith'],
        addresses: [
          { street: '123 Main St', city: 'Anytown' },
          { street: '456 Elm St', citsy: 'Othertown' },
        ],
      };
      const result = maskit.apply({
        obj: data,
        values: [
          { key: 'names.0', mask: 4 },
          { key: 'addresses.0.street', mask: value => value.replace(/\d+/, '***') },
        ],
      });
      expect(result).toEqual({
        names: ['John***', 'Jane***'],
        addresses: [
          { street: '*** Main St', city: 'Anytown' },
          { street: '*** Elm St', city: 'Othertown' },
        ],
      });
    });
  });

  describe('Helper Functions', () => {
    it('should use MaskLast helper', () => {
      const result = maskit.apply({
        obj: { name: 'John Doe' },
        values: [
          { key: 'name', mask: (value, config) => config.helpers.last(value, config) },
        ],
      });
      expect(result).toEqual({ name: 'John ***' });
    });

    it('should use MaskFirst helper', () => {
      const result = maskit.apply({
        obj: { name: 'John Doe' },
        values: [
          {
            key: 'name',
            mask: (value, config) => config.helpers.first(value, config),
          },
        ],
      });
      expect(result).toEqual({ name: '**** Doe' });
    });

    it('should use MaskAll helper', () => {
      const result = maskit.apply({
        obj: { name: 'John Doe' },
        values: [
          { key: 'name', mask: (value, config) => config.helpers.all(value, config) },
        ],
      });
      expect(result).toEqual({ name: '********' });
    });

    it('should use MaskEmail helper', () => {
      const result = maskit.apply({
        obj: { email: 'john@example.com' },
        values: [
          {
            key: 'email',
            mask: (value, config) => config.helpers.email(value, config),
          },
        ],
      });
      expect(result).toEqual({ email: '****@example.com' });
    });

    it('should use MaskPhone helper', () => {
      const result = maskit.apply({
        obj: { phone: '123-456-7890' },
        values: [
          {
            key: 'phone',
            mask: (value, config) => config.helpers.phone(value, config),
          },
        ],
      });
      expect(result).toEqual({ phone: '*******7890' });
    });
  });

  describe('Compilation', () => {
    it('should compile and apply masks', () => {
      const compiledMask = maskit.compile<
        { name: string; email: string },
        { role: string }
      >([
        { key: 'name', mask: 4 },
        {
          key: 'email',
          mask: value => value.replace(/(.*)@/, '****@'),
          ignore: param => param.role === 'admin',
        },
      ]);

      const user1 = { name: 'John Doe', email: 'john@example.com' };
      const result1 = compiledMask(user1, { role: 'user' });
      expect(result1).toEqual({ name: 'John***', email: '****@example.com' });

      const user2 = { name: 'Jane Smith', email: 'jane@example.com' };
      const result2 = compiledMask(user2, { role: 'admin' });
      expect(result2).toEqual({ name: 'Jane***', email: 'jane@example.com' });
    });
  });

  describe('Serialization and Deserialization', () => {
    it('should serialize, deserialize, and apply masks', () => {
      const compiledMask = maskit.compile<
        { name: string; email: string },
        { role: string }
      >([
        { key: 'name', mask: 4 },
        {
          key: 'email',
          mask: value => value.replace(/(.*)@/, '****@'),
          ignore: param => param.role === 'admin',
        },
      ]);

      const serialized = maskit.serialize(compiledMask);
      const deserialized = maskit.deserialize(serialized);

      const user = { name: 'John Doe', email: 'john@example.com' };
      const result = deserialized(user);
      expect(result).toEqual({ name: 'John***', email: '****@example.com' });
    });
  });
});
