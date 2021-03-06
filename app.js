(function() {
  'use strict';

  var globals = typeof window === 'undefined' ? global : window;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};
  var aliases = {};
  var has = ({}).hasOwnProperty;

  var expRe = /^\.\.?(\/|$)/;
  var expand = function(root, name) {
    var results = [], part;
    var parts = (expRe.test(name) ? root + '/' + name : name).split('/');
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function expanded(name) {
      var absolute = expand(dirname(path), name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var hot = null;
    hot = hmr && hmr.createHot(name);
    var module = {id: name, exports: {}, hot: hot};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var expandAlias = function(name) {
    return aliases[name] ? expandAlias(aliases[name]) : name;
  };

  var _resolve = function(name, dep) {
    return expandAlias(expand(dirname(name), dep));
  };

  var require = function(name, loaderPath) {
    if (loaderPath == null) loaderPath = '/';
    var path = expandAlias(name);

    if (has.call(cache, path)) return cache[path].exports;
    if (has.call(modules, path)) return initModule(path, modules[path]);

    throw new Error("Cannot find module '" + name + "' from '" + loaderPath + "'");
  };

  require.alias = function(from, to) {
    aliases[to] = from;
  };

  var extRe = /\.[^.\/]+$/;
  var indexRe = /\/index(\.[^\/]+)?$/;
  var addExtensions = function(bundle) {
    if (extRe.test(bundle)) {
      var alias = bundle.replace(extRe, '');
      if (!has.call(aliases, alias) || aliases[alias].replace(extRe, '') === alias + '/index') {
        aliases[alias] = bundle;
      }
    }

    if (indexRe.test(bundle)) {
      var iAlias = bundle.replace(indexRe, '');
      if (!has.call(aliases, iAlias)) {
        aliases[iAlias] = bundle;
      }
    }
  };

  require.register = require.define = function(bundle, fn) {
    if (typeof bundle === 'object') {
      for (var key in bundle) {
        if (has.call(bundle, key)) {
          require.register(key, bundle[key]);
        }
      }
    } else {
      modules[bundle] = fn;
      delete cache[bundle];
      addExtensions(bundle);
    }
  };

  require.list = function() {
    var list = [];
    for (var item in modules) {
      if (has.call(modules, item)) {
        list.push(item);
      }
    }
    return list;
  };

  var hmr = globals._hmr && new globals._hmr(_resolve, require, modules, cache);
  require._cache = cache;
  require.hmr = hmr && hmr.wrap;
  require.brunch = true;
  globals.require = require;
})();

(function() {
var global = window;
var __makeRelativeRequire = function(require, mappings, pref) {
  var none = {};
  var tryReq = function(name, pref) {
    var val;
    try {
      val = require(pref + '/node_modules/' + name);
      return val;
    } catch (e) {
      if (e.toString().indexOf('Cannot find module') === -1) {
        throw e;
      }

      if (pref.indexOf('node_modules') !== -1) {
        var s = pref.split('/');
        var i = s.lastIndexOf('node_modules');
        var newPref = s.slice(0, i).join('/');
        return tryReq(name, newPref);
      }
    }
    return none;
  };
  return function(name) {
    if (name in mappings) name = mappings[name];
    if (!name) return;
    if (name[0] !== '.' && pref) {
      var val = tryReq(name, pref);
      if (val !== none) return val;
    }
    return require(name);
  }
};

require.register("mithril/api/autoredraw.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

var throttle = require("../api/throttle")

module.exports = function(root, renderer, pubsub, callback) {
	var run = throttle(callback)
	if (renderer != null) {
		renderer.setEventCallback(function(e) {
			if (e.redraw !== false) pubsub.publish()
		})
	}

	if (pubsub != null) {
		if (root.redraw) pubsub.unsubscribe(root.redraw)
		pubsub.subscribe(run)
	}

	return root.redraw = run
}
  })();
});

require.register("mithril/api/mount.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

var Vnode = require("../render/vnode")
var autoredraw = require("../api/autoredraw")

module.exports = function(renderer, pubsub) {
	return function(root, component) {
		if (component === null) {
			renderer.render(root, [])
			pubsub.unsubscribe(root.redraw)
			delete root.redraw
			return
		}
		
		if (component.view == null) throw new Error("m.mount(element, component) expects a component, not a vnode")

		var run = autoredraw(root, renderer, pubsub, function() {
			renderer.render(root, Vnode(component, undefined, undefined, undefined, undefined, undefined))
		})

		run()
	}
}
  })();
});

require.register("mithril/api/pubsub.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

module.exports = function() {
	var callbacks = []
	function unsubscribe(callback) {
		var index = callbacks.indexOf(callback)
		if (index > -1) callbacks.splice(index, 1)
	}
    function publish() {
        for (var i = 0; i < callbacks.length; i++) {
            callbacks[i].apply(this, arguments)
        }
    }
	return {subscribe: callbacks.push.bind(callbacks), unsubscribe: unsubscribe, publish: publish}
}
  })();
});

require.register("mithril/api/router.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

var Vnode = require("../render/vnode")
var coreRouter = require("../router/router")

module.exports = function($window, mount) {
	var router = coreRouter($window)
	var currentResolve, currentComponent, currentRender, currentArgs, currentPath

	var RouteComponent = {view: function() {
		return [currentRender(Vnode(currentComponent, null, currentArgs, undefined, undefined, undefined))]
	}}
	function defaultRender(vnode) {
		return vnode
	}
	var route = function(root, defaultRoute, routes) {
		currentComponent = "div"
		currentRender = defaultRender
		currentArgs = null

		mount(root, RouteComponent)

		router.defineRoutes(routes, function(payload, args, path) {
			var isResolver = typeof payload.view !== "function"
			var render = defaultRender

			var resolve = currentResolve = function (component) {
				if (resolve !== currentResolve) return
				currentResolve = null

				currentComponent = component != null ? component : isResolver ? "div" : payload
				currentRender = render
				currentArgs = args
				currentPath = path

				root.redraw(true)
			}
			var onmatch = function() {
				resolve()
			}
			if (isResolver) {
				if (typeof payload.render === "function") render = payload.render.bind(payload)
				if (typeof payload.onmatch === "function") onmatch = payload.onmatch
			}
		
			onmatch.call(payload, resolve, args, path)
		}, function() {
			router.setPath(defaultRoute, null, {replace: true})
		})
	}
	route.link = router.link
	route.prefix = router.setPrefix
	route.set = router.setPath
	route.get = function() {return currentPath}

	return route
}
  })();
});

require.register("mithril/api/throttle.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

module.exports = function(callback) {
	//60fps translates to 16.6ms, round it down since setTimeout requires int
	var time = 16
	var last = 0, pending = null
	var timeout = typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout
	return function(synchronous) {
		var now = Date.now()
		if (synchronous === true || last === 0 || now - last >= time) {
			last = now
			callback()
		}
		else if (pending === null) {
			pending = timeout(function() {
				pending = null
				callback()
				last = Date.now()
			}, time - (now - last))
		}
	}
}
  })();
});

