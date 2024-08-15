import { Path } from 'a-path';
import copy from 'fast-copy';
import { inspect } from 'util';
import { MongoClient, Db } from 'mongodb';
import {
  MaskConfig,
  IMaskit,
  Primitive,
  EmptyObject,
  Stringify,
  ApplyFn,
  CompileFn,
  Log,
  SerializeFn,
  DeserializeFn,
  SaveFn,
  Parameter,
} from './Interfaces';

export function Maskit<C extends MaskConfig>(config: C): IMaskit<C> {
  let db: Db | null = null;

  const connectToDatabase = async () => {
    if (!db) {
      const client = await MongoClient.connect('mongodb://localhost:27017');
      db = client.db('maskit');
    }
    return db;
  };

  const hideCharacters = (value: string, mask: string | number) => {
    if (typeof mask === 'number') {
      return config.char.repeat(mask);
    }
    return mask.repeat(String(value).length);
  };

  const stringifyPrimitive = (value: Primitive) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  };

  const isPrimitive = (value: unknown): value is Primitive => {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint' ||
      value instanceof Date
    );
  };

  const ensureUniqueKeys = <T extends { key: string }>(values?: T[]) => {
    if (values) {
      const keys = new Set<string>();
      for (const value of values) {
        if (keys.has(value.key)) {
          throw new Error(`Duplicate keys ${value.key} has defined in mask function`);
        }
        keys.add(value.key);
      }
    }
  };

  const clone = <T extends EmptyObject>(obj: T) => {
    return copy(obj) as Stringify<typeof obj>;
  };

  const apply: ApplyFn<C> = ({ obj, param, values }) => {
    ensureUniqueKeys(values);

    const newObj = clone(obj);

    values?.forEach(item => {
      const key = item.key;

      if (item.ignore && param && item.ignore(param)) {
        return;
      }

      const value = Path.get(obj, key);

      // let newValue: Primitive | EmptyObject;
      let newValue: any;

      if (isPrimitive(value)) {
        const stringValue = stringifyPrimitive(value);
        if (typeof item.mask === 'number' || typeof item.mask === 'string') {
          newValue = hideCharacters(stringValue, item.mask);
        } else if (typeof item.mask === 'function') {
          newValue = item.mask(value as any, config, param);
        }
      } else if (typeof item.mask === 'function') {
        newValue = item.mask(value, config, param);
      } else {
        throw Error(`Invalid mask action for non-primitive value at key ${key}`);
      }

      Path.set(newObj, key as Path<typeof newObj>, newValue);
    });

    return newObj;
  };

  const compile: CompileFn<C> = (values?) => {
    let compiledFunc: string;

    if (!values) {
      compiledFunc = /*javascript*/ `
                const hideCharacters = (value, config) => config.char.repeat(String(value).length);
                
                function maskRecursive(obj, config) {
                    if (typeof obj !== 'object' || obj === null) return hideCharacters(obj, config);
                    if (Array.isArray(obj)) return obj.map(v => maskRecursive(v, config));
                    const result = {};
                    for (const key in obj) {
                        if (Object.prototype.hasOwnProperty.call(obj, key)) {
                            result[key] = maskRecursive(obj[key], config);
                        }
                    }
                    return result;
                }
                return function(obj) {
                    return maskRecursive(JSON.parse(JSON.stringify(obj)), config);
                }
            `;
    } else {
      const maskHelperFn = Object.entries(config.helpers)
        .map(([name, func]) => `const ${name} = ${func.toString()};`)
        .join('\n');

      const maskRuleFn = values
        .map((item, index) => {
          if (typeof item.mask === 'function') {
            return `const mask${index} = ${item.mask.toString()};`;
          } else if (typeof item.mask === 'number' || typeof item.mask === 'string') {
            return `const mask${index} = (value, config) => config.char.repeat(${JSON.stringify(item.mask)});`;
          } else {
            return `const mask${index} = (value, config) => config.char.repeat(String(value).length);`;
          }
        })
        .join('\n');

      const maskCallbackFn = values
        .map((item, index) => {
          const path = item.key.split('.');
          const accessPath = path
            .map(p => (p.match(/^\d+$/) ? `[${p}]` : `['${p}']`))
            .join('');
          const setPath = path
            .slice(0, -1)
            .map(p => (p.match(/^\d+$/) ? `[${p}]` : `['${p}']`))
            .join('');
          const lastKey = path[path.length - 1];

          let body = `if (obj${accessPath} !== undefined) {\n`;

          if (item.ignore) {
            body += `if (!(${item.ignore.toString()})(param)) {\n`;
          }

          body += `result${setPath}${lastKey.match(/^\d+$/) ? `[${lastKey}]` : `['${lastKey}']`} = mask${index}(obj${accessPath}, config, param);\n`;

          if (item.ignore) {
            body += `}\n`;
          }
          body += `}`;

          return body;
        })
        .join('\n');

      compiledFunc = /*javascript*/ `
                ${maskHelperFn}
                ${maskRuleFn}
                return function(obj, param) {
                    const result = JSON.parse(JSON.stringify(obj));
                    const config = this.config;
                    ${maskCallbackFn}
                    return result;
                }
            `;
    }

    return new Function('config', compiledFunc)(config);
  };

  const log: Log = obj => {
    console.log(inspect(obj, { depth: null }));
  };

  const serialize: SerializeFn = compiledMask => {
    return compiledMask.toString();
  };

  const deserialize: DeserializeFn<C> = serialized => {
    return new Function('config', `return ${serialized}`)(config);
  };

  const save: SaveFn<C> = async (name, compiledFunction, original, param) => {
    const serializedMask = serialize(compiledFunction);

    // Apply the mask to get the masked properties
    const maskedResult = compiledFunction(original, param);

    // Compare original and masked result to determine masked properties
    const maskedProperties = Object.keys(original).filter(
      key => JSON.stringify(original[key]) !== JSON.stringify(maskedResult[key]),
    );

    const db = await connectToDatabase();
    await db.collection('compiledMasks').updateOne(
      { name },
      {
        $set: {
          name,
          masked: maskedProperties,
          original,
          param,
          serializedMask,
          created: new Date(),
          updated: new Date(),
        },
      },
      { upsert: true },
    );
  };

  return { apply, compile, log, serialize, deserialize, save };
}
