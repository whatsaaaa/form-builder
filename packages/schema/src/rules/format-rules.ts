import * as v from 'valibot'
import type { AnyAction } from '../shared/valibot-types'
import { defineRule } from './define-rule'
import type { RuleDef } from './rule-def'

/** A string format without params. */
const format = (label: string, create: (message?: string) => AnyAction) =>
  defineRule({
    kinds: ['string'],
    meta: { label, category: 'format' },
    create: (_, message) => create(message),
  })

/** Valibot's hash types. Valibot doesn't export the list, only the type. */
const HASH_TYPES = [
  'md4',
  'md5',
  'sha1',
  'sha256',
  'sha384',
  'sha512',
  'ripemd128',
  'ripemd160',
  'tiger128',
  'tiger160',
  'tiger192',
  'crc32',
  'crc32b',
  'adler32',
] as const satisfies readonly v.HashType[]

const hashParams = v.object({
  types: v.pipe(v.array(v.picklist(HASH_TYPES)), v.minLength(1, 'Pick at least one hash type')),
})

/** Formats Valibot can check on a string. */
export const formatRules = {
  email: format('Email', (m) => v.email(m)),
  rfcEmail: format('Email (RFC 5322)', (m) => v.rfcEmail(m)),
  url: format('URL', (m) => v.url(m)),
  domain: format('Domain', (m) => v.domain(m)),
  slug: format('Slug', (m) => v.slug(m)),
  uuid: format('UUID', (m) => v.uuid(m)),
  ulid: format('ULID', (m) => v.ulid(m)),
  cuid2: format('CUID2', (m) => v.cuid2(m)),
  nanoid: format('Nano ID', (m) => v.nanoid(m)),
  ip: format('IP address', (m) => v.ip(m)),
  ipv4: format('IPv4 address', (m) => v.ipv4(m)),
  ipv6: format('IPv6 address', (m) => v.ipv6(m)),
  mac: format('MAC address', (m) => v.mac(m)),
  mac48: format('MAC-48 address', (m) => v.mac48(m)),
  mac64: format('MAC-64 address', (m) => v.mac64(m)),
  hexColor: format('Hex colour', (m) => v.hexColor(m)),
  hexadecimal: format('Hexadecimal', (m) => v.hexadecimal(m)),
  octal: format('Octal', (m) => v.octal(m)),
  decimal: format('Decimal number', (m) => v.decimal(m)),
  digits: format('Digits only', (m) => v.digits(m)),
  base64: format('Base64', (m) => v.base64(m)),
  bic: format('BIC (SWIFT code)', (m) => v.bic(m)),
  creditCard: format('Credit card number', (m) => v.creditCard(m)),
  imei: format('IMEI', (m) => v.imei(m)),
  isbn: format('ISBN', (m) => v.isbn(m)),
  isrc: format('ISRC', (m) => v.isrc(m)),
  emoji: format('Emoji', (m) => v.emoji(m)),
  hash: defineRule({
    kinds: ['string'],
    params: hashParams,
    meta: { label: 'Hash', category: 'format' },
    create: (p, m) => v.hash(p.types as [v.HashType, ...v.HashType[]], m),
  }),
} satisfies Record<string, RuleDef>
