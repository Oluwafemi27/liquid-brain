import { a as toBinary, c as fromBinary, d as base64Encode, f as create, i as toJsonString, r as fromJsonString, u as base64Decode } from "./bufbuild__protobuf.mjs";
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/code.js
/**
* Connect represents categories of errors as codes, and each code maps to a
* specific HTTP status code. The codes and their semantics were chosen to
* match gRPC. Only the codes below are valid — there are no user-defined
* codes.
*
* See the specification at https://connectrpc.com/docs/protocol#error-codes
* for details.
*/
var Code;
(function(Code) {
	/**
	* Canceled, usually by the user
	*/
	Code[Code["Canceled"] = 1] = "Canceled";
	/**
	* Unknown error
	*/
	Code[Code["Unknown"] = 2] = "Unknown";
	/**
	* Argument invalid regardless of system state
	*/
	Code[Code["InvalidArgument"] = 3] = "InvalidArgument";
	/**
	* Operation expired, may or may not have completed.
	*/
	Code[Code["DeadlineExceeded"] = 4] = "DeadlineExceeded";
	/**
	* Entity not found.
	*/
	Code[Code["NotFound"] = 5] = "NotFound";
	/**
	* Entity already exists.
	*/
	Code[Code["AlreadyExists"] = 6] = "AlreadyExists";
	/**
	* Operation not authorized.
	*/
	Code[Code["PermissionDenied"] = 7] = "PermissionDenied";
	/**
	* Quota exhausted.
	*/
	Code[Code["ResourceExhausted"] = 8] = "ResourceExhausted";
	/**
	* Argument invalid in current system state.
	*/
	Code[Code["FailedPrecondition"] = 9] = "FailedPrecondition";
	/**
	* Operation aborted.
	*/
	Code[Code["Aborted"] = 10] = "Aborted";
	/**
	* Out of bounds, use instead of FailedPrecondition.
	*/
	Code[Code["OutOfRange"] = 11] = "OutOfRange";
	/**
	* Operation not implemented or disabled.
	*/
	Code[Code["Unimplemented"] = 12] = "Unimplemented";
	/**
	* Internal error, reserved for "serious errors".
	*/
	Code[Code["Internal"] = 13] = "Internal";
	/**
	* Unavailable, client should back off and retry.
	*/
	Code[Code["Unavailable"] = 14] = "Unavailable";
	/**
	* Unrecoverable data loss or corruption.
	*/
	Code[Code["DataLoss"] = 15] = "DataLoss";
	/**
	* Request isn't authenticated.
	*/
	Code[Code["Unauthenticated"] = 16] = "Unauthenticated";
})(Code || (Code = {}));
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol-connect/code-string.js
/**
* codeToString returns the string representation of a Code.
*
* @private Internal code, does not follow semantic versioning.
*/
function codeToString(value) {
	const name = Code[value];
	if (typeof name != "string") return value.toString();
	return name[0].toLowerCase() + name.substring(1).replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
}
var stringToCode;
/**
* codeFromString parses the string representation of a Code in snake_case.
* For example, the string "permission_denied" parses into Code.PermissionDenied.
*
* If the given string cannot be parsed, the function returns undefined.
*
* @private Internal code, does not follow semantic versioning.
*/
function codeFromString(value) {
	if (!stringToCode) {
		stringToCode = {};
		for (const value of Object.values(Code)) {
			if (typeof value == "string") continue;
			stringToCode[codeToString(value)] = value;
		}
	}
	return stringToCode[value];
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/connect-error.js
/**
* ConnectError captures four pieces of information: a Code, an error
* message, an optional cause of the error, and an optional collection of
* arbitrary Protobuf messages called  "details".
*
* Because developer tools typically show just the error message, we prefix
* it with the status code, so that the most important information is always
* visible immediately.
*
* Error details are wrapped with google.protobuf.Any on the wire, so that
* a server or middleware can attach arbitrary data to an error. Use the
* method findDetails() to retrieve the details.
*/
var ConnectError = class ConnectError extends Error {
	/**
	* Create a new ConnectError.
	* If no code is provided, code "unknown" is used.
	* Outgoing details are only relevant for the server side - a service may
	* raise an error with details, and it is up to the protocol implementation
	* to encode and send the details along with the error.
	*/
	constructor(message, code = Code.Unknown, metadata, outgoingDetails, cause) {
		super(createMessage(message, code));
		this.name = "ConnectError";
		Object.setPrototypeOf(this, new.target.prototype);
		this.rawMessage = message;
		this.code = code;
		this.metadata = new Headers(metadata !== null && metadata !== void 0 ? metadata : {});
		this.details = outgoingDetails !== null && outgoingDetails !== void 0 ? outgoingDetails : [];
		this.cause = cause;
	}
	/**
	* Convert any value - typically a caught error into a ConnectError,
	* following these rules:
	* - If the value is already a ConnectError, return it as is.
	* - If the value is an AbortError or TimeoutError from the fetch API, return
	*   the message of the error with code Canceled.
	* - For other Errors, return the error message with code Unknown by default.
	* - For other values, return the values String representation as a message,
	*   with the code Unknown by default.
	* The original value will be used for the "cause" property for the new
	* ConnectError.
	*/
	static from(reason, code = Code.Unknown) {
		if (reason instanceof ConnectError) return reason;
		if (reason instanceof Error) {
			if (reason.name == "AbortError" || reason.name == "TimeoutError") return new ConnectError(reason.message, Code.Canceled);
			return new ConnectError(reason.message, code, void 0, void 0, reason);
		}
		return new ConnectError(String(reason), code, void 0, void 0, reason);
	}
	static [Symbol.hasInstance](v) {
		if (!(v instanceof Error)) return false;
		if (Object.getPrototypeOf(v) === ConnectError.prototype) return true;
		return v.name === "ConnectError" && "code" in v && typeof v.code === "number" && "metadata" in v && "details" in v && Array.isArray(v.details) && "rawMessage" in v && typeof v.rawMessage == "string" && "cause" in v;
	}
	findDetails(typeOrRegistry) {
		const registry = typeOrRegistry.kind === "message" ? { getMessage: (typeName) => typeName === typeOrRegistry.typeName ? typeOrRegistry : void 0 } : typeOrRegistry;
		const details = [];
		for (const data of this.details) {
			if ("desc" in data) {
				if (registry.getMessage(data.desc.typeName)) details.push(create(data.desc, data.value));
				continue;
			}
			const desc = registry.getMessage(data.type);
			if (desc) try {
				details.push(fromBinary(desc, data.value));
			} catch (_) {}
		}
		return details;
	}
};
/**
* Create an error message, prefixing the given code.
*/
function createMessage(message, code) {
	return message.length ? `[${codeToString(code)}] ${message}` : `[${codeToString(code)}]`;
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/http-headers.js
/**
* Merge two or more Headers objects by appending all fields from
* all inputs to a new Headers object.
*/
function appendHeaders(...headers) {
	const h = new Headers();
	for (const e of headers) e.forEach((value, key) => {
		h.append(key, value);
	});
	return h;
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/any-client.js
/**
* Create any client for the given service.
*
* The given createMethod function is called for each method definition
* of the service. The function it returns is added to the client object
* as a method.
*/
function makeAnyClient(service, createMethod) {
	const client = {};
	for (const desc of service.methods) {
		const method = createMethod(desc);
		if (method != null) client[desc.localName] = method;
	}
	return client;
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol/limit-io.js
/**
* Raise an error ResourceExhausted if more than readMaxBytes are read.
*
* @private Internal code, does not follow semantic versioning.
*/
function assertReadMaxBytes(readMaxBytes, bytesRead, totalSizeKnown = false) {
	if (bytesRead > readMaxBytes) {
		let message = `message size is larger than configured readMaxBytes ${readMaxBytes}`;
		if (totalSizeKnown) message = `message size ${bytesRead} is larger than configured readMaxBytes ${readMaxBytes}`;
		throw new ConnectError(message, Code.ResourceExhausted);
	}
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol/envelope.js
/**
* Create an EnvelopeDecoder. The `readMaxBytes` argument limits the maximum
* size for individual messages.
*
* @private Internal code, does not follow semantic versioning.
*/
function createEnvelopeDecoder(readMaxBytes) {
	return new EnvelopeDecoderImpl(readMaxBytes);
}
var EnvelopeDecoderImpl = class {
	constructor(readMaxBytes) {
		this.readMaxBytes = readMaxBytes;
		this.header = /* @__PURE__ */ new Uint8Array(5);
		this.headerView = new DataView(this.header.buffer);
		this.buf = [];
	}
	get byteLength() {
		return this.buf.reduce((a, b) => a + b.byteLength, 0);
	}
	decode(chunk) {
		this.buf.push(chunk);
		const envs = [];
		for (;;) {
			let env = this.pop();
			if (!env) break;
			envs.push(env);
		}
		return envs;
	}
	pop() {
		if (!this.env) {
			this.env = this.head();
			if (!this.env) return;
		}
		if (this.cons(this.env.data)) {
			const env = this.env;
			this.env = void 0;
			return env;
		}
	}
	head() {
		if (!this.cons(this.header)) return;
		const flags = this.headerView.getUint8(0);
		const length = this.headerView.getUint32(1);
		assertReadMaxBytes(this.readMaxBytes, length, true);
		return {
			flags,
			data: new Uint8Array(length)
		};
	}
	cons(target) {
		const wantLength = target.byteLength;
		if (this.byteLength < wantLength) return false;
		let offset = 0;
		while (offset < wantLength) {
			const chunk = this.buf.shift();
			if (chunk.byteLength > wantLength - offset) {
				target.set(chunk.subarray(0, wantLength - offset), offset);
				this.buf.unshift(chunk.subarray(wantLength - offset));
				offset += wantLength - offset;
			} else {
				target.set(chunk, offset);
				offset += chunk.byteLength;
			}
		}
		return true;
	}
};
/**
* Create a WHATWG ReadableStream of enveloped messages from a ReadableStream
* of bytes.
*
* Ideally, this would simply be a TransformStream, but ReadableStream.pipeThrough
* does not have the necessary availability at this time.
*
* @private Internal code, does not follow semantic versioning.
*/
function createEnvelopeReadableStream(stream) {
	let reader;
	const buffer = createEnvelopeDecoder(4294967295);
	return new ReadableStream({
		start() {
			reader = stream.getReader();
		},
		async pull(controller) {
			let enqueuedOnce = false;
			while (!enqueuedOnce) {
				const result = await reader.read();
				if (result.done) {
					if (buffer.byteLength > 0) controller.error(new ConnectError("protocol error: incomplete envelope", Code.InvalidArgument));
					controller.close();
				} else for (const env of buffer.decode(result.value)) {
					controller.enqueue(env);
					enqueuedOnce = true;
				}
			}
		}
	});
}
/**
* Encode a single enveloped message.
*
* @private Internal code, does not follow semantic versioning.
*/
function encodeEnvelope(flags, data) {
	const bytes = new Uint8Array(data.length + 5);
	bytes.set(data, 5);
	const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	v.setUint8(0, flags);
	v.setUint32(1, data.length);
	return bytes;
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol/async-iterable.js
var __asyncValues$1 = function(o) {
	if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
	var m = o[Symbol.asyncIterator], i;
	return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
		return this;
	}, i);
	function verb(n) {
		i[n] = o[n] && function(v) {
			return new Promise(function(resolve, reject) {
				v = o[n](v), settle(resolve, reject, v.done, v.value);
			});
		};
	}
	function settle(resolve, reject, d, v) {
		Promise.resolve(v).then(function(v) {
			resolve({
				value: v,
				done: d
			});
		}, reject);
	}
};
var __await$1 = function(v) {
	return this instanceof __await$1 ? (this.v = v, this) : new __await$1(v);
};
var __asyncGenerator$1 = function(thisArg, _arguments, generator) {
	if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
	var g = generator.apply(thisArg, _arguments || []), i, q = [];
	return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function() {
		return this;
	}, i;
	function awaitReturn(f) {
		return function(v) {
			return Promise.resolve(v).then(f, reject);
		};
	}
	function verb(n, f) {
		if (g[n]) {
			i[n] = function(v) {
				return new Promise(function(a, b) {
					q.push([
						n,
						v,
						a,
						b
					]) > 1 || resume(n, v);
				});
			};
			if (f) i[n] = f(i[n]);
		}
	}
	function resume(n, v) {
		try {
			step(g[n](v));
		} catch (e) {
			settle(q[0][3], e);
		}
	}
	function step(r) {
		r.value instanceof __await$1 ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
	}
	function fulfill(value) {
		resume("next", value);
	}
	function reject(value) {
		resume("throw", value);
	}
	function settle(f, v) {
		if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
	}
};
var __asyncDelegator$1 = function(o) {
	var i, p;
	return i = {}, verb("next"), verb("throw", function(e) {
		throw e;
	}), verb("return"), i[Symbol.iterator] = function() {
		return this;
	}, i;
	function verb(n, f) {
		i[n] = o[n] ? function(v) {
			return (p = !p) ? {
				value: __await$1(o[n](v)),
				done: false
			} : f ? f(v) : v;
		} : f;
	}
};
/**
* Create an asynchronous iterable from an array.
*
* @private Internal code, does not follow semantic versioning.
*/
function createAsyncIterable(items) {
	return __asyncGenerator$1(this, arguments, function* createAsyncIterable_1() {
		yield __await$1(yield* __asyncDelegator$1(__asyncValues$1(items)));
	});
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/promise-client.js
var __asyncValues = function(o) {
	if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
	var m = o[Symbol.asyncIterator], i;
	return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
		return this;
	}, i);
	function verb(n) {
		i[n] = o[n] && function(v) {
			return new Promise(function(resolve, reject) {
				v = o[n](v), settle(resolve, reject, v.done, v.value);
			});
		};
	}
	function settle(resolve, reject, d, v) {
		Promise.resolve(v).then(function(v) {
			resolve({
				value: v,
				done: d
			});
		}, reject);
	}
};
var __await = function(v) {
	return this instanceof __await ? (this.v = v, this) : new __await(v);
};
var __asyncDelegator = function(o) {
	var i, p;
	return i = {}, verb("next"), verb("throw", function(e) {
		throw e;
	}), verb("return"), i[Symbol.iterator] = function() {
		return this;
	}, i;
	function verb(n, f) {
		i[n] = o[n] ? function(v) {
			return (p = !p) ? {
				value: __await(o[n](v)),
				done: false
			} : f ? f(v) : v;
		} : f;
	}
};
var __asyncGenerator = function(thisArg, _arguments, generator) {
	if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
	var g = generator.apply(thisArg, _arguments || []), i, q = [];
	return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function() {
		return this;
	}, i;
	function awaitReturn(f) {
		return function(v) {
			return Promise.resolve(v).then(f, reject);
		};
	}
	function verb(n, f) {
		if (g[n]) {
			i[n] = function(v) {
				return new Promise(function(a, b) {
					q.push([
						n,
						v,
						a,
						b
					]) > 1 || resume(n, v);
				});
			};
			if (f) i[n] = f(i[n]);
		}
	}
	function resume(n, v) {
		try {
			step(g[n](v));
		} catch (e) {
			settle(q[0][3], e);
		}
	}
	function step(r) {
		r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
	}
	function fulfill(value) {
		resume("next", value);
	}
	function reject(value) {
		resume("throw", value);
	}
	function settle(f, v) {
		if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
	}
};
/**
* Create a Client for the given service, invoking RPCs through the
* given transport.
*/
function createClient(service, transport) {
	return makeAnyClient(service, (method) => {
		switch (method.methodKind) {
			case "unary": return createUnaryFn(transport, method);
			case "server_streaming": return createServerStreamingFn(transport, method);
			case "client_streaming": return createClientStreamingFn(transport, method);
			case "bidi_streaming": return createBiDiStreamingFn(transport, method);
			default: return null;
		}
	});
}
function createUnaryFn(transport, method) {
	return async (input, options) => {
		var _a, _b;
		const response = await transport.unary(method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, input, options === null || options === void 0 ? void 0 : options.contextValues);
		(_a = options === null || options === void 0 ? void 0 : options.onHeader) === null || _a === void 0 || _a.call(options, response.header);
		(_b = options === null || options === void 0 ? void 0 : options.onTrailer) === null || _b === void 0 || _b.call(options, response.trailer);
		return response.message;
	};
}
function createServerStreamingFn(transport, method) {
	return (input, options) => handleStreamResponse(transport.stream(method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, createAsyncIterable([input]), options === null || options === void 0 ? void 0 : options.contextValues), options);
}
function createClientStreamingFn(transport, method) {
	return async (request, options) => {
		var _a, e_1, _b, _c;
		var _d, _e;
		const response = await transport.stream(method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, request, options === null || options === void 0 ? void 0 : options.contextValues);
		(_d = options === null || options === void 0 ? void 0 : options.onHeader) === null || _d === void 0 || _d.call(options, response.header);
		let singleMessage;
		let count = 0;
		try {
			for (var _f = true, _g = __asyncValues(response.message), _h; _h = await _g.next(), _a = _h.done, !_a; _f = true) {
				_c = _h.value;
				_f = false;
				singleMessage = _c;
				count++;
			}
		} catch (e_1_1) {
			e_1 = { error: e_1_1 };
		} finally {
			try {
				if (!_f && !_a && (_b = _g.return)) await _b.call(_g);
			} finally {
				if (e_1) throw e_1.error;
			}
		}
		if (!singleMessage) throw new ConnectError("protocol error: missing response message", Code.Unimplemented);
		if (count > 1) throw new ConnectError("protocol error: received extra messages for client streaming method", Code.Unimplemented);
		(_e = options === null || options === void 0 ? void 0 : options.onTrailer) === null || _e === void 0 || _e.call(options, response.trailer);
		return singleMessage;
	};
}
function createBiDiStreamingFn(transport, method) {
	return (request, options) => handleStreamResponse(transport.stream(method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, request, options === null || options === void 0 ? void 0 : options.contextValues), options);
}
function handleStreamResponse(stream, options) {
	const it = (function() {
		return __asyncGenerator(this, arguments, function* () {
			var _a, _b;
			const response = yield __await(stream);
			(_a = options === null || options === void 0 ? void 0 : options.onHeader) === null || _a === void 0 || _a.call(options, response.header);
			yield __await(yield* __asyncDelegator(__asyncValues(response.message)));
			(_b = options === null || options === void 0 ? void 0 : options.onTrailer) === null || _b === void 0 || _b.call(options, response.trailer);
		});
	})()[Symbol.asyncIterator]();
	return { [Symbol.asyncIterator]: () => ({ next: () => it.next() }) };
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol/signals.js
/**
* Create an AbortController that is automatically aborted if one of the given
* signals is aborted.
*
* For convenience, the linked AbortSignals can be undefined.
*
* If the controller or any of the signals is aborted, all event listeners are
* removed.
*
* @private Internal code, does not follow semantic versioning.
*/
function createLinkedAbortController(...signals) {
	const controller = new AbortController();
	const sa = signals.filter((s) => s !== void 0).concat(controller.signal);
	for (const signal of sa) {
		if (signal.aborted) {
			onAbort.apply(signal);
			break;
		}
		signal.addEventListener("abort", onAbort);
	}
	function onAbort() {
		if (!controller.signal.aborted) controller.abort(getAbortSignalReason(this));
		for (const signal of sa) signal.removeEventListener("abort", onAbort);
	}
	return controller;
}
/**
* Create a deadline signal. The returned object contains an AbortSignal, but
* also a cleanup function to stop the timer, which must be called once the
* calling code is no longer interested in the signal.
*
* Ideally, we would simply use AbortSignal.timeout(), but it is not widely
* available yet.
*
* @private Internal code, does not follow semantic versioning.
*/
function createDeadlineSignal(timeoutMs) {
	const controller = new AbortController();
	const listener = () => {
		controller.abort(new ConnectError("the operation timed out", Code.DeadlineExceeded));
	};
	let timeoutId;
	if (timeoutMs !== void 0) if (timeoutMs <= 0) listener();
	else timeoutId = setTimeout(listener, timeoutMs);
	return {
		signal: controller.signal,
		cleanup: () => clearTimeout(timeoutId)
	};
}
/**
* Returns the reason why an AbortSignal was aborted. Returns undefined if the
* signal has not been aborted.
*
* The property AbortSignal.reason is not widely available. This function
* returns an AbortError if the signal is aborted, but reason is undefined.
*
* @private Internal code, does not follow semantic versioning.
*/
function getAbortSignalReason(signal) {
	if (!signal.aborted) return;
	if (signal.reason !== void 0) return signal.reason;
	const e = /* @__PURE__ */ new Error("This operation was aborted");
	e.name = "AbortError";
	return e;
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/context-values.js
/**
* createContextValues creates a new ContextValues.
*/
function createContextValues() {
	return {
		get(key) {
			return key.id in this ? this[key.id] : key.defaultValue;
		},
		set(key, value) {
			this[key.id] = value;
			return this;
		},
		delete(key) {
			delete this[key.id];
			return this;
		}
	};
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol/create-method-url.js
/**
* Create a URL for the given RPC. This simply adds the qualified
* service name, a slash, and the method name to the path of the given
* baseUrl.
*
* For example, the baseUri https://example.com and method "Say" from
* the service example.ElizaService results in:
* https://example.com/example.ElizaService/Say
*
* This format is used by the protocols Connect, gRPC and Twirp.
*
* Note that this function also accepts a protocol-relative baseUrl.
* If given an empty string or "/" as a baseUrl, it returns just the
* path.
*/
function createMethodUrl(baseUrl, method) {
	return baseUrl.toString().replace(/\/?$/, `/${method.parent.typeName}/${method.name}`);
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol/normalize.js
/**
*  Takes a partial protobuf messages of the
*  specified message type as input, and returns full instances.
*/
function normalize(desc, message) {
	return create(desc, message);
}
/**
* Takes an AsyncIterable of partial protobuf messages of the
* specified message type as input, and yields full instances.
*/
function normalizeIterable(desc, input) {
	function transform(result) {
		if (result.done === true) return result;
		return {
			done: result.done,
			value: normalize(desc, result.value)
		};
	}
	return { [Symbol.asyncIterator]() {
		const it = input[Symbol.asyncIterator]();
		const res = { next: () => it.next().then(transform) };
		if (it.throw !== void 0) res.throw = (e) => it.throw(e).then(transform);
		if (it.return !== void 0) res.return = (v) => it.return(v).then(transform);
		return res;
	} };
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/interceptor.js
/**
* applyInterceptors takes the given UnaryFn or ServerStreamingFn, and wraps
* it with each of the given interceptors, returning a new UnaryFn or
* ServerStreamingFn.
*/
function applyInterceptors(next, interceptors) {
	if (!interceptors) return next;
	for (const i of interceptors.concat().reverse()) next = i(next);
	return next;
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol/serialization.js
/**
* Sets default JSON serialization options for connect-es.
*
* With standard protobuf JSON serialization, unknown JSON fields are
* rejected by default. In connect-es, unknown JSON fields are ignored
* by default.
*/
function getJsonOptions(options) {
	var _a;
	const o = Object.assign({}, options);
	(_a = o.ignoreUnknownFields) !== null && _a !== void 0 || (o.ignoreUnknownFields = true);
	return o;
}
/**
* Returns functions to normalize and serialize the input message
* of an RPC, and to parse the output message of an RPC.
*
* @private Internal code, does not follow semantic versioning.
*/
function createClientMethodSerializers(method, useBinaryFormat, jsonOptions, binaryOptions) {
	const input = useBinaryFormat ? createBinarySerialization(method.input, binaryOptions) : createJsonSerialization(method.input, jsonOptions);
	return {
		parse: (useBinaryFormat ? createBinarySerialization(method.output, binaryOptions) : createJsonSerialization(method.output, jsonOptions)).parse,
		serialize: input.serialize
	};
}
/**
* Creates a Serialization object for serializing the given protobuf message
* with the protobuf binary format.
*/
function createBinarySerialization(desc, options) {
	return {
		parse(data) {
			try {
				return fromBinary(desc, data, options);
			} catch (e) {
				throw new ConnectError(`parse binary: ${e instanceof Error ? e.message : String(e)}`, Code.Internal);
			}
		},
		serialize(data) {
			try {
				return toBinary(desc, data, options);
			} catch (e) {
				throw new ConnectError(`serialize binary: ${e instanceof Error ? e.message : String(e)}`, Code.Internal);
			}
		}
	};
}
/**
* Creates a Serialization object for serializing the given protobuf message
* with the protobuf canonical JSON encoding.
*
* By default, unknown fields are ignored.
*/
function createJsonSerialization(desc, options) {
	var _a, _b;
	const textEncoder = (_a = options === null || options === void 0 ? void 0 : options.textEncoder) !== null && _a !== void 0 ? _a : new TextEncoder();
	const textDecoder = (_b = options === null || options === void 0 ? void 0 : options.textDecoder) !== null && _b !== void 0 ? _b : new TextDecoder();
	const o = getJsonOptions(options);
	return {
		parse(data) {
			try {
				return fromJsonString(desc, textDecoder.decode(data), o);
			} catch (e) {
				throw ConnectError.from(e, Code.InvalidArgument);
			}
		},
		serialize(data) {
			try {
				const json = toJsonString(desc, data, o);
				return textEncoder.encode(json);
			} catch (e) {
				throw ConnectError.from(e, Code.Internal);
			}
		}
	};
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol-connect/content-type.js
/**
* Regular Expression that matches any valid Connect Content-Type header value.
*
* @private Internal code, does not follow semantic versioning.
*/
var contentTypeRegExp = /^application\/(connect\+)?(?:(json)(?:; ?charset=utf-?8)?|(proto))$/i;
var contentTypeUnaryProto = "application/proto";
var contentTypeUnaryJson = "application/json";
var contentTypeStreamProto = "application/connect+proto";
var contentTypeStreamJson = "application/connect+json";
/**
* Parse a Connect Content-Type header.
*
* @private Internal code, does not follow semantic versioning.
*/
function parseContentType(contentType) {
	const match = contentType === null || contentType === void 0 ? void 0 : contentType.match(contentTypeRegExp);
	if (!match) return;
	return {
		stream: !!match[1],
		binary: !!match[3]
	};
}
/**
* Parse a Connect error from a JSON value.
* Will return a ConnectError, and throw the provided fallback if parsing failed.
*
* @private Internal code, does not follow semantic versioning.
*/
function errorFromJson(jsonValue, metadata, fallback) {
	var _a;
	if (metadata) new Headers(metadata).forEach((value, key) => fallback.metadata.append(key, value));
	if (typeof jsonValue !== "object" || jsonValue == null || Array.isArray(jsonValue)) throw fallback;
	let code = fallback.code;
	if ("code" in jsonValue && typeof jsonValue.code === "string") code = (_a = codeFromString(jsonValue.code)) !== null && _a !== void 0 ? _a : code;
	const message = jsonValue.message;
	if (message != null && typeof message !== "string") throw fallback;
	const error = new ConnectError(message !== null && message !== void 0 ? message : "", code, metadata);
	if ("details" in jsonValue && Array.isArray(jsonValue.details)) for (const detail of jsonValue.details) {
		if (detail === null || typeof detail != "object" || Array.isArray(detail) || typeof detail.type != "string" || typeof detail.value != "string") throw fallback;
		try {
			error.details.push({
				type: detail.type,
				value: base64Decode(detail.value),
				debug: detail.debug
			});
		} catch (e) {
			throw fallback;
		}
	}
	return error;
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol-connect/end-stream.js
/**
* Parse an EndStreamResponse of the Connect protocol.
* Throws a ConnectError on malformed input.
*
* @private Internal code, does not follow semantic versioning.
*/
function endStreamFromJson(data) {
	const parseErr = new ConnectError("invalid end stream", Code.Unknown);
	let jsonValue;
	try {
		jsonValue = JSON.parse(typeof data == "string" ? data : new TextDecoder().decode(data));
	} catch (e) {
		throw parseErr;
	}
	if (typeof jsonValue != "object" || jsonValue == null || Array.isArray(jsonValue)) throw parseErr;
	const metadata = new Headers();
	if ("metadata" in jsonValue) {
		if (typeof jsonValue.metadata != "object" || jsonValue.metadata == null || Array.isArray(jsonValue.metadata)) throw parseErr;
		for (const [key, values] of Object.entries(jsonValue.metadata)) {
			if (!Array.isArray(values) || values.some((value) => typeof value != "string")) throw parseErr;
			for (const value of values) metadata.append(key, value);
		}
	}
	return {
		metadata,
		error: "error" in jsonValue && jsonValue.error != null ? errorFromJson(jsonValue.error, metadata, parseErr) : void 0
	};
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol-connect/headers.js
/**
* @private Internal code, does not follow semantic versioning.
*/
var headerContentType = "Content-Type";
var headerUnaryContentLength = "Content-Length";
var headerUnaryEncoding = "Content-Encoding";
var headerUnaryAcceptEncoding = "Accept-Encoding";
var headerTimeout = "Connect-Timeout-Ms";
var headerProtocolVersion = "Connect-Protocol-Version";
var headerUserAgent = "User-Agent";
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol-connect/http-status.js
/**
* Determine the Connect error code for the given HTTP status code.
* See https://connectrpc.com/docs/protocol/#http-to-error-code
*
* @private Internal code, does not follow semantic versioning.
*/
function codeFromHttpStatus(httpStatus) {
	switch (httpStatus) {
		case 400: return Code.Internal;
		case 401: return Code.Unauthenticated;
		case 403: return Code.PermissionDenied;
		case 404: return Code.Unimplemented;
		case 429: return Code.Unavailable;
		case 502: return Code.Unavailable;
		case 503: return Code.Unavailable;
		case 504: return Code.Unavailable;
		default: return Code.Unknown;
	}
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol-connect/trailer-mux.js
/**
* In unary RPCs, Connect transports trailing metadata as response header
* fields, prefixed with "trailer-".
*
* This function demuxes headers and trailers into two separate Headers
* objects.
*
* @private Internal code, does not follow semantic versioning.
*/
function trailerDemux(header) {
	const h = new Headers(), t = new Headers();
	header.forEach((value, key) => {
		if (key.toLowerCase().startsWith("trailer-")) t.append(key.substring(8), value);
		else h.append(key, value);
	});
	return [h, t];
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol-connect/request-header.js
/**
* Creates headers for a Connect request.
*
* @private Internal code, does not follow semantic versioning.
*/
function requestHeader(methodKind, useBinaryFormat, timeoutMs, userProvidedHeaders, setUserAgent) {
	const result = new Headers(userProvidedHeaders !== null && userProvidedHeaders !== void 0 ? userProvidedHeaders : {});
	if (timeoutMs !== void 0) result.set(headerTimeout, `${timeoutMs}`);
	result.set(headerContentType, methodKind == "unary" ? useBinaryFormat ? contentTypeUnaryProto : contentTypeUnaryJson : useBinaryFormat ? contentTypeStreamProto : contentTypeStreamJson);
	result.set(headerProtocolVersion, "1");
	if (!result.has("User-Agent") && setUserAgent) result.set(headerUserAgent, "connect-es/2.1.2");
	return result;
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol-connect/validate-response.js
/**
* Validates response status and header for the Connect protocol.
* Throws a ConnectError if the header indicates an error, or if
* the content type is unexpected, with the following exception:
* For unary RPCs with an HTTP error status, this returns an error
* derived from the HTTP status instead of throwing it, giving an
* implementation a chance to parse a Connect error from the wire.
*
* @private Internal code, does not follow semantic versioning.
*/
function validateResponse(methodKind, useBinaryFormat, status, headers) {
	const mimeType = headers.get(headerContentType);
	const parsedType = parseContentType(mimeType);
	if (status !== 200) {
		const errorFromStatus = new ConnectError(`HTTP ${status}`, codeFromHttpStatus(status), headers);
		if (methodKind == "unary" && parsedType && !parsedType.binary) return {
			isUnaryError: true,
			unaryError: errorFromStatus
		};
		throw errorFromStatus;
	}
	const allowedContentType = {
		binary: useBinaryFormat,
		stream: methodKind !== "unary"
	};
	if ((parsedType === null || parsedType === void 0 ? void 0 : parsedType.binary) !== allowedContentType.binary || parsedType.stream !== allowedContentType.stream) throw new ConnectError(`unsupported content type ${mimeType}`, parsedType === void 0 ? Code.Unknown : Code.Internal, headers);
	return { isUnaryError: false };
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol-connect/get-request.js
var contentTypePrefix = "application/";
function encodeMessageForUrl(message, useBase64) {
	if (useBase64) return base64Encode(message, "url");
	return encodeURIComponent(new TextDecoder().decode(message));
}
/**
* @private Internal code, does not follow semantic versioning.
*/
function transformConnectPostToGetRequest(request, message, useBase64) {
	let query = `?connect=v1`;
	let compressionQuery = "";
	const compression = request.header.get(headerUnaryEncoding);
	if (compression !== null && compression !== "identity") {
		compressionQuery = "&compression=" + encodeURIComponent(compression);
		useBase64 = true;
	}
	if (useBase64) query += "&base64=1";
	query += compressionQuery;
	const contentType = request.header.get(headerContentType);
	if ((contentType === null || contentType === void 0 ? void 0 : contentType.indexOf(contentTypePrefix)) === 0) query += "&encoding=" + encodeURIComponent(contentType.slice(12));
	query += "&message=" + encodeMessageForUrl(message, useBase64);
	const url = request.url + query;
	const header = new Headers(request.header);
	for (const h of [
		headerProtocolVersion,
		headerContentType,
		headerUnaryContentLength,
		headerUnaryEncoding,
		headerUnaryAcceptEncoding
	]) header.delete(h);
	return Object.assign(Object.assign({}, request), {
		requestMethod: "GET",
		url,
		header
	});
}
//#endregion
//#region node_modules/.pnpm/@connectrpc+connect@2.1.2_@bufbuild+protobuf@2.14.0/node_modules/@connectrpc/connect/dist/esm/protocol/run-call.js
/**
* Runs a unary method with the given interceptors. Note that this function
* is only used when implementing a Transport.
*/
function runUnaryCall(opt) {
	const next = applyInterceptors(opt.next, opt.interceptors);
	const [signal, abort, done] = setupSignal(opt);
	return next(Object.assign(Object.assign({}, opt.req), {
		message: normalize(opt.req.method.input, opt.req.message),
		signal
	})).then((res) => {
		done();
		return res;
	}, abort);
}
/**
* Runs a server-streaming method with the given interceptors. Note that this
* function is only used when implementing a Transport.
*/
function runStreamingCall(opt) {
	const next = applyInterceptors(opt.next, opt.interceptors);
	const [signal, abort, done] = setupSignal(opt);
	const req = Object.assign(Object.assign({}, opt.req), {
		message: normalizeIterable(opt.req.method.input, opt.req.message),
		signal
	});
	let doneCalled = false;
	signal.addEventListener("abort", function() {
		var _a, _b;
		const it = opt.req.message[Symbol.asyncIterator]();
		if (!doneCalled) (_a = it.throw) === null || _a === void 0 || _a.call(it, this.reason).catch(() => {});
		(_b = it.return) === null || _b === void 0 || _b.call(it).catch(() => {});
	});
	return next(req).then((res) => {
		return Object.assign(Object.assign({}, res), { message: { [Symbol.asyncIterator]() {
			const it = res.message[Symbol.asyncIterator]();
			return { next() {
				return it.next().then((r) => {
					if (r.done == true) {
						doneCalled = true;
						done();
					}
					return r;
				}, abort);
			} };
		} } });
	}, abort);
}
/**
* Create an AbortSignal for Transport implementations. The signal is available
* in UnaryRequest and StreamingRequest, and is triggered when the call is
* aborted (via a timeout or explicit cancellation), errored (e.g. when reading
* an error from the server from the wire), or finished successfully.
*
* Transport implementations can pass the signal to HTTP clients to ensure that
* there are no unused connections leak.
*
* Returns a tuple:
* [0]: The signal, which is also aborted if the optional deadline is reached.
* [1]: Function to call if the Transport encountered an error.
* [2]: Function to call if the Transport finished without an error.
*/
function setupSignal(opt) {
	const { signal, cleanup } = createDeadlineSignal(opt.timeoutMs);
	const controller = createLinkedAbortController(opt.signal, signal);
	return [
		controller.signal,
		function abort(reason) {
			const e = controller.signal.aborted ? ConnectError.from(getAbortSignalReason(controller.signal), Code.Canceled) : ConnectError.from(reason);
			controller.abort(e);
			cleanup();
			return Promise.reject(e);
		},
		function done() {
			cleanup();
			controller.abort();
		}
	];
}
//#endregion
export { ConnectError as _, requestHeader as a, errorFromJson as c, createMethodUrl as d, createContextValues as f, appendHeaders as g, encodeEnvelope as h, validateResponse as i, createClientMethodSerializers as l, createEnvelopeReadableStream as m, runUnaryCall as n, trailerDemux as o, createClient as p, transformConnectPostToGetRequest as r, endStreamFromJson as s, runStreamingCall as t, getJsonOptions as u, Code as v };