require.register("mithril/hyperscript.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    var hyperscript = require("./render/hyperscript")

hyperscript.trust = require("./render/trust")
hyperscript.fragment = require("./render/fragment")

module.exports = hyperscript
  })();
});

require.register("mithril/index.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

var m = require("./hyperscript")
var requestService = require("./request")
var redrawService = require("./redraw")

requestService.setCompletionCallback(redrawService.publish)

m.mount = require("./mount")
m.route = require("./route")
m.withAttr = require("./util/withAttr")
m.prop = require("./stream")
m.render = require("./render").render
m.redraw = redrawService.publish
m.request = requestService.request
m.jsonp = requestService.jsonp
m.parseQueryString = require("./querystring/parse")
m.buildQueryString = require("./querystring/build")
m.version = "bleeding-edge"

module.exports = m
  })();
});

require.register("mithril/mount.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    var renderService = require("./render")
var redrawService = require("./redraw")

module.exports = require("./api/mount")(renderService, redrawService)
  })();
});

require.register("mithril/querystring/build.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

module.exports = function(object) {
	if (Object.prototype.toString.call(object) !== "[object Object]") return ""

	var args = []
	for (var key in object) {
		destructure(key, object[key])
	}
	return args.join("&")

	function destructure(key, value) {
		if (value instanceof Array) {
			for (var i = 0; i < value.length; i++) {
				destructure(key + "[" + i + "]", value[i])
			}
		}
		else if (Object.prototype.toString.call(value) === "[object Object]") {
			for (var i in value) {
				destructure(key + "[" + i + "]", value[i])
			}
		}
		else args.push(encodeURIComponent(key) + (value != null && value !== "" ? "=" + encodeURIComponent(value) : ""))
	}
}
  })();
});

require.register("mithril/querystring/parse.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

module.exports = function(string) {
	if (string === "" || string == null) return {}
	if (string.charAt(0) === "?") string = string.slice(1)

	var entries = string.split("&"), data = {}, counters = {}
	for (var i = 0; i < entries.length; i++) {
		var entry = entries[i].split("=")
		var key = decodeURIComponent(entry[0])
		var value = entry.length === 2 ? decodeURIComponent(entry[1]) : ""

		if (value === "true") value = true
		else if (value === "false") value = false

		var levels = key.split(/\]\[?|\[/)
		var cursor = data
		if (key.indexOf("[") > -1) levels.pop()
		for (var j = 0; j < levels.length; j++) {
			var level = levels[j], nextLevel = levels[j + 1]
			var isNumber = nextLevel == "" || !isNaN(parseInt(nextLevel, 10))
			var isValue = j === levels.length - 1
			if (level === "") {
				var key = levels.slice(0, j).join()
				if (counters[key] == null) counters[key] = 0
				level = counters[key]++
			}
			if (cursor[level] == null) {
				cursor[level] = isValue ? value : isNumber ? [] : {}
			}
			cursor = cursor[level]
		}
	}
	return data
}
  })();
});

require.register("mithril/redraw.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    module.exports = require("./api/pubsub")()
  })();
});

require.register("mithril/render.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    module.exports = require("./render/render")(window)
  })();
});

require.register("mithril/render/fragment.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

var Vnode = require("../render/vnode")

module.exports = function(attrs, children) {
	return Vnode("[", attrs.key, attrs, Vnode.normalizeChildren(children), undefined, undefined)
}
  })();
});

