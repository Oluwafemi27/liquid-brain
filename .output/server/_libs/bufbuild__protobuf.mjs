import processModule from "node:process";
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/is-message.js
/**
* Determine whether the given `arg` is a message.
* If `desc` is set, determine whether `arg` is this specific message.
*/
function isMessage(arg, schema) {
	if (!(arg !== null && typeof arg == "object" && "$typeName" in arg && typeof arg.$typeName == "string")) return false;
	if (schema === void 0) return true;
	return schema.typeName === arg.$typeName;
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/descriptors.js
/**
* Scalar value types. This is a subset of field types declared by protobuf
* enum google.protobuf.FieldDescriptorProto.Type The types GROUP and MESSAGE
* are omitted, but the numerical values are identical.
*/
var ScalarType;
(function(ScalarType) {
	ScalarType[ScalarType["DOUBLE"] = 1] = "DOUBLE";
	ScalarType[ScalarType["FLOAT"] = 2] = "FLOAT";
	ScalarType[ScalarType["INT64"] = 3] = "INT64";
	ScalarType[ScalarType["UINT64"] = 4] = "UINT64";
	ScalarType[ScalarType["INT32"] = 5] = "INT32";
	ScalarType[ScalarType["FIXED64"] = 6] = "FIXED64";
	ScalarType[ScalarType["FIXED32"] = 7] = "FIXED32";
	ScalarType[ScalarType["BOOL"] = 8] = "BOOL";
	ScalarType[ScalarType["STRING"] = 9] = "STRING";
	ScalarType[ScalarType["BYTES"] = 12] = "BYTES";
	ScalarType[ScalarType["UINT32"] = 13] = "UINT32";
	ScalarType[ScalarType["SFIXED32"] = 15] = "SFIXED32";
	ScalarType[ScalarType["SFIXED64"] = 16] = "SFIXED64";
	ScalarType[ScalarType["SINT32"] = 17] = "SINT32";
	ScalarType[ScalarType["SINT64"] = 18] = "SINT64";
})(ScalarType || (ScalarType = {}));
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/wire/varint.js
/**
* Read a 64 bit varint as two JS numbers.
*
* Stores the low and high words on the reader.
*
* Copyright 2008 Google Inc.  All rights reserved.
*
* See https://github.com/protocolbuffers/protobuf/blob/8a71927d74a4ce34efe2d8769fda198f52d20d12/js/experimental/runtime/kernel/buffer_decoder.js#L175
*/
function varint64read() {
	const buf = this.buf;
	let pos = this.pos;
	let lo = 0;
	let hi = 0;
	for (let shift = 0; shift < 28; shift += 7) {
		const b = buf[pos++];
		lo |= (b & 127) << shift;
		if ((b & 128) == 0) {
			this.pos = pos;
			this.assertBounds();
			this.varint64Lo = lo;
			this.varint64Hi = hi;
			return;
		}
	}
	const middleByte = buf[pos++];
	lo |= (middleByte & 15) << 28;
	hi = (middleByte & 112) >> 4;
	if ((middleByte & 128) == 0) {
		this.pos = pos;
		this.assertBounds();
		this.varint64Lo = lo;
		this.varint64Hi = hi;
		return;
	}
	for (let shift = 3; shift <= 31; shift += 7) {
		const b = buf[pos++];
		hi |= (b & 127) << shift;
		if ((b & 128) == 0) {
			this.pos = pos;
			this.assertBounds();
			this.varint64Lo = lo;
			this.varint64Hi = hi;
			return;
		}
	}
	throw new Error("invalid varint");
}
var TWO_PWR_32_DBL = 4294967296;
/**
* Parse decimal string of 64 bit integer value as two JS numbers.
*
* Copyright 2008 Google Inc.  All rights reserved.
*
* See https://github.com/protocolbuffers/protobuf-javascript/blob/a428c58273abad07c66071d9753bc4d1289de426/experimental/runtime/int64.js#L10
*/
function int64FromString(dec) {
	const minus = dec[0] === "-";
	if (minus) dec = dec.slice(1);
	const base = 1e6;
	let lowBits = 0;
	let highBits = 0;
	function add1e6digit(begin, end) {
		const digit1e6 = Number(dec.slice(begin, end));
		highBits *= base;
		lowBits = lowBits * base + digit1e6;
		if (lowBits >= TWO_PWR_32_DBL) {
			highBits = highBits + (lowBits / TWO_PWR_32_DBL | 0);
			lowBits = lowBits % TWO_PWR_32_DBL;
		}
	}
	add1e6digit(-24, -18);
	add1e6digit(-18, -12);
	add1e6digit(-12, -6);
	add1e6digit(-6);
	return minus ? negate(lowBits, highBits) : newBits(lowBits, highBits);
}
/**
* Losslessly converts a 64-bit signed integer in 32:32 split representation
* into a decimal string.
*
* Copyright 2008 Google Inc.  All rights reserved.
*
* See https://github.com/protocolbuffers/protobuf-javascript/blob/a428c58273abad07c66071d9753bc4d1289de426/experimental/runtime/int64.js#L10
*/
function int64ToString(lo, hi) {
	let bits = newBits(lo, hi);
	const negative = bits.hi & 2147483648;
	if (negative) bits = negate(bits.lo, bits.hi);
	const result = uInt64ToString(bits.lo, bits.hi);
	return negative ? "-" + result : result;
}
/**
* Losslessly converts a 64-bit unsigned integer in 32:32 split representation
* into a decimal string.
*
* Copyright 2008 Google Inc.  All rights reserved.
*
* See https://github.com/protocolbuffers/protobuf-javascript/blob/a428c58273abad07c66071d9753bc4d1289de426/experimental/runtime/int64.js#L10
*/
function uInt64ToString(lo, hi) {
	({lo, hi} = toUnsigned(lo, hi));
	if (hi <= 2097151) return String(TWO_PWR_32_DBL * hi + lo);
	const low = lo & 16777215;
	const mid = (lo >>> 24 | hi << 8) & 16777215;
	const high = hi >> 16 & 65535;
	let digitA = low + mid * 6777216 + high * 6710656;
	let digitB = mid + high * 8147497;
	let digitC = high * 2;
	const base = 1e7;
	if (digitA >= base) {
		digitB += Math.floor(digitA / base);
		digitA %= base;
	}
	if (digitB >= base) {
		digitC += Math.floor(digitB / base);
		digitB %= base;
	}
	return digitC.toString() + decimalFrom1e7WithLeadingZeros(digitB) + decimalFrom1e7WithLeadingZeros(digitA);
}
function toUnsigned(lo, hi) {
	return {
		lo: lo >>> 0,
		hi: hi >>> 0
	};
}
function newBits(lo, hi) {
	return {
		lo: lo | 0,
		hi: hi | 0
	};
}
/**
* Returns two's compliment negation of input.
* @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#Signed_32-bit_integers
*/
function negate(lowBits, highBits) {
	highBits = ~highBits;
	if (lowBits) lowBits = ~lowBits + 1;
	else highBits += 1;
	return newBits(lowBits, highBits);
}
/**
* Returns decimal representation of digit1e7 with leading zeros.
*/
var decimalFrom1e7WithLeadingZeros = (digit1e7) => {
	const partial = String(digit1e7);
	return "0000000".slice(partial.length) + partial;
};
/**
* Write a 32 bit varint, signed or unsigned. Same as `varint64write(0, value, bytes)`
*
* Copyright 2008 Google Inc.  All rights reserved.
*
* See https://github.com/protocolbuffers/protobuf/blob/1b18833f4f2a2f681f4e4a25cdf3b0a43115ec26/js/binary/encoder.js#L144
*/
function varint32write(value, bytes) {
	if (value >>> 0 < 128) {
		bytes.push(value);
		return;
	}
	if (value >= 0) {
		while (value > 127) {
			bytes.push(value & 127 | 128);
			value = value >>> 7;
		}
		bytes.push(value);
	} else {
		for (let i = 0; i < 9; i++) {
			bytes.push(value & 127 | 128);
			value = value >> 7;
		}
		bytes.push(1);
	}
}
/**
* Read an unsigned 32 bit varint.
*
* See https://github.com/protocolbuffers/protobuf/blob/8a71927d74a4ce34efe2d8769fda198f52d20d12/js/experimental/runtime/kernel/buffer_decoder.js#L220
*/
function varint32read() {
	let b = this.buf[this.pos++];
	if ((b & 128) === 0) {
		this.assertBounds();
		return b;
	}
	let result = b & 127;
	b = this.buf[this.pos++];
	result |= (b & 127) << 7;
	if ((b & 128) === 0) {
		this.assertBounds();
		return result;
	}
	b = this.buf[this.pos++];
	result |= (b & 127) << 14;
	if ((b & 128) === 0) {
		this.assertBounds();
		return result;
	}
	b = this.buf[this.pos++];
	result |= (b & 127) << 21;
	if ((b & 128) === 0) {
		this.assertBounds();
		return result;
	}
	b = this.buf[this.pos++];
	result |= (b & 15) << 28;
	for (let readBytes = 5; (b & 128) !== 0 && readBytes < 10; readBytes++) b = this.buf[this.pos++];
	if ((b & 128) !== 0) throw new Error("invalid varint");
	this.assertBounds();
	return result >>> 0;
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/proto-int64.js
/**
* Int64Support for the current environment.
*/
var protoInt64 = /*@__PURE__*/ makeInt64Support();
function makeInt64Support() {
	const dv = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
	if (typeof BigInt === "function" && typeof dv.getBigInt64 === "function" && typeof dv.getBigUint64 === "function" && typeof dv.setBigInt64 === "function" && typeof dv.setBigUint64 === "function" && (!!globalThis.Deno || !!globalThis.Bun || typeof processModule != "object" || typeof processModule.env != "object" || processModule.env.BUF_BIGINT_DISABLE !== "1")) {
		const MIN = BigInt("-9223372036854775808");
		const MAX = BigInt("9223372036854775807");
		const UMIN = BigInt("0");
		const UMAX = BigInt("18446744073709551615");
		return {
			zero: BigInt(0),
			supported: true,
			parse(value) {
				const bi = typeof value == "bigint" ? value : BigInt(value);
				if (bi > MAX || bi < MIN) throw new Error(`invalid int64: ${value}`);
				return bi;
			},
			uParse(value) {
				const bi = typeof value == "bigint" ? value : BigInt(value);
				if (bi > UMAX || bi < UMIN) throw new Error(`invalid uint64: ${value}`);
				return bi;
			},
			enc(value) {
				dv.setBigInt64(0, this.parse(value), true);
				return {
					lo: dv.getInt32(0, true),
					hi: dv.getInt32(4, true)
				};
			},
			uEnc(value) {
				dv.setBigInt64(0, this.uParse(value), true);
				return {
					lo: dv.getInt32(0, true),
					hi: dv.getInt32(4, true)
				};
			},
			dec(lo, hi) {
				dv.setInt32(0, lo, true);
				dv.setInt32(4, hi, true);
				return dv.getBigInt64(0, true);
			},
			uDec(lo, hi) {
				dv.setInt32(0, lo, true);
				dv.setInt32(4, hi, true);
				return dv.getBigUint64(0, true);
			}
		};
	}
	return {
		zero: "0",
		supported: false,
		parse(value) {
			if (typeof value != "string") value = value.toString();
			assertInt64String(value);
			return value;
		},
		uParse(value) {
			if (typeof value != "string") value = value.toString();
			assertUInt64String(value);
			return value;
		},
		enc(value) {
			if (typeof value != "string") value = value.toString();
			assertInt64String(value);
			return int64FromString(value);
		},
		uEnc(value) {
			if (typeof value != "string") value = value.toString();
			assertUInt64String(value);
			return int64FromString(value);
		},
		dec(lo, hi) {
			return int64ToString(lo, hi);
		},
		uDec(lo, hi) {
			return uInt64ToString(lo, hi);
		}
	};
}
function assertInt64String(value) {
	if (!/^-?[0-9]+$/.test(value)) throw new Error("invalid int64: " + value);
}
function assertUInt64String(value) {
	if (!/^[0-9]+$/.test(value)) throw new Error("invalid uint64: " + value);
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/scalar.js
/**
* Returns the zero value for the given scalar type, the value a field of this
* type has when unset: 0 for numeric types, "" for strings, false for
* booleans, and an empty Uint8Array for bytes. For 64-bit integer types, the
* result is "0" when longAsString is true, otherwise 0n.
*
* This is the type's zero value, not a proto2 custom field default. For float
* and double it is +0; isScalarZeroValue treats only +0, not -0, as this value.
*/
function scalarZeroValue(type, longAsString) {
	switch (type) {
		case ScalarType.STRING: return "";
		case ScalarType.BOOL: return false;
		case ScalarType.DOUBLE:
		case ScalarType.FLOAT: return 0;
		case ScalarType.INT64:
		case ScalarType.UINT64:
		case ScalarType.SFIXED64:
		case ScalarType.FIXED64:
		case ScalarType.SINT64: return longAsString ? "0" : protoInt64.zero;
		case ScalarType.BYTES: return /* @__PURE__ */ new Uint8Array(0);
		default: return 0;
	}
}
/**
* Returns true if the value is the zero value for the given scalar type: `0`
* for numeric types, `false` for booleans, `""` for strings, and an empty
* Uint8Array for bytes.
*
* This is the implicit-presence default check. A singular field with implicit
* presence is treated as unset, and omitted from the wire, when its value is
* the zero value. With explicit presence, or in repeated and map fields,
* presence is structural and this function does not apply.
*
* Note that -0 is NOT a zero value for float and double: under implicit
* presence, +0 is omitted from the wire but -0 is written, following the
* proto3 specification. As a result this can disagree with scalarEquals, which
* compares by value and treats -0 as equal to 0.
*/
function isScalarZeroValue(type, value) {
	switch (type) {
		case ScalarType.BOOL: return value === false;
		case ScalarType.STRING: return value === "";
		case ScalarType.BYTES: return value instanceof Uint8Array && !value.byteLength;
		case ScalarType.DOUBLE:
		case ScalarType.FLOAT: return Object.is(value, 0);
		default: return value == 0;
	}
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/unsafe.js
var IMPLICIT$5 = 2;
var unsafeLocal = Symbol.for("reflect unsafe local");
/**
* Return the selected field of a oneof group.
*
* @private
*/
function unsafeOneofCase(target, oneof) {
	const c = target[oneof.localName].case;
	if (c === void 0) return c;
	return oneof.fields.find((f) => f.localName === c);
}
/**
* Returns true if the field is set.
*
* @private
*/
function unsafeIsSet(target, field) {
	const name = field.localName;
	if (field.oneof) return target[field.oneof.localName].case === name;
	if (field.presence != IMPLICIT$5) return target[name] !== void 0 && Object.prototype.hasOwnProperty.call(target, name);
	switch (field.fieldKind) {
		case "list": return target[name].length > 0;
		case "map": return Object.keys(target[name]).length > 0;
		case "scalar": return !isScalarZeroValue(field.scalar, target[name]);
		case "enum": return target[name] !== field.enum.values[0].number;
	}
	throw new Error("message field with implicit presence");
}
/**
* Returns true if the field is set, but only for singular fields with explicit
* presence (proto2).
*
* @private
*/
function unsafeIsSetExplicit(target, localName) {
	return Object.prototype.hasOwnProperty.call(target, localName) && target[localName] !== void 0;
}
/**
* Return a field value, respecting oneof groups.
*
* @private
*/
function unsafeGet(target, field) {
	if (field.oneof) {
		const oneof = target[field.oneof.localName];
		if (oneof.case === field.localName) return oneof.value;
		return;
	}
	return target[field.localName];
}
/**
* Set a field value, respecting oneof groups.
*
* @private
*/
function unsafeSet(target, field, value) {
	if (field.oneof) target[field.oneof.localName] = {
		case: field.localName,
		value
	};
	else target[field.localName] = value;
}
/**
* Resets the field, so that unsafeIsSet() will return false.
*
* @private
*/
function unsafeClear(target, field) {
	const name = field.localName;
	if (field.oneof) {
		const oneofLocalName = field.oneof.localName;
		if (target[oneofLocalName].case === name) target[oneofLocalName] = { case: void 0 };
	} else if (field.presence != IMPLICIT$5) delete target[name];
	else switch (field.fieldKind) {
		case "map":
			target[name] = {};
			break;
		case "list":
			target[name] = [];
			break;
		case "enum":
			target[name] = field.enum.values[0].number;
			break;
		case "scalar":
			target[name] = scalarZeroValue(field.scalar, field.longAsString);
			break;
	}
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/guard.js
function isObject(arg) {
	return arg !== null && typeof arg == "object" && !Array.isArray(arg);
}
function isReflectList(arg, field) {
	var _a, _b, _c, _d;
	if (isObject(arg) && unsafeLocal in arg && "add" in arg && "field" in arg && typeof arg.field == "function") {
		if (field !== void 0) {
			const a = field;
			const b = arg.field();
			return a.listKind == b.listKind && a.scalar === b.scalar && ((_a = a.message) === null || _a === void 0 ? void 0 : _a.typeName) === ((_b = b.message) === null || _b === void 0 ? void 0 : _b.typeName) && ((_c = a.enum) === null || _c === void 0 ? void 0 : _c.typeName) === ((_d = b.enum) === null || _d === void 0 ? void 0 : _d.typeName);
		}
		return true;
	}
	return false;
}
function isReflectMap(arg, field) {
	var _a, _b, _c, _d;
	if (isObject(arg) && unsafeLocal in arg && "has" in arg && "field" in arg && typeof arg.field == "function") {
		if (field !== void 0) {
			const a = field, b = arg.field();
			return a.mapKey === b.mapKey && a.mapKind == b.mapKind && a.scalar === b.scalar && ((_a = a.message) === null || _a === void 0 ? void 0 : _a.typeName) === ((_b = b.message) === null || _b === void 0 ? void 0 : _b.typeName) && ((_c = a.enum) === null || _c === void 0 ? void 0 : _c.typeName) === ((_d = b.enum) === null || _d === void 0 ? void 0 : _d.typeName);
		}
		return true;
	}
	return false;
}
function isReflectMessage(arg, messageDesc) {
	return isObject(arg) && unsafeLocal in arg && "desc" in arg && isObject(arg.desc) && arg.desc.kind === "message" && (messageDesc === void 0 || arg.desc.typeName == messageDesc.typeName);
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/wkt/wrappers.js
function isWrapper(arg) {
	return isWrapperTypeName(arg.$typeName);
}
function isWrapperDesc(messageDesc) {
	const f = messageDesc.fields[0];
	return isWrapperTypeName(messageDesc.typeName) && f !== void 0 && f.fieldKind == "scalar" && f.name == "value" && f.number == 1;
}
/**
* Returns true if the descriptor is a well-known type with a custom JSON
* representation per the protobuf JSON spec. Examples: Timestamp as an
* RFC 3339 string, Duration as "5s", wrappers as the unwrapped scalar.
*
* When packed inside `google.protobuf.Any`, these messages are serialized
* as `{"@type": ..., "value": <custom form>}`; all other messages embed
* their fields directly.
*/
function hasCustomJsonRepresentation(desc) {
	switch (desc.typeName) {
		case "google.protobuf.Any":
		case "google.protobuf.Timestamp":
		case "google.protobuf.Duration":
		case "google.protobuf.FieldMask":
		case "google.protobuf.Struct":
		case "google.protobuf.Value":
		case "google.protobuf.ListValue": return true;
		default: return isWrapperDesc(desc);
	}
}
var wrapperTypeNames = /*@__PURE__*/ new Set([
	"google.protobuf.DoubleValue",
	"google.protobuf.FloatValue",
	"google.protobuf.Int64Value",
	"google.protobuf.UInt64Value",
	"google.protobuf.Int32Value",
	"google.protobuf.UInt32Value",
	"google.protobuf.BoolValue",
	"google.protobuf.StringValue",
	"google.protobuf.BytesValue"
]);
function isWrapperTypeName(name) {
	return wrapperTypeNames.has(name);
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/create.js
var EDITION_PROTO3$1 = 999;
var EDITION_PROTO2$1 = 998;
var IMPLICIT$4 = 2;
/**
* Create a new message instance.
*
* The second argument is an optional initializer object, where all fields are
* optional.
*/
function create(schema, init) {
	if (isMessage(init, schema)) return init;
	return compiledCreate(schema)(init);
}
var compiledCreates = /* @__PURE__ */ new WeakMap();
/**
* Return the compiled create function for a message, compiling it on first use. */
function compiledCreate(desc) {
	let compiled = compiledCreates.get(desc);
	if (compiled === void 0) {
		compiled = compileCreate(desc);
		compiledCreates.set(desc, compiled);
	}
	return compiled;
}
/** Singular field: scalar, enum, or message. */
var INIT_SINGULAR = 0;
/** List field: a zero message has a fresh empty array. */
var INIT_LIST = 1;
/** Map field: a zero message has a fresh empty object. */
var INIT_MAP = 2;
/** Oneof group: the ADT is always stored, cases convert by case name. */
var INIT_ONEOF = 3;
function compileCreate(desc) {
	const typeName = desc.typeName;
	const { properties, prototype } = compileInitMessage(desc);
	return (init) => {
		let message;
		if (prototype !== void 0) {
			message = Object.create(prototype);
			message.$typeName = typeName;
		} else message = { $typeName: typeName };
		for (let i = 0; i < properties.length; i++) {
			const property = properties[i];
			const name = property.name;
			const initValue = init === null || init === void 0 ? void 0 : init[name];
			switch (property.kind) {
				case INIT_SINGULAR:
					if (initValue != null) message[name] = property.convert !== void 0 ? property.convert(initValue) : initValue;
					else if (property.constant !== void 0) message[name] = property.constant;
					break;
				case INIT_LIST:
					message[name] = property.convert !== void 0 && Array.isArray(initValue) ? initValue.map(property.convert) : initValue !== null && initValue !== void 0 ? initValue : [];
					break;
				case INIT_MAP:
					if (property.convert === void 0 || !isObject(initValue)) message[name] = initValue !== null && initValue !== void 0 ? initValue : {};
					else {
						const converted = {};
						const keys = Object.keys(initValue);
						for (let k = 0; k < keys.length; k++) converted[keys[k]] = property.convert(initValue[keys[k]]);
						message[name] = converted;
					}
					break;
				case INIT_ONEOF: {
					const oneofValue = initValue;
					if ((oneofValue === null || oneofValue === void 0 ? void 0 : oneofValue.case) != null) {
						const convert = property.convert.get(oneofValue.case);
						if (convert !== void 0) {
							message[name] = {
								case: oneofValue.case,
								value: convert(oneofValue.value)
							};
							break;
						}
					}
					message[name] = { case: void 0 };
					break;
				}
			}
		}
		return message;
	};
}
/**
* Classify every member once, so that creating a message is a walk over a
* compact list instead of a walk over the descriptor.
*/
function compileInitMessage(desc) {
	var _a, _b;
	const properties = [];
	const prototype = {};
	const usePrototype = needsPrototypeChain(desc);
	for (const member of desc.members) {
		const name = member.localName;
		if (member.kind == "oneof") {
			properties.push({
				name,
				kind: INIT_ONEOF,
				constant: void 0,
				convert: compileConvertOneof(member)
			});
			continue;
		}
		switch (member.fieldKind) {
			case "message":
				properties.push({
					name,
					kind: INIT_SINGULAR,
					constant: void 0,
					convert: compileConvertMessage(member)
				});
				break;
			case "list":
				properties.push({
					name,
					kind: INIT_LIST,
					constant: void 0,
					convert: member.listKind == "message" ? (_a = compileConvertMessage(member)) !== null && _a !== void 0 ? _a : ((value) => value) : member.scalar == ScalarType.BYTES ? toU8Arr : void 0
				});
				break;
			case "map":
				properties.push({
					name,
					kind: INIT_MAP,
					constant: void 0,
					convert: member.mapKind == "message" ? (_b = compileConvertMessage(member)) !== null && _b !== void 0 ? _b : ((value) => value) : member.scalar == ScalarType.BYTES ? toU8Arr : void 0
				});
				break;
			default: {
				const zeroValue = createZeroValue(member);
				properties.push({
					name,
					kind: INIT_SINGULAR,
					constant: member.presence == IMPLICIT$4 ? zeroValue : void 0,
					convert: member.fieldKind == "scalar" && member.scalar == ScalarType.BYTES ? toU8Arr : void 0
				});
				if (usePrototype) prototype[name] = zeroValue;
				break;
			}
		}
	}
	return {
		properties,
		prototype: usePrototype ? prototype : void 0
	};
}
/**
* Compile the conversion of each case of a oneof group, keyed by case name.
*/
function compileConvertOneof(oneof) {
	const converters = /* @__PURE__ */ new Map();
	for (const field of oneof.fields) {
		let convert;
		if (field.fieldKind == "message") convert = compileConvertMessage(field);
		else if (field.fieldKind == "scalar" && field.scalar == ScalarType.BYTES) convert = toU8Arr;
		converters.set(field.localName, convert !== null && convert !== void 0 ? convert : ((value) => value));
	}
	return converters;
}
/**
* Compile the conversion of an init value for a message field, a message
* list item, or a message map value. Returns undefined if values are used
* as-is.
*/
function compileConvertMessage(field) {
	if (field.fieldKind == "message" && !field.oneof && isWrapperDesc(field.message)) return field.message.fields[0].scalar == ScalarType.BYTES ? toU8Arr : void 0;
	if (field.message.typeName == "google.protobuf.Struct" && field.parent.typeName !== "google.protobuf.Value") return;
	const messageDesc = field.message;
	let compiled;
	return (value) => {
		if (!isObject(value) || isMessage(value, messageDesc)) return value;
		compiled !== null && compiled !== void 0 || (compiled = compiledCreate(messageDesc));
		return compiled(value);
	};
}
function toU8Arr(value) {
	return Array.isArray(value) ? new Uint8Array(value) : value;
}
/**
* Do we need the prototype chain to track field presence?
*/
function needsPrototypeChain(desc) {
	switch (desc.file.edition) {
		case EDITION_PROTO3$1: return false;
		case EDITION_PROTO2$1: return true;
		default: return desc.fields.some((f) => f.presence != IMPLICIT$4 && f.fieldKind != "message" && !f.oneof);
	}
}
/**
* Returns the zero value for a scalar or enum field. Scalar and enum fields
* can have default values.
*/
function createZeroValue(field) {
	const defaultValue = field.getDefaultValue();
	if (defaultValue !== void 0) return field.fieldKind == "scalar" && field.longAsString ? defaultValue.toString() : defaultValue;
	return field.fieldKind == "scalar" ? scalarZeroValue(field.scalar, field.longAsString) : field.enum.values[0].number;
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/error.js
var errorNames = [
	"FieldValueInvalidError",
	"FieldListRangeError",
	"ForeignFieldError"
];
var FieldError = class extends Error {
	constructor(fieldOrOneof, message, name = "FieldValueInvalidError") {
		super(message);
		this.name = name;
		this.field = () => fieldOrOneof;
	}
};
function isFieldError(arg) {
	return arg instanceof Error && errorNames.includes(arg.name) && "field" in arg && typeof arg.field == "function";
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/wire/text-encoding.js
var symbol = Symbol.for("@bufbuild/protobuf/text-encoding");
/**
* Protobuf-ES requires the Text Encoding API to convert UTF-8 from and to
* binary. This WHATWG API is widely available, but it is not part of the
* ECMAScript standard. On runtimes where it is not available, use this
* function to provide your own implementation.
*
* Providing `encodeUtf8Into` is optional for backwards compatibility. If it
* is omitted, we emulate it with a wrapper that calls `encodeUtf8`.
*
* Note that the Text Encoding API does not provide a way to validate UTF-8.
* Our implementation uses String.prototype.isWellFormed, and falls back
* to use encodeURIComponent().
*/
function configureTextEncoding(textEncoding) {
	var _a;
	globalThis[symbol] = Object.assign(Object.assign({}, textEncoding), { encodeUtf8Into: (_a = textEncoding.encodeUtf8Into) !== null && _a !== void 0 ? _a : emulateEncodeInto(textEncoding.encodeUtf8.bind(textEncoding)) });
}
function getTextEncoding() {
	const globals = globalThis;
	if (!globals[symbol]) {
		const textEncoder = new globals.TextEncoder();
		const textDecoder = new globals.TextDecoder();
		let textDecoderStrict;
		const config = {
			encodeUtf8(text) {
				return textEncoder.encode(text);
			},
			decodeUtf8(bytes, strict) {
				if (strict) {
					if (!textDecoderStrict) textDecoderStrict = new globals.TextDecoder("utf-8", { fatal: true });
					return textDecoderStrict.decode(bytes);
				}
				return textDecoder.decode(bytes);
			},
			checkUtf8(text) {
				try {
					return true;
				} catch (_) {
					return false;
				}
			}
		};
		if (textEncoder.encodeInto) config.encodeUtf8Into = textEncoder.encodeInto.bind(textEncoder);
		const nativeStringIsWellFormed = String.prototype.isWellFormed;
		if (nativeStringIsWellFormed) config.checkUtf8 = (text) => {
			return nativeStringIsWellFormed.call(text);
		};
		configureTextEncoding(config);
	}
	return globals[symbol];
}
/**
* Simplistic polyfill for encodeUtf8Into.
*
* @private
*/
function emulateEncodeInto(encodeUtf8) {
	return (text, dest) => {
		const bytes = encodeUtf8(text);
		dest.set(bytes);
		return { written: bytes.byteLength };
	};
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/wire/binary-encoding.js
/**
* Protobuf binary format wire types.
*
* A wire type provides just enough information to find the length of the
* following value.
*
* See https://developers.google.com/protocol-buffers/docs/encoding#structure
*/
var WireType;
(function(WireType) {
	/**
	* Used for int32, int64, uint32, uint64, sint32, sint64, bool, enum
	*/
	WireType[WireType["Varint"] = 0] = "Varint";
	/**
	* Used for fixed64, sfixed64, double.
	* Always 8 bytes with little-endian byte order.
	*/
	WireType[WireType["Bit64"] = 1] = "Bit64";
	/**
	* Used for string, bytes, embedded messages, packed repeated fields
	*
	* Only repeated numeric types (types which use the varint, 32-bit,
	* or 64-bit wire types) can be packed. In proto3, such fields are
	* packed by default.
	*/
	WireType[WireType["LengthDelimited"] = 2] = "LengthDelimited";
	/**
	* Start of a tag-delimited aggregate, such as a proto2 group, or a message
	* in editions with message_encoding = DELIMITED.
	*/
	WireType[WireType["StartGroup"] = 3] = "StartGroup";
	/**
	* End of a tag-delimited aggregate.
	*/
	WireType[WireType["EndGroup"] = 4] = "EndGroup";
	/**
	* Used for fixed32, sfixed32, float.
	* Always 4 bytes with little-endian byte order.
	*/
	WireType[WireType["Bit32"] = 5] = "Bit32";
})(WireType || (WireType = {}));
var BinaryWriter = class {
	constructor(encodeUtf8) {
		/**
		* Previous fork positions (the write position at the time
		* `fork()` was called).
		*/
		this.stackPos = [];
		this.encodeUtf8Into = encodeUtf8 ? emulateEncodeInto(encodeUtf8) : getTextEncoding().encodeUtf8Into;
		this.buffer = EMPTY_BUFFER;
		this.viewCache = EMPTY_VIEW;
		this.pos = 0;
	}
	ensureCapacity(size) {
		const required = this.pos + size;
		if (required > this.buffer.length) {
			let newLen = this.buffer.length || INITIAL_SIZE;
			while (newLen < required) newLen *= 2;
			const newBuf = new Uint8Array(newLen);
			if (this.pos > 0) newBuf.set(this.buffer);
			this.buffer = newBuf;
		}
	}
	/**
	* The DataView over `buffer`, rebuilt only if the buffer has grown since it
	* was last used.
	*/
	view() {
		const bytes = this.buffer;
		const view = this.viewCache;
		if (view.byteLength === bytes.byteLength) return view;
		const newView = new DataView(bytes.buffer);
		this.viewCache = newView;
		return newView;
	}
	/**
	* Return all bytes written and reset this writer.
	*/
	finish() {
		const result = this.buffer.slice(0, this.pos);
		this.pos = 0;
		this.stackPos = [];
		return result;
	}
	/**
	* Start a new fork for length-delimited data like a message
	* or a packed repeated field.
	*
	* Must be joined later with `join()`.
	*/
	fork() {
		this.stackPos.push(this.pos);
		this.ensureCapacity(DEFAULT_LEN_PREFIX_SIZE);
		this.buffer[this.pos++] = 0;
		return this;
	}
	/**
	* Join the last fork. Write its length and bytes, then
	* return to the previous state.
	*/
	join() {
		const forkPos = this.stackPos.pop();
		if (forkPos === void 0) throw new Error("invalid state, fork stack empty");
		const len = this.pos - forkPos - DEFAULT_LEN_PREFIX_SIZE;
		const lenPrefixSize = varint32Size(len);
		if (lenPrefixSize > DEFAULT_LEN_PREFIX_SIZE) {
			this.ensureCapacity(lenPrefixSize - DEFAULT_LEN_PREFIX_SIZE);
			this.buffer.copyWithin(forkPos + lenPrefixSize, forkPos + DEFAULT_LEN_PREFIX_SIZE, this.pos);
		}
		this.pos = forkPos;
		this.uint32(len);
		this.pos += len;
		return this;
	}
	/**
	* Writes a tag (field number and wire type).
	*
	* Equivalent to `uint32( (fieldNo << 3 | type) >>> 0 )`.
	*
	* Generated code should compute the tag ahead of time and call `uint32()`.
	*/
	tag(fieldNo, type) {
		return this.uint32((fieldNo << 3 | type) >>> 0);
	}
	/**
	* Write a chunk of raw bytes.
	*/
	raw(chunk) {
		this.ensureCapacity(chunk.length);
		this.buffer.set(chunk, this.pos);
		this.pos += chunk.length;
		return this;
	}
	/**
	* Write a `uint32` value, an unsigned 32 bit varint.
	*/
	uint32(value) {
		assertUInt32(value);
		this.ensureCapacity(5);
		if (value < 128) {
			this.buffer[this.pos++] = value;
			return this;
		}
		while (value > 127) {
			this.buffer[this.pos++] = value & 127 | 128;
			value >>>= 7;
		}
		this.buffer[this.pos++] = value;
		return this;
	}
	/**
	* Write a `int32` value, a signed 32 bit varint.
	*/
	int32(value) {
		assertInt32(value);
		if (value >= 0) return this.uint32(value);
		this.ensureCapacity(10);
		for (let i = 0; i < 9; i++) {
			this.buffer[this.pos++] = value & 127 | 128;
			value >>= 7;
		}
		this.buffer[this.pos++] = 1;
		return this;
	}
	/**
	* Write a `bool` value, a varint.
	*/
	bool(value) {
		this.ensureCapacity(1);
		this.buffer[this.pos++] = value ? 1 : 0;
		return this;
	}
	/**
	* Write a `bytes` value, length-delimited arbitrary data.
	*/
	bytes(value) {
		this.uint32(value.byteLength);
		return this.raw(value);
	}
	/**
	* Write a `string` value, length-delimited data converted to UTF-8 text.
	*/
	string(value) {
		if (typeof value !== "string") value = String(value);
		const len = value.length;
		if (len <= ASCII_MAX_LENGTH) {
			this.ensureCapacity(len + 1);
			const ascii = this.buffer;
			let pos = this.pos;
			ascii[pos++] = len;
			let i = 0;
			for (; i < len; i++) {
				const code = value.charCodeAt(i);
				if (code > 127) break;
				ascii[pos++] = code;
			}
			if (i == len) {
				this.pos = pos;
				return this;
			}
		}
		this.ensureCapacity(len * 3 + 5);
		const lenPrefixSizeGuess = varint32Size(len);
		const buf = this.buffer;
		const start = this.pos;
		const { written } = this.encodeUtf8Into(value, buf.subarray(start + lenPrefixSizeGuess));
		const lenPrefixSize = varint32Size(written);
		if (lenPrefixSize != lenPrefixSizeGuess) buf.copyWithin(start + lenPrefixSize, start + lenPrefixSizeGuess, start + lenPrefixSizeGuess + written);
		this.uint32(written);
		this.pos += written;
		return this;
	}
	/**
	* Write a `float` value, 32-bit floating point number.
	*/
	float(value) {
		assertFloat32(value);
		this.ensureCapacity(4);
		this.view().setFloat32(this.pos, value, true);
		this.pos += 4;
		return this;
	}
	/**
	* Write a `double` value, a 64-bit floating point number.
	*/
	double(value) {
		this.ensureCapacity(8);
		this.view().setFloat64(this.pos, value, true);
		this.pos += 8;
		return this;
	}
	/**
	* Write a `fixed32` value, an unsigned, fixed-length 32-bit integer.
	*/
	fixed32(value) {
		assertUInt32(value);
		this.ensureCapacity(4);
		this.view().setUint32(this.pos, value, true);
		this.pos += 4;
		return this;
	}
	/**
	* Write a `sfixed32` value, a signed, fixed-length 32-bit integer.
	*/
	sfixed32(value) {
		assertInt32(value);
		this.ensureCapacity(4);
		this.view().setInt32(this.pos, value, true);
		this.pos += 4;
		return this;
	}
	/**
	* Write a `sint32` value, a signed, zigzag-encoded 32-bit varint.
	*/
	sint32(value) {
		assertInt32(value);
		return this.uint32((value << 1 ^ value >> 31) >>> 0);
	}
	/**
	* Write a `sfixed64` value, a signed, fixed-length 64-bit integer.
	*/
	sfixed64(value) {
		const tc = protoInt64.enc(value);
		this.ensureCapacity(8);
		const view = this.view();
		view.setInt32(this.pos, tc.lo, true);
		view.setInt32(this.pos + 4, tc.hi, true);
		this.pos += 8;
		return this;
	}
	/**
	* Write a `fixed64` value, an unsigned, fixed-length 64 bit integer.
	*/
	fixed64(value) {
		const tc = protoInt64.uEnc(value);
		this.ensureCapacity(8);
		const view = this.view();
		view.setInt32(this.pos, tc.lo, true);
		view.setInt32(this.pos + 4, tc.hi, true);
		this.pos += 8;
		return this;
	}
	/**
	* Write a `int64` value, a signed 64-bit varint.
	*/
	int64(value) {
		const tc = protoInt64.enc(value);
		return this.writeVarint64(tc.lo, tc.hi);
	}
	/**
	* Write a `sint64` value, a signed, zig-zag-encoded 64-bit varint.
	*/
	sint64(value) {
		const tc = protoInt64.enc(value), sign = tc.hi >> 31, lo = tc.lo << 1 ^ sign, hi = (tc.hi << 1 | tc.lo >>> 31) ^ sign;
		return this.writeVarint64(lo, hi);
	}
	/**
	* Write a `uint64` value, an unsigned 64-bit varint.
	*/
	uint64(value) {
		const tc = protoInt64.uEnc(value);
		return this.writeVarint64(tc.lo, tc.hi);
	}
	/**
	* Write a 64-bit varint directly into the buffer. Accepts the value as
	* split low/high 32-bit words.
	*
	* Ported from varint64write() to avoid the intermediate number[] buffer.
	* See https://github.com/protocolbuffers/protobuf/blob/8a71927d74a4ce34efe2d8769fda198f52d20d12/js/experimental/runtime/kernel/writer.js#L344
	*/
	writeVarint64(lo, hi) {
		this.ensureCapacity(10);
		const buf = this.buffer;
		let pos = this.pos;
		for (let i = 0; i < 28; i = i + 7) {
			const shift = lo >>> i;
			const hasNext = !(shift >>> 7 == 0 && hi == 0);
			buf[pos++] = (hasNext ? shift | 128 : shift) & 255;
			if (!hasNext) {
				this.pos = pos;
				return this;
			}
		}
		const splitBits = lo >>> 28 & 15 | (hi & 7) << 4;
		const hasMoreBits = !(hi >> 3 == 0);
		buf[pos++] = (hasMoreBits ? splitBits | 128 : splitBits) & 255;
		if (!hasMoreBits) {
			this.pos = pos;
			return this;
		}
		for (let i = 3; i < 31; i = i + 7) {
			const shift = hi >>> i;
			const hasNext = !(shift >>> 7 == 0);
			buf[pos++] = (hasNext ? shift | 128 : shift) & 255;
			if (!hasNext) {
				this.pos = pos;
				return this;
			}
		}
		buf[pos++] = hi >>> 31 & 1;
		this.pos = pos;
		return this;
	}
};
/**
* Capacity of the buffer allocated by the first write..
*/
var INITIAL_SIZE = 128;
/**
* Bytes `fork()` reserves for the length prefix, betting that the payload will
* be under 128 bytes. `join()` fills them in, and widens them if the bet was
* wrong.
*/
var DEFAULT_LEN_PREFIX_SIZE = 1;
/**
* Shared empty buffer used as the initial value before the first write.
* Avoids allocating and zeroing `INITIAL_SIZE` bytes per BinaryWriter when a
* writer is only used for a tiny message (or not used at all).
*/
var EMPTY_BUFFER = /* @__PURE__ */ new Uint8Array(0);
/**
* Shared empty view, paired with `EMPTY_BUFFER`. Never written to: any
* fixed-width write first grows the buffer, which replaces this view.
*/
var EMPTY_VIEW = new DataView(EMPTY_BUFFER.buffer);
/**
* Longest string on the ASCII fast paths. Must stay below 0x80, so
* that the writer's length prefix always fits a single varint byte.
*/
var ASCII_MAX_LENGTH = 32;
/**
* Number of bytes needed to encode `value` as an unsigned 32-bit varint.
*/
function varint32Size(value) {
	if (value < 128) return 1;
	if (value < 16384) return 2;
	if (value < 2097152) return 3;
	if (value < 268435456) return 4;
	return 5;
}
var BinaryReader = class {
	constructor(buf, decodeUtf8 = getTextEncoding().decodeUtf8) {
		this.decodeUtf8 = decodeUtf8;
		this.varint64Lo = 0;
		this.varint64Hi = 0;
		this.varint64 = varint64read;
		/**
		* Read a `uint32` field, an unsigned 32 bit varint.
		*/
		this.uint32 = varint32read;
		this.buf = buf;
		this.len = buf.length;
		this.pos = 0;
		this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	}
	/**
	* Reads a tag - field number and wire type. Tags are uint32 varints; values
	* that do not fit in uint32 are rejected.
	*/
	tag() {
		const start = this.pos;
		const tag = this.uint32();
		const bytesRead = this.pos - start;
		if (bytesRead > 5 || bytesRead == 5 && this.buf[this.pos - 1] > 15) throw new Error("illegal tag: varint overflows uint32");
		const fieldNo = tag >>> 3;
		const wireType = tag & 7;
		if (fieldNo <= 0 || wireType > 5) throw new Error("illegal tag: field no " + fieldNo + " wire type " + wireType);
		return [fieldNo, wireType];
	}
	/**
	* Skip one element and return the skipped data.
	*
	* When skipping StartGroup, provide the tags field number to check for
	* matching field number in the EndGroup tag. Recursion into nested groups
	* is guarded by the `recursionLimit` argument: When the limit is reached,
	* this method throws.
	*/
	skip(wireType, fieldNo, recursionLimit = 100) {
		let start = this.pos;
		switch (wireType) {
			case WireType.Varint:
				while (this.buf[this.pos++] & 128);
				break;
			case WireType.Bit64: this.pos += 4;
			case WireType.Bit32:
				this.pos += 4;
				break;
			case WireType.LengthDelimited:
				let len = this.uint32();
				this.pos += len;
				break;
			case WireType.StartGroup:
				if (recursionLimit <= 0) throw new Error("maximum recursion depth reached");
				for (;;) {
					const [fn, wt] = this.tag();
					if (wt === WireType.EndGroup) {
						if (fieldNo !== void 0 && fn !== fieldNo) throw new Error("invalid end group tag");
						break;
					}
					this.skip(wt, fn, recursionLimit - 1);
				}
				break;
			default: throw new Error("cant skip wire type " + wireType);
		}
		this.assertBounds();
		return this.buf.subarray(start, this.pos);
	}
	/**
	* Throws error if position in byte array is out of range.
	*/
	assertBounds() {
		if (this.pos > this.len) throw new RangeError("premature EOF");
	}
	/**
	* Read a `int32` field, a signed 32 bit varint.
	*/
	int32() {
		return this.uint32() | 0;
	}
	/**
	* Read a `sint32` field, a signed, zigzag-encoded 32-bit varint.
	*/
	sint32() {
		let zze = this.uint32();
		return zze >>> 1 ^ -(zze & 1);
	}
	/**
	* Read a `int64` field, a signed 64-bit varint.
	*/
	int64() {
		this.varint64();
		return protoInt64.dec(this.varint64Lo, this.varint64Hi);
	}
	/**
	* Read a `uint64` field, an unsigned 64-bit varint.
	*/
	uint64() {
		this.varint64();
		return protoInt64.uDec(this.varint64Lo, this.varint64Hi);
	}
	/**
	* Read a `sint64` field, a signed, zig-zag-encoded 64-bit varint.
	*/
	sint64() {
		this.varint64();
		let lo = this.varint64Lo;
		let hi = this.varint64Hi;
		let s = -(lo & 1);
		lo = (lo >>> 1 | (hi & 1) << 31) ^ s;
		hi = hi >>> 1 ^ s;
		return protoInt64.dec(lo, hi);
	}
	/**
	* Read a `bool` field, a variant.
	*/
	bool() {
		const b = this.buf[this.pos];
		if (b < 128) {
			this.pos++;
			return b !== 0;
		}
		this.varint64();
		return this.varint64Lo !== 0 || this.varint64Hi !== 0;
	}
	/**
	* Read a `fixed32` field, an unsigned, fixed-length 32-bit integer.
	*/
	fixed32() {
		return this.view.getUint32((this.pos += 4) - 4, true);
	}
	/**
	* Read a `sfixed32` field, a signed, fixed-length 32-bit integer.
	*/
	sfixed32() {
		return this.view.getInt32((this.pos += 4) - 4, true);
	}
	/**
	* Read a `fixed64` field, an unsigned, fixed-length 64 bit integer.
	*/
	fixed64() {
		return protoInt64.uDec(this.sfixed32(), this.sfixed32());
	}
	/**
	* Read a `fixed64` field, a signed, fixed-length 64-bit integer.
	*/
	sfixed64() {
		return protoInt64.dec(this.sfixed32(), this.sfixed32());
	}
	/**
	* Read a `float` field, 32-bit floating point number.
	*/
	float() {
		return this.view.getFloat32((this.pos += 4) - 4, true);
	}
	/**
	* Read a `double` field, a 64-bit floating point number.
	*/
	double() {
		return this.view.getFloat64((this.pos += 8) - 8, true);
	}
	/**
	* Read a `bytes` field, length-delimited arbitrary data.
	*/
	bytes() {
		let len = this.uint32(), start = this.pos;
		this.pos += len;
		this.assertBounds();
		return this.buf.subarray(start, start + len);
	}
	/**
	* Read a `string` field, length-delimited data converted to UTF-8 text. If
	* `strict` is true, throw on invalid UTF-8 instead of substituting U+FFFD.
	*/
	string(strict) {
		const bytes = this.bytes();
		const len = bytes.length;
		if (len <= ASCII_MAX_LENGTH) {
			const codes = new Array(len);
			for (let i = 0; i < len; i++) {
				const byte = bytes[i];
				if (byte > 127) return this.decodeUtf8(bytes, strict);
				codes[i] = byte;
			}
			return String.fromCharCode.apply(String, codes);
		}
		return this.decodeUtf8(bytes, strict);
	}
};
/**
* Assert a valid signed protobuf 32-bit integer as a number or string.
*/
function assertInt32(arg) {
	if (typeof arg == "string") arg = Number(arg);
	else if (typeof arg != "number") throw new Error("invalid int32: " + typeof arg);
	if (!Number.isInteger(arg) || arg > 2147483647 || arg < -2147483648) throw new Error("invalid int32: " + arg);
}
/**
* Assert a valid unsigned protobuf 32-bit integer as a number or string.
*/
function assertUInt32(arg) {
	if (typeof arg == "string") arg = Number(arg);
	else if (typeof arg != "number") throw new Error("invalid uint32: " + typeof arg);
	if (!Number.isInteger(arg) || arg > 4294967295 || arg < 0) throw new Error("invalid uint32: " + arg);
}
/**
* Assert a valid protobuf float value as a number or string.
*/
function assertFloat32(arg) {
	if (typeof arg == "string") {
		const o = arg;
		arg = Number(arg);
		if (Number.isNaN(arg) && o !== "NaN") throw new Error("invalid float32: " + o);
	} else if (typeof arg != "number") throw new Error("invalid float32: " + typeof arg);
	if (Number.isFinite(arg) && (arg > 34028234663852886e22 || arg < -34028234663852886e22)) throw new Error("invalid float32: " + arg);
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/reflect-check.js
/**
* Check whether the given field value is valid for the reflect API.
*/
function checkField(field, value) {
	const check = field.fieldKind == "list" ? isReflectList(value, field) : field.fieldKind == "map" ? isReflectMap(value, field) : checkSingular(field, value);
	if (check === true) return;
	let reason;
	switch (field.fieldKind) {
		case "list":
			reason = `expected ${formatReflectList(field)}, got ${formatVal(value)}`;
			break;
		case "map":
			reason = `expected ${formatReflectMap(field)}, got ${formatVal(value)}`;
			break;
		default: reason = reasonSingular(field, value, check);
	}
	return new FieldError(field, reason);
}
/**
* Check whether the given list item is valid for the reflect API.
*/
function checkListItem(field, index, value) {
	const check = checkSingular(field, value);
	if (check !== true) return new FieldError(field, `list item #${index + 1}: ${reasonSingular(field, value, check)}`);
}
/**
* Check whether the given map key and value are valid for the reflect API.
*/
function checkMapEntry(field, key, value) {
	const checkKey = checkScalarValue(field.mapKey)(key);
	if (checkKey !== true) return new FieldError(field, `invalid map key: ${reasonSingular({ scalar: field.mapKey }, key, checkKey)}`);
	const checkVal = checkSingular(field, value);
	if (checkVal !== true) return new FieldError(field, `map entry ${formatVal(key)}: ${reasonSingular(field, value, checkVal)}`);
}
function checkSingular(field, value) {
	if (field.scalar !== void 0) return checkScalarValue(field.scalar)(value);
	if (field.enum !== void 0) {
		if (field.enum.open) return checkScalarValue(ScalarType.INT32)(value);
		return field.enum.values.some((v) => v.number === value);
	}
	return isReflectMessage(value, field.message);
}
/**
* Return the check for values of the given scalar type.
*
* @private
*/
function checkScalarValue(scalar) {
	switch (scalar) {
		case ScalarType.DOUBLE: return (value) => typeof value == "number";
		case ScalarType.FLOAT: return (value) => {
			if (typeof value != "number") return false;
			if (Number.isNaN(value) || !Number.isFinite(value)) return true;
			if (value > 34028234663852886e22 || value < -34028234663852886e22) return `${value.toFixed()} out of range`;
			return true;
		};
		case ScalarType.INT32:
		case ScalarType.SFIXED32:
		case ScalarType.SINT32: return (value) => {
			if (typeof value !== "number" || !Number.isInteger(value)) return false;
			if (value > 2147483647 || value < -2147483648) return `${value.toFixed()} out of range`;
			return true;
		};
		case ScalarType.FIXED32:
		case ScalarType.UINT32: return (value) => {
			if (typeof value !== "number" || !Number.isInteger(value)) return false;
			if (value > 4294967295 || value < 0) return `${value.toFixed()} out of range`;
			return true;
		};
		case ScalarType.BOOL: return (value) => typeof value == "boolean";
		case ScalarType.STRING: return (value) => {
			if (typeof value != "string") return false;
			return getTextEncoding().checkUtf8(value) || "invalid UTF8";
		};
		case ScalarType.BYTES: return (value) => value instanceof Uint8Array;
		case ScalarType.INT64:
		case ScalarType.SFIXED64:
		case ScalarType.SINT64: return (value) => {
			if (typeof value == "bigint" || typeof value == "number" || typeof value == "string" && value.length > 0) try {
				protoInt64.parse(value);
				return true;
			} catch (_) {
				return `${value} out of range`;
			}
			return false;
		};
		case ScalarType.FIXED64:
		case ScalarType.UINT64: return (value) => {
			if (typeof value == "bigint" || typeof value == "number" || typeof value == "string" && value.length > 0) try {
				protoInt64.uParse(value);
				return true;
			} catch (_) {
				return `${value} out of range`;
			}
			return false;
		};
	}
}
/**
* Format the reason why a value is invalid for a singular field.
*
* @private
*/
function reasonSingular(field, val, details) {
	details = typeof details == "string" ? `: ${details}` : `, got ${formatVal(val)}`;
	if (field.scalar !== void 0) return `expected ${scalarTypeDescription(field.scalar)}` + details;
	if (field.enum !== void 0) return `expected ${field.enum.toString()}` + details;
	return `expected ${formatReflectMessage(field.message)}` + details;
}
function formatVal(val) {
	switch (typeof val) {
		case "object":
			if (val === null) return "null";
			if (val instanceof Uint8Array) return `Uint8Array(${val.length})`;
			if (Array.isArray(val)) return `Array(${val.length})`;
			if (isReflectList(val)) return formatReflectList(val.field());
			if (isReflectMap(val)) return formatReflectMap(val.field());
			if (isReflectMessage(val)) return formatReflectMessage(val.desc);
			if (isMessage(val)) return `message ${val.$typeName}`;
			return "object";
		case "string": return val.length > 30 ? "string" : `"${val.split("\"").join("\\\"")}"`;
		case "boolean": return String(val);
		case "number": return String(val);
		case "bigint": return String(val) + "n";
		default: return typeof val;
	}
}
function formatReflectMessage(desc) {
	return `ReflectMessage (${desc.typeName})`;
}
function formatReflectList(field) {
	switch (field.listKind) {
		case "message": return `ReflectList (${field.message.toString()})`;
		case "enum": return `ReflectList (${field.enum.toString()})`;
		case "scalar": return `ReflectList (${ScalarType[field.scalar]})`;
	}
}
function formatReflectMap(field) {
	switch (field.mapKind) {
		case "message": return `ReflectMap (${ScalarType[field.mapKey]}, ${field.message.toString()})`;
		case "enum": return `ReflectMap (${ScalarType[field.mapKey]}, ${field.enum.toString()})`;
		case "scalar": return `ReflectMap (${ScalarType[field.mapKey]}, ${ScalarType[field.scalar]})`;
	}
}
function scalarTypeDescription(scalar) {
	switch (scalar) {
		case ScalarType.STRING: return "string";
		case ScalarType.BOOL: return "boolean";
		case ScalarType.INT64:
		case ScalarType.SINT64:
		case ScalarType.SFIXED64: return "bigint (int64)";
		case ScalarType.UINT64:
		case ScalarType.FIXED64: return "bigint (uint64)";
		case ScalarType.BYTES: return "Uint8Array";
		case ScalarType.DOUBLE: return "number (float64)";
		case ScalarType.FLOAT: return "number (float32)";
		case ScalarType.FIXED32:
		case ScalarType.UINT32: return "number (uint32)";
		case ScalarType.INT32:
		case ScalarType.SFIXED32:
		case ScalarType.SINT32: return "number (int32)";
	}
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/message.js
var NULL_VALUE = 0;
/**
* Return the conversions between the local representation of the field
* value and the message it represents.
*
* @private
*/
function localMessageMapper(field) {
	if (usesJsonRepresentation(field)) return {
		toMessage: (local) => wktStructToReflect(local),
		toLocal: (message) => wktStructToLocal(message)
	};
	if (field.fieldKind == "message" && !field.oneof && isWrapperDesc(field.message)) {
		const wrapperDesc = field.message;
		const valueLocalName = wrapperDesc.fields[0].localName;
		return {
			toMessage: (local) => {
				const message = create(wrapperDesc);
				if (local !== void 0) message[valueLocalName] = local;
				return message;
			},
			toLocal: (message) => message[valueLocalName]
		};
	}
	const childDesc = field.message;
	return {
		toMessage: (local) => local === void 0 ? create(childDesc) : local,
		toLocal: (message) => message
	};
}
/**
* Returns true if values of this field are stored as JsonValue instead of
* a message: google.protobuf.Struct is represented with JsonObject when
* used in a field, except when used in google.protobuf.Value.
*/
function usesJsonRepresentation(field) {
	return field.message.typeName == "google.protobuf.Struct" && field.parent.typeName != "google.protobuf.Value";
}
/**
* Convert the JsonValue representation of a google.protobuf.Struct to the
* message representation.
*
* @private
*/
function wktStructToReflect(json) {
	const struct = {
		$typeName: "google.protobuf.Struct",
		fields: {}
	};
	if (isObject(json)) for (const k of Object.keys(json)) struct.fields[k] = wktValueToReflect(json[k]);
	return struct;
}
/**
* Convert a google.protobuf.Struct message to its JsonValue representation.
*
* @private
*/
function wktStructToLocal(val) {
	const json = {};
	for (const k of Object.keys(val.fields)) json[k] = wktValueToLocal(val.fields[k]);
	return json;
}
function wktValueToLocal(val) {
	switch (val.kind.case) {
		case "structValue": return wktStructToLocal(val.kind.value);
		case "listValue": return val.kind.value.values.map(wktValueToLocal);
		case "nullValue":
		case void 0: return null;
		default: return val.kind.value;
	}
}
function wktValueToReflect(json) {
	const value = {
		$typeName: "google.protobuf.Value",
		kind: { case: void 0 }
	};
	switch (typeof json) {
		case "number":
			value.kind = {
				case: "numberValue",
				value: json
			};
			break;
		case "string":
			value.kind = {
				case: "stringValue",
				value: json
			};
			break;
		case "boolean":
			value.kind = {
				case: "boolValue",
				value: json
			};
			break;
		case "object":
			if (json === null) value.kind = {
				case: "nullValue",
				value: NULL_VALUE
			};
			else if (Array.isArray(json)) {
				const listValue = {
					$typeName: "google.protobuf.ListValue",
					values: []
				};
				if (Array.isArray(json)) for (const e of json) listValue.values.push(wktValueToReflect(e));
				value.kind = {
					case: "listValue",
					value: listValue
				};
			} else value.kind = {
				case: "structValue",
				value: wktStructToReflect(json)
			};
			break;
	}
	return value;
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/reflect.js
/**
* Create a ReflectMessage.
*/
function reflect(messageDesc, message, check = true) {
	return new ReflectMessageImpl(messageDesc, message, check);
}
var messageSortedFields = /* @__PURE__ */ new WeakMap();
var ReflectMessageImpl = class {
	get sortedFields() {
		const cached = messageSortedFields.get(this.desc);
		if (cached) return cached;
		const sortedFields = this.desc.fields.concat().sort((a, b) => a.number - b.number);
		messageSortedFields.set(this.desc, sortedFields);
		return sortedFields;
	}
	constructor(messageDesc, message, check = true) {
		this.lists = /* @__PURE__ */ new Map();
		this.maps = /* @__PURE__ */ new Map();
		this.check = check;
		this.desc = messageDesc;
		this.message = this[unsafeLocal] = message !== null && message !== void 0 ? message : create(messageDesc);
		this.fields = messageDesc.fields;
		this.oneofs = messageDesc.oneofs;
		this.members = messageDesc.members;
	}
	findNumber(number) {
		if (!this._fieldsByNumber) this._fieldsByNumber = new Map(this.desc.fields.map((f) => [f.number, f]));
		return this._fieldsByNumber.get(number);
	}
	oneofCase(oneof) {
		assertOwn(this.message, oneof);
		return unsafeOneofCase(this.message, oneof);
	}
	isSet(field) {
		assertOwn(this.message, field);
		return unsafeIsSet(this.message, field);
	}
	clear(field) {
		assertOwn(this.message, field);
		unsafeClear(this.message, field);
	}
	get(field) {
		assertOwn(this.message, field);
		const value = unsafeGet(this.message, field);
		switch (field.fieldKind) {
			case "list":
				let list = this.lists.get(field);
				if (!list || list[unsafeLocal] !== value) this.lists.set(field, list = new ReflectListImpl(field, value, this.check));
				return list;
			case "map":
				let map = this.maps.get(field);
				if (!map || map[unsafeLocal] !== value) this.maps.set(field, map = new ReflectMapImpl(field, value, this.check));
				return map;
			case "message": return messageToReflect(field, value, this.check);
			case "scalar": return value === void 0 ? scalarZeroValue(field.scalar, false) : longToReflect(field, value);
			case "enum": return value !== null && value !== void 0 ? value : field.enum.values[0].number;
		}
	}
	set(field, value) {
		assertOwn(this.message, field);
		if (this.check) {
			const err = checkField(field, value);
			if (err) throw err;
		}
		let local;
		if (field.fieldKind == "message") local = messageToLocal(field, value);
		else if (isReflectMap(value) || isReflectList(value)) local = value[unsafeLocal];
		else local = longToLocal(field, value);
		unsafeSet(this.message, field, local);
	}
	getUnknown() {
		return this.message.$unknown;
	}
	setUnknown(value) {
		this.message.$unknown = value;
	}
};
function assertOwn(owner, member) {
	if (member.parent.typeName !== owner.$typeName) throw new FieldError(member, `cannot use ${member.toString()} with message ${owner.$typeName}`, "ForeignFieldError");
}
var ReflectListImpl = class {
	field() {
		return this._field;
	}
	get size() {
		return this._arr.length;
	}
	constructor(field, unsafeInput, check) {
		this._field = field;
		this._arr = this[unsafeLocal] = unsafeInput;
		this.check = check;
	}
	get(index) {
		const item = this._arr[index];
		return item === void 0 ? void 0 : listItemToReflect(this._field, item, this.check);
	}
	set(index, item) {
		if (index < 0 || index >= this._arr.length) throw new FieldError(this._field, `list item #${index + 1}: out of range`);
		if (this.check) {
			const err = checkListItem(this._field, index, item);
			if (err) throw err;
		}
		this._arr[index] = listItemToLocal(this._field, item);
	}
	add(item) {
		if (this.check) {
			const err = checkListItem(this._field, this._arr.length, item);
			if (err) throw err;
		}
		this._arr.push(listItemToLocal(this._field, item));
	}
	clear() {
		this._arr.splice(0, this._arr.length);
	}
	[Symbol.iterator]() {
		return this.values();
	}
	keys() {
		return this._arr.keys();
	}
	*values() {
		for (const item of this._arr) yield listItemToReflect(this._field, item, this.check);
	}
	*entries() {
		for (let i = 0; i < this._arr.length; i++) yield [i, listItemToReflect(this._field, this._arr[i], this.check)];
	}
};
var ReflectMapImpl = class {
	constructor(field, unsafeInput, check = true) {
		this.obj = this[unsafeLocal] = unsafeInput !== null && unsafeInput !== void 0 ? unsafeInput : {};
		this.check = check;
		this._field = field;
	}
	field() {
		return this._field;
	}
	set(key, value) {
		if (this.check) {
			const err = checkMapEntry(this._field, key, value);
			if (err) throw err;
		}
		this.obj[mapKeyToLocal(key)] = mapValueToLocal(this._field, value);
		return this;
	}
	delete(key) {
		const k = mapKeyToLocal(key);
		const has = Object.prototype.hasOwnProperty.call(this.obj, k);
		if (has) delete this.obj[k];
		return has;
	}
	clear() {
		for (const key of Object.keys(this.obj)) delete this.obj[key];
	}
	get(key) {
		let val = this.obj[mapKeyToLocal(key)];
		if (val !== void 0) val = mapValueToReflect(this._field, val, this.check);
		return val;
	}
	has(key) {
		return Object.prototype.hasOwnProperty.call(this.obj, mapKeyToLocal(key));
	}
	*keys() {
		for (const objKey of Object.keys(this.obj)) yield mapKeyToReflect(objKey, this._field.mapKey);
	}
	*entries() {
		for (const objEntry of Object.entries(this.obj)) yield [mapKeyToReflect(objEntry[0], this._field.mapKey), mapValueToReflect(this._field, objEntry[1], this.check)];
	}
	[Symbol.iterator]() {
		return this.entries();
	}
	get size() {
		return Object.keys(this.obj).length;
	}
	*values() {
		for (const val of Object.values(this.obj)) yield mapValueToReflect(this._field, val, this.check);
	}
	forEach(callbackfn, thisArg) {
		for (const mapEntry of this.entries()) callbackfn.call(thisArg, mapEntry[1], mapEntry[0], this);
	}
};
function messageToLocal(field, value) {
	if (!isReflectMessage(value)) return value;
	if (isWrapper(value.message) && !field.oneof && field.fieldKind == "message") return value.message.value;
	if (value.desc.typeName == "google.protobuf.Struct" && field.parent.typeName != "google.protobuf.Value") return wktStructToLocal(value.message);
	return value.message;
}
function messageToReflect(field, value, check) {
	if (value !== void 0) {
		if (isWrapperDesc(field.message) && !field.oneof && field.fieldKind == "message") value = {
			$typeName: field.message.typeName,
			value: longToReflect(field.message.fields[0], value)
		};
		else if (field.message.typeName == "google.protobuf.Struct" && field.parent.typeName != "google.protobuf.Value" && isObject(value)) value = wktStructToReflect(value);
	}
	return new ReflectMessageImpl(field.message, value, check);
}
function listItemToLocal(field, value) {
	if (field.listKind == "message") return messageToLocal(field, value);
	return longToLocal(field, value);
}
function listItemToReflect(field, value, check) {
	if (field.listKind == "message") return messageToReflect(field, value, check);
	return longToReflect(field, value);
}
function mapValueToLocal(field, value) {
	if (field.mapKind == "message") return messageToLocal(field, value);
	return longToLocal(field, value);
}
function mapValueToReflect(field, value, check) {
	if (field.mapKind == "message") return messageToReflect(field, value, check);
	return value;
}
function mapKeyToLocal(key) {
	return typeof key == "string" || typeof key == "number" ? key : String(key);
}
/**
* Converts a map key (any scalar value except float, double, or bytes) from its
* representation in a message (string or number, the only possible object key
* types) to the closest possible type in ECMAScript.
*/
function mapKeyToReflect(key, type) {
	switch (type) {
		case ScalarType.STRING: return key;
		case ScalarType.INT32:
		case ScalarType.FIXED32:
		case ScalarType.UINT32:
		case ScalarType.SFIXED32:
		case ScalarType.SINT32: {
			const n = Number.parseInt(key);
			if (Number.isFinite(n)) return n;
			break;
		}
		case ScalarType.BOOL:
			switch (key) {
				case "true": return true;
				case "false": return false;
			}
			break;
		case ScalarType.UINT64:
		case ScalarType.FIXED64:
			try {
				return protoInt64.uParse(key);
			} catch (_a) {}
			break;
		default:
			try {
				return protoInt64.parse(key);
			} catch (_b) {}
			break;
	}
	return key;
}
function longToReflect(field, value) {
	switch (field.scalar) {
		case ScalarType.INT64:
		case ScalarType.SFIXED64:
		case ScalarType.SINT64:
			if ("longAsString" in field && field.longAsString && typeof value == "string") value = protoInt64.parse(value);
			break;
		case ScalarType.FIXED64:
		case ScalarType.UINT64:
			if ("longAsString" in field && field.longAsString && typeof value == "string") value = protoInt64.uParse(value);
			break;
	}
	return value;
}
function longToLocal(field, value) {
	switch (field.scalar) {
		case ScalarType.INT64:
		case ScalarType.SFIXED64:
		case ScalarType.SINT64:
			if ("longAsString" in field && field.longAsString) value = String(value);
			else if (typeof value == "string" || typeof value == "number") value = protoInt64.parse(value);
			break;
		case ScalarType.FIXED64:
		case ScalarType.UINT64:
			if ("longAsString" in field && field.longAsString) value = String(value);
			else if (typeof value == "string" || typeof value == "number") value = protoInt64.uParse(value);
			break;
	}
	return value;
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/wire/base64-encoding.js
var nativeSetFromBase64 = Uint8Array.prototype.setFromBase64;
/**
* Decodes a base64 string to a byte array.
*
* - ignores white-space, including line breaks and tabs
* - allows inner padding (can decode concatenated base64 strings)
* - does not require padding
* - understands base64url encoding:
*   "-" instead of "+",
*   "_" instead of "/",
*   no padding
*/
function base64Decode(base64Str) {
	const len = base64Str.length;
	let size = len - (len + 3 >> 2);
	if ((len & 3) == 0 && base64Str[len - 1] == "=") size -= base64Str[len - 2] == "=" ? 2 : 1;
	const bytes = new Uint8Array(size);
	let written = -1;
	if (nativeSetFromBase64) try {
		const result = nativeSetFromBase64.call(bytes, base64Str);
		if (result.read == len) written = result.written;
	} catch (_a) {}
	if (written < 0) written = setFromBase64(bytes, base64Str);
	return written == size ? bytes : bytes.subarray(0, written);
}
/** Writes into `bytes` from index 0 and returns the number of bytes written. */
function setFromBase64(bytes, base64Str) {
	const table = getDecodeTable();
	let bytePos = 0, groupPos = 0, b, p = 0;
	for (let i = 0; i < base64Str.length; i++) {
		b = table[base64Str.charCodeAt(i)];
		if (b === void 0) switch (base64Str[i]) {
			case "=": groupPos = 0;
			case "\n":
			case "\r":
			case "	":
			case " ": continue;
			default: throw Error("invalid base64 string");
		}
		switch (groupPos) {
			case 0:
				p = b;
				groupPos = 1;
				break;
			case 1:
				bytes[bytePos++] = p << 2 | (b & 48) >> 4;
				p = b;
				groupPos = 2;
				break;
			case 2:
				bytes[bytePos++] = (p & 15) << 4 | (b & 60) >> 2;
				p = b;
				groupPos = 3;
				break;
			case 3:
				bytes[bytePos++] = (p & 3) << 6 | b;
				groupPos = 0;
				break;
		}
	}
	if (groupPos == 1) throw Error("invalid base64 string");
	return bytePos;
}
var nativeToBase64 = Uint8Array.prototype.toBase64;
var toBase64OptionsMap = {
	std: {
		alphabet: "base64",
		omitPadding: false
	},
	std_raw: {
		alphabet: "base64",
		omitPadding: true
	},
	url: {
		alphabet: "base64url",
		omitPadding: true
	}
};
/**
* Encode a byte array to a base64 string.
*
* By default, this function uses the standard base64 encoding with padding.
*
* To encode without padding, use encoding = "std_raw".
*
* To encode with the URL encoding, use encoding = "url", which replaces the
* characters +/ by their URL-safe counterparts -_, and omits padding.
*/
function base64Encode(bytes, encoding = "std") {
	if (nativeToBase64) return nativeToBase64.call(bytes, toBase64OptionsMap[encoding]);
	const table = getEncodeTable(encoding);
	const pad = encoding == "std";
	let base64 = "", groupPos = 0, b, p = 0;
	for (let i = 0; i < bytes.length; i++) {
		b = bytes[i];
		switch (groupPos) {
			case 0:
				base64 += table[b >> 2];
				p = (b & 3) << 4;
				groupPos = 1;
				break;
			case 1:
				base64 += table[p | b >> 4];
				p = (b & 15) << 2;
				groupPos = 2;
				break;
			case 2:
				base64 += table[p | b >> 6];
				base64 += table[b & 63];
				groupPos = 0;
				break;
		}
	}
	if (groupPos) {
		base64 += table[p];
		if (pad) {
			base64 += "=";
			if (groupPos == 1) base64 += "=";
		}
	}
	return base64;
}
var encodeTableStd;
var encodeTableUrl;
var decodeTable;
function getEncodeTable(encoding) {
	if (!encodeTableStd) {
		encodeTableStd = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
		encodeTableUrl = encodeTableStd.slice(0, -2).concat("-", "_");
	}
	return encoding == "url" ? encodeTableUrl : encodeTableStd;
}
function getDecodeTable() {
	if (!decodeTable) {
		decodeTable = [];
		const encodeTable = getEncodeTable("std");
		for (let i = 0; i < encodeTable.length; i++) decodeTable[encodeTable[i].charCodeAt(0)] = i;
		decodeTable["-".charCodeAt(0)] = encodeTable.indexOf("+");
		decodeTable["_".charCodeAt(0)] = encodeTable.indexOf("/");
	}
	return decodeTable;
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/names.js
/**
* Converts snake_case to protoCamelCase according to the convention
* used by protoc to convert a field name to a JSON name.
*
* See https://protobuf.com/docs/language-spec#default-json-names
*
* The function protoSnakeCase provides the reverse.
*/
function protoCamelCase(snakeCase) {
	let capNext = false;
	const b = [];
	for (let i = 0; i < snakeCase.length; i++) {
		let c = snakeCase.charAt(i);
		switch (c) {
			case "_":
				capNext = true;
				break;
			case "0":
			case "1":
			case "2":
			case "3":
			case "4":
			case "5":
			case "6":
			case "7":
			case "8":
			case "9":
				b.push(c);
				capNext = false;
				break;
			default:
				if (capNext) {
					capNext = false;
					c = c.toUpperCase();
				}
				b.push(c);
				break;
		}
	}
	return b.join("");
}
/**
* Converts protoCamelCase to snake_case.
*
* This function is the reverse of function protoCamelCase. Note that some names
* are not reversible - for example, "foo__bar" -> "fooBar" -> "foo_bar".
*/
function protoSnakeCase(lowerCamelCase) {
	return lowerCamelCase.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase());
}
/**
* Names that cannot be used for object properties because they are reserved
* by built-in JavaScript properties.
*/
var reservedObjectProperties = /* @__PURE__ */ new Set([
	"constructor",
	"toString",
	"toJSON",
	"valueOf"
]);
/**
* Escapes names that are reserved for ECMAScript built-in object properties.
*
* Also see safeIdentifier() from @bufbuild/protoplugin.
*/
function safeObjectProperty(name) {
	return reservedObjectProperties.has(name) ? name + "$" : name;
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/codegenv2/restore-json-names.js
/**
* @private
*/
function restoreJsonNames(message) {
	for (const f of message.field) if (!unsafeIsSetExplicit(f, "jsonName")) f.jsonName = protoCamelCase(f.name);
	message.nestedType.forEach(restoreJsonNames);
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/wire/text-format.js
/**
* Parse an enum value from the Protobuf text format.
*
* @private
*/
function parseTextFormatEnumValue(descEnum, value) {
	const enumValue = descEnum.values.find((v) => v.name === value);
	if (!enumValue) throw new Error(`cannot parse ${descEnum} default value: ${value}`);
	return enumValue.number;
}
/**
* Parse a scalar value from the Protobuf text format.
*
* @private
*/
function parseTextFormatScalarValue(type, value) {
	switch (type) {
		case ScalarType.STRING: return value;
		case ScalarType.BYTES: {
			const u = unescapeBytesDefaultValue(value);
			if (u === false) throw new Error(`cannot parse ${ScalarType[type]} default value: ${value}`);
			return u;
		}
		case ScalarType.INT64:
		case ScalarType.SFIXED64:
		case ScalarType.SINT64: return protoInt64.parse(value);
		case ScalarType.UINT64:
		case ScalarType.FIXED64: return protoInt64.uParse(value);
		case ScalarType.DOUBLE:
		case ScalarType.FLOAT: switch (value) {
			case "inf": return Number.POSITIVE_INFINITY;
			case "-inf": return Number.NEGATIVE_INFINITY;
			case "nan": return NaN;
			default: return parseFloat(value);
		}
		case ScalarType.BOOL: return value === "true";
		case ScalarType.INT32:
		case ScalarType.UINT32:
		case ScalarType.SINT32:
		case ScalarType.FIXED32:
		case ScalarType.SFIXED32: return parseInt(value, 10);
	}
}
/**
* Parses a text-encoded default value (proto2) of a BYTES field.
*/
function unescapeBytesDefaultValue(str) {
	const b = [];
	const input = {
		tail: str,
		c: "",
		next() {
			if (this.tail.length == 0) return false;
			this.c = this.tail[0];
			this.tail = this.tail.substring(1);
			return true;
		},
		take(n) {
			if (this.tail.length >= n) {
				const r = this.tail.substring(0, n);
				this.tail = this.tail.substring(n);
				return r;
			}
			return false;
		}
	};
	while (input.next()) switch (input.c) {
		case "\\":
			if (input.next()) switch (input.c) {
				case "\\":
					b.push(input.c.charCodeAt(0));
					break;
				case "b":
					b.push(8);
					break;
				case "f":
					b.push(12);
					break;
				case "n":
					b.push(10);
					break;
				case "r":
					b.push(13);
					break;
				case "t":
					b.push(9);
					break;
				case "v":
					b.push(11);
					break;
				case "0":
				case "1":
				case "2":
				case "3":
				case "4":
				case "5":
				case "6":
				case "7": {
					const s = input.c;
					const t = input.take(2);
					if (t === false) return false;
					const n = parseInt(s + t, 8);
					if (Number.isNaN(n)) return false;
					b.push(n);
					break;
				}
				case "x": {
					const s = input.c;
					const t = input.take(2);
					if (t === false) return false;
					const n = parseInt(s + t, 16);
					if (Number.isNaN(n)) return false;
					b.push(n);
					break;
				}
				case "u": {
					const s = input.c;
					const t = input.take(4);
					if (t === false) return false;
					const n = parseInt(s + t, 16);
					if (Number.isNaN(n)) return false;
					const chunk = /* @__PURE__ */ new Uint8Array(4);
					new DataView(chunk.buffer).setInt32(0, n, true);
					b.push(chunk[0], chunk[1], chunk[2], chunk[3]);
					break;
				}
				case "U": {
					const s = input.c;
					const t = input.take(8);
					if (t === false) return false;
					const tc = protoInt64.uEnc(s + t);
					const chunk = /* @__PURE__ */ new Uint8Array(8);
					const view = new DataView(chunk.buffer);
					view.setInt32(0, tc.lo, true);
					view.setInt32(4, tc.hi, true);
					b.push(chunk[0], chunk[1], chunk[2], chunk[3], chunk[4], chunk[5], chunk[6], chunk[7]);
					break;
				}
			}
			break;
		default: b.push(input.c.charCodeAt(0));
	}
	return new Uint8Array(b);
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/nested-types.js
/**
* Iterate over all types - enumerations, extensions, services, messages -
* and enumerations, extensions and messages nested in messages.
*/
function* nestedTypes(desc) {
	switch (desc.kind) {
		case "file":
			for (const message of desc.messages) {
				yield message;
				yield* nestedTypes(message);
			}
			yield* desc.enums;
			yield* desc.services;
			yield* desc.extensions;
			break;
		case "message":
			for (const message of desc.nestedMessages) {
				yield message;
				yield* nestedTypes(message);
			}
			yield* desc.nestedEnums;
			yield* desc.nestedExtensions;
			break;
	}
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/registry.js
function createFileRegistry(...args) {
	const registry = createBaseRegistry();
	if (!args.length) return registry;
	if ("$typeName" in args[0] && args[0].$typeName == "google.protobuf.FileDescriptorSet") {
		for (const file of args[0].file) addFile(file, registry);
		return registry;
	}
	if ("$typeName" in args[0]) {
		const input = args[0];
		const resolve = args[1];
		const seen = /* @__PURE__ */ new Set();
		function recurseDeps(file) {
			const deps = [];
			for (const protoFileName of file.dependency) {
				if (registry.getFile(protoFileName) != void 0) continue;
				if (seen.has(protoFileName)) continue;
				const dep = resolve(protoFileName);
				if (!dep) throw new Error(`Unable to resolve ${protoFileName}, imported by ${file.name}`);
				if ("kind" in dep) registry.addFile(dep, false, true);
				else {
					seen.add(dep.name);
					deps.push(dep);
				}
			}
			return deps.concat(...deps.map(recurseDeps));
		}
		for (const file of [input, ...recurseDeps(input)].reverse()) addFile(file, registry);
	} else for (const fileReg of args) for (const file of fileReg.files) registry.addFile(file);
	return registry;
}
/**
* @private
*/
function createBaseRegistry() {
	const types = /* @__PURE__ */ new Map();
	const extendees = /* @__PURE__ */ new Map();
	const files = /* @__PURE__ */ new Map();
	return {
		kind: "registry",
		types,
		extendees,
		[Symbol.iterator]() {
			return types.values();
		},
		get files() {
			return files.values();
		},
		addFile(file, skipTypes, withDeps) {
			files.set(file.proto.name, file);
			if (!skipTypes) for (const type of nestedTypes(file)) this.add(type);
			if (withDeps) for (const f of file.dependencies) this.addFile(f, skipTypes, withDeps);
		},
		add(desc) {
			if (desc.kind == "extension") {
				let numberToExt = extendees.get(desc.extendee.typeName);
				if (!numberToExt) extendees.set(desc.extendee.typeName, numberToExt = /* @__PURE__ */ new Map());
				numberToExt.set(desc.number, desc);
			}
			types.set(desc.typeName, desc);
		},
		get(typeName) {
			return types.get(typeName);
		},
		getFile(fileName) {
			return files.get(fileName);
		},
		getMessage(typeName) {
			const t = types.get(typeName);
			return (t === null || t === void 0 ? void 0 : t.kind) == "message" ? t : void 0;
		},
		getEnum(typeName) {
			const t = types.get(typeName);
			return (t === null || t === void 0 ? void 0 : t.kind) == "enum" ? t : void 0;
		},
		getExtension(typeName) {
			const t = types.get(typeName);
			return (t === null || t === void 0 ? void 0 : t.kind) == "extension" ? t : void 0;
		},
		getExtensionFor(extendee, no) {
			var _a;
			return (_a = extendees.get(extendee.typeName)) === null || _a === void 0 ? void 0 : _a.get(no);
		},
		getService(typeName) {
			const t = types.get(typeName);
			return (t === null || t === void 0 ? void 0 : t.kind) == "service" ? t : void 0;
		}
	};
}
var EDITION_PROTO2 = 998;
var EDITION_PROTO3 = 999;
var EDITION_UNSTABLE = 9999;
var TYPE_STRING = 9;
var TYPE_GROUP = 10;
var TYPE_MESSAGE = 11;
var TYPE_BYTES = 12;
var TYPE_ENUM = 14;
var LABEL_REPEATED = 3;
var LABEL_REQUIRED = 2;
var JS_STRING = 1;
var IDEMPOTENCY_UNKNOWN = 0;
var EXPLICIT = 1;
var IMPLICIT$3 = 2;
var LEGACY_REQUIRED$2 = 3;
var PACKED = 1;
var DELIMITED = 2;
var OPEN = 1;
var VERIFY = 2;
var maximumEdition = 1001;
var featureDefaults = {
	998: {
		fieldPresence: 1,
		enumType: 2,
		repeatedFieldEncoding: 2,
		utf8Validation: 3,
		messageEncoding: 1,
		jsonFormat: 2,
		enforceNamingStyle: 2,
		defaultSymbolVisibility: 1
	},
	999: {
		fieldPresence: 2,
		enumType: 1,
		repeatedFieldEncoding: 1,
		utf8Validation: 2,
		messageEncoding: 1,
		jsonFormat: 1,
		enforceNamingStyle: 2,
		defaultSymbolVisibility: 1
	},
	1e3: {
		fieldPresence: 1,
		enumType: 1,
		repeatedFieldEncoding: 1,
		utf8Validation: 2,
		messageEncoding: 1,
		jsonFormat: 1,
		enforceNamingStyle: 2,
		defaultSymbolVisibility: 1
	},
	1001: {
		fieldPresence: 1,
		enumType: 1,
		repeatedFieldEncoding: 1,
		utf8Validation: 2,
		messageEncoding: 1,
		jsonFormat: 1,
		enforceNamingStyle: 1,
		defaultSymbolVisibility: 2
	}
};
/**
* Create a descriptor for a file, add it to the registry.
*/
function addFile(proto, reg) {
	var _a, _b;
	const file = {
		kind: "file",
		proto,
		deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
		edition: getFileEdition(proto),
		name: proto.name.replace(/\.proto$/, ""),
		dependencies: findFileDependencies(proto, reg),
		enums: [],
		messages: [],
		extensions: [],
		services: [],
		toString() {
			return `file ${proto.name}`;
		}
	};
	const mapEntriesStore = /* @__PURE__ */ new Map();
	const mapEntries = {
		get(typeName) {
			return mapEntriesStore.get(typeName);
		},
		add(desc) {
			var _a;
			assert(((_a = desc.proto.options) === null || _a === void 0 ? void 0 : _a.mapEntry) === true);
			mapEntriesStore.set(desc.typeName, desc);
		}
	};
	for (const enumProto of proto.enumType) addEnum(enumProto, file, void 0, reg);
	for (const messageProto of proto.messageType) addMessage(messageProto, file, void 0, reg, mapEntries);
	for (const serviceProto of proto.service) addService(serviceProto, file, reg);
	addExtensions(file, reg);
	for (const mapEntry of mapEntriesStore.values()) addFields(mapEntry, reg, mapEntries);
	for (const message of file.messages) {
		addFields(message, reg, mapEntries);
		addExtensions(message, reg);
	}
	reg.addFile(file, true);
}
/**
* Create descriptors for extensions, and add them to the message / file,
* and to our cart.
* Recurses into nested types.
*/
function addExtensions(desc, reg) {
	switch (desc.kind) {
		case "file":
			for (const proto of desc.proto.extension) {
				const ext = newField(proto, desc, reg);
				desc.extensions.push(ext);
				reg.add(ext);
			}
			break;
		case "message":
			for (const proto of desc.proto.extension) {
				const ext = newField(proto, desc, reg);
				desc.nestedExtensions.push(ext);
				reg.add(ext);
			}
			for (const message of desc.nestedMessages) addExtensions(message, reg);
			break;
	}
}
/**
* Create descriptors for fields and oneof groups, and add them to the message.
* Recurses into nested types.
*/
function addFields(message, reg, mapEntries) {
	const allOneofs = message.proto.oneofDecl.map((proto) => newOneof(proto, message));
	const oneofsSeen = /* @__PURE__ */ new Set();
	for (const proto of message.proto.field) {
		const oneof = findOneof(proto, allOneofs);
		const field = newField(proto, message, reg, oneof, mapEntries);
		message.fields.push(field);
		message.field[field.localName] = field;
		if (oneof === void 0) message.members.push(field);
		else {
			oneof.fields.push(field);
			if (!oneofsSeen.has(oneof)) {
				oneofsSeen.add(oneof);
				message.members.push(oneof);
			}
		}
	}
	for (const oneof of allOneofs.filter((o) => oneofsSeen.has(o))) message.oneofs.push(oneof);
	for (const child of message.nestedMessages) addFields(child, reg, mapEntries);
}
/**
* Create a descriptor for an enumeration, and add it our cart and to the
* parent type, if any.
*/
function addEnum(proto, file, parent, reg) {
	var _a, _b, _c, _d, _e;
	const sharedPrefix = findEnumSharedPrefix(proto.name, proto.value);
	const desc = {
		kind: "enum",
		proto,
		deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
		file,
		parent,
		open: true,
		name: proto.name,
		typeName: makeTypeName(proto, parent, file),
		value: {},
		values: [],
		sharedPrefix,
		toString() {
			return `enum ${this.typeName}`;
		}
	};
	desc.open = isEnumOpen(desc);
	reg.add(desc);
	for (const p of proto.value) {
		const name = p.name;
		desc.values.push(desc.value[p.number] = {
			kind: "enum_value",
			proto: p,
			deprecated: (_d = (_c = p.options) === null || _c === void 0 ? void 0 : _c.deprecated) !== null && _d !== void 0 ? _d : false,
			parent: desc,
			name,
			localName: safeObjectProperty(sharedPrefix == void 0 ? name : name.substring(sharedPrefix.length)),
			number: p.number,
			toString() {
				return `enum value ${desc.typeName}.${name}`;
			}
		});
	}
	((_e = parent === null || parent === void 0 ? void 0 : parent.nestedEnums) !== null && _e !== void 0 ? _e : file.enums).push(desc);
}
/**
* Create a descriptor for a message, including nested types, and add it to our
* cart. Note that this does not create descriptors fields.
*/
function addMessage(proto, file, parent, reg, mapEntries) {
	var _a, _b, _c, _d;
	const desc = {
		kind: "message",
		proto,
		deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
		file,
		parent,
		name: proto.name,
		typeName: makeTypeName(proto, parent, file),
		fields: [],
		field: {},
		oneofs: [],
		members: [],
		nestedEnums: [],
		nestedMessages: [],
		nestedExtensions: [],
		toString() {
			return `message ${this.typeName}`;
		}
	};
	if (((_c = proto.options) === null || _c === void 0 ? void 0 : _c.mapEntry) === true) mapEntries.add(desc);
	else {
		((_d = parent === null || parent === void 0 ? void 0 : parent.nestedMessages) !== null && _d !== void 0 ? _d : file.messages).push(desc);
		reg.add(desc);
	}
	for (const enumProto of proto.enumType) addEnum(enumProto, file, desc, reg);
	for (const messageProto of proto.nestedType) addMessage(messageProto, file, desc, reg, mapEntries);
}
/**
* Create a descriptor for a service, including methods, and add it to our
* cart.
*/
function addService(proto, file, reg) {
	var _a, _b;
	const desc = {
		kind: "service",
		proto,
		deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
		file,
		name: proto.name,
		typeName: makeTypeName(proto, void 0, file),
		methods: [],
		method: {},
		toString() {
			return `service ${this.typeName}`;
		}
	};
	file.services.push(desc);
	reg.add(desc);
	for (const methodProto of proto.method) {
		const method = newMethod(methodProto, desc, reg);
		desc.methods.push(method);
		desc.method[method.localName] = method;
	}
}
/**
* Create a descriptor for a method.
*/
function newMethod(proto, parent, reg) {
	var _a, _b, _c, _d;
	let methodKind;
	if (proto.clientStreaming && proto.serverStreaming) methodKind = "bidi_streaming";
	else if (proto.clientStreaming) methodKind = "client_streaming";
	else if (proto.serverStreaming) methodKind = "server_streaming";
	else methodKind = "unary";
	const input = reg.getMessage(trimLeadingDot(proto.inputType));
	const output = reg.getMessage(trimLeadingDot(proto.outputType));
	assert(input, `invalid MethodDescriptorProto: input_type ${proto.inputType} not found`);
	assert(output, `invalid MethodDescriptorProto: output_type ${proto.inputType} not found`);
	const name = proto.name;
	return {
		kind: "rpc",
		proto,
		deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
		parent,
		name,
		localName: safeObjectProperty(name.length ? safeObjectProperty(name[0].toLowerCase() + name.substring(1)) : name),
		methodKind,
		input,
		output,
		idempotency: (_d = (_c = proto.options) === null || _c === void 0 ? void 0 : _c.idempotencyLevel) !== null && _d !== void 0 ? _d : IDEMPOTENCY_UNKNOWN,
		toString() {
			return `rpc ${parent.typeName}.${name}`;
		}
	};
}
/**
* Create a descriptor for a oneof group.
*/
function newOneof(proto, parent) {
	return {
		kind: "oneof",
		proto,
		deprecated: false,
		parent,
		fields: [],
		name: proto.name,
		localName: safeObjectProperty(protoCamelCase(proto.name)),
		toString() {
			return `oneof ${parent.typeName}.${this.name}`;
		}
	};
}
function newField(proto, parentOrFile, reg, oneof, mapEntries) {
	var _a, _b, _c;
	const isExtension = mapEntries === void 0;
	const field = {
		kind: "field",
		proto,
		deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
		name: proto.name,
		number: proto.number,
		scalar: void 0,
		message: void 0,
		enum: void 0,
		presence: getFieldPresence(proto, oneof, isExtension, parentOrFile),
		utf8Validation: isUtf8Validated(proto, parentOrFile),
		listKind: void 0,
		mapKind: void 0,
		mapKey: void 0,
		delimitedEncoding: void 0,
		packed: void 0,
		longAsString: false,
		getDefaultValue: void 0
	};
	let toStr;
	if (isExtension) {
		const file = parentOrFile.kind == "file" ? parentOrFile : parentOrFile.file;
		const parent = parentOrFile.kind == "file" ? void 0 : parentOrFile;
		const typeName = makeTypeName(proto, parent, file);
		field.kind = "extension";
		field.file = file;
		field.parent = parent;
		field.oneof = void 0;
		field.typeName = typeName;
		field.jsonName = `[${typeName}]`;
		toStr = () => `extension ${typeName}`;
		const extendee = reg.getMessage(trimLeadingDot(proto.extendee));
		assert(extendee, `invalid FieldDescriptorProto: extendee ${proto.extendee} not found`);
		field.extendee = extendee;
	} else {
		const parent = parentOrFile;
		assert(parent.kind == "message");
		field.parent = parent;
		field.oneof = oneof;
		field.localName = oneof ? protoCamelCase(proto.name) : safeObjectProperty(protoCamelCase(proto.name));
		field.jsonName = proto.jsonName;
		toStr = () => `field ${parent.typeName}.${proto.name}`;
	}
	Object.defineProperty(field, "toString", {
		value: toStr,
		writable: true,
		enumerable: true,
		configurable: true
	});
	const label = proto.label;
	const type = proto.type;
	const jstype = (_c = proto.options) === null || _c === void 0 ? void 0 : _c.jstype;
	if (label === LABEL_REPEATED) {
		const mapEntry = type == TYPE_MESSAGE ? mapEntries === null || mapEntries === void 0 ? void 0 : mapEntries.get(trimLeadingDot(proto.typeName)) : void 0;
		if (mapEntry) {
			field.fieldKind = "map";
			const { key, value } = findMapEntryFields(mapEntry);
			field.mapKey = key.scalar;
			field.mapKind = value.fieldKind;
			field.message = value.message;
			field.delimitedEncoding = false;
			field.enum = value.enum;
			field.scalar = value.scalar;
			return field;
		}
		field.fieldKind = "list";
		switch (type) {
			case TYPE_MESSAGE:
			case TYPE_GROUP:
				field.listKind = "message";
				field.message = reg.getMessage(trimLeadingDot(proto.typeName));
				assert(field.message);
				field.delimitedEncoding = isDelimitedEncoding(proto, parentOrFile);
				break;
			case TYPE_ENUM:
				field.listKind = "enum";
				field.enum = reg.getEnum(trimLeadingDot(proto.typeName));
				assert(field.enum);
				break;
			default:
				field.listKind = "scalar";
				field.scalar = type;
				field.longAsString = jstype == JS_STRING;
				break;
		}
		field.packed = isPackedField(proto, parentOrFile);
		return field;
	}
	switch (type) {
		case TYPE_MESSAGE:
		case TYPE_GROUP:
			field.fieldKind = "message";
			field.message = reg.getMessage(trimLeadingDot(proto.typeName));
			assert(field.message, `invalid FieldDescriptorProto: type_name ${proto.typeName} not found`);
			field.delimitedEncoding = isDelimitedEncoding(proto, parentOrFile);
			field.getDefaultValue = () => void 0;
			break;
		case TYPE_ENUM: {
			const enumeration = reg.getEnum(trimLeadingDot(proto.typeName));
			assert(enumeration !== void 0, `invalid FieldDescriptorProto: type_name ${proto.typeName} not found`);
			field.fieldKind = "enum";
			field.enum = reg.getEnum(trimLeadingDot(proto.typeName));
			field.getDefaultValue = () => {
				return unsafeIsSetExplicit(proto, "defaultValue") ? parseTextFormatEnumValue(enumeration, proto.defaultValue) : void 0;
			};
			break;
		}
		default:
			field.fieldKind = "scalar";
			field.scalar = type;
			field.longAsString = jstype == JS_STRING;
			field.getDefaultValue = () => {
				return unsafeIsSetExplicit(proto, "defaultValue") ? parseTextFormatScalarValue(type, proto.defaultValue) : void 0;
			};
			break;
	}
	return field;
}
/**
* Parse the "syntax" and "edition" fields, returning one of the supported
* editions.
*/
function getFileEdition(proto) {
	switch (proto.syntax) {
		case "":
		case "proto2": return EDITION_PROTO2;
		case "proto3": return EDITION_PROTO3;
		case "editions":
			if (proto.edition === EDITION_UNSTABLE) return maximumEdition;
			if (proto.edition in featureDefaults) return proto.edition;
			throw new Error(`${proto.name}: unsupported edition`);
		default: throw new Error(`${proto.name}: unsupported syntax "${proto.syntax}"`);
	}
}
/**
* Resolve dependencies of FileDescriptorProto to DescFile.
*/
function findFileDependencies(proto, reg) {
	return proto.dependency.map((wantName) => {
		const dep = reg.getFile(wantName);
		if (!dep) throw new Error(`Cannot find ${wantName}, imported by ${proto.name}`);
		return dep;
	});
}
/**
* Finds a prefix shared by enum values, for example `my_enum_` for
* `enum MyEnum {MY_ENUM_A=0; MY_ENUM_B=1;}`.
*/
function findEnumSharedPrefix(enumName, values) {
	const prefix = camelToSnakeCase(enumName) + "_";
	for (const value of values) {
		if (!value.name.toLowerCase().startsWith(prefix)) return;
		const shortName = value.name.substring(prefix.length);
		if (shortName.length == 0) return;
		if (/^\d/.test(shortName)) return;
	}
	return prefix;
}
/**
* Converts lowerCamelCase or UpperCamelCase into lower_snake_case.
* This is used to find shared prefixes in an enum.
*/
function camelToSnakeCase(camel) {
	return (camel.substring(0, 1) + camel.substring(1).replace(/[A-Z]/g, (c) => "_" + c)).toLowerCase();
}
/**
* Create a fully qualified name for a protobuf type or extension field.
*
* The fully qualified name for messages, enumerations, and services is
* constructed by concatenating the package name (if present), parent
* message names (for nested types), and the type name. We omit the leading
* dot added by protobuf compilers. Examples:
* - mypackage.MyMessage
* - mypackage.MyMessage.NestedMessage
*
* The fully qualified name for extension fields is constructed by
* concatenating the package name (if present), parent message names (for
* extensions declared within a message), and the field name. Examples:
* - mypackage.extfield
* - mypackage.MyMessage.extfield
*/
function makeTypeName(proto, parent, file) {
	let typeName;
	if (parent) typeName = `${parent.typeName}.${proto.name}`;
	else if (file.proto.package.length > 0) typeName = `${file.proto.package}.${proto.name}`;
	else typeName = `${proto.name}`;
	return typeName;
}
/**
* Remove the leading dot from a fully qualified type name.
*/
function trimLeadingDot(typeName) {
	return typeName.startsWith(".") ? typeName.substring(1) : typeName;
}
/**
* Did the user put the field in a oneof group?
* Synthetic oneofs for proto3 optionals are ignored.
*/
function findOneof(proto, allOneofs) {
	if (!unsafeIsSetExplicit(proto, "oneofIndex")) return;
	if (proto.proto3Optional) return;
	const oneof = allOneofs[proto.oneofIndex];
	assert(oneof, `invalid FieldDescriptorProto: oneof #${proto.oneofIndex} for field #${proto.number} not found`);
	return oneof;
}
/**
* Presence of the field.
* See https://protobuf.dev/programming-guides/field_presence/
*/
function getFieldPresence(proto, oneof, isExtension, parent) {
	if (proto.label == LABEL_REQUIRED) return LEGACY_REQUIRED$2;
	if (proto.label == LABEL_REPEATED) return IMPLICIT$3;
	if (!!oneof || proto.proto3Optional) return EXPLICIT;
	if (isExtension) return EXPLICIT;
	const resolved = resolveFeature("fieldPresence", {
		proto,
		parent
	});
	if (resolved == IMPLICIT$3 && (proto.type == TYPE_MESSAGE || proto.type == TYPE_GROUP)) return EXPLICIT;
	return resolved;
}
/**
* Pack this repeated field?
*/
function isPackedField(proto, parent) {
	if (proto.label != LABEL_REPEATED) return false;
	switch (proto.type) {
		case TYPE_STRING:
		case TYPE_BYTES:
		case TYPE_GROUP:
		case TYPE_MESSAGE: return false;
	}
	const o = proto.options;
	if (o && unsafeIsSetExplicit(o, "packed")) return o.packed;
	return PACKED == resolveFeature("repeatedFieldEncoding", {
		proto,
		parent
	});
}
/**
* Find the key and value fields of a synthetic map entry message.
*/
function findMapEntryFields(mapEntry) {
	const key = mapEntry.fields.find((f) => f.number === 1);
	const value = mapEntry.fields.find((f) => f.number === 2);
	assert(key && key.fieldKind == "scalar" && key.scalar != ScalarType.BYTES && key.scalar != ScalarType.FLOAT && key.scalar != ScalarType.DOUBLE && value && value.fieldKind != "list" && value.fieldKind != "map");
	return {
		key,
		value
	};
}
/**
* Enumerations can be open or closed.
* See https://protobuf.dev/programming-guides/enum/
*/
function isEnumOpen(desc) {
	var _a;
	return OPEN == resolveFeature("enumType", {
		proto: desc.proto,
		parent: (_a = desc.parent) !== null && _a !== void 0 ? _a : desc.file
	});
}
/**
* Encode the message delimited (a.k.a. proto2 group encoding), or
* length-prefixed?
*/
function isDelimitedEncoding(proto, parent) {
	if (proto.type == TYPE_GROUP) return true;
	return DELIMITED == resolveFeature("messageEncoding", {
		proto,
		parent
	});
}
/**
* Reject invalid UTF-8 when reading string fields from the binary wire format?
* Driven by the resolved `utf8_validation` feature: VERIFY (proto3 / editions
* 2023+ default) enforces; NONE (proto2 default) does not.
*/
function isUtf8Validated(proto, parent) {
	return VERIFY == resolveFeature("utf8Validation", {
		proto,
		parent
	});
}
function resolveFeature(name, ref) {
	var _a, _b;
	const featureSet = (_a = ref.proto.options) === null || _a === void 0 ? void 0 : _a.features;
	if (featureSet) {
		const val = featureSet[name];
		if (val != 0) return val;
	}
	if ("kind" in ref) {
		if (ref.kind == "message") return resolveFeature(name, (_b = ref.parent) !== null && _b !== void 0 ? _b : ref.file);
		const editionDefaults = featureDefaults[ref.edition];
		if (!editionDefaults) throw new Error(`feature default for edition ${ref.edition} not found`);
		return editionDefaults[name];
	}
	return resolveFeature(name, ref.parent);
}
/**
* Assert that condition is truthy or throw error (with message)
*/
function assert(condition, msg) {
	if (!condition) throw new Error(msg);
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/codegenv2/boot.js
/**
* Hydrate a file descriptor for google/protobuf/descriptor.proto from a plain
* object.
*
* See createFileDescriptorProtoBoot() for details.
*
* @private
*/
function boot(boot) {
	const root = bootFileDescriptorProto(boot);
	root.messageType.forEach(restoreJsonNames);
	return createFileRegistry(root, () => void 0).getFile(root.name);
}
/**
* Creates the message google.protobuf.FileDescriptorProto from an object literal.
*
* See createFileDescriptorProtoBoot() for details.
*
* @private
*/
function bootFileDescriptorProto(init) {
	return Object.assign(Object.create({
		syntax: "",
		edition: 0
	}), Object.assign(Object.assign({
		$typeName: "google.protobuf.FileDescriptorProto",
		dependency: [],
		publicDependency: [],
		weakDependency: [],
		optionDependency: [],
		service: [],
		extension: []
	}, init), {
		messageType: init.messageType.map(bootDescriptorProto),
		enumType: init.enumType.map(bootEnumDescriptorProto)
	}));
}
function bootDescriptorProto(init) {
	var _a, _b, _c, _d, _e, _f, _g, _h;
	return Object.assign(Object.create({ visibility: 0 }), {
		$typeName: "google.protobuf.DescriptorProto",
		name: init.name,
		field: (_b = (_a = init.field) === null || _a === void 0 ? void 0 : _a.map(bootFieldDescriptorProto)) !== null && _b !== void 0 ? _b : [],
		extension: [],
		nestedType: (_d = (_c = init.nestedType) === null || _c === void 0 ? void 0 : _c.map(bootDescriptorProto)) !== null && _d !== void 0 ? _d : [],
		enumType: (_f = (_e = init.enumType) === null || _e === void 0 ? void 0 : _e.map(bootEnumDescriptorProto)) !== null && _f !== void 0 ? _f : [],
		extensionRange: (_h = (_g = init.extensionRange) === null || _g === void 0 ? void 0 : _g.map((e) => Object.assign({ $typeName: "google.protobuf.DescriptorProto.ExtensionRange" }, e))) !== null && _h !== void 0 ? _h : [],
		oneofDecl: [],
		reservedRange: [],
		reservedName: []
	});
}
function bootFieldDescriptorProto(init) {
	return Object.assign(Object.create({
		label: 1,
		typeName: "",
		extendee: "",
		defaultValue: "",
		oneofIndex: 0,
		jsonName: "",
		proto3Optional: false
	}), Object.assign(Object.assign({ $typeName: "google.protobuf.FieldDescriptorProto" }, init), { options: init.options ? bootFieldOptions(init.options) : void 0 }));
}
function bootFieldOptions(init) {
	var _a, _b, _c;
	return Object.assign(Object.create({
		ctype: 0,
		packed: false,
		jstype: 0,
		lazy: false,
		unverifiedLazy: false,
		deprecated: false,
		weak: false,
		debugRedact: false,
		retention: 0
	}), Object.assign(Object.assign({ $typeName: "google.protobuf.FieldOptions" }, init), {
		targets: (_a = init.targets) !== null && _a !== void 0 ? _a : [],
		editionDefaults: (_c = (_b = init.editionDefaults) === null || _b === void 0 ? void 0 : _b.map((e) => Object.assign({ $typeName: "google.protobuf.FieldOptions.EditionDefault" }, e))) !== null && _c !== void 0 ? _c : [],
		uninterpretedOption: []
	}));
}
function bootEnumDescriptorProto(init) {
	return Object.assign(Object.create({ visibility: 0 }), {
		$typeName: "google.protobuf.EnumDescriptorProto",
		name: init.name,
		reservedName: [],
		reservedRange: [],
		value: init.value.map((e) => Object.assign({ $typeName: "google.protobuf.EnumValueDescriptorProto" }, e))
	});
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/codegenv2/message.js
/**
* Hydrate a message descriptor.
*
* @private
*/
function messageDesc(file, path, ...paths) {
	return paths.reduce((acc, cur) => acc.nestedMessages[cur], file.messages[path]);
}
/**
* Describes the message google.protobuf.FileDescriptorProto.
* Use `create(FileDescriptorProtoSchema)` to create a new message.
*/
var FileDescriptorProtoSchema = /*@__PURE__*/ messageDesc(/* @__PURE__ */ boot({
	"name": "google/protobuf/descriptor.proto",
	"package": "google.protobuf",
	"messageType": [
		{
			"name": "FileDescriptorSet",
			"field": [{
				"name": "file",
				"number": 1,
				"type": 11,
				"label": 3,
				"typeName": ".google.protobuf.FileDescriptorProto"
			}],
			"extensionRange": [{
				"start": 536e6,
				"end": 536000001
			}]
		},
		{
			"name": "FileDescriptorProto",
			"field": [
				{
					"name": "name",
					"number": 1,
					"type": 9,
					"label": 1
				},
				{
					"name": "package",
					"number": 2,
					"type": 9,
					"label": 1
				},
				{
					"name": "dependency",
					"number": 3,
					"type": 9,
					"label": 3
				},
				{
					"name": "public_dependency",
					"number": 10,
					"type": 5,
					"label": 3
				},
				{
					"name": "weak_dependency",
					"number": 11,
					"type": 5,
					"label": 3
				},
				{
					"name": "option_dependency",
					"number": 15,
					"type": 9,
					"label": 3
				},
				{
					"name": "message_type",
					"number": 4,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.DescriptorProto"
				},
				{
					"name": "enum_type",
					"number": 5,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.EnumDescriptorProto"
				},
				{
					"name": "service",
					"number": 6,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.ServiceDescriptorProto"
				},
				{
					"name": "extension",
					"number": 7,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.FieldDescriptorProto"
				},
				{
					"name": "options",
					"number": 8,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.FileOptions"
				},
				{
					"name": "source_code_info",
					"number": 9,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.SourceCodeInfo"
				},
				{
					"name": "syntax",
					"number": 12,
					"type": 9,
					"label": 1
				},
				{
					"name": "edition",
					"number": 14,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.Edition"
				}
			]
		},
		{
			"name": "DescriptorProto",
			"field": [
				{
					"name": "name",
					"number": 1,
					"type": 9,
					"label": 1
				},
				{
					"name": "field",
					"number": 2,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.FieldDescriptorProto"
				},
				{
					"name": "extension",
					"number": 6,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.FieldDescriptorProto"
				},
				{
					"name": "nested_type",
					"number": 3,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.DescriptorProto"
				},
				{
					"name": "enum_type",
					"number": 4,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.EnumDescriptorProto"
				},
				{
					"name": "extension_range",
					"number": 5,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.DescriptorProto.ExtensionRange"
				},
				{
					"name": "oneof_decl",
					"number": 8,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.OneofDescriptorProto"
				},
				{
					"name": "options",
					"number": 7,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.MessageOptions"
				},
				{
					"name": "reserved_range",
					"number": 9,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.DescriptorProto.ReservedRange"
				},
				{
					"name": "reserved_name",
					"number": 10,
					"type": 9,
					"label": 3
				},
				{
					"name": "visibility",
					"number": 11,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.SymbolVisibility"
				}
			],
			"nestedType": [{
				"name": "ExtensionRange",
				"field": [
					{
						"name": "start",
						"number": 1,
						"type": 5,
						"label": 1
					},
					{
						"name": "end",
						"number": 2,
						"type": 5,
						"label": 1
					},
					{
						"name": "options",
						"number": 3,
						"type": 11,
						"label": 1,
						"typeName": ".google.protobuf.ExtensionRangeOptions"
					}
				]
			}, {
				"name": "ReservedRange",
				"field": [{
					"name": "start",
					"number": 1,
					"type": 5,
					"label": 1
				}, {
					"name": "end",
					"number": 2,
					"type": 5,
					"label": 1
				}]
			}]
		},
		{
			"name": "ExtensionRangeOptions",
			"field": [
				{
					"name": "uninterpreted_option",
					"number": 999,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.UninterpretedOption"
				},
				{
					"name": "declaration",
					"number": 2,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.ExtensionRangeOptions.Declaration",
					"options": { "retention": 2 }
				},
				{
					"name": "features",
					"number": 50,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet"
				},
				{
					"name": "verification",
					"number": 3,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.ExtensionRangeOptions.VerificationState",
					"defaultValue": "UNVERIFIED",
					"options": { "retention": 2 }
				}
			],
			"nestedType": [{
				"name": "Declaration",
				"field": [
					{
						"name": "number",
						"number": 1,
						"type": 5,
						"label": 1
					},
					{
						"name": "full_name",
						"number": 2,
						"type": 9,
						"label": 1
					},
					{
						"name": "type",
						"number": 3,
						"type": 9,
						"label": 1
					},
					{
						"name": "reserved",
						"number": 5,
						"type": 8,
						"label": 1
					},
					{
						"name": "repeated",
						"number": 6,
						"type": 8,
						"label": 1
					}
				]
			}],
			"enumType": [{
				"name": "VerificationState",
				"value": [{
					"name": "DECLARATION",
					"number": 0
				}, {
					"name": "UNVERIFIED",
					"number": 1
				}]
			}],
			"extensionRange": [{
				"start": 1e3,
				"end": 536870912
			}]
		},
		{
			"name": "FieldDescriptorProto",
			"field": [
				{
					"name": "name",
					"number": 1,
					"type": 9,
					"label": 1
				},
				{
					"name": "number",
					"number": 3,
					"type": 5,
					"label": 1
				},
				{
					"name": "label",
					"number": 4,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.FieldDescriptorProto.Label"
				},
				{
					"name": "type",
					"number": 5,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.FieldDescriptorProto.Type"
				},
				{
					"name": "type_name",
					"number": 6,
					"type": 9,
					"label": 1
				},
				{
					"name": "extendee",
					"number": 2,
					"type": 9,
					"label": 1
				},
				{
					"name": "default_value",
					"number": 7,
					"type": 9,
					"label": 1
				},
				{
					"name": "oneof_index",
					"number": 9,
					"type": 5,
					"label": 1
				},
				{
					"name": "json_name",
					"number": 10,
					"type": 9,
					"label": 1
				},
				{
					"name": "options",
					"number": 8,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.FieldOptions"
				},
				{
					"name": "proto3_optional",
					"number": 17,
					"type": 8,
					"label": 1
				}
			],
			"enumType": [{
				"name": "Type",
				"value": [
					{
						"name": "TYPE_DOUBLE",
						"number": 1
					},
					{
						"name": "TYPE_FLOAT",
						"number": 2
					},
					{
						"name": "TYPE_INT64",
						"number": 3
					},
					{
						"name": "TYPE_UINT64",
						"number": 4
					},
					{
						"name": "TYPE_INT32",
						"number": 5
					},
					{
						"name": "TYPE_FIXED64",
						"number": 6
					},
					{
						"name": "TYPE_FIXED32",
						"number": 7
					},
					{
						"name": "TYPE_BOOL",
						"number": 8
					},
					{
						"name": "TYPE_STRING",
						"number": 9
					},
					{
						"name": "TYPE_GROUP",
						"number": 10
					},
					{
						"name": "TYPE_MESSAGE",
						"number": 11
					},
					{
						"name": "TYPE_BYTES",
						"number": 12
					},
					{
						"name": "TYPE_UINT32",
						"number": 13
					},
					{
						"name": "TYPE_ENUM",
						"number": 14
					},
					{
						"name": "TYPE_SFIXED32",
						"number": 15
					},
					{
						"name": "TYPE_SFIXED64",
						"number": 16
					},
					{
						"name": "TYPE_SINT32",
						"number": 17
					},
					{
						"name": "TYPE_SINT64",
						"number": 18
					}
				]
			}, {
				"name": "Label",
				"value": [
					{
						"name": "LABEL_OPTIONAL",
						"number": 1
					},
					{
						"name": "LABEL_REPEATED",
						"number": 3
					},
					{
						"name": "LABEL_REQUIRED",
						"number": 2
					}
				]
			}]
		},
		{
			"name": "OneofDescriptorProto",
			"field": [{
				"name": "name",
				"number": 1,
				"type": 9,
				"label": 1
			}, {
				"name": "options",
				"number": 2,
				"type": 11,
				"label": 1,
				"typeName": ".google.protobuf.OneofOptions"
			}]
		},
		{
			"name": "EnumDescriptorProto",
			"field": [
				{
					"name": "name",
					"number": 1,
					"type": 9,
					"label": 1
				},
				{
					"name": "value",
					"number": 2,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.EnumValueDescriptorProto"
				},
				{
					"name": "options",
					"number": 3,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.EnumOptions"
				},
				{
					"name": "reserved_range",
					"number": 4,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.EnumDescriptorProto.EnumReservedRange"
				},
				{
					"name": "reserved_name",
					"number": 5,
					"type": 9,
					"label": 3
				},
				{
					"name": "visibility",
					"number": 6,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.SymbolVisibility"
				}
			],
			"nestedType": [{
				"name": "EnumReservedRange",
				"field": [{
					"name": "start",
					"number": 1,
					"type": 5,
					"label": 1
				}, {
					"name": "end",
					"number": 2,
					"type": 5,
					"label": 1
				}]
			}]
		},
		{
			"name": "EnumValueDescriptorProto",
			"field": [
				{
					"name": "name",
					"number": 1,
					"type": 9,
					"label": 1
				},
				{
					"name": "number",
					"number": 2,
					"type": 5,
					"label": 1
				},
				{
					"name": "options",
					"number": 3,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.EnumValueOptions"
				}
			]
		},
		{
			"name": "ServiceDescriptorProto",
			"field": [
				{
					"name": "name",
					"number": 1,
					"type": 9,
					"label": 1
				},
				{
					"name": "method",
					"number": 2,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.MethodDescriptorProto"
				},
				{
					"name": "options",
					"number": 3,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.ServiceOptions"
				}
			]
		},
		{
			"name": "MethodDescriptorProto",
			"field": [
				{
					"name": "name",
					"number": 1,
					"type": 9,
					"label": 1
				},
				{
					"name": "input_type",
					"number": 2,
					"type": 9,
					"label": 1
				},
				{
					"name": "output_type",
					"number": 3,
					"type": 9,
					"label": 1
				},
				{
					"name": "options",
					"number": 4,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.MethodOptions"
				},
				{
					"name": "client_streaming",
					"number": 5,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "server_streaming",
					"number": 6,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				}
			]
		},
		{
			"name": "FileOptions",
			"field": [
				{
					"name": "java_package",
					"number": 1,
					"type": 9,
					"label": 1
				},
				{
					"name": "java_outer_classname",
					"number": 8,
					"type": 9,
					"label": 1
				},
				{
					"name": "java_multiple_files",
					"number": 10,
					"type": 8,
					"label": 1,
					"defaultValue": "false",
					"options": {}
				},
				{
					"name": "java_generate_equals_and_hash",
					"number": 20,
					"type": 8,
					"label": 1,
					"options": { "deprecated": true }
				},
				{
					"name": "java_string_check_utf8",
					"number": 27,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "optimize_for",
					"number": 9,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.FileOptions.OptimizeMode",
					"defaultValue": "SPEED"
				},
				{
					"name": "go_package",
					"number": 11,
					"type": 9,
					"label": 1
				},
				{
					"name": "cc_generic_services",
					"number": 16,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "java_generic_services",
					"number": 17,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "py_generic_services",
					"number": 18,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "deprecated",
					"number": 23,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "cc_enable_arenas",
					"number": 31,
					"type": 8,
					"label": 1,
					"defaultValue": "true"
				},
				{
					"name": "objc_class_prefix",
					"number": 36,
					"type": 9,
					"label": 1
				},
				{
					"name": "csharp_namespace",
					"number": 37,
					"type": 9,
					"label": 1
				},
				{
					"name": "swift_prefix",
					"number": 39,
					"type": 9,
					"label": 1
				},
				{
					"name": "php_class_prefix",
					"number": 40,
					"type": 9,
					"label": 1
				},
				{
					"name": "php_namespace",
					"number": 41,
					"type": 9,
					"label": 1
				},
				{
					"name": "php_metadata_namespace",
					"number": 44,
					"type": 9,
					"label": 1
				},
				{
					"name": "ruby_package",
					"number": 45,
					"type": 9,
					"label": 1
				},
				{
					"name": "features",
					"number": 50,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet"
				},
				{
					"name": "uninterpreted_option",
					"number": 999,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.UninterpretedOption"
				}
			],
			"enumType": [{
				"name": "OptimizeMode",
				"value": [
					{
						"name": "SPEED",
						"number": 1
					},
					{
						"name": "CODE_SIZE",
						"number": 2
					},
					{
						"name": "LITE_RUNTIME",
						"number": 3
					}
				]
			}],
			"extensionRange": [{
				"start": 1e3,
				"end": 536870912
			}]
		},
		{
			"name": "MessageOptions",
			"field": [
				{
					"name": "message_set_wire_format",
					"number": 1,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "no_standard_descriptor_accessor",
					"number": 2,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "deprecated",
					"number": 3,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "map_entry",
					"number": 7,
					"type": 8,
					"label": 1
				},
				{
					"name": "deprecated_legacy_json_field_conflicts",
					"number": 11,
					"type": 8,
					"label": 1,
					"options": { "deprecated": true }
				},
				{
					"name": "features",
					"number": 12,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet"
				},
				{
					"name": "uninterpreted_option",
					"number": 999,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.UninterpretedOption"
				}
			],
			"extensionRange": [{
				"start": 1e3,
				"end": 536870912
			}]
		},
		{
			"name": "FieldOptions",
			"field": [
				{
					"name": "ctype",
					"number": 1,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.FieldOptions.CType",
					"defaultValue": "STRING"
				},
				{
					"name": "packed",
					"number": 2,
					"type": 8,
					"label": 1
				},
				{
					"name": "jstype",
					"number": 6,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.FieldOptions.JSType",
					"defaultValue": "JS_NORMAL"
				},
				{
					"name": "lazy",
					"number": 5,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "unverified_lazy",
					"number": 15,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "deprecated",
					"number": 3,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "weak",
					"number": 10,
					"type": 8,
					"label": 1,
					"defaultValue": "false",
					"options": { "deprecated": true }
				},
				{
					"name": "debug_redact",
					"number": 16,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "retention",
					"number": 17,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.FieldOptions.OptionRetention"
				},
				{
					"name": "targets",
					"number": 19,
					"type": 14,
					"label": 3,
					"typeName": ".google.protobuf.FieldOptions.OptionTargetType"
				},
				{
					"name": "edition_defaults",
					"number": 20,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.FieldOptions.EditionDefault"
				},
				{
					"name": "features",
					"number": 21,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet"
				},
				{
					"name": "feature_support",
					"number": 22,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.FieldOptions.FeatureSupport"
				},
				{
					"name": "uninterpreted_option",
					"number": 999,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.UninterpretedOption"
				}
			],
			"nestedType": [{
				"name": "EditionDefault",
				"field": [{
					"name": "edition",
					"number": 3,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.Edition"
				}, {
					"name": "value",
					"number": 2,
					"type": 9,
					"label": 1
				}]
			}, {
				"name": "FeatureSupport",
				"field": [
					{
						"name": "edition_introduced",
						"number": 1,
						"type": 14,
						"label": 1,
						"typeName": ".google.protobuf.Edition"
					},
					{
						"name": "edition_deprecated",
						"number": 2,
						"type": 14,
						"label": 1,
						"typeName": ".google.protobuf.Edition"
					},
					{
						"name": "deprecation_warning",
						"number": 3,
						"type": 9,
						"label": 1
					},
					{
						"name": "edition_removed",
						"number": 4,
						"type": 14,
						"label": 1,
						"typeName": ".google.protobuf.Edition"
					},
					{
						"name": "removal_error",
						"number": 5,
						"type": 9,
						"label": 1
					}
				]
			}],
			"enumType": [
				{
					"name": "CType",
					"value": [
						{
							"name": "STRING",
							"number": 0
						},
						{
							"name": "CORD",
							"number": 1
						},
						{
							"name": "STRING_PIECE",
							"number": 2
						}
					]
				},
				{
					"name": "JSType",
					"value": [
						{
							"name": "JS_NORMAL",
							"number": 0
						},
						{
							"name": "JS_STRING",
							"number": 1
						},
						{
							"name": "JS_NUMBER",
							"number": 2
						}
					]
				},
				{
					"name": "OptionRetention",
					"value": [
						{
							"name": "RETENTION_UNKNOWN",
							"number": 0
						},
						{
							"name": "RETENTION_RUNTIME",
							"number": 1
						},
						{
							"name": "RETENTION_SOURCE",
							"number": 2
						}
					]
				},
				{
					"name": "OptionTargetType",
					"value": [
						{
							"name": "TARGET_TYPE_UNKNOWN",
							"number": 0
						},
						{
							"name": "TARGET_TYPE_FILE",
							"number": 1
						},
						{
							"name": "TARGET_TYPE_EXTENSION_RANGE",
							"number": 2
						},
						{
							"name": "TARGET_TYPE_MESSAGE",
							"number": 3
						},
						{
							"name": "TARGET_TYPE_FIELD",
							"number": 4
						},
						{
							"name": "TARGET_TYPE_ONEOF",
							"number": 5
						},
						{
							"name": "TARGET_TYPE_ENUM",
							"number": 6
						},
						{
							"name": "TARGET_TYPE_ENUM_ENTRY",
							"number": 7
						},
						{
							"name": "TARGET_TYPE_SERVICE",
							"number": 8
						},
						{
							"name": "TARGET_TYPE_METHOD",
							"number": 9
						}
					]
				}
			],
			"extensionRange": [{
				"start": 1e3,
				"end": 536870912
			}]
		},
		{
			"name": "OneofOptions",
			"field": [{
				"name": "features",
				"number": 1,
				"type": 11,
				"label": 1,
				"typeName": ".google.protobuf.FeatureSet"
			}, {
				"name": "uninterpreted_option",
				"number": 999,
				"type": 11,
				"label": 3,
				"typeName": ".google.protobuf.UninterpretedOption"
			}],
			"extensionRange": [{
				"start": 1e3,
				"end": 536870912
			}]
		},
		{
			"name": "EnumOptions",
			"field": [
				{
					"name": "allow_alias",
					"number": 2,
					"type": 8,
					"label": 1
				},
				{
					"name": "deprecated",
					"number": 3,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "deprecated_legacy_json_field_conflicts",
					"number": 6,
					"type": 8,
					"label": 1,
					"options": { "deprecated": true }
				},
				{
					"name": "features",
					"number": 7,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet"
				},
				{
					"name": "uninterpreted_option",
					"number": 999,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.UninterpretedOption"
				}
			],
			"extensionRange": [{
				"start": 1e3,
				"end": 536870912
			}]
		},
		{
			"name": "EnumValueOptions",
			"field": [
				{
					"name": "deprecated",
					"number": 1,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "features",
					"number": 2,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet"
				},
				{
					"name": "debug_redact",
					"number": 3,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "feature_support",
					"number": 4,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.FieldOptions.FeatureSupport"
				},
				{
					"name": "uninterpreted_option",
					"number": 999,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.UninterpretedOption"
				}
			],
			"extensionRange": [{
				"start": 1e3,
				"end": 536870912
			}]
		},
		{
			"name": "ServiceOptions",
			"field": [
				{
					"name": "features",
					"number": 34,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet"
				},
				{
					"name": "deprecated",
					"number": 33,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "uninterpreted_option",
					"number": 999,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.UninterpretedOption"
				}
			],
			"extensionRange": [{
				"start": 1e3,
				"end": 536870912
			}]
		},
		{
			"name": "MethodOptions",
			"field": [
				{
					"name": "deprecated",
					"number": 33,
					"type": 8,
					"label": 1,
					"defaultValue": "false"
				},
				{
					"name": "idempotency_level",
					"number": 34,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.MethodOptions.IdempotencyLevel",
					"defaultValue": "IDEMPOTENCY_UNKNOWN"
				},
				{
					"name": "features",
					"number": 35,
					"type": 11,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet"
				},
				{
					"name": "uninterpreted_option",
					"number": 999,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.UninterpretedOption"
				}
			],
			"enumType": [{
				"name": "IdempotencyLevel",
				"value": [
					{
						"name": "IDEMPOTENCY_UNKNOWN",
						"number": 0
					},
					{
						"name": "NO_SIDE_EFFECTS",
						"number": 1
					},
					{
						"name": "IDEMPOTENT",
						"number": 2
					}
				]
			}],
			"extensionRange": [{
				"start": 1e3,
				"end": 536870912
			}]
		},
		{
			"name": "UninterpretedOption",
			"field": [
				{
					"name": "name",
					"number": 2,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.UninterpretedOption.NamePart"
				},
				{
					"name": "identifier_value",
					"number": 3,
					"type": 9,
					"label": 1
				},
				{
					"name": "positive_int_value",
					"number": 4,
					"type": 4,
					"label": 1
				},
				{
					"name": "negative_int_value",
					"number": 5,
					"type": 3,
					"label": 1
				},
				{
					"name": "double_value",
					"number": 6,
					"type": 1,
					"label": 1
				},
				{
					"name": "string_value",
					"number": 7,
					"type": 12,
					"label": 1
				},
				{
					"name": "aggregate_value",
					"number": 8,
					"type": 9,
					"label": 1
				}
			],
			"nestedType": [{
				"name": "NamePart",
				"field": [{
					"name": "name_part",
					"number": 1,
					"type": 9,
					"label": 2
				}, {
					"name": "is_extension",
					"number": 2,
					"type": 8,
					"label": 2
				}]
			}]
		},
		{
			"name": "FeatureSet",
			"field": [
				{
					"name": "field_presence",
					"number": 1,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet.FieldPresence",
					"options": {
						"retention": 1,
						"targets": [4, 1],
						"editionDefaults": [
							{
								"value": "EXPLICIT",
								"edition": 900
							},
							{
								"value": "IMPLICIT",
								"edition": 999
							},
							{
								"value": "EXPLICIT",
								"edition": 1e3
							}
						]
					}
				},
				{
					"name": "enum_type",
					"number": 2,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet.EnumType",
					"options": {
						"retention": 1,
						"targets": [6, 1],
						"editionDefaults": [{
							"value": "CLOSED",
							"edition": 900
						}, {
							"value": "OPEN",
							"edition": 999
						}]
					}
				},
				{
					"name": "repeated_field_encoding",
					"number": 3,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet.RepeatedFieldEncoding",
					"options": {
						"retention": 1,
						"targets": [4, 1],
						"editionDefaults": [{
							"value": "EXPANDED",
							"edition": 900
						}, {
							"value": "PACKED",
							"edition": 999
						}]
					}
				},
				{
					"name": "utf8_validation",
					"number": 4,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet.Utf8Validation",
					"options": {
						"retention": 1,
						"targets": [4, 1],
						"editionDefaults": [{
							"value": "NONE",
							"edition": 900
						}, {
							"value": "VERIFY",
							"edition": 999
						}]
					}
				},
				{
					"name": "message_encoding",
					"number": 5,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet.MessageEncoding",
					"options": {
						"retention": 1,
						"targets": [4, 1],
						"editionDefaults": [{
							"value": "LENGTH_PREFIXED",
							"edition": 900
						}]
					}
				},
				{
					"name": "json_format",
					"number": 6,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet.JsonFormat",
					"options": {
						"retention": 1,
						"targets": [
							3,
							6,
							1
						],
						"editionDefaults": [{
							"value": "LEGACY_BEST_EFFORT",
							"edition": 900
						}, {
							"value": "ALLOW",
							"edition": 999
						}]
					}
				},
				{
					"name": "enforce_naming_style",
					"number": 7,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet.EnforceNamingStyle",
					"options": {
						"retention": 2,
						"targets": [
							1,
							2,
							3,
							4,
							5,
							6,
							7,
							8,
							9
						],
						"editionDefaults": [{
							"value": "STYLE_LEGACY",
							"edition": 900
						}, {
							"value": "STYLE2024",
							"edition": 1001
						}]
					}
				},
				{
					"name": "default_symbol_visibility",
					"number": 8,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.FeatureSet.VisibilityFeature.DefaultSymbolVisibility",
					"options": {
						"retention": 2,
						"targets": [1],
						"editionDefaults": [{
							"value": "EXPORT_ALL",
							"edition": 900
						}, {
							"value": "EXPORT_TOP_LEVEL",
							"edition": 1001
						}]
					}
				}
			],
			"nestedType": [{
				"name": "VisibilityFeature",
				"enumType": [{
					"name": "DefaultSymbolVisibility",
					"value": [
						{
							"name": "DEFAULT_SYMBOL_VISIBILITY_UNKNOWN",
							"number": 0
						},
						{
							"name": "EXPORT_ALL",
							"number": 1
						},
						{
							"name": "EXPORT_TOP_LEVEL",
							"number": 2
						},
						{
							"name": "LOCAL_ALL",
							"number": 3
						},
						{
							"name": "STRICT",
							"number": 4
						}
					]
				}]
			}],
			"enumType": [
				{
					"name": "FieldPresence",
					"value": [
						{
							"name": "FIELD_PRESENCE_UNKNOWN",
							"number": 0
						},
						{
							"name": "EXPLICIT",
							"number": 1
						},
						{
							"name": "IMPLICIT",
							"number": 2
						},
						{
							"name": "LEGACY_REQUIRED",
							"number": 3
						}
					]
				},
				{
					"name": "EnumType",
					"value": [
						{
							"name": "ENUM_TYPE_UNKNOWN",
							"number": 0
						},
						{
							"name": "OPEN",
							"number": 1
						},
						{
							"name": "CLOSED",
							"number": 2
						}
					]
				},
				{
					"name": "RepeatedFieldEncoding",
					"value": [
						{
							"name": "REPEATED_FIELD_ENCODING_UNKNOWN",
							"number": 0
						},
						{
							"name": "PACKED",
							"number": 1
						},
						{
							"name": "EXPANDED",
							"number": 2
						}
					]
				},
				{
					"name": "Utf8Validation",
					"value": [
						{
							"name": "UTF8_VALIDATION_UNKNOWN",
							"number": 0
						},
						{
							"name": "VERIFY",
							"number": 2
						},
						{
							"name": "NONE",
							"number": 3
						}
					]
				},
				{
					"name": "MessageEncoding",
					"value": [
						{
							"name": "MESSAGE_ENCODING_UNKNOWN",
							"number": 0
						},
						{
							"name": "LENGTH_PREFIXED",
							"number": 1
						},
						{
							"name": "DELIMITED",
							"number": 2
						}
					]
				},
				{
					"name": "JsonFormat",
					"value": [
						{
							"name": "JSON_FORMAT_UNKNOWN",
							"number": 0
						},
						{
							"name": "ALLOW",
							"number": 1
						},
						{
							"name": "LEGACY_BEST_EFFORT",
							"number": 2
						}
					]
				},
				{
					"name": "EnforceNamingStyle",
					"value": [
						{
							"name": "ENFORCE_NAMING_STYLE_UNKNOWN",
							"number": 0
						},
						{
							"name": "STYLE2024",
							"number": 1
						},
						{
							"name": "STYLE_LEGACY",
							"number": 2
						}
					]
				}
			],
			"extensionRange": [
				{
					"start": 1e3,
					"end": 9995
				},
				{
					"start": 9995,
					"end": 1e4
				},
				{
					"start": 1e4,
					"end": 10001
				}
			]
		},
		{
			"name": "FeatureSetDefaults",
			"field": [
				{
					"name": "defaults",
					"number": 1,
					"type": 11,
					"label": 3,
					"typeName": ".google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault"
				},
				{
					"name": "minimum_edition",
					"number": 4,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.Edition"
				},
				{
					"name": "maximum_edition",
					"number": 5,
					"type": 14,
					"label": 1,
					"typeName": ".google.protobuf.Edition"
				}
			],
			"nestedType": [{
				"name": "FeatureSetEditionDefault",
				"field": [
					{
						"name": "edition",
						"number": 3,
						"type": 14,
						"label": 1,
						"typeName": ".google.protobuf.Edition"
					},
					{
						"name": "overridable_features",
						"number": 4,
						"type": 11,
						"label": 1,
						"typeName": ".google.protobuf.FeatureSet"
					},
					{
						"name": "fixed_features",
						"number": 5,
						"type": 11,
						"label": 1,
						"typeName": ".google.protobuf.FeatureSet"
					}
				]
			}]
		},
		{
			"name": "SourceCodeInfo",
			"field": [{
				"name": "location",
				"number": 1,
				"type": 11,
				"label": 3,
				"typeName": ".google.protobuf.SourceCodeInfo.Location"
			}],
			"nestedType": [{
				"name": "Location",
				"field": [
					{
						"name": "path",
						"number": 1,
						"type": 5,
						"label": 3,
						"options": { "packed": true }
					},
					{
						"name": "span",
						"number": 2,
						"type": 5,
						"label": 3,
						"options": { "packed": true }
					},
					{
						"name": "leading_comments",
						"number": 3,
						"type": 9,
						"label": 1
					},
					{
						"name": "trailing_comments",
						"number": 4,
						"type": 9,
						"label": 1
					},
					{
						"name": "leading_detached_comments",
						"number": 6,
						"type": 9,
						"label": 3
					}
				]
			}],
			"extensionRange": [{
				"start": 536e6,
				"end": 536000001
			}]
		},
		{
			"name": "GeneratedCodeInfo",
			"field": [{
				"name": "annotation",
				"number": 1,
				"type": 11,
				"label": 3,
				"typeName": ".google.protobuf.GeneratedCodeInfo.Annotation"
			}],
			"nestedType": [{
				"name": "Annotation",
				"field": [
					{
						"name": "path",
						"number": 1,
						"type": 5,
						"label": 3,
						"options": { "packed": true }
					},
					{
						"name": "source_file",
						"number": 2,
						"type": 9,
						"label": 1
					},
					{
						"name": "begin",
						"number": 3,
						"type": 5,
						"label": 1
					},
					{
						"name": "end",
						"number": 4,
						"type": 5,
						"label": 1
					},
					{
						"name": "semantic",
						"number": 5,
						"type": 14,
						"label": 1,
						"typeName": ".google.protobuf.GeneratedCodeInfo.Annotation.Semantic"
					}
				],
				"enumType": [{
					"name": "Semantic",
					"value": [
						{
							"name": "NONE",
							"number": 0
						},
						{
							"name": "SET",
							"number": 1
						},
						{
							"name": "ALIAS",
							"number": 2
						}
					]
				}]
			}]
		}
	],
	"enumType": [{
		"name": "Edition",
		"value": [
			{
				"name": "EDITION_UNKNOWN",
				"number": 0
			},
			{
				"name": "EDITION_LEGACY",
				"number": 900
			},
			{
				"name": "EDITION_PROTO2",
				"number": 998
			},
			{
				"name": "EDITION_PROTO3",
				"number": 999
			},
			{
				"name": "EDITION_2023",
				"number": 1e3
			},
			{
				"name": "EDITION_2024",
				"number": 1001
			},
			{
				"name": "EDITION_UNSTABLE",
				"number": 9999
			},
			{
				"name": "EDITION_1_TEST_ONLY",
				"number": 1
			},
			{
				"name": "EDITION_2_TEST_ONLY",
				"number": 2
			},
			{
				"name": "EDITION_99997_TEST_ONLY",
				"number": 99997
			},
			{
				"name": "EDITION_99998_TEST_ONLY",
				"number": 99998
			},
			{
				"name": "EDITION_99999_TEST_ONLY",
				"number": 99999
			},
			{
				"name": "EDITION_MAX",
				"number": 2147483647
			}
		]
	}, {
		"name": "SymbolVisibility",
		"value": [
			{
				"name": "VISIBILITY_UNSET",
				"number": 0
			},
			{
				"name": "VISIBILITY_LOCAL",
				"number": 1
			},
			{
				"name": "VISIBILITY_EXPORT",
				"number": 2
			}
		]
	}]
}), 1);
/**
* The verification state of the extension range.
*
* @generated from enum google.protobuf.ExtensionRangeOptions.VerificationState
*/
var ExtensionRangeOptions_VerificationState;
(function(ExtensionRangeOptions_VerificationState) {
	/**
	* All the extensions of the range must be declared.
	*
	* @generated from enum value: DECLARATION = 0;
	*/
	ExtensionRangeOptions_VerificationState[ExtensionRangeOptions_VerificationState["DECLARATION"] = 0] = "DECLARATION";
	/**
	* @generated from enum value: UNVERIFIED = 1;
	*/
	ExtensionRangeOptions_VerificationState[ExtensionRangeOptions_VerificationState["UNVERIFIED"] = 1] = "UNVERIFIED";
})(ExtensionRangeOptions_VerificationState || (ExtensionRangeOptions_VerificationState = {}));
/**
* @generated from enum google.protobuf.FieldDescriptorProto.Type
*/
var FieldDescriptorProto_Type;
(function(FieldDescriptorProto_Type) {
	/**
	* 0 is reserved for errors.
	* Order is weird for historical reasons.
	*
	* @generated from enum value: TYPE_DOUBLE = 1;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["DOUBLE"] = 1] = "DOUBLE";
	/**
	* @generated from enum value: TYPE_FLOAT = 2;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["FLOAT"] = 2] = "FLOAT";
	/**
	* Not ZigZag encoded.  Negative numbers take 10 bytes.  Use TYPE_SINT64 if
	* negative values are likely.
	*
	* @generated from enum value: TYPE_INT64 = 3;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["INT64"] = 3] = "INT64";
	/**
	* @generated from enum value: TYPE_UINT64 = 4;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["UINT64"] = 4] = "UINT64";
	/**
	* Not ZigZag encoded.  Negative numbers take 10 bytes.  Use TYPE_SINT32 if
	* negative values are likely.
	*
	* @generated from enum value: TYPE_INT32 = 5;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["INT32"] = 5] = "INT32";
	/**
	* @generated from enum value: TYPE_FIXED64 = 6;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["FIXED64"] = 6] = "FIXED64";
	/**
	* @generated from enum value: TYPE_FIXED32 = 7;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["FIXED32"] = 7] = "FIXED32";
	/**
	* @generated from enum value: TYPE_BOOL = 8;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["BOOL"] = 8] = "BOOL";
	/**
	* @generated from enum value: TYPE_STRING = 9;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["STRING"] = 9] = "STRING";
	/**
	* Tag-delimited aggregate.
	* Group type is deprecated and not supported after google.protobuf. However, Proto3
	* implementations should still be able to parse the group wire format and
	* treat group fields as unknown fields.  In Editions, the group wire format
	* can be enabled via the `message_encoding` feature.
	*
	* @generated from enum value: TYPE_GROUP = 10;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["GROUP"] = 10] = "GROUP";
	/**
	* Length-delimited aggregate.
	*
	* @generated from enum value: TYPE_MESSAGE = 11;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["MESSAGE"] = 11] = "MESSAGE";
	/**
	* New in version 2.
	*
	* @generated from enum value: TYPE_BYTES = 12;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["BYTES"] = 12] = "BYTES";
	/**
	* @generated from enum value: TYPE_UINT32 = 13;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["UINT32"] = 13] = "UINT32";
	/**
	* @generated from enum value: TYPE_ENUM = 14;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["ENUM"] = 14] = "ENUM";
	/**
	* @generated from enum value: TYPE_SFIXED32 = 15;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["SFIXED32"] = 15] = "SFIXED32";
	/**
	* @generated from enum value: TYPE_SFIXED64 = 16;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["SFIXED64"] = 16] = "SFIXED64";
	/**
	* Uses ZigZag encoding.
	*
	* @generated from enum value: TYPE_SINT32 = 17;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["SINT32"] = 17] = "SINT32";
	/**
	* Uses ZigZag encoding.
	*
	* @generated from enum value: TYPE_SINT64 = 18;
	*/
	FieldDescriptorProto_Type[FieldDescriptorProto_Type["SINT64"] = 18] = "SINT64";
})(FieldDescriptorProto_Type || (FieldDescriptorProto_Type = {}));
/**
* @generated from enum google.protobuf.FieldDescriptorProto.Label
*/
var FieldDescriptorProto_Label;
(function(FieldDescriptorProto_Label) {
	/**
	* 0 is reserved for errors
	*
	* @generated from enum value: LABEL_OPTIONAL = 1;
	*/
	FieldDescriptorProto_Label[FieldDescriptorProto_Label["OPTIONAL"] = 1] = "OPTIONAL";
	/**
	* @generated from enum value: LABEL_REPEATED = 3;
	*/
	FieldDescriptorProto_Label[FieldDescriptorProto_Label["REPEATED"] = 3] = "REPEATED";
	/**
	* The required label is only allowed in google.protobuf.  In proto3 and Editions
	* it's explicitly prohibited.  In Editions, the `field_presence` feature
	* can be used to get this behavior.
	*
	* @generated from enum value: LABEL_REQUIRED = 2;
	*/
	FieldDescriptorProto_Label[FieldDescriptorProto_Label["REQUIRED"] = 2] = "REQUIRED";
})(FieldDescriptorProto_Label || (FieldDescriptorProto_Label = {}));
/**
* Generated classes can be optimized for speed or code size.
*
* @generated from enum google.protobuf.FileOptions.OptimizeMode
*/
var FileOptions_OptimizeMode;
(function(FileOptions_OptimizeMode) {
	/**
	* Generate complete code for parsing, serialization,
	*
	* @generated from enum value: SPEED = 1;
	*/
	FileOptions_OptimizeMode[FileOptions_OptimizeMode["SPEED"] = 1] = "SPEED";
	/**
	* etc.
	*
	* Use ReflectionOps to implement these methods.
	*
	* @generated from enum value: CODE_SIZE = 2;
	*/
	FileOptions_OptimizeMode[FileOptions_OptimizeMode["CODE_SIZE"] = 2] = "CODE_SIZE";
	/**
	* Generate code using MessageLite and the lite runtime.
	*
	* @generated from enum value: LITE_RUNTIME = 3;
	*/
	FileOptions_OptimizeMode[FileOptions_OptimizeMode["LITE_RUNTIME"] = 3] = "LITE_RUNTIME";
})(FileOptions_OptimizeMode || (FileOptions_OptimizeMode = {}));
/**
* @generated from enum google.protobuf.FieldOptions.CType
*/
var FieldOptions_CType;
(function(FieldOptions_CType) {
	/**
	* Default mode.
	*
	* @generated from enum value: STRING = 0;
	*/
	FieldOptions_CType[FieldOptions_CType["STRING"] = 0] = "STRING";
	/**
	* The option [ctype=CORD] may be applied to a non-repeated field of type
	* "bytes". It indicates that in C++, the data should be stored in a Cord
	* instead of a string.  For very large strings, this may reduce memory
	* fragmentation. It may also allow better performance when parsing from a
	* Cord, or when parsing with aliasing enabled, as the parsed Cord may then
	* alias the original buffer.
	*
	* @generated from enum value: CORD = 1;
	*/
	FieldOptions_CType[FieldOptions_CType["CORD"] = 1] = "CORD";
	/**
	* @generated from enum value: STRING_PIECE = 2;
	*/
	FieldOptions_CType[FieldOptions_CType["STRING_PIECE"] = 2] = "STRING_PIECE";
})(FieldOptions_CType || (FieldOptions_CType = {}));
/**
* @generated from enum google.protobuf.FieldOptions.JSType
*/
var FieldOptions_JSType;
(function(FieldOptions_JSType) {
	/**
	* Use the default type.
	*
	* @generated from enum value: JS_NORMAL = 0;
	*/
	FieldOptions_JSType[FieldOptions_JSType["JS_NORMAL"] = 0] = "JS_NORMAL";
	/**
	* Use JavaScript strings.
	*
	* @generated from enum value: JS_STRING = 1;
	*/
	FieldOptions_JSType[FieldOptions_JSType["JS_STRING"] = 1] = "JS_STRING";
	/**
	* Use JavaScript numbers.
	*
	* @generated from enum value: JS_NUMBER = 2;
	*/
	FieldOptions_JSType[FieldOptions_JSType["JS_NUMBER"] = 2] = "JS_NUMBER";
})(FieldOptions_JSType || (FieldOptions_JSType = {}));
/**
* If set to RETENTION_SOURCE, the option will be omitted from the binary.
*
* @generated from enum google.protobuf.FieldOptions.OptionRetention
*/
var FieldOptions_OptionRetention;
(function(FieldOptions_OptionRetention) {
	/**
	* @generated from enum value: RETENTION_UNKNOWN = 0;
	*/
	FieldOptions_OptionRetention[FieldOptions_OptionRetention["RETENTION_UNKNOWN"] = 0] = "RETENTION_UNKNOWN";
	/**
	* @generated from enum value: RETENTION_RUNTIME = 1;
	*/
	FieldOptions_OptionRetention[FieldOptions_OptionRetention["RETENTION_RUNTIME"] = 1] = "RETENTION_RUNTIME";
	/**
	* @generated from enum value: RETENTION_SOURCE = 2;
	*/
	FieldOptions_OptionRetention[FieldOptions_OptionRetention["RETENTION_SOURCE"] = 2] = "RETENTION_SOURCE";
})(FieldOptions_OptionRetention || (FieldOptions_OptionRetention = {}));
/**
* This indicates the types of entities that the field may apply to when used
* as an option. If it is unset, then the field may be freely used as an
* option on any kind of entity.
*
* @generated from enum google.protobuf.FieldOptions.OptionTargetType
*/
var FieldOptions_OptionTargetType;
(function(FieldOptions_OptionTargetType) {
	/**
	* @generated from enum value: TARGET_TYPE_UNKNOWN = 0;
	*/
	FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_UNKNOWN"] = 0] = "TARGET_TYPE_UNKNOWN";
	/**
	* @generated from enum value: TARGET_TYPE_FILE = 1;
	*/
	FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_FILE"] = 1] = "TARGET_TYPE_FILE";
	/**
	* @generated from enum value: TARGET_TYPE_EXTENSION_RANGE = 2;
	*/
	FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_EXTENSION_RANGE"] = 2] = "TARGET_TYPE_EXTENSION_RANGE";
	/**
	* @generated from enum value: TARGET_TYPE_MESSAGE = 3;
	*/
	FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_MESSAGE"] = 3] = "TARGET_TYPE_MESSAGE";
	/**
	* @generated from enum value: TARGET_TYPE_FIELD = 4;
	*/
	FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_FIELD"] = 4] = "TARGET_TYPE_FIELD";
	/**
	* @generated from enum value: TARGET_TYPE_ONEOF = 5;
	*/
	FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_ONEOF"] = 5] = "TARGET_TYPE_ONEOF";
	/**
	* @generated from enum value: TARGET_TYPE_ENUM = 6;
	*/
	FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_ENUM"] = 6] = "TARGET_TYPE_ENUM";
	/**
	* @generated from enum value: TARGET_TYPE_ENUM_ENTRY = 7;
	*/
	FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_ENUM_ENTRY"] = 7] = "TARGET_TYPE_ENUM_ENTRY";
	/**
	* @generated from enum value: TARGET_TYPE_SERVICE = 8;
	*/
	FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_SERVICE"] = 8] = "TARGET_TYPE_SERVICE";
	/**
	* @generated from enum value: TARGET_TYPE_METHOD = 9;
	*/
	FieldOptions_OptionTargetType[FieldOptions_OptionTargetType["TARGET_TYPE_METHOD"] = 9] = "TARGET_TYPE_METHOD";
})(FieldOptions_OptionTargetType || (FieldOptions_OptionTargetType = {}));
/**
* Is this method side-effect-free (or safe in HTTP parlance), or idempotent,
* or neither? HTTP based RPC implementation may choose GET verb for safe
* methods, and PUT verb for idempotent methods instead of the default POST.
*
* @generated from enum google.protobuf.MethodOptions.IdempotencyLevel
*/
var MethodOptions_IdempotencyLevel;
(function(MethodOptions_IdempotencyLevel) {
	/**
	* @generated from enum value: IDEMPOTENCY_UNKNOWN = 0;
	*/
	MethodOptions_IdempotencyLevel[MethodOptions_IdempotencyLevel["IDEMPOTENCY_UNKNOWN"] = 0] = "IDEMPOTENCY_UNKNOWN";
	/**
	* implies idempotent
	*
	* @generated from enum value: NO_SIDE_EFFECTS = 1;
	*/
	MethodOptions_IdempotencyLevel[MethodOptions_IdempotencyLevel["NO_SIDE_EFFECTS"] = 1] = "NO_SIDE_EFFECTS";
	/**
	* idempotent, but may have side effects
	*
	* @generated from enum value: IDEMPOTENT = 2;
	*/
	MethodOptions_IdempotencyLevel[MethodOptions_IdempotencyLevel["IDEMPOTENT"] = 2] = "IDEMPOTENT";
})(MethodOptions_IdempotencyLevel || (MethodOptions_IdempotencyLevel = {}));
/**
* @generated from enum google.protobuf.FeatureSet.VisibilityFeature.DefaultSymbolVisibility
*/
var FeatureSet_VisibilityFeature_DefaultSymbolVisibility;
(function(FeatureSet_VisibilityFeature_DefaultSymbolVisibility) {
	/**
	* @generated from enum value: DEFAULT_SYMBOL_VISIBILITY_UNKNOWN = 0;
	*/
	FeatureSet_VisibilityFeature_DefaultSymbolVisibility[FeatureSet_VisibilityFeature_DefaultSymbolVisibility["DEFAULT_SYMBOL_VISIBILITY_UNKNOWN"] = 0] = "DEFAULT_SYMBOL_VISIBILITY_UNKNOWN";
	/**
	* Default pre-EDITION_2024, all UNSET visibility are export.
	*
	* @generated from enum value: EXPORT_ALL = 1;
	*/
	FeatureSet_VisibilityFeature_DefaultSymbolVisibility[FeatureSet_VisibilityFeature_DefaultSymbolVisibility["EXPORT_ALL"] = 1] = "EXPORT_ALL";
	/**
	* All top-level symbols default to export, nested default to local.
	*
	* @generated from enum value: EXPORT_TOP_LEVEL = 2;
	*/
	FeatureSet_VisibilityFeature_DefaultSymbolVisibility[FeatureSet_VisibilityFeature_DefaultSymbolVisibility["EXPORT_TOP_LEVEL"] = 2] = "EXPORT_TOP_LEVEL";
	/**
	* All symbols default to local.
	*
	* @generated from enum value: LOCAL_ALL = 3;
	*/
	FeatureSet_VisibilityFeature_DefaultSymbolVisibility[FeatureSet_VisibilityFeature_DefaultSymbolVisibility["LOCAL_ALL"] = 3] = "LOCAL_ALL";
	/**
	* All symbols local by default. Nested types cannot be exported.
	* With special case caveat for message { enum {} reserved 1 to max; }
	* This is the recommended setting for new protos.
	*
	* @generated from enum value: STRICT = 4;
	*/
	FeatureSet_VisibilityFeature_DefaultSymbolVisibility[FeatureSet_VisibilityFeature_DefaultSymbolVisibility["STRICT"] = 4] = "STRICT";
})(FeatureSet_VisibilityFeature_DefaultSymbolVisibility || (FeatureSet_VisibilityFeature_DefaultSymbolVisibility = {}));
/**
* @generated from enum google.protobuf.FeatureSet.FieldPresence
*/
var FeatureSet_FieldPresence;
(function(FeatureSet_FieldPresence) {
	/**
	* @generated from enum value: FIELD_PRESENCE_UNKNOWN = 0;
	*/
	FeatureSet_FieldPresence[FeatureSet_FieldPresence["FIELD_PRESENCE_UNKNOWN"] = 0] = "FIELD_PRESENCE_UNKNOWN";
	/**
	* @generated from enum value: EXPLICIT = 1;
	*/
	FeatureSet_FieldPresence[FeatureSet_FieldPresence["EXPLICIT"] = 1] = "EXPLICIT";
	/**
	* @generated from enum value: IMPLICIT = 2;
	*/
	FeatureSet_FieldPresence[FeatureSet_FieldPresence["IMPLICIT"] = 2] = "IMPLICIT";
	/**
	* @generated from enum value: LEGACY_REQUIRED = 3;
	*/
	FeatureSet_FieldPresence[FeatureSet_FieldPresence["LEGACY_REQUIRED"] = 3] = "LEGACY_REQUIRED";
})(FeatureSet_FieldPresence || (FeatureSet_FieldPresence = {}));
/**
* @generated from enum google.protobuf.FeatureSet.EnumType
*/
var FeatureSet_EnumType;
(function(FeatureSet_EnumType) {
	/**
	* @generated from enum value: ENUM_TYPE_UNKNOWN = 0;
	*/
	FeatureSet_EnumType[FeatureSet_EnumType["ENUM_TYPE_UNKNOWN"] = 0] = "ENUM_TYPE_UNKNOWN";
	/**
	* @generated from enum value: OPEN = 1;
	*/
	FeatureSet_EnumType[FeatureSet_EnumType["OPEN"] = 1] = "OPEN";
	/**
	* @generated from enum value: CLOSED = 2;
	*/
	FeatureSet_EnumType[FeatureSet_EnumType["CLOSED"] = 2] = "CLOSED";
})(FeatureSet_EnumType || (FeatureSet_EnumType = {}));
/**
* @generated from enum google.protobuf.FeatureSet.RepeatedFieldEncoding
*/
var FeatureSet_RepeatedFieldEncoding;
(function(FeatureSet_RepeatedFieldEncoding) {
	/**
	* @generated from enum value: REPEATED_FIELD_ENCODING_UNKNOWN = 0;
	*/
	FeatureSet_RepeatedFieldEncoding[FeatureSet_RepeatedFieldEncoding["REPEATED_FIELD_ENCODING_UNKNOWN"] = 0] = "REPEATED_FIELD_ENCODING_UNKNOWN";
	/**
	* @generated from enum value: PACKED = 1;
	*/
	FeatureSet_RepeatedFieldEncoding[FeatureSet_RepeatedFieldEncoding["PACKED"] = 1] = "PACKED";
	/**
	* @generated from enum value: EXPANDED = 2;
	*/
	FeatureSet_RepeatedFieldEncoding[FeatureSet_RepeatedFieldEncoding["EXPANDED"] = 2] = "EXPANDED";
})(FeatureSet_RepeatedFieldEncoding || (FeatureSet_RepeatedFieldEncoding = {}));
/**
* @generated from enum google.protobuf.FeatureSet.Utf8Validation
*/
var FeatureSet_Utf8Validation;
(function(FeatureSet_Utf8Validation) {
	/**
	* @generated from enum value: UTF8_VALIDATION_UNKNOWN = 0;
	*/
	FeatureSet_Utf8Validation[FeatureSet_Utf8Validation["UTF8_VALIDATION_UNKNOWN"] = 0] = "UTF8_VALIDATION_UNKNOWN";
	/**
	* @generated from enum value: VERIFY = 2;
	*/
	FeatureSet_Utf8Validation[FeatureSet_Utf8Validation["VERIFY"] = 2] = "VERIFY";
	/**
	* @generated from enum value: NONE = 3;
	*/
	FeatureSet_Utf8Validation[FeatureSet_Utf8Validation["NONE"] = 3] = "NONE";
})(FeatureSet_Utf8Validation || (FeatureSet_Utf8Validation = {}));
/**
* @generated from enum google.protobuf.FeatureSet.MessageEncoding
*/
var FeatureSet_MessageEncoding;
(function(FeatureSet_MessageEncoding) {
	/**
	* @generated from enum value: MESSAGE_ENCODING_UNKNOWN = 0;
	*/
	FeatureSet_MessageEncoding[FeatureSet_MessageEncoding["MESSAGE_ENCODING_UNKNOWN"] = 0] = "MESSAGE_ENCODING_UNKNOWN";
	/**
	* @generated from enum value: LENGTH_PREFIXED = 1;
	*/
	FeatureSet_MessageEncoding[FeatureSet_MessageEncoding["LENGTH_PREFIXED"] = 1] = "LENGTH_PREFIXED";
	/**
	* @generated from enum value: DELIMITED = 2;
	*/
	FeatureSet_MessageEncoding[FeatureSet_MessageEncoding["DELIMITED"] = 2] = "DELIMITED";
})(FeatureSet_MessageEncoding || (FeatureSet_MessageEncoding = {}));
/**
* @generated from enum google.protobuf.FeatureSet.JsonFormat
*/
var FeatureSet_JsonFormat;
(function(FeatureSet_JsonFormat) {
	/**
	* @generated from enum value: JSON_FORMAT_UNKNOWN = 0;
	*/
	FeatureSet_JsonFormat[FeatureSet_JsonFormat["JSON_FORMAT_UNKNOWN"] = 0] = "JSON_FORMAT_UNKNOWN";
	/**
	* @generated from enum value: ALLOW = 1;
	*/
	FeatureSet_JsonFormat[FeatureSet_JsonFormat["ALLOW"] = 1] = "ALLOW";
	/**
	* @generated from enum value: LEGACY_BEST_EFFORT = 2;
	*/
	FeatureSet_JsonFormat[FeatureSet_JsonFormat["LEGACY_BEST_EFFORT"] = 2] = "LEGACY_BEST_EFFORT";
})(FeatureSet_JsonFormat || (FeatureSet_JsonFormat = {}));
/**
* @generated from enum google.protobuf.FeatureSet.EnforceNamingStyle
*/
var FeatureSet_EnforceNamingStyle;
(function(FeatureSet_EnforceNamingStyle) {
	/**
	* @generated from enum value: ENFORCE_NAMING_STYLE_UNKNOWN = 0;
	*/
	FeatureSet_EnforceNamingStyle[FeatureSet_EnforceNamingStyle["ENFORCE_NAMING_STYLE_UNKNOWN"] = 0] = "ENFORCE_NAMING_STYLE_UNKNOWN";
	/**
	* @generated from enum value: STYLE2024 = 1;
	*/
	FeatureSet_EnforceNamingStyle[FeatureSet_EnforceNamingStyle["STYLE2024"] = 1] = "STYLE2024";
	/**
	* @generated from enum value: STYLE_LEGACY = 2;
	*/
	FeatureSet_EnforceNamingStyle[FeatureSet_EnforceNamingStyle["STYLE_LEGACY"] = 2] = "STYLE_LEGACY";
})(FeatureSet_EnforceNamingStyle || (FeatureSet_EnforceNamingStyle = {}));
/**
* Represents the identified object's effect on the element in the original
* .proto file.
*
* @generated from enum google.protobuf.GeneratedCodeInfo.Annotation.Semantic
*/
var GeneratedCodeInfo_Annotation_Semantic;
(function(GeneratedCodeInfo_Annotation_Semantic) {
	/**
	* There is no effect or the effect is indescribable.
	*
	* @generated from enum value: NONE = 0;
	*/
	GeneratedCodeInfo_Annotation_Semantic[GeneratedCodeInfo_Annotation_Semantic["NONE"] = 0] = "NONE";
	/**
	* The element is set or otherwise mutated.
	*
	* @generated from enum value: SET = 1;
	*/
	GeneratedCodeInfo_Annotation_Semantic[GeneratedCodeInfo_Annotation_Semantic["SET"] = 1] = "SET";
	/**
	* An alias to the element is returned.
	*
	* @generated from enum value: ALIAS = 2;
	*/
	GeneratedCodeInfo_Annotation_Semantic[GeneratedCodeInfo_Annotation_Semantic["ALIAS"] = 2] = "ALIAS";
})(GeneratedCodeInfo_Annotation_Semantic || (GeneratedCodeInfo_Annotation_Semantic = {}));
/**
* The full set of known editions.
*
* @generated from enum google.protobuf.Edition
*/
var Edition;
(function(Edition) {
	/**
	* A placeholder for an unknown edition value.
	*
	* @generated from enum value: EDITION_UNKNOWN = 0;
	*/
	Edition[Edition["EDITION_UNKNOWN"] = 0] = "EDITION_UNKNOWN";
	/**
	* A placeholder edition for specifying default behaviors *before* a feature
	* was first introduced.  This is effectively an "infinite past".
	*
	* @generated from enum value: EDITION_LEGACY = 900;
	*/
	Edition[Edition["EDITION_LEGACY"] = 900] = "EDITION_LEGACY";
	/**
	* Legacy syntax "editions".  These pre-date editions, but behave much like
	* distinct editions.  These can't be used to specify the edition of proto
	* files, but feature definitions must supply proto2/proto3 defaults for
	* backwards compatibility.
	*
	* @generated from enum value: EDITION_PROTO2 = 998;
	*/
	Edition[Edition["EDITION_PROTO2"] = 998] = "EDITION_PROTO2";
	/**
	* @generated from enum value: EDITION_PROTO3 = 999;
	*/
	Edition[Edition["EDITION_PROTO3"] = 999] = "EDITION_PROTO3";
	/**
	* Editions that have been released.  The specific values are arbitrary and
	* should not be depended on, but they will always be time-ordered for easy
	* comparison.
	*
	* @generated from enum value: EDITION_2023 = 1000;
	*/
	Edition[Edition["EDITION_2023"] = 1e3] = "EDITION_2023";
	/**
	* @generated from enum value: EDITION_2024 = 1001;
	*/
	Edition[Edition["EDITION_2024"] = 1001] = "EDITION_2024";
	/**
	* A placeholder edition for developing and testing unscheduled features.
	*
	* @generated from enum value: EDITION_UNSTABLE = 9999;
	*/
	Edition[Edition["EDITION_UNSTABLE"] = 9999] = "EDITION_UNSTABLE";
	/**
	* Placeholder editions for testing feature resolution.  These should not be
	* used or relied on outside of tests.
	*
	* @generated from enum value: EDITION_1_TEST_ONLY = 1;
	*/
	Edition[Edition["EDITION_1_TEST_ONLY"] = 1] = "EDITION_1_TEST_ONLY";
	/**
	* @generated from enum value: EDITION_2_TEST_ONLY = 2;
	*/
	Edition[Edition["EDITION_2_TEST_ONLY"] = 2] = "EDITION_2_TEST_ONLY";
	/**
	* @generated from enum value: EDITION_99997_TEST_ONLY = 99997;
	*/
	Edition[Edition["EDITION_99997_TEST_ONLY"] = 99997] = "EDITION_99997_TEST_ONLY";
	/**
	* @generated from enum value: EDITION_99998_TEST_ONLY = 99998;
	*/
	Edition[Edition["EDITION_99998_TEST_ONLY"] = 99998] = "EDITION_99998_TEST_ONLY";
	/**
	* @generated from enum value: EDITION_99999_TEST_ONLY = 99999;
	*/
	Edition[Edition["EDITION_99999_TEST_ONLY"] = 99999] = "EDITION_99999_TEST_ONLY";
	/**
	* Placeholder for specifying unbounded edition support.  This should only
	* ever be used by plugins that can expect to never require any changes to
	* support a new edition.
	*
	* @generated from enum value: EDITION_MAX = 2147483647;
	*/
	Edition[Edition["EDITION_MAX"] = 2147483647] = "EDITION_MAX";
})(Edition || (Edition = {}));
/**
* Describes the 'visibility' of a symbol with respect to the proto import
* system. Symbols can only be imported when the visibility rules do not prevent
* it (ex: local symbols cannot be imported).  Visibility modifiers can only set
* on `message` and `enum` as they are the only types available to be referenced
* from other files.
*
* @generated from enum google.protobuf.SymbolVisibility
*/
var SymbolVisibility;
(function(SymbolVisibility) {
	/**
	* @generated from enum value: VISIBILITY_UNSET = 0;
	*/
	SymbolVisibility[SymbolVisibility["VISIBILITY_UNSET"] = 0] = "VISIBILITY_UNSET";
	/**
	* @generated from enum value: VISIBILITY_LOCAL = 1;
	*/
	SymbolVisibility[SymbolVisibility["VISIBILITY_LOCAL"] = 1] = "VISIBILITY_LOCAL";
	/**
	* @generated from enum value: VISIBILITY_EXPORT = 2;
	*/
	SymbolVisibility[SymbolVisibility["VISIBILITY_EXPORT"] = 2] = "VISIBILITY_EXPORT";
})(SymbolVisibility || (SymbolVisibility = {}));
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/from-binary.js
/**
* @private Only exported for getExtension()
*/
function makeReadContext$1(options) {
	return Object.assign(Object.assign({
		readUnknownFields: true,
		recursionLimit: 100
	}, options), { depth: 0 });
}
/**
* Parse serialized binary data.
*/
function fromBinary(schema, bytes, options) {
	const message = create(schema);
	compiledReader$1(schema).read(message, new BinaryReader(bytes), makeReadContext$1(options), bytes.byteLength);
	return message;
}
var compiledReaders$1 = /* @__PURE__ */ new WeakMap();
/**
* Return the compiled decoder for a message, compiling it on first use.
*/
function compiledReader$1(desc) {
	let compiled = compiledReaders$1.get(desc);
	if (compiled === void 0) compiled = compileMessage$3(desc);
	return compiled;
}
function compileMessage$3(desc) {
	const descString = String(desc);
	const fieldReaders = /* @__PURE__ */ new Map();
	const compiled = {
		read: compileMessageReader(descString, fieldReaders),
		readGroup: compileGroupReader(descString, fieldReaders)
	};
	compiledReaders$1.set(desc, compiled);
	for (const field of desc.fields) fieldReaders.set(field.number, compileFieldReader$1(field));
	return compiled;
}
/**
* Create a decoder for a length-prefixed message body, dispatching wire
* records to the compiled field decoders by field number.
*/
function compileMessageReader(descString, fieldReaders) {
	return (message, reader, ctx, length) => {
		var _a;
		if (++ctx.depth > ctx.recursionLimit) throw new Error(`cannot decode ${descString} from binary: maximum recursion depth of ${ctx.recursionLimit} reached`);
		const end = reader.pos + length;
		const unknownFields = (_a = message.$unknown) !== null && _a !== void 0 ? _a : [];
		while (reader.pos < end) {
			const [fieldNo, wireType] = reader.tag();
			const fieldReader = fieldReaders.get(fieldNo);
			if (fieldReader === void 0) {
				const data = reader.skip(wireType, fieldNo, ctx.recursionLimit - ctx.depth);
				if (ctx.readUnknownFields) unknownFields.push({
					no: fieldNo,
					wireType,
					data
				});
				continue;
			}
			fieldReader(message, reader, ctx, wireType);
		}
		if (unknownFields.length > 0) message.$unknown = unknownFields;
		ctx.depth--;
	};
}
/**
* Create a decoder for a message with the delimited encoding (group),
* reading until the EndGroup tag, like compileMessageReader.
*/
function compileGroupReader(descString, fieldReaders) {
	return (message, reader, ctx, fieldNo) => {
		var _a;
		if (++ctx.depth > ctx.recursionLimit) throw new Error(`cannot decode ${descString} from binary: maximum recursion depth of ${ctx.recursionLimit} reached`);
		let recordFieldNo;
		let wireType;
		const unknownFields = (_a = message.$unknown) !== null && _a !== void 0 ? _a : [];
		while (reader.pos < reader.len) {
			[recordFieldNo, wireType] = reader.tag();
			if (wireType == WireType.EndGroup) break;
			const fieldReader = fieldReaders.get(recordFieldNo);
			if (fieldReader === void 0) {
				const data = reader.skip(wireType, recordFieldNo, ctx.recursionLimit - ctx.depth);
				if (ctx.readUnknownFields) unknownFields.push({
					no: recordFieldNo,
					wireType,
					data
				});
				continue;
			}
			fieldReader(message, reader, ctx, wireType);
		}
		if (wireType != WireType.EndGroup || recordFieldNo !== fieldNo) throw new Error("invalid end group tag");
		if (unknownFields.length > 0) message.$unknown = unknownFields;
		ctx.depth--;
	};
}
/**
* @private Only exported for getExtension()
*/
function readField(message, reader, field, wireType, ctx) {
	compileFieldReader$1(field)(message[unsafeLocal], reader, ctx, wireType);
}
function compileFieldReader$1(field) {
	switch (field.fieldKind) {
		case "scalar": return compileScalarFieldReader$1(field);
		case "enum": return compileEnumFieldReader$1(field);
		case "message": return compileMessageFieldReader$1(field);
		case "list": return compileListFieldReader$1(field);
		case "map": return compileMapFieldReader$1(field);
	}
}
function compileScalarFieldReader$1(field) {
	const readScalar = compileScalarReader(field.scalar, field.utf8Validation, field.longAsString);
	const localName = field.localName;
	if (field.oneof) {
		const oneofLocalName = field.oneof.localName;
		return (message, reader) => {
			message[oneofLocalName] = {
				case: localName,
				value: readScalar(reader)
			};
		};
	}
	return (message, reader) => {
		message[localName] = readScalar(reader);
	};
}
function compileEnumFieldReader$1(field) {
	var _a;
	const localName = field.localName;
	const oneofLocalName = (_a = field.oneof) === null || _a === void 0 ? void 0 : _a.localName;
	if (field.enum.open) {
		if (oneofLocalName !== void 0) return (message, reader) => {
			message[oneofLocalName] = {
				case: localName,
				value: reader.int32()
			};
		};
		return (message, reader) => {
			message[localName] = reader.int32();
		};
	}
	const values = field.enum.values;
	const fieldNo = field.number;
	return (message, reader, ctx, wireType) => {
		var _a;
		const val = reader.int32();
		if (values.some((v) => v.number === val)) if (oneofLocalName !== void 0) message[oneofLocalName] = {
			case: localName,
			value: val
		};
		else message[localName] = val;
		else if (ctx.readUnknownFields) {
			const bytes = [];
			varint32write(val, bytes);
			const unknownFields = (_a = message.$unknown) !== null && _a !== void 0 ? _a : [];
			unknownFields.push({
				no: fieldNo,
				wireType,
				data: new Uint8Array(bytes)
			});
			message.$unknown = unknownFields;
		}
	};
}
function compileMessageFieldReader$1(field) {
	const localName = field.localName;
	const { toMessage, toLocal } = localMessageMapper(field);
	const readChild = compileChildReader(field);
	if (field.oneof) {
		const oneofLocalName = field.oneof.localName;
		return (message, reader, ctx) => {
			const oneof = message[oneofLocalName];
			const child = toMessage(oneof.case === localName ? oneof.value : void 0);
			readChild(child, reader, ctx);
			message[oneofLocalName] = {
				case: localName,
				value: toLocal(child)
			};
		};
	}
	return (message, reader, ctx) => {
		const child = toMessage(message[localName]);
		readChild(child, reader, ctx);
		message[localName] = toLocal(child);
	};
}
/**
* Compile a decoder for the wire format of a message field, honoring the
* delimited encoding of the field.
*/
function compileChildReader(field) {
	const compiledChild = compiledReader$1(field.message);
	if (field.delimitedEncoding) {
		const fieldNo = field.number;
		return (child, reader, ctx) => compiledChild.readGroup(child, reader, ctx, fieldNo);
	}
	return (child, reader, ctx) => compiledChild.read(child, reader, ctx, reader.uint32());
}
function compileListFieldReader$1(field) {
	const localName = field.localName;
	if (field.listKind == "message") {
		const { toMessage, toLocal } = localMessageMapper(field);
		const readChild = compileChildReader(field);
		return (message, reader, ctx) => {
			const child = toMessage(void 0);
			readChild(child, reader, ctx);
			message[localName].push(toLocal(child));
		};
	}
	const scalarType = field.listKind == "enum" ? ScalarType.INT32 : field.scalar;
	const longAsString = field.listKind == "scalar" ? field.longAsString : false;
	const readScalar = compileScalarReader(scalarType, field.utf8Validation, longAsString);
	const packedPossible = scalarType != ScalarType.STRING && scalarType != ScalarType.BYTES;
	return (message, reader, ctx, wireType) => {
		const items = message[localName];
		if (wireType == WireType.LengthDelimited && packedPossible) {
			const end = reader.uint32() + reader.pos;
			while (reader.pos < end) items.push(readScalar(reader));
		} else items.push(readScalar(reader));
	};
}
function compileMapFieldReader$1(field) {
	const localName = field.localName;
	const readKey = compileScalarReader(field.mapKey, field.utf8Validation, false);
	const keyZero = scalarZeroValue(field.mapKey, false);
	let readValue;
	let valueDefault;
	switch (field.mapKind) {
		case "scalar": {
			const scalar = field.scalar;
			const readScalar = compileScalarReader(scalar, field.utf8Validation, false);
			readValue = (reader) => readScalar(reader);
			if (scalar == ScalarType.BYTES) valueDefault = () => /* @__PURE__ */ new Uint8Array(0);
			else {
				const zero = scalarZeroValue(scalar, false);
				valueDefault = () => zero;
			}
			break;
		}
		case "enum": {
			const zero = field.enum.values[0].number;
			readValue = (reader) => reader.int32();
			valueDefault = () => zero;
			break;
		}
		case "message": {
			const { toMessage, toLocal } = localMessageMapper(field);
			const readChild = compiledReader$1(field.message).read;
			readValue = (reader, ctx) => {
				const child = toMessage(void 0);
				readChild(child, reader, ctx, reader.uint32());
				return toLocal(child);
			};
			valueDefault = () => toLocal(toMessage(void 0));
			break;
		}
	}
	return (message, reader, ctx) => {
		const record = message[localName];
		let key;
		let val;
		const len = reader.uint32();
		const end = reader.pos + len;
		while (reader.pos < end) {
			const [fieldNo] = reader.tag();
			switch (fieldNo) {
				case 1:
					key = readKey(reader);
					break;
				case 2:
					val = readValue(reader, ctx);
					break;
			}
		}
		if (key === void 0) key = keyZero;
		if (val === void 0) val = valueDefault();
		record[key] = val;
	};
}
/**
* Returns a reader for a scalar value. For 64-bit integers, BinaryReader
* already returns the local representation (bigint or string), so, unlike in
* the reflection layer, no validation is needed here.
*/
function compileScalarReader(type, utf8Validation, longAsString) {
	switch (type) {
		case ScalarType.STRING: return (reader) => reader.string(utf8Validation);
		case ScalarType.BOOL: return (reader) => reader.bool();
		case ScalarType.DOUBLE: return (reader) => reader.double();
		case ScalarType.FLOAT: return (reader) => reader.float();
		case ScalarType.INT32: return (reader) => reader.int32();
		case ScalarType.INT64:
			if (longAsString) return (reader) => String(reader.int64());
			return (reader) => reader.int64();
		case ScalarType.UINT64:
			if (longAsString) return (reader) => String(reader.uint64());
			return (reader) => reader.uint64();
		case ScalarType.FIXED64:
			if (longAsString) return (reader) => String(reader.fixed64());
			return (reader) => reader.fixed64();
		case ScalarType.BYTES: return (reader) => reader.bytes();
		case ScalarType.FIXED32: return (reader) => reader.fixed32();
		case ScalarType.SFIXED32: return (reader) => reader.sfixed32();
		case ScalarType.SFIXED64:
			if (longAsString) return (reader) => String(reader.sfixed64());
			return (reader) => reader.sfixed64();
		case ScalarType.SINT64:
			if (longAsString) return (reader) => String(reader.sint64());
			return (reader) => reader.sint64();
		case ScalarType.UINT32: return (reader) => reader.uint32();
		case ScalarType.SINT32: return (reader) => reader.sint32();
	}
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/codegenv2/file.js
/**
* Hydrate a file descriptor.
*
* @private
*/
function fileDesc(b64, imports) {
	var _a;
	const root = fromBinary(FileDescriptorProtoSchema, base64Decode(b64));
	root.messageType.forEach(restoreJsonNames);
	root.dependency = (_a = imports === null || imports === void 0 ? void 0 : imports.map((f) => f.proto.name)) !== null && _a !== void 0 ? _a : [];
	return createFileRegistry(root, (protoFileName) => imports === null || imports === void 0 ? void 0 : imports.find((f) => f.proto.name === protoFileName)).getFile(root.name);
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/wkt/gen/google/protobuf/timestamp_pb.js
/**
* Describes the file google/protobuf/timestamp.proto.
*/
var file_google_protobuf_timestamp = /*@__PURE__*/ fileDesc("Ch9nb29nbGUvcHJvdG9idWYvdGltZXN0YW1wLnByb3RvEg9nb29nbGUucHJvdG9idWYiKwoJVGltZXN0YW1wEg8KB3NlY29uZHMYASABKAMSDQoFbmFub3MYAiABKAVChQEKE2NvbS5nb29nbGUucHJvdG9idWZCDlRpbWVzdGFtcFByb3RvUAFaMmdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL3RpbWVzdGFtcHBi+AEBogIDR1BCqgIeR29vZ2xlLlByb3RvYnVmLldlbGxLbm93blR5cGVzYgZwcm90bzM");
/**
* Describes the message google.protobuf.Any.
* Use `create(AnySchema)` to create a new message.
*/
var AnySchema = /*@__PURE__*/ messageDesc(/* @__PURE__ */ fileDesc("Chlnb29nbGUvcHJvdG9idWYvYW55LnByb3RvEg9nb29nbGUucHJvdG9idWYiJgoDQW55EhAKCHR5cGVfdXJsGAEgASgJEg0KBXZhbHVlGAIgASgMQnYKE2NvbS5nb29nbGUucHJvdG9idWZCCEFueVByb3RvUAFaLGdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL2FueXBiogIDR1BCqgIeR29vZ2xlLlByb3RvYnVmLldlbGxLbm93blR5cGVzYgZwcm90bzM"), 0);
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/to-binary.js
var IMPLICIT$2 = 2;
var LEGACY_REQUIRED$1 = 3;
var writeDefaults = { writeUnknownFields: true };
function makeWriteOptions$1(options) {
	return options ? Object.assign(Object.assign({}, writeDefaults), options) : writeDefaults;
}
function toBinary(schema, message, options) {
	const writer = new BinaryWriter();
	compiledWriter$1(schema)(writer, makeWriteOptions$1(options), message);
	return writer.finish();
}
var compiledWriters$1 = /* @__PURE__ */ new WeakMap();
/**
* Return the compiled encoder for a message, compiling it on first use.
*/
function compiledWriter$1(desc) {
	let compiled = compiledWriters$1.get(desc);
	if (compiled === void 0) compiled = compileMessage$2(desc);
	return compiled;
}
function compileMessage$2(desc) {
	const typeName = desc.typeName;
	const sortedFields = desc.fields.concat().sort((a, b) => a.number - b.number);
	const foreignField = sortedFields[0];
	const fieldWriters = [];
	const compiled = (writer, opts, message) => {
		if (message.$typeName !== typeName && foreignField !== void 0) throw new FieldError(foreignField, `cannot use ${foreignField} with message ${message.$typeName}`, "ForeignFieldError");
		for (let i = 0; i < fieldWriters.length; i++) fieldWriters[i](writer, opts, message);
		const unknown = message.$unknown;
		if (unknown !== void 0 && opts.writeUnknownFields) for (let i = 0; i < unknown.length; i++) {
			const { no, wireType, data } = unknown[i];
			writer.tag(no, wireType).raw(data);
		}
	};
	compiledWriters$1.set(desc, compiled);
	for (const field of sortedFields) fieldWriters.push(compileField$1(field));
	return compiled;
}
function compileField$1(field) {
	switch (field.fieldKind) {
		case "message":
		case "scalar":
		case "enum": return compileSingularField$1(field);
		case "list": return compileListField(field);
		case "map": return compileMapField(field);
	}
}
/**
* Compile an encoder for a singular field: the presence check, and the
* value encoder.
*/
function compileSingularField$1(field) {
	const writeValue = compileSingularValue$1(field);
	const localName = field.localName;
	if (field.oneof) {
		const oneofLocalName = field.oneof.localName;
		return (writer, opts, message) => {
			const oneof = message[oneofLocalName];
			if (oneof.case === localName) writeValue(writer, opts, oneof.value);
		};
	}
	if (field.presence != IMPLICIT$2) {
		const requiredError = field.presence == LEGACY_REQUIRED$1 ? `cannot encode ${field} to binary: required field not set` : void 0;
		return (writer, opts, message) => {
			const value = message[localName];
			if (value !== void 0 && Object.prototype.hasOwnProperty.call(message, localName)) writeValue(writer, opts, value);
			else if (requiredError !== void 0) throw new Error(requiredError);
		};
	}
	if (field.fieldKind == "enum") {
		const zero = field.enum.values[0].number;
		return (writer, opts, message) => {
			const value = message[localName];
			if (value !== zero) writeValue(writer, opts, value);
		};
	}
	switch (field.scalar) {
		case ScalarType.BOOL: return (writer, opts, message) => {
			const value = message[localName];
			if (value !== false) writeValue(writer, opts, value);
		};
		case ScalarType.STRING: return (writer, opts, message) => {
			const value = message[localName];
			if (value !== "") writeValue(writer, opts, value);
		};
		case ScalarType.BYTES: return (writer, opts, message) => {
			const value = message[localName];
			if (!(value instanceof Uint8Array) || value.byteLength > 0) writeValue(writer, opts, value);
		};
		case ScalarType.DOUBLE:
		case ScalarType.FLOAT: return (writer, opts, message) => {
			const value = message[localName];
			if (!Object.is(value, 0)) writeValue(writer, opts, value);
		};
		default: return (writer, opts, message) => {
			const value = message[localName];
			if (value != 0) writeValue(writer, opts, value);
		};
	}
}
/**
* Compile an encoder for the value of a singular field, including the tag.
*/
function compileSingularValue$1(field) {
	switch (field.fieldKind) {
		case "message": {
			const { toMessage } = localMessageMapper(field);
			const writeChild = compileChildWriter(field);
			return (writer, opts, value) => {
				writeChild(writer, opts, toMessage(value));
			};
		}
		case "scalar":
		case "enum": {
			const scalarType = field.fieldKind == "enum" ? ScalarType.INT32 : field.scalar;
			const fieldNo = field.number;
			const wireType = writeTypeOfScalar(scalarType);
			const writeScalar = compileScalarValue$1(scalarType, field.parent.typeName, field.name);
			return (writer, opts, value) => {
				writer.tag(fieldNo, wireType);
				writeScalar(writer, value);
			};
		}
	}
}
function compileListField(field) {
	const localName = field.localName;
	const fieldNo = field.number;
	switch (field.listKind) {
		case "message": {
			const { toMessage } = localMessageMapper(field);
			const writeChild = compileChildWriter(field);
			return (writer, opts, message) => {
				const items = message[localName];
				for (let i = 0; i < items.length; i++) writeChild(writer, opts, toMessage(items[i]));
			};
		}
		case "scalar":
		case "enum": {
			const scalarType = field.listKind == "enum" ? ScalarType.INT32 : field.scalar;
			const writeScalar = compileScalarValue$1(scalarType, field.parent.typeName, field.name);
			if (field.packed) return (writer, opts, message) => {
				const items = message[localName];
				if (items.length == 0) return;
				writer.tag(fieldNo, WireType.LengthDelimited).fork();
				for (let i = 0; i < items.length; i++) writeScalar(writer, items[i]);
				writer.join();
			};
			const wireType = writeTypeOfScalar(scalarType);
			return (writer, opts, message) => {
				const items = message[localName];
				for (let i = 0; i < items.length; i++) {
					writer.tag(fieldNo, wireType);
					writeScalar(writer, items[i]);
				}
			};
		}
	}
}
function compileMapField(field) {
	const localName = field.localName;
	const fieldNo = field.number;
	const writeKey = compileMapKey(field);
	if (field.mapKind == "message") {
		const { toMessage } = localMessageMapper(field);
		const writeMessage = compiledWriter$1(field.message);
		return (writer, opts, message) => {
			const record = message[localName];
			const keys = Object.keys(record);
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				writer.tag(fieldNo, WireType.LengthDelimited).fork();
				writeKey(writer, key);
				writer.tag(2, WireType.LengthDelimited).fork();
				writeMessage(writer, opts, toMessage(record[key]));
				writer.join();
				writer.join();
			}
		};
	}
	const scalarType = field.mapKind == "enum" ? ScalarType.INT32 : field.scalar;
	const valueWireType = writeTypeOfScalar(scalarType);
	const writeScalar = compileScalarValue$1(scalarType, field.parent.typeName, field.name);
	return (writer, opts, message) => {
		const record = message[localName];
		const keys = Object.keys(record);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			writer.tag(fieldNo, WireType.LengthDelimited).fork();
			writeKey(writer, key);
			writer.tag(2, valueWireType);
			writeScalar(writer, record[key]);
			writer.join();
		}
	};
}
/**
* Compile an encoder for a map key. Map keys are stored as object keys and
* are always strings locally. Convert them to their scalar type before
* writing, like the reflect API does when iterating map entries.
*/
function compileMapKey(field) {
	const wireType = writeTypeOfScalar(field.mapKey);
	const writeScalar = compileScalarValue$1(field.mapKey, field.parent.typeName, field.name);
	const convertKey = compileMapKeyConverter(field.mapKey);
	return (writer, key) => {
		writer.tag(1, wireType);
		writeScalar(writer, convertKey(key));
	};
}
/**
* Returns a converter from an object key (always a string) to the closest
* possible type for the map key type. Invalid keys are passed through to
* the scalar writer, which raises an error for them.
*/
function compileMapKeyConverter(type) {
	switch (type) {
		case ScalarType.STRING: return (key) => key;
		case ScalarType.BOOL: return (key) => key === "true" ? true : key === "false" ? false : key;
		case ScalarType.UINT64:
		case ScalarType.FIXED64: return (key) => {
			try {
				return protoInt64.uParse(key);
			} catch (_a) {
				return key;
			}
		};
		case ScalarType.INT64:
		case ScalarType.SFIXED64:
		case ScalarType.SINT64: return (key) => {
			try {
				return protoInt64.parse(key);
			} catch (_a) {
				return key;
			}
		};
		default: return (key) => {
			const n = Number.parseInt(key);
			return Number.isFinite(n) ? n : key;
		};
	}
}
/**
* Compile an encoder for a bare scalar value (no tag), wrapping errors from
* the writer with the message and field name.
*/
function compileScalarValue$1(type, messageName, fieldName) {
	const writeScalar = compileScalarWrite(type);
	return (writer, value) => {
		try {
			writeScalar(writer, value);
		} catch (e) {
			if (e instanceof Error) throw new Error(`cannot encode field ${messageName}.${fieldName} to binary: ${e.message}`);
			throw e;
		}
	};
}
function compileScalarWrite(type) {
	switch (type) {
		case ScalarType.STRING: return (writer, value) => writer.string(value);
		case ScalarType.BOOL: return (writer, value) => writer.bool(value);
		case ScalarType.DOUBLE: return (writer, value) => writer.double(value);
		case ScalarType.FLOAT: return (writer, value) => writer.float(value);
		case ScalarType.INT32: return (writer, value) => writer.int32(value);
		case ScalarType.INT64: return (writer, value) => writer.int64(value);
		case ScalarType.UINT64: return (writer, value) => writer.uint64(value);
		case ScalarType.FIXED64: return (writer, value) => writer.fixed64(value);
		case ScalarType.BYTES: return (writer, value) => writer.bytes(value);
		case ScalarType.FIXED32: return (writer, value) => writer.fixed32(value);
		case ScalarType.SFIXED32: return (writer, value) => writer.sfixed32(value);
		case ScalarType.SFIXED64: return (writer, value) => writer.sfixed64(value);
		case ScalarType.SINT64: return (writer, value) => writer.sint64(value);
		case ScalarType.UINT32: return (writer, value) => writer.uint32(value);
		case ScalarType.SINT32: return (writer, value) => writer.sint32(value);
	}
}
/**
* Write a single field to binary format, if it is set. Used to serialize
* extensions: extensions always have explicit presence, so an extension
* value that was just set on the container is always written.
*
* @private
*/
function writeField(writer, opts, msg, field) {
	compileField$1(field)(writer, opts, msg[unsafeLocal]);
}
/**
* Compile an encoder for the wire format of a message field, honoring the
* delimited encoding of the field. The tag is written by the encoder.
*/
function compileChildWriter(field) {
	const fieldNo = field.number;
	const writeMessage = compiledWriter$1(field.message);
	if (field.delimitedEncoding) return (writer, opts, child) => {
		writer.tag(fieldNo, WireType.StartGroup);
		writeMessage(writer, opts, child);
		writer.tag(fieldNo, WireType.EndGroup);
	};
	return (writer, opts, child) => {
		writer.tag(fieldNo, WireType.LengthDelimited).fork();
		writeMessage(writer, opts, child);
		writer.join();
	};
}
function writeTypeOfScalar(type) {
	switch (type) {
		case ScalarType.BYTES:
		case ScalarType.STRING: return WireType.LengthDelimited;
		case ScalarType.DOUBLE:
		case ScalarType.FIXED64:
		case ScalarType.SFIXED64: return WireType.Bit64;
		case ScalarType.FIXED32:
		case ScalarType.SFIXED32:
		case ScalarType.FLOAT: return WireType.Bit32;
		default: return WireType.Varint;
	}
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/wkt/any.js
function anyPack(schema, message, into) {
	let ret = false;
	if (!into) {
		into = create(AnySchema);
		ret = true;
	}
	into.value = toBinary(schema, message);
	into.typeUrl = typeNameToUrl(message.$typeName);
	return ret ? into : void 0;
}
function anyIs(any, descOrTypeName) {
	if (any.typeUrl === "") return false;
	return (typeof descOrTypeName == "string" ? descOrTypeName : descOrTypeName.typeName) === typeUrlToName(any.typeUrl);
}
function anyUnpack(any, registryOrMessageDesc) {
	if (any.typeUrl === "") return;
	const desc = registryOrMessageDesc.kind == "message" ? registryOrMessageDesc : registryOrMessageDesc.getMessage(typeUrlToName(any.typeUrl));
	if (!desc || !anyIs(any, desc)) return;
	return fromBinary(desc, any.value);
}
function typeNameToUrl(name) {
	return `type.googleapis.com/${name}`;
}
function typeUrlToName(url) {
	const slash = url.lastIndexOf("/");
	const name = slash >= 0 ? url.substring(slash + 1) : url;
	if (!name.length) throw new Error(`invalid type url: ${url}`);
	return name;
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/wkt/gen/google/protobuf/struct_pb.js
/**
* Describes the file google/protobuf/struct.proto.
*/
var file_google_protobuf_struct = /*@__PURE__*/ fileDesc("Chxnb29nbGUvcHJvdG9idWYvc3RydWN0LnByb3RvEg9nb29nbGUucHJvdG9idWYihAEKBlN0cnVjdBIzCgZmaWVsZHMYASADKAsyIy5nb29nbGUucHJvdG9idWYuU3RydWN0LkZpZWxkc0VudHJ5GkUKC0ZpZWxkc0VudHJ5EgsKA2tleRgBIAEoCRIlCgV2YWx1ZRgCIAEoCzIWLmdvb2dsZS5wcm90b2J1Zi5WYWx1ZToCOAEi6gEKBVZhbHVlEjAKCm51bGxfdmFsdWUYASABKA4yGi5nb29nbGUucHJvdG9idWYuTnVsbFZhbHVlSAASFgoMbnVtYmVyX3ZhbHVlGAIgASgBSAASFgoMc3RyaW5nX3ZhbHVlGAMgASgJSAASFAoKYm9vbF92YWx1ZRgEIAEoCEgAEi8KDHN0cnVjdF92YWx1ZRgFIAEoCzIXLmdvb2dsZS5wcm90b2J1Zi5TdHJ1Y3RIABIwCgpsaXN0X3ZhbHVlGAYgASgLMhouZ29vZ2xlLnByb3RvYnVmLkxpc3RWYWx1ZUgAQgYKBGtpbmQiMwoJTGlzdFZhbHVlEiYKBnZhbHVlcxgBIAMoCzIWLmdvb2dsZS5wcm90b2J1Zi5WYWx1ZSobCglOdWxsVmFsdWUSDgoKTlVMTF9WQUxVRRAAQn8KE2NvbS5nb29nbGUucHJvdG9idWZCC1N0cnVjdFByb3RvUAFaL2dvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL3N0cnVjdHBi+AEBogIDR1BCqgIeR29vZ2xlLlByb3RvYnVmLldlbGxLbm93blR5cGVzYgZwcm90bzM");
/**
* Describes the message google.protobuf.Struct.
* Use `create(StructSchema)` to create a new message.
*/
var StructSchema = /*@__PURE__*/ messageDesc(file_google_protobuf_struct, 0);
/**
* Describes the message google.protobuf.Value.
* Use `create(ValueSchema)` to create a new message.
*/
var ValueSchema = /*@__PURE__*/ messageDesc(file_google_protobuf_struct, 1);
/**
* Describes the message google.protobuf.ListValue.
* Use `create(ListValueSchema)` to create a new message.
*/
var ListValueSchema = /*@__PURE__*/ messageDesc(file_google_protobuf_struct, 2);
/**
* `NullValue` is a singleton enumeration to represent the null value for the
* `Value` type union.
*
* The JSON representation for `NullValue` is JSON `null`.
*
* @generated from enum google.protobuf.NullValue
*/
var NullValue;
(function(NullValue) {
	/**
	* Null value.
	*
	* @generated from enum value: NULL_VALUE = 0;
	*/
	NullValue[NullValue["NULL_VALUE"] = 0] = "NULL_VALUE";
})(NullValue || (NullValue = {}));
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/extensions.js
/**
* Retrieve an extension value from a message.
*
* The function never returns undefined. Use hasExtension() to check whether an
* extension is set. If the extension is not set, this function returns the
* default value (if one was specified in the protobuf source), or the zero value
* (for example `0` for numeric types, `[]` for repeated extension fields, and
* an empty message instance for message fields).
*
* Extensions are stored as unknown fields on a message. To mutate an extension
* value, make sure to store the new value with setExtension() after mutating.
*
* If the extension does not extend the given message, an error is raised.
*/
function getExtension(message, extension, options) {
	assertExtendee(extension, message);
	const ufs = filterUnknownFields(message.$unknown, extension);
	const [container, field, get] = createExtensionContainer(extension);
	const ctx = makeReadContext$1(options);
	for (const uf of ufs) readField(container, new BinaryReader(uf.data), field, uf.wireType, ctx);
	return get();
}
/**
* Set an extension value on a message. If the message already has a value for
* this extension, the value is replaced.
*
* If the extension does not extend the given message, an error is raised.
*/
function setExtension(message, extension, value) {
	var _a;
	assertExtendee(extension, message);
	const ufs = ((_a = message.$unknown) !== null && _a !== void 0 ? _a : []).filter((uf) => uf.no !== extension.number);
	const [container, field] = createExtensionContainer(extension, value);
	const writer = new BinaryWriter();
	writeField(writer, { writeUnknownFields: true }, container, field);
	const reader = new BinaryReader(writer.finish());
	while (reader.pos < reader.len) {
		const [no, wireType] = reader.tag();
		const data = reader.skip(wireType, no);
		ufs.push({
			no,
			wireType,
			data
		});
	}
	message.$unknown = ufs;
}
function filterUnknownFields(unknownFields, extension) {
	if (unknownFields === void 0) return [];
	if (extension.fieldKind === "enum" || extension.fieldKind === "scalar") {
		for (let i = unknownFields.length - 1; i >= 0; --i) if (unknownFields[i].no == extension.number) return [unknownFields[i]];
		return [];
	}
	return unknownFields.filter((uf) => uf.no === extension.number);
}
/**
* @private
*/
function createExtensionContainer(extension, value) {
	const localName = extension.typeName;
	const field = Object.assign(Object.assign({}, extension), {
		kind: "field",
		parent: extension.extendee,
		localName
	});
	const desc = Object.assign(Object.assign({}, extension.extendee), {
		fields: [field],
		members: [field],
		oneofs: []
	});
	const container = create(desc, value !== void 0 ? { [localName]: value } : void 0);
	return [
		reflect(desc, container),
		field,
		() => {
			const value = container[localName];
			if (value === void 0) {
				const desc = extension.message;
				if (isWrapperDesc(desc)) return scalarZeroValue(desc.fields[0].scalar, desc.fields[0].longAsString);
				return create(desc);
			}
			return value;
		}
	];
}
function assertExtendee(extension, message) {
	if (extension.extendee.typeName != message.$typeName) throw new Error(`extension ${extension.typeName} can only be applied to message ${extension.extendee.typeName}`);
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/wkt/json.js
/**
* Minimum google.protobuf.Timestamp in milliseconds (inclusive).
* Only enforced in ProtoJSON.
*
* @private
*/
var timestampMsMin = /*@__PURE__*/ Date.parse("0001-01-01T00:00:00Z");
/**
* Maximum google.protobuf.Timestamp in milliseconds (inclusive).
* Only enforced in ProtoJSON.
*
* @private
*/
var timestampMsMax = /*@__PURE__*/ Date.parse("9999-12-31T23:59:59Z");
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/to-json.js
var LEGACY_REQUIRED = 3;
var IMPLICIT$1 = 2;
var jsonWriteDefaults = {
	alwaysEmitImplicit: false,
	enumAsInteger: false,
	useProtoFieldName: false
};
function makeWriteOptions(options) {
	return options ? Object.assign(Object.assign({}, jsonWriteDefaults), options) : jsonWriteDefaults;
}
/**
* Serialize the message to a JSON value, a JavaScript value that can be
* passed to JSON.stringify().
*/
function toJson(schema, message, options) {
	return compiledWriter(schema)(makeWriteOptions(options), message);
}
/**
* Serialize the message to a JSON string.
*/
function toJsonString(schema, message, options) {
	var _a;
	const jsonValue = toJson(schema, message, options);
	return JSON.stringify(jsonValue, null, (_a = options === null || options === void 0 ? void 0 : options.prettySpaces) !== null && _a !== void 0 ? _a : 0);
}
var compiledWriters = /* @__PURE__ */ new WeakMap();
/**
* Return the compiled encoder for a message, compiling it on first use.
*/
function compiledWriter(desc) {
	let compiled = compiledWriters.get(desc);
	if (compiled === void 0) compiled = compileMessage$1(desc);
	return compiled;
}
function compileMessage$1(desc) {
	const typeName = desc.typeName;
	const writeWkt = compileWkt$1(desc);
	if (writeWkt !== void 0) {
		const foreignField = desc.fields[0];
		const compiledWriter = (opts, message) => {
			if (message.$typeName !== typeName && foreignField !== void 0) throw new FieldError(foreignField, `cannot use ${foreignField} with message ${message.$typeName}`, "ForeignFieldError");
			return writeWkt(opts, message);
		};
		compiledWriters.set(desc, compiledWriter);
		return compiledWriter;
	}
	const sortedFields = desc.fields.concat().sort((a, b) => a.number - b.number);
	const foreignField = sortedFields[0];
	const fieldWriters = [];
	const compiledWriter = (opts, message) => {
		if (message.$typeName !== typeName && foreignField !== void 0) throw new FieldError(foreignField, `cannot use ${foreignField} with message ${message.$typeName}`, "ForeignFieldError");
		const json = {};
		for (let i = 0; i < fieldWriters.length; i++) fieldWriters[i](opts, message, json);
		if (opts.registry) writeExtensions(json, opts, opts.registry, message, desc);
		return json;
	};
	compiledWriters.set(desc, compiledWriter);
	for (const field of sortedFields) fieldWriters.push(compileField(field));
	return compiledWriter;
}
/**
* Compile an encoder for a well-known type with a custom JSON representation,
* or return undefined for other messages.
*/
function compileWkt$1(desc) {
	if (!desc.typeName.startsWith("google.protobuf.")) return;
	switch (desc.typeName) {
		case "google.protobuf.Any": return (opts, message) => anyToJson(message, opts);
		case "google.protobuf.Timestamp": return (opts, message) => timestampToJson(message);
		case "google.protobuf.Duration": return (opts, message) => durationToJson(message);
		case "google.protobuf.FieldMask": return (opts, message) => fieldMaskToJson(message);
		case "google.protobuf.Struct": return (opts, message) => structToJson(message);
		case "google.protobuf.Value": return (opts, message) => valueToJson(message);
		case "google.protobuf.ListValue": return (opts, message) => listValueToJson(message);
		default:
			if (isWrapperDesc(desc)) {
				const valueField = desc.fields[0];
				const localName = valueField.localName;
				const zero = scalarZeroValue(valueField.scalar, false);
				const writeScalar = compileScalarValue(valueField);
				return (opts, message) => {
					const value = message[localName];
					return writeScalar(opts, value === void 0 ? zero : value);
				};
			}
			return;
	}
}
function compileField(field) {
	switch (field.fieldKind) {
		case "scalar":
		case "enum":
		case "message": return compileSingularField(field);
		case "list":
		case "map": {
			const writeValue = field.fieldKind == "list" ? compileListValue(field) : compileMapValue(field);
			const protoName = field.name;
			const jsonKey = field.jsonName;
			const localName = field.localName;
			return (opts, message, json) => {
				const value = writeValue(opts, message[localName]);
				if (value !== void 0) json[opts.useProtoFieldName ? protoName : jsonKey] = value;
			};
		}
	}
}
/**
* Compile an encoder for a singular field: the presence check, and the
* value encoder.
*/
function compileSingularField(field) {
	const writeValue = compileSingularValue(field);
	const protoName = field.name;
	const jsonKey = field.jsonName;
	const localName = field.localName;
	if (field.oneof) {
		const oneofLocalName = field.oneof.localName;
		return (opts, message, json) => {
			const oneof = message[oneofLocalName];
			if (oneof.case === localName) json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, oneof.value);
		};
	}
	if (field.presence != IMPLICIT$1) {
		const requiredError = field.presence == LEGACY_REQUIRED ? `cannot encode ${field} to JSON: required field not set` : void 0;
		return (opts, message, json) => {
			const value = message[localName];
			if (value !== void 0 && Object.prototype.hasOwnProperty.call(message, localName)) json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, value);
			else if (requiredError !== void 0) throw new Error(requiredError);
		};
	}
	if (field.fieldKind == "enum") {
		const zero = field.enum.values[0].number;
		return (opts, message, json) => {
			const value = message[localName];
			if (value !== zero || opts.alwaysEmitImplicit) json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, value);
		};
	}
	switch (field.scalar) {
		case ScalarType.BOOL: return (opts, message, json) => {
			const value = message[localName];
			if (value !== false || opts.alwaysEmitImplicit) json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, value);
		};
		case ScalarType.STRING: return (opts, message, json) => {
			const value = message[localName];
			if (value !== "" || opts.alwaysEmitImplicit) json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, value);
		};
		case ScalarType.BYTES: return (opts, message, json) => {
			const value = message[localName];
			if (!(value instanceof Uint8Array) || value.byteLength > 0 || opts.alwaysEmitImplicit) json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, value);
		};
		case ScalarType.DOUBLE:
		case ScalarType.FLOAT: return (opts, message, json) => {
			const value = message[localName];
			if (!Object.is(value, 0) || opts.alwaysEmitImplicit) json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, value);
		};
		default: return (opts, message, json) => {
			const value = message[localName];
			if (value != 0 || opts.alwaysEmitImplicit) json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, value);
		};
	}
}
/**
* Compile an encoder for the value of a field of any kind. Used for
* extension values.
*/
function compileFieldValue(field) {
	switch (field.fieldKind) {
		case "scalar":
		case "enum":
		case "message": return compileSingularValue(field);
		case "list": return compileListValue(field);
		case "map": return compileMapValue(field);
	}
}
/**
* Compile an encoder for the value of a singular field.
*/
function compileSingularValue(field) {
	switch (field.fieldKind) {
		case "scalar": return compileScalarValue(field);
		case "enum": return compileEnumValue(field);
		case "message": return compileMessageValue(field);
	}
}
/**
* Compile an encoder for the value of a message field.
*/
function compileMessageValue(field) {
	const { toMessage } = localMessageMapper(field);
	const writeMessage = compiledWriter(field.message);
	return (opts, value) => writeMessage(opts, toMessage(value));
}
/**
* Compile an encoder for a list field value. Returns undefined for an empty
* list, unless alwaysEmitImplicit is enabled.
*/
function compileListValue(field) {
	const writeItem = compileListItemValue(field);
	return (opts, value) => {
		const items = value;
		if (items.length == 0 && !opts.alwaysEmitImplicit) return;
		const jsonArray = [];
		for (let i = 0; i < items.length; i++) jsonArray.push(writeItem(opts, items[i]));
		return jsonArray;
	};
}
function compileListItemValue(field) {
	switch (field.listKind) {
		case "scalar": return compileScalarValue(field);
		case "enum": return compileEnumValue(field);
		case "message": return compileMessageValue(field);
	}
}
/**
* Compile an encoder for a map field value. Returns undefined for an empty
* map, unless alwaysEmitImplicit is enabled. Map keys are stored as object
* keys and are used as JSON keys as-is.
*/
function compileMapValue(field) {
	const writeMapValue = compileMapEntryValue(field);
	return (opts, value) => {
		const record = value;
		const keys = Object.keys(record);
		if (keys.length == 0 && !opts.alwaysEmitImplicit) return;
		const jsonObject = {};
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			jsonObject[key] = writeMapValue(opts, record[key]);
		}
		return jsonObject;
	};
}
function compileMapEntryValue(field) {
	switch (field.mapKind) {
		case "scalar": return compileScalarValue(field);
		case "enum": return compileEnumValue(field);
		case "message": return compileMessageValue(field);
	}
}
/**
* Compile an encoder for an enum value.
*/
function compileEnumValue(field) {
	const desc = field.enum;
	if (desc.typeName == "google.protobuf.NullValue") return (opts, value) => {
		if (typeof value != "number") throw errorEnumValue(desc, value);
		return null;
	};
	return (opts, value) => {
		var _a, _b;
		if (typeof value != "number") throw errorEnumValue(desc, value);
		if (opts.enumAsInteger) return value;
		return (_b = (_a = desc.value[value]) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : value;
	};
}
function errorEnumValue(desc, value) {
	return /* @__PURE__ */ new Error(`cannot encode ${desc} to JSON: expected number, got ${formatVal(value)}`);
}
/**
* Compile an encoder for a scalar value. Errors report the original field
* descriptor, which may be a list or map field for items of those fields.
*/
function compileScalarValue(field) {
	switch (field.scalar) {
		case ScalarType.INT32:
		case ScalarType.SFIXED32:
		case ScalarType.SINT32:
		case ScalarType.FIXED32:
		case ScalarType.UINT32: return (opts, value) => {
			if (typeof value != "number") throw errorScalarValue(field, value);
			return value;
		};
		case ScalarType.FLOAT:
		case ScalarType.DOUBLE: return (opts, value) => {
			if (typeof value != "number") throw errorScalarValue(field, value);
			if (Number.isNaN(value)) return "NaN";
			if (value === Number.POSITIVE_INFINITY) return "Infinity";
			if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
			return value;
		};
		case ScalarType.STRING: return (opts, value) => {
			if (typeof value != "string") throw errorScalarValue(field, value);
			return value;
		};
		case ScalarType.BOOL: return (opts, value) => {
			if (typeof value != "boolean") throw errorScalarValue(field, value);
			return value;
		};
		case ScalarType.UINT64:
		case ScalarType.FIXED64:
		case ScalarType.INT64:
		case ScalarType.SFIXED64:
		case ScalarType.SINT64: return (opts, value) => {
			if (typeof value == "bigint" || typeof value == "string" || typeof value == "number" && Number.isInteger(value)) return value.toString();
			throw errorScalarValue(field, value);
		};
		case ScalarType.BYTES: return (opts, value) => {
			if (value instanceof Uint8Array) return base64Encode(value);
			throw errorScalarValue(field, value);
		};
	}
}
function errorScalarValue(field, value) {
	var _a;
	return /* @__PURE__ */ new Error(`cannot encode ${field} to JSON: ${(_a = checkField(field, value)) === null || _a === void 0 ? void 0 : _a.message}`);
}
/**
* Write extensions for unknown fields that are found in the registry.
*/
function writeExtensions(json, opts, registry, message, desc) {
	const unknown = message.$unknown;
	if (unknown === void 0) return;
	const tagSeen = /* @__PURE__ */ new Set();
	for (let i = 0; i < unknown.length; i++) {
		const { no } = unknown[i];
		if (!tagSeen.has(no)) {
			tagSeen.add(no);
			const extension = registry.getExtensionFor(desc, no);
			if (!extension) continue;
			const [container, field] = createExtensionContainer(extension, getExtension(message, extension));
			const local = container[unsafeLocal];
			const jsonValue = compileFieldValue(field)(opts, local[field.localName]);
			if (jsonValue !== void 0) json[extension.jsonName] = jsonValue;
		}
	}
}
function anyToJson(val, opts) {
	if (val.typeUrl === "") return {};
	const { registry } = opts;
	let message;
	let desc;
	if (registry) {
		message = anyUnpack(val, registry);
		if (message) desc = registry.getMessage(message.$typeName);
	}
	if (!desc || !message) throw new Error(`cannot encode message ${val.$typeName} to JSON: "${val.typeUrl}" is not in the type registry`);
	const json = hasCustomJsonRepresentation(desc) ? { value: compiledWriter(desc)(opts, message) } : compiledWriter(desc)(opts, message);
	json["@type"] = val.typeUrl;
	return json;
}
function durationToJson(val) {
	const seconds = Number(val.seconds);
	const nanos = val.nanos;
	if (seconds > 315576e6 || seconds < -315576e6) throw new Error(`cannot encode message ${val.$typeName} to JSON: value out of range`);
	if (seconds > 0 && nanos < 0 || seconds < 0 && nanos > 0) throw new Error(`cannot encode message ${val.$typeName} to JSON: nanos sign must match seconds sign`);
	let text = val.seconds.toString();
	if (nanos !== 0) {
		let nanosStr = Math.abs(nanos).toString();
		nanosStr = "0".repeat(9 - nanosStr.length) + nanosStr;
		if (nanosStr.substring(3) === "000000") nanosStr = nanosStr.substring(0, 3);
		else if (nanosStr.substring(6) === "000") nanosStr = nanosStr.substring(0, 6);
		text += "." + nanosStr;
		if (nanos < 0 && seconds == 0) text = "-" + text;
	}
	return text + "s";
}
function fieldMaskToJson(val) {
	return val.paths.map((p) => {
		if (protoSnakeCase(protoCamelCase(p)) !== p) throw new Error(`cannot encode message ${val.$typeName} to JSON: lowerCamelCase of path name "${p}" is irreversible`);
		return protoCamelCase(p);
	}).join(",");
}
function structToJson(val) {
	const json = {};
	const keys = Object.keys(val.fields);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		json[key] = valueToJson(val.fields[key]);
	}
	return json;
}
function valueToJson(val) {
	switch (val.kind.case) {
		case "nullValue": return null;
		case "numberValue":
			if (!Number.isFinite(val.kind.value)) throw new Error(`${val.$typeName} cannot be NaN or Infinity`);
			return val.kind.value;
		case "boolValue": return val.kind.value;
		case "stringValue": return val.kind.value;
		case "structValue": return structToJson(val.kind.value);
		case "listValue": return listValueToJson(val.kind.value);
		default: throw new Error(`${val.$typeName} must have a value`);
	}
}
function listValueToJson(val) {
	return val.values.map(valueToJson);
}
function timestampToJson(val) {
	const ms = Number(val.seconds) * 1e3;
	if (ms < timestampMsMin || ms > timestampMsMax) throw new Error(`cannot encode message ${val.$typeName} to JSON: must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive`);
	if (val.nanos < 0) throw new Error(`cannot encode message ${val.$typeName} to JSON: nanos must not be negative`);
	if (val.nanos > 999999999) throw new Error(`cannot encode message ${val.$typeName} to JSON: nanos must not be greater than 99999999`);
	let z = "Z";
	if (val.nanos > 0) {
		const nanosStr = (val.nanos + 1e9).toString().substring(1);
		if (nanosStr.substring(3) === "000000") z = "." + nanosStr.substring(0, 3) + "Z";
		else if (nanosStr.substring(6) === "000") z = "." + nanosStr.substring(0, 6) + "Z";
		else z = "." + nanosStr + "Z";
	}
	return new Date(ms).toISOString().replace(".000Z", z);
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/from-json.js
var IMPLICIT = 2;
function makeReadContext(options) {
	return Object.assign(Object.assign({
		ignoreUnknownFields: false,
		recursionLimit: 100
	}, options), { depth: 0 });
}
/**
* Parse a message from a JSON string.
*
* Duplicate keys are rejected.
*/
function fromJsonString(schema, json, options) {
	return fromJson(schema, parseJsonString(json, schema.typeName), options);
}
/**
* Parse a message from a JSON value.
*
* Duplicate keys are rejected, but a value parsed by JSON.parse has already
* dropped duplicates (the last one wins). Use `fromJsonString` for strict
* duplicate-key checking.
*/
function fromJson(schema, json, options) {
	const message = create(schema);
	readMessage(schema, message, json, options);
	return message;
}
/**
* Run the compiled decoder for the message, wrapping FieldErrors with the
* standard error message.
*/
function readMessage(schema, message, json, options) {
	try {
		compiledReader(schema)(message, json, makeReadContext(options));
	} catch (e) {
		if (isFieldError(e)) throw new Error(`cannot decode ${e.field()} from JSON: ${e.message}`, { cause: e });
		throw e;
	}
}
var compiledReaders = /* @__PURE__ */ new WeakMap();
/**
* Return the compiled decoder for a message, compiling it on first use.
*/
function compiledReader(desc) {
	let compiled = compiledReaders.get(desc);
	if (compiled === void 0) compiled = compileMessage(desc);
	return compiled;
}
function compileMessage(desc) {
	const descString = String(desc);
	const readWkt = compileWkt(desc);
	if (readWkt !== void 0) {
		const compiled = (message, json, ctx) => {
			if (++ctx.depth > ctx.recursionLimit) throw new Error(`cannot decode ${descString} from JSON: maximum recursion depth of ${ctx.recursionLimit} reached`);
			readWkt(message, json, ctx);
			ctx.depth--;
		};
		compiledReaders.set(desc, compiled);
		return compiled;
	}
	const typeName = desc.typeName;
	const fieldsByJsonKey = /* @__PURE__ */ new Map();
	const compiled = (message, json, ctx) => {
		var _a;
		if (++ctx.depth > ctx.recursionLimit) throw new Error(`cannot decode ${descString} from JSON: maximum recursion depth of ${ctx.recursionLimit} reached`);
		if (json == null || Array.isArray(json) || typeof json != "object") throw new Error(`cannot decode ${descString} from JSON: ${formatVal(json)}`);
		const oneofSeen = /* @__PURE__ */ new Map();
		const fieldSeen = /* @__PURE__ */ new Set();
		const jsonKeys = Object.keys(json);
		for (let i = 0; i < jsonKeys.length; i++) {
			const jsonKey = jsonKeys[i];
			const jsonValue = json[jsonKey];
			const entry = fieldsByJsonKey.get(jsonKey);
			if (entry !== void 0) {
				const field = entry.field;
				if (fieldSeen.has(field)) throw new FieldError(field, "set multiple times");
				fieldSeen.add(field);
				if (entry.oneofScalarNullSkip && jsonValue === null) continue;
				if (entry.oneof) {
					const seen = oneofSeen.get(entry.oneof);
					if (seen !== void 0) throw new FieldError(entry.oneof, `oneof set multiple times by ${seen.name} and ${field.name}`);
					oneofSeen.set(entry.oneof, field);
				}
				entry.read(message, jsonValue, ctx);
			} else {
				const extension = jsonKey.startsWith("[") && jsonKey.endsWith("]") ? (_a = ctx.registry) === null || _a === void 0 ? void 0 : _a.getExtension(jsonKey.substring(1, jsonKey.length - 1)) : void 0;
				if ((extension === null || extension === void 0 ? void 0 : extension.extendee.typeName) == typeName) {
					const [container, field, get] = createExtensionContainer(extension);
					compileFieldReader(field)(container[unsafeLocal], jsonValue, ctx);
					setExtension(message, extension, get());
				}
				if (extension === void 0 && !ctx.ignoreUnknownFields) throw new Error(`cannot decode ${descString} from JSON: key "${jsonKey}" is unknown`);
			}
		}
		ctx.depth--;
	};
	compiledReaders.set(desc, compiled);
	for (const field of desc.fields) {
		const entry = {
			read: compileFieldReader(field),
			field,
			oneof: field.oneof,
			oneofScalarNullSkip: field.oneof !== void 0 && field.fieldKind == "scalar"
		};
		fieldsByJsonKey.set(field.name, entry).set(field.jsonName, entry);
	}
	return compiled;
}
/**
* Compile a decoder for a well-known type with a custom JSON representation,
* or return undefined for other messages. The recursion limit is enforced by
* the caller.
*/
function compileWkt(desc) {
	if (!desc.typeName.startsWith("google.protobuf.")) return;
	switch (desc.typeName) {
		case "google.protobuf.Any": return (message, json, ctx) => anyFromJson(message, json, ctx);
		case "google.protobuf.Timestamp": return (message, json) => timestampFromJson(message, json);
		case "google.protobuf.Duration": return (message, json) => durationFromJson(message, json);
		case "google.protobuf.FieldMask": return (message, json) => fieldMaskFromJson(message, json);
		case "google.protobuf.Struct": return (message, json, ctx) => structFromJson(message, json, ctx);
		case "google.protobuf.Value": return (message, json, ctx) => valueFromJson(message, json, ctx);
		case "google.protobuf.ListValue": return (message, json, ctx) => listValueFromJson(message, json, ctx);
		default:
			if (isWrapperDesc(desc)) {
				const valueField = desc.fields[0];
				const localName = valueField.localName;
				const scalar = valueField.scalar;
				const longAsString = valueField.longAsString;
				const readScalar = compileScalarConverter(valueField);
				return (message, json) => {
					if (json === null) message[localName] = scalarZeroValue(scalar, longAsString);
					else message[localName] = readScalar(json);
				};
			}
			return;
	}
}
function compileFieldReader(field) {
	switch (field.fieldKind) {
		case "scalar": return compileScalarFieldReader(field);
		case "enum": return compileEnumFieldReader(field);
		case "message": return compileMessageFieldReader(field);
		case "list": return compileListFieldReader(field);
		case "map": return compileMapFieldReader(field);
	}
}
function compileScalarFieldReader(field) {
	const readScalar = compileScalarConverter(field);
	const localName = field.localName;
	if (field.oneof) {
		const oneofLocalName = field.oneof.localName;
		return (message, json) => {
			message[oneofLocalName] = {
				case: localName,
				value: readScalar(json)
			};
		};
	}
	const clear = compileClear(field);
	return (message, json) => {
		if (json === null) clear(message);
		else message[localName] = readScalar(json);
	};
}
/**
* Compile a function that resets the field to unset, mirroring the clear
* operation of the reflect API for fields that are not part of a oneof.
*/
function compileClear(field) {
	const localName = field.localName;
	if (field.presence != IMPLICIT) return (message) => {
		delete message[localName];
	};
	if (field.fieldKind == "enum") {
		const zero = field.enum.values[0].number;
		return (message) => {
			message[localName] = zero;
		};
	}
	const scalar = field.scalar;
	const longAsString = field.longAsString;
	return (message) => {
		message[localName] = scalarZeroValue(scalar, longAsString);
	};
}
function compileEnumFieldReader(field) {
	const readEnumValue = compileEnumConverter(field.enum);
	const checkEnum = compileEnumCheck(field.enum);
	const localName = field.localName;
	const nullResets = field.enum.typeName != "google.protobuf.NullValue";
	if (field.oneof) {
		const oneofLocalName = field.oneof.localName;
		return (message, json, ctx) => {
			if (json === null && nullResets) {
				if (message[oneofLocalName].case === localName) message[oneofLocalName] = { case: void 0 };
				return;
			}
			const value = readEnumValue(json, ctx.ignoreUnknownFields);
			if (value === tokenIgnoredUnknownEnum) return;
			const check = checkEnum(value);
			if (check !== true) throw new FieldError(field, reasonSingular(field, value, check));
			message[oneofLocalName] = {
				case: localName,
				value
			};
		};
	}
	const clear = compileClear(field);
	return (message, json, ctx) => {
		if (json === null && nullResets) {
			clear(message);
			return;
		}
		const value = readEnumValue(json, ctx.ignoreUnknownFields);
		if (value === tokenIgnoredUnknownEnum) return;
		const check = checkEnum(value);
		if (check !== true) throw new FieldError(field, reasonSingular(field, value, check));
		message[localName] = value;
	};
}
function compileMessageFieldReader(field) {
	const localName = field.localName;
	const { toMessage, toLocal } = localMessageMapper(field);
	const readChild = compiledReader(field.message);
	const nullResets = field.message.typeName != "google.protobuf.Value";
	if (field.oneof) {
		const oneofLocalName = field.oneof.localName;
		return (message, json, ctx) => {
			const oneof = message[oneofLocalName];
			if (json === null && nullResets) {
				if (oneof.case === localName) message[oneofLocalName] = { case: void 0 };
				return;
			}
			const child = toMessage(oneof.case === localName ? oneof.value : void 0);
			readChild(child, json, ctx);
			message[oneofLocalName] = {
				case: localName,
				value: toLocal(child)
			};
		};
	}
	return (message, json, ctx) => {
		if (json === null && nullResets) {
			delete message[localName];
			return;
		}
		const child = toMessage(message[localName]);
		readChild(child, json, ctx);
		message[localName] = toLocal(child);
	};
}
function compileListFieldReader(field) {
	const localName = field.localName;
	const readItem = compileListItemReader(field);
	return (message, json, ctx) => {
		if (json === null) return;
		if (!Array.isArray(json)) throw new FieldError(field, "expected Array, got " + formatVal(json));
		const items = message[localName];
		for (let i = 0; i < json.length; i++) {
			const value = readItem(json[i], ctx, items.length);
			if (value !== tokenIgnoredUnknownEnum) items.push(value);
		}
	};
}
/**
* Compile a decoder for a list item. The index is only used in errors, and
* accounts for previously merged items.
*/
function compileListItemReader(field) {
	switch (field.listKind) {
		case "scalar": {
			const parseScalar = compileScalarParse(field);
			const checkValue = checkScalarValue(field.scalar);
			const toLocal = compileScalarToLocal(field);
			return (json, ctx, index) => {
				if (json === null) throw new FieldError(field, "list item must not be null");
				const value = parseScalar(json);
				const check = checkValue(value);
				if (check !== true) throw new FieldError(field, `list item #${index + 1}: ${reasonSingular(field, value, check)}`);
				return toLocal(value);
			};
		}
		case "enum": {
			const readEnumValue = compileEnumConverter(field.enum);
			const checkEnum = compileEnumCheck(field.enum);
			const nullResets = field.enum.typeName != "google.protobuf.NullValue";
			return (json, ctx, index) => {
				if (json === null && nullResets) throw new FieldError(field, "list item must not be null");
				const value = readEnumValue(json, ctx.ignoreUnknownFields);
				if (value === tokenIgnoredUnknownEnum) return value;
				const check = checkEnum(value);
				if (check !== true) throw new FieldError(field, `list item #${index + 1}: ${reasonSingular(field, value, check)}`);
				return value;
			};
		}
		case "message": {
			const { toMessage, toLocal } = localMessageMapper(field);
			const readChild = compiledReader(field.message);
			const nullResets = field.message.typeName != "google.protobuf.Value";
			return (json, ctx) => {
				if (json === null && nullResets) throw new FieldError(field, "list item must not be null");
				const child = toMessage(void 0);
				readChild(child, json, ctx);
				return toLocal(child);
			};
		}
	}
}
function compileMapFieldReader(field) {
	const localName = field.localName;
	const mapKey = field.mapKey;
	const parseMapKey = compileMapKeyParse(mapKey);
	const checkMapKey = checkScalarValue(mapKey);
	let parseValue;
	let checkValue;
	let toLocalValue = (value) => value;
	let nullResets = true;
	switch (field.mapKind) {
		case "scalar":
			parseValue = compileScalarParse(field);
			checkValue = checkScalarValue(field.scalar);
			toLocalValue = compileScalarToLocal(field);
			break;
		case "enum": {
			const readEnumValue = compileEnumConverter(field.enum);
			parseValue = (json, ctx) => readEnumValue(json, ctx.ignoreUnknownFields);
			checkValue = compileEnumCheck(field.enum);
			nullResets = field.enum.typeName != "google.protobuf.NullValue";
			break;
		}
		case "message": {
			const { toMessage, toLocal } = localMessageMapper(field);
			const readChild = compiledReader(field.message);
			nullResets = field.message.typeName != "google.protobuf.Value";
			parseValue = (json, ctx) => {
				const child = toMessage(void 0);
				readChild(child, json, ctx);
				return toLocal(child);
			};
			break;
		}
	}
	return (message, json, ctx) => {
		if (json === null) return;
		if (typeof json != "object" || Array.isArray(json)) throw new FieldError(field, "expected object, got " + formatVal(json));
		const record = message[localName];
		const seen = /* @__PURE__ */ new Set();
		const jsonMapKeys = Object.keys(json);
		for (let i = 0; i < jsonMapKeys.length; i++) {
			const jsonMapKey = jsonMapKeys[i];
			const jsonMapValue = json[jsonMapKey];
			const key = parseMapKey(jsonMapKey);
			if (seen.has(key)) throw new FieldError(field, `duplicate map key "${jsonMapKey}"`);
			seen.add(key);
			if (jsonMapValue === null && nullResets) throw new FieldError(field, "map value must not be null");
			const value = parseValue(jsonMapValue, ctx);
			if (value === tokenIgnoredUnknownEnum) continue;
			const checkKey = checkMapKey(key);
			if (checkKey !== true) throw new FieldError(field, `invalid map key: ${reasonSingular({ scalar: mapKey }, key, checkKey)}`);
			if (checkValue !== void 0) {
				const check = checkValue(value);
				if (check !== true) throw new FieldError(field, `map entry ${formatVal(key)}: ${reasonSingular(field, value, check)}`);
			}
			record[key] = toLocalValue(value);
		}
	};
}
var tokenIgnoredUnknownEnum = Symbol();
/**
* Compile a converter from a JSON value to an enum value. JSON null returns
* the enum's first value. With ignoreUnknownFields false, unknown string
* values raise an error; with true, they return tokenIgnoredUnknownEnum.
* The value is not checked against the enum's values, see compileEnumCheck.
*/
function compileEnumConverter(desc) {
	const zero = desc.values[0].number;
	const values = desc.values;
	return (json, ignoreUnknownFields) => {
		if (json === null) return zero;
		switch (typeof json) {
			case "number":
				if (Number.isInteger(json)) return json;
				break;
			case "string": {
				const value = values.find((ev) => ev.name === json);
				if (value !== void 0) return value.number;
				if (ignoreUnknownFields) return tokenIgnoredUnknownEnum;
				break;
			}
		}
		throw new Error(`cannot decode ${desc} from JSON: ${formatVal(json)}`);
	};
}
/**
* Compile the check that the reflect API performs for enum values: open
* enums accept any int32 value, closed enums accept only declared values.
*/
function compileEnumCheck(desc) {
	if (desc.open) return checkScalarValue(ScalarType.INT32);
	const values = desc.values;
	return (value) => values.some((v) => v.number === value);
}
/**
* Compile a converter from a JSON value to the local representation of a
* scalar, fusing JSON parsing, the validation of the reflect API, and the
* conversion to the local 64-bit integer representation.
*/
function compileScalarConverter(field) {
	const parseScalar = compileScalarParse(field);
	const checkValue = checkScalarValue(field.scalar);
	const toLocal = compileScalarToLocal(field);
	return (json) => {
		const value = parseScalar(json);
		const check = checkValue(value);
		if (check !== true) throw new FieldError(field, reasonSingular(field, value, check));
		return toLocal(value);
	};
}
/**
* Compile the JSON-specific parsing step for a scalar value: the special
* string values of float and double, string-encoded numbers, and base64
* bytes. Returns the input unchanged if the JSON value cannot be converted;
* the validation step raises an error for it.
*/
function compileScalarParse(field) {
	switch (field.scalar) {
		case ScalarType.DOUBLE:
		case ScalarType.FLOAT: return (json) => {
			if (json === "NaN") return NaN;
			if (json === "Infinity") return Number.POSITIVE_INFINITY;
			if (json === "-Infinity") return Number.NEGATIVE_INFINITY;
			if (typeof json == "number") {
				if (Number.isNaN(json)) throw new FieldError(field, "unexpected NaN number");
				if (!Number.isFinite(json)) throw new FieldError(field, "unexpected infinite number");
				return json;
			}
			if (typeof json == "string") {
				if (json === "") return json;
				if (json.trim().length !== json.length) return json;
				const float = Number(json);
				if (!Number.isFinite(float)) return json;
				return float;
			}
			return json;
		};
		case ScalarType.INT32:
		case ScalarType.FIXED32:
		case ScalarType.SFIXED32:
		case ScalarType.SINT32:
		case ScalarType.UINT32: return int32FromJson;
		case ScalarType.BYTES: return (json) => {
			if (typeof json == "string") {
				if (json === "") return /* @__PURE__ */ new Uint8Array(0);
				try {
					return base64Decode(json);
				} catch (e) {
					throw new FieldError(field, e instanceof Error ? e.message : String(e));
				}
			}
			return json;
		};
		default: return (json) => json;
	}
}
/**
* Compile the conversion of a validated scalar value to its local
* representation: 64-bit integers become bigint, or string with the
* longAsString option.
*/
function compileScalarToLocal(field) {
	const longAsString = field.fieldKind !== "map" && field.longAsString;
	switch (field.scalar) {
		case ScalarType.INT64:
		case ScalarType.SFIXED64:
		case ScalarType.SINT64:
			if (longAsString) return (value) => String(value);
			return (value) => typeof value == "string" || typeof value == "number" ? protoInt64.parse(value) : value;
		case ScalarType.FIXED64:
		case ScalarType.UINT64:
			if (longAsString) return (value) => String(value);
			return (value) => typeof value == "string" || typeof value == "number" ? protoInt64.uParse(value) : value;
		default: return (value) => value;
	}
}
/**
* Return a parser from a JSON value to a map key for the given key type.
* Canonicalizes 64-bit integers given as string, so that "01" and "1" are
* one key, and duplicates can raise an error.
* The parser returns the input if the JSON value cannot be converted.
*/
function compileMapKeyParse(type) {
	switch (type) {
		case ScalarType.BOOL: return (jsonString) => {
			switch (jsonString) {
				case "true": return true;
				case "false": return false;
			}
			return jsonString;
		};
		case ScalarType.INT32:
		case ScalarType.FIXED32:
		case ScalarType.UINT32:
		case ScalarType.SFIXED32:
		case ScalarType.SINT32: return int32FromJson;
		case ScalarType.INT64:
		case ScalarType.SINT64:
		case ScalarType.SFIXED64:
		case ScalarType.UINT64:
		case ScalarType.FIXED64: return (jsonString) => /^-?0+$/.test(jsonString) ? "0" : jsonString.replace(/^(-?)0+(?=\d)/, "$1");
		default: return (jsonString) => jsonString;
	}
}
/**
* Try to parse a JSON value to a 32-bit integer for the reflect API.
*
* Returns the input if the JSON value cannot be converted.
*/
function int32FromJson(json) {
	if (typeof json == "string") {
		if (json === "") return json;
		if (json.trim().length !== json.length) return json;
		const num = Number(json);
		if (Number.isNaN(num)) return json;
		return num;
	}
	return json;
}
/**
* Parse a JSON string, rejecting duplicate object keys (which JSON.parse would
* otherwise silently merge).
*/
function parseJsonString(jsonString, typeName) {
	let json;
	try {
		json = JSON.parse(jsonString);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		throw new Error(`cannot decode message ${typeName} from JSON: ${message}`, { cause: e });
	}
	checkDuplicateKeys(jsonString, typeName);
	return json;
}
/**
* Scan a JSON string for duplicate object member names at any depth, throwing
* if any are found. JSON.parse() silently keeps the last of duplicate keys, so
* this raw-string scan is the only way to reject them. It must only be called
* with a string that JSON.parse() has already accepted, so it can assume the
* input is well-formed.
*/
function checkDuplicateKeys(jsonString, typeName) {
	const stack = [];
	let expectKey = false;
	let i = 0;
	while (i < jsonString.length) switch (jsonString[i]) {
		case "{":
			stack.push(/* @__PURE__ */ new Set());
			expectKey = true;
			i++;
			break;
		case "[":
			stack.push(null);
			expectKey = false;
			i++;
			break;
		case "}":
		case "]":
			stack.pop();
			expectKey = false;
			i++;
			break;
		case ",":
			expectKey = stack[stack.length - 1] != null;
			i++;
			break;
		case ":":
			expectKey = false;
			i++;
			break;
		case "\"": {
			const open = i++;
			let escaped = false;
			while (i < jsonString.length) {
				if (jsonString[i] == "\\") {
					escaped = true;
					i += 2;
					continue;
				}
				if (jsonString[i] == "\"") break;
				i++;
			}
			const close = i++;
			const seen = stack[stack.length - 1];
			if (expectKey && seen) {
				const name = escaped ? JSON.parse(jsonString.substring(open, close + 1)) : jsonString.substring(open + 1, close);
				if (seen.has(name)) throw new Error(`cannot decode message ${typeName} from JSON: duplicate object key "${name}"`);
				seen.add(name);
			}
			expectKey = false;
			break;
		}
		default:
			i++;
			break;
	}
}
function anyFromJson(any, json, ctx) {
	var _a;
	if (json === null || Array.isArray(json) || typeof json != "object") throw new Error(`cannot decode message ${any.$typeName} from JSON: expected object but got ${formatVal(json)}`);
	if (Object.keys(json).length == 0) return;
	const typeUrl = json["@type"];
	if (typeof typeUrl != "string" || typeUrl == "") throw new Error(`cannot decode message ${any.$typeName} from JSON: "@type" is empty`);
	const typeName = typeUrl.includes("/") ? typeUrl.substring(typeUrl.lastIndexOf("/") + 1) : typeUrl;
	if (!typeName.length) throw new Error(`cannot decode message ${any.$typeName} from JSON: "@type" is invalid`);
	const desc = (_a = ctx.registry) === null || _a === void 0 ? void 0 : _a.getMessage(typeName);
	if (!desc) throw new Error(`cannot decode message ${any.$typeName} from JSON: ${typeUrl} is not in the type registry`);
	const message = create(desc);
	if (hasCustomJsonRepresentation(desc) && Object.prototype.hasOwnProperty.call(json, "value")) compiledReader(desc)(message, json.value, ctx);
	else {
		const copy = Object.assign({}, json);
		delete copy["@type"];
		compiledReader(desc)(message, copy, ctx);
	}
	anyPack(desc, message, any);
}
function timestampFromJson(timestamp, json) {
	if (typeof json !== "string") throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: ${formatVal(json)}`);
	const matches = json.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,9}))?(?:Z|([+-][0-9][0-9]:[0-9][0-9]))$/);
	if (!matches) throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: invalid RFC 3339 string`);
	const ms = Date.parse(matches[1] + "-" + matches[2] + "-" + matches[3] + "T" + matches[4] + ":" + matches[5] + ":" + matches[6] + (matches[8] ? matches[8] : "Z"));
	if (Number.isNaN(ms)) throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: invalid RFC 3339 string`);
	if (ms < timestampMsMin || ms > timestampMsMax) throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive`);
	timestamp.seconds = protoInt64.parse(ms / 1e3);
	timestamp.nanos = 0;
	if (matches[7]) timestamp.nanos = parseInt("1" + matches[7] + "0".repeat(9 - matches[7].length)) - 1e9;
}
function durationFromJson(duration, json) {
	if (typeof json !== "string") throw new Error(`cannot decode message ${duration.$typeName} from JSON: ${formatVal(json)}`);
	const match = json.match(/^(-?[0-9]+)(?:\.([0-9]+))?s/);
	if (match === null) throw new Error(`cannot decode message ${duration.$typeName} from JSON: ${formatVal(json)}`);
	const longSeconds = Number(match[1]);
	if (longSeconds > 315576e6 || longSeconds < -315576e6) throw new Error(`cannot decode message ${duration.$typeName} from JSON: ${formatVal(json)}`);
	duration.seconds = protoInt64.parse(longSeconds);
	if (typeof match[2] !== "string") return;
	const nanosStr = match[2] + "0".repeat(9 - match[2].length);
	duration.nanos = parseInt(nanosStr);
	if (longSeconds < 0 || Object.is(longSeconds, -0)) duration.nanos = -duration.nanos;
}
function fieldMaskFromJson(fieldMask, json) {
	if (typeof json !== "string") throw new Error(`cannot decode message ${fieldMask.$typeName} from JSON: ${formatVal(json)}`);
	if (json === "") return;
	fieldMask.paths = json.split(",").map((path) => {
		if (path.includes("_")) throw new Error(`cannot decode message ${fieldMask.$typeName} from JSON: path names must be lowerCamelCase`);
		return protoSnakeCase(path);
	});
}
function structFromJson(struct, json, ctx) {
	if (typeof json != "object" || json == null || Array.isArray(json)) throw new Error(`cannot decode message ${struct.$typeName} from JSON ${formatVal(json)}`);
	const keys = Object.keys(json);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const parsedValue = create(ValueSchema);
		valueFromJson(parsedValue, json[key], ctx);
		struct.fields[key] = parsedValue;
	}
}
function valueFromJson(value, json, ctx) {
	if (++ctx.depth > ctx.recursionLimit) throw new Error(`cannot decode ${value.$typeName} from JSON: maximum recursion depth of ${ctx.recursionLimit} reached`);
	switch (typeof json) {
		case "number":
			value.kind = {
				case: "numberValue",
				value: json
			};
			break;
		case "string":
			value.kind = {
				case: "stringValue",
				value: json
			};
			break;
		case "boolean":
			value.kind = {
				case: "boolValue",
				value: json
			};
			break;
		case "object":
			if (json === null) value.kind = {
				case: "nullValue",
				value: NullValue.NULL_VALUE
			};
			else if (Array.isArray(json)) {
				const listValue = create(ListValueSchema);
				listValueFromJson(listValue, json, ctx);
				value.kind = {
					case: "listValue",
					value: listValue
				};
			} else {
				const struct = create(StructSchema);
				structFromJson(struct, json, ctx);
				value.kind = {
					case: "structValue",
					value: struct
				};
			}
			break;
		default: throw new Error(`cannot decode message ${value.$typeName} from JSON ${formatVal(json)}`);
	}
	ctx.depth--;
	return value;
}
function listValueFromJson(listValue, json, ctx) {
	if (!Array.isArray(json)) throw new Error(`cannot decode message ${listValue.$typeName} from JSON ${formatVal(json)}`);
	for (let i = 0; i < json.length; i++) {
		const value = create(ValueSchema);
		valueFromJson(value, json[i], ctx);
		listValue.values.push(value);
	}
}
//#endregion
//#region node_modules/.pnpm/@bufbuild+protobuf@2.14.0/node_modules/@bufbuild/protobuf/dist/esm/codegenv2/service.js
/**
* Hydrate a service descriptor.
*
* @private
*/
function serviceDesc(file, path, ...paths) {
	if (paths.length > 0) throw new Error();
	return file.services[path];
}
//#endregion
export { toBinary as a, fromBinary as c, base64Encode as d, create as f, toJsonString as i, MethodOptions_IdempotencyLevel as l, fromJson as n, file_google_protobuf_timestamp as o, fromJsonString as r, fileDesc as s, serviceDesc as t, base64Decode as u };
