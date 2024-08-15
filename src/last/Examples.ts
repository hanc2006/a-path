import { Maskit } from './Mask';
import { Parameter } from './Interfaces';
import { all, email, first, last, phone } from './Helpers';

// Usage example
interface UserParams extends Parameter {
  role: 'admin' | 'user';
}

interface UserSchema {
  name: string;
  subject: {
    first: string;
    last: string;
  };
  email: string;
  phone: number;
  address: {
    street: string;
    city: string;
    country: string;
  };
}

// class UserSchema {
//     constructor(
//         public name: string,
//         public age: number,
//         public email: string,
//         public address: {
//             street: string,
//             city: string,
//             country: string
//         },
//         public hobbies: string[]
//     ) { }
// }

const user: UserSchema = {
  name: 'Marco',
  subject: {
    first: 'John',
    last: 'Doe',
  },
  email: 'john.doe@example.com',
  phone: 100,
  address: {
    street: '123 Main St',
    city: 'New York',
    country: 'USA',
  },
};

// const user = new UserSchema(
//     "John Doe",
//     30,
//     "john.doe@example.com",
//     {
//         street: "123 Main St",
//         city: "Anytown",
//         country: "USA"
//     },
//     ["reading", "swimming", "coding"]
// );

// Create maskit instance with custom config
const maskit = Maskit({
  char: '#',
  separator: '-',
  helpers: { last, first, all, phone, email },
});

// NEW USAGE
const result = maskit.apply<UserSchema, UserParams>({
  obj: user,
  param: { role: 'user' },
  values: [
    {
      key: 'phone',
      mask: (value, config, param) => {
        const { char } = config;
        return char.repeat(String(value).length);
      },
      ignore: param => param.role === 'admin',
    },
    {
      key: 'name',
      mask: 4,
    },
    {
      key: 'address',
      mask: (value, config, param) => {
        const { all } = config.helpers;
        return {
          country: all(value.city, config),
          city: all(value.city, config),
          street: all(value.city, config),
        };
      },
    },
  ],
});

// Compile specific masking rules
const compiledSpecificMask = maskit.compile<UserSchema, UserParams>([
  {
    key: 'name',
    mask: 4,
  },
  {
    key: 'phone',
    mask: (value, config) => config.char.repeat(String(value).length),
  },
  {
    key: 'email',
    mask: value => value.replace(/(.*)@/, '****@'),
    ignore: param => param.role === 'admin',
  },
  {
    key: 'subject',
    mask: value => ({
      first: value.first[0] + '****',
      last: value.last[0] + '****',
    }),
  },
]);

// const maskedSpecific = compiledSpecificMask(user, { role: 'user' });
// maskit.log(maskedSpecific);

maskit.save('userMask', compiledSpecificMask, user, { role: 'user' });

const user2 = {
  name: 'John Doe',
  age: 30,
  email: 'john.doe@example.com',
  address: {
    street: '123 Main St',
    city: 'Anytown',
    country: 'USA',
  },
  hobbies: ['reading', 'swimming', 'coding'],
};

maskit.log(result);

// Mask all properties
const compiledMaskAll = maskit.compile<typeof user2>();
const maskedAll = compiledMaskAll(user2);
maskit.log(maskedAll);

const serializedMask = maskit.serialize(compiledSpecificMask);
console.log('Masked Specific:', serializedMask);
