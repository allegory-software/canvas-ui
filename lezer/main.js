import {parseMixed, Tree, TreeFragment} from "@lezer/common";
import {ChangeSet, Text} from "@codemirror/state";
import {parser as htmlParser} from "@lezer/html";
import {parser as jsParser} from "@lezer/javascript";
import {parser as cssParser} from "@lezer/css";
import {parser as cppParser} from "@lezer/cpp";
import {parser as mdParser} from "@lezer/markdown";
import {parser as luaParser} from "./lezer-lua/lua-parser.js";

window.Lezer = {
	Tree,
	TreeFragment,
	ChangeSet,
	Text,
	parsers: {
		js:  jsParser,
		css: cssParser,
		cpp: cppParser,
		md:  mdParser,
		lua: luaParser,
		html: htmlParser.configure({
			wrap: parseMixed(node => {
				if (node.name == 'ScriptText') return { parser: jsParser }
				if (node.name == 'StyleText' ) return { parser: cssParser }
			})
		})
	},
};
