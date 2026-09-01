import { a as __toESM, i as __require, n as __esmMin, t as __commonJSMin } from "../../_runtime.mjs";
import { _ as ConnectError, p as createClient$1, v as Code } from "../connectrpc__connect.mjs";
import { o as file_google_protobuf_timestamp, s as fileDesc, t as serviceDesc } from "../bufbuild__protobuf.mjs";
import { t as createConnectTransport } from "../connectrpc__connect-web.mjs";
import processModule from "node:process";
import { Buffer } from "node:buffer";
import stream from "node:stream";
import fs from "node:fs";
import crypto$1 from "node:crypto";
import os from "node:os";
import path from "node:path";
import url from "node:url";
//#region node_modules/.pnpm/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/polyfill/globalthis.mjs
var globalthis_default;
var init_globalthis = __esmMin((() => {
	globalthis_default = globalThis;
}));
//#endregion
//#region node_modules/.pnpm/openapi-fetch@0.14.1/node_modules/openapi-fetch/dist/index.mjs
var PATH_PARAM_RE = /\{[^{}]+\}/g;
var supportsRequestInitExt = () => {
	return typeof processModule === "object" && Number.parseInt(processModule?.versions?.node?.substring(0, 2)) >= 18 && processModule.versions.undici;
};
function randomID() {
	return Math.random().toString(36).slice(2, 11);
}
function createClient(clientOptions) {
	let { baseUrl = "", Request: CustomRequest = globalThis.Request, fetch: baseFetch = globalThis.fetch, querySerializer: globalQuerySerializer, bodySerializer: globalBodySerializer, headers: baseHeaders, requestInitExt = void 0, ...baseOptions } = { ...clientOptions };
	requestInitExt = supportsRequestInitExt() ? requestInitExt : void 0;
	baseUrl = removeTrailingSlash(baseUrl);
	const middlewares = [];
	async function coreFetch(schemaPath, fetchOptions) {
		const { baseUrl: localBaseUrl, fetch = baseFetch, Request = CustomRequest, headers, params = {}, parseAs = "json", querySerializer: requestQuerySerializer, bodySerializer = globalBodySerializer ?? defaultBodySerializer, body, ...init } = fetchOptions || {};
		let finalBaseUrl = baseUrl;
		if (localBaseUrl) finalBaseUrl = removeTrailingSlash(localBaseUrl) ?? baseUrl;
		let querySerializer = typeof globalQuerySerializer === "function" ? globalQuerySerializer : createQuerySerializer(globalQuerySerializer);
		if (requestQuerySerializer) querySerializer = typeof requestQuerySerializer === "function" ? requestQuerySerializer : createQuerySerializer({
			...typeof globalQuerySerializer === "object" ? globalQuerySerializer : {},
			...requestQuerySerializer
		});
		const serializedBody = body === void 0 ? void 0 : bodySerializer(body, mergeHeaders(baseHeaders, headers, params.header));
		const finalHeaders = mergeHeaders(serializedBody === void 0 || serializedBody instanceof FormData ? {} : { "Content-Type": "application/json" }, baseHeaders, headers, params.header);
		const requestInit = {
			redirect: "follow",
			...baseOptions,
			...init,
			body: serializedBody,
			headers: finalHeaders
		};
		let id;
		let options;
		let request = new Request(createFinalURL(schemaPath, {
			baseUrl: finalBaseUrl,
			params,
			querySerializer
		}), requestInit);
		let response;
		for (const key in init) if (!(key in request)) request[key] = init[key];
		if (middlewares.length) {
			id = randomID();
			options = Object.freeze({
				baseUrl: finalBaseUrl,
				fetch,
				parseAs,
				querySerializer,
				bodySerializer
			});
			for (const m of middlewares) if (m && typeof m === "object" && typeof m.onRequest === "function") {
				const result = await m.onRequest({
					request,
					schemaPath,
					params,
					options,
					id
				});
				if (result) if (result instanceof Request) request = result;
				else if (result instanceof Response) {
					response = result;
					break;
				} else throw new Error("onRequest: must return new Request() or Response() when modifying the request");
			}
		}
		if (!response) {
			try {
				response = await fetch(request, requestInitExt);
			} catch (error2) {
				let errorAfterMiddleware = error2;
				if (middlewares.length) for (let i = middlewares.length - 1; i >= 0; i--) {
					const m = middlewares[i];
					if (m && typeof m === "object" && typeof m.onError === "function") {
						const result = await m.onError({
							request,
							error: errorAfterMiddleware,
							schemaPath,
							params,
							options,
							id
						});
						if (result) {
							if (result instanceof Response) {
								errorAfterMiddleware = void 0;
								response = result;
								break;
							}
							if (result instanceof Error) {
								errorAfterMiddleware = result;
								continue;
							}
							throw new Error("onError: must return new Response() or instance of Error");
						}
					}
				}
				if (errorAfterMiddleware) throw errorAfterMiddleware;
			}
			if (middlewares.length) for (let i = middlewares.length - 1; i >= 0; i--) {
				const m = middlewares[i];
				if (m && typeof m === "object" && typeof m.onResponse === "function") {
					const result = await m.onResponse({
						request,
						response,
						schemaPath,
						params,
						options,
						id
					});
					if (result) {
						if (!(result instanceof Response)) throw new Error("onResponse: must return new Response() when modifying the response");
						response = result;
					}
				}
			}
		}
		if (response.status === 204 || request.method === "HEAD" || response.headers.get("Content-Length") === "0") return response.ok ? {
			data: void 0,
			response
		} : {
			error: void 0,
			response
		};
		if (response.ok) {
			if (parseAs === "stream") return {
				data: response.body,
				response
			};
			return {
				data: await response[parseAs](),
				response
			};
		}
		let error = await response.text();
		try {
			error = JSON.parse(error);
		} catch {}
		return {
			error,
			response
		};
	}
	return {
		request(method, url, init) {
			return coreFetch(url, {
				...init,
				method: method.toUpperCase()
			});
		},
		/** Call a GET endpoint */
		GET(url, init) {
			return coreFetch(url, {
				...init,
				method: "GET"
			});
		},
		/** Call a PUT endpoint */
		PUT(url, init) {
			return coreFetch(url, {
				...init,
				method: "PUT"
			});
		},
		/** Call a POST endpoint */
		POST(url, init) {
			return coreFetch(url, {
				...init,
				method: "POST"
			});
		},
		/** Call a DELETE endpoint */
		DELETE(url, init) {
			return coreFetch(url, {
				...init,
				method: "DELETE"
			});
		},
		/** Call a OPTIONS endpoint */
		OPTIONS(url, init) {
			return coreFetch(url, {
				...init,
				method: "OPTIONS"
			});
		},
		/** Call a HEAD endpoint */
		HEAD(url, init) {
			return coreFetch(url, {
				...init,
				method: "HEAD"
			});
		},
		/** Call a PATCH endpoint */
		PATCH(url, init) {
			return coreFetch(url, {
				...init,
				method: "PATCH"
			});
		},
		/** Call a TRACE endpoint */
		TRACE(url, init) {
			return coreFetch(url, {
				...init,
				method: "TRACE"
			});
		},
		/** Register middleware */
		use(...middleware) {
			for (const m of middleware) {
				if (!m) continue;
				if (typeof m !== "object" || !("onRequest" in m || "onResponse" in m || "onError" in m)) throw new Error("Middleware must be an object with one of `onRequest()`, `onResponse() or `onError()`");
				middlewares.push(m);
			}
		},
		/** Unregister middleware */
		eject(...middleware) {
			for (const m of middleware) {
				const i = middlewares.indexOf(m);
				if (i !== -1) middlewares.splice(i, 1);
			}
		}
	};
}
function serializePrimitiveParam(name, value, options) {
	if (value === void 0 || value === null) return "";
	if (typeof value === "object") throw new Error("Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these.");
	return `${name}=${options?.allowReserved === true ? value : encodeURIComponent(value)}`;
}
function serializeObjectParam(name, value, options) {
	if (!value || typeof value !== "object") return "";
	const values = [];
	const joiner = {
		simple: ",",
		label: ".",
		matrix: ";"
	}[options.style] || "&";
	if (options.style !== "deepObject" && options.explode === false) {
		for (const k in value) values.push(k, options.allowReserved === true ? value[k] : encodeURIComponent(value[k]));
		const final2 = values.join(",");
		switch (options.style) {
			case "form": return `${name}=${final2}`;
			case "label": return `.${final2}`;
			case "matrix": return `;${name}=${final2}`;
			default: return final2;
		}
	}
	for (const k in value) {
		const finalName = options.style === "deepObject" ? `${name}[${k}]` : k;
		values.push(serializePrimitiveParam(finalName, value[k], options));
	}
	const final = values.join(joiner);
	return options.style === "label" || options.style === "matrix" ? `${joiner}${final}` : final;
}
function serializeArrayParam(name, value, options) {
	if (!Array.isArray(value)) return "";
	if (options.explode === false) {
		const joiner2 = {
			form: ",",
			spaceDelimited: "%20",
			pipeDelimited: "|"
		}[options.style] || ",";
		const final = (options.allowReserved === true ? value : value.map((v) => encodeURIComponent(v))).join(joiner2);
		switch (options.style) {
			case "simple": return final;
			case "label": return `.${final}`;
			case "matrix": return `;${name}=${final}`;
			default: return `${name}=${final}`;
		}
	}
	const joiner = {
		simple: ",",
		label: ".",
		matrix: ";"
	}[options.style] || "&";
	const values = [];
	for (const v of value) if (options.style === "simple" || options.style === "label") values.push(options.allowReserved === true ? v : encodeURIComponent(v));
	else values.push(serializePrimitiveParam(name, v, options));
	return options.style === "label" || options.style === "matrix" ? `${joiner}${values.join(joiner)}` : values.join(joiner);
}
function createQuerySerializer(options) {
	return function querySerializer(queryParams) {
		const search = [];
		if (queryParams && typeof queryParams === "object") for (const name in queryParams) {
			const value = queryParams[name];
			if (value === void 0 || value === null) continue;
			if (Array.isArray(value)) {
				if (value.length === 0) continue;
				search.push(serializeArrayParam(name, value, {
					style: "form",
					explode: true,
					...options?.array,
					allowReserved: options?.allowReserved || false
				}));
				continue;
			}
			if (typeof value === "object") {
				search.push(serializeObjectParam(name, value, {
					style: "deepObject",
					explode: true,
					...options?.object,
					allowReserved: options?.allowReserved || false
				}));
				continue;
			}
			search.push(serializePrimitiveParam(name, value, options));
		}
		return search.join("&");
	};
}
function defaultPathSerializer(pathname, pathParams) {
	let nextURL = pathname;
	for (const match of pathname.match(PATH_PARAM_RE) ?? []) {
		let name = match.substring(1, match.length - 1);
		let explode = false;
		let style = "simple";
		if (name.endsWith("*")) {
			explode = true;
			name = name.substring(0, name.length - 1);
		}
		if (name.startsWith(".")) {
			style = "label";
			name = name.substring(1);
		} else if (name.startsWith(";")) {
			style = "matrix";
			name = name.substring(1);
		}
		if (!pathParams || pathParams[name] === void 0 || pathParams[name] === null) continue;
		const value = pathParams[name];
		if (Array.isArray(value)) {
			nextURL = nextURL.replace(match, serializeArrayParam(name, value, {
				style,
				explode
			}));
			continue;
		}
		if (typeof value === "object") {
			nextURL = nextURL.replace(match, serializeObjectParam(name, value, {
				style,
				explode
			}));
			continue;
		}
		if (style === "matrix") {
			nextURL = nextURL.replace(match, `;${serializePrimitiveParam(name, value)}`);
			continue;
		}
		nextURL = nextURL.replace(match, style === "label" ? `.${encodeURIComponent(value)}` : encodeURIComponent(value));
	}
	return nextURL;
}
function defaultBodySerializer(body, headers) {
	if (body instanceof FormData) return body;
	if (headers) {
		if ((headers.get instanceof Function ? headers.get("Content-Type") ?? headers.get("content-type") : headers["Content-Type"] ?? headers["content-type"]) === "application/x-www-form-urlencoded") return new URLSearchParams(body).toString();
	}
	return JSON.stringify(body);
}
function createFinalURL(pathname, options) {
	let finalURL = `${options.baseUrl}${pathname}`;
	if (options.params?.path) finalURL = defaultPathSerializer(finalURL, options.params.path);
	let search = options.querySerializer(options.params.query ?? {});
	if (search.startsWith("?")) search = search.substring(1);
	if (search) finalURL += `?${search}`;
	return finalURL;
}
function mergeHeaders(...allHeaders) {
	const finalHeaders = new Headers();
	for (const h of allHeaders) {
		if (!h || typeof h !== "object") continue;
		const iterator = h instanceof Headers ? h.entries() : Object.entries(h);
		for (const [k, v] of iterator) if (v === null) finalHeaders.delete(k);
		else if (Array.isArray(v)) for (const v2 of v) finalHeaders.append(k, v2);
		else if (v !== void 0) finalHeaders.set(k, v);
	}
	return finalHeaders;
}
function removeTrailingSlash(url) {
	if (url.endsWith("/")) return url.substring(0, url.length - 1);
	return url;
}
//#endregion
//#region node_modules/.pnpm/platform@1.3.6/node_modules/platform/platform.js
var require_platform = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	init_globalthis();
	/*!
	* Platform.js v1.3.6
	* Copyright 2014-2020 Benjamin Tan
	* Copyright 2011-2013 John-David Dalton
	* Available under MIT license
	*/
	(function() {
		"use strict";
		/** Used to determine if values are of the language type `Object`. */
		var objectTypes = {
			"function": true,
			"object": true
		};
		/** Used as a reference to the global object. */
		var root = objectTypes[typeof window] && window || this;
		/** Detect free variable `exports`. */
		var freeExports = objectTypes[typeof exports] && exports;
		/** Detect free variable `module`. */
		var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;
		/** Detect free variable `global` from Node.js or Browserified code and use it as `root`. */
		var freeGlobal = freeExports && freeModule && typeof globalthis_default == "object" && globalthis_default;
		if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal)) root = freeGlobal;
		/**
		* Used as the maximum length of an array-like object.
		* See the [ES6 spec](http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength)
		* for more details.
		*/
		var maxSafeInteger = Math.pow(2, 53) - 1;
		/** Regular expression to detect Opera. */
		var reOpera = /\bOpera/;
		/** Used for native method references. */
		var objectProto = Object.prototype;
		/** Used to check for own properties of an object. */
		var hasOwnProperty = objectProto.hasOwnProperty;
		/** Used to resolve the internal `[[Class]]` of values. */
		var toString = objectProto.toString;
		/**
		* Capitalizes a string value.
		*
		* @private
		* @param {string} string The string to capitalize.
		* @returns {string} The capitalized string.
		*/
		function capitalize(string) {
			string = String(string);
			return string.charAt(0).toUpperCase() + string.slice(1);
		}
		/**
		* A utility function to clean up the OS name.
		*
		* @private
		* @param {string} os The OS name to clean up.
		* @param {string} [pattern] A `RegExp` pattern matching the OS name.
		* @param {string} [label] A label for the OS.
		*/
		function cleanupOS(os, pattern, label) {
			var data = {
				"10.0": "10",
				"6.4": "10 Technical Preview",
				"6.3": "8.1",
				"6.2": "8",
				"6.1": "Server 2008 R2 / 7",
				"6.0": "Server 2008 / Vista",
				"5.2": "Server 2003 / XP 64-bit",
				"5.1": "XP",
				"5.01": "2000 SP1",
				"5.0": "2000",
				"4.0": "NT",
				"4.90": "ME"
			};
			if (pattern && label && /^Win/i.test(os) && !/^Windows Phone /i.test(os) && (data = data[/[\d.]+$/.exec(os)])) os = "Windows " + data;
			os = String(os);
			if (pattern && label) os = os.replace(RegExp(pattern, "i"), label);
			os = format(os.replace(/ ce$/i, " CE").replace(/\bhpw/i, "web").replace(/\bMacintosh\b/, "Mac OS").replace(/_PowerPC\b/i, " OS").replace(/\b(OS X) [^ \d]+/i, "$1").replace(/\bMac (OS X)\b/, "$1").replace(/\/(\d)/, " $1").replace(/_/g, ".").replace(/(?: BePC|[ .]*fc[ \d.]+)$/i, "").replace(/\bx86\.64\b/gi, "x86_64").replace(/\b(Windows Phone) OS\b/, "$1").replace(/\b(Chrome OS \w+) [\d.]+\b/, "$1").split(" on ")[0]);
			return os;
		}
		/**
		* An iteration utility for arrays and objects.
		*
		* @private
		* @param {Array|Object} object The object to iterate over.
		* @param {Function} callback The function called per iteration.
		*/
		function each(object, callback) {
			var index = -1, length = object ? object.length : 0;
			if (typeof length == "number" && length > -1 && length <= maxSafeInteger) while (++index < length) callback(object[index], index, object);
			else forOwn(object, callback);
		}
		/**
		* Trim and conditionally capitalize string values.
		*
		* @private
		* @param {string} string The string to format.
		* @returns {string} The formatted string.
		*/
		function format(string) {
			string = trim(string);
			return /^(?:webOS|i(?:OS|P))/.test(string) ? string : capitalize(string);
		}
		/**
		* Iterates over an object's own properties, executing the `callback` for each.
		*
		* @private
		* @param {Object} object The object to iterate over.
		* @param {Function} callback The function executed per own property.
		*/
		function forOwn(object, callback) {
			for (var key in object) if (hasOwnProperty.call(object, key)) callback(object[key], key, object);
		}
		/**
		* Gets the internal `[[Class]]` of a value.
		*
		* @private
		* @param {*} value The value.
		* @returns {string} The `[[Class]]`.
		*/
		function getClassOf(value) {
			return value == null ? capitalize(value) : toString.call(value).slice(8, -1);
		}
		/**
		* Host objects can return type values that are different from their actual
		* data type. The objects we are concerned with usually return non-primitive
		* types of "object", "function", or "unknown".
		*
		* @private
		* @param {*} object The owner of the property.
		* @param {string} property The property to check.
		* @returns {boolean} Returns `true` if the property value is a non-primitive, else `false`.
		*/
		function isHostType(object, property) {
			var type = object != null ? typeof object[property] : "number";
			return !/^(?:boolean|number|string|undefined)$/.test(type) && (type == "object" ? !!object[property] : true);
		}
		/**
		* Prepares a string for use in a `RegExp` by making hyphens and spaces optional.
		*
		* @private
		* @param {string} string The string to qualify.
		* @returns {string} The qualified string.
		*/
		function qualify(string) {
			return String(string).replace(/([ -])(?!$)/g, "$1?");
		}
		/**
		* A bare-bones `Array#reduce` like utility function.
		*
		* @private
		* @param {Array} array The array to iterate over.
		* @param {Function} callback The function called per iteration.
		* @returns {*} The accumulated result.
		*/
		function reduce(array, callback) {
			var accumulator = null;
			each(array, function(value, index) {
				accumulator = callback(accumulator, value, index, array);
			});
			return accumulator;
		}
		/**
		* Removes leading and trailing whitespace from a string.
		*
		* @private
		* @param {string} string The string to trim.
		* @returns {string} The trimmed string.
		*/
		function trim(string) {
			return String(string).replace(/^ +| +$/g, "");
		}
		/**
		* Creates a new platform object.
		*
		* @memberOf platform
		* @param {Object|string} [ua=navigator.userAgent] The user agent string or
		*  context object.
		* @returns {Object} A platform object.
		*/
		function parse(ua) {
			/** The environment context object. */
			var context = root;
			/** Used to flag when a custom context is provided. */
			var isCustomContext = ua && typeof ua == "object" && getClassOf(ua) != "String";
			if (isCustomContext) {
				context = ua;
				ua = null;
			}
			/** Browser navigator object. */
			var nav = context.navigator || {};
			/** Browser user agent string. */
			var userAgent = nav.userAgent || "";
			ua || (ua = userAgent);
			/** Used to detect if browser is like Chrome. */
			var likeChrome = isCustomContext ? !!nav.likeChrome : /\bChrome\b/.test(ua) && !/internal|\n/i.test(toString.toString());
			/** Internal `[[Class]]` value shortcuts. */
			var objectClass = "Object", airRuntimeClass = isCustomContext ? objectClass : "ScriptBridgingProxyObject", enviroClass = isCustomContext ? objectClass : "Environment", javaClass = isCustomContext && context.java ? "JavaPackage" : getClassOf(context.java), phantomClass = isCustomContext ? objectClass : "RuntimeObject";
			/** Detect Java environments. */
			var java = /\bJava/.test(javaClass) && context.java;
			/** Detect Rhino. */
			var rhino = java && getClassOf(context.environment) == enviroClass;
			/** A character to represent alpha. */
			var alpha = java ? "a" : "α";
			/** A character to represent beta. */
			var beta = java ? "b" : "β";
			/** Browser document object. */
			var doc = context.document || {};
			/**
			* Detect Opera browser (Presto-based).
			* http://www.howtocreate.co.uk/operaStuff/operaObject.html
			* http://dev.opera.com/articles/view/opera-mini-web-content-authoring-guidelines/#operamini
			*/
			var opera = context.operamini || context.opera;
			/** Opera `[[Class]]`. */
			var operaClass = reOpera.test(operaClass = isCustomContext && opera ? opera["[[Class]]"] : getClassOf(opera)) ? operaClass : opera = null;
			/** Temporary variable used over the script's lifetime. */
			var data;
			/** The CPU architecture. */
			var arch = ua;
			/** Platform description array. */
			var description = [];
			/** Platform alpha/beta indicator. */
			var prerelease = null;
			/** A flag to indicate that environment features should be used to resolve the platform. */
			var useFeatures = ua == userAgent;
			/** The browser/environment version. */
			var version = useFeatures && opera && typeof opera.version == "function" && opera.version();
			/** A flag to indicate if the OS ends with "/ Version" */
			var isSpecialCasedOS;
			var layout = getLayout([
				{
					"label": "EdgeHTML",
					"pattern": "Edge"
				},
				"Trident",
				{
					"label": "WebKit",
					"pattern": "AppleWebKit"
				},
				"iCab",
				"Presto",
				"NetFront",
				"Tasman",
				"KHTML",
				"Gecko"
			]);
			var name = getName([
				"Adobe AIR",
				"Arora",
				"Avant Browser",
				"Breach",
				"Camino",
				"Electron",
				"Epiphany",
				"Fennec",
				"Flock",
				"Galeon",
				"GreenBrowser",
				"iCab",
				"Iceweasel",
				"K-Meleon",
				"Konqueror",
				"Lunascape",
				"Maxthon",
				{
					"label": "Microsoft Edge",
					"pattern": "(?:Edge|Edg|EdgA|EdgiOS)"
				},
				"Midori",
				"Nook Browser",
				"PaleMoon",
				"PhantomJS",
				"Raven",
				"Rekonq",
				"RockMelt",
				{
					"label": "Samsung Internet",
					"pattern": "SamsungBrowser"
				},
				"SeaMonkey",
				{
					"label": "Silk",
					"pattern": "(?:Cloud9|Silk-Accelerated)"
				},
				"Sleipnir",
				"SlimBrowser",
				{
					"label": "SRWare Iron",
					"pattern": "Iron"
				},
				"Sunrise",
				"Swiftfox",
				"Vivaldi",
				"Waterfox",
				"WebPositive",
				{
					"label": "Yandex Browser",
					"pattern": "YaBrowser"
				},
				{
					"label": "UC Browser",
					"pattern": "UCBrowser"
				},
				"Opera Mini",
				{
					"label": "Opera Mini",
					"pattern": "OPiOS"
				},
				"Opera",
				{
					"label": "Opera",
					"pattern": "OPR"
				},
				"Chromium",
				"Chrome",
				{
					"label": "Chrome",
					"pattern": "(?:HeadlessChrome)"
				},
				{
					"label": "Chrome Mobile",
					"pattern": "(?:CriOS|CrMo)"
				},
				{
					"label": "Firefox",
					"pattern": "(?:Firefox|Minefield)"
				},
				{
					"label": "Firefox for iOS",
					"pattern": "FxiOS"
				},
				{
					"label": "IE",
					"pattern": "IEMobile"
				},
				{
					"label": "IE",
					"pattern": "MSIE"
				},
				"Safari"
			]);
			var product = getProduct([
				{
					"label": "BlackBerry",
					"pattern": "BB10"
				},
				"BlackBerry",
				{
					"label": "Galaxy S",
					"pattern": "GT-I9000"
				},
				{
					"label": "Galaxy S2",
					"pattern": "GT-I9100"
				},
				{
					"label": "Galaxy S3",
					"pattern": "GT-I9300"
				},
				{
					"label": "Galaxy S4",
					"pattern": "GT-I9500"
				},
				{
					"label": "Galaxy S5",
					"pattern": "SM-G900"
				},
				{
					"label": "Galaxy S6",
					"pattern": "SM-G920"
				},
				{
					"label": "Galaxy S6 Edge",
					"pattern": "SM-G925"
				},
				{
					"label": "Galaxy S7",
					"pattern": "SM-G930"
				},
				{
					"label": "Galaxy S7 Edge",
					"pattern": "SM-G935"
				},
				"Google TV",
				"Lumia",
				"iPad",
				"iPod",
				"iPhone",
				"Kindle",
				{
					"label": "Kindle Fire",
					"pattern": "(?:Cloud9|Silk-Accelerated)"
				},
				"Nexus",
				"Nook",
				"PlayBook",
				"PlayStation Vita",
				"PlayStation",
				"TouchPad",
				"Transformer",
				{
					"label": "Wii U",
					"pattern": "WiiU"
				},
				"Wii",
				"Xbox One",
				{
					"label": "Xbox 360",
					"pattern": "Xbox"
				},
				"Xoom"
			]);
			var manufacturer = getManufacturer({
				"Apple": {
					"iPad": 1,
					"iPhone": 1,
					"iPod": 1
				},
				"Alcatel": {},
				"Archos": {},
				"Amazon": {
					"Kindle": 1,
					"Kindle Fire": 1
				},
				"Asus": { "Transformer": 1 },
				"Barnes & Noble": { "Nook": 1 },
				"BlackBerry": { "PlayBook": 1 },
				"Google": {
					"Google TV": 1,
					"Nexus": 1
				},
				"HP": { "TouchPad": 1 },
				"HTC": {},
				"Huawei": {},
				"Lenovo": {},
				"LG": {},
				"Microsoft": {
					"Xbox": 1,
					"Xbox One": 1
				},
				"Motorola": { "Xoom": 1 },
				"Nintendo": {
					"Wii U": 1,
					"Wii": 1
				},
				"Nokia": { "Lumia": 1 },
				"Oppo": {},
				"Samsung": {
					"Galaxy S": 1,
					"Galaxy S2": 1,
					"Galaxy S3": 1,
					"Galaxy S4": 1
				},
				"Sony": {
					"PlayStation": 1,
					"PlayStation Vita": 1
				},
				"Xiaomi": {
					"Mi": 1,
					"Redmi": 1
				}
			});
			var os = getOS([
				"Windows Phone",
				"KaiOS",
				"Android",
				"CentOS",
				{
					"label": "Chrome OS",
					"pattern": "CrOS"
				},
				"Debian",
				{
					"label": "DragonFly BSD",
					"pattern": "DragonFly"
				},
				"Fedora",
				"FreeBSD",
				"Gentoo",
				"Haiku",
				"Kubuntu",
				"Linux Mint",
				"OpenBSD",
				"Red Hat",
				"SuSE",
				"Ubuntu",
				"Xubuntu",
				"Cygwin",
				"Symbian OS",
				"hpwOS",
				"webOS ",
				"webOS",
				"Tablet OS",
				"Tizen",
				"Linux",
				"Mac OS X",
				"Macintosh",
				"Mac",
				"Windows 98;",
				"Windows "
			]);
			/**
			* Picks the layout engine from an array of guesses.
			*
			* @private
			* @param {Array} guesses An array of guesses.
			* @returns {null|string} The detected layout engine.
			*/
			function getLayout(guesses) {
				return reduce(guesses, function(result, guess) {
					return result || RegExp("\\b" + (guess.pattern || qualify(guess)) + "\\b", "i").exec(ua) && (guess.label || guess);
				});
			}
			/**
			* Picks the manufacturer from an array of guesses.
			*
			* @private
			* @param {Array} guesses An object of guesses.
			* @returns {null|string} The detected manufacturer.
			*/
			function getManufacturer(guesses) {
				return reduce(guesses, function(result, value, key) {
					return result || (value[product] || value[/^[a-z]+(?: +[a-z]+\b)*/i.exec(product)] || RegExp("\\b" + qualify(key) + "(?:\\b|\\w*\\d)", "i").exec(ua)) && key;
				});
			}
			/**
			* Picks the browser name from an array of guesses.
			*
			* @private
			* @param {Array} guesses An array of guesses.
			* @returns {null|string} The detected browser name.
			*/
			function getName(guesses) {
				return reduce(guesses, function(result, guess) {
					return result || RegExp("\\b" + (guess.pattern || qualify(guess)) + "\\b", "i").exec(ua) && (guess.label || guess);
				});
			}
			/**
			* Picks the OS name from an array of guesses.
			*
			* @private
			* @param {Array} guesses An array of guesses.
			* @returns {null|string} The detected OS name.
			*/
			function getOS(guesses) {
				return reduce(guesses, function(result, guess) {
					var pattern = guess.pattern || qualify(guess);
					if (!result && (result = RegExp("\\b" + pattern + "(?:/[\\d.]+|[ \\w.]*)", "i").exec(ua))) result = cleanupOS(result, pattern, guess.label || guess);
					return result;
				});
			}
			/**
			* Picks the product name from an array of guesses.
			*
			* @private
			* @param {Array} guesses An array of guesses.
			* @returns {null|string} The detected product name.
			*/
			function getProduct(guesses) {
				return reduce(guesses, function(result, guess) {
					var pattern = guess.pattern || qualify(guess);
					if (!result && (result = RegExp("\\b" + pattern + " *\\d+[.\\w_]*", "i").exec(ua) || RegExp("\\b" + pattern + " *\\w+-[\\w]*", "i").exec(ua) || RegExp("\\b" + pattern + "(?:; *(?:[a-z]+[_-])?[a-z]+\\d+|[^ ();-]*)", "i").exec(ua))) {
						if ((result = String(guess.label && !RegExp(pattern, "i").test(guess.label) ? guess.label : result).split("/"))[1] && !/[\d.]+/.test(result[0])) result[0] += " " + result[1];
						guess = guess.label || guess;
						result = format(result[0].replace(RegExp(pattern, "i"), guess).replace(RegExp("; *(?:" + guess + "[_-])?", "i"), " ").replace(RegExp("(" + guess + ")[-_.]?(\\w)", "i"), "$1 $2"));
					}
					return result;
				});
			}
			/**
			* Resolves the version using an array of UA patterns.
			*
			* @private
			* @param {Array} patterns An array of UA patterns.
			* @returns {null|string} The detected version.
			*/
			function getVersion(patterns) {
				return reduce(patterns, function(result, pattern) {
					return result || (RegExp(pattern + "(?:-[\\d.]+/|(?: for [\\w-]+)?[ /-])([\\d.]+[^ ();/_-]*)", "i").exec(ua) || 0)[1] || null;
				});
			}
			/**
			* Returns `platform.description` when the platform object is coerced to a string.
			*
			* @name toString
			* @memberOf platform
			* @returns {string} Returns `platform.description` if available, else an empty string.
			*/
			function toStringPlatform() {
				return this.description || "";
			}
			layout && (layout = [layout]);
			if (/\bAndroid\b/.test(os) && !product && (data = /\bAndroid[^;]*;(.*?)(?:Build|\) AppleWebKit)\b/i.exec(ua))) product = trim(data[1]).replace(/^[a-z]{2}-[a-z]{2};\s*/i, "") || null;
			if (manufacturer && !product) product = getProduct([manufacturer]);
			else if (manufacturer && product) product = product.replace(RegExp("^(" + qualify(manufacturer) + ")[-_.\\s]", "i"), manufacturer + " ").replace(RegExp("^(" + qualify(manufacturer) + ")[-_.]?(\\w)", "i"), manufacturer + " $2");
			if (data = /\bGoogle TV\b/.exec(product)) product = data[0];
			if (/\bSimulator\b/i.test(ua)) product = (product ? product + " " : "") + "Simulator";
			if (name == "Opera Mini" && /\bOPiOS\b/.test(ua)) description.push("running in Turbo/Uncompressed mode");
			if (name == "IE" && /\blike iPhone OS\b/.test(ua)) {
				data = parse(ua.replace(/like iPhone OS/, ""));
				manufacturer = data.manufacturer;
				product = data.product;
			} else if (/^iP/.test(product)) {
				name || (name = "Safari");
				os = "iOS" + ((data = / OS ([\d_]+)/i.exec(ua)) ? " " + data[1].replace(/_/g, ".") : "");
			} else if (name == "Konqueror" && /^Linux\b/i.test(os)) os = "Kubuntu";
			else if (manufacturer && manufacturer != "Google" && (/Chrome/.test(name) && !/\bMobile Safari\b/i.test(ua) || /\bVita\b/.test(product)) || /\bAndroid\b/.test(os) && /^Chrome/.test(name) && /\bVersion\//i.test(ua)) {
				name = "Android Browser";
				os = /\bAndroid\b/.test(os) ? os : "Android";
			} else if (name == "Silk") {
				if (!/\bMobi/i.test(ua)) {
					os = "Android";
					description.unshift("desktop mode");
				}
				if (/Accelerated *= *true/i.test(ua)) description.unshift("accelerated");
			} else if (name == "UC Browser" && /\bUCWEB\b/.test(ua)) description.push("speed mode");
			else if (name == "PaleMoon" && (data = /\bFirefox\/([\d.]+)\b/.exec(ua))) description.push("identifying as Firefox " + data[1]);
			else if (name == "Firefox" && (data = /\b(Mobile|Tablet|TV)\b/i.exec(ua))) {
				os || (os = "Firefox OS");
				product || (product = data[1]);
			} else if (!name || (data = !/\bMinefield\b/i.test(ua) && /\b(?:Firefox|Safari)\b/.exec(name))) {
				if (name && !product && /[\/,]|^[^(]+?\)/.test(ua.slice(ua.indexOf(data + "/") + 8))) name = null;
				if ((data = product || manufacturer || os) && (product || manufacturer || /\b(?:Android|Symbian OS|Tablet OS|webOS)\b/.test(os))) name = /[a-z]+(?: Hat)?/i.exec(/\bAndroid\b/.test(os) ? os : data) + " Browser";
			} else if (name == "Electron" && (data = (/\bChrome\/([\d.]+)\b/.exec(ua) || 0)[1])) description.push("Chromium " + data);
			if (!version) version = getVersion([
				"(?:Cloud9|CriOS|CrMo|Edge|Edg|EdgA|EdgiOS|FxiOS|HeadlessChrome|IEMobile|Iron|Opera ?Mini|OPiOS|OPR|Raven|SamsungBrowser|Silk(?!/[\\d.]+$)|UCBrowser|YaBrowser)",
				"Version",
				qualify(name),
				"(?:Firefox|Minefield|NetFront)"
			]);
			if (data = layout == "iCab" && parseFloat(version) > 3 && "WebKit" || /\bOpera\b/.test(name) && (/\bOPR\b/.test(ua) ? "Blink" : "Presto") || /\b(?:Midori|Nook|Safari)\b/i.test(ua) && !/^(?:Trident|EdgeHTML)$/.test(layout) && "WebKit" || !layout && /\bMSIE\b/i.test(ua) && (os == "Mac OS" ? "Tasman" : "Trident") || layout == "WebKit" && /\bPlayStation\b(?! Vita\b)/i.test(name) && "NetFront") layout = [data];
			if (name == "IE" && (data = (/; *(?:XBLWP|ZuneWP)(\d+)/i.exec(ua) || 0)[1])) {
				name += " Mobile";
				os = "Windows Phone " + (/\+$/.test(data) ? data : data + ".x");
				description.unshift("desktop mode");
			} else if (/\bWPDesktop\b/i.test(ua)) {
				name = "IE Mobile";
				os = "Windows Phone 8.x";
				description.unshift("desktop mode");
				version || (version = (/\brv:([\d.]+)/.exec(ua) || 0)[1]);
			} else if (name != "IE" && layout == "Trident" && (data = /\brv:([\d.]+)/.exec(ua))) {
				if (name) description.push("identifying as " + name + (version ? " " + version : ""));
				name = "IE";
				version = data[1];
			}
			if (useFeatures) {
				if (isHostType(context, "global")) {
					if (java) {
						data = java.lang.System;
						arch = data.getProperty("os.arch");
						os = os || data.getProperty("os.name") + " " + data.getProperty("os.version");
					}
					if (rhino) {
						try {
							version = context.require("ringo/engine").version.join(".");
							name = "RingoJS";
						} catch (e) {
							if ((data = context.system) && data.global.system == context.system) {
								name = "Narwhal";
								os || (os = data[0].os || null);
							}
						}
						if (!name) name = "Rhino";
					} else if (typeof context.process == "object" && !context.process.browser && (data = context.process)) {
						if (typeof data.versions == "object") {
							if (typeof data.versions.electron == "string") {
								description.push("Node " + data.versions.node);
								name = "Electron";
								version = data.versions.electron;
							} else if (typeof data.versions.nw == "string") {
								description.push("Chromium " + version, "Node " + data.versions.node);
								name = "NW.js";
								version = data.versions.nw;
							}
						}
						if (!name) {
							name = "Node.js";
							arch = data.arch;
							os = data.platform;
							version = /[\d.]+/.exec(data.version);
							version = version ? version[0] : null;
						}
					}
				} else if (getClassOf(data = context.runtime) == airRuntimeClass) {
					name = "Adobe AIR";
					os = data.flash.system.Capabilities.os;
				} else if (getClassOf(data = context.phantom) == phantomClass) {
					name = "PhantomJS";
					version = (data = data.version || null) && data.major + "." + data.minor + "." + data.patch;
				} else if (typeof doc.documentMode == "number" && (data = /\bTrident\/(\d+)/i.exec(ua))) {
					version = [version, doc.documentMode];
					if ((data = +data[1] + 4) != version[1]) {
						description.push("IE " + version[1] + " mode");
						layout && (layout[1] = "");
						version[1] = data;
					}
					version = name == "IE" ? String(version[1].toFixed(1)) : version[0];
				} else if (typeof doc.documentMode == "number" && /^(?:Chrome|Firefox)\b/.test(name)) {
					description.push("masking as " + name + " " + version);
					name = "IE";
					version = "11.0";
					layout = ["Trident"];
					os = "Windows";
				}
				os = os && format(os);
			}
			if (version && (data = /(?:[ab]|dp|pre|[ab]\d+pre)(?:\d+\+?)?$/i.exec(version) || /(?:alpha|beta)(?: ?\d)?/i.exec(ua + ";" + (useFeatures && nav.appMinorVersion)) || /\bMinefield\b/i.test(ua) && "a")) {
				prerelease = /b/i.test(data) ? "beta" : "alpha";
				version = version.replace(RegExp(data + "\\+?$"), "") + (prerelease == "beta" ? beta : alpha) + (/\d+\+?/.exec(data) || "");
			}
			if (name == "Fennec" || name == "Firefox" && /\b(?:Android|Firefox OS|KaiOS)\b/.test(os)) name = "Firefox Mobile";
			else if (name == "Maxthon" && version) version = version.replace(/\.[\d.]+/, ".x");
			else if (/\bXbox\b/i.test(product)) {
				if (product == "Xbox 360") os = null;
				if (product == "Xbox 360" && /\bIEMobile\b/.test(ua)) description.unshift("mobile mode");
			} else if ((/^(?:Chrome|IE|Opera)$/.test(name) || name && !product && !/Browser|Mobi/.test(name)) && (os == "Windows CE" || /Mobi/i.test(ua))) name += " Mobile";
			else if (name == "IE" && useFeatures) try {
				if (context.external === null) description.unshift("platform preview");
			} catch (e) {
				description.unshift("embedded");
			}
			else if ((/\bBlackBerry\b/.test(product) || /\bBB10\b/.test(ua)) && (data = (RegExp(product.replace(/ +/g, " *") + "/([.\\d]+)", "i").exec(ua) || 0)[1] || version)) {
				data = [data, /BB10/.test(ua)];
				os = (data[1] ? (product = null, manufacturer = "BlackBerry") : "Device Software") + " " + data[0];
				version = null;
			} else if (this != forOwn && product != "Wii" && (useFeatures && opera || /Opera/.test(name) && /\b(?:MSIE|Firefox)\b/i.test(ua) || name == "Firefox" && /\bOS X (?:\d+\.){2,}/.test(os) || name == "IE" && (os && !/^Win/.test(os) && version > 5.5 || /\bWindows XP\b/.test(os) && version > 8 || version == 8 && !/\bTrident\b/.test(ua))) && !reOpera.test(data = parse.call(forOwn, ua.replace(reOpera, "") + ";")) && data.name) {
				data = "ing as " + data.name + ((data = data.version) ? " " + data : "");
				if (reOpera.test(name)) {
					if (/\bIE\b/.test(data) && os == "Mac OS") os = null;
					data = "identify" + data;
				} else {
					data = "mask" + data;
					if (operaClass) name = format(operaClass.replace(/([a-z])([A-Z])/g, "$1 $2"));
					else name = "Opera";
					if (/\bIE\b/.test(data)) os = null;
					if (!useFeatures) version = null;
				}
				layout = ["Presto"];
				description.push(data);
			}
			if (data = (/\bAppleWebKit\/([\d.]+\+?)/i.exec(ua) || 0)[1]) {
				data = [parseFloat(data.replace(/\.(\d)$/, ".0$1")), data];
				if (name == "Safari" && data[1].slice(-1) == "+") {
					name = "WebKit Nightly";
					prerelease = "alpha";
					version = data[1].slice(0, -1);
				} else if (version == data[1] || version == (data[2] = (/\bSafari\/([\d.]+\+?)/i.exec(ua) || 0)[1])) version = null;
				data[1] = (/\b(?:Headless)?Chrome\/([\d.]+)/i.exec(ua) || 0)[1];
				if (data[0] == 537.36 && data[2] == 537.36 && parseFloat(data[1]) >= 28 && layout == "WebKit") layout = ["Blink"];
				if (!useFeatures || !likeChrome && !data[1]) {
					layout && (layout[1] = "like Safari");
					data = (data = data[0], data < 400 ? 1 : data < 500 ? 2 : data < 526 ? 3 : data < 533 ? 4 : data < 534 ? "4+" : data < 535 ? 5 : data < 537 ? 6 : data < 538 ? 7 : data < 601 ? 8 : data < 602 ? 9 : data < 604 ? 10 : data < 606 ? 11 : data < 608 ? 12 : "12");
				} else {
					layout && (layout[1] = "like Chrome");
					data = data[1] || (data = data[0], data < 530 ? 1 : data < 532 ? 2 : data < 532.05 ? 3 : data < 533 ? 4 : data < 534.03 ? 5 : data < 534.07 ? 6 : data < 534.1 ? 7 : data < 534.13 ? 8 : data < 534.16 ? 9 : data < 534.24 ? 10 : data < 534.3 ? 11 : data < 535.01 ? 12 : data < 535.02 ? "13+" : data < 535.07 ? 15 : data < 535.11 ? 16 : data < 535.19 ? 17 : data < 536.05 ? 18 : data < 536.1 ? 19 : data < 537.01 ? 20 : data < 537.11 ? "21+" : data < 537.13 ? 23 : data < 537.18 ? 24 : data < 537.24 ? 25 : data < 537.36 ? 26 : layout != "Blink" ? "27" : "28");
				}
				layout && (layout[1] += " " + (data += typeof data == "number" ? ".x" : /[.+]/.test(data) ? "" : "+"));
				if (name == "Safari" && (!version || parseInt(version) > 45)) version = data;
				else if (name == "Chrome" && /\bHeadlessChrome/i.test(ua)) description.unshift("headless");
			}
			if (name == "Opera" && (data = /\bzbov|zvav$/.exec(os))) {
				name += " ";
				description.unshift("desktop mode");
				if (data == "zvav") {
					name += "Mini";
					version = null;
				} else name += "Mobile";
				os = os.replace(RegExp(" *" + data + "$"), "");
			} else if (name == "Safari" && /\bChrome\b/.exec(layout && layout[1])) {
				description.unshift("desktop mode");
				name = "Chrome Mobile";
				version = null;
				if (/\bOS X\b/.test(os)) {
					manufacturer = "Apple";
					os = "iOS 4.3+";
				} else os = null;
			} else if (/\bSRWare Iron\b/.test(name) && !version) version = getVersion("Chrome");
			if (version && version.indexOf(data = /[\d.]+$/.exec(os)) == 0 && ua.indexOf("/" + data + "-") > -1) os = trim(os.replace(data, ""));
			if (os && os.indexOf(name) != -1 && !RegExp(name + " OS").test(os)) os = os.replace(RegExp(" *" + qualify(name) + " *"), "");
			if (layout && !/\b(?:Avant|Nook)\b/.test(name) && (/Browser|Lunascape|Maxthon/.test(name) || name != "Safari" && /^iOS/.test(os) && /\bSafari\b/.test(layout[1]) || /^(?:Adobe|Arora|Breach|Midori|Opera|Phantom|Rekonq|Rock|Samsung Internet|Sleipnir|SRWare Iron|Vivaldi|Web)/.test(name) && layout[1])) (data = layout[layout.length - 1]) && description.push(data);
			if (description.length) description = ["(" + description.join("; ") + ")"];
			if (manufacturer && product && product.indexOf(manufacturer) < 0) description.push("on " + manufacturer);
			if (product) description.push((/^on /.test(description[description.length - 1]) ? "" : "on ") + product);
			if (os) {
				data = / ([\d.+]+)$/.exec(os);
				isSpecialCasedOS = data && os.charAt(os.length - data[0].length - 1) == "/";
				os = {
					"architecture": 32,
					"family": data && !isSpecialCasedOS ? os.replace(data[0], "") : os,
					"version": data ? data[1] : null,
					"toString": function() {
						var version = this.version;
						return this.family + (version && !isSpecialCasedOS ? " " + version : "") + (this.architecture == 64 ? " 64-bit" : "");
					}
				};
			}
			if ((data = /\b(?:AMD|IA|Win|WOW|x86_|x)64\b/i.exec(arch)) && !/\bi686\b/i.test(arch)) {
				if (os) {
					os.architecture = 64;
					os.family = os.family.replace(RegExp(" *" + data), "");
				}
				if (name && (/\bWOW64\b/i.test(ua) || useFeatures && /\w(?:86|32)$/.test(nav.cpuClass || nav.platform) && !/\bWin64; x64\b/i.test(ua))) description.unshift("32-bit");
			} else if (os && /^OS X/.test(os.family) && name == "Chrome" && parseFloat(version) >= 39) os.architecture = 64;
			ua || (ua = null);
			/**
			* The platform object.
			*
			* @name platform
			* @type Object
			*/
			var platform = {};
			/**
			* The platform description.
			*
			* @memberOf platform
			* @type string|null
			*/
			platform.description = ua;
			/**
			* The name of the browser's layout engine.
			*
			* The list of common layout engines include:
			* "Blink", "EdgeHTML", "Gecko", "Trident" and "WebKit"
			*
			* @memberOf platform
			* @type string|null
			*/
			platform.layout = layout && layout[0];
			/**
			* The name of the product's manufacturer.
			*
			* The list of manufacturers include:
			* "Apple", "Archos", "Amazon", "Asus", "Barnes & Noble", "BlackBerry",
			* "Google", "HP", "HTC", "LG", "Microsoft", "Motorola", "Nintendo",
			* "Nokia", "Samsung" and "Sony"
			*
			* @memberOf platform
			* @type string|null
			*/
			platform.manufacturer = manufacturer;
			/**
			* The name of the browser/environment.
			*
			* The list of common browser names include:
			* "Chrome", "Electron", "Firefox", "Firefox for iOS", "IE",
			* "Microsoft Edge", "PhantomJS", "Safari", "SeaMonkey", "Silk",
			* "Opera Mini" and "Opera"
			*
			* Mobile versions of some browsers have "Mobile" appended to their name:
			* eg. "Chrome Mobile", "Firefox Mobile", "IE Mobile" and "Opera Mobile"
			*
			* @memberOf platform
			* @type string|null
			*/
			platform.name = name;
			/**
			* The alpha/beta release indicator.
			*
			* @memberOf platform
			* @type string|null
			*/
			platform.prerelease = prerelease;
			/**
			* The name of the product hosting the browser.
			*
			* The list of common products include:
			*
			* "BlackBerry", "Galaxy S4", "Lumia", "iPad", "iPod", "iPhone", "Kindle",
			* "Kindle Fire", "Nexus", "Nook", "PlayBook", "TouchPad" and "Transformer"
			*
			* @memberOf platform
			* @type string|null
			*/
			platform.product = product;
			/**
			* The browser's user agent string.
			*
			* @memberOf platform
			* @type string|null
			*/
			platform.ua = ua;
			/**
			* The browser/environment version.
			*
			* @memberOf platform
			* @type string|null
			*/
			platform.version = name && version;
			/**
			* The name of the operating system.
			*
			* @memberOf platform
			* @type Object
			*/
			platform.os = os || {
				/**
				* The CPU architecture the OS is built for.
				*
				* @memberOf platform.os
				* @type number|null
				*/
				"architecture": null,
				/**
				* The family of the OS.
				*
				* Common values include:
				* "Windows", "Windows Server 2008 R2 / 7", "Windows Server 2008 / Vista",
				* "Windows XP", "OS X", "Linux", "Ubuntu", "Debian", "Fedora", "Red Hat",
				* "SuSE", "Android", "iOS" and "Windows Phone"
				*
				* @memberOf platform.os
				* @type string|null
				*/
				"family": null,
				/**
				* The version of the OS.
				*
				* @memberOf platform.os
				* @type string|null
				*/
				"version": null,
				/**
				* Returns the OS string.
				*
				* @memberOf platform.os
				* @returns {string} The OS string.
				*/
				"toString": function() {
					return "null";
				}
			};
			platform.parse = parse;
			platform.toString = toStringPlatform;
			if (platform.version) description.unshift(version);
			if (platform.name) description.unshift(name);
			if (os && name && !(os == String(os).split(" ")[0] && (os == name.split(" ")[0] || product))) description.push(product ? "(" + os + ")" : "on " + os);
			if (description.length) platform.description = description.join(" ");
			return platform;
		}
		var platform = parse();
		if (typeof define == "function" && typeof define.amd == "object" && define.amd) {
			root.platform = platform;
			define(function() {
				return platform;
			});
		} else if (freeExports && freeModule) forOwn(platform, function(value, key) {
			freeExports[key] = value;
		});
		else root.platform = platform;
	}).call(exports);
}));
//#endregion
//#region node_modules/.pnpm/compare-versions@6.1.1/node_modules/compare-versions/lib/esm/utils.js
var semver = /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\-]+(?:\.[\da-z\-]+)*))?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;
var validateAndParse = (version) => {
	if (typeof version !== "string") throw new TypeError("Invalid argument expected string");
	const match = version.match(semver);
	if (!match) throw new Error(`Invalid argument not valid semver ('${version}' received)`);
	match.shift();
	return match;
};
var isWildcard = (s) => s === "*" || s === "x" || s === "X";
var tryParse = (v) => {
	const n = parseInt(v, 10);
	return isNaN(n) ? v : n;
};
var forceType = (a, b) => typeof a !== typeof b ? [String(a), String(b)] : [a, b];
var compareStrings = (a, b) => {
	if (isWildcard(a) || isWildcard(b)) return 0;
	const [ap, bp] = forceType(tryParse(a), tryParse(b));
	if (ap > bp) return 1;
	if (ap < bp) return -1;
	return 0;
};
var compareSegments = (a, b) => {
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		const r = compareStrings(a[i] || "0", b[i] || "0");
		if (r !== 0) return r;
	}
	return 0;
};
//#endregion
//#region node_modules/.pnpm/compare-versions@6.1.1/node_modules/compare-versions/lib/esm/compareVersions.js
/**
* Compare [semver](https://semver.org/) version strings to find greater, equal or lesser.
* This library supports the full semver specification, including comparing versions with different number of digits like `1.0.0`, `1.0`, `1`, and pre-release versions like `1.0.0-alpha`.
* @param v1 - First version to compare
* @param v2 - Second version to compare
* @returns Numeric value compatible with the [Array.sort(fn) interface](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Parameters).
*/
var compareVersions = (v1, v2) => {
	const n1 = validateAndParse(v1);
	const n2 = validateAndParse(v2);
	const p1 = n1.pop();
	const p2 = n2.pop();
	const r = compareSegments(n1, n2);
	if (r !== 0) return r;
	if (p1 && p2) return compareSegments(p1.split("."), p2.split("."));
	else if (p1 || p2) return p1 ? -1 : 1;
	return 0;
};
//#endregion
//#region node_modules/.pnpm/chalk@5.6.2/node_modules/chalk/source/vendor/ansi-styles/index.js
var import_platform = /* @__PURE__ */ __toESM(require_platform(), 1);
var ANSI_BACKGROUND_OFFSET = 10;
var wrapAnsi16 = (offset = 0) => (code) => `\u001B[${code + offset}m`;
var wrapAnsi256 = (offset = 0) => (code) => `\u001B[${38 + offset};5;${code}m`;
var wrapAnsi16m = (offset = 0) => (red, green, blue) => `\u001B[${38 + offset};2;${red};${green};${blue}m`;
var styles$1 = {
	modifier: {
		reset: [0, 0],
		bold: [1, 22],
		dim: [2, 22],
		italic: [3, 23],
		underline: [4, 24],
		overline: [53, 55],
		inverse: [7, 27],
		hidden: [8, 28],
		strikethrough: [9, 29]
	},
	color: {
		black: [30, 39],
		red: [31, 39],
		green: [32, 39],
		yellow: [33, 39],
		blue: [34, 39],
		magenta: [35, 39],
		cyan: [36, 39],
		white: [37, 39],
		blackBright: [90, 39],
		gray: [90, 39],
		grey: [90, 39],
		redBright: [91, 39],
		greenBright: [92, 39],
		yellowBright: [93, 39],
		blueBright: [94, 39],
		magentaBright: [95, 39],
		cyanBright: [96, 39],
		whiteBright: [97, 39]
	},
	bgColor: {
		bgBlack: [40, 49],
		bgRed: [41, 49],
		bgGreen: [42, 49],
		bgYellow: [43, 49],
		bgBlue: [44, 49],
		bgMagenta: [45, 49],
		bgCyan: [46, 49],
		bgWhite: [47, 49],
		bgBlackBright: [100, 49],
		bgGray: [100, 49],
		bgGrey: [100, 49],
		bgRedBright: [101, 49],
		bgGreenBright: [102, 49],
		bgYellowBright: [103, 49],
		bgBlueBright: [104, 49],
		bgMagentaBright: [105, 49],
		bgCyanBright: [106, 49],
		bgWhiteBright: [107, 49]
	}
};
Object.keys(styles$1.modifier);
var foregroundColorNames = Object.keys(styles$1.color);
var backgroundColorNames = Object.keys(styles$1.bgColor);
[...foregroundColorNames, ...backgroundColorNames];
function assembleStyles() {
	const codes = /* @__PURE__ */ new Map();
	for (const [groupName, group] of Object.entries(styles$1)) {
		for (const [styleName, style] of Object.entries(group)) {
			styles$1[styleName] = {
				open: `\u001B[${style[0]}m`,
				close: `\u001B[${style[1]}m`
			};
			group[styleName] = styles$1[styleName];
			codes.set(style[0], style[1]);
		}
		Object.defineProperty(styles$1, groupName, {
			value: group,
			enumerable: false
		});
	}
	Object.defineProperty(styles$1, "codes", {
		value: codes,
		enumerable: false
	});
	styles$1.color.close = "\x1B[39m";
	styles$1.bgColor.close = "\x1B[49m";
	styles$1.color.ansi = wrapAnsi16();
	styles$1.color.ansi256 = wrapAnsi256();
	styles$1.color.ansi16m = wrapAnsi16m();
	styles$1.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
	styles$1.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
	styles$1.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);
	Object.defineProperties(styles$1, {
		rgbToAnsi256: {
			value(red, green, blue) {
				if (red === green && green === blue) {
					if (red < 8) return 16;
					if (red > 248) return 231;
					return Math.round((red - 8) / 247 * 24) + 232;
				}
				return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
			},
			enumerable: false
		},
		hexToRgb: {
			value(hex) {
				const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
				if (!matches) return [
					0,
					0,
					0
				];
				let [colorString] = matches;
				if (colorString.length === 3) colorString = [...colorString].map((character) => character + character).join("");
				const integer = Number.parseInt(colorString, 16);
				return [
					integer >> 16 & 255,
					integer >> 8 & 255,
					integer & 255
				];
			},
			enumerable: false
		},
		hexToAnsi256: {
			value: (hex) => styles$1.rgbToAnsi256(...styles$1.hexToRgb(hex)),
			enumerable: false
		},
		ansi256ToAnsi: {
			value(code) {
				if (code < 8) return 30 + code;
				if (code < 16) return 90 + (code - 8);
				let red;
				let green;
				let blue;
				if (code >= 232) {
					red = ((code - 232) * 10 + 8) / 255;
					green = red;
					blue = red;
				} else {
					code -= 16;
					const remainder = code % 36;
					red = Math.floor(code / 36) / 5;
					green = Math.floor(remainder / 6) / 5;
					blue = remainder % 6 / 5;
				}
				const value = Math.max(red, green, blue) * 2;
				if (value === 0) return 30;
				let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
				if (value === 2) result += 60;
				return result;
			},
			enumerable: false
		},
		rgbToAnsi: {
			value: (red, green, blue) => styles$1.ansi256ToAnsi(styles$1.rgbToAnsi256(red, green, blue)),
			enumerable: false
		},
		hexToAnsi: {
			value: (hex) => styles$1.ansi256ToAnsi(styles$1.hexToAnsi256(hex)),
			enumerable: false
		}
	});
	return styles$1;
}
var ansiStyles = assembleStyles();
//#endregion
//#region node_modules/.pnpm/chalk@5.6.2/node_modules/chalk/source/vendor/supports-color/browser.js
var level = (() => {
	if (!("navigator" in globalThis)) return 0;
	if (globalThis.navigator.userAgentData) {
		const brand = navigator.userAgentData.brands.find(({ brand }) => brand === "Chromium");
		if (brand && brand.version > 93) return 3;
	}
	if (/\b(Chrome|Chromium)\//.test(globalThis.navigator.userAgent)) return 1;
	return 0;
})();
var colorSupport = level !== 0 && {
	level,
	hasBasic: true,
	has256: level >= 2,
	has16m: level >= 3
};
var supportsColor = {
	stdout: colorSupport,
	stderr: colorSupport
};
//#endregion
//#region node_modules/.pnpm/chalk@5.6.2/node_modules/chalk/source/utilities.js
function stringReplaceAll(string, substring, replacer) {
	let index = string.indexOf(substring);
	if (index === -1) return string;
	const substringLength = substring.length;
	let endIndex = 0;
	let returnValue = "";
	do {
		returnValue += string.slice(endIndex, index) + substring + replacer;
		endIndex = index + substringLength;
		index = string.indexOf(substring, endIndex);
	} while (index !== -1);
	returnValue += string.slice(endIndex);
	return returnValue;
}
function stringEncaseCRLFWithFirstIndex(string, prefix, postfix, index) {
	let endIndex = 0;
	let returnValue = "";
	do {
		const gotCR = string[index - 1] === "\r";
		returnValue += string.slice(endIndex, gotCR ? index - 1 : index) + prefix + (gotCR ? "\r\n" : "\n") + postfix;
		endIndex = index + 1;
		index = string.indexOf("\n", endIndex);
	} while (index !== -1);
	returnValue += string.slice(endIndex);
	return returnValue;
}
//#endregion
//#region node_modules/.pnpm/chalk@5.6.2/node_modules/chalk/source/index.js
var { stdout: stdoutColor, stderr: stderrColor } = supportsColor;
var GENERATOR = Symbol("GENERATOR");
var STYLER = Symbol("STYLER");
var IS_EMPTY = Symbol("IS_EMPTY");
var levelMapping = [
	"ansi",
	"ansi",
	"ansi256",
	"ansi16m"
];
var styles = Object.create(null);
var applyOptions = (object, options = {}) => {
	if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) throw new Error("The `level` option should be an integer from 0 to 3");
	const colorLevel = stdoutColor ? stdoutColor.level : 0;
	object.level = options.level === void 0 ? colorLevel : options.level;
};
var chalkFactory = (options) => {
	const chalk = (...strings) => strings.join(" ");
	applyOptions(chalk, options);
	Object.setPrototypeOf(chalk, createChalk.prototype);
	return chalk;
};
function createChalk(options) {
	return chalkFactory(options);
}
Object.setPrototypeOf(createChalk.prototype, Function.prototype);
for (const [styleName, style] of Object.entries(ansiStyles)) styles[styleName] = { get() {
	const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
	Object.defineProperty(this, styleName, { value: builder });
	return builder;
} };
styles.visible = { get() {
	const builder = createBuilder(this, this[STYLER], true);
	Object.defineProperty(this, "visible", { value: builder });
	return builder;
} };
var getModelAnsi = (model, level, type, ...arguments_) => {
	if (model === "rgb") {
		if (level === "ansi16m") return ansiStyles[type].ansi16m(...arguments_);
		if (level === "ansi256") return ansiStyles[type].ansi256(ansiStyles.rgbToAnsi256(...arguments_));
		return ansiStyles[type].ansi(ansiStyles.rgbToAnsi(...arguments_));
	}
	if (model === "hex") return getModelAnsi("rgb", level, type, ...ansiStyles.hexToRgb(...arguments_));
	return ansiStyles[type][model](...arguments_);
};
for (const model of [
	"rgb",
	"hex",
	"ansi256"
]) {
	styles[model] = { get() {
		const { level } = this;
		return function(...arguments_) {
			const styler = createStyler(getModelAnsi(model, levelMapping[level], "color", ...arguments_), ansiStyles.color.close, this[STYLER]);
			return createBuilder(this, styler, this[IS_EMPTY]);
		};
	} };
	const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
	styles[bgModel] = { get() {
		const { level } = this;
		return function(...arguments_) {
			const styler = createStyler(getModelAnsi(model, levelMapping[level], "bgColor", ...arguments_), ansiStyles.bgColor.close, this[STYLER]);
			return createBuilder(this, styler, this[IS_EMPTY]);
		};
	} };
}
var proto = Object.defineProperties(() => {}, {
	...styles,
	level: {
		enumerable: true,
		get() {
			return this[GENERATOR].level;
		},
		set(level) {
			this[GENERATOR].level = level;
		}
	}
});
var createStyler = (open, close, parent) => {
	let openAll;
	let closeAll;
	if (parent === void 0) {
		openAll = open;
		closeAll = close;
	} else {
		openAll = parent.openAll + open;
		closeAll = close + parent.closeAll;
	}
	return {
		open,
		close,
		openAll,
		closeAll,
		parent
	};
};
var createBuilder = (self, _styler, _isEmpty) => {
	const builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
	Object.setPrototypeOf(builder, proto);
	builder[GENERATOR] = self;
	builder[STYLER] = _styler;
	builder[IS_EMPTY] = _isEmpty;
	return builder;
};
var applyStyle = (self, string) => {
	if (self.level <= 0 || !string) return self[IS_EMPTY] ? "" : string;
	let styler = self[STYLER];
	if (styler === void 0) return string;
	const { openAll, closeAll } = styler;
	if (string.includes("\x1B")) while (styler !== void 0) {
		string = stringReplaceAll(string, styler.close, styler.open);
		styler = styler.parent;
	}
	const lfIndex = string.indexOf("\n");
	if (lfIndex !== -1) string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
	return openAll + string + closeAll;
};
Object.defineProperties(createChalk.prototype, styles);
var chalk = createChalk();
createChalk({ level: stderrColor ? stderrColor.level : 0 });
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/argument.js
var require_argument = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Argument = void 0;
	var Argument = class {
		constructor(value, range) {
			this.value = value;
			this.range = range;
		}
		toString() {
			return this.value;
		}
		getRange() {
			return this.range;
		}
		getValue() {
			return this.value;
		}
		isAfter(position) {
			if (this.range.end.line < position.line) return false;
			return this.range.start.line > position.line ? true : this.range.start.character > position.character;
		}
		isBefore(position) {
			if (this.range.start.line < position.line) return true;
			return this.range.end.line > position.line ? false : this.range.end.character < position.character;
		}
	};
	exports.Argument = Argument;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/jsonArgument.js
var require_jsonArgument = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.JSONArgument = void 0;
	var argument_1 = require_argument();
	var JSONArgument = class extends argument_1.Argument {
		constructor(value, range, jsonRange) {
			super(value, range);
			this.jsonRange = jsonRange;
		}
		getJSONRange() {
			return this.jsonRange;
		}
		getJSONValue() {
			let value = super.getValue();
			value = value.substring(1, value.length - 1);
			return value;
		}
	};
	exports.JSONArgument = JSONArgument;
}));
//#endregion
//#region node_modules/.pnpm/vscode-languageserver-types@3.18.3/node_modules/vscode-languageserver-types/lib/umd/main.js
var require_main$2 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	(function(factory) {
		if (typeof module === "object" && typeof module.exports === "object") {
			var v = factory(__require, exports);
			if (v !== void 0) module.exports = v;
		} else if (typeof define === "function" && define.amd) define(["require", "exports"], factory);
	})(function(require, exports$2) {
		"use strict";
		Object.defineProperty(exports$2, "__esModule", { value: true });
		exports$2.TextDocument = exports$2.EOL = exports$2.WorkspaceFolder = exports$2.InlineCompletionContext = exports$2.SelectedCompletionInfo = exports$2.InlineCompletionTriggerKind = exports$2.InlineCompletionList = exports$2.InlineCompletionItem = exports$2.StringValue = exports$2.InlayHint = exports$2.InlayHintLabelPart = exports$2.InlayHintKind = exports$2.InlineValueContext = exports$2.InlineValueEvaluatableExpression = exports$2.InlineValueVariableLookup = exports$2.InlineValueText = exports$2.SemanticTokens = exports$2.SemanticTokenModifiers = exports$2.SemanticTokenTypes = exports$2.SelectionRange = exports$2.DocumentLink = exports$2.FormattingOptions = exports$2.CodeLens = exports$2.CodeAction = exports$2.CodeActionTag = exports$2.CodeActionContext = exports$2.CodeActionTriggerKind = exports$2.CodeActionKind = exports$2.DocumentSymbol = exports$2.WorkspaceSymbol = exports$2.SymbolInformation = exports$2.SymbolTag = exports$2.SymbolKind = exports$2.DocumentHighlight = exports$2.DocumentHighlightKind = exports$2.SignatureInformation = exports$2.ParameterInformation = exports$2.Hover = exports$2.MarkedString = exports$2.CompletionList = exports$2.CompletionItem = exports$2.CompletionItemLabelDetails = exports$2.ApplyKind = exports$2.InsertTextMode = exports$2.InsertReplaceEdit = exports$2.CompletionItemTag = exports$2.InsertTextFormat = exports$2.CompletionItemKind = exports$2.MarkupContent = exports$2.MarkupKind = exports$2.TextDocumentItem = exports$2.LanguageKind = exports$2.OptionalVersionedTextDocumentIdentifier = exports$2.VersionedTextDocumentIdentifier = exports$2.TextDocumentIdentifier = exports$2.WorkspaceChange = exports$2.SnippetTextEdit = exports$2.WorkspaceEdit = exports$2.DeleteFile = exports$2.RenameFile = exports$2.CreateFile = exports$2.TextDocumentEdit = exports$2.AnnotatedTextEdit = exports$2.ChangeAnnotationIdentifier = exports$2.ChangeAnnotation = exports$2.TextEdit = exports$2.Command = exports$2.Diagnostic = exports$2.CodeDescription = exports$2.DiagnosticTag = exports$2.DiagnosticSeverity = exports$2.DiagnosticRelatedInformation = exports$2.FoldingRange = exports$2.FoldingRangeKind = exports$2.ColorPresentation = exports$2.ColorInformation = exports$2.Color = exports$2.LocationLink = exports$2.Location = exports$2.Range = exports$2.Position = exports$2.uinteger = exports$2.integer = exports$2.URI = exports$2.DocumentUri = void 0;
		var DocumentUri;
		(function(DocumentUri) {
			function is(value) {
				return typeof value === "string";
			}
			DocumentUri.is = is;
		})(DocumentUri || (exports$2.DocumentUri = DocumentUri = {}));
		var URI;
		(function(URI) {
			function is(value) {
				return typeof value === "string";
			}
			URI.is = is;
		})(URI || (exports$2.URI = URI = {}));
		var integer;
		(function(integer) {
			integer.MIN_VALUE = -2147483648;
			integer.MAX_VALUE = 2147483647;
			function is(value) {
				return typeof value === "number" && integer.MIN_VALUE <= value && value <= integer.MAX_VALUE;
			}
			integer.is = is;
		})(integer || (exports$2.integer = integer = {}));
		var uinteger;
		(function(uinteger) {
			uinteger.MIN_VALUE = 0;
			uinteger.MAX_VALUE = 2147483647;
			function is(value) {
				return typeof value === "number" && uinteger.MIN_VALUE <= value && value <= uinteger.MAX_VALUE;
			}
			uinteger.is = is;
		})(uinteger || (exports$2.uinteger = uinteger = {}));
		/**
		* The Position namespace provides helper functions to work with
		* {@link Position} literals.
		*/
		var Position;
		(function(Position) {
			/**
			* Creates a new Position literal from the given line and character.
			* @param line The position's line.
			* @param character The position's character.
			*/
			function create(line, character) {
				if (line === Number.MAX_VALUE) line = uinteger.MAX_VALUE;
				if (character === Number.MAX_VALUE) character = uinteger.MAX_VALUE;
				return {
					line,
					character
				};
			}
			Position.create = create;
			/**
			* Checks whether the given literal conforms to the {@link Position} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && Is.uinteger(candidate.line) && Is.uinteger(candidate.character);
			}
			Position.is = is;
		})(Position || (exports$2.Position = Position = {}));
		/**
		* The Range namespace provides helper functions to work with
		* {@link Range} literals.
		*/
		var Range;
		(function(Range) {
			function create(one, two, three, four) {
				if (Is.uinteger(one) && Is.uinteger(two) && Is.uinteger(three) && Is.uinteger(four)) return {
					start: Position.create(one, two),
					end: Position.create(three, four)
				};
				else if (Position.is(one) && Position.is(two)) return {
					start: one,
					end: two
				};
				else throw new Error("Range#create called with invalid arguments[".concat(one, ", ").concat(two, ", ").concat(three, ", ").concat(four, "]"));
			}
			Range.create = create;
			/**
			* Checks whether the given literal conforms to the {@link Range} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && Position.is(candidate.start) && Position.is(candidate.end);
			}
			Range.is = is;
		})(Range || (exports$2.Range = Range = {}));
		/**
		* The Location namespace provides helper functions to work with
		* {@link Location} literals.
		*/
		var Location;
		(function(Location) {
			/**
			* Creates a Location literal.
			* @param uri The location's uri.
			* @param range The location's range.
			*/
			function create(uri, range) {
				return {
					uri,
					range
				};
			}
			Location.create = create;
			/**
			* Checks whether the given literal conforms to the {@link Location} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && Range.is(candidate.range) && (Is.string(candidate.uri) || Is.undefined(candidate.uri));
			}
			Location.is = is;
		})(Location || (exports$2.Location = Location = {}));
		/**
		* The LocationLink namespace provides helper functions to work with
		* {@link LocationLink} literals.
		*/
		var LocationLink;
		(function(LocationLink) {
			/**
			* Creates a LocationLink literal.
			* @param targetUri The definition's uri.
			* @param targetRange The full range of the definition.
			* @param targetSelectionRange The span of the symbol definition at the target.
			* @param originSelectionRange The span of the symbol being defined in the originating source file.
			*/
			function create(targetUri, targetRange, targetSelectionRange, originSelectionRange) {
				return {
					targetUri,
					targetRange,
					targetSelectionRange,
					originSelectionRange
				};
			}
			LocationLink.create = create;
			/**
			* Checks whether the given literal conforms to the {@link LocationLink} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && Range.is(candidate.targetRange) && Is.string(candidate.targetUri) && Range.is(candidate.targetSelectionRange) && (Range.is(candidate.originSelectionRange) || Is.undefined(candidate.originSelectionRange));
			}
			LocationLink.is = is;
		})(LocationLink || (exports$2.LocationLink = LocationLink = {}));
		/**
		* The Color namespace provides helper functions to work with
		* {@link Color} literals.
		*/
		var Color;
		(function(Color) {
			/**
			* Creates a new Color literal.
			*/
			function create(red, green, blue, alpha) {
				return {
					red,
					green,
					blue,
					alpha
				};
			}
			Color.create = create;
			/**
			* Checks whether the given literal conforms to the {@link Color} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && Is.numberRange(candidate.red, 0, 1) && Is.numberRange(candidate.green, 0, 1) && Is.numberRange(candidate.blue, 0, 1) && Is.numberRange(candidate.alpha, 0, 1);
			}
			Color.is = is;
		})(Color || (exports$2.Color = Color = {}));
		/**
		* The ColorInformation namespace provides helper functions to work with
		* {@link ColorInformation} literals.
		*/
		var ColorInformation;
		(function(ColorInformation) {
			/**
			* Creates a new ColorInformation literal.
			*/
			function create(range, color) {
				return {
					range,
					color
				};
			}
			ColorInformation.create = create;
			/**
			* Checks whether the given literal conforms to the {@link ColorInformation} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && Range.is(candidate.range) && Color.is(candidate.color);
			}
			ColorInformation.is = is;
		})(ColorInformation || (exports$2.ColorInformation = ColorInformation = {}));
		/**
		* The Color namespace provides helper functions to work with
		* {@link ColorPresentation} literals.
		*/
		var ColorPresentation;
		(function(ColorPresentation) {
			/**
			* Creates a new ColorInformation literal.
			*/
			function create(label, textEdit, additionalTextEdits) {
				return {
					label,
					textEdit,
					additionalTextEdits
				};
			}
			ColorPresentation.create = create;
			/**
			* Checks whether the given literal conforms to the {@link ColorInformation} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && Is.string(candidate.label) && (Is.undefined(candidate.textEdit) || TextEdit.is(candidate)) && (Is.undefined(candidate.additionalTextEdits) || Is.typedArray(candidate.additionalTextEdits, TextEdit.is));
			}
			ColorPresentation.is = is;
		})(ColorPresentation || (exports$2.ColorPresentation = ColorPresentation = {}));
		/**
		* A set of predefined range kinds.
		*/
		var FoldingRangeKind;
		(function(FoldingRangeKind) {
			/**
			* Folding range for a comment
			*/
			FoldingRangeKind.Comment = "comment";
			/**
			* Folding range for an import or include
			*/
			FoldingRangeKind.Imports = "imports";
			/**
			* Folding range for a region (e.g. `#region`)
			*/
			FoldingRangeKind.Region = "region";
		})(FoldingRangeKind || (exports$2.FoldingRangeKind = FoldingRangeKind = {}));
		/**
		* The folding range namespace provides helper functions to work with
		* {@link FoldingRange} literals.
		*/
		var FoldingRange;
		(function(FoldingRange) {
			/**
			* Creates a new FoldingRange literal.
			*/
			function create(startLine, endLine, startCharacter, endCharacter, kind, collapsedText) {
				var result = {
					startLine,
					endLine
				};
				if (Is.defined(startCharacter)) result.startCharacter = startCharacter;
				if (Is.defined(endCharacter)) result.endCharacter = endCharacter;
				if (Is.defined(kind)) result.kind = kind;
				if (Is.defined(collapsedText)) result.collapsedText = collapsedText;
				return result;
			}
			FoldingRange.create = create;
			/**
			* Checks whether the given literal conforms to the {@link FoldingRange} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && Is.uinteger(candidate.startLine) && Is.uinteger(candidate.startLine) && (Is.undefined(candidate.startCharacter) || Is.uinteger(candidate.startCharacter)) && (Is.undefined(candidate.endCharacter) || Is.uinteger(candidate.endCharacter)) && (Is.undefined(candidate.kind) || Is.string(candidate.kind));
			}
			FoldingRange.is = is;
		})(FoldingRange || (exports$2.FoldingRange = FoldingRange = {}));
		/**
		* The DiagnosticRelatedInformation namespace provides helper functions to work with
		* {@link DiagnosticRelatedInformation} literals.
		*/
		var DiagnosticRelatedInformation;
		(function(DiagnosticRelatedInformation) {
			/**
			* Creates a new DiagnosticRelatedInformation literal.
			*/
			function create(location, message) {
				return {
					location,
					message
				};
			}
			DiagnosticRelatedInformation.create = create;
			/**
			* Checks whether the given literal conforms to the {@link DiagnosticRelatedInformation} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Location.is(candidate.location) && Is.string(candidate.message);
			}
			DiagnosticRelatedInformation.is = is;
		})(DiagnosticRelatedInformation || (exports$2.DiagnosticRelatedInformation = DiagnosticRelatedInformation = {}));
		/**
		* The diagnostic's severity.
		*/
		var DiagnosticSeverity;
		(function(DiagnosticSeverity) {
			/**
			* Reports an error.
			*/
			DiagnosticSeverity.Error = 1;
			/**
			* Reports a warning.
			*/
			DiagnosticSeverity.Warning = 2;
			/**
			* Reports an information.
			*/
			DiagnosticSeverity.Information = 3;
			/**
			* Reports a hint.
			*/
			DiagnosticSeverity.Hint = 4;
		})(DiagnosticSeverity || (exports$2.DiagnosticSeverity = DiagnosticSeverity = {}));
		/**
		* The diagnostic tags.
		*
		* @since 3.15.0
		*/
		var DiagnosticTag;
		(function(DiagnosticTag) {
			/**
			* Unused or unnecessary code.
			*
			* Clients are allowed to render diagnostics with this tag faded out instead of having
			* an error squiggle.
			*/
			DiagnosticTag.Unnecessary = 1;
			/**
			* Deprecated or obsolete code.
			*
			* Clients are allowed to rendered diagnostics with this tag strike through.
			*/
			DiagnosticTag.Deprecated = 2;
		})(DiagnosticTag || (exports$2.DiagnosticTag = DiagnosticTag = {}));
		/**
		* The CodeDescription namespace provides functions to deal with descriptions for diagnostic codes.
		*
		* @since 3.16.0
		*/
		var CodeDescription;
		(function(CodeDescription) {
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && Is.string(candidate.href);
			}
			CodeDescription.is = is;
		})(CodeDescription || (exports$2.CodeDescription = CodeDescription = {}));
		/**
		* The Diagnostic namespace provides helper functions to work with
		* {@link Diagnostic} literals.
		*/
		var Diagnostic;
		(function(Diagnostic) {
			/**
			* Creates a new Diagnostic literal.
			*/
			function create(range, message, severity, code, source, relatedInformation) {
				var result = {
					range,
					message
				};
				if (Is.defined(severity)) result.severity = severity;
				if (Is.defined(code)) result.code = code;
				if (Is.defined(source)) result.source = source;
				if (Is.defined(relatedInformation)) result.relatedInformation = relatedInformation;
				return result;
			}
			Diagnostic.create = create;
			/**
			* Checks whether the given literal conforms to the {@link Diagnostic} interface.
			*/
			function is(value) {
				var _a;
				var candidate = value;
				return Is.defined(candidate) && Range.is(candidate.range) && (Is.string(candidate.message) || MarkupContent.is(candidate.message)) && (Is.number(candidate.severity) || Is.undefined(candidate.severity)) && (Is.integer(candidate.code) || Is.string(candidate.code) || Is.undefined(candidate.code)) && (Is.undefined(candidate.codeDescription) || Is.string((_a = candidate.codeDescription) === null || _a === void 0 ? void 0 : _a.href)) && (Is.string(candidate.source) || Is.undefined(candidate.source)) && (Is.undefined(candidate.relatedInformation) || Is.typedArray(candidate.relatedInformation, DiagnosticRelatedInformation.is));
			}
			Diagnostic.is = is;
			/**
			* Checks whether the given diagnostic's message conforms to the 3.17.0
			* version of the protocol where the message is a string.
			*
			* @param value the diagnostic
			* @returns true if the diagnostic's message is a string, false otherwise.
			*/
			function is3_17(value) {
				return Is.string(value.message);
			}
			Diagnostic.is3_17 = is3_17;
			/**
			* Gets the message string of a diagnostic. If the message is already a
			* string, it is returned as is. If the message is a MarkupContent,
			* the value of the MarkupContent is returned. Otherwise an error is thrown.
			*
			* @param diagnostic the diagnostic to get the message string from.
			* @returns the message string of the given diagnostic.
			*/
			function getMessageString(diagnostic) {
				if (Is.string(diagnostic.message)) return diagnostic.message;
				else if (MarkupContent.is(diagnostic.message)) return diagnostic.message.value;
				else throw new Error("Unknown message type ".concat(typeof diagnostic.message));
			}
			Diagnostic.getMessageString = getMessageString;
		})(Diagnostic || (exports$2.Diagnostic = Diagnostic = {}));
		/**
		* The Command namespace provides helper functions to work with
		* {@link Command} literals.
		*/
		var Command;
		(function(Command) {
			/**
			* Creates a new Command literal.
			*/
			function create(title, command) {
				var args = [];
				for (var _i = 2; _i < arguments.length; _i++) args[_i - 2] = arguments[_i];
				var result = {
					title,
					command
				};
				if (Is.defined(args) && args.length > 0) result.arguments = args;
				return result;
			}
			Command.create = create;
			/**
			* Checks whether the given literal conforms to the {@link Command} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Is.string(candidate.title) && (candidate.tooltip === void 0 || Is.string(candidate.tooltip)) && Is.string(candidate.command);
			}
			Command.is = is;
		})(Command || (exports$2.Command = Command = {}));
		/**
		* The TextEdit namespace provides helper function to create replace,
		* insert and delete edits more easily.
		*/
		var TextEdit;
		(function(TextEdit) {
			/**
			* Creates a replace text edit.
			* @param range The range of text to be replaced.
			* @param newText The new text.
			*/
			function replace(range, newText) {
				return {
					range,
					newText
				};
			}
			TextEdit.replace = replace;
			/**
			* Creates an insert text edit.
			* @param position The position to insert the text at.
			* @param newText The text to be inserted.
			*/
			function insert(position, newText) {
				return {
					range: {
						start: position,
						end: position
					},
					newText
				};
			}
			TextEdit.insert = insert;
			/**
			* Creates a delete text edit.
			* @param range The range of text to be deleted.
			*/
			function del(range) {
				return {
					range,
					newText: ""
				};
			}
			TextEdit.del = del;
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && Is.string(candidate.newText) && Range.is(candidate.range);
			}
			TextEdit.is = is;
		})(TextEdit || (exports$2.TextEdit = TextEdit = {}));
		var ChangeAnnotation;
		(function(ChangeAnnotation) {
			function create(label, needsConfirmation, description) {
				var result = { label };
				if (needsConfirmation !== void 0) result.needsConfirmation = needsConfirmation;
				if (description !== void 0) result.description = description;
				return result;
			}
			ChangeAnnotation.create = create;
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && Is.string(candidate.label) && (Is.boolean(candidate.needsConfirmation) || candidate.needsConfirmation === void 0) && (Is.string(candidate.description) || candidate.description === void 0);
			}
			ChangeAnnotation.is = is;
		})(ChangeAnnotation || (exports$2.ChangeAnnotation = ChangeAnnotation = {}));
		var ChangeAnnotationIdentifier;
		(function(ChangeAnnotationIdentifier) {
			function is(value) {
				var candidate = value;
				return Is.string(candidate);
			}
			ChangeAnnotationIdentifier.is = is;
		})(ChangeAnnotationIdentifier || (exports$2.ChangeAnnotationIdentifier = ChangeAnnotationIdentifier = {}));
		var AnnotatedTextEdit;
		(function(AnnotatedTextEdit) {
			/**
			* Creates an annotated replace text edit.
			*
			* @param range The range of text to be replaced.
			* @param newText The new text.
			* @param annotation The annotation.
			*/
			function replace(range, newText, annotation) {
				return {
					range,
					newText,
					annotationId: annotation
				};
			}
			AnnotatedTextEdit.replace = replace;
			/**
			* Creates an annotated insert text edit.
			*
			* @param position The position to insert the text at.
			* @param newText The text to be inserted.
			* @param annotation The annotation.
			*/
			function insert(position, newText, annotation) {
				return {
					range: {
						start: position,
						end: position
					},
					newText,
					annotationId: annotation
				};
			}
			AnnotatedTextEdit.insert = insert;
			/**
			* Creates an annotated delete text edit.
			*
			* @param range The range of text to be deleted.
			* @param annotation The annotation.
			*/
			function del(range, annotation) {
				return {
					range,
					newText: "",
					annotationId: annotation
				};
			}
			AnnotatedTextEdit.del = del;
			function is(value) {
				var candidate = value;
				return TextEdit.is(candidate) && (ChangeAnnotation.is(candidate.annotationId) || ChangeAnnotationIdentifier.is(candidate.annotationId));
			}
			AnnotatedTextEdit.is = is;
		})(AnnotatedTextEdit || (exports$2.AnnotatedTextEdit = AnnotatedTextEdit = {}));
		/**
		* The TextDocumentEdit namespace provides helper function to create
		* an edit that manipulates a text document.
		*/
		var TextDocumentEdit;
		(function(TextDocumentEdit) {
			/**
			* Creates a new `TextDocumentEdit`
			*/
			function create(textDocument, edits) {
				return {
					textDocument,
					edits
				};
			}
			TextDocumentEdit.create = create;
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && OptionalVersionedTextDocumentIdentifier.is(candidate.textDocument) && Array.isArray(candidate.edits);
			}
			TextDocumentEdit.is = is;
		})(TextDocumentEdit || (exports$2.TextDocumentEdit = TextDocumentEdit = {}));
		var CreateFile;
		(function(CreateFile) {
			function create(uri, options, annotation) {
				var result = {
					kind: "create",
					uri
				};
				if (options !== void 0 && (options.overwrite !== void 0 || options.ignoreIfExists !== void 0)) result.options = options;
				if (annotation !== void 0) result.annotationId = annotation;
				return result;
			}
			CreateFile.create = create;
			function is(value) {
				var candidate = value;
				return candidate && candidate.kind === "create" && Is.string(candidate.uri) && (candidate.options === void 0 || (candidate.options.overwrite === void 0 || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === void 0 || Is.boolean(candidate.options.ignoreIfExists))) && (candidate.annotationId === void 0 || ChangeAnnotationIdentifier.is(candidate.annotationId));
			}
			CreateFile.is = is;
		})(CreateFile || (exports$2.CreateFile = CreateFile = {}));
		var RenameFile;
		(function(RenameFile) {
			function create(oldUri, newUri, options, annotation) {
				var result = {
					kind: "rename",
					oldUri,
					newUri
				};
				if (options !== void 0 && (options.overwrite !== void 0 || options.ignoreIfExists !== void 0)) result.options = options;
				if (annotation !== void 0) result.annotationId = annotation;
				return result;
			}
			RenameFile.create = create;
			function is(value) {
				var candidate = value;
				return candidate && candidate.kind === "rename" && Is.string(candidate.oldUri) && Is.string(candidate.newUri) && (candidate.options === void 0 || (candidate.options.overwrite === void 0 || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === void 0 || Is.boolean(candidate.options.ignoreIfExists))) && (candidate.annotationId === void 0 || ChangeAnnotationIdentifier.is(candidate.annotationId));
			}
			RenameFile.is = is;
		})(RenameFile || (exports$2.RenameFile = RenameFile = {}));
		var DeleteFile;
		(function(DeleteFile) {
			function create(uri, options, annotation) {
				var result = {
					kind: "delete",
					uri
				};
				if (options !== void 0 && (options.recursive !== void 0 || options.ignoreIfNotExists !== void 0)) result.options = options;
				if (annotation !== void 0) result.annotationId = annotation;
				return result;
			}
			DeleteFile.create = create;
			function is(value) {
				var candidate = value;
				return candidate && candidate.kind === "delete" && Is.string(candidate.uri) && (candidate.options === void 0 || (candidate.options.recursive === void 0 || Is.boolean(candidate.options.recursive)) && (candidate.options.ignoreIfNotExists === void 0 || Is.boolean(candidate.options.ignoreIfNotExists))) && (candidate.annotationId === void 0 || ChangeAnnotationIdentifier.is(candidate.annotationId));
			}
			DeleteFile.is = is;
		})(DeleteFile || (exports$2.DeleteFile = DeleteFile = {}));
		var WorkspaceEdit;
		(function(WorkspaceEdit) {
			function is(value) {
				var candidate = value;
				return candidate && (candidate.changes !== void 0 || candidate.documentChanges !== void 0) && (candidate.documentChanges === void 0 || candidate.documentChanges.every(function(change) {
					if (Is.string(change.kind)) return CreateFile.is(change) || RenameFile.is(change) || DeleteFile.is(change);
					else return TextDocumentEdit.is(change);
				}));
			}
			WorkspaceEdit.is = is;
		})(WorkspaceEdit || (exports$2.WorkspaceEdit = WorkspaceEdit = {}));
		var TextEditChangeImpl = function() {
			function TextEditChangeImpl(edits, changeAnnotations) {
				this.edits = edits;
				this.changeAnnotations = changeAnnotations;
			}
			TextEditChangeImpl.prototype.insert = function(position, newText, annotation) {
				var edit;
				var id;
				if (annotation === void 0) edit = TextEdit.insert(position, newText);
				else if (ChangeAnnotationIdentifier.is(annotation)) {
					id = annotation;
					edit = AnnotatedTextEdit.insert(position, newText, annotation);
				} else {
					this.assertChangeAnnotations(this.changeAnnotations);
					id = this.changeAnnotations.manage(annotation);
					edit = AnnotatedTextEdit.insert(position, newText, id);
				}
				this.edits.push(edit);
				if (id !== void 0) return id;
			};
			TextEditChangeImpl.prototype.replace = function(range, newText, annotation) {
				var edit;
				var id;
				if (annotation === void 0) edit = TextEdit.replace(range, newText);
				else if (ChangeAnnotationIdentifier.is(annotation)) {
					id = annotation;
					edit = AnnotatedTextEdit.replace(range, newText, annotation);
				} else {
					this.assertChangeAnnotations(this.changeAnnotations);
					id = this.changeAnnotations.manage(annotation);
					edit = AnnotatedTextEdit.replace(range, newText, id);
				}
				this.edits.push(edit);
				if (id !== void 0) return id;
			};
			TextEditChangeImpl.prototype.delete = function(range, annotation) {
				var edit;
				var id;
				if (annotation === void 0) edit = TextEdit.del(range);
				else if (ChangeAnnotationIdentifier.is(annotation)) {
					id = annotation;
					edit = AnnotatedTextEdit.del(range, annotation);
				} else {
					this.assertChangeAnnotations(this.changeAnnotations);
					id = this.changeAnnotations.manage(annotation);
					edit = AnnotatedTextEdit.del(range, id);
				}
				this.edits.push(edit);
				if (id !== void 0) return id;
			};
			TextEditChangeImpl.prototype.add = function(edit) {
				this.edits.push(edit);
			};
			TextEditChangeImpl.prototype.all = function() {
				return this.edits;
			};
			TextEditChangeImpl.prototype.clear = function() {
				this.edits.splice(0, this.edits.length);
			};
			TextEditChangeImpl.prototype.assertChangeAnnotations = function(value) {
				if (value === void 0) throw new Error("Text edit change is not configured to manage change annotations.");
			};
			return TextEditChangeImpl;
		}();
		var SnippetTextEdit;
		(function(SnippetTextEdit) {
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && Range.is(candidate.range) && StringValue.isSnippet(candidate.snippet) && (candidate.annotationId === void 0 || ChangeAnnotation.is(candidate.annotationId) || ChangeAnnotationIdentifier.is(candidate.annotationId));
			}
			SnippetTextEdit.is = is;
		})(SnippetTextEdit || (exports$2.SnippetTextEdit = SnippetTextEdit = {}));
		/**
		* A helper class
		*/
		var ChangeAnnotations = function() {
			function ChangeAnnotations(annotations) {
				this._annotations = annotations === void 0 ? Object.create(null) : annotations;
				this._counter = 0;
				this._size = 0;
			}
			ChangeAnnotations.prototype.all = function() {
				return this._annotations;
			};
			Object.defineProperty(ChangeAnnotations.prototype, "size", {
				get: function() {
					return this._size;
				},
				enumerable: false,
				configurable: true
			});
			ChangeAnnotations.prototype.manage = function(idOrAnnotation, annotation) {
				var id;
				if (ChangeAnnotationIdentifier.is(idOrAnnotation)) id = idOrAnnotation;
				else {
					id = this.nextId();
					annotation = idOrAnnotation;
				}
				if (this._annotations[id] !== void 0) throw new Error("Id ".concat(id, " is already in use."));
				if (annotation === void 0) throw new Error("No annotation provided for id ".concat(id));
				this._annotations[id] = annotation;
				this._size++;
				return id;
			};
			ChangeAnnotations.prototype.nextId = function() {
				this._counter++;
				return this._counter.toString();
			};
			return ChangeAnnotations;
		}();
		exports$2.WorkspaceChange = function() {
			function WorkspaceChange(workspaceEdit) {
				var _this = this;
				this._textEditChanges = Object.create(null);
				if (workspaceEdit !== void 0) {
					this._workspaceEdit = workspaceEdit;
					if (workspaceEdit.documentChanges) {
						this._changeAnnotations = new ChangeAnnotations(workspaceEdit.changeAnnotations);
						workspaceEdit.changeAnnotations = this._changeAnnotations.all();
						workspaceEdit.documentChanges.forEach(function(change) {
							if (TextDocumentEdit.is(change)) {
								var textEditChange = new TextEditChangeImpl(change.edits, _this._changeAnnotations);
								_this._textEditChanges[change.textDocument.uri] = textEditChange;
							}
						});
					} else if (workspaceEdit.changes) Object.keys(workspaceEdit.changes).forEach(function(key) {
						var textEditChange = new TextEditChangeImpl(workspaceEdit.changes[key]);
						_this._textEditChanges[key] = textEditChange;
					});
				} else this._workspaceEdit = {};
			}
			Object.defineProperty(WorkspaceChange.prototype, "edit", {
				/**
				* Returns the underlying {@link WorkspaceEdit} literal
				* use to be returned from a workspace edit operation like rename.
				*/
				get: function() {
					this.initDocumentChanges();
					if (this._changeAnnotations !== void 0) if (this._changeAnnotations.size === 0) this._workspaceEdit.changeAnnotations = void 0;
					else this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
					return this._workspaceEdit;
				},
				enumerable: false,
				configurable: true
			});
			WorkspaceChange.prototype.getTextEditChange = function(key) {
				if (OptionalVersionedTextDocumentIdentifier.is(key)) {
					this.initDocumentChanges();
					if (this._workspaceEdit.documentChanges === void 0) throw new Error("Workspace edit is not configured for document changes.");
					var textDocument = {
						uri: key.uri,
						version: key.version
					};
					var result = this._textEditChanges[textDocument.uri];
					if (!result) {
						var edits = [];
						var textDocumentEdit = {
							textDocument,
							edits
						};
						this._workspaceEdit.documentChanges.push(textDocumentEdit);
						result = new TextEditChangeImpl(edits, this._changeAnnotations);
						this._textEditChanges[textDocument.uri] = result;
					}
					return result;
				} else {
					this.initChanges();
					if (this._workspaceEdit.changes === void 0) throw new Error("Workspace edit is not configured for normal text edit changes.");
					var result = this._textEditChanges[key];
					if (!result) {
						var edits = [];
						this._workspaceEdit.changes[key] = edits;
						result = new TextEditChangeImpl(edits);
						this._textEditChanges[key] = result;
					}
					return result;
				}
			};
			WorkspaceChange.prototype.initDocumentChanges = function() {
				if (this._workspaceEdit.documentChanges === void 0 && this._workspaceEdit.changes === void 0) {
					this._changeAnnotations = new ChangeAnnotations();
					this._workspaceEdit.documentChanges = [];
					this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
				}
			};
			WorkspaceChange.prototype.initChanges = function() {
				if (this._workspaceEdit.documentChanges === void 0 && this._workspaceEdit.changes === void 0) this._workspaceEdit.changes = Object.create(null);
			};
			WorkspaceChange.prototype.createFile = function(uri, optionsOrAnnotation, options) {
				this.initDocumentChanges();
				if (this._workspaceEdit.documentChanges === void 0) throw new Error("Workspace edit is not configured for document changes.");
				var annotation;
				if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) annotation = optionsOrAnnotation;
				else options = optionsOrAnnotation;
				var operation;
				var id;
				if (annotation === void 0) operation = CreateFile.create(uri, options);
				else {
					id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
					operation = CreateFile.create(uri, options, id);
				}
				this._workspaceEdit.documentChanges.push(operation);
				if (id !== void 0) return id;
			};
			WorkspaceChange.prototype.renameFile = function(oldUri, newUri, optionsOrAnnotation, options) {
				this.initDocumentChanges();
				if (this._workspaceEdit.documentChanges === void 0) throw new Error("Workspace edit is not configured for document changes.");
				var annotation;
				if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) annotation = optionsOrAnnotation;
				else options = optionsOrAnnotation;
				var operation;
				var id;
				if (annotation === void 0) operation = RenameFile.create(oldUri, newUri, options);
				else {
					id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
					operation = RenameFile.create(oldUri, newUri, options, id);
				}
				this._workspaceEdit.documentChanges.push(operation);
				if (id !== void 0) return id;
			};
			WorkspaceChange.prototype.deleteFile = function(uri, optionsOrAnnotation, options) {
				this.initDocumentChanges();
				if (this._workspaceEdit.documentChanges === void 0) throw new Error("Workspace edit is not configured for document changes.");
				var annotation;
				if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) annotation = optionsOrAnnotation;
				else options = optionsOrAnnotation;
				var operation;
				var id;
				if (annotation === void 0) operation = DeleteFile.create(uri, options);
				else {
					id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations.manage(annotation);
					operation = DeleteFile.create(uri, options, id);
				}
				this._workspaceEdit.documentChanges.push(operation);
				if (id !== void 0) return id;
			};
			return WorkspaceChange;
		}();
		/**
		* The TextDocumentIdentifier namespace provides helper functions to work with
		* {@link TextDocumentIdentifier} literals.
		*/
		var TextDocumentIdentifier;
		(function(TextDocumentIdentifier) {
			/**
			* Creates a new TextDocumentIdentifier literal.
			* @param uri The document's uri.
			*/
			function create(uri) {
				return { uri };
			}
			TextDocumentIdentifier.create = create;
			/**
			* Checks whether the given literal conforms to the {@link TextDocumentIdentifier} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Is.string(candidate.uri);
			}
			TextDocumentIdentifier.is = is;
		})(TextDocumentIdentifier || (exports$2.TextDocumentIdentifier = TextDocumentIdentifier = {}));
		/**
		* The VersionedTextDocumentIdentifier namespace provides helper functions to work with
		* {@link VersionedTextDocumentIdentifier} literals.
		*/
		var VersionedTextDocumentIdentifier;
		(function(VersionedTextDocumentIdentifier) {
			/**
			* Creates a new VersionedTextDocumentIdentifier literal.
			* @param uri The document's uri.
			* @param version The document's version.
			*/
			function create(uri, version) {
				return {
					uri,
					version
				};
			}
			VersionedTextDocumentIdentifier.create = create;
			/**
			* Checks whether the given literal conforms to the {@link VersionedTextDocumentIdentifier} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Is.string(candidate.uri) && Is.integer(candidate.version);
			}
			VersionedTextDocumentIdentifier.is = is;
		})(VersionedTextDocumentIdentifier || (exports$2.VersionedTextDocumentIdentifier = VersionedTextDocumentIdentifier = {}));
		/**
		* The OptionalVersionedTextDocumentIdentifier namespace provides helper functions to work with
		* {@link OptionalVersionedTextDocumentIdentifier} literals.
		*/
		var OptionalVersionedTextDocumentIdentifier;
		(function(OptionalVersionedTextDocumentIdentifier) {
			/**
			* Creates a new OptionalVersionedTextDocumentIdentifier literal.
			* @param uri The document's uri.
			* @param version The document's version.
			*/
			function create(uri, version) {
				return {
					uri,
					version
				};
			}
			OptionalVersionedTextDocumentIdentifier.create = create;
			/**
			* Checks whether the given literal conforms to the {@link OptionalVersionedTextDocumentIdentifier} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Is.string(candidate.uri) && (candidate.version === null || Is.integer(candidate.version));
			}
			OptionalVersionedTextDocumentIdentifier.is = is;
		})(OptionalVersionedTextDocumentIdentifier || (exports$2.OptionalVersionedTextDocumentIdentifier = OptionalVersionedTextDocumentIdentifier = {}));
		/**
		* Predefined Language kinds
		* @since 3.18.0
		*/
		var LanguageKind;
		(function(LanguageKind) {
			LanguageKind.ABAP = "abap";
			LanguageKind.WindowsBat = "bat";
			LanguageKind.BibTeX = "bibtex";
			LanguageKind.Clojure = "clojure";
			LanguageKind.Coffeescript = "coffeescript";
			LanguageKind.C = "c";
			LanguageKind.CPP = "cpp";
			LanguageKind.CSharp = "csharp";
			LanguageKind.CSS = "css";
			/**
			* @since 3.18.0
			*/
			LanguageKind.D = "d";
			/**
			* @since 3.18.0
			*/
			LanguageKind.Delphi = "pascal";
			LanguageKind.Diff = "diff";
			LanguageKind.Dart = "dart";
			LanguageKind.Dockerfile = "dockerfile";
			LanguageKind.Elixir = "elixir";
			LanguageKind.Erlang = "erlang";
			LanguageKind.FSharp = "fsharp";
			LanguageKind.GitCommit = "git-commit";
			LanguageKind.GitRebase = "git-rebase";
			LanguageKind.Go = "go";
			LanguageKind.Groovy = "groovy";
			LanguageKind.Handlebars = "handlebars";
			LanguageKind.Haskell = "haskell";
			LanguageKind.HTML = "html";
			LanguageKind.Ini = "ini";
			LanguageKind.Java = "java";
			LanguageKind.JavaScript = "javascript";
			LanguageKind.JavaScriptReact = "javascriptreact";
			LanguageKind.JSON = "json";
			LanguageKind.LaTeX = "latex";
			LanguageKind.Less = "less";
			LanguageKind.Lua = "lua";
			LanguageKind.Makefile = "makefile";
			LanguageKind.Markdown = "markdown";
			LanguageKind.ObjectiveC = "objective-c";
			LanguageKind.ObjectiveCPP = "objective-cpp";
			/**
			* @since 3.18.0
			*/
			LanguageKind.Pascal = "pascal";
			LanguageKind.Perl = "perl";
			LanguageKind.Perl6 = "perl6";
			LanguageKind.PHP = "php";
			LanguageKind.Plaintext = "plaintext";
			LanguageKind.Powershell = "powershell";
			LanguageKind.Pug = "jade";
			LanguageKind.Python = "python";
			LanguageKind.R = "r";
			LanguageKind.Razor = "razor";
			LanguageKind.Ruby = "ruby";
			LanguageKind.Rust = "rust";
			LanguageKind.SCSS = "scss";
			LanguageKind.SASS = "sass";
			LanguageKind.Scala = "scala";
			LanguageKind.ShaderLab = "shaderlab";
			LanguageKind.ShellScript = "shellscript";
			LanguageKind.SQL = "sql";
			LanguageKind.Swift = "swift";
			LanguageKind.TypeScript = "typescript";
			LanguageKind.TypeScriptReact = "typescriptreact";
			LanguageKind.TeX = "tex";
			LanguageKind.VisualBasic = "vb";
			LanguageKind.XML = "xml";
			LanguageKind.XSL = "xsl";
			LanguageKind.YAML = "yaml";
		})(LanguageKind || (exports$2.LanguageKind = LanguageKind = {}));
		/**
		* The TextDocumentItem namespace provides helper functions to work with
		* {@link TextDocumentItem} literals.
		*/
		var TextDocumentItem;
		(function(TextDocumentItem) {
			/**
			* Creates a new TextDocumentItem literal.
			* @param uri The document's uri.
			* @param languageId The document's language identifier.
			* @param version The document's version number.
			* @param text The document's text.
			*/
			function create(uri, languageId, version, text) {
				return {
					uri,
					languageId,
					version,
					text
				};
			}
			TextDocumentItem.create = create;
			/**
			* Checks whether the given literal conforms to the {@link TextDocumentItem} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Is.string(candidate.uri) && Is.string(candidate.languageId) && Is.integer(candidate.version) && Is.string(candidate.text);
			}
			TextDocumentItem.is = is;
		})(TextDocumentItem || (exports$2.TextDocumentItem = TextDocumentItem = {}));
		/**
		* Describes the content type that a client supports in various
		* result literals like `Hover`, `ParameterInfo` or `CompletionItem`.
		*
		* Please note that `MarkupKinds` must not start with a `$`. This kinds
		* are reserved for internal usage.
		*/
		var MarkupKind;
		(function(MarkupKind) {
			/**
			* Plain text is supported as a content format
			*/
			MarkupKind.PlainText = "plaintext";
			/**
			* Markdown is supported as a content format
			*/
			MarkupKind.Markdown = "markdown";
			/**
			* Checks whether the given value is a value of the {@link MarkupKind} type.
			*/
			function is(value) {
				var candidate = value;
				return candidate === MarkupKind.PlainText || candidate === MarkupKind.Markdown;
			}
			MarkupKind.is = is;
		})(MarkupKind || (exports$2.MarkupKind = MarkupKind = {}));
		var MarkupContent;
		(function(MarkupContent) {
			/**
			* Checks whether the given value conforms to the {@link MarkupContent} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(value) && MarkupKind.is(candidate.kind) && Is.string(candidate.value);
			}
			MarkupContent.is = is;
		})(MarkupContent || (exports$2.MarkupContent = MarkupContent = {}));
		/**
		* The kind of a completion entry.
		*/
		var CompletionItemKind;
		(function(CompletionItemKind) {
			CompletionItemKind.Text = 1;
			CompletionItemKind.Method = 2;
			CompletionItemKind.Function = 3;
			CompletionItemKind.Constructor = 4;
			CompletionItemKind.Field = 5;
			CompletionItemKind.Variable = 6;
			CompletionItemKind.Class = 7;
			CompletionItemKind.Interface = 8;
			CompletionItemKind.Module = 9;
			CompletionItemKind.Property = 10;
			CompletionItemKind.Unit = 11;
			CompletionItemKind.Value = 12;
			CompletionItemKind.Enum = 13;
			CompletionItemKind.Keyword = 14;
			CompletionItemKind.Snippet = 15;
			CompletionItemKind.Color = 16;
			CompletionItemKind.File = 17;
			CompletionItemKind.Reference = 18;
			CompletionItemKind.Folder = 19;
			CompletionItemKind.EnumMember = 20;
			CompletionItemKind.Constant = 21;
			CompletionItemKind.Struct = 22;
			CompletionItemKind.Event = 23;
			CompletionItemKind.Operator = 24;
			CompletionItemKind.TypeParameter = 25;
		})(CompletionItemKind || (exports$2.CompletionItemKind = CompletionItemKind = {}));
		/**
		* Defines whether the insert text in a completion item should be interpreted as
		* plain text or a snippet.
		*/
		var InsertTextFormat;
		(function(InsertTextFormat) {
			/**
			* The primary text to be inserted is treated as a plain string.
			*/
			InsertTextFormat.PlainText = 1;
			/**
			* The primary text to be inserted is treated as a snippet.
			*
			* A snippet can define tab stops and placeholders with `$1`, `$2`
			* and `${3:foo}`. `$0` defines the final tab stop, it defaults to
			* the end of the snippet. Placeholders with equal identifiers are linked,
			* that is typing in one will update others too.
			*
			* See also: https://microsoft.github.io/language-server-protocol/specifications/specification-current/#snippet_syntax
			*/
			InsertTextFormat.Snippet = 2;
		})(InsertTextFormat || (exports$2.InsertTextFormat = InsertTextFormat = {}));
		/**
		* Completion item tags are extra annotations that tweak the rendering of a completion
		* item.
		*
		* @since 3.15.0
		*/
		var CompletionItemTag;
		(function(CompletionItemTag) {
			/**
			* Render a completion as obsolete, usually using a strike-out.
			*/
			CompletionItemTag.Deprecated = 1;
		})(CompletionItemTag || (exports$2.CompletionItemTag = CompletionItemTag = {}));
		/**
		* The InsertReplaceEdit namespace provides functions to deal with insert / replace edits.
		*
		* @since 3.16.0
		*/
		var InsertReplaceEdit;
		(function(InsertReplaceEdit) {
			/**
			* Creates a new insert / replace edit
			*/
			function create(newText, insert, replace) {
				return {
					newText,
					insert,
					replace
				};
			}
			InsertReplaceEdit.create = create;
			/**
			* Checks whether the given literal conforms to the {@link InsertReplaceEdit} interface.
			*/
			function is(value) {
				var candidate = value;
				return candidate && Is.string(candidate.newText) && Range.is(candidate.insert) && Range.is(candidate.replace);
			}
			InsertReplaceEdit.is = is;
		})(InsertReplaceEdit || (exports$2.InsertReplaceEdit = InsertReplaceEdit = {}));
		/**
		* How whitespace and indentation is handled during completion
		* item insertion.
		*
		* @since 3.16.0
		*/
		var InsertTextMode;
		(function(InsertTextMode) {
			/**
			* The insertion or replace strings is taken as it is. If the
			* value is multi line the lines below the cursor will be
			* inserted using the indentation defined in the string value.
			* The client will not apply any kind of adjustments to the
			* string.
			*/
			InsertTextMode.asIs = 1;
			/**
			* The editor adjusts leading whitespace of new lines so that
			* they match the indentation up to the cursor of the line for
			* which the item is accepted.
			*
			* Consider a line like this: <2tabs><cursor><3tabs>foo. Accepting a
			* multi line completion item is indented using 2 tabs and all
			* following lines inserted will be indented using 2 tabs as well.
			*/
			InsertTextMode.adjustIndentation = 2;
		})(InsertTextMode || (exports$2.InsertTextMode = InsertTextMode = {}));
		/**
		* Defines how values from a set of defaults and an individual item will be
		* merged.
		*
		* @since 3.18.0
		*/
		var ApplyKind;
		(function(ApplyKind) {
			/**
			* The value from the individual item (if provided and not `null`) will be
			* used instead of the default.
			*/
			ApplyKind.Replace = 1;
			/**
			* The value from the item will be merged with the default.
			*
			* The specific rules for mergeing values are defined against each field
			* that supports merging.
			*/
			ApplyKind.Merge = 2;
		})(ApplyKind || (exports$2.ApplyKind = ApplyKind = {}));
		var CompletionItemLabelDetails;
		(function(CompletionItemLabelDetails) {
			function is(value) {
				var candidate = value;
				return candidate && (Is.string(candidate.detail) || candidate.detail === void 0) && (Is.string(candidate.description) || candidate.description === void 0);
			}
			CompletionItemLabelDetails.is = is;
		})(CompletionItemLabelDetails || (exports$2.CompletionItemLabelDetails = CompletionItemLabelDetails = {}));
		/**
		* The CompletionItem namespace provides functions to deal with
		* completion items.
		*/
		var CompletionItem;
		(function(CompletionItem) {
			/**
			* Create a completion item and seed it with a label.
			* @param label The completion item's label
			*/
			function create(label) {
				return { label };
			}
			CompletionItem.create = create;
		})(CompletionItem || (exports$2.CompletionItem = CompletionItem = {}));
		/**
		* The CompletionList namespace provides functions to deal with
		* completion lists.
		*/
		var CompletionList;
		(function(CompletionList) {
			/**
			* Creates a new completion list.
			*
			* @param items The completion items.
			* @param isIncomplete The list is not complete.
			*/
			function create(items, isIncomplete) {
				return {
					items: items ? items : [],
					isIncomplete: !!isIncomplete
				};
			}
			CompletionList.create = create;
		})(CompletionList || (exports$2.CompletionList = CompletionList = {}));
		var MarkedString;
		(function(MarkedString) {
			/**
			* Creates a marked string from plain text.
			*
			* @param plainText The plain text.
			*/
			function fromPlainText(plainText) {
				return plainText.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
			}
			MarkedString.fromPlainText = fromPlainText;
			/**
			* Checks whether the given value conforms to the {@link MarkedString} type.
			*/
			function is(value) {
				var candidate = value;
				return Is.string(candidate) || Is.objectLiteral(candidate) && Is.string(candidate.language) && Is.string(candidate.value);
			}
			MarkedString.is = is;
		})(MarkedString || (exports$2.MarkedString = MarkedString = {}));
		var Hover;
		(function(Hover) {
			/**
			* Checks whether the given value conforms to the {@link Hover} interface.
			*/
			function is(value) {
				var candidate = value;
				return !!candidate && Is.objectLiteral(candidate) && (MarkupContent.is(candidate.contents) || MarkedString.is(candidate.contents) || Is.typedArray(candidate.contents, MarkedString.is)) && (value.range === void 0 || Range.is(value.range));
			}
			Hover.is = is;
		})(Hover || (exports$2.Hover = Hover = {}));
		/**
		* The ParameterInformation namespace provides helper functions to work with
		* {@link ParameterInformation} literals.
		*/
		var ParameterInformation;
		(function(ParameterInformation) {
			/**
			* Creates a new parameter information literal.
			*
			* @param label A label string.
			* @param documentation A doc string.
			*/
			function create(label, documentation) {
				return documentation ? {
					label,
					documentation
				} : { label };
			}
			ParameterInformation.create = create;
		})(ParameterInformation || (exports$2.ParameterInformation = ParameterInformation = {}));
		/**
		* The SignatureInformation namespace provides helper functions to work with
		* {@link SignatureInformation} literals.
		*/
		var SignatureInformation;
		(function(SignatureInformation) {
			function create(label, documentation) {
				var parameters = [];
				for (var _i = 2; _i < arguments.length; _i++) parameters[_i - 2] = arguments[_i];
				var result = { label };
				if (Is.defined(documentation)) result.documentation = documentation;
				if (Is.defined(parameters)) result.parameters = parameters;
				else result.parameters = [];
				return result;
			}
			SignatureInformation.create = create;
		})(SignatureInformation || (exports$2.SignatureInformation = SignatureInformation = {}));
		/**
		* A document highlight kind.
		*/
		var DocumentHighlightKind;
		(function(DocumentHighlightKind) {
			/**
			* A textual occurrence.
			*/
			DocumentHighlightKind.Text = 1;
			/**
			* Read-access of a symbol, like reading a variable.
			*/
			DocumentHighlightKind.Read = 2;
			/**
			* Write-access of a symbol, like writing to a variable.
			*/
			DocumentHighlightKind.Write = 3;
		})(DocumentHighlightKind || (exports$2.DocumentHighlightKind = DocumentHighlightKind = {}));
		/**
		* DocumentHighlight namespace to provide helper functions to work with
		* {@link DocumentHighlight} literals.
		*/
		var DocumentHighlight;
		(function(DocumentHighlight) {
			/**
			* Create a DocumentHighlight object.
			* @param range The range the highlight applies to.
			* @param kind The highlight kind
			*/
			function create(range, kind) {
				var result = { range };
				if (Is.number(kind)) result.kind = kind;
				return result;
			}
			DocumentHighlight.create = create;
		})(DocumentHighlight || (exports$2.DocumentHighlight = DocumentHighlight = {}));
		/**
		* A symbol kind.
		*/
		var SymbolKind;
		(function(SymbolKind) {
			SymbolKind.File = 1;
			SymbolKind.Module = 2;
			SymbolKind.Namespace = 3;
			SymbolKind.Package = 4;
			SymbolKind.Class = 5;
			SymbolKind.Method = 6;
			SymbolKind.Property = 7;
			SymbolKind.Field = 8;
			SymbolKind.Constructor = 9;
			SymbolKind.Enum = 10;
			SymbolKind.Interface = 11;
			SymbolKind.Function = 12;
			SymbolKind.Variable = 13;
			SymbolKind.Constant = 14;
			SymbolKind.String = 15;
			SymbolKind.Number = 16;
			SymbolKind.Boolean = 17;
			SymbolKind.Array = 18;
			SymbolKind.Object = 19;
			SymbolKind.Key = 20;
			SymbolKind.Null = 21;
			SymbolKind.EnumMember = 22;
			SymbolKind.Struct = 23;
			SymbolKind.Event = 24;
			SymbolKind.Operator = 25;
			SymbolKind.TypeParameter = 26;
		})(SymbolKind || (exports$2.SymbolKind = SymbolKind = {}));
		/**
		* Symbol tags are extra annotations that tweak the rendering of a symbol.
		*
		* @since 3.16
		*/
		var SymbolTag;
		(function(SymbolTag) {
			/**
			* Render a symbol as obsolete, usually using a strike-out.
			*/
			SymbolTag.Deprecated = 1;
		})(SymbolTag || (exports$2.SymbolTag = SymbolTag = {}));
		var SymbolInformation;
		(function(SymbolInformation) {
			/**
			* Creates a new symbol information literal.
			*
			* @param name The name of the symbol.
			* @param kind The kind of the symbol.
			* @param range The range of the location of the symbol.
			* @param uri The resource of the location of symbol.
			* @param containerName The name of the symbol containing the symbol.
			*/
			function create(name, kind, range, uri, containerName) {
				var result = {
					name,
					kind,
					location: {
						uri,
						range
					}
				};
				if (containerName) result.containerName = containerName;
				return result;
			}
			SymbolInformation.create = create;
		})(SymbolInformation || (exports$2.SymbolInformation = SymbolInformation = {}));
		var WorkspaceSymbol;
		(function(WorkspaceSymbol) {
			/**
			* Create a new workspace symbol.
			*
			* @param name The name of the symbol.
			* @param kind The kind of the symbol.
			* @param uri The resource of the location of the symbol.
			* @param range An options range of the location.
			* @returns A WorkspaceSymbol.
			*/
			function create(name, kind, uri, range) {
				return range !== void 0 ? {
					name,
					kind,
					location: {
						uri,
						range
					}
				} : {
					name,
					kind,
					location: { uri }
				};
			}
			WorkspaceSymbol.create = create;
		})(WorkspaceSymbol || (exports$2.WorkspaceSymbol = WorkspaceSymbol = {}));
		var DocumentSymbol;
		(function(DocumentSymbol) {
			/**
			* Creates a new symbol information literal.
			*
			* @param name The name of the symbol.
			* @param detail The detail of the symbol.
			* @param kind The kind of the symbol.
			* @param range The range of the symbol.
			* @param selectionRange The selectionRange of the symbol.
			* @param children Children of the symbol.
			*/
			function create(name, detail, kind, range, selectionRange, children) {
				var result = {
					name,
					detail,
					kind,
					range,
					selectionRange
				};
				if (children !== void 0) result.children = children;
				return result;
			}
			DocumentSymbol.create = create;
			/**
			* Checks whether the given literal conforms to the {@link DocumentSymbol} interface.
			*/
			function is(value) {
				var candidate = value;
				return candidate && Is.string(candidate.name) && Is.number(candidate.kind) && Range.is(candidate.range) && Range.is(candidate.selectionRange) && (candidate.detail === void 0 || Is.string(candidate.detail)) && (candidate.deprecated === void 0 || Is.boolean(candidate.deprecated)) && (candidate.children === void 0 || Array.isArray(candidate.children)) && (candidate.tags === void 0 || Array.isArray(candidate.tags));
			}
			DocumentSymbol.is = is;
		})(DocumentSymbol || (exports$2.DocumentSymbol = DocumentSymbol = {}));
		/**
		* A set of predefined code action kinds
		*/
		var CodeActionKind;
		(function(CodeActionKind) {
			/**
			* Empty kind.
			*/
			CodeActionKind.Empty = "";
			/**
			* Base kind for quickfix actions: 'quickfix'
			*/
			CodeActionKind.QuickFix = "quickfix";
			/**
			* Base kind for refactoring actions: 'refactor'
			*/
			CodeActionKind.Refactor = "refactor";
			/**
			* Base kind for refactoring extraction actions: 'refactor.extract'
			*
			* Example extract actions:
			*
			* - Extract method
			* - Extract function
			* - Extract variable
			* - Extract interface from class
			* - ...
			*/
			CodeActionKind.RefactorExtract = "refactor.extract";
			/**
			* Base kind for refactoring inline actions: 'refactor.inline'
			*
			* Example inline actions:
			*
			* - Inline function
			* - Inline variable
			* - Inline constant
			* - ...
			*/
			CodeActionKind.RefactorInline = "refactor.inline";
			/**
			* Base kind for refactoring move actions: `refactor.move`
			*
			* Example move actions:
			*
			* - Move a function to a new file
			* - Move a property between classes
			* - Move method to base class
			* - ...
			*
			* @since 3.18.0
			*/
			CodeActionKind.RefactorMove = "refactor.move";
			/**
			* Base kind for refactoring rewrite actions: 'refactor.rewrite'
			*
			* Example rewrite actions:
			*
			* - Convert JavaScript function to class
			* - Add or remove parameter
			* - Encapsulate field
			* - Make method static
			* - Move method to base class
			* - ...
			*/
			CodeActionKind.RefactorRewrite = "refactor.rewrite";
			/**
			* Base kind for source actions: `source`
			*
			* Source code actions apply to the entire file.
			*/
			CodeActionKind.Source = "source";
			/**
			* Base kind for an organize imports source action: `source.organizeImports`
			*/
			CodeActionKind.SourceOrganizeImports = "source.organizeImports";
			/**
			* Base kind for auto-fix source actions: `source.fixAll`.
			*
			* Fix all actions automatically fix errors that have a clear fix that do not require user input.
			* They should not suppress errors or perform unsafe fixes such as generating new types or classes.
			*
			* @since 3.15.0
			*/
			CodeActionKind.SourceFixAll = "source.fixAll";
			/**
			* Base kind for all code actions applying to the entire notebook's scope. CodeActionKinds using
			* this should always begin with `notebook.`
			*
			* @since 3.18.0
			*/
			CodeActionKind.Notebook = "notebook";
		})(CodeActionKind || (exports$2.CodeActionKind = CodeActionKind = {}));
		/**
		* The reason why code actions were requested.
		*
		* @since 3.17.0
		*/
		var CodeActionTriggerKind;
		(function(CodeActionTriggerKind) {
			/**
			* Code actions were explicitly requested by the user or by an extension.
			*/
			CodeActionTriggerKind.Invoked = 1;
			/**
			* Code actions were requested automatically.
			*
			* This typically happens when current selection in a file changes, but can
			* also be triggered when file content changes.
			*/
			CodeActionTriggerKind.Automatic = 2;
		})(CodeActionTriggerKind || (exports$2.CodeActionTriggerKind = CodeActionTriggerKind = {}));
		/**
		* The CodeActionContext namespace provides helper functions to work with
		* {@link CodeActionContext} literals.
		*/
		var CodeActionContext;
		(function(CodeActionContext) {
			/**
			* Creates a new CodeActionContext literal.
			*/
			function create(diagnostics, only, triggerKind) {
				var result = { diagnostics };
				if (only !== void 0 && only !== null) result.only = only;
				if (triggerKind !== void 0 && triggerKind !== null) result.triggerKind = triggerKind;
				return result;
			}
			CodeActionContext.create = create;
			/**
			* Checks whether the given literal conforms to the {@link CodeActionContext} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Is.typedArray(candidate.diagnostics, Diagnostic.is) && (candidate.only === void 0 || Is.typedArray(candidate.only, Is.string)) && (candidate.triggerKind === void 0 || candidate.triggerKind === CodeActionTriggerKind.Invoked || candidate.triggerKind === CodeActionTriggerKind.Automatic);
			}
			CodeActionContext.is = is;
		})(CodeActionContext || (exports$2.CodeActionContext = CodeActionContext = {}));
		/**
		* Code action tags are extra annotations that tweak the behavior of a code action.
		*
		* @since 3.18.0
		*/
		var CodeActionTag;
		(function(CodeActionTag) {
			/**
			* Marks the code action as LLM-generated.
			*/
			CodeActionTag.LLMGenerated = 1;
			/**
			* Checks whether the given literal conforms to the {@link CodeActionTag} interface.
			*/
			function is(value) {
				return Is.defined(value) && value === CodeActionTag.LLMGenerated;
			}
			CodeActionTag.is = is;
		})(CodeActionTag || (exports$2.CodeActionTag = CodeActionTag = {}));
		var CodeAction;
		(function(CodeAction) {
			function create(title, kindOrCommandOrEdit, kind) {
				var result = { title };
				var checkKind = true;
				if (typeof kindOrCommandOrEdit === "string") {
					checkKind = false;
					result.kind = kindOrCommandOrEdit;
				} else if (Command.is(kindOrCommandOrEdit)) result.command = kindOrCommandOrEdit;
				else result.edit = kindOrCommandOrEdit;
				if (checkKind && kind !== void 0) result.kind = kind;
				return result;
			}
			CodeAction.create = create;
			function is(value) {
				var candidate = value;
				return candidate && Is.string(candidate.title) && (candidate.diagnostics === void 0 || Is.typedArray(candidate.diagnostics, Diagnostic.is)) && (candidate.kind === void 0 || Is.string(candidate.kind)) && (candidate.edit !== void 0 || candidate.command !== void 0) && (candidate.command === void 0 || Command.is(candidate.command)) && (candidate.isPreferred === void 0 || Is.boolean(candidate.isPreferred)) && (candidate.edit === void 0 || WorkspaceEdit.is(candidate.edit)) && (candidate.tags === void 0 || Is.typedArray(candidate.tags, CodeActionTag.is));
			}
			CodeAction.is = is;
		})(CodeAction || (exports$2.CodeAction = CodeAction = {}));
		/**
		* The CodeLens namespace provides helper functions to work with
		* {@link CodeLens} literals.
		*/
		var CodeLens;
		(function(CodeLens) {
			/**
			* Creates a new CodeLens literal.
			*/
			function create(range, data) {
				var result = { range };
				if (Is.defined(data)) result.data = data;
				return result;
			}
			CodeLens.create = create;
			/**
			* Checks whether the given literal conforms to the {@link CodeLens} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.command) || Command.is(candidate.command));
			}
			CodeLens.is = is;
		})(CodeLens || (exports$2.CodeLens = CodeLens = {}));
		/**
		* The FormattingOptions namespace provides helper functions to work with
		* {@link FormattingOptions} literals.
		*/
		var FormattingOptions;
		(function(FormattingOptions) {
			/**
			* Creates a new FormattingOptions literal.
			*/
			function create(tabSize, insertSpaces) {
				return {
					tabSize,
					insertSpaces
				};
			}
			FormattingOptions.create = create;
			/**
			* Checks whether the given literal conforms to the {@link FormattingOptions} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Is.uinteger(candidate.tabSize) && Is.boolean(candidate.insertSpaces);
			}
			FormattingOptions.is = is;
		})(FormattingOptions || (exports$2.FormattingOptions = FormattingOptions = {}));
		/**
		* The DocumentLink namespace provides helper functions to work with
		* {@link DocumentLink} literals.
		*/
		var DocumentLink;
		(function(DocumentLink) {
			/**
			* Creates a new DocumentLink literal.
			*/
			function create(range, target, data) {
				return {
					range,
					target,
					data
				};
			}
			DocumentLink.create = create;
			/**
			* Checks whether the given literal conforms to the {@link DocumentLink} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.target) || Is.string(candidate.target));
			}
			DocumentLink.is = is;
		})(DocumentLink || (exports$2.DocumentLink = DocumentLink = {}));
		/**
		* The SelectionRange namespace provides helper function to work with
		* SelectionRange literals.
		*/
		var SelectionRange;
		(function(SelectionRange) {
			/**
			* Creates a new SelectionRange
			* @param range the range.
			* @param parent an optional parent.
			*/
			function create(range, parent) {
				return {
					range,
					parent
				};
			}
			SelectionRange.create = create;
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && Range.is(candidate.range) && (candidate.parent === void 0 || SelectionRange.is(candidate.parent));
			}
			SelectionRange.is = is;
		})(SelectionRange || (exports$2.SelectionRange = SelectionRange = {}));
		/**
		* A set of predefined token types. This set is not fixed
		* an clients can specify additional token types via the
		* corresponding client capabilities.
		*
		* @since 3.16.0
		*/
		var SemanticTokenTypes;
		(function(SemanticTokenTypes) {
			SemanticTokenTypes["namespace"] = "namespace";
			/**
			* Represents a generic type. Acts as a fallback for types which can't be mapped to
			* a specific type like class or enum.
			*/
			SemanticTokenTypes["type"] = "type";
			SemanticTokenTypes["class"] = "class";
			SemanticTokenTypes["enum"] = "enum";
			SemanticTokenTypes["interface"] = "interface";
			SemanticTokenTypes["struct"] = "struct";
			SemanticTokenTypes["typeParameter"] = "typeParameter";
			SemanticTokenTypes["parameter"] = "parameter";
			SemanticTokenTypes["variable"] = "variable";
			SemanticTokenTypes["property"] = "property";
			SemanticTokenTypes["enumMember"] = "enumMember";
			SemanticTokenTypes["event"] = "event";
			SemanticTokenTypes["function"] = "function";
			SemanticTokenTypes["method"] = "method";
			SemanticTokenTypes["macro"] = "macro";
			SemanticTokenTypes["keyword"] = "keyword";
			SemanticTokenTypes["modifier"] = "modifier";
			SemanticTokenTypes["comment"] = "comment";
			SemanticTokenTypes["string"] = "string";
			SemanticTokenTypes["number"] = "number";
			SemanticTokenTypes["regexp"] = "regexp";
			SemanticTokenTypes["operator"] = "operator";
			/**
			* @since 3.17.0
			*/
			SemanticTokenTypes["decorator"] = "decorator";
			/**
			* @since 3.18.0
			*/
			SemanticTokenTypes["label"] = "label";
		})(SemanticTokenTypes || (exports$2.SemanticTokenTypes = SemanticTokenTypes = {}));
		/**
		* A set of predefined token modifiers. This set is not fixed
		* an clients can specify additional token types via the
		* corresponding client capabilities.
		*
		* @since 3.16.0
		*/
		var SemanticTokenModifiers;
		(function(SemanticTokenModifiers) {
			SemanticTokenModifiers["declaration"] = "declaration";
			SemanticTokenModifiers["definition"] = "definition";
			SemanticTokenModifiers["readonly"] = "readonly";
			SemanticTokenModifiers["static"] = "static";
			SemanticTokenModifiers["deprecated"] = "deprecated";
			SemanticTokenModifiers["abstract"] = "abstract";
			SemanticTokenModifiers["async"] = "async";
			SemanticTokenModifiers["modification"] = "modification";
			SemanticTokenModifiers["documentation"] = "documentation";
			SemanticTokenModifiers["defaultLibrary"] = "defaultLibrary";
		})(SemanticTokenModifiers || (exports$2.SemanticTokenModifiers = SemanticTokenModifiers = {}));
		/**
		* @since 3.16.0
		*/
		var SemanticTokens;
		(function(SemanticTokens) {
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && (candidate.resultId === void 0 || typeof candidate.resultId === "string") && Array.isArray(candidate.data) && (candidate.data.length === 0 || typeof candidate.data[0] === "number");
			}
			SemanticTokens.is = is;
		})(SemanticTokens || (exports$2.SemanticTokens = SemanticTokens = {}));
		/**
		* The InlineValueText namespace provides functions to deal with InlineValueTexts.
		*
		* @since 3.17.0
		*/
		var InlineValueText;
		(function(InlineValueText) {
			/**
			* Creates a new InlineValueText literal.
			*/
			function create(range, text) {
				return {
					range,
					text
				};
			}
			InlineValueText.create = create;
			function is(value) {
				var candidate = value;
				return candidate !== void 0 && candidate !== null && Range.is(candidate.range) && Is.string(candidate.text);
			}
			InlineValueText.is = is;
		})(InlineValueText || (exports$2.InlineValueText = InlineValueText = {}));
		/**
		* The InlineValueVariableLookup namespace provides functions to
		* deal with InlineValueVariableLookups.
		*
		* @since 3.17.0
		*/
		var InlineValueVariableLookup;
		(function(InlineValueVariableLookup) {
			/**
			* Creates a new InlineValueText literal.
			*/
			function create(range, variableName, caseSensitiveLookup) {
				return {
					range,
					variableName,
					caseSensitiveLookup
				};
			}
			InlineValueVariableLookup.create = create;
			function is(value) {
				var candidate = value;
				return candidate !== void 0 && candidate !== null && Range.is(candidate.range) && Is.boolean(candidate.caseSensitiveLookup) && (Is.string(candidate.variableName) || candidate.variableName === void 0);
			}
			InlineValueVariableLookup.is = is;
		})(InlineValueVariableLookup || (exports$2.InlineValueVariableLookup = InlineValueVariableLookup = {}));
		/**
		* The InlineValueEvaluatableExpression namespace provides functions to deal with InlineValueEvaluatableExpression.
		*
		* @since 3.17.0
		*/
		var InlineValueEvaluatableExpression;
		(function(InlineValueEvaluatableExpression) {
			/**
			* Creates a new InlineValueEvaluatableExpression literal.
			*/
			function create(range, expression) {
				return {
					range,
					expression
				};
			}
			InlineValueEvaluatableExpression.create = create;
			function is(value) {
				var candidate = value;
				return candidate !== void 0 && candidate !== null && Range.is(candidate.range) && (Is.string(candidate.expression) || candidate.expression === void 0);
			}
			InlineValueEvaluatableExpression.is = is;
		})(InlineValueEvaluatableExpression || (exports$2.InlineValueEvaluatableExpression = InlineValueEvaluatableExpression = {}));
		/**
		* The InlineValueContext namespace provides helper functions to work with
		* {@link InlineValueContext} literals.
		*
		* @since 3.17.0
		*/
		var InlineValueContext;
		(function(InlineValueContext) {
			/**
			* Creates a new InlineValueContext literal.
			*/
			function create(frameId, stoppedLocation) {
				return {
					frameId,
					stoppedLocation
				};
			}
			InlineValueContext.create = create;
			/**
			* Checks whether the given literal conforms to the {@link InlineValueContext} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Range.is(value.stoppedLocation);
			}
			InlineValueContext.is = is;
		})(InlineValueContext || (exports$2.InlineValueContext = InlineValueContext = {}));
		/**
		* Inlay hint kinds.
		*
		* @since 3.17.0
		*/
		var InlayHintKind;
		(function(InlayHintKind) {
			/**
			* An inlay hint that for a type annotation.
			*/
			InlayHintKind.Type = 1;
			/**
			* An inlay hint that is for a parameter.
			*/
			InlayHintKind.Parameter = 2;
			function is(value) {
				return value === 1 || value === 2;
			}
			InlayHintKind.is = is;
		})(InlayHintKind || (exports$2.InlayHintKind = InlayHintKind = {}));
		var InlayHintLabelPart;
		(function(InlayHintLabelPart) {
			function create(value) {
				return { value };
			}
			InlayHintLabelPart.create = create;
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && (candidate.tooltip === void 0 || Is.string(candidate.tooltip) || MarkupContent.is(candidate.tooltip)) && (candidate.location === void 0 || Location.is(candidate.location)) && (candidate.command === void 0 || Command.is(candidate.command));
			}
			InlayHintLabelPart.is = is;
		})(InlayHintLabelPart || (exports$2.InlayHintLabelPart = InlayHintLabelPart = {}));
		var InlayHint;
		(function(InlayHint) {
			function create(position, label, kind) {
				var result = {
					position,
					label
				};
				if (kind !== void 0) result.kind = kind;
				return result;
			}
			InlayHint.create = create;
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && Position.is(candidate.position) && (Is.string(candidate.label) || Is.typedArray(candidate.label, InlayHintLabelPart.is)) && (candidate.kind === void 0 || InlayHintKind.is(candidate.kind)) && candidate.textEdits === void 0 || Is.typedArray(candidate.textEdits, TextEdit.is) && (candidate.tooltip === void 0 || Is.string(candidate.tooltip) || MarkupContent.is(candidate.tooltip)) && (candidate.paddingLeft === void 0 || Is.boolean(candidate.paddingLeft)) && (candidate.paddingRight === void 0 || Is.boolean(candidate.paddingRight));
			}
			InlayHint.is = is;
		})(InlayHint || (exports$2.InlayHint = InlayHint = {}));
		var StringValue;
		(function(StringValue) {
			function createSnippet(value) {
				return {
					kind: "snippet",
					value
				};
			}
			StringValue.createSnippet = createSnippet;
			function isSnippet(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && candidate.kind === "snippet" && Is.string(candidate.value);
			}
			StringValue.isSnippet = isSnippet;
		})(StringValue || (exports$2.StringValue = StringValue = {}));
		var InlineCompletionItem;
		(function(InlineCompletionItem) {
			function create(insertText, filterText, range, command) {
				return {
					insertText,
					filterText,
					range,
					command
				};
			}
			InlineCompletionItem.create = create;
		})(InlineCompletionItem || (exports$2.InlineCompletionItem = InlineCompletionItem = {}));
		var InlineCompletionList;
		(function(InlineCompletionList) {
			function create(items) {
				return { items };
			}
			InlineCompletionList.create = create;
		})(InlineCompletionList || (exports$2.InlineCompletionList = InlineCompletionList = {}));
		/**
		* Describes how an {@link InlineCompletionItemProvider inline completion provider} was triggered.
		*
		* @since 3.18.0
		*/
		var InlineCompletionTriggerKind;
		(function(InlineCompletionTriggerKind) {
			/**
			* Completion was triggered explicitly by a user gesture.
			*/
			InlineCompletionTriggerKind.Invoked = 1;
			/**
			* Completion was triggered automatically while editing.
			*/
			InlineCompletionTriggerKind.Automatic = 2;
		})(InlineCompletionTriggerKind || (exports$2.InlineCompletionTriggerKind = InlineCompletionTriggerKind = {}));
		var SelectedCompletionInfo;
		(function(SelectedCompletionInfo) {
			function create(range, text) {
				return {
					range,
					text
				};
			}
			SelectedCompletionInfo.create = create;
		})(SelectedCompletionInfo || (exports$2.SelectedCompletionInfo = SelectedCompletionInfo = {}));
		var InlineCompletionContext;
		(function(InlineCompletionContext) {
			function create(triggerKind, selectedCompletionInfo) {
				return {
					triggerKind,
					selectedCompletionInfo
				};
			}
			InlineCompletionContext.create = create;
		})(InlineCompletionContext || (exports$2.InlineCompletionContext = InlineCompletionContext = {}));
		var WorkspaceFolder;
		(function(WorkspaceFolder) {
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && URI.is(candidate.uri) && Is.string(candidate.name);
			}
			WorkspaceFolder.is = is;
		})(WorkspaceFolder || (exports$2.WorkspaceFolder = WorkspaceFolder = {}));
		exports$2.EOL = [
			"\n",
			"\r\n",
			"\r"
		];
		/**
		* @deprecated Use the text document from the new vscode-languageserver-textdocument package.
		*/
		var TextDocument;
		(function(TextDocument) {
			/**
			* Creates a new ITextDocument literal from the given uri and content.
			* @param uri The document's uri.
			* @param languageId The document's language Id.
			* @param version The document's version.
			* @param content The document's content.
			*/
			function create(uri, languageId, version, content) {
				return new FullTextDocument(uri, languageId, version, content);
			}
			TextDocument.create = create;
			/**
			* Checks whether the given literal conforms to the {@link ITextDocument} interface.
			*/
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Is.string(candidate.uri) && (Is.undefined(candidate.languageId) || Is.string(candidate.languageId)) && Is.uinteger(candidate.lineCount) && Is.func(candidate.getText) && Is.func(candidate.positionAt) && Is.func(candidate.offsetAt) ? true : false;
			}
			TextDocument.is = is;
			function applyEdits(document, edits) {
				var text = document.getText();
				var sortedEdits = mergeSort(edits, function(a, b) {
					var diff = a.range.start.line - b.range.start.line;
					if (diff === 0) return a.range.start.character - b.range.start.character;
					return diff;
				});
				var lastModifiedOffset = text.length;
				for (var i = sortedEdits.length - 1; i >= 0; i--) {
					var e = sortedEdits[i];
					var startOffset = document.offsetAt(e.range.start);
					var endOffset = document.offsetAt(e.range.end);
					if (endOffset <= lastModifiedOffset) text = text.substring(0, startOffset) + e.newText + text.substring(endOffset, text.length);
					else throw new Error("Overlapping edit");
					lastModifiedOffset = startOffset;
				}
				return text;
			}
			TextDocument.applyEdits = applyEdits;
			function mergeSort(data, compare) {
				if (data.length <= 1) return data;
				var p = data.length / 2 | 0;
				var left = data.slice(0, p);
				var right = data.slice(p);
				mergeSort(left, compare);
				mergeSort(right, compare);
				var leftIdx = 0;
				var rightIdx = 0;
				var i = 0;
				while (leftIdx < left.length && rightIdx < right.length) if (compare(left[leftIdx], right[rightIdx]) <= 0) data[i++] = left[leftIdx++];
				else data[i++] = right[rightIdx++];
				while (leftIdx < left.length) data[i++] = left[leftIdx++];
				while (rightIdx < right.length) data[i++] = right[rightIdx++];
				return data;
			}
		})(TextDocument || (exports$2.TextDocument = TextDocument = {}));
		/**
		* @deprecated Use the text document from the new vscode-languageserver-textdocument package.
		*/
		var FullTextDocument = function() {
			function FullTextDocument(uri, languageId, version, content) {
				this._uri = uri;
				this._languageId = languageId;
				this._version = version;
				this._content = content;
				this._lineOffsets = void 0;
			}
			Object.defineProperty(FullTextDocument.prototype, "uri", {
				get: function() {
					return this._uri;
				},
				enumerable: false,
				configurable: true
			});
			Object.defineProperty(FullTextDocument.prototype, "languageId", {
				get: function() {
					return this._languageId;
				},
				enumerable: false,
				configurable: true
			});
			Object.defineProperty(FullTextDocument.prototype, "version", {
				get: function() {
					return this._version;
				},
				enumerable: false,
				configurable: true
			});
			FullTextDocument.prototype.getText = function(range) {
				if (range) {
					var start = this.offsetAt(range.start);
					var end = this.offsetAt(range.end);
					return this._content.substring(start, end);
				}
				return this._content;
			};
			FullTextDocument.prototype.update = function(event, version) {
				this._content = event.text;
				this._version = version;
				this._lineOffsets = void 0;
			};
			FullTextDocument.prototype.getLineOffsets = function() {
				if (this._lineOffsets === void 0) {
					var lineOffsets = [];
					var text = this._content;
					var isLineStart = true;
					for (var i = 0; i < text.length; i++) {
						if (isLineStart) {
							lineOffsets.push(i);
							isLineStart = false;
						}
						var ch = text.charAt(i);
						isLineStart = ch === "\r" || ch === "\n";
						if (ch === "\r" && i + 1 < text.length && text.charAt(i + 1) === "\n") i++;
					}
					if (isLineStart && text.length > 0) lineOffsets.push(text.length);
					this._lineOffsets = lineOffsets;
				}
				return this._lineOffsets;
			};
			FullTextDocument.prototype.positionAt = function(offset) {
				offset = Math.max(Math.min(offset, this._content.length), 0);
				var lineOffsets = this.getLineOffsets();
				var low = 0, high = lineOffsets.length;
				if (high === 0) return Position.create(0, offset);
				while (low < high) {
					var mid = Math.floor((low + high) / 2);
					if (lineOffsets[mid] > offset) high = mid;
					else low = mid + 1;
				}
				var line = low - 1;
				return Position.create(line, offset - lineOffsets[line]);
			};
			FullTextDocument.prototype.offsetAt = function(position) {
				var lineOffsets = this.getLineOffsets();
				if (position.line >= lineOffsets.length) return this._content.length;
				else if (position.line < 0) return 0;
				var lineOffset = lineOffsets[position.line];
				var nextLineOffset = position.line + 1 < lineOffsets.length ? lineOffsets[position.line + 1] : this._content.length;
				return Math.max(Math.min(lineOffset + position.character, nextLineOffset), lineOffset);
			};
			Object.defineProperty(FullTextDocument.prototype, "lineCount", {
				get: function() {
					return this.getLineOffsets().length;
				},
				enumerable: false,
				configurable: true
			});
			return FullTextDocument;
		}();
		var Is;
		(function(Is) {
			var toString = Object.prototype.toString;
			function defined(value) {
				return typeof value !== "undefined";
			}
			Is.defined = defined;
			function undefined(value) {
				return typeof value === "undefined";
			}
			Is.undefined = undefined;
			function boolean(value) {
				return value === true || value === false;
			}
			Is.boolean = boolean;
			function string(value) {
				return toString.call(value) === "[object String]";
			}
			Is.string = string;
			function number(value) {
				return toString.call(value) === "[object Number]";
			}
			Is.number = number;
			function numberRange(value, min, max) {
				return toString.call(value) === "[object Number]" && min <= value && value <= max;
			}
			Is.numberRange = numberRange;
			function integer(value) {
				return toString.call(value) === "[object Number]" && -2147483648 <= value && value <= 2147483647;
			}
			Is.integer = integer;
			function uinteger(value) {
				return toString.call(value) === "[object Number]" && 0 <= value && value <= 2147483647;
			}
			Is.uinteger = uinteger;
			function func(value) {
				return toString.call(value) === "[object Function]";
			}
			Is.func = func;
			function objectLiteral(value) {
				return value !== null && typeof value === "object";
			}
			Is.objectLiteral = objectLiteral;
			function typedArray(value, check) {
				return Array.isArray(value) && value.every(check);
			}
			Is.typedArray = typedArray;
		})(Is || (Is = {}));
	});
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/line.js
var require_line = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Line = void 0;
	var Line = class {
		constructor(document, range) {
			this.document = document;
			this.range = range;
		}
		getRange() {
			return this.range;
		}
		getTextContent() {
			return this.document.getText().substring(this.document.offsetAt(this.range.start), this.document.offsetAt(this.range.end));
		}
		isAfter(line) {
			return this.range.start.line > line.range.start.line;
		}
		isBefore(line) {
			return this.range.start.line < line;
		}
	};
	exports.Line = Line;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/util.js
var require_util = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Util = void 0;
	exports.Util = class Util {
		static isUTF8BOM(char) {
			const uintArray = Uint8Array.from(Buffer.from(char, "UTF-8"));
			return uintArray[0] === 239 && uintArray[1] == 187 && uintArray[2] == 191;
		}
		static isWhitespace(char) {
			return char === " " || char === "	" || Util.isNewline(char);
		}
		static isNewline(char) {
			return char === "\r" || char === "\n";
		}
		static findLeadingNonWhitespace(content, escapeChar) {
			whitespaceCheck: for (let i = 0; i < content.length; i++) switch (content.charAt(i)) {
				case " ":
				case "	": continue;
				case escapeChar:
					escapeCheck: for (let j = i + 1; j < content.length; j++) switch (content.charAt(j)) {
						case " ":
						case "	": continue;
						case "\r":
							i = j + 1;
							continue whitespaceCheck;
						case "\n":
							i = j;
							continue whitespaceCheck;
						default: break escapeCheck;
					}
					return -1;
				default: return i;
			}
			return -1;
		}
		/**
		* Determines if the given position is contained within the given range.
		*
		* @param position the position to check
		* @param range the range to see if the position is inside of
		*/
		static isInsideRange(position, range) {
			if (range.start.line === range.end.line) return range.start.line === position.line && range.start.character <= position.character && position.character <= range.end.character;
			else if (range.start.line === position.line) return range.start.character <= position.character;
			else if (range.end.line === position.line) return position.character <= range.end.character;
			return range.start.line < position.line && position.line < range.end.line;
		}
		static parseHeredocName(value) {
			value = value.substring(2);
			if (value.charAt(0) === "-") value = value.substring(1);
			if (value.charAt(0) === "\"") {
				if (value.charAt(value.length - 1) !== "\"") return null;
				value = value.substring(1, value.length - 1);
			}
			if (value.charAt(0) === "'") {
				if (value.charAt(value.length - 1) !== "'") return null;
				value = value.substring(1, value.length - 1);
			}
			if (value.charAt(0) === "<") return null;
			return value;
		}
	};
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/comment.js
var require_comment = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Comment = void 0;
	var vscode_languageserver_types_1 = require_main$2();
	var line_1 = require_line();
	var util_1 = require_util();
	var Comment = class extends line_1.Line {
		constructor(document, range) {
			super(document, range);
		}
		toString() {
			const content = this.getContent();
			if (content) return "# " + content;
			return "#";
		}
		/**
		* Returns the content of this comment. This excludes leading and
		* trailing whitespace as well as the # symbol. If the comment only
		* consists of whitespace, the empty string will be returned.
		*/
		getContent() {
			let range = this.getContentRange();
			if (range === null) return "";
			return this.document.getText().substring(this.document.offsetAt(range.start), this.document.offsetAt(range.end));
		}
		/**
		* Returns a range that includes the content of the comment
		* excluding any leading and trailing whitespace as well as the #
		* symbol. May return null if the comment only consists of whitespace
		* characters.
		*/
		getContentRange() {
			let range = this.getRange();
			const startOffset = this.document.offsetAt(range.start);
			let raw = this.document.getText().substring(startOffset, this.document.offsetAt(range.end));
			let start = -1;
			let end = -1;
			for (let i = 1; i < raw.length; i++) if (!util_1.Util.isWhitespace(raw.charAt(i))) {
				start = i;
				break;
			}
			if (start === -1) return null;
			for (let i = raw.length - 1; i >= 1; i--) if (!util_1.Util.isWhitespace(raw.charAt(i))) {
				end = i + 1;
				break;
			}
			return vscode_languageserver_types_1.Range.create(this.document.positionAt(startOffset + start), this.document.positionAt(startOffset + end));
		}
	};
	exports.Comment = Comment;
}));
//#endregion
//#region node_modules/.pnpm/vscode-languageserver-textdocument@1.0.14/node_modules/vscode-languageserver-textdocument/lib/umd/main.js
var require_main$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __spreadArray = exports && exports.__spreadArray || function(to, from, pack) {
		if (pack || arguments.length === 2) {
			for (var i = 0, l = from.length, ar; i < l; i++) if (ar || !(i in from)) {
				if (!ar) ar = Array.prototype.slice.call(from, 0, i);
				ar[i] = from[i];
			}
		}
		return to.concat(ar || Array.prototype.slice.call(from));
	};
	(function(factory) {
		if (typeof module === "object" && typeof module.exports === "object") {
			var v = factory(__require, exports);
			if (v !== void 0) module.exports = v;
		} else if (typeof define === "function" && define.amd) define(["require", "exports"], factory);
	})(function(require, exports$1) {
		"use strict";
		Object.defineProperty(exports$1, "__esModule", { value: true });
		exports$1.TextDocument = void 0;
		var FullTextDocument = function() {
			function FullTextDocument(uri, languageId, version, content) {
				this._uri = uri;
				this._languageId = languageId;
				this._version = version;
				this._content = content;
				this._lineOffsets = void 0;
			}
			Object.defineProperty(FullTextDocument.prototype, "uri", {
				get: function() {
					return this._uri;
				},
				enumerable: false,
				configurable: true
			});
			Object.defineProperty(FullTextDocument.prototype, "languageId", {
				get: function() {
					return this._languageId;
				},
				enumerable: false,
				configurable: true
			});
			Object.defineProperty(FullTextDocument.prototype, "version", {
				get: function() {
					return this._version;
				},
				enumerable: false,
				configurable: true
			});
			FullTextDocument.prototype.getText = function(range) {
				if (range) {
					var start = this.offsetAt(range.start);
					var end = this.offsetAt(range.end);
					return this._content.substring(start, end);
				}
				return this._content;
			};
			FullTextDocument.prototype.update = function(changes, version) {
				for (var _i = 0, changes_1 = changes; _i < changes_1.length; _i++) {
					var change = changes_1[_i];
					if (FullTextDocument.isIncremental(change)) {
						var range = getWellformedRange(change.range);
						var startOffset = this.offsetAt(range.start);
						var endOffset = this.offsetAt(range.end);
						this._content = this._content.substring(0, startOffset) + change.text + this._content.substring(endOffset, this._content.length);
						var startLine = Math.max(range.start.line, 0);
						var endLine = Math.max(range.end.line, 0);
						var lineOffsets = this._lineOffsets;
						var addedLineOffsets = computeLineOffsets(change.text, false, startOffset);
						if (endLine - startLine === addedLineOffsets.length) for (var i = 0, len = addedLineOffsets.length; i < len; i++) lineOffsets[i + startLine + 1] = addedLineOffsets[i];
						else if (addedLineOffsets.length < 1e4) lineOffsets.splice.apply(lineOffsets, __spreadArray([startLine + 1, endLine - startLine], addedLineOffsets, false));
						else this._lineOffsets = lineOffsets = lineOffsets.slice(0, startLine + 1).concat(addedLineOffsets, lineOffsets.slice(endLine + 1));
						var diff = change.text.length - (endOffset - startOffset);
						if (diff !== 0) for (var i = startLine + 1 + addedLineOffsets.length, len = lineOffsets.length; i < len; i++) lineOffsets[i] = lineOffsets[i] + diff;
					} else if (FullTextDocument.isFull(change)) {
						this._content = change.text;
						this._lineOffsets = void 0;
					} else throw new Error("Unknown change event received");
				}
				this._version = version;
			};
			FullTextDocument.prototype.getLineOffsets = function() {
				if (this._lineOffsets === void 0) this._lineOffsets = computeLineOffsets(this._content, true);
				return this._lineOffsets;
			};
			FullTextDocument.prototype.positionAt = function(offset) {
				offset = Math.max(Math.min(offset, this._content.length), 0);
				var lineOffsets = this.getLineOffsets();
				var low = 0, high = lineOffsets.length;
				if (high === 0) return {
					line: 0,
					character: offset
				};
				while (low < high) {
					var mid = Math.floor((low + high) / 2);
					if (lineOffsets[mid] > offset) high = mid;
					else low = mid + 1;
				}
				var line = low - 1;
				offset = this.ensureBeforeEOL(offset, lineOffsets[line]);
				return {
					line,
					character: offset - lineOffsets[line]
				};
			};
			FullTextDocument.prototype.offsetAt = function(position) {
				var lineOffsets = this.getLineOffsets();
				if (position.line >= lineOffsets.length) return this._content.length;
				else if (position.line < 0) return 0;
				var lineOffset = lineOffsets[position.line];
				if (position.character <= 0) return lineOffset;
				var nextLineOffset = position.line + 1 < lineOffsets.length ? lineOffsets[position.line + 1] : this._content.length;
				var offset = Math.min(lineOffset + position.character, nextLineOffset);
				return this.ensureBeforeEOL(offset, lineOffset);
			};
			FullTextDocument.prototype.getLineRange = function(line) {
				var lineOffsets = this.getLineOffsets();
				if (line >= lineOffsets.length) {
					var lastLine = lineOffsets.length - 1;
					return {
						start: {
							line: lastLine,
							character: 0
						},
						end: {
							line: lastLine,
							character: this._content.length - lineOffsets[lastLine]
						}
					};
				} else if (line < 0) return {
					start: {
						line: 0,
						character: 0
					},
					end: {
						line: 0,
						character: 0
					}
				};
				var startOffset = lineOffsets[line];
				var nextLineOffset = line + 1 < lineOffsets.length ? lineOffsets[line + 1] : this._content.length;
				var endOffset = this.ensureBeforeEOL(nextLineOffset, startOffset);
				return {
					start: {
						line,
						character: 0
					},
					end: {
						line,
						character: endOffset - startOffset
					}
				};
			};
			FullTextDocument.prototype.getEOLCharacters = function(line) {
				var lineOffsets = this.getLineOffsets();
				if (line >= lineOffsets.length) return "";
				else if (line < 0) return "";
				var nextLineOffset = line + 1 < lineOffsets.length ? lineOffsets[line + 1] : this._content.length;
				var eolOffset = this.ensureBeforeEOL(nextLineOffset, lineOffsets[line]);
				return this._content.substring(eolOffset, nextLineOffset);
			};
			FullTextDocument.prototype.ensureBeforeEOL = function(offset, lineOffset) {
				while (offset > lineOffset && isEOL(this._content.charCodeAt(offset - 1))) offset--;
				return offset;
			};
			Object.defineProperty(FullTextDocument.prototype, "lineCount", {
				get: function() {
					return this.getLineOffsets().length;
				},
				enumerable: false,
				configurable: true
			});
			FullTextDocument.isIncremental = function(event) {
				var candidate = event;
				return candidate !== void 0 && candidate !== null && typeof candidate.text === "string" && candidate.range !== void 0 && (candidate.rangeLength === void 0 || typeof candidate.rangeLength === "number");
			};
			FullTextDocument.isFull = function(event) {
				var candidate = event;
				return candidate !== void 0 && candidate !== null && typeof candidate.text === "string" && candidate.range === void 0 && candidate.rangeLength === void 0;
			};
			return FullTextDocument;
		}();
		var TextDocument;
		(function(TextDocument) {
			/**
			* Creates a new text document.
			*
			* @param uri The document's uri.
			* @param languageId  The document's language Id.
			* @param version The document's initial version number.
			* @param content The document's content.
			*/
			function create(uri, languageId, version, content) {
				return new FullTextDocument(uri, languageId, version, content);
			}
			TextDocument.create = create;
			/**
			* Updates a TextDocument by modifying its content.
			*
			* @param document the document to update. Only documents created by TextDocument.create are valid inputs.
			* @param changes the changes to apply to the document.
			* @param version the changes version for the document.
			* @returns The updated TextDocument. Note: That's the same document instance passed in as first parameter.
			*
			*/
			function update(document, changes, version) {
				if (document instanceof FullTextDocument) {
					document.update(changes, version);
					return document;
				} else throw new Error("TextDocument.update: document must be created by TextDocument.create");
			}
			TextDocument.update = update;
			function applyEdits(document, edits) {
				var text = document.getText();
				var sortedEdits = mergeSort(edits.map(getWellformedEdit), function(a, b) {
					var diff = a.range.start.line - b.range.start.line;
					if (diff === 0) return a.range.start.character - b.range.start.character;
					return diff;
				});
				var lastModifiedOffset = 0;
				var spans = [];
				for (var _i = 0, sortedEdits_1 = sortedEdits; _i < sortedEdits_1.length; _i++) {
					var e = sortedEdits_1[_i];
					var startOffset = document.offsetAt(e.range.start);
					if (startOffset < lastModifiedOffset) throw new Error("Overlapping edit");
					else if (startOffset > lastModifiedOffset) spans.push(text.substring(lastModifiedOffset, startOffset));
					if (e.newText.length) spans.push(e.newText);
					lastModifiedOffset = document.offsetAt(e.range.end);
				}
				spans.push(text.substr(lastModifiedOffset));
				return spans.join("");
			}
			TextDocument.applyEdits = applyEdits;
		})(TextDocument || (exports$1.TextDocument = TextDocument = {}));
		function mergeSort(data, compare) {
			if (data.length <= 1) return data;
			var p = data.length / 2 | 0;
			var left = data.slice(0, p);
			var right = data.slice(p);
			mergeSort(left, compare);
			mergeSort(right, compare);
			var leftIdx = 0;
			var rightIdx = 0;
			var i = 0;
			while (leftIdx < left.length && rightIdx < right.length) if (compare(left[leftIdx], right[rightIdx]) <= 0) data[i++] = left[leftIdx++];
			else data[i++] = right[rightIdx++];
			while (leftIdx < left.length) data[i++] = left[leftIdx++];
			while (rightIdx < right.length) data[i++] = right[rightIdx++];
			return data;
		}
		function computeLineOffsets(text, isAtLineStart, textOffset) {
			if (textOffset === void 0) textOffset = 0;
			var result = isAtLineStart ? [textOffset] : [];
			for (var i = 0; i < text.length; i++) {
				var ch = text.charCodeAt(i);
				if (isEOL(ch)) {
					if (ch === 13 && i + 1 < text.length && text.charCodeAt(i + 1) === 10) i++;
					result.push(textOffset + i + 1);
				}
			}
			return result;
		}
		function isEOL(char) {
			return char === 13 || char === 10;
		}
		function getWellformedRange(range) {
			var start = range.start;
			var end = range.end;
			if (start.line > end.line || start.line === end.line && start.character > end.character) return {
				start: end,
				end: start
			};
			return range;
		}
		function getWellformedEdit(textEdit) {
			var range = getWellformedRange(textEdit.range);
			if (range !== textEdit.range) return {
				newText: textEdit.newText,
				range
			};
			return textEdit;
		}
	});
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/parserDirective.js
var require_parserDirective = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ParserDirective = void 0;
	var main_1 = require_main();
	var line_1 = require_line();
	var ParserDirective = class extends line_1.Line {
		constructor(document, range, nameRange, valueRange) {
			super(document, range);
			this.nameRange = nameRange;
			this.valueRange = valueRange;
		}
		toString() {
			return "# " + this.getName() + "=" + this.getValue();
		}
		getNameRange() {
			return this.nameRange;
		}
		getValueRange() {
			return this.valueRange;
		}
		getName() {
			return this.document.getText().substring(this.document.offsetAt(this.nameRange.start), this.document.offsetAt(this.nameRange.end));
		}
		getValue() {
			return this.document.getText().substring(this.document.offsetAt(this.valueRange.start), this.document.offsetAt(this.valueRange.end));
		}
		getDirective() {
			const directive = main_1.Directive[this.getName().toLowerCase()];
			return directive === void 0 ? null : directive;
		}
	};
	exports.ParserDirective = ParserDirective;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/heredoc.js
var require_heredoc = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Heredoc = void 0;
	/**
	* Heredoc represents a here-document that has been embedded in a
	* Dockerfile.
	*
	* This API is experimental and subject to change.
	*/
	var Heredoc = class {
		constructor(startRange, name, nameRange, contentRange, endRange) {
			this.startRange = startRange;
			this.name = name;
			this.nameRange = nameRange;
			this.contentRange = contentRange;
			this.endRange = endRange;
		}
		/**
		* Returns the name of the here-document.
		*
		* This API is experimental and subject to change.
		*/
		getName() {
			return this.name;
		}
		/**
		* Returns the range of the start operator and the name. If the
		* here-document is initialized with <<EOT then the start range would
		* encompass all five characters.
		*
		* This API is experimental and subject to change.
		*/
		getStartRange() {
			return this.startRange;
		}
		/**
		* Returns the range of this here-document's name that is declared at
		* the beginning of the here-document with the operator. If the
		* here-document is initialized with <<EOT then the name range would
		* encompass the latter three "EOT" characters.
		*
		* This API is experimental and subject to change.
		*/
		getNameRange() {
			return this.nameRange;
		}
		/**
		* Returns the range of the content of this here-document. This may
		* be null if the here-document has no content because:
		* - the start range is the only thing that was declared
		* - the end range was declared immediately and there is no content
		*
		* This API is experimental and subject to change.
		*/
		getContentRange() {
			return this.contentRange;
		}
		/**
		* Returns the range of the here-document's name on a line that
		* represents the end of the here-document.
		*
		* This API is experimental and subject to change.
		*/
		getDelimiterRange() {
			return this.endRange;
		}
	};
	exports.Heredoc = Heredoc;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/variable.js
var require_variable = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Variable = void 0;
	var Variable = class {
		constructor(name, nameRange, range, modifier, modifierRange, substitutionParameter, substitutionRange, defined, buildVariable, stringValue) {
			this.name = name;
			this.nameRange = nameRange;
			this.range = range;
			this.modifier = modifier;
			this.modifierRange = modifierRange;
			this.substitutionParameter = substitutionParameter;
			this.substitutionRange = substitutionRange;
			this.defined = defined;
			this.buildVariable = buildVariable;
			this.stringValue = stringValue;
		}
		toString() {
			return this.stringValue;
		}
		getName() {
			return this.name;
		}
		getNameRange() {
			return this.nameRange;
		}
		/**
		* Returns the range of the entire variable. This includes the symbols for
		* the declaration of the variable such as the $, {, and } symbols.
		*
		* @return the range in the document that this variable encompasses in its
		*         entirety
		*/
		getRange() {
			return this.range;
		}
		/**
		* Returns the modifier character that has been set for
		* specifying how this variable should be expanded and resolved.
		* If this variable is ${variable:+value} then the modifier
		* character is '+'. Will be the empty string if the variable is
		* declared as ${variable:}. Otherwise, will be null if this
		* variable will not use variable substitution at all (such as
		* ${variable} or $variable).
		*
		* @return this variable's modifier character, or the empty
		*         string if it does not have one, or null if this
		*         variable will not use variable substitution
		*/
		getModifier() {
			return this.modifier;
		}
		getModifierRange() {
			return this.modifierRange;
		}
		/**
		* Returns the parameter that will be used for substitution if
		* this variable uses modifiers to define how its value should be
		* resolved. If this variable is ${variable:+value} then the
		* substitution value will be 'value'. Will be the empty string
		* if the variable is declared as ${variable:+} or some other
		* variant where the only thing that follows the modifier
		* character (excluding considerations of escape characters and
		* so on) is the variable's closing bracket. May be null if this
		* variable does not have a modifier character defined (such as
		* ${variable} or $variable).
		*
		* @return this variable's substitution parameter, or the empty
		*         string if it does not have one, or null if there is
		*         not one defined
		*/
		getSubstitutionParameter() {
			return this.substitutionParameter;
		}
		getSubstitutionRange() {
			return this.substitutionRange;
		}
		/**
		* Returns whether this variable has been defined or not.
		*
		* @return true if this variable has been defined, false otherwise
		*/
		isDefined() {
			return this.defined;
		}
		isBuildVariable() {
			return this.buildVariable === true;
		}
		isEnvironmentVariable() {
			return this.buildVariable === false;
		}
	};
	exports.Variable = Variable;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instruction.js
var require_instruction = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Instruction = void 0;
	var vscode_languageserver_types_1 = require_main$2();
	var util_1 = require_util();
	var line_1 = require_line();
	var argument_1 = require_argument();
	var heredoc_1 = require_heredoc();
	var variable_1 = require_variable();
	var main_1 = require_main();
	var Instruction = class extends line_1.Line {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range);
			this.dockerfile = dockerfile;
			this.escapeChar = escapeChar;
			this.instruction = instruction;
			this.instructionRange = instructionRange;
		}
		toString() {
			let value = this.getKeyword();
			for (let arg of this.getRawArguments()) {
				value += " ";
				value += arg.getValue();
			}
			return value;
		}
		getRangeContent(range) {
			if (range === null) return null;
			return this.document.getText().substring(this.document.offsetAt(range.start), this.document.offsetAt(range.end));
		}
		getInstructionRange() {
			return this.instructionRange;
		}
		getInstruction() {
			return this.instruction;
		}
		getKeyword() {
			return this.getInstruction().toUpperCase();
		}
		getArgumentsRange() {
			let args = this.getArguments();
			if (args.length === 0) return null;
			return vscode_languageserver_types_1.Range.create(args[0].getRange().start, args[args.length - 1].getRange().end);
		}
		getArgumentsRanges() {
			let args = this.getArguments();
			if (args.length === 0) return [];
			if (args[0].getRange().start.line === args[args.length - 1].getRange().end.line) return [vscode_languageserver_types_1.Range.create(args[0].getRange().start, args[args.length - 1].getRange().end)];
			let ranges = [];
			let end = -1;
			let startPosition = args[0].getRange().start;
			let range = this.getInstructionRange();
			let extra = this.document.offsetAt(startPosition) - this.document.offsetAt(range.start);
			let fullArgs = this.getTextContent().substring(extra, this.document.offsetAt(args[args.length - 1].getRange().end) - this.document.offsetAt(range.start));
			let offset = this.document.offsetAt(range.start) + extra;
			let comment = false;
			for (let i = 0; i < fullArgs.length; i++) {
				let char = fullArgs.charAt(i);
				if (char === this.escapeChar) {
					let next = fullArgs.charAt(i + 1);
					if (next === " " || next === "	") whitespaceCheck: for (let j = i + 2; j < fullArgs.length; j++) switch (fullArgs.charAt(j)) {
						case " ":
						case "	": continue;
						case "\r": j++;
						case "\n":
							if (startPosition !== null) ranges.push(vscode_languageserver_types_1.Range.create(startPosition, this.document.positionAt(offset + end + 1)));
							startPosition = null;
							comment = false;
							i = j;
							break whitespaceCheck;
						default: break whitespaceCheck;
					}
					else if (next === "\r") {
						if (startPosition !== null) {
							ranges.push(vscode_languageserver_types_1.Range.create(startPosition, this.document.positionAt(offset + end + 1)));
							startPosition = null;
						}
						comment = false;
						i += 2;
					} else if (next === "\n") {
						if (startPosition !== null) ranges.push(vscode_languageserver_types_1.Range.create(startPosition, this.document.positionAt(offset + end + 1)));
						startPosition = null;
						comment = false;
						i++;
					} else i++;
				} else if (util_1.Util.isNewline(char)) {
					if (comment) {
						startPosition = null;
						comment = false;
					}
				} else if (!comment) {
					if (startPosition === null) {
						if (char === "#") {
							comment = true;
							continue;
						}
						let position = this.document.positionAt(offset + i);
						if (position.character !== 0) startPosition = vscode_languageserver_types_1.Position.create(position.line, 0);
					}
					end = i;
				}
			}
			if (startPosition === null) ranges.push(vscode_languageserver_types_1.Range.create(this.document.positionAt(offset + end), this.document.positionAt(offset + end + 1)));
			else ranges.push(vscode_languageserver_types_1.Range.create(startPosition, this.document.positionAt(offset + end + 1)));
			return ranges;
		}
		getRawArgumentsContent() {
			let args = this.getArguments();
			if (args.length === 0) return null;
			return this.getRangeContent(vscode_languageserver_types_1.Range.create(args[0].getRange().start, args[args.length - 1].getRange().end));
		}
		getArgumentsContent() {
			if (this.getArguments().length === 0) return null;
			let content = "";
			let ranges = this.getArgumentsRanges();
			let documentText = this.document.getText();
			for (let range of ranges) content += documentText.substring(this.document.offsetAt(range.start), this.document.offsetAt(range.end));
			return content;
		}
		getArguments() {
			return this.getRawArguments();
		}
		getRawArguments() {
			let args = [];
			let range = this.getInstructionRange();
			let extra = this.document.offsetAt(range.end) - this.document.offsetAt(range.start);
			let fullArgs = this.getTextContent().substring(extra);
			let offset = this.document.offsetAt(range.start) + extra;
			let start = false;
			let comment = false;
			let found = -1;
			let escapedWhitespaceDetected = false;
			let escaping = false;
			let escapeMarker = -1;
			let escapedArg = "";
			for (let i = 0; i < fullArgs.length; i++) {
				let char = fullArgs.charAt(i);
				if (util_1.Util.isWhitespace(char)) {
					if (escaping) {
						escapedWhitespaceDetected = true;
						if (util_1.Util.isNewline(char)) {
							escapedWhitespaceDetected = false;
							if (comment) {
								comment = false;
								start = true;
							}
						}
						continue;
					} else if (found !== -1) {
						if (escapeMarker === -1) args.push(new argument_1.Argument(escapedArg, vscode_languageserver_types_1.Range.create(this.document.positionAt(offset + found), this.document.positionAt(offset + i))));
						else args.push(new argument_1.Argument(escapedArg, vscode_languageserver_types_1.Range.create(this.document.positionAt(offset + found), this.document.positionAt(offset + escapeMarker))));
						escapeMarker = -1;
						escapedArg = "";
						found = -1;
					}
				} else if (char === this.escapeChar) {
					let next = fullArgs.charAt(i + 1);
					if (next === " " || next === "	") whitespaceCheck: for (let j = i + 2; j < fullArgs.length; j++) switch (fullArgs.charAt(j)) {
						case " ":
						case "	": continue;
						case "\r": j++;
						case "\n":
							comment = false;
							escaping = true;
							start = true;
							if (found !== -1) escapeMarker = i;
							i = j;
							break whitespaceCheck;
						default:
							escapeMarker = i;
							if (found === -1) i = j - 1;
							break whitespaceCheck;
					}
					else if (next === "\r") {
						comment = false;
						escaping = true;
						start = true;
						if (found !== -1 && escapeMarker === -1) escapeMarker = i;
						i += 2;
					} else if (next === "\n") {
						comment = false;
						escaping = true;
						start = true;
						if (found !== -1 && escapeMarker === -1) escapeMarker = i;
						i++;
					} else {
						if (escapedWhitespaceDetected && escapeMarker !== -1) {
							args.push(new argument_1.Argument(escapedArg, vscode_languageserver_types_1.Range.create(this.document.positionAt(offset + found), this.document.positionAt(offset + escapeMarker))));
							escapedArg = "";
							found = -1;
						}
						escapeMarker = -1;
						escapedWhitespaceDetected = false;
						escaping = false;
						if (next === "$") escapedArg = escapedArg + char + next;
						else if (next === "") break;
						else escapedArg = escapedArg + next;
						if (found === -1) found = i;
						i++;
					}
				} else if (!comment) {
					if (start && char === "#") comment = true;
					else {
						if (escapedWhitespaceDetected && escapeMarker !== -1) {
							args.push(new argument_1.Argument(escapedArg, vscode_languageserver_types_1.Range.create(this.document.positionAt(offset + found), this.document.positionAt(offset + escapeMarker))));
							escapedArg = "";
							found = -1;
						}
						escapedWhitespaceDetected = false;
						escaping = false;
						escapeMarker = -1;
						escapedArg = escapedArg + char;
						if (found === -1) found = i;
					}
					start = false;
				}
			}
			if (found !== -1) if (escapeMarker === -1) args.push(new argument_1.Argument(escapedArg, vscode_languageserver_types_1.Range.create(this.document.positionAt(offset + found), this.document.positionAt(offset + fullArgs.length))));
			else args.push(new argument_1.Argument(escapedArg, vscode_languageserver_types_1.Range.create(this.document.positionAt(offset + found), this.document.positionAt(offset + escapeMarker))));
			return args;
		}
		getExpandedArguments() {
			let args = this.getArguments();
			for (let i = 0; i < args.length; i++) {
				const argRange = args[i].getRange();
				let offset = this.document.offsetAt(argRange.start);
				const variables = this.parseVariables(offset, args[i].getValue());
				const swaps = [];
				let requiresExpansion = false;
				for (let variable of variables) {
					const value = this.dockerfile.resolveVariable(variable.getName(), variable.getNameRange().start.line);
					swaps.push(value);
					requiresExpansion = requiresExpansion || value !== void 0;
				}
				if (requiresExpansion) {
					let expanded = "";
					for (let j = 0; j < swaps.length; j++) {
						const variableRange = variables[j].getRange();
						const start = this.document.offsetAt(variableRange.start);
						const end = this.document.offsetAt(variableRange.end);
						if (swaps[j]) {
							expanded += this.document.getText().substring(offset, start);
							expanded += swaps[j];
							offset = end;
						} else {
							expanded += this.document.getText().substring(offset, end);
							offset = end;
						}
					}
					const argEnd = this.document.offsetAt(argRange.end);
					if (argEnd !== offset) expanded += this.document.getText().substring(offset, argEnd);
					args[i] = new argument_1.Argument(expanded, argRange);
				}
			}
			return args;
		}
		getVariables() {
			const variables = [];
			const args = this.getRawArguments();
			for (const arg of args) {
				let range = arg.getRange();
				let rawValue = this.document.getText().substring(this.document.offsetAt(range.start), this.document.offsetAt(range.end));
				const parsedVariables = this.parseVariables(this.document.offsetAt(arg.getRange().start), rawValue);
				for (const parsedVariable of parsedVariables) variables.push(parsedVariable);
			}
			return variables;
		}
		parseVariables(offset, arg) {
			let variables = [];
			variableLoop: for (let i = 0; i < arg.length; i++) switch (arg.charAt(i)) {
				case this.escapeChar:
					if (arg.charAt(i + 1) === "$") i++;
					break;
				case "$":
					if (arg.charAt(i + 1) === "{") {
						let escapedString = "${";
						let escapedName = "";
						let nameEnd = -1;
						let escapedSubstitutionParameter = "";
						let substitutionStart = -1;
						let substitutionEnd = -1;
						let modifierRead = -1;
						nameLoop: for (let j = i + 2; j < arg.length; j++) {
							let char = arg.charAt(j);
							switch (char) {
								case this.escapeChar:
									for (let k = j + 1; k < arg.length; k++) switch (arg.charAt(k)) {
										case " ":
										case "	":
										case "\r": continue;
										case "\n":
											j = k;
											continue nameLoop;
									}
									break;
								case "}":
									escapedString += "}";
									let modifier = null;
									let modifierRange = null;
									let substitutionParameter = modifierRead !== -1 ? escapedSubstitutionParameter : null;
									let substitutionRange = null;
									if (nameEnd === -1) nameEnd = j;
									else if (nameEnd + 1 === j) {
										modifier = "";
										modifierRange = vscode_languageserver_types_1.Range.create(this.document.positionAt(offset + nameEnd + 1), this.document.positionAt(offset + nameEnd + 1));
									} else {
										if (substitutionStart === -1) {
											substitutionStart = modifierRead + 1;
											substitutionEnd = modifierRead + 1;
										} else substitutionEnd = substitutionEnd + 1;
										modifier = arg.substring(modifierRead, modifierRead + 1);
										modifierRange = vscode_languageserver_types_1.Range.create(this.document.positionAt(offset + modifierRead), this.document.positionAt(offset + modifierRead + 1));
										substitutionRange = vscode_languageserver_types_1.Range.create(this.document.positionAt(offset + substitutionStart), this.document.positionAt(offset + substitutionEnd));
									}
									let start = this.document.positionAt(offset + i);
									variables.push(new variable_1.Variable(escapedName, vscode_languageserver_types_1.Range.create(this.document.positionAt(offset + i + 2), this.document.positionAt(offset + nameEnd)), vscode_languageserver_types_1.Range.create(start, this.document.positionAt(offset + j + 1)), modifier, modifierRange, substitutionParameter, substitutionRange, this.dockerfile.resolveVariable(escapedName, start.line) !== void 0, this.isBuildVariable(escapedName, start.line), escapedString));
									i = j;
									continue variableLoop;
								case ":":
									if (nameEnd === -1) nameEnd = j;
									else if (modifierRead !== -1) {
										if (substitutionStart === -1) {
											substitutionStart = j;
											substitutionEnd = j;
										} else substitutionEnd = j;
										escapedSubstitutionParameter += ":";
									} else modifierRead = j;
									escapedString += ":";
									break;
								case "\n":
								case "\r":
								case " ":
								case "	": break;
								default:
									if (nameEnd === -1) escapedName += char;
									else if (modifierRead !== -1) {
										if (substitutionStart === -1) {
											substitutionStart = j;
											substitutionEnd = j;
										} else substitutionEnd = j;
										escapedSubstitutionParameter += char;
									} else modifierRead = j;
									escapedString += char;
									break;
							}
						}
						break variableLoop;
					} else if (util_1.Util.isWhitespace(arg.charAt(i + 1)) || i === arg.length - 1) continue;
					else {
						let escapedName = "";
						nameLoop: for (let j = i + 1; j < arg.length; j++) {
							let char = arg.charAt(j);
							switch (char) {
								case "\r":
								case "\n":
								case " ":
								case "	": continue;
								case "$":
								case "'":
								case "\"":
									let varStart = this.document.positionAt(offset + i);
									variables.push(new variable_1.Variable(escapedName, vscode_languageserver_types_1.Range.create(this.document.positionAt(offset + i + 1), this.document.positionAt(offset + j)), vscode_languageserver_types_1.Range.create(varStart, this.document.positionAt(offset + j)), null, null, null, null, this.dockerfile.resolveVariable(escapedName, varStart.line) !== void 0, this.isBuildVariable(escapedName, varStart.line), "$" + escapedName));
									i = j - 1;
									continue variableLoop;
								case this.escapeChar:
									for (let k = j + 1; k < arg.length; k++) switch (arg.charAt(k)) {
										case " ":
										case "	":
										case "\r": continue;
										case "\n":
											j = k;
											continue nameLoop;
									}
									let start = this.document.positionAt(offset + i);
									variables.push(new variable_1.Variable(escapedName, vscode_languageserver_types_1.Range.create(this.document.positionAt(offset + i + 1), this.document.positionAt(offset + j)), vscode_languageserver_types_1.Range.create(start, this.document.positionAt(offset + j)), null, null, null, null, this.dockerfile.resolveVariable(escapedName, start.line) !== void 0, this.isBuildVariable(escapedName, start.line), "$" + escapedName));
									break variableLoop;
							}
							if (char.match(/^[a-z0-9_]+$/i) === null) {
								let varStart = this.document.positionAt(offset + i);
								variables.push(new variable_1.Variable(escapedName, vscode_languageserver_types_1.Range.create(this.document.positionAt(offset + i + 1), this.document.positionAt(offset + j)), vscode_languageserver_types_1.Range.create(varStart, this.document.positionAt(offset + j)), null, null, null, null, this.dockerfile.resolveVariable(escapedName, varStart.line) !== void 0, this.isBuildVariable(escapedName, varStart.line), "$" + escapedName));
								i = j - 1;
								continue variableLoop;
							}
							escapedName += char;
						}
						let start = this.document.positionAt(offset + i);
						variables.push(new variable_1.Variable(escapedName, vscode_languageserver_types_1.Range.create(this.document.positionAt(offset + i + 1), this.document.positionAt(offset + arg.length)), vscode_languageserver_types_1.Range.create(start, this.document.positionAt(offset + arg.length)), null, null, null, null, this.dockerfile.resolveVariable(escapedName, start.line) !== void 0, this.isBuildVariable(escapedName, start.line), "$" + escapedName));
					}
					break variableLoop;
			}
			return variables;
		}
		isBuildVariable(variable, line) {
			if (this.getKeyword() === main_1.Keyword.FROM) {
				for (const initialArg of this.dockerfile.getInitialARGs()) {
					const property = initialArg.getProperty();
					if (property && variable === property.getName()) return true;
				}
				return;
			}
			let image = this.dockerfile.getContainingImage(vscode_languageserver_types_1.Position.create(line, 0));
			let envs = image.getENVs();
			for (let i = envs.length - 1; i >= 0; i--) if (envs[i].isBefore(line)) {
				for (let property of envs[i].getProperties()) if (property.getName() === variable) return false;
			}
			let args = image.getARGs();
			for (let i = args.length - 1; i >= 0; i--) if (args[i].isBefore(line)) {
				let property = args[i].getProperty();
				if (property && property.getName() === variable) return true;
			}
		}
		createSingleLineHeredocs(args) {
			const heredocs = [];
			for (const arg of args) {
				const value = arg.getValue();
				if (value.startsWith("<<") && util_1.Util.parseHeredocName(value) !== null) {
					const startRange = arg.getRange();
					const nameRange = this.getNameRange(startRange);
					const name = this.getName(nameRange);
					heredocs.push(new heredoc_1.Heredoc(startRange, name, nameRange, null, null));
				}
			}
			return heredocs;
		}
		getName(nameRange) {
			const content = this.document.getText(nameRange);
			let escaping = false;
			let name = "";
			nameLoop: for (let i = 0; i < content.length; i++) {
				const ch = content.charAt(i);
				switch (ch) {
					case this.escapeChar:
						escaping = true;
						for (let j = i + 1; j < content.length; j++) switch (content.charAt(j)) {
							case " ":
							case "	": break;
							case "\r":
								i = j + 1;
								continue nameLoop;
							case "\n":
								i = j;
								continue nameLoop;
							default:
								name += content.charAt(j);
								i = j;
								continue nameLoop;
						}
						break;
					case "#": if (escaping) for (let j = i + 1; j < content.length; j++) switch (content.charAt(j)) {
						case "\n":
							i = j;
							continue nameLoop;
					}
					case " ":
					case "	":
					case "\r":
					case "\n": if (escaping) break;
					default:
						name += ch;
						break;
				}
			}
			return name;
		}
		getNameRange(startRange) {
			const content = this.document.getText(startRange);
			let endFound = false;
			let searchHyphen = false;
			let start = -1;
			let end = -1;
			let escaping = false;
			let quote = null;
			contentLoop: for (let i = 0; i < content.length; i++) {
				const ch = content.charAt(i);
				switch (ch) {
					case "\"":
					case "'":
						if (quote === ch) break contentLoop;
						quote = ch;
						continue;
					case this.escapeChar:
						for (let j = i + 1; j < content.length; j++) switch (content.charAt(j)) {
							case "\n":
								escaping = true;
								j = i;
								continue contentLoop;
						}
						break;
					case " ":
					case "	":
					case "\r":
					case "\n": break;
					case "<":
						if (endFound) searchHyphen = true;
						else endFound = true;
						break;
					case "-": if (searchHyphen) {
						searchHyphen = false;
						break;
					}
					case "#": if (escaping) for (let j = i + 1; j < content.length; j++) switch (content.charAt(j)) {
						case "\n":
							i = j;
							continue contentLoop;
					}
					default:
						if (start === -1) start = i;
						if (quote !== null) {
							end = i + 1;
							break;
						}
						break contentLoop;
				}
			}
			if (start === -1) return vscode_languageserver_types_1.Range.create(startRange.end, startRange.end);
			const nameStart = this.document.positionAt(this.document.offsetAt(startRange.start) + start);
			const nameEnd = quote !== null ? this.document.positionAt(this.document.offsetAt(startRange.start) + end) : startRange.end;
			return vscode_languageserver_types_1.Range.create(nameStart, nameEnd);
		}
		getHeredocs() {
			const args = this.getArguments();
			if (args.length === 0) return [];
			const heredocs = [];
			const range = this.getRange();
			if (range.start.line === range.end.line) return this.createSingleLineHeredocs(args);
			const heredocDefinitions = [];
			let heredocsProcessed = false;
			let escaping = false;
			let contentStart = -1;
			let contentEnd = -1;
			let lineStart = -1;
			let currentHeredoc = 0;
			const startOffset = this.document.offsetAt(args[0].getRange().start);
			const content = this.getRangeContent(vscode_languageserver_types_1.Range.create(args[0].getRange().start, this.getRange().end));
			contentLoop: for (let i = 0; i < content.length; i++) switch (content.charAt(i)) {
				case this.escapeChar:
					escaping = true;
					for (let j = i + 1; j < content.length; j++) switch (content.charAt(j)) {
						case " ":
						case "	": break;
						case "\r": j++;
						case "\n":
							i = j;
							continue contentLoop;
						default:
							i = j;
							continue contentLoop;
					}
					break;
				case "\r": break;
				case "\n":
					if (escaping) break;
					if (heredocsProcessed) {
						if (contentStart === -1) contentStart = i;
						contentEnd = i;
						const arg = heredocDefinitions[currentHeredoc];
						const startRange = arg.getRange();
						const nameRange = this.getNameRange(startRange);
						const name = this.getName(nameRange);
						const delimiterRange = this.getDelimiterRange(arg, name, vscode_languageserver_types_1.Range.create(this.document.positionAt(startOffset + lineStart), this.document.positionAt(startOffset + i)));
						if (delimiterRange !== null) {
							const contentRange = vscode_languageserver_types_1.Range.create(this.document.positionAt(startOffset + contentStart), this.document.positionAt(startOffset + lineStart - 1));
							heredocs.push(new heredoc_1.Heredoc(startRange, name, nameRange, contentRange, delimiterRange));
							contentStart = -1;
							currentHeredoc++;
						}
						lineStart = -1;
					} else {
						const offsetLimit = startOffset + i;
						for (const arg of args) if (this.document.offsetAt(arg.getRange().start) < offsetLimit) {
							if (arg.getValue().startsWith("<<")) heredocDefinitions.push(arg);
						} else break;
						heredocsProcessed = true;
						lineStart = -1;
						continue contentLoop;
					}
					break;
				case " ":
				case "	": if (escaping) break;
				case "#": if (escaping) for (let j = i + 1; j < content.length; j++) switch (content.charAt(j)) {
					case "\n":
						i = j;
						continue contentLoop;
				}
				default:
					if (escaping) escaping = false;
					if (heredocsProcessed) {
						if (contentStart === -1) contentStart = i;
						if (lineStart === -1) lineStart = i;
					}
					break;
			}
			if (heredocsProcessed) {
				const arg = heredocDefinitions[currentHeredoc];
				const startRange = arg.getRange();
				const nameRange = this.getNameRange(startRange);
				const name = this.getName(nameRange);
				let contentRange = null;
				const delimiterRange = this.getDelimiterRange(arg, name, vscode_languageserver_types_1.Range.create(this.document.positionAt(startOffset + lineStart), range.end));
				if (delimiterRange === null) contentRange = vscode_languageserver_types_1.Range.create(this.document.positionAt(startOffset + contentStart), range.end);
				else if (contentEnd !== -1) contentRange = vscode_languageserver_types_1.Range.create(this.document.positionAt(startOffset + contentStart), this.document.positionAt(startOffset + contentEnd));
				heredocs.push(new heredoc_1.Heredoc(startRange, name, nameRange, contentRange, delimiterRange));
				currentHeredoc++;
				for (let i = currentHeredoc; i < heredocDefinitions.length; i++) {
					const startRange = heredocDefinitions[currentHeredoc].getRange();
					const nameRange = this.getNameRange(startRange);
					const name = this.getName(nameRange);
					heredocs.push(new heredoc_1.Heredoc(startRange, name, nameRange, null, null));
					currentHeredoc++;
				}
			} else return this.createSingleLineHeredocs(args);
			return heredocs;
		}
		getDelimiterRange(startArg, name, candidateRange) {
			const text = this.document.getText(candidateRange);
			if (startArg.getValue().startsWith("<<-")) {
				let index = 0;
				while (text.charAt(index) === "	") index++;
				if (text.substring(index) === name) return vscode_languageserver_types_1.Range.create(vscode_languageserver_types_1.Position.create(candidateRange.start.line, index), candidateRange.end);
				return null;
			}
			return text === name ? candidateRange : null;
		}
	};
	exports.Instruction = Instruction;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/flagOption.js
var require_flagOption = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.FlagOption = void 0;
	var FlagOption = class {
		constructor(range, name, nameRange, value, valueRange) {
			this.range = range;
			this.name = name;
			this.nameRange = nameRange;
			this.value = value;
			this.valueRange = valueRange;
		}
		toString() {
			if (this.valueRange !== null) return this.name + "=" + this.value;
			return this.name;
		}
		getRange() {
			return this.range;
		}
		getName() {
			return this.name;
		}
		getNameRange() {
			return this.nameRange;
		}
		getValue() {
			return this.value;
		}
		getValueRange() {
			return this.valueRange;
		}
	};
	exports.FlagOption = FlagOption;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/flag.js
var require_flag = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Flag = void 0;
	var vscode_languageserver_types_1 = require_main$2();
	var flagOption_1 = require_flagOption();
	var Flag = class {
		constructor(document, range, name, nameRange, value, valueRange) {
			this.options = [];
			this.range = range;
			this.name = name;
			this.nameRange = nameRange;
			this.value = value;
			this.valueRange = valueRange;
			if (this.value !== null) {
				let offset = document.offsetAt(valueRange.start);
				let nameStart = -1;
				let valueStart = -1;
				let hasOptions = false;
				for (let i = 0; i < value.length; i++) switch (value.charAt(i)) {
					case "=":
						hasOptions = true;
						if (valueStart === -1) {
							valueStart = i + 1;
							break;
						}
						break;
					case ",":
						this.options.push(this.createFlagOption(document, value, offset, nameStart, valueStart, i));
						nameStart = -1;
						valueStart = -1;
						break;
					default:
						if (nameStart === -1) nameStart = i;
						break;
				}
				if (hasOptions && nameStart !== -1) this.options.push(this.createFlagOption(document, value, offset, nameStart, valueStart, value.length));
			}
		}
		createFlagOption(document, content, documentOffset, nameStart, valueStart, valueEnd) {
			const optionRange = vscode_languageserver_types_1.Range.create(document.positionAt(documentOffset + nameStart), document.positionAt(documentOffset + valueEnd));
			if (valueStart === -1) return new flagOption_1.FlagOption(optionRange, content.substring(nameStart, valueEnd), optionRange, null, null);
			return new flagOption_1.FlagOption(optionRange, content.substring(nameStart, valueStart - 1), vscode_languageserver_types_1.Range.create(document.positionAt(documentOffset + nameStart), document.positionAt(documentOffset + valueStart - 1)), content.substring(valueStart, valueEnd), vscode_languageserver_types_1.Range.create(document.positionAt(documentOffset + valueStart), document.positionAt(documentOffset + valueEnd)));
		}
		toString() {
			if (this.valueRange) return "--" + this.name + "=" + this.value;
			return "--" + this.name;
		}
		/**
		* Returns the range that encompasses this entire flag. This includes the
		* -- prefix in the beginning to the last character of the flag's value (if
		* it has been defined).
		*
		* @return the entire range of this flag
		*/
		getRange() {
			return this.range;
		}
		/**
		* Returns the name of this flag. The name does not include the -- prefix.
		* Thus, for HEALTHCHECK's --interval flag, interval is the flag's name and
		* not --interval.
		*
		* @return this flag's name
		*/
		getName() {
			return this.name;
		}
		/**
		* Returns the range that encompasses the flag's name
		*
		* @return the range containing the flag's name
		*/
		getNameRange() {
			return this.nameRange;
		}
		/**
		* Returns the value that has been set to this flag. May be null if the
		* flag is invalid and has no value set like a --start-period. If the flag
		* is instead a --start-period= with an equals sign then the flag's value
		* is the empty string.
		*
		* @return this flag's value if it has been defined, null otherwise
		*/
		getValue() {
			return this.value;
		}
		/**
		* Returns the range that encompasses this flag's value. If no value has
		* been set then null will be returned.
		*
		* @return the range containing this flag's value, or null if the flag
		*         has no value defined
		*/
		getValueRange() {
			return this.valueRange;
		}
		getOption(name) {
			for (const option of this.options) if (option.getName() === name) return option;
			return null;
		}
		getOptions() {
			return this.options;
		}
		hasOptions() {
			return this.options.length > 0;
		}
	};
	exports.Flag = Flag;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/modifiableInstruction.js
var require_modifiableInstruction = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ModifiableInstruction = void 0;
	var vscode_languageserver_types_1 = require_main$2();
	var flag_1 = require_flag();
	var instruction_1 = require_instruction();
	var ModifiableInstruction = class extends instruction_1.Instruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
		getFlags() {
			if (!this.flags) {
				this.flags = [];
				for (let arg of this.getArguments()) {
					let value = arg.getValue();
					if (this.stopSearchingForFlags(value)) return this.flags;
					else if (value.indexOf("--") === 0) {
						let range = arg.getRange();
						let rawValue = this.document.getText().substring(this.document.offsetAt(range.start), this.document.offsetAt(range.end));
						let nameIndex = value.indexOf("=");
						let index = rawValue.indexOf("=");
						let firstMatch = false;
						let secondMatch = false;
						let startIndex = -1;
						nameSearchLoop: for (let i = 0; i < rawValue.length; i++) switch (rawValue.charAt(i)) {
							case "\\":
							case " ":
							case "	":
							case "\r":
							case "\n": break;
							case "-":
								if (secondMatch) {
									startIndex = i;
									break nameSearchLoop;
								} else if (firstMatch) secondMatch = true;
								else firstMatch = true;
								break;
							default:
								startIndex = i;
								break nameSearchLoop;
						}
						let nameStart = this.document.positionAt(this.document.offsetAt(range.start) + startIndex);
						if (index === -1) this.flags.push(new flag_1.Flag(this.document, range, value.substring(2), vscode_languageserver_types_1.Range.create(nameStart, range.end), null, null));
						else if (index === value.length - 1) {
							let nameEnd = this.document.positionAt(this.document.offsetAt(range.start) + index);
							this.flags.push(new flag_1.Flag(this.document, range, value.substring(2, index), vscode_languageserver_types_1.Range.create(nameStart, nameEnd), "", vscode_languageserver_types_1.Range.create(range.end, range.end)));
						} else {
							let nameEnd = this.document.positionAt(this.document.offsetAt(range.start) + index);
							this.flags.push(new flag_1.Flag(this.document, range, value.substring(2, nameIndex), vscode_languageserver_types_1.Range.create(nameStart, nameEnd), value.substring(nameIndex + 1), vscode_languageserver_types_1.Range.create(this.document.positionAt(this.document.offsetAt(range.start) + index + 1), range.end)));
						}
					}
				}
			}
			return this.flags;
		}
		getArguments() {
			const args = super.getArguments();
			const flags = this.getFlags();
			if (flags.length === 0) return args;
			for (let i = 0; i < flags.length; i++) args.shift();
			return args;
		}
	};
	exports.ModifiableInstruction = ModifiableInstruction;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/jsonInstruction.js
var require_jsonInstruction = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.JSONInstruction = void 0;
	var vscode_languageserver_types_1 = require_main$2();
	var argument_1 = require_argument();
	var jsonArgument_1 = require_jsonArgument();
	var modifiableInstruction_1 = require_modifiableInstruction();
	var JSONInstruction = class extends modifiableInstruction_1.ModifiableInstruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
			this.openingBracket = null;
			this.closingBracket = null;
			this.jsonStrings = [];
			const argsContent = this.getRawArgumentsContent();
			if (argsContent === null) return;
			const args = this.getArguments();
			if (args.length === 1 && args[0].getValue() === "[]") {
				let argRange = args[0].getRange();
				this.openingBracket = new argument_1.Argument("[", vscode_languageserver_types_1.Range.create(argRange.start.line, argRange.start.character, argRange.start.line, argRange.start.character + 1));
				this.closingBracket = new argument_1.Argument("]", vscode_languageserver_types_1.Range.create(argRange.start.line, argRange.start.character + 1, argRange.end.line, argRange.end.character));
				return;
			} else if (args.length === 2 && args[0].getValue() === "[" && args[1].getValue() === "]") {
				this.openingBracket = args[0];
				this.closingBracket = args[1];
				return;
			}
			const argsOffset = document.offsetAt(this.getArgumentsRange().start);
			let start = -1;
			let last = "";
			let quoted = false;
			let escapedArg = "";
			argsCheck: for (let i = 0; i < argsContent.length; i++) {
				let char = argsContent.charAt(i);
				switch (char) {
					case "[":
						if (last === "") {
							this.openingBracket = new argument_1.Argument("[", vscode_languageserver_types_1.Range.create(document.positionAt(argsOffset + i), document.positionAt(argsOffset + i + 1)));
							last = "[";
						} else if (quoted) escapedArg = escapedArg + char;
						else break argsCheck;
						break;
					case "\"":
						if (last === "[" || last === ",") {
							start = i;
							quoted = true;
							last = "\"";
							escapedArg = escapedArg + char;
							continue;
						} else if (last === "\"") if (quoted) {
							escapedArg = escapedArg + char;
							quoted = false;
							this.jsonStrings.push(new jsonArgument_1.JSONArgument(escapedArg, vscode_languageserver_types_1.Range.create(document.positionAt(argsOffset + start), document.positionAt(argsOffset + i + 1)), vscode_languageserver_types_1.Range.create(document.positionAt(argsOffset + start + 1), document.positionAt(argsOffset + i))));
							escapedArg = "";
						} else break argsCheck;
						else break argsCheck;
						break;
					case ",":
						if (quoted) escapedArg = escapedArg + char;
						else if (last === "\"") last = ",";
						else break argsCheck;
						break;
					case "]":
						if (quoted) escapedArg = escapedArg + char;
						else if (last !== "") {
							this.closingBracket = new argument_1.Argument("]", vscode_languageserver_types_1.Range.create(document.positionAt(argsOffset + i), document.positionAt(argsOffset + i + 1)));
							break argsCheck;
						}
						break;
					case " ":
					case "	": break;
					case "\\":
						if (quoted) switch (argsContent.charAt(i + 1)) {
							case "\"":
							case "\\":
								escapedArg = escapedArg + argsContent.charAt(i + 1);
								i++;
								continue;
							case " ":
							case "	":
								escapeCheck: for (let j = i + 2; j < argsContent.length; j++) switch (argsContent.charAt(j)) {
									case "\r": j++;
									case "\n":
										i = j;
										continue argsCheck;
									case " ":
									case "	": break;
									default: break escapeCheck;
								}
								break;
							case "\r": i++;
							default:
								i++;
								continue;
						}
						else escapeCheck: for (let j = i + 1; j < argsContent.length; j++) switch (argsContent.charAt(j)) {
							case "\r": j++;
							case "\n":
								i = j;
								continue argsCheck;
							case " ":
							case "	": break;
							default: break escapeCheck;
						}
						break argsCheck;
					default:
						if (!quoted) break argsCheck;
						escapedArg = escapedArg + char;
						break;
				}
			}
		}
		stopSearchingForFlags(_value) {
			return true;
		}
		getOpeningBracket() {
			return this.openingBracket;
		}
		getJSONStrings() {
			return this.jsonStrings;
		}
		getClosingBracket() {
			return this.closingBracket;
		}
	};
	exports.JSONInstruction = JSONInstruction;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/add.js
var require_add = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Add = void 0;
	var jsonInstruction_1 = require_jsonInstruction();
	var Add = class extends jsonInstruction_1.JSONInstruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
		stopSearchingForFlags(argument) {
			return argument.indexOf("--") === -1;
		}
	};
	exports.Add = Add;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/property.js
var require_property = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Property = void 0;
	var vscode_languageserver_types_1 = require_main$2();
	var util_1 = require_util();
	exports.Property = class Property {
		constructor(document, escapeChar, arg, arg2) {
			this.assignmentOperatorRange = null;
			this.assignmentOperator = null;
			this.valueRange = null;
			this.value = null;
			this.document = document;
			this.escapeChar = escapeChar;
			this.nameRange = Property.getNameRange(document, arg);
			let value = document.getText().substring(document.offsetAt(this.nameRange.start), document.offsetAt(this.nameRange.end));
			this.name = Property.getValue(value, escapeChar);
			if (arg2) {
				this.valueRange = arg2.getRange();
				value = document.getText().substring(document.offsetAt(this.valueRange.start), document.offsetAt(this.valueRange.end));
				this.value = Property.getValue(value, escapeChar);
				this.range = vscode_languageserver_types_1.Range.create(this.nameRange.start, this.valueRange.end);
			} else {
				let argRange = arg.getRange();
				if (this.nameRange.start.line === argRange.start.line && this.nameRange.start.character === argRange.start.character && this.nameRange.end.line === argRange.end.line && this.nameRange.end.character === argRange.end.character) {} else {
					this.valueRange = Property.getValueRange(document, arg);
					value = document.getText().substring(document.offsetAt(this.valueRange.start), document.offsetAt(this.valueRange.end));
					this.value = Property.getValue(value, escapeChar);
					this.assignmentOperatorRange = vscode_languageserver_types_1.Range.create(this.nameRange.end, this.valueRange.start);
					this.assignmentOperator = "=";
				}
				this.range = argRange;
			}
		}
		getRange() {
			return this.range;
		}
		getName() {
			return this.name;
		}
		getNameRange() {
			return this.nameRange;
		}
		getValue() {
			return this.value;
		}
		getValueRange() {
			return this.valueRange;
		}
		/**
		* Retrieves the operator used for delimiting between the name and
		* value of this property. This will either be the "=" character
		* or null if a character was not used or if this property has no
		* value defined.
		*/
		getAssignmentOperator() {
			return this.assignmentOperator;
		}
		getAssignmentOperatorRange() {
			return this.assignmentOperatorRange;
		}
		/**
		* Returns the value of this property including any enclosing
		* single or double quotes and relevant escape characters.
		* Escaped newlines and its associated contiguous whitespace
		* characters however will not be returned as they are deemed to
		* be uninteresting to clients trying to return a Dockerfile.
		*
		* @return the unescaped value of this property or null if this
		*         property has no associated value
		*/
		getUnescapedValue() {
			if (this.valueRange === null) return null;
			let escaped = false;
			let rawValue = "";
			let value = this.document.getText().substring(this.document.offsetAt(this.valueRange.start), this.document.offsetAt(this.valueRange.end));
			rawLoop: for (let i = 0; i < value.length; i++) {
				let char = value.charAt(i);
				switch (char) {
					case this.escapeChar:
						for (let j = i + 1; j < value.length; j++) switch (value.charAt(j)) {
							case "\r": j++;
							case "\n":
								escaped = true;
								i = j;
								continue rawLoop;
							case " ":
							case "	": break;
							default:
								rawValue = rawValue + char;
								continue rawLoop;
						}
						rawValue = rawValue + char;
						break;
					case "\r":
					case "\n": break;
					case " ":
					case "	":
						if (!escaped) rawValue = rawValue + char;
						break;
					case "#":
						if (escaped) for (let j = i + 1; j < value.length; j++) switch (value.charAt(j)) {
							case "\r": j++;
							case "\n":
								i = j;
								continue rawLoop;
						}
						else rawValue = rawValue + char;
						break;
					default:
						rawValue = rawValue + char;
						escaped = false;
						break;
				}
			}
			return rawValue;
		}
		static getNameRange(document, arg) {
			let value = arg.getValue();
			let index = value.indexOf("=");
			if (index !== -1) {
				let initial = value.charAt(0);
				let before = value.charAt(index - 1);
				if (initial === "\"" && before === "\"" || initial === "'" && before === "'" || initial !== "\"" && initial !== "'") return vscode_languageserver_types_1.Range.create(arg.getRange().start, document.positionAt(document.offsetAt(arg.getRange().start) + index));
			}
			return arg.getRange();
		}
		static getValueRange(document, arg) {
			return vscode_languageserver_types_1.Range.create(document.positionAt(document.offsetAt(arg.getRange().start) + arg.getValue().indexOf("=") + 1), document.positionAt(document.offsetAt(arg.getRange().end)));
		}
		/**
		* Returns the actual value of this key-value pair. The value will
		* have its escape characters removed if applicable. If the value
		* spans multiple lines and there are comments nested within the
		* lines, they too will be removed.
		*
		* @return the value that this key-value pair will actually be, may
		*         be null if no value is defined, may be the empty string
		*         if the value only consists of whitespace
		*/
		static getValue(value, escapeChar) {
			let escaped = false;
			const skip = util_1.Util.findLeadingNonWhitespace(value, escapeChar);
			if (skip !== 0 && value.charAt(skip) === "#") escaped = true;
			value = value.substring(skip);
			let first = value.charAt(0);
			let last = value.charAt(value.length - 1);
			let literal = first === "'" || first === "\"";
			let inSingle = first === "'" && last === "'";
			let inDouble = false;
			if (first === "\"") {
				for (let i = 1; i < value.length; i++) if (value.charAt(i) === escapeChar) i++;
				else if (value.charAt(i) === "\"" && i === value.length - 1) inDouble = true;
			}
			if (inSingle || inDouble) value = value.substring(1, value.length - 1);
			let commentCheck = -1;
			let escapedValue = "";
			parseValue: for (let i = 0; i < value.length; i++) {
				let char = value.charAt(i);
				switch (char) {
					case escapeChar:
						if (i + 1 === value.length) {
							escapedValue = escapedValue + escapeChar;
							break parseValue;
						}
						char = value.charAt(i + 1);
						if (char === " " || char === "	") whitespaceCheck: for (let j = i + 2; j < value.length; j++) {
							let char2 = value.charAt(j);
							switch (char2) {
								case " ":
								case "	": break;
								case "\r": j++;
								case "\n":
									escaped = true;
									i = j;
									continue parseValue;
								default:
									if (!inDouble && !inSingle && !literal) {
										if (char2 === escapeChar) {
											escapedValue = escapedValue + char;
											i = i + 1;
										} else {
											escapedValue = escapedValue + char + char2;
											i = j;
										}
										continue parseValue;
									}
									break whitespaceCheck;
							}
						}
						if (inDouble) {
							if (char === "\r") {
								escaped = true;
								i = i + 2;
							} else if (char === "\n") {
								escaped = true;
								i++;
							} else if (char !== "\"") {
								if (char === escapeChar) i++;
								escapedValue = escapedValue + escapeChar;
							}
							continue parseValue;
						} else if (inSingle || literal) {
							if (char === "\r") {
								escaped = true;
								i = i + 2;
							} else if (char === "\n") {
								escaped = true;
								i++;
							} else escapedValue = escapedValue + escapeChar;
							continue parseValue;
						} else if (char === escapeChar) {
							escapedValue = escapedValue + escapeChar;
							i++;
						} else if (char === "\r") {
							escaped = true;
							i = i + 2;
						} else if (char === "\n") {
							escaped = true;
							i++;
						} else {
							escapedValue = escapedValue + char;
							i++;
						}
						break;
					case " ":
					case "	":
						if (escaped && commentCheck === -1) commentCheck = i;
						escapedValue = escapedValue + char;
						break;
					case "\r": i++;
					case "\n":
						if (escaped && commentCheck !== -1) {
							escapedValue = escapedValue.substring(0, escapedValue.length - (i - commentCheck - 1));
							commentCheck = -1;
						}
						break;
					case "#": if (escaped) {
						if (commentCheck !== -1) {
							escapedValue = escapedValue.substring(0, escapedValue.length - (i - commentCheck));
							commentCheck = -1;
						}
						newlineCheck: for (let j = i + 1; j < value.length; j++) switch (value.charAt(j)) {
							case "\r": j++;
							case "\n":
								i = j;
								break newlineCheck;
						}
						continue parseValue;
					}
					default:
						if (escaped) {
							escaped = false;
							commentCheck = -1;
						}
						escapedValue = escapedValue + char;
						break;
				}
			}
			return escapedValue;
		}
	};
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/propertyInstruction.js
var require_propertyInstruction = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.PropertyInstruction = void 0;
	var vscode_languageserver_types_1 = require_main$2();
	var instruction_1 = require_instruction();
	var property_1 = require_property();
	var argument_1 = require_argument();
	var util_1 = require_util();
	var PropertyInstruction = class extends instruction_1.Instruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
			this.properties = void 0;
		}
		getProperties() {
			if (this.properties === void 0) {
				let args = this.getPropertyArguments();
				if (args.length === 0) this.properties = [];
				else if (args.length === 1) this.properties = [new property_1.Property(this.document, this.escapeChar, args[0])];
				else if (args.length === 2) if (args[0].getValue().indexOf("=") === -1) this.properties = [new property_1.Property(this.document, this.escapeChar, args[0], args[1])];
				else this.properties = [new property_1.Property(this.document, this.escapeChar, args[0]), new property_1.Property(this.document, this.escapeChar, args[1])];
				else if (args[0].getValue().indexOf("=") === -1) {
					let text = this.document.getText();
					let start = args[1].getRange().start;
					let end = args[args.length - 1].getRange().end;
					text = text.substring(this.document.offsetAt(start), this.document.offsetAt(end));
					this.properties = [new property_1.Property(this.document, this.escapeChar, args[0], new argument_1.Argument(text, vscode_languageserver_types_1.Range.create(args[1].getRange().start, args[args.length - 1].getRange().end)))];
				} else {
					this.properties = [];
					for (let i = 0; i < args.length; i++) this.properties.push(new property_1.Property(this.document, this.escapeChar, args[i]));
				}
			}
			return this.properties;
		}
		/**
		* Goes from the back of the string and returns the first
		* non-whitespace character that is found. If an escape character
		* is found with newline characters, the escape character will
		* not be considered a non-whitespace character and its index in
		* the string will not be returned.
		*
		* @param content the string to search through
		* @return the index in the string for the first non-whitespace
		*         character when searching from the end of the string
		*/
		findTrailingNonWhitespace(content) {
			let index = content.length;
			whitespaceCheck: for (let i = content.length - 1; i >= 0; i--) switch (content.charAt(i)) {
				case " ":
				case "	": continue;
				case "\n": if (content.charAt(i - 1) === "\r") i = i - 1;
				case "\r":
					newlineCheck: for (let j = i - 1; j >= 0; j--) switch (content.charAt(j)) {
						case " ":
						case "	":
						case "\r":
						case "\n":
						case this.escapeChar: continue;
						default:
							index = j;
							break newlineCheck;
					}
					break whitespaceCheck;
				default:
					index = i;
					break whitespaceCheck;
			}
			return index;
		}
		getPropertyArguments() {
			const args = [];
			let range = this.getInstructionRange();
			let instructionNameEndOffset = this.document.offsetAt(range.end);
			let extra = instructionNameEndOffset - this.document.offsetAt(range.start);
			let content = this.getTextContent();
			let fullArgs = content.substring(extra);
			let start = util_1.Util.findLeadingNonWhitespace(fullArgs, this.escapeChar);
			if (start === -1) return [];
			const startPosition = this.document.positionAt(instructionNameEndOffset + start);
			let escaped = range.start.line !== startPosition.line;
			let endingEscape = false;
			let mark = -1;
			let end = this.findTrailingNonWhitespace(fullArgs);
			content = fullArgs.substring(start, end + 1);
			let argStart = escaped ? -1 : 0;
			let spaced = false;
			argumentLoop: for (let i = 0; i < content.length; i++) {
				let char = content.charAt(i);
				switch (char) {
					case this.escapeChar:
						if (i + 1 === content.length) {
							endingEscape = true;
							break argumentLoop;
						}
						if (!escaped) mark = i;
						switch (content.charAt(i + 1)) {
							case " ":
							case "	":
								if (!util_1.Util.isWhitespace(content.charAt(i + 2))) {
									i = i + 1;
									continue argumentLoop;
								}
								whitespaceCheck: for (let j = i + 2; j < content.length; j++) switch (content.charAt(j)) {
									case "\r": j++;
									case "\n":
										escaped = true;
										i = j;
										continue argumentLoop;
									case " ":
									case "	": break;
									default:
										args.push(new argument_1.Argument(content.substring(argStart, i), vscode_languageserver_types_1.Range.create(this.document.positionAt(instructionNameEndOffset + start + argStart), this.document.positionAt(instructionNameEndOffset + start + i + 2))));
										argStart = j;
										break whitespaceCheck;
								}
								i = argStart - 1;
								continue argumentLoop;
							case "\r": i++;
							case "\n":
								escaped = true;
								i = i + 1;
								continue argumentLoop;
							case this.escapeChar:
								if (argStart === -1) argStart = i;
								i = i + 1;
								continue argumentLoop;
							default:
								if (argStart === -1) argStart = i;
								continue argumentLoop;
						}
					case "'":
					case "\"":
						if (spaced) {
							this.createSpacedArgument(argStart, args, content, mark, instructionNameEndOffset, start);
							argStart = i;
							spaced = false;
						}
						if (argStart === -1) argStart = i;
						for (let j = i + 1; j < content.length; j++) switch (content.charAt(j)) {
							case char:
								if (content.charAt(j + 1) !== " " && content.charAt(j + 1) !== "") {
									i = j;
									continue argumentLoop;
								}
								args.push(new argument_1.Argument(content.substring(argStart, j + 1), vscode_languageserver_types_1.Range.create(this.document.positionAt(instructionNameEndOffset + start + argStart), this.document.positionAt(instructionNameEndOffset + start + j + 1))));
								i = j;
								argStart = -1;
								continue argumentLoop;
							case this.escapeChar:
								j++;
								break;
						}
						break argumentLoop;
					case " ":
					case "	":
						if (escaped) {
							if (argStart !== -1) spaced = true;
						} else if (argStart !== -1) {
							args.push(new argument_1.Argument(content.substring(argStart, i), vscode_languageserver_types_1.Range.create(this.document.positionAt(instructionNameEndOffset + start + argStart), this.document.positionAt(instructionNameEndOffset + start + i))));
							argStart = -1;
						}
						break;
					case "\r": i++;
					case "\n":
						spaced = false;
						break;
					case "#":
						if (escaped) {
							for (let j = i + 1; j < content.length; j++) switch (content.charAt(j)) {
								case "\r": j++;
								case "\n":
									i = j;
									spaced = false;
									continue argumentLoop;
							}
							if (argStart !== -1) {
								let value = content.substring(argStart, mark);
								args.push(new argument_1.Argument(value, vscode_languageserver_types_1.Range.create(this.document.positionAt(instructionNameEndOffset + start + argStart), this.document.positionAt(instructionNameEndOffset + start + mark))));
								argStart = -1;
							}
							break argumentLoop;
						} else if (argStart === -1) argStart = i;
						break;
					default:
						if (spaced) {
							this.createSpacedArgument(argStart, args, content, mark, instructionNameEndOffset, start);
							argStart = i;
							spaced = false;
						}
						escaped = false;
						if (argStart === -1) argStart = i;
						if (char === "$" && content.charAt(i + 1) === "{") {
							let singleQuotes = false;
							let doubleQuotes = false;
							let escaped = false;
							for (let j = i + 1; j < content.length; j++) switch (content.charAt(j)) {
								case this.escapeChar:
									escaped = true;
									break;
								case "\r":
								case "\n": break;
								case "'":
									singleQuotes = !singleQuotes;
									escaped = false;
									break;
								case "\"":
									doubleQuotes = !doubleQuotes;
									escaped = false;
									break;
								case " ":
								case "	":
									if (escaped || singleQuotes || doubleQuotes) break;
									i = j - 1;
									continue argumentLoop;
								case "}":
									i = j;
									continue argumentLoop;
								default:
									escaped = false;
									break;
							}
							break argumentLoop;
						}
						break;
				}
			}
			if (argStart !== -1 && argStart !== content.length) {
				let end = endingEscape ? content.length - 1 : content.length;
				let value = content.substring(argStart, end);
				args.push(new argument_1.Argument(value, vscode_languageserver_types_1.Range.create(this.document.positionAt(instructionNameEndOffset + start + argStart), this.document.positionAt(instructionNameEndOffset + start + end))));
			}
			return args;
		}
		createSpacedArgument(argStart, args, content, mark, instructionNameEndOffset, start) {
			if (argStart !== -1) args.push(new argument_1.Argument(content.substring(argStart, mark), vscode_languageserver_types_1.Range.create(this.document.positionAt(instructionNameEndOffset + start + argStart), this.document.positionAt(instructionNameEndOffset + start + mark))));
		}
	};
	exports.PropertyInstruction = PropertyInstruction;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/arg.js
var require_arg = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Arg = void 0;
	var property_1 = require_property();
	var propertyInstruction_1 = require_propertyInstruction();
	var Arg = class extends propertyInstruction_1.PropertyInstruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
			this.property = null;
			const args = this.getPropertyArguments();
			if (args.length === 1) this.property = new property_1.Property(this.document, this.escapeChar, args[0]);
			else this.property = null;
		}
		/**
		* Returns the variable defined by this ARG. This may be null if
		* this ARG instruction is malformed and has no variable
		* declaration.
		*/
		getProperty() {
			return this.property;
		}
	};
	exports.Arg = Arg;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/cmd.js
var require_cmd = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Cmd = void 0;
	var jsonInstruction_1 = require_jsonInstruction();
	var Cmd = class extends jsonInstruction_1.JSONInstruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
	};
	exports.Cmd = Cmd;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/copy.js
var require_copy = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Copy = void 0;
	var jsonInstruction_1 = require_jsonInstruction();
	var Copy = class extends jsonInstruction_1.JSONInstruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
		stopSearchingForFlags(argument) {
			return argument.indexOf("--") === -1;
		}
		getFromFlag() {
			let flags = super.getFlags();
			return flags.length === 1 && flags[0].getName() === "from" ? flags[0] : null;
		}
		/**
		* Returns there here-documents that are defined in this RUN
		* instruction.
		*
		* This API is experimental and subject to change.
		*/
		getHeredocs() {
			return super.getHeredocs();
		}
	};
	exports.Copy = Copy;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/env.js
var require_env = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Env = void 0;
	var propertyInstruction_1 = require_propertyInstruction();
	var Env = class extends propertyInstruction_1.PropertyInstruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
		getProperties() {
			return super.getProperties();
		}
	};
	exports.Env = Env;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/entrypoint.js
var require_entrypoint = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Entrypoint = void 0;
	var jsonInstruction_1 = require_jsonInstruction();
	var Entrypoint = class extends jsonInstruction_1.JSONInstruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
	};
	exports.Entrypoint = Entrypoint;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/from.js
var require_from = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.From = void 0;
	var vscode_languageserver_types_1 = require_main$2();
	var modifiableInstruction_1 = require_modifiableInstruction();
	var From = class extends modifiableInstruction_1.ModifiableInstruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
		stopSearchingForFlags(argument) {
			return argument.indexOf("--") === -1;
		}
		getImage() {
			const args = this.getArguments();
			return args.length > 0 ? args[0].getValue() : null;
		}
		/**
		* Returns the name of the image that will be used as the base image.
		*
		* @return the base image's name, or null if unspecified
		*/
		getImageName() {
			const imageName = this.getRangeContent(this.getImageNameRange());
			if (imageName === null) return null;
			let commented = false;
			let escaped = false;
			let name = "";
			for (let i = 0; i < imageName.length; i++) {
				const ch = imageName.charAt(i);
				switch (ch) {
					case this.escapeChar:
						escaped = true;
						break;
					case "\r": continue;
					case "\n":
						commented = false;
						break;
					case " ":
					case "	": break;
					case "#":
						if (escaped) commented = true;
						else {
							name = name + ch;
							escaped = false;
						}
						break;
					default:
						if (!commented) {
							name = name + ch;
							escaped = false;
						}
						break;
				}
			}
			return name;
		}
		/**
		* Returns the range that covers the name of the image used by
		* this instruction.
		*
		* @return the range of the name of this instruction's argument,
		*         or null if no image has been specified
		*/
		getImageNameRange() {
			let range = this.getImageRange();
			if (range) {
				let registryRange = this.getRegistryRange();
				if (registryRange) range.start = this.document.positionAt(this.document.offsetAt(registryRange.end) + 1);
				let tagRange = this.getImageTagRange();
				let digestRange = this.getImageDigestRange();
				if (tagRange === null) {
					if (digestRange !== null) range.end = this.document.positionAt(this.document.offsetAt(digestRange.start) - 1);
				} else range.end = this.document.positionAt(this.document.offsetAt(tagRange.start) - 1);
				return range;
			}
			return null;
		}
		/**
		* Returns the range that covers the image argument of this
		* instruction. This includes the tag or digest of the image if
		* it has been specified by the instruction.
		*
		* @return the range of the image argument, or null if no image
		*         has been specified
		*/
		getImageRange() {
			let args = this.getArguments();
			return args.length !== 0 ? args[0].getRange() : null;
		}
		getImageTag() {
			return this.getRangeContent(this.getImageTagRange());
		}
		/**
		* Returns the range in the document that the tag of the base
		* image encompasses.
		*
		* @return the base image's tag's range in the document, or null
		*         if no tag has been specified
		*/
		getImageTagRange() {
			const range = this.getImageRange();
			if (range) {
				const rangeStartOffset = this.document.offsetAt(range.start);
				const content = this.getRangeContent(range);
				const atIndex = this.indexOf(rangeStartOffset, content, "@");
				const slashIndex = content.indexOf("/");
				if (atIndex === -1) {
					const colonIndex = this.lastIndexOf(rangeStartOffset, content, ":");
					if (colonIndex > slashIndex) return vscode_languageserver_types_1.Range.create(this.document.positionAt(rangeStartOffset + colonIndex + 1), range.end);
				}
				const subcontent = content.substring(0, atIndex);
				const subcolonIndex = subcontent.indexOf(":");
				if (subcolonIndex === -1) return null;
				if (slashIndex === -1) return vscode_languageserver_types_1.Range.create(this.document.positionAt(rangeStartOffset + subcolonIndex + 1), this.document.positionAt(rangeStartOffset + atIndex));
				if (subcolonIndex < slashIndex) return null;
				return vscode_languageserver_types_1.Range.create(this.document.positionAt(rangeStartOffset + subcolonIndex + 1), this.document.positionAt(rangeStartOffset + subcontent.length));
			}
			return null;
		}
		getImageDigest() {
			return this.getRangeContent(this.getImageDigestRange());
		}
		/**
		* Returns the range in the document that the digest of the base
		* image encompasses.
		*
		* @return the base image's digest's range in the document, or null
		*         if no digest has been specified
		*/
		getImageDigestRange() {
			let range = this.getImageRange();
			if (range) {
				let content = this.getRangeContent(range);
				let index = this.lastIndexOf(this.document.offsetAt(range.start), content, "@");
				if (index !== -1) return vscode_languageserver_types_1.Range.create(range.start.line, range.start.character + index + 1, range.end.line, range.end.character);
			}
			return null;
		}
		indexOf(documentOffset, content, searchString) {
			let index = content.indexOf(searchString);
			const variables = this.getVariables();
			for (let i = 0; i < variables.length; i++) {
				const position = documentOffset + index;
				const variableRange = variables[i].getRange();
				if (this.document.offsetAt(variableRange.start) < position && position < this.document.offsetAt(variableRange.end)) {
					const offset = this.document.offsetAt(variableRange.end) - documentOffset;
					const subIndex = content.substring(offset).indexOf(searchString);
					if (subIndex === -1) return -1;
					index = subIndex + offset;
					i = -1;
					continue;
				}
			}
			return index;
		}
		lastIndexOf(documentOffset, content, searchString) {
			let index = content.lastIndexOf(searchString);
			const variables = this.getVariables();
			for (let i = 0; i < variables.length; i++) {
				const position = documentOffset + index;
				const variableRange = variables[i].getRange();
				if (this.document.offsetAt(variableRange.start) < position && position < this.document.offsetAt(variableRange.end)) {
					index = content.substring(0, index).lastIndexOf(searchString);
					if (index === -1) return -1;
					i = -1;
					continue;
				}
			}
			return index;
		}
		getRegistry() {
			return this.getRangeContent(this.getRegistryRange());
		}
		getRegistryRange() {
			const range = this.getImageRange();
			if (range) {
				const tagRange = this.getImageTagRange();
				const digestRange = this.getImageDigestRange();
				if (tagRange === null) {
					if (digestRange !== null) range.end = this.document.positionAt(this.document.offsetAt(digestRange.start) - 1);
				} else range.end = this.document.positionAt(this.document.offsetAt(tagRange.start) - 1);
				const content = this.getRangeContent(range);
				const rangeStart = this.document.offsetAt(range.start);
				const startingSlashIndex = this.indexOf(rangeStart, content, "/");
				if (startingSlashIndex === -1) return null;
				const portIndex = this.indexOf(rangeStart, content, ":");
				const dotIndex = this.indexOf(rangeStart, content, ".");
				if (portIndex !== -1 || dotIndex !== -1) return vscode_languageserver_types_1.Range.create(range.start, this.document.positionAt(rangeStart + startingSlashIndex));
				if (content.substring(0, startingSlashIndex) === "localhost") return vscode_languageserver_types_1.Range.create(range.start, this.document.positionAt(rangeStart + startingSlashIndex));
			}
			return null;
		}
		getBuildStage() {
			let range = this.getBuildStageRange();
			return range === null ? null : this.getRangeContent(range);
		}
		getBuildStageRange() {
			let args = this.getArguments();
			if (args.length > 2 && args[1].getValue().toUpperCase() === "AS") return args[2].getRange();
			return null;
		}
		getPlatformFlag() {
			let flags = super.getFlags();
			return flags.length === 1 && flags[0].getName() === "platform" ? flags[0] : null;
		}
	};
	exports.From = From;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/healthcheck.js
var require_healthcheck = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Healthcheck = void 0;
	var modifiableInstruction_1 = require_modifiableInstruction();
	var Healthcheck = class extends modifiableInstruction_1.ModifiableInstruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
		stopSearchingForFlags(argument) {
			argument = argument.toUpperCase();
			return argument === "CMD" || argument === "NONE";
		}
		getSubcommand() {
			let args = this.getArguments();
			return args.length !== 0 ? args[0] : null;
		}
	};
	exports.Healthcheck = Healthcheck;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/label.js
var require_label = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Label = void 0;
	var propertyInstruction_1 = require_propertyInstruction();
	var util_1 = require_util();
	var Label = class extends propertyInstruction_1.PropertyInstruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
		getVariables() {
			const variables = super.getVariables();
			const properties = this.getProperties();
			for (const property of properties) {
				const value = property.getUnescapedValue();
				if (value !== null && value.length > 2 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
					const range = property.getValueRange();
					for (let i = 0; i < variables.length; i++) if (util_1.Util.isInsideRange(variables[i].getRange().start, range)) {
						variables.splice(i, 1);
						i--;
					}
				}
			}
			return variables;
		}
		getProperties() {
			return super.getProperties();
		}
	};
	exports.Label = Label;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/onbuild.js
var require_onbuild = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Onbuild = void 0;
	var vscode_languageserver_types_1 = require_main$2();
	var parser_1 = require_parser();
	var instruction_1 = require_instruction();
	var Onbuild = class extends instruction_1.Instruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
		getTrigger() {
			let trigger = this.getTriggerWord();
			return trigger === null ? null : trigger.toUpperCase();
		}
		getTriggerWord() {
			return this.getRangeContent(this.getTriggerRange());
		}
		getTriggerRange() {
			let args = this.getArguments();
			return args.length > 0 ? args[0].getRange() : null;
		}
		getTriggerInstruction() {
			let triggerRange = this.getTriggerRange();
			if (triggerRange === null) return null;
			let args = this.getArguments();
			return parser_1.Parser.createInstruction(this.document, this.dockerfile, this.escapeChar, vscode_languageserver_types_1.Range.create(args[0].getRange().start, this.getRange().end), this.getTriggerWord(), triggerRange);
		}
	};
	exports.Onbuild = Onbuild;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/run.js
var require_run = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Run = void 0;
	var jsonInstruction_1 = require_jsonInstruction();
	var Run = class extends jsonInstruction_1.JSONInstruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
		stopSearchingForFlags(argument) {
			return argument.indexOf("--") === -1;
		}
		/**
		* Returns there here-documents that are defined in this RUN
		* instruction.
		*
		* This API is experimental and subject to change.
		*/
		getHeredocs() {
			return super.getHeredocs();
		}
	};
	exports.Run = Run;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/shell.js
var require_shell = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Shell = void 0;
	var jsonInstruction_1 = require_jsonInstruction();
	var Shell = class extends jsonInstruction_1.JSONInstruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
	};
	exports.Shell = Shell;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/stopsignal.js
var require_stopsignal = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Stopsignal = void 0;
	var instruction_1 = require_instruction();
	var Stopsignal = class extends instruction_1.Instruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
	};
	exports.Stopsignal = Stopsignal;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/workdir.js
var require_workdir = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Workdir = void 0;
	var instruction_1 = require_instruction();
	var Workdir = class extends instruction_1.Instruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
		/**
		* Returns the path that has been defined. Note that this path may
		* be absolute or relative depending on what was written in the
		* instruction.
		*
		* @return the working directory's path, or null if this
		*         instruction has no arguments
		*/
		getPath() {
			return this.getArgumentsContent();
		}
		/**
		* Returns the absolute path that this instruction resolves to. The
		* function will inspect prior WORKDIR instructions in the current
		* image or another build stage in the Dockerfile to try to
		* determine this.
		*
		* @return the absolute path of the working directory, or null if
		*         this instruction has no arguments, or undefined if it
		*         cannot be determined because only relative paths could be
		*         found
		*/
		getAbsolutePath() {
			const path = this.getPath();
			if (path === null || path.startsWith("/")) return path;
			const startLine = this.getRange().start.line;
			const hierarchy = this.dockerfile.getStageHierarchy(startLine);
			for (let i = hierarchy.length - 1; i >= 0; i--) {
				const workdirs = hierarchy[i].getWORKDIRs();
				for (let j = workdirs.length - 1; j >= 0; j--) if (workdirs[j].getRange().start.line < startLine) {
					const parent = workdirs[j].getAbsolutePath();
					if (parent === void 0 || parent === null) return;
					return parent.endsWith("/") ? parent + path : parent + "/" + path;
				}
			}
		}
	};
	exports.Workdir = Workdir;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/user.js
var require_user = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.User = void 0;
	var instruction_1 = require_instruction();
	var User = class extends instruction_1.Instruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
	};
	exports.User = User;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/instructions/volume.js
var require_volume = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Volume = void 0;
	var jsonInstruction_1 = require_jsonInstruction();
	var Volume = class extends jsonInstruction_1.JSONInstruction {
		constructor(document, range, dockerfile, escapeChar, instruction, instructionRange) {
			super(document, range, dockerfile, escapeChar, instruction, instructionRange);
		}
	};
	exports.Volume = Volume;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/imageTemplate.js
var require_imageTemplate = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ImageTemplate = void 0;
	var vscode_languageserver_types_1 = require_main$2();
	var arg_1 = require_arg();
	var cmd_1 = require_cmd();
	var copy_1 = require_copy();
	var env_1 = require_env();
	var entrypoint_1 = require_entrypoint();
	var from_1 = require_from();
	var healthcheck_1 = require_healthcheck();
	var onbuild_1 = require_onbuild();
	var util_1 = require_util();
	var workdir_1 = require_workdir();
	var ImageTemplate = class {
		constructor() {
			this.comments = [];
			this.instructions = [];
		}
		addComment(comment) {
			this.comments.push(comment);
		}
		getComments() {
			return this.comments;
		}
		addInstruction(instruction) {
			this.instructions.push(instruction);
		}
		getInstructions() {
			return this.instructions;
		}
		getInstructionAt(line) {
			for (let instruction of this.instructions) if (util_1.Util.isInsideRange(vscode_languageserver_types_1.Position.create(line, 0), instruction.getRange())) return instruction;
			return null;
		}
		/**
		* Gets all the ARG instructions that are defined in this image.
		*/
		getARGs() {
			let args = [];
			for (let instruction of this.instructions) if (instruction instanceof arg_1.Arg) args.push(instruction);
			return args;
		}
		/**
		* Gets all the CMD instructions that are defined in this image.
		*/
		getCMDs() {
			let cmds = [];
			for (let instruction of this.instructions) if (instruction instanceof cmd_1.Cmd) cmds.push(instruction);
			return cmds;
		}
		/**
		* Gets all the COPY instructions that are defined in this image.
		*/
		getCOPYs() {
			let copies = [];
			for (let instruction of this.instructions) if (instruction instanceof copy_1.Copy) copies.push(instruction);
			return copies;
		}
		/**
		* Gets all the ENTRYPOINT instructions that are defined in this image.
		*/
		getENTRYPOINTs() {
			let froms = [];
			for (let instruction of this.instructions) if (instruction instanceof entrypoint_1.Entrypoint) froms.push(instruction);
			return froms;
		}
		/**
		* Gets all the ENV instructions that are defined in this image.
		*/
		getENVs() {
			let args = [];
			for (let instruction of this.instructions) if (instruction instanceof env_1.Env) args.push(instruction);
			return args;
		}
		getFROM() {
			for (const instruction of this.instructions) if (instruction instanceof from_1.From) return instruction;
			return null;
		}
		/**
		* Gets all the FROM instructions that are defined in this image.
		*/
		getFROMs() {
			let froms = [];
			for (let instruction of this.instructions) if (instruction instanceof from_1.From) froms.push(instruction);
			return froms;
		}
		/**
		* Gets all the HEALTHCHECK instructions that are defined in this image.
		*/
		getHEALTHCHECKs() {
			let froms = [];
			for (let instruction of this.instructions) if (instruction instanceof healthcheck_1.Healthcheck) froms.push(instruction);
			return froms;
		}
		getWORKDIRs() {
			const workdirs = [];
			for (const instruction of this.instructions) if (instruction instanceof workdir_1.Workdir) workdirs.push(instruction);
			return workdirs;
		}
		getOnbuildTriggers() {
			let triggers = [];
			for (let instruction of this.instructions) if (instruction instanceof onbuild_1.Onbuild) {
				let trigger = instruction.getTriggerInstruction();
				if (trigger) triggers.push(trigger);
			}
			return triggers;
		}
		getAvailableVariables(currentLine) {
			const variables = [];
			for (const arg of this.getARGs()) if (arg.isBefore(currentLine)) {
				const property = arg.getProperty();
				if (property) {
					const variable = property.getName();
					if (variables.indexOf(variable) === -1) variables.push(variable);
				}
			}
			for (const env of this.getENVs()) if (env.isBefore(currentLine)) for (const property of env.getProperties()) {
				const variable = property.getName();
				if (variables.indexOf(variable) === -1) variables.push(variable);
			}
			return variables;
		}
		/**
		* Resolves a variable with the given name at the specified line
		* to its value. If null is returned, then the variable has been
		* defined but no value was given. If undefined is returned, then
		* a variable with the given name has not been defined yet as of
		* the given line.
		*
		* @param variable the name of the variable to resolve
		* @param line the line number that the variable is on, zero-based
		* @return the value of the variable as defined by an ARG or ENV
		*         instruction, or null if no value has been specified, or
		*         undefined if a variable with the given name has not
		*         been defined
		*/
		resolveVariable(variable, line) {
			let envs = this.getENVs();
			for (let i = envs.length - 1; i >= 0; i--) if (envs[i].isBefore(line)) {
				for (let property of envs[i].getProperties()) if (property.getName() === variable) return property.getValue();
			}
			let args = this.getARGs();
			for (let i = args.length - 1; i >= 0; i--) if (args[i].isBefore(line)) {
				let property = args[i].getProperty();
				if (property && property.getName() === variable) return property.getValue();
			}
		}
		getRange() {
			const instructions = this.getInstructions();
			if (instructions.length === 0) return vscode_languageserver_types_1.Range.create(0, 0, 0, 0);
			const instructionStart = instructions[0].getRange().start;
			const instructionEnd = instructions[instructions.length - 1].getRange().end;
			return vscode_languageserver_types_1.Range.create(instructionStart, instructionEnd);
		}
		contains(position) {
			const range = this.getRange();
			if (range === null) return false;
			return util_1.Util.isInsideRange(position, range);
		}
	};
	exports.ImageTemplate = ImageTemplate;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/dockerfile.js
var require_dockerfile = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Dockerfile = void 0;
	var vscode_languageserver_types_1 = require_main$2();
	var ast = require_main();
	var imageTemplate_1 = require_imageTemplate();
	var from_1 = require_from();
	var util_1 = require_util();
	var main_1 = require_main();
	var Dockerfile = class extends imageTemplate_1.ImageTemplate {
		constructor(document) {
			super();
			this.initialInstructions = new imageTemplate_1.ImageTemplate();
			this.buildStages = [];
			this.directives = [];
			/**
			* Whether a FROM instruction has been added to this Dockerfile or not.
			*/
			this.foundFrom = false;
			this.document = document;
		}
		getEscapeCharacter() {
			for (const directive of this.directives) if (directive.getDirective() === ast.Directive.escape) {
				const value = directive.getValue();
				if (value === "\\" || value === "`") return value;
			}
			return "\\";
		}
		getInitialARGs() {
			return this.initialInstructions.getARGs();
		}
		getContainingImage(position) {
			let range = vscode_languageserver_types_1.Range.create(vscode_languageserver_types_1.Position.create(0, 0), this.document.positionAt(this.document.getText().length));
			if (!util_1.Util.isInsideRange(position, range)) return null;
			if (this.initialInstructions.getComments().length > 0 || this.initialInstructions.getInstructions().length > 0) {
				if (util_1.Util.isInsideRange(position, this.initialInstructions.getRange())) return this.initialInstructions;
			}
			for (const buildStage of this.buildStages) if (util_1.Util.isInsideRange(position, buildStage.getRange())) return buildStage;
			return this;
		}
		addInstruction(instruction) {
			if (instruction.getKeyword() === main_1.Keyword.FROM) {
				this.currentBuildStage = new imageTemplate_1.ImageTemplate();
				this.buildStages.push(this.currentBuildStage);
				this.foundFrom = true;
			} else if (!this.foundFrom) this.initialInstructions.addInstruction(instruction);
			if (this.foundFrom) this.currentBuildStage.addInstruction(instruction);
			super.addInstruction(instruction);
		}
		setDirectives(directives) {
			this.directives = directives;
		}
		getDirective() {
			return this.directives.length === 0 ? null : this.directives[0];
		}
		getDirectives() {
			return this.directives;
		}
		resolveVariable(variable, line) {
			for (let from of this.getFROMs()) {
				let range = from.getRange();
				if (range.start.line <= line && line <= range.end.line) {
					let initialARGs = new imageTemplate_1.ImageTemplate();
					for (let instruction of this.initialInstructions.getARGs()) initialARGs.addInstruction(instruction);
					return initialARGs.resolveVariable(variable, line);
				}
			}
			let image = this.getContainingImage(vscode_languageserver_types_1.Position.create(line, 0));
			if (image === null) return;
			let resolvedVariable = image.resolveVariable(variable, line);
			if (resolvedVariable === null) {
				let initialARGs = new imageTemplate_1.ImageTemplate();
				for (let instruction of this.initialInstructions.getARGs()) initialARGs.addInstruction(instruction);
				return initialARGs.resolveVariable(variable, line);
			}
			return resolvedVariable;
		}
		getAvailableVariables(currentLine) {
			if (this.getInstructionAt(currentLine) instanceof from_1.From) {
				let variables = [];
				for (let arg of this.getInitialARGs()) {
					let property = arg.getProperty();
					if (property) variables.push(property.getName());
				}
				return variables;
			}
			let image = this.getContainingImage(vscode_languageserver_types_1.Position.create(currentLine, 0));
			return image ? image.getAvailableVariables(currentLine) : [];
		}
		getParentStage(image) {
			const templateFrom = image.getFROM();
			const imageName = templateFrom === null ? null : templateFrom.getImageName();
			if (imageName === null) return null;
			for (const from of this.getFROMs()) if (from.getBuildStage() === imageName) {
				const range = from.getRange();
				if (range.start.line === templateFrom.getRange().start.line) return null;
				return this.getContainingImage(range.start);
			}
			return null;
		}
		getStageHierarchy(line) {
			const image = this.getContainingImage(vscode_languageserver_types_1.Position.create(line, 0));
			if (image === null) return [];
			const stages = [image];
			let stage = this.getParentStage(image);
			while (stage !== null) {
				stages.splice(0, 0, stage);
				stage = this.getParentStage(stage);
			}
			return stages;
		}
		getAvailableWorkingDirectories(line) {
			const availableDirectories = /* @__PURE__ */ new Set();
			for (const image of this.getStageHierarchy(line)) for (const workdir of image.getWORKDIRs()) if (workdir.getRange().end.line < line) {
				let directory = workdir.getAbsolutePath();
				if (directory !== void 0 && directory !== null) {
					if (!directory.endsWith("/")) directory += "/";
					availableDirectories.add(directory);
				}
			}
			return Array.from(availableDirectories);
		}
		/**
		* Internally reorganize the comments in the Dockerfile and allocate
		* them to the relevant build stages that they belong to.
		*/
		organizeComments() {
			const comments = this.getComments();
			for (let i = 0; i < comments.length; i++) if (util_1.Util.isInsideRange(comments[i].getRange().end, this.initialInstructions.getRange())) this.initialInstructions.addComment(comments[i]);
			else for (const buildStage of this.buildStages) if (util_1.Util.isInsideRange(comments[i].getRange().start, buildStage.getRange())) buildStage.addComment(comments[i]);
		}
		getRange() {
			const comments = this.getComments();
			const instructions = this.getInstructions();
			let range = null;
			if (comments.length === 0) {
				if (instructions.length > 0) range = vscode_languageserver_types_1.Range.create(instructions[0].getRange().start, instructions[instructions.length - 1].getRange().end);
			} else if (instructions.length === 0) range = vscode_languageserver_types_1.Range.create(comments[0].getRange().start, comments[comments.length - 1].getRange().end);
			else {
				const commentStart = comments[0].getRange().start;
				const commentEnd = comments[comments.length - 1].getRange().end;
				const instructionStart = instructions[0].getRange().start;
				const instructionEnd = instructions[instructions.length - 1].getRange().end;
				if (commentStart.line < instructionStart.line) {
					if (commentEnd.line < instructionEnd.line) range = vscode_languageserver_types_1.Range.create(commentStart, instructionEnd);
					range = vscode_languageserver_types_1.Range.create(commentStart, commentEnd);
				} else if (commentEnd.line < instructionEnd.line) range = vscode_languageserver_types_1.Range.create(instructionStart, instructionEnd);
				else range = vscode_languageserver_types_1.Range.create(instructionStart, commentEnd);
			}
			if (range === null) {
				if (this.directives.length === 0) return null;
				return this.directives[0].getRange();
			} else if (this.directives.length === 0) return range;
			return vscode_languageserver_types_1.Range.create(this.directives[0].getRange().start, range.end);
		}
	};
	exports.Dockerfile = Dockerfile;
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/parser.js
var require_parser = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Parser = void 0;
	var vscode_languageserver_textdocument_1 = require_main$1();
	var vscode_languageserver_types_1 = require_main$2();
	var comment_1 = require_comment();
	var parserDirective_1 = require_parserDirective();
	var instruction_1 = require_instruction();
	var add_1 = require_add();
	var arg_1 = require_arg();
	var cmd_1 = require_cmd();
	var copy_1 = require_copy();
	var env_1 = require_env();
	var entrypoint_1 = require_entrypoint();
	var from_1 = require_from();
	var healthcheck_1 = require_healthcheck();
	var label_1 = require_label();
	var onbuild_1 = require_onbuild();
	var run_1 = require_run();
	var shell_1 = require_shell();
	var stopsignal_1 = require_stopsignal();
	var workdir_1 = require_workdir();
	var user_1 = require_user();
	var volume_1 = require_volume();
	var dockerfile_1 = require_dockerfile();
	var util_1 = require_util();
	var main_1 = require_main();
	exports.Parser = class Parser {
		constructor() {
			this.escapeChar = null;
		}
		static createInstruction(document, dockerfile, escapeChar, lineRange, instruction, instructionRange) {
			switch (instruction.toUpperCase()) {
				case "ADD": return new add_1.Add(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
				case "ARG": return new arg_1.Arg(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
				case "CMD": return new cmd_1.Cmd(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
				case "COPY": return new copy_1.Copy(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
				case "ENTRYPOINT": return new entrypoint_1.Entrypoint(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
				case "ENV": return new env_1.Env(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
				case "FROM": return new from_1.From(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
				case "HEALTHCHECK": return new healthcheck_1.Healthcheck(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
				case "LABEL": return new label_1.Label(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
				case "ONBUILD": return new onbuild_1.Onbuild(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
				case "RUN": return new run_1.Run(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
				case "SHELL": return new shell_1.Shell(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
				case "STOPSIGNAL": return new stopsignal_1.Stopsignal(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
				case "WORKDIR": return new workdir_1.Workdir(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
				case "USER": return new user_1.User(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
				case "VOLUME": return new volume_1.Volume(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
			}
			return new instruction_1.Instruction(document, lineRange, dockerfile, escapeChar, instruction, instructionRange);
		}
		getParserDirectives(document, buffer) {
			const directives = [];
			this.escapeChar = "";
			const offset = util_1.Util.isUTF8BOM(buffer.substring(0, 1)) ? 1 : 0;
			directiveCheck: for (let i = offset; i < buffer.length; i++) switch (buffer.charAt(i)) {
				case " ":
				case "	": break;
				case "\r":
				case "\n": break directiveCheck;
				case "#":
					let directiveStart = -1;
					let directiveEnd = -1;
					for (let j = i + 1; j < buffer.length; j++) {
						let char = buffer.charAt(j);
						switch (char) {
							case " ":
							case "	":
								if (directiveStart !== -1 && directiveEnd === -1) directiveEnd = j;
								break;
							case "\r":
							case "\n": break directiveCheck;
							case "=":
								let valueStart = -1;
								let valueEnd = -1;
								if (directiveEnd === -1) directiveEnd = j;
								let lineEnd = buffer.length;
								directiveValue: for (let k = j + 1; k < buffer.length; k++) {
									char = buffer.charAt(k);
									switch (char) {
										case "\r":
										case "\n":
											if (valueStart !== -1 && valueEnd === -1) valueEnd = k;
											lineEnd = k;
											break directiveValue;
										case "	":
										case " ":
											if (valueStart !== -1 && valueEnd === -1) valueEnd = k;
											continue;
										default:
											if (valueStart === -1) valueStart = k;
											break;
									}
								}
								if (directiveStart === -1) break directiveCheck;
								if (valueStart === -1) {
									valueStart = j + 1;
									valueEnd = lineEnd;
								} else if (valueEnd === -1) valueEnd = buffer.length;
								const lineRange = vscode_languageserver_types_1.Range.create(document.positionAt(i), document.positionAt(lineEnd));
								const nameRange = vscode_languageserver_types_1.Range.create(document.positionAt(directiveStart), document.positionAt(directiveEnd));
								const valueRange = vscode_languageserver_types_1.Range.create(document.positionAt(valueStart), document.positionAt(valueEnd));
								directives.push(new parserDirective_1.ParserDirective(document, lineRange, nameRange, valueRange));
								directiveStart = -1;
								if (buffer.charAt(valueEnd) === "\r") i = valueEnd + 1;
								else i = valueEnd;
								continue directiveCheck;
							default:
								if (directiveStart === -1) directiveStart = j;
								break;
						}
					}
					break;
				default: break directiveCheck;
			}
			return directives;
		}
		parse(buffer) {
			this.document = vscode_languageserver_textdocument_1.TextDocument.create("", "", 0, buffer);
			this.buffer = buffer;
			let dockerfile = new dockerfile_1.Dockerfile(this.document);
			let directives = this.getParserDirectives(this.document, this.buffer);
			let offset = 0;
			this.escapeChar = "\\";
			if (directives.length > 0) {
				dockerfile.setDirectives(directives);
				this.escapeChar = dockerfile.getEscapeCharacter();
				offset = this.document.offsetAt(vscode_languageserver_types_1.Position.create(directives.length, 0));
			} else if (util_1.Util.isUTF8BOM(buffer.substring(0, 1))) offset = 1;
			for (let i = offset; i < this.buffer.length; i++) {
				const char = this.buffer.charAt(i);
				switch (char) {
					case " ":
					case "	":
					case "\r":
					case "\n": break;
					case "#":
						i = this.processComment(dockerfile, i);
						break;
					default:
						i = this.processInstruction(dockerfile, char, i);
						break;
				}
			}
			dockerfile.organizeComments();
			return dockerfile;
		}
		processInstruction(dockerfile, char, start) {
			let instruction = char;
			let instructionEnd = -1;
			let escapedInstruction = false;
			instructionCheck: for (let i = start + 1; i < this.buffer.length; i++) {
				char = this.buffer.charAt(i);
				switch (char) {
					case this.escapeChar:
						escapedInstruction = true;
						char = this.buffer.charAt(i + 1);
						if (char === "\r" || char === "\n") {
							if (instructionEnd === -1) instructionEnd = i;
							i++;
						} else if (char === " " || char === "	") {
							for (let j = i + 2; j < this.buffer.length; j++) switch (this.buffer.charAt(j)) {
								case " ":
								case "	": break;
								case "\r":
								case "\n":
									i = j;
									continue instructionCheck;
								default:
									instructionEnd = i + 1;
									instruction = instruction + this.escapeChar;
									i = j - 2;
									continue instructionCheck;
							}
							instructionEnd = i + 1;
							instruction = instruction + this.escapeChar;
							break instructionCheck;
						} else {
							instructionEnd = i + 1;
							instruction = instruction + this.escapeChar;
							escapedInstruction = false;
						}
						break;
					case " ":
					case "	":
						if (escapedInstruction) {
							escapeCheck: for (let j = i + 1; j < this.buffer.length; j++) switch (this.buffer.charAt(j)) {
								case " ":
								case "	": break;
								case "\r":
								case "\n":
									i = j;
									continue instructionCheck;
								default: break escapeCheck;
							}
							escapedInstruction = false;
						}
						if (instructionEnd === -1) instructionEnd = i;
						i = this.processArguments(dockerfile, instruction, instructionEnd, start, i);
						dockerfile.addInstruction(this.createInstruction(dockerfile, instruction, start, instructionEnd, i));
						return i;
					case "\r":
					case "\n":
						if (escapedInstruction) continue;
						if (instructionEnd === -1) instructionEnd = i;
						dockerfile.addInstruction(this.createInstruction(dockerfile, instruction, start, i, i));
						return i;
					case "#": if (escapedInstruction) continue;
					default:
						instructionEnd = i + 1;
						instruction = instruction + char;
						escapedInstruction = false;
						break;
				}
			}
			if (instructionEnd === -1) instructionEnd = this.buffer.length;
			dockerfile.addInstruction(this.createInstruction(dockerfile, instruction, start, instructionEnd, this.buffer.length));
			return this.buffer.length;
		}
		processHeredocs(instruction, offset) {
			let keyword = instruction.getKeyword();
			if (keyword === main_1.Keyword.ONBUILD) {
				instruction = instruction.getTriggerInstruction();
				if (instruction === null) return offset;
				keyword = instruction.getKeyword();
			}
			if (keyword !== main_1.Keyword.ADD && keyword !== main_1.Keyword.COPY && keyword !== main_1.Keyword.RUN) return offset;
			const heredocs = [];
			let tabbed = false;
			for (const arg of instruction.getArguments()) {
				const value = arg.getValue();
				if (value.startsWith("<<") && value.length > 2) {
					if (value.startsWith("<<-")) tabbed = true;
					const name = util_1.Util.parseHeredocName(value);
					if (name !== null) heredocs.push(name);
				}
			}
			if (heredocs.length > 0) for (const heredoc of heredocs) offset = this.parseHeredoc(heredoc, offset, tabbed);
			return offset;
		}
		processArguments(dockerfile, instruction, instructionEnd, start, offset) {
			let escaped = false;
			argumentsCheck: for (let i = offset + 1; i < this.buffer.length; i++) switch (this.buffer.charAt(i)) {
				case "\r":
				case "\n":
					if (escaped) continue;
					return this.processHeredocs(this.createInstruction(dockerfile, instruction, start, instructionEnd, i), i);
				case this.escapeChar:
					const next = this.buffer.charAt(i + 1);
					if (next === "\n" || next === "\r") {
						escaped = true;
						i++;
					} else if (next === " " || next === "	") {
						for (let j = i + 2; j < this.buffer.length; j++) switch (this.buffer.charAt(j)) {
							case " ":
							case "	": break;
							case "\r":
							case "\n": escaped = true;
							default:
								i = j;
								continue argumentsCheck;
						}
						return this.buffer.length;
					}
					continue;
				case "#":
					if (escaped) {
						i = this.processComment(dockerfile, i);
						continue argumentsCheck;
					}
					break;
				case " ":
				case "	": break;
				default:
					if (escaped) escaped = false;
					break;
			}
			return this.buffer.length;
		}
		processComment(dockerfile, start) {
			let end = this.buffer.length;
			commentLoop: for (let i = start + 1; i < this.buffer.length; i++) switch (this.buffer.charAt(i)) {
				case "\r":
				case "\n":
					end = i;
					break commentLoop;
			}
			const range = vscode_languageserver_types_1.Range.create(this.document.positionAt(start), this.document.positionAt(end));
			dockerfile.addComment(new comment_1.Comment(this.document, range));
			return end;
		}
		parseHeredoc(heredocName, offset, tabbed) {
			let startWord = -1;
			let lineStart = true;
			for (let i = offset; i < this.buffer.length; i++) switch (this.buffer.charAt(i)) {
				case " ":
					lineStart = false;
					break;
				case "	":
					if (!tabbed) lineStart = false;
					break;
				case "\r":
				case "\n":
					if (startWord !== -1 && heredocName === this.buffer.substring(startWord, i)) return i;
					startWord = -1;
					lineStart = true;
					break;
				default:
					if (lineStart) {
						startWord = i;
						lineStart = false;
					}
					break;
			}
			return this.buffer.length;
		}
		createInstruction(dockerfile, instruction, start, instructionEnd, end) {
			const startPosition = this.document.positionAt(start);
			const instructionRange = vscode_languageserver_types_1.Range.create(startPosition, this.document.positionAt(instructionEnd));
			const lineRange = vscode_languageserver_types_1.Range.create(startPosition, this.document.positionAt(end));
			return Parser.createInstruction(this.document, dockerfile, this.escapeChar, lineRange, instruction, instructionRange);
		}
	};
}));
//#endregion
//#region node_modules/.pnpm/dockerfile-ast@0.7.1/node_modules/dockerfile-ast/lib/main.js
var require_main = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.DockerfileParser = exports.DefaultVariables = exports.Directive = exports.Keyword = exports.Workdir = exports.Volume = exports.User = exports.Stopsignal = exports.Shell = exports.Run = exports.PropertyInstruction = exports.Onbuild = exports.ModifiableInstruction = exports.Label = exports.JSONInstruction = exports.Heredoc = exports.Healthcheck = exports.From = exports.Env = exports.Entrypoint = exports.Copy = exports.Cmd = exports.Arg = exports.Add = exports.Variable = exports.Property = exports.ParserDirective = exports.Line = exports.Instruction = exports.Flag = exports.Comment = exports.JSONArgument = exports.Argument = void 0;
	var argument_1 = require_argument();
	Object.defineProperty(exports, "Argument", {
		enumerable: true,
		get: function() {
			return argument_1.Argument;
		}
	});
	var jsonArgument_1 = require_jsonArgument();
	Object.defineProperty(exports, "JSONArgument", {
		enumerable: true,
		get: function() {
			return jsonArgument_1.JSONArgument;
		}
	});
	var comment_1 = require_comment();
	Object.defineProperty(exports, "Comment", {
		enumerable: true,
		get: function() {
			return comment_1.Comment;
		}
	});
	var parser_1 = require_parser();
	var flag_1 = require_flag();
	Object.defineProperty(exports, "Flag", {
		enumerable: true,
		get: function() {
			return flag_1.Flag;
		}
	});
	var instruction_1 = require_instruction();
	Object.defineProperty(exports, "Instruction", {
		enumerable: true,
		get: function() {
			return instruction_1.Instruction;
		}
	});
	var line_1 = require_line();
	Object.defineProperty(exports, "Line", {
		enumerable: true,
		get: function() {
			return line_1.Line;
		}
	});
	var parserDirective_1 = require_parserDirective();
	Object.defineProperty(exports, "ParserDirective", {
		enumerable: true,
		get: function() {
			return parserDirective_1.ParserDirective;
		}
	});
	var property_1 = require_property();
	Object.defineProperty(exports, "Property", {
		enumerable: true,
		get: function() {
			return property_1.Property;
		}
	});
	var variable_1 = require_variable();
	Object.defineProperty(exports, "Variable", {
		enumerable: true,
		get: function() {
			return variable_1.Variable;
		}
	});
	var add_1 = require_add();
	Object.defineProperty(exports, "Add", {
		enumerable: true,
		get: function() {
			return add_1.Add;
		}
	});
	var arg_1 = require_arg();
	Object.defineProperty(exports, "Arg", {
		enumerable: true,
		get: function() {
			return arg_1.Arg;
		}
	});
	var cmd_1 = require_cmd();
	Object.defineProperty(exports, "Cmd", {
		enumerable: true,
		get: function() {
			return cmd_1.Cmd;
		}
	});
	var copy_1 = require_copy();
	Object.defineProperty(exports, "Copy", {
		enumerable: true,
		get: function() {
			return copy_1.Copy;
		}
	});
	var entrypoint_1 = require_entrypoint();
	Object.defineProperty(exports, "Entrypoint", {
		enumerable: true,
		get: function() {
			return entrypoint_1.Entrypoint;
		}
	});
	var env_1 = require_env();
	Object.defineProperty(exports, "Env", {
		enumerable: true,
		get: function() {
			return env_1.Env;
		}
	});
	var from_1 = require_from();
	Object.defineProperty(exports, "From", {
		enumerable: true,
		get: function() {
			return from_1.From;
		}
	});
	var healthcheck_1 = require_healthcheck();
	Object.defineProperty(exports, "Healthcheck", {
		enumerable: true,
		get: function() {
			return healthcheck_1.Healthcheck;
		}
	});
	var heredoc_1 = require_heredoc();
	Object.defineProperty(exports, "Heredoc", {
		enumerable: true,
		get: function() {
			return heredoc_1.Heredoc;
		}
	});
	var jsonInstruction_1 = require_jsonInstruction();
	Object.defineProperty(exports, "JSONInstruction", {
		enumerable: true,
		get: function() {
			return jsonInstruction_1.JSONInstruction;
		}
	});
	var label_1 = require_label();
	Object.defineProperty(exports, "Label", {
		enumerable: true,
		get: function() {
			return label_1.Label;
		}
	});
	var modifiableInstruction_1 = require_modifiableInstruction();
	Object.defineProperty(exports, "ModifiableInstruction", {
		enumerable: true,
		get: function() {
			return modifiableInstruction_1.ModifiableInstruction;
		}
	});
	var onbuild_1 = require_onbuild();
	Object.defineProperty(exports, "Onbuild", {
		enumerable: true,
		get: function() {
			return onbuild_1.Onbuild;
		}
	});
	var propertyInstruction_1 = require_propertyInstruction();
	Object.defineProperty(exports, "PropertyInstruction", {
		enumerable: true,
		get: function() {
			return propertyInstruction_1.PropertyInstruction;
		}
	});
	var run_1 = require_run();
	Object.defineProperty(exports, "Run", {
		enumerable: true,
		get: function() {
			return run_1.Run;
		}
	});
	var shell_1 = require_shell();
	Object.defineProperty(exports, "Shell", {
		enumerable: true,
		get: function() {
			return shell_1.Shell;
		}
	});
	var stopsignal_1 = require_stopsignal();
	Object.defineProperty(exports, "Stopsignal", {
		enumerable: true,
		get: function() {
			return stopsignal_1.Stopsignal;
		}
	});
	var user_1 = require_user();
	Object.defineProperty(exports, "User", {
		enumerable: true,
		get: function() {
			return user_1.User;
		}
	});
	var volume_1 = require_volume();
	Object.defineProperty(exports, "Volume", {
		enumerable: true,
		get: function() {
			return volume_1.Volume;
		}
	});
	var workdir_1 = require_workdir();
	Object.defineProperty(exports, "Workdir", {
		enumerable: true,
		get: function() {
			return workdir_1.Workdir;
		}
	});
	var Keyword;
	(function(Keyword) {
		Keyword["ADD"] = "ADD";
		Keyword["ARG"] = "ARG";
		Keyword["CMD"] = "CMD";
		Keyword["COPY"] = "COPY";
		Keyword["ENTRYPOINT"] = "ENTRYPOINT";
		Keyword["ENV"] = "ENV";
		Keyword["EXPOSE"] = "EXPOSE";
		Keyword["FROM"] = "FROM";
		Keyword["HEALTHCHECK"] = "HEALTHCHECK";
		Keyword["LABEL"] = "LABEL";
		Keyword["MAINTAINER"] = "MAINTAINER";
		Keyword["ONBUILD"] = "ONBUILD";
		Keyword["RUN"] = "RUN";
		Keyword["SHELL"] = "SHELL";
		Keyword["STOPSIGNAL"] = "STOPSIGNAL";
		Keyword["USER"] = "USER";
		Keyword["VOLUME"] = "VOLUME";
		Keyword["WORKDIR"] = "WORKDIR";
	})(Keyword || (exports.Keyword = Keyword = {}));
	var Directive;
	(function(Directive) {
		Directive["escape"] = "escape";
		Directive["syntax"] = "syntax";
	})(Directive || (exports.Directive = Directive = {}));
	exports.DefaultVariables = [
		"ALL_PROXY",
		"all_proxy",
		"FTP_PROXY",
		"ftp_proxy",
		"HTTP_PROXY",
		"http_proxy",
		"HTTPS_PROXY",
		"https_proxy",
		"NO_PROXY",
		"no_proxy"
	];
	var DockerfileParser;
	(function(DockerfileParser) {
		function parse(content) {
			return new parser_1.Parser().parse(content);
		}
		DockerfileParser.parse = parse;
	})(DockerfileParser || (exports.DockerfileParser = DockerfileParser = {}));
}));
//#endregion
//#region node_modules/.pnpm/e2b@2.46.1/node_modules/e2b/dist/index.mjs
var import_main = require_main();
var version = "2.46.1";
/**
* Class-agnostic checks for web platform objects.
*
* `value instanceof Blob` does not answer "is this a Blob", it answers "was
* this minted by *the* `Blob` class this module happens to see". In a Node
* process those are different questions: libraries replace the web globals the
* same way they replace `globalThis.fetch` — `@hono/node-server` installs its
* own `Request`, remix's `installGlobals()` swaps `Request`/`Blob`/`File`,
* `web-streams-polyfill` swaps `ReadableStream`, jsdom-based test environments
* bring their own copies of all of them — and values also cross realms
* (`node:vm`, `worker_threads`). A perfectly good Blob then fails that check —
* a *brand* check, in spec terms — and the SDK silently takes the wrong branch.
*
* The failure modes are not theoretical; each one is covered by a test:
* - a Request the current global class disowns is handed to undici verbatim and
*   every API call dies with `Failed to parse URL from [object Request]`;
* - a foreign `Blob` or `ReadableStream` body is stringified by the platform,
*   so the upload silently contains the text `[object Blob]`;
* - a foreign `ReadableStream` upload is buffered into memory instead of
*   streamed, or hangs when piped through `CompressionStream`;
* - a foreign `Blob` response body reads back as an empty file.
*
* So ask what a value *is*, not who made it: keep `instanceof` as the fast
* path, then fall back to the members and `Symbol.toStringTag` the platform
* guarantees. Detection is only half of it — see `toBlob`/`toUploadBody` in
* `utils.ts`, which convert what they detect into a native equivalent before
* handing it to the platform.
*/
function isObject(value) {
	return typeof value === "object" && value !== null;
}
/**
* The value's `Symbol.toStringTag`, e.g. `'Blob'` for anything implementing the
* `Blob` interface. Spec'd for every web platform interface and inherited by
* subclasses, so it survives both realm and class swaps. Same one-liner
* `@sindresorhus/is` uses for the types it covers (`Blob`, `ArrayBuffer`; it has
* no `Request` or `ReadableStream` check, which is why this module exists).
*/
function platformTag(value) {
	return Object.prototype.toString.call(value).slice(8, -1);
}
/**
* Whether `value` should be treated as a `Request`.
*
* Duck-typed on `url` + `method` + `clone` rather than on the tag, because
* older `fetch` ponyfills predate `Symbol.toStringTag`; `clone` is what
* separates a `Request` from other `{ url, method }` carriers such as Node's
* `IncomingMessage`.
*/
function isRequestLike(value) {
	return value instanceof Request || isObject(value) && typeof value.url === "string" && typeof value.method === "string" && typeof value.clone === "function";
}
/**
* Whether `value` should be treated as a `Blob` (or a `File`, which is a
* `Blob`).
*
* `arrayBuffer` is the only member required beyond the tag, because reading the
* bytes is all the SDK ever does with a Blob it didn't make — asking for
* `stream` too would turn implementations that lack it into corrupted uploads
* for no gain.
*/
function isBlobLike(value) {
	if (value instanceof Blob) return true;
	if (!isObject(value)) return false;
	const tag = platformTag(value);
	return (tag === "Blob" || tag === "File") && typeof value.arrayBuffer === "function";
}
/**
* Whether `value` should be treated as a `ReadableStream`.
*
* `getReader` + `tee` + `cancel` is unmistakable enough to skip the tag, which
* keeps this working for stream implementations that only got a
* `Symbol.toStringTag` in later versions.
*/
function isReadableStreamLike(value) {
	return value instanceof ReadableStream || isObject(value) && typeof value.getReader === "function" && typeof value.tee === "function" && typeof value.cancel === "function";
}
function getRuntime() {
	var _navigator, _process;
	if (globalThis.Bun) return {
		runtime: "bun",
		version: globalThis.Bun.version
	};
	if (globalThis.Deno) return {
		runtime: "deno",
		version: globalThis.Deno.version.deno
	};
	if (typeof EdgeRuntime === "string") return {
		runtime: "vercel-edge",
		version: "unknown"
	};
	if (((_navigator = globalThis.navigator) === null || _navigator === void 0 ? void 0 : _navigator.userAgent) === "Cloudflare-Workers") return {
		runtime: "cloudflare-worker",
		version: "unknown"
	};
	if (((_process = globalThis.process) === null || _process === void 0 || (_process = _process.release) === null || _process === void 0 ? void 0 : _process.name) === "node") return {
		runtime: "node",
		version: import_platform.default.version || "unknown"
	};
	if (typeof window !== "undefined") return {
		runtime: "browser",
		version: import_platform.default.version || "unknown"
	};
	return {
		runtime: "unknown",
		version: "unknown"
	};
}
var { runtime, version: runtimeVersion } = getRuntime();
async function sha256(data) {
	const dataBuffer = new TextEncoder().encode(data);
	const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
	const hashArray = new Uint8Array(hashBuffer);
	return btoa(String.fromCharCode(...hashArray));
}
function timeoutToSeconds(timeout) {
	return Math.ceil(timeout / 1e3);
}
/**
* Import an optional, runtime-resolved package (e.g. `undici`, `glob`, `tar`)
* without letting downstream bundlers resolve it at build time.
*
* The variable specifier plus the `webpackIgnore`/`@vite-ignore` annotations
* keep the import opaque to bundlers, so browser/edge builds don't try to
* pull node-only packages into the bundle, while plain Node resolves it
* natively at runtime.
*/
async function dynamicImport(module) {
	if (runtime === "browser") throw new Error("Browser runtime is not supported for dynamic import");
	return await import(
		/* webpackIgnore: true */
		/* @vite-ignore */
		module
);
}
function ansiRegex({ onlyFirst = false } = {}) {
	return new RegExp(`(?:\\u001B[\\]PX^_][\\s\\S]*?(?:\\u0007|\\u001B\\u005C|\\u009C))|[\\u001B\\u009B][[\\]()#;?]*(?:\\d{1,4}(?:[;:]\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]`, onlyFirst ? void 0 : "g");
}
function stripAnsi(text) {
	return text.replace(ansiRegex(), "");
}
/**
* Adopt a stream from a polyfill, a replaced global, or another realm into the
* current `ReadableStream` class by pumping it through a new one. Reading
* through the public reader is the portable part of a stream.
*
* Needed wherever the stream is handed to another platform primitive that
* brand-checks it — `pipeThrough(new CompressionStream(…))` on a foreign stream
* never settles.
*/
function toNativeStream(stream) {
	if (stream instanceof ReadableStream) return stream;
	const reader = stream.getReader();
	return new ReadableStream({
		async pull(controller) {
			const { done, value } = await reader.read();
			if (done) {
				controller.close();
				return;
			}
			controller.enqueue(value);
		},
		cancel(reason) {
			return reader.cancel(reason);
		}
	});
}
/**
* Adopt a stream only if the platform would not accept it as a request body —
* handed one it doesn't accept, it stringifies it to
* `"[object ReadableStream]"`.
*
* Two kinds are accepted: the platform's own stream class, and any async
* iterable. Async iterability is the half that survives a replaced global — a
* native stream stays async-iterable even when `globalThis.ReadableStream` is a
* polyfill — so re-wrapping one of those would only trade a stream the platform
* accepts for one it may not.
*/
function toDispatchableStream(stream) {
	return stream instanceof ReadableStream || Symbol.asyncIterator in stream ? stream : toNativeStream(stream);
}
/**
* Convert data to a Blob, avoiding unnecessary conversions when possible.
*/
async function toBlob(data) {
	if (data instanceof Blob) return data;
	if (isBlobLike(data)) return new Blob([await data.arrayBuffer()], { type: data.type });
	if (isReadableStreamLike(data)) return new Response(toDispatchableStream(data)).blob();
	return new Blob([data]);
}
var UNSAFE_SHELL_CHAR = /[^\w@%+=:,./-]/;
/**
* Quote a string for safe interpolation into a POSIX shell command.
*
* Faithful port of Python's `shlex.quote`: an empty string becomes `''`,
* values containing only safe characters are returned unchanged (keeping
* generated commands stable and cache-friendly), and anything else is wrapped
* in single quotes with embedded single quotes escaped as `'"'"'`.
*/
function shellQuote(s) {
	if (s === "") return "''";
	if (!UNSAFE_SHELL_CHAR.test(s)) return s;
	return "'" + s.replace(/'/g, "'\"'\"'") + "'";
}
/**
* Prepare data for upload, optionally gzip-compressed.
*
* Outside the browser, streams (and gzip-compressed data) are uploaded as a
* `ReadableStream` so they don't have to be buffered in memory. Browsers don't
* support streaming request bodies, so data is buffered into a Blob there.
*/
async function toUploadBody(data, gzip) {
	if (gzip) {
		const compressed = (isReadableStreamLike(data) ? toNativeStream(data) : (await toBlob(data)).stream()).pipeThrough(new CompressionStream("gzip"));
		return runtime === "browser" ? {
			body: await new Response(compressed).blob(),
			streamed: false
		} : {
			body: compressed,
			streamed: true
		};
	}
	if (isReadableStreamLike(data) && runtime !== "browser") return {
		body: toDispatchableStream(data),
		streamed: true
	};
	return {
		body: await toBlob(data),
		streamed: false
	};
}
var _platform$os;
var defaultHeaders = {
	browser: typeof window !== "undefined" && import_platform.default.name || "unknown",
	lang: "js",
	lang_version: runtimeVersion,
	package_version: version,
	publisher: "e2b",
	sdk_runtime: runtime,
	system: ((_platform$os = import_platform.default.os) === null || _platform$os === void 0 ? void 0 : _platform$os.family) || "unknown"
};
function getEnvVar(name) {
	if (runtime === "deno") return Deno.env.get(name);
	if (typeof processModule === "undefined") return "";
	return processModule.env[name];
}
/**
* Parse an env var as a base-10 integer, falling back to `defaultValue` when
* the env var is unset. Throws on non-integer input rather than silently
* falling back so misconfiguration is surfaced loudly.
*/
function parseIntEnv(name, defaultValue) {
	const raw = getEnvVar(name);
	if (!raw) return defaultValue;
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed)) throw new Error(`Invalid ${name}=${JSON.stringify(raw)}: expected an integer.`);
	return parsed;
}
/**
* Parse an env var that must be a positive integer (>= 1). Throws on
* non-positive or non-integer input.
*/
function parsePositiveIntEnv(name, defaultValue) {
	const parsed = parseIntEnv(name, defaultValue);
	if (parsed < 1) throw new Error(`Invalid ${name}=${parsed}: expected a positive integer.`);
	return parsed;
}
/**
* Parse an inflight-limit env var. Returns `0` to disable the cap (documented
* opt-out) or a positive integer to cap concurrency. Throws on non-integer or
* negative values so misconfiguration is surfaced loudly rather than silently
* removing the cap. A return value of `0` is recognized by
* {@link limitConcurrency} as "no cap".
*/
function parseInflightLimitEnv(name, defaultValue) {
	const parsed = parseIntEnv(name, defaultValue);
	if (parsed < 0) throw new Error(`Invalid ${name}=${parsed}: expected a non-negative integer (use 0 to disable the cap).`);
	return parsed;
}
function _typeof(o) {
	"@babel/helpers - typeof";
	return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
		return typeof o;
	} : function(o) {
		return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
	}, _typeof(o);
}
function toPrimitive(t, r) {
	if ("object" != _typeof(t) || !t) return t;
	var e = t[Symbol.toPrimitive];
	if (void 0 !== e) {
		var i = e.call(t, r || "default");
		if ("object" != _typeof(i)) return i;
		throw new TypeError("@@toPrimitive must return a primitive value.");
	}
	return ("string" === r ? String : Number)(t);
}
function toPropertyKey(t) {
	var i = toPrimitive(t, "string");
	return "symbol" == _typeof(i) ? i : i + "";
}
function _defineProperty(e, r, t) {
	return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
		value: t,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[r] = t, e;
}
/**
* Simple FIFO semaphore used to cap the number of in-flight requests sent
* through a fetch dispatcher.
*/
var Semaphore = class {
	constructor(max) {
		this.max = max;
		_defineProperty(this, "active", 0);
		_defineProperty(this, "queue", []);
	}
	async acquire(signal) {
		var _this = this;
		if (signal === null || signal === void 0 ? void 0 : signal.aborted) throw abortReason(signal);
		if (_this.active < _this.max) {
			_this.active++;
			return () => _this.release();
		}
		return new Promise((resolve, reject) => {
			const onAcquire = () => {
				signal === null || signal === void 0 || signal.removeEventListener("abort", onAbort);
				_this.active++;
				resolve(() => _this.release());
			};
			const onAbort = () => {
				const i = _this.queue.indexOf(onAcquire);
				if (i >= 0) _this.queue.splice(i, 1);
				reject(abortReason(signal));
			};
			_this.queue.push(onAcquire);
			signal === null || signal === void 0 || signal.addEventListener("abort", onAbort, { once: true });
		});
	}
	release() {
		this.active--;
		const next = this.queue.shift();
		if (next) next();
	}
};
function abortReason(signal) {
	var _signal$reason;
	return (_signal$reason = signal === null || signal === void 0 ? void 0 : signal.reason) !== null && _signal$reason !== void 0 ? _signal$reason : new DOMException("Aborted", "AbortError");
}
/**
* Wrap `fetcher` so at most `max` requests are in-flight at any time.
* Subsequent requests are FIFO-queued inside the SDK process and dispatched
* as earlier requests settle.
*
* NOTE: the slot is released as soon as `fetcher` resolves with the response
* headers, not when the response body is fully consumed. This means the
* effective concurrency can be higher than `max` while bodies are
* still streaming.
*
* TODO: release on body end (consume/cancel/error) so the
* SDK-level cap aligns with the dispatcher's connection accounting
*/
function limitConcurrency(fetcher, max) {
	if (!Number.isFinite(max) || max <= 0) return fetcher;
	const sem = new Semaphore(max);
	return (async (input, init) => {
		var _init$signal;
		const signal = (_init$signal = init === null || init === void 0 ? void 0 : init.signal) !== null && _init$signal !== void 0 ? _init$signal : isRequestLike(input) ? input.signal : void 0;
		const release = await sem.acquire(signal);
		try {
			return await fetcher(input, init);
		} finally {
			release();
		}
	});
}
function ownKeys(e, r) {
	var t = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var o = Object.getOwnPropertySymbols(e);
		r && (o = o.filter(function(r) {
			return Object.getOwnPropertyDescriptor(e, r).enumerable;
		})), t.push.apply(t, o);
	}
	return t;
}
function _objectSpread2(e) {
	for (var r = 1; r < arguments.length; r++) {
		var t = null != arguments[r] ? arguments[r] : {};
		r % 2 ? ownKeys(Object(t), !0).forEach(function(r) {
			_defineProperty(e, r, t[r]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
			Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
		});
	}
	return e;
}
var UNDICI_8_MIN_NODE = "22.19.0";
function getUndiciPackageCandidates(nodeVersion) {
	if (compareVersions(nodeVersion, UNDICI_8_MIN_NODE) >= 0) return ["undici8", "undici"];
	return ["undici"];
}
async function loadUndici() {
	for (const packageName of getUndiciPackageCandidates(processModule.versions.node)) try {
		return await dynamicImport(packageName);
	} catch (_unused) {}
}
/**
* Late-bind the global fetch: runtimes and tools (msw, instrumentation) may
* replace `globalThis.fetch` after the SDK builds a fetcher. A factory rather
* than a shared const so per-proxy cache entries stay distinct closures.
*/
function lateBoundGlobalFetch() {
	return ((input, init) => globalThis.fetch(input, init));
}
/**
* Create a fetch for the given runtime. Outside Node it late-binds the global
* fetch. On Node it lazily runs `build` on the first request and caches the
* built fetcher; a failed build is not cached, so the next request retries
* instead of replaying the same stale rejection forever.
*/
function createRuntimeFetch(currentRuntime, build) {
	if (currentRuntime !== "node") return lateBoundGlobalFetch();
	let fetcherPromise;
	return (async (input, init) => {
		var _fetcherPromise;
		const promise = (_fetcherPromise = fetcherPromise) !== null && _fetcherPromise !== void 0 ? _fetcherPromise : fetcherPromise = build();
		let fetcher;
		try {
			fetcher = await promise;
		} catch (err) {
			if (fetcherPromise === promise) fetcherPromise = void 0;
			throw err;
		}
		return fetcher(input, init);
	});
}
/**
* Build a fetch bound to a bounded undici dispatcher (HTTP/2 enabled,
* `connections` origin connections, optional proxy tunnel), capped at
* `inflightLimit` in-flight requests (`0` disables the cap). Falls back to
* the global fetch — still capped — when undici cannot be loaded.
*/
async function buildDispatchedFetch(options) {
	var _options$loadUndici;
	const undici = await ((_options$loadUndici = options.loadUndici) !== null && _options$loadUndici !== void 0 ? _options$loadUndici : loadUndici)();
	if (!undici) return limitConcurrency(lateBoundGlobalFetch(), options.inflightLimit);
	const { Agent, ProxyAgent, fetch: undiciFetch } = undici;
	const dispatcher = options.proxy ? new ProxyAgent({
		uri: options.proxy,
		allowH2: true,
		connections: options.connections,
		proxyTunnel: true
	}) : new Agent({
		allowH2: true,
		connections: options.connections
	});
	const fetchWithDispatcher = undiciFetch;
	const wrapped = ((input, init) => {
		const request = toUndiciRequestInput(input, init);
		return fetchWithDispatcher(request.input, _objectSpread2(_objectSpread2({}, request.init), {}, { dispatcher }));
	});
	return limitConcurrency(wrapped, options.inflightLimit);
}
function toUndiciRequestInput(input, init) {
	if (!isRequestLike(input)) return {
		input,
		init
	};
	const requestInit = _objectSpread2({
		body: isReadableStreamLike(input.body) ? toDispatchableStream(input.body) : input.body,
		cache: input.cache,
		credentials: input.credentials,
		headers: input.headers,
		integrity: input.integrity,
		keepalive: input.keepalive,
		method: input.method,
		mode: input.mode,
		redirect: input.redirect,
		referrer: input.referrer,
		referrerPolicy: input.referrerPolicy,
		signal: input.signal
	}, init);
	if (requestInit.body) requestInit.duplex = "half";
	return {
		input: input.url,
		init: requestInit
	};
}
var DEFAULT_API_CONNECTION_LIMIT = 100;
var DEFAULT_API_INFLIGHT_LIMIT = 1e3;
var apiFetchers = /* @__PURE__ */ new Map();
function createApiFetch(proxy) {
	const key = proxy !== null && proxy !== void 0 ? proxy : "";
	const cached = apiFetchers.get(key);
	if (cached) return cached;
	const apiFetch = createApiFetchForRuntime(runtime, { proxy });
	apiFetchers.set(key, apiFetch);
	return apiFetch;
}
function createApiFetchForRuntime(currentRuntime = runtime, options = {}) {
	return createRuntimeFetch(currentRuntime, () => {
		var _options$connectionLi, _options$inflightLimi;
		return buildDispatchedFetch({
			connections: (_options$connectionLi = options.connectionLimit) !== null && _options$connectionLi !== void 0 ? _options$connectionLi : getApiConnectionLimit(),
			inflightLimit: (_options$inflightLimi = options.inflightLimit) !== null && _options$inflightLimi !== void 0 ? _options$inflightLimi : getApiInflightLimit(),
			proxy: options.proxy,
			loadUndici: options.loadUndici
		});
	});
}
function getApiConnectionLimit() {
	return parsePositiveIntEnv("E2B_API_CONNECTIONS", DEFAULT_API_CONNECTION_LIMIT);
}
/**
* Returns the configured max number of API requests that can be in flight at
* once, or `0` to disable the cap.
*
* Defaults to `1000` ({@link DEFAULT_API_INFLIGHT_LIMIT}). Override via
* `E2B_API_INFLIGHT_REQUESTS` env var; set to `0` to disable the cap entirely.
*/
function getApiInflightLimit() {
	return parseInflightLimitEnv("E2B_API_INFLIGHT_REQUESTS", DEFAULT_API_INFLIGHT_LIMIT);
}
function formatSandboxTimeoutError(message) {
	return new TimeoutError(`${message}: This error is likely due to sandbox timeout. You can modify the sandbox timeout by passing 'timeoutMs' when starting the sandbox or calling '.setTimeout' on the sandbox with the desired timeout.`);
}
/**
* Base class for all sandbox errors.
*
* Thrown when general sandbox errors occur.
*/
var SandboxError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "SandboxError";
	}
};
/**
* Thrown when a timeout error occurs.
*
* The [unavailable] error type is caused by sandbox timeout.
*
* The [canceled] error type is caused by exceeding request timeout.
*
* The [deadline_exceeded] error type is caused by exceeding the timeout for command execution, watch, etc.
*
* The [unknown] error type is sometimes caused by the sandbox timeout when the request is not processed correctly.
*/
var TimeoutError = class extends SandboxError {
	constructor(message) {
		super(message);
		this.name = "TimeoutError";
	}
};
/**
* Thrown when an invalid argument is provided.
*/
var InvalidArgumentError = class extends SandboxError {
	constructor(message, stackTrace) {
		super(message);
		this.name = "InvalidArgumentError";
		if (stackTrace) this.stack = stackTrace;
	}
};
/**
* Thrown when there is not enough disk space.
*/
var NotEnoughSpaceError = class extends SandboxError {
	constructor(message) {
		super(message);
		this.name = "NotEnoughSpaceError";
	}
};
/**
* Thrown when a resource is not found.
*
* @deprecated Use {@link FileNotFoundError} or {@link SandboxNotFoundError} instead. This class will be removed in the next major version.
*/
var NotFoundError = class extends SandboxError {
	constructor(message) {
		super(message);
		this.name = "NotFoundError";
	}
};
/**
* Thrown when a file or directory is not found inside a sandbox.
*/
var FileNotFoundError = class extends NotFoundError {
	constructor(message) {
		super(message);
		this.name = "FileNotFoundError";
	}
};
/**
* Thrown when a sandbox is not found (e.g. it doesn't exist or is no longer running).
*/
var SandboxNotFoundError = class extends NotFoundError {
	constructor(message) {
		super(message);
		this.name = "SandboxNotFoundError";
	}
};
/**
* Thrown when authentication fails.
*/
var AuthenticationError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "AuthenticationError";
	}
};
/**
* Thrown when git authentication fails.
*
* @deprecated Run git with `sandbox.commands.run()` instead. The git module will be removed in the next major version.
*/
var GitAuthError = class extends AuthenticationError {
	constructor(message) {
		super(message);
		this.name = "GitAuthError";
	}
};
/**
* Thrown when git upstream tracking is missing.
*
* @deprecated Run git with `sandbox.commands.run()` instead. The git module will be removed in the next major version.
*/
var GitUpstreamError = class extends SandboxError {
	constructor(message) {
		super(message);
		this.name = "GitUpstreamError";
	}
};
/**
* Thrown when the template uses old envd version. It isn't compatible with the new SDK.
*/
var TemplateError = class extends SandboxError {
	constructor(message, stackTrace) {
		super(message);
		this.name = "TemplateError";
		if (stackTrace) this.stack = stackTrace;
	}
};
/**
* Thrown when the API rate limit is exceeded.
*/
var RateLimitError = class extends SandboxError {
	constructor(message) {
		super(message);
		this.name = "RateLimitError";
	}
};
/**
* Thrown when the build fails.
*/
var BuildError = class extends Error {
	constructor(message, stackTrace) {
		super(message);
		this.name = "BuildError";
		if (stackTrace) this.stack = stackTrace;
	}
};
/**
* Thrown when the file upload fails.
*/
var FileUploadError = class extends BuildError {
	constructor(message, stackTrace) {
		super(message, stackTrace);
		this.name = "FileUploadError";
	}
};
function _asyncIterator(r) {
	var n, t, o, e = 2;
	for ("undefined" != typeof Symbol && (t = Symbol.asyncIterator, o = Symbol.iterator); e--;) {
		if (t && null != (n = r[t])) return n.call(r);
		if (o && null != (n = r[o])) return new AsyncFromSyncIterator(n.call(r));
		t = "@@asyncIterator", o = "@@iterator";
	}
	throw new TypeError("Object is not async iterable");
}
function AsyncFromSyncIterator(r) {
	function AsyncFromSyncIteratorContinuation(r) {
		if (Object(r) !== r) return Promise.reject(/* @__PURE__ */ new TypeError(r + " is not an object."));
		var n = r.done;
		return Promise.resolve(r.value).then(function(r) {
			return {
				value: r,
				done: n
			};
		});
	}
	return AsyncFromSyncIterator = function AsyncFromSyncIterator(r) {
		this.s = r, this.n = r.next;
	}, AsyncFromSyncIterator.prototype = {
		s: null,
		n: null,
		next: function next() {
			return AsyncFromSyncIteratorContinuation(this.n.apply(this.s, arguments));
		},
		"return": function _return(r) {
			var n = this.s["return"];
			return void 0 === n ? Promise.resolve({
				value: r,
				done: !0
			}) : AsyncFromSyncIteratorContinuation(n.apply(this.s, arguments));
		},
		"throw": function _throw(r) {
			var n = this.s["return"];
			return void 0 === n ? Promise.reject(r) : AsyncFromSyncIteratorContinuation(n.apply(this.s, arguments));
		}
	}, new AsyncFromSyncIterator(r);
}
function _OverloadYield(e, d) {
	this.v = e, this.k = d;
}
function _awaitAsyncGenerator(e) {
	return new _OverloadYield(e, 0);
}
function _wrapAsyncGenerator(e) {
	return function() {
		return new AsyncGenerator(e.apply(this, arguments));
	};
}
function AsyncGenerator(e) {
	var r, t;
	function resume(r, t) {
		try {
			var n = e[r](t), o = n.value, u = o instanceof _OverloadYield;
			Promise.resolve(u ? o.v : o).then(function(t) {
				if (u) {
					var i = "return" === r ? "return" : "next";
					if (!o.k || t.done) return resume(i, t);
					t = e[i](t).value;
				}
				settle(n.done ? "return" : "normal", t);
			}, function(e) {
				resume("throw", e);
			});
		} catch (e) {
			settle("throw", e);
		}
	}
	function settle(e, n) {
		switch (e) {
			case "return":
				r.resolve({
					value: n,
					done: !0
				});
				break;
			case "throw":
				r.reject(n);
				break;
			default: r.resolve({
				value: n,
				done: !1
			});
		}
		(r = r.next) ? resume(r.key, r.arg) : t = null;
	}
	this._invoke = function(e, n) {
		return new Promise(function(o, u) {
			var i = {
				key: e,
				arg: n,
				resolve: o,
				reject: u,
				next: null
			};
			t ? t = t.next = i : (r = t = i, resume(e, n));
		});
	}, "function" != typeof e["return"] && (this["return"] = void 0);
}
AsyncGenerator.prototype["function" == typeof Symbol && Symbol.asyncIterator || "@@asyncIterator"] = function() {
	return this;
}, AsyncGenerator.prototype.next = function(e) {
	return this._invoke("next", e);
}, AsyncGenerator.prototype["throw"] = function(e) {
	return this._invoke("throw", e);
}, AsyncGenerator.prototype["return"] = function(e) {
	return this._invoke("return", e);
};
function formatLog(log) {
	return JSON.parse(JSON.stringify(log, (_, value) => typeof value === "bigint" ? value.toString() : value));
}
function createRpcLogger(logger) {
	function logEach(_x) {
		return _logEach.apply(this, arguments);
	}
	function _logEach() {
		_logEach = _wrapAsyncGenerator(function* (stream) {
			var _iteratorAbruptCompletion = false;
			var _didIteratorError = false;
			var _iteratorError;
			try {
				for (var _iterator = _asyncIterator(stream), _step; _iteratorAbruptCompletion = !(_step = yield _awaitAsyncGenerator(_iterator.next())).done; _iteratorAbruptCompletion = false) {
					const m = _step.value;
					var _logger$debug;
					(_logger$debug = logger.debug) === null || _logger$debug === void 0 || _logger$debug.call(logger, "Response stream:", formatLog(m));
					yield m;
				}
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (_iteratorAbruptCompletion && _iterator.return != null) yield _awaitAsyncGenerator(_iterator.return());
				} finally {
					if (_didIteratorError) throw _iteratorError;
				}
			}
		});
		return _logEach.apply(this, arguments);
	}
	return (next) => async (req) => {
		var _logger$info;
		(_logger$info = logger.info) === null || _logger$info === void 0 || _logger$info.call(logger, `Request: POST ${req.url}`);
		const res = await next(req);
		if (res.stream) return _objectSpread2(_objectSpread2({}, res), {}, { message: logEach(res.message) });
		else {
			var _logger$info2;
			(_logger$info2 = logger.info) === null || _logger$info2 === void 0 || _logger$info2.call(logger, "Response:", formatLog(res.message));
		}
		return res;
	};
}
function createApiLogger(logger) {
	return {
		async onRequest({ request }) {
			var _logger$info3;
			(_logger$info3 = logger.info) === null || _logger$info3 === void 0 || _logger$info3.call(logger, `Request ${request.method} ${request.url}`);
			return request;
		},
		async onResponse({ response }) {
			if (response.status >= 400) {
				var _logger$error;
				(_logger$error = logger.error) === null || _logger$error === void 0 || _logger$error.call(logger, "Response:", response.status, response.statusText);
			} else {
				var _logger$info4;
				(_logger$info4 = logger.info) === null || _logger$info4 === void 0 || _logger$info4.call(logger, "Response:", response.status, response.statusText);
			}
			return response;
		}
	};
}
/**
* Map an API error code and message to the matching error class — the same
* mapping {@link handleApiError} applies to HTTP responses, usable for error
* objects embedded in response bodies (e.g. per-fork results).
*/
function apiErrorFromCode(code, content, errorClass = SandboxError, stackTrace) {
	if (code === 401) {
		const message = "Unauthorized, please check your credentials.";
		return new AuthenticationError(content ? `${message} - ${content}` : message);
	}
	if (code === 429) {
		const message = "Rate limit exceeded, please try again later";
		return new RateLimitError(content ? `${message} - ${content}` : message);
	}
	return new errorClass(`${code}: ${content}`, stackTrace);
}
function handleApiError(response, errorClass = SandboxError, stackTrace) {
	var _response$error2;
	if (response.response.ok) return;
	const status = response.response.status;
	if (status === 401 || status === 429) {
		var _response$error$messa, _response$error;
		return apiErrorFromCode(status, (_response$error$messa = (_response$error = response.error) === null || _response$error === void 0 ? void 0 : _response$error.message) !== null && _response$error$messa !== void 0 ? _response$error$messa : response.error, errorClass, stackTrace);
	}
	return apiErrorFromCode(status, ((_response$error2 = response.error) === null || _response$error2 === void 0 ? void 0 : _response$error2.message) || response.error || response.response.statusText, errorClass, stackTrace);
}
/**
* Client for interacting with the E2B API.
*/
var ApiClient = class {
	constructor(config, opts = {}) {
		var _opts$requireApiKey;
		_defineProperty(this, "api", void 0);
		if (((_opts$requireApiKey = opts.requireApiKey) !== null && _opts$requireApiKey !== void 0 ? _opts$requireApiKey : true) && !config.apiKey) throw new AuthenticationError("API key is required, please visit the API Keys tab at https://e2b.dev/dashboard?tab=keys to get your API key. You can either set the environment variable `E2B_API_KEY` or you can pass it directly to the sandbox like Sandbox.create({ apiKey: 'e2b_...' })");
		this.api = createClient({
			baseUrl: config.apiUrl,
			fetch: createApiFetch(config.proxy),
			headers: _objectSpread2(_objectSpread2(_objectSpread2({}, defaultHeaders), config.apiKey && { "X-API-KEY": config.apiKey }), config.headers),
			querySerializer: { array: {
				style: "form",
				explode: false
			} }
		});
		if (config.logger) this.api.use(createApiLogger(config.logger));
	}
};
var supportedDomains = [
	"e2b.app",
	"e2b.dev",
	"e2b.pro",
	"e2b-staging.dev"
];
var REQUEST_TIMEOUT_MS$1 = 6e4;
var DEFAULT_SANDBOX_TIMEOUT_MS = 3e5;
var KEEPALIVE_PING_HEADER = "Keepalive-Ping-Interval";
/**
* Build an `AbortSignal` that combines an optional request-timeout signal
* (via `AbortSignal.timeout`) with an optional user-provided signal.
*
* Returns `undefined` when neither input would produce a signal.
*
* @internal
*/
function buildRequestSignal(requestTimeoutMs, userSignal) {
	const timeoutSignal = requestTimeoutMs ? AbortSignal.timeout(requestTimeoutMs) : void 0;
	if (timeoutSignal && userSignal) return AbortSignal.any([timeoutSignal, userSignal]);
	return timeoutSignal !== null && timeoutSignal !== void 0 ? timeoutSignal : userSignal;
}
/**
* Set up an internal `AbortController` for a streaming request.
*
* Until `clearStartTimeout` is called, the controller aborts when either
*  - the optional user signal aborts, or
*  - the optional request timeout elapses (used to bound the initial
*    handshake; long-lived streams should call `clearStartTimeout` once
*    the handshake succeeds).
*
* The user-signal listener stays attached for the full stream lifetime
* so the caller can cancel a long-running stream by aborting the signal.
*
* `cleanup` is idempotent and detaches the listener, clears the handshake
* timer (if still pending), and aborts the controller. Call it when the
* stream finishes or when startup fails.
*
* @internal
*/
function setupRequestController(requestTimeoutMs, userSignal) {
	const controller = new AbortController();
	const onUserAbort = () => abortWithReason(controller, userSignal === null || userSignal === void 0 ? void 0 : userSignal.reason);
	if (userSignal) if (userSignal.aborted) abortWithReason(controller, userSignal.reason);
	else userSignal.addEventListener("abort", onUserAbort, { once: true });
	let reqTimeout = requestTimeoutMs ? setTimeout(() => abortWithReason(controller, new DOMException(`Request handshake timed out after ${requestTimeoutMs}ms`, "TimeoutError")), requestTimeoutMs) : void 0;
	const clearStartTimeout = () => {
		if (reqTimeout) {
			clearTimeout(reqTimeout);
			reqTimeout = void 0;
		}
	};
	let cleaned = false;
	const cleanup = () => {
		if (cleaned) return;
		cleaned = true;
		userSignal === null || userSignal === void 0 || userSignal.removeEventListener("abort", onUserAbort);
		clearStartTimeout();
		controller.abort();
	};
	return {
		controller,
		clearStartTimeout,
		cleanup
	};
}
/**
* Create a resettable idle-timeout that aborts `controller` when no progress is
* made within `idleTimeoutMs`. `arm` (re)starts the timer; call it on each
* chunk. `clear` stops it. `0`/`undefined` disables it (both are no-ops).
*
* @internal
*/
function createIdleAbort(controller, idleTimeoutMs, label) {
	let timer;
	const clear = () => {
		if (timer) {
			clearTimeout(timer);
			timer = void 0;
		}
	};
	const arm = () => {
		if (!idleTimeoutMs) return;
		clear();
		timer = setTimeout(() => abortWithReason(controller, new DOMException(`${label} idle for ${idleTimeoutMs}ms`, "TimeoutError")), idleTimeoutMs);
	};
	return {
		arm,
		clear
	};
}
/**
* Abort with the reason pinned to the controller. Bun (observed on 1.3.14)
* holds `signal.reason` weakly: a reason that nothing else strongly
* references — e.g. a `DOMException` constructed inside a timer callback —
* can be garbage-collected, leaving `signal.reason` undefined by the time a
* consumer reads it. Pinning the reason to the controller keeps it alive for
* the signal's lifetime. No-op cost on other runtimes.
*
* @internal
*/
function abortWithReason(controller, reason) {
	if (controller.signal.aborted) return;
	controller.__e2bAbortReason = reason;
	controller.abort(reason);
}
/**
* Wrap a streaming response body so its pooled connection is released when the
* stream is fully read, cancelled, errors, or stays idle for too long.
*
* Clears the handshake timeout from {@link setupRequestController} (so
* consuming the body isn't killed by it) and replaces it with an idle-read
* timeout that bounds only the wire: it's armed while waiting on a network
* read and cleared the moment a chunk arrives, so a slow or paused consumer
* never trips it (only a server that stops sending mid-stream does). On expiry
* it aborts `controller`, tearing down the fetch and releasing the connection.
* Pass `0`/`undefined` to disable. Call once the handshake has succeeded.
*
* @internal
*/
function wrapStreamWithConnectionCleanup(body, { clearStartTimeout, cleanup, controller, idleTimeoutMs }) {
	clearStartTimeout();
	if (!body) {
		cleanup();
		return new Blob([]).stream();
	}
	const reader = body.getReader();
	const idle = createIdleAbort(controller, idleTimeoutMs, "Stream");
	let released = false;
	const release = () => {
		if (released) return;
		released = true;
		idle.clear();
		cleanup();
	};
	return new ReadableStream({
		async pull(streamController) {
			idle.arm();
			try {
				const { done, value } = await reader.read();
				idle.clear();
				if (done) {
					release();
					streamController.close();
				} else streamController.enqueue(value);
			} catch (err) {
				release();
				streamController.error(err);
			}
		},
		async cancel(reason) {
			try {
				await reader.cancel(reason);
			} finally {
				release();
			}
		}
	});
}
/**
* Configuration for connecting to the API.
*/
var ConnectionConfig = class ConnectionConfig {
	static buildUserAgent() {
		const userAgentParts = [`${ConnectionConfig.sdkUserAgentPrefix}${version}`];
		if (ConnectionConfig.integration) userAgentParts.push(ConnectionConfig.integration);
		return userAgentParts.join(" ");
	}
	/**
	* Set the `User-Agent` on `headers`: an explicitly provided value always
	* wins; otherwise the SDK-built one, tagged with the current integration.
	*
	* An SDK-built value carried over from an earlier config (configs are
	* rebuilt via `new ConnectionConfig({ ...config })`) is recognized by its
	* prefix and rebuilt, so it stays in sync with the current integration.
	*/
	static applyUserAgent(headers) {
		const userAgent = headers["User-Agent"];
		if (userAgent !== void 0 && !userAgent.startsWith(ConnectionConfig.sdkUserAgentPrefix)) return;
		headers["User-Agent"] = ConnectionConfig.buildUserAgent();
	}
	/**
	* Identify traffic from an integration wrapping the E2B SDK by appending
	* `integration` (e.g. `'e2b-code-interpreter/0.1.0'`) to the `User-Agent`
	* header of every request.
	*
	* Call once at startup, before any `ConnectionConfig` is constructed —
	* configs read the value at construction time. Pass `undefined` to clear.
	*
	* @internal
	* @hidden
	* @hide
	*/
	static setIntegration(integration) {
		ConnectionConfig.integration = integration;
	}
	constructor(opts) {
		var _opts$debug, _opts$requestTimeoutM, _opts$headers, _opts$apiHeaders;
		_defineProperty(this, "debug", void 0);
		_defineProperty(this, "domain", void 0);
		_defineProperty(this, "apiUrl", void 0);
		_defineProperty(this, "sandboxUrl", void 0);
		_defineProperty(this, "logger", void 0);
		_defineProperty(this, "requestTimeoutMs", void 0);
		_defineProperty(this, "apiKey", void 0);
		_defineProperty(this, "validateApiKey", void 0);
		_defineProperty(this, "headers", void 0);
		_defineProperty(this, "proxy", void 0);
		this.apiKey = (opts === null || opts === void 0 ? void 0 : opts.apiKey) || ConnectionConfig.apiKey;
		this.validateApiKey = opts === null || opts === void 0 ? void 0 : opts.validateApiKey;
		this.debug = (_opts$debug = opts === null || opts === void 0 ? void 0 : opts.debug) !== null && _opts$debug !== void 0 ? _opts$debug : ConnectionConfig.debug;
		this.domain = (opts === null || opts === void 0 ? void 0 : opts.domain) || ConnectionConfig.domain;
		this.requestTimeoutMs = (_opts$requestTimeoutM = opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs) !== null && _opts$requestTimeoutM !== void 0 ? _opts$requestTimeoutM : REQUEST_TIMEOUT_MS$1;
		this.logger = opts === null || opts === void 0 ? void 0 : opts.logger;
		this.headers = _objectSpread2(_objectSpread2({}, (_opts$headers = opts === null || opts === void 0 ? void 0 : opts.headers) !== null && _opts$headers !== void 0 ? _opts$headers : {}), (_opts$apiHeaders = opts === null || opts === void 0 ? void 0 : opts.apiHeaders) !== null && _opts$apiHeaders !== void 0 ? _opts$apiHeaders : {});
		ConnectionConfig.applyUserAgent(this.headers);
		this.proxy = opts === null || opts === void 0 ? void 0 : opts.proxy;
		this.apiUrl = (opts === null || opts === void 0 ? void 0 : opts.apiUrl) || ConnectionConfig.apiUrl || (this.debug ? "http://localhost:3000" : `https://api.${this.domain}`);
		this.sandboxUrl = (opts === null || opts === void 0 ? void 0 : opts.sandboxUrl) || ConnectionConfig.sandboxUrl;
	}
	/**
	* Merge connection options bound to a class (e.g. by an `E2B` client) with
	* the per-call options. Per-call options win, then the bound options, then
	* the environment variables resolved by the `ConnectionConfig` constructor.
	*
	* Explicitly `undefined` per-call values are dropped so they fall back to the
	* bound options instead of clearing them.
	*
	* @internal
	* @hidden
	* @hide
	*/
	static mergeOpts(boundOpts, opts) {
		if (!boundOpts) return opts;
		const merged = _objectSpread2({}, boundOpts);
		for (const [key, value] of Object.entries(opts !== null && opts !== void 0 ? opts : {})) if (value !== void 0) Object.defineProperty(merged, key, {
			value,
			enumerable: true,
			writable: true,
			configurable: true
		});
		return merged;
	}
	static get domain() {
		return getEnvVar("E2B_DOMAIN") || "e2b.app";
	}
	static get apiUrl() {
		return getEnvVar("E2B_API_URL");
	}
	static get sandboxUrl() {
		return getEnvVar("E2B_SANDBOX_URL");
	}
	static get debug() {
		return (getEnvVar("E2B_DEBUG") || "false").toLowerCase() === "true";
	}
	static get apiKey() {
		return getEnvVar("E2B_API_KEY");
	}
	getSignal(requestTimeoutMs, signal) {
		return buildRequestSignal(requestTimeoutMs !== null && requestTimeoutMs !== void 0 ? requestTimeoutMs : this.requestTimeoutMs, signal);
	}
	getSandboxUrl(sandboxId, opts) {
		var _opts$sandboxDomain;
		if (this.sandboxUrl) return this.sandboxUrl;
		if (this.debug) return `http://${this.getHost(sandboxId, opts.envdPort, opts.sandboxDomain)}`;
		const sandboxDomain = (_opts$sandboxDomain = opts.sandboxDomain) !== null && _opts$sandboxDomain !== void 0 ? _opts$sandboxDomain : this.domain;
		if (runtime !== "browser" && supportedDomains.includes(sandboxDomain)) return `https://sandbox.${sandboxDomain}`;
		return `https://${this.getHost(sandboxId, opts.envdPort, sandboxDomain)}`;
	}
	getSandboxDirectUrl(sandboxId, opts) {
		if (this.sandboxUrl) return this.sandboxUrl;
		if (this.debug) return `http://${this.getHost(sandboxId, opts.envdPort, opts.sandboxDomain)}`;
		return `https://${this.getHost(sandboxId, opts.envdPort, opts.sandboxDomain)}`;
	}
	getHost(sandboxId, port, sandboxDomain) {
		if (this.debug) return `localhost:${port}`;
		return `${port}-${sandboxId}.${sandboxDomain !== null && sandboxDomain !== void 0 ? sandboxDomain : this.domain}`;
	}
};
_defineProperty(ConnectionConfig, "envdPort", 49983);
_defineProperty(ConnectionConfig, "integration", void 0);
_defineProperty(ConnectionConfig, "sdkUserAgentPrefix", "e2b-js-sdk/");
/**
* Base class for the resource classes (`Sandbox`, `Volume`, `Template`,
* `Secret`) whose static methods build a `ConnectionConfig` from per-call
* options. An {@link E2B} client exposes subclasses of these with its own
* options bound, and every static method resolves them through
* {@link ClientFactory.resolveOpts}.
*
* @internal
* @hidden
* @hide
*/
var ClientFactory = class {
	/**
	* Merge the connection options bound to this class with the per-call options,
	* with the per-call options taking precedence.
	*
	* @internal
	* @hidden
	* @hide
	*/
	static resolveOpts(opts) {
		return ConnectionConfig.mergeOpts(this.boundOpts, opts);
	}
};
_defineProperty(ClientFactory, "boundOpts", void 0);
/**
* User used for the operation in the sandbox.
*/
var defaultUsername = "user";
async function getSignature({ path, operation, user, expirationInSeconds, envdAccessToken }) {
	if (!envdAccessToken) throw new Error("Access token is not set and signature cannot be generated!");
	const signatureExpiration = expirationInSeconds != null ? Math.floor(Date.now() / 1e3) + expirationInSeconds : null;
	let signatureRaw;
	if (user == void 0) user = "";
	if (signatureExpiration === null) signatureRaw = `${path}:${operation}:${user}:${envdAccessToken}`;
	else signatureRaw = `${path}:${operation}:${user}:${envdAccessToken}:${signatureExpiration.toString()}`;
	return {
		signature: "v1_" + (await sha256(signatureRaw)).replace(/=+$/, ""),
		expiration: signatureExpiration
	};
}
var ENVD_DEBUG_FALLBACK = "99.99.99";
var ENVD_ENVD_CLOSE = "0.5.2";
var ENVD_OCTET_STREAM_UPLOAD = "0.5.7";
/**
* Message fragments different JS runtimes use when the connection to the sandbox
* is dropped mid-request. The transport surfaces a dropped connection (e.g. an
* HTTP/2 stream reset) with runtime- and version-specific wording, so we match
* every known variant:
*   - Node (undici):       `terminated`
*   - Bun:                 `The socket connection was closed unexpectedly`
*   - Deno:                `error reading a body from connection`
*   - Cloudflare Workers:  `Network connection lost`
*/
var CONNECTION_TERMINATED_MESSAGES = [
	"terminated",
	"The socket connection was closed unexpectedly",
	"error reading a body from connection",
	"Network connection lost"
];
/**
* Checks whether a message matches any known runtime variant of the connection to
* the sandbox being dropped mid-request (see {@link CONNECTION_TERMINATED_MESSAGES}).
*/
function isConnectionTerminatedMessage(message) {
	if (!message) return false;
	return CONNECTION_TERMINATED_MESSAGES.some((fragment) => message.includes(fragment));
}
/**
* Checks whether the error is the signature of the connection to the sandbox being
* dropped mid-request — an HTTP/2 stream reset surfaced by connect as `Code.Unknown`
* with one of the runtime-specific connection-dropped messages.
*/
function isConnectionTerminatedError(err) {
	return err instanceof ConnectError && err.code === Code.Unknown && isConnectionTerminatedMessage(err.rawMessage);
}
var DEFAULT_ERROR_MAP$1 = {
	[Code.InvalidArgument]: (message) => new InvalidArgumentError(message),
	[Code.Unauthenticated]: (message) => new AuthenticationError(message),
	[Code.NotFound]: (message) => new NotFoundError(message),
	[Code.ResourceExhausted]: (message) => new RateLimitError(`${message}: Rate limit exceeded, please try again later.`),
	[Code.Unavailable]: formatSandboxTimeoutError,
	[Code.Canceled]: (message) => new TimeoutError(`${message}: This error is likely due to exceeding 'requestTimeoutMs'. You can pass the request timeout value as an option when making the request.`),
	[Code.DeadlineExceeded]: (message) => new TimeoutError(`${message}: This error is likely due to exceeding 'timeoutMs' — the total time a long running request (like command execution or directory watch) can be active. It can be modified by passing 'timeoutMs' when making the request. Use '0' to disable the timeout.`)
};
/**
* Handles errors from envd RPC calls by mapping gRPC status codes to specific error types.
*
* @param err - The caught error, expected to be a `ConnectError` from the gRPC transport.
* @param errorMap - Optional map of gRPC `Code` values to error factory functions that override the defaults.
* @returns The corresponding `Error` instance mapped from the gRPC status code, or the original error if it is not a `ConnectError`.
*/
function handleRpcError(err, errorMap) {
	if (err instanceof ConnectError) {
		if (errorMap && err.code in errorMap) return errorMap[err.code](err.message);
		if (err.code in DEFAULT_ERROR_MAP$1) return DEFAULT_ERROR_MAP$1[err.code](err.message);
		return new SandboxError(`${err.code}: ${err.message}`);
	}
	return err;
}
/**
* Like {@link handleRpcError}, but when the connection to the sandbox was dropped
* mid-request it probes the sandbox health to tell apart the sandbox being killed
* from a transient network failure (e.g. a load balancer dropping the connection).
* When the probe confirms the sandbox is gone, a `TimeoutError` is returned —
* consistent with how requests to an already-dead sandbox surface.
*
* @param err - The caught error, expected to be a `ConnectError` from the gRPC transport.
* @param checkHealth - Probe returning whether the sandbox is running, or `undefined` when unknown.
* @param errorMap - Optional map of gRPC `Code` values to error factory functions that override the defaults.
* @returns The corresponding `Error` instance.
*/
async function handleRpcErrorWithHealthCheck(err, checkHealth, errorMap) {
	if (isConnectionTerminatedError(err) && checkHealth) {
		if (await checkHealth().catch(() => void 0) === false) return new TimeoutError(`${err.message}: The sandbox was killed or reached its end of life while the request was in flight.`);
	}
	return handleRpcError(err, errorMap);
}
function encode64(value) {
	switch (runtime) {
		case "deno": return btoa(value);
		case "node": return Buffer.from(value).toString("base64");
		case "bun": return Buffer.from(value).toString("base64");
		default: return btoa(value);
	}
}
function authenticationHeader(envdVersion, username) {
	if (username == void 0 && compareVersions(envdVersion, "0.4.0") < 0) username = defaultUsername;
	if (!username) return {};
	return { Authorization: `Basic ${encode64(`${username}:`)}` };
}
var DEFAULT_ERROR_MAP = {
	400: (message) => new InvalidArgumentError(message),
	401: (message) => new AuthenticationError(message),
	404: (message) => new NotFoundError(message),
	429: (message) => new RateLimitError(`${message}: The requests are being rate limited.`),
	502: formatSandboxTimeoutError,
	507: (message) => new NotEnoughSpaceError(message)
};
var HEALTH_CHECK_TIMEOUT_MS = 5e3;
/**
* Probes the sandbox's envd health endpoint.
*
* @param envdApi - The envd API client of the sandbox.
* @returns `true` if the sandbox is running, `false` if it is not, `undefined` if its state could not be determined.
*/
async function checkSandboxHealth(envdApi) {
	try {
		const res = await envdApi.api.GET("/health", { signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS) });
		if (res.response.status === 502) return false;
		if (res.response.ok) return true;
		return;
	} catch (_unused) {
		return;
	}
}
/**
* Handles transport-level fetch failures from envd API calls. When the connection was
* dropped mid-request, probes the sandbox health to tell apart the sandbox being killed
* from a transient network failure (e.g. a load balancer dropping the connection).
*
* @param err - The caught error, expected to be a fetch transport failure.
* @param checkHealth - Probe returning whether the sandbox is running, or `undefined` when unknown.
* @returns A `TimeoutError` when the connection was terminated mid-request and the sandbox is confirmed gone, or the original error otherwise.
*/
async function handleEnvdApiFetchError(err, checkHealth) {
	if (err instanceof Error && isConnectionTerminatedMessage(err.message)) {
		if ((checkHealth ? await checkHealth().catch(() => void 0) : void 0) === false) return new TimeoutError(`${err.message}: The sandbox was killed or reached its end of life while the request was in flight.`);
	}
	return err;
}
/**
* Handles errors from envd API responses by mapping HTTP status codes to specific error types.
*
* @param res - The API response object containing an optional error and the raw `Response`.
* @param errorMap - Optional map of HTTP status codes to error factory functions that override the defaults.
* @returns The corresponding `Error` instance if an error is present, or `undefined` if the response is successful.
*/
async function handleEnvdApiError(res, errorMap) {
	var _ref, _res$error;
	if (res.response.ok) return;
	let message = (_ref = typeof res.error === "string" ? res.error : (_res$error = res.error) === null || _res$error === void 0 ? void 0 : _res$error.message) !== null && _ref !== void 0 ? _ref : "";
	if (!message && !res.response.bodyUsed) try {
		message = await res.response.text();
	} catch (_unused2) {}
	message = message || res.response.statusText;
	if (errorMap && res.response.status in errorMap) {
		var _errorMap$res$respons;
		return (_errorMap$res$respons = errorMap[res.response.status]) === null || _errorMap$res$respons === void 0 ? void 0 : _errorMap$res$respons.call(errorMap, message);
	}
	if (res.response.status in DEFAULT_ERROR_MAP) {
		var _DEFAULT_ERROR_MAP$re;
		return (_DEFAULT_ERROR_MAP$re = DEFAULT_ERROR_MAP[res.response.status]) === null || _DEFAULT_ERROR_MAP$re === void 0 ? void 0 : _DEFAULT_ERROR_MAP$re.call(DEFAULT_ERROR_MAP, message);
	}
	return new SandboxError(`${res.response.status}: ${message}`);
}
async function handleProcessStartEvent(events) {
	var _startEvent$event;
	let startEvent;
	try {
		startEvent = (await events[Symbol.asyncIterator]().next()).value;
	} catch (err) {
		if (err instanceof ConnectError) {
			if (err.code === Code.Unavailable) throw new SandboxNotFoundError("Sandbox is probably not running anymore");
		}
		throw err;
	}
	if (((_startEvent$event = startEvent.event) === null || _startEvent$event === void 0 ? void 0 : _startEvent$event.event.case) !== "start") throw new Error("Expected start event");
	return startEvent.event.event.value.pid;
}
async function handleWatchDirStartEvent(events) {
	var _startEvent$event2;
	let startEvent;
	try {
		startEvent = (await events[Symbol.asyncIterator]().next()).value;
	} catch (err) {
		if (err instanceof ConnectError) {
			if (err.code === Code.Unavailable) throw new SandboxNotFoundError("Sandbox is probably not running anymore");
		}
		throw err;
	}
	if (((_startEvent$event2 = startEvent.event) === null || _startEvent$event2 === void 0 ? void 0 : _startEvent$event2.case) !== "start") throw new Error("Expected start event");
	return startEvent.event.value;
}
var EnvdApiClient = class {
	constructor(config, metadata) {
		_defineProperty(this, "api", void 0);
		_defineProperty(this, "version", void 0);
		this.api = createClient({
			baseUrl: config.apiUrl,
			fetch: config === null || config === void 0 ? void 0 : config.fetch,
			headers: _objectSpread2(_objectSpread2({}, config === null || config === void 0 ? void 0 : config.headers), config.envdAccessToken && { "X-Access-Token": config.envdAccessToken })
		});
		this.version = metadata.version;
		if (config.logger) this.api.use(createApiLogger(config.logger));
	}
};
/**
* @generated from service filesystem.Filesystem
*/
var Filesystem$1 = /*@__PURE__*/ serviceDesc(/* @__PURE__ */ fileDesc("ChtmaWxlc3lzdGVtL2ZpbGVzeXN0ZW0ucHJvdG8SCmZpbGVzeXN0ZW0iMgoLTW92ZVJlcXVlc3QSDgoGc291cmNlGAEgASgJEhMKC2Rlc3RpbmF0aW9uGAIgASgJIjQKDE1vdmVSZXNwb25zZRIkCgVlbnRyeRgBIAEoCzIVLmZpbGVzeXN0ZW0uRW50cnlJbmZvIh4KDk1ha2VEaXJSZXF1ZXN0EgwKBHBhdGgYASABKAkiNwoPTWFrZURpclJlc3BvbnNlEiQKBWVudHJ5GAEgASgLMhUuZmlsZXN5c3RlbS5FbnRyeUluZm8iHQoNUmVtb3ZlUmVxdWVzdBIMCgRwYXRoGAEgASgJIhAKDlJlbW92ZVJlc3BvbnNlIhsKC1N0YXRSZXF1ZXN0EgwKBHBhdGgYASABKAkiNAoMU3RhdFJlc3BvbnNlEiQKBWVudHJ5GAEgASgLMhUuZmlsZXN5c3RlbS5FbnRyeUluZm8i5QIKCUVudHJ5SW5mbxIMCgRuYW1lGAEgASgJEiIKBHR5cGUYAiABKA4yFC5maWxlc3lzdGVtLkZpbGVUeXBlEgwKBHBhdGgYAyABKAkSDAoEc2l6ZRgEIAEoAxIMCgRtb2RlGAUgASgNEhMKC3Blcm1pc3Npb25zGAYgASgJEg0KBW93bmVyGAcgASgJEg0KBWdyb3VwGAggASgJEjEKDW1vZGlmaWVkX3RpbWUYCSABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wEhsKDnN5bWxpbmtfdGFyZ2V0GAogASgJSACIAQESNQoIbWV0YWRhdGEYCyADKAsyIy5maWxlc3lzdGVtLkVudHJ5SW5mby5NZXRhZGF0YUVudHJ5Gi8KDU1ldGFkYXRhRW50cnkSCwoDa2V5GAEgASgJEg0KBXZhbHVlGAIgASgJOgI4AUIRCg9fc3ltbGlua190YXJnZXQiLQoOTGlzdERpclJlcXVlc3QSDAoEcGF0aBgBIAEoCRINCgVkZXB0aBgCIAEoDSI5Cg9MaXN0RGlyUmVzcG9uc2USJgoHZW50cmllcxgBIAMoCzIVLmZpbGVzeXN0ZW0uRW50cnlJbmZvImcKD1dhdGNoRGlyUmVxdWVzdBIMCgRwYXRoGAEgASgJEhEKCXJlY3Vyc2l2ZRgCIAEoCBIVCg1pbmNsdWRlX2VudHJ5GAMgASgIEhwKFGFsbG93X25ldHdvcmtfbW91bnRzGAQgASgIInkKD0ZpbGVzeXN0ZW1FdmVudBIMCgRuYW1lGAEgASgJEiMKBHR5cGUYAiABKA4yFS5maWxlc3lzdGVtLkV2ZW50VHlwZRIpCgVlbnRyeRgDIAEoCzIVLmZpbGVzeXN0ZW0uRW50cnlJbmZvSACIAQFCCAoGX2VudHJ5IuABChBXYXRjaERpclJlc3BvbnNlEjgKBXN0YXJ0GAEgASgLMicuZmlsZXN5c3RlbS5XYXRjaERpclJlc3BvbnNlLlN0YXJ0RXZlbnRIABIxCgpmaWxlc3lzdGVtGAIgASgLMhsuZmlsZXN5c3RlbS5GaWxlc3lzdGVtRXZlbnRIABI7CglrZWVwYWxpdmUYAyABKAsyJi5maWxlc3lzdGVtLldhdGNoRGlyUmVzcG9uc2UuS2VlcEFsaXZlSAAaDAoKU3RhcnRFdmVudBoLCglLZWVwQWxpdmVCBwoFZXZlbnQibAoUQ3JlYXRlV2F0Y2hlclJlcXVlc3QSDAoEcGF0aBgBIAEoCRIRCglyZWN1cnNpdmUYAiABKAgSFQoNaW5jbHVkZV9lbnRyeRgDIAEoCBIcChRhbGxvd19uZXR3b3JrX21vdW50cxgEIAEoCCIrChVDcmVhdGVXYXRjaGVyUmVzcG9uc2USEgoKd2F0Y2hlcl9pZBgBIAEoCSItChdHZXRXYXRjaGVyRXZlbnRzUmVxdWVzdBISCgp3YXRjaGVyX2lkGAEgASgJIkcKGEdldFdhdGNoZXJFdmVudHNSZXNwb25zZRIrCgZldmVudHMYASADKAsyGy5maWxlc3lzdGVtLkZpbGVzeXN0ZW1FdmVudCIqChRSZW1vdmVXYXRjaGVyUmVxdWVzdBISCgp3YXRjaGVyX2lkGAEgASgJIhcKFVJlbW92ZVdhdGNoZXJSZXNwb25zZSppCghGaWxlVHlwZRIZChVGSUxFX1RZUEVfVU5TUEVDSUZJRUQQABISCg5GSUxFX1RZUEVfRklMRRABEhcKE0ZJTEVfVFlQRV9ESVJFQ1RPUlkQAhIVChFGSUxFX1RZUEVfU1lNTElOSxADKpgBCglFdmVudFR5cGUSGgoWRVZFTlRfVFlQRV9VTlNQRUNJRklFRBAAEhUKEUVWRU5UX1RZUEVfQ1JFQVRFEAESFAoQRVZFTlRfVFlQRV9XUklURRACEhUKEUVWRU5UX1RZUEVfUkVNT1ZFEAMSFQoRRVZFTlRfVFlQRV9SRU5BTUUQBBIUChBFVkVOVF9UWVBFX0NITU9EEAUynwUKCkZpbGVzeXN0ZW0SOQoEU3RhdBIXLmZpbGVzeXN0ZW0uU3RhdFJlcXVlc3QaGC5maWxlc3lzdGVtLlN0YXRSZXNwb25zZRJCCgdNYWtlRGlyEhouZmlsZXN5c3RlbS5NYWtlRGlyUmVxdWVzdBobLmZpbGVzeXN0ZW0uTWFrZURpclJlc3BvbnNlEjkKBE1vdmUSFy5maWxlc3lzdGVtLk1vdmVSZXF1ZXN0GhguZmlsZXN5c3RlbS5Nb3ZlUmVzcG9uc2USQgoHTGlzdERpchIaLmZpbGVzeXN0ZW0uTGlzdERpclJlcXVlc3QaGy5maWxlc3lzdGVtLkxpc3REaXJSZXNwb25zZRI/CgZSZW1vdmUSGS5maWxlc3lzdGVtLlJlbW92ZVJlcXVlc3QaGi5maWxlc3lzdGVtLlJlbW92ZVJlc3BvbnNlEkcKCFdhdGNoRGlyEhsuZmlsZXN5c3RlbS5XYXRjaERpclJlcXVlc3QaHC5maWxlc3lzdGVtLldhdGNoRGlyUmVzcG9uc2UwARJUCg1DcmVhdGVXYXRjaGVyEiAuZmlsZXN5c3RlbS5DcmVhdGVXYXRjaGVyUmVxdWVzdBohLmZpbGVzeXN0ZW0uQ3JlYXRlV2F0Y2hlclJlc3BvbnNlEl0KEEdldFdhdGNoZXJFdmVudHMSIy5maWxlc3lzdGVtLkdldFdhdGNoZXJFdmVudHNSZXF1ZXN0GiQuZmlsZXN5c3RlbS5HZXRXYXRjaGVyRXZlbnRzUmVzcG9uc2USVAoNUmVtb3ZlV2F0Y2hlchIgLmZpbGVzeXN0ZW0uUmVtb3ZlV2F0Y2hlclJlcXVlc3QaIS5maWxlc3lzdGVtLlJlbW92ZVdhdGNoZXJSZXNwb25zZUJpCg5jb20uZmlsZXN5c3RlbUIPRmlsZXN5c3RlbVByb3RvUAGiAgNGWFiqAgpGaWxlc3lzdGVtygIKRmlsZXN5c3RlbeICFkZpbGVzeXN0ZW1cR1BCTWV0YWRhdGHqAgpGaWxlc3lzdGVtYgZwcm90bzM", [file_google_protobuf_timestamp]), 0);
function mapEventType(type) {
	switch (type) {
		case 5: return "chmod";
		case 1: return "create";
		case 3: return "remove";
		case 4: return "rename";
		case 2: return "write";
	}
}
/**
* Handle for watching a directory in the sandbox filesystem.
*
* Use {@link WatchHandle.stop} to stop watching the directory.
*/
var WatchHandle = class {
	constructor(handleStop, events, onEvent, onExit, checkHealth) {
		this.handleStop = handleStop;
		this.events = events;
		this.onEvent = onEvent;
		this.onExit = onExit;
		this.checkHealth = checkHealth;
		this.handleEvents();
	}
	/**
	* Stop watching the directory.
	*/
	async stop() {
		this.handleStop();
	}
	iterateEvents() {
		var _this2 = this;
		return _wrapAsyncGenerator(function* () {
			try {
				var _iteratorAbruptCompletion = false;
				var _didIteratorError = false;
				var _iteratorError;
				try {
					for (var _iterator = _asyncIterator(_this2.events), _step; _iteratorAbruptCompletion = !(_step = yield _awaitAsyncGenerator(_iterator.next())).done; _iteratorAbruptCompletion = false) {
						const event = _step.value;
						switch (event.event.case) {
							case "filesystem": yield event.event;
						}
					}
				} catch (err) {
					_didIteratorError = true;
					_iteratorError = err;
				} finally {
					try {
						if (_iteratorAbruptCompletion && _iterator.return != null) yield _awaitAsyncGenerator(_iterator.return());
					} finally {
						if (_didIteratorError) throw _iteratorError;
					}
				}
			} catch (err) {
				throw yield _awaitAsyncGenerator(handleRpcErrorWithHealthCheck(err, _this2.checkHealth));
			}
		})();
	}
	async handleEvents() {
		var _this3 = this;
		let iterationError;
		try {
			var _iteratorAbruptCompletion2 = false;
			var _didIteratorError2 = false;
			var _iteratorError2;
			try {
				for (var _iterator2 = _asyncIterator(_this3.iterateEvents()), _step2; _iteratorAbruptCompletion2 = !(_step2 = await _iterator2.next()).done; _iteratorAbruptCompletion2 = false) {
					const event = _step2.value;
					{
						var _this$onEvent;
						const eventType = mapEventType(event.value.type);
						if (eventType === void 0) continue;
						await ((_this$onEvent = _this3.onEvent) === null || _this$onEvent === void 0 ? void 0 : _this$onEvent.call(_this3, {
							name: event.value.name,
							type: eventType,
							entry: event.value.entry ? mapEntryInfo(event.value.entry) : void 0
						}));
					}
				}
			} catch (err) {
				_didIteratorError2 = true;
				_iteratorError2 = err;
			} finally {
				try {
					if (_iteratorAbruptCompletion2 && _iterator2.return != null) await _iterator2.return();
				} finally {
					if (_didIteratorError2) throw _iteratorError2;
				}
			}
		} catch (err) {
			iterationError = err;
		}
		try {
			if (iterationError) {
				var _this$onExit;
				await ((_this$onExit = _this3.onExit) === null || _this$onExit === void 0 ? void 0 : _this$onExit.call(_this3, iterationError));
			} else {
				var _this$onExit2;
				await ((_this$onExit2 = _this3.onExit) === null || _this$onExit2 === void 0 ? void 0 : _this$onExit2.call(_this3));
			}
		} catch (_unused) {} finally {
			_this3.handleStop();
		}
	}
};
var FILESYSTEM_HTTP_ERROR_MAP = { 404: (message) => new FileNotFoundError(message) };
var FILESYSTEM_RPC_ERROR_MAP = { [Code.NotFound]: (message) => new FileNotFoundError(message) };
async function handleFilesystemRpcError(err, checkHealth) {
	return handleRpcErrorWithHealthCheck(err, checkHealth, FILESYSTEM_RPC_ERROR_MAP);
}
function handleFilesystemEnvdApiError(res) {
	return handleEnvdApiError(res, FILESYSTEM_HTTP_ERROR_MAP);
}
function mapFileType(fileType) {
	switch (fileType) {
		case 2: return "dir";
		case 1: return "file";
		case 3: return "symlink";
	}
}
function mapModifiedTime(modifiedTime) {
	if (!modifiedTime) return void 0;
	return new Date(Number(modifiedTime.seconds) * 1e3 + Math.floor(modifiedTime.nanos / 1e6));
}
function mapMetadata(metadata) {
	if (!metadata) return void 0;
	return Object.keys(metadata).length === 0 ? void 0 : metadata;
}
var METADATA_HEADER_PREFIX = "X-Metadata-";
var METADATA_KEY_REGEX = /^[A-Za-z0-9!#$%&'*+\-.^_`|~]+$/;
var METADATA_VALUE_REGEX = /^[\x20-\x7e]*$/;
function validateMetadata(metadata) {
	if (!metadata) return;
	for (const [key, value] of Object.entries(metadata)) {
		if (!METADATA_KEY_REGEX.test(key)) throw new InvalidArgumentError(`Invalid metadata key ${JSON.stringify(key)}: keys must be non-empty and use only HTTP token characters (letters, digits and !#$%&'*+-.^_\`|~).`);
		if (!METADATA_VALUE_REGEX.test(value)) throw new InvalidArgumentError(`Invalid metadata value for key ${JSON.stringify(key)}: values must be printable US-ASCII.`);
	}
}
function metadataHeaders(metadata) {
	if (!metadata) return {};
	const headers = {};
	for (const [key, value] of Object.entries(metadata)) headers[`${METADATA_HEADER_PREFIX}${key}`] = value;
	return headers;
}
/**
* Map a protobuf `EntryInfo` to the SDK `EntryInfo`.
*/
function mapEntryInfo(entry) {
	return {
		name: entry.name,
		type: mapFileType(entry.type),
		path: entry.path,
		size: Number(entry.size),
		mode: entry.mode,
		permissions: entry.permissions,
		owner: entry.owner,
		group: entry.group,
		modifiedTime: mapModifiedTime(entry.modifiedTime),
		symlinkTarget: entry.symlinkTarget,
		metadata: mapMetadata(entry.metadata)
	};
}
/**
* Module for interacting with the sandbox filesystem.
*/
var Filesystem = class {
	constructor(transport, envdApi, connectionConfig) {
		this.envdApi = envdApi;
		this.connectionConfig = connectionConfig;
		_defineProperty(this, "rpc", void 0);
		_defineProperty(this, "defaultWatchTimeout", 6e4);
		_defineProperty(this, "defaultWatchRecursive", false);
		_defineProperty(this, "checkHealth", void 0);
		this.rpc = createClient$1(Filesystem$1, transport);
		this.checkHealth = () => checkSandboxHealth(this.envdApi);
	}
	async read(path, opts) {
		var _this = this;
		var _opts$format;
		const format = (_opts$format = opts === null || opts === void 0 ? void 0 : opts.format) !== null && _opts$format !== void 0 ? _opts$format : "text";
		let user = opts === null || opts === void 0 ? void 0 : opts.user;
		if (user == void 0 && compareVersions(_this.envdApi.version, "0.4.0") < 0) user = defaultUsername;
		const headers = {};
		if (opts === null || opts === void 0 ? void 0 : opts.gzip) headers["Accept-Encoding"] = "gzip";
		if (format === "stream") {
			var _opts$requestTimeoutM;
			const requestTimeoutMs = (_opts$requestTimeoutM = opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs) !== null && _opts$requestTimeoutM !== void 0 ? _opts$requestTimeoutM : _this.connectionConfig.requestTimeoutMs;
			const { controller, clearStartTimeout, cleanup } = setupRequestController(requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal);
			try {
				var _opts$streamIdleTimeo;
				const res = await _this.envdApi.api.GET("/files", {
					params: { query: {
						path,
						username: user
					} },
					parseAs: "stream",
					signal: controller.signal,
					headers
				}).catch(async (err) => {
					throw await handleEnvdApiFetchError(err, _this.checkHealth);
				});
				const err = await handleFilesystemEnvdApiError(res);
				if (err) {
					if (res.response.body && !res.response.bodyUsed) await res.response.body.cancel().catch(() => {});
					cleanup();
					throw err;
				}
				return wrapStreamWithConnectionCleanup(res.data, {
					clearStartTimeout,
					cleanup,
					controller,
					idleTimeoutMs: (_opts$streamIdleTimeo = opts === null || opts === void 0 ? void 0 : opts.streamIdleTimeoutMs) !== null && _opts$streamIdleTimeo !== void 0 ? _opts$streamIdleTimeo : requestTimeoutMs
				});
			} catch (err) {
				cleanup();
				throw err;
			}
		}
		const res = await _this.envdApi.api.GET("/files", {
			params: { query: {
				path,
				username: user
			} },
			parseAs: format === "bytes" ? "arrayBuffer" : format,
			signal: _this.connectionConfig.getSignal(opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal),
			headers
		}).catch(async (err) => {
			throw await handleEnvdApiFetchError(err, _this.checkHealth);
		});
		const err = await handleFilesystemEnvdApiError(res);
		if (err) throw err;
		if (res.response.headers.get("content-length") === "0") {
			if (format === "bytes") return /* @__PURE__ */ new Uint8Array(0);
			return format === "blob" ? new Blob([]) : "";
		}
		if (format === "bytes") return new Uint8Array(res.data);
		return res.data;
	}
	async write(pathOrFiles, dataOrOpts, opts) {
		var _this2 = this;
		var _writeOpts$useOctetSt;
		if (typeof pathOrFiles !== "string" && !Array.isArray(pathOrFiles)) throw new Error("Path or files are required");
		if (typeof pathOrFiles === "string" && Array.isArray(dataOrOpts)) throw new Error("Cannot specify both path and array of files. You have to specify either path and data for a single file or an array for multiple files.");
		const { path, writeOpts, writeFiles } = typeof pathOrFiles === "string" ? {
			path: pathOrFiles,
			writeOpts: opts,
			writeFiles: [{ data: dataOrOpts }]
		} : {
			path: void 0,
			writeOpts: dataOrOpts,
			writeFiles: pathOrFiles
		};
		if (writeFiles.length === 0) return [];
		let user = writeOpts === null || writeOpts === void 0 ? void 0 : writeOpts.user;
		if (user == void 0 && compareVersions(_this2.envdApi.version, "0.4.0") < 0) user = defaultUsername;
		const useGzip = (writeOpts === null || writeOpts === void 0 ? void 0 : writeOpts.gzip) === true;
		const supportsOctetStream = compareVersions(_this2.envdApi.version, ENVD_OCTET_STREAM_UPLOAD) >= 0;
		const hasStreamableData = runtime !== "browser" && writeFiles.some((file) => isReadableStreamLike(file.data));
		const useOctetStream = (((_writeOpts$useOctetSt = writeOpts === null || writeOpts === void 0 ? void 0 : writeOpts.useOctetStream) !== null && _writeOpts$useOctetSt !== void 0 ? _writeOpts$useOctetSt : hasStreamableData) || useGzip) && supportsOctetStream;
		const metadata = writeOpts === null || writeOpts === void 0 ? void 0 : writeOpts.metadata;
		validateMetadata(metadata);
		if (metadata && Object.keys(metadata).length > 0 && compareVersions(_this2.envdApi.version, "0.6.2") < 0) throw new TemplateError("File metadata requires envd 0.6.2 or later.");
		const extraHeaders = metadataHeaders(metadata);
		const results = [];
		if (useOctetStream) {
			const headers = _objectSpread2({ "Content-Type": "application/octet-stream" }, extraHeaders);
			if (useGzip) headers["Content-Encoding"] = "gzip";
			const uploadResults = await Promise.all(writeFiles.map(async (file) => {
				const filePath = path !== null && path !== void 0 ? path : file.path;
				const { body, streamed } = await toUploadBody(file.data, useGzip);
				const signal = streamed ? writeOpts === null || writeOpts === void 0 ? void 0 : writeOpts.signal : _this2.connectionConfig.getSignal(writeOpts === null || writeOpts === void 0 ? void 0 : writeOpts.requestTimeoutMs, writeOpts === null || writeOpts === void 0 ? void 0 : writeOpts.signal);
				const res = await _this2.envdApi.api.POST("/files", _objectSpread2({
					params: { query: {
						path: filePath,
						username: user
					} },
					bodySerializer: () => body,
					headers,
					signal,
					body: {}
				}, streamed && { duplex: "half" })).catch(async (err) => {
					throw await handleEnvdApiFetchError(err, _this2.checkHealth);
				});
				const err = await handleFilesystemEnvdApiError(res);
				if (err) throw err;
				const files = res.data;
				if (!files || files.length === 0) throw new Error("Expected to receive information about written file");
				for (const f of files) f.metadata = mapMetadata(f.metadata);
				return files;
			}));
			for (const files of uploadResults) results.push(...files);
		} else {
			const formData = new FormData();
			for (const file of writeFiles) {
				var _path;
				formData.append("file", await toBlob(file.data), (_path = file.path) !== null && _path !== void 0 ? _path : path);
			}
			const res = await _this2.envdApi.api.POST("/files", {
				params: { query: {
					path,
					username: user
				} },
				bodySerializer: () => formData,
				headers: extraHeaders,
				signal: _this2.connectionConfig.getSignal(writeOpts === null || writeOpts === void 0 ? void 0 : writeOpts.requestTimeoutMs, writeOpts === null || writeOpts === void 0 ? void 0 : writeOpts.signal),
				body: {}
			}).catch(async (err) => {
				throw await handleEnvdApiFetchError(err, _this2.checkHealth);
			});
			const err = await handleFilesystemEnvdApiError(res);
			if (err) throw err;
			const files = res.data;
			if (!files || files.length === 0) throw new Error("Expected to receive information about written file");
			for (const f of files) f.metadata = mapMetadata(f.metadata);
			results.push(...files);
		}
		return results.length === 1 && path ? results[0] : results;
	}
	/**
	* Write multiple files.
	*
	*
	* Writing to a file that doesn't exist creates the file.
	*
	* Writing to a file that already exists overwrites the file.
	*
	* Writing to a file at path that doesn't exist creates the necessary directories.
	*
	* @param files list of files to write as `WriteEntry` objects, each containing `path` and `data`.
	* @param opts connection options.
	*
	* @returns information about the written files
	*/
	async writeFiles(files, opts) {
		return this.write(files, opts);
	}
	/**
	* List entries in a directory.
	*
	* @param path path to the directory.
	* @param opts connection options.
	*
	* @returns list of entries in the sandbox filesystem directory.
	*/
	async list(path, opts) {
		var _this4 = this;
		if (typeof (opts === null || opts === void 0 ? void 0 : opts.depth) === "number" && opts.depth < 1) throw new InvalidArgumentError("depth should be at least one");
		try {
			var _opts$depth;
			const res = await _this4.rpc.listDir({
				path,
				depth: (_opts$depth = opts === null || opts === void 0 ? void 0 : opts.depth) !== null && _opts$depth !== void 0 ? _opts$depth : 1
			}, {
				headers: authenticationHeader(_this4.envdApi.version, opts === null || opts === void 0 ? void 0 : opts.user),
				signal: _this4.connectionConfig.getSignal(opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal)
			});
			const entries = [];
			for (const e of res.entries) {
				if (!mapFileType(e.type)) continue;
				entries.push(mapEntryInfo(e));
			}
			return entries;
		} catch (err) {
			throw await handleFilesystemRpcError(err, _this4.checkHealth);
		}
	}
	/**
	* Create a new directory and all directories along the way if needed on the specified path.
	*
	* @param path path to a new directory. For example '/dirA/dirB' when creating 'dirB'.
	* @param opts connection options.
	*
	* @returns `true` if the directory was created, `false` if it already exists.
	*/
	async makeDir(path, opts) {
		var _this5 = this;
		try {
			await _this5.rpc.makeDir({ path }, {
				headers: authenticationHeader(_this5.envdApi.version, opts === null || opts === void 0 ? void 0 : opts.user),
				signal: _this5.connectionConfig.getSignal(opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal)
			});
			return true;
		} catch (err) {
			if (err instanceof ConnectError) {
				if (err.code === Code.AlreadyExists) return false;
			}
			throw await handleFilesystemRpcError(err, _this5.checkHealth);
		}
	}
	/**
	* Rename a file or directory.
	*
	* @param oldPath path to the file or directory to rename.
	* @param newPath new path for the file or directory.
	* @param opts connection options.
	*
	* @returns information about renamed file or directory.
	*/
	async rename(oldPath, newPath, opts) {
		var _this6 = this;
		try {
			const entry = (await _this6.rpc.move({
				source: oldPath,
				destination: newPath
			}, {
				headers: authenticationHeader(_this6.envdApi.version, opts === null || opts === void 0 ? void 0 : opts.user),
				signal: _this6.connectionConfig.getSignal(opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal)
			})).entry;
			if (!entry) throw new Error("Expected to receive information about moved object");
			return mapEntryInfo(entry);
		} catch (err) {
			throw await handleFilesystemRpcError(err, _this6.checkHealth);
		}
	}
	/**
	* Remove a file or directory.
	*
	* @param path path to a file or directory.
	* @param opts connection options.
	*/
	async remove(path, opts) {
		var _this7 = this;
		try {
			await _this7.rpc.remove({ path }, {
				headers: authenticationHeader(_this7.envdApi.version, opts === null || opts === void 0 ? void 0 : opts.user),
				signal: _this7.connectionConfig.getSignal(opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal)
			});
		} catch (err) {
			throw await handleFilesystemRpcError(err, _this7.checkHealth);
		}
	}
	/**
	* Check if a file or a directory exists.
	*
	* @param path path to a file or a directory
	* @param opts connection options.
	*
	* @returns `true` if the file or directory exists, `false` otherwise
	*/
	async exists(path, opts) {
		var _this8 = this;
		try {
			await _this8.rpc.stat({ path }, {
				headers: authenticationHeader(_this8.envdApi.version, opts === null || opts === void 0 ? void 0 : opts.user),
				signal: _this8.connectionConfig.getSignal(opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal)
			});
			return true;
		} catch (err) {
			if (err instanceof ConnectError) {
				if (err.code === Code.NotFound) return false;
			}
			throw await handleFilesystemRpcError(err, _this8.checkHealth);
		}
	}
	/**
	* Get information about a file or directory.
	*
	* @param path path to a file or directory.
	* @param opts connection options.
	*
	* @returns information about the file or directory like name, type, and path.
	*/
	async getInfo(path, opts) {
		var _this9 = this;
		try {
			const res = await _this9.rpc.stat({ path }, {
				headers: authenticationHeader(_this9.envdApi.version, opts === null || opts === void 0 ? void 0 : opts.user),
				signal: _this9.connectionConfig.getSignal(opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal)
			});
			if (!res.entry) throw new Error("Expected to receive information about the file or directory");
			return mapEntryInfo(res.entry);
		} catch (err) {
			throw await handleFilesystemRpcError(err, _this9.checkHealth);
		}
	}
	/**
	* Start watching a directory for filesystem events.
	*
	* @param path path to directory to watch.
	* @param onEvent callback to call when an event in the directory occurs.
	* @param opts connection options.
	*
	* @returns `WatchHandle` object for stopping watching directory.
	*/
	async watchDir(path, onEvent, opts) {
		var _this10 = this;
		var _opts$requestTimeoutM2, _opts$recursive, _opts$includeEntry, _opts$allowNetworkMou, _opts$timeoutMs;
		if ((opts === null || opts === void 0 ? void 0 : opts.recursive) && _this10.envdApi.version && compareVersions(_this10.envdApi.version, "0.1.4") < 0) throw new TemplateError("You need to update the template to use recursive watching.");
		if ((opts === null || opts === void 0 ? void 0 : opts.includeEntry) && _this10.envdApi.version && compareVersions(_this10.envdApi.version, "0.6.3") < 0) throw new TemplateError("You need to update the template to include entry info in watch events.");
		if ((opts === null || opts === void 0 ? void 0 : opts.allowNetworkMounts) && _this10.envdApi.version && compareVersions(_this10.envdApi.version, "0.6.4") < 0) throw new TemplateError("You need to update the template to watch directories on network mounts.");
		const { controller, clearStartTimeout, cleanup } = setupRequestController((_opts$requestTimeoutM2 = opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs) !== null && _opts$requestTimeoutM2 !== void 0 ? _opts$requestTimeoutM2 : _this10.connectionConfig.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal);
		const events = _this10.rpc.watchDir({
			path,
			recursive: (_opts$recursive = opts === null || opts === void 0 ? void 0 : opts.recursive) !== null && _opts$recursive !== void 0 ? _opts$recursive : _this10.defaultWatchRecursive,
			includeEntry: (_opts$includeEntry = opts === null || opts === void 0 ? void 0 : opts.includeEntry) !== null && _opts$includeEntry !== void 0 ? _opts$includeEntry : false,
			allowNetworkMounts: (_opts$allowNetworkMou = opts === null || opts === void 0 ? void 0 : opts.allowNetworkMounts) !== null && _opts$allowNetworkMou !== void 0 ? _opts$allowNetworkMou : false
		}, {
			headers: _objectSpread2(_objectSpread2({}, authenticationHeader(_this10.envdApi.version, opts === null || opts === void 0 ? void 0 : opts.user)), {}, { [KEEPALIVE_PING_HEADER]: 50 .toString() }),
			signal: controller.signal,
			timeoutMs: (_opts$timeoutMs = opts === null || opts === void 0 ? void 0 : opts.timeoutMs) !== null && _opts$timeoutMs !== void 0 ? _opts$timeoutMs : _this10.defaultWatchTimeout
		});
		try {
			await handleWatchDirStartEvent(events);
			clearStartTimeout();
			return new WatchHandle(cleanup, events, onEvent, opts === null || opts === void 0 ? void 0 : opts.onExit, _this10.checkHealth);
		} catch (err) {
			cleanup();
			throw await handleFilesystemRpcError(err, _this10.checkHealth);
		}
	}
};
function _asyncGeneratorDelegate(t) {
	var e = {}, n = !1;
	function pump(e, r) {
		return n = !0, r = new Promise(function(n) {
			n(t[e](r));
		}), {
			done: !1,
			value: new _OverloadYield(r, 1)
		};
	}
	return e["undefined" != typeof Symbol && Symbol.iterator || "@@iterator"] = function() {
		return this;
	}, e.next = function(t) {
		return n ? (n = !1, t) : pump("next", t);
	}, "function" == typeof t["throw"] && (e["throw"] = function(t) {
		if (n) throw n = !1, t;
		return pump("throw", t);
	}), "function" == typeof t["return"] && (e["return"] = function(t) {
		return n ? (n = !1, t) : pump("return", t);
	}), e;
}
/**
* Error thrown when a command exits with a non-zero exit code.
*/
var CommandExitError = class extends SandboxError {
	constructor(result) {
		super(result.error);
		this.result = result;
		this.name = "CommandExitError";
	}
	/**
	* Command execution exit code.
	* `0` if the command finished successfully.
	*/
	get exitCode() {
		return this.result.exitCode;
	}
	/**
	* Error message from command execution.
	*/
	get error() {
		return this.result.error;
	}
	/**
	* Command execution stdout output.
	*/
	get stdout() {
		return this.result.stdout;
	}
	/**
	* Command execution stderr output.
	*/
	get stderr() {
		return this.result.stderr;
	}
};
/**
* Command execution handle.
*
* It provides methods for waiting for the command to finish, retrieving stdout/stderr, and killing the command.
*
* @property {number} pid process ID of the command.
*/
var CommandHandle = class {
	/**
	* @hidden
	* @internal
	* @access protected
	*/
	constructor(pid, handleDisconnect, handleKill, events, onStdout, onStderr, onPty, handleSendStdin, handleCloseStdin, checkHealth) {
		this.pid = pid;
		this.handleDisconnect = handleDisconnect;
		this.handleKill = handleKill;
		this.events = events;
		this.onStdout = onStdout;
		this.onStderr = onStderr;
		this.onPty = onPty;
		this.handleSendStdin = handleSendStdin;
		this.handleCloseStdin = handleCloseStdin;
		this.checkHealth = checkHealth;
		_defineProperty(this, "_stdout", "");
		_defineProperty(this, "_stderr", "");
		_defineProperty(this, "stdoutDecoder", new TextDecoder());
		_defineProperty(this, "stderrDecoder", new TextDecoder());
		_defineProperty(this, "result", void 0);
		_defineProperty(this, "iterationError", void 0);
		_defineProperty(this, "disconnected", false);
		_defineProperty(this, "_wait", void 0);
		this._wait = this.handleEvents();
	}
	/**
	* Command execution exit code.
	* `0` if the command finished successfully.
	*
	* It is `undefined` if the command is still running.
	*/
	get exitCode() {
		var _this$result;
		return (_this$result = this.result) === null || _this$result === void 0 ? void 0 : _this$result.exitCode;
	}
	/**
	* Error message from command execution.
	*/
	get error() {
		var _this$result2;
		return (_this$result2 = this.result) === null || _this$result2 === void 0 ? void 0 : _this$result2.error;
	}
	/**
	* Command execution stderr output.
	*/
	get stderr() {
		return this._stderr;
	}
	/**
	* Command execution stdout output.
	*/
	get stdout() {
		return this._stdout;
	}
	/**
	* Wait for the command to finish and return the result.
	* If the command exits with a non-zero exit code, it throws a `CommandExitError`.
	*
	* @returns `CommandResult` result of command execution.
	*/
	async wait() {
		var _this = this;
		await _this._wait;
		if (_this.iterationError) throw _this.iterationError;
		if (!_this.result) throw new SandboxError("Process exited without a result");
		if (_this.result.exitCode !== 0) throw new CommandExitError(_this.result);
		return _this.result;
	}
	/**
	* Disconnect from the command.
	*
	* The command is not killed, but SDK stops receiving events from the command.
	* You can reconnect to the command using {@link Commands.connect}.
	*
	* Once it returns, the `onStdout`/`onStderr`/`onPty` callbacks are guaranteed
	* not to fire for output produced after this call. It does not wait for the
	* event handler to drain, so it returns promptly even for an idle command
	* whose stream produces no further output.
	*/
	async disconnect() {
		var _this2 = this;
		_this2.disconnected = true;
		_this2.handleDisconnect();
	}
	/**
	* Kill the command.
	* It uses `SIGKILL` signal to kill the command.
	*
	* @returns `true` if the command was killed successfully, `false` if the command was not found.
	*/
	async kill() {
		return await this.handleKill();
	}
	/**
	* Send data to the command stdin.
	*
	* The command must have been started with `stdin: true`.
	*
	* @param data data to send to the command.
	* @param opts connection options.
	*/
	async sendStdin(data, opts) {
		var _this4 = this;
		if (!_this4.handleSendStdin) throw new SandboxError("Sending stdin is not supported for this command handle.");
		await _this4.handleSendStdin(data, opts);
	}
	/**
	* Close the command stdin.
	*
	* This signals EOF to the command. The command must have been started with
	* `stdin: true`.
	*
	* @param opts connection options.
	*/
	async closeStdin(opts) {
		var _this5 = this;
		if (!_this5.handleCloseStdin) throw new SandboxError("Closing stdin is not supported for this command handle.");
		await _this5.handleCloseStdin(opts);
	}
	/**
	* Flush any bytes still buffered in the stream decoders.
	*
	* Incomplete trailing UTF-8 sequences are emitted as replacement
	* characters, matching the per-chunk decoding behavior.
	*/
	*flushDecoders() {
		const stdoutRest = this.stdoutDecoder.decode();
		if (stdoutRest) {
			this._stdout += stdoutRest;
			yield [
				stdoutRest,
				null,
				null
			];
		}
		const stderrRest = this.stderrDecoder.decode();
		if (stderrRest) {
			this._stderr += stderrRest;
			yield [
				null,
				stderrRest,
				null
			];
		}
	}
	iterateEvents() {
		var _this6 = this;
		return _wrapAsyncGenerator(function* () {
			try {
				var _iteratorAbruptCompletion = false;
				var _didIteratorError = false;
				var _iteratorError;
				try {
					for (var _iterator = _asyncIterator(_this6.events), _step; _iteratorAbruptCompletion = !(_step = yield _awaitAsyncGenerator(_iterator.next())).done; _iteratorAbruptCompletion = false) {
						const event = _step.value;
						{
							var _event$event;
							const e = event === null || event === void 0 || (_event$event = event.event) === null || _event$event === void 0 ? void 0 : _event$event.event;
							let out;
							switch (e === null || e === void 0 ? void 0 : e.case) {
								case "data":
									switch (e.value.output.case) {
										case "stdout":
											out = _this6.stdoutDecoder.decode(e.value.output.value, { stream: true });
											if (out) {
												_this6._stdout += out;
												yield [
													out,
													null,
													null
												];
											}
											break;
										case "stderr":
											out = _this6.stderrDecoder.decode(e.value.output.value, { stream: true });
											if (out) {
												_this6._stderr += out;
												yield [
													null,
													out,
													null
												];
											}
											break;
										case "pty": yield [
											null,
											null,
											e.value.output.value
										];
									}
									break;
								case "end": {
									const flushed = [..._this6.flushDecoders()];
									_this6.result = {
										exitCode: e.value.exitCode,
										error: e.value.error,
										stdout: _this6.stdout,
										stderr: _this6.stderr
									};
									for (const chunk of flushed) yield chunk;
									break;
								}
							}
						}
					}
				} catch (err) {
					_didIteratorError = true;
					_iteratorError = err;
				} finally {
					try {
						if (_iteratorAbruptCompletion && _iterator.return != null) yield _awaitAsyncGenerator(_iterator.return());
					} finally {
						if (_didIteratorError) throw _iteratorError;
					}
				}
			} catch (e) {
				yield* _asyncGeneratorDelegate(_asyncIterator(_this6.flushDecoders()));
				throw e;
			}
			if (_this6.result === void 0) yield* _asyncGeneratorDelegate(_asyncIterator(_this6.flushDecoders()));
		})();
	}
	async handleEvents() {
		var _this7 = this;
		try {
			var _iteratorAbruptCompletion2 = false;
			var _didIteratorError2 = false;
			var _iteratorError2;
			try {
				for (var _iterator2 = _asyncIterator(_this7.iterateEvents()), _step2; _iteratorAbruptCompletion2 = !(_step2 = await _iterator2.next()).done; _iteratorAbruptCompletion2 = false) {
					const [stdout, stderr, pty] = _step2.value;
					if (_this7.disconnected) break;
					if (stdout !== null) {
						var _this$onStdout;
						await ((_this$onStdout = _this7.onStdout) === null || _this$onStdout === void 0 ? void 0 : _this$onStdout.call(_this7, stdout));
					} else if (stderr !== null) {
						var _this$onStderr;
						await ((_this$onStderr = _this7.onStderr) === null || _this$onStderr === void 0 ? void 0 : _this$onStderr.call(_this7, stderr));
					} else if (pty) {
						var _this$onPty;
						await ((_this$onPty = _this7.onPty) === null || _this$onPty === void 0 ? void 0 : _this$onPty.call(_this7, pty));
					}
				}
			} catch (err) {
				_didIteratorError2 = true;
				_iteratorError2 = err;
			} finally {
				try {
					if (_iteratorAbruptCompletion2 && _iterator2.return != null) await _iterator2.return();
				} finally {
					if (_didIteratorError2) throw _iteratorError2;
				}
			}
		} catch (e) {
			_this7.iterationError = await handleRpcErrorWithHealthCheck(e, _this7.checkHealth);
		} finally {
			_this7.handleDisconnect();
		}
	}
};
/**
* Generic, reusable paginator for cursor-based list endpoints.
*
* The base owns the shared pagination state — `hasNext`, `nextToken`, and the
* reading of the `x-next-token` response header (via {@link Paginator.updatePagination}).
* Each concrete paginator implements {@link Paginator.nextItems} to do the
* actual fetching for its endpoint, so any model can expose pagination by
* subclassing this without reimplementing the bookkeeping.
*
* The optional `O` type parameter is the per-call options type accepted by
* `nextItems` (e.g. connection options for a given API).
*
* @example
* ```ts
* const paginator = Sandbox.list()
* while (paginator.hasNext) {
*   const items = await paginator.nextItems()
*   console.log(items)
* }
* ```
*/
var Paginator = class {
	constructor(opts, limit, nextToken) {
		_defineProperty(this, "opts", void 0);
		_defineProperty(this, "limit", void 0);
		_defineProperty(this, "_hasNext", void 0);
		_defineProperty(this, "_nextToken", void 0);
		this.opts = opts;
		this.limit = limit;
		this._hasNext = true;
		this._nextToken = nextToken;
	}
	/**
	* Returns true if there are more items to fetch.
	*/
	get hasNext() {
		return this._hasNext;
	}
	/**
	* Returns the next token to use for pagination.
	*/
	get nextToken() {
		return this._nextToken;
	}
	/**
	* Update the pagination state from a response, reading the `x-next-token`
	* header. Concrete paginators call this from {@link Paginator.nextItems}
	* after fetching a page.
	*/
	updatePagination(response) {
		this._nextToken = response.headers.get("x-next-token") || void 0;
		this._hasNext = !!this._nextToken;
	}
};
/**
* CIDR range that represents all traffic.
*/
var ALL_TRAFFIC = "0.0.0.0/0";
/**
* Add HTTP(S) credentials to a Git URL.
*
* @param url Git repository URL.
* @param username Username for HTTP(S) authentication.
* @param password Password or token for HTTP(S) authentication.
* @returns URL with embedded credentials.
*/
function withCredentials(url, username, password) {
	if (!username && !password) return url;
	if (!username || !password) throw new InvalidArgumentError("Both username and password are required when using Git credentials.");
	let parsed;
	try {
		parsed = new URL(url);
	} catch (_unused) {
		throw new InvalidArgumentError(`Invalid Git URL: ${url}`);
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new InvalidArgumentError("Only http(s) Git URLs support username/password credentials.");
	parsed.username = username;
	parsed.password = password;
	return parsed.toString();
}
/**
* Strip HTTP(S) credentials from a Git URL.
*
* @param url Git repository URL.
* @returns URL without embedded credentials.
*/
function stripCredentials(url) {
	let parsed;
	try {
		parsed = new URL(url);
	} catch (_unused2) {
		return url;
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return url;
	if (!parsed.username && !parsed.password) return url;
	parsed.username = "";
	parsed.password = "";
	return parsed.toString();
}
/**
* Derive the default repository directory name from a Git URL.
*
* @param url Git repository URL.
* @returns Repository directory name, if it can be determined.
*/
function deriveRepoDirFromUrl(url) {
	let parsed;
	try {
		parsed = new URL(url);
	} catch (_unused3) {
		return;
	}
	const lastSegment = parsed.pathname.replace(/\/+$/, "").split("/").pop();
	if (!lastSegment) return;
	return lastSegment.endsWith(".git") ? lastSegment.slice(0, -4) : lastSegment;
}
/**
* Build a shell-safe git command string.
*
* @param args Git command arguments.
* @param repoPath Repository path for `git -C`, if provided.
* @returns Shell-safe git command.
*/
function buildGitCommand(args, repoPath) {
	const parts = ["git"];
	if (repoPath) parts.push("-C", repoPath);
	parts.push(...args);
	return parts.map((part) => shellQuote(part)).join(" ");
}
function buildPushArgs(remoteName, opts) {
	const { remote, branch, setUpstream } = opts;
	const args = ["push"];
	const targetRemote = remoteName !== null && remoteName !== void 0 ? remoteName : remote;
	if (setUpstream && targetRemote) args.push("--set-upstream");
	if (targetRemote) args.push(targetRemote);
	if (branch) args.push(branch);
	return args;
}
function parseAheadBehind(segment) {
	if (!segment) return {
		ahead: 0,
		behind: 0
	};
	let ahead = 0;
	let behind = 0;
	if (segment.includes("ahead")) try {
		ahead = Number.parseInt(segment.split("ahead")[1].split(",")[0].trim(), 10);
	} catch (_unused4) {
		ahead = 0;
	}
	if (segment.includes("behind")) try {
		behind = Number.parseInt(segment.split("behind")[1].split(",")[0].trim(), 10);
	} catch (_unused5) {
		behind = 0;
	}
	return {
		ahead,
		behind
	};
}
function normalizeBranchName(name) {
	if (name.startsWith("HEAD (detached at ")) return name.replace("HEAD (detached at ", "").replace(/\)$/, "");
	return name.replace("HEAD (no branch)", "HEAD").replace("No commits yet on ", "").replace("Initial commit on ", "");
}
function deriveStatus(indexStatus, workingStatus) {
	const statuses = /* @__PURE__ */ new Set([indexStatus, workingStatus]);
	if (statuses.has("U")) return "conflict";
	if (statuses.has("R")) return "renamed";
	if (statuses.has("C")) return "copied";
	if (statuses.has("D")) return "deleted";
	if (statuses.has("A")) return "added";
	if (statuses.has("M")) return "modified";
	if (statuses.has("T")) return "typechange";
	if (statuses.has("?")) return "untracked";
	return "unknown";
}
/**
* Parse `git status --porcelain=1 -b` output into a structured object.
*
* @param output Git status output.
* @returns Parsed {@link GitStatus}.
*/
function parseGitStatus(output) {
	const lines = output.split("\n").map((line) => line.replace(/\r$/, "")).filter((line) => line.trim().length > 0);
	let currentBranch;
	let upstream;
	let ahead = 0;
	let behind = 0;
	let detached = false;
	const fileStatus = [];
	if (lines.length === 0) return {
		currentBranch,
		upstream,
		ahead,
		behind,
		detached,
		fileStatus,
		isClean: true,
		hasChanges: false,
		hasStaged: false,
		hasUntracked: false,
		hasConflicts: false,
		totalCount: 0,
		stagedCount: 0,
		unstagedCount: 0,
		untrackedCount: 0,
		conflictCount: 0
	};
	const branchLine = lines[0];
	if (branchLine.startsWith("## ")) {
		const branchInfo = branchLine.slice(3);
		const aheadStart = branchInfo.indexOf(" [");
		const branchPart = aheadStart === -1 ? branchInfo : branchInfo.slice(0, aheadStart);
		const aheadPart = aheadStart === -1 ? void 0 : branchInfo.slice(aheadStart + 2, -1);
		const normalizedBranch = normalizeBranchName(branchPart);
		const rawBranch = branchPart;
		if (rawBranch.startsWith("HEAD (detached at ") || rawBranch.includes("detached") || normalizedBranch.startsWith("HEAD")) detached = true;
		else if (normalizedBranch.includes("...")) {
			const [branch, upstreamBranch] = normalizedBranch.split("...");
			currentBranch = branch || void 0;
			upstream = upstreamBranch || void 0;
		} else currentBranch = normalizedBranch || void 0;
		const aheadBehind = parseAheadBehind(aheadPart);
		ahead = aheadBehind.ahead;
		behind = aheadBehind.behind;
	}
	for (const line of lines.slice(1)) {
		if (line.startsWith("?? ")) {
			const name = line.slice(3);
			fileStatus.push({
				name,
				status: "untracked",
				indexStatus: "?",
				workingTreeStatus: "?",
				staged: false
			});
			continue;
		}
		if (line.length < 3) continue;
		const indexStatus = line[0];
		const workingTreeStatus = line[1];
		const path = line.slice(3);
		let renamedFrom;
		let name = path;
		if (path.includes(" -> ")) {
			const parts = path.split(" -> ");
			renamedFrom = parts[0];
			name = parts.slice(1).join(" -> ");
		}
		fileStatus.push(_objectSpread2({
			name,
			status: deriveStatus(indexStatus, workingTreeStatus),
			indexStatus,
			workingTreeStatus,
			staged: indexStatus !== " " && indexStatus !== "?"
		}, renamedFrom ? { renamedFrom } : {}));
	}
	const totalCount = fileStatus.length;
	const stagedCount = fileStatus.filter((item) => item.staged).length;
	const untrackedCount = fileStatus.filter((item) => item.status === "untracked").length;
	const conflictCount = fileStatus.filter((item) => item.status === "conflict").length;
	const unstagedCount = totalCount - stagedCount;
	return {
		currentBranch,
		upstream,
		ahead,
		behind,
		detached,
		fileStatus,
		isClean: totalCount === 0,
		hasChanges: totalCount > 0,
		hasStaged: stagedCount > 0,
		hasUntracked: untrackedCount > 0,
		hasConflicts: conflictCount > 0,
		totalCount,
		stagedCount,
		unstagedCount,
		untrackedCount,
		conflictCount
	};
}
/**
* Parse `git branch --format=%(refname:short)\t%(HEAD)` output.
*
* @param output Git branch output.
* @returns Parsed {@link GitBranches}.
*/
function parseGitBranches(output) {
	const branches = [];
	let currentBranch;
	const lines = output.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
	for (const line of lines) {
		const parts = line.split("	");
		const name = parts[0];
		branches.push(name);
		if (parts.length > 1 && parts[1] === "*") currentBranch = name;
	}
	return {
		branches,
		currentBranch
	};
}
function isAuthFailure(err) {
	if (!(err instanceof CommandExitError)) return false;
	const message = `${err.stderr}\n${err.stdout}`.toLowerCase();
	return [
		"authentication failed",
		"terminal prompts disabled",
		"could not read username",
		"invalid username or password",
		"access denied",
		"permission denied",
		"not authorized"
	].some((snippet) => message.includes(snippet));
}
function getScopeFlag(scope) {
	if (scope !== "global" && scope !== "local" && scope !== "system") throw new InvalidArgumentError("Git config scope must be one of: global, local, system.");
	return `--${scope}`;
}
function isMissingUpstream(err) {
	if (!(err instanceof CommandExitError)) return false;
	const message = `${err.stderr}\n${err.stdout}`.toLowerCase();
	return [
		"has no upstream branch",
		"no upstream branch",
		"no upstream configured",
		"no tracking information for the current branch",
		"no tracking information",
		"set the remote as upstream",
		"set the upstream branch",
		"please specify which branch you want to merge with"
	].some((snippet) => message.includes(snippet));
}
function buildAuthErrorMessage(action, missingPassword) {
	if (missingPassword) return `Git ${action} requires a password/token for private repositories.`;
	return `Git ${action} requires credentials for private repositories.`;
}
function buildUpstreamErrorMessage(action) {
	if (action === "push") return "Git push failed because no upstream branch is configured. Set upstream once with { setUpstream: true } (and optional remote/branch), or pass remote and branch explicitly.";
	return "Git pull failed because no upstream branch is configured. Pass remote and branch explicitly, or set upstream once (push with { setUpstream: true } or run: git branch --set-upstream-to=origin/<branch> <branch>).";
}
function getRepoPathForScope(scope, path) {
	if (scope !== "local") return;
	if (!path) throw new InvalidArgumentError("A repository path is required when using scope \"local\".");
	return path;
}
function _objectWithoutPropertiesLoose(r, e) {
	if (null == r) return {};
	var t = {};
	for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
		if (e.includes(n)) continue;
		t[n] = r[n];
	}
	return t;
}
function _objectWithoutProperties(e, t) {
	if (null == e) return {};
	var o, r, i = _objectWithoutPropertiesLoose(e, t);
	if (Object.getOwnPropertySymbols) {
		var s = Object.getOwnPropertySymbols(e);
		for (r = 0; r < s.length; r++) o = s[r], t.includes(o) || {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]);
	}
	return i;
}
var _excluded$1 = [
	"username",
	"password",
	"branch",
	"depth",
	"path",
	"dangerouslyStoreCredentials"
];
var _excluded2 = ["bare", "initialBranch"];
var _excluded3 = ["fetch", "overwrite"];
var _excluded4 = ["force"];
var _excluded5 = ["files", "all"];
var _excluded6 = [
	"authorName",
	"authorEmail",
	"allowEmpty"
];
var _excluded7 = [
	"mode",
	"target",
	"paths"
];
var _excluded8 = [
	"paths",
	"staged",
	"worktree",
	"source"
];
var _excluded9 = [
	"remote",
	"branch",
	"setUpstream",
	"username",
	"password"
];
var _excluded10 = [
	"remote",
	"branch",
	"username",
	"password"
];
var _excluded11 = [
	"username",
	"password",
	"host",
	"protocol"
];
var _excluded12 = ["envs"];
var _excluded13 = ["envs"];
var DEFAULT_GIT_ENV = { GIT_TERMINAL_PROMPT: "0" };
/**
* Module for running git operations in the sandbox.
*
* @deprecated Run git with `sandbox.commands.run()` instead. The git module will be removed in the next major version.
*/
var Git = class {
	constructor(commands) {
		this.commands = commands;
	}
	/**
	* Clone a git repository into the sandbox.
	*
	* @param url Git repository URL.
	* @param opts Clone options.
	* @returns Command result from the command runner.
	*/
	async clone(url, opts) {
		var _this = this;
		const _ref = opts !== null && opts !== void 0 ? opts : {}, { username, password, branch, depth, path, dangerouslyStoreCredentials } = _ref, rest = _objectWithoutProperties(_ref, _excluded$1);
		if (password && !username) throw new InvalidArgumentError("Username is required when using a password or token for git clone.");
		const attemptClone = async (authUsername, authPassword) => {
			const urlWithCreds = authUsername && authPassword ? withCredentials(url, authUsername, authPassword) : url;
			const sanitizedUrl = stripCredentials(urlWithCreds);
			const stripInlineCreds = !dangerouslyStoreCredentials && sanitizedUrl !== urlWithCreds;
			const repoPath = stripInlineCreds ? path !== null && path !== void 0 ? path : deriveRepoDirFromUrl(url) : path;
			if (stripInlineCreds && !repoPath) throw new InvalidArgumentError("A destination path is required when using credentials without storing them.");
			const args = ["clone", urlWithCreds];
			if (branch) args.push("--branch", branch, "--single-branch");
			if (depth) args.push("--depth", depth.toString());
			if (repoPath) args.push(repoPath);
			const result = await _this.runGit(args, void 0, rest);
			if (stripInlineCreds) await _this.runGit([
				"remote",
				"set-url",
				"origin",
				sanitizedUrl
			], repoPath, rest);
			return result;
		};
		try {
			return await attemptClone(username, password);
		} catch (err) {
			if (isAuthFailure(err)) throw new GitAuthError(buildAuthErrorMessage("clone", Boolean(username) && !password));
			throw err;
		}
	}
	/**
	* Initialize a new git repository.
	*
	* @param path Destination path for the repository.
	* @param opts Init options.
	* @returns Command result from the command runner.
	*/
	async init(path, opts) {
		var _this2 = this;
		const _ref2 = opts !== null && opts !== void 0 ? opts : {}, { bare, initialBranch } = _ref2, rest = _objectWithoutProperties(_ref2, _excluded2);
		const args = ["init"];
		if (initialBranch) args.push("--initial-branch", initialBranch);
		if (bare) args.push("--bare");
		args.push(path);
		return _this2.runGit(args, void 0, rest);
	}
	/**
	* Add (or update) a remote for a repository.
	*
	* @param path Repository path.
	* @param name Remote name (for example, `"origin"`).
	* @param url Remote URL.
	* @param opts Remote add options.
	* @returns Command result from the command runner.
	*/
	async remoteAdd(path, name, url, opts) {
		var _this3 = this;
		if (!name || !url) throw new InvalidArgumentError("Both remote name and URL are required to add a git remote.");
		const _ref3 = opts !== null && opts !== void 0 ? opts : {}, { fetch, overwrite } = _ref3, rest = _objectWithoutProperties(_ref3, _excluded3);
		const addArgs = ["remote", "add"];
		if (fetch) addArgs.push("-f");
		addArgs.push(name, url);
		if (!overwrite) return _this3.runGit(addArgs, path, rest);
		let cmd = `${buildGitCommand(addArgs, path)} || ${buildGitCommand([
			"remote",
			"set-url",
			name,
			url
		], path)}`;
		if (fetch) {
			const fetchCmd = buildGitCommand(["fetch", name], path);
			cmd = `(${cmd}) && ${fetchCmd}`;
		}
		return _this3.runShell(cmd, rest);
	}
	/**
	* Get the URL for a git remote.
	*
	* Returns `undefined` when the remote does not exist.
	*
	* @param path Repository path.
	* @param name Remote name (for example, `"origin"`).
	* @param opts Command execution options.
	* @returns Remote URL if present.
	*/
	async remoteGet(path, name, opts) {
		var _this4 = this;
		if (!name) throw new InvalidArgumentError("Remote name is required.");
		const cmd = `${buildGitCommand([
			"remote",
			"get-url",
			name
		], path)} || true`;
		const trimmed = (await _this4.runShell(cmd, opts)).stdout.trim();
		return trimmed.length > 0 ? trimmed : void 0;
	}
	/**
	* Get repository status information.
	*
	* @param path Repository path.
	* @param opts Command execution options.
	* @returns Parsed git status.
	*/
	async status(path, opts) {
		return parseGitStatus((await this.runGit([
			"status",
			"--porcelain=1",
			"-b"
		], path, opts)).stdout);
	}
	/**
	* List branches in a repository.
	*
	* @param path Repository path.
	* @param opts Command execution options.
	* @returns Parsed branch list.
	*/
	async branches(path, opts) {
		return parseGitBranches((await this.runGit(["branch", "--format=%(refname:short)	%(HEAD)"], path, opts)).stdout);
	}
	/**
	* Create and check out a new branch.
	*
	* @param path Repository path.
	* @param branch Branch name to create.
	* @param opts Command execution options.
	* @returns Command result from the command runner.
	*/
	async createBranch(path, branch, opts) {
		return this.runGit([
			"checkout",
			"-b",
			branch
		], path, opts);
	}
	/**
	* Check out an existing branch.
	*
	* @param path Repository path.
	* @param branch Branch name to check out.
	* @param opts Command execution options.
	* @returns Command result from the command runner.
	*/
	async checkoutBranch(path, branch, opts) {
		return this.runGit(["checkout", branch], path, opts);
	}
	/**
	* Delete a branch.
	*
	* @param path Repository path.
	* @param branch Branch name to delete.
	* @param opts Delete options.
	* @returns Command result from the command runner.
	*/
	async deleteBranch(path, branch, opts) {
		var _this9 = this;
		const _ref4 = opts !== null && opts !== void 0 ? opts : {}, { force } = _ref4, rest = _objectWithoutProperties(_ref4, _excluded4);
		const args = [
			"branch",
			force ? "-D" : "-d",
			branch
		];
		return _this9.runGit(args, path, rest);
	}
	/**
	* Stage files for commit.
	*
	* @param path Repository path.
	* @param opts Add options.
	* @returns Command result from the command runner.
	*/
	async add(path, opts) {
		var _this10 = this;
		const _ref5 = opts !== null && opts !== void 0 ? opts : {}, { files, all = true } = _ref5, rest = _objectWithoutProperties(_ref5, _excluded5);
		const args = ["add"];
		if (!files || files.length === 0) args.push(all ? "-A" : ".");
		else args.push("--", ...files);
		return _this10.runGit(args, path, rest);
	}
	/**
	* Create a commit in the repository.
	*
	* @param path Repository path.
	* @param message Commit message.
	* @param opts Commit options.
	* @returns Command result from the command runner.
	*/
	async commit(path, message, opts) {
		var _this11 = this;
		const _ref6 = opts !== null && opts !== void 0 ? opts : {}, { authorName, authorEmail, allowEmpty } = _ref6, rest = _objectWithoutProperties(_ref6, _excluded6);
		const args = [
			"commit",
			"-m",
			message
		];
		if (allowEmpty) args.push("--allow-empty");
		const authorArgs = [];
		if (authorName) authorArgs.push("-c", `user.name=${authorName}`);
		if (authorEmail) authorArgs.push("-c", `user.email=${authorEmail}`);
		return _this11.runGit([...authorArgs, ...args], path, rest);
	}
	/**
	* Reset the current HEAD to a specified state.
	*
	* @param path Repository path.
	* @param opts Reset options.
	* @returns Command result from the command runner.
	*/
	async reset(path, opts) {
		var _this12 = this;
		const _ref7 = opts !== null && opts !== void 0 ? opts : {}, { mode, target, paths } = _ref7, rest = _objectWithoutProperties(_ref7, _excluded7);
		const allowedModes = [
			"soft",
			"mixed",
			"hard",
			"merge",
			"keep"
		];
		if (mode && !allowedModes.includes(mode)) throw new InvalidArgumentError(`Reset mode must be one of ${allowedModes.join(", ")}.`);
		const args = ["reset"];
		if (mode) args.push(`--${mode}`);
		if (target) args.push(target);
		if (paths && paths.length > 0) args.push("--", ...paths);
		return _this12.runGit(args, path, rest);
	}
	/**
	* Restore working tree files or unstage changes.
	*
	* @param path Repository path.
	* @param opts Restore options.
	* @returns Command result from the command runner.
	*/
	async restore(path, opts) {
		var _this13 = this;
		const { paths, staged, worktree, source } = opts, rest = _objectWithoutProperties(opts, _excluded8);
		if (!paths || paths.length === 0) throw new InvalidArgumentError("At least one path is required.");
		let resolvedStaged = staged;
		let resolvedWorktree = worktree;
		if (staged === void 0 && worktree === void 0) resolvedWorktree = true;
		else if (staged === true && worktree === void 0) resolvedWorktree = false;
		else if (staged === void 0 && worktree !== void 0) resolvedStaged = false;
		if (resolvedStaged === false && resolvedWorktree === false) throw new InvalidArgumentError("At least one of staged or worktree must be true.");
		const args = ["restore"];
		if (resolvedWorktree) args.push("--worktree");
		if (resolvedStaged) args.push("--staged");
		if (source) args.push("--source", source);
		args.push("--", ...paths);
		return _this13.runGit(args, path, rest);
	}
	/**
	* Push commits to a remote.
	*
	* @param path Repository path.
	* @param opts Push options.
	* @returns Command result from the command runner.
	*/
	async push(path, opts) {
		var _this14 = this;
		const _ref8 = opts !== null && opts !== void 0 ? opts : {}, { remote, branch, setUpstream = true, username, password } = _ref8, rest = _objectWithoutProperties(_ref8, _excluded9);
		if (password && !username) throw new InvalidArgumentError("Username is required when using a password or token for git push.");
		if (username && password) {
			const remoteName = await _this14.resolveRemoteName(path, remote, rest);
			return _this14.withRemoteCredentials(path, remoteName, username, password, rest, () => _this14.runGit(buildPushArgs(remoteName, {
				remote,
				branch,
				setUpstream
			}), path, rest));
		}
		try {
			return await _this14.runGit(buildPushArgs(void 0, {
				remote,
				branch,
				setUpstream
			}), path, rest);
		} catch (err) {
			if (isAuthFailure(err)) throw new GitAuthError(buildAuthErrorMessage("push", Boolean(username) && !password));
			if (isMissingUpstream(err)) throw new GitUpstreamError(buildUpstreamErrorMessage("push"));
			throw err;
		}
	}
	/**
	* Pull changes from a remote.
	*
	* @param path Repository path.
	* @param opts Pull options.
	* @returns Command result from the command runner.
	*/
	async pull(path, opts) {
		var _this15 = this;
		const _ref9 = opts !== null && opts !== void 0 ? opts : {}, { remote, branch, username, password } = _ref9, rest = _objectWithoutProperties(_ref9, _excluded10);
		if (password && !username) throw new InvalidArgumentError("Username is required when using a password or token for git pull.");
		if (!remote && !branch) {
			if (!await _this15.hasUpstream(path, rest)) throw new GitUpstreamError(buildUpstreamErrorMessage("pull"));
		}
		const buildArgs = (remoteName) => {
			const args = ["pull"];
			const targetRemote = remoteName !== null && remoteName !== void 0 ? remoteName : remote;
			if (targetRemote) args.push(targetRemote);
			if (branch) args.push(branch);
			return args;
		};
		if (username && password) {
			const remoteName = await _this15.resolveRemoteName(path, remote, rest);
			return _this15.withRemoteCredentials(path, remoteName, username, password, rest, () => _this15.runGit(buildArgs(remoteName), path, rest));
		}
		try {
			return await _this15.runGit(buildArgs(), path, rest);
		} catch (err) {
			if (isAuthFailure(err)) throw new GitAuthError(buildAuthErrorMessage("pull", Boolean(username) && !password));
			if (isMissingUpstream(err)) throw new GitUpstreamError(buildUpstreamErrorMessage("pull"));
			throw err;
		}
	}
	/**
	* Set a git config value.
	*
	* Use `scope: "local"` together with `path` to configure a specific repository.
	*
	* @param key Git config key (for example, `"pull.rebase"`).
	* @param value Git config value.
	* @param opts Config options.
	* @returns Command result from the command runner.
	*/
	async setConfig(key, value, opts) {
		var _this16 = this;
		var _opts$scope;
		if (!key) throw new InvalidArgumentError("Git config key is required.");
		const scope = (_opts$scope = opts === null || opts === void 0 ? void 0 : opts.scope) !== null && _opts$scope !== void 0 ? _opts$scope : "global";
		const scopeFlag = getScopeFlag(scope);
		const repoPath = getRepoPathForScope(scope, opts === null || opts === void 0 ? void 0 : opts.path);
		return _this16.runGit([
			"config",
			scopeFlag,
			key,
			value
		], repoPath, opts);
	}
	/**
	* Get a git config value.
	*
	* Returns `undefined` when the key is not set in the requested scope.
	*
	* @param key Git config key (for example, `"pull.rebase"`).
	* @param opts Config options.
	* @returns The config value if present.
	*/
	async getConfig(key, opts) {
		var _this17 = this;
		var _opts$scope2;
		if (!key) throw new InvalidArgumentError("Git config key is required.");
		const scope = (_opts$scope2 = opts === null || opts === void 0 ? void 0 : opts.scope) !== null && _opts$scope2 !== void 0 ? _opts$scope2 : "global";
		const scopeFlag = getScopeFlag(scope);
		const repoPath = getRepoPathForScope(scope, opts === null || opts === void 0 ? void 0 : opts.path);
		const cmd = `${buildGitCommand([
			"config",
			scopeFlag,
			"--get",
			key
		], repoPath)} || true`;
		const trimmed = (await _this17.runShell(cmd, opts)).stdout.trim();
		return trimmed.length > 0 ? trimmed : void 0;
	}
	/**
	* Dangerously authenticate git globally via the credential helper.
	*
	* This persists credentials in the credential store.
	* Prefer short-lived credentials when possible.
	*
	* @param opts Authentication options.
	* @returns Command result from the command runner.
	*/
	async dangerouslyAuthenticate(opts) {
		var _this18 = this;
		const { username, password, host, protocol } = opts, rest = _objectWithoutProperties(opts, _excluded11);
		if (!username || !password) throw new InvalidArgumentError("Both username and password are required to authenticate git.");
		const targetHost = (host !== null && host !== void 0 ? host : "github.com").trim();
		const credentialInput = [
			`protocol=${(protocol !== null && protocol !== void 0 ? protocol : "https").trim()}`,
			`host=${targetHost}`,
			`username=${username}`,
			`password=${password}`,
			"",
			""
		].join("\n");
		await _this18.runGit([
			"config",
			"--global",
			"credential.helper",
			"store"
		], void 0, rest);
		const approveCmd = `printf %s ${shellQuote(credentialInput)} | ${buildGitCommand(["credential", "approve"])}`;
		return _this18.runShell(approveCmd, rest);
	}
	/**
	* Configure git user name and email.
	*
	* @param name Git user name.
	* @param email Git user email.
	* @param opts Config options.
	* @returns Command result from the command runner.
	*/
	async configureUser(name, email, opts) {
		var _this19 = this;
		var _opts$scope3;
		if (!name || !email) throw new InvalidArgumentError("Both name and email are required.");
		const scope = (_opts$scope3 = opts === null || opts === void 0 ? void 0 : opts.scope) !== null && _opts$scope3 !== void 0 ? _opts$scope3 : "global";
		const configOpts = _objectSpread2(_objectSpread2({}, opts), {}, { scope });
		await _this19.setConfig("user.name", name, configOpts);
		return _this19.setConfig("user.email", email, configOpts);
	}
	/**
	* Build and execute a git command inside the sandbox.
	*
	* @param args Git arguments to pass to the git binary.
	* @param repoPath Repository path used with `git -C`, if provided.
	* @param opts Command execution options.
	* @returns Command result from the command runner.
	*/
	async runGit(args, repoPath, opts) {
		var _this20 = this;
		const _ref10 = opts !== null && opts !== void 0 ? opts : {}, { envs } = _ref10, rest = _objectWithoutProperties(_ref10, _excluded12);
		const cmd = buildGitCommand(args, repoPath);
		const mergedEnvs = _objectSpread2(_objectSpread2({}, DEFAULT_GIT_ENV), envs !== null && envs !== void 0 ? envs : {});
		return _this20.commands.run(cmd, _objectSpread2(_objectSpread2({}, rest), {}, { envs: mergedEnvs }));
	}
	/**
	* Execute a raw shell command while applying default git environment variables.
	* 
	Note: We can likely just modify runGit later to allow appending commands to the git but for now it's separate.
	*/
	async runShell(cmd, opts) {
		var _this21 = this;
		const _ref11 = opts !== null && opts !== void 0 ? opts : {}, { envs } = _ref11, rest = _objectWithoutProperties(_ref11, _excluded13);
		const mergedEnvs = _objectSpread2(_objectSpread2({}, DEFAULT_GIT_ENV), envs !== null && envs !== void 0 ? envs : {});
		return _this21.commands.run(cmd, _objectSpread2(_objectSpread2({}, rest), {}, { envs: mergedEnvs }));
	}
	async getRemoteUrl(path, remote, opts) {
		const url = (await this.runGit([
			"remote",
			"get-url",
			remote
		], path, opts)).stdout.trim();
		if (!url) throw new InvalidArgumentError(`Remote "${remote}" URL not found in repository.`);
		return url;
	}
	async resolveRemoteName(path, remote, opts) {
		var _this23 = this;
		if (remote) return remote;
		const remotes = (await _this23.runGit(["remote"], path, opts)).stdout.split("\n").map((line) => line.trim()).filter(Boolean);
		if (remotes.length === 1) return remotes[0];
		throw new InvalidArgumentError("Remote is required when using username/password and the repository has multiple remotes.");
	}
	async withRemoteCredentials(path, remote, username, password, opts, operation) {
		var _this24 = this;
		const originalUrl = await _this24.getRemoteUrl(path, remote, opts);
		const credentialUrl = withCredentials(originalUrl, username, password);
		await _this24.runGit([
			"remote",
			"set-url",
			remote,
			credentialUrl
		], path, opts);
		let result;
		let operationError;
		try {
			result = await operation();
		} catch (err) {
			operationError = err;
		}
		let restoreError;
		try {
			await _this24.runGit([
				"remote",
				"set-url",
				remote,
				originalUrl
			], path, opts);
		} catch (err) {
			restoreError = err;
		}
		if (operationError) throw operationError;
		if (restoreError) throw restoreError;
		return result;
	}
	async hasUpstream(path, opts) {
		var _this25 = this;
		try {
			return (await _this25.runGit([
				"rev-parse",
				"--abbrev-ref",
				"--symbolic-full-name",
				"@{u}"
			], path, opts)).stdout.trim().length > 0;
		} catch (_unused) {
			return false;
		}
	}
};
var envdFetchers = /* @__PURE__ */ new Map();
var envdRpcFetchers = /* @__PURE__ */ new Map();
var DEFAULT_ENVD_CONNECTION_LIMIT = 10;
var DEFAULT_ENVD_RPC_CONNECTION_LIMIT = 200;
var DEFAULT_ENVD_INFLIGHT_LIMIT = 2e3;
var DEFAULT_ENVD_RPC_INFLIGHT_LIMIT = 2e3;
function createEnvdFetchForRuntime(currentRuntime = runtime, options = {}) {
	return createRuntimeFetch(currentRuntime, () => {
		var _options$connectionLi, _options$inflightLimi;
		return buildDispatchedFetch({
			connections: (_options$connectionLi = options.connectionLimit) !== null && _options$connectionLi !== void 0 ? _options$connectionLi : DEFAULT_ENVD_CONNECTION_LIMIT,
			inflightLimit: (_options$inflightLimi = options.inflightLimit) !== null && _options$inflightLimi !== void 0 ? _options$inflightLimi : 0,
			proxy: options.proxy,
			loadUndici: options.loadUndici
		});
	});
}
function createEnvdFetch(proxy) {
	const key = proxy !== null && proxy !== void 0 ? proxy : "";
	const cached = envdFetchers.get(key);
	if (cached) return cached;
	const envdFetch = createEnvdFetchForRuntime(runtime, {
		inflightLimit: getEnvdInflightLimit(),
		proxy
	});
	envdFetchers.set(key, envdFetch);
	return envdFetch;
}
function createEnvdRpcFetch(proxy) {
	const key = proxy !== null && proxy !== void 0 ? proxy : "";
	const cached = envdRpcFetchers.get(key);
	if (cached) return cached;
	const envdRpcFetch = createEnvdFetchForRuntime(runtime, {
		connectionLimit: getEnvdRpcConnectionLimit(),
		inflightLimit: getEnvdRpcInflightLimit(),
		proxy
	});
	envdRpcFetchers.set(key, envdRpcFetch);
	return envdRpcFetch;
}
function getEnvdRpcConnectionLimit() {
	return parsePositiveIntEnv("E2B_ENVD_RPC_CONNECTIONS", DEFAULT_ENVD_RPC_CONNECTION_LIMIT);
}
/**
* Returns the configured max number of envd REST requests (e.g.
* `files.read`/`files.write`) that can be in flight at once across all
* sandboxes in this SDK process, or `0` to disable the cap.
*
* Defaults to `2000` ({@link DEFAULT_ENVD_INFLIGHT_LIMIT}). Override
* via `E2B_ENVD_INFLIGHT_REQUESTS` env var; set to `0` to disable the cap
* entirely.
*/
function getEnvdInflightLimit() {
	return parseInflightLimitEnv("E2B_ENVD_INFLIGHT_REQUESTS", DEFAULT_ENVD_INFLIGHT_LIMIT);
}
/**
* Returns the configured max number of envd RPC requests that
* can be in flight at once across all sandboxes in this SDK process,
* or `0` to disable the cap.
*
* Defaults to `2000` ({@link DEFAULT_ENVD_RPC_INFLIGHT_LIMIT}). Override
* via `E2B_ENVD_RPC_INFLIGHT_REQUESTS` env var; set to `0` to disable the cap
* entirely.
*/
function getEnvdRpcInflightLimit() {
	return parseInflightLimitEnv("E2B_ENVD_RPC_INFLIGHT_REQUESTS", DEFAULT_ENVD_RPC_INFLIGHT_LIMIT);
}
/**
* @generated from service process.Process
*/
var Process = /*@__PURE__*/ serviceDesc(/* @__PURE__ */ fileDesc("ChVwcm9jZXNzL3Byb2Nlc3MucHJvdG8SB3Byb2Nlc3MiSgoDUFRZEh8KBHNpemUYASABKAsyES5wcm9jZXNzLlBUWS5TaXplGiIKBFNpemUSDAoEY29scxgBIAEoDRIMCgRyb3dzGAIgASgNIqEBCg1Qcm9jZXNzQ29uZmlnEgsKA2NtZBgBIAEoCRIMCgRhcmdzGAIgAygJEi4KBGVudnMYAyADKAsyIC5wcm9jZXNzLlByb2Nlc3NDb25maWcuRW52c0VudHJ5EhAKA2N3ZBgEIAEoCUgAiAEBGisKCUVudnNFbnRyeRILCgNrZXkYASABKAkSDQoFdmFsdWUYAiABKAk6AjgBQgYKBF9jd2QiDQoLTGlzdFJlcXVlc3QiXAoLUHJvY2Vzc0luZm8SJgoGY29uZmlnGAEgASgLMhYucHJvY2Vzcy5Qcm9jZXNzQ29uZmlnEgsKA3BpZBgCIAEoDRIQCgN0YWcYAyABKAlIAIgBAUIGCgRfdGFnIjcKDExpc3RSZXNwb25zZRInCglwcm9jZXNzZXMYASADKAsyFC5wcm9jZXNzLlByb2Nlc3NJbmZvIpcBCgxTdGFydFJlcXVlc3QSJwoHcHJvY2VzcxgBIAEoCzIWLnByb2Nlc3MuUHJvY2Vzc0NvbmZpZxIeCgNwdHkYAiABKAsyDC5wcm9jZXNzLlBUWUgAiAEBEhAKA3RhZxgDIAEoCUgBiAEBEhIKBXN0ZGluGAQgASgISAKIAQFCBgoEX3B0eUIGCgRfdGFnQggKBl9zdGRpbiJiCg1VcGRhdGVSZXF1ZXN0EikKB3Byb2Nlc3MYASABKAsyGC5wcm9jZXNzLlByb2Nlc3NTZWxlY3RvchIeCgNwdHkYAiABKAsyDC5wcm9jZXNzLlBUWUgAiAEBQgYKBF9wdHkiEAoOVXBkYXRlUmVzcG9uc2UirwMKDFByb2Nlc3NFdmVudBIxCgVzdGFydBgBIAEoCzIgLnByb2Nlc3MuUHJvY2Vzc0V2ZW50LlN0YXJ0RXZlbnRIABIvCgRkYXRhGAIgASgLMh8ucHJvY2Vzcy5Qcm9jZXNzRXZlbnQuRGF0YUV2ZW50SAASLQoDZW5kGAMgASgLMh4ucHJvY2Vzcy5Qcm9jZXNzRXZlbnQuRW5kRXZlbnRIABI0CglrZWVwYWxpdmUYBCABKAsyHy5wcm9jZXNzLlByb2Nlc3NFdmVudC5LZWVwQWxpdmVIABoZCgpTdGFydEV2ZW50EgsKA3BpZBgBIAEoDRpICglEYXRhRXZlbnQSEAoGc3Rkb3V0GAEgASgMSAASEAoGc3RkZXJyGAIgASgMSAASDQoDcHR5GAMgASgMSABCCAoGb3V0cHV0GlsKCEVuZEV2ZW50EhEKCWV4aXRfY29kZRgBIAEoERIOCgZleGl0ZWQYAiABKAgSDgoGc3RhdHVzGAMgASgJEhIKBWVycm9yGAQgASgJSACIAQFCCAoGX2Vycm9yGgsKCUtlZXBBbGl2ZUIHCgVldmVudCI1Cg1TdGFydFJlc3BvbnNlEiQKBWV2ZW50GAEgASgLMhUucHJvY2Vzcy5Qcm9jZXNzRXZlbnQiNwoPQ29ubmVjdFJlc3BvbnNlEiQKBWV2ZW50GAEgASgLMhUucHJvY2Vzcy5Qcm9jZXNzRXZlbnQiYwoQU2VuZElucHV0UmVxdWVzdBIpCgdwcm9jZXNzGAEgASgLMhgucHJvY2Vzcy5Qcm9jZXNzU2VsZWN0b3ISJAoFaW5wdXQYAiABKAsyFS5wcm9jZXNzLlByb2Nlc3NJbnB1dCITChFTZW5kSW5wdXRSZXNwb25zZSI3CgxQcm9jZXNzSW5wdXQSDwoFc3RkaW4YASABKAxIABINCgNwdHkYAiABKAxIAEIHCgVpbnB1dCLCAgoSU3RyZWFtSW5wdXRSZXF1ZXN0EjcKBXN0YXJ0GAEgASgLMiYucHJvY2Vzcy5TdHJlYW1JbnB1dFJlcXVlc3QuU3RhcnRFdmVudEgAEjUKBGRhdGEYAiABKAsyJS5wcm9jZXNzLlN0cmVhbUlucHV0UmVxdWVzdC5EYXRhRXZlbnRIABI6CglrZWVwYWxpdmUYAyABKAsyJS5wcm9jZXNzLlN0cmVhbUlucHV0UmVxdWVzdC5LZWVwQWxpdmVIABo3CgpTdGFydEV2ZW50EikKB3Byb2Nlc3MYASABKAsyGC5wcm9jZXNzLlByb2Nlc3NTZWxlY3RvchoxCglEYXRhRXZlbnQSJAoFaW5wdXQYAiABKAsyFS5wcm9jZXNzLlByb2Nlc3NJbnB1dBoLCglLZWVwQWxpdmVCBwoFZXZlbnQiFQoTU3RyZWFtSW5wdXRSZXNwb25zZSJfChFTZW5kU2lnbmFsUmVxdWVzdBIpCgdwcm9jZXNzGAEgASgLMhgucHJvY2Vzcy5Qcm9jZXNzU2VsZWN0b3ISHwoGc2lnbmFsGAIgASgOMg8ucHJvY2Vzcy5TaWduYWwiFAoSU2VuZFNpZ25hbFJlc3BvbnNlIj4KEUNsb3NlU3RkaW5SZXF1ZXN0EikKB3Byb2Nlc3MYASABKAsyGC5wcm9jZXNzLlByb2Nlc3NTZWxlY3RvciIUChJDbG9zZVN0ZGluUmVzcG9uc2UiOwoOQ29ubmVjdFJlcXVlc3QSKQoHcHJvY2VzcxgBIAEoCzIYLnByb2Nlc3MuUHJvY2Vzc1NlbGVjdG9yIjsKD1Byb2Nlc3NTZWxlY3RvchINCgNwaWQYASABKA1IABINCgN0YWcYAiABKAlIAEIKCghzZWxlY3RvcipICgZTaWduYWwSFgoSU0lHTkFMX1VOU1BFQ0lGSUVEEAASEgoOU0lHTkFMX1NJR1RFUk0QDxISCg5TSUdOQUxfU0lHS0lMTBAJMpEECgdQcm9jZXNzEjMKBExpc3QSFC5wcm9jZXNzLkxpc3RSZXF1ZXN0GhUucHJvY2Vzcy5MaXN0UmVzcG9uc2USPgoHQ29ubmVjdBIXLnByb2Nlc3MuQ29ubmVjdFJlcXVlc3QaGC5wcm9jZXNzLkNvbm5lY3RSZXNwb25zZTABEjgKBVN0YXJ0EhUucHJvY2Vzcy5TdGFydFJlcXVlc3QaFi5wcm9jZXNzLlN0YXJ0UmVzcG9uc2UwARI5CgZVcGRhdGUSFi5wcm9jZXNzLlVwZGF0ZVJlcXVlc3QaFy5wcm9jZXNzLlVwZGF0ZVJlc3BvbnNlEkoKC1N0cmVhbUlucHV0EhsucHJvY2Vzcy5TdHJlYW1JbnB1dFJlcXVlc3QaHC5wcm9jZXNzLlN0cmVhbUlucHV0UmVzcG9uc2UoARJCCglTZW5kSW5wdXQSGS5wcm9jZXNzLlNlbmRJbnB1dFJlcXVlc3QaGi5wcm9jZXNzLlNlbmRJbnB1dFJlc3BvbnNlEkUKClNlbmRTaWduYWwSGi5wcm9jZXNzLlNlbmRTaWduYWxSZXF1ZXN0GhsucHJvY2Vzcy5TZW5kU2lnbmFsUmVzcG9uc2USRQoKQ2xvc2VTdGRpbhIaLnByb2Nlc3MuQ2xvc2VTdGRpblJlcXVlc3QaGy5wcm9jZXNzLkNsb3NlU3RkaW5SZXNwb25zZUJXCgtjb20ucHJvY2Vzc0IMUHJvY2Vzc1Byb3RvUAGiAgNQWFiqAgdQcm9jZXNzygIHUHJvY2Vzc+ICE1Byb2Nlc3NcR1BCTWV0YWRhdGHqAgdQcm9jZXNzYgZwcm90bzM"), 0);
/**
* Module for interacting with PTYs (pseudo-terminals) in the sandbox.
*/
var Pty = class {
	constructor(transport, envdApi, connectionConfig) {
		this.transport = transport;
		this.envdApi = envdApi;
		this.connectionConfig = connectionConfig;
		_defineProperty(this, "rpc", void 0);
		_defineProperty(this, "envdVersion", void 0);
		_defineProperty(this, "checkHealth", void 0);
		_defineProperty(this, "defaultPtyConnectionTimeout", 6e4);
		this.rpc = createClient$1(Process, this.transport);
		this.envdVersion = envdApi.version;
		this.checkHealth = () => checkSandboxHealth(this.envdApi);
	}
	/**
	* Create a new PTY (pseudo-terminal).
	*
	* @param opts options for creating the PTY.
	*
	* @returns handle to interact with the PTY.
	*/
	async create(opts) {
		var _this = this;
		var _opts$requestTimeoutM, _opts$envs, _envs$TERM, _envs$LANG, _envs$LC_ALL, _opts$timeoutMs;
		const requestTimeoutMs = (_opts$requestTimeoutM = opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs) !== null && _opts$requestTimeoutM !== void 0 ? _opts$requestTimeoutM : _this.connectionConfig.requestTimeoutMs;
		const envs = _objectSpread2({}, (_opts$envs = opts === null || opts === void 0 ? void 0 : opts.envs) !== null && _opts$envs !== void 0 ? _opts$envs : {});
		envs.TERM = (_envs$TERM = envs.TERM) !== null && _envs$TERM !== void 0 ? _envs$TERM : "xterm-256color";
		envs.LANG = (_envs$LANG = envs.LANG) !== null && _envs$LANG !== void 0 ? _envs$LANG : "C.UTF-8";
		envs.LC_ALL = (_envs$LC_ALL = envs.LC_ALL) !== null && _envs$LC_ALL !== void 0 ? _envs$LC_ALL : "C.UTF-8";
		const { controller, clearStartTimeout, cleanup } = setupRequestController(requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal);
		const events = _this.rpc.start({
			process: {
				cmd: "/bin/bash",
				args: ["-i", "-l"],
				envs,
				cwd: opts === null || opts === void 0 ? void 0 : opts.cwd
			},
			pty: { size: {
				cols: opts.cols,
				rows: opts.rows
			} }
		}, {
			headers: _objectSpread2(_objectSpread2({}, authenticationHeader(_this.envdVersion, opts === null || opts === void 0 ? void 0 : opts.user)), {}, { [KEEPALIVE_PING_HEADER]: 50 .toString() }),
			signal: controller.signal,
			timeoutMs: (_opts$timeoutMs = opts === null || opts === void 0 ? void 0 : opts.timeoutMs) !== null && _opts$timeoutMs !== void 0 ? _opts$timeoutMs : _this.defaultPtyConnectionTimeout
		});
		try {
			const pid = await handleProcessStartEvent(events);
			clearStartTimeout();
			return new CommandHandle(pid, cleanup, () => _this.kill(pid), events, void 0, void 0, opts.onData, void 0, void 0, _this.checkHealth);
		} catch (err) {
			cleanup();
			throw await handleRpcErrorWithHealthCheck(err, _this.checkHealth);
		}
	}
	/**
	* Connect to a running PTY.
	*
	* @param pid process ID of the PTY to connect to. You can get the list of running PTYs using {@link Commands.list}.
	* @param opts connection options.
	*
	* @returns handle to interact with the PTY.
	*/
	async connect(pid, opts) {
		var _this2 = this;
		var _opts$requestTimeoutM2, _opts$timeoutMs2;
		const { controller, clearStartTimeout, cleanup } = setupRequestController((_opts$requestTimeoutM2 = opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs) !== null && _opts$requestTimeoutM2 !== void 0 ? _opts$requestTimeoutM2 : _this2.connectionConfig.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal);
		const events = _this2.rpc.connect({ process: { selector: {
			case: "pid",
			value: pid
		} } }, {
			signal: controller.signal,
			headers: { [KEEPALIVE_PING_HEADER]: 50 .toString() },
			timeoutMs: (_opts$timeoutMs2 = opts === null || opts === void 0 ? void 0 : opts.timeoutMs) !== null && _opts$timeoutMs2 !== void 0 ? _opts$timeoutMs2 : _this2.defaultPtyConnectionTimeout
		});
		try {
			const pid = await handleProcessStartEvent(events);
			clearStartTimeout();
			return new CommandHandle(pid, cleanup, () => _this2.kill(pid), events, void 0, void 0, opts === null || opts === void 0 ? void 0 : opts.onData, void 0, void 0, _this2.checkHealth);
		} catch (err) {
			cleanup();
			throw await handleRpcErrorWithHealthCheck(err, _this2.checkHealth);
		}
	}
	/**
	* Send input to a PTY.
	*
	* @param pid process ID of the PTY.
	* @param data input data to send to the PTY.
	* @param opts connection options.
	*/
	async sendInput(pid, data, opts) {
		var _this3 = this;
		try {
			await _this3.rpc.sendInput({
				input: { input: {
					case: "pty",
					value: data
				} },
				process: { selector: {
					case: "pid",
					value: pid
				} }
			}, { signal: _this3.connectionConfig.getSignal(opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal) });
		} catch (err) {
			throw await handleRpcErrorWithHealthCheck(err, _this3.checkHealth);
		}
	}
	/**
	* Resize PTY.
	* Call this when the terminal window is resized and the number of columns and rows has changed.
	*
	* @param pid process ID of the PTY.
	* @param size new size of the PTY.
	* @param opts connection options.
	*/
	async resize(pid, size, opts) {
		var _this4 = this;
		try {
			await _this4.rpc.update({
				process: { selector: {
					case: "pid",
					value: pid
				} },
				pty: { size }
			}, { signal: _this4.connectionConfig.getSignal(opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal) });
		} catch (err) {
			throw await handleRpcErrorWithHealthCheck(err, _this4.checkHealth);
		}
	}
	/**
	* Kill a running PTY specified by process ID.
	* It uses `SIGKILL` signal to kill the PTY.
	*
	* @param pid process ID of the PTY.
	* @param opts connection options.
	*
	* @returns `true` if the PTY was killed, `false` if the PTY was not found.
	*/
	async kill(pid, opts) {
		var _this5 = this;
		try {
			await _this5.rpc.sendSignal({
				process: { selector: {
					case: "pid",
					value: pid
				} },
				signal: 9
			}, { signal: _this5.connectionConfig.getSignal(opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal) });
			return true;
		} catch (err) {
			if (err instanceof ConnectError) {
				if (err.code === Code.NotFound) return false;
			}
			throw await handleRpcErrorWithHealthCheck(err, _this5.checkHealth);
		}
	}
};
/**
* Module for starting and interacting with commands in the sandbox.
*/
var Commands = class {
	constructor(transport, envdApi, connectionConfig) {
		this.envdApi = envdApi;
		this.connectionConfig = connectionConfig;
		_defineProperty(this, "rpc", void 0);
		_defineProperty(this, "defaultProcessConnectionTimeout", 6e4);
		_defineProperty(this, "envdVersion", void 0);
		_defineProperty(this, "checkHealth", void 0);
		this.rpc = createClient$1(Process, transport);
		this.envdVersion = envdApi.version;
		this.checkHealth = () => checkSandboxHealth(this.envdApi);
	}
	/**
	* @hidden
	* @internal
	*/
	get supportsStdinClose() {
		return compareVersions(this.envdVersion, ENVD_ENVD_CLOSE) >= 0;
	}
	/**
	* List all running commands and PTY sessions.
	*
	* @param opts connection options.
	*
	* @returns list of running commands and PTY sessions.
	*/
	async list(opts) {
		var _this = this;
		try {
			return (await _this.rpc.list({}, { signal: _this.connectionConfig.getSignal(opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal) })).processes.map((p) => _objectSpread2(_objectSpread2({ pid: p.pid }, p.tag && { tag: p.tag }), {}, {
				args: p.config.args,
				envs: p.config.envs,
				cmd: p.config.cmd
			}, p.config.cwd && { cwd: p.config.cwd }));
		} catch (err) {
			throw await handleRpcErrorWithHealthCheck(err, _this.checkHealth);
		}
	}
	/**
	* Send data to command stdin.
	*
	* @param pid process ID of the command. You can get the list of running commands using {@link Commands.list}.
	* @param data data to send to the command.
	* @param opts connection options.
	*/
	async sendStdin(pid, data, opts) {
		var _this2 = this;
		try {
			const payload = typeof data === "string" ? new TextEncoder().encode(data) : data;
			await _this2.rpc.sendInput({
				process: { selector: {
					case: "pid",
					value: pid
				} },
				input: { input: {
					case: "stdin",
					value: payload
				} }
			}, { signal: _this2.connectionConfig.getSignal(opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal) });
		} catch (err) {
			throw await handleRpcErrorWithHealthCheck(err, _this2.checkHealth);
		}
	}
	/**
	* Close command stdin.
	*
	* This signals EOF to the command. The command must have been started with `stdin: true`.
	*
	* @param pid process ID of the command. You can get the list of running commands using {@link Commands.list}.
	* @param opts connection options.
	*/
	async closeStdin(pid, opts) {
		var _this3 = this;
		if (!_this3.supportsStdinClose) throw new SandboxError(`Sandbox envd version ${_this3.envdVersion} doesn't support closeStdin. Please rebuild your template to pick up the latest sandbox version.`);
		try {
			await _this3.rpc.closeStdin({ process: { selector: {
				case: "pid",
				value: pid
			} } }, { signal: _this3.connectionConfig.getSignal(opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal) });
		} catch (err) {
			throw await handleRpcErrorWithHealthCheck(err, _this3.checkHealth);
		}
	}
	/**
	* Kill a running command specified by its process ID.
	* It uses `SIGKILL` signal to kill the command.
	*
	* @param pid process ID of the command. You can get the list of running commands using {@link Commands.list}.
	* @param opts connection options.
	*
	* @returns `true` if the command was killed, `false` if the command was not found.
	*/
	async kill(pid, opts) {
		var _this4 = this;
		try {
			await _this4.rpc.sendSignal({
				process: { selector: {
					case: "pid",
					value: pid
				} },
				signal: 9
			}, { signal: _this4.connectionConfig.getSignal(opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal) });
			return true;
		} catch (err) {
			if (err instanceof ConnectError) {
				if (err.code === Code.NotFound) return false;
			}
			throw await handleRpcErrorWithHealthCheck(err, _this4.checkHealth);
		}
	}
	/**
	* Connect to a running command.
	* You can use {@link CommandHandle.wait} to wait for the command to finish and get execution results.
	*
	* @param pid process ID of the command to connect to. You can get the list of running commands using {@link Commands.list}.
	* @param opts connection options.
	*
	* @returns `CommandHandle` handle to interact with the running command.
	*/
	async connect(pid, opts) {
		var _this5 = this;
		var _opts$requestTimeoutM, _opts$timeoutMs;
		const { controller, clearStartTimeout, cleanup } = setupRequestController((_opts$requestTimeoutM = opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs) !== null && _opts$requestTimeoutM !== void 0 ? _opts$requestTimeoutM : _this5.connectionConfig.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal);
		const events = _this5.rpc.connect({ process: { selector: {
			case: "pid",
			value: pid
		} } }, {
			signal: controller.signal,
			headers: { [KEEPALIVE_PING_HEADER]: 50 .toString() },
			timeoutMs: (_opts$timeoutMs = opts === null || opts === void 0 ? void 0 : opts.timeoutMs) !== null && _opts$timeoutMs !== void 0 ? _opts$timeoutMs : _this5.defaultProcessConnectionTimeout
		});
		try {
			const pid = await handleProcessStartEvent(events);
			clearStartTimeout();
			return new CommandHandle(pid, cleanup, () => _this5.kill(pid), events, opts === null || opts === void 0 ? void 0 : opts.onStdout, opts === null || opts === void 0 ? void 0 : opts.onStderr, void 0, (data, stdinOpts) => _this5.sendStdin(pid, data, stdinOpts), (stdinOpts) => _this5.closeStdin(pid, stdinOpts), _this5.checkHealth);
		} catch (err) {
			cleanup();
			throw await handleRpcErrorWithHealthCheck(err, _this5.checkHealth);
		}
	}
	async run(cmd, opts) {
		const proc = await this.start(cmd, opts);
		return (opts === null || opts === void 0 ? void 0 : opts.background) ? proc : proc.wait();
	}
	async start(cmd, opts) {
		var _this7 = this;
		var _opts$requestTimeoutM2, _opts$timeoutMs2;
		if ((opts === null || opts === void 0 ? void 0 : opts.stdin) === false && compareVersions(_this7.envdVersion, "0.3.0") < 0) throw new SandboxError(`Sandbox envd version ${_this7.envdVersion} can't specify stdin, it's always turned on. Please rebuild your template if you need this feature.`);
		const { controller, clearStartTimeout, cleanup } = setupRequestController((_opts$requestTimeoutM2 = opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs) !== null && _opts$requestTimeoutM2 !== void 0 ? _opts$requestTimeoutM2 : _this7.connectionConfig.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal);
		const events = _this7.rpc.start({
			process: {
				cmd: "/bin/bash",
				cwd: opts === null || opts === void 0 ? void 0 : opts.cwd,
				envs: opts === null || opts === void 0 ? void 0 : opts.envs,
				args: [
					"-l",
					"-c",
					cmd
				]
			},
			stdin: (opts === null || opts === void 0 ? void 0 : opts.stdin) || false
		}, {
			headers: _objectSpread2(_objectSpread2({}, authenticationHeader(_this7.envdVersion, opts === null || opts === void 0 ? void 0 : opts.user)), {}, { [KEEPALIVE_PING_HEADER]: 50 .toString() }),
			signal: controller.signal,
			timeoutMs: (_opts$timeoutMs2 = opts === null || opts === void 0 ? void 0 : opts.timeoutMs) !== null && _opts$timeoutMs2 !== void 0 ? _opts$timeoutMs2 : _this7.defaultProcessConnectionTimeout
		});
		try {
			const pid = await handleProcessStartEvent(events);
			clearStartTimeout();
			return new CommandHandle(pid, cleanup, () => _this7.kill(pid), events, opts === null || opts === void 0 ? void 0 : opts.onStdout, opts === null || opts === void 0 ? void 0 : opts.onStderr, void 0, (data, stdinOpts) => _this7.sendStdin(pid, data, stdinOpts), (stdinOpts) => _this7.closeStdin(pid, stdinOpts), _this7.checkHealth);
		} catch (err) {
			cleanup();
			throw await handleRpcErrorWithHealthCheck(err, _this7.checkHealth);
		}
	}
};
/**
* Characters a workload token name cannot carry.
*
* The egress proxy reads a placeholder as everything between
* `'${e2b.identity.tokens.'` and the next `}`, then looks that name up in the
* registered tokens. A brace in the name breaks that in both directions: `}`
* ends the placeholder early, so `'a}b'` resolves the unrelated token `'a'` and
* leaves `'b}'` as literal text, and `{` lets a name close its own placeholder
* and open another one, minting a token the caller never referenced. Control
* characters are rejected separately because they cannot appear in an HTTP
* header value at all — the API would answer with an opaque 400.
*/
var INVALID_IAM_TOKEN_NAME_CHARS = /* @__PURE__ */ new RegExp("[{}\\p{Cc}]", "u");
/**
* Properties the language and the runtime read off any object they serialize,
* await, or coerce to a string. A token is never named after them, so reading
* one cannot throw — otherwise `JSON.stringify(iam.tokens)` inside a callback
* would.
*/
var RUNTIME_PROBED_PROPS = /* @__PURE__ */ new Set([
	"toJSON",
	"then",
	"toString",
	"valueOf"
]);
/**
* Stand-in for a runtime-probed name that is not a registered token: it answers
* the probe, and `resolve` decides what using it as a token does — a probe never
* coerces or serializes what it reads, a token reference does one or the other.
*/
function runtimeProbeValue(prop, tokens, resolve) {
	const value = prop === "toString" ? () => Object.prototype.toString.call(tokens()) : prop === "valueOf" ? () => tokens() : {};
	Object.defineProperty(value, Symbol.toPrimitive, { value: resolve });
	return Object.defineProperty(value, "toJSON", {
		value: resolve,
		enumerable: true
	});
}
/**
* Reject a token name that cannot survive the placeholder grammar.
*
* @param name workload token name.
*
* @throws {@link InvalidArgumentError} if the name is empty or carries a brace
* or control character.
*/
function validateIamTokenName(name) {
	if (name.length === 0 || INVALID_IAM_TOKEN_NAME_CHARS.test(name)) throw new InvalidArgumentError(`iam token name ${JSON.stringify(name)} is not usable: a token name cannot be empty or contain '{', '}' or control characters, because it is interpolated into the '\${e2b.identity.tokens.<name>}' placeholder the egress proxy resolves.`);
}
/**
* The placeholder the egress proxy replaces with a freshly minted token. The
* spelling is fixed by the backend: a placeholder can only select a persisted
* named token, never an inline audience or claim.
*/
function iamTokenPlaceholder(name) {
	validateIamTokenName(name);
	return `\${e2b.identity.tokens.${name}}`;
}
/**
* Token name to placeholder map, as exposed to a network `transform` callback.
*
* `tokenNames` are the workload tokens the request registers. Referencing any
* other name throws: the proxy never turns an unregistered name into a token, so
* a typo would surface as a confusing auth failure at the destination instead of
* an error here.
*
* `validate: false` is for the update-network endpoint, whose payload carries no
* `iam` config — the sandbox's registered token names are not known client-side
* there, so any name resolves to its placeholder.
*/
function iamTokenPlaceholders(tokenNames, { validate }) {
	const tokens = {};
	for (const name of tokenNames) tokens[name] = iamTokenPlaceholder(name);
	/** Placeholder when names cannot be checked, otherwise the guard's error. */
	const resolveUnregistered = (prop) => {
		if (!validate) return iamTokenPlaceholder(prop);
		throw new InvalidArgumentError(`Network transform references iam token '${prop}', which is not registered. ${tokenNames.length === 0 ? `Pass it to Sandbox.create as iam: { tokens: { '${prop}': Secret.iamToken({ audience, tokenType }) } }.` : `Registered tokens: ${tokenNames.map((name) => `'${name}'`).join(", ")}.`}`);
	};
	const proxy = new Proxy(tokens, {
		get(target, prop, receiver) {
			if (typeof prop === "string" && !Object.hasOwn(target, prop)) {
				if (RUNTIME_PROBED_PROPS.has(prop)) return runtimeProbeValue(prop, () => proxy, () => resolveUnregistered(prop));
				return resolveUnregistered(prop);
			}
			return Reflect.get(target, prop, receiver);
		},
		has(target, prop) {
			return Object.hasOwn(target, prop);
		}
	});
	return proxy;
}
function resolveNetworkSelector(selector, rules) {
	if (selector === void 0) return;
	if (typeof selector === "function") return selector({
		allTraffic: ALL_TRAFFIC,
		rules
	});
	return selector;
}
/**
* Build the context handed to `transform` callbacks. See
* {@link iamTokenPlaceholders} for what `validate` controls.
*/
function buildTransformContext(tokenNames, { validate }) {
	return { iam: { tokens: iamTokenPlaceholders(tokenNames, { validate }) } };
}
function isPlainObject(value) {
	if (typeof value !== "object" || value === null) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}
/** Name the shape a `transform` callback returned, for the error message. */
function describeValue(value) {
	var _value$constructor$na, _value$constructor;
	if (value === null) return "null";
	if (typeof value !== "object") return typeof value;
	return Array.isArray(value) ? "array" : (_value$constructor$na = (_value$constructor = value.constructor) === null || _value$constructor === void 0 ? void 0 : _value$constructor.name) !== null && _value$constructor$na !== void 0 ? _value$constructor$na : "object";
}
function resolveRulesForBody(rules, ctx) {
	const out = {};
	for (const [host, hostRules] of rules) out[host] = hostRules.map((rule) => {
		if (rule.transform == null) return {};
		if (typeof rule.transform !== "function") return { transform: rule.transform };
		const transform = rule.transform(ctx);
		if (typeof (transform === null || transform === void 0 ? void 0 : transform.then) === "function") {
			Promise.resolve(transform).catch(() => {});
			throw new InvalidArgumentError(`Network transform callback for '${host}' must be synchronous, it returned a promise. Resolve the value before creating the sandbox.`);
		}
		if (!isPlainObject(transform)) throw new InvalidArgumentError(`Network transform callback for '${host}' must return a transform object, got ${describeValue(transform)}.`);
		return { transform };
	});
	return out;
}
/**
* Rebuild the proxy config from the known fields so stray properties on the
* caller's object never reach the wire and a later mutation of it cannot alter
* the in-flight request. Address reachability is the server's — it is the only
* side that can tell whether the address resolves, and to where. The required
* `address` is checked here so an untyped caller that omits it is told which
* option is wrong instead of getting an API error about a body it never wrote.
*/
function buildEgressProxyBody(egressProxy) {
	if (!isPlainObject(egressProxy) || typeof egressProxy.address !== "string") throw new InvalidArgumentError(`network egressProxy must be an object with a string 'address' (e.g. 'proxy.example.com:1080').`);
	return _objectSpread2(_objectSpread2({ address: egressProxy.address }, egressProxy.username != null ? { username: egressProxy.username } : {}), egressProxy.password != null ? { password: egressProxy.password } : {});
}
function buildNetworkEgress(network, transformContext) {
	var _network$rules;
	const rules = network.rules instanceof Map ? network.rules : new Map(Object.entries((_network$rules = network.rules) !== null && _network$rules !== void 0 ? _network$rules : {}));
	const allowOut = resolveNetworkSelector(network.allowOut, rules);
	const denyOut = resolveNetworkSelector(network.denyOut, rules);
	return _objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2({}, allowOut !== void 0 ? { allowOut } : {}), denyOut !== void 0 ? { denyOut } : {}), network.egressProxy != null ? { egressProxy: buildEgressProxyBody(network.egressProxy) } : {}), network.rules !== void 0 ? { rules: resolveRulesForBody(rules, transformContext) } : {});
}
/**
* Map the wire proxy config into the SDK-owned shape: `password` is dropped
* because the API never returns it, and the wire's `null` for "no proxy" is
* normalized so the union never reaches a consumer.
*/
function fromApiEgressProxy(egressProxy) {
	if (!egressProxy) return;
	return _objectSpread2({ address: egressProxy.address }, egressProxy.username !== void 0 ? { username: egressProxy.username } : {});
}
function buildNetworkBody(network, iam) {
	var _iam$tokens;
	if (!network) return;
	return _objectSpread2(_objectSpread2(_objectSpread2({}, buildNetworkEgress(network, buildTransformContext(Object.keys((_iam$tokens = iam === null || iam === void 0 ? void 0 : iam.tokens) !== null && _iam$tokens !== void 0 ? _iam$tokens : {}), { validate: true }))), network.allowPublicTraffic !== void 0 ? { allowPublicTraffic: network.allowPublicTraffic } : {}), network.maskRequestHost !== void 0 ? { maskRequestHost: network.maskRequestHost } : {});
}
function buildIamBody(iam) {
	var _iam$tokens2;
	const tokens = {};
	for (const [name, token] of Object.entries((_iam$tokens2 = iam === null || iam === void 0 ? void 0 : iam.tokens) !== null && _iam$tokens2 !== void 0 ? _iam$tokens2 : {})) {
		if (!token) continue;
		if (typeof token.audience !== "string" || typeof token.tokenType !== "string") throw new InvalidArgumentError(`iam token '${name}' must have string 'audience' and 'tokenType' properties.`);
		validateIamTokenName(name);
		tokens[name] = {
			audience: token.audience,
			tokenType: token.tokenType
		};
	}
	if (Object.keys(tokens).length === 0) return;
	return { tokens };
}
function buildNetworkUpdateBody(network) {
	return _objectSpread2(_objectSpread2({}, buildNetworkEgress(network, buildTransformContext([], { validate: false }))), network.allowInternetAccess !== void 0 ? { allow_internet_access: network.allowInternetAccess } : {});
}
var SandboxApi = class extends ClientFactory {
	constructor() {
		super();
	}
	/**
	* Kill the sandbox specified by sandbox ID.
	*
	* @param sandboxId sandbox ID.
	* @param opts connection options.
	*
	* @returns `true` if the sandbox was found and killed, `false` otherwise.
	*/
	static async kill(sandboxId, opts) {
		var _this = this;
		var _res$error;
		const apiOpts = _this.resolveOpts(opts);
		const config = new ConnectionConfig(apiOpts);
		if (config.debug) return true;
		const res = await new ApiClient(config).api.DELETE("/sandboxes/{sandboxID}", {
			params: { path: { sandboxID: sandboxId } },
			signal: config.getSignal(apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.requestTimeoutMs, apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.signal)
		});
		if (((_res$error = res.error) === null || _res$error === void 0 ? void 0 : _res$error.code) === 404) return false;
		const err = handleApiError(res);
		if (err) throw err;
		return true;
	}
	/**
	* Get sandbox information like sandbox ID, template, metadata, started at/end at date.
	*
	* @param sandboxId sandbox ID.
	* @param opts connection options.
	*
	* @returns sandbox information.
	*/
	static async getInfo(sandboxId, opts) {
		var _this2 = this;
		var _res$error2, _res$data$metadata, _res$data$allowIntern, _res$data$network$rul, _res$data$volumeMount;
		const apiOpts = _this2.resolveOpts(opts);
		const config = new ConnectionConfig(apiOpts);
		const res = await new ApiClient(config).api.GET("/sandboxes/{sandboxID}", {
			params: { path: { sandboxID: sandboxId } },
			signal: config.getSignal(apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.requestTimeoutMs, apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.signal)
		});
		if (((_res$error2 = res.error) === null || _res$error2 === void 0 ? void 0 : _res$error2.code) === 404) throw new SandboxNotFoundError(`Sandbox ${sandboxId} not found`);
		const err = handleApiError(res);
		if (err) throw err;
		if (!res.data) throw new Error("Sandbox not found");
		return _objectSpread2(_objectSpread2({
			sandboxId: res.data.sandboxID,
			templateId: res.data.templateID
		}, res.data.alias && { name: res.data.alias }), {}, {
			metadata: (_res$data$metadata = res.data.metadata) !== null && _res$data$metadata !== void 0 ? _res$data$metadata : {},
			allowInternetAccess: (_res$data$allowIntern = res.data.allowInternetAccess) !== null && _res$data$allowIntern !== void 0 ? _res$data$allowIntern : void 0,
			envdVersion: res.data.envdVersion,
			startedAt: new Date(res.data.startedAt),
			endAt: new Date(res.data.endAt),
			state: res.data.state,
			cpuCount: res.data.cpuCount,
			memoryMB: res.data.memoryMB,
			network: res.data.network ? {
				allowOut: res.data.network.allowOut,
				denyOut: res.data.network.denyOut,
				rules: (_res$data$network$rul = res.data.network.rules) !== null && _res$data$network$rul !== void 0 ? _res$data$network$rul : void 0,
				egressProxy: fromApiEgressProxy(res.data.network.egressProxy),
				allowPublicTraffic: res.data.network.allowPublicTraffic,
				maskRequestHost: res.data.network.maskRequestHost
			} : void 0,
			lifecycle: res.data.lifecycle ? {
				onTimeout: res.data.lifecycle.onTimeout,
				autoResume: res.data.lifecycle.autoResume
			} : void 0,
			sandboxDomain: res.data.domain || void 0,
			volumeMounts: (_res$data$volumeMount = res.data.volumeMounts) !== null && _res$data$volumeMount !== void 0 ? _res$data$volumeMount : []
		});
	}
	/**
	* @deprecated Use {@link Sandbox.getInfo} instead.
	*
	* @param sandboxId sandbox ID.
	* @param opts connection options.
	*
	* @returns sandbox information.
	*/
	static async getFullInfo(sandboxId, opts) {
		return await this.getInfo(sandboxId, opts);
	}
	/**
	* Get the metrics of the sandbox.
	*
	* @param sandboxId sandbox ID.
	* @param opts sandbox metrics options.
	*
	* @returns  List of sandbox metrics containing CPU, memory and disk usage information.
	*/
	static async getMetrics(sandboxId, opts) {
		var _this4 = this;
		var _res$error3, _res$data$map, _res$data;
		const apiOpts = _this4.resolveOpts(opts);
		const config = new ConnectionConfig(apiOpts);
		if (config.debug) return [];
		const client = new ApiClient(config);
		const start = (apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.start) ? Math.round(apiOpts.start.getTime() / 1e3) : void 0;
		const end = (apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.end) ? Math.round(apiOpts.end.getTime() / 1e3) : void 0;
		const res = await client.api.GET("/sandboxes/{sandboxID}/metrics", {
			params: {
				path: { sandboxID: sandboxId },
				query: {
					start,
					end
				}
			},
			signal: config.getSignal(apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.requestTimeoutMs, apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.signal)
		});
		if (((_res$error3 = res.error) === null || _res$error3 === void 0 ? void 0 : _res$error3.code) === 404) throw new SandboxNotFoundError(`Sandbox ${sandboxId} not found`);
		const err = handleApiError(res);
		if (err) throw err;
		return (_res$data$map = (_res$data = res.data) === null || _res$data === void 0 ? void 0 : _res$data.map((metric) => ({
			timestamp: new Date(metric.timestamp),
			cpuUsedPct: metric.cpuUsedPct,
			cpuCount: metric.cpuCount,
			memUsed: metric.memUsed,
			memTotal: metric.memTotal,
			memCache: metric.memCache,
			diskUsed: metric.diskUsed,
			diskTotal: metric.diskTotal
		}))) !== null && _res$data$map !== void 0 ? _res$data$map : [];
	}
	/**
	* Set the timeout of the specified sandbox.
	* After the timeout expires the sandbox will be automatically killed.
	*
	* This method can extend or reduce the sandbox timeout set when creating the sandbox or from the last call to {@link Sandbox.setTimeout}.
	*
	* Maximum time a sandbox can be kept alive is 24 hours (86_400_000 milliseconds) for Pro users and 1 hour (3_600_000 milliseconds) for Hobby users.
	*
	* @param sandboxId sandbox ID.
	* @param timeoutMs timeout in **milliseconds**.
	* @param opts connection options.
	*/
	static async setTimeout(sandboxId, timeoutMs, opts) {
		var _this5 = this;
		var _res$error4;
		const apiOpts = _this5.resolveOpts(opts);
		const config = new ConnectionConfig(apiOpts);
		const res = await new ApiClient(config).api.POST("/sandboxes/{sandboxID}/timeout", {
			params: { path: { sandboxID: sandboxId } },
			body: { timeout: timeoutToSeconds(timeoutMs) },
			signal: config.getSignal(apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.requestTimeoutMs, apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.signal)
		});
		if (((_res$error4 = res.error) === null || _res$error4 === void 0 ? void 0 : _res$error4.code) === 404) throw new SandboxNotFoundError(`Sandbox ${sandboxId} not found`);
		const err = handleApiError(res);
		if (err) throw err;
	}
	/**
	* Update the network configuration of a running sandbox.
	*
	* Replaces the current egress configuration atomically — fields that are
	* omitted are cleared on the server.
	*
	* @param sandboxId sandbox ID.
	* @param network new network configuration.
	* @param opts connection options.
	*/
	static async updateNetwork(sandboxId, network, opts) {
		var _this6 = this;
		var _res$error5;
		const apiOpts = _this6.resolveOpts(opts);
		const config = new ConnectionConfig(apiOpts);
		const res = await new ApiClient(config).api.PUT("/sandboxes/{sandboxID}/network", {
			params: { path: { sandboxID: sandboxId } },
			body: buildNetworkUpdateBody(network),
			signal: config.getSignal(apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.requestTimeoutMs, apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.signal)
		});
		if (((_res$error5 = res.error) === null || _res$error5 === void 0 ? void 0 : _res$error5.code) === 404) throw new SandboxNotFoundError(`Sandbox ${sandboxId} not found`);
		const err = handleApiError(res);
		if (err) throw err;
	}
	/**
	* Pause the sandbox specified by sandbox ID.
	*
	* @param sandboxId sandbox ID.
	* @param opts pause options, including `keepMemory` and connection options.
	*
	* @returns `true` if the sandbox got paused, `false` if the sandbox was already paused.
	*/
	static async pause(sandboxId, opts) {
		var _this7 = this;
		var _apiOpts$keepMemory, _res$error6, _res$error7;
		const apiOpts = _this7.resolveOpts(opts);
		const config = new ConnectionConfig(apiOpts);
		const res = await new ApiClient(config).api.POST("/sandboxes/{sandboxID}/pause", {
			params: { path: { sandboxID: sandboxId } },
			body: { memory: (_apiOpts$keepMemory = apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.keepMemory) !== null && _apiOpts$keepMemory !== void 0 ? _apiOpts$keepMemory : true },
			signal: config.getSignal(apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.requestTimeoutMs, apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.signal)
		});
		if (((_res$error6 = res.error) === null || _res$error6 === void 0 ? void 0 : _res$error6.code) === 404) throw new SandboxNotFoundError(`Sandbox ${sandboxId} not found`);
		if (((_res$error7 = res.error) === null || _res$error7 === void 0 ? void 0 : _res$error7.code) === 409) return false;
		const err = handleApiError(res);
		if (err) throw err;
		return true;
	}
	/**
	* @deprecated Use {@link SandboxApi.pause} instead.
	*/
	static async betaPause(sandboxId, opts) {
		return this.pause(sandboxId, opts);
	}
	/**
	* Create a snapshot from a sandbox.
	*
	* The sandbox will be paused while the snapshot is being created.
	* The snapshot can be used to create new sandboxes with the same state.
	* The snapshot is a persistent image that survives sandbox deletion.
	*
	* @param sandboxId sandbox ID to create snapshot from.
	* @param opts snapshot creation options including optional name and connection options.
	*
	* @returns snapshot information including the snapshot name that can be used with Sandbox.create().
	*/
	static async createSnapshot(sandboxId, opts) {
		var _this9 = this;
		var _res$error8, _names;
		const apiOpts = _this9.resolveOpts(opts);
		const config = new ConnectionConfig(apiOpts);
		const res = await new ApiClient(config).api.POST("/sandboxes/{sandboxID}/snapshots", {
			params: { path: { sandboxID: sandboxId } },
			body: (apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.name) ? { name: apiOpts.name } : {},
			signal: config.getSignal(apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.requestTimeoutMs, apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.signal)
		});
		if (((_res$error8 = res.error) === null || _res$error8 === void 0 ? void 0 : _res$error8.code) === 404) throw new SandboxNotFoundError(`Sandbox ${sandboxId} not found`);
		const err = handleApiError(res);
		if (err) throw err;
		return {
			snapshotId: res.data.snapshotID,
			names: (_names = res.data.names) !== null && _names !== void 0 ? _names : []
		};
	}
	/**
	* List all snapshots.
	*
	* @param opts list options including filters and pagination.
	*
	* @returns paginator for listing snapshots.
	*/
	static listSnapshots(opts) {
		return new SnapshotPaginator(this.resolveOpts(opts));
	}
	/**
	* Delete a snapshot.
	*
	* @param snapshotId snapshot ID.
	* @param opts connection options.
	*
	* @returns `true` if the snapshot was deleted, `false` if it was not found.
	*/
	static async deleteSnapshot(snapshotId, opts) {
		var _this10 = this;
		var _res$error9;
		const apiOpts = _this10.resolveOpts(opts);
		const config = new ConnectionConfig(apiOpts);
		const res = await new ApiClient(config).api.DELETE("/templates/{templateID}", {
			params: { path: { templateID: snapshotId } },
			signal: config.getSignal(apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.requestTimeoutMs, apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.signal)
		});
		if (((_res$error9 = res.error) === null || _res$error9 === void 0 ? void 0 : _res$error9.code) === 404) return false;
		const err = handleApiError(res);
		if (err) throw err;
		return true;
	}
	static async createSandbox(template, timeoutMs, opts) {
		var _this11 = this;
		var _opts$lifecycle, _onTimeout$keepMemory, _opts$lifecycle$autoR, _opts$lifecycle2, _opts$secure, _opts$allowInternetAc;
		const apiOpts = _this11.resolveOpts(opts);
		const config = new ConnectionConfig(apiOpts);
		const client = new ApiClient(config);
		const requestedOnTimeout = opts === null || opts === void 0 || (_opts$lifecycle = opts.lifecycle) === null || _opts$lifecycle === void 0 ? void 0 : _opts$lifecycle.onTimeout;
		const onTimeoutConfigured = requestedOnTimeout != null;
		const onTimeout = requestedOnTimeout !== null && requestedOnTimeout !== void 0 ? requestedOnTimeout : "kill";
		const action = typeof onTimeout === "string" ? onTimeout : onTimeout.action;
		const hasKeepMemory = typeof onTimeout !== "string" && "keepMemory" in onTimeout;
		const keepMemory = typeof onTimeout !== "string" && "keepMemory" in onTimeout ? (_onTimeout$keepMemory = onTimeout.keepMemory) !== null && _onTimeout$keepMemory !== void 0 ? _onTimeout$keepMemory : true : true;
		const autoResume = (_opts$lifecycle$autoR = opts === null || opts === void 0 || (_opts$lifecycle2 = opts.lifecycle) === null || _opts$lifecycle2 === void 0 ? void 0 : _opts$lifecycle2.autoResume) !== null && _opts$lifecycle$autoR !== void 0 ? _opts$lifecycle$autoR : void 0;
		if (hasKeepMemory && action !== "pause") throw new InvalidArgumentError("onTimeout.keepMemory is only allowed when action is 'pause'.");
		if (autoResume && action !== "pause") throw new InvalidArgumentError("autoResume can only be true when onTimeout action is 'pause'.");
		if (!keepMemory && autoResume) throw new InvalidArgumentError("autoResume: true is not a valid value when keepMemory: false - a filesystem-only snapshot cannot be auto-resumed by traffic and must be resumed explicitly using Sandbox.connect().");
		const iam = buildIamBody(opts === null || opts === void 0 ? void 0 : opts.iam);
		const body = {
			templateID: template,
			metadata: opts === null || opts === void 0 ? void 0 : opts.metadata,
			mcp: opts === null || opts === void 0 ? void 0 : opts.mcp,
			envVars: opts === null || opts === void 0 ? void 0 : opts.envs,
			timeout: timeoutToSeconds(timeoutMs),
			secure: (_opts$secure = opts === null || opts === void 0 ? void 0 : opts.secure) !== null && _opts$secure !== void 0 ? _opts$secure : true,
			allow_internet_access: (_opts$allowInternetAc = opts === null || opts === void 0 ? void 0 : opts.allowInternetAccess) !== null && _opts$allowInternetAc !== void 0 ? _opts$allowInternetAc : true,
			network: buildNetworkBody(opts === null || opts === void 0 ? void 0 : opts.network, iam),
			iam,
			autoPause: onTimeoutConfigured ? action === "pause" : void 0,
			autoPauseMemory: action === "pause" && hasKeepMemory ? keepMemory : void 0,
			autoResume: autoResume === void 0 ? void 0 : { enabled: autoResume }
		};
		if (opts === null || opts === void 0 ? void 0 : opts.volumeMounts) body.volumeMounts = Object.entries(opts.volumeMounts).map(([mountPath, vol]) => ({
			name: typeof vol === "string" ? vol : vol.name,
			path: mountPath
		}));
		const res = await client.api.POST("/sandboxes", {
			body,
			signal: config.getSignal(apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.requestTimeoutMs, apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.signal)
		});
		const err = handleApiError(res);
		if (err) throw err;
		if (compareVersions(res.data.envdVersion, "0.1.0") < 0) {
			await _this11.kill(res.data.sandboxID, apiOpts);
			throw new TemplateError("You need to update the template to use the new SDK.");
		}
		return {
			sandboxId: res.data.sandboxID,
			sandboxDomain: res.data.domain || void 0,
			envdVersion: res.data.envdVersion,
			envdAccessToken: res.data.envdAccessToken,
			trafficAccessToken: res.data.trafficAccessToken || void 0
		};
	}
	static async forkSandbox(sandboxId, timeoutMs, count, opts) {
		var _this12 = this;
		var _res$data2;
		if (count < 1) throw new InvalidArgumentError("count must be at least 1");
		const apiOpts = _this12.resolveOpts(opts);
		const config = new ConnectionConfig(apiOpts);
		const res = await new ApiClient(config).api.POST("/sandboxes/{sandboxID}/fork", {
			params: { path: { sandboxID: sandboxId } },
			body: {
				timeout: timeoutToSeconds(timeoutMs),
				count
			},
			signal: config.getSignal(apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.requestTimeoutMs, apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.signal)
		});
		if (res.response.status === 404) {
			var _res$error$message, _res$error10;
			throw new SandboxNotFoundError((_res$error$message = (_res$error10 = res.error) === null || _res$error10 === void 0 ? void 0 : _res$error10.message) !== null && _res$error$message !== void 0 ? _res$error$message : `Sandbox ${sandboxId} not found`);
		}
		const err = handleApiError(res);
		if (err) throw err;
		return ((_res$data2 = res.data) !== null && _res$data2 !== void 0 ? _res$data2 : []).map((result) => {
			if (result.error || !result.sandbox) {
				if (!result.error) return new SandboxError("Failed to start forked sandbox");
				if (result.error.code === 404) return new NotFoundError(`${result.error.code}: ${result.error.message}`);
				return apiErrorFromCode(result.error.code, result.error.message);
			}
			return {
				sandboxId: result.sandbox.sandboxID,
				sandboxDomain: result.sandbox.domain || void 0,
				envdVersion: result.sandbox.envdVersion,
				envdAccessToken: result.sandbox.envdAccessToken,
				trafficAccessToken: result.sandbox.trafficAccessToken || void 0
			};
		});
	}
	static async connectSandbox(sandboxId, opts) {
		var _this13 = this;
		var _apiOpts$timeoutMs, _res$error11;
		const apiOpts = _this13.resolveOpts(opts);
		const timeoutMs = (_apiOpts$timeoutMs = apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.timeoutMs) !== null && _apiOpts$timeoutMs !== void 0 ? _apiOpts$timeoutMs : DEFAULT_SANDBOX_TIMEOUT_MS;
		const config = new ConnectionConfig(apiOpts);
		const res = await new ApiClient(config).api.POST("/sandboxes/{sandboxID}/connect", {
			params: { path: { sandboxID: sandboxId } },
			body: { timeout: timeoutToSeconds(timeoutMs) },
			signal: config.getSignal(apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.requestTimeoutMs, apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.signal)
		});
		if (((_res$error11 = res.error) === null || _res$error11 === void 0 ? void 0 : _res$error11.code) === 404) throw new SandboxNotFoundError(`Paused sandbox ${sandboxId} not found`);
		const err = handleApiError(res);
		if (err) throw err;
		return {
			sandboxId: res.data.sandboxID,
			sandboxDomain: res.data.domain || void 0,
			envdVersion: res.data.envdVersion,
			envdAccessToken: res.data.envdAccessToken,
			trafficAccessToken: res.data.trafficAccessToken || void 0
		};
	}
};
/**
* Paginator for listing sandboxes.
*
* @example
* ```ts
* const paginator = Sandbox.list()
* while (paginator.hasNext) {
*   const sandboxes = await paginator.nextItems()
*   console.log(sandboxes)
* }
* ```
*/
var SandboxPaginator = class extends Paginator {
	constructor(opts) {
		super(opts, opts === null || opts === void 0 ? void 0 : opts.limit, opts === null || opts === void 0 ? void 0 : opts.nextToken);
		_defineProperty(this, "query", void 0);
		_defineProperty(this, "order", void 0);
		this.query = opts === null || opts === void 0 ? void 0 : opts.query;
		this.order = opts === null || opts === void 0 ? void 0 : opts.order;
	}
	async nextItems(opts) {
		var _this14 = this;
		var _this$query, _this$query2, _this$query3, _this$query4, _res$data3;
		if (!_this14.hasNext) throw new Error("No more items to fetch");
		let metadata = void 0;
		if ((_this$query = _this14.query) === null || _this$query === void 0 ? void 0 : _this$query.metadata) {
			const encodedPairs = Object.fromEntries(Object.entries(_this14.query.metadata).map(([key, value]) => [encodeURIComponent(key), encodeURIComponent(value)]));
			metadata = new URLSearchParams(encodedPairs).toString();
		}
		const apiOpts = ConnectionConfig.mergeOpts(_this14.opts, opts);
		const config = new ConnectionConfig(apiOpts);
		const res = await new ApiClient(config).api.GET("/v2/sandboxes", {
			params: { query: {
				metadata,
				state: (_this$query2 = _this14.query) === null || _this$query2 === void 0 ? void 0 : _this$query2.state,
				startedAfter: (_this$query3 = _this14.query) === null || _this$query3 === void 0 || (_this$query3 = _this$query3.startedAfter) === null || _this$query3 === void 0 ? void 0 : _this$query3.toISOString(),
				template: ((_this$query4 = _this14.query) === null || _this$query4 === void 0 ? void 0 : _this$query4.template) || void 0,
				order: _this14.order,
				limit: _this14.limit,
				nextToken: _this14.nextToken
			} },
			signal: config.getSignal(apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.requestTimeoutMs, apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.signal)
		});
		const err = handleApiError(res);
		if (err) throw err;
		_this14.updatePagination(res.response);
		return ((_res$data3 = res.data) !== null && _res$data3 !== void 0 ? _res$data3 : []).map((sandbox) => {
			var _sandbox$metadata, _sandbox$volumeMounts;
			return _objectSpread2(_objectSpread2({
				sandboxId: sandbox.sandboxID,
				templateId: sandbox.templateID
			}, sandbox.alias && { name: sandbox.alias }), {}, {
				metadata: (_sandbox$metadata = sandbox.metadata) !== null && _sandbox$metadata !== void 0 ? _sandbox$metadata : {},
				startedAt: new Date(sandbox.startedAt),
				endAt: new Date(sandbox.endAt),
				state: sandbox.state,
				cpuCount: sandbox.cpuCount,
				memoryMB: sandbox.memoryMB,
				envdVersion: sandbox.envdVersion,
				volumeMounts: (_sandbox$volumeMounts = sandbox.volumeMounts) !== null && _sandbox$volumeMounts !== void 0 ? _sandbox$volumeMounts : []
			});
		});
	}
};
/**
* Paginator for listing snapshots.
*
* @example
* ```ts
* const paginator = Sandbox.listSnapshots()
* while (paginator.hasNext) {
*   const snapshots = await paginator.nextItems()
*   console.log(snapshots)
* }
* ```
*/
var SnapshotPaginator = class extends Paginator {
	constructor(opts) {
		super(opts, opts === null || opts === void 0 ? void 0 : opts.limit, opts === null || opts === void 0 ? void 0 : opts.nextToken);
		_defineProperty(this, "sandboxId", void 0);
		_defineProperty(this, "name", void 0);
		this.sandboxId = opts === null || opts === void 0 ? void 0 : opts.sandboxId;
		this.name = opts === null || opts === void 0 ? void 0 : opts.name;
	}
	async nextItems(opts) {
		var _this15 = this;
		var _res$data4;
		if (!_this15.hasNext) throw new Error("No more items to fetch");
		const apiOpts = ConnectionConfig.mergeOpts(_this15.opts, opts);
		const config = new ConnectionConfig(apiOpts);
		const res = await new ApiClient(config).api.GET("/snapshots", {
			params: { query: {
				sandboxID: _this15.sandboxId,
				name: _this15.name,
				limit: _this15.limit,
				nextToken: _this15.nextToken
			} },
			signal: config.getSignal(apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.requestTimeoutMs, apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.signal)
		});
		const err = handleApiError(res);
		if (err) throw err;
		_this15.updatePagination(res.response);
		return ((_res$data4 = res.data) !== null && _res$data4 !== void 0 ? _res$data4 : []).map((snapshot) => {
			var _snapshot$names;
			return {
				snapshotId: snapshot.snapshotID,
				names: (_snapshot$names = snapshot.names) !== null && _snapshot$names !== void 0 ? _snapshot$names : []
			};
		});
	}
};
/**
* E2B cloud sandbox is a secure and isolated cloud environment.
*
* The sandbox allows you to:
* - Access Linux OS
* - Create, list, and delete files and directories
* - Run commands
* - Run isolated code
* - Access the internet
*
* Check docs [here](https://e2b.dev/docs).
*
* Use {@link Sandbox.create} to create a new sandbox.
*
* @example
* ```ts
* import { Sandbox } from 'e2b'
*
* const sandbox = await Sandbox.create()
* ```
*/
var Sandbox$1 = class extends SandboxApi {
	/**
	* Use {@link Sandbox.create} to create a new Sandbox instead.
	*
	* @hidden
	* @hide
	* @internal
	* @access protected
	*/
	constructor(opts) {
		var _opts$sandboxDomain, _this$connectionConfi3, _this$connectionConfi4;
		super();
		_defineProperty(this, "files", void 0);
		_defineProperty(this, "commands", void 0);
		_defineProperty(this, "pty", void 0);
		_defineProperty(this, "git", void 0);
		_defineProperty(this, "sandboxId", void 0);
		_defineProperty(this, "sandboxDomain", void 0);
		_defineProperty(this, "trafficAccessToken", void 0);
		_defineProperty(this, "envdPort", 49983);
		_defineProperty(this, "mcpPort", 50005);
		_defineProperty(this, "connectionConfig", void 0);
		_defineProperty(this, "envdAccessToken", void 0);
		_defineProperty(this, "envdApiUrl", void 0);
		_defineProperty(this, "envdDirectUrl", void 0);
		_defineProperty(this, "envdApi", void 0);
		_defineProperty(this, "mcpToken", void 0);
		this.connectionConfig = new ConnectionConfig(opts);
		this.sandboxId = opts.sandboxId;
		this.sandboxDomain = (_opts$sandboxDomain = opts.sandboxDomain) !== null && _opts$sandboxDomain !== void 0 ? _opts$sandboxDomain : this.connectionConfig.domain;
		this.envdAccessToken = opts.envdAccessToken;
		this.trafficAccessToken = opts.trafficAccessToken;
		this.envdApiUrl = this.connectionConfig.getSandboxUrl(this.sandboxId, {
			sandboxDomain: this.sandboxDomain,
			envdPort: this.envdPort
		});
		this.envdDirectUrl = this.connectionConfig.getSandboxDirectUrl(this.sandboxId, {
			sandboxDomain: this.sandboxDomain,
			envdPort: this.envdPort
		});
		const sandboxHeaders = {
			"E2b-Sandbox-Id": this.sandboxId,
			"E2b-Sandbox-Port": this.envdPort.toString()
		};
		const envdFetch = createEnvdFetch(this.connectionConfig.proxy);
		const envdRpcFetch = createEnvdRpcFetch(this.connectionConfig.proxy);
		const rpcTransport = createConnectTransport({
			baseUrl: this.envdApiUrl,
			useBinaryFormat: false,
			interceptors: (opts === null || opts === void 0 ? void 0 : opts.logger) ? [createRpcLogger(opts.logger)] : void 0,
			fetch: (url, options) => {
				var _this$connectionConfi, _this$connectionConfi2, _options;
				const headers = new Headers({ "User-Agent": (_this$connectionConfi = (_this$connectionConfi2 = this.connectionConfig.headers) === null || _this$connectionConfi2 === void 0 ? void 0 : _this$connectionConfi2["User-Agent"]) !== null && _this$connectionConfi !== void 0 ? _this$connectionConfi : "" });
				new Headers(options === null || options === void 0 ? void 0 : options.headers).forEach((value, key) => headers.append(key, value));
				new Headers(sandboxHeaders).forEach((value, key) => headers.append(key, value));
				if (this.envdAccessToken) headers.append("X-Access-Token", this.envdAccessToken);
				options = _objectSpread2(_objectSpread2({}, (_options = options) !== null && _options !== void 0 ? _options : {}), {}, {
					headers,
					redirect: "follow"
				});
				return envdRpcFetch(url, options);
			}
		});
		this.envdApi = new EnvdApiClient({
			apiUrl: this.envdApiUrl,
			logger: opts === null || opts === void 0 ? void 0 : opts.logger,
			envdAccessToken: this.envdAccessToken,
			headers: _objectSpread2({ "User-Agent": (_this$connectionConfi3 = (_this$connectionConfi4 = this.connectionConfig.headers) === null || _this$connectionConfi4 === void 0 ? void 0 : _this$connectionConfi4["User-Agent"]) !== null && _this$connectionConfi3 !== void 0 ? _this$connectionConfi3 : "" }, sandboxHeaders),
			fetch: (request) => envdFetch(request)
		}, { version: opts.envdVersion });
		this.files = new Filesystem(rpcTransport, this.envdApi, this.connectionConfig);
		this.commands = new Commands(rpcTransport, this.envdApi, this.connectionConfig);
		this.pty = new Pty(rpcTransport, this.envdApi, this.connectionConfig);
		this.git = new Git(this.commands);
	}
	/**
	* List sandboxes.
	*
	* By default (no `query.state` set in `opts`), returns sandboxes in both
	* `running` and `paused` states. To filter by state, pass
	* `opts.query.state = [...]`.
	*
	* @param opts connection options, plus optional `query` to filter by
	*   metadata / state / start time / template, `order` to sort by start
	*   time across the whole result set (not within a page), and `limit` /
	*   `nextToken` for pagination.
	*
	* @returns a {@link SandboxPaginator} that yields pages of sandboxes
	*   (running and paused by default). Iterate pages via
	*   `await paginator.nextItems()` while `paginator.hasNext` is `true`.
	*/
	static list(opts) {
		return new SandboxPaginator(this.resolveOpts(opts));
	}
	static async create(templateOrOpts, opts) {
		var _this = this;
		var _templateOrOpts$templ, _apiOpts$timeoutMs;
		const { template, sandboxOpts } = typeof templateOrOpts === "string" ? {
			template: templateOrOpts,
			sandboxOpts: opts
		} : {
			template: (_templateOrOpts$templ = templateOrOpts === null || templateOrOpts === void 0 ? void 0 : templateOrOpts.template) !== null && _templateOrOpts$templ !== void 0 ? _templateOrOpts$templ : (templateOrOpts === null || templateOrOpts === void 0 ? void 0 : templateOrOpts.mcp) ? _this.defaultMcpTemplate : _this.defaultTemplate,
			sandboxOpts: templateOrOpts
		};
		const apiOpts = _this.resolveOpts(sandboxOpts);
		const config = new ConnectionConfig(apiOpts);
		if (config.debug) return new _this(_objectSpread2({
			sandboxId: "debug_sandbox_id",
			envdVersion: ENVD_DEBUG_FALLBACK
		}, config));
		const sandbox = new _this(_objectSpread2(_objectSpread2({}, await _this.createSandbox(template, (_apiOpts$timeoutMs = apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.timeoutMs) !== null && _apiOpts$timeoutMs !== void 0 ? _apiOpts$timeoutMs : _this.defaultSandboxTimeoutMs, apiOpts)), config));
		if (sandboxOpts === null || sandboxOpts === void 0 ? void 0 : sandboxOpts.mcp) {
			sandbox.mcpToken = crypto.randomUUID();
			try {
				var _sandbox$mcpToken;
				await sandbox.commands.run(`mcp-gateway --config ${shellQuote(JSON.stringify(sandboxOpts.mcp))}`, {
					user: "root",
					envs: { GATEWAY_ACCESS_TOKEN: (_sandbox$mcpToken = sandbox.mcpToken) !== null && _sandbox$mcpToken !== void 0 ? _sandbox$mcpToken : "" }
				});
			} catch (error) {
				await sandbox.kill().catch(() => void 0);
				if (error instanceof CommandExitError) throw new SandboxError(`Failed to start MCP gateway: ${error.stderr}`);
				throw error;
			}
		}
		return sandbox;
	}
	/**
	* Connect to a sandbox. If the sandbox is paused, it will be automatically resumed.
	* Sandbox must be either running or be paused.
	*
	* With sandbox ID you can connect to the same sandbox from different places or environments (serverless functions, etc).
	*
	* @param sandboxId sandbox ID.
	* @param opts connection options.
	*
	* @returns A running sandbox instance
	*
	* @example
	* ```ts
	* const sandbox = await Sandbox.create()
	* const sandboxId = sandbox.sandboxId
	*
	* // Connect to the same sandbox.
	* const sameSandbox = await Sandbox.connect(sandboxId)
	* ```
	*/
	static async connect(sandboxId, opts) {
		var _this2 = this;
		const apiOpts = _this2.resolveOpts(opts);
		const config = new ConnectionConfig(apiOpts);
		if (config.debug) return new _this2(_objectSpread2({
			sandboxId,
			envdVersion: ENVD_DEBUG_FALLBACK
		}, config));
		const sandbox = await _this2.connectSandbox(sandboxId, apiOpts);
		return new _this2(_objectSpread2({
			sandboxId,
			sandboxDomain: sandbox.sandboxDomain,
			envdAccessToken: sandbox.envdAccessToken,
			trafficAccessToken: sandbox.trafficAccessToken,
			envdVersion: sandbox.envdVersion
		}, config));
	}
	/**
	* Fork a running sandbox specified by sandbox ID.
	*
	* The sandbox is checkpointed in place (briefly paused, snapshotted with its
	* full memory state, and resumed — its ID and expiration stay untouched) and
	* `count` new sandboxes are created from that snapshot. All forks boot from
	* the same snapshot, so the snapshot is captured once regardless of count.
	*
	* Each fork succeeds or fails independently — the returned array contains
	* one entry per requested fork, either a running {@link Sandbox} instance or
	* an `Error` describing why that fork failed to start
	* (`Promise.allSettled`-style). Per-fork error codes map to the same error
	* classes as other API errors (e.g. 429 to `RateLimitError`).
	*
	* @param sandboxId sandbox ID.
	* @param opts fork options — `count`, `timeoutMs` and connection options.
	*
	* @returns array with one entry per requested fork — a sandbox instance or an error.
	*
	* @example
	* ```ts
	* const sandbox = await Sandbox.create()
	*
	* const [fork1, fork2] = await Sandbox.fork(sandbox.sandboxId, { count: 2 })
	* if (fork1 instanceof Sandbox) {
	*   await fork1.commands.run('echo "hello from fork"')
	* }
	* ```
	*/
	static async fork(sandboxId, opts) {
		var _this3 = this;
		var _apiOpts$timeoutMs2, _apiOpts$count;
		const apiOpts = _this3.resolveOpts(opts);
		const config = new ConnectionConfig(apiOpts);
		return (await _this3.forkSandbox(sandboxId, (_apiOpts$timeoutMs2 = apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.timeoutMs) !== null && _apiOpts$timeoutMs2 !== void 0 ? _apiOpts$timeoutMs2 : _this3.defaultSandboxTimeoutMs, (_apiOpts$count = apiOpts === null || apiOpts === void 0 ? void 0 : apiOpts.count) !== null && _apiOpts$count !== void 0 ? _apiOpts$count : 1, apiOpts)).map((result) => result instanceof Error ? result : new _this3(_objectSpread2(_objectSpread2({}, result), config)));
	}
	/**
	* Connect to a sandbox. If the sandbox is paused, it will be automatically resumed.
	* Sandbox must be either running or be paused.
	*
	* With sandbox ID you can connect to the same sandbox from different places or environments (serverless functions, etc).
	*
	* @param opts connection options.
	*
	* @returns A running sandbox instance
	*
	* @example
	* ```ts
	* const sandbox = await Sandbox.create()
	* await sandbox.betaPause()
	*
	* // Connect to the same sandbox.
	* const sameSandbox = await sandbox.connect()
	* ```
	*/
	async connect(opts) {
		var _this4 = this;
		if (_this4.connectionConfig.debug) return _this4;
		await SandboxApi.connectSandbox(_this4.sandboxId, _this4.resolveApiOpts(opts));
		return _this4;
	}
	/**
	* Fork the sandbox.
	*
	* The sandbox is checkpointed in place (briefly paused, snapshotted with its
	* full memory state, and resumed — its ID and expiration stay untouched) and
	* `count` new sandboxes are created from that snapshot. All forks boot from
	* the same snapshot, so the snapshot is captured once regardless of count.
	*
	* Each fork succeeds or fails independently — the returned array contains
	* one entry per requested fork, either a running {@link Sandbox} instance or
	* an `Error` describing why that fork failed to start
	* (`Promise.allSettled`-style). Per-fork error codes map to the same error
	* classes as other API errors (e.g. 429 to `RateLimitError`).
	*
	* @param opts fork options — `count`, `timeoutMs` and connection options.
	*
	* @returns array with one entry per requested fork — a sandbox instance or an error.
	*
	* @example
	* ```ts
	* const sandbox = await Sandbox.create()
	*
	* const [fork1, fork2] = await sandbox.fork({ count: 2 })
	* if (fork1 instanceof Sandbox) {
	*   await fork1.commands.run('echo "hello from fork"')
	* }
	* ```
	*/
	async fork(opts) {
		var _this5 = this;
		return await _this5.constructor.fork(_this5.sandboxId, _this5.resolveApiOpts(opts));
	}
	/**
	* Get the host address for the specified sandbox port.
	* You can then use this address to connect to the sandbox port from outside the sandbox via HTTP or WebSocket.
	*
	* @param port number of the port in the sandbox.
	*
	* @returns host address of the sandbox port.
	*
	* @example
	* ```ts
	* const sandbox = await Sandbox.create()
	* // Start an HTTP server
	* await sandbox.commands.run('python3 -m http.server 3000', { background: true })
	* // Get the hostname of the HTTP server
	* const serverURL = sandbox.getHost(3000)
	* ```
	*/
	getHost(port) {
		return this.connectionConfig.getHost(this.sandboxId, port, this.sandboxDomain);
	}
	/**
	* Check if the sandbox is running.
	*
	* @returns `true` if the sandbox is running, `false` otherwise.
	*
	* @example
	* ```ts
	* const sandbox = await Sandbox.create()
	* await sandbox.isRunning() // Returns true
	*
	* await sandbox.kill()
	* await sandbox.isRunning() // Returns false
	* ```
	*/
	async isRunning(opts) {
		var _this6 = this;
		const signal = _this6.connectionConfig.getSignal(opts === null || opts === void 0 ? void 0 : opts.requestTimeoutMs, opts === null || opts === void 0 ? void 0 : opts.signal);
		const res = await _this6.envdApi.api.GET("/health", { signal });
		if (res.response.status == 502) return false;
		const err = await handleEnvdApiError(res);
		if (err) throw err;
		return true;
	}
	/**
	* Set the timeout of the sandbox.
	*
	* This method can extend or reduce the sandbox timeout set when creating the sandbox or from the last call to `.setTimeout`.
	* Maximum time a sandbox can be kept alive is 24 hours (86_400_000 milliseconds) for Pro users and 1 hour (3_600_000 milliseconds) for Hobby users.
	*
	* @param timeoutMs timeout in **milliseconds**.
	* @param opts connection options.
	*/
	async setTimeout(timeoutMs, opts) {
		var _this7 = this;
		if (_this7.connectionConfig.debug) return;
		await SandboxApi.setTimeout(_this7.sandboxId, timeoutMs, _this7.resolveApiOpts(opts));
	}
	/**
	* Update the network configuration of the sandbox.
	*
	* Replaces the current egress configuration atomically — fields that are
	* omitted are cleared on the server.
	*
	* @param network new network configuration.
	* @param opts connection options.
	*/
	async updateNetwork(network, opts) {
		var _this8 = this;
		await SandboxApi.updateNetwork(_this8.sandboxId, network, _this8.resolveApiOpts(opts));
	}
	/**
	* Kill the sandbox.
	*
	* @param opts connection options.
	*
	* @returns `true` if the sandbox was killed, `false` if the sandbox was not found.
	*/
	async kill(opts) {
		var _this9 = this;
		if (_this9.connectionConfig.debug) return true;
		return await SandboxApi.kill(_this9.sandboxId, _this9.resolveApiOpts(opts));
	}
	/**
	* Pause a sandbox by its ID.
	*
	* @param opts connection options, plus `keepMemory` to control the snapshot
	* kind. When `opts.keepMemory` is `false`, the in-memory state is dropped and
	* only the filesystem is persisted (a filesystem-only snapshot); resuming such
	* a sandbox cold-boots (reboots) it from disk, losing running processes and
	* open connections. Defaults to `true` (full memory snapshot).
	*
	* @returns `true` if the sandbox got paused, `false` if the sandbox was already paused.
	*
	* @example
	* ```ts
	* const sandbox = await Sandbox.create()
	* await sandbox.pause()
	*
	* // filesystem-only snapshot (resume reboots the sandbox)
	* await sandbox.pause({ keepMemory: false })
	* ```
	*/
	async pause(opts) {
		var _this10 = this;
		return await SandboxApi.pause(_this10.sandboxId, _this10.resolveApiOpts(opts));
	}
	/**
	* @deprecated Use {@link Sandbox.pause} instead.
	*/
	async betaPause(opts) {
		var _this11 = this;
		return await SandboxApi.betaPause(_this11.sandboxId, _this11.resolveApiOpts(opts));
	}
	/**
	* Create a snapshot of the sandbox's current state.
	*
	* The sandbox will be paused while the snapshot is being created.
	* The snapshot can be used to create new sandboxes with the same filesystem and state.
	* Snapshots are persistent and survive sandbox deletion.
	*
	* Use the returned `snapshotId` with `Sandbox.create(snapshotId)` to create a new sandbox from the snapshot.
	*
	* @param opts snapshot creation options including optional name and connection options.
	*
	* @returns snapshot information including the snapshot ID.
	*
	* @example
	* ```ts
	* const sandbox = await Sandbox.create()
	* await sandbox.files.write('/app/state.json', '{"step": 1}')
	*
	* // Create a snapshot
	* const snapshot = await sandbox.createSnapshot({ name: 'my-snapshot' })
	*
	* // Create a new sandbox from the snapshot
	* const newSandbox = await Sandbox.create(snapshot.snapshotId)
	* ```
	*/
	async createSnapshot(opts) {
		var _this12 = this;
		return await SandboxApi.createSnapshot(_this12.sandboxId, _objectSpread2(_objectSpread2({}, _this12.resolveApiOpts(opts)), {}, { name: opts === null || opts === void 0 ? void 0 : opts.name }));
	}
	/**
	* List all snapshots created from this sandbox.
	*
	* @param opts list options.
	*
	* @returns paginator for listing snapshots from this sandbox.
	*/
	listSnapshots(opts) {
		return SandboxApi.listSnapshots(_objectSpread2(_objectSpread2({}, this.resolveApiOpts(opts)), {}, { sandboxId: this.sandboxId }));
	}
	/**
	*
	* Get the MCP URL for the sandbox.
	*
	* @returns MCP URL for the sandbox.
	*/
	getMcpUrl() {
		return `https://${this.getHost(this.mcpPort)}/mcp`;
	}
	/**
	* Get the MCP token for the sandbox.
	*
	* @returns MCP token for the sandbox, or undefined if MCP is not enabled.
	*/
	async getMcpToken() {
		var _this13 = this;
		if (!_this13.mcpToken) _this13.mcpToken = await _this13.files.read("/etc/mcp-gateway/.token", { user: "root" });
		return _this13.mcpToken;
	}
	/**
	* Get the URL to upload a file to the sandbox.
	*
	* You have to send a POST request to this URL with the file as multipart/form-data.
	*
	* @param path path to the file in the sandbox.
	*
	* @param opts download url options.
	*
	* @returns URL for uploading file.
	*/
	async uploadUrl(path, opts) {
		var _this14 = this;
		var _opts;
		opts = (_opts = opts) !== null && _opts !== void 0 ? _opts : {};
		const useSignature = !!_this14.envdAccessToken;
		if (!useSignature && opts.useSignatureExpiration != void 0) throw new InvalidArgumentError("Signature expiration can be used only when sandbox is created as secured.");
		let username = opts.user;
		if (username == void 0 && compareVersions(_this14.envdApi.version, "0.4.0") < 0) username = defaultUsername;
		const filePath = path !== null && path !== void 0 ? path : "";
		const fileUrl = _this14.fileUrl(filePath, username);
		if (useSignature) {
			const url = new URL(fileUrl);
			const sig = await getSignature({
				path: filePath,
				operation: "write",
				user: username,
				expirationInSeconds: opts.useSignatureExpiration,
				envdAccessToken: _this14.envdAccessToken
			});
			url.searchParams.set("signature", sig.signature);
			if (sig.expiration) url.searchParams.set("signature_expiration", sig.expiration.toString());
			return url.toString();
		}
		return fileUrl;
	}
	/**
	* Get the URL to download a file from the sandbox.
	*
	* @param path path to the file in the sandbox.
	*
	* @param opts download url options.
	*
	* @returns URL for downloading file.
	*/
	async downloadUrl(path, opts) {
		var _this15 = this;
		var _opts2;
		opts = (_opts2 = opts) !== null && _opts2 !== void 0 ? _opts2 : {};
		const useSignature = !!_this15.envdAccessToken;
		if (!useSignature && opts.useSignatureExpiration != void 0) throw new InvalidArgumentError("Signature expiration can be used only when sandbox is created as secured.");
		let username = opts.user;
		if (username == void 0 && compareVersions(_this15.envdApi.version, "0.4.0") < 0) username = defaultUsername;
		const fileUrl = _this15.fileUrl(path, username);
		if (useSignature) {
			const url = new URL(fileUrl);
			const sig = await getSignature({
				path,
				operation: "read",
				user: username,
				expirationInSeconds: opts.useSignatureExpiration,
				envdAccessToken: _this15.envdAccessToken
			});
			url.searchParams.set("signature", sig.signature);
			if (sig.expiration) url.searchParams.set("signature_expiration", sig.expiration.toString());
			return url.toString();
		}
		return fileUrl;
	}
	/**
	* Get sandbox information like sandbox ID, template, metadata, started at/end at date.
	*
	* @param opts connection options.
	*
	* @returns information about the sandbox
	*/
	async getInfo(opts) {
		var _this16 = this;
		return await SandboxApi.getInfo(_this16.sandboxId, _this16.resolveApiOpts(opts));
	}
	/**
	* Get the metrics of the sandbox.
	*
	* @param opts connection options.
	*
	* @returns  List of sandbox metrics containing CPU, memory and disk usage information.
	*/
	async getMetrics(opts) {
		var _this17 = this;
		if (_this17.connectionConfig.debug) return [];
		if (_this17.envdApi.version) {
			if (compareVersions(_this17.envdApi.version, "0.1.5") < 0) throw new TemplateError("You need to update the template to use the new SDK.");
			if (compareVersions(_this17.envdApi.version, "0.2.4") < 0) {
				var _this$connectionConfi5, _this$connectionConfi6;
				(_this$connectionConfi5 = _this17.connectionConfig.logger) === null || _this$connectionConfi5 === void 0 || (_this$connectionConfi6 = _this$connectionConfi5.warn) === null || _this$connectionConfi6 === void 0 || _this$connectionConfi6.call(_this$connectionConfi5, "Disk metrics are not supported in this version of the sandbox, please rebuild the template to get disk metrics.");
			}
		}
		return await SandboxApi.getMetrics(_this17.sandboxId, _this17.resolveApiOpts(opts));
	}
	resolveApiOpts(opts) {
		return ConnectionConfig.mergeOpts(this.connectionConfig, opts);
	}
	fileUrl(path, username) {
		const url = new URL("/files", this.envdDirectUrl);
		if (username) url.searchParams.set("username", username);
		if (path) url.searchParams.set("path", path);
		return url.toString();
	}
};
_defineProperty(Sandbox$1, "defaultTemplate", "base");
_defineProperty(Sandbox$1, "defaultMcpTemplate", "mcp-gateway");
_defineProperty(Sandbox$1, "defaultSandboxTimeoutMs", DEFAULT_SANDBOX_TIMEOUT_MS);
/**
* Make a template class callable as a factory, so `Template(opts)` keeps
* returning a builder, and keep the statics usable when they are pulled off the
* class on their own (`const { build } = Template`). Everything else —
* construction, `instanceof`, subclassing — goes straight to the class.
*
* @internal
* @hidden
* @hide
*/
function callableTemplate(cls) {
	const bound = /* @__PURE__ */ new WeakMap();
	return new Proxy(cls, {
		apply(target, _thisArg, args) {
			return new target(...args);
		},
		get(target, prop, receiver) {
			const value = Reflect.get(target, prop, receiver);
			if (prop === "prototype" || typeof value !== "function") return value;
			const self = typeof receiver === "function" ? receiver : target;
			let methods = bound.get(self);
			if (!methods) {
				methods = /* @__PURE__ */ new Map();
				bound.set(self, methods);
			}
			let method = methods.get(prop);
			if (!method) {
				method = value.bind(self);
				methods.set(prop, method);
			}
			return method;
		}
	});
}
/**
* Default per-request timeout (in milliseconds) for the file-upload phase
* (PUT to S3 presigned URL) when the caller hasn't supplied
* `requestTimeoutMs`. Large archives can take well over the 60s API
* default, so we use a generous 1-hour bound here.
* @internal
*/
var FILE_UPLOAD_TIMEOUT_MS = 36e5;
/**
* Represents a single log entry from the template build process.
*/
var LogEntry = class {
	constructor(timestamp, level, message) {
		_defineProperty(this, "timestamp", void 0);
		_defineProperty(this, "level", void 0);
		_defineProperty(this, "message", void 0);
		this.timestamp = timestamp;
		this.level = level;
		this.message = stripAnsi(message);
	}
	toString() {
		return `[${this.timestamp.toISOString()}] [${this.level}] ${this.message}`;
	}
};
/**
* Special log entry indicating the start of a build process.
*/
var LogEntryStart = class extends LogEntry {
	constructor(timestamp, message) {
		super(timestamp, "debug", message);
	}
};
/**
* Special log entry indicating the end of a build process.
*/
var LogEntryEnd = class extends LogEntry {
	constructor(timestamp, message) {
		super(timestamp, "debug", message);
	}
};
chalk.red("ERROR"), chalk.hex("#FF4400")("WARN "), chalk.hex("#FF8800")("INFO "), chalk.gray("DEBUG");
var FIREFOX_SAFARI_STACK_REGEXP = /(^|@)\S+:\d+/;
var CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+:\d+|\(native\))/m;
var SAFARI_NATIVE_CODE_REGEXP = /^(eval@)?(\[native code\])?$/;
/**
* Given an Error object, extract the most information from it.
*
* @param {Error} error object
* @param {ParseOptions} options
* @return {Array} of StackFrames
*/
function parse$1(error, options) {
	if (typeof error.stacktrace !== "undefined" || typeof error["opera#sourceloc"] !== "undefined") return parseOpera(error, options);
	else if (error.stack && CHROME_IE_STACK_REGEXP.test(error.stack)) return parseV8OrIE(error, options);
	else if (error.stack) return parseFFOrSafari(error, options);
	else if (options === null || options === void 0 ? void 0 : options.allowEmpty) return [];
	else throw new Error("Cannot parse given Error object");
}
/**
* Separate line and column numbers from a string of the form: (URI:Line:Column)
*/
function extractLocation(urlLike) {
	if (!urlLike.includes(":")) return [
		urlLike,
		void 0,
		void 0
	];
	const parts = /(.+?)(?::(\d+))?(?::(\d+))?$/.exec(urlLike.replace(/[()]/g, ""));
	return [
		parts[1],
		parts[2] || void 0,
		parts[3] || void 0
	];
}
function applySlice(lines, options) {
	if (options && options.slice != null) {
		if (Array.isArray(options.slice)) return lines.slice(options.slice[0], options.slice[1]);
		return lines.slice(0, options.slice);
	}
	return lines;
}
function parseV8OrIE(error, options) {
	return parseV8OrIeString(error.stack, options);
}
function parseV8OrIeString(stack, options) {
	return applySlice(stack.split("\n").filter((line) => {
		return !!line.match(CHROME_IE_STACK_REGEXP);
	}), options).map((line) => {
		if (line.includes("(eval ")) line = line.replace(/eval code/g, "eval").replace(/(\(eval at [^()]*)|(,.*$)/g, "");
		let sanitizedLine = line.replace(/^\s+/, "").replace(/\(eval code/g, "(").replace(/^.*?\s+/, "");
		const location = sanitizedLine.match(/ (\(.+\)$)/);
		sanitizedLine = location ? sanitizedLine.replace(location[0], "") : sanitizedLine;
		const locationParts = extractLocation(location ? location[1] : sanitizedLine);
		return {
			function: location && sanitizedLine || void 0,
			file: ["eval", "<anonymous>"].includes(locationParts[0]) ? void 0 : locationParts[0],
			line: locationParts[1] ? +locationParts[1] : void 0,
			col: locationParts[2] ? +locationParts[2] : void 0,
			raw: line
		};
	});
}
function parseFFOrSafari(error, options) {
	return parseFFOrSafariString(error.stack, options);
}
function parseFFOrSafariString(stack, options) {
	return applySlice(stack.split("\n").filter((line) => {
		return !line.match(SAFARI_NATIVE_CODE_REGEXP);
	}), options).map((line) => {
		if (line.includes(" > eval")) line = line.replace(/ line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g, ":$1");
		if (!line.includes("@") && !line.includes(":")) return { function: line };
		else {
			const functionNameRegex = /(([^\n\r"\u2028\u2029]*".[^\n\r"\u2028\u2029]*"[^\n\r@\u2028\u2029]*(?:@[^\n\r"\u2028\u2029]*"[^\n\r@\u2028\u2029]*)*(?:[\n\r\u2028\u2029][^@]*)?)?[^@]*)@/;
			const matches = line.match(functionNameRegex);
			const functionName = matches && matches[1] ? matches[1] : void 0;
			const locationParts = extractLocation(line.replace(functionNameRegex, ""));
			return {
				function: functionName,
				file: locationParts[0],
				line: locationParts[1] ? +locationParts[1] : void 0,
				col: locationParts[2] ? +locationParts[2] : void 0,
				raw: line
			};
		}
	});
}
function parseOpera(e, options) {
	if (!e.stacktrace || e.message.includes("\n") && e.message.split("\n").length > e.stacktrace.split("\n").length) return parseOpera9(e);
	else if (!e.stack) return parseOpera10(e);
	else return parseOpera11(e, options);
}
function parseOpera9(e, options) {
	const lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
	const lines = e.message.split("\n");
	const result = [];
	for (let i = 2, len = lines.length; i < len; i += 2) {
		const match = lineRE.exec(lines[i]);
		if (match) result.push({
			file: match[2],
			line: +match[1],
			raw: lines[i]
		});
	}
	return applySlice(result, options);
}
function parseOpera10(e, options) {
	const lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
	const lines = e.stacktrace.split("\n");
	const result = [];
	for (let i = 0, len = lines.length; i < len; i += 2) {
		const match = lineRE.exec(lines[i]);
		if (match) result.push({
			function: match[3] || void 0,
			file: match[2],
			line: match[1] ? +match[1] : void 0,
			raw: lines[i]
		});
	}
	return applySlice(result, options);
}
function parseOpera11(error, options) {
	return applySlice(error.stack.split("\n").filter((line) => {
		return !!line.match(FIREFOX_SAFARI_STACK_REGEXP) && !line.match(/^Error created at/);
	}), options).map((line) => {
		const tokens = line.split("@");
		const locationParts = extractLocation(tokens.pop());
		const functionCall = tokens.shift() || "";
		const functionName = functionCall.replace(/<anonymous function(: (\w+))?>/, "$2").replace(/\([^)]*\)/g, "") || void 0;
		let argsRaw;
		if (/\([^)]*\)/.test(functionCall)) argsRaw = functionCall.replace(/^[^(]+\(([^)]*)\)$/, "$1");
		return {
			function: functionName,
			args: argsRaw === void 0 || argsRaw === "[arguments not available]" ? void 0 : argsRaw.split(","),
			file: locationParts[0],
			line: locationParts[1] ? +locationParts[1] : void 0,
			col: locationParts[2] ? +locationParts[2] : void 0,
			raw: line
		};
	});
}
function stackframesLiteToStackframes(liteStackframes) {
	return liteStackframes.map((liteStackframe) => {
		return {
			functionName: liteStackframe.function,
			args: liteStackframe.args,
			fileName: liteStackframe.file,
			lineNumber: liteStackframe.line,
			columnNumber: liteStackframe.col,
			source: liteStackframe.raw
		};
	});
}
/**
* Given an Error object, extract the most information from it.
*
* @param {Error} error object
* @return {Array} of StackFrames
*/
function parse(error, options) {
	return stackframesLiteToStackframes(parse$1(error, options));
}
var _excluded = ["alias"];
/**
* Validate that a source path for copy operations is a relative path that stays
* within the context directory. This prevents path traversal attacks and ensures
* files are copied from within the expected directory.
*
* @param src The source path to validate
* @param stackTrace Optional stack trace for error reporting
* @throws TemplateError if the path is absolute or escapes the context directory
*
* Invalid paths:
* - Absolute paths: /absolute/path, C:\Windows\path
* - Parent directory escapes: ../foo, foo/../../bar, ./foo/../../../bar
*
* Valid paths:
* - Simple relative: foo, foo/bar
* - Current directory prefix: ./foo, ./foo/bar
* - Internal parent refs that don't escape: foo/../bar (stays within context)
*/
function validateRelativePath(src, stackTrace) {
	if (path.isAbsolute(src)) throw new TemplateError(`Invalid source path "${src}": absolute paths are not allowed. Use a relative path within the context directory.`, stackTrace);
	const normalized = path.normalize(src);
	if (normalized === ".." || normalized.startsWith(".." + path.sep)) throw new TemplateError(`Invalid source path "${src}": path escapes the context directory. The path must stay within the context directory.`, stackTrace);
}
/**
* Normalize build arguments from different overload signatures.
* Handles string name or legacy options object with alias.
*
* @param nameOrOptions Name or legacy options with alias
* @param options Optional build options (when first arg is name)
* @returns Object with normalized name, tags, and build options
* @throws TemplateError if no template name is provided
*/
function normalizeBuildArguments(nameOrOptions, options) {
	let name;
	let buildOptions;
	if (typeof nameOrOptions === "string") {
		name = nameOrOptions;
		buildOptions = options !== null && options !== void 0 ? options : {};
	} else {
		const { alias } = nameOrOptions, restOpts = _objectWithoutProperties(nameOrOptions, _excluded);
		name = alias;
		buildOptions = restOpts;
	}
	if (!name || name.length === 0) throw new TemplateError("Name must be provided");
	return {
		name,
		buildOptions
	};
}
/**
* Read and parse a .dockerignore file.
*
* @param contextPath Directory path containing the .dockerignore file
* @returns Array of ignore patterns (empty lines and comments are filtered out)
*/
function readDockerignore(contextPath) {
	const dockerignorePath = path.join(contextPath, ".dockerignore");
	if (!fs.existsSync(dockerignorePath)) return [];
	return fs.readFileSync(dockerignorePath, "utf-8").split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
}
/**
* Normalize path separators to forward slashes for glob patterns (glob expects / even on Windows)
* @param path - The path to normalize
* @returns The normalized path
*/
function normalizePath(path) {
	return path.replace(/\\/g, "/");
}
/**
* Get all files for a given path and ignore patterns.
*
* @param src Path to the source directory
* @param contextPath Base directory for resolving relative paths
* @param ignorePatterns Ignore patterns
* @returns Array of files
*/
async function getAllFilesInPath(src, contextPath, ignorePatterns, includeDirectories = true) {
	const { glob } = await dynamicImport("glob");
	const files = /* @__PURE__ */ new Map();
	const globFiles = await glob(src, {
		ignore: ignorePatterns,
		withFileTypes: true,
		dot: true,
		cwd: contextPath
	});
	for (const file of globFiles) if (file.isDirectory()) {
		if (includeDirectories) files.set(file.fullpath(), file);
		(await glob(normalizePath(path.join(file.relative() || ".", "**/*")), {
			ignore: ignorePatterns,
			withFileTypes: true,
			dot: true,
			cwd: contextPath
		})).forEach((f) => files.set(f.fullpath(), f));
	} else files.set(file.fullpath(), file);
	return Array.from(files.values()).sort((a, b) => a.fullpath() < b.fullpath() ? -1 : a.fullpath() > b.fullpath() ? 1 : 0);
}
/**
* Calculate a hash of files being copied to detect changes for cache invalidation.
* The hash includes file content, metadata (mode, size), and relative paths.
* Note: uid, gid, and mtime are excluded to ensure stable hashes across environments.
*
* @param src Source path pattern for files to copy
* @param dest Destination path where files will be copied
* @param contextPath Base directory for resolving relative paths
* @param ignorePatterns Glob patterns to ignore
* @param resolveSymlinks Whether to resolve symbolic links when hashing
* @param stackTrace Optional stack trace for error reporting
* @returns Hex string hash of all files
* @throws Error if no files match the source pattern
*/
async function calculateFilesHash(src, dest, contextPath, ignorePatterns, resolveSymlinks, stackTrace) {
	const srcPath = path.join(contextPath, src);
	const hash = crypto$1.createHash("sha256");
	const content = `COPY ${src} ${dest}`;
	hash.update(content);
	const files = await getAllFilesInPath(src, contextPath, ignorePatterns, true);
	if (files.length === 0) {
		const error = /* @__PURE__ */ new Error(`No files found in ${srcPath}`);
		if (stackTrace) error.stack = stackTrace;
		throw error;
	}
	const hashStats = (stats) => {
		hash.update(stats.mode.toString());
		hash.update(stats.size.toString());
	};
	for (const file of files) {
		const relativePath = file.relativePosix();
		hash.update(relativePath);
		if (file.isSymbolicLink()) {
			const stats = fs.statSync(file.fullpath(), { throwIfNoEntry: false });
			if (!(resolveSymlinks && ((stats === null || stats === void 0 ? void 0 : stats.isFile()) || (stats === null || stats === void 0 ? void 0 : stats.isDirectory())))) {
				hashStats(fs.lstatSync(file.fullpath()));
				const content = fs.readlinkSync(file.fullpath());
				hash.update(content);
				continue;
			}
		}
		const stats = fs.statSync(file.fullpath());
		hashStats(stats);
		if (stats.isFile()) {
			const content = fs.readFileSync(file.fullpath());
			hash.update(new Uint8Array(content));
		}
	}
	return hash.digest("hex");
}
/**
* Convert a stack-trace file name to a filesystem path.
* In ESM modules, stack frames report file:// URLs.
*/
function frameFileToPath(fileName) {
	return fileName.startsWith("file:") ? url.fileURLToPath(fileName) : fileName;
}
/**
* Check whether a stack-trace file name refers to user code, i.e. a file
* outside the SDK's own directory. Node internals (`node:*`) and native
* frames are never user code.
*/
function isUserFile(fileName, sdkDir) {
	if (fileName.startsWith("node:") || fileName === "native") return false;
	try {
		const relative = path.relative(sdkDir, path.dirname(frameFileToPath(fileName)));
		return relative !== "" && (relative.startsWith("..") || path.isAbsolute(relative));
	} catch (_unused) {
		return false;
	}
}
/**
* Capture the current stack and locate the first frame in user code.
*
* Frames are selected by boundary rather than by fixed depth: the SDK's own
* directory is derived from the top frame (which is always SDK code — this
* module), and the first frame whose file lies outside it is the user's call
* site. This keeps the result stable when transpilers inject extra frames
* (e.g. TS class-field initializers) or runtimes elide delegating frames
* (e.g. Bun's tail-call elision).
*
* @returns Parsed frames and the index of the user's frame, -1 when no user
*   frame is identifiable (e.g. the SDK is bundled into the caller's file)
*/
function captureUserFrames() {
	var _frames$;
	const frames = parse(/* @__PURE__ */ new Error(), { allowEmpty: true });
	const ownFile = (_frames$ = frames[0]) === null || _frames$ === void 0 ? void 0 : _frames$.fileName;
	if (!ownFile) return {
		frames,
		userFrameIndex: -1
	};
	const sdkDir = path.dirname(frameFileToPath(ownFile));
	return {
		frames,
		userFrameIndex: frames.findIndex((frame) => frame.fileName !== void 0 && isUserFile(frame.fileName, sdkDir))
	};
}
/**
* Get the stack trace starting at the caller's frame in user code.
*
* @returns The stack trace starting at the user's frame, or undefined when no
*   user frame is identifiable
*/
function getCallerFrame() {
	const { frames, userFrameIndex } = captureUserFrames();
	if (userFrameIndex === -1) return;
	return frames.slice(userFrameIndex).map((frame) => frame.source).filter((source) => source !== void 0).join("\n");
}
/**
* Get the directory of the caller in user code.
*
* @returns The caller's directory path, or undefined if not available
*/
function getCallerDirectory() {
	const { frames, userFrameIndex } = captureUserFrames();
	const fileName = userFrameIndex === -1 ? void 0 : frames[userFrameIndex].fileName;
	if (!fileName) return;
	return path.dirname(frameFileToPath(fileName));
}
/**
* Convert a numeric file mode to a zero-padded octal string.
*
* @param mode File mode as a number (e.g., 493 for 0o755)
* @returns Zero-padded 4-digit octal string (e.g., "0755")
*
* @example
* ```ts
* padOctal(0o755) // Returns "0755"
* padOctal(0o644) // Returns "0644"
* ```
*/
function padOctal(mode) {
	return mode.toString(8).padStart(4, "0");
}
/**
* Create a gzipped tar archive of files matching a pattern, spooled to a
* temporary file on disk.
*
* Spooling instead of buffering keeps memory bounded and gives the archive a
* known size, so the upload can send an exact `Content-Length`. The caller
* owns the archive's lifetime and must invoke `cleanup` once done with it.
* This mirrors the Python SDK's `tar_file_stream`.
*
* @param fileName Glob pattern for files to include
* @param fileContextPath Base directory for resolving file paths
* @param ignorePatterns Ignore patterns to exclude from the archive
* @param resolveSymlinks Whether to follow symbolic links
* @param gzip Whether to gzip the archive
* @returns The archive path, its size in bytes, and a cleanup callback that
*   removes the spooled archive. Cleanup is best-effort so it can never mask
*   the upload result — a leaked temp dir is non-fatal, the OS reclaims it.
*/
async function spoolTarArchive(fileName, fileContextPath, ignorePatterns, resolveSymlinks, gzip) {
	const { create } = await dynamicImport("tar");
	const filePaths = (await getAllFilesInPath(fileName, fileContextPath, ignorePatterns, true)).map((file) => file.relativePosix());
	const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "e2b-template-"));
	const tarPath = path.join(tmpDir, "context.tar.gz");
	const cleanup = () => fs.promises.rm(tmpDir, {
		recursive: true,
		force: true
	}).catch(() => {});
	try {
		await create({
			gzip,
			cwd: fileContextPath,
			follow: resolveSymlinks,
			noDirRecurse: true,
			file: tarPath
		}, filePaths);
		const { size } = await fs.promises.stat(tarPath);
		return {
			path: tarPath,
			size,
			cleanup
		};
	} catch (err) {
		await cleanup();
		throw err;
	}
}
/**
* Get the array index for a build step based on its name.
*
* Special steps:
* - BASE_STEP_NAME: Returns 0 (first step)
* - FINALIZE_STEP_NAME: Returns the last index
* - Numeric strings: Converted to number
*
* @param step Build step name or number as string
* @param stackTracesLength Total number of stack traces (used for FINALIZE_STEP_NAME)
* @returns Index for the build step
*/
function getBuildStepIndex(step, stackTracesLength) {
	if (step === "base") return 0;
	if (step === "finalize") return stackTracesLength - 1;
	return Number(step);
}
/**
* Read GCP service account JSON from a file or object.
*
* @param contextPath Base directory for resolving relative file paths
* @param pathOrContent Either a path to a JSON file or a service account object
* @returns Service account JSON as a string
*/
function readGCPServiceAccountJSON(contextPath, pathOrContent) {
	if (typeof pathOrContent === "string") return fs.readFileSync(path.join(contextPath, pathOrContent), "utf-8");
	return JSON.stringify(pathOrContent);
}
async function requestBuild(client, { name, tags, cpuCount, memoryMB }, signal) {
	const requestBuildRes = await client.api.POST("/v3/templates", {
		body: {
			name,
			tags,
			cpuCount,
			memoryMB
		},
		signal
	});
	const error = handleApiError(requestBuildRes, BuildError);
	if (error) throw error;
	if (!requestBuildRes.data) throw new BuildError("Failed to request build");
	return requestBuildRes.data;
}
async function getFileUploadLink(client, { templateID, filesHash }, stackTrace, signal) {
	const fileUploadLinkRes = await client.api.GET("/templates/{templateID}/files/{hash}", {
		params: { path: {
			templateID,
			hash: filesHash
		} },
		signal
	});
	const error = handleApiError(fileUploadLinkRes, FileUploadError, stackTrace);
	if (error) throw error;
	if (!fileUploadLinkRes.data) throw new FileUploadError("Failed to get file upload link", stackTrace);
	return fileUploadLinkRes.data;
}
async function uploadFile(options, stackTrace, abortOpts) {
	const { fileName, url, fileContextPath, ignorePatterns, resolveSymlinks, gzip } = options;
	let cleanup;
	try {
		var _abortOpts$requestTim;
		const tar = await spoolTarArchive(fileName, fileContextPath, ignorePatterns, resolveSymlinks, gzip);
		cleanup = tar.cleanup;
		const signal = buildRequestSignal((_abortOpts$requestTim = abortOpts === null || abortOpts === void 0 ? void 0 : abortOpts.requestTimeoutMs) !== null && _abortOpts$requestTim !== void 0 ? _abortOpts$requestTim : FILE_UPLOAD_TIMEOUT_MS, abortOpts === null || abortOpts === void 0 ? void 0 : abortOpts.signal);
		const res = await putFileStream(url, tar.path, tar.size, signal);
		if (!res.ok) throw new FileUploadError(`Failed to upload file: ${res.statusText}`, stackTrace);
	} catch (error) {
		if (error instanceof FileUploadError) throw error;
		throw new FileUploadError(`Failed to upload file: ${error}`, stackTrace);
	} finally {
		await (cleanup === null || cleanup === void 0 ? void 0 : cleanup());
	}
}
async function putFileStream(url, filePath, size, signal) {
	var _ref;
	const undici = await loadUndici();
	return await ((_ref = undici === null || undici === void 0 ? void 0 : undici.fetch) !== null && _ref !== void 0 ? _ref : fetch)(url, {
		method: "PUT",
		body: stream.Readable.toWeb(fs.createReadStream(filePath)),
		headers: { "Content-Length": size.toString() },
		duplex: "half",
		signal
	});
}
async function triggerBuild(client, { templateID, buildID, template }, signal) {
	const error = handleApiError(await client.api.POST("/v2/templates/{templateID}/builds/{buildID}", {
		params: { path: {
			templateID,
			buildID
		} },
		body: template,
		signal
	}), BuildError);
	if (error) throw error;
}
function mapLogEntry(entry) {
	return new LogEntry(new Date(entry.timestamp), entry.level, entry.message);
}
function mapBuildStatusReason(reason) {
	var _reason$logEntries;
	if (!reason) return;
	return {
		message: reason.message,
		step: reason.step,
		logEntries: ((_reason$logEntries = reason.logEntries) !== null && _reason$logEntries !== void 0 ? _reason$logEntries : []).map(mapLogEntry)
	};
}
async function getBuildStatus(client, { templateID, buildID, logsOffset }, signal) {
	const buildStatusRes = await client.api.GET("/templates/{templateID}/builds/{buildID}/status", {
		params: {
			path: {
				templateID,
				buildID
			},
			query: { logsOffset }
		},
		signal
	});
	const error = handleApiError(buildStatusRes, BuildError);
	if (error) throw error;
	if (!buildStatusRes.data) throw new BuildError("Failed to get build status");
	return {
		buildID: buildStatusRes.data.buildID,
		templateID: buildStatusRes.data.templateID,
		status: buildStatusRes.data.status,
		logEntries: buildStatusRes.data.logEntries.map(mapLogEntry),
		logs: buildStatusRes.data.logs,
		reason: mapBuildStatusReason(buildStatusRes.data.reason)
	};
}
async function checkAliasExists(client, { alias }, signal) {
	const aliasRes = await client.api.GET("/templates/aliases/{alias}", {
		params: { path: { alias } },
		signal
	});
	if (aliasRes.response.status === 404) return false;
	if (aliasRes.response.status === 403) return true;
	const error = handleApiError(aliasRes, TemplateError);
	if (error) throw error;
	return aliasRes.data !== void 0;
}
async function waitForBuildFinish(client, { templateID, buildID, onBuildLogs, logsRefreshFrequency, stackTraces, signal, requestTimeoutMs }) {
	let logsOffset = 0;
	let status = "building";
	const pollStatus = async () => {
		const buildStatus = await getBuildStatus(client, {
			templateID,
			buildID,
			logsOffset
		}, buildRequestSignal(requestTimeoutMs, signal));
		logsOffset += buildStatus.logEntries.length;
		buildStatus.logEntries.forEach((logEntry) => onBuildLogs === null || onBuildLogs === void 0 ? void 0 : onBuildLogs(logEntry));
		return buildStatus;
	};
	while (status === "building" || status === "waiting") {
		signal === null || signal === void 0 || signal.throwIfAborted();
		const buildStatus = await pollStatus();
		status = buildStatus.status;
		switch (status) {
			case "ready":
			case "error": {
				var _buildStatus$reason, _buildStatus$reason$m, _buildStatus$reason2;
				let tailStatus = buildStatus;
				while (tailStatus.logEntries.length > 0) {
					signal === null || signal === void 0 || signal.throwIfAborted();
					tailStatus = await pollStatus();
				}
				if (status === "ready") return;
				let stackError;
				if (((_buildStatus$reason = buildStatus.reason) === null || _buildStatus$reason === void 0 ? void 0 : _buildStatus$reason.step) !== void 0) stackError = stackTraces[getBuildStepIndex(buildStatus.reason.step, stackTraces.length)];
				throw new BuildError((_buildStatus$reason$m = buildStatus === null || buildStatus === void 0 || (_buildStatus$reason2 = buildStatus.reason) === null || _buildStatus$reason2 === void 0 ? void 0 : _buildStatus$reason2.message) !== null && _buildStatus$reason$m !== void 0 ? _buildStatus$reason$m : "Unknown error", stackError);
			}
		}
		await new Promise((resolve) => setTimeout(resolve, logsRefreshFrequency));
	}
	throw new BuildError("Unknown build error occurred.");
}
async function assignTags(client, { targetName, tags }, signal) {
	const res = await client.api.POST("/templates/tags", {
		body: {
			target: targetName,
			tags
		},
		signal
	});
	const error = handleApiError(res, TemplateError);
	if (error) throw error;
	if (!res.data) throw new TemplateError("Failed to assign tags");
	return {
		buildId: res.data.buildID,
		tags: res.data.tags
	};
}
async function removeTags(client, { name, tags }, signal) {
	const error = handleApiError(await client.api.DELETE("/templates/tags", {
		body: {
			name,
			tags
		},
		signal
	}), TemplateError);
	if (error) throw error;
}
async function getTemplateTags(client, { templateID }, signal) {
	const res = await client.api.GET("/templates/{templateID}/tags", {
		params: { path: { templateID } },
		signal
	});
	const error = handleApiError(res, TemplateError);
	if (error) throw error;
	if (!res.data) throw new TemplateError("Failed to get template tags");
	return res.data.map((item) => ({
		tag: item.tag,
		buildId: item.buildID,
		createdAt: new Date(item.createdAt)
	}));
}
/**
* Class for ready check commands.
*/
var ReadyCmd = class {
	constructor(cmd) {
		_defineProperty(this, "cmd", void 0);
		this.cmd = cmd;
	}
	getCmd() {
		return this.cmd;
	}
};
/**
* Wait for a file to exist.
* Uses shell test command to check file existence.
*
* @param filename Path to the file to wait for
* @returns ReadyCmd that checks for the file
*
* @example
* ```ts
* import { Template, waitForFile } from 'e2b'
*
* const template = Template()
*   .fromBaseImage()
*   .setStartCmd('./init.sh', waitForFile('/tmp/ready'))
* ```
*/
function waitForFile(filename) {
	return new ReadyCmd(`[ -f ${shellQuote(filename)} ]`);
}
/**
* Wait for a specified timeout before considering the sandbox ready.
* Uses `sleep` command to wait for a fixed duration.
*
* @param timeout Time to wait in milliseconds (minimum: 1000ms / 1 second)
* @returns ReadyCmd that waits for the specified duration
*
* @example
* ```ts
* import { Template, waitForTimeout } from 'e2b'
*
* const template = Template()
*   .fromNodeImage()
*   .setStartCmd('npm start', waitForTimeout(5000)) // Wait 5 seconds
* ```
*/
function waitForTimeout(timeout) {
	return new ReadyCmd(`sleep ${Math.max(1, Math.floor(timeout / 1e3))}`);
}
/**
* Parse a Dockerfile and convert it to Template SDK format
*
* @param dockerfileContentOrPath Either the Dockerfile content as a string,
*                                or a path to a Dockerfile file
* @param templateBuilder Interface providing template builder methods
* @returns Parsed Dockerfile result with base image and instructions
*/
function parseDockerfile(dockerfileContentOrPath, templateBuilder) {
	let dockerfileContent;
	try {
		if (fs.existsSync(dockerfileContentOrPath) && fs.statSync(dockerfileContentOrPath).isFile()) dockerfileContent = fs.readFileSync(dockerfileContentOrPath, "utf-8");
		else dockerfileContent = dockerfileContentOrPath;
	} catch (_unused) {
		dockerfileContent = dockerfileContentOrPath;
	}
	const instructions = import_main.DockerfileParser.parse(dockerfileContent).getInstructions();
	const fromInstructions = instructions.filter((instruction) => instruction.getKeyword() === "FROM");
	if (fromInstructions.length > 1) throw new Error("Multi-stage Dockerfiles are not supported");
	if (fromInstructions.length === 0) throw new Error("Dockerfile must contain a FROM instruction");
	const argumentsData = fromInstructions[0].getArguments();
	let baseImage = "e2bdev/base";
	let userChanged = false;
	let workdirChanged = false;
	if (argumentsData && argumentsData.length > 0) baseImage = argumentsData[0].getValue();
	templateBuilder.setUser("root");
	templateBuilder.setWorkdir("/");
	for (const instruction of instructions) {
		const keyword = instruction.getKeyword();
		switch (keyword) {
			case "FROM": break;
			case "RUN":
				handleRunInstruction(instruction, templateBuilder);
				break;
			case "COPY":
			case "ADD":
				handleCopyInstruction(instruction, templateBuilder);
				break;
			case "WORKDIR":
				handleWorkdirInstruction(instruction, templateBuilder);
				workdirChanged = true;
				break;
			case "USER":
				handleUserInstruction(instruction, templateBuilder);
				userChanged = true;
				break;
			case "ENV":
			case "ARG":
				handleEnvInstruction(instruction, templateBuilder);
				break;
			case "EXPOSE": break;
			case "VOLUME": break;
			case "CMD":
			case "ENTRYPOINT":
				handleCmdEntrypointInstruction(instruction, templateBuilder);
				break;
			default: console.warn(`Unsupported instruction: ${keyword}`);
		}
	}
	if (!userChanged) templateBuilder.setUser("user");
	if (!workdirChanged) templateBuilder.setWorkdir("/home/user");
	return { baseImage };
}
function handleRunInstruction(instruction, templateBuilder) {
	const argumentsData = instruction.getArguments();
	if (argumentsData && argumentsData.length > 0) {
		const command = argumentsData.map((arg) => arg.getValue()).join(" ");
		templateBuilder.runCmd(command);
	}
}
function handleCopyInstruction(instruction, templateBuilder) {
	const argumentsData = instruction.getArguments();
	if (argumentsData && argumentsData.length >= 2) {
		const dest = argumentsData[argumentsData.length - 1].getValue();
		const sources = argumentsData.slice(0, -1).map((arg) => arg.getValue());
		let user;
		const chownFlag = instruction.getFlags().find((flag) => flag.getName() === "chown");
		if (chownFlag) {
			var _chownFlag$getValue;
			user = (_chownFlag$getValue = chownFlag.getValue()) !== null && _chownFlag$getValue !== void 0 ? _chownFlag$getValue : void 0;
		}
		for (const src of sources) templateBuilder.copy(src, dest, { user });
	}
}
function handleWorkdirInstruction(instruction, templateBuilder) {
	const argumentsData = instruction.getArguments();
	if (argumentsData && argumentsData.length > 0) {
		const workdir = argumentsData[0].getValue();
		templateBuilder.setWorkdir(workdir);
	}
}
function handleUserInstruction(instruction, templateBuilder) {
	const argumentsData = instruction.getArguments();
	if (argumentsData && argumentsData.length > 0) {
		const user = argumentsData[0].getValue();
		templateBuilder.setUser(user);
	}
}
function handleEnvInstruction(instruction, templateBuilder) {
	const argumentsData = instruction.getArguments();
	const keyword = instruction.getKeyword();
	if (argumentsData && argumentsData.length >= 1) {
		const envVars = {};
		if (argumentsData.length === 2) {
			const firstArg = argumentsData[0].getValue();
			const secondArg = argumentsData[1].getValue();
			if (firstArg.includes("=") && secondArg.includes("=")) for (const arg of argumentsData) {
				const envString = arg.getValue();
				const equalIndex = envString.indexOf("=");
				if (equalIndex > 0) {
					const key = envString.substring(0, equalIndex);
					envVars[key] = envString.substring(equalIndex + 1);
				}
			}
			else envVars[firstArg] = secondArg;
		} else if (argumentsData.length === 1) {
			const envString = argumentsData[0].getValue();
			const equalIndex = envString.indexOf("=");
			if (equalIndex > 0) {
				const key = envString.substring(0, equalIndex);
				envVars[key] = envString.substring(equalIndex + 1);
			} else if (keyword === "ARG" && envString.trim()) {
				const key = envString.trim();
				envVars[key] = "";
			}
		} else for (const arg of argumentsData) {
			const envString = arg.getValue();
			const equalIndex = envString.indexOf("=");
			if (equalIndex > 0) {
				const key = envString.substring(0, equalIndex);
				envVars[key] = envString.substring(equalIndex + 1);
			} else if (keyword === "ARG") {
				const key = envString;
				envVars[key] = "";
			}
		}
		if (Object.keys(envVars).length > 0) templateBuilder.setEnvs(envVars);
	}
}
function handleCmdEntrypointInstruction(instruction, templateBuilder) {
	const argumentsData = instruction.getArguments();
	if (argumentsData && argumentsData.length > 0) {
		let command = argumentsData.map((arg) => arg.getValue()).join(" ");
		try {
			const parsedCommand = JSON.parse(command);
			if (Array.isArray(parsedCommand)) command = parsedCommand.join(" ");
		} catch (_unused2) {}
		templateBuilder.setStartCmd(command, waitForTimeout(2e4));
	}
}
/**
* Builder for E2B sandbox templates, and the entrypoint for the template API.
*
* Exposed as {@link Template}, which can be called as a factory.
*/
var TemplateBase = class extends ClientFactory {
	constructor(options) {
		var _options$fileContextP, _getCallerDirectory, _options$fileIgnorePa;
		super();
		_defineProperty(this, "defaultBaseImage", "e2bdev/base");
		_defineProperty(this, "baseImage", this.defaultBaseImage);
		_defineProperty(this, "baseTemplate", void 0);
		_defineProperty(this, "registryConfig", void 0);
		_defineProperty(this, "startCmd", void 0);
		_defineProperty(this, "readyCmd", void 0);
		_defineProperty(this, "force", false);
		_defineProperty(this, "forceNextLayer", false);
		_defineProperty(this, "instructions", []);
		_defineProperty(this, "fileContextPath", void 0);
		_defineProperty(this, "fileIgnorePatterns", []);
		_defineProperty(this, "logsRefreshFrequency", 200);
		_defineProperty(this, "stackTraces", []);
		this.fileContextPath = (_options$fileContextP = options === null || options === void 0 ? void 0 : options.fileContextPath) !== null && _options$fileContextP !== void 0 ? _options$fileContextP : runtime === "browser" ? "." : (_getCallerDirectory = getCallerDirectory()) !== null && _getCallerDirectory !== void 0 ? _getCallerDirectory : ".";
		this.fileIgnorePatterns = (_options$fileIgnorePa = options === null || options === void 0 ? void 0 : options.fileIgnorePatterns) !== null && _options$fileIgnorePa !== void 0 ? _options$fileIgnorePa : this.fileIgnorePatterns;
	}
	/**
	* Convert a template to JSON representation.
	*
	* @param template The template to convert
	* @param computeHashes Whether to compute file hashes for cache invalidation
	* @returns JSON string representation of the template
	*/
	static toJSON(template, computeHashes = true) {
		return template.toJSON(computeHashes);
	}
	/**
	* Convert a template to Dockerfile format.
	* Note: Templates based on other E2B templates cannot be converted to Dockerfile.
	*
	* @param template The template to convert
	* @returns Dockerfile string representation
	* @throws Error if the template is based on another E2B template
	*/
	static toDockerfile(template) {
		return template.toDockerfile();
	}
	static async build(template, nameOrOptions, options) {
		var _this = this;
		var _this$resolveOpts;
		const { name, buildOptions } = normalizeBuildArguments(nameOrOptions, options);
		const buildOpts = (_this$resolveOpts = _this.resolveOpts(buildOptions)) !== null && _this$resolveOpts !== void 0 ? _this$resolveOpts : {};
		try {
			var _buildOpts$onBuildLog, _buildOpts$onBuildLog2;
			(_buildOpts$onBuildLog = buildOpts.onBuildLogs) === null || _buildOpts$onBuildLog === void 0 || _buildOpts$onBuildLog.call(buildOpts, new LogEntryStart(/* @__PURE__ */ new Date(), "Build started"));
			const baseTemplate = template;
			const config = new ConnectionConfig(buildOpts);
			const client = new ApiClient(config);
			const data = await baseTemplate.build(client, config, name, buildOpts);
			(_buildOpts$onBuildLog2 = buildOpts.onBuildLogs) === null || _buildOpts$onBuildLog2 === void 0 || _buildOpts$onBuildLog2.call(buildOpts, new LogEntry(/* @__PURE__ */ new Date(), "info", "Waiting for logs..."));
			await waitForBuildFinish(client, {
				templateID: data.templateId,
				buildID: data.buildId,
				onBuildLogs: buildOpts.onBuildLogs,
				logsRefreshFrequency: baseTemplate.logsRefreshFrequency,
				stackTraces: baseTemplate.stackTraces,
				signal: buildOpts.signal,
				requestTimeoutMs: config.requestTimeoutMs
			});
			return data;
		} finally {
			var _buildOpts$onBuildLog3;
			(_buildOpts$onBuildLog3 = buildOpts.onBuildLogs) === null || _buildOpts$onBuildLog3 === void 0 || _buildOpts$onBuildLog3.call(buildOpts, new LogEntryEnd(/* @__PURE__ */ new Date(), "Build finished"));
		}
	}
	static async buildInBackground(template, nameOrOptions, options) {
		var _this2 = this;
		var _this$resolveOpts2;
		const { name, buildOptions } = normalizeBuildArguments(nameOrOptions, options);
		const buildOpts = (_this$resolveOpts2 = _this2.resolveOpts(buildOptions)) !== null && _this$resolveOpts2 !== void 0 ? _this$resolveOpts2 : {};
		const config = new ConnectionConfig(buildOpts);
		const client = new ApiClient(config);
		return template.build(client, config, name, buildOpts);
	}
	/**
	* Get the status of a build.
	*
	* @param data Build identifiers
	* @param options Authentication options
	*
	* @example
	* ```ts
	* const status = await Template.getBuildStatus(data, { logsOffset: 0 })
	* ```
	*/
	static async getBuildStatus(data, options) {
		var _this3 = this;
		var _options$logsOffset;
		const config = new ConnectionConfig(_this3.resolveOpts(options));
		return await getBuildStatus(new ApiClient(config), {
			templateID: data.templateId,
			buildID: data.buildId,
			logsOffset: (_options$logsOffset = options === null || options === void 0 ? void 0 : options.logsOffset) !== null && _options$logsOffset !== void 0 ? _options$logsOffset : 0
		}, config.getSignal(void 0, options === null || options === void 0 ? void 0 : options.signal));
	}
	/**
	* Check if a template with the given name exists.
	*
	* @param name Template name to check
	* @param options Authentication options
	* @returns True if the name exists, false otherwise
	*
	* @example
	* ```ts
	* const exists = await Template.exists('my-python-env')
	* if (exists) {
	*   console.log('Template exists!')
	* }
	* ```
	*/
	static async exists(name, options) {
		return this.aliasExists(name, options);
	}
	/**
	* Check if a template with the given alias exists.
	*
	* @param alias Template alias to check
	* @param options Authentication options
	* @returns True if the alias exists, false otherwise
	*
	* @deprecated Use `exists` instead.
	* @example
	* ```ts
	* const exists = await Template.aliasExists('my-python-env')
	* if (exists) {
	*   console.log('Template exists!')
	* }
	* ```
	*/
	static async aliasExists(alias, options) {
		const config = new ConnectionConfig(this.resolveOpts(options));
		return checkAliasExists(new ApiClient(config), { alias }, config.getSignal(void 0, options === null || options === void 0 ? void 0 : options.signal));
	}
	/**
	* Assign tag(s) to an existing template build.
	*
	* @param targetName Template name in 'name:tag' format (the source build to tag from)
	* @param tags Tag or tags to assign
	* @param options Authentication options
	* @returns Tag info with buildId and assigned tags
	*
	* @example
	* ```ts
	* // Assign a single tag
	* await Template.assignTags('my-template:v1.0', 'production')
	*
	* // Assign multiple tags
	* await Template.assignTags('my-template:v1.0', ['production', 'stable'])
	* ```
	*/
	static async assignTags(targetName, tags, options) {
		const config = new ConnectionConfig(this.resolveOpts(options));
		return assignTags(new ApiClient(config), {
			targetName,
			tags: Array.isArray(tags) ? tags : [tags]
		}, config.getSignal(void 0, options === null || options === void 0 ? void 0 : options.signal));
	}
	/**
	* Remove tag(s) from a template.
	*
	* @param name Template name
	* @param tags Tag or tags to remove
	* @param options Authentication options
	*
	* @example
	* ```ts
	* // Remove a single tag
	* await Template.removeTags('my-template', 'production')
	*
	* // Remove multiple tags from a template
	* await Template.removeTags('my-template', ['production', 'staging'])
	* ```
	*/
	static async removeTags(name, tags, options) {
		const config = new ConnectionConfig(this.resolveOpts(options));
		return removeTags(new ApiClient(config), {
			name,
			tags: Array.isArray(tags) ? tags : [tags]
		}, config.getSignal(void 0, options === null || options === void 0 ? void 0 : options.signal));
	}
	/**
	* Get all tags for a template.
	*
	* @param templateId Template ID or name
	* @param options Authentication options
	* @returns Array of tag details including tag name, buildId, and creation date
	*
	* @example
	* ```ts
	* const tags = await Template.getTags('my-template')
	* for (const tag of tags) {
	*   console.log(`Tag: ${tag.tag}, Build: ${tag.buildId}, Created: ${tag.createdAt}`)
	* }
	* ```
	*/
	static async getTags(templateId, options) {
		const config = new ConnectionConfig(this.resolveOpts(options));
		return getTemplateTags(new ApiClient(config), { templateID: templateId }, config.getSignal(void 0, options === null || options === void 0 ? void 0 : options.signal));
	}
	fromDebianImage(variant = "stable") {
		return this.fromImage(`debian:${variant}`);
	}
	fromUbuntuImage(variant = "latest") {
		return this.fromImage(`ubuntu:${variant}`);
	}
	fromFedoraImage(variant = "44") {
		return this.fromImage(`fedora:${variant}`);
	}
	fromAlpineImage(variant = "3.24") {
		return this.fromImage(`alpine:${variant}`);
	}
	fromArchImage(variant = "latest") {
		return this.fromImage(`archlinux:${variant}`);
	}
	fromPythonImage(version = "3") {
		return this.fromImage(`python:${version}`);
	}
	fromNodeImage(variant = "lts") {
		return this.fromImage(`node:${variant}`);
	}
	fromBunImage(variant = "latest") {
		return this.fromImage(`oven/bun:${variant}`);
	}
	fromBaseImage() {
		return this.fromImage(this.defaultBaseImage);
	}
	fromImage(baseImage, credentials) {
		if (credentials && (!credentials.username || !credentials.password)) throw new InvalidArgumentError("Both username and password are required when providing registry credentials", getCallerFrame());
		this.baseImage = baseImage;
		this.baseTemplate = void 0;
		if (credentials) this.registryConfig = {
			type: "registry",
			username: credentials.username,
			password: credentials.password
		};
		if (this.forceNextLayer) this.force = true;
		this.collectStackTrace();
		return this;
	}
	fromTemplate(template) {
		this.baseTemplate = template;
		this.baseImage = void 0;
		if (this.forceNextLayer) this.force = true;
		this.collectStackTrace();
		return this;
	}
	fromDockerfile(dockerfileContentOrPath) {
		const { baseImage } = parseDockerfile(dockerfileContentOrPath, this);
		this.baseImage = baseImage;
		this.baseTemplate = void 0;
		if (this.forceNextLayer) this.force = true;
		this.collectStackTrace();
		return this;
	}
	fromAWSRegistry(image, credentials) {
		this.baseImage = image;
		this.baseTemplate = void 0;
		this.registryConfig = {
			type: "aws",
			awsAccessKeyId: credentials.accessKeyId,
			awsSecretAccessKey: credentials.secretAccessKey,
			awsRegion: credentials.region
		};
		if (this.forceNextLayer) this.force = true;
		this.collectStackTrace();
		return this;
	}
	fromGCPRegistry(image, credentials) {
		this.baseImage = image;
		this.baseTemplate = void 0;
		this.registryConfig = {
			type: "gcp",
			serviceAccountJson: readGCPServiceAccountJSON(this.fileContextPath.toString(), credentials.serviceAccountJSON)
		};
		if (this.forceNextLayer) this.force = true;
		this.collectStackTrace();
		return this;
	}
	copy(src, dest, options) {
		if (runtime === "browser") throw new Error("Browser runtime is not supported for copy");
		const srcs = Array.isArray(src) ? src : [src];
		const stackTrace = getCallerFrame();
		for (const src of srcs) {
			var _options$user;
			const srcString = src.toString();
			validateRelativePath(srcString, stackTrace);
			const args = [
				srcString,
				dest.toString(),
				(_options$user = options === null || options === void 0 ? void 0 : options.user) !== null && _options$user !== void 0 ? _options$user : "",
				(options === null || options === void 0 ? void 0 : options.mode) ? padOctal(options.mode) : ""
			];
			this.instructions.push({
				type: "COPY",
				args,
				force: (options === null || options === void 0 ? void 0 : options.forceUpload) || this.forceNextLayer,
				forceUpload: options === null || options === void 0 ? void 0 : options.forceUpload,
				resolveSymlinks: options === null || options === void 0 ? void 0 : options.resolveSymlinks,
				gzip: options === null || options === void 0 ? void 0 : options.gzip
			});
			this.collectStackTrace();
		}
		return this;
	}
	copyItems(items) {
		if (runtime === "browser") throw new Error("Browser runtime is not supported for copyItems");
		const stackTrace = getCallerFrame();
		for (const item of items) try {
			this.copy(item.src, item.dest, {
				forceUpload: item.forceUpload,
				user: item.user,
				mode: item.mode,
				resolveSymlinks: item.resolveSymlinks,
				gzip: item.gzip
			});
		} catch (error) {
			const copyError = error;
			copyError.stack = stackTrace;
			throw copyError;
		}
		return this;
	}
	remove(path, options) {
		const paths = Array.isArray(path) ? path : [path];
		const args = ["rm"];
		if (options === null || options === void 0 ? void 0 : options.recursive) args.push("-r");
		if (options === null || options === void 0 ? void 0 : options.force) args.push("-f");
		args.push(...paths.map((p) => shellQuote(p.toString())));
		return this.runCmd(args.join(" "), { user: options === null || options === void 0 ? void 0 : options.user });
	}
	rename(src, dest, options) {
		const args = [
			"mv",
			shellQuote(src.toString()),
			shellQuote(dest.toString())
		];
		if (options === null || options === void 0 ? void 0 : options.force) args.push("-f");
		return this.runCmd(args.join(" "), { user: options === null || options === void 0 ? void 0 : options.user });
	}
	makeDir(path, options) {
		const paths = Array.isArray(path) ? path : [path];
		const args = ["mkdir", "-p"];
		if (options === null || options === void 0 ? void 0 : options.mode) args.push(`-m ${padOctal(options.mode)}`);
		args.push(...paths.map((p) => shellQuote(p.toString())));
		return this.runCmd(args.join(" "), { user: options === null || options === void 0 ? void 0 : options.user });
	}
	makeSymlink(src, dest, options) {
		const args = ["ln", "-s"];
		if (options === null || options === void 0 ? void 0 : options.force) args.push("-f");
		args.push(shellQuote(src.toString()), shellQuote(dest.toString()));
		return this.runCmd(args.join(" "), { user: options === null || options === void 0 ? void 0 : options.user });
	}
	runCmd(commandOrCommands, options) {
		const args = [(Array.isArray(commandOrCommands) ? commandOrCommands : [commandOrCommands]).join(" && ")];
		if (options === null || options === void 0 ? void 0 : options.user) args.push(options.user);
		this.instructions.push({
			type: "RUN",
			args,
			force: this.forceNextLayer
		});
		this.collectStackTrace();
		return this;
	}
	setWorkdir(workdir) {
		this.instructions.push({
			type: "WORKDIR",
			args: [workdir.toString()],
			force: this.forceNextLayer
		});
		this.collectStackTrace();
		return this;
	}
	setUser(user) {
		this.instructions.push({
			type: "USER",
			args: [user],
			force: this.forceNextLayer
		});
		this.collectStackTrace();
		return this;
	}
	pipInstall(packages, options) {
		var _options$g;
		const g = (_options$g = options === null || options === void 0 ? void 0 : options.g) !== null && _options$g !== void 0 ? _options$g : true;
		const args = ["pip", "install"];
		const packageList = packages ? Array.isArray(packages) ? packages : [packages] : void 0;
		if (g === false) args.push("--user");
		if (packageList) args.push(...packageList);
		else args.push(".");
		return this.runCmd(args.join(" "), { user: g ? "root" : void 0 });
	}
	npmInstall(packages, options) {
		const args = ["npm", "install"];
		const packageList = packages ? Array.isArray(packages) ? packages : [packages] : void 0;
		if (options === null || options === void 0 ? void 0 : options.g) args.push("-g");
		if (options === null || options === void 0 ? void 0 : options.dev) args.push("--save-dev");
		if (packageList) args.push(...packageList);
		return this.runCmd(args.join(" "), { user: (options === null || options === void 0 ? void 0 : options.g) ? "root" : void 0 });
	}
	bunInstall(packages, options) {
		const args = ["bun", "install"];
		const packageList = packages ? Array.isArray(packages) ? packages : [packages] : void 0;
		if (options === null || options === void 0 ? void 0 : options.g) args.push("-g");
		if (options === null || options === void 0 ? void 0 : options.dev) args.push("--dev");
		if (packageList) args.push(...packageList);
		return this.runCmd(args.join(" "), { user: (options === null || options === void 0 ? void 0 : options.g) ? "root" : void 0 });
	}
	aptInstall(packages, options) {
		const packageList = Array.isArray(packages) ? packages : [packages];
		return this.runCmd(["apt-get update", `DEBIAN_FRONTEND=noninteractive DEBCONF_NOWARNINGS=yes apt-get install -y ${(options === null || options === void 0 ? void 0 : options.noInstallRecommends) ? "--no-install-recommends " : ""}${(options === null || options === void 0 ? void 0 : options.fixMissing) ? "--fix-missing " : ""}${packageList.join(" ")}`], { user: "root" });
	}
	addMcpServer(servers) {
		if (this.baseTemplate !== "mcp-gateway") throw new BuildError("MCP servers can only be added to mcp-gateway template", getCallerFrame());
		const serverList = Array.isArray(servers) ? servers : [servers];
		return this.runCmd(`mcp-gateway pull ${serverList.join(" ")}`, { user: "root" });
	}
	gitClone(url, path, options) {
		const args = [
			"git",
			"clone",
			shellQuote(url)
		];
		if (options === null || options === void 0 ? void 0 : options.branch) {
			args.push(`--branch ${shellQuote(options.branch)}`);
			args.push("--single-branch");
		}
		if (options === null || options === void 0 ? void 0 : options.depth) args.push(`--depth ${options.depth}`);
		if (path) args.push(shellQuote(path.toString()));
		return this.runCmd(args.join(" "), { user: options === null || options === void 0 ? void 0 : options.user });
	}
	setStartCmd(startCommand, readyCommand) {
		this.startCmd = startCommand;
		if (readyCommand instanceof ReadyCmd) this.readyCmd = readyCommand.getCmd();
		else this.readyCmd = readyCommand;
		this.collectStackTrace();
		return this;
	}
	setReadyCmd(readyCommand) {
		if (readyCommand instanceof ReadyCmd) this.readyCmd = readyCommand.getCmd();
		else this.readyCmd = readyCommand;
		this.collectStackTrace();
		return this;
	}
	setEnvs(envs) {
		if (Object.keys(envs).length === 0) return this;
		this.instructions.push({
			type: "ENV",
			args: Object.entries(envs).flatMap(([key, value]) => [key, value]),
			force: this.forceNextLayer
		});
		this.collectStackTrace();
		return this;
	}
	skipCache() {
		this.forceNextLayer = true;
		return this;
	}
	betaDevContainerPrebuild(devcontainerDirectory) {
		if (this.baseTemplate !== "devcontainer") throw new BuildError("Devcontainers can only used in the devcontainer template", getCallerFrame());
		return this.runCmd(`devcontainer build --workspace-folder ${shellQuote(devcontainerDirectory)}`, { user: "root" });
	}
	betaSetDevContainerStart(devcontainerDirectory) {
		if (this.baseTemplate !== "devcontainer") throw new BuildError("Devcontainers can only used in the devcontainer template", getCallerFrame());
		const dir = shellQuote(devcontainerDirectory);
		return this.setStartCmd(`sudo devcontainer up --workspace-folder ${dir} && sudo /prepare-exec.sh ${dir} | sudo tee /devcontainer.sh > /dev/null && sudo chmod +x /devcontainer.sh && sudo touch /devcontainer.up`, waitForFile("/devcontainer.up"));
	}
	/**
	* Collect the current stack trace for debugging purposes.
	*
	* The trace resolves to the first frame outside the SDK, so methods that
	* delegate to other builder methods (e.g. `remove()` → `runCmd()`) collect
	* the user's call site without any bookkeeping.
	*
	* @returns this for method chaining
	*/
	collectStackTrace() {
		this.stackTraces.push(getCallerFrame());
		return this;
	}
	/**
	* Convert the template to JSON representation.
	*
	* @param computeHashes Whether to compute file hashes for COPY instructions
	* @returns JSON string representation of the template
	*/
	async toJSON(computeHashes) {
		var _this9 = this;
		let instructions = _this9.instructions;
		if (computeHashes) instructions = await _this9.instructionsWithHashes();
		return JSON.stringify(_this9.serialize(instructions), void 0, 2);
	}
	/**
	* Convert the template to Dockerfile format.
	*
	* Note: Only templates based on Docker images can be converted to Dockerfile.
	* Templates based on other E2B templates cannot be converted because they
	* may use features not available in standard Dockerfiles.
	*
	* @returns Dockerfile string representation
	* @throws Error if template is based on another E2B template or has no base image
	*/
	toDockerfile() {
		if (this.baseTemplate !== void 0) throw new Error("Cannot convert template built from another template to Dockerfile. Templates based on other templates can only be built using the E2B API.");
		if (this.baseImage === void 0) throw new Error("No base image specified for template");
		let dockerfile = `FROM ${this.baseImage}\n`;
		for (const instruction of this.instructions) {
			if (instruction.type === "RUN") {
				dockerfile += `RUN ${instruction.args[0]}\n`;
				continue;
			}
			if (instruction.type === "COPY") {
				dockerfile += `COPY ${instruction.args[0]} ${instruction.args[1]}\n`;
				continue;
			}
			if (instruction.type === "ENV") {
				const values = [];
				for (let i = 0; i < instruction.args.length; i += 2) values.push(`${instruction.args[i]}=${instruction.args[i + 1]}`);
				dockerfile += `ENV ${values.join(" ")}\n`;
				continue;
			}
			dockerfile += `${instruction.type} ${instruction.args.join(" ")}\n`;
		}
		if (this.startCmd) dockerfile += `ENTRYPOINT ${this.startCmd}\n`;
		return dockerfile;
	}
	/**
	* Internal implementation of the template build process.
	*
	* @param client API client for communicating with E2B backend
	* @param name Template name in 'name' or 'name:tag' format
	* @param tags Additional tags to assign to the build
	* @param options Build configuration options
	* @throws BuildError if the build fails
	*/
	async build(client, config, name, options) {
		var _this10 = this;
		var _options$onBuildLogs, _options$cpuCount, _options$memoryMB, _options$onBuildLogs2, _options$onBuildLogs5, _options$onBuildLogs6;
		if (options.skipCache) _this10.force = true;
		(_options$onBuildLogs = options.onBuildLogs) === null || _options$onBuildLogs === void 0 || _options$onBuildLogs.call(options, new LogEntry(/* @__PURE__ */ new Date(), "info", `Requesting build for template: ${name}${options.tags && options.tags.length > 0 ? ` with tags ${options.tags.join(", ")}` : ""}`));
		const { templateID, buildID, tags: responseTags } = await requestBuild(client, {
			name,
			tags: options.tags,
			cpuCount: (_options$cpuCount = options.cpuCount) !== null && _options$cpuCount !== void 0 ? _options$cpuCount : 2,
			memoryMB: (_options$memoryMB = options.memoryMB) !== null && _options$memoryMB !== void 0 ? _options$memoryMB : 1024
		}, config.getSignal(void 0, options.signal));
		(_options$onBuildLogs2 = options.onBuildLogs) === null || _options$onBuildLogs2 === void 0 || _options$onBuildLogs2.call(options, new LogEntry(/* @__PURE__ */ new Date(), "info", `Template created with ID: ${templateID}, Build ID: ${buildID}`));
		const instructionsWithHashes = await _this10.instructionsWithHashes();
		const uploadPromises = instructionsWithHashes.map(async (instruction, index) => {
			var _instruction$filesHas;
			if (instruction.type !== "COPY") return;
			const src = instruction.args.length > 0 ? instruction.args[0] : null;
			const filesHash = (_instruction$filesHas = instruction.filesHash) !== null && _instruction$filesHas !== void 0 ? _instruction$filesHas : null;
			if (src === null || filesHash === null) throw new Error("Source path and files hash are required");
			const forceUpload = instruction.forceUpload;
			let stackTrace = void 0;
			if (index + 1 >= 0 && index + 1 < _this10.stackTraces.length) stackTrace = _this10.stackTraces[index + 1];
			const { present, url } = await getFileUploadLink(client, {
				templateID,
				filesHash
			}, stackTrace, config.getSignal(void 0, options.signal));
			if (forceUpload && url != null || present === false && url != null) {
				var _instruction$resolveS, _instruction$gzip, _options$onBuildLogs3;
				await uploadFile({
					fileName: src,
					fileContextPath: _this10.fileContextPath.toString(),
					url,
					ignorePatterns: [..._this10.fileIgnorePatterns, ...readDockerignore(_this10.fileContextPath.toString())],
					resolveSymlinks: (_instruction$resolveS = instruction.resolveSymlinks) !== null && _instruction$resolveS !== void 0 ? _instruction$resolveS : false,
					gzip: (_instruction$gzip = instruction.gzip) !== null && _instruction$gzip !== void 0 ? _instruction$gzip : true
				}, stackTrace, {
					signal: options.signal,
					requestTimeoutMs: options.requestTimeoutMs
				});
				(_options$onBuildLogs3 = options.onBuildLogs) === null || _options$onBuildLogs3 === void 0 || _options$onBuildLogs3.call(options, new LogEntry(/* @__PURE__ */ new Date(), "info", `Uploaded '${src}'`));
			} else {
				var _options$onBuildLogs4;
				(_options$onBuildLogs4 = options.onBuildLogs) === null || _options$onBuildLogs4 === void 0 || _options$onBuildLogs4.call(options, new LogEntry(/* @__PURE__ */ new Date(), "info", `Skipping upload of '${src}', already cached`));
			}
		});
		await Promise.all(uploadPromises);
		(_options$onBuildLogs5 = options.onBuildLogs) === null || _options$onBuildLogs5 === void 0 || _options$onBuildLogs5.call(options, new LogEntry(/* @__PURE__ */ new Date(), "info", "All file uploads completed"));
		(_options$onBuildLogs6 = options.onBuildLogs) === null || _options$onBuildLogs6 === void 0 || _options$onBuildLogs6.call(options, new LogEntry(/* @__PURE__ */ new Date(), "info", "Starting building..."));
		await triggerBuild(client, {
			templateID,
			buildID,
			template: _this10.serialize(instructionsWithHashes)
		}, config.getSignal(void 0, options.signal));
		return {
			alias: name,
			name,
			tags: responseTags,
			templateId: templateID,
			buildId: buildID
		};
	}
	/**
	* Add file hashes to COPY instructions for cache invalidation.
	*
	* @returns Copy of instructions array with filesHash added to COPY instructions
	*/
	async instructionsWithHashes() {
		var _this11 = this;
		return Promise.all(_this11.instructions.map(async (instruction, index) => {
			var _instruction$resolveS2;
			if (instruction.type !== "COPY") return instruction;
			const src = instruction.args.length > 0 ? instruction.args[0] : null;
			const dest = instruction.args.length > 1 ? instruction.args[1] : null;
			if (src === null || dest === null) throw new Error("Source path and destination path are required");
			let stackTrace = void 0;
			if (index + 1 >= 0 && index + 1 < _this11.stackTraces.length) stackTrace = _this11.stackTraces[index + 1];
			return _objectSpread2(_objectSpread2({}, instruction), {}, { filesHash: await calculateFilesHash(src, dest, _this11.fileContextPath.toString(), [..._this11.fileIgnorePatterns, ...runtime === "browser" ? [] : readDockerignore(_this11.fileContextPath.toString())], (_instruction$resolveS2 = instruction.resolveSymlinks) !== null && _instruction$resolveS2 !== void 0 ? _instruction$resolveS2 : false, stackTrace) });
		}));
	}
	/**
	* Serialize the template to the API request format.
	*
	* @param steps Array of build instructions with file hashes
	* @returns Template data formatted for the API
	*/
	serialize(steps) {
		const templateData = {
			startCmd: this.startCmd,
			readyCmd: this.readyCmd,
			steps,
			force: this.force
		};
		if (this.baseImage !== void 0) templateData.fromImage = this.baseImage;
		if (this.baseTemplate !== void 0) templateData.fromTemplate = this.baseTemplate;
		if (this.registryConfig !== void 0) templateData.fromImageRegistry = this.registryConfig;
		return templateData;
	}
};
callableTemplate(TemplateBase);
//#endregion
//#region node_modules/.pnpm/@e2b+code-interpreter@2.7.2/node_modules/@e2b/code-interpreter/dist/index.mjs
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : /* @__PURE__ */ Symbol.for("Symbol." + name);
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, {
	enumerable: true,
	configurable: true,
	writable: true,
	value
}) : obj[key] = value;
var __spreadValues = (a, b) => {
	for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
	if (__getOwnPropSymbols) {
		for (var prop of __getOwnPropSymbols(b)) if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
	}
	return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __await = function(promise, isYieldStar) {
	this[0] = promise;
	this[1] = isYieldStar;
};
var __asyncGenerator = (__this, __arguments, generator) => {
	var resume = (k, v, yes, no) => {
		try {
			var x = generator[k](v), isAwait = (v = x.value) instanceof __await, done = x.done;
			Promise.resolve(isAwait ? v[0] : v).then((y) => isAwait ? resume(k === "return" ? k : "next", v[1] ? {
				done: y.done,
				value: y.value
			} : y, yes, no) : yes({
				value: y,
				done
			})).catch((e) => resume("throw", e, yes, no));
		} catch (e) {
			no(e);
		}
	}, method = (k, call, wait, clear) => it[k] = (x) => (call = new Promise((yes, no, run) => (run = () => resume(k, x, yes, no), q ? q.then(run) : run())), clear = () => q === wait && (q = 0), q = wait = call.then(clear, clear), call), q, it = {};
	return generator = generator.apply(__this, __arguments), it[__knownSymbol("asyncIterator")] = () => it, method("next"), method("throw"), method("return"), it;
};
var __forAwait = (obj, it, method) => (it = obj[__knownSymbol("asyncIterator")]) ? it.call(obj) : (obj = obj[__knownSymbol("iterator")](), it = {}, method = (key, fn) => (fn = obj[key]) && (it[key] = (arg) => new Promise((yes, no, done) => (arg = fn.call(obj, arg), done = arg.done, Promise.resolve(arg.value).then((value) => yes({
	value,
	done
}), no)))), method("next"), method("return"), it);
async function extractError(res) {
	if (res.ok) return;
	switch (res.status) {
		case 502: return new TimeoutError(`${await res.text()}: This error is likely due to sandbox timeout. You can modify the sandbox timeout by passing 'timeoutMs' when starting the sandbox or calling '.setTimeout' on the sandbox with the desired timeout.`);
		case 404: return new NotFoundError(await res.text());
		default: return new SandboxError(`${res.status} ${res.statusText}`);
	}
}
var ExecutionError = class {
	constructor(name, value, traceback) {
		this.name = name;
		this.value = value;
		this.traceback = traceback;
	}
};
var Result = class {
	constructor(rawData, isMainResult) {
		this.isMainResult = isMainResult;
		const data = __spreadValues({}, rawData);
		delete data["type"];
		delete data["is_main_result"];
		this.text = data["text"];
		this.html = data["html"];
		this.markdown = data["markdown"];
		this.svg = data["svg"];
		this.png = data["png"];
		this.jpeg = data["jpeg"];
		this.pdf = data["pdf"];
		this.latex = data["latex"];
		this.json = data["json"];
		this.javascript = data["javascript"];
		this.isMainResult = isMainResult;
		this.raw = data;
		this.data = data["data"];
		this.chart = data["chart"];
		this.extra = {};
		for (const key of Object.keys(data)) if (![
			"plain",
			"html",
			"markdown",
			"svg",
			"png",
			"jpeg",
			"pdf",
			"latex",
			"json",
			"javascript",
			"data",
			"chart",
			"extra",
			"text"
		].includes(key)) this.extra[key] = data[key];
	}
	/**
	* Returns all the formats available for the result.
	*
	* @returns Array of strings representing the formats available for the result.
	*/
	formats() {
		const formats = [];
		if (this.html) formats.push("html");
		if (this.markdown) formats.push("markdown");
		if (this.svg) formats.push("svg");
		if (this.png) formats.push("png");
		if (this.jpeg) formats.push("jpeg");
		if (this.pdf) formats.push("pdf");
		if (this.latex) formats.push("latex");
		if (this.json) formats.push("json");
		if (this.javascript) formats.push("javascript");
		if (this.data) formats.push("data");
		for (const key of Object.keys(this.extra)) formats.push(key);
		return formats;
	}
	/**
	* Returns the serializable representation of the result.
	*/
	toJSON() {
		return __spreadValues({
			text: this.text,
			html: this.html,
			markdown: this.markdown,
			svg: this.svg,
			png: this.png,
			jpeg: this.jpeg,
			pdf: this.pdf,
			latex: this.latex,
			json: this.json,
			javascript: this.javascript
		}, Object.keys(this.extra).length > 0 ? { extra: this.extra } : {});
	}
};
var Execution = class {
	constructor(results = [], logs = {
		stdout: [],
		stderr: []
	}, error, executionCount) {
		this.results = results;
		this.logs = logs;
		this.error = error;
		this.executionCount = executionCount;
	}
	/**
	* Returns the text representation of the main result of the cell.
	*/
	get text() {
		for (const data of this.results) if (data.isMainResult) return data.text;
	}
	/**
	* Returns the serializable representation of the execution result.
	*/
	toJSON() {
		return {
			results: this.results,
			logs: this.logs,
			error: this.error
		};
	}
};
async function parseOutput(execution, line, onStdout, onStderr, onResult, onError) {
	const msg = JSON.parse(line);
	switch (msg.type) {
		case "result": {
			const result = new Result(__spreadProps(__spreadValues({}, msg), {
				type: void 0,
				is_main_result: void 0
			}), msg.is_main_result);
			execution.results.push(result);
			if (onResult) await onResult(result);
			break;
		}
		case "stdout":
			execution.logs.stdout.push(msg.text);
			if (onStdout) await onStdout({
				error: false,
				line: msg.text,
				timestamp: (/* @__PURE__ */ new Date()).getTime() * 1e3
			});
			break;
		case "stderr":
			execution.logs.stderr.push(msg.text);
			if (onStderr) await onStderr({
				error: true,
				line: msg.text,
				timestamp: (/* @__PURE__ */ new Date()).getTime() * 1e3
			});
			break;
		case "error":
			execution.error = new ExecutionError(msg.name, msg.value, msg.traceback);
			if (onError) await onError(execution.error);
			break;
		case "number_of_executions":
			execution.executionCount = msg.execution_count;
			break;
	}
}
function formatRequestTimeoutError(error) {
	if (error instanceof Error && error.name === "AbortError") return new TimeoutError("Request timed out — the 'requestTimeoutMs' option can be used to increase this timeout");
	return error;
}
function formatExecutionTimeoutError(error) {
	if (error instanceof Error && error.name === "AbortError") return new TimeoutError("Execution timed out — the 'timeoutMs' option can be used to increase this timeout");
	return error;
}
var CONNECTION_CLOSED_CODES = [
	"ECONNRESET",
	"EPIPE",
	"UND_ERR_SOCKET"
];
function isConnectionClosedError(error) {
	if (!(error instanceof Error)) return false;
	const code = error.code;
	if (typeof code === "string" && CONNECTION_CLOSED_CODES.includes(code)) return true;
	if (error.name === "ConnectionReset" || error.name === "ConnectionClosed") return true;
	if (error.cause) return isConnectionClosedError(error.cause);
	return false;
}
function readLines(stream) {
	return __asyncGenerator(this, null, function* () {
		const reader = stream.getReader();
		let buffer = "";
		try {
			while (true) {
				const { done, value } = yield new __await(reader.read());
				if (value !== void 0) buffer += new TextDecoder().decode(value);
				if (done) {
					if (buffer.length > 0) yield buffer;
					break;
				}
				let newlineIdx = -1;
				do {
					newlineIdx = buffer.indexOf("\n");
					if (newlineIdx !== -1) {
						yield buffer.slice(0, newlineIdx);
						buffer = buffer.slice(newlineIdx + 1);
					}
				} while (newlineIdx !== -1);
			}
		} finally {
			reader.releaseLock();
		}
	});
}
var DEFAULT_TIMEOUT_MS = 6e4;
var JUPYTER_PORT = 49999;
var Sandbox = class extends Sandbox$1 {
	get jupyterUrl() {
		return this.connectionConfig.getSandboxDirectUrl(this.sandboxId, {
			sandboxDomain: this.sandboxDomain,
			envdPort: JUPYTER_PORT
		});
	}
	async runCode(code, opts) {
		var _a, _b, _c;
		if ((opts == null ? void 0 : opts.context) && (opts == null ? void 0 : opts.language)) throw new InvalidArgumentError("You can provide context or language, but not both at the same time.");
		const controller = new AbortController();
		const requestTimeout = (_a = opts == null ? void 0 : opts.requestTimeoutMs) != null ? _a : this.connectionConfig.requestTimeoutMs;
		const reqTimer = requestTimeout ? setTimeout(() => {
			controller.abort();
		}, requestTimeout) : void 0;
		const headers = {
			"Content-Type": "application/json",
			"E2b-Sandbox-Id": this.sandboxId,
			"E2b-Sandbox-Port": JUPYTER_PORT.toString()
		};
		if (this.trafficAccessToken) headers["E2B-Traffic-Access-Token"] = this.trafficAccessToken;
		if (this.envdAccessToken) headers["X-Access-Token"] = this.envdAccessToken;
		try {
			const res = await fetch(`${this.jupyterUrl}/execute`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					code,
					context_id: (_b = opts == null ? void 0 : opts.context) == null ? void 0 : _b.id,
					language: opts == null ? void 0 : opts.language,
					env_vars: opts == null ? void 0 : opts.envs
				}),
				signal: controller.signal,
				keepalive: true
			});
			const error2 = await extractError(res);
			if (error2) throw error2;
			if (!res.body) throw new Error(`Not response body: ${res.statusText} ${await (res == null ? void 0 : res.text())}`);
			clearTimeout(reqTimer);
			const bodyTimeout = (_c = opts == null ? void 0 : opts.timeoutMs) != null ? _c : DEFAULT_TIMEOUT_MS;
			const bodyTimer = bodyTimeout ? setTimeout(() => {
				controller.abort();
			}, bodyTimeout) : void 0;
			const execution = new Execution();
			try {
				try {
					for (var iter = __forAwait(readLines(res.body)), more, temp, error; more = !(temp = await iter.next()).done; more = false) {
						const chunk = temp.value;
						await parseOutput(execution, chunk, opts == null ? void 0 : opts.onStdout, opts == null ? void 0 : opts.onStderr, opts == null ? void 0 : opts.onResult, opts == null ? void 0 : opts.onError);
					}
				} catch (temp) {
					error = [temp];
				} finally {
					try {
						more && (temp = iter.return) && await temp.call(iter);
					} finally {
						if (error) throw error[0];
					}
				}
			} catch (error3) {
				throw formatExecutionTimeoutError(error3);
			} finally {
				clearTimeout(bodyTimer);
			}
			return execution;
		} catch (error2) {
			throw await this.handleRequestError(error2);
		}
	}
	/**
	* Creates a new context to run code in.
	*
	* @param opts options for creating the context.
	*
	* @returns context object.
	*/
	async createCodeContext(opts) {
		try {
			const headers = {
				"Content-Type": "application/json",
				"E2b-Sandbox-Id": this.sandboxId,
				"E2b-Sandbox-Port": JUPYTER_PORT.toString()
			};
			if (this.trafficAccessToken) headers["E2B-Traffic-Access-Token"] = this.trafficAccessToken;
			const res = await fetch(`${this.jupyterUrl}/contexts`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					language: opts == null ? void 0 : opts.language,
					cwd: opts == null ? void 0 : opts.cwd
				}),
				keepalive: true,
				signal: this.connectionConfig.getSignal(opts == null ? void 0 : opts.requestTimeoutMs)
			});
			const error = await extractError(res);
			if (error) throw error;
			return await res.json();
		} catch (error) {
			throw await this.handleRequestError(error);
		}
	}
	/**
	* Removes a context.
	*
	* @param context context to remove.
	*
	* @returns void.
	*/
	async removeCodeContext(context) {
		try {
			const id = typeof context === "string" ? context : context.id;
			const headers = {
				"Content-Type": "application/json",
				"E2b-Sandbox-Id": this.sandboxId,
				"E2b-Sandbox-Port": JUPYTER_PORT.toString()
			};
			if (this.trafficAccessToken) headers["E2B-Traffic-Access-Token"] = this.trafficAccessToken;
			const error = await extractError(await fetch(`${this.jupyterUrl}/contexts/${id}`, {
				method: "DELETE",
				headers,
				keepalive: true,
				signal: this.connectionConfig.getSignal(this.connectionConfig.requestTimeoutMs)
			}));
			if (error) throw error;
		} catch (error) {
			throw await this.handleRequestError(error);
		}
	}
	/**
	* List all contexts.
	*
	* @returns list of contexts.
	*/
	async listCodeContexts() {
		try {
			const headers = {
				"Content-Type": "application/json",
				"E2b-Sandbox-Id": this.sandboxId,
				"E2b-Sandbox-Port": JUPYTER_PORT.toString()
			};
			if (this.trafficAccessToken) headers["E2B-Traffic-Access-Token"] = this.trafficAccessToken;
			const res = await fetch(`${this.jupyterUrl}/contexts`, {
				method: "GET",
				headers,
				keepalive: true,
				signal: this.connectionConfig.getSignal(this.connectionConfig.requestTimeoutMs)
			});
			const error = await extractError(res);
			if (error) throw error;
			return await res.json();
		} catch (error) {
			throw await this.handleRequestError(error);
		}
	}
	/**
	* Restart a context.
	*
	* @param context context to restart.
	*
	* @returns void.
	*/
	async restartCodeContext(context) {
		try {
			const id = typeof context === "string" ? context : context.id;
			const headers = {
				"Content-Type": "application/json",
				"E2b-Sandbox-Id": this.sandboxId,
				"E2b-Sandbox-Port": JUPYTER_PORT.toString()
			};
			if (this.trafficAccessToken) headers["E2B-Traffic-Access-Token"] = this.trafficAccessToken;
			const error = await extractError(await fetch(`${this.jupyterUrl}/contexts/${id}/restart`, {
				method: "POST",
				headers,
				keepalive: true,
				signal: this.connectionConfig.getSignal(this.connectionConfig.requestTimeoutMs)
			}));
			if (error) throw error;
		} catch (error) {
			throw await this.handleRequestError(error);
		}
	}
	/**
	* Returns the error to throw for a failed request. If the connection was
	* closed because the sandbox was killed mid-request, returns a descriptive
	* `TimeoutError`. Otherwise falls back to formatting request timeouts and
	* re-throwing the original error.
	*/
	async handleRequestError(error) {
		if (isConnectionClosedError(error) && await this.isRunning().catch(() => true) === false) return new TimeoutError("The sandbox was killed while the request was in progress. This can happen when the sandbox times out or is killed manually. You can modify the sandbox timeout by passing 'timeoutMs' when starting the sandbox or calling '.setTimeout' on the sandbox with the desired timeout.");
		return formatRequestTimeoutError(error);
	}
};
Sandbox.defaultTemplate = "code-interpreter-v1";
//#endregion
export { globalthis_default as n, init_globalthis as r, Sandbox as t };
