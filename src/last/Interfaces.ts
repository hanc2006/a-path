import { Path } from 'a-path';

export interface MaskConfig {
  char: string;
  separator: string;
  helpers: Record<string, MaskHelperFn>;
}

export type Resolve<T> = T extends Function ? T : { [K in keyof T]: T[K] };

export type Stringify<T> = Resolve<
  T extends Primitive
    ? string
    : T extends Array<infer U>
      ? Array<Stringify<U>>
      : T extends object
        ? { [K in keyof T]: Stringify<T[K]> }
        : T
>;

export type EmptyObject = Record<string, any>;

export type Parameter = Record<string, unknown>;

export type Primitive = number | string | boolean | bigint | Date;

export type MaskRule<
  C extends MaskConfig,
  P extends Parameter | undefined,
  T extends EmptyObject,
> = {
  [K in Path<T>]: {
    key: string & K;
    mask: Path.At<T, K> extends Primitive
      ? MaskRuleFn<C, P, T, K> | string | number
      : MaskRuleFn<C, P, T, K>;
    ignore?: (param: P) => boolean;
  };
}[Path<T>];

export type MaskRuleFn<
  C extends MaskConfig,
  P extends Parameter | undefined,
  T extends EmptyObject,
  K extends Path<T>,
> = (value: Path.At<T, K>, config: C, param?: P) => Stringify<Path.At<T, K>>;

export type ApplyFn<C extends MaskConfig> = <
  T extends EmptyObject,
  P extends Parameter | undefined,
>(options: {
  obj: T;
  param?: P;
  values?: MaskRule<C, P, T>[];
}) => Stringify<T>;

export type SerializeFn = <
  T extends EmptyObject,
  P extends Parameter | undefined = undefined,
>(
  compiled: CompiledMask<T, P>,
) => string;

export type DeserializeFn<C extends MaskConfig> = <
  T extends EmptyObject,
  P extends Parameter | undefined = undefined,
>(
  serialized: string,
) => CompiledMask<T, P>;

export type SaveFn<C extends MaskConfig> = <T extends EmptyObject, P extends Parameter>(
  name: string,
  compiled: CompiledMask<T, P>,
  original: T,
  param: P,
) => Promise<void>;

export type Log = <T extends EmptyObject>(obj: T) => void;

export interface IMaskit<C extends MaskConfig> {
  apply: ApplyFn<C>;
  compile: CompileFn<C>;
  log: Log;
  serialize: SerializeFn;
  deserialize: DeserializeFn<C>;
  save: SaveFn<C>;
}

export type CompiledMask<
  T extends EmptyObject,
  P extends Parameter | undefined = undefined,
> = P extends undefined ? (obj: T) => T : (obj: T, param: P) => T;

export type CompileFn<C extends MaskConfig> = <
  T extends EmptyObject,
  P extends Parameter | undefined = undefined,
>(
  values?: MaskRule<C, P, T>[],
) => CompiledMask<T, P>;

export type MaskHelperFn<
  C extends MaskConfig = MaskConfig,
  T extends EmptyObject = EmptyObject,
  K extends Path<T> = Path<T>,
> = (value: Path.At<T, K>, config: C) => Stringify<Path.At<T, K>>;