require.register("mithril/render/hyperscript.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

var Vnode = require("../render/vnode")

var selectorParser = /(?:(^|#|\.)([^#\.\[\]]+))|(\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\5)?\])/g
var selectorCache = {}
function hyperscript(selector) {
	if (selector == null || typeof selector !== "string" && selector.view == null) {
		throw Error("The selector must be either a string or a component.");
	}

	if (typeof selector === "string" && selectorCache[selector] === undefined) {
		var match, tag, classes = [], attributes = {}
		while (match = selectorParser.exec(selector)) {
			var type = match[1], value = match[2]
			if (type === "" && value !== "") tag = value
			else if (type === "#") attributes.id = value
			else if (type === ".") classes.push(value)
			else if (match[3][0] === "[") {
				var attrValue = match[6]
				if (attrValue) attrValue = attrValue.replace(/\\(["'])/g, "$1").replace(/\\\\/g, "\\")
				attributes[match[4]] = attrValue || true
			}
		}
		if (classes.length > 0) attributes.className = classes.join(" ")
		selectorCache[selector] = function(attrs, children) {
			var hasAttrs = false, childList, text
			var className = attrs.className || attrs.class
			for (var key in attributes) attrs[key] = attributes[key]
			if (className !== undefined) {
				if (attrs.class !== undefined) {
					attrs.class = undefined
					attrs.className = className
				}
				if (attributes.className !== undefined) attrs.className = attributes.className + " " + className
			}
			for (var key in attrs) {
				if (key !== "key") {
					hasAttrs = true
					break
				}
			}
			if (children instanceof Array && children.length == 1 && children[0] != null && children[0].tag === "#") text = children[0].children
			else childList = children

			return Vnode(tag || "div", attrs.key, hasAttrs ? attrs : undefined, childList, text, undefined)
		}
	}
	var attrs, children, childrenIndex
	if (arguments[1] == null || typeof arguments[1] === "object" && arguments[1].tag === undefined && !(arguments[1] instanceof Array)) {
		attrs = arguments[1]
		childrenIndex = 2
	}
	else childrenIndex = 1
	if (arguments.length === childrenIndex + 1) {
		children = arguments[childrenIndex] instanceof Array ? arguments[childrenIndex] : [arguments[childrenIndex]]
	}
	else {
		children = []
		for (var i = childrenIndex; i < arguments.length; i++) children.push(arguments[i])
	}

	if (typeof selector === "string") return selectorCache[selector](attrs || {}, Vnode.normalizeChildren(children))

	return Vnode(selector, attrs && attrs.key, attrs || {}, Vnode.normalizeChildren(children), undefined, undefined)
}

module.exports = hyperscript
  })();
});

require.register("mithril/render/render.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

var Vnode = require("../render/vnode")

module.exports = function($window) {
	var $doc = $window.document
	var $emptyFragment = $doc.createDocumentFragment()

	var onevent
	function setEventCallback(callback) {return onevent = callback}

	//create
	function createNodes(parent, vnodes, start, end, hooks, nextSibling, ns) {
		for (var i = start; i < end; i++) {
			var vnode = vnodes[i]
			if (vnode != null) {
				insertNode(parent, createNode(vnode, hooks, ns), nextSibling)
			}
		}
	}
	function createNode(vnode, hooks, ns) {
		var tag = vnode.tag
		if (vnode.attrs != null) initLifecycle(vnode.attrs, vnode, hooks)
		if (typeof tag === "string") {
			switch (tag) {
				case "#": return createText(vnode)
				case "<": return createHTML(vnode)
				case "[": return createFragment(vnode, hooks, ns)
				default: return createElement(vnode, hooks, ns)
			}
		}
		else return createComponent(vnode, hooks, ns)
	}
	function createText(vnode) {
		return vnode.dom = $doc.createTextNode(vnode.children)
	}
	function createHTML(vnode) {
		var match = vnode.children.match(/^\s*?<(\w+)/im) || []
		var parent = {caption: "table", thead: "table", tbody: "table", tfoot: "table", tr: "tbody", th: "tr", td: "tr", colgroup: "table", col: "colgroup"}[match[1]] || "div"
		var temp = $doc.createElement(parent)

		temp.innerHTML = vnode.children
		vnode.dom = temp.firstChild
		vnode.domSize = temp.childNodes.length
		var fragment = $doc.createDocumentFragment()
		var child
		while (child = temp.firstChild) {
			fragment.appendChild(child)
		}
		return fragment
	}
	function createFragment(vnode, hooks, ns) {
		var fragment = $doc.createDocumentFragment()
		if (vnode.children != null) {
			var children = vnode.children
			createNodes(fragment, children, 0, children.length, hooks, null, ns)
		}
		vnode.dom = fragment.firstChild
		vnode.domSize = fragment.childNodes.length
		return fragment
	}
	function createElement(vnode, hooks, ns) {
		var tag = vnode.tag
		switch (vnode.tag) {
			case "svg": ns = "http://www.w3.org/2000/svg"; break
			case "math": ns = "http://www.w3.org/1998/Math/MathML"; break
		}

		var attrs = vnode.attrs
		var is = attrs && attrs.is

		var element = ns ?
			is ? $doc.createElementNS(ns, tag, {is: is}) : $doc.createElementNS(ns, tag) :
			is ? $doc.createElement(tag, {is: is}) : $doc.createElement(tag)
		vnode.dom = element

		if (attrs != null) {
			setAttrs(vnode, attrs, ns)
		}

		if (vnode.text != null) {
			if (vnode.text !== "") element.textContent = vnode.text
			else vnode.children = [Vnode("#", undefined, undefined, vnode.text, undefined, undefined)]
		}

		if (vnode.children != null) {
			var children = vnode.children
			createNodes(element, children, 0, children.length, hooks, null, ns)
			setLateAttrs(vnode)
		}
		return element
	}
	function createComponent(vnode, hooks, ns) {
		// For object literals since `Vnode()` always sets the `state` field.
		if (!vnode.state) vnode.state = {}
		assign(vnode.state, vnode.tag)

		initLifecycle(vnode.tag, vnode, hooks)
		vnode.instance = Vnode.normalize(vnode.tag.view.call(vnode.state, vnode))
		if (vnode.instance != null) {
			if (vnode.instance === vnode) throw Error("A view cannot return the vnode it received as arguments")
			var element = createNode(vnode.instance, hooks, ns)
			vnode.dom = vnode.instance.dom
			vnode.domSize = vnode.dom != null ? vnode.instance.domSize : 0
			return element
		}
		else {
			vnode.domSize = 0
			return $emptyFragment
		}
	}

	//update
	function updateNodes(parent, old, vnodes, hooks, nextSibling, ns) {
		if (old === vnodes || old == null && vnodes == null) return
		else if (old == null) createNodes(parent, vnodes, 0, vnodes.length, hooks, nextSibling, undefined)
		else if (vnodes == null) removeNodes(parent, old, 0, old.length, vnodes)
		else {
			var recycling = isRecyclable(old, vnodes)
			if (recycling) old = old.concat(old.pool)

			if (old.length === vnodes.length && vnodes[0] != null && vnodes[0].key == null) {
				for (var i = 0; i < old.length; i++) {
					if (old[i] === vnodes[i] || old[i] == null && vnodes[i] == null) continue
					else if (old[i] == null) insertNode(parent, createNode(vnodes[i], hooks, ns), getNextSibling(old, i + 1, nextSibling))
					else if (vnodes[i] == null) removeNodes(parent, old, i, i + 1, vnodes)
					else updateNode(parent, old[i], vnodes[i], hooks, getNextSibling(old, i + 1, nextSibling), recycling, ns)
					if (recycling && old[i].tag === vnodes[i].tag) insertNode(parent, toFragment(old[i]), getNextSibling(old, i + 1, nextSibling))
				}
			}
			else {
				var oldStart = 0, start = 0, oldEnd = old.length - 1, end = vnodes.length - 1, map
				while (oldEnd >= oldStart && end >= start) {
					var o = old[oldStart], v = vnodes[start]
					if (o === v && !recycling) oldStart++, start++
					else if (o != null && v != null && o.key === v.key) {
						oldStart++, start++
						updateNode(parent, o, v, hooks, getNextSibling(old, oldStart, nextSibling), recycling, ns)
						if (recycling && o.tag === v.tag) insertNode(parent, toFragment(o), nextSibling)
					}
					else {
						var o = old[oldEnd]
						if (o === v && !recycling) oldEnd--, start++
						else if (o != null && v != null && o.key === v.key) {
							updateNode(parent, o, v, hooks, getNextSibling(old, oldEnd + 1, nextSibling), recycling, ns)
							if (recycling || start < end) insertNode(parent, toFragment(o), getNextSibling(old, oldStart, nextSibling))
							oldEnd--, start++
						}
						else break
					}
				}
				while (oldEnd >= oldStart && end >= start) {
					var o = old[oldEnd], v = vnodes[end]
					if (o === v && !recycling) oldEnd--, end--
					else if (o != null && v != null && o.key === v.key) {
						updateNode(parent, o, v, hooks, getNextSibling(old, oldEnd + 1, nextSibling), recycling, ns)
						if (recycling && o.tag === v.tag) insertNode(parent, toFragment(o), nextSibling)
						if (o.dom != null) nextSibling = o.dom
						oldEnd--, end--
					}
					else {
						if (!map) map = getKeyMap(old, oldEnd)
						if (v != null) {
							var oldIndex = map[v.key]
							if (oldIndex != null) {
								var movable = old[oldIndex]
								updateNode(parent, movable, v, hooks, getNextSibling(old, oldEnd + 1, nextSibling), recycling, ns)
								insertNode(parent, toFragment(movable), nextSibling)
								old[oldIndex].skip = true
								if (movable.dom != null) nextSibling = movable.dom
							}
							else {
								var dom = createNode(v, hooks, undefined)
								insertNode(parent, dom, nextSibling)
								nextSibling = dom
							}
						}
						end--
					}
					if (end < start) break
				}
				createNodes(parent, vnodes, start, end + 1, hooks, nextSibling, ns)
				removeNodes(parent, old, oldStart, oldEnd + 1, vnodes)
			}
		}
	}
	function updateNode(parent, old, vnode, hooks, nextSibling, recycling, ns) {
		var oldTag = old.tag, tag = vnode.tag
		if (oldTag === tag) {
			vnode.state = old.state
			vnode.events = old.events
			if (shouldUpdate(vnode, old)) return
			if (vnode.attrs != null) {
				updateLifecycle(vnode.attrs, vnode, hooks, recycling)
			}
			if (typeof oldTag === "string") {
				switch (oldTag) {
					case "#": updateText(old, vnode); break
					case "<": updateHTML(parent, old, vnode, nextSibling); break
					case "[": updateFragment(parent, old, vnode, hooks, nextSibling, ns); break
					default: updateElement(old, vnode, hooks, ns)
				}
			}
			else updateComponent(parent, old, vnode, hooks, nextSibling, recycling, ns)
		}
		else {
			removeNode(parent, old, null)
			insertNode(parent, createNode(vnode, hooks, undefined), nextSibling)
		}
	}
	function updateText(old, vnode) {
		if (old.children.toString() !== vnode.children.toString()) {
			old.dom.nodeValue = vnode.children
		}
		vnode.dom = old.dom
	}
	function updateHTML(parent, old, vnode, nextSibling) {
		if (old.children !== vnode.children) {
			toFragment(old)
			insertNode(parent, createHTML(vnode), nextSibling)
		}
		else vnode.dom = old.dom, vnode.domSize = old.domSize
	}
	function updateFragment(parent, old, vnode, hooks, nextSibling, ns) {
		updateNodes(parent, old.children, vnode.children, hooks, nextSibling, ns)
		var domSize = 0, children = vnode.children
		vnode.dom = null
		if (children != null) {
			for (var i = 0; i < children.length; i++) {
				var child = children[i]
				if (child != null && child.dom != null) {
					if (vnode.dom == null) vnode.dom = child.dom
					domSize += child.domSize || 1
				}
			}
			if (domSize !== 1) vnode.domSize = domSize
		}
	}
	function updateElement(old, vnode, hooks, ns) {
		var element = vnode.dom = old.dom
		switch (vnode.tag) {
			case "svg": ns = "http://www.w3.org/2000/svg"; break
			case "math": ns = "http://www.w3.org/1998/Math/MathML"; break
		}
		if (vnode.tag === "textarea") {
			if (vnode.attrs == null) vnode.attrs = {}
			if (vnode.text != null) {
				vnode.attrs.value = vnode.text //FIXME handle multiple children
				vnode.text = undefined
			}
		}
		updateAttrs(vnode, old.attrs, vnode.attrs, ns)
		if (old.text != null && vnode.text != null && vnode.text !== "") {
			if (old.text.toString() !== vnode.text.toString()) old.dom.firstChild.nodeValue = vnode.text
		}
		else {
			if (old.text != null) old.children = [Vnode("#", undefined, undefined, old.text, undefined, old.dom.firstChild)]
			if (vnode.text != null) vnode.children = [Vnode("#", undefined, undefined, vnode.text, undefined, undefined)]
			updateNodes(element, old.children, vnode.children, hooks, null, ns)
		}
	}
	function updateComponent(parent, old, vnode, hooks, nextSibling, recycling, ns) {
		vnode.instance = Vnode.normalize(vnode.tag.view.call(vnode.state, vnode))
		updateLifecycle(vnode.tag, vnode, hooks, recycling)
		if (vnode.instance != null) {
			if (old.instance == null) insertNode(parent, createNode(vnode.instance, hooks, ns), nextSibling)
			else updateNode(parent, old.instance, vnode.instance, hooks, nextSibling, recycling, ns)
			vnode.dom = vnode.instance.dom
			vnode.domSize = vnode.instance.domSize
		}
		else if (old.instance != null) {
			removeNode(parent, old.instance, null)
			vnode.dom = undefined
			vnode.domSize = 0
		}
		else {
			vnode.dom = old.dom
			vnode.domSize = old.domSize
		}
	}
	function isRecyclable(old, vnodes) {
		if (old.pool != null && Math.abs(old.pool.length - vnodes.length) <= Math.abs(old.length - vnodes.length)) {
			var oldChildrenLength = old[0] && old[0].children && old[0].children.length || 0
			var poolChildrenLength = old.pool[0] && old.pool[0].children && old.pool[0].children.length || 0
			var vnodesChildrenLength = vnodes[0] && vnodes[0].children && vnodes[0].children.length || 0
			if (Math.abs(poolChildrenLength - vnodesChildrenLength) <= Math.abs(oldChildrenLength - vnodesChildrenLength)) {
				return true
			}
		}
		return false
	}
	function getKeyMap(vnodes, end) {
		var map = {}, i = 0
		for (var i = 0; i < end; i++) {
			var vnode = vnodes[i]
			if (vnode != null) {
				var key = vnode.key
				if (key != null) map[key] = i
			}
		}
		return map
	}
	function toFragment(vnode) {
		var count = vnode.domSize
		if (count != null || vnode.dom == null) {
			var fragment = $doc.createDocumentFragment()
			if (count > 0) {
				var dom = vnode.dom
				while (--count) fragment.appendChild(dom.nextSibling)
				fragment.insertBefore(dom, fragment.firstChild)
			}
			return fragment
		}
		else return vnode.dom
	}
	function getNextSibling(vnodes, i, nextSibling) {
		for (; i < vnodes.length; i++) {
			if (vnodes[i] != null && vnodes[i].dom != null) return vnodes[i].dom
		}
		return nextSibling
	}

	function insertNode(parent, dom, nextSibling) {
		if (nextSibling && nextSibling.parentNode) parent.insertBefore(dom, nextSibling)
		else parent.appendChild(dom)
	}

	//remove
	function removeNodes(parent, vnodes, start, end, context) {
		for (var i = start; i < end; i++) {
			var vnode = vnodes[i]
			if (vnode != null) {
				if (vnode.skip) vnode.skip = false
				else removeNode(parent, vnode, context)
			}
		}
	}
	function once(f) {
		var called = false
		return function() {
			if (!called) {
				called = true
				f()
			}
		}
	}
	function removeNode(parent, vnode, context) {
		var expected = 1, called = 0
		if (vnode.attrs && vnode.attrs.onbeforeremove) {
			expected++
			vnode.attrs.onbeforeremove.call(vnode.state, vnode, once(continuation))
		}
		if (typeof vnode.tag !== "string" && vnode.tag.onbeforeremove) {
			expected++
			vnode.tag.onbeforeremove.call(vnode.state, vnode, once(continuation))
		}
		continuation()
		function continuation() {
			if (++called === expected) {
				onremove(vnode)
				if (vnode.dom) {
					var count = vnode.domSize || 1
					if (count > 1) {
						var dom = vnode.dom
						while (--count) {
							parent.removeChild(dom.nextSibling)
						}
					}
					if (vnode.dom.parentNode != null) parent.removeChild(vnode.dom)
					if (context != null && vnode.domSize == null && !hasIntegrationMethods(vnode.attrs) && typeof vnode.tag === "string") { //TODO test custom elements
						if (!context.pool) context.pool = [vnode]
						else context.pool.push(vnode)
					}
				}
			}
		}
	}
	function onremove(vnode) {
		if (vnode.attrs && vnode.attrs.onremove) vnode.attrs.onremove.call(vnode.state, vnode)
		if (typeof vnode.tag !== "string" && vnode.tag.onremove) vnode.tag.onremove.call(vnode.state, vnode)
		if (vnode.instance != null) onremove(vnode.instance)
		else {
			var children = vnode.children
			if (children instanceof Array) {
				for (var i = 0; i < children.length; i++) {
					var child = children[i]
					if (child != null) onremove(child)
				}
			}
		}
	}

	//attrs
	function setAttrs(vnode, attrs, ns) {
		for (var key in attrs) {
			setAttr(vnode, key, null, attrs[key], ns)
		}
	}
	function setAttr(vnode, key, old, value, ns) {
		var element = vnode.dom
		if (key === "key" || (old === value && !isFormAttribute(vnode, key)) && typeof value !== "object" || typeof value === "undefined" || isLifecycleMethod(key)) return
		var nsLastIndex = key.indexOf(":")
		if (nsLastIndex > -1 && key.substr(0, nsLastIndex) === "xlink") {
			element.setAttributeNS("http://www.w3.org/1999/xlink", key.slice(nsLastIndex + 1), value)
		}
		else if (key[0] === "o" && key[1] === "n" && typeof value === "function") updateEvent(vnode, key, value)
		else if (key === "style") updateStyle(element, old, value)
		else if (key in element && !isAttribute(key) && ns === undefined) {
			//setting input[value] to same value by typing on focused element moves cursor to end in Chrome
			if (vnode.tag === "input" && key === "value" && vnode.dom.value === value && vnode.dom === $doc.activeElement) return
			element[key] = value
		}
		else {
			if (typeof value === "boolean") {
				if (value) element.setAttribute(key, "")
				else element.removeAttribute(key)
			}
			else element.setAttribute(key === "className" ? "class" : key, value)
		}
	}
	function setLateAttrs(vnode) {
		var attrs = vnode.attrs
		if (vnode.tag === "select" && attrs != null) {
			if ("value" in attrs) setAttr(vnode, "value", null, attrs.value, undefined)
			if ("selectedIndex" in attrs) setAttr(vnode, "selectedIndex", null, attrs.selectedIndex, undefined)
		}
	}
	function updateAttrs(vnode, old, attrs, ns) {
		if (attrs != null) {
			for (var key in attrs) {
				setAttr(vnode, key, old && old[key], attrs[key], ns)
			}
		}
		if (old != null) {
			for (var key in old) {
				if (attrs == null || !(key in attrs)) {
					if (key === "className") key = "class"
					if (key[0] === "o" && key[1] === "n" && !isLifecycleMethod(key)) updateEvent(vnode, key, undefined)
					else if (key !== "key") vnode.dom.removeAttribute(key)
				}
			}
		}
	}
	function isFormAttribute(vnode, attr) {
		return attr === "value" || attr === "checked" || attr === "selectedIndex" || attr === "selected" && vnode.dom === $doc.activeElement
	}
	function isLifecycleMethod(attr) {
		return attr === "oninit" || attr === "oncreate" || attr === "onupdate" || attr === "onremove" || attr === "onbeforeremove" || attr === "onbeforeupdate"
	}
	function isAttribute(attr) {
		return attr === "href" || attr === "list" || attr === "form" || attr === "width" || attr === "height"// || attr === "type"
	}
	function hasIntegrationMethods(source) {
		return source != null && (source.oncreate || source.onupdate || source.onbeforeremove || source.onremove)
	}

	//style
	function updateStyle(element, old, style) {
		if (old === style) element.style.cssText = "", old = null
		if (style == null) element.style.cssText = ""
		else if (typeof style === "string") element.style.cssText = style
		else {
			if (typeof old === "string") element.style.cssText = ""
			for (var key in style) {
				element.style[key] = style[key]
			}
			if (old != null && typeof old !== "string") {
				for (var key in old) {
					if (!(key in style)) element.style[key] = ""
				}
			}
		}
	}

	//event
	function updateEvent(vnode, key, value) {
		var element = vnode.dom
		var callback = function(e) {
			var result = value.call(element, e)
			if (typeof onevent === "function") onevent.call(element, e)
			return result
		}
		if (key in element) element[key] = callback
		else {
			var eventName = key.slice(2)
			if (vnode.events === undefined) vnode.events = {}
			if (vnode.events[key] != null) element.removeEventListener(eventName, vnode.events[key], false)
			if (typeof value === "function") {
				vnode.events[key] = callback
				element.addEventListener(eventName, vnode.events[key], false)
			}
		}
	}

	//lifecycle
	function initLifecycle(source, vnode, hooks) {
		if (typeof source.oninit === "function") source.oninit.call(vnode.state, vnode)
		if (typeof source.oncreate === "function") hooks.push(source.oncreate.bind(vnode.state, vnode))
	}
	function updateLifecycle(source, vnode, hooks, recycling) {
		if (recycling) initLifecycle(source, vnode, hooks)
		else if (typeof source.onupdate === "function") hooks.push(source.onupdate.bind(vnode.state, vnode))
	}
	function shouldUpdate(vnode, old) {
		var forceVnodeUpdate, forceComponentUpdate
		if (vnode.attrs != null && typeof vnode.attrs.onbeforeupdate === "function") forceVnodeUpdate = vnode.attrs.onbeforeupdate.call(vnode.state, vnode, old)
		if (typeof vnode.tag !== "string" && typeof vnode.tag.onbeforeupdate === "function") forceComponentUpdate = vnode.tag.onbeforeupdate.call(vnode.state, vnode, old)
		if (!(forceVnodeUpdate === undefined && forceComponentUpdate === undefined) && !forceVnodeUpdate && !forceComponentUpdate) {
			vnode.dom = old.dom
			vnode.domSize = old.domSize
			vnode.instance = old.instance
			return true
		}
		return false
	}

	function assign(target, source) {
		Object.keys(source).forEach(function(k){target[k] = source[k]})
	}

	function render(dom, vnodes) {
		if (!dom) throw new Error("Ensure the DOM element being passed to m.route/m.mount/m.render is not undefined.")
		var hooks = []
		var active = $doc.activeElement

		// First time rendering into a node clears it out
		if (dom.vnodes == null) dom.textContent = ""

		if (!(vnodes instanceof Array)) vnodes = [vnodes]
		updateNodes(dom, dom.vnodes, Vnode.normalizeChildren(vnodes), hooks, null, undefined)
		dom.vnodes = vnodes
		for (var i = 0; i < hooks.length; i++) hooks[i]()
		if ($doc.activeElement !== active) active.focus()
	}

	return {render: render, setEventCallback: setEventCallback}
}
  })();
});

