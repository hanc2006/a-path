import { MaskHelperFn } from './Interfaces';

export const last: MaskHelperFn = (value, config) => {
  const parts = value.split(config.separator);
  if (parts.length === 1) return value.replace(/./g, config.char);
  const lastPart = parts.pop();
  return [...parts, lastPart!.replace(/./g, config.char)].join(config.separator);
};

export const first: MaskHelperFn = (value, config) => {
  const parts = value.split(config.separator);
  if (parts.length === 1) return value.replace(/./g, config.char);
  const firstPart = parts.shift();
  return [firstPart!.replace(/./g, config.char), ...parts].join(config.separator);
};

export const all: MaskHelperFn = (value, config) => value.replace(/./g, config.char);

export const email: MaskHelperFn = (value, config) => {
  const [localPart, domain] = value.split('@');
  if (!domain) return value.replace(/./g, config.char);
  return `${localPart.replace(/./g, config.char)}@${domain}`;
};

export const phone: MaskHelperFn = (value, config) => {
  const digits = value.replace(/\D/g, '');
  const lastFourDigits = digits.slice(-4);
  const maskedPart = config.char.repeat(Math.max(0, digits.length - 4));
  return maskedPart + lastFourDigits;
};
