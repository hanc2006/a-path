Here's the complete README.md file in GitHub-flavored Markdown, presented as a single, continuous document:

# Maskit

Maskit is a high-performance, fully typed masking library written in TypeScript. It provides a flexible and efficient way to mask sensitive data in your objects, with support for complex scenarios and reusable compiled masks.

## Table of Contents

- [Introduction](#introduction)
- [Why Another Mask Library?](#why-another-mask-library)
- [Installation](#installation)
- [Usage](#usage)
  - [Basic Configuration](#basic-configuration)
  - [Simple Masking](#simple-masking)
  - [Complex Masking with Parameters](#complex-masking-with-parameters)
  - [Ignoring Properties](#ignoring-properties)
  - [Compiling and Reusing Masks](#compiling-and-reusing-masks)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Introduction

Maskit is designed to provide a powerful yet easy-to-use solution for masking sensitive data in your applications. Whether you're dealing with simple string masking or complex object structures with conditional masking rules, Maskit has you covered.

## Why Another Mask Library?

Maskit stands out from other masking libraries for several reasons:

1. **Performance**: Maskit uses a compilation step to generate optimized masking functions, resulting in faster execution, especially for repeated masking operations.

2. **Type Safety**: Built from the ground up with TypeScript, Maskit provides full type inference and safety, reducing the likelihood of runtime errors.

3. **Flexibility**: Maskit supports a wide range of masking scenarios, from simple string replacements to complex, conditional masking based on runtime parameters.

4. **Reusability**: Compiled mask functions can be serialized, stored, and reused, making it easy to apply consistent masking across your application.

## Installation

```bash
npm install maskit
```

## Usage

### Basic Configuration

First, create a Maskit instance with your desired configuration:

```typescript
import { Maskit } from 'maskit';

const maskit = Maskit({
  char: '*',
  separator: ' ',
});
```

### Simple Masking

Mask a simple object with number or string masks:

```typescript
const user = {
  name: 'John Doe',
  email: 'john.doe@example.com',
};

const maskedUser = maskit.apply(user, [
  { key: 'name', mask: 4 }, // Mask all but the first 4 characters
  { key: 'email', mask: '*****@*****' }, // Use a string pattern
]);

console.log(maskedUser);
// Output: { name: "John****", email: "*****@*****" }
```

### Complex Masking with Parameters

Use custom functions and parameters for more complex masking scenarios:

```typescript
const user = {
  name: 'John Doe',
  ssn: '123-45-6789',
  role: 'admin',
};

const maskedUser = maskit.apply(
  user,
  [
    {
      key: 'name',
      mask: (value, config, param) =>
        param.role === 'admin' ? value : value[0] + config.char.repeat(value.length - 1),
    },
    { key: 'ssn', mask: value => value.replace(/\d{3}-\d{2}-(\d{4})/, '***-**-$1') },
  ],
  { role: user.role },
);

console.log(maskedUser);
// Output: { name: "John Doe", ssn: "***-**-6789", role: "admin" }
```

### Ignoring Properties

Use the `ignore` function to conditionally skip masking:

```typescript
const user = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  role: 'user',
};

const maskedUser = maskit.apply(
  user,
  [
    { key: 'name', mask: 4 },
    {
      key: 'email',
      mask: value => value.replace(/(.*)@/, '****@'),
      ignore: param => param.role === 'admin',
    },
  ],
  { role: user.role },
);

console.log(maskedUser);
// Output: { name: "John****", email: "****@example.com", role: "user" }
```

### Compiling and Reusing Masks

For better performance when applying the same mask multiple times, compile the mask first:

```typescript
const compiledMask = maskit.compile<typeof user, { role: string }>([
  { key: 'name', mask: 4 },
  {
    key: 'email',
    mask: value => value.replace(/(.*)@/, '****@'),
    ignore: param => param.role === 'admin',
  },
]);

const maskedUser1 = compiledMask(user, { role: 'user' });
const maskedUser2 = compiledMask(anotherUser, { role: 'admin' });
```

## API Reference

### `Maskit(config: MaskConfig): IMaskit`

Creates a new Maskit instance with the given configuration.

- `config`: An object with the following properties:
  - `char`: The character to use for masking (default: '\*')
  - `separator`: The separator to use when masking parts of strings (default: ' ')

Returns an `IMaskit` instance with the following methods:

#### `apply<T, P>(obj: T, rules: MaskRule<T, P>[], param?: P): T`

Applies masking rules to an object.

- `obj`: The object to mask
- `rules`: An array of masking rules
- `param`: Optional parameters to use in masking functions

Returns a new object with the masking rules applied.

#### `compile<T, P>(rules: MaskRule<T, P>[]): CompiledMask<T, P>`

Compiles masking rules into a reusable function.

- `rules`: An array of masking rules

Returns a compiled mask function.

#### `serialize(compiledMask: CompiledMask<any, any>): string`

Serializes a compiled mask function to a string.

- `compiledMask`: A compiled mask function

Returns a string representation of the compiled mask function.

#### `deserialize<T, P>(serialized: string): CompiledMask<T, P>`

Deserializes a string back into a compiled mask function.

- `serialized`: A serialized compiled mask function

Returns a compiled mask function.

### Types

#### `MaskRule<T, P>`

Represents a single masking rule.

```typescript
type MaskRule<T, P> = {
  key: keyof T | string;
  mask: number | string | ((value: any, config: MaskConfig, param?: P) => any);
  ignore?: (param: P) => boolean;
};
```

#### `CompiledMask<T, P>`

Represents a compiled mask function.

```typescript
type CompiledMask<T, P> = (obj: T, param?: P) => T;
```

## Examples

### Masking Nested Objects

```typescript
const user = {
  name: 'John Doe',
  contact: {
    email: 'john.doe@example.com',
    phone: '123-456-7890',
  },
  addresses: [
    { street: '123 Main St', city: 'Anytown' },
    { street: '456 Elm St', city: 'Othertown' },
  ],
};

const maskedUser = maskit.apply(user, [
  { key: 'name', mask: 4 },
  { key: 'contact.email', mask: value => value.replace(/(.*)@/, '****@') },
  {
    key: 'contact.phone',
    mask: value => value.replace(/\d{3}-\d{3}-(\d{4})/, '***-***-$1'),
  },
  { key: 'addresses[].street', mask: value => value.replace(/\d+/, '***') },
]);

console.log(JSON.stringify(maskedUser, null, 2));
```

Output:

```json
{
  "name": "John****",
  "contact": {
    "email": "****@example.com",
    "phone": "***-***-7890"
  },
  "addresses": [
    { "street": "*** Main St", "city": "Anytown" },
    { "street": "*** Elm St", "city": "Othertown" }
  ]
}
```

### Conditional Masking Based on User Role

```typescript
const users = [
  { name: 'John Doe', email: 'john@example.com', role: 'user' },
  { name: 'Jane Smith', email: 'jane@example.com', role: 'admin' },
];

const compiledMask = maskit.compile<(typeof users)[0], { currentUserRole: string }>([
  { key: 'name', mask: 1, ignore: param => param.currentUserRole === 'admin' },
  {
    key: 'email',
    mask: value => value.replace(/(.*)@/, '****@'),
    ignore: param => param.currentUserRole === 'admin',
  },
]);

const maskedUsers = users.map(user => compiledMask(user, { currentUserRole: 'user' }));
console.log(maskedUsers);
```

Output:

```json
[
  { "name": "J*** ***", "email": "****@example.com", "role": "user" },
  { "name": "J*** *****", "email": "****@example.com", "role": "admin" }
]
```

## Contributing

We welcome contributions to Maskit! If you have suggestions for improvements or bug fixes, please follow these steps:

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Make your changes and commit them with a clear commit message
4. Push your changes to your fork
5. Submit a pull request to the main repository

Please ensure that your code adheres to the existing style and includes appropriate tests and documentation.

## License

Maskit is released under the MIT License. See the [LICENSE](LICENSE) file for details.

This markdown document provides a comprehensive README for the Maskit library, including an introduction, installation instructions, usage examples, API reference, and information about contributing and licensing. You can copy this content directly into a README.md file in your project repository.