require.register("mithril/render/trust.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

var Vnode = require("../render/vnode")

module.exports = function(html) {
	if (html == null) html = ""
	return Vnode("<", undefined, undefined, html, undefined, undefined)
}
  })();
});

require.register("mithril/render/vnode.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    function Vnode(tag, key, attrs, children, text, dom) {
	return {tag: tag, key: key, attrs: attrs, children: children, text: text, dom: dom, domSize: undefined, state: {}, events: undefined, instance: undefined, skip: false}
}
Vnode.normalize = function(node) {
	if (node instanceof Array) return Vnode("[", undefined, undefined, Vnode.normalizeChildren(node), undefined, undefined)
	if (node != null && typeof node !== "object") return Vnode("#", undefined, undefined, node, undefined, undefined)
	return node
}
Vnode.normalizeChildren = function normalizeChildren(children) {
	for (var i = 0; i < children.length; i++) {
		children[i] = Vnode.normalize(children[i])
	}
	return children
}

module.exports = Vnode
  })();
});

require.register("mithril/request.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    var Stream = require("./stream")
module.exports = require("./request/request")(window, Stream)
  })();
});

require.register("mithril/request/request.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

var buildQueryString = require("../querystring/build")

module.exports = function($window, Stream) {
	var callbackCount = 0

	var oncompletion
	function setCompletionCallback(callback) {oncompletion = callback}
	
	function request(args) {
		var stream = Stream()
		if (args.initialValue !== undefined) stream(args.initialValue)
		
		var useBody = typeof args.useBody === "boolean" ? args.useBody : args.method !== "GET" && args.method !== "TRACE"
		
		if (typeof args.serialize !== "function") args.serialize = typeof FormData !== "undefined" && args.data instanceof FormData ? function(value) {return value} : JSON.stringify
		if (typeof args.deserialize !== "function") args.deserialize = deserialize
		if (typeof args.extract !== "function") args.extract = extract
		
		args.url = interpolate(args.url, args.data)
		if (useBody) args.data = args.serialize(args.data)
		else args.url = assemble(args.url, args.data)
		
		var xhr = new $window.XMLHttpRequest()
		xhr.open(args.method, args.url, typeof args.async === "boolean" ? args.async : true, typeof args.user === "string" ? args.user : undefined, typeof args.password === "string" ? args.password : undefined)
		
		if (args.serialize === JSON.stringify && useBody) {
			xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8")
		}
		if (args.deserialize === deserialize) {
			xhr.setRequestHeader("Accept", "application/json, text/*")
		}
		
		if (typeof args.config === "function") xhr = args.config(xhr, args) || xhr
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				try {
					var response = (args.extract !== extract) ? args.extract(xhr, args) : args.deserialize(args.extract(xhr, args))
					if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
						stream(cast(args.type, response))
					}
					else {
						var error = new Error(xhr.responseText)
						for (var key in response) error[key] = response[key]
						stream.error(error)
					}
				}
				catch (e) {
					stream.error(e)
				}
				if (typeof oncompletion === "function") oncompletion()
			}
		}
		
		if (useBody) xhr.send(args.data)
		else xhr.send()
		
		return stream
	}

	function jsonp(args) {
		var stream = Stream()
		if (args.initialValue !== undefined) stream(args.initialValue)
		
		var callbackName = args.callbackName || "_mithril_" + Math.round(Math.random() * 1e16) + "_" + callbackCount++
		var script = $window.document.createElement("script")
		$window[callbackName] = function(data) {
			script.parentNode.removeChild(script)
			stream(cast(args.type, data))
			if (typeof oncompletion === "function") oncompletion()
			delete $window[callbackName]
		}
		script.onerror = function() {
			script.parentNode.removeChild(script)
			stream.error(new Error("JSONP request failed"))
			if (typeof oncompletion === "function") oncompletion()
			delete $window[callbackName]
		}
		if (args.data == null) args.data = {}
		args.url = interpolate(args.url, args.data)
		args.data[args.callbackKey || "callback"] = callbackName
		script.src = assemble(args.url, args.data)
		$window.document.documentElement.appendChild(script)
		return stream
	}

	function interpolate(url, data) {
		if (data == null) return url

		var tokens = url.match(/:[^\/]+/gi) || []
		for (var i = 0; i < tokens.length; i++) {
			var key = tokens[i].slice(1)
			if (data[key] != null) {
				url = url.replace(tokens[i], data[key])
				delete data[key]
			}
		}
		return url
	}

	function assemble(url, data) {
		var querystring = buildQueryString(data)
		if (querystring !== "") {
			var prefix = url.indexOf("?") < 0 ? "?" : "&"
			url += prefix + querystring
		}
		return url
	}

	function deserialize(data) {
		try {return data !== "" ? JSON.parse(data) : null}
		catch (e) {throw new Error(data)}
	}

	function extract(xhr) {return xhr.responseText}
	
	function cast(type, data) {
		if (typeof type === "function") {
			if (data instanceof Array) {
				for (var i = 0; i < data.length; i++) {
					data[i] = new type(data[i])
				}
			}
			else return new type(data)
		}
		return data
	}
	
	return {request: request, jsonp: jsonp, setCompletionCallback: setCompletionCallback}
}
  })();
});

