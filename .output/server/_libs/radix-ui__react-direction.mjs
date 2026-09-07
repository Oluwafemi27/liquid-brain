import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "./@floating-ui/react-dom+[...].mjs";
import { m as require_jsx_runtime } from "./@radix-ui/react-collapsible+[...].mjs";
//#region node_modules/.pnpm/@radix-ui+react-direction@1.1.4_@types+react@19.2.18_react@19.2.8/node_modules/@radix-ui/react-direction/dist/index.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
require_jsx_runtime();
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", {
	value,
	configurable: true
});
var DirectionContext = import_react.createContext(void 0);
function useDirection(localDir) {
	const globalDir = import_react.useContext(DirectionContext);
	return localDir || globalDir || "ltr";
}
__name(useDirection, "useDirection");
//#endregion
export { useDirection as t };