require.register("mithril/route.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    var mount = require("./mount")

module.exports = require("./api/router")(window, mount)
  })();
});

require.register("mithril/router/router.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

var buildQueryString = require("../querystring/build")
var parseQueryString = require("../querystring/parse")

module.exports = function($window) {
	var supportsPushState = typeof $window.history.pushState === "function"
	var callAsync = typeof setImmediate === "function" ? setImmediate : setTimeout

	var prefix = "#!"
	function setPrefix(value) {prefix = value}

	function normalize(fragment) {
		var data = $window.location[fragment].replace(/(?:%[a-f89][a-f0-9])+/gim, decodeURIComponent)
		if (fragment === "pathname" && data[0] !== "/") data = "/" + data
		return data
	}

	var asyncId
	function debounceAsync(f) {
		return function() {
			if (asyncId != null) return
			asyncId = callAsync(function() {
				asyncId = null
				f()
			})

		}
	}

	function parsePath(path, queryData, hashData) {
		var queryIndex = path.indexOf("?")
		var hashIndex = path.indexOf("#")
		var pathEnd = queryIndex > -1 ? queryIndex : hashIndex > -1 ? hashIndex : path.length
		if (queryIndex > -1) {
			var queryEnd = hashIndex > -1 ? hashIndex : path.length
			var queryParams = parseQueryString(path.slice(queryIndex + 1, queryEnd))
			for (var key in queryParams) queryData[key] = queryParams[key]
		}
		if (hashIndex > -1) {
			var hashParams = parseQueryString(path.slice(hashIndex + 1))
			for (var key in hashParams) hashData[key] = hashParams[key]
		}
		return path.slice(0, pathEnd)
	}

	function getPath() {
		var type = prefix.charAt(0)
		switch (type) {
			case "#": return normalize("hash").slice(prefix.length)
			case "?": return normalize("search").slice(prefix.length) + normalize("hash")
			default: return normalize("pathname").slice(prefix.length) + normalize("search") + normalize("hash")
		}
	}

	function setPath(path, data, options) {
		var queryData = {}, hashData = {}
		path = parsePath(path, queryData, hashData)
		if (data != null) {
			for (var key in data) queryData[key] = data[key]
			path = path.replace(/:([^\/]+)/g, function(match, token) {
				delete queryData[token]
				return data[token]
			})
		}

		var query = buildQueryString(queryData)
		if (query) path += "?" + query

		var hash = buildQueryString(hashData)
		if (hash) path += "#" + hash

		if (supportsPushState) {
			if (options && options.replace) $window.history.replaceState(null, null, prefix + path)
			else $window.history.pushState(null, null, prefix + path)
			$window.onpopstate()
		}
		else $window.location.href = prefix + path
	}

	function defineRoutes(routes, resolve, reject) {
		if (supportsPushState) $window.onpopstate = debounceAsync(resolveRoute)
		else if (prefix.charAt(0) === "#") $window.onhashchange = resolveRoute
		resolveRoute()
		
		function resolveRoute() {
			var path = getPath()
			var params = {}
			var pathname = parsePath(path, params, params)
			
			for (var route in routes) {
				var matcher = new RegExp("^" + route.replace(/:[^\/]+?\.{3}/g, "(.*?)").replace(/:[^\/]+/g, "([^\\/]+)") + "\/?$")

				if (matcher.test(pathname)) {
					pathname.replace(matcher, function() {
						var keys = route.match(/:[^\/]+/g) || []
						var values = [].slice.call(arguments, 1, -2)
						for (var i = 0; i < keys.length; i++) {
							params[keys[i].replace(/:|\./g, "")] = decodeURIComponent(values[i])
						}
						resolve(routes[route], params, path, route)
					})
					return
				}
			}

			reject(path, params)
		}
		return resolveRoute
	}

	function link(vnode) {
		vnode.dom.setAttribute("href", prefix + vnode.attrs.href)
		vnode.dom.onclick = function(e) {
			if (e.ctrlKey || e.metaKey || e.shiftKey || e.which === 2) return
			e.preventDefault()
			e.redraw = false
			var href = this.getAttribute("href")
			if (href.indexOf(prefix) === 0) href = href.slice(prefix.length)
			setPath(href, undefined, undefined)
		}
	}

	return {setPrefix: setPrefix, getPath: getPath, setPath: setPath, defineRoutes: defineRoutes, link: link}
}
  })();
});

require.register("mithril/stream.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    module.exports = require("./util/stream")(console.log.bind(console))
  })();
});

require.register("mithril/util/stream.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

module.exports = function(log) {
	var guid = 0, noop = function() {}, HALT = {}
	function createStream() {
		function stream() {
			if (arguments.length > 0 && arguments[0] !== HALT) updateStream(stream, arguments[0], undefined)
			return stream._state.value
		}
		initStream(stream)

		if (arguments.length > 0 && arguments[0] !== HALT) updateStream(stream, arguments[0], undefined)

		return stream
	}
	function initStream(stream) {
		stream.constructor = createStream
		stream._state = {id: guid++, value: undefined, error: undefined, state: 0, derive: undefined, recover: undefined, deps: {}, parents: [], errorStream: undefined, endStream: undefined}
		stream["fantasy-land/map"] = map, stream["fantasy-land/ap"] = ap, stream["fantasy-land/of"] = createStream
		stream.valueOf = valueOf, stream.toJSON = toJSON, stream.toString = valueOf
		stream.run = run, stream.catch = doCatch

		Object.defineProperties(stream, {
			error: {get: function() {
				if (!stream._state.errorStream) {
					var errorStream = function() {
						if (arguments.length > 0 && arguments[0] !== HALT) updateStream(stream, undefined, arguments[0])
						return stream._state.error
					}
					initStream(errorStream)
					initDependency(errorStream, [stream], noop, noop)
					stream._state.errorStream = errorStream
				}
				return stream._state.errorStream
			}},
			end: {get: function() {
				if (!stream._state.endStream) {
					var endStream = createStream()
					endStream["fantasy-land/map"](function(value) {
						if (value === true) unregisterStream(stream), unregisterStream(endStream)
						return value
					})
					stream._state.endStream = endStream
				}
				return stream._state.endStream
			}}
		})
	}
	function updateStream(stream, value, error) {
		updateState(stream, value, error)
		for (var id in stream._state.deps) updateDependency(stream._state.deps[id], false)
		finalize(stream)
	}
	function updateState(stream, value, error) {
		error = unwrapError(value, error)
		if (error !== undefined && typeof stream._state.recover === "function") {
			if (!resolve(stream, updateValues, true)) return
		}
		else updateValues(stream, value, error)
		stream._state.changed = true
		if (stream._state.state !== 2) stream._state.state = 1
	}
	function updateValues(stream, value, error) {
		stream._state.value = value
		stream._state.error = error
	}
	function updateDependency(stream, mustSync) {
		var state = stream._state, parents = state.parents
		if (parents.length > 0 && parents.filter(active).length === parents.length && (mustSync || parents.filter(changed).length > 0)) {
			var failed = parents.filter(errored)
			if (failed.length > 0) updateState(stream, undefined, failed[0]._state.error)
			else resolve(stream, updateState, false)
		}
	}
	function resolve(stream, update, shouldRecover) {
		try {
			var value = shouldRecover ? stream._state.recover() : stream._state.derive()
			if (value === HALT) return false
			update(stream, value, undefined)
		}
		catch (e) {
			update(stream, undefined, e.__error != null ? e.__error : e)
			if (e.__error == null) reportUncaughtError(stream, e)
		}
		return true
	}
	function unwrapError(value, error) {
		if (value != null && value.constructor === createStream) {
			if (value._state.error !== undefined) error = value._state.error
			else error = unwrapError(value._state.value, value._state.error)
		}
		return error
	}
	function finalize(stream) {
		stream._state.changed = false
		for (var id in stream._state.deps) stream._state.deps[id]._state.changed = false
	}
	function reportUncaughtError(stream, e) {
		if (Object.keys(stream._state.deps).length === 0) {
			setTimeout(function() {
				if (Object.keys(stream._state.deps).length === 0) log(e)
			}, 0)
		}
	}

	function run(fn) {
		var self = createStream(), stream = this
		return initDependency(self, [stream], function() {
			return absorb(self, fn(stream()))
		}, undefined)
	}
	function doCatch(fn) {
		var self = createStream(), stream = this
		var derive = function() {return stream._state.value}
		var recover = function() {return absorb(self, fn(stream._state.error))}
		return initDependency(self, [stream], derive, recover)
	}
	function combine(fn, streams) {
		if (streams.length > streams.filter(valid).length) throw new Error("Ensure that each item passed to m.prop.combine/m.prop.merge is a stream")
		return initDependency(createStream(), streams, function() {
			var failed = streams.filter(errored)
			if (failed.length > 0) throw {__error: failed[0]._state.error}
			return fn.apply(this, streams.concat([streams.filter(changed)]))
		}, undefined)
	}
	function absorb(stream, value) {
		if (value != null && value.constructor === createStream) {
			var absorbable = value
			var update = function() {
				updateState(stream, absorbable._state.value, absorbable._state.error)
				for (var id in stream._state.deps) updateDependency(stream._state.deps[id], false)
			}
			absorbable["fantasy-land/map"](update).catch(function(e) {
				update()
				throw {__error: e}
			})
			
			if (absorbable._state.state === 0) return HALT
			if (absorbable._state.error) throw {__error: absorbable._state.error}
			value = absorbable._state.value
		}
		return value
	}

	function initDependency(dep, streams, derive, recover) {
		var state = dep._state
		state.derive = derive
		state.recover = recover
		state.parents = streams.filter(notEnded)

		registerDependency(dep, state.parents)
		updateDependency(dep, true)

		return dep
	}
	function registerDependency(stream, parents) {
		for (var i = 0; i < parents.length; i++) {
			parents[i]._state.deps[stream._state.id] = stream
			registerDependency(stream, parents[i]._state.parents)
		}
	}
	function unregisterStream(stream) {
		for (var i = 0; i < stream._state.parents.length; i++) {
			var parent = stream._state.parents[i]
			delete parent._state.deps[stream._state.id]
		}
		for (var id in stream._state.deps) {
			var dependent = stream._state.deps[id]
			var index = dependent._state.parents.indexOf(stream)
			if (index > -1) dependent._state.parents.splice(index, 1)
		}
		stream._state.state = 2 //ended
		stream._state.deps = {}
	}

	function map(fn) {return combine(function(stream) {return fn(stream())}, [this])}
	function ap(stream) {return combine(function(s1, s2) {return s1()(s2())}, [stream, this])}
	function valueOf() {return this._state.value}
	function toJSON() {return this._state.value != null && typeof this._state.value.toJSON === "function" ? this._state.value.toJSON() : this._state.value}

	function valid(stream) {return stream._state }
	function active(stream) {return stream._state.state === 1}
	function changed(stream) {return stream._state.changed}
	function notEnded(stream) {return stream._state.state !== 2}
	function errored(stream) {return stream._state.error}

	function reject(e) {
		var stream = createStream()
		stream.error(e)
		return stream
	}

	function merge(streams) {
		return combine(function () {
			return streams.map(function(s) {return s()})
		}, streams)
	}
	createStream["fantasy-land/of"] = createStream
	createStream.merge = merge
	createStream.combine = combine
	createStream.reject = reject
	createStream.HALT = HALT

	return createStream
}
  })();
});

require.register("mithril/util/withAttr.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "mithril");
  (function() {
    "use strict"

module.exports = function(attrName, callback, context) {
	return function(e) {
		return callback.call(context || this, attrName in e.currentTarget ? e.currentTarget[attrName] : e.currentTarget.getAttribute(attrName))
	}
}
  })();
});
require.register("app.ts", function(exports, require, module) {
"use strict";
var m = require('mithril');
var LayoutComponent = {
    view: function () {
        return m('.layout', m('header', m('h1.title', 'Heracles')), m('.content', m('a.button', { href: '#/entrainement' }, m('span.text', 'Entrainement')), m('a.button', { href: '#/mensurations' }, m('span.text', 'Mensurations'))));
    }
};
var MensurationsDashboard = {
    view: function () {
        return m('.layout', m('header.accent', m('.leftActions', m('a', { href: '#/' }, m('span', 'Retour'))), m('h1.title', 'Mensurations'), m('.rightActions', [])), m('.content', null));
    }
};
var EntrainementDashboard = {
    view: function () {
        return m('.layout', m('header.accent', m('.leftActions', m('a', { href: '#/' }, m('span', 'Retour'))), m('h1.title', 'Entrainement'), m('.rightActions', [])), m('.content', m('.hero', m('h2', 'Entraînement'))));
    }
};
m.route.prefix('#');
m.route(document.getElementById('app'), '/', {
    '/': LayoutComponent,
    '/entrainement': EntrainementDashboard,
    '/mensurations': MensurationsDashboard
});
//# sourceMappingURL=app.js.map
});

;require.register("something.ts", function(exports, require, module) {
"use strict";
var Dog = (function () {
    function Dog(name) {
        this.name = name;
    }
    return Dog;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Dog;
//# sourceMappingURL=something.js.map
});

require.register("___globals___", function(exports, require, module) {
  
});})();require('___globals___');

/* jshint ignore:start */
(function() {
  var WebSocket = window.WebSocket || window.MozWebSocket;
  var br = window.brunch = (window.brunch || {});
  var ar = br['auto-reload'] = (br['auto-reload'] || {});
  if (!WebSocket || ar.disabled) return;
  if (window._ar) return;
  window._ar = true;

  var cacheBuster = function(url){
    var date = Math.round(Date.now() / 1000).toString();
    url = url.replace(/(\&|\\?)cacheBuster=\d*/, '');
    return url + (url.indexOf('?') >= 0 ? '&' : '?') +'cacheBuster=' + date;
  };

  var browser = navigator.userAgent.toLowerCase();
  var forceRepaint = ar.forceRepaint || browser.indexOf('chrome') > -1;

  var reloaders = {
    page: function(){
      window.location.reload(true);
    },

    stylesheet: function(){
      [].slice
        .call(document.querySelectorAll('link[rel=stylesheet]'))
        .filter(function(link) {
          var val = link.getAttribute('data-autoreload');
          return link.href && val != 'false';
        })
        .forEach(function(link) {
          link.href = cacheBuster(link.href);
        });

      // Hack to force page repaint after 25ms.
      if (forceRepaint) setTimeout(function() { document.body.offsetHeight; }, 25);
    },

    javascript: function(){
      var scripts = [].slice.call(document.querySelectorAll('script'));
      var textScripts = scripts.map(function(script) { return script.text }).filter(function(text) { return text.length > 0 });
      var srcScripts = scripts.filter(function(script) { return script.src });

      var loaded = 0;
      var all = srcScripts.length;
      var onLoad = function() {
        loaded = loaded + 1;
        if (loaded === all) {
          textScripts.forEach(function(script) { eval(script); });
        }
      }

      srcScripts
        .forEach(function(script) {
          var src = script.src;
          script.remove();
          var newScript = document.createElement('script');
          newScript.src = cacheBuster(src);
          newScript.async = true;
          newScript.onload = onLoad;
          document.head.appendChild(newScript);
        });
    }
  };
  var port = ar.port || 9485;
  var host = br.server || window.location.hostname || 'localhost';

  var connect = function(){
    var connection = new WebSocket('ws://' + host + ':' + port);
    connection.onmessage = function(event){
      if (ar.disabled) return;
      var message = event.data;
      var reloader = reloaders[message] || reloaders.page;
      reloader();
    };
    connection.onerror = function(){
      if (connection.readyState) connection.close();
    };
    connection.onclose = function(){
      window.setTimeout(connect, 1000);
    };
  };
  connect();
})();
/* jshint ignore:end */

;require('app');
//# sourceMappingURL=app.js.map