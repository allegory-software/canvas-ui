(() => {
  // node_modules/@lezer/common/dist/index.js
  var DefaultBufferLength = 1024;
  var nextPropID = 0;
  var Range = class {
    constructor(from, to) {
      this.from = from;
      this.to = to;
    }
  };
  var NodeProp = class {
    /**
    Create a new node prop type.
    */
    constructor(config = {}) {
      this.id = nextPropID++;
      this.perNode = !!config.perNode;
      this.deserialize = config.deserialize || (() => {
        throw new Error("This node type doesn't define a deserialize function");
      });
      this.combine = config.combine || null;
    }
    /**
    This is meant to be used with
    [`NodeSet.extend`](#common.NodeSet.extend) or
    [`LRParser.configure`](#lr.ParserConfig.props) to compute
    prop values for each node type in the set. Takes a [match
    object](#common.NodeType^match) or function that returns undefined
    if the node type doesn't get this prop, and the prop's value if
    it does.
    */
    add(match) {
      if (this.perNode)
        throw new RangeError("Can't add per-node props to node types");
      if (typeof match != "function")
        match = NodeType.match(match);
      return (type) => {
        let result = match(type);
        return result === void 0 ? null : [this, result];
      };
    }
  };
  NodeProp.closedBy = new NodeProp({ deserialize: (str) => str.split(" ") });
  NodeProp.openedBy = new NodeProp({ deserialize: (str) => str.split(" ") });
  NodeProp.group = new NodeProp({ deserialize: (str) => str.split(" ") });
  NodeProp.isolate = new NodeProp({ deserialize: (value) => {
    if (value && value != "rtl" && value != "ltr" && value != "auto")
      throw new RangeError("Invalid value for isolate: " + value);
    return value || "auto";
  } });
  NodeProp.contextHash = new NodeProp({ perNode: true });
  NodeProp.lookAhead = new NodeProp({ perNode: true });
  NodeProp.mounted = new NodeProp({ perNode: true });
  var MountedTree = class {
    constructor(tree, overlay, parser7, bracketed = false) {
      this.tree = tree;
      this.overlay = overlay;
      this.parser = parser7;
      this.bracketed = bracketed;
    }
    /**
    @internal
    */
    static get(tree) {
      return tree && tree.props && tree.props[NodeProp.mounted.id];
    }
  };
  var noProps = /* @__PURE__ */ Object.create(null);
  var NodeType = class _NodeType {
    /**
    @internal
    */
    constructor(name2, props, id2, flags = 0) {
      this.name = name2;
      this.props = props;
      this.id = id2;
      this.flags = flags;
    }
    /**
    Define a node type.
    */
    static define(spec) {
      let props = spec.props && spec.props.length ? /* @__PURE__ */ Object.create(null) : noProps;
      let flags = (spec.top ? 1 : 0) | (spec.skipped ? 2 : 0) | (spec.error ? 4 : 0) | (spec.name == null ? 8 : 0);
      let type = new _NodeType(spec.name || "", props, spec.id, flags);
      if (spec.props)
        for (let src of spec.props) {
          if (!Array.isArray(src))
            src = src(type);
          if (src) {
            if (src[0].perNode)
              throw new RangeError("Can't store a per-node prop on a node type");
            props[src[0].id] = src[1];
          }
        }
      return type;
    }
    /**
    Retrieves a node prop for this type. Will return `undefined` if
    the prop isn't present on this node.
    */
    prop(prop) {
      return this.props[prop.id];
    }
    /**
    True when this is the top node of a grammar.
    */
    get isTop() {
      return (this.flags & 1) > 0;
    }
    /**
    True when this node is produced by a skip rule.
    */
    get isSkipped() {
      return (this.flags & 2) > 0;
    }
    /**
    Indicates whether this is an error node.
    */
    get isError() {
      return (this.flags & 4) > 0;
    }
    /**
    When true, this node type doesn't correspond to a user-declared
    named node, for example because it is used to cache repetition.
    */
    get isAnonymous() {
      return (this.flags & 8) > 0;
    }
    /**
    Returns true when this node's name or one of its
    [groups](#common.NodeProp^group) matches the given string.
    */
    is(name2) {
      if (typeof name2 == "string") {
        if (this.name == name2)
          return true;
        let group = this.prop(NodeProp.group);
        return group ? group.indexOf(name2) > -1 : false;
      }
      return this.id == name2;
    }
    /**
    Create a function from node types to arbitrary values by
    specifying an object whose property names are node or
    [group](#common.NodeProp^group) names. Often useful with
    [`NodeProp.add`](#common.NodeProp.add). You can put multiple
    names, separated by spaces, in a single property name to map
    multiple node names to a single value.
    */
    static match(map) {
      let direct = /* @__PURE__ */ Object.create(null);
      for (let prop in map)
        for (let name2 of prop.split(" "))
          direct[name2] = map[prop];
      return (node) => {
        for (let groups = node.prop(NodeProp.group), i = -1; i < (groups ? groups.length : 0); i++) {
          let found = direct[i < 0 ? node.name : groups[i]];
          if (found)
            return found;
        }
      };
    }
  };
  NodeType.none = new NodeType(
    "",
    /* @__PURE__ */ Object.create(null),
    0,
    8
    /* NodeFlag.Anonymous */
  );
  var NodeSet = class _NodeSet {
    /**
    Create a set with the given types. The `id` property of each
    type should correspond to its position within the array.
    */
    constructor(types) {
      this.types = types;
      for (let i = 0; i < types.length; i++)
        if (types[i].id != i)
          throw new RangeError("Node type ids should correspond to array positions when creating a node set");
    }
    /**
    Create a copy of this set with some node properties added. The
    arguments to this method can be created with
    [`NodeProp.add`](#common.NodeProp.add).
    */
    extend(...props) {
      let newTypes = [];
      for (let type of this.types) {
        let newProps = null;
        for (let source of props) {
          let add = source(type);
          if (add) {
            if (!newProps)
              newProps = Object.assign({}, type.props);
            let value = add[1], prop = add[0];
            if (prop.combine && prop.id in newProps)
              value = prop.combine(newProps[prop.id], value);
            newProps[prop.id] = value;
          }
        }
        newTypes.push(newProps ? new NodeType(type.name, newProps, type.id, type.flags) : type);
      }
      return new _NodeSet(newTypes);
    }
  };
  var CachedNode = /* @__PURE__ */ new WeakMap();
  var CachedInnerNode = /* @__PURE__ */ new WeakMap();
  var IterMode;
  (function(IterMode2) {
    IterMode2[IterMode2["ExcludeBuffers"] = 1] = "ExcludeBuffers";
    IterMode2[IterMode2["IncludeAnonymous"] = 2] = "IncludeAnonymous";
    IterMode2[IterMode2["IgnoreMounts"] = 4] = "IgnoreMounts";
    IterMode2[IterMode2["IgnoreOverlays"] = 8] = "IgnoreOverlays";
    IterMode2[IterMode2["EnterBracketed"] = 16] = "EnterBracketed";
  })(IterMode || (IterMode = {}));
  var Tree = class _Tree {
    /**
    Construct a new tree. See also [`Tree.build`](#common.Tree^build).
    */
    constructor(type, children, positions, length, props) {
      this.type = type;
      this.children = children;
      this.positions = positions;
      this.length = length;
      this.props = null;
      if (props && props.length) {
        this.props = /* @__PURE__ */ Object.create(null);
        for (let [prop, value] of props)
          this.props[typeof prop == "number" ? prop : prop.id] = value;
      }
    }
    /**
    @internal
    */
    toString() {
      let mounted = MountedTree.get(this);
      if (mounted && !mounted.overlay)
        return mounted.tree.toString();
      let children = "";
      for (let ch of this.children) {
        let str = ch.toString();
        if (str) {
          if (children)
            children += ",";
          children += str;
        }
      }
      return !this.type.name ? children : (/\W/.test(this.type.name) && !this.type.isError ? JSON.stringify(this.type.name) : this.type.name) + (children.length ? "(" + children + ")" : "");
    }
    /**
    Get a [tree cursor](#common.TreeCursor) positioned at the top of
    the tree. Mode can be used to [control](#common.IterMode) which
    nodes the cursor visits.
    */
    cursor(mode = 0) {
      return new TreeCursor(this.topNode, mode);
    }
    /**
    Get a [tree cursor](#common.TreeCursor) pointing into this tree
    at the given position and side (see
    [`moveTo`](#common.TreeCursor.moveTo).
    */
    cursorAt(pos, side = 0, mode = 0) {
      let scope = CachedNode.get(this) || this.topNode;
      let cursor = new TreeCursor(scope);
      cursor.moveTo(pos, side);
      CachedNode.set(this, cursor._tree);
      return cursor;
    }
    /**
    Get a [syntax node](#common.SyntaxNode) object for the top of the
    tree.
    */
    get topNode() {
      return new TreeNode(this, 0, 0, null);
    }
    /**
    Get the [syntax node](#common.SyntaxNode) at the given position.
    If `side` is -1, this will move into nodes that end at the
    position. If 1, it'll move into nodes that start at the
    position. With 0, it'll only enter nodes that cover the position
    from both sides.
    
    Note that this will not enter
    [overlays](#common.MountedTree.overlay), and you often want
    [`resolveInner`](#common.Tree.resolveInner) instead.
    */
    resolve(pos, side = 0) {
      let node = resolveNode(CachedNode.get(this) || this.topNode, pos, side, false);
      CachedNode.set(this, node);
      return node;
    }
    /**
    Like [`resolve`](#common.Tree.resolve), but will enter
    [overlaid](#common.MountedTree.overlay) nodes, producing a syntax node
    pointing into the innermost overlaid tree at the given position
    (with parent links going through all parent structure, including
    the host trees).
    */
    resolveInner(pos, side = 0) {
      let node = resolveNode(CachedInnerNode.get(this) || this.topNode, pos, side, true);
      CachedInnerNode.set(this, node);
      return node;
    }
    /**
    In some situations, it can be useful to iterate through all
    nodes around a position, including those in overlays that don't
    directly cover the position. This method gives you an iterator
    that will produce all nodes, from small to big, around the given
    position.
    */
    resolveStack(pos, side = 0) {
      return stackIterator(this, pos, side);
    }
    /**
    Iterate over the tree and its children, calling `enter` for any
    node that touches the `from`/`to` region (if given) before
    running over such a node's children, and `leave` (if given) when
    leaving the node. When `enter` returns `false`, that node will
    not have its children iterated over (or `leave` called).
    */
    iterate(spec) {
      let { enter, leave, from = 0, to = this.length } = spec;
      let mode = spec.mode || 0, anon = (mode & IterMode.IncludeAnonymous) > 0;
      for (let c = this.cursor(mode | IterMode.IncludeAnonymous); ; ) {
        let entered = false;
        if (c.from <= to && c.to >= from && (!anon && c.type.isAnonymous || enter(c) !== false)) {
          if (c.firstChild())
            continue;
          entered = true;
        }
        for (; ; ) {
          if (entered && leave && (anon || !c.type.isAnonymous))
            leave(c);
          if (c.nextSibling())
            break;
          if (!c.parent())
            return;
          entered = true;
        }
      }
    }
    /**
    Get the value of the given [node prop](#common.NodeProp) for this
    node. Works with both per-node and per-type props.
    */
    prop(prop) {
      return !prop.perNode ? this.type.prop(prop) : this.props ? this.props[prop.id] : void 0;
    }
    /**
    Returns the node's [per-node props](#common.NodeProp.perNode) in a
    format that can be passed to the [`Tree`](#common.Tree)
    constructor.
    */
    get propValues() {
      let result = [];
      if (this.props)
        for (let id2 in this.props)
          result.push([+id2, this.props[id2]]);
      return result;
    }
    /**
    Balance the direct children of this tree, producing a copy of
    which may have children grouped into subtrees with type
    [`NodeType.none`](#common.NodeType^none).
    */
    balance(config = {}) {
      return this.children.length <= 8 ? this : balanceRange(NodeType.none, this.children, this.positions, 0, this.children.length, 0, this.length, (children, positions, length) => new _Tree(this.type, children, positions, length, this.propValues), config.makeTree || ((children, positions, length) => new _Tree(NodeType.none, children, positions, length)));
    }
    /**
    Build a tree from a postfix-ordered buffer of node information,
    or a cursor over such a buffer.
    */
    static build(data) {
      return buildTree(data);
    }
  };
  Tree.empty = new Tree(NodeType.none, [], [], 0);
  var FlatBufferCursor = class _FlatBufferCursor {
    constructor(buffer, index) {
      this.buffer = buffer;
      this.index = index;
    }
    get id() {
      return this.buffer[this.index - 4];
    }
    get start() {
      return this.buffer[this.index - 3];
    }
    get end() {
      return this.buffer[this.index - 2];
    }
    get size() {
      return this.buffer[this.index - 1];
    }
    get pos() {
      return this.index;
    }
    next() {
      this.index -= 4;
    }
    fork() {
      return new _FlatBufferCursor(this.buffer, this.index);
    }
  };
  var TreeBuffer = class _TreeBuffer {
    /**
    Create a tree buffer.
    */
    constructor(buffer, length, set) {
      this.buffer = buffer;
      this.length = length;
      this.set = set;
    }
    /**
    @internal
    */
    get type() {
      return NodeType.none;
    }
    /**
    @internal
    */
    toString() {
      let result = [];
      for (let index = 0; index < this.buffer.length; ) {
        result.push(this.childString(index));
        index = this.buffer[index + 3];
      }
      return result.join(",");
    }
    /**
    @internal
    */
    childString(index) {
      let id2 = this.buffer[index], endIndex = this.buffer[index + 3];
      let type = this.set.types[id2], result = type.name;
      if (/\W/.test(result) && !type.isError)
        result = JSON.stringify(result);
      index += 4;
      if (endIndex == index)
        return result;
      let children = [];
      while (index < endIndex) {
        children.push(this.childString(index));
        index = this.buffer[index + 3];
      }
      return result + "(" + children.join(",") + ")";
    }
    /**
    @internal
    */
    findChild(startIndex, endIndex, dir, pos, side) {
      let { buffer } = this, pick = -1;
      for (let i = startIndex; i != endIndex; i = buffer[i + 3]) {
        if (checkSide(side, pos, buffer[i + 1], buffer[i + 2])) {
          pick = i;
          if (dir > 0)
            break;
        }
      }
      return pick;
    }
    /**
    @internal
    */
    slice(startI, endI, from) {
      let b = this.buffer;
      let copy = new Uint16Array(endI - startI), len = 0;
      for (let i = startI, j = 0; i < endI; ) {
        copy[j++] = b[i++];
        copy[j++] = b[i++] - from;
        let to = copy[j++] = b[i++] - from;
        copy[j++] = b[i++] - startI;
        len = Math.max(len, to);
      }
      return new _TreeBuffer(copy, len, this.set);
    }
  };
  function checkSide(side, pos, from, to) {
    switch (side) {
      case -2:
        return from < pos;
      case -1:
        return to >= pos && from < pos;
      case 0:
        return from < pos && to > pos;
      case 1:
        return from <= pos && to > pos;
      case 2:
        return to > pos;
      case 4:
        return true;
    }
  }
  function resolveNode(node, pos, side, overlays) {
    var _a;
    while (node.from == node.to || (side < 1 ? node.from >= pos : node.from > pos) || (side > -1 ? node.to <= pos : node.to < pos)) {
      let parent = !overlays && node instanceof TreeNode && node.index < 0 ? null : node.parent;
      if (!parent)
        return node;
      node = parent;
    }
    let mode = overlays ? 0 : IterMode.IgnoreOverlays;
    if (overlays)
      for (let scan = node, parent = scan.parent; parent; scan = parent, parent = scan.parent) {
        if (scan instanceof TreeNode && scan.index < 0 && ((_a = parent.enter(pos, side, mode)) === null || _a === void 0 ? void 0 : _a.from) != scan.from)
          node = parent;
      }
    for (; ; ) {
      let inner = node.enter(pos, side, mode);
      if (!inner)
        return node;
      node = inner;
    }
  }
  var BaseNode = class {
    cursor(mode = 0) {
      return new TreeCursor(this, mode);
    }
    getChild(type, before = null, after = null) {
      let r = getChildren(this, type, before, after);
      return r.length ? r[0] : null;
    }
    getChildren(type, before = null, after = null) {
      return getChildren(this, type, before, after);
    }
    resolve(pos, side = 0) {
      return resolveNode(this, pos, side, false);
    }
    resolveInner(pos, side = 0) {
      return resolveNode(this, pos, side, true);
    }
    matchContext(context) {
      return matchNodeContext(this.parent, context);
    }
    enterUnfinishedNodesBefore(pos) {
      let scan = this.childBefore(pos), node = this;
      while (scan) {
        let last = scan.lastChild;
        if (!last || last.to != scan.to)
          break;
        if (last.type.isError && last.from == last.to) {
          node = scan;
          scan = last.prevSibling;
        } else {
          scan = last;
        }
      }
      return node;
    }
    get node() {
      return this;
    }
    get next() {
      return this.parent;
    }
  };
  var TreeNode = class _TreeNode extends BaseNode {
    constructor(_tree, from, index, _parent) {
      super();
      this._tree = _tree;
      this.from = from;
      this.index = index;
      this._parent = _parent;
    }
    get type() {
      return this._tree.type;
    }
    get name() {
      return this._tree.type.name;
    }
    get to() {
      return this.from + this._tree.length;
    }
    nextChild(i, dir, pos, side, mode = 0) {
      for (let parent = this; ; ) {
        for (let { children, positions } = parent._tree, e = dir > 0 ? children.length : -1; i != e; i += dir) {
          let next = children[i], start = positions[i] + parent.from, mounted;
          if (!(mode & IterMode.EnterBracketed && next instanceof Tree && (mounted = MountedTree.get(next)) && !mounted.overlay && mounted.bracketed && pos >= start && pos <= start + next.length) && !checkSide(side, pos, start, start + next.length))
            continue;
          if (next instanceof TreeBuffer) {
            if (mode & IterMode.ExcludeBuffers)
              continue;
            let index = next.findChild(0, next.buffer.length, dir, pos - start, side);
            if (index > -1)
              return new BufferNode(new BufferContext(parent, next, i, start), null, index);
          } else if (mode & IterMode.IncludeAnonymous || (!next.type.isAnonymous || hasChild(next))) {
            let mounted2;
            if (!(mode & IterMode.IgnoreMounts) && (mounted2 = MountedTree.get(next)) && !mounted2.overlay)
              return new _TreeNode(mounted2.tree, start, i, parent);
            let inner = new _TreeNode(next, start, i, parent);
            return mode & IterMode.IncludeAnonymous || !inner.type.isAnonymous ? inner : inner.nextChild(dir < 0 ? next.children.length - 1 : 0, dir, pos, side, mode);
          }
        }
        if (mode & IterMode.IncludeAnonymous || !parent.type.isAnonymous)
          return null;
        if (parent.index >= 0)
          i = parent.index + dir;
        else
          i = dir < 0 ? -1 : parent._parent._tree.children.length;
        parent = parent._parent;
        if (!parent)
          return null;
      }
    }
    get firstChild() {
      return this.nextChild(
        0,
        1,
        0,
        4
        /* Side.DontCare */
      );
    }
    get lastChild() {
      return this.nextChild(
        this._tree.children.length - 1,
        -1,
        0,
        4
        /* Side.DontCare */
      );
    }
    childAfter(pos) {
      return this.nextChild(
        0,
        1,
        pos,
        2
        /* Side.After */
      );
    }
    childBefore(pos) {
      return this.nextChild(
        this._tree.children.length - 1,
        -1,
        pos,
        -2
        /* Side.Before */
      );
    }
    prop(prop) {
      return this._tree.prop(prop);
    }
    enter(pos, side, mode = 0) {
      let mounted;
      if (!(mode & IterMode.IgnoreOverlays) && (mounted = MountedTree.get(this._tree)) && mounted.overlay) {
        let rPos = pos - this.from, enterBracketed = mode & IterMode.EnterBracketed && mounted.bracketed;
        for (let { from, to } of mounted.overlay) {
          if ((side > 0 || enterBracketed ? from <= rPos : from < rPos) && (side < 0 || enterBracketed ? to >= rPos : to > rPos))
            return new _TreeNode(mounted.tree, mounted.overlay[0].from + this.from, -1, this);
        }
      }
      return this.nextChild(0, 1, pos, side, mode);
    }
    nextSignificantParent() {
      let val = this;
      while (val.type.isAnonymous && val._parent)
        val = val._parent;
      return val;
    }
    get parent() {
      return this._parent ? this._parent.nextSignificantParent() : null;
    }
    get nextSibling() {
      return this._parent && this.index >= 0 ? this._parent.nextChild(
        this.index + 1,
        1,
        0,
        4
        /* Side.DontCare */
      ) : null;
    }
    get prevSibling() {
      return this._parent && this.index >= 0 ? this._parent.nextChild(
        this.index - 1,
        -1,
        0,
        4
        /* Side.DontCare */
      ) : null;
    }
    get tree() {
      return this._tree;
    }
    toTree() {
      return this._tree;
    }
    /**
    @internal
    */
    toString() {
      return this._tree.toString();
    }
  };
  function getChildren(node, type, before, after) {
    let cur = node.cursor(), result = [];
    if (!cur.firstChild())
      return result;
    if (before != null)
      for (let found = false; !found; ) {
        found = cur.type.is(before);
        if (!cur.nextSibling())
          return result;
      }
    for (; ; ) {
      if (after != null && cur.type.is(after))
        return result;
      if (cur.type.is(type))
        result.push(cur.node);
      if (!cur.nextSibling())
        return after == null ? result : [];
    }
  }
  function matchNodeContext(node, context, i = context.length - 1) {
    for (let p = node; i >= 0; p = p.parent) {
      if (!p)
        return false;
      if (!p.type.isAnonymous) {
        if (context[i] && context[i] != p.name)
          return false;
        i--;
      }
    }
    return true;
  }
  var BufferContext = class {
    constructor(parent, buffer, index, start) {
      this.parent = parent;
      this.buffer = buffer;
      this.index = index;
      this.start = start;
    }
  };
  var BufferNode = class _BufferNode extends BaseNode {
    get name() {
      return this.type.name;
    }
    get from() {
      return this.context.start + this.context.buffer.buffer[this.index + 1];
    }
    get to() {
      return this.context.start + this.context.buffer.buffer[this.index + 2];
    }
    constructor(context, _parent, index) {
      super();
      this.context = context;
      this._parent = _parent;
      this.index = index;
      this.type = context.buffer.set.types[context.buffer.buffer[index]];
    }
    child(dir, pos, side) {
      let { buffer } = this.context;
      let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.context.start, side);
      return index < 0 ? null : new _BufferNode(this.context, this, index);
    }
    get firstChild() {
      return this.child(
        1,
        0,
        4
        /* Side.DontCare */
      );
    }
    get lastChild() {
      return this.child(
        -1,
        0,
        4
        /* Side.DontCare */
      );
    }
    childAfter(pos) {
      return this.child(
        1,
        pos,
        2
        /* Side.After */
      );
    }
    childBefore(pos) {
      return this.child(
        -1,
        pos,
        -2
        /* Side.Before */
      );
    }
    prop(prop) {
      return this.type.prop(prop);
    }
    enter(pos, side, mode = 0) {
      if (mode & IterMode.ExcludeBuffers)
        return null;
      let { buffer } = this.context;
      let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], side > 0 ? 1 : -1, pos - this.context.start, side);
      return index < 0 ? null : new _BufferNode(this.context, this, index);
    }
    get parent() {
      return this._parent || this.context.parent.nextSignificantParent();
    }
    externalSibling(dir) {
      return this._parent ? null : this.context.parent.nextChild(
        this.context.index + dir,
        dir,
        0,
        4
        /* Side.DontCare */
      );
    }
    get nextSibling() {
      let { buffer } = this.context;
      let after = buffer.buffer[this.index + 3];
      if (after < (this._parent ? buffer.buffer[this._parent.index + 3] : buffer.buffer.length))
        return new _BufferNode(this.context, this._parent, after);
      return this.externalSibling(1);
    }
    get prevSibling() {
      let { buffer } = this.context;
      let parentStart = this._parent ? this._parent.index + 4 : 0;
      if (this.index == parentStart)
        return this.externalSibling(-1);
      return new _BufferNode(this.context, this._parent, buffer.findChild(
        parentStart,
        this.index,
        -1,
        0,
        4
        /* Side.DontCare */
      ));
    }
    get tree() {
      return null;
    }
    toTree() {
      let children = [], positions = [];
      let { buffer } = this.context;
      let startI = this.index + 4, endI = buffer.buffer[this.index + 3];
      if (endI > startI) {
        let from = buffer.buffer[this.index + 1];
        children.push(buffer.slice(startI, endI, from));
        positions.push(0);
      }
      return new Tree(this.type, children, positions, this.to - this.from);
    }
    /**
    @internal
    */
    toString() {
      return this.context.buffer.childString(this.index);
    }
  };
  function iterStack(heads) {
    if (!heads.length)
      return null;
    let pick = 0, picked = heads[0];
    for (let i = 1; i < heads.length; i++) {
      let node = heads[i];
      if (node.from > picked.from || node.to < picked.to) {
        picked = node;
        pick = i;
      }
    }
    let next = picked instanceof TreeNode && picked.index < 0 ? null : picked.parent;
    let newHeads = heads.slice();
    if (next)
      newHeads[pick] = next;
    else
      newHeads.splice(pick, 1);
    return new StackIterator(newHeads, picked);
  }
  var StackIterator = class {
    constructor(heads, node) {
      this.heads = heads;
      this.node = node;
    }
    get next() {
      return iterStack(this.heads);
    }
  };
  function stackIterator(tree, pos, side) {
    let inner = tree.resolveInner(pos, side), layers = null;
    for (let scan = inner instanceof TreeNode ? inner : inner.context.parent; scan; scan = scan.parent) {
      if (scan.index < 0) {
        let parent = scan.parent;
        (layers || (layers = [inner])).push(parent.resolve(pos, side));
        scan = parent;
      } else {
        let mount = MountedTree.get(scan.tree);
        if (mount && mount.overlay && mount.overlay[0].from <= pos && mount.overlay[mount.overlay.length - 1].to >= pos) {
          let root = new TreeNode(mount.tree, mount.overlay[0].from + scan.from, -1, scan);
          (layers || (layers = [inner])).push(resolveNode(root, pos, side, false));
        }
      }
    }
    return layers ? iterStack(layers) : inner;
  }
  var TreeCursor = class {
    /**
    Shorthand for `.type.name`.
    */
    get name() {
      return this.type.name;
    }
    /**
    @internal
    */
    constructor(node, mode = 0) {
      this.buffer = null;
      this.stack = [];
      this.index = 0;
      this.bufferNode = null;
      this.mode = mode & ~IterMode.EnterBracketed;
      if (node instanceof TreeNode) {
        this.yieldNode(node);
      } else {
        this._tree = node.context.parent;
        this.buffer = node.context;
        for (let n = node._parent; n; n = n._parent)
          this.stack.unshift(n.index);
        this.bufferNode = node;
        this.yieldBuf(node.index);
      }
    }
    yieldNode(node) {
      if (!node)
        return false;
      this._tree = node;
      this.type = node.type;
      this.from = node.from;
      this.to = node.to;
      return true;
    }
    yieldBuf(index, type) {
      this.index = index;
      let { start, buffer } = this.buffer;
      this.type = type || buffer.set.types[buffer.buffer[index]];
      this.from = start + buffer.buffer[index + 1];
      this.to = start + buffer.buffer[index + 2];
      return true;
    }
    /**
    @internal
    */
    yield(node) {
      if (!node)
        return false;
      if (node instanceof TreeNode) {
        this.buffer = null;
        return this.yieldNode(node);
      }
      this.buffer = node.context;
      return this.yieldBuf(node.index, node.type);
    }
    /**
    @internal
    */
    toString() {
      return this.buffer ? this.buffer.buffer.childString(this.index) : this._tree.toString();
    }
    /**
    @internal
    */
    enterChild(dir, pos, side) {
      if (!this.buffer)
        return this.yield(this._tree.nextChild(dir < 0 ? this._tree._tree.children.length - 1 : 0, dir, pos, side, this.mode));
      let { buffer } = this.buffer;
      let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.buffer.start, side);
      if (index < 0)
        return false;
      this.stack.push(this.index);
      return this.yieldBuf(index);
    }
    /**
    Move the cursor to this node's first child. When this returns
    false, the node has no child, and the cursor has not been moved.
    */
    firstChild() {
      return this.enterChild(
        1,
        0,
        4
        /* Side.DontCare */
      );
    }
    /**
    Move the cursor to this node's last child.
    */
    lastChild() {
      return this.enterChild(
        -1,
        0,
        4
        /* Side.DontCare */
      );
    }
    /**
    Move the cursor to the first child that ends after `pos`.
    */
    childAfter(pos) {
      return this.enterChild(
        1,
        pos,
        2
        /* Side.After */
      );
    }
    /**
    Move to the last child that starts before `pos`.
    */
    childBefore(pos) {
      return this.enterChild(
        -1,
        pos,
        -2
        /* Side.Before */
      );
    }
    /**
    Move the cursor to the child around `pos`. If side is -1 the
    child may end at that position, when 1 it may start there. This
    will also enter [overlaid](#common.MountedTree.overlay)
    [mounted](#common.NodeProp^mounted) trees unless `overlays` is
    set to false.
    */
    enter(pos, side, mode = this.mode) {
      if (!this.buffer)
        return this.yield(this._tree.enter(pos, side, mode));
      return mode & IterMode.ExcludeBuffers ? false : this.enterChild(1, pos, side);
    }
    /**
    Move to the node's parent node, if this isn't the top node.
    */
    parent() {
      if (!this.buffer)
        return this.yieldNode(this.mode & IterMode.IncludeAnonymous ? this._tree._parent : this._tree.parent);
      if (this.stack.length)
        return this.yieldBuf(this.stack.pop());
      let parent = this.mode & IterMode.IncludeAnonymous ? this.buffer.parent : this.buffer.parent.nextSignificantParent();
      this.buffer = null;
      return this.yieldNode(parent);
    }
    /**
    @internal
    */
    sibling(dir) {
      if (!this.buffer)
        return !this._tree._parent ? false : this.yield(this._tree.index < 0 ? null : this._tree._parent.nextChild(this._tree.index + dir, dir, 0, 4, this.mode));
      let { buffer } = this.buffer, d = this.stack.length - 1;
      if (dir < 0) {
        let parentStart = d < 0 ? 0 : this.stack[d] + 4;
        if (this.index != parentStart)
          return this.yieldBuf(buffer.findChild(
            parentStart,
            this.index,
            -1,
            0,
            4
            /* Side.DontCare */
          ));
      } else {
        let after = buffer.buffer[this.index + 3];
        if (after < (d < 0 ? buffer.buffer.length : buffer.buffer[this.stack[d] + 3]))
          return this.yieldBuf(after);
      }
      return d < 0 ? this.yield(this.buffer.parent.nextChild(this.buffer.index + dir, dir, 0, 4, this.mode)) : false;
    }
    /**
    Move to this node's next sibling, if any.
    */
    nextSibling() {
      return this.sibling(1);
    }
    /**
    Move to this node's previous sibling, if any.
    */
    prevSibling() {
      return this.sibling(-1);
    }
    atLastNode(dir) {
      let index, parent, { buffer } = this;
      if (buffer) {
        if (dir > 0) {
          if (this.index < buffer.buffer.buffer.length)
            return false;
        } else {
          for (let i = 0; i < this.index; i++)
            if (buffer.buffer.buffer[i + 3] < this.index)
              return false;
        }
        ({ index, parent } = buffer);
      } else {
        ({ index, _parent: parent } = this._tree);
      }
      for (; parent; { index, _parent: parent } = parent) {
        if (index > -1)
          for (let i = index + dir, e = dir < 0 ? -1 : parent._tree.children.length; i != e; i += dir) {
            let child = parent._tree.children[i];
            if (this.mode & IterMode.IncludeAnonymous || child instanceof TreeBuffer || !child.type.isAnonymous || hasChild(child))
              return false;
          }
      }
      return true;
    }
    move(dir, enter) {
      if (enter && this.enterChild(
        dir,
        0,
        4
        /* Side.DontCare */
      ))
        return true;
      for (; ; ) {
        if (this.sibling(dir))
          return true;
        if (this.atLastNode(dir) || !this.parent())
          return false;
      }
    }
    /**
    Move to the next node in a
    [pre-order](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order,_NLR)
    traversal, going from a node to its first child or, if the
    current node is empty or `enter` is false, its next sibling or
    the next sibling of the first parent node that has one.
    */
    next(enter = true) {
      return this.move(1, enter);
    }
    /**
    Move to the next node in a last-to-first pre-order traversal. A
    node is followed by its last child or, if it has none, its
    previous sibling or the previous sibling of the first parent
    node that has one.
    */
    prev(enter = true) {
      return this.move(-1, enter);
    }
    /**
    Move the cursor to the innermost node that covers `pos`. If
    `side` is -1, it will enter nodes that end at `pos`. If it is 1,
    it will enter nodes that start at `pos`.
    */
    moveTo(pos, side = 0) {
      while (this.from == this.to || (side < 1 ? this.from >= pos : this.from > pos) || (side > -1 ? this.to <= pos : this.to < pos))
        if (!this.parent())
          break;
      while (this.enterChild(1, pos, side)) {
      }
      return this;
    }
    /**
    Get a [syntax node](#common.SyntaxNode) at the cursor's current
    position.
    */
    get node() {
      if (!this.buffer)
        return this._tree;
      let cache = this.bufferNode, result = null, depth = 0;
      if (cache && cache.context == this.buffer) {
        scan: for (let index = this.index, d = this.stack.length; d >= 0; ) {
          for (let c = cache; c; c = c._parent)
            if (c.index == index) {
              if (index == this.index)
                return c;
              result = c;
              depth = d + 1;
              break scan;
            }
          index = this.stack[--d];
        }
      }
      for (let i = depth; i < this.stack.length; i++)
        result = new BufferNode(this.buffer, result, this.stack[i]);
      return this.bufferNode = new BufferNode(this.buffer, result, this.index);
    }
    /**
    Get the [tree](#common.Tree) that represents the current node, if
    any. Will return null when the node is in a [tree
    buffer](#common.TreeBuffer).
    */
    get tree() {
      return this.buffer ? null : this._tree._tree;
    }
    /**
    Iterate over the current node and all its descendants, calling
    `enter` when entering a node and `leave`, if given, when leaving
    one. When `enter` returns `false`, any children of that node are
    skipped, and `leave` isn't called for it.
    */
    iterate(enter, leave) {
      for (let depth = 0; ; ) {
        let mustLeave = false;
        if (this.type.isAnonymous || enter(this) !== false) {
          if (this.firstChild()) {
            depth++;
            continue;
          }
          if (!this.type.isAnonymous)
            mustLeave = true;
        }
        for (; ; ) {
          if (mustLeave && leave)
            leave(this);
          mustLeave = this.type.isAnonymous;
          if (!depth)
            return;
          if (this.nextSibling())
            break;
          this.parent();
          depth--;
          mustLeave = true;
        }
      }
    }
    /**
    Test whether the current node matches a given context—a sequence
    of direct parent node names. Empty strings in the context array
    are treated as wildcards.
    */
    matchContext(context) {
      if (!this.buffer)
        return matchNodeContext(this.node.parent, context);
      let { buffer } = this.buffer, { types } = buffer.set;
      for (let i = context.length - 1, d = this.stack.length - 1; i >= 0; d--) {
        if (d < 0)
          return matchNodeContext(this._tree, context, i);
        let type = types[buffer.buffer[this.stack[d]]];
        if (!type.isAnonymous) {
          if (context[i] && context[i] != type.name)
            return false;
          i--;
        }
      }
      return true;
    }
  };
  function hasChild(tree) {
    return tree.children.some((ch) => ch instanceof TreeBuffer || !ch.type.isAnonymous || hasChild(ch));
  }
  function buildTree(data) {
    var _a;
    let { buffer, nodeSet, maxBufferLength = DefaultBufferLength, reused = [], minRepeatType = nodeSet.types.length } = data;
    let cursor = Array.isArray(buffer) ? new FlatBufferCursor(buffer, buffer.length) : buffer;
    let types = nodeSet.types;
    let contextHash = 0, lookAhead = 0;
    function takeNode(parentStart, minPos, children2, positions2, inRepeat, depth) {
      let { id: id2, start, end, size } = cursor;
      let lookAheadAtStart = lookAhead, contextAtStart = contextHash;
      if (size < 0) {
        cursor.next();
        if (size == -1) {
          let node2 = reused[id2];
          children2.push(node2);
          positions2.push(start - parentStart);
          return;
        } else if (size == -3) {
          contextHash = id2;
          return;
        } else if (size == -4) {
          lookAhead = id2;
          return;
        } else {
          throw new RangeError(`Unrecognized record size: ${size}`);
        }
      }
      let type = types[id2], node, buffer2;
      let startPos = start - parentStart;
      if (end - start <= maxBufferLength && (buffer2 = findBufferSize(cursor.pos - minPos, inRepeat))) {
        let data2 = new Uint16Array(buffer2.size - buffer2.skip);
        let endPos = cursor.pos - buffer2.size, index = data2.length;
        while (cursor.pos > endPos)
          index = copyToBuffer(buffer2.start, data2, index);
        node = new TreeBuffer(data2, end - buffer2.start, nodeSet);
        startPos = buffer2.start - parentStart;
      } else {
        let endPos = cursor.pos - size;
        cursor.next();
        let localChildren = [], localPositions = [];
        let localInRepeat = id2 >= minRepeatType ? id2 : -1;
        let lastGroup = 0, lastEnd = end;
        while (cursor.pos > endPos) {
          if (localInRepeat >= 0 && cursor.id == localInRepeat && cursor.size >= 0) {
            if (cursor.end <= lastEnd - maxBufferLength) {
              makeRepeatLeaf(localChildren, localPositions, start, lastGroup, cursor.end, lastEnd, localInRepeat, lookAheadAtStart, contextAtStart);
              lastGroup = localChildren.length;
              lastEnd = cursor.end;
            }
            cursor.next();
          } else if (depth > 2500) {
            takeFlatNode(start, endPos, localChildren, localPositions);
          } else {
            takeNode(start, endPos, localChildren, localPositions, localInRepeat, depth + 1);
          }
        }
        if (localInRepeat >= 0 && lastGroup > 0 && lastGroup < localChildren.length)
          makeRepeatLeaf(localChildren, localPositions, start, lastGroup, start, lastEnd, localInRepeat, lookAheadAtStart, contextAtStart);
        localChildren.reverse();
        localPositions.reverse();
        if (localInRepeat > -1 && lastGroup > 0) {
          let make = makeBalanced(type, contextAtStart);
          node = balanceRange(type, localChildren, localPositions, 0, localChildren.length, 0, end - start, make, make);
        } else {
          node = makeTree(type, localChildren, localPositions, end - start, lookAheadAtStart - end, contextAtStart);
        }
      }
      children2.push(node);
      positions2.push(startPos);
    }
    function takeFlatNode(parentStart, minPos, children2, positions2) {
      let nodes = [];
      let nodeCount = 0, stopAt = -1;
      while (cursor.pos > minPos) {
        let { id: id2, start, end, size } = cursor;
        if (size > 4) {
          cursor.next();
        } else if (stopAt > -1 && start < stopAt) {
          break;
        } else {
          if (stopAt < 0)
            stopAt = end - maxBufferLength;
          nodes.push(id2, start, end);
          nodeCount++;
          cursor.next();
        }
      }
      if (nodeCount) {
        let buffer2 = new Uint16Array(nodeCount * 4);
        let start = nodes[nodes.length - 2];
        for (let i = nodes.length - 3, j = 0; i >= 0; i -= 3) {
          buffer2[j++] = nodes[i];
          buffer2[j++] = nodes[i + 1] - start;
          buffer2[j++] = nodes[i + 2] - start;
          buffer2[j++] = j;
        }
        children2.push(new TreeBuffer(buffer2, nodes[2] - start, nodeSet));
        positions2.push(start - parentStart);
      }
    }
    function makeBalanced(type, contextHash2) {
      return (children2, positions2, length2) => {
        let lookAhead2 = 0, lastI = children2.length - 1, last, lookAheadProp;
        if (lastI >= 0 && (last = children2[lastI]) instanceof Tree) {
          if (!lastI && last.type == type && last.length == length2)
            return last;
          if (lookAheadProp = last.prop(NodeProp.lookAhead))
            lookAhead2 = positions2[lastI] + last.length + lookAheadProp;
        }
        return makeTree(type, children2, positions2, length2, lookAhead2, contextHash2);
      };
    }
    function makeRepeatLeaf(children2, positions2, base, i, from, to, type, lookAhead2, contextHash2) {
      let localChildren = [], localPositions = [];
      while (children2.length > i) {
        localChildren.push(children2.pop());
        localPositions.push(positions2.pop() + base - from);
      }
      children2.push(makeTree(nodeSet.types[type], localChildren, localPositions, to - from, lookAhead2 - to, contextHash2));
      positions2.push(from - base);
    }
    function makeTree(type, children2, positions2, length2, lookAhead2, contextHash2, props) {
      if (contextHash2) {
        let pair2 = [NodeProp.contextHash, contextHash2];
        props = props ? [pair2].concat(props) : [pair2];
      }
      if (lookAhead2 > 25) {
        let pair2 = [NodeProp.lookAhead, lookAhead2];
        props = props ? [pair2].concat(props) : [pair2];
      }
      return new Tree(type, children2, positions2, length2, props);
    }
    function findBufferSize(maxSize, inRepeat) {
      let fork = cursor.fork();
      let size = 0, start = 0, skip = 0, minStart = fork.end - maxBufferLength;
      let result = { size: 0, start: 0, skip: 0 };
      scan: for (let minPos = fork.pos - maxSize; fork.pos > minPos; ) {
        let nodeSize2 = fork.size;
        if (fork.id == inRepeat && nodeSize2 >= 0) {
          result.size = size;
          result.start = start;
          result.skip = skip;
          skip += 4;
          size += 4;
          fork.next();
          continue;
        }
        let startPos = fork.pos - nodeSize2;
        if (nodeSize2 < 0 || startPos < minPos || fork.start < minStart)
          break;
        let localSkipped = fork.id >= minRepeatType ? 4 : 0;
        let nodeStart = fork.start;
        fork.next();
        while (fork.pos > startPos) {
          if (fork.size < 0) {
            if (fork.size == -3 || fork.size == -4)
              localSkipped += 4;
            else
              break scan;
          } else if (fork.id >= minRepeatType) {
            localSkipped += 4;
          }
          fork.next();
        }
        start = nodeStart;
        size += nodeSize2;
        skip += localSkipped;
      }
      if (inRepeat < 0 || size == maxSize) {
        result.size = size;
        result.start = start;
        result.skip = skip;
      }
      return result.size > 4 ? result : void 0;
    }
    function copyToBuffer(bufferStart, buffer2, index) {
      let { id: id2, start, end, size } = cursor;
      cursor.next();
      if (size >= 0 && id2 < minRepeatType) {
        let startIndex = index;
        if (size > 4) {
          let endPos = cursor.pos - (size - 4);
          while (cursor.pos > endPos)
            index = copyToBuffer(bufferStart, buffer2, index);
        }
        buffer2[--index] = startIndex;
        buffer2[--index] = end - bufferStart;
        buffer2[--index] = start - bufferStart;
        buffer2[--index] = id2;
      } else if (size == -3) {
        contextHash = id2;
      } else if (size == -4) {
        lookAhead = id2;
      }
      return index;
    }
    let children = [], positions = [];
    while (cursor.pos > 0)
      takeNode(data.start || 0, data.bufferStart || 0, children, positions, -1, 0);
    let length = (_a = data.length) !== null && _a !== void 0 ? _a : children.length ? positions[0] + children[0].length : 0;
    return new Tree(types[data.topID], children.reverse(), positions.reverse(), length);
  }
  var nodeSizeCache = /* @__PURE__ */ new WeakMap();
  function nodeSize(balanceType, node) {
    if (!balanceType.isAnonymous || node instanceof TreeBuffer || node.type != balanceType)
      return 1;
    let size = nodeSizeCache.get(node);
    if (size == null) {
      size = 1;
      for (let child of node.children) {
        if (child.type != balanceType || !(child instanceof Tree)) {
          size = 1;
          break;
        }
        size += nodeSize(balanceType, child);
      }
      nodeSizeCache.set(node, size);
    }
    return size;
  }
  function balanceRange(balanceType, children, positions, from, to, start, length, mkTop, mkTree) {
    let total = 0;
    for (let i = from; i < to; i++)
      total += nodeSize(balanceType, children[i]);
    let maxChild = Math.ceil(
      total * 1.5 / 8
      /* Balance.BranchFactor */
    );
    let localChildren = [], localPositions = [];
    function divide(children2, positions2, from2, to2, offset) {
      for (let i = from2; i < to2; ) {
        let groupFrom = i, groupStart = positions2[i], groupSize = nodeSize(balanceType, children2[i]);
        i++;
        for (; i < to2; i++) {
          let nextSize = nodeSize(balanceType, children2[i]);
          if (groupSize + nextSize >= maxChild)
            break;
          groupSize += nextSize;
        }
        if (i == groupFrom + 1) {
          if (groupSize > maxChild) {
            let only = children2[groupFrom];
            divide(only.children, only.positions, 0, only.children.length, positions2[groupFrom] + offset);
            continue;
          }
          localChildren.push(children2[groupFrom]);
        } else {
          let length2 = positions2[i - 1] + children2[i - 1].length - groupStart;
          localChildren.push(balanceRange(balanceType, children2, positions2, groupFrom, i, groupStart, length2, null, mkTree));
        }
        localPositions.push(groupStart + offset - start);
      }
    }
    divide(children, positions, from, to, 0);
    return (mkTop || mkTree)(localChildren, localPositions, length);
  }
  var TreeFragment = class _TreeFragment {
    /**
    Construct a tree fragment. You'll usually want to use
    [`addTree`](#common.TreeFragment^addTree) and
    [`applyChanges`](#common.TreeFragment^applyChanges) instead of
    calling this directly.
    */
    constructor(from, to, tree, offset, openStart = false, openEnd = false) {
      this.from = from;
      this.to = to;
      this.tree = tree;
      this.offset = offset;
      this.open = (openStart ? 1 : 0) | (openEnd ? 2 : 0);
    }
    /**
    Whether the start of the fragment represents the start of a
    parse, or the end of a change. (In the second case, it may not
    be safe to reuse some nodes at the start, depending on the
    parsing algorithm.)
    */
    get openStart() {
      return (this.open & 1) > 0;
    }
    /**
    Whether the end of the fragment represents the end of a
    full-document parse, or the start of a change.
    */
    get openEnd() {
      return (this.open & 2) > 0;
    }
    /**
    Create a set of fragments from a freshly parsed tree, or update
    an existing set of fragments by replacing the ones that overlap
    with a tree with content from the new tree. When `partial` is
    true, the parse is treated as incomplete, and the resulting
    fragment has [`openEnd`](#common.TreeFragment.openEnd) set to
    true.
    */
    static addTree(tree, fragments = [], partial = false) {
      let result = [new _TreeFragment(0, tree.length, tree, 0, false, partial)];
      for (let f of fragments)
        if (f.to > tree.length)
          result.push(f);
      return result;
    }
    /**
    Apply a set of edits to an array of fragments, removing or
    splitting fragments as necessary to remove edited ranges, and
    adjusting offsets for fragments that moved.
    */
    static applyChanges(fragments, changes, minGap = 128) {
      if (!changes.length)
        return fragments;
      let result = [];
      let fI = 1, nextF = fragments.length ? fragments[0] : null;
      for (let cI = 0, pos = 0, off = 0; ; cI++) {
        let nextC = cI < changes.length ? changes[cI] : null;
        let nextPos = nextC ? nextC.fromA : 1e9;
        if (nextPos - pos >= minGap)
          while (nextF && nextF.from < nextPos) {
            let cut = nextF;
            if (pos >= cut.from || nextPos <= cut.to || off) {
              let fFrom = Math.max(cut.from, pos) - off, fTo = Math.min(cut.to, nextPos) - off;
              cut = fFrom >= fTo ? null : new _TreeFragment(fFrom, fTo, cut.tree, cut.offset + off, cI > 0, !!nextC);
            }
            if (cut)
              result.push(cut);
            if (nextF.to > nextPos)
              break;
            nextF = fI < fragments.length ? fragments[fI++] : null;
          }
        if (!nextC)
          break;
        pos = nextC.toA;
        off = nextC.toA - nextC.toB;
      }
      return result;
    }
  };
  var Parser = class {
    /**
    Start a parse, returning a [partial parse](#common.PartialParse)
    object. [`fragments`](#common.TreeFragment) can be passed in to
    make the parse incremental.
    
    By default, the entire input is parsed. You can pass `ranges`,
    which should be a sorted array of non-empty, non-overlapping
    ranges, to parse only those ranges. The tree returned in that
    case will start at `ranges[0].from`.
    */
    startParse(input, fragments, ranges) {
      if (typeof input == "string")
        input = new StringInput(input);
      ranges = !ranges ? [new Range(0, input.length)] : ranges.length ? ranges.map((r) => new Range(r.from, r.to)) : [new Range(0, 0)];
      return this.createParse(input, fragments || [], ranges);
    }
    /**
    Run a full parse, returning the resulting tree.
    */
    parse(input, fragments, ranges) {
      let parse = this.startParse(input, fragments, ranges);
      for (; ; ) {
        let done = parse.advance();
        if (done)
          return done;
      }
    }
  };
  var StringInput = class {
    constructor(string2) {
      this.string = string2;
    }
    get length() {
      return this.string.length;
    }
    chunk(from) {
      return this.string.slice(from);
    }
    get lineChunks() {
      return false;
    }
    read(from, to) {
      return this.string.slice(from, to);
    }
  };
  function parseMixed(nest) {
    return (parse, input, fragments, ranges) => new MixedParse(parse, nest, input, fragments, ranges);
  }
  var InnerParse = class {
    constructor(parser7, parse, overlay, bracketed, target, from) {
      this.parser = parser7;
      this.parse = parse;
      this.overlay = overlay;
      this.bracketed = bracketed;
      this.target = target;
      this.from = from;
    }
  };
  function checkRanges(ranges) {
    if (!ranges.length || ranges.some((r) => r.from >= r.to))
      throw new RangeError("Invalid inner parse ranges given: " + JSON.stringify(ranges));
  }
  var ActiveOverlay = class {
    constructor(parser7, predicate, mounts, index, start, bracketed, target, prev) {
      this.parser = parser7;
      this.predicate = predicate;
      this.mounts = mounts;
      this.index = index;
      this.start = start;
      this.bracketed = bracketed;
      this.target = target;
      this.prev = prev;
      this.depth = 0;
      this.ranges = [];
    }
  };
  var stoppedInner = new NodeProp({ perNode: true });
  var MixedParse = class {
    constructor(base, nest, input, fragments, ranges) {
      this.nest = nest;
      this.input = input;
      this.fragments = fragments;
      this.ranges = ranges;
      this.inner = [];
      this.innerDone = 0;
      this.baseTree = null;
      this.stoppedAt = null;
      this.baseParse = base;
    }
    advance() {
      if (this.baseParse) {
        let done2 = this.baseParse.advance();
        if (!done2)
          return null;
        this.baseParse = null;
        this.baseTree = done2;
        this.startInner();
        if (this.stoppedAt != null)
          for (let inner2 of this.inner)
            inner2.parse.stopAt(this.stoppedAt);
      }
      if (this.innerDone == this.inner.length) {
        let result = this.baseTree;
        if (this.stoppedAt != null)
          result = new Tree(result.type, result.children, result.positions, result.length, result.propValues.concat([[stoppedInner, this.stoppedAt]]));
        return result;
      }
      let inner = this.inner[this.innerDone], done = inner.parse.advance();
      if (done) {
        this.innerDone++;
        let props = Object.assign(/* @__PURE__ */ Object.create(null), inner.target.props);
        props[NodeProp.mounted.id] = new MountedTree(done, inner.overlay, inner.parser, inner.bracketed);
        inner.target.props = props;
      }
      return null;
    }
    get parsedPos() {
      if (this.baseParse)
        return 0;
      let pos = this.input.length;
      for (let i = this.innerDone; i < this.inner.length; i++) {
        if (this.inner[i].from < pos)
          pos = Math.min(pos, this.inner[i].parse.parsedPos);
      }
      return pos;
    }
    stopAt(pos) {
      this.stoppedAt = pos;
      if (this.baseParse)
        this.baseParse.stopAt(pos);
      else
        for (let i = this.innerDone; i < this.inner.length; i++)
          this.inner[i].parse.stopAt(pos);
    }
    startInner() {
      let fragmentCursor = new FragmentCursor(this.fragments);
      let overlay = null;
      let covered = null;
      let cursor = new TreeCursor(new TreeNode(this.baseTree, this.ranges[0].from, 0, null), IterMode.IncludeAnonymous | IterMode.IgnoreMounts);
      scan: for (let nest, isCovered; ; ) {
        let enter = true, range;
        if (this.stoppedAt != null && cursor.from >= this.stoppedAt) {
          enter = false;
        } else if (fragmentCursor.hasNode(cursor)) {
          if (overlay) {
            let match = overlay.mounts.find((m) => m.frag.from <= cursor.from && m.frag.to >= cursor.to && m.mount.overlay);
            if (match)
              for (let r of match.mount.overlay) {
                let from = r.from + match.pos, to = r.to + match.pos;
                if (from >= cursor.from && to <= cursor.to && !overlay.ranges.some((r2) => r2.from < to && r2.to > from))
                  overlay.ranges.push({ from, to });
              }
          }
          enter = false;
        } else if (covered && (isCovered = checkCover(covered.ranges, cursor.from, cursor.to))) {
          enter = isCovered != 2;
        } else if (!cursor.type.isAnonymous && (nest = this.nest(cursor, this.input)) && (cursor.from < cursor.to || !nest.overlay)) {
          if (!cursor.tree) {
            materialize(cursor);
            if (overlay)
              overlay.depth++;
            if (covered)
              covered.depth++;
          }
          let oldMounts = fragmentCursor.findMounts(cursor.from, nest.parser);
          if (typeof nest.overlay == "function") {
            overlay = new ActiveOverlay(nest.parser, nest.overlay, oldMounts, this.inner.length, cursor.from, !!nest.bracketed, cursor.tree, overlay);
          } else {
            let ranges = punchRanges(this.ranges, nest.overlay || (cursor.from < cursor.to ? [new Range(cursor.from, cursor.to)] : []));
            if (ranges.length)
              checkRanges(ranges);
            if (ranges.length || !nest.overlay)
              this.inner.push(new InnerParse(nest.parser, ranges.length ? nest.parser.startParse(this.input, enterFragments(oldMounts, ranges), ranges) : nest.parser.startParse(""), nest.overlay ? nest.overlay.map((r) => new Range(r.from - cursor.from, r.to - cursor.from)) : null, !!nest.bracketed, cursor.tree, ranges.length ? ranges[0].from : cursor.from));
            if (!nest.overlay)
              enter = false;
            else if (ranges.length)
              covered = { ranges, depth: 0, prev: covered };
          }
        } else if (overlay && (range = overlay.predicate(cursor))) {
          if (range === true)
            range = new Range(cursor.from, cursor.to);
          if (range.from < range.to) {
            let last = overlay.ranges.length - 1;
            if (last >= 0 && overlay.ranges[last].to == range.from)
              overlay.ranges[last] = { from: overlay.ranges[last].from, to: range.to };
            else
              overlay.ranges.push(range);
          }
        }
        if (enter && cursor.firstChild()) {
          if (overlay)
            overlay.depth++;
          if (covered)
            covered.depth++;
        } else {
          for (; ; ) {
            if (cursor.nextSibling())
              break;
            if (!cursor.parent())
              break scan;
            if (overlay && !--overlay.depth) {
              let ranges = punchRanges(this.ranges, overlay.ranges);
              if (ranges.length) {
                checkRanges(ranges);
                this.inner.splice(overlay.index, 0, new InnerParse(overlay.parser, overlay.parser.startParse(this.input, enterFragments(overlay.mounts, ranges), ranges), overlay.ranges.map((r) => new Range(r.from - overlay.start, r.to - overlay.start)), overlay.bracketed, overlay.target, ranges[0].from));
              }
              overlay = overlay.prev;
            }
            if (covered && !--covered.depth)
              covered = covered.prev;
          }
        }
      }
    }
  };
  function checkCover(covered, from, to) {
    for (let range of covered) {
      if (range.from >= to)
        break;
      if (range.to > from)
        return range.from <= from && range.to >= to ? 2 : 1;
    }
    return 0;
  }
  function sliceBuf(buf, startI, endI, nodes, positions, off) {
    if (startI < endI) {
      let from = buf.buffer[startI + 1];
      nodes.push(buf.slice(startI, endI, from));
      positions.push(from - off);
    }
  }
  function materialize(cursor) {
    let { node } = cursor, stack = [];
    let buffer = node.context.buffer;
    do {
      stack.push(cursor.index);
      cursor.parent();
    } while (!cursor.tree);
    let base = cursor.tree, i = base.children.indexOf(buffer);
    let buf = base.children[i], b = buf.buffer, newStack = [i];
    function split(startI, endI, type, innerOffset, length, stackPos) {
      let targetI = stack[stackPos];
      let children = [], positions = [];
      sliceBuf(buf, startI, targetI, children, positions, innerOffset);
      let from = b[targetI + 1], to = b[targetI + 2];
      newStack.push(children.length);
      let child = stackPos ? split(targetI + 4, b[targetI + 3], buf.set.types[b[targetI]], from, to - from, stackPos - 1) : node.toTree();
      children.push(child);
      positions.push(from - innerOffset);
      sliceBuf(buf, b[targetI + 3], endI, children, positions, innerOffset);
      return new Tree(type, children, positions, length);
    }
    base.children[i] = split(0, b.length, NodeType.none, 0, buf.length, stack.length - 1);
    for (let index of newStack) {
      let tree = cursor.tree.children[index], pos = cursor.tree.positions[index];
      cursor.yield(new TreeNode(tree, pos + cursor.from, index, cursor._tree));
    }
  }
  var StructureCursor = class {
    constructor(root, offset) {
      this.offset = offset;
      this.done = false;
      this.cursor = root.cursor(IterMode.IncludeAnonymous | IterMode.IgnoreMounts);
    }
    // Move to the first node (in pre-order) that starts at or after `pos`.
    moveTo(pos) {
      let { cursor } = this, p = pos - this.offset;
      while (!this.done && cursor.from < p) {
        if (cursor.to >= pos && cursor.enter(p, 1, IterMode.IgnoreOverlays | IterMode.ExcludeBuffers)) ;
        else if (!cursor.next(false))
          this.done = true;
      }
    }
    hasNode(cursor) {
      this.moveTo(cursor.from);
      if (!this.done && this.cursor.from + this.offset == cursor.from && this.cursor.tree) {
        for (let tree = this.cursor.tree; ; ) {
          if (tree == cursor.tree)
            return true;
          if (tree.children.length && tree.positions[0] == 0 && tree.children[0] instanceof Tree)
            tree = tree.children[0];
          else
            break;
        }
      }
      return false;
    }
  };
  var FragmentCursor = class {
    constructor(fragments) {
      var _a;
      this.fragments = fragments;
      this.curTo = 0;
      this.fragI = 0;
      if (fragments.length) {
        let first = this.curFrag = fragments[0];
        this.curTo = (_a = first.tree.prop(stoppedInner)) !== null && _a !== void 0 ? _a : first.to;
        this.inner = new StructureCursor(first.tree, -first.offset);
      } else {
        this.curFrag = this.inner = null;
      }
    }
    hasNode(node) {
      while (this.curFrag && node.from >= this.curTo)
        this.nextFrag();
      return this.curFrag && this.curFrag.from <= node.from && this.curTo >= node.to && this.inner.hasNode(node);
    }
    nextFrag() {
      var _a;
      this.fragI++;
      if (this.fragI == this.fragments.length) {
        this.curFrag = this.inner = null;
      } else {
        let frag = this.curFrag = this.fragments[this.fragI];
        this.curTo = (_a = frag.tree.prop(stoppedInner)) !== null && _a !== void 0 ? _a : frag.to;
        this.inner = new StructureCursor(frag.tree, -frag.offset);
      }
    }
    findMounts(pos, parser7) {
      var _a;
      let result = [];
      if (this.inner) {
        this.inner.cursor.moveTo(pos, 1);
        for (let pos2 = this.inner.cursor.node; pos2; pos2 = pos2.parent) {
          let mount = (_a = pos2.tree) === null || _a === void 0 ? void 0 : _a.prop(NodeProp.mounted);
          if (mount && mount.parser == parser7) {
            for (let i = this.fragI; i < this.fragments.length; i++) {
              let frag = this.fragments[i];
              if (frag.from >= pos2.to)
                break;
              if (frag.tree == this.curFrag.tree)
                result.push({
                  frag,
                  pos: pos2.from - frag.offset,
                  mount
                });
            }
          }
        }
      }
      return result;
    }
  };
  function punchRanges(outer, ranges) {
    let copy = null, current = ranges;
    for (let i = 1, j = 0; i < outer.length; i++) {
      let gapFrom = outer[i - 1].to, gapTo = outer[i].from;
      for (; j < current.length; j++) {
        let r = current[j];
        if (r.from >= gapTo)
          break;
        if (r.to <= gapFrom)
          continue;
        if (!copy)
          current = copy = ranges.slice();
        if (r.from < gapFrom) {
          copy[j] = new Range(r.from, gapFrom);
          if (r.to > gapTo)
            copy.splice(j + 1, 0, new Range(gapTo, r.to));
        } else if (r.to > gapTo) {
          copy[j--] = new Range(gapTo, r.to);
        } else {
          copy.splice(j--, 1);
        }
      }
    }
    return current;
  }
  function findCoverChanges(a2, b, from, to) {
    let iA = 0, iB = 0, inA = false, inB = false, pos = -1e9;
    let result = [];
    for (; ; ) {
      let nextA = iA == a2.length ? 1e9 : inA ? a2[iA].to : a2[iA].from;
      let nextB = iB == b.length ? 1e9 : inB ? b[iB].to : b[iB].from;
      if (inA != inB) {
        let start = Math.max(pos, from), end = Math.min(nextA, nextB, to);
        if (start < end)
          result.push(new Range(start, end));
      }
      pos = Math.min(nextA, nextB);
      if (pos == 1e9)
        break;
      if (nextA == pos) {
        if (!inA)
          inA = true;
        else {
          inA = false;
          iA++;
        }
      }
      if (nextB == pos) {
        if (!inB)
          inB = true;
        else {
          inB = false;
          iB++;
        }
      }
    }
    return result;
  }
  function enterFragments(mounts, ranges) {
    let result = [];
    for (let { pos, mount, frag } of mounts) {
      let startPos = pos + (mount.overlay ? mount.overlay[0].from : 0), endPos = startPos + mount.tree.length;
      let from = Math.max(frag.from, startPos), to = Math.min(frag.to, endPos);
      if (mount.overlay) {
        let overlay = mount.overlay.map((r) => new Range(r.from + pos, r.to + pos));
        let changes = findCoverChanges(ranges, overlay, from, to);
        for (let i = 0, pos2 = from; ; i++) {
          let last = i == changes.length, end = last ? to : changes[i].from;
          if (end > pos2)
            result.push(new TreeFragment(pos2, end, mount.tree, -startPos, frag.from >= pos2 || frag.openStart, frag.to <= end || frag.openEnd));
          if (last)
            break;
          pos2 = changes[i].to;
        }
      } else {
        result.push(new TreeFragment(from, to, mount.tree, -startPos, frag.from >= startPos || frag.openStart, frag.to <= endPos || frag.openEnd));
      }
    }
    return result;
  }

  // node_modules/@lezer/lr/dist/index.js
  var Stack = class _Stack {
    /**
    @internal
    */
    constructor(p, stack, state, reducePos, pos, score, buffer, bufferBase, curContext, lookAhead = 0, parent) {
      this.p = p;
      this.stack = stack;
      this.state = state;
      this.reducePos = reducePos;
      this.pos = pos;
      this.score = score;
      this.buffer = buffer;
      this.bufferBase = bufferBase;
      this.curContext = curContext;
      this.lookAhead = lookAhead;
      this.parent = parent;
    }
    /**
    @internal
    */
    toString() {
      return `[${this.stack.filter((_, i) => i % 3 == 0).concat(this.state)}]@${this.pos}${this.score ? "!" + this.score : ""}`;
    }
    // Start an empty stack
    /**
    @internal
    */
    static start(p, state, pos = 0) {
      let cx = p.parser.context;
      return new _Stack(p, [], state, pos, pos, 0, [], 0, cx ? new StackContext(cx, cx.start) : null, 0, null);
    }
    /**
    The stack's current [context](#lr.ContextTracker) value, if
    any. Its type will depend on the context tracker's type
    parameter, or it will be `null` if there is no context
    tracker.
    */
    get context() {
      return this.curContext ? this.curContext.context : null;
    }
    // Push a state onto the stack, tracking its start position as well
    // as the buffer base at that point.
    /**
    @internal
    */
    pushState(state, start) {
      this.stack.push(this.state, start, this.bufferBase + this.buffer.length);
      this.state = state;
    }
    // Apply a reduce action
    /**
    @internal
    */
    reduce(action) {
      var _a;
      let depth = action >> 19, type = action & 65535;
      let { parser: parser7 } = this.p;
      let lookaheadRecord = this.reducePos < this.pos - 25 && this.setLookAhead(this.pos);
      let dPrec = parser7.dynamicPrecedence(type);
      if (dPrec)
        this.score += dPrec;
      if (depth == 0) {
        this.pushState(parser7.getGoto(this.state, type, true), this.reducePos);
        if (type < parser7.minRepeatTerm)
          this.storeNode(type, this.reducePos, this.reducePos, lookaheadRecord ? 8 : 4, true);
        this.reduceContext(type, this.reducePos);
        return;
      }
      let base = this.stack.length - (depth - 1) * 3 - (action & 262144 ? 6 : 0);
      let start = base ? this.stack[base - 2] : this.p.ranges[0].from, size = this.reducePos - start;
      if (size >= 2e3 && !((_a = this.p.parser.nodeSet.types[type]) === null || _a === void 0 ? void 0 : _a.isAnonymous)) {
        if (start == this.p.lastBigReductionStart) {
          this.p.bigReductionCount++;
          this.p.lastBigReductionSize = size;
        } else if (this.p.lastBigReductionSize < size) {
          this.p.bigReductionCount = 1;
          this.p.lastBigReductionStart = start;
          this.p.lastBigReductionSize = size;
        }
      }
      let bufferBase = base ? this.stack[base - 1] : 0, count = this.bufferBase + this.buffer.length - bufferBase;
      if (type < parser7.minRepeatTerm || action & 131072) {
        let pos = parser7.stateFlag(
          this.state,
          1
          /* StateFlag.Skipped */
        ) ? this.pos : this.reducePos;
        this.storeNode(type, start, pos, count + 4, true);
      }
      if (action & 262144) {
        this.state = this.stack[base];
      } else {
        let baseStateID = this.stack[base - 3];
        this.state = parser7.getGoto(baseStateID, type, true);
      }
      while (this.stack.length > base)
        this.stack.pop();
      this.reduceContext(type, start);
    }
    // Shift a value into the buffer
    /**
    @internal
    */
    storeNode(term, start, end, size = 4, mustSink = false) {
      if (term == 0 && (!this.stack.length || this.stack[this.stack.length - 1] < this.buffer.length + this.bufferBase)) {
        let cur = this, top = this.buffer.length;
        if (top == 0 && cur.parent) {
          top = cur.bufferBase - cur.parent.bufferBase;
          cur = cur.parent;
        }
        if (top > 0 && cur.buffer[top - 4] == 0 && cur.buffer[top - 1] > -1) {
          if (start == end)
            return;
          if (cur.buffer[top - 2] >= start) {
            cur.buffer[top - 2] = end;
            return;
          }
        }
      }
      if (!mustSink || this.pos == end) {
        this.buffer.push(term, start, end, size);
      } else {
        let index = this.buffer.length;
        if (index > 0 && (this.buffer[index - 4] != 0 || this.buffer[index - 1] < 0)) {
          let mustMove = false;
          for (let scan = index; scan > 0 && this.buffer[scan - 2] > end; scan -= 4) {
            if (this.buffer[scan - 1] >= 0) {
              mustMove = true;
              break;
            }
          }
          if (mustMove)
            while (index > 0 && this.buffer[index - 2] > end) {
              this.buffer[index] = this.buffer[index - 4];
              this.buffer[index + 1] = this.buffer[index - 3];
              this.buffer[index + 2] = this.buffer[index - 2];
              this.buffer[index + 3] = this.buffer[index - 1];
              index -= 4;
              if (size > 4)
                size -= 4;
            }
        }
        this.buffer[index] = term;
        this.buffer[index + 1] = start;
        this.buffer[index + 2] = end;
        this.buffer[index + 3] = size;
      }
    }
    // Apply a shift action
    /**
    @internal
    */
    shift(action, type, start, end) {
      if (action & 131072) {
        this.pushState(action & 65535, this.pos);
      } else if ((action & 262144) == 0) {
        let nextState = action, { parser: parser7 } = this.p;
        this.pos = end;
        let skipped = parser7.stateFlag(
          nextState,
          1
          /* StateFlag.Skipped */
        );
        if (!skipped && (end > start || type <= parser7.maxNode))
          this.reducePos = end;
        this.pushState(nextState, skipped ? start : Math.min(start, this.reducePos));
        this.shiftContext(type, start);
        if (type <= parser7.maxNode)
          this.buffer.push(type, start, end, 4);
      } else {
        this.pos = end;
        this.shiftContext(type, start);
        if (type <= this.p.parser.maxNode)
          this.buffer.push(type, start, end, 4);
      }
    }
    // Apply an action
    /**
    @internal
    */
    apply(action, next, nextStart, nextEnd) {
      if (action & 65536)
        this.reduce(action);
      else
        this.shift(action, next, nextStart, nextEnd);
    }
    // Add a prebuilt (reused) node into the buffer.
    /**
    @internal
    */
    useNode(value, next) {
      let index = this.p.reused.length - 1;
      if (index < 0 || this.p.reused[index] != value) {
        this.p.reused.push(value);
        index++;
      }
      let start = this.pos;
      this.reducePos = this.pos = start + value.length;
      this.pushState(next, start);
      this.buffer.push(
        index,
        start,
        this.reducePos,
        -1
        /* size == -1 means this is a reused value */
      );
      if (this.curContext)
        this.updateContext(this.curContext.tracker.reuse(this.curContext.context, value, this, this.p.stream.reset(this.pos - value.length)));
    }
    // Split the stack. Due to the buffer sharing and the fact
    // that `this.stack` tends to stay quite shallow, this isn't very
    // expensive.
    /**
    @internal
    */
    split() {
      let parent = this;
      let off = parent.buffer.length;
      while (off > 0 && parent.buffer[off - 2] > parent.reducePos)
        off -= 4;
      let buffer = parent.buffer.slice(off), base = parent.bufferBase + off;
      while (parent && base == parent.bufferBase)
        parent = parent.parent;
      return new _Stack(this.p, this.stack.slice(), this.state, this.reducePos, this.pos, this.score, buffer, base, this.curContext, this.lookAhead, parent);
    }
    // Try to recover from an error by 'deleting' (ignoring) one token.
    /**
    @internal
    */
    recoverByDelete(next, nextEnd) {
      let isNode = next <= this.p.parser.maxNode;
      if (isNode)
        this.storeNode(next, this.pos, nextEnd, 4);
      this.storeNode(0, this.pos, nextEnd, isNode ? 8 : 4);
      this.pos = this.reducePos = nextEnd;
      this.score -= 190;
    }
    /**
    Check if the given term would be able to be shifted (optionally
    after some reductions) on this stack. This can be useful for
    external tokenizers that want to make sure they only provide a
    given token when it applies.
    */
    canShift(term) {
      for (let sim = new SimulatedStack(this); ; ) {
        let action = this.p.parser.stateSlot(
          sim.state,
          4
          /* ParseState.DefaultReduce */
        ) || this.p.parser.hasAction(sim.state, term);
        if (action == 0)
          return false;
        if ((action & 65536) == 0)
          return true;
        sim.reduce(action);
      }
    }
    // Apply up to Recover.MaxNext recovery actions that conceptually
    // inserts some missing token or rule.
    /**
    @internal
    */
    recoverByInsert(next) {
      if (this.stack.length >= 300)
        return [];
      let nextStates = this.p.parser.nextStates(this.state);
      if (nextStates.length > 4 << 1 || this.stack.length >= 120) {
        let best = [];
        for (let i = 0, s; i < nextStates.length; i += 2) {
          if ((s = nextStates[i + 1]) != this.state && this.p.parser.hasAction(s, next))
            best.push(nextStates[i], s);
        }
        if (this.stack.length < 120)
          for (let i = 0; best.length < 4 << 1 && i < nextStates.length; i += 2) {
            let s = nextStates[i + 1];
            if (!best.some((v, i2) => i2 & 1 && v == s))
              best.push(nextStates[i], s);
          }
        nextStates = best;
      }
      let result = [];
      for (let i = 0; i < nextStates.length && result.length < 4; i += 2) {
        let s = nextStates[i + 1];
        if (s == this.state)
          continue;
        let stack = this.split();
        stack.pushState(s, this.pos);
        stack.storeNode(0, stack.pos, stack.pos, 4, true);
        stack.shiftContext(nextStates[i], this.pos);
        stack.reducePos = this.pos;
        stack.score -= 200;
        result.push(stack);
      }
      return result;
    }
    // Force a reduce, if possible. Return false if that can't
    // be done.
    /**
    @internal
    */
    forceReduce() {
      let { parser: parser7 } = this.p;
      let reduce = parser7.stateSlot(
        this.state,
        5
        /* ParseState.ForcedReduce */
      );
      if ((reduce & 65536) == 0)
        return false;
      if (!parser7.validAction(this.state, reduce)) {
        let depth = reduce >> 19, term = reduce & 65535;
        let target = this.stack.length - depth * 3;
        if (target < 0 || parser7.getGoto(this.stack[target], term, false) < 0) {
          let backup = this.findForcedReduction();
          if (backup == null)
            return false;
          reduce = backup;
        }
        this.storeNode(0, this.pos, this.pos, 4, true);
        this.score -= 100;
      }
      this.reducePos = this.pos;
      this.reduce(reduce);
      return true;
    }
    /**
    Try to scan through the automaton to find some kind of reduction
    that can be applied. Used when the regular ForcedReduce field
    isn't a valid action. @internal
    */
    findForcedReduction() {
      let { parser: parser7 } = this.p, seen = [];
      let explore = (state, depth) => {
        if (seen.includes(state))
          return;
        seen.push(state);
        return parser7.allActions(state, (action) => {
          if (action & (262144 | 131072)) ;
          else if (action & 65536) {
            let rDepth = (action >> 19) - depth;
            if (rDepth > 1) {
              let term = action & 65535, target = this.stack.length - rDepth * 3;
              if (target >= 0 && parser7.getGoto(this.stack[target], term, false) >= 0)
                return rDepth << 19 | 65536 | term;
            }
          } else {
            let found = explore(action, depth + 1);
            if (found != null)
              return found;
          }
        });
      };
      return explore(this.state, 0);
    }
    /**
    @internal
    */
    forceAll() {
      while (!this.p.parser.stateFlag(
        this.state,
        2
        /* StateFlag.Accepting */
      )) {
        if (!this.forceReduce()) {
          this.storeNode(0, this.pos, this.pos, 4, true);
          break;
        }
      }
      return this;
    }
    /**
    Check whether this state has no further actions (assumed to be a direct descendant of the
    top state, since any other states must be able to continue
    somehow). @internal
    */
    get deadEnd() {
      if (this.stack.length != 3)
        return false;
      let { parser: parser7 } = this.p;
      return parser7.data[parser7.stateSlot(
        this.state,
        1
        /* ParseState.Actions */
      )] == 65535 && !parser7.stateSlot(
        this.state,
        4
        /* ParseState.DefaultReduce */
      );
    }
    /**
    Restart the stack (put it back in its start state). Only safe
    when this.stack.length == 3 (state is directly below the top
    state). @internal
    */
    restart() {
      this.storeNode(0, this.pos, this.pos, 4, true);
      this.state = this.stack[0];
      this.stack.length = 0;
    }
    /**
    @internal
    */
    sameState(other) {
      if (this.state != other.state || this.stack.length != other.stack.length)
        return false;
      for (let i = 0; i < this.stack.length; i += 3)
        if (this.stack[i] != other.stack[i])
          return false;
      return true;
    }
    /**
    Get the parser used by this stack.
    */
    get parser() {
      return this.p.parser;
    }
    /**
    Test whether a given dialect (by numeric ID, as exported from
    the terms file) is enabled.
    */
    dialectEnabled(dialectID) {
      return this.p.parser.dialect.flags[dialectID];
    }
    shiftContext(term, start) {
      if (this.curContext)
        this.updateContext(this.curContext.tracker.shift(this.curContext.context, term, this, this.p.stream.reset(start)));
    }
    reduceContext(term, start) {
      if (this.curContext)
        this.updateContext(this.curContext.tracker.reduce(this.curContext.context, term, this, this.p.stream.reset(start)));
    }
    /**
    @internal
    */
    emitContext() {
      let last = this.buffer.length - 1;
      if (last < 0 || this.buffer[last] != -3)
        this.buffer.push(this.curContext.hash, this.pos, this.pos, -3);
    }
    /**
    @internal
    */
    emitLookAhead() {
      let last = this.buffer.length - 1;
      if (last < 0 || this.buffer[last] != -4)
        this.buffer.push(this.lookAhead, this.pos, this.pos, -4);
    }
    updateContext(context) {
      if (context != this.curContext.context) {
        let newCx = new StackContext(this.curContext.tracker, context);
        if (newCx.hash != this.curContext.hash)
          this.emitContext();
        this.curContext = newCx;
      }
    }
    /**
    @internal
    */
    setLookAhead(lookAhead) {
      if (lookAhead <= this.lookAhead)
        return false;
      this.emitLookAhead();
      this.lookAhead = lookAhead;
      return true;
    }
    /**
    @internal
    */
    close() {
      if (this.curContext && this.curContext.tracker.strict)
        this.emitContext();
      if (this.lookAhead > 0)
        this.emitLookAhead();
    }
  };
  var StackContext = class {
    constructor(tracker, context) {
      this.tracker = tracker;
      this.context = context;
      this.hash = tracker.strict ? tracker.hash(context) : 0;
    }
  };
  var SimulatedStack = class {
    constructor(start) {
      this.start = start;
      this.state = start.state;
      this.stack = start.stack;
      this.base = this.stack.length;
    }
    reduce(action) {
      let term = action & 65535, depth = action >> 19;
      if (depth == 0) {
        if (this.stack == this.start.stack)
          this.stack = this.stack.slice();
        this.stack.push(this.state, 0, 0);
        this.base += 3;
      } else {
        this.base -= (depth - 1) * 3;
      }
      let goto = this.start.p.parser.getGoto(this.stack[this.base - 3], term, true);
      this.state = goto;
    }
  };
  var StackBufferCursor = class _StackBufferCursor {
    constructor(stack, pos, index) {
      this.stack = stack;
      this.pos = pos;
      this.index = index;
      this.buffer = stack.buffer;
      if (this.index == 0)
        this.maybeNext();
    }
    static create(stack, pos = stack.bufferBase + stack.buffer.length) {
      return new _StackBufferCursor(stack, pos, pos - stack.bufferBase);
    }
    maybeNext() {
      let next = this.stack.parent;
      if (next != null) {
        this.index = this.stack.bufferBase - next.bufferBase;
        this.stack = next;
        this.buffer = next.buffer;
      }
    }
    get id() {
      return this.buffer[this.index - 4];
    }
    get start() {
      return this.buffer[this.index - 3];
    }
    get end() {
      return this.buffer[this.index - 2];
    }
    get size() {
      return this.buffer[this.index - 1];
    }
    next() {
      this.index -= 4;
      this.pos -= 4;
      if (this.index == 0)
        this.maybeNext();
    }
    fork() {
      return new _StackBufferCursor(this.stack, this.pos, this.index);
    }
  };
  function decodeArray(input, Type2 = Uint16Array) {
    if (typeof input != "string")
      return input;
    let array = null;
    for (let pos = 0, out = 0; pos < input.length; ) {
      let value = 0;
      for (; ; ) {
        let next = input.charCodeAt(pos++), stop = false;
        if (next == 126) {
          value = 65535;
          break;
        }
        if (next >= 92)
          next--;
        if (next >= 34)
          next--;
        let digit = next - 32;
        if (digit >= 46) {
          digit -= 46;
          stop = true;
        }
        value += digit;
        if (stop)
          break;
        value *= 46;
      }
      if (array)
        array[out++] = value;
      else
        array = new Type2(value);
    }
    return array;
  }
  var CachedToken = class {
    constructor() {
      this.start = -1;
      this.value = -1;
      this.end = -1;
      this.extended = -1;
      this.lookAhead = 0;
      this.mask = 0;
      this.context = 0;
    }
  };
  var nullToken = new CachedToken();
  var InputStream = class {
    /**
    @internal
    */
    constructor(input, ranges) {
      this.input = input;
      this.ranges = ranges;
      this.chunk = "";
      this.chunkOff = 0;
      this.chunk2 = "";
      this.chunk2Pos = 0;
      this.next = -1;
      this.token = nullToken;
      this.rangeIndex = 0;
      this.pos = this.chunkPos = ranges[0].from;
      this.range = ranges[0];
      this.end = ranges[ranges.length - 1].to;
      this.readNext();
    }
    /**
    @internal
    */
    resolveOffset(offset, assoc) {
      let range = this.range, index = this.rangeIndex;
      let pos = this.pos + offset;
      while (pos < range.from) {
        if (!index)
          return null;
        let next = this.ranges[--index];
        pos -= range.from - next.to;
        range = next;
      }
      while (assoc < 0 ? pos > range.to : pos >= range.to) {
        if (index == this.ranges.length - 1)
          return null;
        let next = this.ranges[++index];
        pos += next.from - range.to;
        range = next;
      }
      return pos;
    }
    /**
    @internal
    */
    clipPos(pos) {
      if (pos >= this.range.from && pos < this.range.to)
        return pos;
      for (let range of this.ranges)
        if (range.to > pos)
          return Math.max(pos, range.from);
      return this.end;
    }
    /**
    Look at a code unit near the stream position. `.peek(0)` equals
    `.next`, `.peek(-1)` gives you the previous character, and so
    on.
    
    Note that looking around during tokenizing creates dependencies
    on potentially far-away content, which may reduce the
    effectiveness incremental parsing—when looking forward—or even
    cause invalid reparses when looking backward more than 25 code
    units, since the library does not track lookbehind.
    */
    peek(offset) {
      let idx = this.chunkOff + offset, pos, result;
      if (idx >= 0 && idx < this.chunk.length) {
        pos = this.pos + offset;
        result = this.chunk.charCodeAt(idx);
      } else {
        let resolved = this.resolveOffset(offset, 1);
        if (resolved == null)
          return -1;
        pos = resolved;
        if (pos >= this.chunk2Pos && pos < this.chunk2Pos + this.chunk2.length) {
          result = this.chunk2.charCodeAt(pos - this.chunk2Pos);
        } else {
          let i = this.rangeIndex, range = this.range;
          while (range.to <= pos)
            range = this.ranges[++i];
          this.chunk2 = this.input.chunk(this.chunk2Pos = pos);
          if (pos + this.chunk2.length > range.to)
            this.chunk2 = this.chunk2.slice(0, range.to - pos);
          result = this.chunk2.charCodeAt(0);
        }
      }
      if (pos >= this.token.lookAhead)
        this.token.lookAhead = pos + 1;
      return result;
    }
    /**
    Accept a token. By default, the end of the token is set to the
    current stream position, but you can pass an offset (relative to
    the stream position) to change that.
    */
    acceptToken(token, endOffset = 0) {
      let end = endOffset ? this.resolveOffset(endOffset, -1) : this.pos;
      if (end == null || end < this.token.start)
        throw new RangeError("Token end out of bounds");
      this.token.value = token;
      this.token.end = end;
    }
    /**
    Accept a token ending at a specific given position.
    */
    acceptTokenTo(token, endPos) {
      this.token.value = token;
      this.token.end = endPos;
    }
    getChunk() {
      if (this.pos >= this.chunk2Pos && this.pos < this.chunk2Pos + this.chunk2.length) {
        let { chunk, chunkPos } = this;
        this.chunk = this.chunk2;
        this.chunkPos = this.chunk2Pos;
        this.chunk2 = chunk;
        this.chunk2Pos = chunkPos;
        this.chunkOff = this.pos - this.chunkPos;
      } else {
        this.chunk2 = this.chunk;
        this.chunk2Pos = this.chunkPos;
        let nextChunk = this.input.chunk(this.pos);
        let end = this.pos + nextChunk.length;
        this.chunk = end > this.range.to ? nextChunk.slice(0, this.range.to - this.pos) : nextChunk;
        this.chunkPos = this.pos;
        this.chunkOff = 0;
      }
    }
    readNext() {
      if (this.chunkOff >= this.chunk.length) {
        this.getChunk();
        if (this.chunkOff == this.chunk.length)
          return this.next = -1;
      }
      return this.next = this.chunk.charCodeAt(this.chunkOff);
    }
    /**
    Move the stream forward N (defaults to 1) code units. Returns
    the new value of [`next`](#lr.InputStream.next).
    */
    advance(n = 1) {
      this.chunkOff += n;
      while (this.pos + n >= this.range.to) {
        if (this.rangeIndex == this.ranges.length - 1)
          return this.setDone();
        n -= this.range.to - this.pos;
        this.range = this.ranges[++this.rangeIndex];
        this.pos = this.range.from;
      }
      this.pos += n;
      if (this.pos >= this.token.lookAhead)
        this.token.lookAhead = this.pos + 1;
      return this.readNext();
    }
    setDone() {
      this.pos = this.chunkPos = this.end;
      this.range = this.ranges[this.rangeIndex = this.ranges.length - 1];
      this.chunk = "";
      return this.next = -1;
    }
    /**
    @internal
    */
    reset(pos, token) {
      if (token) {
        this.token = token;
        token.start = pos;
        token.lookAhead = pos + 1;
        token.value = token.extended = -1;
      } else {
        this.token = nullToken;
      }
      if (this.pos != pos) {
        this.pos = pos;
        if (pos == this.end) {
          this.setDone();
          return this;
        }
        while (pos < this.range.from)
          this.range = this.ranges[--this.rangeIndex];
        while (pos >= this.range.to)
          this.range = this.ranges[++this.rangeIndex];
        if (pos >= this.chunkPos && pos < this.chunkPos + this.chunk.length) {
          this.chunkOff = pos - this.chunkPos;
        } else {
          this.chunk = "";
          this.chunkOff = 0;
        }
        this.readNext();
      }
      return this;
    }
    /**
    @internal
    */
    read(from, to) {
      if (from >= this.chunkPos && to <= this.chunkPos + this.chunk.length)
        return this.chunk.slice(from - this.chunkPos, to - this.chunkPos);
      if (from >= this.chunk2Pos && to <= this.chunk2Pos + this.chunk2.length)
        return this.chunk2.slice(from - this.chunk2Pos, to - this.chunk2Pos);
      if (from >= this.range.from && to <= this.range.to)
        return this.input.read(from, to);
      let result = "";
      for (let r of this.ranges) {
        if (r.from >= to)
          break;
        if (r.to > from)
          result += this.input.read(Math.max(r.from, from), Math.min(r.to, to));
      }
      return result;
    }
  };
  var TokenGroup = class {
    constructor(data, id2) {
      this.data = data;
      this.id = id2;
    }
    token(input, stack) {
      let { parser: parser7 } = stack.p;
      readToken(this.data, input, stack, this.id, parser7.data, parser7.tokenPrecTable);
    }
  };
  TokenGroup.prototype.contextual = TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
  var LocalTokenGroup = class {
    constructor(data, precTable, elseToken) {
      this.precTable = precTable;
      this.elseToken = elseToken;
      this.data = typeof data == "string" ? decodeArray(data) : data;
    }
    token(input, stack) {
      let start = input.pos, skipped = 0;
      for (; ; ) {
        let atEof = input.next < 0, nextPos = input.resolveOffset(1, 1);
        readToken(this.data, input, stack, 0, this.data, this.precTable);
        if (input.token.value > -1)
          break;
        if (this.elseToken == null)
          return;
        if (!atEof)
          skipped++;
        if (nextPos == null)
          break;
        input.reset(nextPos, input.token);
      }
      if (skipped) {
        input.reset(start, input.token);
        input.acceptToken(this.elseToken, skipped);
      }
    }
  };
  LocalTokenGroup.prototype.contextual = TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
  var ExternalTokenizer = class {
    /**
    Create a tokenizer. The first argument is the function that,
    given an input stream, scans for the types of tokens it
    recognizes at the stream's position, and calls
    [`acceptToken`](#lr.InputStream.acceptToken) when it finds
    one.
    */
    constructor(token, options = {}) {
      this.token = token;
      this.contextual = !!options.contextual;
      this.fallback = !!options.fallback;
      this.extend = !!options.extend;
    }
  };
  function readToken(data, input, stack, group, precTable, precOffset) {
    let state = 0, groupMask = 1 << group, { dialect } = stack.p.parser;
    scan: for (; ; ) {
      if ((groupMask & data[state]) == 0)
        break;
      let accEnd = data[state + 1];
      for (let i = state + 3; i < accEnd; i += 2)
        if ((data[i + 1] & groupMask) > 0) {
          let term = data[i];
          if (dialect.allows(term) && (input.token.value == -1 || input.token.value == term || overrides(term, input.token.value, precTable, precOffset))) {
            input.acceptToken(term);
            break;
          }
        }
      let next = input.next, low = 0, high = data[state + 2];
      if (input.next < 0 && high > low && data[accEnd + high * 3 - 3] == 65535) {
        state = data[accEnd + high * 3 - 1];
        continue scan;
      }
      for (; low < high; ) {
        let mid = low + high >> 1;
        let index = accEnd + mid + (mid << 1);
        let from = data[index], to = data[index + 1] || 65536;
        if (next < from)
          high = mid;
        else if (next >= to)
          low = mid + 1;
        else {
          state = data[index + 2];
          input.advance();
          continue scan;
        }
      }
      break;
    }
  }
  function findOffset(data, start, term) {
    for (let i = start, next; (next = data[i]) != 65535; i++)
      if (next == term)
        return i - start;
    return -1;
  }
  function overrides(token, prev, tableData, tableOffset) {
    let iPrev = findOffset(tableData, tableOffset, prev);
    return iPrev < 0 || findOffset(tableData, tableOffset, token) < iPrev;
  }
  var verbose = typeof process != "undefined" && process.env && /\bparse\b/.test(process.env.LOG);
  var stackIDs = null;
  function cutAt(tree, pos, side) {
    let cursor = tree.cursor(IterMode.IncludeAnonymous);
    cursor.moveTo(pos);
    for (; ; ) {
      if (!(side < 0 ? cursor.childBefore(pos) : cursor.childAfter(pos)))
        for (; ; ) {
          if ((side < 0 ? cursor.to < pos : cursor.from > pos) && !cursor.type.isError)
            return side < 0 ? Math.max(0, Math.min(
              cursor.to - 1,
              pos - 25
              /* Lookahead.Margin */
            )) : Math.min(tree.length, Math.max(
              cursor.from + 1,
              pos + 25
              /* Lookahead.Margin */
            ));
          if (side < 0 ? cursor.prevSibling() : cursor.nextSibling())
            break;
          if (!cursor.parent())
            return side < 0 ? 0 : tree.length;
        }
    }
  }
  var FragmentCursor2 = class {
    constructor(fragments, nodeSet) {
      this.fragments = fragments;
      this.nodeSet = nodeSet;
      this.i = 0;
      this.fragment = null;
      this.safeFrom = -1;
      this.safeTo = -1;
      this.trees = [];
      this.start = [];
      this.index = [];
      this.nextFragment();
    }
    nextFragment() {
      let fr = this.fragment = this.i == this.fragments.length ? null : this.fragments[this.i++];
      if (fr) {
        this.safeFrom = fr.openStart ? cutAt(fr.tree, fr.from + fr.offset, 1) - fr.offset : fr.from;
        this.safeTo = fr.openEnd ? cutAt(fr.tree, fr.to + fr.offset, -1) - fr.offset : fr.to;
        while (this.trees.length) {
          this.trees.pop();
          this.start.pop();
          this.index.pop();
        }
        this.trees.push(fr.tree);
        this.start.push(-fr.offset);
        this.index.push(0);
        this.nextStart = this.safeFrom;
      } else {
        this.nextStart = 1e9;
      }
    }
    // `pos` must be >= any previously given `pos` for this cursor
    nodeAt(pos) {
      if (pos < this.nextStart)
        return null;
      while (this.fragment && this.safeTo <= pos)
        this.nextFragment();
      if (!this.fragment)
        return null;
      for (; ; ) {
        let last = this.trees.length - 1;
        if (last < 0) {
          this.nextFragment();
          return null;
        }
        let top = this.trees[last], index = this.index[last];
        if (index == top.children.length) {
          this.trees.pop();
          this.start.pop();
          this.index.pop();
          continue;
        }
        let next = top.children[index];
        let start = this.start[last] + top.positions[index];
        if (start > pos) {
          this.nextStart = start;
          return null;
        }
        if (next instanceof Tree) {
          if (start == pos) {
            if (start < this.safeFrom)
              return null;
            let end = start + next.length;
            if (end <= this.safeTo) {
              let lookAhead = next.prop(NodeProp.lookAhead);
              if (!lookAhead || end + lookAhead < this.fragment.to)
                return next;
            }
          }
          this.index[last]++;
          if (start + next.length >= Math.max(this.safeFrom, pos)) {
            this.trees.push(next);
            this.start.push(start);
            this.index.push(0);
          }
        } else {
          this.index[last]++;
          this.nextStart = start + next.length;
        }
      }
    }
  };
  var TokenCache = class {
    constructor(parser7, stream) {
      this.stream = stream;
      this.tokens = [];
      this.mainToken = null;
      this.actions = [];
      this.tokens = parser7.tokenizers.map((_) => new CachedToken());
    }
    getActions(stack) {
      let actionIndex = 0;
      let main = null;
      let { parser: parser7 } = stack.p, { tokenizers } = parser7;
      let mask = parser7.stateSlot(
        stack.state,
        3
        /* ParseState.TokenizerMask */
      );
      let context = stack.curContext ? stack.curContext.hash : 0;
      let lookAhead = 0;
      for (let i = 0; i < tokenizers.length; i++) {
        if ((1 << i & mask) == 0)
          continue;
        let tokenizer = tokenizers[i], token = this.tokens[i];
        if (main && !tokenizer.fallback)
          continue;
        if (tokenizer.contextual || token.start != stack.pos || token.mask != mask || token.context != context) {
          this.updateCachedToken(token, tokenizer, stack);
          token.mask = mask;
          token.context = context;
        }
        if (token.lookAhead > token.end + 25)
          lookAhead = Math.max(token.lookAhead, lookAhead);
        if (token.value != 0) {
          let startIndex = actionIndex;
          if (token.extended > -1)
            actionIndex = this.addActions(stack, token.extended, token.end, actionIndex);
          actionIndex = this.addActions(stack, token.value, token.end, actionIndex);
          if (!tokenizer.extend) {
            main = token;
            if (actionIndex > startIndex)
              break;
          }
        }
      }
      while (this.actions.length > actionIndex)
        this.actions.pop();
      if (lookAhead)
        stack.setLookAhead(lookAhead);
      if (!main && stack.pos == this.stream.end) {
        main = new CachedToken();
        main.value = stack.p.parser.eofTerm;
        main.start = main.end = stack.pos;
        actionIndex = this.addActions(stack, main.value, main.end, actionIndex);
      }
      this.mainToken = main;
      return this.actions;
    }
    getMainToken(stack) {
      if (this.mainToken)
        return this.mainToken;
      let main = new CachedToken(), { pos, p } = stack;
      main.start = pos;
      main.end = Math.min(pos + 1, p.stream.end);
      main.value = pos == p.stream.end ? p.parser.eofTerm : 0;
      return main;
    }
    updateCachedToken(token, tokenizer, stack) {
      let start = this.stream.clipPos(stack.pos);
      tokenizer.token(this.stream.reset(start, token), stack);
      if (token.value > -1) {
        let { parser: parser7 } = stack.p;
        for (let i = 0; i < parser7.specialized.length; i++)
          if (parser7.specialized[i] == token.value) {
            let result = parser7.specializers[i](this.stream.read(token.start, token.end), stack);
            if (result >= 0 && stack.p.parser.dialect.allows(result >> 1)) {
              if ((result & 1) == 0)
                token.value = result >> 1;
              else
                token.extended = result >> 1;
              break;
            }
          }
      } else {
        token.value = 0;
        token.end = this.stream.clipPos(start + 1);
      }
    }
    putAction(action, token, end, index) {
      for (let i = 0; i < index; i += 3)
        if (this.actions[i] == action)
          return index;
      this.actions[index++] = action;
      this.actions[index++] = token;
      this.actions[index++] = end;
      return index;
    }
    addActions(stack, token, end, index) {
      let { state } = stack, { parser: parser7 } = stack.p, { data } = parser7;
      for (let set = 0; set < 2; set++) {
        for (let i = parser7.stateSlot(
          state,
          set ? 2 : 1
          /* ParseState.Actions */
        ); ; i += 3) {
          if (data[i] == 65535) {
            if (data[i + 1] == 1) {
              i = pair(data, i + 2);
            } else {
              if (index == 0 && data[i + 1] == 2)
                index = this.putAction(pair(data, i + 2), token, end, index);
              break;
            }
          }
          if (data[i] == token)
            index = this.putAction(pair(data, i + 1), token, end, index);
        }
      }
      return index;
    }
  };
  var Parse = class {
    constructor(parser7, input, fragments, ranges) {
      this.parser = parser7;
      this.input = input;
      this.ranges = ranges;
      this.recovering = 0;
      this.nextStackID = 9812;
      this.minStackPos = 0;
      this.reused = [];
      this.stoppedAt = null;
      this.lastBigReductionStart = -1;
      this.lastBigReductionSize = 0;
      this.bigReductionCount = 0;
      this.stream = new InputStream(input, ranges);
      this.tokens = new TokenCache(parser7, this.stream);
      this.topTerm = parser7.top[1];
      let { from } = ranges[0];
      this.stacks = [Stack.start(this, parser7.top[0], from)];
      this.fragments = fragments.length && this.stream.end - from > parser7.bufferLength * 4 ? new FragmentCursor2(fragments, parser7.nodeSet) : null;
    }
    get parsedPos() {
      return this.minStackPos;
    }
    // Move the parser forward. This will process all parse stacks at
    // `this.pos` and try to advance them to a further position. If no
    // stack for such a position is found, it'll start error-recovery.
    //
    // When the parse is finished, this will return a syntax tree. When
    // not, it returns `null`.
    advance() {
      let stacks = this.stacks, pos = this.minStackPos;
      let newStacks = this.stacks = [];
      let stopped, stoppedTokens;
      if (this.bigReductionCount > 300 && stacks.length == 1) {
        let [s] = stacks;
        while (s.forceReduce() && s.stack.length && s.stack[s.stack.length - 2] >= this.lastBigReductionStart) {
        }
        this.bigReductionCount = this.lastBigReductionSize = 0;
      }
      for (let i = 0; i < stacks.length; i++) {
        let stack = stacks[i];
        for (; ; ) {
          this.tokens.mainToken = null;
          if (stack.pos > pos) {
            newStacks.push(stack);
          } else if (this.advanceStack(stack, newStacks, stacks)) {
            continue;
          } else {
            if (!stopped) {
              stopped = [];
              stoppedTokens = [];
            }
            stopped.push(stack);
            let tok = this.tokens.getMainToken(stack);
            stoppedTokens.push(tok.value, tok.end);
          }
          break;
        }
      }
      if (!newStacks.length) {
        let finished = stopped && findFinished(stopped);
        if (finished) {
          if (verbose)
            console.log("Finish with " + this.stackID(finished));
          return this.stackToTree(finished);
        }
        if (this.parser.strict) {
          if (verbose && stopped)
            console.log("Stuck with token " + (this.tokens.mainToken ? this.parser.getName(this.tokens.mainToken.value) : "none"));
          throw new SyntaxError("No parse at " + pos);
        }
        if (!this.recovering)
          this.recovering = 5;
      }
      if (this.recovering && stopped) {
        let finished = this.stoppedAt != null && stopped[0].pos > this.stoppedAt ? stopped[0] : this.runRecovery(stopped, stoppedTokens, newStacks);
        if (finished) {
          if (verbose)
            console.log("Force-finish " + this.stackID(finished));
          return this.stackToTree(finished.forceAll());
        }
      }
      if (this.recovering) {
        let maxRemaining = this.recovering == 1 ? 1 : this.recovering * 3;
        if (newStacks.length > maxRemaining) {
          newStacks.sort((a2, b) => b.score - a2.score);
          while (newStacks.length > maxRemaining)
            newStacks.pop();
        }
        if (newStacks.some((s) => s.reducePos > pos))
          this.recovering--;
      } else if (newStacks.length > 1) {
        outer: for (let i = 0; i < newStacks.length - 1; i++) {
          let stack = newStacks[i];
          for (let j = i + 1; j < newStacks.length; j++) {
            let other = newStacks[j];
            if (stack.sameState(other) || stack.buffer.length > 500 && other.buffer.length > 500) {
              if ((stack.score - other.score || stack.buffer.length - other.buffer.length) > 0) {
                newStacks.splice(j--, 1);
              } else {
                newStacks.splice(i--, 1);
                continue outer;
              }
            }
          }
        }
        if (newStacks.length > 12) {
          newStacks.sort((a2, b) => b.score - a2.score);
          newStacks.splice(
            12,
            newStacks.length - 12
            /* Rec.MaxStackCount */
          );
        }
      }
      this.minStackPos = newStacks[0].pos;
      for (let i = 1; i < newStacks.length; i++)
        if (newStacks[i].pos < this.minStackPos)
          this.minStackPos = newStacks[i].pos;
      return null;
    }
    stopAt(pos) {
      if (this.stoppedAt != null && this.stoppedAt < pos)
        throw new RangeError("Can't move stoppedAt forward");
      this.stoppedAt = pos;
    }
    // Returns an updated version of the given stack, or null if the
    // stack can't advance normally. When `split` and `stacks` are
    // given, stacks split off by ambiguous operations will be pushed to
    // `split`, or added to `stacks` if they move `pos` forward.
    advanceStack(stack, stacks, split) {
      let start = stack.pos, { parser: parser7 } = this;
      let base = verbose ? this.stackID(stack) + " -> " : "";
      if (this.stoppedAt != null && start > this.stoppedAt)
        return stack.forceReduce() ? stack : null;
      if (this.fragments) {
        let strictCx = stack.curContext && stack.curContext.tracker.strict, cxHash = strictCx ? stack.curContext.hash : 0;
        for (let cached = this.fragments.nodeAt(start); cached; ) {
          let match = this.parser.nodeSet.types[cached.type.id] == cached.type ? parser7.getGoto(stack.state, cached.type.id) : -1;
          if (match > -1 && cached.length && (!strictCx || (cached.prop(NodeProp.contextHash) || 0) == cxHash)) {
            stack.useNode(cached, match);
            if (verbose)
              console.log(base + this.stackID(stack) + ` (via reuse of ${parser7.getName(cached.type.id)})`);
            return true;
          }
          if (!(cached instanceof Tree) || cached.children.length == 0 || cached.positions[0] > 0)
            break;
          let inner = cached.children[0];
          if (inner instanceof Tree && cached.positions[0] == 0)
            cached = inner;
          else
            break;
        }
      }
      let defaultReduce = parser7.stateSlot(
        stack.state,
        4
        /* ParseState.DefaultReduce */
      );
      if (defaultReduce > 0) {
        stack.reduce(defaultReduce);
        if (verbose)
          console.log(base + this.stackID(stack) + ` (via always-reduce ${parser7.getName(
            defaultReduce & 65535
            /* Action.ValueMask */
          )})`);
        return true;
      }
      if (stack.stack.length >= 8400) {
        while (stack.stack.length > 6e3 && stack.forceReduce()) {
        }
      }
      let actions = this.tokens.getActions(stack);
      for (let i = 0; i < actions.length; ) {
        let action = actions[i++], term = actions[i++], end = actions[i++];
        let last = i == actions.length || !split;
        let localStack = last ? stack : stack.split();
        let main = this.tokens.mainToken;
        localStack.apply(action, term, main ? main.start : localStack.pos, end);
        if (verbose)
          console.log(base + this.stackID(localStack) + ` (via ${(action & 65536) == 0 ? "shift" : `reduce of ${parser7.getName(
            action & 65535
            /* Action.ValueMask */
          )}`} for ${parser7.getName(term)} @ ${start}${localStack == stack ? "" : ", split"})`);
        if (last)
          return true;
        else if (localStack.pos > start)
          stacks.push(localStack);
        else
          split.push(localStack);
      }
      return false;
    }
    // Advance a given stack forward as far as it will go. Returns the
    // (possibly updated) stack if it got stuck, or null if it moved
    // forward and was given to `pushStackDedup`.
    advanceFully(stack, newStacks) {
      let pos = stack.pos;
      for (; ; ) {
        if (!this.advanceStack(stack, null, null))
          return false;
        if (stack.pos > pos) {
          pushStackDedup(stack, newStacks);
          return true;
        }
      }
    }
    runRecovery(stacks, tokens, newStacks) {
      let finished = null, restarted = false;
      for (let i = 0; i < stacks.length; i++) {
        let stack = stacks[i], token = tokens[i << 1], tokenEnd = tokens[(i << 1) + 1];
        let base = verbose ? this.stackID(stack) + " -> " : "";
        if (stack.deadEnd) {
          if (restarted)
            continue;
          restarted = true;
          stack.restart();
          if (verbose)
            console.log(base + this.stackID(stack) + " (restarted)");
          let done = this.advanceFully(stack, newStacks);
          if (done)
            continue;
        }
        let force = stack.split(), forceBase = base;
        for (let j = 0; j < 10 && force.forceReduce(); j++) {
          if (verbose)
            console.log(forceBase + this.stackID(force) + " (via force-reduce)");
          let done = this.advanceFully(force, newStacks);
          if (done)
            break;
          if (verbose)
            forceBase = this.stackID(force) + " -> ";
        }
        for (let insert of stack.recoverByInsert(token)) {
          if (verbose)
            console.log(base + this.stackID(insert) + " (via recover-insert)");
          this.advanceFully(insert, newStacks);
        }
        if (this.stream.end > stack.pos) {
          if (tokenEnd == stack.pos) {
            tokenEnd++;
            token = 0;
          }
          stack.recoverByDelete(token, tokenEnd);
          if (verbose)
            console.log(base + this.stackID(stack) + ` (via recover-delete ${this.parser.getName(token)})`);
          pushStackDedup(stack, newStacks);
        } else if (!finished || finished.score < force.score) {
          finished = force;
        }
      }
      return finished;
    }
    // Convert the stack's buffer to a syntax tree.
    stackToTree(stack) {
      stack.close();
      return Tree.build({
        buffer: StackBufferCursor.create(stack),
        nodeSet: this.parser.nodeSet,
        topID: this.topTerm,
        maxBufferLength: this.parser.bufferLength,
        reused: this.reused,
        start: this.ranges[0].from,
        length: stack.pos - this.ranges[0].from,
        minRepeatType: this.parser.minRepeatTerm
      });
    }
    stackID(stack) {
      let id2 = (stackIDs || (stackIDs = /* @__PURE__ */ new WeakMap())).get(stack);
      if (!id2)
        stackIDs.set(stack, id2 = String.fromCodePoint(this.nextStackID++));
      return id2 + stack;
    }
  };
  function pushStackDedup(stack, newStacks) {
    for (let i = 0; i < newStacks.length; i++) {
      let other = newStacks[i];
      if (other.pos == stack.pos && other.sameState(stack)) {
        if (newStacks[i].score < stack.score)
          newStacks[i] = stack;
        return;
      }
    }
    newStacks.push(stack);
  }
  var Dialect = class {
    constructor(source, flags, disabled) {
      this.source = source;
      this.flags = flags;
      this.disabled = disabled;
    }
    allows(term) {
      return !this.disabled || this.disabled[term] == 0;
    }
  };
  var id = (x) => x;
  var ContextTracker = class {
    /**
    Define a context tracker.
    */
    constructor(spec) {
      this.start = spec.start;
      this.shift = spec.shift || id;
      this.reduce = spec.reduce || id;
      this.reuse = spec.reuse || id;
      this.hash = spec.hash || (() => 0);
      this.strict = spec.strict !== false;
    }
  };
  var LRParser = class _LRParser extends Parser {
    /**
    @internal
    */
    constructor(spec) {
      super();
      this.wrappers = [];
      if (spec.version != 14)
        throw new RangeError(`Parser version (${spec.version}) doesn't match runtime version (${14})`);
      let nodeNames = spec.nodeNames.split(" ");
      this.minRepeatTerm = nodeNames.length;
      for (let i = 0; i < spec.repeatNodeCount; i++)
        nodeNames.push("");
      let topTerms = Object.keys(spec.topRules).map((r) => spec.topRules[r][1]);
      let nodeProps = [];
      for (let i = 0; i < nodeNames.length; i++)
        nodeProps.push([]);
      function setProp(nodeID, prop, value) {
        nodeProps[nodeID].push([prop, prop.deserialize(String(value))]);
      }
      if (spec.nodeProps)
        for (let propSpec of spec.nodeProps) {
          let prop = propSpec[0];
          if (typeof prop == "string")
            prop = NodeProp[prop];
          for (let i = 1; i < propSpec.length; ) {
            let next = propSpec[i++];
            if (next >= 0) {
              setProp(next, prop, propSpec[i++]);
            } else {
              let value = propSpec[i + -next];
              for (let j = -next; j > 0; j--)
                setProp(propSpec[i++], prop, value);
              i++;
            }
          }
        }
      this.nodeSet = new NodeSet(nodeNames.map((name2, i) => NodeType.define({
        name: i >= this.minRepeatTerm ? void 0 : name2,
        id: i,
        props: nodeProps[i],
        top: topTerms.indexOf(i) > -1,
        error: i == 0,
        skipped: spec.skippedNodes && spec.skippedNodes.indexOf(i) > -1
      })));
      if (spec.propSources)
        this.nodeSet = this.nodeSet.extend(...spec.propSources);
      this.strict = false;
      this.bufferLength = DefaultBufferLength;
      let tokenArray = decodeArray(spec.tokenData);
      this.context = spec.context;
      this.specializerSpecs = spec.specialized || [];
      this.specialized = new Uint16Array(this.specializerSpecs.length);
      for (let i = 0; i < this.specializerSpecs.length; i++)
        this.specialized[i] = this.specializerSpecs[i].term;
      this.specializers = this.specializerSpecs.map(getSpecializer);
      this.states = decodeArray(spec.states, Uint32Array);
      this.data = decodeArray(spec.stateData);
      this.goto = decodeArray(spec.goto);
      this.maxTerm = spec.maxTerm;
      this.tokenizers = spec.tokenizers.map((value) => typeof value == "number" ? new TokenGroup(tokenArray, value) : value);
      this.topRules = spec.topRules;
      this.dialects = spec.dialects || {};
      this.dynamicPrecedences = spec.dynamicPrecedences || null;
      this.tokenPrecTable = spec.tokenPrec;
      this.termNames = spec.termNames || null;
      this.maxNode = this.nodeSet.types.length - 1;
      this.dialect = this.parseDialect();
      this.top = this.topRules[Object.keys(this.topRules)[0]];
    }
    createParse(input, fragments, ranges) {
      let parse = new Parse(this, input, fragments, ranges);
      for (let w of this.wrappers)
        parse = w(parse, input, fragments, ranges);
      return parse;
    }
    /**
    Get a goto table entry @internal
    */
    getGoto(state, term, loose = false) {
      let table = this.goto;
      if (term >= table[0])
        return -1;
      for (let pos = table[term + 1]; ; ) {
        let groupTag = table[pos++], last = groupTag & 1;
        let target = table[pos++];
        if (last && loose)
          return target;
        for (let end = pos + (groupTag >> 1); pos < end; pos++)
          if (table[pos] == state)
            return target;
        if (last)
          return -1;
      }
    }
    /**
    Check if this state has an action for a given terminal @internal
    */
    hasAction(state, terminal) {
      let data = this.data;
      for (let set = 0; set < 2; set++) {
        for (let i = this.stateSlot(
          state,
          set ? 2 : 1
          /* ParseState.Actions */
        ), next; ; i += 3) {
          if ((next = data[i]) == 65535) {
            if (data[i + 1] == 1)
              next = data[i = pair(data, i + 2)];
            else if (data[i + 1] == 2)
              return pair(data, i + 2);
            else
              break;
          }
          if (next == terminal || next == 0)
            return pair(data, i + 1);
        }
      }
      return 0;
    }
    /**
    @internal
    */
    stateSlot(state, slot) {
      return this.states[state * 6 + slot];
    }
    /**
    @internal
    */
    stateFlag(state, flag) {
      return (this.stateSlot(
        state,
        0
        /* ParseState.Flags */
      ) & flag) > 0;
    }
    /**
    @internal
    */
    validAction(state, action) {
      return !!this.allActions(state, (a2) => a2 == action ? true : null);
    }
    /**
    @internal
    */
    allActions(state, action) {
      let deflt = this.stateSlot(
        state,
        4
        /* ParseState.DefaultReduce */
      );
      let result = deflt ? action(deflt) : void 0;
      for (let i = this.stateSlot(
        state,
        1
        /* ParseState.Actions */
      ); result == null; i += 3) {
        if (this.data[i] == 65535) {
          if (this.data[i + 1] == 1)
            i = pair(this.data, i + 2);
          else
            break;
        }
        result = action(pair(this.data, i + 1));
      }
      return result;
    }
    /**
    Get the states that can follow this one through shift actions or
    goto jumps. @internal
    */
    nextStates(state) {
      let result = [];
      for (let i = this.stateSlot(
        state,
        1
        /* ParseState.Actions */
      ); ; i += 3) {
        if (this.data[i] == 65535) {
          if (this.data[i + 1] == 1)
            i = pair(this.data, i + 2);
          else
            break;
        }
        if ((this.data[i + 2] & 65536 >> 16) == 0) {
          let value = this.data[i + 1];
          if (!result.some((v, i2) => i2 & 1 && v == value))
            result.push(this.data[i], value);
        }
      }
      return result;
    }
    /**
    Configure the parser. Returns a new parser instance that has the
    given settings modified. Settings not provided in `config` are
    kept from the original parser.
    */
    configure(config) {
      let copy = Object.assign(Object.create(_LRParser.prototype), this);
      if (config.props)
        copy.nodeSet = this.nodeSet.extend(...config.props);
      if (config.top) {
        let info = this.topRules[config.top];
        if (!info)
          throw new RangeError(`Invalid top rule name ${config.top}`);
        copy.top = info;
      }
      if (config.tokenizers)
        copy.tokenizers = this.tokenizers.map((t2) => {
          let found = config.tokenizers.find((r) => r.from == t2);
          return found ? found.to : t2;
        });
      if (config.specializers) {
        copy.specializers = this.specializers.slice();
        copy.specializerSpecs = this.specializerSpecs.map((s, i) => {
          let found = config.specializers.find((r) => r.from == s.external);
          if (!found)
            return s;
          let spec = Object.assign(Object.assign({}, s), { external: found.to });
          copy.specializers[i] = getSpecializer(spec);
          return spec;
        });
      }
      if (config.contextTracker)
        copy.context = config.contextTracker;
      if (config.dialect)
        copy.dialect = this.parseDialect(config.dialect);
      if (config.strict != null)
        copy.strict = config.strict;
      if (config.wrap)
        copy.wrappers = copy.wrappers.concat(config.wrap);
      if (config.bufferLength != null)
        copy.bufferLength = config.bufferLength;
      return copy;
    }
    /**
    Tells you whether any [parse wrappers](#lr.ParserConfig.wrap)
    are registered for this parser.
    */
    hasWrappers() {
      return this.wrappers.length > 0;
    }
    /**
    Returns the name associated with a given term. This will only
    work for all terms when the parser was generated with the
    `--names` option. By default, only the names of tagged terms are
    stored.
    */
    getName(term) {
      return this.termNames ? this.termNames[term] : String(term <= this.maxNode && this.nodeSet.types[term].name || term);
    }
    /**
    The eof term id is always allocated directly after the node
    types. @internal
    */
    get eofTerm() {
      return this.maxNode + 1;
    }
    /**
    The type of top node produced by the parser.
    */
    get topNode() {
      return this.nodeSet.types[this.top[1]];
    }
    /**
    @internal
    */
    dynamicPrecedence(term) {
      let prec = this.dynamicPrecedences;
      return prec == null ? 0 : prec[term] || 0;
    }
    /**
    @internal
    */
    parseDialect(dialect) {
      let values = Object.keys(this.dialects), flags = values.map(() => false);
      if (dialect)
        for (let part of dialect.split(" ")) {
          let id2 = values.indexOf(part);
          if (id2 >= 0)
            flags[id2] = true;
        }
      let disabled = null;
      for (let i = 0; i < values.length; i++)
        if (!flags[i]) {
          for (let j = this.dialects[values[i]], id2; (id2 = this.data[j++]) != 65535; )
            (disabled || (disabled = new Uint8Array(this.maxTerm + 1)))[id2] = 1;
        }
      return new Dialect(dialect, flags, disabled);
    }
    /**
    Used by the output of the parser generator. Not available to
    user code. @hide
    */
    static deserialize(spec) {
      return new _LRParser(spec);
    }
  };
  function pair(data, off) {
    return data[off] | data[off + 1] << 16;
  }
  function findFinished(stacks) {
    let best = null;
    for (let stack of stacks) {
      let stopped = stack.p.stoppedAt;
      if ((stack.pos == stack.p.stream.end || stopped != null && stack.pos > stopped) && stack.p.parser.stateFlag(
        stack.state,
        2
        /* StateFlag.Accepting */
      ) && (!best || best.score < stack.score))
        best = stack;
    }
    return best;
  }
  function getSpecializer(spec) {
    if (spec.external) {
      let mask = spec.extend ? 1 : 0;
      return (value, stack) => spec.external(value, stack) << 1 | mask;
    }
    return spec.get;
  }

  // node_modules/@lezer/highlight/dist/index.js
  var nextTagID = 0;
  var Tag = class _Tag {
    /**
    @internal
    */
    constructor(name2, set, base, modified) {
      this.name = name2;
      this.set = set;
      this.base = base;
      this.modified = modified;
      this.id = nextTagID++;
    }
    toString() {
      let { name: name2 } = this;
      for (let mod of this.modified)
        if (mod.name)
          name2 = `${mod.name}(${name2})`;
      return name2;
    }
    static define(nameOrParent, parent) {
      let name2 = typeof nameOrParent == "string" ? nameOrParent : "?";
      if (nameOrParent instanceof _Tag)
        parent = nameOrParent;
      if (parent === null || parent === void 0 ? void 0 : parent.base)
        throw new Error("Can not derive from a modified tag");
      let tag = new _Tag(name2, [], null, []);
      tag.set.push(tag);
      if (parent)
        for (let t2 of parent.set)
          tag.set.push(t2);
      return tag;
    }
    /**
    Define a tag _modifier_, which is a function that, given a tag,
    will return a tag that is a subtag of the original. Applying the
    same modifier to a twice tag will return the same value (`m1(t1)
    == m1(t1)`) and applying multiple modifiers will, regardless or
    order, produce the same tag (`m1(m2(t1)) == m2(m1(t1))`).
    
    When multiple modifiers are applied to a given base tag, each
    smaller set of modifiers is registered as a parent, so that for
    example `m1(m2(m3(t1)))` is a subtype of `m1(m2(t1))`,
    `m1(m3(t1)`, and so on.
    */
    static defineModifier(name2) {
      let mod = new Modifier(name2);
      return (tag) => {
        if (tag.modified.indexOf(mod) > -1)
          return tag;
        return Modifier.get(tag.base || tag, tag.modified.concat(mod).sort((a2, b) => a2.id - b.id));
      };
    }
  };
  var nextModifierID = 0;
  var Modifier = class _Modifier {
    constructor(name2) {
      this.name = name2;
      this.instances = [];
      this.id = nextModifierID++;
    }
    static get(base, mods) {
      if (!mods.length)
        return base;
      let exists = mods[0].instances.find((t2) => t2.base == base && sameArray(mods, t2.modified));
      if (exists)
        return exists;
      let set = [], tag = new Tag(base.name, set, base, mods);
      for (let m of mods)
        m.instances.push(tag);
      let configs = powerSet(mods);
      for (let parent of base.set)
        if (!parent.modified.length)
          for (let config of configs)
            set.push(_Modifier.get(parent, config));
      return tag;
    }
  };
  function sameArray(a2, b) {
    return a2.length == b.length && a2.every((x, i) => x == b[i]);
  }
  function powerSet(array) {
    let sets = [[]];
    for (let i = 0; i < array.length; i++) {
      for (let j = 0, e = sets.length; j < e; j++) {
        sets.push(sets[j].concat(array[i]));
      }
    }
    return sets.sort((a2, b) => b.length - a2.length);
  }
  function styleTags(spec) {
    let byName = /* @__PURE__ */ Object.create(null);
    for (let prop in spec) {
      let tags2 = spec[prop];
      if (!Array.isArray(tags2))
        tags2 = [tags2];
      for (let part of prop.split(" "))
        if (part) {
          let pieces = [], mode = 2, rest = part;
          for (let pos = 0; ; ) {
            if (rest == "..." && pos > 0 && pos + 3 == part.length) {
              mode = 1;
              break;
            }
            let m = /^"(?:[^"\\]|\\.)*?"|[^\/!]+/.exec(rest);
            if (!m)
              throw new RangeError("Invalid path: " + part);
            pieces.push(m[0] == "*" ? "" : m[0][0] == '"' ? JSON.parse(m[0]) : m[0]);
            pos += m[0].length;
            if (pos == part.length)
              break;
            let next = part[pos++];
            if (pos == part.length && next == "!") {
              mode = 0;
              break;
            }
            if (next != "/")
              throw new RangeError("Invalid path: " + part);
            rest = part.slice(pos);
          }
          let last = pieces.length - 1, inner = pieces[last];
          if (!inner)
            throw new RangeError("Invalid path: " + part);
          let rule = new Rule(tags2, mode, last > 0 ? pieces.slice(0, last) : null);
          byName[inner] = rule.sort(byName[inner]);
        }
    }
    return ruleNodeProp.add(byName);
  }
  var ruleNodeProp = new NodeProp({
    combine(a2, b) {
      let cur, root, take;
      while (a2 || b) {
        if (!a2 || b && a2.depth >= b.depth) {
          take = b;
          b = b.next;
        } else {
          take = a2;
          a2 = a2.next;
        }
        if (cur && cur.mode == take.mode && !take.context && !cur.context)
          continue;
        let copy = new Rule(take.tags, take.mode, take.context);
        if (cur)
          cur.next = copy;
        else
          root = copy;
        cur = copy;
      }
      return root;
    }
  });
  var Rule = class {
    constructor(tags2, mode, context, next) {
      this.tags = tags2;
      this.mode = mode;
      this.context = context;
      this.next = next;
    }
    get opaque() {
      return this.mode == 0;
    }
    get inherit() {
      return this.mode == 1;
    }
    sort(other) {
      if (!other || other.depth < this.depth) {
        this.next = other;
        return this;
      }
      other.next = this.sort(other.next);
      return other;
    }
    get depth() {
      return this.context ? this.context.length : 0;
    }
  };
  Rule.empty = new Rule([], 2, null);
  function tagHighlighter(tags2, options) {
    let map = /* @__PURE__ */ Object.create(null);
    for (let style of tags2) {
      if (!Array.isArray(style.tag))
        map[style.tag.id] = style.class;
      else
        for (let tag of style.tag)
          map[tag.id] = style.class;
    }
    let { scope, all = null } = options || {};
    return {
      style: (tags3) => {
        let cls = all;
        for (let tag of tags3) {
          for (let sub of tag.set) {
            let tagClass = map[sub.id];
            if (tagClass) {
              cls = cls ? cls + " " + tagClass : tagClass;
              break;
            }
          }
        }
        return cls;
      },
      scope
    };
  }
  var t = Tag.define;
  var comment = t();
  var name = t();
  var typeName = t(name);
  var propertyName = t(name);
  var literal = t();
  var string = t(literal);
  var number = t(literal);
  var content = t();
  var heading = t(content);
  var keyword = t();
  var operator = t();
  var punctuation = t();
  var bracket = t(punctuation);
  var meta = t();
  var tags = {
    /**
    A comment.
    */
    comment,
    /**
    A line [comment](#highlight.tags.comment).
    */
    lineComment: t(comment),
    /**
    A block [comment](#highlight.tags.comment).
    */
    blockComment: t(comment),
    /**
    A documentation [comment](#highlight.tags.comment).
    */
    docComment: t(comment),
    /**
    Any kind of identifier.
    */
    name,
    /**
    The [name](#highlight.tags.name) of a variable.
    */
    variableName: t(name),
    /**
    A type [name](#highlight.tags.name).
    */
    typeName,
    /**
    A tag name (subtag of [`typeName`](#highlight.tags.typeName)).
    */
    tagName: t(typeName),
    /**
    A property or field [name](#highlight.tags.name).
    */
    propertyName,
    /**
    An attribute name (subtag of [`propertyName`](#highlight.tags.propertyName)).
    */
    attributeName: t(propertyName),
    /**
    The [name](#highlight.tags.name) of a class.
    */
    className: t(name),
    /**
    A label [name](#highlight.tags.name).
    */
    labelName: t(name),
    /**
    A namespace [name](#highlight.tags.name).
    */
    namespace: t(name),
    /**
    The [name](#highlight.tags.name) of a macro.
    */
    macroName: t(name),
    /**
    A literal value.
    */
    literal,
    /**
    A string [literal](#highlight.tags.literal).
    */
    string,
    /**
    A documentation [string](#highlight.tags.string).
    */
    docString: t(string),
    /**
    A character literal (subtag of [string](#highlight.tags.string)).
    */
    character: t(string),
    /**
    An attribute value (subtag of [string](#highlight.tags.string)).
    */
    attributeValue: t(string),
    /**
    A number [literal](#highlight.tags.literal).
    */
    number,
    /**
    An integer [number](#highlight.tags.number) literal.
    */
    integer: t(number),
    /**
    A floating-point [number](#highlight.tags.number) literal.
    */
    float: t(number),
    /**
    A boolean [literal](#highlight.tags.literal).
    */
    bool: t(literal),
    /**
    Regular expression [literal](#highlight.tags.literal).
    */
    regexp: t(literal),
    /**
    An escape [literal](#highlight.tags.literal), for example a
    backslash escape in a string.
    */
    escape: t(literal),
    /**
    A color [literal](#highlight.tags.literal).
    */
    color: t(literal),
    /**
    A URL [literal](#highlight.tags.literal).
    */
    url: t(literal),
    /**
    A language keyword.
    */
    keyword,
    /**
    The [keyword](#highlight.tags.keyword) for the self or this
    object.
    */
    self: t(keyword),
    /**
    The [keyword](#highlight.tags.keyword) for null.
    */
    null: t(keyword),
    /**
    A [keyword](#highlight.tags.keyword) denoting some atomic value.
    */
    atom: t(keyword),
    /**
    A [keyword](#highlight.tags.keyword) that represents a unit.
    */
    unit: t(keyword),
    /**
    A modifier [keyword](#highlight.tags.keyword).
    */
    modifier: t(keyword),
    /**
    A [keyword](#highlight.tags.keyword) that acts as an operator.
    */
    operatorKeyword: t(keyword),
    /**
    A control-flow related [keyword](#highlight.tags.keyword).
    */
    controlKeyword: t(keyword),
    /**
    A [keyword](#highlight.tags.keyword) that defines something.
    */
    definitionKeyword: t(keyword),
    /**
    A [keyword](#highlight.tags.keyword) related to defining or
    interfacing with modules.
    */
    moduleKeyword: t(keyword),
    /**
    An operator.
    */
    operator,
    /**
    An [operator](#highlight.tags.operator) that dereferences something.
    */
    derefOperator: t(operator),
    /**
    Arithmetic-related [operator](#highlight.tags.operator).
    */
    arithmeticOperator: t(operator),
    /**
    Logical [operator](#highlight.tags.operator).
    */
    logicOperator: t(operator),
    /**
    Bit [operator](#highlight.tags.operator).
    */
    bitwiseOperator: t(operator),
    /**
    Comparison [operator](#highlight.tags.operator).
    */
    compareOperator: t(operator),
    /**
    [Operator](#highlight.tags.operator) that updates its operand.
    */
    updateOperator: t(operator),
    /**
    [Operator](#highlight.tags.operator) that defines something.
    */
    definitionOperator: t(operator),
    /**
    Type-related [operator](#highlight.tags.operator).
    */
    typeOperator: t(operator),
    /**
    Control-flow [operator](#highlight.tags.operator).
    */
    controlOperator: t(operator),
    /**
    Program or markup punctuation.
    */
    punctuation,
    /**
    [Punctuation](#highlight.tags.punctuation) that separates
    things.
    */
    separator: t(punctuation),
    /**
    Bracket-style [punctuation](#highlight.tags.punctuation).
    */
    bracket,
    /**
    Angle [brackets](#highlight.tags.bracket) (usually `<` and `>`
    tokens).
    */
    angleBracket: t(bracket),
    /**
    Square [brackets](#highlight.tags.bracket) (usually `[` and `]`
    tokens).
    */
    squareBracket: t(bracket),
    /**
    Parentheses (usually `(` and `)` tokens). Subtag of
    [bracket](#highlight.tags.bracket).
    */
    paren: t(bracket),
    /**
    Braces (usually `{` and `}` tokens). Subtag of
    [bracket](#highlight.tags.bracket).
    */
    brace: t(bracket),
    /**
    Content, for example plain text in XML or markup documents.
    */
    content,
    /**
    [Content](#highlight.tags.content) that represents a heading.
    */
    heading,
    /**
    A level 1 [heading](#highlight.tags.heading).
    */
    heading1: t(heading),
    /**
    A level 2 [heading](#highlight.tags.heading).
    */
    heading2: t(heading),
    /**
    A level 3 [heading](#highlight.tags.heading).
    */
    heading3: t(heading),
    /**
    A level 4 [heading](#highlight.tags.heading).
    */
    heading4: t(heading),
    /**
    A level 5 [heading](#highlight.tags.heading).
    */
    heading5: t(heading),
    /**
    A level 6 [heading](#highlight.tags.heading).
    */
    heading6: t(heading),
    /**
    A prose [content](#highlight.tags.content) separator (such as a horizontal rule).
    */
    contentSeparator: t(content),
    /**
    [Content](#highlight.tags.content) that represents a list.
    */
    list: t(content),
    /**
    [Content](#highlight.tags.content) that represents a quote.
    */
    quote: t(content),
    /**
    [Content](#highlight.tags.content) that is emphasized.
    */
    emphasis: t(content),
    /**
    [Content](#highlight.tags.content) that is styled strong.
    */
    strong: t(content),
    /**
    [Content](#highlight.tags.content) that is part of a link.
    */
    link: t(content),
    /**
    [Content](#highlight.tags.content) that is styled as code or
    monospace.
    */
    monospace: t(content),
    /**
    [Content](#highlight.tags.content) that has a strike-through
    style.
    */
    strikethrough: t(content),
    /**
    Inserted text in a change-tracking format.
    */
    inserted: t(),
    /**
    Deleted text.
    */
    deleted: t(),
    /**
    Changed text.
    */
    changed: t(),
    /**
    An invalid or unsyntactic element.
    */
    invalid: t(),
    /**
    Metadata or meta-instruction.
    */
    meta,
    /**
    [Metadata](#highlight.tags.meta) that applies to the entire
    document.
    */
    documentMeta: t(meta),
    /**
    [Metadata](#highlight.tags.meta) that annotates or adds
    attributes to a given syntactic element.
    */
    annotation: t(meta),
    /**
    Processing instruction or preprocessor directive. Subtag of
    [meta](#highlight.tags.meta).
    */
    processingInstruction: t(meta),
    /**
    [Modifier](#highlight.Tag^defineModifier) that indicates that a
    given element is being defined. Expected to be used with the
    various [name](#highlight.tags.name) tags.
    */
    definition: Tag.defineModifier("definition"),
    /**
    [Modifier](#highlight.Tag^defineModifier) that indicates that
    something is constant. Mostly expected to be used with
    [variable names](#highlight.tags.variableName).
    */
    constant: Tag.defineModifier("constant"),
    /**
    [Modifier](#highlight.Tag^defineModifier) used to indicate that
    a [variable](#highlight.tags.variableName) or [property
    name](#highlight.tags.propertyName) is being called or defined
    as a function.
    */
    function: Tag.defineModifier("function"),
    /**
    [Modifier](#highlight.Tag^defineModifier) that can be applied to
    [names](#highlight.tags.name) to indicate that they belong to
    the language's standard environment.
    */
    standard: Tag.defineModifier("standard"),
    /**
    [Modifier](#highlight.Tag^defineModifier) that indicates a given
    [names](#highlight.tags.name) is local to some scope.
    */
    local: Tag.defineModifier("local"),
    /**
    A generic variant [modifier](#highlight.Tag^defineModifier) that
    can be used to tag language-specific alternative variants of
    some common tag. It is recommended for themes to define special
    forms of at least the [string](#highlight.tags.string) and
    [variable name](#highlight.tags.variableName) tags, since those
    come up a lot.
    */
    special: Tag.defineModifier("special")
  };
  for (let name2 in tags) {
    let val = tags[name2];
    if (val instanceof Tag)
      val.name = name2;
  }
  var classHighlighter = tagHighlighter([
    { tag: tags.link, class: "tok-link" },
    { tag: tags.heading, class: "tok-heading" },
    { tag: tags.emphasis, class: "tok-emphasis" },
    { tag: tags.strong, class: "tok-strong" },
    { tag: tags.keyword, class: "tok-keyword" },
    { tag: tags.atom, class: "tok-atom" },
    { tag: tags.bool, class: "tok-bool" },
    { tag: tags.url, class: "tok-url" },
    { tag: tags.labelName, class: "tok-labelName" },
    { tag: tags.inserted, class: "tok-inserted" },
    { tag: tags.deleted, class: "tok-deleted" },
    { tag: tags.literal, class: "tok-literal" },
    { tag: tags.string, class: "tok-string" },
    { tag: tags.number, class: "tok-number" },
    { tag: [tags.regexp, tags.escape, tags.special(tags.string)], class: "tok-string2" },
    { tag: tags.variableName, class: "tok-variableName" },
    { tag: tags.local(tags.variableName), class: "tok-variableName tok-local" },
    { tag: tags.definition(tags.variableName), class: "tok-variableName tok-definition" },
    { tag: tags.special(tags.variableName), class: "tok-variableName2" },
    { tag: tags.definition(tags.propertyName), class: "tok-propertyName tok-definition" },
    { tag: tags.typeName, class: "tok-typeName" },
    { tag: tags.namespace, class: "tok-namespace" },
    { tag: tags.className, class: "tok-className" },
    { tag: tags.macroName, class: "tok-macroName" },
    { tag: tags.propertyName, class: "tok-propertyName" },
    { tag: tags.operator, class: "tok-operator" },
    { tag: tags.comment, class: "tok-comment" },
    { tag: tags.meta, class: "tok-meta" },
    { tag: tags.invalid, class: "tok-invalid" },
    { tag: tags.punctuation, class: "tok-punctuation" }
  ]);

  // node_modules/@lezer/html/dist/index.js
  var scriptText = 55;
  var StartCloseScriptTag = 1;
  var styleText = 56;
  var StartCloseStyleTag = 2;
  var textareaText = 57;
  var StartCloseTextareaTag = 3;
  var EndTag = 4;
  var SelfClosingEndTag = 5;
  var StartTag = 6;
  var StartScriptTag = 7;
  var StartStyleTag = 8;
  var StartTextareaTag = 9;
  var StartSelfClosingTag = 10;
  var StartCloseTag = 11;
  var NoMatchStartCloseTag = 12;
  var MismatchedStartCloseTag = 13;
  var missingCloseTag = 58;
  var IncompleteTag = 14;
  var IncompleteCloseTag = 15;
  var commentContent$1 = 59;
  var Element = 21;
  var TagName = 23;
  var Attribute = 24;
  var AttributeName = 25;
  var AttributeValue = 27;
  var UnquotedAttributeValue = 28;
  var ScriptText = 29;
  var StyleText = 32;
  var TextareaText = 35;
  var OpenTag = 37;
  var CloseTag = 38;
  var Dialect_noMatch = 0;
  var Dialect_selfClosing = 1;
  var selfClosers = {
    area: true,
    base: true,
    br: true,
    col: true,
    command: true,
    embed: true,
    frame: true,
    hr: true,
    img: true,
    input: true,
    keygen: true,
    link: true,
    meta: true,
    param: true,
    source: true,
    track: true,
    wbr: true,
    menuitem: true
  };
  var implicitlyClosed = {
    dd: true,
    li: true,
    optgroup: true,
    option: true,
    p: true,
    rp: true,
    rt: true,
    tbody: true,
    td: true,
    tfoot: true,
    th: true,
    tr: true
  };
  var closeOnOpen = {
    dd: { dd: true, dt: true },
    dt: { dd: true, dt: true },
    li: { li: true },
    option: { option: true, optgroup: true },
    optgroup: { optgroup: true },
    p: {
      address: true,
      article: true,
      aside: true,
      blockquote: true,
      dir: true,
      div: true,
      dl: true,
      fieldset: true,
      footer: true,
      form: true,
      h1: true,
      h2: true,
      h3: true,
      h4: true,
      h5: true,
      h6: true,
      header: true,
      hgroup: true,
      hr: true,
      menu: true,
      nav: true,
      ol: true,
      p: true,
      pre: true,
      section: true,
      table: true,
      ul: true
    },
    rp: { rp: true, rt: true },
    rt: { rp: true, rt: true },
    tbody: { tbody: true, tfoot: true },
    td: { td: true, th: true },
    tfoot: { tbody: true },
    th: { td: true, th: true },
    thead: { tbody: true, tfoot: true },
    tr: { tr: true }
  };
  function nameChar(ch) {
    return ch == 45 || ch == 46 || ch == 58 || ch >= 65 && ch <= 90 || ch == 95 || ch >= 97 && ch <= 122 || ch >= 161;
  }
  var cachedName = null;
  var cachedInput = null;
  var cachedPos = 0;
  function tagNameAfter(input, offset) {
    let pos = input.pos + offset;
    if (cachedPos == pos && cachedInput == input) return cachedName;
    let next = input.peek(offset), name2 = "";
    for (; ; ) {
      if (!nameChar(next)) break;
      name2 += String.fromCharCode(next);
      next = input.peek(++offset);
    }
    cachedInput = input;
    cachedPos = pos;
    return cachedName = name2 ? name2.toLowerCase() : next == question || next == bang ? void 0 : null;
  }
  var lessThan = 60;
  var greaterThan = 62;
  var slash = 47;
  var question = 63;
  var bang = 33;
  var dash = 45;
  function ElementContext(name2, parent) {
    this.name = name2;
    this.parent = parent;
  }
  var startTagTerms = [StartTag, StartSelfClosingTag, StartScriptTag, StartStyleTag, StartTextareaTag];
  var elementContext = new ContextTracker({
    start: null,
    shift(context, term, stack, input) {
      return startTagTerms.indexOf(term) > -1 ? new ElementContext(tagNameAfter(input, 1) || "", context) : context;
    },
    reduce(context, term) {
      return term == Element && context ? context.parent : context;
    },
    reuse(context, node, stack, input) {
      let type = node.type.id;
      return type == StartTag || type == OpenTag ? new ElementContext(tagNameAfter(input, 1) || "", context) : context;
    },
    strict: false
  });
  var tagStart = new ExternalTokenizer((input, stack) => {
    if (input.next != lessThan) {
      if (input.next < 0 && stack.context) input.acceptToken(missingCloseTag);
      return;
    }
    input.advance();
    let close = input.next == slash;
    if (close) input.advance();
    let name2 = tagNameAfter(input, 0);
    if (name2 === void 0) return;
    if (!name2) return input.acceptToken(close ? IncompleteCloseTag : IncompleteTag);
    let parent = stack.context ? stack.context.name : null;
    if (close) {
      if (name2 == parent) return input.acceptToken(StartCloseTag);
      if (parent && implicitlyClosed[parent]) return input.acceptToken(missingCloseTag, -2);
      if (stack.dialectEnabled(Dialect_noMatch)) return input.acceptToken(NoMatchStartCloseTag);
      for (let cx = stack.context; cx; cx = cx.parent) if (cx.name == name2) return;
      input.acceptToken(MismatchedStartCloseTag);
    } else {
      if (name2 == "script") return input.acceptToken(StartScriptTag);
      if (name2 == "style") return input.acceptToken(StartStyleTag);
      if (name2 == "textarea") return input.acceptToken(StartTextareaTag);
      if (selfClosers.hasOwnProperty(name2)) return input.acceptToken(StartSelfClosingTag);
      if (parent && closeOnOpen[parent] && closeOnOpen[parent][name2]) input.acceptToken(missingCloseTag, -1);
      else input.acceptToken(StartTag);
    }
  }, { contextual: true });
  var commentContent = new ExternalTokenizer((input) => {
    for (let dashes = 0, i = 0; ; i++) {
      if (input.next < 0) {
        if (i) input.acceptToken(commentContent$1);
        break;
      }
      if (input.next == dash) {
        dashes++;
      } else if (input.next == greaterThan && dashes >= 2) {
        if (i >= 3) input.acceptToken(commentContent$1, -2);
        break;
      } else {
        dashes = 0;
      }
      input.advance();
    }
  });
  function inForeignElement(context) {
    for (; context; context = context.parent)
      if (context.name == "svg" || context.name == "math") return true;
    return false;
  }
  var endTag = new ExternalTokenizer((input, stack) => {
    if (input.next == slash && input.peek(1) == greaterThan) {
      let selfClosing = stack.dialectEnabled(Dialect_selfClosing) || inForeignElement(stack.context);
      input.acceptToken(selfClosing ? SelfClosingEndTag : EndTag, 2);
    } else if (input.next == greaterThan) {
      input.acceptToken(EndTag, 1);
    }
  });
  function contentTokenizer(tag, textToken, endToken) {
    let lastState = 2 + tag.length;
    return new ExternalTokenizer((input) => {
      for (let state = 0, matchedLen = 0, i = 0; ; i++) {
        if (input.next < 0) {
          if (i) input.acceptToken(textToken);
          break;
        }
        if (state == 0 && input.next == lessThan || state == 1 && input.next == slash || state >= 2 && state < lastState && input.next == tag.charCodeAt(state - 2)) {
          state++;
          matchedLen++;
        } else if (state == lastState && input.next == greaterThan) {
          if (i > matchedLen)
            input.acceptToken(textToken, -matchedLen);
          else
            input.acceptToken(endToken, -(matchedLen - 2));
          break;
        } else if ((input.next == 10 || input.next == 13) && i) {
          input.acceptToken(textToken, 1);
          break;
        } else {
          state = matchedLen = 0;
        }
        input.advance();
      }
    });
  }
  var scriptTokens = contentTokenizer("script", scriptText, StartCloseScriptTag);
  var styleTokens = contentTokenizer("style", styleText, StartCloseStyleTag);
  var textareaTokens = contentTokenizer("textarea", textareaText, StartCloseTextareaTag);
  var htmlHighlighting = styleTags({
    "Text RawText IncompleteTag IncompleteCloseTag": tags.content,
    "StartTag StartCloseTag SelfClosingEndTag EndTag": tags.angleBracket,
    TagName: tags.tagName,
    "MismatchedCloseTag/TagName": [tags.tagName, tags.invalid],
    AttributeName: tags.attributeName,
    "AttributeValue UnquotedAttributeValue": tags.attributeValue,
    Is: tags.definitionOperator,
    "EntityReference CharacterReference": tags.character,
    Comment: tags.blockComment,
    ProcessingInst: tags.processingInstruction,
    DoctypeDecl: tags.documentMeta
  });
  var parser = LRParser.deserialize({
    version: 14,
    states: ",xOVO!rOOO!ZQ#tO'#CrO!`Q#tO'#C{O!eQ#tO'#DOO!jQ#tO'#DRO!oQ#tO'#DTO!tOaO'#CqO#PObO'#CqO#[OdO'#CqO$kO!rO'#CqOOO`'#Cq'#CqO$rO$fO'#DUO$zQ#tO'#DWO%PQ#tO'#DXOOO`'#Dl'#DlOOO`'#DZ'#DZQVO!rOOO%UQ&rO,59^O%aQ&rO,59gO%lQ&rO,59jO%wQ&rO,59mO&SQ&rO,59oOOOa'#D_'#D_O&_OaO'#CyO&jOaO,59]OOOb'#D`'#D`O&rObO'#C|O&}ObO,59]OOOd'#Da'#DaO'VOdO'#DPO'bOdO,59]OOO`'#Db'#DbO'jO!rO,59]O'qQ#tO'#DSOOO`,59],59]OOOp'#Dc'#DcO'vO$fO,59pOOO`,59p,59pO(OQ#|O,59rO(TQ#|O,59sOOO`-E7X-E7XO(YQ&rO'#CtOOQW'#D['#D[O(hQ&rO1G.xOOOa1G.x1G.xOOO`1G/Z1G/ZO(sQ&rO1G/ROOOb1G/R1G/RO)OQ&rO1G/UOOOd1G/U1G/UO)ZQ&rO1G/XOOO`1G/X1G/XO)fQ&rO1G/ZOOOa-E7]-E7]O)qQ#tO'#CzOOO`1G.w1G.wOOOb-E7^-E7^O)vQ#tO'#C}OOOd-E7_-E7_O){Q#tO'#DQOOO`-E7`-E7`O*QQ#|O,59nOOOp-E7a-E7aOOO`1G/[1G/[OOO`1G/^1G/^OOO`1G/_1G/_O*VQ,UO,59`OOQW-E7Y-E7YOOOa7+$d7+$dOOO`7+$u7+$uOOOb7+$m7+$mOOOd7+$p7+$pOOO`7+$s7+$sO*bQ#|O,59fO*gQ#|O,59iO*lQ#|O,59lOOO`1G/Y1G/YO*qO7[O'#CwO+SOMhO'#CwOOQW1G.z1G.zOOO`1G/Q1G/QOOO`1G/T1G/TOOO`1G/W1G/WOOOO'#D]'#D]O+eO7[O,59cOOQW,59c,59cOOOO'#D^'#D^O+vOMhO,59cOOOO-E7Z-E7ZOOQW1G.}1G.}OOOO-E7[-E7[",
    stateData: ",c~O!_OS~OUSOVPOWQOXROYTO[]O][O^^O_^Oa^Ob^Oc^Od^Oy^O|_O!eZO~OgaO~OgbO~OgcO~OgdO~OgeO~O!XfOPmP![mP~O!YiOQpP![pP~O!ZlORsP![sP~OUSOVPOWQOXROYTOZqO[]O][O^^O_^Oa^Ob^Oc^Od^Oy^O!eZO~O![rO~P#gO!]sO!fuO~OgvO~OgwO~OS|OT}OiyO~OS!POT}OiyO~OS!ROT}OiyO~OS!TOT}OiyO~OS}OT}OiyO~O!XfOPmX![mX~OP!WO![!XO~O!YiOQpX![pX~OQ!ZO![!XO~O!ZlORsX![sX~OR!]O![!XO~O![!XO~P#gOg!_O~O!]sO!f!aO~OS!bO~OS!cO~Oj!dOShXThXihX~OS!fOT!gOiyO~OS!hOT!gOiyO~OS!iOT!gOiyO~OS!jOT!gOiyO~OS!gOT!gOiyO~Og!kO~Og!lO~Og!mO~OS!nO~Ol!qO!a!oO!c!pO~OS!rO~OS!sO~OS!tO~Ob!uOc!uOd!uO!a!wO!b!uO~Ob!xOc!xOd!xO!c!wO!d!xO~Ob!uOc!uOd!uO!a!{O!b!uO~Ob!xOc!xOd!xO!c!{O!d!xO~OT~cbd!ey|!e~",
    goto: "%q!aPPPPPPPPPPPPPPPPPPPPP!b!hP!nPP!zP!}#Q#T#Z#^#a#g#j#m#s#y!bP!b!bP$P$V$m$s$y%P%V%]%cPPPPPPPP%iX^OX`pXUOX`pezabcde{!O!Q!S!UR!q!dRhUR!XhXVOX`pRkVR!XkXWOX`pRnWR!XnXXOX`pQrXR!XpXYOX`pQ`ORx`Q{aQ!ObQ!QcQ!SdQ!UeZ!e{!O!Q!S!UQ!v!oR!z!vQ!y!pR!|!yQgUR!VgQjVR!YjQmWR![mQpXR!^pQtZR!`tS_O`ToXp",
    nodeNames: "\u26A0 StartCloseTag StartCloseTag StartCloseTag EndTag SelfClosingEndTag StartTag StartTag StartTag StartTag StartTag StartCloseTag StartCloseTag StartCloseTag IncompleteTag IncompleteCloseTag Document Text EntityReference CharacterReference InvalidEntity Element OpenTag TagName Attribute AttributeName Is AttributeValue UnquotedAttributeValue ScriptText CloseTag OpenTag StyleText CloseTag OpenTag TextareaText CloseTag OpenTag CloseTag SelfClosingTag Comment ProcessingInst MismatchedCloseTag CloseTag DoctypeDecl",
    maxTerm: 68,
    context: elementContext,
    nodeProps: [
      ["closedBy", -10, 1, 2, 3, 7, 8, 9, 10, 11, 12, 13, "EndTag", 6, "EndTag SelfClosingEndTag", -4, 22, 31, 34, 37, "CloseTag"],
      ["openedBy", 4, "StartTag StartCloseTag", 5, "StartTag", -4, 30, 33, 36, 38, "OpenTag"],
      ["group", -10, 14, 15, 18, 19, 20, 21, 40, 41, 42, 43, "Entity", 17, "Entity TextContent", -3, 29, 32, 35, "TextContent Entity"],
      ["isolate", -11, 22, 30, 31, 33, 34, 36, 37, 38, 39, 42, 43, "ltr", -3, 27, 28, 40, ""]
    ],
    propSources: [htmlHighlighting],
    skippedNodes: [0],
    repeatNodeCount: 9,
    tokenData: "!<p!aR!YOX$qXY,QYZ,QZ[$q[]&X]^,Q^p$qpq,Qqr-_rs3_sv-_vw3}wxHYx}-_}!OH{!O!P-_!P!Q$q!Q![-_![!]Mz!]!^-_!^!_!$S!_!`!;x!`!a&X!a!c-_!c!}Mz!}#R-_#R#SMz#S#T1k#T#oMz#o#s-_#s$f$q$f%W-_%W%oMz%o%p-_%p&aMz&a&b-_&b1pMz1p4U-_4U4dMz4d4e-_4e$ISMz$IS$I`-_$I`$IbMz$Ib$Kh-_$Kh%#tMz%#t&/x-_&/x&EtMz&Et&FV-_&FV;'SMz;'S;:j!#|;:j;=`3X<%l?&r-_?&r?AhMz?Ah?BY$q?BY?MnMz?MnO$q!Z$|caPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr$qrs&}sv$qvw+Pwx(tx!^$q!^!_*V!_!a&X!a#S$q#S#T&X#T;'S$q;'S;=`+z<%lO$q!R&bXaP!b`!dpOr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&Xq'UVaP!dpOv&}wx'kx!^&}!^!_(V!_;'S&};'S;=`(n<%lO&}P'pTaPOv'kw!^'k!_;'S'k;'S;=`(P<%lO'kP(SP;=`<%l'kp([S!dpOv(Vx;'S(V;'S;=`(h<%lO(Vp(kP;=`<%l(Vq(qP;=`<%l&}a({WaP!b`Or(trs'ksv(tw!^(t!^!_)e!_;'S(t;'S;=`*P<%lO(t`)jT!b`Or)esv)ew;'S)e;'S;=`)y<%lO)e`)|P;=`<%l)ea*SP;=`<%l(t!Q*^V!b`!dpOr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!Q*vP;=`<%l*V!R*|P;=`<%l&XW+UYlWOX+PZ[+P^p+Pqr+Psw+Px!^+P!a#S+P#T;'S+P;'S;=`+t<%lO+PW+wP;=`<%l+P!Z+}P;=`<%l$q!a,]`aP!b`!dp!_^OX&XXY,QYZ,QZ]&X]^,Q^p&Xpq,Qqr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&X!_-ljiSaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx!P-_!P!Q$q!Q!^-_!^!_*V!_!a&X!a#S-_#S#T1k#T#s-_#s$f$q$f;'S-_;'S;=`3X<%l?Ah-_?Ah?BY$q?BY?Mn-_?MnO$q[/ebiSlWOX+PZ[+P^p+Pqr/^sw/^x!P/^!P!Q+P!Q!^/^!a#S/^#S#T0m#T#s/^#s$f+P$f;'S/^;'S;=`1e<%l?Ah/^?Ah?BY+P?BY?Mn/^?MnO+PS0rXiSqr0msw0mx!P0m!Q!^0m!a#s0m$f;'S0m;'S;=`1_<%l?Ah0m?BY?Mn0mS1bP;=`<%l0m[1hP;=`<%l/^!V1vciSaP!b`!dpOq&Xqr1krs&}sv1kvw0mwx(tx!P1k!P!Q&X!Q!^1k!^!_*V!_!a&X!a#s1k#s$f&X$f;'S1k;'S;=`3R<%l?Ah1k?Ah?BY&X?BY?Mn1k?MnO&X!V3UP;=`<%l1k!_3[P;=`<%l-_!Z3hV!ahaP!dpOv&}wx'kx!^&}!^!_(V!_;'S&};'S;=`(n<%lO&}!_4WiiSlWd!ROX5uXZ7SZ[5u[^7S^p5uqr8trs7Sst>]tw8twx7Sx!P8t!P!Q5u!Q!]8t!]!^/^!^!a7S!a#S8t#S#T;{#T#s8t#s$f5u$f;'S8t;'S;=`>V<%l?Ah8t?Ah?BY5u?BY?Mn8t?MnO5u!Z5zblWOX5uXZ7SZ[5u[^7S^p5uqr5urs7Sst+Ptw5uwx7Sx!]5u!]!^7w!^!a7S!a#S5u#S#T7S#T;'S5u;'S;=`8n<%lO5u!R7VVOp7Sqs7St!]7S!]!^7l!^;'S7S;'S;=`7q<%lO7S!R7qOb!R!R7tP;=`<%l7S!Z8OYlWb!ROX+PZ[+P^p+Pqr+Psw+Px!^+P!a#S+P#T;'S+P;'S;=`+t<%lO+P!Z8qP;=`<%l5u!_8{iiSlWOX5uXZ7SZ[5u[^7S^p5uqr8trs7Sst/^tw8twx7Sx!P8t!P!Q5u!Q!]8t!]!^:j!^!a7S!a#S8t#S#T;{#T#s8t#s$f5u$f;'S8t;'S;=`>V<%l?Ah8t?Ah?BY5u?BY?Mn8t?MnO5u!_:sbiSlWb!ROX+PZ[+P^p+Pqr/^sw/^x!P/^!P!Q+P!Q!^/^!a#S/^#S#T0m#T#s/^#s$f+P$f;'S/^;'S;=`1e<%l?Ah/^?Ah?BY+P?BY?Mn/^?MnO+P!V<QciSOp7Sqr;{rs7Sst0mtw;{wx7Sx!P;{!P!Q7S!Q!];{!]!^=]!^!a7S!a#s;{#s$f7S$f;'S;{;'S;=`>P<%l?Ah;{?Ah?BY7S?BY?Mn;{?MnO7S!V=dXiSb!Rqr0msw0mx!P0m!Q!^0m!a#s0m$f;'S0m;'S;=`1_<%l?Ah0m?BY?Mn0m!V>SP;=`<%l;{!_>YP;=`<%l8t!_>dhiSlWOX@OXZAYZ[@O[^AY^p@OqrBwrsAYswBwwxAYx!PBw!P!Q@O!Q!]Bw!]!^/^!^!aAY!a#SBw#S#TE{#T#sBw#s$f@O$f;'SBw;'S;=`HS<%l?AhBw?Ah?BY@O?BY?MnBw?MnO@O!Z@TalWOX@OXZAYZ[@O[^AY^p@Oqr@OrsAYsw@OwxAYx!]@O!]!^Az!^!aAY!a#S@O#S#TAY#T;'S@O;'S;=`Bq<%lO@O!RA]UOpAYq!]AY!]!^Ao!^;'SAY;'S;=`At<%lOAY!RAtOc!R!RAwP;=`<%lAY!ZBRYlWc!ROX+PZ[+P^p+Pqr+Psw+Px!^+P!a#S+P#T;'S+P;'S;=`+t<%lO+P!ZBtP;=`<%l@O!_COhiSlWOX@OXZAYZ[@O[^AY^p@OqrBwrsAYswBwwxAYx!PBw!P!Q@O!Q!]Bw!]!^Dj!^!aAY!a#SBw#S#TE{#T#sBw#s$f@O$f;'SBw;'S;=`HS<%l?AhBw?Ah?BY@O?BY?MnBw?MnO@O!_DsbiSlWc!ROX+PZ[+P^p+Pqr/^sw/^x!P/^!P!Q+P!Q!^/^!a#S/^#S#T0m#T#s/^#s$f+P$f;'S/^;'S;=`1e<%l?Ah/^?Ah?BY+P?BY?Mn/^?MnO+P!VFQbiSOpAYqrE{rsAYswE{wxAYx!PE{!P!QAY!Q!]E{!]!^GY!^!aAY!a#sE{#s$fAY$f;'SE{;'S;=`G|<%l?AhE{?Ah?BYAY?BY?MnE{?MnOAY!VGaXiSc!Rqr0msw0mx!P0m!Q!^0m!a#s0m$f;'S0m;'S;=`1_<%l?Ah0m?BY?Mn0m!VHPP;=`<%lE{!_HVP;=`<%lBw!ZHcW!cxaP!b`Or(trs'ksv(tw!^(t!^!_)e!_;'S(t;'S;=`*P<%lO(t!aIYliSaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx}-_}!OKQ!O!P-_!P!Q$q!Q!^-_!^!_*V!_!a&X!a#S-_#S#T1k#T#s-_#s$f$q$f;'S-_;'S;=`3X<%l?Ah-_?Ah?BY$q?BY?Mn-_?MnO$q!aK_kiSaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx!P-_!P!Q$q!Q!^-_!^!_*V!_!`&X!`!aMS!a#S-_#S#T1k#T#s-_#s$f$q$f;'S-_;'S;=`3X<%l?Ah-_?Ah?BY$q?BY?Mn-_?MnO$q!TM_XaP!b`!dp!fQOr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&X!aNZ!ZiSgQaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx}-_}!OMz!O!PMz!P!Q$q!Q![Mz![!]Mz!]!^-_!^!_*V!_!a&X!a!c-_!c!}Mz!}#R-_#R#SMz#S#T1k#T#oMz#o#s-_#s$f$q$f$}-_$}%OMz%O%W-_%W%oMz%o%p-_%p&aMz&a&b-_&b1pMz1p4UMz4U4dMz4d4e-_4e$ISMz$IS$I`-_$I`$IbMz$Ib$Je-_$Je$JgMz$Jg$Kh-_$Kh%#tMz%#t&/x-_&/x&EtMz&Et&FV-_&FV;'SMz;'S;:j!#|;:j;=`3X<%l?&r-_?&r?AhMz?Ah?BY$q?BY?MnMz?MnO$q!a!$PP;=`<%lMz!R!$ZY!b`!dpOq*Vqr!$yrs(Vsv*Vwx)ex!a*V!a!b!4t!b;'S*V;'S;=`*s<%lO*V!R!%Q]!b`!dpOr*Vrs(Vsv*Vwx)ex}*V}!O!%y!O!f*V!f!g!']!g#W*V#W#X!0`#X;'S*V;'S;=`*s<%lO*V!R!&QX!b`!dpOr*Vrs(Vsv*Vwx)ex}*V}!O!&m!O;'S*V;'S;=`*s<%lO*V!R!&vV!b`!dp!ePOr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!R!'dX!b`!dpOr*Vrs(Vsv*Vwx)ex!q*V!q!r!(P!r;'S*V;'S;=`*s<%lO*V!R!(WX!b`!dpOr*Vrs(Vsv*Vwx)ex!e*V!e!f!(s!f;'S*V;'S;=`*s<%lO*V!R!(zX!b`!dpOr*Vrs(Vsv*Vwx)ex!v*V!v!w!)g!w;'S*V;'S;=`*s<%lO*V!R!)nX!b`!dpOr*Vrs(Vsv*Vwx)ex!{*V!{!|!*Z!|;'S*V;'S;=`*s<%lO*V!R!*bX!b`!dpOr*Vrs(Vsv*Vwx)ex!r*V!r!s!*}!s;'S*V;'S;=`*s<%lO*V!R!+UX!b`!dpOr*Vrs(Vsv*Vwx)ex!g*V!g!h!+q!h;'S*V;'S;=`*s<%lO*V!R!+xY!b`!dpOr!+qrs!,hsv!+qvw!-Swx!.[x!`!+q!`!a!/j!a;'S!+q;'S;=`!0Y<%lO!+qq!,mV!dpOv!,hvx!-Sx!`!,h!`!a!-q!a;'S!,h;'S;=`!.U<%lO!,hP!-VTO!`!-S!`!a!-f!a;'S!-S;'S;=`!-k<%lO!-SP!-kO|PP!-nP;=`<%l!-Sq!-xS!dp|POv(Vx;'S(V;'S;=`(h<%lO(Vq!.XP;=`<%l!,ha!.aX!b`Or!.[rs!-Ssv!.[vw!-Sw!`!.[!`!a!.|!a;'S!.[;'S;=`!/d<%lO!.[a!/TT!b`|POr)esv)ew;'S)e;'S;=`)y<%lO)ea!/gP;=`<%l!.[!R!/sV!b`!dp|POr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!R!0]P;=`<%l!+q!R!0gX!b`!dpOr*Vrs(Vsv*Vwx)ex#c*V#c#d!1S#d;'S*V;'S;=`*s<%lO*V!R!1ZX!b`!dpOr*Vrs(Vsv*Vwx)ex#V*V#V#W!1v#W;'S*V;'S;=`*s<%lO*V!R!1}X!b`!dpOr*Vrs(Vsv*Vwx)ex#h*V#h#i!2j#i;'S*V;'S;=`*s<%lO*V!R!2qX!b`!dpOr*Vrs(Vsv*Vwx)ex#m*V#m#n!3^#n;'S*V;'S;=`*s<%lO*V!R!3eX!b`!dpOr*Vrs(Vsv*Vwx)ex#d*V#d#e!4Q#e;'S*V;'S;=`*s<%lO*V!R!4XX!b`!dpOr*Vrs(Vsv*Vwx)ex#X*V#X#Y!+q#Y;'S*V;'S;=`*s<%lO*V!R!4{Y!b`!dpOr!4trs!5ksv!4tvw!6Vwx!8]x!a!4t!a!b!:]!b;'S!4t;'S;=`!;r<%lO!4tq!5pV!dpOv!5kvx!6Vx!a!5k!a!b!7W!b;'S!5k;'S;=`!8V<%lO!5kP!6YTO!a!6V!a!b!6i!b;'S!6V;'S;=`!7Q<%lO!6VP!6lTO!`!6V!`!a!6{!a;'S!6V;'S;=`!7Q<%lO!6VP!7QOyPP!7TP;=`<%l!6Vq!7]V!dpOv!5kvx!6Vx!`!5k!`!a!7r!a;'S!5k;'S;=`!8V<%lO!5kq!7yS!dpyPOv(Vx;'S(V;'S;=`(h<%lO(Vq!8YP;=`<%l!5ka!8bX!b`Or!8]rs!6Vsv!8]vw!6Vw!a!8]!a!b!8}!b;'S!8];'S;=`!:V<%lO!8]a!9SX!b`Or!8]rs!6Vsv!8]vw!6Vw!`!8]!`!a!9o!a;'S!8];'S;=`!:V<%lO!8]a!9vT!b`yPOr)esv)ew;'S)e;'S;=`)y<%lO)ea!:YP;=`<%l!8]!R!:dY!b`!dpOr!4trs!5ksv!4tvw!6Vwx!8]x!`!4t!`!a!;S!a;'S!4t;'S;=`!;r<%lO!4t!R!;]V!b`!dpyPOr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!R!;uP;=`<%l!4t!V!<TXjSaP!b`!dpOr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&X",
    tokenizers: [scriptTokens, styleTokens, textareaTokens, endTag, tagStart, commentContent, 0, 1, 2, 3, 4, 5],
    topRules: { "Document": [0, 16] },
    dialects: { noMatch: 0, selfClosing: 515 },
    tokenPrec: 517
  });
  function getAttrs(openTag, input) {
    let attrs = /* @__PURE__ */ Object.create(null);
    for (let att of openTag.getChildren(Attribute)) {
      let name2 = att.getChild(AttributeName), value = att.getChild(AttributeValue) || att.getChild(UnquotedAttributeValue);
      if (name2) attrs[input.read(name2.from, name2.to)] = !value ? "" : value.type.id == AttributeValue ? input.read(value.from + 1, value.to - 1) : input.read(value.from, value.to);
    }
    return attrs;
  }
  function findTagName(openTag, input) {
    let tagNameNode = openTag.getChild(TagName);
    return tagNameNode ? input.read(tagNameNode.from, tagNameNode.to) : " ";
  }
  function maybeNest(node, input, tags2) {
    let attrs;
    for (let tag of tags2) {
      if (!tag.attrs || tag.attrs(attrs || (attrs = getAttrs(node.node.parent.firstChild, input))))
        return { parser: tag.parser, bracketed: true };
    }
    return null;
  }
  function configureNesting(tags2 = [], attributes = []) {
    let script = [], style = [], textarea = [], other = [];
    for (let tag of tags2) {
      let array = tag.tag == "script" ? script : tag.tag == "style" ? style : tag.tag == "textarea" ? textarea : other;
      array.push(tag);
    }
    let attrs = attributes.length ? /* @__PURE__ */ Object.create(null) : null;
    for (let attr of attributes) (attrs[attr.name] || (attrs[attr.name] = [])).push(attr);
    return parseMixed((node, input) => {
      let id2 = node.type.id;
      if (id2 == ScriptText) return maybeNest(node, input, script);
      if (id2 == StyleText) return maybeNest(node, input, style);
      if (id2 == TextareaText) return maybeNest(node, input, textarea);
      if (id2 == Element && other.length) {
        let n = node.node, open = n.firstChild, tagName = open && findTagName(open, input), attrs2;
        if (tagName) for (let tag of other) {
          if (tag.tag == tagName && (!tag.attrs || tag.attrs(attrs2 || (attrs2 = getAttrs(open, input))))) {
            let close = n.lastChild;
            let to = close.type.id == CloseTag ? close.from : n.to;
            if (to > open.to)
              return { parser: tag.parser, overlay: [{ from: open.to, to }] };
          }
        }
      }
      if (attrs && id2 == Attribute) {
        let n = node.node, nameNode;
        if (nameNode = n.firstChild) {
          let matches = attrs[input.read(nameNode.from, nameNode.to)];
          if (matches) for (let attr of matches) {
            if (attr.tagName && attr.tagName != findTagName(n.parent, input)) continue;
            let value = n.lastChild;
            if (value.type.id == AttributeValue) {
              let from = value.from + 1;
              let last = value.lastChild, to = value.to - (last && last.isError ? 0 : 1);
              if (to > from) return { parser: attr.parser, overlay: [{ from, to }], bracketed: true };
            } else if (value.type.id == UnquotedAttributeValue) {
              return { parser: attr.parser, overlay: [{ from: value.from, to: value.to }] };
            }
          }
        }
      }
      return null;
    });
  }

  // node_modules/@lezer/javascript/dist/index.js
  var noSemi = 316;
  var noSemiType = 317;
  var incdec = 1;
  var incdecPrefix = 2;
  var questionDot = 3;
  var JSXStartTag = 4;
  var insertSemi = 318;
  var spaces = 320;
  var newline = 321;
  var LineComment = 5;
  var BlockComment = 6;
  var Dialect_jsx = 0;
  var space = [
    9,
    10,
    11,
    12,
    13,
    32,
    133,
    160,
    5760,
    8192,
    8193,
    8194,
    8195,
    8196,
    8197,
    8198,
    8199,
    8200,
    8201,
    8202,
    8232,
    8233,
    8239,
    8287,
    12288
  ];
  var braceR = 125;
  var semicolon = 59;
  var slash2 = 47;
  var star = 42;
  var plus = 43;
  var minus = 45;
  var lt = 60;
  var comma = 44;
  var question2 = 63;
  var dot = 46;
  var bracketL = 91;
  var trackNewline = new ContextTracker({
    start: false,
    shift(context, term) {
      return term == LineComment || term == BlockComment || term == spaces ? context : term == newline;
    },
    strict: false
  });
  var insertSemicolon = new ExternalTokenizer((input, stack) => {
    let { next } = input;
    if (next == braceR || next == -1 || stack.context)
      input.acceptToken(insertSemi);
  }, { contextual: true, fallback: true });
  var noSemicolon = new ExternalTokenizer((input, stack) => {
    let { next } = input, after;
    if (space.indexOf(next) > -1) return;
    if (next == slash2 && ((after = input.peek(1)) == slash2 || after == star)) return;
    if (next != braceR && next != semicolon && next != -1 && !stack.context)
      input.acceptToken(noSemi);
  }, { contextual: true });
  var noSemicolonType = new ExternalTokenizer((input, stack) => {
    if (input.next == bracketL && !stack.context) input.acceptToken(noSemiType);
  }, { contextual: true });
  var operatorToken = new ExternalTokenizer((input, stack) => {
    let { next } = input;
    if (next == plus || next == minus) {
      input.advance();
      if (next == input.next) {
        input.advance();
        let mayPostfix = !stack.context && stack.canShift(incdec);
        input.acceptToken(mayPostfix ? incdec : incdecPrefix);
      }
    } else if (next == question2 && input.peek(1) == dot) {
      input.advance();
      input.advance();
      if (input.next < 48 || input.next > 57)
        input.acceptToken(questionDot);
    }
  }, { contextual: true });
  function identifierChar(ch, start) {
    return ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122 || ch == 95 || ch >= 192 || !start && ch >= 48 && ch <= 57;
  }
  var jsx = new ExternalTokenizer((input, stack) => {
    if (input.next != lt || !stack.dialectEnabled(Dialect_jsx)) return;
    input.advance();
    if (input.next == slash2) return;
    let back = 0;
    while (space.indexOf(input.next) > -1) {
      input.advance();
      back++;
    }
    if (identifierChar(input.next, true)) {
      input.advance();
      back++;
      while (identifierChar(input.next, false)) {
        input.advance();
        back++;
      }
      while (space.indexOf(input.next) > -1) {
        input.advance();
        back++;
      }
      if (input.next == comma) return;
      for (let i = 0; ; i++) {
        if (i == 7) {
          if (!identifierChar(input.next, true)) return;
          break;
        }
        if (input.next != "extends".charCodeAt(i)) break;
        input.advance();
        back++;
      }
    }
    input.acceptToken(JSXStartTag, -back);
  });
  var jsHighlight = styleTags({
    "get set async static": tags.modifier,
    "for while do if else switch try catch finally return throw break continue default case defer": tags.controlKeyword,
    "in of await yield void typeof delete instanceof as satisfies": tags.operatorKeyword,
    "let var const using function class extends": tags.definitionKeyword,
    "import export from": tags.moduleKeyword,
    "with debugger new": tags.keyword,
    TemplateString: tags.special(tags.string),
    super: tags.atom,
    BooleanLiteral: tags.bool,
    this: tags.self,
    null: tags.null,
    Star: tags.modifier,
    VariableName: tags.variableName,
    "CallExpression/VariableName TaggedTemplateExpression/VariableName": tags.function(tags.variableName),
    VariableDefinition: tags.definition(tags.variableName),
    Label: tags.labelName,
    PropertyName: tags.propertyName,
    PrivatePropertyName: tags.special(tags.propertyName),
    "CallExpression/MemberExpression/PropertyName": tags.function(tags.propertyName),
    "FunctionDeclaration/VariableDefinition": tags.function(tags.definition(tags.variableName)),
    "ClassDeclaration/VariableDefinition": tags.definition(tags.className),
    "NewExpression/VariableName": tags.className,
    PropertyDefinition: tags.definition(tags.propertyName),
    PrivatePropertyDefinition: tags.definition(tags.special(tags.propertyName)),
    UpdateOp: tags.updateOperator,
    "LineComment Hashbang": tags.lineComment,
    BlockComment: tags.blockComment,
    Number: tags.number,
    String: tags.string,
    Escape: tags.escape,
    ArithOp: tags.arithmeticOperator,
    LogicOp: tags.logicOperator,
    BitOp: tags.bitwiseOperator,
    CompareOp: tags.compareOperator,
    RegExp: tags.regexp,
    Equals: tags.definitionOperator,
    Arrow: tags.function(tags.punctuation),
    ": Spread": tags.punctuation,
    "( )": tags.paren,
    "[ ]": tags.squareBracket,
    "{ }": tags.brace,
    "InterpolationStart InterpolationEnd": tags.special(tags.brace),
    ".": tags.derefOperator,
    ", ;": tags.separator,
    "@": tags.meta,
    TypeName: tags.typeName,
    TypeDefinition: tags.definition(tags.typeName),
    "type enum interface implements namespace module declare": tags.definitionKeyword,
    "abstract global Privacy readonly override": tags.modifier,
    "is keyof unique infer asserts": tags.operatorKeyword,
    JSXAttributeValue: tags.attributeValue,
    JSXText: tags.content,
    "JSXStartTag JSXStartCloseTag JSXSelfCloseEndTag JSXEndTag": tags.angleBracket,
    "JSXIdentifier JSXNameSpacedName": tags.tagName,
    "JSXAttribute/JSXIdentifier JSXAttribute/JSXNameSpacedName": tags.attributeName,
    "JSXBuiltin/JSXIdentifier": tags.standard(tags.tagName)
  });
  var spec_identifier = { __proto__: null, export: 20, as: 25, from: 33, default: 36, async: 41, function: 42, in: 52, out: 55, const: 56, extends: 60, this: 64, true: 72, false: 72, null: 84, void: 88, typeof: 92, super: 108, new: 142, delete: 154, yield: 163, await: 167, class: 172, public: 235, private: 235, protected: 235, readonly: 237, instanceof: 256, satisfies: 259, import: 292, keyof: 349, unique: 353, infer: 359, asserts: 395, is: 397, abstract: 417, implements: 419, type: 421, let: 424, var: 426, using: 429, interface: 435, enum: 439, namespace: 445, module: 447, declare: 451, global: 455, defer: 471, for: 476, of: 485, while: 488, with: 492, do: 496, if: 500, else: 502, switch: 506, case: 512, try: 518, catch: 522, finally: 526, return: 530, throw: 534, break: 538, continue: 542, debugger: 546 };
  var spec_word = { __proto__: null, async: 129, get: 131, set: 133, declare: 195, public: 197, private: 197, protected: 197, static: 199, abstract: 201, override: 203, readonly: 209, accessor: 211, new: 401 };
  var spec_LessThan = { __proto__: null, "<": 193 };
  var parser2 = LRParser.deserialize({
    version: 14,
    states: "$F|Q%TQlOOO%[QlOOO'_QpOOP(lO`OOO*zQ!0MxO'#CiO+RO#tO'#CjO+aO&jO'#CjO+oO#@ItO'#DaO.QQlO'#DgO.bQlO'#DrO%[QlO'#DzO0fQlO'#ESOOQ!0Lf'#E['#E[O1PQ`O'#EXOOQO'#Ep'#EpOOQO'#Il'#IlO1XQ`O'#GsO1dQ`O'#EoO1iQ`O'#EoO3hQ!0MxO'#JrO6[Q!0MxO'#JsO6uQ`O'#F]O6zQ,UO'#FtOOQ!0Lf'#Ff'#FfO7VO7dO'#FfO9XQMhO'#F|O9`Q`O'#F{OOQ!0Lf'#Js'#JsOOQ!0Lb'#Jr'#JrO9eQ`O'#GwOOQ['#K_'#K_O9pQ`O'#IYO9uQ!0LrO'#IZOOQ['#J`'#J`OOQ['#I_'#I_Q`QlOOQ`QlOOO9}Q!L^O'#DvO:UQlO'#EOO:]QlO'#EQO9kQ`O'#GsO:dQMhO'#CoO:rQ`O'#EnO:}Q`O'#EyO;hQMhO'#FeO;xQ`O'#GsOOQO'#K`'#K`O;}Q`O'#K`O<]Q`O'#G{O<]Q`O'#G|O<]Q`O'#HOO9kQ`O'#HRO=SQ`O'#HUO>kQ`O'#CeO>{Q`O'#HcO?TQ`O'#HiO?TQ`O'#HkO`QlO'#HmO?TQ`O'#HoO?TQ`O'#HrO?YQ`O'#HxO?_Q!0LsO'#IOO%[QlO'#IQO?jQ!0LsO'#ISO?uQ!0LsO'#IUO9uQ!0LrO'#IWO@QQ!0MxO'#CiOASQpO'#DlQOQ`OOO%[QlO'#EQOAjQ`O'#ETO:dQMhO'#EnOAuQ`O'#EnOBQQ!bO'#FeOOQ['#Cg'#CgOOQ!0Lb'#Dq'#DqOOQ!0Lb'#Jv'#JvO%[QlO'#JvOOQO'#Jy'#JyOOQO'#Ih'#IhOCQQpO'#EgOOQ!0Lb'#Ef'#EfOOQ!0Lb'#J}'#J}OC|Q!0MSO'#EgODWQpO'#EWOOQO'#Jx'#JxODlQpO'#JyOEyQpO'#EWODWQpO'#EgPFWO&2DjO'#CbPOOO)CD})CD}OOOO'#I`'#I`OFcO#tO,59UOOQ!0Lh,59U,59UOOOO'#Ia'#IaOFqO&jO,59UOGPQ!L^O'#DcOOOO'#Ic'#IcOGWO#@ItO,59{OOQ!0Lf,59{,59{OGfQlO'#IdOGyQ`O'#JtOIxQ!fO'#JtO+}QlO'#JtOJPQ`O,5:ROJgQ`O'#EpOJtQ`O'#KTOKPQ`O'#KSOKPQ`O'#KSOKXQ`O,5;^OK^Q`O'#KROOQ!0Ln,5:^,5:^OKeQlO,5:^OMcQ!0MxO,5:fONSQ`O,5:nONmQ!0LrO'#KQONtQ`O'#KPO9eQ`O'#KPO! YQ`O'#KPO! bQ`O,5;]O! gQ`O'#KPO!#lQ!fO'#JsOOQ!0Lh'#Ci'#CiO%[QlO'#ESO!$[Q!fO,5:sOOQS'#Jz'#JzOOQO-E<j-E<jO9kQ`O,5=_O!$rQ`O,5=_O!$wQlO,5;ZO!&zQMhO'#EkO!(eQ`O,5;ZO!(jQlO'#DyO!(tQpO,5;dO!(|QpO,5;dO%[QlO,5;dOOQ['#FT'#FTOOQ['#FV'#FVO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eOOQ['#FZ'#FZO!)[QlO,5;tOOQ!0Lf,5;y,5;yOOQ!0Lf,5;z,5;zOOQ!0Lf,5;|,5;|O%[QlO'#IpO!+_Q!0LrO,5<iO%[QlO,5;eO!&zQMhO,5;eO!+|QMhO,5;eO!-nQMhO'#E^O%[QlO,5;wOOQ!0Lf,5;{,5;{O!-uQ,UO'#FjO!.rQ,UO'#KXO!.^Q,UO'#KXO!.yQ,UO'#KXOOQO'#KX'#KXO!/_Q,UO,5<SOOOW,5<`,5<`O!/pQlO'#FvOOOW'#Io'#IoO7VO7dO,5<QO!/wQ,UO'#FxOOQ!0Lf,5<Q,5<QO!0hQ$IUO'#CyOOQ!0Lh'#C}'#C}O!0{O#@ItO'#DRO!1iQMjO,5<eO!1pQ`O,5<hO!3YQ(CWO'#GXO!3jQ`O'#GYO!3oQ`O'#GYO!5_Q(CWO'#G^O!6dQpO'#GbOOQO'#Gn'#GnO!,TQMhO'#GmOOQO'#Gp'#GpO!,TQMhO'#GoO!7VQ$IUO'#JlOOQ!0Lh'#Jl'#JlO!7aQ`O'#JkO!7oQ`O'#JjO!7wQ`O'#CuOOQ!0Lh'#C{'#C{O!8YQ`O'#C}OOQ!0Lh'#DV'#DVOOQ!0Lh'#DX'#DXO!8_Q`O,5<eO1SQ`O'#DZO!,TQMhO'#GPO!,TQMhO'#GRO!8gQ`O'#GTO!8lQ`O'#GUO!3oQ`O'#G[O!,TQMhO'#GaO<]Q`O'#JkO!8qQ`O'#EqO!9`Q`O,5<gOOQ!0Lb'#Cr'#CrO!9hQ`O'#ErO!:bQpO'#EsOOQ!0Lb'#KR'#KRO!:iQ!0LrO'#KaO9uQ!0LrO,5=cO`QlO,5>tOOQ['#Jh'#JhOOQ[,5>u,5>uOOQ[-E<]-E<]O!<hQ!0MxO,5:bO!:]QpO,5:`O!?RQ!0MxO,5:jO%[QlO,5:jO!AiQ!0MxO,5:lOOQO,5@z,5@zO!BYQMhO,5=_O!BhQ!0LrO'#JiO9`Q`O'#JiO!ByQ!0LrO,59ZO!CUQpO,59ZO!C^QMhO,59ZO:dQMhO,59ZO!CiQ`O,5;ZO!CqQ`O'#HbO!DVQ`O'#KdO%[QlO,5;}O!:]QpO,5<PO!D_Q`O,5=zO!DdQ`O,5=zO!DiQ`O,5=zO!DwQ`O,5=zO9uQ!0LrO,5=zO<]Q`O,5=jOOQO'#Cy'#CyO!EOQpO,5=gO!EWQMhO,5=hO!EcQ`O,5=jO!EhQ!bO,5=mO!EpQ`O'#K`O?YQ`O'#HWO9kQ`O'#HYO!EuQ`O'#HYO:dQMhO'#H[O!EzQ`O'#H[OOQ[,5=p,5=pO!FPQ`O'#H]O!FbQ`O'#CoO!FgQ`O,59PO!FqQ`O,59PO!HvQlO,59POOQ[,59P,59PO!IWQ!0LrO,59PO%[QlO,59PO!KcQlO'#HeOOQ['#Hf'#HfOOQ['#Hg'#HgO`QlO,5=}O!KyQ`O,5=}O`QlO,5>TO`QlO,5>VO!LOQ`O,5>XO`QlO,5>ZO!LTQ`O,5>^O!LYQlO,5>dOOQ[,5>j,5>jO%[QlO,5>jO9uQ!0LrO,5>lOOQ[,5>n,5>nO#!dQ`O,5>nOOQ[,5>p,5>pO#!dQ`O,5>pOOQ[,5>r,5>rO##QQpO'#D_O%[QlO'#JvO##sQpO'#JvO##}QpO'#DmO#$`QpO'#DmO#&qQlO'#DmO#&xQ`O'#JuO#'QQ`O,5:WO#'VQ`O'#EtO#'eQ`O'#KUO#'mQ`O,5;_O#'rQpO'#DmO#(PQpO'#EVOOQ!0Lf,5:o,5:oO%[QlO,5:oO#(WQ`O,5:oO?YQ`O,5;YO!CUQpO,5;YO!C^QMhO,5;YO:dQMhO,5;YO#(`Q`O,5@bO#(eQ07dO,5:sOOQO-E<f-E<fO#)kQ!0MSO,5;RODWQpO,5:rO#)uQpO,5:rODWQpO,5;RO!ByQ!0LrO,5:rOOQ!0Lb'#Ej'#EjOOQO,5;R,5;RO%[QlO,5;RO#*SQ!0LrO,5;RO#*_Q!0LrO,5;RO!CUQpO,5:rOOQO,5;X,5;XO#*mQ!0LrO,5;RPOOO'#I^'#I^P#+RO&2DjO,58|POOO,58|,58|OOOO-E<^-E<^OOQ!0Lh1G.p1G.pOOOO-E<_-E<_OOOO,59},59}O#+^Q!bO,59}OOOO-E<a-E<aOOQ!0Lf1G/g1G/gO#+cQ!fO,5?OO+}QlO,5?OOOQO,5?U,5?UO#+mQlO'#IdOOQO-E<b-E<bO#+zQ`O,5@`O#,SQ!fO,5@`O#,ZQ`O,5@nOOQ!0Lf1G/m1G/mO%[QlO,5@oO#,cQ`O'#IjOOQO-E<h-E<hO#,ZQ`O,5@nOOQ!0Lb1G0x1G0xOOQ!0Ln1G/x1G/xOOQ!0Ln1G0Y1G0YO%[QlO,5@lO#,wQ!0LrO,5@lO#-YQ!0LrO,5@lO#-aQ`O,5@kO9eQ`O,5@kO#-iQ`O,5@kO#-wQ`O'#ImO#-aQ`O,5@kOOQ!0Lb1G0w1G0wO!(tQpO,5:uO!)PQpO,5:uOOQS,5:w,5:wO#.iQdO,5:wO#.qQMhO1G2yO9kQ`O1G2yOOQ!0Lf1G0u1G0uO#/PQ!0MxO1G0uO#0UQ!0MvO,5;VOOQ!0Lh'#GW'#GWO#0rQ!0MzO'#JlO!$wQlO1G0uO#2}Q!fO'#JwO%[QlO'#JwO#3XQ`O,5:eOOQ!0Lh'#D_'#D_OOQ!0Lf1G1O1G1OO%[QlO1G1OOOQ!0Lf1G1f1G1fO#3^Q`O1G1OO#5rQ!0MxO1G1PO#5yQ!0MxO1G1PO#8aQ!0MxO1G1PO#8hQ!0MxO1G1PO#;OQ!0MxO1G1PO#=fQ!0MxO1G1PO#=mQ!0MxO1G1PO#=tQ!0MxO1G1PO#@[Q!0MxO1G1PO#@cQ!0MxO1G1PO#BpQ?MtO'#CiO#DkQ?MtO1G1`O#DrQ?MtO'#JsO#EVQ!0MxO,5?[OOQ!0Lb-E<n-E<nO#GdQ!0MxO1G1PO#HaQ!0MzO1G1POOQ!0Lf1G1P1G1PO#IdQMjO'#J|O#InQ`O,5:xO#IsQ!0MxO1G1cO#JgQ,UO,5<WO#JoQ,UO,5<XO#JwQ,UO'#FoO#K`Q`O'#FnOOQO'#KY'#KYOOQO'#In'#InO#KeQ,UO1G1nOOQ!0Lf1G1n1G1nOOOW1G1y1G1yO#KvQ?MtO'#JrO#LQQ`O,5<bO!)[QlO,5<bOOOW-E<m-E<mOOQ!0Lf1G1l1G1lO#LVQpO'#KXOOQ!0Lf,5<d,5<dO#L_QpO,5<dO#LdQMhO'#DTOOOO'#Ib'#IbO#LkO#@ItO,59mOOQ!0Lh,59m,59mO%[QlO1G2PO!8lQ`O'#IrO#LvQ`O,5<zOOQ!0Lh,5<w,5<wO!,TQMhO'#IuO#MdQMjO,5=XO!,TQMhO'#IwO#NVQMjO,5=ZO!&zQMhO,5=]OOQO1G2S1G2SO#NaQ!dO'#CrO#NtQ(CWO'#ErO$ |QpO'#GbO$!dQ!dO,5<sO$!kQ`O'#K[O9eQ`O'#K[O$!yQ`O,5<uO$#aQ!dO'#C{O!,TQMhO,5<tO$#kQ`O'#GZO$$PQ`O,5<tO$$UQ!dO'#GWO$$cQ!dO'#K]O$$mQ`O'#K]O!&zQMhO'#K]O$$rQ`O,5<xO$$wQlO'#JvO$%RQpO'#GcO#$`QpO'#GcO$%dQ`O'#GgO!3oQ`O'#GkO$%iQ!0LrO'#ItO$%tQpO,5<|OOQ!0Lp,5<|,5<|O$%{QpO'#GcO$&YQpO'#GdO$&kQpO'#GdO$&pQMjO,5=XO$'QQMjO,5=ZOOQ!0Lh,5=^,5=^O!,TQMhO,5@VO!,TQMhO,5@VO$'bQ`O'#IyO$'vQ`O,5@UO$(OQ`O,59aOOQ!0Lh,59i,59iO$(TQ`O,5@VO$)TQ$IYO,59uOOQ!0Lh'#Jp'#JpO$)vQMjO,5<kO$*iQMjO,5<mO@zQ`O,5<oOOQ!0Lh,5<p,5<pO$*sQ`O,5<vO$*xQMjO,5<{O$+YQ`O'#KPO!$wQlO1G2RO$+_Q`O1G2RO9eQ`O'#KSO9eQ`O'#EtO%[QlO'#EtO9eQ`O'#I{O$+dQ!0LrO,5@{OOQ[1G2}1G2}OOQ[1G4`1G4`OOQ!0Lf1G/|1G/|OOQ!0Lf1G/z1G/zO$-fQ!0MxO1G0UOOQ[1G2y1G2yO!&zQMhO1G2yO%[QlO1G2yO#.tQ`O1G2yO$/jQMhO'#EkOOQ!0Lb,5@T,5@TO$/wQ!0LrO,5@TOOQ[1G.u1G.uO!ByQ!0LrO1G.uO!CUQpO1G.uO!C^QMhO1G.uO$0YQ`O1G0uO$0_Q`O'#CiO$0jQ`O'#KeO$0rQ`O,5=|O$0wQ`O'#KeO$0|Q`O'#KeO$1[Q`O'#JRO$1jQ`O,5AOO$1rQ!fO1G1iOOQ!0Lf1G1k1G1kO9kQ`O1G3fO@zQ`O1G3fO$1yQ`O1G3fO$2OQ`O1G3fO!DiQ`O1G3fO9uQ!0LrO1G3fOOQ[1G3f1G3fO!EcQ`O1G3UO!&zQMhO1G3RO$2TQ`O1G3ROOQ[1G3S1G3SO!&zQMhO1G3SO$2YQ`O1G3SO$2bQpO'#HQOOQ[1G3U1G3UO!6_QpO'#I}O!EhQ!bO1G3XOOQ[1G3X1G3XOOQ[,5=r,5=rO$2jQMhO,5=tO9kQ`O,5=tO$%dQ`O,5=vO9`Q`O,5=vO!CUQpO,5=vO!C^QMhO,5=vO:dQMhO,5=vO$2xQ`O'#KcO$3TQ`O,5=wOOQ[1G.k1G.kO$3YQ!0LrO1G.kO@zQ`O1G.kO$3eQ`O1G.kO9uQ!0LrO1G.kO$5mQ!fO,5AQO$5zQ`O,5AQO9eQ`O,5AQO$6VQlO,5>PO$6^Q`O,5>POOQ[1G3i1G3iO`QlO1G3iOOQ[1G3o1G3oOOQ[1G3q1G3qO?TQ`O1G3sO$6cQlO1G3uO$:gQlO'#HtOOQ[1G3x1G3xO$:tQ`O'#HzO?YQ`O'#H|OOQ[1G4O1G4OO$:|QlO1G4OO9uQ!0LrO1G4UOOQ[1G4W1G4WOOQ!0Lb'#G_'#G_O9uQ!0LrO1G4YO9uQ!0LrO1G4[O$?TQ`O,5@bO!)[QlO,5;`O9eQ`O,5;`O?YQ`O,5:XO!)[QlO,5:XO!CUQpO,5:XO$?YQ?MtO,5:XOOQO,5;`,5;`O$?dQpO'#IeO$?zQ`O,5@aOOQ!0Lf1G/r1G/rO$@SQpO'#IkO$@^Q`O,5@pOOQ!0Lb1G0y1G0yO#$`QpO,5:XOOQO'#Ig'#IgO$@fQpO,5:qOOQ!0Ln,5:q,5:qO#(ZQ`O1G0ZOOQ!0Lf1G0Z1G0ZO%[QlO1G0ZOOQ!0Lf1G0t1G0tO?YQ`O1G0tO!CUQpO1G0tO!C^QMhO1G0tOOQ!0Lb1G5|1G5|O!ByQ!0LrO1G0^OOQO1G0m1G0mO%[QlO1G0mO$@mQ!0LrO1G0mO$@xQ!0LrO1G0mO!CUQpO1G0^ODWQpO1G0^O$AWQ!0LrO1G0mOOQO1G0^1G0^O$AlQ!0MxO1G0mPOOO-E<[-E<[POOO1G.h1G.hOOOO1G/i1G/iO$AvQ!bO,5<iO$BOQ!fO1G4jOOQO1G4p1G4pO%[QlO,5?OO$BYQ`O1G5zO$BbQ`O1G6YO$BjQ!fO1G6ZO9eQ`O,5?UO$BtQ!0MxO1G6WO%[QlO1G6WO$CUQ!0LrO1G6WO$CgQ`O1G6VO$CgQ`O1G6VO9eQ`O1G6VO$CoQ`O,5?XO9eQ`O,5?XOOQO,5?X,5?XO$DTQ`O,5?XO$+YQ`O,5?XOOQO-E<k-E<kOOQS1G0a1G0aOOQS1G0c1G0cO#.lQ`O1G0cOOQ[7+(e7+(eO!&zQMhO7+(eO%[QlO7+(eO$DcQ`O7+(eO$DnQMhO7+(eO$D|Q!0MzO,5=XO$GXQ!0MzO,5=ZO$IdQ!0MzO,5=XO$KuQ!0MzO,5=ZO$NWQ!0MzO,59uO%!]Q!0MzO,5<kO%$hQ!0MzO,5<mO%&sQ!0MzO,5<{OOQ!0Lf7+&a7+&aO%)UQ!0MxO7+&aO%)xQlO'#IfO%*VQ`O,5@cO%*_Q!fO,5@cOOQ!0Lf1G0P1G0PO%*iQ`O7+&jOOQ!0Lf7+&j7+&jO%*nQ?MtO,5:fO%[QlO7+&zO%*xQ?MtO,5:bO%+VQ?MtO,5:jO%+aQ?MtO,5:lO%+kQMhO'#IiO%+uQ`O,5@hOOQ!0Lh1G0d1G0dOOQO1G1r1G1rOOQO1G1s1G1sO%+}Q!jO,5<ZO!)[QlO,5<YOOQO-E<l-E<lOOQ!0Lf7+'Y7+'YOOOW7+'e7+'eOOOW1G1|1G1|O%,YQ`O1G1|OOQ!0Lf1G2O1G2OOOOO,59o,59oO%,_Q!dO,59oOOOO-E<`-E<`OOQ!0Lh1G/X1G/XO%,fQ!0MxO7+'kOOQ!0Lh,5?^,5?^O%-YQMhO1G2fP%-aQ`O'#IrPOQ!0Lh-E<p-E<pO%-}QMjO,5?aOOQ!0Lh-E<s-E<sO%.pQMjO,5?cOOQ!0Lh-E<u-E<uO%.zQ!dO1G2wO%/RQ!dO'#CrO%/iQMhO'#KSO$$wQlO'#JvOOQ!0Lh1G2_1G2_O%/sQ`O'#IqO%0[Q`O,5@vO%0[Q`O,5@vO%0dQ`O,5@vO%0oQ`O,5@vOOQO1G2a1G2aO%0}QMjO1G2`O$+YQ`O'#K[O!,TQMhO1G2`O%1_Q(CWO'#IsO%1lQ`O,5@wO!&zQMhO,5@wO%1tQ!dO,5@wOOQ!0Lh1G2d1G2dO%4UQ!fO'#CiO%4`Q`O,5=POOQ!0Lb,5<},5<}O%4hQpO,5<}OOQ!0Lb,5=O,5=OOCwQ`O,5<}O%4sQpO,5<}OOQ!0Lb,5=R,5=RO$+YQ`O,5=VOOQO,5?`,5?`OOQO-E<r-E<rOOQ!0Lp1G2h1G2hO#$`QpO,5<}O$$wQlO,5=PO%5RQ`O,5=OO%5^QpO,5=OO!,TQMhO'#IuO%6WQMjO1G2sO!,TQMhO'#IwO%6yQMjO1G2uO%7TQMjO1G5qO%7_QMjO1G5qOOQO,5?e,5?eOOQO-E<w-E<wOOQO1G.{1G.{O!,TQMhO1G5qO!,TQMhO1G5qO!:]QpO,59wO%[QlO,59wOOQ!0Lh,5<j,5<jO%7lQ`O1G2ZO!,TQMhO1G2bO%7qQ!0MxO7+'mOOQ!0Lf7+'m7+'mO!$wQlO7+'mO%8eQ`O,5;`OOQ!0Lb,5?g,5?gOOQ!0Lb-E<y-E<yO%8jQ!dO'#K^O#(ZQ`O7+(eO4UQ!fO7+(eO$DfQ`O7+(eO%8tQ!0MvO'#CiO%9XQ!0MvO,5=SO%9lQ`O,5=SO%9tQ`O,5=SOOQ!0Lb1G5o1G5oOOQ[7+$a7+$aO!ByQ!0LrO7+$aO!CUQpO7+$aO!$wQlO7+&aO%9yQ`O'#JQO%:bQ`O,5APOOQO1G3h1G3hO9kQ`O,5APO%:bQ`O,5APO%:jQ`O,5APOOQO,5?m,5?mOOQO-E=P-E=POOQ!0Lf7+'T7+'TO%:oQ`O7+)QO9uQ!0LrO7+)QO9kQ`O7+)QO@zQ`O7+)QO%:tQ`O7+)QOOQ[7+)Q7+)QOOQ[7+(p7+(pO%:yQ!0MvO7+(mO!&zQMhO7+(mO!E^Q`O7+(nOOQ[7+(n7+(nO!&zQMhO7+(nO%;TQ`O'#KbO%;`Q`O,5=lOOQO,5?i,5?iOOQO-E<{-E<{OOQ[7+(s7+(sO%<rQpO'#HZOOQ[1G3`1G3`O!&zQMhO1G3`O%[QlO1G3`O%<yQ`O1G3`O%=UQMhO1G3`O9uQ!0LrO1G3bO$%dQ`O1G3bO9`Q`O1G3bO!CUQpO1G3bO!C^QMhO1G3bO%=dQ`O'#JPO%=xQ`O,5@}O%>QQpO,5@}OOQ!0Lb1G3c1G3cOOQ[7+$V7+$VO@zQ`O7+$VO9uQ!0LrO7+$VO%>]Q`O7+$VO%[QlO1G6lO%[QlO1G6mO%>bQ!0LrO1G6lO%>lQlO1G3kO%>sQ`O1G3kO%>xQlO1G3kOOQ[7+)T7+)TO9uQ!0LrO7+)_O`QlO7+)aOOQ['#Kh'#KhOOQ['#JS'#JSO%?PQlO,5>`OOQ[,5>`,5>`O%[QlO'#HuO%?^Q`O'#HwOOQ[,5>f,5>fO9eQ`O,5>fOOQ[,5>h,5>hOOQ[7+)j7+)jOOQ[7+)p7+)pOOQ[7+)t7+)tOOQ[7+)v7+)vO%?cQpO1G5|O%?}Q?MtO1G0zO%@XQ`O1G0zOOQO1G/s1G/sO%@dQ?MtO1G/sO?YQ`O1G/sO!)[QlO'#DmOOQO,5?P,5?POOQO-E<c-E<cOOQO,5?V,5?VOOQO-E<i-E<iO!CUQpO1G/sOOQO-E<e-E<eOOQ!0Ln1G0]1G0]OOQ!0Lf7+%u7+%uO#(ZQ`O7+%uOOQ!0Lf7+&`7+&`O?YQ`O7+&`O!CUQpO7+&`OOQO7+%x7+%xO$AlQ!0MxO7+&XOOQO7+&X7+&XO%[QlO7+&XO%@nQ!0LrO7+&XO!ByQ!0LrO7+%xO!CUQpO7+%xO%@yQ!0LrO7+&XO%AXQ!0MxO7++rO%[QlO7++rO%AiQ`O7++qO%AiQ`O7++qOOQO1G4s1G4sO9eQ`O1G4sO%AqQ`O1G4sOOQS7+%}7+%}O#(ZQ`O<<LPO4UQ!fO<<LPO%BPQ`O<<LPOOQ[<<LP<<LPO!&zQMhO<<LPO%[QlO<<LPO%BXQ`O<<LPO%BdQ!0MzO,5?aO%DoQ!0MzO,5?cO%FzQ!0MzO1G2`O%I]Q!0MzO1G2sO%KhQ!0MzO1G2uO%MsQ!fO,5?QO%[QlO,5?QOOQO-E<d-E<dO%M}Q`O1G5}OOQ!0Lf<<JU<<JUO%NVQ?MtO1G0uO&!^Q?MtO1G1PO&!eQ?MtO1G1PO&$fQ?MtO1G1PO&$mQ?MtO1G1PO&&nQ?MtO1G1PO&(oQ?MtO1G1PO&(vQ?MtO1G1PO&(}Q?MtO1G1PO&+OQ?MtO1G1PO&+VQ?MtO1G1PO&+^Q!0MxO<<JfO&-UQ?MtO1G1PO&.RQ?MvO1G1PO&/UQ?MvO'#JlO&1[Q?MtO1G1cO&1iQ?MtO1G0UO&1sQMjO,5?TOOQO-E<g-E<gO!)[QlO'#FqOOQO'#KZ'#KZOOQO1G1u1G1uO&1}Q`O1G1tO&2SQ?MtO,5?[OOOW7+'h7+'hOOOO1G/Z1G/ZO&2^Q!dO1G4xOOQ!0Lh7+(Q7+(QP!&zQMhO,5?^O!,TQMhO7+(cO&2eQ`O,5?]O9eQ`O,5?]O$+YQ`O,5?]OOQO-E<o-E<oO&2sQ`O1G6bO&2sQ`O1G6bO&2{Q`O1G6bO&3WQMjO7+'zO&3hQ!dO,5?_O&3rQ`O,5?_O!&zQMhO,5?_OOQO-E<q-E<qO&3wQ!dO1G6cO&4RQ`O1G6cO&4ZQ`O1G2kO!&zQMhO1G2kOOQ!0Lb1G2i1G2iOOQ!0Lb1G2j1G2jO%4hQpO1G2iO!CUQpO1G2iOCwQ`O1G2iOOQ!0Lb1G2q1G2qO&4`QpO1G2iO&4nQ`O1G2kO$+YQ`O1G2jOCwQ`O1G2jO$$wQlO1G2kO&4vQ`O1G2jO&5jQMjO,5?aOOQ!0Lh-E<t-E<tO&6]QMjO,5?cOOQ!0Lh-E<v-E<vO!,TQMhO7++]O&6gQMjO7++]O&6qQMjO7++]OOQ!0Lh1G/c1G/cO&7OQ`O1G/cOOQ!0Lh7+'u7+'uO&7TQMjO7+'|O&7eQ!0MxO<<KXOOQ!0Lf<<KX<<KXO&8XQ`O1G0zO!&zQMhO'#IzO&8^Q`O,5@xO&:`Q!fO<<LPO!&zQMhO1G2nO&:gQ!0LrO1G2nOOQ[<<G{<<G{O!ByQ!0LrO<<G{O&:xQ!0MxO<<I{OOQ!0Lf<<I{<<I{OOQO,5?l,5?lO&;lQ`O,5?lO&;qQ`O,5?lOOQO-E=O-E=OO&<PQ`O1G6kO&<PQ`O1G6kO9kQ`O1G6kO@zQ`O<<LlOOQ[<<Ll<<LlO&<XQ`O<<LlO9uQ!0LrO<<LlO9kQ`O<<LlOOQ[<<LX<<LXO%:yQ!0MvO<<LXOOQ[<<LY<<LYO!E^Q`O<<LYO&<^QpO'#I|O&<iQ`O,5@|O!)[QlO,5@|OOQ[1G3W1G3WOOQO'#JO'#JOO9uQ!0LrO'#JOO&<qQpO,5=uOOQ[,5=u,5=uO&<xQpO'#EgO&=PQpO'#GeO&=UQ`O7+(zO&=ZQ`O7+(zOOQ[7+(z7+(zO!&zQMhO7+(zO%[QlO7+(zO&=cQ`O7+(zOOQ[7+(|7+(|O9uQ!0LrO7+(|O$%dQ`O7+(|O9`Q`O7+(|O!CUQpO7+(|O&=nQ`O,5?kOOQO-E<}-E<}OOQO'#H^'#H^O&=yQ`O1G6iO9uQ!0LrO<<GqOOQ[<<Gq<<GqO@zQ`O<<GqO&>RQ`O7+,WO&>WQ`O7+,XO%[QlO7+,WO%[QlO7+,XOOQ[7+)V7+)VO&>]Q`O7+)VO&>bQlO7+)VO&>iQ`O7+)VOOQ[<<Ly<<LyOOQ[<<L{<<L{OOQ[-E=Q-E=QOOQ[1G3z1G3zO&>nQ`O,5>aOOQ[,5>c,5>cO&>sQ`O1G4QO9eQ`O7+&fO!)[QlO7+&fOOQO7+%_7+%_O&>xQ?MtO1G6ZO?YQ`O7+%_OOQ!0Lf<<Ia<<IaOOQ!0Lf<<Iz<<IzO?YQ`O<<IzOOQO<<Is<<IsO$AlQ!0MxO<<IsO%[QlO<<IsOOQO<<Id<<IdO!ByQ!0LrO<<IdO&?SQ!0LrO<<IsO&?_Q!0MxO<= ^O&?oQ`O<= ]OOQO7+*_7+*_O9eQ`O7+*_OOQ[ANAkANAkO&?wQ!fOANAkO!&zQMhOANAkO#(ZQ`OANAkO4UQ!fOANAkO&@OQ`OANAkO%[QlOANAkO&@WQ!0MzO7+'zO&BiQ!0MzO,5?aO&DtQ!0MzO,5?cO&GPQ!0MzO7+'|O&IbQ!fO1G4lO&IlQ?MtO7+&aO&KpQ?MvO,5=XO&MwQ?MvO,5=ZO&NXQ?MvO,5=XO&NiQ?MvO,5=ZO&NyQ?MvO,59uO'#PQ?MvO,5<kO'%SQ?MvO,5<mO''hQ?MvO,5<{O')^Q?MtO7+'kO')kQ?MtO7+'mO')xQ`O,5<]OOQO7+'`7+'`OOQ!0Lh7+*d7+*dO')}QMjO<<K}OOQO1G4w1G4wO'*UQ`O1G4wO'*aQ`O1G4wO'*oQ`O7++|O'*oQ`O7++|O!&zQMhO1G4yO'*wQ!dO1G4yO'+RQ`O7++}O'+ZQ`O7+(VO'+fQ!dO7+(VOOQ!0Lb7+(T7+(TOOQ!0Lb7+(U7+(UO!CUQpO7+(TOCwQ`O7+(TO'+pQ`O7+(VO!&zQMhO7+(VO$+YQ`O7+(UO'+uQ`O7+(VOCwQ`O7+(UO'+}QMjO<<NwO!,TQMhO<<NwOOQ!0Lh7+$}7+$}O',XQ!dO,5?fOOQO-E<x-E<xO',cQ!0MvO7+(YO!&zQMhO7+(YOOQ[AN=gAN=gO9kQ`O1G5WOOQO1G5W1G5WO',sQ`O1G5WO',xQ`O7+,VO',xQ`O7+,VO9uQ!0LrOANBWO@zQ`OANBWOOQ[ANBWANBWO'-QQ`OANBWOOQ[ANAsANAsOOQ[ANAtANAtO'-VQ`O,5?hOOQO-E<z-E<zO'-bQ?MtO1G6hOOQO,5?j,5?jOOQO-E<|-E<|OOQ[1G3a1G3aO'-lQ`O,5=POOQ[<<Lf<<LfO!&zQMhO<<LfO&=UQ`O<<LfO'-qQ`O<<LfO%[QlO<<LfOOQ[<<Lh<<LhO9uQ!0LrO<<LhO$%dQ`O<<LhO9`Q`O<<LhO'-yQpO1G5VO'.UQ`O7+,TOOQ[AN=]AN=]O9uQ!0LrOAN=]OOQ[<= r<= rOOQ[<= s<= sO'.^Q`O<= rO'.cQ`O<= sOOQ[<<Lq<<LqO'.hQ`O<<LqO'.mQlO<<LqOOQ[1G3{1G3{O?YQ`O7+)lO'.tQ`O<<JQO'/PQ?MtO<<JQOOQO<<Hy<<HyOOQ!0LfAN?fAN?fOOQOAN?_AN?_O$AlQ!0MxOAN?_OOQOAN?OAN?OO%[QlOAN?_OOQO<<My<<MyOOQ[G27VG27VO!&zQMhOG27VO#(ZQ`OG27VO'/ZQ!fOG27VO4UQ!fOG27VO'/bQ`OG27VO'/jQ?MtO<<JfO'/wQ?MvO1G2`O'1mQ?MvO,5?aO'3pQ?MvO,5?cO'5sQ?MvO1G2sO'7vQ?MvO1G2uO'9yQ?MtO<<KXO':WQ?MtO<<I{OOQO1G1w1G1wO!,TQMhOANAiOOQO7+*c7+*cO':eQ`O7+*cO':pQ`O<= hO':xQ!dO7+*eOOQ!0Lb<<Kq<<KqO$+YQ`O<<KqOCwQ`O<<KqO';SQ`O<<KqO!&zQMhO<<KqOOQ!0Lb<<Ko<<KoO!CUQpO<<KoO';_Q!dO<<KqOOQ!0Lb<<Kp<<KpO';iQ`O<<KqO!&zQMhO<<KqO$+YQ`O<<KpO';nQMjOANDcO';xQ!0MvO<<KtOOQO7+*r7+*rO9kQ`O7+*rO'<YQ`O<= qOOQ[G27rG27rO9uQ!0LrOG27rO@zQ`OG27rO!)[QlO1G5SO'<bQ`O7+,SO'<jQ`O1G2kO&=UQ`OANBQOOQ[ANBQANBQO!&zQMhOANBQO'<oQ`OANBQOOQ[ANBSANBSO9uQ!0LrOANBSO$%dQ`OANBSOOQO'#H_'#H_OOQO7+*q7+*qOOQ[G22wG22wOOQ[ANE^ANE^OOQ[ANE_ANE_OOQ[ANB]ANB]O'<wQ`OANB]OOQ[<<MW<<MWO!)[QlOAN?lOOQOG24yG24yO$AlQ!0MxOG24yO#(ZQ`OLD,qOOQ[LD,qLD,qO!&zQMhOLD,qO'<|Q!fOLD,qO'=TQ?MvO7+'zO'>yQ?MvO,5?aO'@|Q?MvO,5?cO'CPQ?MvO7+'|O'DuQMjOG27TOOQO<<M}<<M}OOQ!0LbANA]ANA]O$+YQ`OANA]OCwQ`OANA]O'EVQ!dOANA]OOQ!0LbANAZANAZO'E^Q`OANA]O!&zQMhOANA]O'EiQ!dOANA]OOQ!0LbANA[ANA[OOQO<<N^<<N^OOQ[LD-^LD-^O9uQ!0LrOLD-^O'EsQ?MtO7+*nOOQO'#Gf'#GfOOQ[G27lG27lO&=UQ`OG27lO!&zQMhOG27lOOQ[G27nG27nO9uQ!0LrOG27nOOQ[G27wG27wO'E}Q?MtOG25WOOQOLD*eLD*eOOQ[!$(!]!$(!]O#(ZQ`O!$(!]O!&zQMhO!$(!]O'FXQ!0MzOG27TOOQ!0LbG26wG26wO$+YQ`OG26wO'HjQ`OG26wOCwQ`OG26wO'HuQ!dOG26wO!&zQMhOG26wOOQ[!$(!x!$(!xOOQ[LD-WLD-WO&=UQ`OLD-WOOQ[LD-YLD-YOOQ[!)9Ew!)9EwO#(ZQ`O!)9EwOOQ!0LbLD,cLD,cO$+YQ`OLD,cOCwQ`OLD,cO'H|Q`OLD,cO'IXQ!dOLD,cOOQ[!$(!r!$(!rOOQ[!.K;c!.K;cO'I`Q?MvOG27TOOQ!0Lb!$( }!$( }O$+YQ`O!$( }OCwQ`O!$( }O'KUQ`O!$( }OOQ!0Lb!)9Ei!)9EiO$+YQ`O!)9EiOCwQ`O!)9EiOOQ!0Lb!.K;T!.K;TO$+YQ`O!.K;TOOQ!0Lb!4/0o!4/0oO!)[QlO'#DzO1PQ`O'#EXO'KaQ!fO'#JrO'KhQ!L^O'#DvO'KoQlO'#EOO'KvQ!fO'#CiO'N^Q!fO'#CiO!)[QlO'#EQO'NnQlO,5;ZO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO'#IpO(!qQ`O,5<iO!)[QlO,5;eO(!yQMhO,5;eO($dQMhO,5;eO!)[QlO,5;wO!&zQMhO'#GmO(!yQMhO'#GmO!&zQMhO'#GoO(!yQMhO'#GoO1SQ`O'#DZO1SQ`O'#DZO!&zQMhO'#GPO(!yQMhO'#GPO!&zQMhO'#GRO(!yQMhO'#GRO!&zQMhO'#GaO(!yQMhO'#GaO!)[QlO,5:jO($kQpO'#D_O($uQpO'#JvO!)[QlO,5@oO'NnQlO1G0uO(%PQ?MtO'#CiO!)[QlO1G2PO!&zQMhO'#IuO(!yQMhO'#IuO!&zQMhO'#IwO(!yQMhO'#IwO(%ZQ!dO'#CrO!&zQMhO,5<tO(!yQMhO,5<tO'NnQlO1G2RO!)[QlO7+&zO!&zQMhO1G2`O(!yQMhO1G2`O!&zQMhO'#IuO(!yQMhO'#IuO!&zQMhO'#IwO(!yQMhO'#IwO!&zQMhO1G2bO(!yQMhO1G2bO'NnQlO7+'mO'NnQlO7+&aO!&zQMhOANAiO(!yQMhOANAiO(%nQ`O'#EoO(%sQ`O'#EoO(%{Q`O'#F]O(&QQ`O'#EyO(&VQ`O'#KTO(&bQ`O'#KRO(&mQ`O,5;ZO(&rQMjO,5<eO(&yQ`O'#GYO('OQ`O'#GYO('TQ`O,5<eO(']Q`O,5<gO('eQ`O,5;ZO('mQ?MtO1G1`O('tQ`O,5<tO('yQ`O,5<tO((OQ`O,5<vO((TQ`O,5<vO((YQ`O1G2RO((_Q`O1G0uO((dQMjO<<K}O((kQMjO<<K}O((rQMhO'#F|O9`Q`O'#F{OAuQ`O'#EnO!)[QlO,5;tO!3oQ`O'#GYO!3oQ`O'#GYO!3oQ`O'#G[O!3oQ`O'#G[O!,TQMhO7+(cO!,TQMhO7+(cO%.zQ!dO1G2wO%.zQ!dO1G2wO!&zQMhO,5=]O!&zQMhO,5=]",
    stateData: "()x~O'|OS'}OSTOS(ORQ~OPYOQYOSfOY!VOaqOdzOeyOl!POpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_XO!iuO!lZO!oYO!pYO!qYO!svO!uwO!xxO!|]O$W|O$niO%h}O%j!QO%l!OO%m!OO%n!OO%q!RO%s!SO%v!TO%w!TO%y!UO&W!WO&^!XO&`!YO&b!ZO&d![O&g!]O&m!^O&s!_O&u!`O&w!aO&y!bO&{!cO(TSO(VTO(YUO(aVO(o[O~OWtO~P`OPYOQYOSfOd!jOe!iOpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_!eO!iuO!lZO!oYO!pYO!qYO!svO!u!gO!x!hO$W!kO$niO(T!dO(VTO(YUO(aVO(o[O~Oa!wOs!nO!S!oO!b!yO!c!vO!d!vO!|<VO#T!pO#U!pO#V!xO#W!pO#X!pO#[!zO#]!zO(U!lO(VTO(YUO(e!mO(o!sO~O(O!{O~OP]XR]X[]Xa]Xj]Xr]X!Q]X!S]X!]]X!l]X!p]X#R]X#S]X#`]X#kfX#n]X#o]X#p]X#q]X#r]X#s]X#t]X#u]X#v]X#x]X#z]X#{]X$Q]X'z]X(a]X(r]X(y]X(z]X~O!g%RX~P(qO_!}O(V#PO(W!}O(X#PO~O_#QO(X#PO(Y#PO(Z#QO~Ox#SO!U#TO(b#TO(c#VO~OPYOQYOSfOd!jOe!iOpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_!eO!iuO!lZO!oYO!pYO!qYO!svO!u!gO!x!hO$W!kO$niO(T<ZO(VTO(YUO(aVO(o[O~O![#ZO!]#WO!Y(hP!Y(vP~P+}O!^#cO~P`OPYOQYOSfOd!jOe!iOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_!eO!iuO!lZO!oYO!pYO!qYO!svO!u!gO!x!hO$W!kO$niO(VTO(YUO(aVO(o[O~Op#mO![#iO!|]O#i#lO#j#iO(T<[O!k(sP~P.iO!l#oO(T#nO~O!x#sO!|]O%h#tO~O#k#uO~O!g#vO#k#uO~OP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!]$_O!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO#v$SO#x$UO#z$WO#{$XO(aVO(r$YO(y#|O(z#}O~Oa(fX'z(fX'w(fX!k(fX!Y(fX!_(fX%i(fX!g(fX~P1qO#S$dO#`$eO$Q$eOP(gXR(gX[(gXj(gXr(gX!Q(gX!S(gX!](gX!l(gX!p(gX#R(gX#n(gX#o(gX#p(gX#q(gX#r(gX#s(gX#t(gX#u(gX#v(gX#x(gX#z(gX#{(gX(a(gX(r(gX(y(gX(z(gX!_(gX%i(gX~Oa(gX'z(gX'w(gX!Y(gX!k(gXv(gX!g(gX~P4UO#`$eO~O$]$hO$_$gO$f$mO~OSfO!_$nO$i$oO$k$qO~Oh%VOj%dOk%dOp%WOr%XOs$tOt$tOz%YO|%ZO!O%]O!S${O!_$|O!i%bO!l$xO#j%cO$W%`O$t%^O$v%_O$y%aO(T$sO(VTO(YUO(a$uO(y$}O(z%POg(^P~Ol%[O~P7eO!l%eO~O!S%hO!_%iO(T%gO~O!g%mO~Oa%nO'z%nO~O!Q%rO~P%[O(U!lO~P%[O%n%vO~P%[Oh%VO!l%eO(T%gO(U!lO~Oe%}O!l%eO(T%gO~Oj$RO~O!_&PO(T%gO(U!lO(VTO(YUO`)WP~O!Q&SO!l&RO%j&VO&T&WO~P;SO!x#sO~O%s&YO!S)SX!_)SX(T)SX~O(T&ZO~Ol!PO!u&`O%j!QO%l!OO%m!OO%n!OO%q!RO%s!SO%v!TO%w!TO~Od&eOe&dO!x&bO%h&cO%{&aO~P<bOd&hOeyOl!PO!_&gO!u&`O!xxO!|]O%h}O%l!OO%m!OO%n!OO%q!RO%s!SO%v!TO%w!TO%y!UO~Ob&kO#`&nO%j&iO(U!lO~P=gO!l&oO!u&sO~O!l#oO~O!_XO~Oa%nO'x&{O'z%nO~Oa%nO'x'OO'z%nO~Oa%nO'x'QO'z%nO~O'w]X!Y]Xv]X!k]X&[]X!_]X%i]X!g]X~P(qO!b'_O!c'WO!d'WO(U!lO(VTO(YUO~Os'UO!S'TO!['XO(e'SO!^(iP!^(xP~P@nOn'bO!_'`O(T%gO~Oe'gO!l%eO(T%gO~O!Q&SO!l&RO~Os!nO!S!oO!|<VO#T!pO#U!pO#W!pO#X!pO(U!lO(VTO(YUO(e!mO(o!sO~O!b'mO!c'lO!d'lO#V!pO#['nO#]'nO~PBYOa%nOh%VO!g#vO!l%eO'z%nO(r'pO~O!p'tO#`'rO~PChOs!nO!S!oO(VTO(YUO(e!mO(o!sO~O!_XOs(mX!S(mX!b(mX!c(mX!d(mX!|(mX#T(mX#U(mX#V(mX#W(mX#X(mX#[(mX#](mX(U(mX(V(mX(Y(mX(e(mX(o(mX~O!c'lO!d'lO(U!lO~PDWO(P'xO(Q'xO(R'zO~O_!}O(V'|O(W!}O(X'|O~O_#QO(X'|O(Y'|O(Z#QO~Ov(OO~P%[Ox#SO!U#TO(b#TO(c(RO~O![(TO!Y'WX!Y'^X!]'WX!]'^X~P+}O!](VO!Y(hX~OP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!](VO!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO#v$SO#x$UO#z$WO#{$XO(aVO(r$YO(y#|O(z#}O~O!Y(hX~PHRO!Y([O~O!Y(uX!](uX!g(uX!k(uX(r(uX~O#`(uX#k#dX!^(uX~PJUO#`(]O!Y(wX!](wX~O!](^O!Y(vX~O!Y(aO~O#`$eO~PJUO!^(bO~P`OR#zO!Q#yO!S#{O!l#xO(aVOP!na[!naj!nar!na!]!na!p!na#R!na#n!na#o!na#p!na#q!na#r!na#s!na#t!na#u!na#v!na#x!na#z!na#{!na(r!na(y!na(z!na~Oa!na'z!na'w!na!Y!na!k!nav!na!_!na%i!na!g!na~PKlO!k(cO~O!g#vO#`(dO(r'pO!](tXa(tX'z(tX~O!k(tX~PNXO!S%hO!_%iO!|]O#i(iO#j(hO(T%gO~O!](jO!k(sX~O!k(lO~O!S%hO!_%iO#j(hO(T%gO~OP(gXR(gX[(gXj(gXr(gX!Q(gX!S(gX!](gX!l(gX!p(gX#R(gX#n(gX#o(gX#p(gX#q(gX#r(gX#s(gX#t(gX#u(gX#v(gX#x(gX#z(gX#{(gX(a(gX(r(gX(y(gX(z(gX~O!g#vO!k(gX~P! uOR(nO!Q(mO!l#xO#S$dO!|!{a!S!{a~O!x!{a%h!{a!_!{a#i!{a#j!{a(T!{a~P!#vO!x(rO~OPYOQYOSfOd!jOe!iOpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_XO!iuO!lZO!oYO!pYO!qYO!svO!u!gO!x!hO$W!kO$niO(T!dO(VTO(YUO(aVO(o[O~Oh%VOp%WOr%XOs$tOt$tOz%YO|%ZO!O<sO!S${O!_$|O!i>VO!l$xO#j<yO$W%`O$t<uO$v<wO$y%aO(T(vO(VTO(YUO(a$uO(y$}O(z%PO~O#k(xO~O![(zO!k(kP~P%[O(e(|O(o[O~O!S)OO!l#xO(e(|O(o[O~OP<UOQ<UOSfOd>ROe!iOpkOr<UOskOtkOzkO|<UO!O<UO!SWO!WkO!XkO!_!eO!i<XO!lZO!o<UO!p<UO!q<UO!s<YO!u<]O!x!hO$W!kO$n>PO(T)]O(VTO(YUO(aVO(o[O~O!]$_Oa$qa'z$qa'w$qa!k$qa!Y$qa!_$qa%i$qa!g$qa~Ol)dO~P!&zOh%VOp%WOr%XOs$tOt$tOz%YO|%ZO!O%]O!S${O!_$|O!i%bO!l$xO#j%cO$W%`O$t%^O$v%_O$y%aO(T(vO(VTO(YUO(a$uO(y$}O(z%PO~Og(pP~P!,TO!Q)iO!g)hO!_$^X$Z$^X$]$^X$_$^X$f$^X~O!g)hO!_({X$Z({X$]({X$_({X$f({X~O!Q)iO~P!.^O!Q)iO!_({X$Z({X$]({X$_({X$f({X~O!_)kO$Z)oO$])jO$_)jO$f)pO~O![)sO~P!)[O$]$hO$_$gO$f)wO~On$zX!Q$zX#S$zX'y$zX(y$zX(z$zX~OgmXg$zXnmX!]mX#`mX~P!0SOx)yO(b)zO(c)|O~On*VO!Q*OO'y*PO(y$}O(z%PO~Og)}O~P!1WOg*WO~Oh%VOr%XOs$tOt$tOz%YO|%ZO!O<sO!S*YO!_*ZO!i>VO!l$xO#j<yO$W%`O$t<uO$v<wO$y%aO(VTO(YUO(a$uO(y$}O(z%PO~Op*`O![*^O(T*XO!k)OP~P!1uO#k*aO~O!l*bO~Oh%VOp%WOr%XOs$tOt$tOz%YO|%ZO!O<sO!S${O!_$|O!i>VO!l$xO#j<yO$W%`O$t<uO$v<wO$y%aO(T*dO(VTO(YUO(a$uO(y$}O(z%PO~O![*gO!Y)PP~P!3tOr*sOs!nO!S*iO!b*qO!c*kO!d*kO!l*bO#[*rO%`*mO(U!lO(VTO(YUO(e!mO~O!^*pO~P!5iO#S$dOn(`X!Q(`X'y(`X(y(`X(z(`X!](`X#`(`X~Og(`X$O(`X~P!6kOn*xO#`*wOg(_X!](_X~O!]*yOg(^X~Oj%dOk%dOl%dO(T&ZOg(^P~Os*|O~Og)}O(T&ZO~O!l+SO~O(T(vO~Op+WO!S%hO![#iO!_%iO!|]O#i#lO#j#iO(T%gO!k(sP~O!g#vO#k+XO~O!S%hO![+ZO!](^O!_%iO(T%gO!Y(vP~Os'[O!S+]O![+[O(VTO(YUO(e(|O~O!^(xP~P!9|O!]+^Oa)TX'z)TX~OP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO#v$SO#x$UO#z$WO#{$XO(aVO(r$YO(y#|O(z#}O~Oa!ja!]!ja'z!ja'w!ja!Y!ja!k!jav!ja!_!ja%i!ja!g!ja~P!:tOR#zO!Q#yO!S#{O!l#xO(aVOP!ra[!raj!rar!ra!]!ra!p!ra#R!ra#n!ra#o!ra#p!ra#q!ra#r!ra#s!ra#t!ra#u!ra#v!ra#x!ra#z!ra#{!ra(r!ra(y!ra(z!ra~Oa!ra'z!ra'w!ra!Y!ra!k!rav!ra!_!ra%i!ra!g!ra~P!=[OR#zO!Q#yO!S#{O!l#xO(aVOP!ta[!taj!tar!ta!]!ta!p!ta#R!ta#n!ta#o!ta#p!ta#q!ta#r!ta#s!ta#t!ta#u!ta#v!ta#x!ta#z!ta#{!ta(r!ta(y!ta(z!ta~Oa!ta'z!ta'w!ta!Y!ta!k!tav!ta!_!ta%i!ta!g!ta~P!?rOh%VOn+gO!_'`O%i+fO~O!g+iOa(]X!_(]X'z(]X!](]X~Oa%nO!_XO'z%nO~Oh%VO!l%eO~Oh%VO!l%eO(T%gO~O!g#vO#k(xO~Ob+tO%j+uO(T+qO(VTO(YUO!^)XP~O!]+vO`)WX~O[+zO~O`+{O~O!_&PO(T%gO(U!lO`)WP~O%j,OO~P;SOh%VO#`,SO~Oh%VOn,VO!_$|O~O!_,XO~O!Q,ZO!_XO~O%n%vO~O!x,`O~Oe,eO~Ob,fO(T#nO(VTO(YUO!^)VP~Oe%}O~O%j!QO(T&ZO~P=gO[,kO`,jO~OPYOQYOSfOdzOeyOpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!iuO!lZO!oYO!pYO!qYO!svO!xxO!|]O$niO%h}O(VTO(YUO(aVO(o[O~O!_!eO!u!gO$W!kO(T!dO~P!FyO`,jOa%nO'z%nO~OPYOQYOSfOd!jOe!iOpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_!eO!iuO!lZO!oYO!pYO!qYO!svO!x!hO$W!kO$niO(T!dO(VTO(YUO(aVO(o[O~Oa,pOl!OO!uwO%l!OO%m!OO%n!OO~P!IcO!l&oO~O&^,vO~O!_,xO~O&o,zO&q,{OP&laQ&laS&laY&laa&lad&lae&lal&lap&lar&las&lat&laz&la|&la!O&la!S&la!W&la!X&la!_&la!i&la!l&la!o&la!p&la!q&la!s&la!u&la!x&la!|&la$W&la$n&la%h&la%j&la%l&la%m&la%n&la%q&la%s&la%v&la%w&la%y&la&W&la&^&la&`&la&b&la&d&la&g&la&m&la&s&la&u&la&w&la&y&la&{&la'w&la(T&la(V&la(Y&la(a&la(o&la!^&la&e&lab&la&j&la~O(T-QO~Oh!eX!]!RX!^!RX!g!RX!g!eX!l!eX#`!RX~O!]!eX!^!eX~P#!iO!g-VO#`-UOh(jX!]#hX!^#hX!g(jX!l(jX~O!](jX!^(jX~P##[Oh%VO!g-XO!l%eO!]!aX!^!aX~Os!nO!S!oO(VTO(YUO(e!mO~OP<UOQ<UOSfOd>ROe!iOpkOr<UOskOtkOzkO|<UO!O<UO!SWO!WkO!XkO!_!eO!i<XO!lZO!o<UO!p<UO!q<UO!s<YO!u<]O!x!hO$W!kO$n>PO(VTO(YUO(aVO(o[O~O(T=QO~P#$qO!]-]O!^(iX~O!^-_O~O!g-VO#`-UO!]#hX!^#hX~O!]-`O!^(xX~O!^-bO~O!c-cO!d-cO(U!lO~P#$`O!^-fO~P'_On-iO!_'`O~O!Y-nO~Os!{a!b!{a!c!{a!d!{a#T!{a#U!{a#V!{a#W!{a#X!{a#[!{a#]!{a(U!{a(V!{a(Y!{a(e!{a(o!{a~P!#vO!p-sO#`-qO~PChO!c-uO!d-uO(U!lO~PDWOa%nO#`-qO'z%nO~Oa%nO!g#vO#`-qO'z%nO~Oa%nO!g#vO!p-sO#`-qO'z%nO(r'pO~O(P'xO(Q'xO(R-zO~Ov-{O~O!Y'Wa!]'Wa~P!:tO![.PO!Y'WX!]'WX~P%[O!](VO!Y(ha~O!Y(ha~PHRO!](^O!Y(va~O!S%hO![.TO!_%iO(T%gO!Y'^X!]'^X~O#`.VO!](ta!k(taa(ta'z(ta~O!g#vO~P#,wO!](jO!k(sa~O!S%hO!_%iO#j.ZO(T%gO~Op.`O!S%hO![.]O!_%iO!|]O#i._O#j.]O(T%gO!]'aX!k'aX~OR.dO!l#xO~Oh%VOn.gO!_'`O%i.fO~Oa#ci!]#ci'z#ci'w#ci!Y#ci!k#civ#ci!_#ci%i#ci!g#ci~P!:tOn>]O!Q*OO'y*PO(y$}O(z%PO~O#k#_aa#_a#`#_a'z#_a!]#_a!k#_a!_#_a!Y#_a~P#/sO#k(`XP(`XR(`X[(`Xa(`Xj(`Xr(`X!S(`X!l(`X!p(`X#R(`X#n(`X#o(`X#p(`X#q(`X#r(`X#s(`X#t(`X#u(`X#v(`X#x(`X#z(`X#{(`X'z(`X(a(`X(r(`X!k(`X!Y(`X'w(`Xv(`X!_(`X%i(`X!g(`X~P!6kO!].tO!k(kX~P!:tO!k.wO~O!Y.yO~OP$[OR#zO!Q#yO!S#{O!l#xO!p$[O(aVO[#mia#mij#mir#mi!]#mi#R#mi#o#mi#p#mi#q#mi#r#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi'z#mi(r#mi(y#mi(z#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~O#n#mi~P#3cO#n$OO~P#3cOP$[OR#zOr$aO!Q#yO!S#{O!l#xO!p$[O#n$OO#o$PO#p$PO#q$PO(aVO[#mia#mij#mi!]#mi#R#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi'z#mi(r#mi(y#mi(z#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~O#r#mi~P#6QO#r$QO~P#6QOP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO(aVOa#mi!]#mi#x#mi#z#mi#{#mi'z#mi(r#mi(y#mi(z#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~O#v#mi~P#8oOP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO#v$SO(aVO(z#}Oa#mi!]#mi#z#mi#{#mi'z#mi(r#mi(y#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~O#x$UO~P#;VO#x#mi~P#;VO#v$SO~P#8oOP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO#v$SO#x$UO(aVO(y#|O(z#}Oa#mi!]#mi#{#mi'z#mi(r#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~O#z#mi~P#={O#z$WO~P#={OP]XR]X[]Xj]Xr]X!Q]X!S]X!l]X!p]X#R]X#S]X#`]X#kfX#n]X#o]X#p]X#q]X#r]X#s]X#t]X#u]X#v]X#x]X#z]X#{]X$Q]X(a]X(r]X(y]X(z]X!]]X!^]X~O$O]X~P#@jOP$[OR#zO[<mOj<bOr<kO!Q#yO!S#{O!l#xO!p$[O#R<bO#n<_O#o<`O#p<`O#q<`O#r<aO#s<bO#t<bO#u<lO#v<cO#x<eO#z<gO#{<hO(aVO(r$YO(y#|O(z#}O~O$O.{O~P#BwO#S$dO#`<nO$Q<nO$O(gX!^(gX~P! uOa'da!]'da'z'da'w'da!k'da!Y'dav'da!_'da%i'da!g'da~P!:tO[#mia#mij#mir#mi!]#mi#R#mi#r#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi'z#mi(r#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~OP$[OR#zO!Q#yO!S#{O!l#xO!p$[O#n$OO#o$PO#p$PO#q$PO(aVO(y#mi(z#mi~P#EyOn>]O!Q*OO'y*PO(y$}O(z%POP#miR#mi!S#mi!l#mi!p#mi#n#mi#o#mi#p#mi#q#mi(a#mi~P#EyO!]/POg(pX~P!1WOg/RO~Oa$Pi!]$Pi'z$Pi'w$Pi!Y$Pi!k$Piv$Pi!_$Pi%i$Pi!g$Pi~P!:tO$]/SO$_/SO~O$]/TO$_/TO~O!g)hO#`/UO!_$cX$Z$cX$]$cX$_$cX$f$cX~O![/VO~O!_)kO$Z/XO$])jO$_)jO$f/YO~O!]<iO!^(fX~P#BwO!^/ZO~O!g)hO$f({X~O$f/]O~Ov/^O~P!&zOx)yO(b)zO(c/aO~O!S/dO~O(y$}On%aa!Q%aa'y%aa(z%aa!]%aa#`%aa~Og%aa$O%aa~P#L{O(z%POn%ca!Q%ca'y%ca(y%ca!]%ca#`%ca~Og%ca$O%ca~P#MnO!]fX!gfX!kfX!k$zX(rfX~P!0SOp%WO![/mO!](^O(T/lO!Y(vP!Y)PP~P!1uOr*sO!b*qO!c*kO!d*kO!l*bO#[*rO%`*mO(U!lO(VTO(YUO~Os<}O!S/nO![+[O!^*pO(e<|O!^(xP~P$ [O!k/oO~P#/sO!]/pO!g#vO(r'pO!k)OX~O!k/uO~OnoX!QoX'yoX(yoX(zoX~O!g#vO!koX~P$#OOp/wO!S%hO![*^O!_%iO(T%gO!k)OP~O#k/xO~O!Y$zX!]$zX!g%RX~P!0SO!]/yO!Y)PX~P#/sO!g/{O~O!Y/}O~OpkO(T0OO~P.iOh%VOr0TO!g#vO!l%eO(r'pO~O!g+iO~Oa%nO!]0XO'z%nO~O!^0ZO~P!5iO!c0[O!d0[O(U!lO~P#$`Os!nO!S0]O(VTO(YUO(e!mO~O#[0_O~Og%aa!]%aa#`%aa$O%aa~P!1WOg%ca!]%ca#`%ca$O%ca~P!1WOj%dOk%dOl%dO(T&ZOg'mX!]'mX~O!]*yOg(^a~Og0hO~On0jO#`0iOg(_a!](_a~OR0kO!Q0kO!S0lO#S$dOn}a'y}a(y}a(z}a!]}a#`}a~Og}a$O}a~P$(cO!Q*OO'y*POn$sa(y$sa(z$sa!]$sa#`$sa~Og$sa$O$sa~P$)_O!Q*OO'y*POn$ua(y$ua(z$ua!]$ua#`$ua~Og$ua$O$ua~P$*QO#k0oO~Og%Ta!]%Ta#`%Ta$O%Ta~P!1WO!g#vO~O#k0rO~O!]+^Oa)Ta'z)Ta~OR#zO!Q#yO!S#{O!l#xO(aVOP!ri[!rij!rir!ri!]!ri!p!ri#R!ri#n!ri#o!ri#p!ri#q!ri#r!ri#s!ri#t!ri#u!ri#v!ri#x!ri#z!ri#{!ri(r!ri(y!ri(z!ri~Oa!ri'z!ri'w!ri!Y!ri!k!riv!ri!_!ri%i!ri!g!ri~P$+oOh%VOr%XOs$tOt$tOz%YO|%ZO!O<sO!S${O!_$|O!i>VO!l$xO#j<yO$W%`O$t<uO$v<wO$y%aO(VTO(YUO(a$uO(y$}O(z%PO~Op0{O%]0|O(T0zO~P$.VO!g+iOa(]a!_(]a'z(]a!](]a~O#k1SO~O[]X!]fX!^fX~O!]1TO!^)XX~O!^1VO~O[1WO~Ob1YO(T+qO(VTO(YUO~O!_&PO(T%gO`'uX!]'uX~O!]+vO`)Wa~O!k1]O~P!:tO[1`O~O`1aO~O#`1fO~On1iO!_$|O~O(e(|O!^)UP~Oh%VOn1rO!_1oO%i1qO~O[1|O!]1zO!^)VX~O!^1}O~O`2POa%nO'z%nO~O(T#nO(VTO(YUO~O#S$dO#`$eO$Q$eOP(gXR(gX[(gXr(gX!Q(gX!S(gX!](gX!l(gX!p(gX#R(gX#n(gX#o(gX#p(gX#q(gX#r(gX#s(gX#t(gX#u(gX#v(gX#x(gX#z(gX#{(gX(a(gX(r(gX(y(gX(z(gX~Oj2SO&[2TOa(gX~P$3pOj2SO#`$eO&[2TO~Oa2VO~P%[Oa2XO~O&e2[OP&ciQ&ciS&ciY&cia&cid&cie&cil&cip&cir&cis&cit&ciz&ci|&ci!O&ci!S&ci!W&ci!X&ci!_&ci!i&ci!l&ci!o&ci!p&ci!q&ci!s&ci!u&ci!x&ci!|&ci$W&ci$n&ci%h&ci%j&ci%l&ci%m&ci%n&ci%q&ci%s&ci%v&ci%w&ci%y&ci&W&ci&^&ci&`&ci&b&ci&d&ci&g&ci&m&ci&s&ci&u&ci&w&ci&y&ci&{&ci'w&ci(T&ci(V&ci(Y&ci(a&ci(o&ci!^&cib&ci&j&ci~Ob2bO!^2`O&j2aO~P`O!_XO!l2dO~O&q,{OP&liQ&liS&liY&lia&lid&lie&lil&lip&lir&lis&lit&liz&li|&li!O&li!S&li!W&li!X&li!_&li!i&li!l&li!o&li!p&li!q&li!s&li!u&li!x&li!|&li$W&li$n&li%h&li%j&li%l&li%m&li%n&li%q&li%s&li%v&li%w&li%y&li&W&li&^&li&`&li&b&li&d&li&g&li&m&li&s&li&u&li&w&li&y&li&{&li'w&li(T&li(V&li(Y&li(a&li(o&li!^&li&e&lib&li&j&li~O!Y2jO~O!]!aa!^!aa~P#BwOs!nO!S!oO![2pO(e!mO!]'XX!^'XX~P@nO!]-]O!^(ia~O!]'_X!^'_X~P!9|O!]-`O!^(xa~O!^2wO~P'_Oa%nO#`3QO'z%nO~Oa%nO!g#vO#`3QO'z%nO~Oa%nO!g#vO!p3UO#`3QO'z%nO(r'pO~Oa%nO'z%nO~P!:tO!]$_Ov$qa~O!Y'Wi!]'Wi~P!:tO!](VO!Y(hi~O!](^O!Y(vi~O!Y(wi!](wi~P!:tO!](ti!k(tia(ti'z(ti~P!:tO#`3WO!](ti!k(tia(ti'z(ti~O!](jO!k(si~O!S%hO!_%iO!|]O#i3]O#j3[O(T%gO~O!S%hO!_%iO#j3[O(T%gO~On3dO!_'`O%i3cO~Oh%VOn3dO!_'`O%i3cO~O#k%aaP%aaR%aa[%aaa%aaj%aar%aa!S%aa!l%aa!p%aa#R%aa#n%aa#o%aa#p%aa#q%aa#r%aa#s%aa#t%aa#u%aa#v%aa#x%aa#z%aa#{%aa'z%aa(a%aa(r%aa!k%aa!Y%aa'w%aav%aa!_%aa%i%aa!g%aa~P#L{O#k%caP%caR%ca[%caa%caj%car%ca!S%ca!l%ca!p%ca#R%ca#n%ca#o%ca#p%ca#q%ca#r%ca#s%ca#t%ca#u%ca#v%ca#x%ca#z%ca#{%ca'z%ca(a%ca(r%ca!k%ca!Y%ca'w%cav%ca!_%ca%i%ca!g%ca~P#MnO#k%aaP%aaR%aa[%aaa%aaj%aar%aa!S%aa!]%aa!l%aa!p%aa#R%aa#n%aa#o%aa#p%aa#q%aa#r%aa#s%aa#t%aa#u%aa#v%aa#x%aa#z%aa#{%aa'z%aa(a%aa(r%aa!k%aa!Y%aa'w%aa#`%aav%aa!_%aa%i%aa!g%aa~P#/sO#k%caP%caR%ca[%caa%caj%car%ca!S%ca!]%ca!l%ca!p%ca#R%ca#n%ca#o%ca#p%ca#q%ca#r%ca#s%ca#t%ca#u%ca#v%ca#x%ca#z%ca#{%ca'z%ca(a%ca(r%ca!k%ca!Y%ca'w%ca#`%cav%ca!_%ca%i%ca!g%ca~P#/sO#k}aP}a[}aa}aj}ar}a!l}a!p}a#R}a#n}a#o}a#p}a#q}a#r}a#s}a#t}a#u}a#v}a#x}a#z}a#{}a'z}a(a}a(r}a!k}a!Y}a'w}av}a!_}a%i}a!g}a~P$(cO#k$saP$saR$sa[$saa$saj$sar$sa!S$sa!l$sa!p$sa#R$sa#n$sa#o$sa#p$sa#q$sa#r$sa#s$sa#t$sa#u$sa#v$sa#x$sa#z$sa#{$sa'z$sa(a$sa(r$sa!k$sa!Y$sa'w$sav$sa!_$sa%i$sa!g$sa~P$)_O#k$uaP$uaR$ua[$uaa$uaj$uar$ua!S$ua!l$ua!p$ua#R$ua#n$ua#o$ua#p$ua#q$ua#r$ua#s$ua#t$ua#u$ua#v$ua#x$ua#z$ua#{$ua'z$ua(a$ua(r$ua!k$ua!Y$ua'w$uav$ua!_$ua%i$ua!g$ua~P$*QO#k%TaP%TaR%Ta[%Taa%Taj%Tar%Ta!S%Ta!]%Ta!l%Ta!p%Ta#R%Ta#n%Ta#o%Ta#p%Ta#q%Ta#r%Ta#s%Ta#t%Ta#u%Ta#v%Ta#x%Ta#z%Ta#{%Ta'z%Ta(a%Ta(r%Ta!k%Ta!Y%Ta'w%Ta#`%Tav%Ta!_%Ta%i%Ta!g%Ta~P#/sOa#cq!]#cq'z#cq'w#cq!Y#cq!k#cqv#cq!_#cq%i#cq!g#cq~P!:tO![3lO!]'YX!k'YX~P%[O!].tO!k(ka~O!].tO!k(ka~P!:tO!Y3oO~O$O!na!^!na~PKlO$O!ja!]!ja!^!ja~P#BwO$O!ra!^!ra~P!=[O$O!ta!^!ta~P!?rOg']X!]']X~P!,TO!]/POg(pa~OSfO!_4TO$d4UO~O!^4YO~Ov4ZO~P#/sOa$mq!]$mq'z$mq'w$mq!Y$mq!k$mqv$mq!_$mq%i$mq!g$mq~P!:tO!Y4]O~P!&zO!S4^O~O!Q*OO'y*PO(z%POn'ia(y'ia!]'ia#`'ia~Og'ia$O'ia~P%-fO!Q*OO'y*POn'ka(y'ka(z'ka!]'ka#`'ka~Og'ka$O'ka~P%.XO(r$YO~P#/sO!YfX!Y$zX!]fX!]$zX!g%RX#`fX~P!0SOp%WO(T=WO~P!1uOp4bO!S%hO![4aO!_%iO(T%gO!]'eX!k'eX~O!]/pO!k)Oa~O!]/pO!g#vO!k)Oa~O!]/pO!g#vO(r'pO!k)Oa~Og$|i!]$|i#`$|i$O$|i~P!1WO![4jO!Y'gX!]'gX~P!3tO!]/yO!Y)Pa~O!]/yO!Y)Pa~P#/sOP]XR]X[]Xj]Xr]X!Q]X!S]X!Y]X!]]X!l]X!p]X#R]X#S]X#`]X#kfX#n]X#o]X#p]X#q]X#r]X#s]X#t]X#u]X#v]X#x]X#z]X#{]X$Q]X(a]X(r]X(y]X(z]X~Oj%YX!g%YX~P%2OOj4oO!g#vO~Oh%VO!g#vO!l%eO~Oh%VOr4tO!l%eO(r'pO~Or4yO!g#vO(r'pO~Os!nO!S4zO(VTO(YUO(e!mO~O(y$}On%ai!Q%ai'y%ai(z%ai!]%ai#`%ai~Og%ai$O%ai~P%5oO(z%POn%ci!Q%ci'y%ci(y%ci!]%ci#`%ci~Og%ci$O%ci~P%6bOg(_i!](_i~P!1WO#`5QOg(_i!](_i~P!1WO!k5VO~Oa$oq!]$oq'z$oq'w$oq!Y$oq!k$oqv$oq!_$oq%i$oq!g$oq~P!:tO!Y5ZO~O!]5[O!_)QX~P#/sOa$zX!_$zX%^]X'z$zX!]$zX~P!0SO%^5_OaoX!_oX'zoX!]oX~P$#OOp5`O(T#nO~O%^5_O~Ob5fO%j5gO(T+qO(VTO(YUO!]'tX!^'tX~O!]1TO!^)Xa~O[5kO~O`5lO~O[5pO~Oa%nO'z%nO~P#/sO!]5uO#`5wO!^)UX~O!^5xO~Or6OOs!nO!S*iO!b!yO!c!vO!d!vO!|<VO#T!pO#U!pO#V!pO#W!pO#X!pO#[5}O#]!zO(U!lO(VTO(YUO(e!mO(o!sO~O!^5|O~P%;eOn6TO!_1oO%i6SO~Oh%VOn6TO!_1oO%i6SO~Ob6[O(T#nO(VTO(YUO!]'sX!^'sX~O!]1zO!^)Va~O(VTO(YUO(e6^O~O`6bO~Oj6eO&[6fO~PNXO!k6gO~P%[Oa6iO~Oa6iO~P%[Ob2bO!^6nO&j2aO~P`O!g6pO~O!g6rOh(ji!](ji!^(ji!g(ji!l(jir(ji(r(ji~O!]#hi!^#hi~P#BwO#`6sO!]#hi!^#hi~O!]!ai!^!ai~P#BwOa%nO#`6|O'z%nO~Oa%nO!g#vO#`6|O'z%nO~O!](tq!k(tqa(tq'z(tq~P!:tO!](jO!k(sq~O!S%hO!_%iO#j7TO(T%gO~O!_'`O%i7WO~On7[O!_'`O%i7WO~O#k'iaP'iaR'ia['iaa'iaj'iar'ia!S'ia!l'ia!p'ia#R'ia#n'ia#o'ia#p'ia#q'ia#r'ia#s'ia#t'ia#u'ia#v'ia#x'ia#z'ia#{'ia'z'ia(a'ia(r'ia!k'ia!Y'ia'w'iav'ia!_'ia%i'ia!g'ia~P%-fO#k'kaP'kaR'ka['kaa'kaj'kar'ka!S'ka!l'ka!p'ka#R'ka#n'ka#o'ka#p'ka#q'ka#r'ka#s'ka#t'ka#u'ka#v'ka#x'ka#z'ka#{'ka'z'ka(a'ka(r'ka!k'ka!Y'ka'w'kav'ka!_'ka%i'ka!g'ka~P%.XO#k$|iP$|iR$|i[$|ia$|ij$|ir$|i!S$|i!]$|i!l$|i!p$|i#R$|i#n$|i#o$|i#p$|i#q$|i#r$|i#s$|i#t$|i#u$|i#v$|i#x$|i#z$|i#{$|i'z$|i(a$|i(r$|i!k$|i!Y$|i'w$|i#`$|iv$|i!_$|i%i$|i!g$|i~P#/sO#k%aiP%aiR%ai[%aia%aij%air%ai!S%ai!l%ai!p%ai#R%ai#n%ai#o%ai#p%ai#q%ai#r%ai#s%ai#t%ai#u%ai#v%ai#x%ai#z%ai#{%ai'z%ai(a%ai(r%ai!k%ai!Y%ai'w%aiv%ai!_%ai%i%ai!g%ai~P%5oO#k%ciP%ciR%ci[%cia%cij%cir%ci!S%ci!l%ci!p%ci#R%ci#n%ci#o%ci#p%ci#q%ci#r%ci#s%ci#t%ci#u%ci#v%ci#x%ci#z%ci#{%ci'z%ci(a%ci(r%ci!k%ci!Y%ci'w%civ%ci!_%ci%i%ci!g%ci~P%6bO!]'Ya!k'Ya~P!:tO!].tO!k(ki~O$O#ci!]#ci!^#ci~P#BwOP$[OR#zO!Q#yO!S#{O!l#xO!p$[O(aVO[#mij#mir#mi#R#mi#o#mi#p#mi#q#mi#r#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi$O#mi(r#mi(y#mi(z#mi!]#mi!^#mi~O#n#mi~P%NdO#n<_O~P%NdOP$[OR#zOr<kO!Q#yO!S#{O!l#xO!p$[O#n<_O#o<`O#p<`O#q<`O(aVO[#mij#mi#R#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi$O#mi(r#mi(y#mi(z#mi!]#mi!^#mi~O#r#mi~P&!lO#r<aO~P&!lOP$[OR#zO[<mOj<bOr<kO!Q#yO!S#{O!l#xO!p$[O#R<bO#n<_O#o<`O#p<`O#q<`O#r<aO#s<bO#t<bO#u<lO(aVO#x#mi#z#mi#{#mi$O#mi(r#mi(y#mi(z#mi!]#mi!^#mi~O#v#mi~P&$tOP$[OR#zO[<mOj<bOr<kO!Q#yO!S#{O!l#xO!p$[O#R<bO#n<_O#o<`O#p<`O#q<`O#r<aO#s<bO#t<bO#u<lO#v<cO(aVO(z#}O#z#mi#{#mi$O#mi(r#mi(y#mi!]#mi!^#mi~O#x<eO~P&&uO#x#mi~P&&uO#v<cO~P&$tOP$[OR#zO[<mOj<bOr<kO!Q#yO!S#{O!l#xO!p$[O#R<bO#n<_O#o<`O#p<`O#q<`O#r<aO#s<bO#t<bO#u<lO#v<cO#x<eO(aVO(y#|O(z#}O#{#mi$O#mi(r#mi!]#mi!^#mi~O#z#mi~P&)UO#z<gO~P&)UOa#|y!]#|y'z#|y'w#|y!Y#|y!k#|yv#|y!_#|y%i#|y!g#|y~P!:tO[#mij#mir#mi#R#mi#r#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi$O#mi(r#mi!]#mi!^#mi~OP$[OR#zO!Q#yO!S#{O!l#xO!p$[O#n<_O#o<`O#p<`O#q<`O(aVO(y#mi(z#mi~P&,QOn>^O!Q*OO'y*PO(y$}O(z%POP#miR#mi!S#mi!l#mi!p#mi#n#mi#o#mi#p#mi#q#mi(a#mi~P&,QO#S$dOP(`XR(`X[(`Xj(`Xn(`Xr(`X!Q(`X!S(`X!l(`X!p(`X#R(`X#n(`X#o(`X#p(`X#q(`X#r(`X#s(`X#t(`X#u(`X#v(`X#x(`X#z(`X#{(`X$O(`X'y(`X(a(`X(r(`X(y(`X(z(`X!](`X!^(`X~O$O$Pi!]$Pi!^$Pi~P#BwO$O!ri!^!ri~P$+oOg']a!]']a~P!1WO!^7nO~O!]'da!^'da~P#BwO!Y7oO~P#/sO!g#vO(r'pO!]'ea!k'ea~O!]/pO!k)Oi~O!]/pO!g#vO!k)Oi~Og$|q!]$|q#`$|q$O$|q~P!1WO!Y'ga!]'ga~P#/sO!g7vO~O!]/yO!Y)Pi~P#/sO!]/yO!Y)Pi~O!Y7yO~Oh%VOr8OO!l%eO(r'pO~Oj8QO!g#vO~Or8TO!g#vO(r'pO~O!Q*OO'y*PO(z%POn'ja(y'ja!]'ja#`'ja~Og'ja$O'ja~P&5RO!Q*OO'y*POn'la(y'la(z'la!]'la#`'la~Og'la$O'la~P&5tOg(_q!](_q~P!1WO#`8VOg(_q!](_q~P!1WO!Y8WO~Og%Oq!]%Oq#`%Oq$O%Oq~P!1WOa$oy!]$oy'z$oy'w$oy!Y$oy!k$oyv$oy!_$oy%i$oy!g$oy~P!:tO!g6rO~O!]5[O!_)Qa~O!_'`OP$TaR$Ta[$Taj$Tar$Ta!Q$Ta!S$Ta!]$Ta!l$Ta!p$Ta#R$Ta#n$Ta#o$Ta#p$Ta#q$Ta#r$Ta#s$Ta#t$Ta#u$Ta#v$Ta#x$Ta#z$Ta#{$Ta(a$Ta(r$Ta(y$Ta(z$Ta~O%i7WO~P&8fO%^8[Oa%[i!_%[i'z%[i!]%[i~Oa#cy!]#cy'z#cy'w#cy!Y#cy!k#cyv#cy!_#cy%i#cy!g#cy~P!:tO[8^O~Ob8`O(T+qO(VTO(YUO~O!]1TO!^)Xi~O`8dO~O(e(|O!]'pX!^'pX~O!]5uO!^)Ua~O!^8nO~P%;eO(o!sO~P$&YO#[8oO~O!_1oO~O!_1oO%i8qO~On8tO!_1oO%i8qO~O[8yO!]'sa!^'sa~O!]1zO!^)Vi~O!k8}O~O!k9OO~O!k9RO~O!k9RO~P%[Oa9TO~O!g9UO~O!k9VO~O!](wi!^(wi~P#BwOa%nO#`9_O'z%nO~O!](ty!k(tya(ty'z(ty~P!:tO!](jO!k(sy~O%i9bO~P&8fO!_'`O%i9bO~O#k$|qP$|qR$|q[$|qa$|qj$|qr$|q!S$|q!]$|q!l$|q!p$|q#R$|q#n$|q#o$|q#p$|q#q$|q#r$|q#s$|q#t$|q#u$|q#v$|q#x$|q#z$|q#{$|q'z$|q(a$|q(r$|q!k$|q!Y$|q'w$|q#`$|qv$|q!_$|q%i$|q!g$|q~P#/sO#k'jaP'jaR'ja['jaa'jaj'jar'ja!S'ja!l'ja!p'ja#R'ja#n'ja#o'ja#p'ja#q'ja#r'ja#s'ja#t'ja#u'ja#v'ja#x'ja#z'ja#{'ja'z'ja(a'ja(r'ja!k'ja!Y'ja'w'jav'ja!_'ja%i'ja!g'ja~P&5RO#k'laP'laR'la['laa'laj'lar'la!S'la!l'la!p'la#R'la#n'la#o'la#p'la#q'la#r'la#s'la#t'la#u'la#v'la#x'la#z'la#{'la'z'la(a'la(r'la!k'la!Y'la'w'lav'la!_'la%i'la!g'la~P&5tO#k%OqP%OqR%Oq[%Oqa%Oqj%Oqr%Oq!S%Oq!]%Oq!l%Oq!p%Oq#R%Oq#n%Oq#o%Oq#p%Oq#q%Oq#r%Oq#s%Oq#t%Oq#u%Oq#v%Oq#x%Oq#z%Oq#{%Oq'z%Oq(a%Oq(r%Oq!k%Oq!Y%Oq'w%Oq#`%Oqv%Oq!_%Oq%i%Oq!g%Oq~P#/sO!]'Yi!k'Yi~P!:tO$O#cq!]#cq!^#cq~P#BwO(y$}OP%aaR%aa[%aaj%aar%aa!S%aa!l%aa!p%aa#R%aa#n%aa#o%aa#p%aa#q%aa#r%aa#s%aa#t%aa#u%aa#v%aa#x%aa#z%aa#{%aa$O%aa(a%aa(r%aa!]%aa!^%aa~On%aa!Q%aa'y%aa(z%aa~P&IyO(z%POP%caR%ca[%caj%car%ca!S%ca!l%ca!p%ca#R%ca#n%ca#o%ca#p%ca#q%ca#r%ca#s%ca#t%ca#u%ca#v%ca#x%ca#z%ca#{%ca$O%ca(a%ca(r%ca!]%ca!^%ca~On%ca!Q%ca'y%ca(y%ca~P&LQOn>^O!Q*OO'y*PO(z%PO~P&IyOn>^O!Q*OO'y*PO(y$}O~P&LQOR0kO!Q0kO!S0lO#S$dOP}a[}aj}an}ar}a!l}a!p}a#R}a#n}a#o}a#p}a#q}a#r}a#s}a#t}a#u}a#v}a#x}a#z}a#{}a$O}a'y}a(a}a(r}a(y}a(z}a!]}a!^}a~O!Q*OO'y*POP$saR$sa[$saj$san$sar$sa!S$sa!l$sa!p$sa#R$sa#n$sa#o$sa#p$sa#q$sa#r$sa#s$sa#t$sa#u$sa#v$sa#x$sa#z$sa#{$sa$O$sa(a$sa(r$sa(y$sa(z$sa!]$sa!^$sa~O!Q*OO'y*POP$uaR$ua[$uaj$uan$uar$ua!S$ua!l$ua!p$ua#R$ua#n$ua#o$ua#p$ua#q$ua#r$ua#s$ua#t$ua#u$ua#v$ua#x$ua#z$ua#{$ua$O$ua(a$ua(r$ua(y$ua(z$ua!]$ua!^$ua~On>^O!Q*OO'y*PO(y$}O(z%PO~OP%TaR%Ta[%Taj%Tar%Ta!S%Ta!l%Ta!p%Ta#R%Ta#n%Ta#o%Ta#p%Ta#q%Ta#r%Ta#s%Ta#t%Ta#u%Ta#v%Ta#x%Ta#z%Ta#{%Ta$O%Ta(a%Ta(r%Ta!]%Ta!^%Ta~P''VO$O$mq!]$mq!^$mq~P#BwO$O$oq!]$oq!^$oq~P#BwO!^9oO~O$O9pO~P!1WO!g#vO!]'ei!k'ei~O!g#vO(r'pO!]'ei!k'ei~O!]/pO!k)Oq~O!Y'gi!]'gi~P#/sO!]/yO!Y)Pq~Or9wO!g#vO(r'pO~O[9yO!Y9xO~P#/sO!Y9xO~Oj:PO!g#vO~Og(_y!](_y~P!1WO!]'na!_'na~P#/sOa%[q!_%[q'z%[q!]%[q~P#/sO[:UO~O!]1TO!^)Xq~O`:YO~O#`:ZO!]'pa!^'pa~O!]5uO!^)Ui~P#BwO!S:]O~O!_1oO%i:`O~O(VTO(YUO(e:eO~O!]1zO!^)Vq~O!k:hO~O!k:iO~O!k:jO~O!k:jO~P%[O#`:mO!]#hy!^#hy~O!]#hy!^#hy~P#BwO%i:rO~P&8fO!_'`O%i:rO~O$O#|y!]#|y!^#|y~P#BwOP$|iR$|i[$|ij$|ir$|i!S$|i!l$|i!p$|i#R$|i#n$|i#o$|i#p$|i#q$|i#r$|i#s$|i#t$|i#u$|i#v$|i#x$|i#z$|i#{$|i$O$|i(a$|i(r$|i!]$|i!^$|i~P''VO!Q*OO'y*PO(z%POP'iaR'ia['iaj'ian'iar'ia!S'ia!l'ia!p'ia#R'ia#n'ia#o'ia#p'ia#q'ia#r'ia#s'ia#t'ia#u'ia#v'ia#x'ia#z'ia#{'ia$O'ia(a'ia(r'ia(y'ia!]'ia!^'ia~O!Q*OO'y*POP'kaR'ka['kaj'kan'kar'ka!S'ka!l'ka!p'ka#R'ka#n'ka#o'ka#p'ka#q'ka#r'ka#s'ka#t'ka#u'ka#v'ka#x'ka#z'ka#{'ka$O'ka(a'ka(r'ka(y'ka(z'ka!]'ka!^'ka~O(y$}OP%aiR%ai[%aij%ain%air%ai!Q%ai!S%ai!l%ai!p%ai#R%ai#n%ai#o%ai#p%ai#q%ai#r%ai#s%ai#t%ai#u%ai#v%ai#x%ai#z%ai#{%ai$O%ai'y%ai(a%ai(r%ai(z%ai!]%ai!^%ai~O(z%POP%ciR%ci[%cij%cin%cir%ci!Q%ci!S%ci!l%ci!p%ci#R%ci#n%ci#o%ci#p%ci#q%ci#r%ci#s%ci#t%ci#u%ci#v%ci#x%ci#z%ci#{%ci$O%ci'y%ci(a%ci(r%ci(y%ci!]%ci!^%ci~O$O$oy!]$oy!^$oy~P#BwO$O#cy!]#cy!^#cy~P#BwO!g#vO!]'eq!k'eq~O!]/pO!k)Oy~O!Y'gq!]'gq~P#/sOr:|O!g#vO(r'pO~O[;QO!Y;PO~P#/sO!Y;PO~Og(_!R!](_!R~P!1WOa%[y!_%[y'z%[y!]%[y~P#/sO!]1TO!^)Xy~O!]5uO!^)Uq~O(T;XO~O!_1oO%i;[O~O!k;_O~O%i;dO~P&8fOP$|qR$|q[$|qj$|qr$|q!S$|q!l$|q!p$|q#R$|q#n$|q#o$|q#p$|q#q$|q#r$|q#s$|q#t$|q#u$|q#v$|q#x$|q#z$|q#{$|q$O$|q(a$|q(r$|q!]$|q!^$|q~P''VO!Q*OO'y*PO(z%POP'jaR'ja['jaj'jan'jar'ja!S'ja!l'ja!p'ja#R'ja#n'ja#o'ja#p'ja#q'ja#r'ja#s'ja#t'ja#u'ja#v'ja#x'ja#z'ja#{'ja$O'ja(a'ja(r'ja(y'ja!]'ja!^'ja~O!Q*OO'y*POP'laR'la['laj'lan'lar'la!S'la!l'la!p'la#R'la#n'la#o'la#p'la#q'la#r'la#s'la#t'la#u'la#v'la#x'la#z'la#{'la$O'la(a'la(r'la(y'la(z'la!]'la!^'la~OP%OqR%Oq[%Oqj%Oqr%Oq!S%Oq!l%Oq!p%Oq#R%Oq#n%Oq#o%Oq#p%Oq#q%Oq#r%Oq#s%Oq#t%Oq#u%Oq#v%Oq#x%Oq#z%Oq#{%Oq$O%Oq(a%Oq(r%Oq!]%Oq!^%Oq~P''VOg%e!Z!]%e!Z#`%e!Z$O%e!Z~P!1WO!Y;hO~P#/sOr;iO!g#vO(r'pO~O[;kO!Y;hO~P#/sO!]'pq!^'pq~P#BwO!]#h!Z!^#h!Z~P#BwO#k%e!ZP%e!ZR%e!Z[%e!Za%e!Zj%e!Zr%e!Z!S%e!Z!]%e!Z!l%e!Z!p%e!Z#R%e!Z#n%e!Z#o%e!Z#p%e!Z#q%e!Z#r%e!Z#s%e!Z#t%e!Z#u%e!Z#v%e!Z#x%e!Z#z%e!Z#{%e!Z'z%e!Z(a%e!Z(r%e!Z!k%e!Z!Y%e!Z'w%e!Z#`%e!Zv%e!Z!_%e!Z%i%e!Z!g%e!Z~P#/sOr;tO!g#vO(r'pO~O!Y;uO~P#/sOr;|O!g#vO(r'pO~O!Y;}O~P#/sOP%e!ZR%e!Z[%e!Zj%e!Zr%e!Z!S%e!Z!l%e!Z!p%e!Z#R%e!Z#n%e!Z#o%e!Z#p%e!Z#q%e!Z#r%e!Z#s%e!Z#t%e!Z#u%e!Z#v%e!Z#x%e!Z#z%e!Z#{%e!Z$O%e!Z(a%e!Z(r%e!Z!]%e!Z!^%e!Z~P''VOr<QO!g#vO(r'pO~Ov(fX~P1qO!Q%rO~P!)[O(U!lO~P!)[O!YfX!]fX#`fX~P%2OOP]XR]X[]Xj]Xr]X!Q]X!S]X!]]X!]fX!l]X!p]X#R]X#S]X#`]X#`fX#kfX#n]X#o]X#p]X#q]X#r]X#s]X#t]X#u]X#v]X#x]X#z]X#{]X$Q]X(a]X(r]X(y]X(z]X~O!gfX!k]X!kfX(rfX~P'LTOP<UOQ<UOSfOd>ROe!iOpkOr<UOskOtkOzkO|<UO!O<UO!SWO!WkO!XkO!_XO!i<XO!lZO!o<UO!p<UO!q<UO!s<YO!u<]O!x!hO$W!kO$n>PO(T)]O(VTO(YUO(aVO(o[O~O!]<iO!^$qa~Oh%VOp%WOr%XOs$tOt$tOz%YO|%ZO!O<tO!S${O!_$|O!i>WO!l$xO#j<zO$W%`O$t<vO$v<xO$y%aO(T(vO(VTO(YUO(a$uO(y$}O(z%PO~Ol)dO~P(!yOr!eX(r!eX~P#!iOr(jX(r(jX~P##[O!^]X!^fX~P'LTO!YfX!Y$zX!]fX!]$zX#`fX~P!0SO#k<^O~O!g#vO#k<^O~O#`<nO~Oj<bO~O#`=OO!](wX!^(wX~O#`<nO!](uX!^(uX~O#k=PO~Og=RO~P!1WO#k=XO~O#k=YO~Og=RO(T&ZO~O!g#vO#k=ZO~O!g#vO#k=PO~O$O=[O~P#BwO#k=]O~O#k=^O~O#k=cO~O#k=dO~O#k=eO~O#k=fO~O$O=gO~P!1WO$O=hO~P!1WOl=sO~P7eOk#S#T#U#W#X#[#i#j#u$n$t$v$y%]%^%h%i%j%q%s%v%w%y%{~(OT#o!X'|(U#ps#n#qr!Q'}$]'}(T$_(e~",
    goto: "$9Y)]PPPPPP)^PP)aP)rP+W/]PPPP6mPP7TPP=QPPP@tPA^PA^PPPA^PCfPA^PA^PA^PCjPCoPD^PIWPPPI[PPPPI[L_PPPLeMVPI[PI[PP! eI[PPPI[PI[P!#lI[P!'S!(X!(bP!)U!)Y!)U!,gPPPPPPP!-W!(XPP!-h!/YP!2iI[I[!2n!5z!:h!:h!>gPPP!>oI[PPPPPPPPP!BOP!C]PPI[!DnPI[PI[I[I[I[I[PI[!FQP!I[P!LbP!Lf!Lp!Lt!LtP!IXP!Lx!LxP#!OP#!SI[PI[#!Y#%_CjA^PA^PA^A^P#&lA^A^#)OA^#+vA^#.SA^A^#.r#1W#1W#1]#1f#1W#1qPP#1WPA^#2ZA^#6YA^A^6mPPP#:_PPP#:x#:xP#:xP#;`#:xPP#;fP#;]P#;]#;y#;]#<e#<k#<n)aP#<q)aP#<z#<z#<zP)aP)aP)aP)aPP)aP#=Q#=TP#=T)aP#=XP#=[P)aP)aP)aP)aP)aP)a)aPP#=b#=h#=s#=y#>P#>V#>]#>k#>q#>{#?R#?]#?c#?s#?y#@k#@}#AT#AZ#Ai#BO#Cs#DR#DY#Et#FS#Gt#HS#HY#H`#Hf#Hp#Hv#H|#IW#Ij#IpPPPPPPPPPPP#IvPPPPPPP#Jk#Mx$ b$ i$ qPPP$']P$'f$*_$0x$0{$1O$1}$2Q$2X$2aP$2g$2jP$3W$3[$4S$5b$5g$5}PP$6S$6Y$6^$6a$6e$6i$7e$7|$8e$8i$8l$8o$8y$8|$9Q$9UR!|RoqOXst!Z#d%m&r&t&u&w,s,x2[2_Y!vQ'`-e1o5{Q%tvQ%|yQ&T|Q&j!VS'W!e-]Q'f!iS'l!r!yU*k$|*Z*oQ+o%}S+|&V&WQ,d&dQ-c'_Q-m'gQ-u'mQ0[*qQ1b,OQ1y,eR<{<Y%SdOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+],p,s,x-i-q.P.V.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3l4z6T6e6f6i6|8t9T9_S#q]<V!r)_$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SU+P%]<s<tQ+t&PQ,f&gQ,m&oQ0x+gQ0}+iQ1Y+uQ2R,kQ3`.gQ5`0|Q5f1TQ6[1zQ7Y3dQ8`5gR9e7['QkOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>S!S!nQ!r!v!y!z$|'W'_'`'l'm'n*k*o*q*r-]-c-e-u0[0_1o5{5}%[$ti#v$b$c$d$x${%O%Q%^%_%c)y*R*T*V*Y*a*g*w*x+f+i,S,V.f/P/d/m/x/y/{0`0b0i0j0o1f1i1q3c4^4_4j4o5Q5[5_6S7W7v8Q8V8[8q9b9p9y:P:`:r;Q;[;d;k<l<m<o<p<q<r<u<v<w<x<y<z=S=T=U=V=X=Y=]=^=_=`=a=b=c=d=g=h>P>X>Y>]>^Q&X|Q'U!eS'[%i-`Q+t&PQ,P&WQ,f&gQ0n+SQ1Y+uQ1_+{Q2Q,jQ2R,kQ5f1TQ5o1aQ6[1zQ6_1|Q6`2PQ8`5gQ8c5lQ8|6bQ:X8dQ:f8yQ;V:YR<}*ZrnOXst!V!Z#d%m&i&r&t&u&w,s,x2[2_R,h&k&z^OPXYstuvwz!Z!`!g!j!o#S#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'b'r(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>R>S[#]WZ#W#Z'X(T!b%jm#h#i#l$x%e%h(^(h(i(j*Y*^*b+Z+[+^,o-V.T.Z.[.]._/m/p2d3[3]4a6r7TQ%wxQ%{yW&Q|&V&W,OQ&_!TQ'c!hQ'e!iQ(q#sS+n%|%}Q+r&PQ,_&bQ,c&dS-l'f'gQ.i(rQ1R+oQ1X+uQ1Z+vQ1^+zQ1t,`S1x,d,eQ2|-mQ5e1TQ5i1WQ5n1`Q6Z1yQ8_5gQ8b5kQ8f5pQ:T8^R;T:U!U$zi$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>Y!^%yy!i!u%{%|%}'V'e'f'g'k'u*j+n+o-Y-l-m-t0R0U1R2u2|3T4r4s4v7}9{Q+h%wQ,T&[Q,W&]Q,b&dQ.h(qQ1s,_U1w,c,d,eQ3e.iQ6U1tS6Y1x1yQ8x6Z#f>T#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^o>U<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=hW%Ti%V*y>PS&[!Q&iQ&]!RQ&^!SU*}%[%d=sR,R&Y%]%Si#v$b$c$d$x${%O%Q%^%_%c)y*R*T*V*Y*a*g*w*x+f+i,S,V.f/P/d/m/x/y/{0`0b0i0j0o1f1i1q3c4^4_4j4o5Q5[5_6S7W7v8Q8V8[8q9b9p9y:P:`:r;Q;[;d;k<l<m<o<p<q<r<u<v<w<x<y<z=S=T=U=V=X=Y=]=^=_=`=a=b=c=d=g=h>P>X>Y>]>^T)z$u){V+P%]<s<tW'[!e%i*Z-`S(}#y#zQ+c%rQ+y&SS.b(m(nQ1j,XQ5T0kR8i5u'QkOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>S$i$^c#Y#e%q%s%u(S(Y(t(y)R)S)T)U)V)W)X)Y)Z)[)^)`)b)g)q+d+x-Z-x-}.S.U.s.v.z.|.}/O/b0p2k2n3O3V3k3p3q3r3s3t3u3v3w3x3y3z3{3|4P4Q4X5X5c6u6{7Q7a7b7k7l8k9X9]9g9m9n:o;W;`<W=vT#TV#U'RkOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SQ'Y!eR2q-]!W!nQ!e!r!v!y!z$|'W'_'`'l'm'n*Z*k*o*q*r-]-c-e-u0[0_1o5{5}R1l,ZnqOXst!Z#d%m&r&t&u&w,s,x2[2_Q&y!^Q'v!xS(s#u<^Q+l%zQ,]&_Q,^&aQ-j'dQ-w'oS.r(x=PS0q+X=ZQ1P+mQ1n,[Q2c,zQ2e,{Q2m-WQ2z-kQ2}-oS5Y0r=eQ5a1QS5d1S=fQ6t2oQ6x2{Q6}3SQ8]5bQ9Y6vQ9Z6yQ9^7OR:l9V$d$]c#Y#e%s%u(S(Y(t(y)R)S)T)U)V)W)X)Y)Z)[)^)`)b)g)q+d+x-Z-x-}.S.U.s.v.z.}/O/b0p2k2n3O3V3k3p3q3r3s3t3u3v3w3x3y3z3{3|4P4Q4X5X5c6u6{7Q7a7b7k7l8k9X9]9g9m9n:o;W;`<W=vS(o#p'iQ)P#zS+b%q.|S.c(n(pR3^.d'QkOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SS#q]<VQ&t!XQ&u!YQ&w![Q&x!]R2Z,vQ'a!hQ+e%wQ-h'cS.e(q+hQ2x-gW3b.h.i0w0yQ6w2yW7U3_3a3e5^U9a7V7X7ZU:q9c9d9fS;b:p:sQ;p;cR;x;qU!wQ'`-eT5y1o5{!Q_OXZ`st!V!Z#d#h%e%m&i&k&r&t&u&w(j,s,x.[2[2_]!pQ!r'`-e1o5{T#q]<V%^{OPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&o&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+]+g,p,s,x-i-q.P.V.g.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3d3l4z6T6e6f6i6|7[8t9T9_S(}#y#zS.b(m(n!s=l$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SU$fd)_,mS(p#p'iU*v%R(w4OU0m+O.n7gQ5^0xQ7V3`Q9d7YR:s9em!tQ!r!v!y!z'`'l'm'n-e-u1o5{5}Q't!uS(f#g2US-s'k'wQ/s*]Q0R*jQ3U-vQ4f/tQ4r0TQ4s0UQ4x0^Q7r4`S7}4t4vS8R4y4{Q9r7sQ9v7yQ9{8OQ:Q8TS:{9w9xS;g:|;PS;s;h;iS;{;t;uS<P;|;}R<S<QQ#wbQ's!uS(e#g2US(g#m+WQ+Y%fQ+j%xQ+p&OU-r'k't'wQ.W(fU/r*]*`/wQ0S*jQ0V*lQ1O+kQ1u,aS3R-s-vQ3Z.`S4e/s/tQ4n0PS4q0R0^Q4u0WQ6W1vQ7P3US7q4`4bQ7u4fU7|4r4x4{Q8P4wQ8v6XS9q7r7sQ9u7yQ9}8RQ:O8SQ:c8wQ:y9rS:z9v9xQ;S:QQ;^:dS;f:{;PS;r;g;hS;z;s;uS<O;{;}Q<R<PQ<T<SQ=o=jQ={=tR=|=uV!wQ'`-e%^aOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&o&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+]+g,p,s,x-i-q.P.V.g.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3d3l4z6T6e6f6i6|7[8t9T9_S#wz!j!r=i$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SR=o>R%^bOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&o&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+]+g,p,s,x-i-q.P.V.g.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3d3l4z6T6e6f6i6|7[8t9T9_Q%fj!^%xy!i!u%{%|%}'V'e'f'g'k'u*j+n+o-Y-l-m-t0R0U1R2u2|3T4r4s4v7}9{S&Oz!jQ+k%yQ,a&dW1v,b,c,d,eU6X1w1x1yS8w6Y6ZQ:d8x!r=j$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SQ=t>QR=u>R%QeOPXYstuvw!Z!`!g!o#S#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&r&t&u&w&{'T'b'r(V(](d(x(z)O)}*i+X+]+g,p,s,x-i-q.P.V.g.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3d3l4z6T6e6f6i6|7[8t9T9_Y#bWZ#W#Z(T!b%jm#h#i#l$x%e%h(^(h(i(j*Y*^*b+Z+[+^,o-V.T.Z.[.]._/m/p2d3[3]4a6r7TQ,n&o!p=k$Z$n)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SR=n'XU']!e%i*ZR2s-`%SdOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+],p,s,x-i-q.P.V.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3l4z6T6e6f6i6|8t9T9_!r)_$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SQ,m&oQ0x+gQ3`.gQ7Y3dR9e7[!b$Tc#Y%q(S(Y(t(y)Z)[)`)g+x-x-}.S.U.s.v/b0p3O3V3k3{5X5c6{7Q7a9]:o<W!P<d)^)q-Z.|2k2n3p3y3z4P4X6u7b7k7l8k9X9g9m9n;W;`=v!f$Vc#Y%q(S(Y(t(y)W)X)Z)[)`)g+x-x-}.S.U.s.v/b0p3O3V3k3{5X5c6{7Q7a9]:o<W!T<f)^)q-Z.|2k2n3p3v3w3y3z4P4X6u7b7k7l8k9X9g9m9n;W;`=v!^$Zc#Y%q(S(Y(t(y)`)g+x-x-}.S.U.s.v/b0p3O3V3k3{5X5c6{7Q7a9]:o<WQ4_/kz>S)^)q-Z.|2k2n3p4P4X6u7b7k7l8k9X9g9m9n;W;`=vQ>X>ZR>Y>['QkOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SS$oh$pR4U/U'XgOPWXYZhstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n$p%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/U/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>ST$kf$qQ$ifS)j$l)nR)v$qT$jf$qT)l$l)n'XhOPWXYZhstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n$p%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/U/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>ST$oh$pQ$rhR)u$p%^jOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&o&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+]+g,p,s,x-i-q.P.V.g.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3d3l4z6T6e6f6i6|7[8t9T9_!s>Q$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>S#glOPXZst!Z!`!o#S#d#o#{$n%m&k&n&o&r&t&u&w&{'T'b)O)s*i+]+g,p,s,x-i.g/V/n0]0l1r2S2T2V2X2[2_2a3d4T4z6T6e6f6i7[8t9T!U%Ri$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>Y#f(w#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^Q+T%aQ/c*Oo4O<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=h!U$yi$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>YQ*c$zU*l$|*Z*oQ+U%bQ0W*m#f=q#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^n=r<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=hQ=w>TQ=x>UQ=y>VR=z>W!U%Ri$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>Y#f(w#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^o4O<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=hnoOXst!Z#d%m&r&t&u&w,s,x2[2_S*f${*YQ-R'OQ-S'QR4i/y%[%Si#v$b$c$d$x${%O%Q%^%_%c)y*R*T*V*Y*a*g*w*x+f+i,S,V.f/P/d/m/x/y/{0`0b0i0j0o1f1i1q3c4^4_4j4o5Q5[5_6S7W7v8Q8V8[8q9b9p9y:P:`:r;Q;[;d;k<l<m<o<p<q<r<u<v<w<x<y<z=S=T=U=V=X=Y=]=^=_=`=a=b=c=d=g=h>P>X>Y>]>^Q,U&]Q1h,WQ5s1gR8h5tV*n$|*Z*oU*n$|*Z*oT5z1o5{S0P*i/nQ4w0]T8S4z:]Q+j%xQ0V*lQ1O+kQ1u,aQ6W1vQ8v6XQ:c8wR;^:d!U%Oi$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>Yx*R$v)e*S*u+V/v0d0e4R4g5R5S5W7p8U:R:x=p=}>OS0`*t0a#f<o#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^n<p<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=h!d=S(u)c*[*e.j.m.q/_/k/|0v1e3h4[4h4l5r7]7`7w7z8X8Z9t9|:S:};R;e;j;v>Z>[`=T3}7c7f7j9h:t:w;yS=_.l3iT=`7e9k!U%Qi$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>Y|*T$v)e*U*t+V/g/v0d0e4R4g4|5R5S5W7p8U:R:x=p=}>OS0b*u0c#f<q#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^n<r<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=h!h=U(u)c*[*e.k.l.q/_/k/|0v1e3f3h4[4h4l5r7]7^7`7w7z8X8Z9t9|:S:};R;e;j;v>Z>[d=V3}7d7e7j9h9i:t:u:w;yS=a.m3jT=b7f9lrnOXst!V!Z#d%m&i&r&t&u&w,s,x2[2_Q&f!UR,p&ornOXst!V!Z#d%m&i&r&t&u&w,s,x2[2_R&f!UQ,Y&^R1d,RsnOXst!V!Z#d%m&i&r&t&u&w,s,x2[2_Q1p,_S6R1s1tU8p6P6Q6US:_8r8sS;Y:^:aQ;m;ZR;w;nQ&m!VR,i&iR6_1|R:f8yW&Q|&V&W,OR1Z+vQ&r!WR,s&sR,y&xT2],x2_R,}&yQ,|&yR2f,}Q'y!{R-y'ySsOtQ#dXT%ps#dQ#OTR'{#OQ#RUR'}#RQ){$uR/`){Q#UVR(Q#UQ#XWU(W#X(X.QQ(X#YR.Q(YQ-^'YR2r-^Q.u(yS3m.u3nR3n.vQ-e'`R2v-eY!rQ'`-e1o5{R'j!rQ/Q)eR4S/QU#_W%h*YU(_#_(`.RQ(`#`R.R(ZQ-a']R2t-at`OXst!V!Z#d%m&i&k&r&t&u&w,s,x2[2_S#hZ%eU#r`#h.[R.[(jQ(k#jQ.X(gW.a(k.X3X7RQ3X.YR7R3YQ)n$lR/W)nQ$phR)t$pQ$`cU)a$`-|<jQ-|<WR<j)qQ/q*]W4c/q4d7t9sU4d/r/s/tS7t4e4fR9s7u$e*Q$v(u)c)e*[*e*t*u+Q+R+V.l.m.o.p.q/_/g/i/k/v/|0d0e0v1e3f3g3h3}4R4[4g4h4l4|5O5R5S5W5r7]7^7_7`7e7f7h7i7j7p7w7z8U8X8Z9h9i9j9t9|:R:S:t:u:v:w:x:};R;e;j;v;y=p=}>O>Z>[Q/z*eU4k/z4m7xQ4m/|R7x4lS*o$|*ZR0Y*ox*S$v)e*t*u+V/v0d0e4R4g5R5S5W7p8U:R:x=p=}>O!d.j(u)c*[*e.l.m.q/_/k/|0v1e3h4[4h4l5r7]7`7w7z8X8Z9t9|:S:};R;e;j;v>Z>[U/h*S.j7ca7c3}7e7f7j9h:t:w;yQ0a*tQ3i.lU4}0a3i9kR9k7e|*U$v)e*t*u+V/g/v0d0e4R4g4|5R5S5W7p8U:R:x=p=}>O!h.k(u)c*[*e.l.m.q/_/k/|0v1e3f3h4[4h4l5r7]7^7`7w7z8X8Z9t9|:S:};R;e;j;v>Z>[U/j*U.k7de7d3}7e7f7j9h9i:t:u:w;yQ0c*uQ3j.mU5P0c3j9lR9l7fQ*z%UR0g*zQ5]0vR8Y5]Q+_%kR0u+_Q5v1jS8j5v:[R:[8kQ,[&_R1m,[Q5{1oR8m5{Q1{,fS6]1{8zR8z6_Q1U+rW5h1U5j8a:VQ5j1XQ8a5iR:V8bQ+w&QR1[+wQ2_,xR6m2_YrOXst#dQ&v!ZQ+a%mQ,r&rQ,t&tQ,u&uQ,w&wQ2Y,sS2],x2_R6l2[Q%opQ&z!_Q&}!aQ'P!bQ'R!cQ'q!uQ+`%lQ+l%zQ,Q&XQ,h&mQ-P&|W-p'k's't'wQ-w'oQ0X*nQ1P+mQ1c,PS2O,i,lQ2g-OQ2h-RQ2i-SQ2}-oW3P-r-s-v-xQ5a1QQ5m1_Q5q1eQ6V1uQ6a2QQ6k2ZU6z3O3R3UQ6}3SQ8]5bQ8e5oQ8g5rQ8l5zQ8u6WQ8{6`S9[6{7PQ9^7OQ:W8cQ:b8vQ:g8|Q:n9]Q;U:XQ;]:cQ;a:oQ;l;VR;o;^Q%zyQ'd!iQ'o!uU+m%{%|%}Q-W'VU-k'e'f'gS-o'k'uQ0Q*jS1Q+n+oQ2o-YS2{-l-mQ3S-tS4p0R0UQ5b1RQ6v2uQ6y2|Q7O3TU7{4r4s4vQ9z7}R;O9{S$wi>PR*{%VU%Ui%V>PR0f*yQ$viS(u#v+iS)c$b$cQ)e$dQ*[$xS*e${*YQ*t%OQ*u%QQ+Q%^Q+R%_Q+V%cQ.l<oQ.m<qQ.o<uQ.p<wQ.q<yQ/_)yQ/g*RQ/i*TQ/k*VQ/v*aS/|*g/mQ0d*wQ0e*xl0v+f,V.f1i1q3c6S7W8q9b:`:r;[;dQ1e,SQ3f=SQ3g=UQ3h=XS3}<l<mQ4R/PS4[/d4^Q4g/xQ4h/yQ4l/{Q4|0`Q5O0bQ5R0iQ5S0jQ5W0oQ5r1fQ7]=]Q7^=_Q7_=aQ7`=cQ7e<pQ7f<rQ7h<vQ7i<xQ7j<zQ7p4_Q7w4jQ7z4oQ8U5QQ8X5[Q8Z5_Q9h=YQ9i=TQ9j=VQ9t7vQ9|8QQ:R8VQ:S8[Q:t=^Q:u=`Q:v=bQ:w=dQ:x9pQ:}9yQ;R:PQ;e=gQ;j;QQ;v;kQ;y=hQ=p>PQ=}>XQ>O>YQ>Z>]R>[>^Q+O%]Q.n<sR7g<tnpOXst!Z#d%m&r&t&u&w,s,x2[2_Q!fPS#fZ#oQ&|!`W'h!o*i0]4zQ(P#SQ)Q#{Q)r$nS,l&k&nQ,q&oQ-O&{S-T'T/nQ-g'bQ.x)OQ/[)sQ0s+]Q0y+gQ2W,pQ2y-iQ3a.gQ4W/VQ5U0lQ6Q1rQ6c2SQ6d2TQ6h2VQ6j2XQ6o2aQ7Z3dQ7m4TQ8s6TQ9P6eQ9Q6fQ9S6iQ9f7[Q:a8tR:k9T#[cOPXZst!Z!`!o#d#o#{%m&k&n&o&r&t&u&w&{'T'b)O*i+]+g,p,s,x-i.g/n0]0l1r2S2T2V2X2[2_2a3d4z6T6e6f6i7[8t9TQ#YWQ#eYQ%quQ%svS%uw!gS(S#W(VQ(Y#ZQ(t#uQ(y#xQ)R$OQ)S$PQ)T$QQ)U$RQ)V$SQ)W$TQ)X$UQ)Y$VQ)Z$WQ)[$XQ)^$ZQ)`$_Q)b$aQ)g$eW)q$n)s/V4TQ+d%tQ+x&RS-Z'X2pQ-x'rS-}(T.PQ.S(]Q.U(dQ.s(xQ.v(zQ.z<UQ.|<XQ.}<YQ/O<]Q/b)}Q0p+XQ2k-UQ2n-XQ3O-qQ3V.VQ3k.tQ3p<^Q3q<_Q3r<`Q3s<aQ3t<bQ3u<cQ3v<dQ3w<eQ3x<fQ3y<gQ3z<hQ3{.{Q3|<kQ4P<nQ4Q<{Q4X<iQ5X0rQ5c1SQ6u=OQ6{3QQ7Q3WQ7a3lQ7b=PQ7k=RQ7l=ZQ8k5wQ9X6sQ9]6|Q9g=[Q9m=eQ9n=fQ:o9_Q;W:ZQ;`:mQ<W#SR=v>SR#[WR'Z!el!tQ!r!v!y!z'`'l'm'n-e-u1o5{5}S'V!e-]U*j$|*Z*oS-Y'W'_S0U*k*qQ0^*rQ2u-cQ4v0[R4{0_R({#xQ!fQT-d'`-e]!qQ!r'`-e1o5{Q#p]R'i<VR)f$dY!uQ'`-e1o5{Q'k!rS'u!v!yS'w!z5}S-t'l'mQ-v'nR3T-uT#kZ%eS#jZ%eS%km,oU(g#h#i#lS.Y(h(iQ.^(jQ0t+^Q3Y.ZU3Z.[.]._S7S3[3]R9`7Td#^W#W#Z%h(T(^*Y+Z.T/mr#gZm#h#i#l%e(h(i(j+^.Z.[.]._3[3]7TS*]$x*bQ/t*^Q2U,oQ2l-VQ4`/pQ6q2dQ7s4aQ9W6rT=m'X+[V#aW%h*YU#`W%h*YS(U#W(^U(Z#Z+Z/mS-['X+[T.O(T.TV'^!e%i*ZQ$lfR)x$qT)m$l)nR4V/UT*_$x*bT*h${*YQ0w+fQ1g,VQ3_.fQ5t1iQ6P1qQ7X3cQ8r6SQ9c7WQ:^8qQ:p9bQ;Z:`Q;c:rQ;n;[R;q;dnqOXst!Z#d%m&r&t&u&w,s,x2[2_Q&l!VR,h&itmOXst!U!V!Z#d%m&i&r&t&u&w,s,x2[2_R,o&oT%lm,oR1k,XR,g&gQ&U|S+}&V&WR1^,OR+s&PT&p!W&sT&q!W&sT2^,x2_",
    nodeNames: "\u26A0 ArithOp ArithOp ?. JSXStartTag LineComment BlockComment Script Hashbang ExportDeclaration export Star as VariableName String Escape from ; default FunctionDeclaration async function VariableDefinition > < TypeParamList in out const TypeDefinition extends ThisType this LiteralType ArithOp Number BooleanLiteral TemplateType InterpolationEnd Interpolation InterpolationStart NullType null VoidType void TypeofType typeof MemberExpression . PropertyName [ TemplateString Escape Interpolation super RegExp ] ArrayExpression Spread , } { ObjectExpression Property async get set PropertyDefinition Block : NewTarget new NewExpression ) ( ArgList UnaryExpression delete LogicOp BitOp YieldExpression yield AwaitExpression await ParenthesizedExpression ClassExpression class ClassBody MethodDeclaration Decorator @ MemberExpression PrivatePropertyName CallExpression TypeArgList CompareOp < declare Privacy static abstract override PrivatePropertyDefinition PropertyDeclaration readonly accessor Optional TypeAnnotation Equals StaticBlock FunctionExpression ArrowFunction ParamList ParamList ArrayPattern ObjectPattern PatternProperty Privacy readonly Arrow MemberExpression BinaryExpression ArithOp ArithOp ArithOp ArithOp BitOp CompareOp instanceof satisfies CompareOp BitOp BitOp BitOp LogicOp LogicOp ConditionalExpression LogicOp LogicOp AssignmentExpression UpdateOp PostfixExpression CallExpression InstantiationExpression TaggedTemplateExpression DynamicImport import ImportMeta JSXElement JSXSelfCloseEndTag JSXSelfClosingTag JSXIdentifier JSXBuiltin JSXIdentifier JSXNamespacedName JSXMemberExpression JSXSpreadAttribute JSXAttribute JSXAttributeValue JSXEscape JSXEndTag JSXOpenTag JSXFragmentTag JSXText JSXEscape JSXStartCloseTag JSXCloseTag PrefixCast < ArrowFunction TypeParamList SequenceExpression InstantiationExpression KeyofType keyof UniqueType unique ImportType InferredType infer TypeName ParenthesizedType FunctionSignature ParamList NewSignature IndexedType TupleType Label ArrayType ReadonlyType ObjectType MethodType PropertyType IndexSignature PropertyDefinition CallSignature TypePredicate asserts is NewSignature new UnionType LogicOp IntersectionType LogicOp ConditionalType ParameterizedType ClassDeclaration abstract implements type VariableDeclaration let var using TypeAliasDeclaration InterfaceDeclaration interface EnumDeclaration enum EnumBody NamespaceDeclaration namespace module AmbientDeclaration declare GlobalDeclaration global ClassDeclaration ClassBody AmbientFunctionDeclaration ExportGroup VariableName VariableName ImportDeclaration defer ImportGroup ForStatement for ForSpec ForInSpec ForOfSpec of WhileStatement while WithStatement with DoStatement do IfStatement if else SwitchStatement switch SwitchBody CaseLabel case DefaultLabel TryStatement try CatchClause catch FinallyClause finally ReturnStatement return ThrowStatement throw BreakStatement break ContinueStatement continue DebuggerStatement debugger LabeledStatement ExpressionStatement SingleExpression SingleClassItem",
    maxTerm: 380,
    context: trackNewline,
    nodeProps: [
      ["isolate", -8, 5, 6, 14, 37, 39, 51, 53, 55, ""],
      ["group", -26, 9, 17, 19, 68, 207, 211, 215, 216, 218, 221, 224, 234, 237, 243, 245, 247, 249, 252, 258, 264, 266, 268, 270, 272, 274, 275, "Statement", -34, 13, 14, 32, 35, 36, 42, 51, 54, 55, 57, 62, 70, 72, 76, 80, 82, 84, 85, 110, 111, 120, 121, 136, 139, 141, 142, 143, 144, 145, 147, 148, 167, 169, 171, "Expression", -23, 31, 33, 37, 41, 43, 45, 173, 175, 177, 178, 180, 181, 182, 184, 185, 186, 188, 189, 190, 201, 203, 205, 206, "Type", -3, 88, 103, 109, "ClassItem"],
      ["openedBy", 23, "<", 38, "InterpolationStart", 56, "[", 60, "{", 73, "(", 160, "JSXStartCloseTag"],
      ["closedBy", -2, 24, 168, ">", 40, "InterpolationEnd", 50, "]", 61, "}", 74, ")", 165, "JSXEndTag"]
    ],
    propSources: [jsHighlight],
    skippedNodes: [0, 5, 6, 278],
    repeatNodeCount: 37,
    tokenData: "$Fq07[R!bOX%ZXY+gYZ-yZ[+g[]%Z]^.c^p%Zpq+gqr/mrs3cst:_tuEruvJSvwLkwx! Yxy!'iyz!(sz{!)}{|!,q|}!.O}!O!,q!O!P!/Y!P!Q!9j!Q!R#:O!R![#<_![!]#I_!]!^#Jk!^!_#Ku!_!`$![!`!a$$v!a!b$*T!b!c$,r!c!}Er!}#O$-|#O#P$/W#P#Q$4o#Q#R$5y#R#SEr#S#T$7W#T#o$8b#o#p$<r#p#q$=h#q#r$>x#r#s$@U#s$f%Z$f$g+g$g#BYEr#BY#BZ$A`#BZ$ISEr$IS$I_$A`$I_$I|Er$I|$I}$Dk$I}$JO$Dk$JO$JTEr$JT$JU$A`$JU$KVEr$KV$KW$A`$KW&FUEr&FU&FV$A`&FV;'SEr;'S;=`I|<%l?HTEr?HT?HU$A`?HUOEr(n%d_$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z&j&hT$i&jO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c&j&zP;=`<%l&c'|'U]$i&j(Z!bOY&}YZ&cZw&}wx&cx!^&}!^!_'}!_#O&}#O#P&c#P#o&}#o#p'}#p;'S&};'S;=`(l<%lO&}!b(SU(Z!bOY'}Zw'}x#O'}#P;'S'};'S;=`(f<%lO'}!b(iP;=`<%l'}'|(oP;=`<%l&}'[(y]$i&j(WpOY(rYZ&cZr(rrs&cs!^(r!^!_)r!_#O(r#O#P&c#P#o(r#o#p)r#p;'S(r;'S;=`*a<%lO(rp)wU(WpOY)rZr)rs#O)r#P;'S)r;'S;=`*Z<%lO)rp*^P;=`<%l)r'[*dP;=`<%l(r#S*nX(Wp(Z!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g#S+^P;=`<%l*g(n+dP;=`<%l%Z07[+rq$i&j(Wp(Z!b'|0/lOX%ZXY+gYZ&cZ[+g[p%Zpq+gqr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p$f%Z$f$g+g$g#BY%Z#BY#BZ+g#BZ$IS%Z$IS$I_+g$I_$JT%Z$JT$JU+g$JU$KV%Z$KV$KW+g$KW&FU%Z&FU&FV+g&FV;'S%Z;'S;=`+a<%l?HT%Z?HT?HU+g?HUO%Z07[.ST(X#S$i&j'}0/lO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c07[.n_$i&j(Wp(Z!b'}0/lOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z)3p/x`$i&j!p),Q(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`0z!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW1V`#v(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`2X!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW2d_#v(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'At3l_(V':f$i&j(Z!bOY4kYZ5qZr4krs7nsw4kwx5qx!^4k!^!_8p!_#O4k#O#P5q#P#o4k#o#p8p#p;'S4k;'S;=`:X<%lO4k(^4r_$i&j(Z!bOY4kYZ5qZr4krs7nsw4kwx5qx!^4k!^!_8p!_#O4k#O#P5q#P#o4k#o#p8p#p;'S4k;'S;=`:X<%lO4k&z5vX$i&jOr5qrs6cs!^5q!^!_6y!_#o5q#o#p6y#p;'S5q;'S;=`7h<%lO5q&z6jT$d`$i&jO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c`6|TOr6yrs7]s;'S6y;'S;=`7b<%lO6y`7bO$d``7eP;=`<%l6y&z7kP;=`<%l5q(^7w]$d`$i&j(Z!bOY&}YZ&cZw&}wx&cx!^&}!^!_'}!_#O&}#O#P&c#P#o&}#o#p'}#p;'S&};'S;=`(l<%lO&}!r8uZ(Z!bOY8pYZ6yZr8prs9hsw8pwx6yx#O8p#O#P6y#P;'S8p;'S;=`:R<%lO8p!r9oU$d`(Z!bOY'}Zw'}x#O'}#P;'S'};'S;=`(f<%lO'}!r:UP;=`<%l8p(^:[P;=`<%l4k%9[:hh$i&j(Wp(Z!bOY%ZYZ&cZq%Zqr<Srs&}st%ZtuCruw%Zwx(rx!^%Z!^!_*g!_!c%Z!c!}Cr!}#O%Z#O#P&c#P#R%Z#R#SCr#S#T%Z#T#oCr#o#p*g#p$g%Z$g;'SCr;'S;=`El<%lOCr(r<__WS$i&j(Wp(Z!bOY<SYZ&cZr<Srs=^sw<Swx@nx!^<S!^!_Bm!_#O<S#O#P>`#P#o<S#o#pBm#p;'S<S;'S;=`Cl<%lO<S(Q=g]WS$i&j(Z!bOY=^YZ&cZw=^wx>`x!^=^!^!_?q!_#O=^#O#P>`#P#o=^#o#p?q#p;'S=^;'S;=`@h<%lO=^&n>gXWS$i&jOY>`YZ&cZ!^>`!^!_?S!_#o>`#o#p?S#p;'S>`;'S;=`?k<%lO>`S?XSWSOY?SZ;'S?S;'S;=`?e<%lO?SS?hP;=`<%l?S&n?nP;=`<%l>`!f?xWWS(Z!bOY?qZw?qwx?Sx#O?q#O#P?S#P;'S?q;'S;=`@b<%lO?q!f@eP;=`<%l?q(Q@kP;=`<%l=^'`@w]WS$i&j(WpOY@nYZ&cZr@nrs>`s!^@n!^!_Ap!_#O@n#O#P>`#P#o@n#o#pAp#p;'S@n;'S;=`Bg<%lO@ntAwWWS(WpOYApZrAprs?Ss#OAp#O#P?S#P;'SAp;'S;=`Ba<%lOAptBdP;=`<%lAp'`BjP;=`<%l@n#WBvYWS(Wp(Z!bOYBmZrBmrs?qswBmwxApx#OBm#O#P?S#P;'SBm;'S;=`Cf<%lOBm#WCiP;=`<%lBm(rCoP;=`<%l<S%9[C}i$i&j(o%1l(Wp(Z!bOY%ZYZ&cZr%Zrs&}st%ZtuCruw%Zwx(rx!Q%Z!Q![Cr![!^%Z!^!_*g!_!c%Z!c!}Cr!}#O%Z#O#P&c#P#R%Z#R#SCr#S#T%Z#T#oCr#o#p*g#p$g%Z$g;'SCr;'S;=`El<%lOCr%9[EoP;=`<%lCr07[FRk$i&j(Wp(Z!b$]#t(T,2j(e$I[OY%ZYZ&cZr%Zrs&}st%ZtuEruw%Zwx(rx}%Z}!OGv!O!Q%Z!Q![Er![!^%Z!^!_*g!_!c%Z!c!}Er!}#O%Z#O#P&c#P#R%Z#R#SEr#S#T%Z#T#oEr#o#p*g#p$g%Z$g;'SEr;'S;=`I|<%lOEr+dHRk$i&j(Wp(Z!b$]#tOY%ZYZ&cZr%Zrs&}st%ZtuGvuw%Zwx(rx}%Z}!OGv!O!Q%Z!Q![Gv![!^%Z!^!_*g!_!c%Z!c!}Gv!}#O%Z#O#P&c#P#R%Z#R#SGv#S#T%Z#T#oGv#o#p*g#p$g%Z$g;'SGv;'S;=`Iv<%lOGv+dIyP;=`<%lGv07[JPP;=`<%lEr(KWJ_`$i&j(Wp(Z!b#p(ChOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KWKl_$i&j$Q(Ch(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z,#xLva(z+JY$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sv%ZvwM{wx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KWNW`$i&j#z(Ch(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'At! c_(Y';W$i&j(WpOY!!bYZ!#hZr!!brs!#hsw!!bwx!$xx!^!!b!^!_!%z!_#O!!b#O#P!#h#P#o!!b#o#p!%z#p;'S!!b;'S;=`!'c<%lO!!b'l!!i_$i&j(WpOY!!bYZ!#hZr!!brs!#hsw!!bwx!$xx!^!!b!^!_!%z!_#O!!b#O#P!#h#P#o!!b#o#p!%z#p;'S!!b;'S;=`!'c<%lO!!b&z!#mX$i&jOw!#hwx6cx!^!#h!^!_!$Y!_#o!#h#o#p!$Y#p;'S!#h;'S;=`!$r<%lO!#h`!$]TOw!$Ywx7]x;'S!$Y;'S;=`!$l<%lO!$Y`!$oP;=`<%l!$Y&z!$uP;=`<%l!#h'l!%R]$d`$i&j(WpOY(rYZ&cZr(rrs&cs!^(r!^!_)r!_#O(r#O#P&c#P#o(r#o#p)r#p;'S(r;'S;=`*a<%lO(r!Q!&PZ(WpOY!%zYZ!$YZr!%zrs!$Ysw!%zwx!&rx#O!%z#O#P!$Y#P;'S!%z;'S;=`!']<%lO!%z!Q!&yU$d`(WpOY)rZr)rs#O)r#P;'S)r;'S;=`*Z<%lO)r!Q!'`P;=`<%l!%z'l!'fP;=`<%l!!b/5|!'t_!l/.^$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z#&U!)O_!k!Lf$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z-!n!*[b$i&j(Wp(Z!b(U%&f#q(ChOY%ZYZ&cZr%Zrs&}sw%Zwx(rxz%Zz{!+d{!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW!+o`$i&j(Wp(Z!b#n(ChOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z+;x!,|`$i&j(Wp(Z!br+4YOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z,$U!.Z_!]+Jf$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z07[!/ec$i&j(Wp(Z!b!Q.2^OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!0p!P!Q%Z!Q![!3Y![!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z#%|!0ya$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!2O!P!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z#%|!2Z_![!L^$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad!3eg$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![!3Y![!^%Z!^!_*g!_!g%Z!g!h!4|!h#O%Z#O#P&c#P#R%Z#R#S!3Y#S#X%Z#X#Y!4|#Y#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad!5Vg$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx{%Z{|!6n|}%Z}!O!6n!O!Q%Z!Q![!8S![!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S!8S#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad!6wc$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![!8S![!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S!8S#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad!8_c$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![!8S![!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S!8S#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z07[!9uf$i&j(Wp(Z!b#o(ChOY!;ZYZ&cZr!;Zrs!<nsw!;Zwx!Lcxz!;Zz{#-}{!P!;Z!P!Q#/d!Q!^!;Z!^!_#(i!_!`#7S!`!a#8i!a!}!;Z!}#O#,f#O#P!Dy#P#o!;Z#o#p#(i#p;'S!;Z;'S;=`#-w<%lO!;Z?O!;fb$i&j(Wp(Z!b!X7`OY!;ZYZ&cZr!;Zrs!<nsw!;Zwx!Lcx!P!;Z!P!Q#&`!Q!^!;Z!^!_#(i!_!}!;Z!}#O#,f#O#P!Dy#P#o!;Z#o#p#(i#p;'S!;Z;'S;=`#-w<%lO!;Z>^!<w`$i&j(Z!b!X7`OY!<nYZ&cZw!<nwx!=yx!P!<n!P!Q!Eq!Q!^!<n!^!_!Gr!_!}!<n!}#O!KS#O#P!Dy#P#o!<n#o#p!Gr#p;'S!<n;'S;=`!L]<%lO!<n<z!>Q^$i&j!X7`OY!=yYZ&cZ!P!=y!P!Q!>|!Q!^!=y!^!_!@c!_!}!=y!}#O!CW#O#P!Dy#P#o!=y#o#p!@c#p;'S!=y;'S;=`!Ek<%lO!=y<z!?Td$i&j!X7`O!^&c!_#W&c#W#X!>|#X#Z&c#Z#[!>|#[#]&c#]#^!>|#^#a&c#a#b!>|#b#g&c#g#h!>|#h#i&c#i#j!>|#j#k!>|#k#m&c#m#n!>|#n#o&c#p;'S&c;'S;=`&w<%lO&c7`!@hX!X7`OY!@cZ!P!@c!P!Q!AT!Q!}!@c!}#O!Ar#O#P!Bq#P;'S!@c;'S;=`!CQ<%lO!@c7`!AYW!X7`#W#X!AT#Z#[!AT#]#^!AT#a#b!AT#g#h!AT#i#j!AT#j#k!AT#m#n!AT7`!AuVOY!ArZ#O!Ar#O#P!B[#P#Q!@c#Q;'S!Ar;'S;=`!Bk<%lO!Ar7`!B_SOY!ArZ;'S!Ar;'S;=`!Bk<%lO!Ar7`!BnP;=`<%l!Ar7`!BtSOY!@cZ;'S!@c;'S;=`!CQ<%lO!@c7`!CTP;=`<%l!@c<z!C][$i&jOY!CWYZ&cZ!^!CW!^!_!Ar!_#O!CW#O#P!DR#P#Q!=y#Q#o!CW#o#p!Ar#p;'S!CW;'S;=`!Ds<%lO!CW<z!DWX$i&jOY!CWYZ&cZ!^!CW!^!_!Ar!_#o!CW#o#p!Ar#p;'S!CW;'S;=`!Ds<%lO!CW<z!DvP;=`<%l!CW<z!EOX$i&jOY!=yYZ&cZ!^!=y!^!_!@c!_#o!=y#o#p!@c#p;'S!=y;'S;=`!Ek<%lO!=y<z!EnP;=`<%l!=y>^!Ezl$i&j(Z!b!X7`OY&}YZ&cZw&}wx&cx!^&}!^!_'}!_#O&}#O#P&c#P#W&}#W#X!Eq#X#Z&}#Z#[!Eq#[#]&}#]#^!Eq#^#a&}#a#b!Eq#b#g&}#g#h!Eq#h#i&}#i#j!Eq#j#k!Eq#k#m&}#m#n!Eq#n#o&}#o#p'}#p;'S&};'S;=`(l<%lO&}8r!GyZ(Z!b!X7`OY!GrZw!Grwx!@cx!P!Gr!P!Q!Hl!Q!}!Gr!}#O!JU#O#P!Bq#P;'S!Gr;'S;=`!J|<%lO!Gr8r!Hse(Z!b!X7`OY'}Zw'}x#O'}#P#W'}#W#X!Hl#X#Z'}#Z#[!Hl#[#]'}#]#^!Hl#^#a'}#a#b!Hl#b#g'}#g#h!Hl#h#i'}#i#j!Hl#j#k!Hl#k#m'}#m#n!Hl#n;'S'};'S;=`(f<%lO'}8r!JZX(Z!bOY!JUZw!JUwx!Arx#O!JU#O#P!B[#P#Q!Gr#Q;'S!JU;'S;=`!Jv<%lO!JU8r!JyP;=`<%l!JU8r!KPP;=`<%l!Gr>^!KZ^$i&j(Z!bOY!KSYZ&cZw!KSwx!CWx!^!KS!^!_!JU!_#O!KS#O#P!DR#P#Q!<n#Q#o!KS#o#p!JU#p;'S!KS;'S;=`!LV<%lO!KS>^!LYP;=`<%l!KS>^!L`P;=`<%l!<n=l!Ll`$i&j(Wp!X7`OY!LcYZ&cZr!Lcrs!=ys!P!Lc!P!Q!Mn!Q!^!Lc!^!_# o!_!}!Lc!}#O#%P#O#P!Dy#P#o!Lc#o#p# o#p;'S!Lc;'S;=`#&Y<%lO!Lc=l!Mwl$i&j(Wp!X7`OY(rYZ&cZr(rrs&cs!^(r!^!_)r!_#O(r#O#P&c#P#W(r#W#X!Mn#X#Z(r#Z#[!Mn#[#](r#]#^!Mn#^#a(r#a#b!Mn#b#g(r#g#h!Mn#h#i(r#i#j!Mn#j#k!Mn#k#m(r#m#n!Mn#n#o(r#o#p)r#p;'S(r;'S;=`*a<%lO(r8Q# vZ(Wp!X7`OY# oZr# ors!@cs!P# o!P!Q#!i!Q!}# o!}#O#$R#O#P!Bq#P;'S# o;'S;=`#$y<%lO# o8Q#!pe(Wp!X7`OY)rZr)rs#O)r#P#W)r#W#X#!i#X#Z)r#Z#[#!i#[#])r#]#^#!i#^#a)r#a#b#!i#b#g)r#g#h#!i#h#i)r#i#j#!i#j#k#!i#k#m)r#m#n#!i#n;'S)r;'S;=`*Z<%lO)r8Q#$WX(WpOY#$RZr#$Rrs!Ars#O#$R#O#P!B[#P#Q# o#Q;'S#$R;'S;=`#$s<%lO#$R8Q#$vP;=`<%l#$R8Q#$|P;=`<%l# o=l#%W^$i&j(WpOY#%PYZ&cZr#%Prs!CWs!^#%P!^!_#$R!_#O#%P#O#P!DR#P#Q!Lc#Q#o#%P#o#p#$R#p;'S#%P;'S;=`#&S<%lO#%P=l#&VP;=`<%l#%P=l#&]P;=`<%l!Lc?O#&kn$i&j(Wp(Z!b!X7`OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#W%Z#W#X#&`#X#Z%Z#Z#[#&`#[#]%Z#]#^#&`#^#a%Z#a#b#&`#b#g%Z#g#h#&`#h#i%Z#i#j#&`#j#k#&`#k#m%Z#m#n#&`#n#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z9d#(r](Wp(Z!b!X7`OY#(iZr#(irs!Grsw#(iwx# ox!P#(i!P!Q#)k!Q!}#(i!}#O#+`#O#P!Bq#P;'S#(i;'S;=`#,`<%lO#(i9d#)th(Wp(Z!b!X7`OY*gZr*grs'}sw*gwx)rx#O*g#P#W*g#W#X#)k#X#Z*g#Z#[#)k#[#]*g#]#^#)k#^#a*g#a#b#)k#b#g*g#g#h#)k#h#i*g#i#j#)k#j#k#)k#k#m*g#m#n#)k#n;'S*g;'S;=`+Z<%lO*g9d#+gZ(Wp(Z!bOY#+`Zr#+`rs!JUsw#+`wx#$Rx#O#+`#O#P!B[#P#Q#(i#Q;'S#+`;'S;=`#,Y<%lO#+`9d#,]P;=`<%l#+`9d#,cP;=`<%l#(i?O#,o`$i&j(Wp(Z!bOY#,fYZ&cZr#,frs!KSsw#,fwx#%Px!^#,f!^!_#+`!_#O#,f#O#P!DR#P#Q!;Z#Q#o#,f#o#p#+`#p;'S#,f;'S;=`#-q<%lO#,f?O#-tP;=`<%l#,f?O#-zP;=`<%l!;Z07[#.[b$i&j(Wp(Z!b(O0/l!X7`OY!;ZYZ&cZr!;Zrs!<nsw!;Zwx!Lcx!P!;Z!P!Q#&`!Q!^!;Z!^!_#(i!_!}!;Z!}#O#,f#O#P!Dy#P#o!;Z#o#p#(i#p;'S!;Z;'S;=`#-w<%lO!;Z07[#/o_$i&j(Wp(Z!bT0/lOY#/dYZ&cZr#/drs#0nsw#/dwx#4Ox!^#/d!^!_#5}!_#O#/d#O#P#1p#P#o#/d#o#p#5}#p;'S#/d;'S;=`#6|<%lO#/d06j#0w]$i&j(Z!bT0/lOY#0nYZ&cZw#0nwx#1px!^#0n!^!_#3R!_#O#0n#O#P#1p#P#o#0n#o#p#3R#p;'S#0n;'S;=`#3x<%lO#0n05W#1wX$i&jT0/lOY#1pYZ&cZ!^#1p!^!_#2d!_#o#1p#o#p#2d#p;'S#1p;'S;=`#2{<%lO#1p0/l#2iST0/lOY#2dZ;'S#2d;'S;=`#2u<%lO#2d0/l#2xP;=`<%l#2d05W#3OP;=`<%l#1p01O#3YW(Z!bT0/lOY#3RZw#3Rwx#2dx#O#3R#O#P#2d#P;'S#3R;'S;=`#3r<%lO#3R01O#3uP;=`<%l#3R06j#3{P;=`<%l#0n05x#4X]$i&j(WpT0/lOY#4OYZ&cZr#4Ors#1ps!^#4O!^!_#5Q!_#O#4O#O#P#1p#P#o#4O#o#p#5Q#p;'S#4O;'S;=`#5w<%lO#4O00^#5XW(WpT0/lOY#5QZr#5Qrs#2ds#O#5Q#O#P#2d#P;'S#5Q;'S;=`#5q<%lO#5Q00^#5tP;=`<%l#5Q05x#5zP;=`<%l#4O01p#6WY(Wp(Z!bT0/lOY#5}Zr#5}rs#3Rsw#5}wx#5Qx#O#5}#O#P#2d#P;'S#5};'S;=`#6v<%lO#5}01p#6yP;=`<%l#5}07[#7PP;=`<%l#/d)3h#7ab$i&j$Q(Ch(Wp(Z!b!X7`OY!;ZYZ&cZr!;Zrs!<nsw!;Zwx!Lcx!P!;Z!P!Q#&`!Q!^!;Z!^!_#(i!_!}!;Z!}#O#,f#O#P!Dy#P#o!;Z#o#p#(i#p;'S!;Z;'S;=`#-w<%lO!;ZAt#8vb$Z#t$i&j(Wp(Z!b!X7`OY!;ZYZ&cZr!;Zrs!<nsw!;Zwx!Lcx!P!;Z!P!Q#&`!Q!^!;Z!^!_#(i!_!}!;Z!}#O#,f#O#P!Dy#P#o!;Z#o#p#(i#p;'S!;Z;'S;=`#-w<%lO!;Z'Ad#:Zp$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!3Y!P!Q%Z!Q![#<_![!^%Z!^!_*g!_!g%Z!g!h!4|!h#O%Z#O#P&c#P#R%Z#R#S#<_#S#U%Z#U#V#?i#V#X%Z#X#Y!4|#Y#b%Z#b#c#>_#c#d#Bq#d#l%Z#l#m#Es#m#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#<jk$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!3Y!P!Q%Z!Q![#<_![!^%Z!^!_*g!_!g%Z!g!h!4|!h#O%Z#O#P&c#P#R%Z#R#S#<_#S#X%Z#X#Y!4|#Y#b%Z#b#c#>_#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#>j_$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#?rd$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!R#AQ!R!S#AQ!S!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#AQ#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#A]f$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!R#AQ!R!S#AQ!S!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#AQ#S#b%Z#b#c#>_#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#Bzc$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!Y#DV!Y!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#DV#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#Dbe$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!Y#DV!Y!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#DV#S#b%Z#b#c#>_#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#E|g$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![#Ge![!^%Z!^!_*g!_!c%Z!c!i#Ge!i#O%Z#O#P&c#P#R%Z#R#S#Ge#S#T%Z#T#Z#Ge#Z#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#Gpi$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![#Ge![!^%Z!^!_*g!_!c%Z!c!i#Ge!i#O%Z#O#P&c#P#R%Z#R#S#Ge#S#T%Z#T#Z#Ge#Z#b%Z#b#c#>_#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z*)x#Il_!g$b$i&j$O)Lv(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z)[#Jv_al$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z04f#LS^h#)`#R-<U(Wp(Z!b$n7`OY*gZr*grs'}sw*gwx)rx!P*g!P!Q#MO!Q!^*g!^!_#Mt!_!`$ f!`#O*g#P;'S*g;'S;=`+Z<%lO*g(n#MXX$k&j(Wp(Z!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g(El#M}Z#r(Ch(Wp(Z!bOY*gZr*grs'}sw*gwx)rx!_*g!_!`#Np!`#O*g#P;'S*g;'S;=`+Z<%lO*g(El#NyX$Q(Ch(Wp(Z!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g(El$ oX#s(Ch(Wp(Z!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g*)x$!ga#`*!Y$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`0z!`!a$#l!a#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(K[$#w_#k(Cl$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z*)x$%Vag!*r#s(Ch$f#|$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`$&[!`!a$'f!a#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW$&g_#s(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW$'qa#r(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`!a$(v!a#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW$)R`#r(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(Kd$*`a(r(Ct$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!a%Z!a!b$+e!b#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW$+p`$i&j#{(Ch(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#`$,}_!|$Ip$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z04f$.X_!S0,v$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(n$/]Z$i&jO!^$0O!^!_$0f!_#i$0O#i#j$0k#j#l$0O#l#m$2^#m#o$0O#o#p$0f#p;'S$0O;'S;=`$4i<%lO$0O(n$0VT_#S$i&jO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c#S$0kO_#S(n$0p[$i&jO!Q&c!Q![$1f![!^&c!_!c&c!c!i$1f!i#T&c#T#Z$1f#Z#o&c#o#p$3|#p;'S&c;'S;=`&w<%lO&c(n$1kZ$i&jO!Q&c!Q![$2^![!^&c!_!c&c!c!i$2^!i#T&c#T#Z$2^#Z#o&c#p;'S&c;'S;=`&w<%lO&c(n$2cZ$i&jO!Q&c!Q![$3U![!^&c!_!c&c!c!i$3U!i#T&c#T#Z$3U#Z#o&c#p;'S&c;'S;=`&w<%lO&c(n$3ZZ$i&jO!Q&c!Q![$0O![!^&c!_!c&c!c!i$0O!i#T&c#T#Z$0O#Z#o&c#p;'S&c;'S;=`&w<%lO&c#S$4PR!Q![$4Y!c!i$4Y#T#Z$4Y#S$4]S!Q![$4Y!c!i$4Y#T#Z$4Y#q#r$0f(n$4lP;=`<%l$0O#1[$4z_!Y#)l$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW$6U`#x(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z+;p$7c_$i&j(Wp(Z!b(a+4QOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z07[$8qk$i&j(Wp(Z!b(T,2j$_#t(e$I[OY%ZYZ&cZr%Zrs&}st%Ztu$8buw%Zwx(rx}%Z}!O$:f!O!Q%Z!Q![$8b![!^%Z!^!_*g!_!c%Z!c!}$8b!}#O%Z#O#P&c#P#R%Z#R#S$8b#S#T%Z#T#o$8b#o#p*g#p$g%Z$g;'S$8b;'S;=`$<l<%lO$8b+d$:qk$i&j(Wp(Z!b$_#tOY%ZYZ&cZr%Zrs&}st%Ztu$:fuw%Zwx(rx}%Z}!O$:f!O!Q%Z!Q![$:f![!^%Z!^!_*g!_!c%Z!c!}$:f!}#O%Z#O#P&c#P#R%Z#R#S$:f#S#T%Z#T#o$:f#o#p*g#p$g%Z$g;'S$:f;'S;=`$<f<%lO$:f+d$<iP;=`<%l$:f07[$<oP;=`<%l$8b#Jf$<{X!_#Hb(Wp(Z!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g,#x$=sa(y+JY$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p#q$+e#q;'S%Z;'S;=`+a<%lO%Z)>v$?V_!^(CdvBr$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z?O$@a_!q7`$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z07[$Aq|$i&j(Wp(Z!b'|0/l$]#t(T,2j(e$I[OX%ZXY+gYZ&cZ[+g[p%Zpq+gqr%Zrs&}st%ZtuEruw%Zwx(rx}%Z}!OGv!O!Q%Z!Q![Er![!^%Z!^!_*g!_!c%Z!c!}Er!}#O%Z#O#P&c#P#R%Z#R#SEr#S#T%Z#T#oEr#o#p*g#p$f%Z$f$g+g$g#BYEr#BY#BZ$A`#BZ$ISEr$IS$I_$A`$I_$JTEr$JT$JU$A`$JU$KVEr$KV$KW$A`$KW&FUEr&FU&FV$A`&FV;'SEr;'S;=`I|<%l?HTEr?HT?HU$A`?HUOEr07[$D|k$i&j(Wp(Z!b'}0/l$]#t(T,2j(e$I[OY%ZYZ&cZr%Zrs&}st%ZtuEruw%Zwx(rx}%Z}!OGv!O!Q%Z!Q![Er![!^%Z!^!_*g!_!c%Z!c!}Er!}#O%Z#O#P&c#P#R%Z#R#SEr#S#T%Z#T#oEr#o#p*g#p$g%Z$g;'SEr;'S;=`I|<%lOEr",
    tokenizers: [noSemicolon, noSemicolonType, operatorToken, jsx, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, insertSemicolon, new LocalTokenGroup("$S~RRtu[#O#Pg#S#T#|~_P#o#pb~gOx~~jVO#i!P#i#j!U#j#l!P#l#m!q#m;'S!P;'S;=`#v<%lO!P~!UO!U~~!XS!Q![!e!c!i!e#T#Z!e#o#p#Z~!hR!Q![!q!c!i!q#T#Z!q~!tR!Q![!}!c!i!}#T#Z!}~#QR!Q![!P!c!i!P#T#Z!P~#^R!Q![#g!c!i#g#T#Z#g~#jS!Q![#g!c!i#g#T#Z#g#q#r!P~#yP;=`<%l!P~$RO(c~~", 141, 340), new LocalTokenGroup("j~RQYZXz{^~^O(Q~~aP!P!Qd~iO(R~~", 25, 323)],
    topRules: { "Script": [0, 7], "SingleExpression": [1, 276], "SingleClassItem": [2, 277] },
    dialects: { jsx: 0, ts: 15175 },
    dynamicPrecedences: { "80": 1, "82": 1, "94": 1, "169": 1, "199": 1 },
    specialized: [{ term: 327, get: (value) => spec_identifier[value] || -1 }, { term: 343, get: (value) => spec_word[value] || -1 }, { term: 95, get: (value) => spec_LessThan[value] || -1 }],
    tokenPrec: 15201
  });

  // node_modules/@lezer/css/dist/index.js
  var descendantOp = 122;
  var Unit = 1;
  var identifier = 123;
  var callee = 124;
  var VariableName = 2;
  var queryIdentifier = 125;
  var queryVariableName = 3;
  var QueryCallee = 4;
  var space2 = [
    9,
    10,
    11,
    12,
    13,
    32,
    133,
    160,
    5760,
    8192,
    8193,
    8194,
    8195,
    8196,
    8197,
    8198,
    8199,
    8200,
    8201,
    8202,
    8232,
    8233,
    8239,
    8287,
    12288
  ];
  var colon = 58;
  var parenL = 40;
  var underscore = 95;
  var bracketL2 = 91;
  var dash2 = 45;
  var period = 46;
  var hash = 35;
  var percent = 37;
  var ampersand = 38;
  var backslash = 92;
  var newline2 = 10;
  var asterisk = 42;
  function isAlpha(ch) {
    return ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122 || ch >= 161;
  }
  function isDigit(ch) {
    return ch >= 48 && ch <= 57;
  }
  function isHex(ch) {
    return isDigit(ch) || ch >= 97 && ch <= 102 || ch >= 65 && ch <= 70;
  }
  var identifierTokens = (id2, varName, callee2) => (input, stack) => {
    for (let inside = false, dashes = 0, i = 0; ; i++) {
      let { next } = input;
      if (isAlpha(next) || next == dash2 || next == underscore || inside && isDigit(next)) {
        if (!inside && (next != dash2 || i > 0)) inside = true;
        if (dashes === i && next == dash2) dashes++;
        input.advance();
      } else if (next == backslash && input.peek(1) != newline2) {
        input.advance();
        if (isHex(input.next)) {
          do {
            input.advance();
          } while (isHex(input.next));
          if (input.next == 32) input.advance();
        } else if (input.next > -1) {
          input.advance();
        }
        inside = true;
      } else {
        if (inside) input.acceptToken(
          dashes == 2 && stack.canShift(VariableName) ? varName : next == parenL ? callee2 : id2
        );
        break;
      }
    }
  };
  var identifiers = new ExternalTokenizer(
    identifierTokens(identifier, VariableName, callee)
  );
  var queryIdentifiers = new ExternalTokenizer(
    identifierTokens(queryIdentifier, queryVariableName, QueryCallee)
  );
  var descendant = new ExternalTokenizer((input) => {
    if (space2.includes(input.peek(-1))) {
      let { next } = input;
      if (isAlpha(next) || next == underscore || next == hash || next == period || next == asterisk || next == bracketL2 || next == colon && isAlpha(input.peek(1)) || next == dash2 || next == ampersand)
        input.acceptToken(descendantOp);
    }
  });
  var unitToken = new ExternalTokenizer((input) => {
    if (!space2.includes(input.peek(-1))) {
      let { next } = input;
      if (next == percent) {
        input.advance();
        input.acceptToken(Unit);
      }
      if (isAlpha(next)) {
        do {
          input.advance();
        } while (isAlpha(input.next) || isDigit(input.next));
        input.acceptToken(Unit);
      }
    }
  });
  var cssHighlighting = styleTags({
    "AtKeyword import charset namespace keyframes media supports": tags.definitionKeyword,
    "from to selector": tags.keyword,
    NamespaceName: tags.namespace,
    KeyframeName: tags.labelName,
    KeyframeRangeName: tags.operatorKeyword,
    TagName: tags.tagName,
    ClassName: tags.className,
    PseudoClassName: tags.constant(tags.className),
    IdName: tags.labelName,
    "FeatureName PropertyName": tags.propertyName,
    AttributeName: tags.attributeName,
    NumberLiteral: tags.number,
    KeywordQuery: tags.keyword,
    UnaryQueryOp: tags.operatorKeyword,
    "CallTag ValueName": tags.atom,
    VariableName: tags.variableName,
    Callee: tags.operatorKeyword,
    Unit: tags.unit,
    "UniversalSelector NestingSelector": tags.definitionOperator,
    "MatchOp CompareOp": tags.compareOperator,
    "ChildOp SiblingOp, LogicOp": tags.logicOperator,
    BinOp: tags.arithmeticOperator,
    Important: tags.modifier,
    Comment: tags.blockComment,
    ColorLiteral: tags.color,
    "ParenthesizedContent StringLiteral": tags.string,
    ":": tags.punctuation,
    "PseudoOp #": tags.derefOperator,
    "; ,": tags.separator,
    "( )": tags.paren,
    "[ ]": tags.squareBracket,
    "{ }": tags.brace
  });
  var spec_callee = { __proto__: null, lang: 38, "nth-child": 38, "nth-last-child": 38, "nth-of-type": 38, "nth-last-of-type": 38, dir: 38, "host-context": 38, if: 84, url: 124, "url-prefix": 124, domain: 124, regexp: 124 };
  var spec_queryIdentifier = { __proto__: null, or: 98, and: 98, not: 106, only: 106, layer: 170 };
  var spec_QueryCallee = { __proto__: null, selector: 112, layer: 166 };
  var spec_AtKeyword = { __proto__: null, "@import": 162, "@media": 174, "@charset": 178, "@namespace": 182, "@keyframes": 188, "@supports": 200, "@scope": 204 };
  var spec_identifier2 = { __proto__: null, to: 207 };
  var parser3 = LRParser.deserialize({
    version: 14,
    states: "EbQYQdOOO#qQdOOP#xO`OOOOQP'#Cf'#CfOOQP'#Ce'#CeO#}QdO'#ChO$nQaO'#CcO$xQdO'#CkO%TQdO'#DpO%YQdO'#DrO%_QdO'#DuO%_QdO'#DxOOQP'#FV'#FVO&eQhO'#EhOOQS'#FU'#FUOOQS'#Ek'#EkQYQdOOO&lQdO'#EOO&PQhO'#EUO&lQdO'#EWO'aQdO'#EYO'lQdO'#E]O'tQhO'#EcO(VQdO'#EeO(bQaO'#CfO)VQ`O'#D{O)[Q`O'#F`O)gQdO'#F`QOQ`OOP)qO&jO'#CaPOOO)C@t)C@tOOQP'#Cj'#CjOOQP,59S,59SO#}QdO,59SO)|QdO,59VO%TQdO,5:[O%YQdO,5:^O%_QdO,5:aO%_QdO,5:cO%_QdO,5:dO%_QdO'#ErO*XQ`O,58}O*aQdO'#DzOOQS,58},58}OOQP'#Cn'#CnOOQO'#Dn'#DnOOQP,59V,59VO*hQ`O,59VO*mQ`O,59VOOQP'#Dq'#DqOOQP,5:[,5:[OOQO'#Ds'#DsO*rQpO,5:^O+]QaO,5:aO+sQaO,5:dOOQW'#DZ'#DZO,ZQhO'#DdO,xQhO'#FaO'tQhO'#DbO-WQ`O'#DhOOQW'#F['#F[O-]Q`O,5;SO-eQ`O'#DeOOQS-E8i-E8iOOQ['#Cs'#CsO-jQdO'#CtO.QQdO'#CzO.hQdO'#C}O/OQ!pO'#DPO1RQ!jO,5:jOOQO'#DU'#DUO*mQ`O'#DTO1cQ!nO'#FXO3`Q`O'#DVO3eQ`O'#DkOOQ['#FX'#FXO-`Q`O,5:pO3jQ!bO,5:rOOQS'#E['#E[O3rQ`O,5:tO3wQdO,5:tOOQO'#E_'#E_O4PQ`O,5:wO4UQhO,5:}O%_QdO'#DgOOQS,5;P,5;PO-eQ`O,5;PO4^QdO,5;PO4fQdO,5:gO4vQdO'#EtO5TQ`O,5;zO5TQ`O,5;zPOOO'#Ej'#EjP5`O&jO,58{POOO,58{,58{OOQP1G.n1G.nOOQP1G.q1G.qO*hQ`O1G.qO*mQ`O1G.qOOQP1G/v1G/vO5kQpO1G/xO5sQaO1G/{O6ZQaO1G/}O6qQaO1G0OO7XQaO,5;^OOQO-E8p-E8pOOQS1G.i1G.iO7cQ`O,5:fO7hQdO'#DoO7oQdO'#CrOOQP1G/x1G/xO&lQdO1G/xO7vQ!jO'#DZO8UQ!bO,59vO8^QhO,5:OOOQO'#F]'#F]O8XQ!bO,59zO'tQhO,59xO8fQhO'#EvO8sQ`O,5;{O9OQhO,59|O9uQhO'#DiOOQW,5:S,5:SOOQS1G0n1G0nOOQW,5:P,5:PO9|Q!fO'#FYOOQS'#FY'#FYOOQS'#Em'#EmO;^QdO,59`OOQ[,59`,59`O;tQdO,59fOOQ[,59f,59fO<[QdO,59iOOQ[,59i,59iOOQ[,59k,59kO&lQdO,59mO<rQhO'#EQOOQW'#EQ'#EQO=WQ`O1G0UO1[QhO1G0UOOQ[,59o,59oO'tQhO'#DXOOQ[,59q,59qO=]Q#tO,5:VOOQS1G0[1G0[OOQS1G0^1G0^OOQS1G0`1G0`O=hQ`O1G0`O=mQdO'#E`OOQS1G0c1G0cOOQS1G0i1G0iO=xQaO,5:RO-`Q`O1G0kOOQS1G0k1G0kO-eQ`O1G0kO>PQ!fO1G0ROOQO1G0R1G0ROOQO,5;`,5;`O>gQdO,5;`OOQO-E8r-E8rO>tQ`O1G1fPOOO-E8h-E8hPOOO1G.g1G.gOOQP7+$]7+$]OOQP7+%d7+%dO&lQdO7+%dOOQS1G0Q1G0QO?PQaO'#F_O?ZQ`O,5:ZO?`Q!fO'#ElO@^QdO'#FWO@hQ`O,59^O@mQ!bO7+%dO&lQdO1G/bO@uQhO1G/fOOQW1G/j1G/jOOQW1G/d1G/dOAWQhO,5;bOOQO-E8t-E8tOAfQhO'#DZOAtQhO'#F^OBPQ`O'#F^OBUQ`O,5:TOOQS-E8k-E8kOOQ[1G.z1G.zOOQ[1G/Q1G/QOOQ[1G/T1G/TOOQ[1G/X1G/XOBZQdO,5:lOOQS7+%p7+%pOB`Q`O7+%pOBeQhO'#DYOBmQ`O,59sO'tQhO,59sOOQ[1G/q1G/qOBuQ`O1G/qOOQS7+%z7+%zOBzQbO'#DPOOQO'#Eb'#EbOCYQ`O'#EaOOQO'#Ea'#EaOCeQ`O'#EwOCmQdO,5:zOOQS,5:z,5:zOOQ[1G/m1G/mOOQS7+&V7+&VO-`Q`O7+&VOCxQ!fO'#EsO&lQdO'#EsOEPQdO7+%mOOQO7+%m7+%mOOQO1G0z1G0zOEdQ!bO<<IOOElQdO'#EqOEvQ`O,5;yOOQP1G/u1G/uOOQS-E8j-E8jOFOQdO'#EpOFYQ`O,5;rOOQ]1G.x1G.xOOQP<<IO<<IOOFbQdO7+$|OOQO'#D]'#D]OFiQ!bO7+%QOFqQhO'#EoOF{Q`O,5;xO&lQdO,5;xOOQW1G/o1G/oOOQO'#ES'#ESOGTQ`O1G0WOOQS<<I[<<I[O&lQdO,59tOGnQhO1G/_OOQ[1G/_1G/_OGuQ`O1G/_OOQW-E8l-E8lOOQ[7+%]7+%]OOQO,5:{,5:{O=pQdO'#ExOCeQ`O,5;cOOQS,5;c,5;cOOQS-E8u-E8uOOQS1G0f1G0fOOQS<<Iq<<IqOG}Q!fO,5;_OOQS-E8q-E8qOOQO<<IX<<IXOOQPAN>jAN>jOIUQaO,5;]OOQO-E8o-E8oOI`QdO,5;[OOQO-E8n-E8nOOQW<<Hh<<HhOOQW<<Hl<<HlOIjQhO<<HlOI{QhO,5;ZOJWQ`O,5;ZOOQO-E8m-E8mOJ]QdO1G1dOBZQdO'#EuOJgQ`O7+%rOOQW7+%r7+%rOJoQ!bO1G/`OOQ[7+$y7+$yOJzQhO7+$yPKRQ`O'#EnOOQO,5;d,5;dOOQO-E8v-E8vOOQS1G0}1G0}OKWQ`OAN>WO&lQdO1G0uOK]Q`O7+'OOOQO,5;a,5;aOOQO-E8s-E8sOOQW<<I^<<I^OOQ[<<He<<HePOQW,5;Y,5;YOOQWG23rG23rOKeQdO7+&a",
    stateData: "Kx~O#sOS#tQQ~OW[OZ[O]TO`VOaVOi]OjWOmXO!jYO!mZO!saO!ybO!{cO!}dO#QeO#WfO#YgO#oRO~OQiOW[OZ[O]TO`VOaVOi]OjWOmXO!jYO!mZO!saO!ybO!{cO!}dO#QeO#WfO#YgO#ohO~O#m$SP~P!dO#tmO~O#ooO~O]qO`rOarOjsOmtO!juO!mwO#nvO~OpzO!^xO~P$SOc!QO#o|O#p}O~O#o!RO~O#o!TO~OW[OZ[O]TO`VOaVOjWOmXO!jYO!mZO#oRO~OS!]Oe!YO!V![O!Y!`O#q!XOp$TP~Ok$TP~P&POQ!jOe!cOm!dOp!eOr!mOt!mOz!kO!`!lO#o!bO#p!hO#}!fO~Ot!qO!`!lO#o!pO~Ot!sO#o!sO~OS!]Oe!YO!V![O!Y!`O#q!XO~Oe!vOpzO#Z!xO~O]YX`YX`!pXaYXjYXmYXpYX!^YX!jYX!mYX#nYX~O`!zO~Ok!{O#m$SXo$SX~O#m$SXo$SX~P!dO#u#OO#v#OO#w#QO~Oc#UO#o|O#p}O~OpzO!^xO~Oo$SP~P!dOe#`O~Oe#aO~Ol#bO!h#cO~O]qO`rOarOjsOmtO~Op!ia!^!ia!j!ia!m!ia#n!iad!ia~P*zOp!la!^!la!j!la!m!la#n!lad!la~P*zOR#gOS!]Oe!YOr#gOt#gO!V![O!Y!`O#q#dO#}!fO~O!R#iO!^#jOk$TXp$TX~Oe#mO~Ok#oOpzO~Oe!vO~O]#rO`#rOd#uOi#rOj#rOk#rO~P&lO]#rO`#rOi#rOj#rOk#rOl#wO~P&lO]#rO`#rOi#rOj#rOk#rOo#yO~P&lOP#zOSsXesXksXvsX!VsX!YsX!usX!wsX#qsX!TsXQsX]sX`sXdsXisXjsXmsXpsXrsXtsXzsX!`sX#osX#psX#}sXlsXosX!^sX!qsX#msX~Ov#{O!u#|O!w#}Ok$TP~P'tOe#aOS#{Xk#{Xv#{X!V#{X!Y#{X!u#{X!w#{X#q#{XQ#{X]#{X`#{Xd#{Xi#{Xj#{Xm#{Xp#{Xr#{Xt#{Xz#{X!`#{X#o#{X#p#{X#}#{Xl#{Xo#{X!^#{X!q#{X#m#{X~Oe$RO~Oe$TO~Ok$VOv#{O~Ok$WO~Ot$XO!`!lO~Op$YO~OpzO!R#iO~OpzO#Z$`O~O!q$bOk!oa#m!oao!oa~P&lOk#hX#m#hXo#hX~P!dOk!{O#m$Sao$Sa~O#u#OO#v#OO#w$hO~Ol$jO!h$kO~Op!ii!^!ii!j!ii!m!ii#n!iid!ii~P*zOp!ki!^!ki!j!ki!m!ki#n!kid!ki~P*zOp!li!^!li!j!li!m!li#n!lid!li~P*zOp#fa!^#fa~P$SOo$lO~Od$RP~P%_Od#zP~P&lO`!PXd}X!R}X!T!PX~O`$sO!T$tO~Od$uO!R#iO~Ok#jXp#jX!^#jX~P'tO!^#jOk$Tap$Ta~O!R#iOk!Uap!Ua!^!Uad!Ua`!Ua~OS!]Oe!YO!V![O!Y!`O#q$yO~Od$QP~P9dOv#{OQ#|X]#|X`#|Xd#|Xe#|Xi#|Xj#|Xk#|Xm#|Xp#|Xr#|Xt#|Xz#|X!`#|X#o#|X#p#|X#}#|Xl#|Xo#|X~O]#rO`#rOd%OOi#rOj#rOk#rO~P&lO]#rO`#rOi#rOj#rOk#rOl%PO~P&lO]#rO`#rOi#rOj#rOk#rOo%QO~P&lOe%SOS!tXk!tX!V!tX!Y!tX#q!tX~Ok%TO~Od%YOt%ZO!a%ZO~Ok%[O~Oo%cO#o%^O#}%]O~Od%dO~P$SOv#{O!^%hO!q%jOk!oi#m!oio!oi~P&lOk#ha#m#hao#ha~P!dOk!{O#m$Sio$Si~O!^%mOd$RX~P$SOd%oO~Ov#{OQ#`Xd#`Xe#`Xm#`Xp#`Xr#`Xt#`Xz#`X!^#`X!`#`X#o#`X#p#`X#}#`X~O!^%qOd#zX~P&lOd%sO~Ol%tOv#{O~OR#gOr#gOt#gO#q%vO#}!fO~O!R#iOk#jap#ja!^#ja~O`!PXd}X!R}X!^}X~O!R#iO!^%xOd$QX~O`%zO~Od%{O~O#o%|O~Ok&OO~O`&PO!R#iO~Od&ROk&QO~Od&UO~OP#zOpsX!^sXdsX~O#}%]Op#TX!^#TX~OpzO!^&WO~Oo&[O#o%^O#}%]O~Ov#{OQ#gXe#gXk#gXm#gXp#gXr#gXt#gXz#gX!^#gX!`#gX!q#gX#m#gX#o#gX#p#gX#}#gXo#gX~O!^%hO!q&`Ok!oq#m!oqo!oq~P&lOl&aOv#{O~Od#eX!^#eX~P%_O!^%mOd$Ra~Od#dX!^#dX~P&lO!^%qOd#za~Od&fO~P&lOd&gO!T&hO~Od#cX!^#cX~P9dO!^%xOd$Qa~O]&mOd&oO~OS#bae#ba!V#ba!Y#ba#q#ba~Od&qO~PG]Od&qOk&rO~Ov#{OQ#gae#gak#gam#gap#gar#gat#gaz#ga!^#ga!`#ga!q#ga#m#ga#o#ga#p#ga#}#gao#ga~Od#ea!^#ea~P$SOd#da!^#da~P&lOR#gOr#gOt#gO#q%vO#}%]O~O!R#iOd#ca!^#ca~O`&xO~O!^%xOd$Qi~P&lO]&mOd&|O~Ov#{Od|ik|i~Od&}O~PG]Ok'OO~Od'PO~O!^%xOd$Qq~Od#cq!^#cq~P&lO#s!a#t#}]#}v!m~",
    goto: "2h$UPPPPP$VP$YP$c$uP$cP%X$cPP%_PPP%e%o%oPPPPP%oPP%oP&]P%oP%o'W%oP't'w'}'}(^'}P'}P'}P'}'}P(m'}(yP(|PP)p)v$c)|$c*SP$cP$c$cP*Y*{+YP$YP+aP+dP$YP$YP$YP+j$YP+m+p+s+z$YP$YPP$YP,P,V,f,|-[-b-l-r-x.O.U.`.f.l.rPPPPPPPPPPP.x/R/w/z0|P1U1u2O2R2U2[RnQ_^OP`kz!{$dq[OPYZ`kuvwxz!v!{#`$d%mqSOPYZ`kuvwxz!v!{#`$d%mQpTR#RqQ!OVR#SrQ#S!QS$Q!i!jR$i#U!V!mac!c!d!e!z#a#c#t#v#x#{$a$k$p$s%h%i%q%u%z&P&d&l&x'Q!U!mac!c!d!e!z#a#c#t#v#x#{$a$k$p$s%h%i%q%u%z&P&d&l&x'QU#g!Y$t&hU%`$Y%b&WR&V%_!V!iac!c!d!e!z#a#c#t#v#x#{$a$k$p$s%h%i%q%u%z&P&d&l&x'QR$S!kQ%W$RR&S%Xk!^]bf!Y![!g#i#j#m$P$R%X%xQ#e!YQ${#mQ%w$tQ&j%xR&w&hQ!ygQ#p!`Q$^!xR%f$`R#n!]!U!mac!c!d!e!z#a#c#t#v#x#{$a$k$p$s%h%i%q%u%z&P&d&l&x'QQ!qdR$X!rQ!PVR#TrQ#S!PR$i#TQ!SWR#VsQ!UXR#WtQ{UQ!wgQ#^yQ#o!_Q$U!nQ$[!uQ$_!yQ%e$^Q&Y%aQ&]%fR&v&XSjPzQ!}kQ$c!{R%k$dZiPkz!{$dR$P!gQ%}%SR&z&mR!rdR!teR$Z!tS%a$Y%bR&t&WV%_$Y%b&WQ#PmR$g#PQ`OSkPzU!a`k$dR$d!{Q$p#aY%p$p%u&d&l'QQ%u$sQ&d%qQ&l%zR'Q&xQ#t!cQ#v!dQ#x!eV$}#t#v#xQ%X$RR&T%XQ%y$zS&k%y&yR&y&lQ%r$pR&e%rQ%n$mR&c%nQyUR#]yQ%i$aR&_%iQ!|jS$e!|$fR$f!}Q&n%}R&{&nQ#k!ZR$x#kQ%b$YR&Z%bQ&X%aR&u&X__OP`kz!{$d^UOP`kz!{$dQ!VYQ!WZQ#XuQ#YvQ#ZwQ#[xQ$]!vQ$m#`R&b%mR$q#aQ!gaQ!oc[#q!c!d!e#t#v#xQ$a!zd$o#a$p$s%q%u%z&d&l&x'QQ$r#cQ%R#{S%g$a%iQ%l$kQ&^%hR&p&P]#s!c!d!e#t#v#xW!Z]b!g$PQ!ufQ#f!YQ#l![Q$v#iQ$w#jQ$z#mS%V$R%XR&i%xQ#h!YQ%w$tR&w&hR$|#mR$n#`QlPR#_zQ!_]Q!nbQ$O!gR%U$P",
    nodeNames: "\u26A0 Unit VariableName VariableName QueryCallee Comment StyleSheet RuleSet UniversalSelector TagSelector TagName NestingSelector ClassSelector . ClassName PseudoClassSelector : :: PseudoClassName PseudoClassName ) ( ArgList ValueName ParenthesizedValue AtKeyword # ; ] [ BracketedValue } { BracedValue ColorLiteral NumberLiteral StringLiteral BinaryExpression BinOp CallExpression Callee IfExpression if ArgList IfBranch KeywordQuery FeatureQuery FeatureName BinaryQuery LogicOp ComparisonQuery CompareOp UnaryQuery UnaryQueryOp ParenthesizedQuery SelectorQuery selector ParenthesizedSelector CallQuery ArgList , CallLiteral CallTag ParenthesizedContent PseudoClassName ArgList IdSelector IdName AttributeSelector AttributeName MatchOp ChildSelector ChildOp DescendantSelector SiblingSelector SiblingOp Block Declaration PropertyName Important ImportStatement import Layer layer LayerName layer MediaStatement media CharsetStatement charset NamespaceStatement namespace NamespaceName KeyframesStatement keyframes KeyframeName KeyframeList KeyframeSelector KeyframeRangeName SupportsStatement supports ScopeStatement scope to AtRule Styles",
    maxTerm: 143,
    nodeProps: [
      ["isolate", -2, 5, 36, ""],
      ["openedBy", 20, "(", 28, "[", 31, "{"],
      ["closedBy", 21, ")", 29, "]", 32, "}"]
    ],
    propSources: [cssHighlighting],
    skippedNodes: [0, 5, 106],
    repeatNodeCount: 15,
    tokenData: "JQ~R!YOX$qX^%i^p$qpq%iqr({rs-ust/itu6Wuv$qvw7Qwx7cxy9Qyz9cz{9h{|:R|}>t}!O?V!O!P?t!P!Q@]!Q![AU![!]BP!]!^B{!^!_C^!_!`DY!`!aDm!a!b$q!b!cEn!c!}$q!}#OG{#O#P$q#P#QH^#Q#R6W#R#o$q#o#pHo#p#q6W#q#rIQ#r#sIc#s#y$q#y#z%i#z$f$q$f$g%i$g#BY$q#BY#BZ%i#BZ$IS$q$IS$I_%i$I_$I|$q$I|$JO%i$JO$JT$q$JT$JU%i$JU$KV$q$KV$KW%i$KW&FU$q&FU&FV%i&FV;'S$q;'S;=`Iz<%lO$q`$tSOy%Qz;'S%Q;'S;=`%c<%lO%Q`%VS!a`Oy%Qz;'S%Q;'S;=`%c<%lO%Q`%fP;=`<%l%Q~%nh#s~OX%QX^'Y^p%Qpq'Yqy%Qz#y%Q#y#z'Y#z$f%Q$f$g'Y$g#BY%Q#BY#BZ'Y#BZ$IS%Q$IS$I_'Y$I_$I|%Q$I|$JO'Y$JO$JT%Q$JT$JU'Y$JU$KV%Q$KV$KW'Y$KW&FU%Q&FU&FV'Y&FV;'S%Q;'S;=`%c<%lO%Q~'ah#s~!a`OX%QX^'Y^p%Qpq'Yqy%Qz#y%Q#y#z'Y#z$f%Q$f$g'Y$g#BY%Q#BY#BZ'Y#BZ$IS%Q$IS$I_'Y$I_$I|%Q$I|$JO'Y$JO$JT%Q$JT$JU'Y$JU$KV%Q$KV$KW'Y$KW&FU%Q&FU&FV'Y&FV;'S%Q;'S;=`%c<%lO%Qj)OUOy%Qz#]%Q#]#^)b#^;'S%Q;'S;=`%c<%lO%Qj)gU!a`Oy%Qz#a%Q#a#b)y#b;'S%Q;'S;=`%c<%lO%Qj*OU!a`Oy%Qz#d%Q#d#e*b#e;'S%Q;'S;=`%c<%lO%Qj*gU!a`Oy%Qz#c%Q#c#d*y#d;'S%Q;'S;=`%c<%lO%Qj+OU!a`Oy%Qz#f%Q#f#g+b#g;'S%Q;'S;=`%c<%lO%Qj+gU!a`Oy%Qz#h%Q#h#i+y#i;'S%Q;'S;=`%c<%lO%Qj,OU!a`Oy%Qz#T%Q#T#U,b#U;'S%Q;'S;=`%c<%lO%Qj,gU!a`Oy%Qz#b%Q#b#c,y#c;'S%Q;'S;=`%c<%lO%Qj-OU!a`Oy%Qz#h%Q#h#i-b#i;'S%Q;'S;=`%c<%lO%Qj-iS!qY!a`Oy%Qz;'S%Q;'S;=`%c<%lO%Q~-xWOY-uZr-urs.bs#O-u#O#P.g#P;'S-u;'S;=`/c<%lO-u~.gOt~~.jRO;'S-u;'S;=`.s;=`O-u~.vXOY-uZr-urs.bs#O-u#O#P.g#P;'S-u;'S;=`/c;=`<%l-u<%lO-u~/fP;=`<%l-uj/nYjYOy%Qz!Q%Q!Q![0^![!c%Q!c!i0^!i#T%Q#T#Z0^#Z;'S%Q;'S;=`%c<%lO%Qj0cY!a`Oy%Qz!Q%Q!Q![1R![!c%Q!c!i1R!i#T%Q#T#Z1R#Z;'S%Q;'S;=`%c<%lO%Qj1WY!a`Oy%Qz!Q%Q!Q![1v![!c%Q!c!i1v!i#T%Q#T#Z1v#Z;'S%Q;'S;=`%c<%lO%Qj1}YrY!a`Oy%Qz!Q%Q!Q![2m![!c%Q!c!i2m!i#T%Q#T#Z2m#Z;'S%Q;'S;=`%c<%lO%Qj2tYrY!a`Oy%Qz!Q%Q!Q![3d![!c%Q!c!i3d!i#T%Q#T#Z3d#Z;'S%Q;'S;=`%c<%lO%Qj3iY!a`Oy%Qz!Q%Q!Q![4X![!c%Q!c!i4X!i#T%Q#T#Z4X#Z;'S%Q;'S;=`%c<%lO%Qj4`YrY!a`Oy%Qz!Q%Q!Q![5O![!c%Q!c!i5O!i#T%Q#T#Z5O#Z;'S%Q;'S;=`%c<%lO%Qj5TY!a`Oy%Qz!Q%Q!Q![5s![!c%Q!c!i5s!i#T%Q#T#Z5s#Z;'S%Q;'S;=`%c<%lO%Qj5zSrY!a`Oy%Qz;'S%Q;'S;=`%c<%lO%Qd6ZUOy%Qz!_%Q!_!`6m!`;'S%Q;'S;=`%c<%lO%Qd6tS!hS!a`Oy%Qz;'S%Q;'S;=`%c<%lO%Qb7VSZQOy%Qz;'S%Q;'S;=`%c<%lO%Q~7fWOY7cZw7cwx.bx#O7c#O#P8O#P;'S7c;'S;=`8z<%lO7c~8RRO;'S7c;'S;=`8[;=`O7c~8_XOY7cZw7cwx.bx#O7c#O#P8O#P;'S7c;'S;=`8z;=`<%l7c<%lO7c~8}P;=`<%l7cj9VSeYOy%Qz;'S%Q;'S;=`%c<%lO%Q~9hOd~n9oUWQvWOy%Qz!_%Q!_!`6m!`;'S%Q;'S;=`%c<%lO%Qj:YWvW!mQOy%Qz!O%Q!O!P:r!P!Q%Q!Q![=w![;'S%Q;'S;=`%c<%lO%Qj:wU!a`Oy%Qz!Q%Q!Q![;Z![;'S%Q;'S;=`%c<%lO%Qj;bY!a`#}YOy%Qz!Q%Q!Q![;Z![!g%Q!g!h<Q!h#X%Q#X#Y<Q#Y;'S%Q;'S;=`%c<%lO%Qj<VY!a`Oy%Qz{%Q{|<u|}%Q}!O<u!O!Q%Q!Q![=^![;'S%Q;'S;=`%c<%lO%Qj<zU!a`Oy%Qz!Q%Q!Q![=^![;'S%Q;'S;=`%c<%lO%Qj=eU!a`#}YOy%Qz!Q%Q!Q![=^![;'S%Q;'S;=`%c<%lO%Qj>O[!a`#}YOy%Qz!O%Q!O!P;Z!P!Q%Q!Q![=w![!g%Q!g!h<Q!h#X%Q#X#Y<Q#Y;'S%Q;'S;=`%c<%lO%Qj>yS!^YOy%Qz;'S%Q;'S;=`%c<%lO%Qj?[WvWOy%Qz!O%Q!O!P:r!P!Q%Q!Q![=w![;'S%Q;'S;=`%c<%lO%Qj?yU]YOy%Qz!Q%Q!Q![;Z![;'S%Q;'S;=`%c<%lO%Q~@bTvWOy%Qz{@q{;'S%Q;'S;=`%c<%lO%Q~@xS!a`#t~Oy%Qz;'S%Q;'S;=`%c<%lO%QjAZ[#}YOy%Qz!O%Q!O!P;Z!P!Q%Q!Q![=w![!g%Q!g!h<Q!h#X%Q#X#Y<Q#Y;'S%Q;'S;=`%c<%lO%QjBUU`YOy%Qz![%Q![!]Bh!];'S%Q;'S;=`%c<%lO%QbBoSaQ!a`Oy%Qz;'S%Q;'S;=`%c<%lO%QjCQSkYOy%Qz;'S%Q;'S;=`%c<%lO%QhCcU!TWOy%Qz!_%Q!_!`Cu!`;'S%Q;'S;=`%c<%lO%QhC|S!TW!a`Oy%Qz;'S%Q;'S;=`%c<%lO%QlDaS!TW!hSOy%Qz;'S%Q;'S;=`%c<%lO%QjDtV!jQ!TWOy%Qz!_%Q!_!`Cu!`!aEZ!a;'S%Q;'S;=`%c<%lO%QbEbS!jQ!a`Oy%Qz;'S%Q;'S;=`%c<%lO%QjEqYOy%Qz}%Q}!OFa!O!c%Q!c!}GO!}#T%Q#T#oGO#o;'S%Q;'S;=`%c<%lO%QjFfW!a`Oy%Qz!c%Q!c!}GO!}#T%Q#T#oGO#o;'S%Q;'S;=`%c<%lO%QjGV[iY!a`Oy%Qz}%Q}!OGO!O!Q%Q!Q![GO![!c%Q!c!}GO!}#T%Q#T#oGO#o;'S%Q;'S;=`%c<%lO%QjHQSmYOy%Qz;'S%Q;'S;=`%c<%lO%QnHcSl^Oy%Qz;'S%Q;'S;=`%c<%lO%QjHtSpYOy%Qz;'S%Q;'S;=`%c<%lO%QjIVSoYOy%Qz;'S%Q;'S;=`%c<%lO%QfIhU!mQOy%Qz!_%Q!_!`6m!`;'S%Q;'S;=`%c<%lO%Q`I}P;=`<%l$q",
    tokenizers: [descendant, unitToken, identifiers, queryIdentifiers, 1, 2, 3, 4, new LocalTokenGroup("m~RRYZ[z{a~~g~aO#v~~dP!P!Qg~lO#w~~", 28, 129)],
    topRules: { "StyleSheet": [0, 6], "Styles": [1, 105] },
    specialized: [{ term: 124, get: (value) => spec_callee[value] || -1 }, { term: 125, get: (value) => spec_queryIdentifier[value] || -1 }, { term: 4, get: (value) => spec_QueryCallee[value] || -1 }, { term: 25, get: (value) => spec_AtKeyword[value] || -1 }, { term: 123, get: (value) => spec_identifier2[value] || -1 }],
    tokenPrec: 1963
  });

  // node_modules/@lezer/cpp/dist/index.js
  var RawString = 1;
  var templateArgsEndFallback = 2;
  var MacroName = 3;
  var R = 82;
  var L = 76;
  var u = 117;
  var U = 85;
  var a = 97;
  var z = 122;
  var A = 65;
  var Z = 90;
  var Underscore = 95;
  var Zero = 48;
  var Quote = 34;
  var ParenL = 40;
  var ParenR = 41;
  var Space = 32;
  var GreaterThan = 62;
  var rawString = new ExternalTokenizer((input) => {
    if (input.next == L || input.next == U) {
      input.advance();
    } else if (input.next == u) {
      input.advance();
      if (input.next == Zero + 8) input.advance();
    }
    if (input.next != R) return;
    input.advance();
    if (input.next != Quote) return;
    input.advance();
    let marker = "";
    while (input.next != ParenL) {
      if (input.next == Space || input.next <= 13 || input.next == ParenR) return;
      marker += String.fromCharCode(input.next);
      input.advance();
    }
    input.advance();
    for (; ; ) {
      if (input.next < 0)
        return input.acceptToken(RawString);
      if (input.next == ParenR) {
        let match = true;
        for (let i = 0; match && i < marker.length; i++)
          if (input.peek(i + 1) != marker.charCodeAt(i)) match = false;
        if (match && input.peek(marker.length + 1) == Quote)
          return input.acceptToken(RawString, 2 + marker.length);
      }
      input.advance();
    }
  });
  var fallback = new ExternalTokenizer((input) => {
    if (input.next == GreaterThan) {
      if (input.peek(1) == GreaterThan)
        input.acceptToken(templateArgsEndFallback, 1);
    } else {
      let sawLetter = false, i = 0;
      for (; ; i++) {
        if (input.next >= A && input.next <= Z) sawLetter = true;
        else if (input.next >= a && input.next <= z) return;
        else if (input.next != Underscore && !(input.next >= Zero && input.next <= Zero + 9)) break;
        input.advance();
      }
      if (sawLetter && i > 1) input.acceptToken(MacroName);
    }
  }, { extend: true });
  var cppHighlighting = styleTags({
    "typedef struct union enum class typename decltype auto template operator friend noexcept namespace using requires concept import export module __attribute__ __declspec __based": tags.definitionKeyword,
    "extern MsCallModifier MsPointerModifier extern static register thread_local inline const volatile restrict _Atomic mutable constexpr constinit consteval virtual explicit VirtualSpecifier Access": tags.modifier,
    "if else switch for while do case default return break continue goto throw try catch": tags.controlKeyword,
    "co_return co_yield co_await": tags.controlKeyword,
    "new sizeof delete static_assert": tags.operatorKeyword,
    "NULL nullptr": tags.null,
    this: tags.self,
    "True False": tags.bool,
    "TypeSize PrimitiveType": tags.standard(tags.typeName),
    TypeIdentifier: tags.typeName,
    FieldIdentifier: tags.propertyName,
    "CallExpression/FieldExpression/FieldIdentifier": tags.function(tags.propertyName),
    "ModuleName/Identifier": tags.namespace,
    "PartitionName": tags.labelName,
    StatementIdentifier: tags.labelName,
    "Identifier DestructorName": tags.variableName,
    "CallExpression/Identifier": tags.function(tags.variableName),
    "CallExpression/ScopedIdentifier/Identifier": tags.function(tags.variableName),
    "FunctionDeclarator/Identifier FunctionDeclarator/DestructorName": tags.function(tags.definition(tags.variableName)),
    NamespaceIdentifier: tags.namespace,
    OperatorName: tags.operator,
    ArithOp: tags.arithmeticOperator,
    LogicOp: tags.logicOperator,
    BitOp: tags.bitwiseOperator,
    CompareOp: tags.compareOperator,
    AssignOp: tags.definitionOperator,
    UpdateOp: tags.updateOperator,
    LineComment: tags.lineComment,
    BlockComment: tags.blockComment,
    Number: tags.number,
    String: tags.string,
    "RawString SystemLibString": tags.special(tags.string),
    CharLiteral: tags.character,
    EscapeSequence: tags.escape,
    "UserDefinedLiteral/Identifier": tags.literal,
    PreProcArg: tags.meta,
    "PreprocDirectiveName #include #ifdef #ifndef #if #define #else #endif #elif": tags.processingInstruction,
    MacroName: tags.special(tags.name),
    "( )": tags.paren,
    "[ ]": tags.squareBracket,
    "{ }": tags.brace,
    "< >": tags.angleBracket,
    ". ->": tags.derefOperator,
    ", ;": tags.separator
  });
  var spec_identifier3 = { __proto__: null, bool: 36, char: 36, int: 36, float: 36, double: 36, void: 36, size_t: 36, ssize_t: 36, intptr_t: 36, uintptr_t: 36, charptr_t: 36, int8_t: 36, int16_t: 36, int32_t: 36, int64_t: 36, uint8_t: 36, uint16_t: 36, uint32_t: 36, uint64_t: 36, char8_t: 36, char16_t: 36, char32_t: 36, char64_t: 36, const: 70, volatile: 72, restrict: 74, _Atomic: 76, mutable: 78, constexpr: 80, constinit: 82, consteval: 84, struct: 88, __declspec: 92, final: 148, override: 148, public: 152, private: 152, protected: 152, virtual: 154, extern: 160, static: 162, register: 164, inline: 166, thread_local: 168, __attribute__: 172, __based: 178, __restrict: 180, __uptr: 180, __sptr: 180, _unaligned: 180, __unaligned: 180, noexcept: 194, requires: 198, TRUE: 796, true: 796, FALSE: 798, false: 798, typename: 218, class: 220, template: 234, throw: 248, __cdecl: 256, __clrcall: 256, __stdcall: 256, __fastcall: 256, __thiscall: 256, __vectorcall: 256, try: 260, catch: 264, export: 282, import: 286, case: 296, default: 298, if: 308, else: 314, switch: 318, do: 322, while: 324, for: 330, return: 334, break: 338, continue: 342, goto: 346, co_return: 350, co_yield: 354, using: 362, typedef: 366, namespace: 380, new: 398, delete: 400, co_await: 402, concept: 406, enum: 410, static_assert: 414, friend: 422, union: 424, explicit: 430, operator: 444, module: 456, signed: 518, unsigned: 518, long: 518, short: 518, decltype: 528, auto: 530, sizeof: 566, NULL: 572, nullptr: 586, this: 588 };
  var spec_ = { __proto__: null, "<": 765 };
  var spec_templateArgsEnd = { __proto__: null, ">": 135 };
  var spec_scopedIdentifier = { __proto__: null, operator: 388, new: 576, delete: 582 };
  var parser4 = LRParser.deserialize({
    version: 14,
    states: "$;xQ!QQVOOP'gOUOOO([OWO'#CdO,UQUO'#CgO,`QUO'#FjO-vQbO'#CxO.XQUO'#CxO0WQUO'#K`O0_QUO'#CwO0jOpO'#DvO0rQ!dO'#D]OOQR'#JP'#JPO5[QVO'#GUO5iQUO'#JWOOQQ'#JW'#JWO8}QUO'#KsO<hQUO'#KsO?OQVO'#E^O?`QUO'#E^OOQQ'#Ed'#EdOOQQ'#Ee'#EeO?eQVO'#EfO@[QVO'#EiOBXQUO'#FPOByQUO'#FhOOQR'#Fj'#FjOCOQUO'#FjOOQR'#LW'#LWOOQR'#LV'#LVOEWQVO'#KVOF{QUO'#L]OGYQUO'#KwOGnQUO'#L]OH`QUO'#L_OOQR'#HU'#HUOOQR'#HV'#HVOOQR'#HW'#HWOOQR'#LS'#LSOOQR'#J`'#J`Q!QQVOOOHnQVO'#FOOIZQUO'#EhOIbQUOOOK^QVO'#HgOKnQUO'#HgONYQUO'#KwONdQUO'#KwOOQQ'#Kw'#KwO!!bQUO'#KwOOQQ'#Jr'#JrO!!oQUO'#HxOOQQ'#K`'#K`O!&aQUO'#K`O!&}QUO'#KVO!(}QVO'#I]O!(}QVO'#I`OCTQUO'#KVOOQQ'#Ip'#IpOOQQ'#KV'#KVO!-QQUO'#K`OOQR'#K_'#K_O!-XQUO'#DZO!/pQUO'#KtOOQQ'#Kt'#KtO!/wQUO'#KtO!0OQUO'#ETO!0TQUO'#EWO!0YQUO'#FRO8}QUO'#FPO!QQVO'#F^O!0_Q#vO'#F`O!0jQUO'#FkO!0rQUO'#FpO!0wQVO'#FrO!0rQUO'#FuO!3vQUO'#FvO!3{QVO'#FxO!4VQUO'#FzO!4[QUO'#F|O!4aQUO'#GOO!4fQVO'#GQO!(}QVO'#GSO!4mQUO'#GpO!4{QUO'#GYO!(}QVO'#FeO!6YQUO'#FeO!6_QVO'#G`O!6fQUO'#GaO!6qQUO'#GnO!6vQUO'#GrO!6{QUO'#GzO!7mQ&lO'#HiO!:pQUO'#GuO!;QQUO'#HXO!;]QUO'#HZO!;eQUO'#DXO!;eQUO'#HuO!;eQUO'#HvO!;|QUO'#HwO!<_QUO'#H|O!=SQUO'#H}O!>xQVO'#IbO!(}QVO'#IdO!?SQUO'#IgO!?ZQVO'#IjP!AQO!LQO'#CaP!A]{,UO'#CbP!6q{,UO'#CbP!Ah{7[O'#CbP!6q{,UO'#CbP!Am{,UO'#CbP!AxOSO'#IzPOOO)CEo)CEoOOOO'#I}'#I}O!BSOWO,59OOOQR,59O,59OO!(}QVO,59VOOQQ,59X,59XOOQR'#Do'#DoO!(}QVO,5;ROOQR,5<U,5<UO!B_QUO,59ZO!(}QVO,5>qOOQR'#IX'#IXOOQR'#IY'#IYOOQR'#IZ'#IZOOQR'#I['#I[O!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!(}QVO,5>rO!D^QVO,5>zOOQQ,5?W,5?WO!FPQVO'#CjO!IxQUO'#CzOOQQ,59d,59dOOQQ,59c,59cOOQQ,5<},5<}O!JVQ&lO,5=mO!?SQUO,5?RO!LyQVO,5?UO!MQQbO,59dO!M]QVO'#FYOOQQ,5?P,5?PO!MmQVO,59WO!MtO`O,5:bO!MyQbO'#D^O!N[QbO'#KdO!NjQbO,59wO!NrQbO'#CxO# TQUO'#CxO# YQUO'#K`O# dQUO'#CwOOQR-E<}-E<}O# oQUO,5AuO# vQVO'#EfO@[QVO'#EiOBXQUO,5;kOOQR,5<p,5<pO#$oQUO'#KVO#$vQUO'#KVO!(}QVO'#IUO8}QUO,5;kO#%ZQ&lO'#HiO#(bQUO'#CtO#+VQbO'#CxO#+[QUO'#CwO#.xQUO'#K`OOQQ-E=U-E=UO#1]QUO,5A_O#1gQUO'#K`O#1qQUO,5A_OOQR,5Au,5AuOOQQ,5>l,5>lO#3uQUO'#CgO#4kQUO,5>pO#6^QUO'#IeOOQR'#JO'#JOO#6fQUO,5:xO#7SQUO,5:xO#7sQUO,5:xO#8hQUO'#CuO!0TQUO'#CmOOQQ'#JX'#JXO#7SQUO,5:xO#8pQUO,5;QO!4{QUO'#DOO#9yQUO,5;QO#:OQUO,5>QO#;[QUO'#DOO#;rQUO,5>{O#;wQUO'#K}O#=QQUO,5;TO#=YQVO,5;TO#=dQUO,5;TOOQQ,5;T,5;TO#?]QUO'#LbO#?dQUO,5>UO#?iQbO'#CxO#?tQUO'#GcO#?yQUO'#E^O#@jQUO,5;kO#ARQUO'#LTO#AZQUO,5;rOKnQUO'#HfOBXQUO'#HgO#A`QUO'#KwO!6qQUO'#HjO#BWQUO'#CuO!0wQVO,5<SOOQQ'#Cg'#CgOOQR'#Ji'#JiO#B]QVO,5=`OOQQ,5?Z,5?ZO#DfQbO'#CxO#DqQUO'#GcOOQQ'#Jj'#JjOOQQ-E=h-E=hOGYQUO,5AwOGnQUO,5AwO#DvQUO,5AyO#ERQUO'#G|OOQR,5Aw,5AwO#DvQUO,5AwO#E^QUO'#HOO#EfQUO,5AyOOQR,5Ay,5AyOOQR,5Az,5AzO#EtQVO,5AzOOQR-E=^-E=^O#GnQVO,5;jOOQR,5;j,5;jO#IoQUO'#EjO#JtQUO'#EwO#KkQVO'#ExO#M}QUO'#EvO#NVQUO'#EyO$ UQUO'#EzOOQQ'#LQ'#LQO$ {QUO,5;SO$#RQUO'#EvOOQQ,5;S,5;SO$$OQUO,5;SO$%qQUO,5:yO$([QVO,5>PO$(fQUO'#E[O$(sQUO,5>ROOQQ,5>S,5>SO$,aQVO'#C|OOQQ-E=p-E=pOOQQ,5>d,5>dOOQQ,59a,59aO$,kQUO,5>wO$.kQUO,5>zO!6qQUO,59uO$/OQUO,5;qO$/]QUO,5<{O!0TQUO,5:oOOQQ,5:r,5:rO$/hQUO,5;mO$/mQUO'#KsOBXQUO,5;kOOQR,5;x,5;xO$0^QUO'#FbO$0lQUO'#FbO$0qQUO,5;zO$4[QVO'#FmO!0wQVO,5<VO!0rQUO,5<VO!0YQUO,5<[O$4cQVO'#GUO$7_QUO,5<^O!0wQVO,5<aO$:uQVO,5<bO$;SQUO,5<dOOQR,5<d,5<dO$<]QUO,5<dOOQR,5<f,5<fOOQR,5<h,5<hOOQQ'#Fi'#FiO$<bQUO,5<jO$<gQUO,5<lOOQR,5<l,5<lO$=mQUO,5<nO$>sQUO,5<rO$?OQUO,5=[O$?TQUO,5=[O!4{QUO,5<tO$?]QUO,5<tO$?qQUO,5<PO$@wQVO,5<PO$CYQUO,5<zOOQR,5<z,5<zOOQR,5<{,5<{O$?TQUO,5<{O$D`QUO,5<{O$DkQUO,5=YO!(}QVO,5=^O!(}QVO,5=fO#NsQUO,5=mOOQQ,5>T,5>TO$FpQUO,5>TO$FzQUO,5>TO$GPQUO,5>TO$GUQUO,5>TO!6qQUO,5>TO$ISQUO'#K`O$IZQUO,5=oO$IfQUO,5=aOKnQUO,5=oO$J`QUO,5=sOOQR,5=s,5=sO$JhQUO,5=sO$LsQVO'#H[OOQQ,5=u,5=uO!;`QUO,5=uO%#nQUO'#KpO%#uQUO'#KaO%$ZQUO'#KpO%$eQUO'#DyO%$vQUO'#D|O%'sQUO'#KaOOQQ'#Ka'#KaO%)fQUO'#KaO%#uQUO'#KaO%)kQUO'#KaOOQQ,59s,59sOOQQ,5>a,5>aOOQQ,5>b,5>bO%)sQUO'#HzO%){QUO,5>cOOQQ,5>c,5>cO%-gQUO,5>cO%-rQUO,5>hO%1^QVO,5>iO%1eQUO,5>|O# vQVO'#EfO%4kQUO,5>|OOQQ,5>|,5>|O%5[QUO,5?OO%7`QUO,5?RO!<_QUO,5?RO%9[QUO,5?UO%<wQVO,5?UPOOO'#I|'#I|P%=OO!LQO,58{POOO,58{,58{P!Am{,UO,58|P%=Z{,UO,58|P%=i{7[O,58|P%=o{,UO,58|PO{O'#Jv'#JvP%=t{,UO'#LiPOOO'#Li'#LiP%=z{,UO'#LiPOOO,58|,58|POOO,5?f,5?fP%>POSO,5?fOOOO-E<{-E<{OOQR1G.j1G.jO%>WQUO1G.qO%?^QUO1G0mOOQQ1G0m1G0mO%@jQUO'#CpO%ByQbO'#CxO%CUQUO'#CsO%CZQUO'#CsO%C`QUO1G.uO#BWQUO'#CrOOQQ1G.u1G.uO%EcQUO1G4]O%FiQUO1G4^O%H[QUO1G4^O%I}QUO1G4^O%KpQUO1G4^O%McQUO1G4^O& UQUO1G4^O&!wQUO1G4^O&$jQUO1G4^O&&]QUO1G4^O&(OQUO1G4^O&)qQUO1G4^O&+dQUO'#KUO&,mQUO'#KUO&,uQUO,59UOOQQ,5=P,5=PO&.}QUO,5=PO&/XQUO,5=PO&/^QUO,5=PO&/cQUO,5=PO!6qQUO,5=PO#NsQUO1G3XO&/mQUO1G4mO!<_QUO1G4mO&1iQUO1G4pO&3[QVO1G4pOOQQ1G/O1G/OOOQQ1G.}1G.}OOQQ1G2i1G2iO!JVQ&lO1G3XO&3cQUO'#LUO@[QVO'#EiO&4lQUO'#F]OOQQ'#Jb'#JbO&4qQUO'#FZO&4|QUO'#LUO&5UQUO,5;tO&5ZQUO1G.rOOQQ1G.r1G.rOOQR1G/|1G/|O&6|Q!dO'#JQO&7RQbO,59xO&9dQ!eO'#D`O&9kQ!dO'#JSO&9pQbO,5AOO&9pQbO,5AOOOQR1G/c1G/cO&9{QbO1G/cO&:QQ&lO'#GeO&;OQbO,59dOOQR1G7a1G7aO#@jQUO1G1VO&;ZQUO1G1^OBXQUO1G1VO&=lQUO'#CzO#+VQbO,59dO&A_QUO1G6yOOQR-E<|-E<|O&BqQUO1G0dO#6fQUO1G0dOOQQ-E=V-E=VO#7SQUO1G0dOOQQ1G0l1G0lO&CfQUO,59jOOQQ1G3l1G3lO&C|QUO,59jO&DdQUO,59jO!MmQVO1G4gO!(}QVO'#JZO&EOQUO,5AiOOQQ1G0o1G0oO!(}QVO1G0oO!6qQUO'#JoO&EWQUO,5A|OOQQ1G3p1G3pOOQR1G1V1G1VO&ITQVO'#FOO!MmQVO,5;sOOQQ,5;s,5;sOBXQUO'#JdO&KPQUO,5AoO&KXQVO'#E[OOQR1G1^1G1^O&MvQUO'#LbOOQR1G1n1G1nOOQR-E=g-E=gOOQR1G7c1G7cO#DvQUO1G7cOGYQUO1G7cO#DvQUO1G7eOOQR1G7e1G7eO&NOQUO'#G}O&NWQUO'#L^OOQQ,5=h,5=hO&NfQUO,5=jO&NkQUO,5=kOOQR1G7f1G7fO#EtQVO1G7fO&NpQUO1G7fO' vQVO,5=kOOQR1G1U1G1UO$/UQUO'#E]O'!lQUO'#E]OOQQ'#LP'#LPO'#VQUO'#LOO'#bQUO,5;UO'#jQUO'#ElO'#}QUO'#ElO'$bQUO'#EtOOQQ'#J]'#J]O'$gQUO,5;cO'%^QUO,5;cO'&XQUO,5;dO''_QVO,5;dOOQQ,5;d,5;dO''iQVO,5;dO''_QVO,5;dO''pQUO,5;bO'(mQUO,5;eO'(xQUO'#KvO')QQUO,5:vO')VQUO,5;fOOQQ1G0n1G0nOOQQ'#J^'#J^O''pQUO,5;bO!4{QUO'#E}OOQQ,5;b,5;bO'*QQUO'#E`O'+zQUO'#E{OHuQUO1G0nO',PQUO'#EbOOQQ'#JY'#JYO'-iQUO'#KxOOQQ'#Kx'#KxO'.cQUO1G0eO'/ZQUO1G3kO'0aQVO1G3kOOQQ1G3k1G3kO'0kQVO1G3kO'0rQUO'#LeO'2OQUO'#K^O'2^QUO'#K]O'2iQUO,59hO'2qQUO1G/aO'2vQUO'#FPOOQR1G1]1G1]OOQR1G2g1G2gO$?TQUO1G2gO'3QQUO1G2gO'3]QUO1G0ZOOQR'#Ja'#JaO'3bQVO1G1XO'9ZQUO'#FTO'9`QUO1G1VO!6qQUO'#JeO'9nQUO,5;|O$0lQUO,5;|OOQQ'#Fc'#FcOOQQ,5;|,5;|O'9|QUO1G1fOOQR1G1f1G1fO':UQUO,5<XO$/UQUO'#FWOBXQUO'#FWO':]QUO,5<XO!(}QVO,5<XO':eQUO,5<XO':jQVO1G1qO!0wQVO1G1qOOQR1G1v1G1vO'@YQUO1G1xOOQR1G1{1G1{O'@_QUO1G1|OBXQUO1G2]O'AhQVO1G1|O'C|QUO1G1|O'DRQUO'#GWO8}QUO1G2]OOQR1G2O1G2OOOQR1G2U1G2UOOQR1G2W1G2WOOQR1G2Y1G2YO'DWQUO1G2^O!4{QUO1G2^OOQR1G2v1G2vO'D`QUO1G2vO$?]QUO1G2`OOQQ'#Cv'#CvO'DeQUO'#G[O'E`QUO'#G[O'EeQUO'#LXO'EsQUO'#G_OOQQ'#LY'#LYO'FRQUO1G2`O'FWQVO1G1kO'HiQVO'#GUOBXQUO'#FWOOQR'#Jf'#JfO'FWQVO1G1kO'HsQUO'#FvOOQR1G2f1G2fO'HxQUO1G2gO'H}QUO'#JhO'3QQUO1G2gO!(}QVO1G2tO'IVQUO1G2xO'J`QUO1G3QO'KfQUO1G3XOOQQ1G3o1G3oO'KzQUO1G3oOOQR1G3Z1G3ZO'LPQUO'#K`O'2vQUO'#LZOGnQUO'#L]OOQR'#Gy'#GyO#DvQUO'#L_OOQR'#HQ'#HQO'LZQUO'#GvO'$bQUO'#GuOOQR1G2{1G2{O'MWQUO1G2{O'M}QUO1G3ZO'NYQUO1G3_O'N_QUO1G3_OOQR1G3_1G3_O'NgQUO'#H]OOQR'#H]'#H]O( pQUO'#H]O!(}QVO'#H`O!(}QVO'#H_OOQR'#La'#LaO( uQUO'#LaOOQR'#Jl'#JlO( zQVO,5=vOOQQ,5=v,5=vO(!RQUO'#H^O(!ZQUO'#HZOOQQ1G3a1G3aO(!eQUO,5@{OOQQ,5@{,5@{O%)fQUO,5@{O%)kQUO,5@{O%$eQUO,5:eO(&SQUO'#KqO(&bQUO'#KqOOQQ,5:e,5:eOOQQ'#JT'#JTO(&mQUO'#D}O(&wQUO'#KwOGnQUO'#L]O('sQUO'#D}OOQQ'#Hp'#HpOOQQ'#Hr'#HrOOQQ'#Hs'#HsOOQQ'#Kr'#KrOOQQ'#JV'#JVO('}QUO,5:hOOQQ,5:h,5:hO((zQUO'#L]O()XQUO'#HtO()oQUO,5@{O()vQUO'#H{O(*RQUO'#LdO(*ZQUO,5>fO(*`QUO'#LcOOQQ1G3}1G3}O(.VQUO1G3}O(.^QUO1G3}O(.eQUO1G4TO(/kQUO1G4TO(/pQUO,5BSO!6qQUO1G4hO!(}QVO'#IiOOQQ1G4m1G4mO(/uQUO1G4mO(1xQVO1G4pPOOO-E<z-E<zPOOO1G.g1G.gPOOO1G.h1G.hP!Am{,UO1G.hP(3xQUO'#LkP(4T{,UO1G.hP(4Y{7[O1G.hPO{O-E=t-E=tPOOO,5BT,5BTP(4b{,UO,5BTPOOO1G5Q1G5QO!(}QVO7+$]O(4gQUO'#CzOOQQ,59_,59_O(4rQbO,59dO(4}QbO,59_OOQQ,59^,59^OOQQ7+)w7+)wO!MmQVO'#JuO(5YQUO,5@pOOQQ1G.p1G.pOOQQ1G2k1G2kO(5bQUO1G2kO(5gQUO7+(sOOQQ7+*X7+*XO(7{QUO7+*XO(8SQUO7+*XO(1xQVO7+*[O#NsQUO7+(sO(8aQVO'#JcO(8tQUO,5ApO(8|QUO,5;vOOQQ'#Cp'#CpOOQQ,5;w,5;wO!(}QVO'#F[OOQQ-E=`-E=`O!MmQVO,5;uOOQQ1G1`1G1`OOQQ,5?l,5?lOOQQ-E=O-E=OOOQR'#Dg'#DgOOQR'#Di'#DiOOQR'#Dl'#DlO(:VQ!eO'#KeO(:^QMkO'#KeO(:eQ!eO'#KeOOQR'#Ke'#KeOOQR'#JR'#JRO(:lQ!eO,59zOOQQ,59z,59zO(:sQbO,5?nOOQQ-E=Q-E=QO(;RQbO1G6jOOQR7+$}7+$}OOQR7+&q7+&qOOQR7+&x7+&xO'9`QUO7+&qO(;^QUO7+&OO#6fQUO7+&OO(<RQUO1G/UO(<iQUO1G/UO(=TQUO7+*ROOQQ7+*V7+*VO(>vQUO,5?uOOQQ-E=X-E=XO(@PQUO7+&ZOOQQ,5@Z,5@ZOOQQ-E=m-E=mO(@UQUO'#LUO@[QVO'#EiO(AbQUO1G1_OOQQ1G1_1G1_O(BkQUO,5@OOOQQ,5@O,5@OOOQQ-E=b-E=bO(CPQUO'#KvOOQR7+,}7+,}O#DvQUO7+,}OOQR7+-P7+-PO(C^QUO,5=iO#ERQUO'#JkO(CoQUO,5AxOOQR1G3U1G3UOOQR1G3V1G3VO(C}QUO7+-QOOQR7+-Q7+-QO(EuQUO,5:wO(GdQUO'#EwO!(}QVO,5;VO(HVQUO,5:wO(HaQUO'#EpO(HrQUO'#EzOOQQ,5;Z,5;ZO#KkQVO'#ExO(IYQUO,5:wO(IaQUO'#EyO#GuQUO'#J[O(JyQUO,5AjOOQQ1G0p1G0pO(KUQUO,5;WO!<_QUO,5;^O(KoQUO,5;_O(K}QUO,5;WO(NaQUO,5;`OOQQ-E=Z-E=ZO(NiQUO1G0}OOQQ1G1O1G1OO) dQUO1G1OO)!jQVO1G1OO)!qQVO1G1OO)!{QUO1G0|OOQQ1G0|1G0|OOQQ1G1P1G1PO)#xQUO'#JpO)$SQUO,5AbOOQQ1G0b1G0bOOQQ-E=[-E=[O)$[QUO,5;iO!<_QUO,5;iO)%XQVO,5:zO)%`QUO,5;gO$ {QUO7+&YOOQQ7+&Y7+&YO!(}QVO'#EfO)%gQUO,5:|OOQQ'#Ky'#KyOOQQ-E=W-E=WOOQQ,5Ad,5AdOOQQ'#Jm'#JmO))[QUO7+&PPOQQ7+&P7+&POOQQ7+)V7+)VO)*SQUO7+)VO)+YQVO7+)VOOQQ,5>m,5>mO$)hQVO'#JtO)+aQUO,5@wOOQQ1G/S1G/SOOQQ7+${7+${O)+lQUO7+(RO)+qQUO7+(ROOQR7+(R7+(RO$?TQUO7+(ROOQQ7+%u7+%uOOQR-E=_-E=_O!0YQUO,5;oOOQQ,5@P,5@POOQQ-E=c-E=cO$0lQUO1G1hOOQQ1G1h1G1hOOQR7+'Q7+'QOOQR1G1s1G1sOBXQUO,5;rO),_QUO,5<YO),fQUO1G1sO)-oQUO1G1sO!0wQVO7+']O)-tQVO7+']O)3dQUO7+'dO)3iQVO7+'hO)5}QUO7+'wO)6XQUO7+'hO)7_QVO7+'hOKnQUO7+'wO$>vQUO,5<rO!4{QUO7+'xO)7fQUO7+'xOOQR7+(b7+(bO)7kQUO7+'zO)7pQUO,5<vO'DeQUO,5<vO)8hQUO,5<vO'DeQUO,5<vOOQQ,5<w,5<wO)8yQVO,5<xO'EsQUO'#JgO)9TQUO,5AsO)9]QUO,5<yOOQR7+'z7+'zO)9hQVO7+'VO)6QQUO'#LTOOQR-E=d-E=dO);yQVO,5<bOOQQ,5@S,5@SO!6qQUO,5@SOOQQ-E=f-E=fO)>bQUO7+(`O)?hQUO7+(dO)?mQVO7+(dOOQQ7+(l7+(lOOQQ7+)Z7+)ZO)?uQUO'#KpO)@PQUO'#KpOOQR,5=b,5=bO)@^QUO,5=bO!;eQUO,5=bO!;eQUO,5=bO!;eQUO,5=bOOQR7+(g7+(gOOQR7+(u7+(uOOQR7+(y7+(yOOQR,5=w,5=wO)@cQUO,5=zO)AiQUO,5=yOOQR,5A{,5A{OOQR-E=j-E=jOOQQ1G3b1G3bO)BoQUO,5=xO)BtQVO'#EfOOQQ1G6g1G6gO%)fQUO1G6gO%)kQUO1G6gOOQQ1G0P1G0POOQQ-E=R-E=RO)E]QUO,5A]O(&SQUO'#JUO)EhQUO,5A]O)EhQUO,5A]O)EpQUO,5:iO8}QUO,5:iOOQQ,5>],5>]O)EzQUO,5AwO)FRQUO'#EVO)G]QUO'#EVO)GvQUO,5:iO)HQQUO'#HlO)HQQUO'#HmOOQQ'#Ku'#KuO)HoQUO'#KuO!(}QVO'#HnOOQQ,5:i,5:iO)IaQUO,5:iO!MmQVO,5:iOOQQ-E=T-E=TOOQQ1G0S1G0SOOQQ,5>`,5>`O)IfQUO1G6gO!(}QVO,5>gO)MTQUO'#JsO)M`QUO,5BOOOQQ1G4Q1G4QO)MhQUO,5A}OOQQ,5A},5A}OOQQ7+)i7+)iO*#VQUO7+)iOOQQ7+)o7+)oO*(UQVO1G7nO**WQUO7+*SO**]QUO,5?TO*+cQUO7+*[POOO7+$S7+$SP*-UQUO'#LlP*-^QUO,5BVP*-c{,UO7+$SPOOO1G7o1G7oO*-hQUO<<GwOOQQ1G.y1G.yOOQQ'#IT'#ITO*/ZQUO,5@aOOQQ,5@a,5@aOOQQ-E=s-E=sOOQQ7+(V7+(VOOQQ<<Ms<<MsO*0dQUO<<MsO*2gQUO<<MvO*4YQUO<<L_O*4nQUO,5?}OOQQ,5?},5?}OOQQ-E=a-E=aOOQQ1G1b1G1bO*5wQUO,5;vO*6}QUO1G1aOOQQ1G1a1G1aOOQR,5AP,5APO*8WQ!eO,5APO*8_QMkO,5APO*8fQ!eO,5APOOQR-E=P-E=POOQQ1G/f1G/fO*8mQ!eO'#DwOOQQ1G5Y1G5YOOQR<<J]<<J]O*8tQUO<<IjO*9iQUO7+$pOOQQ<<Iu<<IuO(8aQVO,5;ROOQR<=!i<=!iOOQQ1G3T1G3TOOQQ,5@V,5@VOOQQ-E=i-E=iOOQR<=!l<=!lO*:fQUO1G0cO*:mQUO'#EzO*:}QUO1G0cO*;UQUO'#JOO*<lQUO1G0qO!(}QVO1G0qOOQQ,5;[,5;[OOQQ,5;],5;]OOQQ,5?v,5?vOOQQ-E=Y-E=YO!<_QUO1G0xO*={QUO1G0xOOQQ1G0y1G0yO*>^QUO'#ElOOQQ1G0z1G0zOOQQ7+&j7+&jO*>rQUO7+&jO*?xQVO7+&jOOQQ7+&h7+&hOOQQ,5@[,5@[OOQQ-E=n-E=nO*@tQUO1G1TO*AOQUO1G1TO*AiQUO1G0fOOQQ1G0f1G0fO*BoQUO'#LRO*BwQUO1G1ROOQQ<<It<<ItOOQQ'#Hb'#HbO',PQUO,5={OOQQ'#Hd'#HdO',PQUO,5=}OOQQ-E=k-E=kPOQQ<<Ik<<IkPOQQ-E=l-E=lOOQQ<<Lq<<LqO*B|QUO'#LgO*DYQUO'#LfOOQQ,5@`,5@`OOQQ-E=r-E=rOOQR<<Km<<KmO$?TQUO<<KmO*DhQUO<<KmOOQR1G1Z1G1ZOOQQ7+'S7+'SO!MmQVO1G1tO*DmQUO1G1tOOQR7+'_7+'_OOQR<<Jw<<JwO!0wQVO<<JwOOQR<<KO<<KOO*DxQUO<<KSO*FOQVO<<KSOKnQUO<<KcO!MmQVO<<KcO*FVQUO<<KSO!0wQVO<<KSO*G`QUO<<KSO*GeQUO<<KcO*GpQUO<<KdOOQR<<Kd<<KdOOQR<<Kf<<KfO*GuQUO1G2bO)7pQUO1G2bO'DeQUO1G2bO*HWQUO1G2dO*I^QVO1G2dOOQQ1G2d1G2dO*IhQVO1G2dO*IoQUO,5@ROOQQ-E=e-E=eOOQQ1G2e1G2eO*I}QUO1G1|O*KWQVO1G1|O*K_QUO1G1|OOQQ1G5n1G5nOOQR<<Kz<<KzOOQR<<LO<<LOO*KdQVO<<LOO*KoQUO<<LOOOQR1G2|1G2|O*KtQUO1G2|O*K{QUO1G3eOOQR1G3d1G3dOOQQ7+,R7+,RO%)fQUO7+,RO*LWQUO1G6wO*LWQUO1G6wO(&SQUO,5?pO*L`QUO,5?pOOQQ-E=S-E=SO*LkQUO1G0TOOQQ1G0T1G0TO*LuQUO1G0TO!MmQVO1G0TO*LzQUO1G0TOOQQ1G3w1G3wO*MUQUO,5:qO)FRQUO,5:qO*MrQUO,5:qO)FRQUO,5:qO$$TQUO,5:uO*NaQVO,5>VO)HQQUO'#JqO*NkQUO1G0TO*N|QVO1G0TOOQQ1G3u1G3uO+ TQUO,5>WO+ `QUO,5>XO+ }QUO,5>YO+#TQUO1G0TO%)kQUO7+,RO+$ZQUO1G4ROOQQ,5@_,5@_OOQQ-E=q-E=qOOQQ<<MT<<MTOOQQ<<Mn<<MnO+%dQUO1G4oP+'gQUO'#JwP+'oQUO,5BWPO{O1G7q1G7qPOOO<<Gn<<GnOOQQANC_ANC_OOQR1G6k1G6kO+'wQ!eO,5:cOOQQ,5:c,5:cO+(OQUO1G0mO+)[QUO7+&]O+*kQUO7+&dO+*|QUO,5;WOOQQ<<JU<<JUO++[QUO7+&oOOQQ7+&Q7+&QO!4{QUO'#J_O+,VQUO,5AmOOQQ7+&m7+&mOOQQ1G3g1G3gO+,_QUO1G3iOOQQ,5>n,5>nO+0SQUOANAXOOQRANAXANAXO+0XQUO7+'`OOQRAN@cAN@cO+1eQVOAN@nO+1lQUOAN@nO!0wQVOAN@nO+2uQUOAN@nO+2zQUOAN@}O+3VQUOAN@}O+4]QUOAN@}OOQRAN@nAN@nO!MmQVOAN@}OOQRANAOANAOO+4bQUO7+'|O)7pQUO7+'|OOQQ7+(O7+(OO+4sQUO7+(OO+5yQVO7+(OO+6QQVO7+'hO+6XQUOANAjOOQR7+(h7+(hOOQR7+)P7+)PO+6^QUO7+)PO+6cQUO7+)POOQQ<= m<= mO+6kQUO7+,cO+6sQUO1G5[OOQQ1G5[1G5[O+7OQUO7+%oOOQQ7+%o7+%oO+7aQUO7+%oO*N|QVO7+%oOOQQ7+)a7+)aO+7fQUO7+%oO+8lQUO7+%oO!MmQVO7+%oO+8vQUO1G0]O*MUQUO1G0]O)FRQUO1G0]OOQQ1G0a1G0aO+9eQUO1G3qO+:kQVO1G3qOOQQ1G3q1G3qO+:uQVO1G3qO+:|QUO,5@]OOQQ-E=o-E=oOOQQ1G3r1G3rO%)fQUO<= mOOQQ7+*Z7+*ZPOQQ,5@c,5@cPOQQ-E=u-E=uOOQQ1G/}1G/}OOQQ,5?y,5?yOOQQ-E=]-E=]OOQRG26sG26sO+;eQUOG26YO!0wQVOG26YO+<nQUOG26YOOQRG26YG26YO!MmQVOG26iO!0wQVOG26iO+<sQUOG26iO+=yQUOG26iO+>OQUO<<KhOOQQ<<Kj<<KjOOQRG27UG27UOOQR<<Lk<<LkO+>aQUO<<LkOOQQ7+*v7+*vOOQQ<<IZ<<IZO+>fQUO<<IZO!MmQVO<<IZO+>kQUO<<IZO+?qQUO<<IZO*N|QVO<<IZOOQQ<<L{<<L{O+@SQUO7+%wO*MUQUO7+%wOOQQ7+)]7+)]O+@qQUO7+)]O+AwQVO7+)]OOQQANEXANEXO!0wQVOLD+tOOQRLD+tLD+tO+BOQUOLD,TO+CUQUOLD,TOOQRLD,TLD,TO!0wQVOLD,TOOQRANBVANBVOOQQAN>uAN>uO+CZQUOAN>uO+DaQUOAN>uO!MmQVOAN>uO+DfQUO<<IcOOQQ<<Lw<<LwOOQR!$( `!$( `O!0wQVO!$( oOOQR!$( o!$( oOOQQG24aG24aO+ETQUOG24aO+FZQUOG24aOOQR!)9EZ!)9EZOOQQLD){LD){O+F`QUO'#CgO(gQUO'#CgO+J]QUO'#CzO+L|QUO'#CzO!FZQUO'#CzO+MuQUO'#CzO+NYQUO'#CzO,#{QUO'#CzO,$]QUO'#CzO,$jQUO'#CzO,$uQbO,59dO,%QQbO,59dO,%]QbO,59dO,%hQbO'#CxO,%yQbO'#CxO,&[QbO'#CxO,&mQUO'#CgO,)QQUO'#CgO,)_QUO'#CgO,,SQUO'#CgO,/VQUO'#CgO,/gQUO'#CgO,3`QUO'#CgO,3gQUO'#CgO,4gQUO'#CgO,6pQUO,5:xO#?yQUO,5:xO#?yQUO,5:xO#=iQUO'#LbO,7^QbO'#CxO,7iQbO'#CxO,7tQbO'#CxO,8PQbO'#CxO#7SQUO'#E^O,8[QUO'#E^O,9iQUO'#HgO,:ZQbO'#CxO,:fQbO'#CxO,:qQUO'#CwO,:vQUO'#CwO,:{QUO'#CpO,;ZQbO,59dO,;fQbO,59dO,;qQbO,59dO,;|QbO,59dO,<XQbO,59dO,<dQbO,59dO,<oQbO,59dO,6pQUO1G0dO,<zQUO1G0dO#?yQUO1G0dO,8[QUO1G0dO,?XQUO'#K`O,?iQUO'#CzO,?wQbO,59dO,6pQUO7+&OO,<zQUO7+&OO,@SQUO'#EwO,@uQUO'#EzO,AfQUO'#E^O,AkQUO'#GcO,ApQUO'#CwO,AuQUO'#CxO,AzQUO'#CxO,BPQUO'#CwO,BUQUO'#GcO,BZQUO'#K`O,BwQUO'#K`O,CRQUO'#CwO,C^QUO'#CwO,CiQUO'#CwO,<zQUO,5:xO,8[QUO,5:xO,8[QUO,5:xO,CtQUO'#K`O,DXQbO'#CxO,DdQUO'#CsO,DiQUO'#E^",
    stateData: ",E_~O(oOSSOSRPQVPQ'ePQ'gPQ'hPQ'iPQ'jPQ'kPQ'lPQ'mPQ(pPQ~O*aOS~OPmO]eOb!]Oe!POmTOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!TxO!VfO!X!XO!Y!WO!i!YO!opO!r!`O!s!aO!t!aO!u!bO!v!aO!x!cO!{!dO#V#QO#a#VO#b#TO#i#OO#p!xO#t!fO#v!eO$R!gO$T!hO$Y!vO$Z!wO$`!iO$e!jO$g!kO$h!lO$k!mO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO${!tO$}!uO%U!yO%_#ZO%`#[O%a#YO%c!zO%e#UO%g!{O%l#SO%o!|O%v!}O%|#PO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(wRO)VYO)YaO)[|O)]{O)_iO)`!ZO)bXO)ncO)odO~OR#cOV#^O'e#_O'g#`O'h#aO'i#aO'j#bO'k#bO'l#`O'm#`O(p#]O~OX#eO(t#gO(v#eO~O]ZX]jXejXmhXqZXqjXsjXtjXujXvjXwjXxjXyjXzjX!OjX!TjX!VZX!VjX!XZX!YZX![ZX!^ZX!_ZX!aZX!bZX!eZX!fZX!gZX!hZX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX&rjX&sjX(wjX(zZX({$]X(|ZX(}ZX)YZX)YjX)ZZX)[ZX)[jX)]ZX)]jX)^ZX)_ZX)`ZX)pZX~O)_jX!UZX~P(gO]$PO!V#nO!X#}O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO(|#mO(}#mO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_#lO)`$OO~Oe$TO%Y$UO'[$VO'_$WO)O$QO~Om$XO~O!T$YO])SXe)SXs)SXt)SXu)SXv)SXw)SXx)SXy)SXz)SX!O)SX!V)SX!r)SX!s)SX!t)SX!u)SX!v)SX!x)SX!{)SX%v)SX&r)SX&s)SX(w)SX)Y)SX)[)SX)])SX)_)SX~Om$XO~P.^Om$XO!g$[O)p$[O~OX$]O)c$]O~O!R$^O)U)WP)`)WP~OPmO]$gOb!]Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!TxO!V$hO!X!XO!Y!WO!i!YO!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO#V#QO#a#VO#b#TO#v!eO$Y!vO$Z!wO$`!iO$e!jO$g!kO$h!lO$k!mO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO)VYO)Y$mO)]$mO)_iO)`!ZO)bXO)ncO)odO~Om$aO#t$nO(wRO~P0}O](^Xb'zXe(^Xm'zXm(^Xs'zXs(^Xt'zXt(^Xu'zXu(^Xv'zXv(^Xw'zXw(^Xx'zXx(^Xy'zXy(^Xz'zXz(^X|'zX!O'zX!V(^X!o(^X!r'zX!r(^X!s'zX!s(^X!t'zX!t(^X!u'zX!u(^X!v'zX!v(^X!x'zX!x(^X!{(^X#a'zX#b'zX%e'zX%l'zX%o(^X%v(^X&m'zX&r'zX&s'zX(w'zX(w(^X)Y(^X)[(^X)](^X~Ob!TOm$qOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO#a#VO#b#TO%e#UO%l#SO&m!RO&r#WO&s!TO(w$pO~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!O!_O!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO&r#WO&s$yO])gXe)gXm)gX!V)gX!{)gX%v)gX(w)gX)Y)gX)[)gX)])gX~O)_$xO~P:qOPmO]eOe!POs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!VfO!X!XO!Y!WO!i!YO!{!dO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO)YaO)[|O)]{O)`!ZO)bXO)ncO)odO~Ob%SOm;RO!|%TO(w$zO~P<oO)Y%UO~Ob!]Om$aO|#RO#a#VO#b#TO%e#UO%l#SO&m!RO&r#WO&s!TO(w;UO~P<oOPmO]$gOb%SOm;RO!V$hO!W%aO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y$mO)]%_O)`!ZO)bXO)ncO)odO)p%^O~O]%jOe!POm%dO!V%mO!{!dO%v$oO(w;VO)Y%fO)[%kO)]%kO~O({%oO~O)_#lO~O(w%pO](yX!V(yX!X(yX!Y(yX![(yX!^(yX!_(yX!a(yX!b(yX!e(yX!f(yX!h(yX(z(yX(|(yX(}(yX)Y(yX)Z(yX)[(yX)](yX)^(yX)_(yX)`(yX!g(yX)p(yX[(yX!W(yX({(yX!U(yXQ(yX!d(yX~OP%qO(uQO~PCTO]%jOe!POs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!V%mO!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO!{!dO%o!|O%v!}O)Y;gO)[|O)]|O~Om%tO!o%yO(w$zO~PEbO!TxO#v!eO({%{O)p&OO])kX!V)kX~O]%jOe!POm%tO!V%mO!{!dO%v!}O(w$zO)Y;gO)[|O)]|O~O!TxO#v!eO)_&RO)p&SO~O!U&VO~P!QO]&[O!TxO!V&YO)Y&XO)[&]O)]&]O~Oq&WO~PHuO]&eO!V&dO~OPmO]eOe!PO!VfO!X!XO!Y!WO!i!YO!{!dO#V#QO%_#ZO%`#[O%a#YO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO)YaO)[|O)]{O)`!ZO)bXO)ncO)odO~Ob%SOm;RO%v$oO(w$zO~PIjO]%jOe!POm;cO!V%mO!{!dO%v$oO(w$zO)Y;gO)[|O)]|O~Oq&hO](yX])kX!V(yX!V)kX!X(yX!Y(yX![(yX!^(yX!_(yX!a(yX!b(yX!e(yX!f(yX!h(yX(z(yX(|(yX(}(yX)Y(yX)Z(yX)[(yX)](yX)^(yX)_(yX)`(yX[(yX[)kX!U(yX~O!g$[O)p$[O~PL`O!g(yX)p(yX~PL`O](yX!V(yX!X(yX!Y(yX![(yX!^(yX!_(yX!a(yX!b(yX!e(yX!f(yX!h(yX(z(yX(|(yX(}(yX)Y(yX)Z(yX)[(yX)](yX)^(yX)_(yX)`(yX!g(yX)p(yX[(yX!U(yX~O])kX!V)kX[)kX~PNnOb&jO&m!RO]&lXe&lXm&lXs&lXt&lXu&lXv&lXw&lXx&lXy&lXz&lX!O&lX!V&lX!r&lX!s&lX!t&lX!u&lX!v&lX!x&lX!{&lX%v&lX&r&lX&s&lX(w&lX)Y&lX)[&lX)]&lX)_&lX[&lX!T&lX!X&lX!Y&lX![&lX!^&lX!_&lX!a&lX!b&lX!e&lX!f&lX!h&lX(z&lX(|&lX(}&lX)Z&lX)^&lX)`&lX!g&lX)p&lX!W&lXQ&lX!d&lX({&lX!U&lX#v&lX~Oq&hOm)SX[)SXQ)SX!d)SX!h)SX)`)SX)p)SX~P.^O!g$[O)p$[O](yX!V(yX!X(yX!Y(yX![(yX!^(yX!_(yX!a(yX!b(yX!e(yX!f(yX!h(yX(z(yX(|(yX(}(yX)Y(yX)Z(yX)[(yX)](yX)^(yX)_(yX)`(yX[(yX!W(yX({(yX!U(yXQ(yX!d(yX~OPmO]$gOb%SOm;RO!V$hO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y$mO)]$mO)`!ZO)bXO)ncO)odO~O])SXe)SXm)SXs)SXt)SXu)SXv)SXw)SXx)SXy)SXz)SX!O)SX!V)SX!r)SX!s)SX!t)SX!u)SX!v)SX!x)SX!{)SX%v)SX&r)SX&s)SX(w)SX)Y)SX)[)SX)])SX)_)SX[)SXQ)SX!d)SX!h)SX)`)SX)p)SX~O]$PO~P!*tO]&nO~O])hXb)hXe)hXm)hXs)hXt)hXu)hXv)hXw)hXx)hXy)hXz)hX|)hX!O)hX!V)hX!o)hX!r)hX!s)hX!t)hX!u)hX!v)hX!x)hX!{)hX#a)hX#b)hX%e)hX%l)hX%o)hX%v)hX&m)hX&r)hX&s)hX(w)hX)Y)hX)[)hX)])hX~O(uQO~P!-^O%U&pO~P!-^O]&qO~O]$PO~O!TxO~O$W&yO(w%pO({&xO~O]&zOx&|O~O]&zO~OPmO]$gOb%SOm;RO!TxO!V$hO!X!XO!Y!WO!i!YO#V#QO#p!xO#v!eO$Y!vO$Z!wO$`!iO$e!jO$g!kO$h!lO$k!mO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w:tO)VYO)Y$mO)]$mO)_iO)`!ZO)bXO)ncO)odO~O]'RO~O!T$YO)_'TO~P!(}O)_'VO~O)_'WO~O(w'XO~O)_'[O~P!(}Om;eO%U'`O%e'`O(w;WO~Ob!TOm$qOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO#a#VO#b#TO%e#UO%l#SO&m!RO&r#WO&s!TO(w$pO~O({'dO~O)_'fO~P!(}O!TxO(w%pO)p'hO~O(w%pO~O]'kO~O]'lOe%nXm%nX!V%nX!{%nX%v%nX(w%nX)Y%nX)[%nX)]%nX~O]'pO!V'qO!X'nO!g'nO%Z'nO%['nO%]'nO%^'nO%_'rO%`'rO%a'nO(}'oO)p'nO*O'sO~P8}O]%jOb!TOe!POs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!V%mO!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO!{!dO#a#VO#b#TO%e#UO%l#SO&m!RO&r#WO&s!TO)Y;gO)[|O)]|O~Om;fOq&WO%v$oO(w;XO~P!8mO(w%pO({'xO)_'yO~O]&eO!T'{O~Om$qO!O!_O!T(SO!l(XO(w$pO({(RO)VYO~Om$qO|(`O!T(]O#b(`O(w$pO~Ob!TOm$qO|#RO#a#VO#b#TO%e#UO%l#SO&m!RO&r#WO&s!TO(w$pO~O](bO~OPmOb%SOm;RO!V$hO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y$mO)]$mO)bXO)ncO)odO~O](dO)`(eO~P!=XO]$PO~P!<_OPmO]$gOb%SOm;RO!V(kO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y$mO)]$mO)`!ZO)bXO)ncO)odO~O(q(lO(r(lO(s(nO~OY(oO(uQO(w%pO~O'f(rO~OS(vO(p#]O*^(uO~O]$PO(o(yO~Q'nXX#eO(t({O(v#eO~Oe)VOm)QO&r#WO(w)PO~O!Y'Sa!['Sa!^'Sa!_'Sa!a'Sa!b'Sa!e'Sa!f'Sa!h'Sa(z'Sa)Y'Sa)Z'Sa)['Sa)]'Sa)^'Sa)_'Sa)`'Sa!g'Sa)p'Sa['Sa!W'Sa({'Sa!U'SaQ'Sa!d'Sa~OPmOb%SOm;RO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)bXO)ncO)odO]'Sa!V'Sa!X'Sa(|'Sa(}'Sa~P!BmO!T$YO[(xP~P!(}O]oX]%WXeoXmnXqoXq%WXsoXtoXuoXvoXwoXxoXyoXzoX!OoX!ToX!VoX!V%WX!X%WX!Y%WX![%WX!^%WX!_%WX!a%WX!b%WX!e%WX!f%WX!gnX!h%WX!roX!soX!toX!uoX!voX!xoX!{oX%voX&roX&soX(woX(z%WX(|%WX(}%WX)YoX)Y%WX)Z%WX)[oX)[%WX)]oX)]%WX)^%WX)_%WX)`%WX)pnX[%WX~O)_oX[oX!U%WX~P!FZO])iO!V)jO!X)gO!g)gO%Z)gO%[)gO%])gO%^)gO%_)kO%`)kO%a)gO(})hO)p)gO*O)lO~P8}OPmO]$gOb%SOm;RO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y$mO)]$mO)`!ZO)bXO)ncO)odO~O!V)qO~P!KVOe)tO%Y)uO)O$QO~O!T$YO!V)wO(|)xO!U)xP~P!KVO!T$YO~P!(}O)a*PO~Om*QO]!QX!h!QX)U!QX)`!QX~O]*SO!h*TO)U)WX)`)WX~O)U*WO)`*XO~Oe$TO%Y*YO'[$VO'_$WO)O$QO~Om*ZO~Om*ZO[)SX~P.^Om*ZO!g$[O)p$[O~O)_*[O~P:qOPmO]$gOb!]Om$aOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!V$hO!X!XO!Y!WO!i!YO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w;UO)Y$mO)]$mO)`!ZO)bXO)ncO)odO~Oq&hO~P!&}Oq&hO!W(yX({(yXQ(yX!d(yX~PNnO]'pO!V'qO!X'nO!g'nO%Z'nO%['nO%]'nO%^'nO%_'rO%`'rO%a'nO(}'oO)p'nO*O'sO~O]jXejXmhXqjXsjXtjXujXvjXwjXxjXyjXzjX!OjX!VjX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX&rjX&sjX(wjX)YjX)[jX)]jX!TjX!hjX)`jX)pjX[jX~O!ljX({jX)_jX!XjX!YjX![jX!^jX!_jX!ajX!bjX!ejX!fjX(zjX(|jX(}jX)ZjX)^jX!gjX!WjXQjX!djX!UjX#vjX#TjX#VjX#pjXbjX|jX!ojX#ajX#bjX#ijX#tjX${jX%cjX%ejX%kjX%ljX%ojX&mjX)VjX~P#&XO)O*`O~Om*aO~O])SXe)SXs)SXt)SXu)SXv)SXw)SXx)SXy)SXz)SX!O)SX!V)SX!r)SX!s)SX!t)SX!u)SX!v)SX!x)SX!{)SX%v)SX&r)SX&s)SX(w)SX)Y)SX)[)SX)])SX)_)SX!T)SX!X)SX!Y)SX![)SX!^)SX!_)SX!a)SX!b)SX!e)SX!f)SX!h)SX(z)SX(|)SX(})SX)Z)SX)^)SX)`)SX!g)SX)p)SX[)SX!W)SXQ)SX!d)SX({)SX!U)SX#v)SX~Om*aO~P#+aOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!O!_O!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO])gae)gam)ga!V)ga!{)ga%v)ga(w)ga)Y)ga)[)ga)])gaQ)ga!d)ga!h)ga)`)ga)p)ga[)ga!T)ga({)ga)_)ga~O&r#WO&s$yO~P#/POq&hOm)SX~P#+aO&r)ga~P#/PO]ZXmhXqZXqjX!TjX!VZX!XZX!YZX![ZX!^ZX!_ZX!aZX!bZX!eZX!fZX!gZX!hZX(zZX(|ZX(}ZX)YZX)ZZX)[ZX)]ZX)^ZX)_ZX)`ZX)pZX[ZX~O!WZX({ZX!UZXQZX!dZX~P#1xO]$PO!V#nO!X#}O(|#mO(}#mO~O!Y&xa![&xa!^&xa!_&xa!a&xa!b&xa!e&xa!f&xa!g&xa!h&xa(z&xa)Y&xa)Z&xa)[&xa)]&xa)^&xa)_&xa)`&xa)p&xa[&xa!W&xa({&xa!U&xaQ&xa!d&xa~P#4YOm;oO!T$YO~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O~PKnOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!|%TO~PKnO]&eO!V&dO[#Qa!T#Qa!h#Qa#v#Qa)_#Qa)p#QaQ#Qa!d#Qa({#Qa~Oq&hO!T$YO~O[*hO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[*hO~O[*jO]&eO!V&dO~O]&[Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!V&YO&r#WO&s$yO)Y&XO)[&]O)]&]O~O[rXQrX!drX!hrX)`rX)_rX~P#:ZO[*mO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h*nO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!W)qX~P#4YO!W*pO!h*qO~O!W*pO!h*qO~P!(}O!W*pO~Oq&hO!g$[O!h*rO)p$[O](yX!V(yX!W(yX!W*UX!X(yX!Y(yX![(yX!^(yX!_(yX!a(yX!b(yX!e(yX!f(yX(z(yX(|(yX(}(yX)Y(yX)Z(yX)[(yX)](yX)^(yX)`(yX~O!h(yX~P#=iO!W*tO~Oe$TO%Y*YO)O:yO~Om;rO~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!|%TO~PBXO]*{O!T*vO!V&dO!h*yO#v!eO)p*wO)_)wX~O!h*yO)_)wX~O)_*|O~Oq&hO])kX!T)kX!V)kX!h)kX#v)kX)_)kX)p)kX[)kXQ)kX!d)kX({)kX~Oq&hO~OP%qO(uQO]%ha!V%ha!X%ha!Y%ha![%ha!^%ha!_%ha!a%ha!b%ha!e%ha!f%ha!h%ha(w%ha(z%ha(|%ha(}%ha)Y%ha)Z%ha)[%ha)]%ha)^%ha)_%ha)`%ha!g%ha)p%ha[%ha!W%ha({%ha!U%haQ%ha!d%ha~Oe$TO%Y$UO)O:vO~Om;OO~O!TxO#v!eO)p&OO~Om<cO&r#WO(w;nO~O$Z+YO%`+ZO~O!TxO#v!eO)_+[O)p+]O~OPmO]$gOb%SOm;RO!V$hO!X!XO!Y!WO!i!YO#V#QO$Z+YO%_#ZO%`+_O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y$mO)]$mO)`!ZO)bXO)ncO)odO~O!U+`O~P!QOb!TOm$qOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO#a+fO#b+gO#i+hO%e#UO%l#SO&m!RO&r#WO&s!TO(w$pO)VYO~OQ)rP!d)rP~P#GuO]&[Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!V&YO)Y&XO)[&]O)]&]O~O[#kX!T#kX#v#kX)_#kX)p#kXQ#kX!d#kX!h#kX)`#kX!x#kX({#kX~P#IyOPmO]$gOb%SOm;ROs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!V$hO!W+nO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y+oO)]$mO)`!ZO)bXO)ncO)odO~O]&eO!V+pO~O]&[O!V&YO)VYO)Y&XO)[&]O)]&]O)`+sO[)jP~P8}O]&[O!V&YO)Y&XO)[&]O)]&]O~O[#nX!T#nX#v#nX)_#nX)p#nXQ#nX!d#nX!h#nX)`#nX!x#nX({#nX~P#NsO!TxO])tX!V)tX~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O#T+{O#p+|O(}+yO)[+wO)]+wO~O]#jX!T#jX!V#jX[#jX#v#jX)_#jX)p#jXQ#jX!d#jX!h#jX)`#jX!x#jX({#jX~P$!WO#V,OO~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!l,PO#T+{O#V,OO#p+|O(}+yO)[,PO)],PO])lP!T)lP!V)lP#v)lP({)lP)p)lP[)lP!h)lP)_)lP~O!x)lPQ)lP!d)lP~P$$TOPmO]$gOb%SOm;ROs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!V$hO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)]$mO)`!ZO)bXO)ncO)odO~O!W,VO)Y,WO~P$&OO)VYO)`+sO[)jP~P8}O]&eO!V&dO[&Za!T&Za!h&Za#v&Za)_&Za)p&ZaQ&Za!d&Za({&Za~OPmO]$gOb!]Om;TOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!V$hO!X!XO!Y!WO!i!YO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w;YO)Y$mO)]$mO)`!ZO)bXO)ncO)odO~OQ)PP!d)PP~P$)hO]$PO!V#nO(|#mO(}#mO!X'Pa!Y'Pa!['Pa!^'Pa!_'Pa!a'Pa!b'Pa!e'Pa!f'Pa!h'Pa(z'Pa)Y'Pa)Z'Pa)['Pa)]'Pa)^'Pa)_'Pa)`'Pa!g'Pa)p'Pa['Pa!W'Pa({'Pa!U'PaQ'Pa!d'Pa~O]$PO!V#nO!X#}O(|#mO(}#mO~P!BmO!TxO#t!fO)VYO~P8}O!TxO(w%pO)p,aO~O#x,fO~OQ)gX!d)gX!h)gX)`)gX)p)gX[)gX!T)gX({)gX)_)gX~P:qO({,jO(|,hO)V$UX)_$UX~O(w,kO~O)VYO)_,nO~OPmO]$gOb!]Om;SOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!V$hO!X!XO!Y!WO!i!YO!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO)VYO)Y$mO)]$mO)_iO)`!ZO)bXO)ncO)odO~O(w;ZO~P$0yOPmO]$gOb%SOm;RO!TxO!V$hO!X!XO!Y!WO!i!YO#V#QO#v!eO$Y!vO$Z!wO$`!iO$e!jO$g!kO$h!lO$k!mO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w:tO)VYO)Y$mO)]$mO)_iO)`!ZO)bXO)ncO)odO~O$h,xO~OPmO]$gOb!]Om;SOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!V$hO!X!XO!Y!WO!i!YO!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO#V#QO#a#VO#b#TO$}!uO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO)VYO)Y$mO)]$mO)`!ZO)bXO)ncO)odO~O${-OO(w;UO)_,|O~P$7dO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_-QO)`$OO~P#4YO)_-QO~O)_-RO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_-SO)`$OO~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_-TO)`$OO~P#4YOq&hO)VYO)p-VO~O)_-WO~Om;eO(w;WO~O]-_O!{!dO&r#WO&s$yO(w-ZO)Y-[O~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO({-bO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!TxO$`!iO$e!jO$g!kO$h!lO$k-gO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO$}!uO(w:uOe$Xa!o$Xa!{$Xa#i$Xa#p$Xa#t$Xa#v$Xa$R$Xa$T$Xa$Y$Xa$Z$Xa${$Xa%U$Xa%c$Xa%g$Xa%o$Xa%|$Xa(l$Xa)[$Xa!U$Xa$c$Xa~P$0yO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_-hO)`$OO~P#4YOm-jO!TxO)p,aO~O)p-lO~O]&]a!X&]a!Y&]a![&]a!^&]a!_&]a!a&]a!b&]a!e&]a!f&]a!h&]a(z&]a(|&]a(}&]a)Z&]a)[&]a)]&]a)^&]a)_&]a)`&]a!g&]a)p&]a[&]a!W&]a!T&]a#v&]a({&]a!U&]aQ&]a!d&]a~O)Y-pO!V&]a~P$DpO[-pO~O!W-pO~O!V-qO)Y&]a~P$DpO])SXe)SXs)SXt)SXu)SXv)SXw)SXx)SXy)SXz)SX!O)SX!V)SX!r)SX!s)SX!t)SX!u)SX!v)SX!x)SX!{)SX%v)SX&r)SX&s)SX(w)SX)Y)SX)[)SX)])SX~Om;tO~P$G`O]&eO!V&dO)_-rO~Om;jO!o-uO#V,OO#i-zO#t!fO${-OO%c!zO%k-yO%o!|O%v!}O(w;[O)VYO~P!8mO!n.OO(w,kO~O)VYO)_.QO~OPmO]$gOb%SOm;RO!T.VO!V$hO!X!XO!Y!WO!i!YO#V.^O#a.]O%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO(}.UO)Y$mO)]$mO)_.SO)`!ZO)bXO)ncO)odO~O!U.[O~P$JpO])dXe)dXs)dXt)dXu)dXv)dXw)dXx)dXy)dXz)dX!O)dX!T)dX!V)dX!l)dX!r)dX!s)dX!t)dX!u)dX!v)dX!x)dX!{)dX%v)dX&r)dX&s)dX(w)dX({)dX)Y)dX)[)dX)])dX)_)dX[)dX!h)dX)`)dX!X)dX!Y)dX![)dX!^)dX!_)dX!a)dX!b)dX!e)dX!f)dX(z)dX(|)dX(})dX)Z)dX)^)dX!g)dX)p)dX!W)dXQ)dX!d)dX#T)dX#V)dX#p)dX#v)dXb)dX|)dX!o)dX#a)dX#b)dX#i)dX#t)dX${)dX%c)dX%e)dX%k)dX%l)dX%o)dX&m)dX)V)dX!U)dX~Om*aO~P$LzOm$qO!T(SO!l.cO(w$pO({(RO)VYO~Oq&hOm)dX~P$LzOm$qO!n.hO!o.hO(w$pO)VYO~Om;kO!U.sO!n.uO!o.tO#i-zO${!tO$}!uO%g!{O%k-yO%o!|O%v!}O(w;^O)VYO~P!8mO!T(SO!l.cO({(RO])TXe)TXm)TXs)TXt)TXu)TXv)TXw)TXx)TXy)TXz)TX!O)TX!V)TX!r)TX!s)TX!t)TX!u)TX!v)TX!x)TX!{)TX%v)TX&r)TX&s)TX(w)TX)Y)TX)[)TX)])TX~O)_)TX[)TX!X)TX!Y)TX![)TX!^)TX!_)TX!a)TX!b)TX!e)TX!f)TX!h)TX(z)TX(|)TX(})TX)Z)TX)^)TX)`)TX!g)TX)p)TX!W)TXQ)TX!d)TX!U)TX#v)TX~P%%sO!T(SO~O!T(SO({(RO~O(w%pO!U*WP~O!T(]O({.zO]&kae&kam&kas&kat&kau&kav&kaw&kax&kay&kaz&ka!O&ka!V&ka!r&ka!s&ka!t&ka!u&ka!v&ka!x&ka!{&ka%v&ka&r&ka&s&ka(w&ka)Y&ka)[&ka)]&ka)_&ka[&ka!X&ka!Y&ka![&ka!^&ka!_&ka!a&ka!b&ka!e&ka!f&ka!h&ka(z&ka(|&ka(}&ka)Z&ka)^&ka)`&ka!g&ka)p&ka!W&kaQ&ka!d&ka!U&ka#v&ka~Om$qO!T(]O(w$pO~O&r#WO&s$yO]&pae&pam&pas&pat&pau&pav&paw&pax&pay&paz&pa!O&pa!V&pa!r&pa!s&pa!t&pa!u&pa!v&pa!x&pa!{&pa%v&pa(w&pa)Y&pa)[&pa)]&pa)_&pa[&pa!T&pa!X&pa!Y&pa![&pa!^&pa!_&pa!a&pa!b&pa!e&pa!f&pa!h&pa(z&pa(|&pa(}&pa)Z&pa)^&pa)`&pa!g&pa)p&pa!W&paQ&pa!d&pa({&pa!U&pa#v&pa~O&s/PO~P!(}O!Y#sO![#tO!f#|O)Y#oO!^'Ua!_'Ua!a'Ua!b'Ua!e'Ua!h'Ua(z'Ua)Z'Ua)['Ua)]'Ua)^'Ua)_'Ua)`'Ua!g'Ua)p'Ua['Ua!W'Ua({'Ua!U'UaQ'Ua!d'Ua~P#4YO!V'dX!X'dX!Y'dX!['dX!^'dX!_'dX!a'dX!b'dX!e'dX!f'dX!h'dX(z'dX(|'dX(}'dX)Y'dX)Z'dX)['dX)]'dX)^'dX)`'dX['dX~O]/RO)_'dX!g'dX)p'dX!W'dX({'dX!U'dXQ'dX!d'dX~P%3WO!Y#sO![#tO!f#|O)Y#oO!^'Wa!_'Wa!a'Wa!b'Wa!e'Wa!h'Wa(z'Wa)Z'Wa)['Wa)]'Wa)^'Wa)_'Wa)`'Wa!g'Wa)p'Wa['Wa!W'Wa({'Wa!U'WaQ'Wa!d'Wa~P#4YO]$PO!T$YO!V/SO&r#WO&s$yO~O!X'Za!Y'Za!['Za!^'Za!_'Za!a'Za!b'Za!e'Za!f'Za!h'Za(z'Za(|'Za(}'Za)Y'Za)Z'Za)['Za)]'Za)^'Za)_'Za)`'Za!g'Za)p'Za['Za!W'Za({'Za!U'ZaQ'Za!d'Za~P%6}O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h'^a)_'^a!g'^a)p'^a['^a!W'^a({'^a!U'^aQ'^a!d'^a~P#4YOPmO]$gOb%SOm;RO!V$hO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)Y$mO)]%_O)`!ZO)bXO)ncO)odO)p%^O~O!W/VO~P%:}O(q(lO(r(lO(s/XO~OS(vO]$PO(p#]O*^(uO~O]/[O'f/]O*^/YO~OS/aO(p#]O*^/`O~O]$PO~Q'na!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO({/cO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO)_#Zi[#Zi~P#4YO]dXmhXqdXqjX!VdX!XdX!YdX![dX!^dX!_dX!adX!bdX!edX!fdX!gdX!hdX(zdX(|dX(}dX)YdX)ZdX)[dX)]dX)^dX)_dX)`dX)pdX[dX!WdX({dX!TdX#vdX!UdXQdX!ddX~Oe/eO%Y*YO)O/dO~Om/fO~Om/gO~Oq&hO]ci!Vci!Xci!Yci![ci!^ci!_ci!aci!bci!eci!fci!gci!hci(zci(|ci(}ci)Yci)Zci)[ci)]ci)^ci)_ci)`ci)pci[ci!Wci({ci!UciQci!dci~O!W/iO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO![#tO)Y#oO!Y&zi!^&zi!_&zi!a&zi!b&zi!e&zi!f&zi!h&zi(z&zi)Z&zi)[&zi)]&zi)^&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y&zi![&zi!^&zi!_&zi!a&zi!b&zi!e&zi!f&zi!h&zi(z&zi)Y&zi)Z&zi)[&zi)]&zi)^&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O)Y#oO)]#rO)^#jO!h&zi(z&zi)Z&zi)[&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O)Y#oO)[#pO)]#rO)^#jO!h&zi(z&zi)Z&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!_#xO!a#zO!b#{O!e#{O!f#|O)Y#oO)]#rO)^#jO!^&zi!h&zi(z&zi)Z&zi)[&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!a#zO!b#{O!e#{O!f#|O)Y#oO)]#rO)^#jO!^&zi!_&zi!h&zi(z&zi)Z&zi)[&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!a#zO!b#{O!e#{O!f#|O)Y#oO)^#jO!^&zi!_&zi!h&zi(z&zi)Z&zi)[&zi)]&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!b#{O!e#{O!f#|O)Y#oO)^#jO!^&zi!_&zi!a&zi!h&zi(z&zi)Z&zi)[&zi)]&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!f#|O)Y#oO!^&zi!_&zi!a&zi!b&zi!e&zi!h&zi(z&zi)Z&zi)[&zi)]&zi)^&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO)Y#oO!^&zi!_&zi!a&zi!b&zi!e&zi!f&zi!h&zi(z&zi)Z&zi)[&zi)]&zi)^&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O)Y#oO)Z#qO)[#pO)]#rO)^#jO!h&zi(z&zi)_&zi)`&zi!g&zi)p&zi[&zi!W&zi({&zi!U&ziQ&zi!d&zi~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h/jO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO[(xX~P#4YO!h/jO[(xX~O[/lO~O]%Xaq%Xa!X%Xa!Y%Xa![%Xa!^%Xa!_%Xa!a%Xa!b%Xa!e%Xa!f%Xa!h%Xa(z%Xa(|%Xa(}%Xa)Z%Xa)[%Xa)]%Xa)^%Xa)_%Xa)`%Xa!g%Xa)p%Xa[%Xa!W%Xa!T%Xa#v%Xa({%Xa!U%XaQ%Xa!d%Xa~O)Y/mO!V%Xa~P&,zO[/mO~O!W/mO~O!V/nO)Y%Xa~P&,zO!X'Zi!Y'Zi!['Zi!^'Zi!_'Zi!a'Zi!b'Zi!e'Zi!f'Zi!h'Zi(z'Zi(|'Zi(}'Zi)Y'Zi)Z'Zi)['Zi)]'Zi)^'Zi)_'Zi)`'Zi!g'Zi)p'Zi['Zi!W'Zi({'Zi!U'ZiQ'Zi!d'Zi~P%6}O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h'^i)_'^i!g'^i)p'^i['^i!W'^i({'^i!U'^iQ'^i!d'^i~P#4YO!W/sO~P%:}O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h/uO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!U)xX~P#4YO(w/xO~O!V/zO(|)xO)p/|O~O!h/uO!U)xX~O!U/}O~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h`i(z`i)_`i!g`i)p`i[`i!W`i({`i!U`iQ`i!d`i~P#4YO!R0OO~Om*QO]!Qa!h!Qa)U!Qa)`!Qa~OP0WO]0VOm0WO!R0WO!T0TO!V0UO!X0WO!Y0WO![0WO!^0WO!_0WO!a0WO!b0WO!e0WO!f0WO!g0WO!h0WO!i0WO(uQO({0WO(|0WO(}0WO)Y0QO)Z0RO)[0RO)]0SO)^#jO)_0WO)`0WO)bXO~O[0ZO~P&7dO!R$^O~O!h*TO)U)Wa)`)Wa~O)U0_O~O])iO!V)jO!X)gO!g)gO%Z)gO%[)gO%])gO%^)gO%_)kO%`)kO%a)gO(})hO)p)gO*O)lO~Oe)tO%Y*YO)O$QO~O)_0aO~O]oXeoXmnXqoXsoXtoXuoXvoXwoXxoXyoXzoX!OoX!VoX!roX!soX!toX!uoX!voX!xoX!{oX%voX&roX&soX(woX)YoX)[oX)]oX!ToX!hoX)`oX[oXQoX!doX~O!loX({oX)_oX!XoX!YoX![oX!^oX!_oX!aoX!boX!eoX!foX(zoX(|oX(}oX)ZoX)^oX!goX)poX!WoX!UoX#voX#ToX#VoX#poXboX|oX!ooX#aoX#boX#ioX#toX${oX%coX%eoX%koX%loX%ooX&moX)VoX~P&;`Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!O!_O!r!aO!s!aO!t!aO!u!aO!v!aO!x!cO~O])gie)gim)gi!V)gi!{)gi%v)gi(w)gi)Y)gi)[)gi)])giQ)gi!d)gi!h)gi)`)gi)p)gi[)gi!T)gi&r)gi({)gi)_)gi~P&@^O]&eO!V&dO[#Qi!T#Qi!h#Qi#v#Qi)_#Qi)p#QiQ#Qi!d#Qi({#Qi~O[raQra!dra!hra)`ra)_ra~P#:ZO[raQra!dra!hra)`ra)_ra~P#IyO]&eO!V+pO[raQra!dra!hra)`ra)_ra~O!h*nO!W)qa~O!h*rO!W*Ua~OPmOb!]Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O|#RO!O!_O!X!XO!Y!WO!i!YO!s!aO!t!aO!v!aO!x!cO#V#QO#a#VO#b#TO#v!eO$Y!vO$Z!wO$`!iO$e!jO$g!kO$h!lO$k!mO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO%_#ZO%`#[O%a#YO%e#UO%l#SO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO)VYO)_iO)`!ZO)bXO)ncO)odO~O]eOe!POmTO!T*vO!U&VO!V0oO!opO!r!`O!u!bO!{!dO#i#OO#p!xO#t!fO$R!gO$T!hO${!tO$}!uO%U!yO%c!zO%g!{O%o!|O%v!}O%|#PO(wRO(|)xO)YaO)[|O)]{O~P&E`O!h*yO)_)wa~OPmO]$gOb!]Om;TO|#RO!T$YO!V$hO!X!XO!Y!WO!i!YO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w;]O)VYO)Y$mO)]$mO)`0uO)bXO)ncO)odO[(xP[)jP~P&@^O!h*rO!W*UX~O]$PO!T$YO~O!h0zO!T*QX#v*QX)p*QX~O)_0|O~O)_0}O~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_1PO)`$OO~P#4YO)_0}O~P!?ZO]1ZOe!POm%dO!V1XO!{!dO%v$oO(w$zO)Y1RO)`1UO~O)[1VO)]1VO)p1SOQ#PX!d#PX!h#PX[#PX~P' }O!h1[OQ)rX!d)rX~OQ1^O!d1^O~O)`1aO)p1`OQ#`X!d#`X!h#`X~P!<_O)`1aO)p1`OQ#`X!d#`X!h#`X~P!;eOq&WO~O[#ka!T#ka#v#ka)_#ka)p#kaQ#ka!d#ka!h#ka)`#ka!x#ka({#ka~P#IyO]&eO!V+pO[#ka!T#ka#v#ka)_#ka)p#kaQ#ka!d#ka!h#ka)`#ka!x#ka({#ka~O!W1fO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W1fO)Y1hO~P$&OO!W1fO~P!(}O]#ja!T#ja!V#ja[#ja#v#ja)_#ja)p#jaQ#ja!d#ja!h#ja)`#ja!x#ja({#ja~P$!WO[1lO]&eO!V+pO~O!h1mO[)jX~O[1oO~O]&eO!V+pO[#na!T#na#v#na)_#na)p#naQ#na!d#na!h#na)`#na!x#na({#na~O]1sOs#SXt#SXu#SXv#SXw#SXx#SXy#SXz#SX!T#SX!V#SX#T#SX#p#SX(}#SX)[#SX)]#SX!l#SX!x#SX#V#SX#v#SX({#SX)p#SX[#SX!h#SX)_#SXQ#SX!d#SX)`#SX~O]1tO~O]1wOm$qO!V$hO#V#QO(w$pO)ncO)odO~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!l,PO#T+{O#V,OO#p+|O(}+yO)[,PO)],PO~O])lX!T)lX!V)lX!x)lX#v)lX({)lX)p)lX[)lX!h)lX)_)lXQ)lX!d)lX~P',hO!x!cO]#Ri!T#Ri!V#Ri#v#Ri({#Ri)p#Ri[#Ri!h#Ri)_#RiQ#Ri!d#Ri~O!W2PO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W2PO)Y2RO~P$&OO!W2PO~P!(}O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OOQ*XX!d*XX!h*XX~P#4YO)`2SOQ)QX!d)QX!h)QX~O!h2TOQ)PX!d)PX~OQ2VO!d2VO~O[2WO~O#t$nO)VYO~P8}Om-jO!TxO)p2[O~O[2]O~O#x,fOP#ui]#uib#uie#uim#uis#uit#uiu#uiv#uiw#uix#uiy#uiz#ui|#ui!O#ui!T#ui!V#ui!X#ui!Y#ui!i#ui!o#ui!r#ui!s#ui!t#ui!u#ui!v#ui!x#ui!{#ui#V#ui#a#ui#b#ui#i#ui#p#ui#t#ui#v#ui$R#ui$T#ui$Y#ui$Z#ui$`#ui$e#ui$g#ui$h#ui$k#ui$m#ui$o#ui$q#ui$s#ui$u#ui$w#ui${#ui$}#ui%U#ui%_#ui%`#ui%a#ui%c#ui%e#ui%g#ui%l#ui%o#ui%v#ui%|#ui&m#ui&r#ui&s#ui'Q#ui'R#ui'V#ui'Y#ui'a#ui'b#ui(l#ui(u#ui(w#ui)V#ui)Y#ui)[#ui)]#ui)_#ui)`#ui)b#ui)n#ui)o#ui!U#ui$c#ui!n#ui%k#ui~O]&eO~O]&eO!TxO!V&dO#v!eO~O({2bO(|,hO)V$Ua)_$Ua~O)VYO)_2dO~O[2eO~P,`O[2eO)_#lO~O[2eO~O$c2jOP$_i]$_ib$_ie$_im$_is$_it$_iu$_iv$_iw$_ix$_iy$_iz$_i|$_i!O$_i!T$_i!V$_i!X$_i!Y$_i!i$_i!o$_i!r$_i!s$_i!t$_i!u$_i!v$_i!x$_i!{$_i#V$_i#a$_i#b$_i#i$_i#p$_i#t$_i#v$_i$R$_i$T$_i$Y$_i$Z$_i$`$_i$e$_i$g$_i$h$_i$k$_i$m$_i$o$_i$q$_i$s$_i$u$_i$w$_i${$_i$}$_i%U$_i%_$_i%`$_i%a$_i%c$_i%e$_i%g$_i%l$_i%o$_i%v$_i%|$_i&m$_i&r$_i&s$_i'Q$_i'R$_i'V$_i'Y$_i'a$_i'b$_i(l$_i(u$_i(w$_i)V$_i)Y$_i)[$_i)]$_i)_$_i)`$_i)b$_i)n$_i)o$_i!U$_i~O]1wO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_2mO)`$OO~P#4YOPmO]$gOb!]Om;SO|#RO!V$hO!X!XO!Y!WO!i!YO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w;UO)Y$mO)]$mO)_2pO)`!ZO)bXO)ncO)odO~P&@^O)_2mO~O(w-ZO~O)VYO)p2sO~O)_2uO~O]-_Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!{!dO!|%TO(w-ZO)Y-[O~O)Y2zO~O]&eO!V2|O!h2}O)_){X~O]-_O!{!dO(w-ZO)Y-[O~O)_3QO~O!TxO$`!iO$e!jO$g!kO$h!lO$k-gO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO$}!uO(w:uOe$Xi!o$Xi!{$Xi#i$Xi#p$Xi#t$Xi#v$Xi$R$Xi$T$Xi$Y$Xi$Z$Xi${$Xi%U$Xi%c$Xi%g$Xi%o$Xi%|$Xi(l$Xi)[$Xi!U$Xi$c$Xi~P$0yOm;SO(w:uO~P0}O]3UO~O)_2ZO~O!u3WO(w%pO~O[3ZO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h3[O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[3]O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO]&eO!V+pO!T%ui#v%ui)_%ui)p%ui~O!W3^O~Om;QO)_)SX~P$G`Ob!TOm$qO|3dO#a#VO#b3cO#t!fO%e#UO%l3eO&m!RO&r#WO&s!TO(w$pO)VYO~P&@^Om;jO!o-uO#i-zO#t!fO${-OO%c!zO%k-yO%o!|O%v!}O(w;[O)VYO~P!8mO]&eO!V&dO)_3gO~O)_3hO~O)VYO)_3hO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_3iO)`$OO~P#4YO)_3iO~O)_3lO~O!U3nO~P$JpOm$qO(w$pO~O]3pO!T'{O~P',SO!T(SO!l3sO({(RO])Tae)Tam)Tas)Tat)Tau)Tav)Taw)Tax)Tay)Taz)Ta!O)Ta!V)Ta!r)Ta!s)Ta!t)Ta!u)Ta!v)Ta!x)Ta!{)Ta%v)Ta&r)Ta&s)Ta(w)Ta)Y)Ta)[)Ta)])Ta)_)Ta[)Ta!X)Ta!Y)Ta![)Ta!^)Ta!_)Ta!a)Ta!b)Ta!e)Ta!f)Ta!h)Ta(z)Ta(|)Ta(})Ta)Z)Ta)^)Ta)`)Ta!g)Ta)p)Ta!W)TaQ)Ta!d)Ta!U)Ta#v)Ta~Om$qO!n.hO!o.hO(w$pO~O!h3wO)`3yO!T)eX~O!o3{O)VYO~P8}O)_3|O~PGYO]4ROm)QO!T$YO!{!dO%v$oO&r#WO(w)PO({4VO)Y4OO)[4SO)]4SO~O)_4WO)p4YO~P('OOm;kO!U4[O!n.uO!o.tO#i-zO${!tO$}!uO%g!{O%k-yO%o!|O%v!}O(w;^O)VYO~P!8mOm;kO%v!}O(w;^O~P!8mO({4]O~Om$qO!T(SO(w$pO({(RO)VYO~O!l3sO~P()^O)p4_O!U&oX!h&oX~O!h4`O!U*WX~O!U4bO~Ob4dOm$qO&m!RO(w$pO~O!T(]O]&kie&kim&kis&kit&kiu&kiv&kiw&kix&kiy&kiz&ki!O&ki!V&ki!r&ki!s&ki!t&ki!u&ki!v&ki!x&ki!{&ki%v&ki&r&ki&s&ki(w&ki)Y&ki)[&ki)]&ki)_&ki[&ki!X&ki!Y&ki![&ki!^&ki!_&ki!a&ki!b&ki!e&ki!f&ki!h&ki(z&ki(|&ki(}&ki)Z&ki)^&ki)`&ki!g&ki)p&ki!W&kiQ&ki!d&ki!U&ki#v&ki~O({&ki~P(*nO({.zO~P(*nO[4gO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[4gO~O[4hO~O]$PO!T$YO!V'Zi!X'Zi!Y'Zi!['Zi!^'Zi!_'Zi!a'Zi!b'Zi!e'Zi!f'Zi!h'Zi(z'Zi(|'Zi(}'Zi)Y'Zi)Z'Zi)['Zi)]'Zi)^'Zi)_'Zi)`'Zi!g'Zi)p'Zi['Zi!W'Zi({'Zi!U'ZiQ'Zi!d'Zi~OPmOb%SOm;RO!X!XO!Y!WO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)`!ZO)bXO)ncO)odO]#]aq#]a!T#]a!V#]a)Y#]a)[#]a)]#]a~O(w%pO)`4mO[*`P~O*^4lO~O'f4oO*^4lO~O*^4pO~OmnXqoXq&wX~Oe4rO%Y*YO)O/dO~Oe4rO%Y*YO)O4sO~O!h/jO[(xa~O!W4wO~O]&eO!V+pO!T%uq#v%uq)_%uq)p%uq~O]$PO!T$YO!X'Zq!Y'Zq!['Zq!^'Zq!_'Zq!a'Zq!b'Zq!e'Zq!f'Zq!h'Zq(z'Zq(|'Zq(}'Zq)Y'Zq)Z'Zq)['Zq)]'Zq)^'Zq)_'Zq)`'Zq!g'Zq)p'Zq['Zq!W'Zq({'Zq!U'ZqQ'Zq!d'Zq~O!V'Zq~P(5{O!V/SO&r#WO&s$yO~P(5{O!T$YO!V)wO(|)xO!U(VX!h(VX~P!KVO!h/uO!U)xa~O!W5PO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h*nO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!U5TO~P&7dO!W5TO~P&7dO[5TO~P&7dO[5YO~P&7dO]5ZO!h'va)U'va)`'va~O!h*TO)U)Wi)`)Wi~O]&eO!V&dO[#Qq!T#Qq!h#Qq#v#Qq)_#Qq)p#QqQ#Qq!d#Qq({#Qq~O[riQri!dri!hri)`ri)_ri~P#IyO]&eO!V+pO[riQri!dri!hri)`ri)_ri~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h'Tq)_'Tq!g'Tq)p'Tq['Tq!W'Tq({'Tq!U'TqQ'Tq!d'Tq~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!W'}a!h'}a~P#4YO!W5`O~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h5aO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_#lO)`$OO!U)xX~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h#{i)_#{i~P#4YO]*{O!T$YO!V&dO)p*wO!h(Wa)_(Wa~O!h1mO[)jX]'dX~P%3WO)`5cO!T%qa!h%qa#v%qa)p%qa~O!h0zO!T*Qa#v*Qa)p*Qa~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_5fO)`$OO~P#4YO]1ZOe!POm;cO!V1XO!{!dO%v$oO(w$zO)Y<PO)[5hO)]5hO~OQ#Pa!d#Pa!h#Pa[#Pa~P(ETO]1ZOe!POs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!V1XO!{!dO!|%TO%v$oO(w$zOQ#kX!d#kX!h#kX[#kX~Om%dO)Y1RO)[<QO)]<QO~P(FVO]&eOQ#Pa!d#Pa!h#Pa[#Pa~O!V&dO)p5lO~P(GtO(w%pOQ#dX!d#dX!h#dX[#dX~O)[<QO)]<QOQ#nX!d#nX!h#nX[#nX~P' }O!V+pO~P(GtO]1ZOb!TOe!POm;dO|#RO!V1XO!{!dO#a#VO#b#TO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO(w;XO)VYO)Y<PO)[5hO)]5hO)`+sO[)jP~P&@^O!h1[OQ)ra!d)ra~Oq&hO)p5qOQ#`am)SX!d#`a!h#`a)`)SX~P$G`O(w-ZOQ#ga!d#ga!h#ga~Oq&hO)p5qOQ#`a])dXe)dXm)dXs)dXt)dXu)dXv)dXw)dXx)dXy)dXz)dX!O)dX!T)dX!V)dX!d#`a!h#`a!l)dX!r)dX!s)dX!t)dX!u)dX!v)dX!x)dX!{)dX%v)dX&r)dX&s)dX(w)dX({)dX)Y)dX)[)dX)])dX)`)dX~O#a5tO#b5tO~O]&eO!V+pO[#ki!T#ki#v#ki)_#ki)p#kiQ#ki!d#ki!h#ki)`#ki!x#ki({#ki~O!W5vO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W5vO~P!(}O!W5vO)Y5xO~P$&OO]#ji!T#ji!V#ji[#ji#v#ji)_#ji)p#jiQ#ji!d#ji!h#ji)`#ji!x#ji({#ji~P$!WO)VYO)`5zO~P8}O!h1mO[)ja~O&r#WO&s$yO!T#qa!x#qa#v#qa({#qa)p#qa[#qa!h#qa)_#qaQ#qa!d#qa)`#qa~P#NsO[6PO~P!(}O[)uP~P!4{O)Z6VO)[6TO]#Ua!T#Ua!V#Ua)Y#Ua)]#Uas#Uat#Uau#Uav#Uaw#Uax#Uay#Uaz#Ua!l#Ua!x#Ua#T#Ua#V#Ua#p#Ua#v#Ua({#Ua(}#Ua)p#Uab#Uae#Uam#Ua|#Ua!O#Ua!o#Ua!r#Ua!s#Ua!t#Ua!u#Ua!v#Ua!{#Ua#a#Ua#b#Ua#i#Ua#t#Ua${#Ua%c#Ua%e#Ua%k#Ua%l#Ua%o#Ua%v#Ua&m#Ua&r#Ua&s#Ua(w#Ua)V#Ua)_#Ua[#Ua!h#UaQ#Ua!d#Ua~O!x!cO]#Rq!T#Rq!V#Rq#v#Rq({#Rq)p#Rq[#Rq!h#Rq)_#RqQ#Rq!d#Rq~O!W6[O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W6[O~P!(}O!h2TOQ)Pa!d)Pa~O)_6aO~Om-jO!TxO)p6bO~O]*{O!T$YO!V&dO!h*yO)_)wX~O)p6fO~P)+|O[6hO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[6hO~O$c6jOP$_q]$_qb$_qe$_qm$_qs$_qt$_qu$_qv$_qw$_qx$_qy$_qz$_q|$_q!O$_q!T$_q!V$_q!X$_q!Y$_q!i$_q!o$_q!r$_q!s$_q!t$_q!u$_q!v$_q!x$_q!{$_q#V$_q#a$_q#b$_q#i$_q#p$_q#t$_q#v$_q$R$_q$T$_q$Y$_q$Z$_q$`$_q$e$_q$g$_q$h$_q$k$_q$m$_q$o$_q$q$_q$s$_q$u$_q$w$_q${$_q$}$_q%U$_q%_$_q%`$_q%a$_q%c$_q%e$_q%g$_q%l$_q%o$_q%v$_q%|$_q&m$_q&r$_q&s$_q'Q$_q'R$_q'V$_q'Y$_q'a$_q'b$_q(l$_q(u$_q(w$_q)V$_q)Y$_q)[$_q)]$_q)_$_q)`$_q)b$_q)n$_q)o$_q!U$_q~O)_6kO~OPmO]$gOb!]Om;SO|#RO!V$hO!X!XO!Y!WO!i!YO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w;UO)Y$mO)]$mO)_6mO)`!ZO)bXO)ncO)odO~P&@^O({6oO)p*wO~P)+|O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_6mO)`$OO~P#4YO[6qO~P!(}O)_6uO~O)_6vO~O]-_Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!{!dO(w-ZO)Y-[O~O]&eO!V2|O!h%Oa)_%Oa[%Oa~O!W6|O)Y6}O~P$&OO!h2}O)_){a~O[7QO]&eO!V2|O~O!TxO$`!iO$e!jO$g!kO$h!lO$k-gO$m!nO$o!oO$q!pO$s!qO$u!rO$w!sO$}!uO(w:uOe$Xq!o$Xq!{$Xq#i$Xq#p$Xq#t$Xq#v$Xq$R$Xq$T$Xq$Y$Xq$Z$Xq${$Xq%U$Xq%c$Xq%g$Xq%o$Xq%|$Xq(l$Xq)[$Xq!U$Xq$c$Xq~P$0yOPmO]$gOb!]Om;SO|#RO!V$hO!X!XO!Y!WO!i!YO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w;UO)VYO)Y$mO)]$mO)_7SO)`!ZO)bXO)ncO)odO~P&@^O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_7VO)`$OO~P#4YO)_7WO~OP7XO(uQO~Om*aO)_)dX~P$G`Oq&hOm)SX)_)dX~P$G`O)_7ZO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO)_&Sa~P#4YO!U7]O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO)_7^O~OPmO]$gOb!]Om;TO|#RO!V$hO!X!XO!Y!WO!i!YO#V#QO#a#VO#b#TO%_#ZO%`#[O%a#YO%e#UO%l#SO%v$oO&m!RO&r#WO&s!TO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w;]O)VYO)Y$mO)]$mO)`0uO)bXO)ncO)odO[)jP~P&@^O!h3wO)`7bO!T)ea~O!h3wO!T)ea~O)_7gO)p7iO~P('OO)_7kO~PGYO]4ROm)QOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!{!dO!|%TO%v$oO&r#WO(w)PO)Y4OO)[4SO)]4SO~O)Y7oO~O]&eO!T*vO!V7qO!h7rO#v!eO({4VO~O)_7gO)p7tO~P)GbO]4ROm)QO!{!dO%v$oO&r#WO(w)PO)Y4OO)[4SO)]4SO~Oq&hO])iX!T)iX!V)iX!h)iX#v)iX({)iX)_)iX)p)iX[)iX~O)_7gO~O!T(SO!l7zO({(RO])Tie)Tim)Tis)Tit)Tiu)Tiv)Tiw)Tix)Tiy)Tiz)Ti!O)Ti!V)Ti!r)Ti!s)Ti!t)Ti!u)Ti!v)Ti!x)Ti!{)Ti%v)Ti&r)Ti&s)Ti(w)Ti)Y)Ti)[)Ti)])Ti)_)Ti[)Ti!X)Ti!Y)Ti![)Ti!^)Ti!_)Ti!a)Ti!b)Ti!e)Ti!f)Ti!h)Ti(z)Ti(|)Ti(})Ti)Z)Ti)^)Ti)`)Ti!g)Ti)p)Ti!W)TiQ)Ti!d)Ti!U)Ti#v)Ti~O(w%pO!U(gX!h(gX~O!h4`O!U*Wa~Oq&hO]*Vae*Vam*Vas*Vat*Vau*Vav*Vaw*Vax*Vay*Vaz*Va!O*Va!T*Va!V*Va!r*Va!s*Va!t*Va!u*Va!v*Va!x*Va!{*Va%v*Va&r*Va&s*Va(w*Va)Y*Va)[*Va)]*Va)_*Va[*Va!X*Va!Y*Va![*Va!^*Va!_*Va!a*Va!b*Va!e*Va!f*Va!h*Va(z*Va(|*Va(}*Va)Z*Va)^*Va)`*Va!g*Va)p*Va!W*VaQ*Va!d*Va({*Va!U*Va#v*Va~O!T(]O]&kqe&kqm&kqs&kqt&kqu&kqv&kqw&kqx&kqy&kqz&kq!O&kq!V&kq!r&kq!s&kq!t&kq!u&kq!v&kq!x&kq!{&kq%v&kq&r&kq&s&kq(w&kq)Y&kq)[&kq)]&kq)_&kq[&kq!X&kq!Y&kq![&kq!^&kq!_&kq!a&kq!b&kq!e&kq!f&kq!h&kq(z&kq(|&kq(}&kq)Z&kq)^&kq)`&kq!g&kq)p&kq!W&kqQ&kq!d&kq({&kq!U&kq#v&kq~OPmOb%SOm;RO!T$YO!i!YO#V#QO%_#ZO%`#[O%a#YO%v$oO'Q!WO'R!WO'V#XO'Y![O'a![O'b![O(uQO(w$zO)bXO)ncO)odO~O]*[i!V*[i!X*[i!Y*[i![*[i!^*[i!_*[i!a*[i!b*[i!e*[i!f*[i!h*[i(z*[i(|*[i(}*[i)Y*[i)Z*[i)[*[i)]*[i)^*[i)_*[i)`*[i!g*[i)p*[i[*[i!W*[i({*[i!U*[iQ*[i!d*[i~P*&qO[8PO~O!W8QO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h'^q)_'^q!g'^q)p'^q['^q!W'^q({'^q!U'^qQ'^q!d'^q~P#4YO!h8RO[*`X~O[8TO~O*^8UO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h_y)__y!g_y)p_y[_y!W_y({_y!U_yQ_y!d_y~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO[(ia!h(ia~P#4YO]$PO!T$YO!V'Zy!X'Zy!Y'Zy!['Zy!^'Zy!_'Zy!a'Zy!b'Zy!e'Zy!f'Zy!h'Zy(z'Zy(|'Zy(}'Zy)Y'Zy)Z'Zy)['Zy)]'Zy)^'Zy)_'Zy)`'Zy!g'Zy)p'Zy['Zy!W'Zy({'Zy!U'ZyQ'Zy!d'Zy~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!h'^y)_'^y!g'^y)p'^y['^y!W'^y({'^y!U'^yQ'^y!d'^y~P#4YO]&eO!V+pO!T%uy#v%uy)_%uy)p%uy~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!U(Va!h(Va~P#4YO!W5PO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!U#}i!h#}i~P#4YO!U8WO~P&7dO!W8WO~P&7dO[8WO~P&7dO[8YO~P&7dO]&eO!V&dO[#Qy!T#Qy!h#Qy#v#Qy)_#Qy)p#QyQ#Qy!d#Qy({#Qy~O]&eO!V+pO[rqQrq!drq!hrq)`rq)_rq~O]&eOQ#Pi!d#Pi!h#Pi[#Pi~O!V+pO~P*:TOQ#nX!d#nX!h#nX[#nX~P(ETO!V&dO~P*:TOQ(PX](PXe'rXm'rXs(PXt(PXu(PXv(PXw(PXx(PXy(PXz(PX!V(PX!d(PX!h(PX!{'rX%v'rX(w'rX)Y(PX)[(PX)](PX[(PX~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OOQ#_i!d#_i!h#_i[#_i~P#4YO&r#WO&s$yOQ#fi!d#fi!h#fi~O(w-ZO)`1aO)p1`OQ#`X!d#`X!h#`X~O!W8_O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W8_O~P!(}O!T#qi!x#qi#v#qi({#qi)p#qi[#qi!h#qi)_#qiQ#qi!d#qi)`#qi~O]&eO!V+pO~P*@PO]&[O!V&YO&r#WO&s$yO)Y&XO)[&]O)]&]O~P*@PO[8aO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!h8bO[)uX~O[8dO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OOQ*ZX!d*ZX!h*ZX~P#4YO)`8gOQ*YX!d*YX!h*YX~O)_8iO~O[$bi!h#{a)_#{a~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_8lO)`$OO~P#4YO[8nO~P!(}O[8nO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[8nO~O]&eO!V&dO({8tO~O)_8uO~O]&eO!V2|O!h%Oi)_%Oi[%Oi~O!W8xO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W8xO)Y8zO~P$&OO!W8xO~P!(}O]&eO!V2|O!h(Za)_(Za~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_8{O)`$OO~P#4YO)_2pO~P!(}O)_8{O~OP%qO[8|O(uQO~O[8|O~O)_8}O~P%%sO#T9QO(}.UO)_9OO~O!h3wO!T)ei~O)`9UO!T'xa!h'xa~O)_9WO)p9YO~P)GbO)_9WO~O)_9WO)p9^O~P('OOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O~P)HQO]&eO!V7qO!T!ya!h!ya#v!ya({!ya)_!ya)p!ya[!ya~O!W9eO)Y9fO~P$&OO!T$YO!h7rO({4VO)_9WO)p9^O~O!T$YO~P#EtO[9iO]&eO!V7qO~O]&eO!V7qO!T&aa!h&aa#v&aa({&aa)_&aa)p&aa[&aa~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO)_&ba~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_9WO)`$OO~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!U&oi!h&oi~P#4YO!V/SO]']i!T']i!X']i!Y']i![']i!^']i!_']i!a']i!b']i!e']i!f']i!h']i(z']i(|']i(}']i)Y']i)Z']i)[']i)]']i)^']i)_']i)`']i!g']i)p']i[']i!W']i({']i!U']iQ']i!d']i~O(w%pO)`9lO~O!h8RO[*`a~O[9nO~P&7dO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO!U(Va)_#Zi~P#4YO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OOQ#_q!d#_q!h#_q[#_q~P#4YO&r#WO&s$yOQ#fq!d#fq!h#fq~O)p5qOQ#`a!d#`a!h#`a~O]&eO!V+pO!T#qq!x#qq#v#qq({#qq)p#qq[#qq!h#qq)_#qqQ#qq!d#qq)`#qq~O!h8bO[)ua~O)[6TO]&Vi!T&Vi!V&Vi)Y&Vi)Z&Vi)]&Vis&Vit&Viu&Viv&Viw&Vix&Viy&Viz&Vi!l&Vi!x&Vi#T&Vi#V&Vi#p&Vi#v&Vi({&Vi(}&Vi)p&Vib&Vie&Vim&Vi|&Vi!O&Vi!o&Vi!r&Vi!s&Vi!t&Vi!u&Vi!v&Vi!{&Vi#a&Vi#b&Vi#i&Vi#t&Vi${&Vi%c&Vi%e&Vi%k&Vi%l&Vi%o&Vi%v&Vi&m&Vi&r&Vi&s&Vi(w&Vi)V&Vi)_&Vi[&Vi!h&ViQ&Vi!d&Vi~O)_9qO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO[$bq!h#{i)_#{i~P#4YO[9sO~P!(}O[9sO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[9sO~O]&eO!V&dO({9vO~O[9wO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[9wO~O]&eO!V2|O!h%Oq)_%Oq[%Oq~O!W9{O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W9{O~P!(}O)_6mO~P!(}O)_9|O~O)_9}O~O(}.UO)_9}O~O!h3wO!T)eq~O)`:PO!T'xi!h'xi~O!T$YO!h7rO({4VO)_:QO)p:SO~O)_:QO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_:QO)`$OO~P#4YO)_:QO)p:VO~P)GbO]&eO!V7qO!T!yi!h!yi#v!yi({!yi)_!yi)p!yi[!yi~O!W:ZO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W:ZO)Y:]O~P$&OO!W:ZO~P!(}O]&eO!V7qO!T(ea!h(ea({(ea)_(ea)p(ea~O[:_O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O!h#kO(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[:_O~O[:dO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[:dO~O]&eO!V2|O!h%Oy)_%Oy[%Oy~O)_:eO~O)_:fO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_:fO)`$OO~P#4YO!T$YO!h7rO({4VO)_:fO)p:iO~O]&eO!V7qO!T!yq!h!yq#v!yq({!yq)_!yq)p!yq[!yq~O!W:kO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO!W:kO~P!(}O[:mO!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)`$OO~P#4YO[:mO~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_:oO)`$OO~P#4YO)_:oO~O]&eO!V7qO!T!yy!h!yy#v!yy({!yy)_!yy)p!yy[!yy~O!Y#sO![#tO!^#wO!_#xO!a#zO!b#{O!e#{O!f#|O(z#hO)Y#oO)Z#qO)[#pO)]#rO)^#jO)_:sO)`$OO~P#4YO)_:sO~O]ZXmhXqZXqjX!TjX!VZX!XZX!YZX![ZX!^ZX!_ZX!aZX!bZX!eZX!fZX!gZX!hZX(zZX({$]X(|ZX(}ZX)YZX)ZZX)[ZX)]ZX)^ZX)_ZX)`ZX)pZX~O]%WXmnXqoXq%WX!ToX!V%WX!X%WX!Y%WX![%WX!^%WX!_%WX!a%WX!b%WX!e%WX!f%WX!gnX!h%WX(z%WX(|%WX(}%WX)Y%WX)Z%WX)[%WX)]%WX)^%WX)`%WX)pnX[%WXQ%WX!d%WX~O)_%WX!W%WX({%WX!U%WX~P+H]O]oX]%WXeoXmnXqoXq%WXsoXtoXuoXvoXwoXxoXyoXzoX!OoX!VoX!V%WX!roX!soX!toX!uoX!voX!xoX!{oX%voX&roX&soX(woX)YoX)[oX)]oX[oX[%WX!hoX)`oX~O)_oX)poX~P+JmO]%WXmnXqoXq%WX!V%WX!h%WXQ%WX!d%WX[%WX~O!T%WX#v%WX)_%WX)p%WX({%WX~P+MWOQoXQ%WX!ToX!X%WX!Y%WX![%WX!^%WX!_%WX!a%WX!b%WX!doX!d%WX!e%WX!f%WX!gnX!h%WX(z%WX(|%WX(}%WX)Y%WX)Z%WX)[%WX)]%WX)^%WX)`%WX)pnX~P+JmO]oX]%WXmnXqoXq%WXsoXtoXuoXvoXwoXxoXyoXzoX!OoX!V%WX!roX!soX!toX!uoX!voX!xoX!{oX%voX&roX&soX(woX)YoX)[oX)]oX~O!ToX({oX)_oX)poX~P,!OOeoX!VoX)_%WX~P,!OOmnXqoX)_%WX~Oe)tO%Y)uO)O:vO~Oe)tO%Y)uO)O:{O~Oe)tO%Y)uO)O:wO~Oe$TO%Y*YO'[$VO'_$WO)O:vO~Oe$TO%Y*YO'[$VO'_$WO)O:xO~Oe$TO%Y*YO'[$VO'_$WO)O:zO~O[jX]jXsjXtjXujXvjXwjXxjXyjXzjX!VjX&rjX&sjX)YjX)[jX)]jXejX!OjX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX(wjX~P#1xO]ZXmhXqZXqjX!VZX!hZX)_ZX)pZX~O!TZX#vZX({ZX~P,(fOmhXqjX)VjX)_ZX)pjX~O]ZX]jXejXmhXqZXqjXsjXtjXujXvjXwjXxjXyjXzjX!OjX!VZX!VjX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX&rjX&sjX(wjX)YjX)[jX)]jX[ZX[jX!hjX)`jX)pjX~O)_ZX~P,)pO]ZX]jXmhXqZXqjXsjXtjXujXvjXwjXxjXyjXzjX!TjX!VZX!VjX!XZX!YZX![ZX!^ZX!_ZX!aZX!bZX!eZX!fZX!gZX!hZX!hjX&rjX&sjX(zZX(|ZX(}ZX)YZX)YjX)ZZX)[ZX)[jX)]ZX)]jX)^ZX)`ZX)`jX)pZX~OQZXQjX!dZX!djX~P,,ZO]jXejXsjXtjXujXvjXwjXxjXyjXzjX!OjX!VjX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX&rjX&sjX(wjX)YjX)[jX)]jX~P#1xO]ZX]jXejXmhXqZXqjXsjXtjXujXvjXwjXxjXyjXzjX!OjX!VZX!VjX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX&rjX&sjX(wjX)YjX)[jX)]jX~O)_jX~P,1]O[ZX[jXejX!OjX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX(wjX)pjX~P,,ZO]ZX]jXmhXqZXqjXsjXtjXujXvjXwjXxjXyjXzjX!OjX!TjX!VZX!rjX!sjX!tjX!ujX!vjX!xjX!{jX%vjX&rjX&sjX(wjX({jX)YjX)[jX)]jX)_jX)pjX~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O~PBXOe$TO%Y*YO)O:vO~Oe$TO%Y*YO)O:wO~Oe$TO%Y*YO)O:}O~Oe$TO%Y*YO)O:|O~O]%jOe!POm%dOs!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O!V%mO!{!dO!|%TO%v$oO(w$zO)Y;hO)[;iO)];iO~O]%jOe!POm%dO!V%mO!{!dO%v$oO(w$zO)Y;hO)[;iO)];iO~Oe$TO%Y$UO)O:wO~Oe$TO%Y$UO)O:{O~Om;QO~Om;PO~O]dXmhXqjX!TdX~Oe)tO%Y*YO)O:vO~Oe)tO%Y*YO)O:wO~Oe)tO%Y*YO)O:xO~Oe)tO%Y*YO)O:yO~Oe)tO%Y*YO)O:zO~Oe)tO%Y*YO)O:|O~Oe)tO%Y*YO)O:}O~Os!^Ot!^Ou!^Ov!^Ow!^Ox!^Oy!^Oz!^O~P,9iO])SXs)SXt)SXu)SXv)SXw)SXx)SXy)SXz)SX!O)SX!r)SX!s)SX!t)SX!u)SX!v)SX!x)SX!{)SX%v)SX&r)SX&s)SX(w)SX)Y)SX)[)SX)])SX)p)SX~Om;PO!T)SX({)SX)_)SX~P,=hO]&wXmnXqoX!T&wX~Oe4rO%Y*YO)O;{O~Om;cO)Y<PO)[5hO)]5hO~P(FVOe!POm%dO!{!dO%v$oO(w$zO~O]1ZO!V1XO)Y1RO)[<QO)]<QOQ#nX!d#nX!h#nX[#nX~P,@dO)Y;aO~Om;oO~Om;pO~Om;qO~Om;sO~Om;tO~Om;uO~Om;sO!T$YOQ)SX!d)SX!h)SX)`)SX[)SX)p)SX~P$G`Om;qO!T$YO~P$G`Om;oO!g$[O)p$[O~Om;qO!g$[O)p$[O~Om;sO!g$[O)p$[O~Om;pO[)SX!h)SX)`)SX)p)SX~P$G`Oe/eO%Y*YO)O;{O~Om;|O~O)Y<aO~OV'e'h'i'g(u)b!R(wS(p%Z!Y!['je%[!i'R!f]'f*a'k(|!^!_'l'm'l~",
    goto: "%7u*aPPPPP*b*lP*oPP.ePP4y7z7z;UP;U>`P>y?]?qFiMi!&m!-TP!3}!4r!5gP!6RPPPPPPPP!6lP!8UP!9g!;PP!;VPPPPPP!;YP!;YPP!;YPP!;fPPPPPP!=h!AOP!ARPP!Ao!BdPPPPP!BhP>|!CyPP>|!FQ!HR!Ha!Iv!KgP!KrP!LR!LR# c#$r#&Y#)f#,p!HR#,zPP!HR#-R#-X#,z#,z#-[P#-`#-}#-}#-}#-}!KgP#.h#.y#1`P#1tP#3aP#3e#3m#4b#4m#6{#7T#7T#3eP#3eP#7[#7bP#7lPP#8X#8v#9h#8XP#:Y#:fP#8XP#8XPP#8X#8XP#8XP#8XP#8XP#8XP#8XP#8XP#:i#7l#;VP#;lP#<R#<R#<R#<R#<`#3eP#<v#Ar#BaPPPPPPPP#CXP#CgP#CgP#Cs#GQ#;bPP#Ca#GdP#Gw#HS#HY#HY#Ca#IOP#3e#3e#3e#3e#3eP!LR#Ij#Iq#Iq#Iq#Iu# ]#JP# ]#JT!Ha!Ha!Ha#JW#Np!Ha>|>|>|$%i!Bd!Bd!Bd!Bd!Bd!Bd!6l!6l!6l$%|P$'i$'w!6l$'}PP!6l$*]$*`#CO$*c;U7z$-i$/d$1T$2s7zPP7z$4g7zP7z7zP7zP$7m7zP7zPP7z$7yPPPPPPPPP*lP$;R$;X$;_$=v$?|$@S$@j$@t$AP$A`$Af$Bt$Cs$Cz$DR$DX$Da$Dk$Dq$D|$ES$E]$Ee$Ep$Ev$FQ$FW$Fb$Fi$Fx$GO$GUP$G[$Gd$Gk$Gy$Ig$Im$Is$Iz$JTPPPPPPPPPPPP$JZ$J_PPPPP%#a$*]%#d%&l%(tPP%)R%)UPPPPPPPPPP%)b%*e%*k%*o%,f%-s%.f%.m%0|%1SPPP%1^%1i%1l%1r%2y%2|%3W%3b%3f%4j%5]%5c#CXP%5|%6^%6a%6q%6}%7R%7X%7_$*]$*`$*`%7b%7eP%7o%7rQ#dPZ(s#b(o(p(t/ZR#dP'`mO[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mU%qm%r7XQ&o!`Q(o#^d0W*S0T0U0V0Y5U5V5W5Z8XR7X3[b}Oaewx{!g&U*v&v$k[!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|1S1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mS%bf0o#d%lgnp|#O$i%O%P%U%f%j%k%y&u'v'w(S*_*e*g*y+b,q,{-d-u-|.k.r.t0d1Q1R1V1Z2f2q5h6n;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<aS%sm!YS&w!h#PQ'_!tQ'i!yQ'j!zQ(o#aQ(p#^Q(q#_Q*}%mQ,]&nQ,b&pQ-X'`Q-i'hQ-p'sS.w(]4`Q/m)lQ0l*rQ2X,aQ2`,hQ3V-jQ4i/RQ4m/[Q5m1UQ6c2[Q7U3WQ8h6bQ9l8RR;b1X$|#iS!]${%S%V%]&l&m'S'Z']'c'e(c(g(j(|(})W)X)Y)Z)[)])^)_)`)a)b)c)d)p)v)}+^+l,T,X,o,z-m-n.R/O/w0g0i0n0p1O1g2Q2h2o3Y3j3k4j4k4q4t4z4|5Q5R5k5w6O6]6l6p6z7R7x7y7{8Z8[8j8m8q8y9[9c9r9x:T:[:a:g:pQ&r!dQ(i#ZQ(x#cQ)o$V[*x%g*]0r2g2n3SQ,c&qQ/T(hQ/Z(pQ/b(yS/p)n/UQ0y+VS4x/q/rR8V4y'a![O[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m'a!VO[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mQ)T#mS+V%{0zQ/y)xk4U.l3z4O4R4S7j7l7m7o7r9`9a:YQ)V#mk4T.l3z4O4R4S7j7l7m7o7r9`9a:Yl)U#m.l3z4O4R4S7j7l7m7o7r9`9a:YT+V%{0z[UOwx!g&U*vW$b[e$g(d#l$r_!f!u!}#R#S#T#U#V#Z$U$V$n%W&W&[&e&o'a(P(R(W(`(i)o)u+a+f+g+y,O,^,p-P-V-t-y.].^.d.e.i.v.z1[1`1m1r1t2s3c3d3e3w3{5q6U6W7c8b![%eg$i%f%k&u*_*y+b,q,{-d1R1V2f;_;`;a;h;i;v;w;x;y;}<O<Q<_<`<aY%unp%y-u.kl)R#m.l3z4O4R4S7j7l7m7o7r9`9a:YS;l'v-|U;m(S.r.t&|<Saf{|!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$h$m%O%P%U%_%j%o&S&Y&d&{'O'Q'k'l'w'{(b(k)q)w*e*g*m*n*q*w+]+_+m+o+p,U,W,s,v-l.U.V.Z/S/V/c/j/s/u/z/|0d0o1Q1S1X1h1i1s1w2R2j2p2q2|4V4Y4_4h5a5h5l5x6f6j6m6n6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m;g<PQ<T1Zd<U&z'R'd,|-b-c-f2m3R3UW<V&h*{2T3pQ<W#O[<X!t'`'h,a2[6bT<d%{0z[VOwx!g&U*vW$c[e$g(dQ$r.z!j$s_!f!u!}#V#Z$U$V$n%W&W&[&e&o'a(i)o)u+a+f+y,^,p-P-V-t.i1[1`1m1r1t2s3{5q8b&^$|af{!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$h$m%_%o&S&Y&d&{'O'Q'k'l'{(b(k)q)w*m*n*q*w+]+_+m+o+p,U,W,s,v-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2j2p2|4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m![%eg$i%f%k&u*_*y+b,q,{-d1R1V2f;_;`;a;h;i;v;w;x;y;}<O<Q<_<`<aY%unp%y-u.kQ't#O|(O#R#S#T#U(P(R(W(`+g,O.].^.d.e.v3c3d3e3w6U6W7cl)R#m.l3z4O4R4S7j7l7m7o7r9`9a:YS-s'v-|Q3_-yU;z(S.r.tn<S|%O%P%U%j'w*e*g0d1Q2q5h6n;g<P[<X!t'`'h,a2[6bW<Y&h*{2T3pd<Z&z'R'd,|-b-c-f2m3R3UQ<b1ZT<d%{0z!Q!UO[ewx!g$g&U&h&z'R'd(d*v*{,|-b-c-f2T2m3R3U3p!v$v_!f!u!}#O#V#Z$U$V$n%W&W&[&e&o'a'v(S(i)o)u+a+y,^,p-P-V-t-|.i.r.t1Z1[1`1m1r1t2s3{5q8b&^%Raf{!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$h$m%_%o&S&Y&d&{'O'Q'k'l'{(b(k)q)w*m*n*q*w+]+_+m+o+p,U,W,s,v-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2j2p2|4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m$Q%ngnp|#m$i%O%P%U%f%j%k%y%{&u'`'h'w*_*e*g*y+b,a,q,{-d-u.k.l0d0z1Q1R1V2[2f2q3z4O4R4S5h6b6n7j7l7m7o7r9`9a:Y;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<aQ'^!tz(Q#R#S#T#U(P(R(W(`,O.].^.d.e.v3c3d3e3w6U6W7cf-`'b-Y-[-_2w2x2z2}6x6y8wQ1_+fQ1b+gQ2r-OQ3`-yQ4c.zQ5s1aR8^5t!Q!UO[ewx!g$g&U&h&z'R'd(d*v*{,|-b-c-f2T2m3R3U3p!x$v_!f!u!}#O#V#Z$U$V$n%W&W&[&e&o'a'v(S(i)o)u+a+f+y,^,p-P-V-t-|.i.r.t1Z1[1`1m1r1t2s3{5q8b&^%Raf{!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$h$m%_%o&S&Y&d&{'O'Q'k'l'{(b(k)q)w*m*n*q*w+]+_+m+o+p,U,W,s,v-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2j2p2|4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m$S%ngnp|!t#m$i%O%P%U%f%j%k%y%{&u'`'h'w*_*e*g*y+b,a,q,{-d-u.k.l0d0z1Q1R1V2[2f2q3z4O4R4S5h6b6n7j7l7m7o7r9`9a:Y;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<a|(Q#R#S#T#U(P(R(W(`+g,O.].^.d.e.v3c3d3e3w6U6W7cQ3`-yR4c.z[WOwx!g&U*vW$d[e$g(d#l$r_!f!u!}#R#S#T#U#V#Z$U$V$n%W&W&[&e&o'a(P(R(W(`(i)o)u+a+f+g+y,O,^,p-P-V-t-y.].^.d.e.i.v.z1[1`1m1r1t2s3c3d3e3w3{5q6U6W7c8b![%eg$i%f%k&u*_*y+b,q,{-d1R1V2f;_;`;a;h;i;v;w;x;y;}<O<Q<_<`<aY%unp%y-u.kl)R#m.l3z4O4R4S7j7l7m7o7r9`9a:YS;l'v-|U;m(S.r.tn<S|%O%P%U%j'w*e*g0d1Q2q5h6n;g<PQ<T1ZQ<W#O[<X!t'`'h,a2[6b&^<[af{!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$h$m%_%o&S&Y&d&{'O'Q'k'l'{(b(k)q)w*m*n*q*w+]+_+m+o+p,U,W,s,v-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2j2p2|4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:md<]&z'R'd,|-b-c-f2m3R3UW<^&h*{2T3pT<d%{0zp$RT$a$q%d%t)Q;R;S;T;c;d;e;f;j;k<co)r$X*Z*a/f;O;P;Q;o;p;q;r;s;t;u;|p$ST$a$q%d%t)Q;R;S;T;c;d;e;f;j;k<co)s$X*Z*a/f;O;P;Q;o;p;q;r;s;t;u;|^&g}!O$k$l%b%l;bd&k!U$v%R%n'^(Q1_1b3`4cV/h)T)U4US%[e$gQ,Y&hQ/Q(dQ2t-VQ6Q1tQ6^2TQ6t2sR9o8b#}!TO[_ewx!f!g!u!}#O#V#Z$U$V$g$n%W&U&W&[&e&h&o&z'R'a'd'v(S(d(i)o)u*v*{+a+f+y,^,p,|-P-V-b-c-f-t-y-|.i.r.t1Z1[1`1m1r1t2T2m2s3R3U3p3{5q8b#[^O[_`wx!f!g!}#O$U$f$n$u$w&U&W&[&e&o&t&z'R'd'v(S)u*b*v*{+a,^,p,|-P-b-c-f-t-y-|.i.r.t1Z1[1m2m3R3U3p3{_(W#R#S#T+g3c3d3e#}ZO[wx!g!k#R#S#T%o&U&W&[&e&o&y&z&{'O'Q'R'^'d'v'z(P(R(S(W*v*{+a+g,^,m,p,v-U-b-c-f-t-y-|.P.d.i.r.v1Z1[1m2j2r3R3U3c3d3e3p6j6q8n9s9w:_:d:mQ$_YR0[*TR*V$_e0W*S0T0U0V0Y5U5V5W5Z8X$f#{S%V%]'S'Z']'c'e(j(|(})W)Z)[)])^)_)`)c)d)p)v)}+^+l,T,X,o,z-m-n.R/O/w0g0i0n0p1O1g2Q2h2o3Y3j3k4j4k4q4t4z4|5Q5R5k5w6O6]6l6p6z7R7x7y7{8Z8[8j8m8q8y9[9c9r9x:T:[:a:g:pe0W*S0T0U0V0Y5U5V5W5Z8X'`!YO[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:me0W*S0T0U0V0Y5U5V5W5Z8XR5[0[^(V#R#S#T+g3c3d3eY.b(P(T(W(X7[U3r.`.c.vS7`3s4^R9j7z^(U#R#S#T+g3c3d3e[.a(P(T(V(W(X7[W3q.`.b.c.vU7_3r3s4^S9R7`7zR:^9jT.p(S.rd]Owx!g&U'v(S*v-|.r!v^[_`!f!}#O$U$f$n$u$w&W&[&e&o&t&z'R'd)u*b*{+a,^,p,|-P-b-c-f-t-y.i.t1Z1[1m2m3R3U3p3{Q%vnT1|,S1}!jbOaenpwx{|!g#O%O%P%U%j%y&U'v'w(S*e*g*v-u-|.k.r.t0d1Q1Z2q5h6n;g<Pf-]'b-Y-[-_2w2x2z2}6x6y8wj4P.l3z4O4R4S7j7l7m7o7r9`9a:Yr<Rg$i%f%k&u*_*y,q,{-d2f;_;`;a;v;x;}i<e+b1R1V;h;i;w;y<O<Q<_<`<a!O&`y%Z&X&[&]'m)m*i*k+b+j+}/t0e1Q1R1V1Z1q5h5}<P<Qz&cz%Q%Y%g&f'u*]*d,g-}0b0c0r1T2g2n3S5^5i6s8pS'}#Q.^n+q&Z*l+k+r+u-o/o0f1Y1e4{5_5g5|8`Q2_,f^2{-^2y3P6w7O8v9ze7p4Q7f7n7v7w9]9_9g:X:jS+c&W1[Y+s&[&e*{1Z3pR5z1m#w!POaegnpwx{|!g#O$i%O%P%U%f%j%k%y&U&u'v'w(S*_*e*g*v*y+b,q,{-d-u-|.k.r.t0d1Q1R1V1Z2f2q5h6n;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<a`oOwx!g&U'v*v-|#U!Paeg{|#O$i%O%P%U%f%j%k&u'w*_*e*g*y+b,q,{-d0d1Q1R1V1Z2f2q5h6n;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<aU%xnp-uQ+S%yS.j(S.rT3}.k.tW+w&`+q+x1jV,P&c,Q7pQ+}&bU,P&c,Q7pQ-|'vT.X'{.Z'`![O[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mX1y,O.^6U6W'W!VO[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/c/j/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mW1y,O.^6U6WR2l,x!WjO[wx!g!k%o&U&{'O'Q'd*v,v-b-c-f2j3R6j6q8n9s9w:_:d:mY%Xe$g(d1w3pQ'U!nS)O#k5aQ,r&zQ,}'RS.T'{.ZQ2i,sQ6r2pQ7T3UQ8o6mR9t8l'W![O[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/c/j/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mX1y,O.^6U6W'ayO[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,O,U,W,s,v,|-b-c-f-l.U.V.Z.^/S/c/j/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_5a5l5x6U6W6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mQ&byS'v#O-zR1c+hS+c&W1[R5u1cQ1W+bR5n1VR1W+bT+c&W1[z&^%Z&X&[&]'m)m*i*k+b+j/t0e1Q1R1V1Z1q5h5}<P<QQ&_yR1u+}!P&^y%Z&X&[&]'m)m*i*k+b+j+}/t0e1Q1R1V1Z1q5h5}<P<QQ+z&`S,R&c7pS1k+q+xQ1{,QR5y1j!WkO[wx!g!k%o&U&{'O'Q'd*v,v-b-c-f2j3R6j6q8n9s9w:_:d:mS%|o.jS&Qq-wQ&ayQ&s!eQ'g!yQ*u%gU+Q%x%}3}S+U%z&PQ+v&_Q,_&oS,`&p'iQ,w&}S0`*],gS0v+R+SQ0x+TQ1v+}S2Z,b-kQ5]0bQ5b0wQ6S1uQ6a2YQ6d2_Q7u4QQ9Z7fR:W9][uOwx!g&U*vQ,_&oQ-{'vQ3a-yR3f-|xlOwx!g!k%o&U&{'Q*v,v2j6j6q8n9s9w:_:d:mU$j['O-cS%|o.jS&Qq-wQ*u%gU+Q%x%}3}S+U%z&PS0`*],gS0v+R+SQ0x+TQ5]0bQ5b0wQ7u4QQ9Z7fR:W9]T,d&s,e]uOwx!g&U*v[uOwx!g&U*vQ,_&oQ,s&zQ,|'RW-e'd-b-f3RQ-{'vQ3a-yQ3f-|R7S3U[%hg$i,q,{-d2fR0s*y^$ZV!U$c$|%R<Y<ZQ'U!nS)e$P*{S){$Y*vQ*O$[Y*x%g*]0r2n3SQ/T(hS/p)n/US0h*m4hS0q*w6fQ0y+VQ4X.lQ4u/jS4x/q/rS4}/u5aQ5S/|Q6g2gU7h3z4Q4YQ8V4yQ8r6oY9X7f7i7j7s7tQ9y8tW:R9V9Y9]9^Q:b9vU:h:S:U:VR:q:iS){$Y*vT4}/u5aZ)y$Y)z*v/u5aQ&y!hR'z#PS,l&x'xQ2c,jR6e2bxlOwx!g!k%o&U&{'Q*v,v2j6j6q8n9s9w:_:d:mV$j['O-c!XkO[wx!g!k%o&U&{'O'Q'd*v,v-b-c-f2j3R6j6q8n9s9w:_:d:m!WhO[wx!g!k%o&U&{'O'Q'd*v,v-b-c-f2j3R6j6q8n9s9w:_:d:mR'Y!q!WkO[wx!g!k%o&U&{'O'Q'd*v,v-b-c-f2j3R6j6q8n9s9w:_:d:mR,s&zQ&{!iQ&}!jQ'Q!lR,v&|R,t&zxlOwx!g!k%o&U&{'Q*v,v2j6j6q8n9s9w:_:d:mX-e'd-b-f3R[uOwx!g&U*vQ-P'RQ-{'vS.p(S.rR3f-|[uOwx!g&U*vQ-P'RW-e'd-b-f3RT.p(S.rg-`'b-Y-[-_2w2x2z2}6x6y8wylOwx!g!k%o&U&{'Q*v,v2j6j6q8n9s9w:_:d:mb!OOaewx{!g&U*v&|$l[f!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m#d%lgnp|#O$i%O%P%U%f%j%k%y&u'v'w(S*_*e*g*y+b,q,{-d-u-|.k.r.t0d1Q1R1V1Z2f2q5h6n;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<aQ'_!tQ-X'`Q-i'hQ2X,aQ6c2[R8h6bj$TT$a%d%t;R;S;T;c;d;e;f;j;ki)t$X*Z;O;P;Q;o;p;q;r;s;t;uj$TT$a%d%t;R;S;T;c;d;e;f;j;kh)t$X*Z;O;P;Q;o;p;q;r;s;t;uS/e)Q<cV4r/f/g;|[uOwx!g&U*vQ-{'vR3f-|[uOwx!g&U*vT.p(S.r'`!YO[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mR7Y3[[uOwx!g&U*vQ-{'vS.p(S.rR3f-|[pOwx!g&U*vQ%ynS-u'v-|T.k(S.rS%}o.jS+R%x3}R0w+SQ+W%{R5d0zS%|o.jS&Qq-wU+Q%x%}3}S+U%z&PS0v+R+SQ0x+TQ5b0wQ7u4QQ9Z7fR:W9]`qOwx!g&U(S*v.rS%zn-uU&Pp.k.tQ+T%yT-w'v-|S'|#Q.^R._'}T.W'{.ZS.X'{.ZQ9P7]R:O9QT6U1x8fR6W1x#d!Pgnp|#O$i%O%P%U%f%j%k%y&u'v'w(S*_*e*g*y+b,q,{-d-u-|.k.r.t0d1Q1R1V1Z2f2q5h6n;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<ab!QOaewx{!g&U*v&}![[f!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m#d!Pgnp|#O$i%O%P%U%f%j%k%y&u'v'w(S*_*e*g*y+b,q,{-d-u-|.k.r.t0d1Q1R1V1Z2f2q5h6n;_;`;a;g;h;i;v;w;x;y;}<O<P<Q<_<`<ab!QOaewx{!g&U*v&|![[f!W!X!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|#}$P$W$Y$[$g$h$m%_%o&S&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_4h5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mk4T.l3z4O4R4S7j7l7m7o7r9`9a:YQ4X.lS7h3z4QU9X7f7j7sS:R9V9]R:h:U#|!TO[_ewx!f!g!u!}#O#V#Z$U$V$g$n%W&U&W&[&e&h&o&z'R'a'd'v(S(d(i)o)u*v*{+a+f+y,^,p,|-P-V-b-c-f-t-y-|.i.r.t1Z1[1`1m1r1t2T2m2s3R3U3p3{5q8bR4d.zQ(_#US.{(^(`S4e.|.}R8O4fQ.x(]R7|4`#|!TO[_ewx!f!g!u!}#O#V#Z$U$V$g$n%W&U&W&[&e&h&o&z'R'a'd'v(S(d(i)o)u*v*{+a+f+y,^,p,|-P-V-b-c-f-t-y-|.i.r.t1Z1[1`1m1r1t2T2m2s3R3U3p3{5q8bp$y`$f$u%Z&t'b(a(h)n*i-Y/r1q5r5}8]q)S#m%{.l0z3z4O4R4S7j7l7m7o7r9`9a:YR,Z&hR6_2T'X!VO[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/c/j/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:m$q#tS%V%]'S'Z']'c'e(c(g(j(|(})W)X)Z)[)])^)_)`)a)b)c)d)p)v)}+^+l,T,X,o,z-m-n.R/O/w0g0i0n0p1O1g2Q2h2o3Y3j3k4j4k4q4t4z4|5Q5R5k5w6O6]6l6p6z7R7x7y7{8Z8[8j8m8q8y9[9c9r9x:T:[:a:g:p$]#uS%V%]'S'Z']'c'e(j(|(})W)[)c)d)p)v)}+^+l,T,X,o,z-m-n.R/O/w0g0i0n0p1O1g2Q2h2o3Y3j3k4j4k4q4t4z4|5Q5R5k5w6O6]6l6p6z7R7x7y7{8Z8[8j8m8q8y9[9c9r9x:T:[:a:g:p$Z#vS%V%]'S'Z']'c'e(j(|(})W)c)d)p)v)}+^+l,T,X,o,z-m-n.R/O/w0g0i0n0p1O1g2Q2h2o3Y3j3k4j4k4q4t4z4|5Q5R5k5w6O6]6l6p6z7R7x7y7{8Z8[8j8m8q8y9[9c9r9x:T:[:a:g:p$c#yS%V%]'S'Z']'c'e(j(|(})W)Z)[)])^)c)d)p)v)}+^+l,T,X,o,z-m-n.R/O/w0g0i0n0p1O1g2Q2h2o3Y3j3k4j4k4q4t4z4|5Q5R5k5w6O6]6l6p6z7R7x7y7{8Z8[8j8m8q8y9[9c9r9x:T:[:a:g:p'X![O[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/c/j/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mQ/U(hQ/q)nQ4y/rR9k8Q']![O[aefwx{!W!X!g!k!n!r!s!v!x#X#Y#[#h#k#n#s#t#u#v#w#x#y#z#{#|$P$W$Y$[$g$h$m%_%o&S&U&Y&d&h&z&{'O'Q'R'd'k'l'{(b(d(k)q)w*m*n*q*v*w*{+]+_+m+o+p,U,W,s,v,|-b-c-f-l.U.V.Z/S/V/c/j/s/u/z/|0o1S1X1h1i1s1w2R2T2j2m2p2|3R3U3p4V4Y4_5a5l5x6f6j6m6o6q6{6}7S7i7q7t8l8n8t8z8{9Y9^9d9f9s9v9w:S:V:]:_:d:i:mQ(m#]R/W(mQ#fQR(z#fU%Oa;g<Pb%We$g&h(d-V1t2T2s8bQ'a!u!Q*c%O%W'a*e*k+m,U0d0e1i2w6x6{7l8w9`9d:Y;_;v;w;}<O<_S*e%P%UQ*k%ZS+m&Y1XQ,U&dQ0d*gQ0e*iQ1i+pQ2w-[S6x2x2zQ6{2|Q7l4OQ8w6yS9`7m7oQ9d7qQ:Y9aQ;_%fS;v;`;aS;w<`<aQ;};xQ<O;yT<_1R;h[[Owx!g&U*vl$e['O(P+a,^,m,p-U-c-t.P.d.i.vl'O!k%o&{'Q,v2j6j6q8n9s9w:_:d:m^(P#R#S#T+g3c3d3e`+a&W&[&e*{1Z1[1m3pS,^&o-yQ,m&yU,p&z'R3US-U'^2rW-c'd-b-f3RS-t'v-|Q.P'zQ.d(RS.i(S.rR.v(WQ*R$^R0P*RQ0Y*SQ5U0TQ5V0UQ5W0VY5X0Y5U5V5W8XR8X5ZQ*U$_S0]*U0^R0^*VS.e(R.dS3u.e7cR7c3wQ3x.fS7a3v3yU7e3x7a9SR9S7bQ.r(SR4Z.r!|_O[wx!f!g!}#O$U$n&U&W&[&e&o&z'R'd'v(S)u*v*{+a,^,p,|-P-b-c-f-t-y-|.i.r.t1Z1[1m2m3R3U3p3{U$t_$w*bU$w`$f&tR*b$uU%Pa;g<Pd*f%P*g2x6y7m9a;`;x;y<`Q*g%UQ2x-[Q6y2zQ7m4OQ9a7oQ;`%fQ;x;aQ;y<aT<`1R;hS,Q&c7pR1z,QS*o%]/wR0j*oQ1]+dR5p1]U+j&X1R<PR1d+jQ+x&`Q1j+qT1p+x1jQ8c6QR9p8cQwOS&Tw&UT&Ux*vQ,e&sR2^,eW)z$Y*v/u5aR/{)zU/v)v){0nR5O/v[*z%g%h*]2g2n3SR0t*zQ,i&wR2a,iQ-f'dQ3R-bT3T-f3RQ3O-^R7P3OQ-k'iQ2Y,bT3X-k2YS%rm7XR+P%rdnOwx!g&U'v(S*v-|.rR%wnQ0{+WR5e0{Q.Z'{R3m.ZQ1},SR6X1}U*s%b*};bR0m*sS1n+s0uR5{1nQ7s4QQ9V7fU9h7s9V:UR:U9]$O!SO[_ewx!f!g!u!}#O#V#Z$U$V$g$n%W&U&W&[&e&h&o&z'R'a'd'v(S(d(i)o)u*v*{+a+f+y,^,p,|-P-V-b-c-f-t-y-|.i.r.t.z1Z1[1`1m1r1t2T2m2s3R3U3p3{5q8bR&i!SQ4a.xR7}4aQ2U,ZR6`2US/k)d)eR4v/kW(t#b(o(p/ZR/_(tQ8S4mR9m8ST)f$P*{!USO[wx!g!k%o&U&{'O'Q'd,v-b-c-f2j3R6j6q8n9s9w:_:d:mj${a{$m%_+o,W1h2R5x6}8z9f:]Y%Ve$g(d1w3pY%]f$h(k)q*qQ&l!WQ&m!XQ'S!nQ'Z!rQ']!sQ'c!vQ'e!xQ(c#XQ(g#YS(j#[+_Q(|#hQ(}#kQ)W#nQ)X#sQ)Y#tQ)Z#uQ)[#vQ)]#wQ)^#xQ)_#yQ)`#zQ)a#{Q)b#|Q)c#}S)d$P*{Q)p$WQ)v$YQ)}$[Q+^&SS+l&Y1XQ,T&dQ,X&hQ,o&zQ,z'RQ-m'kQ-n'lS.R'{.ZQ/O(bS/w)w0oS0g*m4hQ0i*nQ0n*vQ0p*wQ1O+]S1g+m+pQ2Q,UQ2h,sS2o,|7SQ3Y-lQ3j.UQ3k.VQ4j/SQ4k/VQ4q/cQ4t/jQ4z/sQ4|/uQ5Q/zQ5R/|Q5k1SQ5w1iQ6O1sQ6]2TS6l2m8{Q6p2pQ6z2|Q7R3UQ7x4VQ7y4YQ7{4_Q8Z5aQ8[5lQ8j6fQ8m6mQ8q6oQ8y6{S9[7i7tQ9c7qQ9r8lQ9x8tS:T9Y9^Q:[9dQ:a9vS:g:S:VR:p:iR,[&hd]Owx!g&U'v(S*v-|.r!v^[_`!f!}#O$U$f$n$u$w&W&[&e&o&t&z'R'd)u*b*{+a,^,p,|-P-b-c-f-t-y.i.t1Z1[1m2m3R3U3p3{#r$}ae!u$g%O%P%U%W%Z%f&Y&d&h'a(d*e*g*i*k+m+p,U-V-[0d0e1X1i1t2T2s2w2x2z2|4O6x6y6{7l7m7o7q8b8w9`9a9d:Y;_;`;a;g;h;v;w;x;y;}<O<_<`<aQ%vnS+i&X+jW+w&`+q+x1jU,P&c,Q7pQ1r+yT5j1R<P``Owx!g&U'v*v-|S$f[-tQ$u_b%Ze$g&h(d-V1t2T2s8b!h&t!f!}#O$U$n&W&[&e&o&z'R'd(S)u*{+a,^,p,|-P-b-c-f-y.i.r.t1Z1[1m2m3R3U3p3{Q'b!uS(a#V+fQ(h#ZS)n$V(iQ*i%WQ-Y'aQ/r)oQ1q+yQ5r1`Q5}1rR8]5qS(Y#R3dS(Z#S3eV([#T+g3cR$`Ye0X*S0T0U0V0Y5U5V5W5Z8XW(T#R#S#T+gQ(^#US.`(P(WS.f(R.dQ.}(`W1y,O.^6U6WQ3b-yQ3o.]Q3v.eQ4^.vU7[3c3d3eQ7d3wR9T7cQ.g(RR3t.dT.q(S.rdgOwx!g&U&o'v*v-y-|U$i[,^-tQ&u!fQ'm!}Q'w#OQ)m$UQ*_$n`+b&W&[&e*{1Z1[1m3pQ,q&zQ,{'RY-d'd-b-f3R3US.l(S.rQ/t)uQ1Q+aS2f,p-cS2q,|-PS3z.i.tQ6n2mR7j3{d]Owx!g&U'v(S*v-|.r!v^[_`!f!}#O$U$f$n$u$w&W&[&e&o&t&z'R'd)u*b*{+a,^,p,|-P-b-c-f-t-y.i.t1Z1[1m2m3R3U3p3{R%vnQ4Q.lQ7f3zQ7n4OQ7v4RQ7w4SQ9]7jU9_7l7m7oQ9g7rS:X9`9aR:j:YZ+t&[&e*{1Z3ppzOnpwx!g%y&U'v(S*v-u-|.k.r.t[%Qa%f1R;g;h<PU%Ye%j1ZQ%gg^&f{|%k1V5h;i<QQ'u#OQ*]$ib*d%O%P%U;_;`;a<_<`<aQ,g&uQ-}'wQ0b*_[0c*e*g;v;w;x;yQ0r*yQ1T+bQ2g,qQ2n,{S3S-d2fU5^0d;}<OQ5i1QQ6s2qR8p6nQ,S&cR9b7pS1x,O.^Q8e6UR8f6W[%`f$h(k)q)w0oR0k*qR+e&WQ+d&WR5o1[S&Zy+}Q*l%ZU+k&X1R<PS+r&[1ZW+u&]1V5h<QQ-o'mQ/o)mS0f*i*kQ1Y+bQ1e+jQ4{/tQ5_0eQ5g1QQ5|1qR8`5}R6R1tYvOwx&U*vR&v!gW%ig,q,{-dT*^$i2fT)|$Y*v[uOwx!g&U*vQ'P!kQ+O%oQ,u&{Q,y'QQ2k,vQ6i2jQ8k6jQ8s6qQ9u8nQ:`9sQ:c9wQ:l:_Q:n:dR:r:mxlOwx!g!k%o&U&{'Q*v,v2j6j6q8n9s9w:_:d:mU$j['O-cX-e'd-b-f3RQ-a'bR2v-YS-^'b-YQ2y-[Q3P-_U6w2w2x2zQ7O2}S8v6x6yR9z8w[rOwx!g&U*vS-v'v-|T.m(S.rR+X%{[sOwx!g&U*vS-x'v-|T.n(S.r[tOwx!g&U*vT.o(S.rT.Y'{.ZX%cf%m0o1XQ.|(^R4f.}R.y(]R(f#XQ(w#bS/Y(o(pR4l/ZR/^(qR4n/[",
    nodeNames: "\u26A0 RawString > MacroName LineComment BlockComment PreprocDirective #include String EscapeSequence SystemLibString Identifier ) ( ArgumentList ConditionalExpression AssignmentExpression CallExpression PrimitiveType FieldExpression FieldIdentifier DestructorName TemplateMethod ScopedFieldIdentifier NamespaceIdentifier TemplateType TypeIdentifier ScopedTypeIdentifier ScopedNamespaceIdentifier :: NamespaceIdentifier TypeIdentifier TemplateArgumentList < TypeDescriptor const volatile restrict _Atomic mutable constexpr constinit consteval StructSpecifier struct MsDeclspecModifier __declspec Attribute AttributeName Identifier AttributeArgs { } [ ] UpdateOp ArithOp ArithOp ArithOp LogicOp BitOp BitOp BitOp CompareOp CompareOp CompareOp > CompareOp BitOp UpdateOp , Number CharLiteral AttributeArgs VirtualSpecifier BaseClassClause Access virtual FieldDeclarationList FieldDeclaration extern static register inline thread_local AttributeSpecifier __attribute__ PointerDeclarator MsBasedModifier __based MsPointerModifier FunctionDeclarator ParameterList ParameterDeclaration PointerDeclarator FunctionDeclarator Noexcept noexcept RequiresClause requires True False ParenthesizedExpression CommaExpression LambdaExpression LambdaCaptureSpecifier TemplateParameterList OptionalParameterDeclaration TypeParameterDeclaration typename class VariadicParameterDeclaration VariadicDeclarator ReferenceDeclarator OptionalTypeParameterDeclaration VariadicTypeParameterDeclaration TemplateTemplateParameterDeclaration template AbstractFunctionDeclarator AbstractPointerDeclarator AbstractArrayDeclarator AbstractParenthesizedDeclarator AbstractReferenceDeclarator ThrowSpecifier throw TrailingReturnType CompoundStatement FunctionDefinition MsCallModifier TryStatement try CatchClause catch LinkageSpecification Declaration InitDeclarator InitializerList InitializerPair SubscriptDesignator FieldDesignator ExportDeclaration export ImportDeclaration import ModuleName PartitionName HeaderName CaseStatement case default LabeledStatement StatementIdentifier ExpressionStatement IfStatement if ConditionClause Declaration else SwitchStatement switch DoStatement do while WhileStatement ForStatement for ReturnStatement return BreakStatement break ContinueStatement continue GotoStatement goto CoReturnStatement co_return CoYieldStatement co_yield AttributeStatement ForRangeLoop AliasDeclaration using TypeDefinition typedef PointerDeclarator FunctionDeclarator ArrayDeclarator ParenthesizedDeclarator ThrowStatement NamespaceDefinition namespace ScopedIdentifier Identifier OperatorName operator ArithOp BitOp CompareOp LogicOp new delete co_await ConceptDefinition concept UsingDeclaration enum StaticAssertDeclaration static_assert ConcatenatedString TemplateDeclaration FriendDeclaration friend union FunctionDefinition ExplicitFunctionSpecifier explicit FieldInitializerList FieldInitializer DefaultMethodClause DeleteMethodClause FunctionDefinition OperatorCast operator TemplateInstantiation FunctionDefinition FunctionDefinition Declaration ModuleDeclaration module RequiresExpression RequirementList SimpleRequirement TypeRequirement CompoundRequirement ReturnTypeRequirement ConstraintConjuction LogicOp ConstraintDisjunction LogicOp ArrayDeclarator ParenthesizedDeclarator ReferenceDeclarator TemplateFunction OperatorName StructuredBindingDeclarator ArrayDeclarator ParenthesizedDeclarator ReferenceDeclarator BitfieldClause FunctionDefinition FunctionDefinition Declaration FunctionDefinition Declaration AccessSpecifier UnionSpecifier ClassSpecifier EnumSpecifier SizedTypeSpecifier TypeSize EnumeratorList Enumerator DependentType Decltype decltype auto PlaceholderTypeSpecifier ParameterPackExpansion ParameterPackExpansion FieldIdentifier PointerExpression SubscriptExpression BinaryExpression ArithOp LogicOp LogicOp BitOp UnaryExpression LogicOp BitOp UpdateExpression CastExpression SizeofExpression sizeof CoAwaitExpression CompoundLiteralExpression NULL NewExpression new NewDeclarator DeleteExpression delete ParameterPackExpansion nullptr this UserDefinedLiteral ParamPack #define PreprocArg #if #ifdef #ifndef #else #endif #elif PreprocDirectiveName Macro Program",
    maxTerm: 431,
    nodeProps: [
      ["group", -35, 1, 8, 11, 15, 16, 17, 19, 71, 72, 100, 101, 102, 104, 191, 208, 229, 242, 243, 270, 271, 272, 277, 280, 281, 282, 284, 285, 286, 287, 290, 292, 293, 294, 295, 296, "Expression", -13, 18, 25, 26, 27, 43, 255, 256, 257, 258, 262, 263, 265, 266, "Type", -19, 126, 129, 147, 150, 152, 153, 158, 160, 163, 164, 166, 168, 170, 172, 174, 176, 178, 179, 188, "Statement"],
      ["isolate", -3, 4, 8, 10, ""],
      ["openedBy", 12, "(", 52, "{", 54, "["],
      ["closedBy", 13, ")", 51, "}", 53, "]"]
    ],
    propSources: [cppHighlighting],
    skippedNodes: [0, 3, 4, 5, 6, 7, 10, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 308, 348, 349],
    repeatNodeCount: 42,
    tokenData: "%LSMfR!UOX$eXY({YZ.gZ]$e]^+P^p$epq({qr.}rs0}st2ktu$euv!7dvw!9bwx!;exy!<Yyz!=Tz{!>O{|!?R|}!AV}!O!BQ!O!P!DX!P!Q#+y!Q!R#5[!R![#JY![!]$4w!]!^$6s!^!_$7n!_!`%$h!`!a%%i!a!b%(o!b!c$e!c!n%)j!n!o%+R!o!w%)j!w!x%+R!x!}%)j!}#O%.O#O#P%/w#P#Q%?[#Q#R%AT#R#S%)j#S#T$e#T#i%)j#i#j%BW#j#o%)j#o#p%Cu#p#q%Dp#q#r%Fv#r#s%Gq#s;'S$e;'S;=`(u<%lO$e,j$nY)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$e,f%eW)c`'f,UOY%^Zw%^wx%}x#O%^#O#P&f#P;'S%^;'S;=`'x<%lO%^,U&SU'f,UOY%}Z#O%}#O#P&f#P;'S%};'S;=`'r<%lO%},U&kX'f,UOY%}YZ%}Z]%}]^'W^#O%}#O#P&f#P;'S%};'S;=`'r<%lO%},U']V'f,UOY%}YZ%}Z#O%}#O#P&f#P;'S%};'S;=`'r<%lO%},U'uP;=`<%l%},f'{P;=`<%l%^,Y(VW(vS'f,UOY(OZr(Ors%}s#O(O#O#P&f#P;'S(O;'S;=`(o<%lO(O,Y(rP;=`<%l(O,j(xP;=`<%l$eMf)Y`)c`(vS(o<`'f,U*a1pOX$eXY({YZ*[Z]$e]^+P^p$epq({qr$ers%^sw$ewx(Ox#O$e#O#P,^#P;'S$e;'S;=`(u<%lO$e<`*aT(o<`XY*[YZ*[]^*[pq*[#O#P*p<`*sQYZ*[]^*y<`*|PYZ*[Gz+[`)c`(vS(o<`'f,UOX$eXY+PYZ*[Z]$e]^+P^p$epq+Pqr$ers%^sw$ewx(Ox#O$e#O#P,^#P;'S$e;'S;=`(u<%lO$eGf,cX'f,UOY%}YZ-OZ]%}]^-{^#O%}#O#P&f#P;'S%};'S;=`'r<%lO%}Gf-V[(o<`'f,UOX%}XY-OYZ*[Z]%}]^-O^p%}pq-Oq#O%}#O#P,^#P;'S%};'S;=`'r<%lO%}Gf.QV'f,UOY%}YZ-OZ#O%}#O#P&f#P;'S%};'S;=`'r<%lO%}MQ.nT*^1p(o<`XY*[YZ*[]^*[pq*[#O#P*pF`/[[%^#t'QQ)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!_$e!_!`0Q!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`0_Y%]#t!a8O)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eKz1YY)c`(tS(u=j'f,UOY%^Zr%^rs1xsw%^wx%}x#O%^#O#P&f#P;'S%^;'S;=`'x<%lO%^/[2RW*O#t)c`'f,UOY%^Zw%^wx%}x#O%^#O#P&f#P;'S%^;'S;=`'x<%lO%^Gz2tf)c`(vS'f,UOX$eXY2kZp$epq2kqr$ers%^sw$ewx(Ox!c$e!c!}4Y!}#O$e#O#P&f#P#T$e#T#W4Y#W#X5m#X#Y>u#Y#]4Y#]#^NZ#^#o4Y#o;'S$e;'S;=`(u<%lO$eGz4eb)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eGz5xd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#X4Y#X#Y7W#Y#o4Y#o;'S$e;'S;=`(u<%lO$eGz7cd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#Y4Y#Y#Z8q#Z#o4Y#o;'S$e;'S;=`(u<%lO$eGz8|d)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#]4Y#]#^:[#^#o4Y#o;'S$e;'S;=`(u<%lO$eGz:gd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#b4Y#b#c;u#c#o4Y#o;'S$e;'S;=`(u<%lO$eGz<Qd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#X4Y#X#Y=`#Y#o4Y#o;'S$e;'S;=`(u<%lO$eGz=mb)c`(vS'e<`'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eGz?Qf)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#`4Y#`#a@f#a#b4Y#b#cHV#c#o4Y#o;'S$e;'S;=`(u<%lO$eGz@qf)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#]4Y#]#^BV#^#g4Y#g#hEV#h#o4Y#o;'S$e;'S;=`(u<%lO$eGzBbd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#Y4Y#Y#ZCp#Z#o4Y#o;'S$e;'S;=`(u<%lO$eGzC}b)c`(vS'f,U'l<`'m<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eGzEbd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#X4Y#X#YFp#Y#o4Y#o;'S$e;'S;=`(u<%lO$eGzF}b)c`(vS'j<`'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eGzHbd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#W4Y#W#XIp#X#o4Y#o;'S$e;'S;=`(u<%lO$eGzI{d)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#]4Y#]#^KZ#^#o4Y#o;'S$e;'S;=`(u<%lO$eGzKfd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#Y4Y#Y#ZLt#Z#o4Y#o;'S$e;'S;=`(u<%lO$eGzMRb)c`(vS'f,U'k<`'m<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eGzNff)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#Y4Y#Y#Z! z#Z#b4Y#b#c!.[#c#o4Y#o;'S$e;'S;=`(u<%lO$eGz!!Xf)c`(vS'g<`'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#W4Y#W#X!#m#X#b4Y#b#c!(W#c#o4Y#o;'S$e;'S;=`(u<%lO$eGz!#xd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#X4Y#X#Y!%W#Y#o4Y#o;'S$e;'S;=`(u<%lO$eGz!%cd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#Y4Y#Y#Z!&q#Z#o4Y#o;'S$e;'S;=`(u<%lO$eGz!'Ob)c`(vS'h<`'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eGz!(cd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#W4Y#W#X!)q#X#o4Y#o;'S$e;'S;=`(u<%lO$eGz!)|d)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#X4Y#X#Y!+[#Y#o4Y#o;'S$e;'S;=`(u<%lO$eGz!+gd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#Y4Y#Y#Z!,u#Z#o4Y#o;'S$e;'S;=`(u<%lO$eGz!-Sb)c`(vS'i<`'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eGz!.gd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#V4Y#V#W!/u#W#o4Y#o;'S$e;'S;=`(u<%lO$eGz!0Qd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#`4Y#`#a!1`#a#o4Y#o;'S$e;'S;=`(u<%lO$eGz!1kd)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#i4Y#i#j!2y#j#o4Y#o;'S$e;'S;=`(u<%lO$eGz!3Ud)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#W4Y#W#X!4d#X#o4Y#o;'S$e;'S;=`(u<%lO$eGz!4od)c`(vS'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#X4Y#X#Y!5}#Y#o4Y#o;'S$e;'S;=`(u<%lO$eGz!6[b)c`(vSV<`'f,U'm<`OY$eZr$ers%^sw$ewx(Ox!Q$e!Q![4Y![!c$e!c!}4Y!}#O$e#O#P&f#P#R$e#R#S4Y#S#T$e#T#o4Y#o;'S$e;'S;=`(u<%lO$eF`!7q[)c`(vS%Z#t![8O'f,UOY$eZr$ers%^sw$ewx(Ox!_$e!_!`!8g!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!8rY!g:t)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!9o])]8O)c`(vS%[#t'f,UOY$eZr$ers%^sv$evw!:hwx(Ox!_$e!_!`!8g!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!:uY)[8O%^#t)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCb!;pW)aW(vS)b8O'f,UOY(OZr(Ors%}s#O(O#O#P&f#P;'S(O;'S;=`(o<%lO(OLS!<eY)c`(vS]Kn'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$e-^!=`Y[r)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!>][)Y8O)c`(vS%Z#t'f,UOY$eZr$ers%^sw$ewx(Ox!_$e!_!`!8g!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!?`^)c`(vS%Z#t!Y8O'f,UOY$eZr$ers%^sw$ewx(Ox{$e{|!@[|!_$e!_!`!8g!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!@gY)c`!X:t(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCr!AbY!h8W)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!B__)c`(vS%Z#t!Y8O'f,UOY$eZr$ers%^sw$ewx(Ox}$e}!O!@[!O!_$e!_!`!8g!`!a!C^!a#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`!CiY(}:t)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCr!Dd^)c`(vS'f,U(|8OOY$eZr$ers%^sw$ewx(Ox!O$e!O!P!E`!P!Q$e!Q![!GY![#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCr!Ei[)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!O$e!O!P!F_!P#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCr!FjY)`8W)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCj!Gen)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx!Icx!Q$e!Q![!GY![!g$e!g!h#$w!h!i#*Y!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#X$e#X#Y#$w#Y#Z#*Y#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCY!IjY(vS'f,UOY(OZr(Ors%}s!Q(O!Q![!JY![#O(O#O#P&f#P;'S(O;'S;=`(o<%lO(OCY!Jcn(vS!i8O'f,UOY(OZr(Ors%}sw(Owx!Icx!Q(O!Q![!JY![!g(O!g!h!La!h!i##`!i!n(O!n!o##`!o!r(O!r!s!La!s!w(O!w!x##`!x#O(O#O#P&f#P#X(O#X#Y!La#Y#Z##`#Z#`(O#`#a##`#a#d(O#d#e!La#e#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCY!Ljl(vS!i8O'f,UOY(OZr(Ors%}s{(O{|!Nb|}(O}!O!Nb!O!Q(O!Q![# e![!c(O!c!h# e!h!i# e!i!n(O!n!o##`!o!w(O!w!x##`!x#O(O#O#P&f#P#T(O#T#Y# e#Y#Z# e#Z#`(O#`#a##`#a#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCY!Ni^(vS'f,UOY(OZr(Ors%}s!Q(O!Q![# e![!c(O!c!i# e!i#O(O#O#P&f#P#T(O#T#Z# e#Z;'S(O;'S;=`(o<%lO(OCY# nj(vS!i8O'f,UOY(OZr(Ors%}sw(Owx!Nbx!Q(O!Q![# e![!c(O!c!h# e!h!i# e!i!n(O!n!o##`!o!w(O!w!x##`!x#O(O#O#P&f#P#T(O#T#Y# e#Y#Z# e#Z#`(O#`#a##`#a#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCY##id(vS!i8O'f,UOY(OZr(Ors%}s!h(O!h!i##`!i!n(O!n!o##`!o!w(O!w!x##`!x#O(O#O#P&f#P#Y(O#Y#Z##`#Z#`(O#`#a##`#a#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCj#%Sn)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx(Ox{$e{|#'Q|}$e}!O#'Q!O!Q$e!Q![#(]![!c$e!c!h#(]!h!i#(]!i!n$e!n!o#*Y!o!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#Y#(]#Y#Z#(]#Z#`$e#`#a#*Y#a#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCj#'Z`)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!Q$e!Q![#(]![!c$e!c!i#(]!i#O$e#O#P&f#P#T$e#T#Z#(]#Z;'S$e;'S;=`(u<%lO$eCj#(hj)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx!Nbx!Q$e!Q![#(]![!c$e!c!h#(]!h!i#(]!i!n$e!n!o#*Y!o!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#Y#(]#Y#Z#(]#Z#`$e#`#a#*Y#a#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCj#*ef)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx(Ox!h$e!h!i#*Y!i!n$e!n!o#*Y!o!w$e!w!x#*Y!x#O$e#O#P&f#P#Y$e#Y#Z#*Y#Z#`$e#`#a#*Y#a#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eMf#,W`)c`(vS%Z#t![8O'f,UOY$eZr$ers%^sw$ewx(Oxz$ez{#-Y{!P$e!P!Q#.T!Q!_$e!_!`!8g!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eMf#-eY)c`(vS(pAz'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eMf#.`Y)c`(vSSAz'f,UOY#.TZr#.Trs#/Osw#.Twx#4]x#O#.T#O#P#0[#P;'S#.T;'S;=`#5U<%lO#.TMb#/XW)c`SAz'f,UOY#/OZw#/Owx#/qx#O#/O#O#P#0[#P;'S#/O;'S;=`#4V<%lO#/OMQ#/xUSAz'f,UOY#/qZ#O#/q#O#P#0[#P;'S#/q;'S;=`#1l<%lO#/qMQ#0cXSAz'f,UOY#/qYZ%}Z]#/q]^#1O^#O#/q#O#P#1r#P;'S#/q;'S;=`#1l<%lO#/qMQ#1VVSAz'f,UOY#/qYZ%}Z#O#/q#O#P#0[#P;'S#/q;'S;=`#1l<%lO#/qMQ#1oP;=`<%l#/qMQ#1y]SAz'f,UOY#/qYZ%}Z]#/q]^#1O^#O#/q#O#P#1r#P#b#/q#b#c#/q#c#f#/q#f#g#2r#g;'S#/q;'S;=`#1l<%lO#/qMQ#2yUSAz'f,UOY#/qZ#O#/q#O#P#3]#P;'S#/q;'S;=`#1l<%lO#/qMQ#3dZSAz'f,UOY#/qYZ%}Z]#/q]^#1O^#O#/q#O#P#1r#P#b#/q#b#c#/q#c;'S#/q;'S;=`#1l<%lO#/qMb#4YP;=`<%l#/OMU#4fW(vSSAz'f,UOY#4]Zr#4]rs#/qs#O#4]#O#P#0[#P;'S#4];'S;=`#5O<%lO#4]MU#5RP;=`<%l#4]Mf#5XP;=`<%l#.TCj#5gt)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx#7wx!O$e!O!P#B}!P!Q$e!Q![#JY![!g$e!g!h#$w!h!i#*Y!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#U$e#U#V#Li#V#X$e#X#Y#$w#Y#Z#*Y#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j#l$e#l#m$0p#m;'S$e;'S;=`(u<%lO$eCY#8OY(vS'f,UOY(OZr(Ors%}s!Q(O!Q![#8n![#O(O#O#P&f#P;'S(O;'S;=`(o<%lO(OCY#8wp(vS!i8O'f,UOY(OZr(Ors%}sw(Owx#7wx!O(O!O!P#:{!P!Q(O!Q![#8n![!g(O!g!h!La!h!i##`!i!n(O!n!o##`!o!r(O!r!s!La!s!w(O!w!x##`!x#O(O#O#P&f#P#X(O#X#Y!La#Y#Z##`#Z#`(O#`#a##`#a#d(O#d#e!La#e#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCY#;Un(vS!i8O'f,UOY(OZr(Ors%}s!Q(O!Q![#=S![!c(O!c!g#=S!g!h#@d!h!i#=S!i!n(O!n!o##`!o!r(O!r!s!La!s!w(O!w!x##`!x#O(O#O#P&f#P#T(O#T#X#=S#X#Y#@d#Y#Z#=S#Z#`(O#`#a##`#a#d(O#d#e!La#e#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCY#=]p(vS!i8O'f,UOY(OZr(Ors%}sw(Owx#?ax!Q(O!Q![#=S![!c(O!c!g#=S!g!h#@d!h!i#=S!i!n(O!n!o##`!o!r(O!r!s!La!s!w(O!w!x##`!x#O(O#O#P&f#P#T(O#T#X#=S#X#Y#@d#Y#Z#=S#Z#`(O#`#a##`#a#d(O#d#e!La#e#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCY#?h^(vS'f,UOY(OZr(Ors%}s!Q(O!Q![#=S![!c(O!c!i#=S!i#O(O#O#P&f#P#T(O#T#Z#=S#Z;'S(O;'S;=`(o<%lO(OCY#@mt(vS!i8O'f,UOY(OZr(Ors%}sw(Owx#?ax{(O{|!Nb|}(O}!O!Nb!O!Q(O!Q![#=S![!c(O!c!g#=S!g!h#@d!h!i#=S!i!n(O!n!o##`!o!r(O!r!s!La!s!w(O!w!x##`!x#O(O#O#P&f#P#T(O#T#X#=S#X#Y#@d#Y#Z#=S#Z#`(O#`#a##`#a#d(O#d#e!La#e#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCj#CYp)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx(Ox!Q$e!Q![#E^![!c$e!c!g#E^!g!h#Gm!h!i#E^!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#X#E^#X#Y#Gm#Y#Z#E^#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCj#Eip)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx#?ax!Q$e!Q![#E^![!c$e!c!g#E^!g!h#Gm!h!i#E^!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#X#E^#X#Y#Gm#Y#Z#E^#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCj#Gxt)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx#?ax{$e{|#'Q|}$e}!O#'Q!O!Q$e!Q![#E^![!c$e!c!g#E^!g!h#Gm!h!i#E^!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#X#E^#X#Y#Gm#Y#Z#E^#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCj#Jep)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx#7wx!O$e!O!P#B}!P!Q$e!Q![#JY![!g$e!g!h#$w!h!i#*Y!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#X$e#X#Y#$w#Y#Z#*Y#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCj#Lr_)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!O$e!O!P#Mq!P!Q$e!Q!R#Np!R![#JY![#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCj#Mz[)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!Q$e!Q![!GY![#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCj#N{t)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx#7wx!O$e!O!P#B}!P!Q$e!Q![#JY![!g$e!g!h#$w!h!i#*Y!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#U$e#U#V$#]#V#X$e#X#Y#$w#Y#Z#*Y#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j#l$e#l#m$$[#m;'S$e;'S;=`(u<%lO$eCj$#f[)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!Q$e!Q![#JY![#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCj$$e`)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!Q$e!Q![$%g![!c$e!c!i$%g!i#O$e#O#P&f#P#T$e#T#Z$%g#Z;'S$e;'S;=`(u<%lO$eCj$%rr)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx$'|x!O$e!O!P#B}!P!Q$e!Q![$%g![!c$e!c!g$%g!g!h$.Q!h!i$%g!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#X$%g#X#Y$.Q#Y#Z$%g#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCY$(T^(vS'f,UOY(OZr(Ors%}s!Q(O!Q![$)P![!c(O!c!i$)P!i#O(O#O#P&f#P#T(O#T#Z$)P#Z;'S(O;'S;=`(o<%lO(OCY$)Yr(vS!i8O'f,UOY(OZr(Ors%}sw(Owx$'|x!O(O!O!P#:{!P!Q(O!Q![$)P![!c(O!c!g$)P!g!h$+d!h!i$)P!i!n(O!n!o##`!o!r(O!r!s!La!s!w(O!w!x##`!x#O(O#O#P&f#P#T(O#T#X$)P#X#Y$+d#Y#Z$)P#Z#`(O#`#a##`#a#d(O#d#e!La#e#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCY$+mu(vS!i8O'f,UOY(OZr(Ors%}sw(Owx$'|x{(O{|!Nb|}(O}!O!Nb!O!P#:{!P!Q(O!Q![$)P![!c(O!c!g$)P!g!h$+d!h!i$)P!i!n(O!n!o##`!o!r(O!r!s!La!s!w(O!w!x##`!x#O(O#O#P&f#P#T(O#T#X$)P#X#Y$+d#Y#Z$)P#Z#`(O#`#a##`#a#d(O#d#e!La#e#i(O#i#j##`#j;'S(O;'S;=`(o<%lO(OCj$.]u)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx$'|x{$e{|#'Q|}$e}!O#'Q!O!P#B}!P!Q$e!Q![$%g![!c$e!c!g$%g!g!h$.Q!h!i$%g!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#X$%g#X#Y$.Q#Y#Z$%g#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j;'S$e;'S;=`(u<%lO$eCj$0yc)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!O$e!O!P#Mq!P!Q$e!Q!R$2U!R![$%g![!c$e!c!i$%g!i#O$e#O#P&f#P#T$e#T#Z$%g#Z;'S$e;'S;=`(u<%lO$eCj$2av)c`(vS!i8O'f,UOY$eZr$ers%^sw$ewx$'|x!O$e!O!P#B}!P!Q$e!Q![$%g![!c$e!c!g$%g!g!h$.Q!h!i$%g!i!n$e!n!o#*Y!o!r$e!r!s#$w!s!w$e!w!x#*Y!x#O$e#O#P&f#P#T$e#T#U$%g#U#V$%g#V#X$%g#X#Y$.Q#Y#Z$%g#Z#`$e#`#a#*Y#a#d$e#d#e#$w#e#i$e#i#j#*Y#j#l$e#l#m$$[#m;'S$e;'S;=`(u<%lO$eGz$5S[({9b)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox![$e![!]$5x!]#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eFh$6TYm:|)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eCj$7OY)_8O)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eM^$7{_q8O%]#t)c`(vS'f,UOY$8zYZ$9|Zr$8zrs$:ksw$8zwx$Jax!^$8z!^!_$MX!_!`% f!`!a%#m!a#O$8z#O#P$<r#P;'S$8z;'S;=`$MR<%lO$8z3h$9T])c`(vS'f,UOY$8zYZ$9|Zr$8zrs$:ksw$8zwx$Jax!`$8z!`!a$LU!a#O$8z#O#P$<r#P;'S$8z;'S;=`$MR<%lO$8z!b$:PTO!`$9|!`!a$:`!a;'S$9|;'S;=`$:e<%lO$9|!b$:eO$W!b!b$:hP;=`<%l$9|3d$:rZ)c`'f,UOY$:kYZ$9|Zw$:kwx$;ex!`$:k!`!a$If!a#O$:k#O#P$<r#P;'S$:k;'S;=`$JZ<%lO$:k3S$;jX'f,UOY$;eYZ$9|Z!`$;e!`!a$<V!a#O$;e#O#P$<r#P;'S$;e;'S;=`$AY<%lO$;e3S$<`U$W!bY&j'f,UOY%}Z#O%}#O#P&f#P;'S%};'S;=`'r<%lO%}3S$<w['f,UOY$;eYZ$;eZ]$;e]^$=m^!`$;e!`!a$A`!a#O$;e#O#P$HO#P;'S$;e;'S;=`$Hv;=`<%l$F[<%lO$;e3S$=rX'f,UOY$;eYZ$>_Z!`$;e!`!a$<V!a#O$;e#O#P$<r#P;'S$;e;'S;=`$AY<%lO$;e-h$>dX'f,UOY$>_YZ$9|Z!`$>_!`!a$?P!a#O$>_#O#P$?j#P;'S$>_;'S;=`$AS<%lO$>_-h$?WU$W!b'f,UOY%}Z#O%}#O#P&f#P;'S%};'S;=`'r<%lO%}-h$?oZ'f,UOY$>_YZ$>_Z]$>_]^$@b^!`$>_!`!a$?P!a#O$>_#O#P$?j#P;'S$>_;'S;=`$AS<%lO$>_-h$@gX'f,UOY$>_YZ$>_Z!`$>_!`!a$?P!a#O$>_#O#P$?j#P;'S$>_;'S;=`$AS<%lO$>_-h$AVP;=`<%l$>_3S$A]P;=`<%l$;e3S$AgW$W!b'f,UOY$BPZ!`$BP!`!a$Bn!a#O$BP#O#P$CX#P;'S$BP;'S;=`$Dn<%lO$BP1p$BUW'f,UOY$BPZ!`$BP!`!a$Bn!a#O$BP#O#P$CX#P;'S$BP;'S;=`$Dn<%lO$BP1p$BuUY&j'f,UOY%}Z#O%}#O#P&f#P;'S%};'S;=`'r<%lO%}1p$C^Y'f,UOY$BPYZ$BPZ]$BP]^$C|^#O$BP#O#P$Dt#P;'S$BP;'S;=`$El;=`<%l$F[<%lO$BP1p$DRX'f,UOY$BPYZ%}Z!`$BP!`!a$Bn!a#O$BP#O#P$CX#P;'S$BP;'S;=`$Dn<%lO$BP1p$DqP;=`<%l$BP1p$DyZ'f,UOY$BPYZ%}Z]$BP]^$C|^!`$BP!`!a$Bn!a#O$BP#O#P$CX#P;'S$BP;'S;=`$Dn<%lO$BP1p$EoXOY$F[Z!`$F[!`!a$Fw!a#O$F[#O#P$F|#P;'S$F[;'S;=`$Gx;=`<%l$BP<%lO$F[&j$F_WOY$F[Z!`$F[!`!a$Fw!a#O$F[#O#P$F|#P;'S$F[;'S;=`$Gx<%lO$F[&j$F|OY&j&j$GPRO;'S$F[;'S;=`$GY;=`O$F[&j$G]XOY$F[Z!`$F[!`!a$Fw!a#O$F[#O#P$F|#P;'S$F[;'S;=`$Gx;=`<%l$F[<%lO$F[&j$G{P;=`<%l$F[3S$HTZ'f,UOY$;eYZ$>_Z]$;e]^$=m^!`$;e!`!a$<V!a#O$;e#O#P$<r#P;'S$;e;'S;=`$AY<%lO$;e3S$HyXOY$F[Z!`$F[!`!a$Fw!a#O$F[#O#P$F|#P;'S$F[;'S;=`$Gx;=`<%l$;e<%lO$F[3d$IqW$W!bY&j)c`'f,UOY%^Zw%^wx%}x#O%^#O#P&f#P;'S%^;'S;=`'x<%lO%^3d$J^P;=`<%l$:k3W$JhZ(vS'f,UOY$JaYZ$9|Zr$Jars$;es!`$Ja!`!a$KZ!a#O$Ja#O#P$<r#P;'S$Ja;'S;=`$LO<%lO$Ja3W$KfW$W!bY&j(vS'f,UOY(OZr(Ors%}s#O(O#O#P&f#P;'S(O;'S;=`(o<%lO(O3W$LRP;=`<%l$Ja3h$LcY$W!bY&j)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$e3h$MUP;=`<%l$8zM^$Mf^)c`(vS%[#t!f8O'f,UOY$8zYZ$9|Zr$8zrs$:ksw$8zwx$Jax!_$8z!_!`$Nb!`!a$LU!a#O$8z#O#P$<r#P;'S$8z;'S;=`$MR<%lO$8zM^$Nm]!g:t)c`(vS'f,UOY$8zYZ$9|Zr$8zrs$:ksw$8zwx$Jax!`$8z!`!a$LU!a#O$8z#O#P$<r#P;'S$8z;'S;=`$MR<%lO$8zM^% s]%]#t!b8O)c`(vS'f,UOY$8zYZ$9|Zr$8zrs$:ksw$8zwx$Jax!`$8z!`!a%!l!a#O$8z#O#P$<r#P;'S$8z;'S;=`$MR<%lO$8zM^%!}Y%]#t!b8O$W!bY&j)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$e2U%#xYY&j)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`%$s[)p#v)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!_$e!_!`0Q!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`%%v]%]#t)c`(vS!d8O'f,UOY$eZr$ers%^sw$ewx(Ox!_$e!_!`%&o!`!a%'l!a#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`%&|Y%]#t!b8O)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`%'y[)c`(vS%[#t!f8O'f,UOY$eZr$ers%^sw$ewx(Ox!_$e!_!`!8g!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$e,l%(zY(zQ)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eMf%)yb)c`)OW(vS!R7|(w*t'f,UOY$eZr$ers%^sw$ewx(Ox!Q$e!Q![%)j![!c$e!c!}%)j!}#O$e#O#P&f#P#R$e#R#S%)j#S#T$e#T#o%)j#o;'S$e;'S;=`(u<%lO$eMf%+bb)c`)OW(vS!R7|(w*t'f,UOY$eZr$ers%,jsw$ewx%-]x!Q$e!Q![%)j![!c$e!c!}%)j!}#O$e#O#P&f#P#R$e#R#S%)j#S#T$e#T#o%)j#o;'S$e;'S;=`(u<%lO$eIQ%,sW)c`(u=j'f,UOY%^Zw%^wx%}x#O%^#O#P&f#P;'S%^;'S;=`'x<%lO%^CY%-fW(vS)b8O'f,UOY(OZr(Ors%}s#O(O#O#P&f#P;'S(O;'S;=`(o<%lO(OF`%.ZZ!V:t)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox!}$e!}#O%.|#O#P&f#P;'S$e;'S;=`(u<%lO$e,l%/XY)VQ)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eGz%/|a'f,UOY%1RYZ%1lZ]%1R]^%2k^!Q%1R!Q![%3X![!w%1R!w!x%4i!x#O%1R#O#P%;o#P#i%1R#i#j%8T#j#l%1R#l#m%<c#m;'S%1R;'S;=`%?U<%lO%1R,j%1YUXd'f,UOY%}Z#O%}#O#P&f#P;'S%};'S;=`'r<%lO%}Gz%1u[Xd(o<`'f,UOX%}XY-OYZ*[Z]%}]^-O^p%}pq-Oq#O%}#O#P,^#P;'S%};'S;=`'r<%lO%}Gz%2rVXd'f,UOY%}YZ-OZ#O%}#O#P&f#P;'S%};'S;=`'r<%lO%},j%3`WXd'f,UOY%}Z!Q%}!Q![%3x![#O%}#O#P&f#P;'S%};'S;=`'r<%lO%},j%4PWXd'f,UOY%}Z!Q%}!Q![%1R![#O%}#O#P&f#P;'S%};'S;=`'r<%lO%},j%4n['f,UOY%}Z!Q%}!Q![%5d![!c%}!c!i%5d!i#O%}#O#P&f#P#T%}#T#Z%5d#Z;'S%};'S;=`'r<%lO%},j%5i['f,UOY%}Z!Q%}!Q![%6_![!c%}!c!i%6_!i#O%}#O#P&f#P#T%}#T#Z%6_#Z;'S%};'S;=`'r<%lO%},j%6d['f,UOY%}Z!Q%}!Q![%7Y![!c%}!c!i%7Y!i#O%}#O#P&f#P#T%}#T#Z%7Y#Z;'S%};'S;=`'r<%lO%},j%7_['f,UOY%}Z!Q%}!Q![%8T![!c%}!c!i%8T!i#O%}#O#P&f#P#T%}#T#Z%8T#Z;'S%};'S;=`'r<%lO%},j%8Y['f,UOY%}Z!Q%}!Q![%9O![!c%}!c!i%9O!i#O%}#O#P&f#P#T%}#T#Z%9O#Z;'S%};'S;=`'r<%lO%},j%9T['f,UOY%}Z!Q%}!Q![%9y![!c%}!c!i%9y!i#O%}#O#P&f#P#T%}#T#Z%9y#Z;'S%};'S;=`'r<%lO%},j%:O['f,UOY%}Z!Q%}!Q![%:t![!c%}!c!i%:t!i#O%}#O#P&f#P#T%}#T#Z%:t#Z;'S%};'S;=`'r<%lO%},j%:y['f,UOY%}Z!Q%}!Q![%1R![!c%}!c!i%1R!i#O%}#O#P&f#P#T%}#T#Z%1R#Z;'S%};'S;=`'r<%lO%},j%;vXXd'f,UOY%}YZ%}Z]%}]^'W^#O%}#O#P&f#P;'S%};'S;=`'r<%lO%},j%<h['f,UOY%}Z!Q%}!Q![%=^![!c%}!c!i%=^!i#O%}#O#P&f#P#T%}#T#Z%=^#Z;'S%};'S;=`'r<%lO%},j%=c['f,UOY%}Z!Q%}!Q![%>X![!c%}!c!i%>X!i#O%}#O#P&f#P#T%}#T#Z%>X#Z;'S%};'S;=`'r<%lO%},j%>`[Xd'f,UOY%}Z!Q%}!Q![%>X![!c%}!c!i%>X!i#O%}#O#P&f#P#T%}#T#Z%>X#Z;'S%};'S;=`'r<%lO%},j%?XP;=`<%l%1RCr%?gZ!W7^)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P#Q%@Y#Q;'S$e;'S;=`(u<%lO$e-d%@eY)Ux)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`%Ab[)c`(vS%[#t'f,U!_8OOY$eZr$ers%^sw$ewx(Ox!_$e!_!`!8g!`#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eMf%Bgd)c`)OW(vS!R7|(w*t'f,UOY$eZr$ers%,jsw$ewx%-]x!Q$e!Q!Y%)j!Y!Z%+R!Z![%)j![!c$e!c!}%)j!}#O$e#O#P&f#P#R$e#R#S%)j#S#T$e#T#o%)j#o;'S$e;'S;=`(u<%lO$eCj%DQY!T8O)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$eF`%D}^)c`(vS%[#t'f,U!^8OOY$eZr$ers%^sw$ewx(Ox!_$e!_!`!8g!`#O$e#O#P&f#P#p$e#p#q%Ey#q;'S$e;'S;=`(u<%lO$eF`%FWY)Z8O%^#t)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$e-^%GRY!Ur)c`(vS'f,UOY$eZr$ers%^sw$ewx(Ox#O$e#O#P&f#P;'S$e;'S;=`(u<%lO$e/j%HOc)c`(vS%[#t'RQ'f,UOX$eXY%IZZp$epq%IZqr$ers%^sw$ewx(Ox!c$e!c!}%Jo!}#O$e#O#P&f#P#R$e#R#S%Jo#S#T$e#T#o%Jo#o;'S$e;'S;=`(u<%lO$e,t%Idc)c`(vS'f,UOX$eXY%IZZp$epq%IZqr$ers%^sw$ewx(Ox!c$e!c!}%Jo!}#O$e#O#P&f#P#R$e#R#S%Jo#S#T$e#T#o%Jo#o;'S$e;'S;=`(u<%lO$e,t%Jzb)c`(vSeY'f,UOY$eZr$ers%^sw$ewx(Ox!Q$e!Q![%Jo![!c$e!c!}%Jo!}#O$e#O#P&f#P#R$e#R#S%Jo#S#T$e#T#o%Jo#o;'S$e;'S;=`(u<%lO$e",
    tokenizers: [rawString, fallback, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, new LocalTokenGroup("j~RQYZXz{^~^O(r~~aP!P!Qd~iO(s~~", 25, 355)],
    topRules: { "Program": [0, 307] },
    dynamicPrecedences: { "17": 1, "65": 1, "87": 1, "94": 1, "119": 1, "184": 1, "187": -10, "240": -10, "241": 1, "244": -1, "246": -10, "247": 1, "262": -1, "267": 2, "268": 2, "306": -10, "370": 3, "423": 1, "424": 3, "425": 1, "426": 1 },
    specialized: [{ term: 361, get: (value) => spec_identifier3[value] || -1 }, { term: 33, get: (value) => spec_[value] || -1 }, { term: 66, get: (value) => spec_templateArgsEnd[value] || -1 }, { term: 368, get: (value) => spec_scopedIdentifier[value] || -1 }],
    tokenPrec: 24916
  });

  // node_modules/@lezer/markdown/dist/index.js
  var CompositeBlock = class _CompositeBlock {
    static create(type, value, from, parentHash, end) {
      let hash2 = parentHash + (parentHash << 8) + type + (value << 4) | 0;
      return new _CompositeBlock(type, value, from, hash2, end, [], []);
    }
    constructor(type, value, from, hash2, end, children, positions) {
      this.type = type;
      this.value = value;
      this.from = from;
      this.hash = hash2;
      this.end = end;
      this.children = children;
      this.positions = positions;
      this.hashProp = [[NodeProp.contextHash, hash2]];
    }
    addChild(child, pos) {
      if (child.prop(NodeProp.contextHash) != this.hash)
        child = new Tree(child.type, child.children, child.positions, child.length, this.hashProp);
      this.children.push(child);
      this.positions.push(pos);
    }
    toTree(nodeSet, end = this.end) {
      let last = this.children.length - 1;
      if (last >= 0)
        end = Math.max(end, this.positions[last] + this.children[last].length + this.from);
      return new Tree(nodeSet.types[this.type], this.children, this.positions, end - this.from).balance({
        makeTree: (children, positions, length) => new Tree(NodeType.none, children, positions, length, this.hashProp)
      });
    }
  };
  var Type;
  (function(Type2) {
    Type2[Type2["Document"] = 1] = "Document";
    Type2[Type2["CodeBlock"] = 2] = "CodeBlock";
    Type2[Type2["FencedCode"] = 3] = "FencedCode";
    Type2[Type2["Blockquote"] = 4] = "Blockquote";
    Type2[Type2["HorizontalRule"] = 5] = "HorizontalRule";
    Type2[Type2["BulletList"] = 6] = "BulletList";
    Type2[Type2["OrderedList"] = 7] = "OrderedList";
    Type2[Type2["ListItem"] = 8] = "ListItem";
    Type2[Type2["ATXHeading1"] = 9] = "ATXHeading1";
    Type2[Type2["ATXHeading2"] = 10] = "ATXHeading2";
    Type2[Type2["ATXHeading3"] = 11] = "ATXHeading3";
    Type2[Type2["ATXHeading4"] = 12] = "ATXHeading4";
    Type2[Type2["ATXHeading5"] = 13] = "ATXHeading5";
    Type2[Type2["ATXHeading6"] = 14] = "ATXHeading6";
    Type2[Type2["SetextHeading1"] = 15] = "SetextHeading1";
    Type2[Type2["SetextHeading2"] = 16] = "SetextHeading2";
    Type2[Type2["HTMLBlock"] = 17] = "HTMLBlock";
    Type2[Type2["LinkReference"] = 18] = "LinkReference";
    Type2[Type2["Paragraph"] = 19] = "Paragraph";
    Type2[Type2["CommentBlock"] = 20] = "CommentBlock";
    Type2[Type2["ProcessingInstructionBlock"] = 21] = "ProcessingInstructionBlock";
    Type2[Type2["Escape"] = 22] = "Escape";
    Type2[Type2["Entity"] = 23] = "Entity";
    Type2[Type2["HardBreak"] = 24] = "HardBreak";
    Type2[Type2["Emphasis"] = 25] = "Emphasis";
    Type2[Type2["StrongEmphasis"] = 26] = "StrongEmphasis";
    Type2[Type2["Link"] = 27] = "Link";
    Type2[Type2["Image"] = 28] = "Image";
    Type2[Type2["InlineCode"] = 29] = "InlineCode";
    Type2[Type2["HTMLTag"] = 30] = "HTMLTag";
    Type2[Type2["Comment"] = 31] = "Comment";
    Type2[Type2["ProcessingInstruction"] = 32] = "ProcessingInstruction";
    Type2[Type2["Autolink"] = 33] = "Autolink";
    Type2[Type2["HeaderMark"] = 34] = "HeaderMark";
    Type2[Type2["QuoteMark"] = 35] = "QuoteMark";
    Type2[Type2["ListMark"] = 36] = "ListMark";
    Type2[Type2["LinkMark"] = 37] = "LinkMark";
    Type2[Type2["EmphasisMark"] = 38] = "EmphasisMark";
    Type2[Type2["CodeMark"] = 39] = "CodeMark";
    Type2[Type2["CodeText"] = 40] = "CodeText";
    Type2[Type2["CodeInfo"] = 41] = "CodeInfo";
    Type2[Type2["LinkTitle"] = 42] = "LinkTitle";
    Type2[Type2["LinkLabel"] = 43] = "LinkLabel";
    Type2[Type2["URL"] = 44] = "URL";
  })(Type || (Type = {}));
  var LeafBlock = class {
    /**
    @internal
    */
    constructor(start, content2) {
      this.start = start;
      this.content = content2;
      this.marks = [];
      this.parsers = [];
    }
  };
  var Line = class {
    constructor() {
      this.text = "";
      this.baseIndent = 0;
      this.basePos = 0;
      this.depth = 0;
      this.markers = [];
      this.pos = 0;
      this.indent = 0;
      this.next = -1;
    }
    /**
    @internal
    */
    forward() {
      if (this.basePos > this.pos)
        this.forwardInner();
    }
    /**
    @internal
    */
    forwardInner() {
      let newPos = this.skipSpace(this.basePos);
      this.indent = this.countIndent(newPos, this.pos, this.indent);
      this.pos = newPos;
      this.next = newPos == this.text.length ? -1 : this.text.charCodeAt(newPos);
    }
    /**
    Skip whitespace after the given position, return the position of
    the next non-space character or the end of the line if there's
    only space after `from`.
    */
    skipSpace(from) {
      return skipSpace(this.text, from);
    }
    /**
    @internal
    */
    reset(text) {
      this.text = text;
      this.baseIndent = this.basePos = this.pos = this.indent = 0;
      this.forwardInner();
      this.depth = 1;
      while (this.markers.length)
        this.markers.pop();
    }
    /**
    Move the line's base position forward to the given position.
    This should only be called by composite [block
    parsers](#BlockParser.parse) or [markup skipping
    functions](#NodeSpec.composite).
    */
    moveBase(to) {
      this.basePos = to;
      this.baseIndent = this.countIndent(to, this.pos, this.indent);
    }
    /**
    Move the line's base position forward to the given _column_.
    */
    moveBaseColumn(indent) {
      this.baseIndent = indent;
      this.basePos = this.findColumn(indent);
    }
    /**
    Store a composite-block-level marker. Should be called from
    [markup skipping functions](#NodeSpec.composite) when they
    consume any non-whitespace characters.
    */
    addMarker(elt2) {
      this.markers.push(elt2);
    }
    /**
    Find the column position at `to`, optionally starting at a given
    position and column.
    */
    countIndent(to, from = 0, indent = 0) {
      for (let i = from; i < to; i++)
        indent += this.text.charCodeAt(i) == 9 ? 4 - indent % 4 : 1;
      return indent;
    }
    /**
    Find the position corresponding to the given column.
    */
    findColumn(goal) {
      let i = 0;
      for (let indent = 0; i < this.text.length && indent < goal; i++)
        indent += this.text.charCodeAt(i) == 9 ? 4 - indent % 4 : 1;
      return i;
    }
    /**
    @internal
    */
    scrub() {
      if (!this.baseIndent)
        return this.text;
      let result = "";
      for (let i = 0; i < this.basePos; i++)
        result += " ";
      return result + this.text.slice(this.basePos);
    }
  };
  function skipForList(bl, cx, line) {
    if (line.pos == line.text.length || bl != cx.block && line.indent >= cx.stack[line.depth + 1].value + line.baseIndent)
      return true;
    if (line.indent >= line.baseIndent + 4)
      return false;
    let size = (bl.type == Type.OrderedList ? isOrderedList : isBulletList)(line, cx, false);
    return size > 0 && (bl.type != Type.BulletList || isHorizontalRule(line, cx, false) < 0) && line.text.charCodeAt(line.pos + size - 1) == bl.value;
  }
  var DefaultSkipMarkup = {
    [Type.Blockquote](bl, cx, line) {
      if (line.next != 62)
        return false;
      line.markers.push(elt(Type.QuoteMark, cx.lineStart + line.pos, cx.lineStart + line.pos + 1));
      line.moveBase(line.pos + (space3(line.text.charCodeAt(line.pos + 1)) ? 2 : 1));
      bl.end = cx.lineStart + line.text.length;
      return true;
    },
    [Type.ListItem](bl, _cx, line) {
      if (line.indent < line.baseIndent + bl.value && line.next > -1)
        return false;
      line.moveBaseColumn(line.baseIndent + bl.value);
      return true;
    },
    [Type.OrderedList]: skipForList,
    [Type.BulletList]: skipForList,
    [Type.Document]() {
      return true;
    }
  };
  function space3(ch) {
    return ch == 32 || ch == 9 || ch == 10 || ch == 13;
  }
  function skipSpace(line, i = 0) {
    while (i < line.length && space3(line.charCodeAt(i)))
      i++;
    return i;
  }
  function skipSpaceBack(line, i, to) {
    while (i > to && space3(line.charCodeAt(i - 1)))
      i--;
    return i;
  }
  function isFencedCode(line) {
    if (line.next != 96 && line.next != 126)
      return -1;
    let pos = line.pos + 1;
    while (pos < line.text.length && line.text.charCodeAt(pos) == line.next)
      pos++;
    if (pos < line.pos + 3)
      return -1;
    if (line.next == 96) {
      for (let i = pos; i < line.text.length; i++)
        if (line.text.charCodeAt(i) == 96)
          return -1;
    }
    return pos;
  }
  function isBlockquote(line) {
    return line.next != 62 ? -1 : line.text.charCodeAt(line.pos + 1) == 32 ? 2 : 1;
  }
  function isHorizontalRule(line, cx, breaking) {
    if (line.next != 42 && line.next != 45 && line.next != 95)
      return -1;
    let count = 1;
    for (let pos = line.pos + 1; pos < line.text.length; pos++) {
      let ch = line.text.charCodeAt(pos);
      if (ch == line.next)
        count++;
      else if (!space3(ch))
        return -1;
    }
    if (breaking && line.next == 45 && isSetextUnderline(line) > -1 && line.depth == cx.stack.length && cx.parser.leafBlockParsers.indexOf(DefaultLeafBlocks.SetextHeading) > -1)
      return -1;
    return count < 3 ? -1 : 1;
  }
  function inList(cx, type) {
    for (let i = cx.stack.length - 1; i >= 0; i--)
      if (cx.stack[i].type == type)
        return true;
    return false;
  }
  function isBulletList(line, cx, breaking) {
    return (line.next == 45 || line.next == 43 || line.next == 42) && (line.pos == line.text.length - 1 || space3(line.text.charCodeAt(line.pos + 1))) && (!breaking || inList(cx, Type.BulletList) || line.skipSpace(line.pos + 2) < line.text.length) ? 1 : -1;
  }
  function isOrderedList(line, cx, breaking) {
    let pos = line.pos, next = line.next;
    for (; ; ) {
      if (next >= 48 && next <= 57)
        pos++;
      else
        break;
      if (pos == line.text.length)
        return -1;
      next = line.text.charCodeAt(pos);
    }
    if (pos == line.pos || pos > line.pos + 9 || next != 46 && next != 41 || pos < line.text.length - 1 && !space3(line.text.charCodeAt(pos + 1)) || breaking && !inList(cx, Type.OrderedList) && (line.skipSpace(pos + 1) == line.text.length || pos > line.pos + 1 || line.next != 49))
      return -1;
    return pos + 1 - line.pos;
  }
  function isAtxHeading(line) {
    if (line.next != 35)
      return -1;
    let pos = line.pos + 1;
    while (pos < line.text.length && line.text.charCodeAt(pos) == 35)
      pos++;
    if (pos < line.text.length && line.text.charCodeAt(pos) != 32)
      return -1;
    let size = pos - line.pos;
    return size > 6 ? -1 : size;
  }
  function isSetextUnderline(line) {
    if (line.next != 45 && line.next != 61 || line.indent >= line.baseIndent + 4)
      return -1;
    let pos = line.pos + 1;
    while (pos < line.text.length && line.text.charCodeAt(pos) == line.next)
      pos++;
    let end = pos;
    while (pos < line.text.length && space3(line.text.charCodeAt(pos)))
      pos++;
    return pos == line.text.length ? end : -1;
  }
  var EmptyLine = /^[ \t]*$/;
  var CommentEnd = /-->/;
  var ProcessingEnd = /\?>/;
  var HTMLBlockStyle = [
    [/^<(?:script|pre|style)(?:\s|>|$)/i, /<\/(?:script|pre|style)>/i],
    [/^\s*<!--/, CommentEnd],
    [/^\s*<\?/, ProcessingEnd],
    [/^\s*<![A-Z]/, />/],
    [/^\s*<!\[CDATA\[/, /\]\]>/],
    [/^\s*<\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:\s|\/?>|$)/i, EmptyLine],
    [/^\s*(?:<\/[a-z][\w-]*\s*>|<[a-z][\w-]*(\s+[a-z:_][\w-.]*(?:\s*=\s*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*>)\s*$/i, EmptyLine]
  ];
  function isHTMLBlock(line, _cx, breaking) {
    if (line.next != 60)
      return -1;
    let rest = line.text.slice(line.pos);
    for (let i = 0, e = HTMLBlockStyle.length - (breaking ? 1 : 0); i < e; i++)
      if (HTMLBlockStyle[i][0].test(rest))
        return i;
    return -1;
  }
  function getListIndent(line, pos) {
    let indentAfter = line.countIndent(pos, line.pos, line.indent);
    let indented = line.countIndent(line.skipSpace(pos), pos, indentAfter);
    return indented >= indentAfter + 5 ? indentAfter + 1 : indented;
  }
  function addCodeText(marks, from, to) {
    let last = marks.length - 1;
    if (last >= 0 && marks[last].to == from && marks[last].type == Type.CodeText)
      marks[last].to = to;
    else
      marks.push(elt(Type.CodeText, from, to));
  }
  var DefaultBlockParsers = {
    LinkReference: void 0,
    IndentedCode(cx, line) {
      let base = line.baseIndent + 4;
      if (line.indent < base)
        return false;
      let start = line.findColumn(base);
      let from = cx.lineStart + start, to = cx.lineStart + line.text.length;
      let marks = [], pendingMarks = [];
      addCodeText(marks, from, to);
      while (cx.nextLine() && line.depth >= cx.stack.length) {
        if (line.pos == line.text.length) {
          addCodeText(pendingMarks, cx.lineStart - 1, cx.lineStart);
          for (let m of line.markers)
            pendingMarks.push(m);
        } else if (line.indent < base) {
          break;
        } else {
          if (pendingMarks.length) {
            for (let m of pendingMarks) {
              if (m.type == Type.CodeText)
                addCodeText(marks, m.from, m.to);
              else
                marks.push(m);
            }
            pendingMarks = [];
          }
          addCodeText(marks, cx.lineStart - 1, cx.lineStart);
          for (let m of line.markers)
            marks.push(m);
          to = cx.lineStart + line.text.length;
          let codeStart = cx.lineStart + line.findColumn(line.baseIndent + 4);
          if (codeStart < to)
            addCodeText(marks, codeStart, to);
        }
      }
      if (pendingMarks.length) {
        pendingMarks = pendingMarks.filter((m) => m.type != Type.CodeText);
        if (pendingMarks.length)
          line.markers = pendingMarks.concat(line.markers);
      }
      cx.addNode(cx.buffer.writeElements(marks, -from).finish(Type.CodeBlock, to - from), from);
      return true;
    },
    FencedCode(cx, line) {
      let fenceEnd = isFencedCode(line);
      if (fenceEnd < 0)
        return false;
      let from = cx.lineStart + line.pos, ch = line.next, len = fenceEnd - line.pos;
      let infoFrom = line.skipSpace(fenceEnd), infoTo = skipSpaceBack(line.text, line.text.length, infoFrom);
      let marks = [elt(Type.CodeMark, from, from + len)];
      if (infoFrom < infoTo)
        marks.push(elt(Type.CodeInfo, cx.lineStart + infoFrom, cx.lineStart + infoTo));
      for (let first = true, empty = true, hasLine = false; cx.nextLine() && line.depth >= cx.stack.length; first = false) {
        let i = line.pos;
        if (line.indent - line.baseIndent < 4)
          while (i < line.text.length && line.text.charCodeAt(i) == ch)
            i++;
        if (i - line.pos >= len && line.skipSpace(i) == line.text.length) {
          for (let m of line.markers)
            marks.push(m);
          if (empty && hasLine)
            addCodeText(marks, cx.lineStart - 1, cx.lineStart);
          marks.push(elt(Type.CodeMark, cx.lineStart + line.pos, cx.lineStart + i));
          cx.nextLine();
          break;
        } else {
          hasLine = true;
          if (!first) {
            addCodeText(marks, cx.lineStart - 1, cx.lineStart);
            empty = false;
          }
          for (let m of line.markers)
            marks.push(m);
          let textStart = cx.lineStart + line.basePos, textEnd = cx.lineStart + line.text.length;
          if (textStart < textEnd) {
            addCodeText(marks, textStart, textEnd);
            empty = false;
          }
        }
      }
      cx.addNode(cx.buffer.writeElements(marks, -from).finish(Type.FencedCode, cx.prevLineEnd() - from), from);
      return true;
    },
    Blockquote(cx, line) {
      let size = isBlockquote(line);
      if (size < 0)
        return false;
      cx.startContext(Type.Blockquote, line.pos);
      cx.addNode(Type.QuoteMark, cx.lineStart + line.pos, cx.lineStart + line.pos + 1);
      line.moveBase(line.pos + size);
      return null;
    },
    HorizontalRule(cx, line) {
      if (isHorizontalRule(line, cx, false) < 0)
        return false;
      let from = cx.lineStart + line.pos;
      cx.nextLine();
      cx.addNode(Type.HorizontalRule, from);
      return true;
    },
    BulletList(cx, line) {
      let size = isBulletList(line, cx, false);
      if (size < 0)
        return false;
      if (cx.block.type != Type.BulletList)
        cx.startContext(Type.BulletList, line.basePos, line.next);
      let newBase = getListIndent(line, line.pos + 1);
      cx.startContext(Type.ListItem, line.basePos, newBase - line.baseIndent);
      cx.addNode(Type.ListMark, cx.lineStart + line.pos, cx.lineStart + line.pos + size);
      line.moveBaseColumn(newBase);
      return null;
    },
    OrderedList(cx, line) {
      let size = isOrderedList(line, cx, false);
      if (size < 0)
        return false;
      if (cx.block.type != Type.OrderedList)
        cx.startContext(Type.OrderedList, line.basePos, line.text.charCodeAt(line.pos + size - 1));
      let newBase = getListIndent(line, line.pos + size);
      cx.startContext(Type.ListItem, line.basePos, newBase - line.baseIndent);
      cx.addNode(Type.ListMark, cx.lineStart + line.pos, cx.lineStart + line.pos + size);
      line.moveBaseColumn(newBase);
      return null;
    },
    ATXHeading(cx, line) {
      let size = isAtxHeading(line);
      if (size < 0)
        return false;
      let off = line.pos, from = cx.lineStart + off;
      let endOfSpace = skipSpaceBack(line.text, line.text.length, off), after = endOfSpace;
      while (after > off && line.text.charCodeAt(after - 1) == line.next)
        after--;
      if (after == endOfSpace || after == off || !space3(line.text.charCodeAt(after - 1)))
        after = line.text.length;
      let buf = cx.buffer.write(Type.HeaderMark, 0, size).writeElements(cx.parser.parseInline(line.text.slice(off + size + 1, after), from + size + 1), -from);
      if (after < line.text.length)
        buf.write(Type.HeaderMark, after - off, endOfSpace - off);
      let node = buf.finish(Type.ATXHeading1 - 1 + size, line.text.length - off);
      cx.nextLine();
      cx.addNode(node, from);
      return true;
    },
    HTMLBlock(cx, line) {
      let type = isHTMLBlock(line, cx, false);
      if (type < 0)
        return false;
      let from = cx.lineStart + line.pos, end = HTMLBlockStyle[type][1];
      let marks = [], trailing = end != EmptyLine;
      while (!end.test(line.text) && cx.nextLine()) {
        if (line.depth < cx.stack.length) {
          trailing = false;
          break;
        }
        for (let m of line.markers)
          marks.push(m);
      }
      if (trailing)
        cx.nextLine();
      let nodeType = end == CommentEnd ? Type.CommentBlock : end == ProcessingEnd ? Type.ProcessingInstructionBlock : Type.HTMLBlock;
      let to = cx.prevLineEnd();
      cx.addNode(cx.buffer.writeElements(marks, -from).finish(nodeType, to - from), from);
      return true;
    },
    SetextHeading: void 0
    // Specifies relative precedence for block-continue function
  };
  var LinkReferenceParser = class {
    constructor(leaf) {
      this.stage = 0;
      this.elts = [];
      this.pos = 0;
      this.start = leaf.start;
      this.advance(leaf.content);
    }
    nextLine(cx, line, leaf) {
      if (this.stage == -1)
        return false;
      let content2 = leaf.content + "\n" + line.scrub();
      let finish = this.advance(content2);
      if (finish > -1 && finish < content2.length)
        return this.complete(cx, leaf, finish);
      return false;
    }
    finish(cx, leaf) {
      if ((this.stage == 2 || this.stage == 3) && skipSpace(leaf.content, this.pos) == leaf.content.length)
        return this.complete(cx, leaf, leaf.content.length);
      return false;
    }
    complete(cx, leaf, len) {
      cx.addLeafElement(leaf, elt(Type.LinkReference, this.start, this.start + len, this.elts));
      return true;
    }
    nextStage(elt2) {
      if (elt2) {
        this.pos = elt2.to - this.start;
        this.elts.push(elt2);
        this.stage++;
        return true;
      }
      if (elt2 === false)
        this.stage = -1;
      return false;
    }
    advance(content2) {
      for (; ; ) {
        if (this.stage == -1) {
          return -1;
        } else if (this.stage == 0) {
          if (!this.nextStage(parseLinkLabel(content2, this.pos, this.start, true)))
            return -1;
          if (content2.charCodeAt(this.pos) != 58)
            return this.stage = -1;
          this.elts.push(elt(Type.LinkMark, this.pos + this.start, this.pos + this.start + 1));
          this.pos++;
        } else if (this.stage == 1) {
          if (!this.nextStage(parseURL(content2, skipSpace(content2, this.pos), this.start)))
            return -1;
        } else if (this.stage == 2) {
          let skip = skipSpace(content2, this.pos), end = 0;
          if (skip > this.pos) {
            let title = parseLinkTitle(content2, skip, this.start);
            if (title) {
              let titleEnd = lineEnd(content2, title.to - this.start);
              if (titleEnd > 0) {
                this.nextStage(title);
                end = titleEnd;
              }
            }
          }
          if (!end)
            end = lineEnd(content2, this.pos);
          return end > 0 && end < content2.length ? end : -1;
        } else {
          return lineEnd(content2, this.pos);
        }
      }
    }
  };
  function lineEnd(text, pos) {
    for (; pos < text.length; pos++) {
      let next = text.charCodeAt(pos);
      if (next == 10)
        break;
      if (!space3(next))
        return -1;
    }
    return pos;
  }
  var SetextHeadingParser = class {
    nextLine(cx, line, leaf) {
      let underline = line.depth < cx.stack.length ? -1 : isSetextUnderline(line);
      let next = line.next;
      if (underline < 0)
        return false;
      let underlineMark = elt(Type.HeaderMark, cx.lineStart + line.pos, cx.lineStart + underline);
      cx.nextLine();
      cx.addLeafElement(leaf, elt(next == 61 ? Type.SetextHeading1 : Type.SetextHeading2, leaf.start, cx.prevLineEnd(), [
        ...cx.parser.parseInline(leaf.content, leaf.start),
        underlineMark
      ]));
      return true;
    }
    finish() {
      return false;
    }
  };
  var DefaultLeafBlocks = {
    LinkReference(_, leaf) {
      return leaf.content.charCodeAt(0) == 91 ? new LinkReferenceParser(leaf) : null;
    },
    SetextHeading() {
      return new SetextHeadingParser();
    }
  };
  var DefaultEndLeaf = [
    (_, line) => isAtxHeading(line) >= 0,
    (_, line) => isFencedCode(line) >= 0,
    (_, line) => isBlockquote(line) >= 0,
    (p, line) => isBulletList(line, p, true) >= 0,
    (p, line) => isOrderedList(line, p, true) >= 0,
    (p, line) => isHorizontalRule(line, p, true) >= 0,
    (p, line) => isHTMLBlock(line, p, true) >= 0
  ];
  var scanLineResult = { text: "", end: 0 };
  var BlockContext = class {
    /**
    @internal
    */
    constructor(parser7, input, fragments, ranges) {
      this.parser = parser7;
      this.input = input;
      this.ranges = ranges;
      this.line = new Line();
      this.atEnd = false;
      this.reusePlaceholders = /* @__PURE__ */ new Map();
      this.stoppedAt = null;
      this.rangeI = 0;
      this.to = ranges[ranges.length - 1].to;
      this.lineStart = this.absoluteLineStart = this.absoluteLineEnd = ranges[0].from;
      this.block = CompositeBlock.create(Type.Document, 0, this.lineStart, 0, 0);
      this.stack = [this.block];
      this.fragments = fragments.length ? new FragmentCursor3(fragments, input) : null;
      this.readLine();
    }
    get parsedPos() {
      return this.absoluteLineStart;
    }
    advance() {
      if (this.stoppedAt != null && this.absoluteLineStart > this.stoppedAt)
        return this.finish();
      let { line } = this;
      for (; ; ) {
        for (let markI = 0; ; ) {
          let next = line.depth < this.stack.length ? this.stack[this.stack.length - 1] : null;
          while (markI < line.markers.length && (!next || line.markers[markI].from < next.end)) {
            let mark = line.markers[markI++];
            this.addNode(mark.type, mark.from, mark.to);
          }
          if (!next)
            break;
          this.finishContext();
        }
        if (line.pos < line.text.length)
          break;
        if (!this.nextLine())
          return this.finish();
      }
      if (this.fragments && this.reuseFragment(line.basePos))
        return null;
      start: for (; ; ) {
        for (let type of this.parser.blockParsers)
          if (type) {
            let result = type(this, line);
            if (result != false) {
              if (result == true)
                return null;
              line.forward();
              continue start;
            }
          }
        break;
      }
      let leaf = new LeafBlock(this.lineStart + line.pos, line.text.slice(line.pos));
      for (let parse of this.parser.leafBlockParsers)
        if (parse) {
          let parser7 = parse(this, leaf);
          if (parser7)
            leaf.parsers.push(parser7);
        }
      lines: while (this.nextLine()) {
        if (line.pos == line.text.length)
          break;
        if (line.indent < line.baseIndent + 4) {
          for (let stop of this.parser.endLeafBlock)
            if (stop(this, line, leaf))
              break lines;
        }
        for (let parser7 of leaf.parsers)
          if (parser7.nextLine(this, line, leaf))
            return null;
        leaf.content += "\n" + line.scrub();
        for (let m of line.markers)
          leaf.marks.push(m);
      }
      this.finishLeaf(leaf);
      return null;
    }
    stopAt(pos) {
      if (this.stoppedAt != null && this.stoppedAt < pos)
        throw new RangeError("Can't move stoppedAt forward");
      this.stoppedAt = pos;
    }
    reuseFragment(start) {
      if (!this.fragments.moveTo(this.absoluteLineStart + start, this.absoluteLineStart) || !this.fragments.matches(this.block.hash))
        return false;
      let taken = this.fragments.takeNodes(this);
      if (!taken)
        return false;
      this.absoluteLineStart += taken;
      this.lineStart = toRelative(this.absoluteLineStart, this.ranges);
      this.moveRangeI();
      if (this.absoluteLineStart < this.to) {
        this.lineStart++;
        this.absoluteLineStart++;
        this.readLine();
      } else {
        this.atEnd = true;
        this.readLine();
      }
      return true;
    }
    /**
    The number of parent blocks surrounding the current block.
    */
    get depth() {
      return this.stack.length;
    }
    /**
    Get the type of the parent block at the given depth. When no
    depth is passed, return the type of the innermost parent.
    */
    parentType(depth = this.depth - 1) {
      return this.parser.nodeSet.types[this.stack[depth].type];
    }
    /**
    Move to the next input line. This should only be called by
    (non-composite) [block parsers](#BlockParser.parse) that consume
    the line directly, or leaf block parser
    [`nextLine`](#LeafBlockParser.nextLine) methods when they
    consume the current line (and return true).
    */
    nextLine() {
      this.lineStart += this.line.text.length;
      if (this.absoluteLineEnd >= this.to) {
        this.absoluteLineStart = this.absoluteLineEnd;
        this.atEnd = true;
        this.readLine();
        return false;
      } else {
        this.lineStart++;
        this.absoluteLineStart = this.absoluteLineEnd + 1;
        this.moveRangeI();
        this.readLine();
        return true;
      }
    }
    /**
    Retrieve the text of the line after the current one, without
    actually moving the context's current line forward.
    */
    peekLine() {
      return this.scanLine(this.absoluteLineEnd + 1).text;
    }
    moveRangeI() {
      while (this.rangeI < this.ranges.length - 1 && this.absoluteLineStart >= this.ranges[this.rangeI].to) {
        this.rangeI++;
        this.absoluteLineStart = Math.max(this.absoluteLineStart, this.ranges[this.rangeI].from);
      }
    }
    /**
    @internal
    Collect the text for the next line.
    */
    scanLine(start) {
      let r = scanLineResult;
      r.end = start;
      if (start >= this.to) {
        r.text = "";
      } else {
        r.text = this.lineChunkAt(start);
        r.end += r.text.length;
        if (this.ranges.length > 1) {
          let textOffset = this.absoluteLineStart, rangeI = this.rangeI;
          while (this.ranges[rangeI].to < r.end) {
            rangeI++;
            let nextFrom = this.ranges[rangeI].from;
            let after = this.lineChunkAt(nextFrom);
            r.end = nextFrom + after.length;
            r.text = r.text.slice(0, this.ranges[rangeI - 1].to - textOffset) + after;
            textOffset = r.end - r.text.length;
          }
        }
      }
      return r;
    }
    /**
    @internal
    Populate this.line with the content of the next line. Skip
    leading characters covered by composite blocks.
    */
    readLine() {
      let { line } = this, { text, end } = this.scanLine(this.absoluteLineStart);
      this.absoluteLineEnd = end;
      line.reset(text);
      for (; line.depth < this.stack.length; line.depth++) {
        let cx = this.stack[line.depth], handler = this.parser.skipContextMarkup[cx.type];
        if (!handler)
          throw new Error("Unhandled block context " + Type[cx.type]);
        let marks = this.line.markers.length;
        if (!handler(cx, this, line)) {
          if (this.line.markers.length > marks)
            cx.end = this.line.markers[this.line.markers.length - 1].to;
          line.forward();
          break;
        }
        line.forward();
      }
    }
    lineChunkAt(pos) {
      let next = this.input.chunk(pos), text;
      if (!this.input.lineChunks) {
        let eol = next.indexOf("\n");
        text = eol < 0 ? next : next.slice(0, eol);
      } else {
        text = next == "\n" ? "" : next;
      }
      return pos + text.length > this.to ? text.slice(0, this.to - pos) : text;
    }
    /**
    The end position of the previous line.
    */
    prevLineEnd() {
      return this.atEnd ? this.lineStart : this.lineStart - 1;
    }
    /**
    @internal
    */
    startContext(type, start, value = 0) {
      this.block = CompositeBlock.create(type, value, this.lineStart + start, this.block.hash, this.lineStart + this.line.text.length);
      this.stack.push(this.block);
    }
    /**
    Start a composite block. Should only be called from [block
    parser functions](#BlockParser.parse) that return null.
    */
    startComposite(type, start, value = 0) {
      this.startContext(this.parser.getNodeType(type), start, value);
    }
    /**
    @internal
    */
    addNode(block, from, to) {
      if (typeof block == "number")
        block = new Tree(this.parser.nodeSet.types[block], none, none, (to !== null && to !== void 0 ? to : this.prevLineEnd()) - from);
      this.block.addChild(block, from - this.block.from);
    }
    /**
    Add a block element. Can be called by [block
    parsers](#BlockParser.parse).
    */
    addElement(elt2) {
      this.block.addChild(elt2.toTree(this.parser.nodeSet), elt2.from - this.block.from);
    }
    /**
    Add a block element from a [leaf parser](#LeafBlockParser). This
    makes sure any extra composite block markup (such as blockquote
    markers) inside the block are also added to the syntax tree.
    */
    addLeafElement(leaf, elt2) {
      this.addNode(this.buffer.writeElements(injectMarks(elt2.children, leaf.marks), -elt2.from).finish(elt2.type, elt2.to - elt2.from), elt2.from);
    }
    /**
    @internal
    */
    finishContext() {
      let cx = this.stack.pop();
      let top = this.stack[this.stack.length - 1];
      top.addChild(cx.toTree(this.parser.nodeSet), cx.from - top.from);
      this.block = top;
    }
    finish() {
      while (this.stack.length > 1)
        this.finishContext();
      return this.addGaps(this.block.toTree(this.parser.nodeSet, this.lineStart));
    }
    addGaps(tree) {
      return this.ranges.length > 1 ? injectGaps(this.ranges, 0, tree.topNode, this.ranges[0].from, this.reusePlaceholders) : tree;
    }
    /**
    @internal
    */
    finishLeaf(leaf) {
      for (let parser7 of leaf.parsers)
        if (parser7.finish(this, leaf))
          return;
      let inline = injectMarks(this.parser.parseInline(leaf.content, leaf.start), leaf.marks);
      this.addNode(this.buffer.writeElements(inline, -leaf.start).finish(Type.Paragraph, leaf.content.length), leaf.start);
    }
    elt(type, from, to, children) {
      if (typeof type == "string")
        return elt(this.parser.getNodeType(type), from, to, children);
      return new TreeElement(type, from);
    }
    /**
    @internal
    */
    get buffer() {
      return new Buffer(this.parser.nodeSet);
    }
  };
  function injectGaps(ranges, rangeI, tree, offset, dummies) {
    let rangeEnd = ranges[rangeI].to;
    let children = [], positions = [], start = tree.from + offset;
    function movePastNext(upto, inclusive) {
      while (inclusive ? upto >= rangeEnd : upto > rangeEnd) {
        let size = ranges[rangeI + 1].from - rangeEnd;
        offset += size;
        upto += size;
        rangeI++;
        rangeEnd = ranges[rangeI].to;
      }
    }
    for (let ch = tree.firstChild; ch; ch = ch.nextSibling) {
      movePastNext(ch.from + offset, true);
      let from = ch.from + offset, node, reuse = dummies.get(ch.tree);
      if (reuse) {
        node = reuse;
      } else if (ch.to + offset > rangeEnd) {
        node = injectGaps(ranges, rangeI, ch, offset, dummies);
        movePastNext(ch.to + offset, false);
      } else {
        node = ch.toTree();
      }
      children.push(node);
      positions.push(from - start);
    }
    movePastNext(tree.to + offset, false);
    return new Tree(tree.type, children, positions, tree.to + offset - start, tree.tree ? tree.tree.propValues : void 0);
  }
  var MarkdownParser = class _MarkdownParser extends Parser {
    /**
    @internal
    */
    constructor(nodeSet, blockParsers, leafBlockParsers, blockNames, endLeafBlock, skipContextMarkup, inlineParsers, inlineNames, wrappers) {
      super();
      this.nodeSet = nodeSet;
      this.blockParsers = blockParsers;
      this.leafBlockParsers = leafBlockParsers;
      this.blockNames = blockNames;
      this.endLeafBlock = endLeafBlock;
      this.skipContextMarkup = skipContextMarkup;
      this.inlineParsers = inlineParsers;
      this.inlineNames = inlineNames;
      this.wrappers = wrappers;
      this.nodeTypes = /* @__PURE__ */ Object.create(null);
      for (let t2 of nodeSet.types)
        this.nodeTypes[t2.name] = t2.id;
    }
    createParse(input, fragments, ranges) {
      let parse = new BlockContext(this, input, fragments, ranges);
      for (let w of this.wrappers)
        parse = w(parse, input, fragments, ranges);
      return parse;
    }
    /**
    Reconfigure the parser.
    */
    configure(spec) {
      let config = resolveConfig(spec);
      if (!config)
        return this;
      let { nodeSet, skipContextMarkup } = this;
      let blockParsers = this.blockParsers.slice(), leafBlockParsers = this.leafBlockParsers.slice(), blockNames = this.blockNames.slice(), inlineParsers = this.inlineParsers.slice(), inlineNames = this.inlineNames.slice(), endLeafBlock = this.endLeafBlock.slice(), wrappers = this.wrappers;
      if (nonEmpty(config.defineNodes)) {
        skipContextMarkup = Object.assign({}, skipContextMarkup);
        let nodeTypes2 = nodeSet.types.slice(), styles;
        for (let s of config.defineNodes) {
          let { name: name2, block, composite, style } = typeof s == "string" ? { name: s } : s;
          if (nodeTypes2.some((t2) => t2.name == name2))
            continue;
          if (composite)
            skipContextMarkup[nodeTypes2.length] = (bl, cx, line) => composite(cx, line, bl.value);
          let id2 = nodeTypes2.length;
          let group = composite ? ["Block", "BlockContext"] : !block ? void 0 : id2 >= Type.ATXHeading1 && id2 <= Type.SetextHeading2 ? ["Block", "LeafBlock", "Heading"] : ["Block", "LeafBlock"];
          nodeTypes2.push(NodeType.define({
            id: id2,
            name: name2,
            props: group && [[NodeProp.group, group]]
          }));
          if (style) {
            if (!styles)
              styles = {};
            if (Array.isArray(style) || style instanceof Tag)
              styles[name2] = style;
            else
              Object.assign(styles, style);
          }
        }
        nodeSet = new NodeSet(nodeTypes2);
        if (styles)
          nodeSet = nodeSet.extend(styleTags(styles));
      }
      if (nonEmpty(config.props))
        nodeSet = nodeSet.extend(...config.props);
      if (nonEmpty(config.remove)) {
        for (let rm of config.remove) {
          let block = this.blockNames.indexOf(rm), inline = this.inlineNames.indexOf(rm);
          if (block > -1)
            blockParsers[block] = leafBlockParsers[block] = void 0;
          if (inline > -1)
            inlineParsers[inline] = void 0;
        }
      }
      if (nonEmpty(config.parseBlock)) {
        for (let spec2 of config.parseBlock) {
          let found = blockNames.indexOf(spec2.name);
          if (found > -1) {
            blockParsers[found] = spec2.parse;
            leafBlockParsers[found] = spec2.leaf;
          } else {
            let pos = spec2.before ? findName(blockNames, spec2.before) : spec2.after ? findName(blockNames, spec2.after) + 1 : blockNames.length - 1;
            blockParsers.splice(pos, 0, spec2.parse);
            leafBlockParsers.splice(pos, 0, spec2.leaf);
            blockNames.splice(pos, 0, spec2.name);
          }
          if (spec2.endLeaf)
            endLeafBlock.push(spec2.endLeaf);
        }
      }
      if (nonEmpty(config.parseInline)) {
        for (let spec2 of config.parseInline) {
          let found = inlineNames.indexOf(spec2.name);
          if (found > -1) {
            inlineParsers[found] = spec2.parse;
          } else {
            let pos = spec2.before ? findName(inlineNames, spec2.before) : spec2.after ? findName(inlineNames, spec2.after) + 1 : inlineNames.length - 1;
            inlineParsers.splice(pos, 0, spec2.parse);
            inlineNames.splice(pos, 0, spec2.name);
          }
        }
      }
      if (config.wrap)
        wrappers = wrappers.concat(config.wrap);
      return new _MarkdownParser(nodeSet, blockParsers, leafBlockParsers, blockNames, endLeafBlock, skipContextMarkup, inlineParsers, inlineNames, wrappers);
    }
    /**
    @internal
    */
    getNodeType(name2) {
      let found = this.nodeTypes[name2];
      if (found == null)
        throw new RangeError(`Unknown node type '${name2}'`);
      return found;
    }
    /**
    Parse the given piece of inline text at the given offset,
    returning an array of [`Element`](#Element) objects representing
    the inline content.
    */
    parseInline(text, offset) {
      let cx = new InlineContext(this, text, offset);
      outer: for (let pos = offset; pos < cx.end; ) {
        let next = cx.char(pos);
        for (let token of this.inlineParsers)
          if (token) {
            let result = token(cx, next, pos);
            if (result >= 0) {
              pos = result;
              continue outer;
            }
          }
        pos++;
      }
      return cx.resolveMarkers(0);
    }
  };
  function nonEmpty(a2) {
    return a2 != null && a2.length > 0;
  }
  function resolveConfig(spec) {
    if (!Array.isArray(spec))
      return spec;
    if (spec.length == 0)
      return null;
    let conf = resolveConfig(spec[0]);
    if (spec.length == 1)
      return conf;
    let rest = resolveConfig(spec.slice(1));
    if (!rest || !conf)
      return conf || rest;
    let conc = (a2, b) => (a2 || none).concat(b || none);
    let wrapA = conf.wrap, wrapB = rest.wrap;
    return {
      props: conc(conf.props, rest.props),
      defineNodes: conc(conf.defineNodes, rest.defineNodes),
      parseBlock: conc(conf.parseBlock, rest.parseBlock),
      parseInline: conc(conf.parseInline, rest.parseInline),
      remove: conc(conf.remove, rest.remove),
      wrap: !wrapA ? wrapB : !wrapB ? wrapA : (inner, input, fragments, ranges) => wrapA(wrapB(inner, input, fragments, ranges), input, fragments, ranges)
    };
  }
  function findName(names, name2) {
    let found = names.indexOf(name2);
    if (found < 0)
      throw new RangeError(`Position specified relative to unknown parser ${name2}`);
    return found;
  }
  var nodeTypes = [NodeType.none];
  for (let i = 1, name2; name2 = Type[i]; i++) {
    nodeTypes[i] = NodeType.define({
      id: i,
      name: name2,
      props: i >= Type.Escape ? [] : [[NodeProp.group, i in DefaultSkipMarkup ? ["Block", "BlockContext"] : ["Block", "LeafBlock"]]],
      top: name2 == "Document"
    });
  }
  var none = [];
  var Buffer = class {
    constructor(nodeSet) {
      this.nodeSet = nodeSet;
      this.content = [];
      this.nodes = [];
    }
    write(type, from, to, children = 0) {
      this.content.push(type, from, to, 4 + children * 4);
      return this;
    }
    writeElements(elts, offset = 0) {
      for (let e of elts)
        e.writeTo(this, offset);
      return this;
    }
    finish(type, length) {
      return Tree.build({
        buffer: this.content,
        nodeSet: this.nodeSet,
        reused: this.nodes,
        topID: type,
        length
      });
    }
  };
  var Element2 = class {
    /**
    @internal
    */
    constructor(type, from, to, children = none) {
      this.type = type;
      this.from = from;
      this.to = to;
      this.children = children;
    }
    /**
    @internal
    */
    writeTo(buf, offset) {
      let startOff = buf.content.length;
      buf.writeElements(this.children, offset);
      buf.content.push(this.type, this.from + offset, this.to + offset, buf.content.length + 4 - startOff);
    }
    /**
    @internal
    */
    toTree(nodeSet) {
      return new Buffer(nodeSet).writeElements(this.children, -this.from).finish(this.type, this.to - this.from);
    }
  };
  var TreeElement = class {
    constructor(tree, from) {
      this.tree = tree;
      this.from = from;
    }
    get to() {
      return this.from + this.tree.length;
    }
    get type() {
      return this.tree.type.id;
    }
    get children() {
      return none;
    }
    writeTo(buf, offset) {
      buf.nodes.push(this.tree);
      buf.content.push(buf.nodes.length - 1, this.from + offset, this.to + offset, -1);
    }
    toTree() {
      return this.tree;
    }
  };
  function elt(type, from, to, children) {
    return new Element2(type, from, to, children);
  }
  var EmphasisUnderscore = { resolve: "Emphasis", mark: "EmphasisMark" };
  var EmphasisAsterisk = { resolve: "Emphasis", mark: "EmphasisMark" };
  var LinkStart = {};
  var ImageStart = {};
  var InlineDelimiter = class {
    constructor(type, from, to, side) {
      this.type = type;
      this.from = from;
      this.to = to;
      this.side = side;
    }
  };
  var Escapable = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
  var Punctuation = /[!"#$%&'()*+,\-.\/:;<=>?@\[\\\]^_`{|}~\xA1\u2010-\u2027]/;
  try {
    Punctuation = new RegExp("[\\p{S}|\\p{P}]", "u");
  } catch (_) {
  }
  var DefaultInline = {
    Escape(cx, next, start) {
      if (next != 92 || start == cx.end - 1)
        return -1;
      let escaped = cx.char(start + 1);
      for (let i = 0; i < Escapable.length; i++)
        if (Escapable.charCodeAt(i) == escaped)
          return cx.append(elt(Type.Escape, start, start + 2));
      return -1;
    },
    Entity(cx, next, start) {
      if (next != 38)
        return -1;
      let m = /^(?:#\d+|#x[a-f\d]+|\w+);/i.exec(cx.slice(start + 1, start + 31));
      return m ? cx.append(elt(Type.Entity, start, start + 1 + m[0].length)) : -1;
    },
    InlineCode(cx, next, start) {
      if (next != 96 || start && cx.char(start - 1) == 96)
        return -1;
      let pos = start + 1;
      while (pos < cx.end && cx.char(pos) == 96)
        pos++;
      let size = pos - start, curSize = 0;
      for (; pos < cx.end; pos++) {
        if (cx.char(pos) == 96) {
          curSize++;
          if (curSize == size && cx.char(pos + 1) != 96)
            return cx.append(elt(Type.InlineCode, start, pos + 1, [
              elt(Type.CodeMark, start, start + size),
              elt(Type.CodeMark, pos + 1 - size, pos + 1)
            ]));
        } else {
          curSize = 0;
        }
      }
      return -1;
    },
    HTMLTag(cx, next, start) {
      if (next != 60 || start == cx.end - 1)
        return -1;
      let after = cx.slice(start + 1, cx.end);
      let url = /^(?:[a-z][-\w+.]+:[^\s>]+|[a-z\d.!#$%&'*+/=?^_`{|}~-]+@[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)*)>/i.exec(after);
      if (url) {
        return cx.append(elt(Type.Autolink, start, start + 1 + url[0].length, [
          elt(Type.LinkMark, start, start + 1),
          // url[0] includes the closing bracket, so exclude it from this slice
          elt(Type.URL, start + 1, start + url[0].length),
          elt(Type.LinkMark, start + url[0].length, start + 1 + url[0].length)
        ]));
      }
      let comment2 = /^!--[^>](?:-[^-]|[^-])*?-->/i.exec(after);
      if (comment2)
        return cx.append(elt(Type.Comment, start, start + 1 + comment2[0].length));
      let procInst = /^\?[^]*?\?>/.exec(after);
      if (procInst)
        return cx.append(elt(Type.ProcessingInstruction, start, start + 1 + procInst[0].length));
      let m = /^(?:![A-Z][^]*?>|!\[CDATA\[[^]*?\]\]>|\/\s*[a-zA-Z][\w-]*\s*>|\s*[a-zA-Z][\w-]*(\s+[a-zA-Z:_][\w-.:]*(?:\s*=\s*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*(\/\s*)?>)/.exec(after);
      if (!m)
        return -1;
      return cx.append(elt(Type.HTMLTag, start, start + 1 + m[0].length));
    },
    Emphasis(cx, next, start) {
      if (next != 95 && next != 42)
        return -1;
      let pos = start + 1;
      while (cx.char(pos) == next)
        pos++;
      let before = cx.slice(start - 1, start), after = cx.slice(pos, pos + 1);
      let pBefore = Punctuation.test(before), pAfter = Punctuation.test(after);
      let sBefore = /\s|^$/.test(before), sAfter = /\s|^$/.test(after);
      let leftFlanking = !sAfter && (!pAfter || sBefore || pBefore);
      let rightFlanking = !sBefore && (!pBefore || sAfter || pAfter);
      let canOpen = leftFlanking && (next == 42 || !rightFlanking || pBefore);
      let canClose = rightFlanking && (next == 42 || !leftFlanking || pAfter);
      return cx.append(new InlineDelimiter(next == 95 ? EmphasisUnderscore : EmphasisAsterisk, start, pos, (canOpen ? 1 : 0) | (canClose ? 2 : 0)));
    },
    HardBreak(cx, next, start) {
      if (next == 92 && cx.char(start + 1) == 10)
        return cx.append(elt(Type.HardBreak, start, start + 2));
      if (next == 32) {
        let pos = start + 1;
        while (cx.char(pos) == 32)
          pos++;
        if (cx.char(pos) == 10 && pos >= start + 2)
          return cx.append(elt(Type.HardBreak, start, pos + 1));
      }
      return -1;
    },
    Link(cx, next, start) {
      return next == 91 ? cx.append(new InlineDelimiter(
        LinkStart,
        start,
        start + 1,
        1
        /* Mark.Open */
      )) : -1;
    },
    Image(cx, next, start) {
      return next == 33 && cx.char(start + 1) == 91 ? cx.append(new InlineDelimiter(
        ImageStart,
        start,
        start + 2,
        1
        /* Mark.Open */
      )) : -1;
    },
    LinkEnd(cx, next, start) {
      if (next != 93)
        return -1;
      for (let i = cx.parts.length - 1; i >= 0; i--) {
        let part = cx.parts[i];
        if (part instanceof InlineDelimiter && (part.type == LinkStart || part.type == ImageStart)) {
          if (!part.side || cx.skipSpace(part.to) == start && !/[(\[]/.test(cx.slice(start + 1, start + 2))) {
            cx.parts[i] = null;
            return -1;
          }
          let content2 = cx.takeContent(i);
          let link = cx.parts[i] = finishLink(cx, content2, part.type == LinkStart ? Type.Link : Type.Image, part.from, start + 1);
          if (part.type == LinkStart)
            for (let j = 0; j < i; j++) {
              let p = cx.parts[j];
              if (p instanceof InlineDelimiter && p.type == LinkStart)
                p.side = 0;
            }
          return link.to;
        }
      }
      return -1;
    }
  };
  function finishLink(cx, content2, type, start, startPos) {
    let { text } = cx, next = cx.char(startPos), endPos = startPos;
    content2.unshift(elt(Type.LinkMark, start, start + (type == Type.Image ? 2 : 1)));
    content2.push(elt(Type.LinkMark, startPos - 1, startPos));
    if (next == 40) {
      let pos = cx.skipSpace(startPos + 1);
      let dest = parseURL(text, pos - cx.offset, cx.offset), title;
      if (dest) {
        pos = cx.skipSpace(dest.to);
        if (pos != dest.to) {
          title = parseLinkTitle(text, pos - cx.offset, cx.offset);
          if (title)
            pos = cx.skipSpace(title.to);
        }
      }
      if (cx.char(pos) == 41) {
        content2.push(elt(Type.LinkMark, startPos, startPos + 1));
        endPos = pos + 1;
        if (dest)
          content2.push(dest);
        if (title)
          content2.push(title);
        content2.push(elt(Type.LinkMark, pos, endPos));
      }
    } else if (next == 91) {
      let label = parseLinkLabel(text, startPos - cx.offset, cx.offset, false);
      if (label) {
        content2.push(label);
        endPos = label.to;
      }
    }
    return elt(type, start, endPos, content2);
  }
  function parseURL(text, start, offset) {
    let next = text.charCodeAt(start);
    if (next == 60) {
      for (let pos = start + 1; pos < text.length; pos++) {
        let ch = text.charCodeAt(pos);
        if (ch == 62)
          return elt(Type.URL, start + offset, pos + 1 + offset);
        if (ch == 60 || ch == 10)
          return false;
      }
      return null;
    } else {
      let depth = 0, pos = start;
      for (let escaped = false; pos < text.length; pos++) {
        let ch = text.charCodeAt(pos);
        if (space3(ch)) {
          break;
        } else if (escaped) {
          escaped = false;
        } else if (ch == 40) {
          depth++;
        } else if (ch == 41) {
          if (!depth)
            break;
          depth--;
        } else if (ch == 92) {
          escaped = true;
        }
      }
      return pos > start ? elt(Type.URL, start + offset, pos + offset) : pos == text.length ? null : false;
    }
  }
  function parseLinkTitle(text, start, offset) {
    let next = text.charCodeAt(start);
    if (next != 39 && next != 34 && next != 40)
      return false;
    let end = next == 40 ? 41 : next;
    for (let pos = start + 1, escaped = false; pos < text.length; pos++) {
      let ch = text.charCodeAt(pos);
      if (escaped)
        escaped = false;
      else if (ch == end)
        return elt(Type.LinkTitle, start + offset, pos + 1 + offset);
      else if (ch == 92)
        escaped = true;
    }
    return null;
  }
  function parseLinkLabel(text, start, offset, requireNonWS) {
    for (let escaped = false, pos = start + 1, end = Math.min(text.length, pos + 999); pos < end; pos++) {
      let ch = text.charCodeAt(pos);
      if (escaped)
        escaped = false;
      else if (ch == 93)
        return requireNonWS ? false : elt(Type.LinkLabel, start + offset, pos + 1 + offset);
      else {
        if (requireNonWS && !space3(ch))
          requireNonWS = false;
        if (ch == 91)
          return false;
        else if (ch == 92)
          escaped = true;
      }
    }
    return null;
  }
  var InlineContext = class {
    /**
    @internal
    */
    constructor(parser7, text, offset) {
      this.parser = parser7;
      this.text = text;
      this.offset = offset;
      this.parts = [];
    }
    /**
    Get the character code at the given (document-relative)
    position.
    */
    char(pos) {
      return pos >= this.end ? -1 : this.text.charCodeAt(pos - this.offset);
    }
    /**
    The position of the end of this inline section.
    */
    get end() {
      return this.offset + this.text.length;
    }
    /**
    Get a substring of this inline section. Again uses
    document-relative positions.
    */
    slice(from, to) {
      return this.text.slice(from - this.offset, to - this.offset);
    }
    /**
    @internal
    */
    append(elt2) {
      this.parts.push(elt2);
      return elt2.to;
    }
    /**
    Add a [delimiter](#DelimiterType) at this given position. `open`
    and `close` indicate whether this delimiter is opening, closing,
    or both. Returns the end of the delimiter, for convenient
    returning from [parse functions](#InlineParser.parse).
    */
    addDelimiter(type, from, to, open, close) {
      return this.append(new InlineDelimiter(type, from, to, (open ? 1 : 0) | (close ? 2 : 0)));
    }
    /**
    Returns true when there is an unmatched link or image opening
    token before the current position.
    */
    get hasOpenLink() {
      for (let i = this.parts.length - 1; i >= 0; i--) {
        let part = this.parts[i];
        if (part instanceof InlineDelimiter && (part.type == LinkStart || part.type == ImageStart))
          return true;
      }
      return false;
    }
    /**
    Add an inline element. Returns the end of the element.
    */
    addElement(elt2) {
      return this.append(elt2);
    }
    /**
    Resolve markers between this.parts.length and from, wrapping matched markers in the
    appropriate node and updating the content of this.parts. @internal
    */
    resolveMarkers(from) {
      for (let i = from; i < this.parts.length; i++) {
        let close = this.parts[i];
        if (!(close instanceof InlineDelimiter && close.type.resolve && close.side & 2))
          continue;
        let emp = close.type == EmphasisUnderscore || close.type == EmphasisAsterisk;
        let closeSize = close.to - close.from;
        let open, j = i - 1;
        for (; j >= from; j--) {
          let part = this.parts[j];
          if (part instanceof InlineDelimiter && part.side & 1 && part.type == close.type && // Ignore emphasis delimiters where the character count doesn't match
          !(emp && (close.side & 1 || part.side & 2) && (part.to - part.from + closeSize) % 3 == 0 && ((part.to - part.from) % 3 || closeSize % 3))) {
            open = part;
            break;
          }
        }
        if (!open)
          continue;
        let type = close.type.resolve, content2 = [];
        let start = open.from, end = close.to;
        if (emp) {
          let size = Math.min(2, open.to - open.from, closeSize);
          start = open.to - size;
          end = close.from + size;
          type = size == 1 ? "Emphasis" : "StrongEmphasis";
        }
        if (open.type.mark)
          content2.push(this.elt(open.type.mark, start, open.to));
        for (let k = j + 1; k < i; k++) {
          if (this.parts[k] instanceof Element2)
            content2.push(this.parts[k]);
          this.parts[k] = null;
        }
        if (close.type.mark)
          content2.push(this.elt(close.type.mark, close.from, end));
        let element = this.elt(type, start, end, content2);
        this.parts[j] = emp && open.from != start ? new InlineDelimiter(open.type, open.from, start, open.side) : null;
        let keep = this.parts[i] = emp && close.to != end ? new InlineDelimiter(close.type, end, close.to, close.side) : null;
        if (keep)
          this.parts.splice(i, 0, element);
        else
          this.parts[i] = element;
      }
      let result = [];
      for (let i = from; i < this.parts.length; i++) {
        let part = this.parts[i];
        if (part instanceof Element2)
          result.push(part);
      }
      return result;
    }
    /**
    Find an opening delimiter of the given type. Returns `null` if
    no delimiter is found, or an index that can be passed to
    [`takeContent`](#InlineContext.takeContent) otherwise.
    */
    findOpeningDelimiter(type) {
      for (let i = this.parts.length - 1; i >= 0; i--) {
        let part = this.parts[i];
        if (part instanceof InlineDelimiter && part.type == type && part.side & 1)
          return i;
      }
      return null;
    }
    /**
    Remove all inline elements and delimiters starting from the
    given index (which you should get from
    [`findOpeningDelimiter`](#InlineContext.findOpeningDelimiter),
    resolve delimiters inside of them, and return them as an array
    of elements.
    */
    takeContent(startIndex) {
      let content2 = this.resolveMarkers(startIndex);
      this.parts.length = startIndex;
      return content2;
    }
    /**
    Return the delimiter at the given index. Mostly useful to get
    additional info out of a delimiter index returned by
    [`findOpeningDelimiter`](#InlineContext.findOpeningDelimiter).
    Returns null if there is no delimiter at this index.
    */
    getDelimiterAt(index) {
      let part = this.parts[index];
      return part instanceof InlineDelimiter ? part : null;
    }
    /**
    Skip space after the given (document) position, returning either
    the position of the next non-space character or the end of the
    section.
    */
    skipSpace(from) {
      return skipSpace(this.text, from - this.offset) + this.offset;
    }
    elt(type, from, to, children) {
      if (typeof type == "string")
        return elt(this.parser.getNodeType(type), from, to, children);
      return new TreeElement(type, from);
    }
  };
  InlineContext.linkStart = LinkStart;
  InlineContext.imageStart = ImageStart;
  function injectMarks(elements, marks) {
    if (!marks.length)
      return elements;
    if (!elements.length)
      return marks;
    let elts = elements.slice(), eI = 0;
    for (let mark of marks) {
      while (eI < elts.length && elts[eI].to < mark.to)
        eI++;
      if (eI < elts.length && elts[eI].from < mark.from) {
        let e = elts[eI];
        if (e instanceof Element2)
          elts[eI] = new Element2(e.type, e.from, e.to, injectMarks(e.children, [mark]));
      } else {
        elts.splice(eI++, 0, mark);
      }
    }
    return elts;
  }
  var NotLast = [Type.CodeBlock, Type.ListItem, Type.OrderedList, Type.BulletList];
  var FragmentCursor3 = class {
    constructor(fragments, input) {
      this.fragments = fragments;
      this.input = input;
      this.i = 0;
      this.fragment = null;
      this.fragmentEnd = -1;
      this.cursor = null;
      if (fragments.length)
        this.fragment = fragments[this.i++];
    }
    nextFragment() {
      this.fragment = this.i < this.fragments.length ? this.fragments[this.i++] : null;
      this.cursor = null;
      this.fragmentEnd = -1;
    }
    moveTo(pos, lineStart) {
      while (this.fragment && this.fragment.to <= pos)
        this.nextFragment();
      if (!this.fragment || this.fragment.from > (pos ? pos - 1 : 0))
        return false;
      if (this.fragmentEnd < 0) {
        let end = this.fragment.to;
        while (end > 0 && this.input.read(end - 1, end) != "\n")
          end--;
        this.fragmentEnd = end ? end - 1 : 0;
      }
      let c = this.cursor;
      if (!c) {
        c = this.cursor = this.fragment.tree.cursor();
        c.firstChild();
      }
      let rPos = pos + this.fragment.offset;
      while (c.to <= rPos)
        if (!c.parent())
          return false;
      for (; ; ) {
        if (c.from >= rPos)
          return this.fragment.from <= lineStart;
        if (!c.childAfter(rPos))
          return false;
      }
    }
    matches(hash2) {
      let tree = this.cursor.tree;
      return tree && tree.prop(NodeProp.contextHash) == hash2;
    }
    takeNodes(cx) {
      let cur = this.cursor, off = this.fragment.offset, fragEnd = this.fragmentEnd - (this.fragment.openEnd ? 1 : 0);
      let start = cx.absoluteLineStart, end = start, blockI = cx.block.children.length;
      let prevEnd = end, prevI = blockI;
      for (; ; ) {
        if (cur.to - off > fragEnd) {
          if (cur.type.isAnonymous && cur.firstChild())
            continue;
          break;
        }
        let pos = toRelative(cur.from - off, cx.ranges);
        if (cur.to - off <= cx.ranges[cx.rangeI].to) {
          cx.addNode(cur.tree, pos);
        } else {
          let dummy = new Tree(cx.parser.nodeSet.types[Type.Paragraph], [], [], 0, cx.block.hashProp);
          cx.reusePlaceholders.set(dummy, cur.tree);
          cx.addNode(dummy, pos);
        }
        if (cur.type.is("Block")) {
          if (NotLast.indexOf(cur.type.id) < 0) {
            end = cur.to - off;
            blockI = cx.block.children.length;
          } else {
            end = prevEnd;
            blockI = prevI;
          }
          prevEnd = cur.to - off;
          prevI = cx.block.children.length;
        }
        if (!cur.nextSibling())
          break;
      }
      while (cx.block.children.length > blockI) {
        cx.block.children.pop();
        cx.block.positions.pop();
      }
      return end - start;
    }
  };
  function toRelative(abs, ranges) {
    let pos = abs;
    for (let i = 1; i < ranges.length; i++) {
      let gapFrom = ranges[i - 1].to, gapTo = ranges[i].from;
      if (gapFrom < abs)
        pos -= gapTo - gapFrom;
    }
    return pos;
  }
  var markdownHighlighting = styleTags({
    "Blockquote/...": tags.quote,
    HorizontalRule: tags.contentSeparator,
    "ATXHeading1/... SetextHeading1/...": tags.heading1,
    "ATXHeading2/... SetextHeading2/...": tags.heading2,
    "ATXHeading3/...": tags.heading3,
    "ATXHeading4/...": tags.heading4,
    "ATXHeading5/...": tags.heading5,
    "ATXHeading6/...": tags.heading6,
    "Comment CommentBlock": tags.comment,
    Escape: tags.escape,
    Entity: tags.character,
    "Emphasis/...": tags.emphasis,
    "StrongEmphasis/...": tags.strong,
    "Link/... Image/...": tags.link,
    "OrderedList/... BulletList/...": tags.list,
    "BlockQuote/...": tags.quote,
    "InlineCode CodeText": tags.monospace,
    "URL Autolink": tags.url,
    "HeaderMark HardBreak QuoteMark ListMark LinkMark EmphasisMark CodeMark": tags.processingInstruction,
    "CodeInfo LinkLabel": tags.labelName,
    LinkTitle: tags.string,
    Paragraph: tags.content
  });
  var parser5 = new MarkdownParser(new NodeSet(nodeTypes).extend(markdownHighlighting), Object.keys(DefaultBlockParsers).map((n) => DefaultBlockParsers[n]), Object.keys(DefaultBlockParsers).map((n) => DefaultLeafBlocks[n]), Object.keys(DefaultBlockParsers), DefaultEndLeaf, DefaultSkipMarkup, Object.keys(DefaultInline).map((n) => DefaultInline[n]), Object.keys(DefaultInline), []);
  var StrikethroughDelim = { resolve: "Strikethrough", mark: "StrikethroughMark" };
  var Strikethrough = {
    defineNodes: [{
      name: "Strikethrough",
      style: { "Strikethrough/...": tags.strikethrough }
    }, {
      name: "StrikethroughMark",
      style: tags.processingInstruction
    }],
    parseInline: [{
      name: "Strikethrough",
      parse(cx, next, pos) {
        if (next != 126 || cx.char(pos + 1) != 126 || cx.char(pos + 2) == 126)
          return -1;
        let before = cx.slice(pos - 1, pos), after = cx.slice(pos + 2, pos + 3);
        let sBefore = /\s|^$/.test(before), sAfter = /\s|^$/.test(after);
        let pBefore = Punctuation.test(before), pAfter = Punctuation.test(after);
        return cx.addDelimiter(StrikethroughDelim, pos, pos + 2, !sAfter && (!pAfter || sBefore || pBefore), !sBefore && (!pBefore || sAfter || pAfter));
      },
      after: "Emphasis"
    }]
  };
  function parseRow(cx, line, startI = 0, elts, offset = 0) {
    let count = 0, first = true, cellStart = -1, cellEnd = -1, esc = false;
    let parseCell = () => {
      elts.push(cx.elt("TableCell", offset + cellStart, offset + cellEnd, cx.parser.parseInline(line.slice(cellStart, cellEnd), offset + cellStart)));
    };
    for (let i = startI; i < line.length; i++) {
      let next = line.charCodeAt(i);
      if (next == 124 && !esc) {
        if (!first || cellStart > -1)
          count++;
        first = false;
        if (elts) {
          if (cellStart > -1)
            parseCell();
          elts.push(cx.elt("TableDelimiter", i + offset, i + offset + 1));
        }
        cellStart = cellEnd = -1;
      } else if (esc || next != 32 && next != 9) {
        if (cellStart < 0)
          cellStart = i;
        cellEnd = i + 1;
      }
      esc = !esc && next == 92;
    }
    if (cellStart > -1) {
      count++;
      if (elts)
        parseCell();
    }
    return count;
  }
  function hasPipe(str, start) {
    for (let i = start; i < str.length; i++) {
      let next = str.charCodeAt(i);
      if (next == 124)
        return true;
      if (next == 92)
        i++;
    }
    return false;
  }
  var delimiterLine = /^\|?(\s*:?-+:?\s*\|)+(\s*:?-+:?\s*)?$/;
  var TableParser = class {
    constructor() {
      this.rows = null;
    }
    nextLine(cx, line, leaf) {
      if (this.rows == null) {
        this.rows = false;
        let lineText;
        if ((line.next == 45 || line.next == 58 || line.next == 124) && delimiterLine.test(lineText = line.text.slice(line.pos))) {
          let firstRow = [], firstCount = parseRow(cx, leaf.content, 0, firstRow, leaf.start);
          if (firstCount == parseRow(cx, lineText, line.pos))
            this.rows = [
              cx.elt("TableHeader", leaf.start, leaf.start + leaf.content.length, firstRow),
              cx.elt("TableDelimiter", cx.lineStart + line.pos, cx.lineStart + line.text.length)
            ];
        }
      } else if (this.rows) {
        let content2 = [];
        parseRow(cx, line.text, line.pos, content2, cx.lineStart);
        this.rows.push(cx.elt("TableRow", cx.lineStart + line.pos, cx.lineStart + line.text.length, content2));
      }
      return false;
    }
    finish(cx, leaf) {
      if (!this.rows)
        return false;
      cx.addLeafElement(leaf, cx.elt("Table", leaf.start, leaf.start + leaf.content.length, this.rows));
      return true;
    }
  };
  var Table = {
    defineNodes: [
      { name: "Table", block: true },
      { name: "TableHeader", style: { "TableHeader/...": tags.heading } },
      "TableRow",
      { name: "TableCell", style: tags.content },
      { name: "TableDelimiter", style: tags.processingInstruction }
    ],
    parseBlock: [{
      name: "Table",
      leaf(_, leaf) {
        return hasPipe(leaf.content, 0) ? new TableParser() : null;
      },
      endLeaf(cx, line, leaf) {
        if (leaf.parsers.some((p) => p instanceof TableParser) || !hasPipe(line.text, line.basePos))
          return false;
        let next = cx.peekLine();
        return delimiterLine.test(next) && parseRow(cx, line.text, line.basePos) == parseRow(cx, next, line.basePos);
      },
      before: "SetextHeading"
    }]
  };
  var TaskParser = class {
    nextLine() {
      return false;
    }
    finish(cx, leaf) {
      cx.addLeafElement(leaf, cx.elt("Task", leaf.start, leaf.start + leaf.content.length, [
        cx.elt("TaskMarker", leaf.start, leaf.start + 3),
        ...cx.parser.parseInline(leaf.content.slice(3), leaf.start + 3)
      ]));
      return true;
    }
  };
  var TaskList = {
    defineNodes: [
      { name: "Task", block: true, style: tags.list },
      { name: "TaskMarker", style: tags.atom }
    ],
    parseBlock: [{
      name: "TaskList",
      leaf(cx, leaf) {
        return /^\[[ xX]\][ \t]/.test(leaf.content) && cx.parentType().name == "ListItem" ? new TaskParser() : null;
      },
      after: "SetextHeading"
    }]
  };
  function parseSubSuper(ch, node, mark) {
    return (cx, next, pos) => {
      if (next != ch || cx.char(pos + 1) == ch)
        return -1;
      let elts = [cx.elt(mark, pos, pos + 1)];
      for (let i = pos + 1; i < cx.end; i++) {
        let next2 = cx.char(i);
        if (next2 == ch)
          return cx.addElement(cx.elt(node, pos, i + 1, elts.concat(cx.elt(mark, i, i + 1))));
        if (next2 == 92)
          elts.push(cx.elt("Escape", i, i++ + 2));
        if (space3(next2))
          break;
      }
      return -1;
    };
  }
  var Superscript = {
    defineNodes: [
      { name: "Superscript", style: tags.special(tags.content) },
      { name: "SuperscriptMark", style: tags.processingInstruction }
    ],
    parseInline: [{
      name: "Superscript",
      parse: parseSubSuper(94, "Superscript", "SuperscriptMark")
    }]
  };
  var Subscript = {
    defineNodes: [
      { name: "Subscript", style: tags.special(tags.content) },
      { name: "SubscriptMark", style: tags.processingInstruction }
    ],
    parseInline: [{
      name: "Subscript",
      parse: parseSubSuper(126, "Subscript", "SubscriptMark")
    }]
  };
  var Emoji = {
    defineNodes: [{ name: "Emoji", style: tags.character }],
    parseInline: [{
      name: "Emoji",
      parse(cx, next, pos) {
        let match;
        if (next != 58 || !(match = /^[a-zA-Z_0-9]+:/.exec(cx.slice(pos + 1, cx.end))))
          return -1;
        return cx.addElement(cx.elt("Emoji", pos, pos + 1 + match[0].length));
      }
    }]
  };

  // lezer-lua/lua-parser.js
  var spec_identifier4 = { __proto__: null, break: 16, goto: 20, do: 24, end: 26, while: 30, nil: 32, true: 34, false: 36, or: 80, and: 82, not: 106, function: 114, repeat: 120, until: 122, if: 126, then: 128, elseif: 130, else: 132, for: 136, in: 144, local: 154, return: 168 };
  var parser6 = LRParser.deserialize({
    version: 14,
    states: "<bO!ZQPOOOOQO'#Cc'#CcO!UQPO'#CaO!bQPOOOOQO'#Ee'#EeO!vQQO'#CwO$YQPO'#EdOOQO'#Ed'#EdO$dQPO'#EdOOQO'#D}'#D}O%sQPO'#D|OOQO'#E`'#E`OOQO'#ET'#ETO%xQPO'#C_OOQO'#C_'#C_QOQPOOO!UQPO'#CeO&]QPO'#CgO!vQQO'#CjO&dQPO'#DiO!vQQO'#DlO!UQPO'#DqO!UQPO'#DxO&kQPO'#EOO&sQQO'#ERO'ZQPO,58{OOQO'#Cq'#CqO!UQPO,59^O!vQQO,59`O(aQQO'#C|O(hQQO'#EjOOQO'#Ef'#EfOOQO,59f,59fO!UQPO,59fO(oQPO'#EbO,_QPO,59cOOQO'#Dd'#DdOOQO'#De'#DeO!vQQO'#DbOOQO'#Eb'#EbO,fQPO'#DfO,kQPO'#EYO,sQPO,5;dO!vQQO,5:hOOQO-E8R-E8ROOQO,58y,58yOOQO,59P,59PO,{QPO,59RO-QQPO,59UO-XQPO,5:TO-^QPO,5:WO-eQPO'#EwOOQO'#Du'#DuO-pQPO'#DtO-uQPO,5:]O-zQPO'#DyO,fQPO,5:dO.VQQO'#EyOOQO'#EP'#EPO!UQPO,5:fO/mQPO,5:jO0}QPO,5:mOOQO,5:m,5:mOOQO1G.g1G.gOOQO1G.x1G.xO1eQPO1G.zO1lQSO'#EbO2xQSO'#EeO!vQQO'#DOO5mQSO'#DQOOQO'#Eg'#EgOOQO,59h,59hO5wQSO,59hO5|QPO'#EkOOQO,5;U,5;UO7cQPO,5;UO7hQPO1G/QOOQO1G.}1G.}OOQO'#DX'#DXOOQO'#DY'#DYOOQO'#DZ'#DZOOQO'#D['#D[OOQO'#D^'#D^OOQO'#D_'#D_OOQO'#Da'#DaO!vQQO,59oO!vQQO,59oO!vQQO,59oO!vQQO,59oO!vQQO,59oO!vQQO,59oOOQO,59o,59oO!vQQO,59oO!vQQO,59oO!vQQO,59oO8wQPO,59|O:dQPO'#DhOOQO,5:Q,5:QO:iQPO,5:tOOQO-E8W-E8WOOQO'#Dw'#DwOOQO1G0S1G0SOOQO1G.m1G.mO&]QPO1G.pO!vQQO1G/oO:sQPO1G/rO!vQQO,5:_O!UQPO'#EWO:}QPO,5;cO!vQQO,5:`O&]QPO1G/wO!UQPO'#EXO;VQPO,5:eO!UQPO,5:eOOQO1G0O1G0OO!UQPO'#EQO;bQPO,5;eO,fQPO1G0QO!vQQO1G0UOOQO1G0X1G0XOOQO7+$f7+$fO<uQQO,59kO=sQPO,59jO'`QQO1G/SO=zQSO,59|O!vQQO'#EUO>UQPO,5;VOOQO1G0p1G0pOOQO7+$l7+$lOBRQPO1G/ZOBYQPO1G/ZODyQPO1G/ZOEQQPO1G/ZOGkQPO1G/ZOGxQPO1G/ZOIyQPO1G/ZOM`QPO1G/ZOMgQPO1G/ZO&]QPO,5:SOMnQPO7+$[OMsQPO7+%ZO! SQPO7+%^O! [QPO1G/yOOQO,5:r,5:rOOQO-E8U-E8UOOQO1G/z1G/zO! cQPO7+%cOOQO,5:s,5:sOOQO-E8V-E8VO!UQPO1G0POOQO1G0P1G0PO! hQQO,5:lO!UQPO'#EZO! mQPO1G1POOQO7+%l7+%lOOQO7+%p7+%pO!#QQSO1G/VO!#[QPO1G/UO!$hQSO1G/ZO!$oQSO1G/ZO!%}QSO1G/ZO!&UQSO1G/ZO!'^QSO1G/ZO!'kQSO1G/ZO!(ZQSO1G/ZO!*_QSO1G/ZO!*fQSO1G/ZO!*mQSO7+$nO!*uQPO,5:pOOQO-E8S-E8SO!,[QPO1G/nOOQO<<Gv<<GvO!,aQPO<<HxO!vQQO'#EVO&]QPO<<HxO!vQQO7+%eOOQO<<H}<<H}OOQO7+%k7+%kOOQO1G0W1G0WO.VQQO,5:uOOQO-E8X-E8XO<uQQO7+$pOOQO<<HY<<HYO!,iQPO<<HYOOQO7+%Y7+%YOOQO-E8T-E8TO&]QPOAN>dO!,nQPO,5:qO!,uQPOAN>dO!,zQPO<<IPOOQO1G0a1G0aO!-UQSO<<H[OOQOAN=tAN=tO!-`QPOG24OO:sQPO1G0]OOQOG24OG24OO!vQQOAN>kOOQOLD)jLD)jOOQO7+%w7+%wO!-eQPOG24VO<uQQO'#DbO<uQQO,59oO<uQQO,59oO<uQQO,59oO<uQQO,59oO<uQQO,59oO<uQQO,59oO<uQQO,59oO<uQQO,59oO<uQQO,59o",
    stateData: "!-o~O#QOS#ROSPOS~OSZOUQOWZOY`O[aO_bOlTO!ZfO!^cO!adO!feO!ogO!vhO#TPO~O#ORP~P]OgkOilOlnOoqOqmO#VjO~O`wOawObwOcwOdwOlTOqmO!VvO!ZxO#TPO#VjO#buO#etO#ftO~Og#WXi#WXl#WXo#WXq#WX#V#WX~OvyO#[#lX~P#tOS#SXU#SXW#SXY#SX[#SX_#SXl#SX!Z#SX!^#SX!a#SX!f#SX!o#SX!v#SX#O#SX#T#SX]#SX!_#SX!c#SX!d#SX~P#tO#[{O~O#ORX]RX!_RX!cRX!dRX~P]O]RP~P]O!_RP~P]O!Z!]O#TPO~OS!`O#O!uX]!uX!_!uX!c!uX!d!uX~P!vOU!aO~O`wOawObwOcwOdwOi!fOlTOqmO!V%`O!ZxO#TPO#VjO#buO#etO#ftO~Ou!iO~P'`Om!lO~P!vOm#UXx#UXy#UXz#UX!P#UX!S#UX#`#UX#a#UX#b#UX#c#UX#d#UX#e#UX#f#UX#g#UX#h#UX#i#UX#j#UX[#UX!b#UXS#UX#O#UXj#UXv#UXU#UXW#UXY#UX_#UX!Z#UX!^#UX!a#UX!f#UX!o#UX!v#UX#T#UX]#UX!_#UX!c#UX!d#UX~P!bOx#POy#QOz!wO!P!{O!S!uO#`!pO#a!qO#b!rO#c!sO#d!sO#e!tO#f!tO#g!uO#h!uO#i!uO#j!vO~Om!oO~P+ZOl#SO~OlTO#TPO~OvyO#[#la~O]#YO~O[#ZO~P+ZO!_#[O~O!b#]O~P+ZOv#_O#[#^O!j#kX~O!j#aO~O[#bO~Og#cOo#eOl!mX~O#n#gOS!tPU!tPW!tPY!tP[!tP_!tPl!tPv!tP!Z!tP!^!tP!a!tP!f!tP!o!tP!v!tP#O!tP#T!tP#[!tP]!tP!_!tP!c!tP!d!tP~O#[#jOS!raU!raW!raY!ra[!ra_!ral!ra!Z!ra!^!ra!a!ra!f!ra!o!ra!v!ra#O!ra#T!ra]!ra!_!ra!c!ra!d!ra~OS#kO#O!ua]!ua!_!ua!c!ua!d!ua~P+ZOj#lO~P+ZOx#UXy#UXz#UX!P#UX!S#UX#]#UX#`#UX#a#UX#b#UX#c#UX#d#UX#e#UX#f#UX#g#UX#h#UX#i#UX#j#UXu#UX~P!bO#[#mOg#XXi#XXl#XXo#XXq#XXx#XXy#XXz#XX!P#XX!S#XX#V#XX#]#XX#`#XX#a#XX#b#XX#c#XX#d#XX#e#XX#f#XX#g#XX#h#XX#i#XX#j#XXu#XX~Ox%hOy%iOz%aO!P%eO!S!uO#`!pO#a!qO#b!rO#c!sO#d!sO#e!tO#f!tO#g!uO#h!uO#i!uO#j!vO~O#]tXutX~P4iO#]#oO~Ov#qOm#_XS#_XU#_XW#_XY#_X[#_X_#_Xl#_X!Z#_X!^#_X!a#_X!f#_X!o#_X!v#_X#O#_X#T#_X]#_X!_#_X!c#_X!d#_X~P+ZOm#sO~OlnOqmO#VjO~O#j!vOx!Uay!Uaz!Ua!P!Ua!S!Ua#`!Ua#a!Ua#b!Ua#c!Ua#d!Ua#e!Ua#f!Ua#g!Ua#h!Ua#i!Ua~Om!Ua[!Ua!b!UaS!Ua#O!Uaj!Uav!UaU!UaW!UaY!Ua_!Ual!Ua!Z!Ua!^!Ua!a!Ua!f!Ua!o!Ua!v!Ua#T!Ua]!Ua!_!Ua!c!Ua!d!Ua~P7sOm$OO~Ov!|a#[!|a~P#tO!cRP!dRP~P]Ov#_O!j#ka~Og#cOo$ZOl!ma~Ov$^OS#maU#maW#maY#ma[#ma_#mal#ma!Z#ma!^#ma!a#ma!f#ma!o#ma!v#ma#O#ma#T#ma#[#ma]#ma!_#ma!c#ma!d#ma~O`wOawObwOcwOdwOlTOqmO!V%`O!ZxO#TPO#VjO#buO#etO#ftO~Oj$cO~P+ZO#]!Uau!Ua~P7sOv#qOm#_aS#_aU#_aW#_aY#_a[#_a_#_al#_a!Z#_a!^#_a!a#_a!f#_a!o#_a!v#_a#O#_a#T#_a]#_a!_#_a!c#_a!d#_a~O!P!{O!S!uO#a!qO#b!rO#c!sO#d!sO#e!tO#f!tO#g!uO#h!uO#i!uO#j!vOmwixwiywizwi[wi!bwiSwi#OwijwivwiUwiWwiYwi_wilwi!Zwi!^wi!awi!fwi!owi!vwi#Twi]wi!_wi!cwi!dwi~O#`!pO~P?iO#`wi~P?iO!P!{O!S!uO#c!sO#d!sO#e!tO#f!tO#g!uO#h!uO#i!uO#j!vOmwixwiywizwi#`wi#bwi[wi!bwiSwi#OwijwivwiUwiWwiYwi_wilwi!Zwi!^wi!awi!fwi!owi!vwi#Twi]wi!_wi!cwi!dwi~O#awi~PBaO#a!qO~PBaO!S!uO#g!uO#h!uO#i!uO#j!vOmwixwiywizwi#`wi#awi#bwi#cwi#dwi[wi!bwiSwi#OwijwivwiUwiWwiYwi_wilwi!Zwi!^wi!awi!fwi!owi!vwi#Twi]wi!_wi!cwi!dwi~O!P!{O#e!tO#f!tO~PEXO!Pwi#ewi#fwi~PEXO#j!vOmwixwiywi[wi!bwiSwi#OwijwivwiUwiWwiYwi_wilwi!Zwi!^wi!awi!fwi!owi!vwi#Twi]wi!_wi!cwi!dwi~Ozwi!Pwi!Swi#`wi#awi#bwi#cwi#dwi#ewi#fwi#gwi#hwi#iwi~PHVOz!wO!P!{O!S!uO#`!pO#a!qO#b!rO#c!sO#d!sO#e!tO#f!tO#g!uO#h!uO#i!uO#j!vOmwixwi[wi!bwiSwi#OwijwivwiUwiWwiYwi_wilwi!Zwi!^wi!awi!fwi!owi!vwi#Twi]wi!_wi!cwi!dwi~Oy#QO~PJvOywi~PJvO]$qO~OS!]qU!]qW!]qY!]q[!]q_!]ql!]q!Z!]q!^!]q!a!]q!f!]q!o!]q!v!]q#O!]q#T!]q]!]q!_!]q!c!]q!d!]q~P+ZO!c$sO!d$tO~Ov$uO~P+ZO]$vO~O#o$xO~Ov$^OS#miU#miW#miY#mi[#mi_#mil#mi!Z#mi!^#mi!a#mi!f#mi!o#mi!v#mi#O#mi#T#mi#[#mi]#mi!_#mi!c#mi!d#mi~O#]siusi~P4iO#[${O~O!P%eO!S!uO#a!qO#b!rO#c!sO#d!sO#e!tO#f!tO#g!uO#h!uO#i!uO#j!vOxwiywizwi#]wiuwi~O#`!pO~P!#aO#`wi~P!#aO!P%eO!S!uO#c!sO#d!sO#e!tO#f!tO#g!uO#h!uO#i!uO#j!vOxwiywizwi#]wi#`wi#bwiuwi~O#awi~P!$vO#a!qO~P!$vO!S!uO#g!uO#h!uO#i!uO#j!vOxwiywizwi#]wi#`wi#awi#bwi#cwi#dwiuwi~O!P%eO#e!tO#f!tO~P!&]O!Pwi#ewi#fwi~P!&]O#j!vOxwiywi#]wiuwi~Ozwi!Pwi!Swi#`wi#awi#bwi#cwi#dwi#ewi#fwi#gwi#hwi#iwi~P!'xOz%aO!P%eO!S!uO#`!pO#a!qO#b!rO#c!sO#d!sO#e!tO#f!tO#g!uO#h!uO#i!uO#j!vOxwi#]wiuwi~Oy%iO~P!)WOywi~P!)WOu$|O#]$}O~Om!xav!xaS!xaU!xaW!xaY!xa[!xa_!xal!xa!Z!xa!^!xa!a!xa!f!xa!o!xa!v!xa#O!xa#T!xa]!xa!_!xa!c!xa!d!xa~P+ZO]%OO~O!c$sO!d%QO~Ou%WO~O!b%YO~P+ZO]%ZO~Ov%[O[!gy~P+ZO#]ryury~P4iO]%]O~O[!g!Z~P+ZOP#f~",
    goto: ":P#nPPP#oP$_P$lP$_P$_PP$_PPPPPP&r'tP'tPP(|PP*UP&rP+`+`+`PP&xPPP+d,O,n-[P-|.pP/d&xP0^0^&xP1[$_PP$_PPPP$_P1e1e1hP1k$_1t$_P$_1w$_2U2X2_P2n2}3T3Z3a3g3mPPPP3sP4QP6f7r9O9WPP9^9dPPPPPPPPPPP9l9o9|Q_OQ!PaQ!RcQ$P#ZQ$R#]Q$W#bQ$p$OQ%S$tQ%X%QR%^%YgZO]ac#Z#]#b$O$t%Q%Y#WSOT]abcdhlnvy{!f!w!x!y!z!{!|#O#P#Q#Z#[#]#^#a#b#j#m#q$O$s$t$u${%Q%Y%[%`%a%b%c%d%e%f%g%h%iQiQQ!O`Q!TeQ!XfQ!ZgQ!bkS!em#oQ!nqQ#i!]Q$T#_Q$X#cQ$[#eQ$]#gQ$w$ZR$y$^WoRr!d!n!swTbdhlmnv{!f!w!x!y!z!{!|#O#P#Q#[#^#a#j#m#o#q$s$u${%[%`%a%b%c%d%e%f%g%h%i#]SOT]abcdhlmnvy{!f!w!x!y!z!{!|#O#P#Q#Z#[#]#^#a#b#j#m#o#q$O$s$t$u${%Q%Y%[%`%a%b%c%d%e%f%g%h%i#]VOT]abcdhlmnvy{!f!w!x!y!z!{!|#O#P#Q#Z#[#]#^#a#b#j#m#o#q$O$s$t$u${%Q%Y%[%`%a%b%c%d%e%f%g%h%i!tVTbdhlmnvy{!f!w!x!y!z!{!|#O#P#Q#[#^#a#j#m#o#q$s$u${%[%`%a%b%c%d%e%f%g%h%igWO]ac#Z#]#b$O$t%Q%YT!hm#op!xs!Q!S!_!c!k#n#u#|#}$Q$S$n%R%T%_]%b!g$b$d$k$l%Vt!ys!Q!S!_!c!k#n#u#v#x#|#}$Q$S$n%R%T%_a%c!g$b$d$e$g$k$l%Vr!zs!Q!S!_!c!k#n#u#v#|#}$Q$S$n%R%T%__%d!g$b$d$e$k$l%Vv!{s!Q!S!_!c!k#n#u#v#w#x#|#}$Q$S$n%R%T%_c%e!g$b$d$e$f$g$k$l%Vx!|s!Q!S!_!c!k#n#u#v#w#x#y#|#}$Q$S$n%R%T%_e%f!g$b$d$e$f$g$h$k$l%V!c!}s!Q!S!_!c!g!k#n#u#v#w#x#y#z#|#}$Q$S$b$d$e$f$g$h$i$k$l$n%R%T%V%_!O#Os!Q!S!_!c!k#R#n#u#v#w#x#y#z#{#|#}$Q$S$n%R%T%_k%g!g#p$b$d$e$f$g$h$i$j$k$l%V!UvTbdhlnv{!f!w!x!y!z!{!|#O#P#Q#[#^#a#j#q$s$u%[m%`m#m#o${%`%a%b%c%d%e%f%g%h%iQ#TxQ#f!YR$`#iR!WeR!VeQ#X{Q$V#aR$a#jR!YfgYO]ac#Z#]#b$O$t%Q%YR!^gQ#h!ZR%U$yd^Oac#Z#]#b$O$t%Q%YR}]d]Oac#Z#]#b$O$t%Q%YR|]Q#r!kR$o#rQ$r$RR%P$rQ#`!TR$U#`Q#d!XR$Y#dQzUR#VzQ$_#hR$z$_g[O]ac#Z#]#b$O$t%Q%YQsTQ!QbQ!SdQ!_hQ!clS!gm#oW!kn{#a#jQ#RvQ#n!fQ#p%`Q#u!wQ#v!xQ#w!yQ#x!zQ#y!{Q#z!|Q#{#OQ#|#PQ#}#QQ$Q#[Q$S#^Q$b#mQ$d%aQ$e%bQ$f%cQ$g%dQ$h%eQ$i%fQ$j%gQ$k%hQ$l%iQ$n#qQ%R$sQ%T$uQ%V${R%_%[hRO]acy#Z#]#b$O$t%Q%Y!UrTbdhlnv{!f!w!x!y!z!{!|#O#P#Q#[#^#a#j#q$s$u%[m!dm#m#o${%`%a%b%c%d%e%f%g%h%ifUO]ac#Z#]#b$O$t%Q%Y!rVTbdhlmnv{!f!w!x!y!z!{!|#O#P#Q#[#^#a#j#m#o#q$s$u${%[%`%a%b%c%d%e%f%g%h%iR#UyUpRr!dR#t!nQ!jmR$m#oXoRr!d!nQ!mnV#W{#a#jR!UegXO]ac#Z#]#b$O$t%Q%YR![g",
    nodeNames: "\u26A0 Comment Chunk Block ; Label :: Name break Goto goto Scope do end WhileStatement while nil true false Ellipsis Number LiteralString Property . MemberExpression [ ] Parens ( ) FunctionCall : TableConstructor { FieldDynamic FieldProp FieldExp } , BinaryExpression or and CompareOp BitOp BitOp BitOp BitOp Concat ArithOp ArithOp * ArithOp UnaryExpression not ArithOp BitOp FunctionDef function FuncBody RepeatStatement repeat until IfStatement if then elseif else ForStatement for ForNumeric ForGeneric NameList in ExpList Function FuncName LocalFunction local Assign VarList Local AttNameList Attrib ReturnStatement return",
    maxTerm: 123,
    nodeProps: [
      ["group", -14, 4, 5, 8, 9, 11, 14, 30, 59, 62, 67, 74, 76, 78, 80, "Statement", -3, 34, 35, 36, "Field"]
    ],
    skippedNodes: [0, 1],
    repeatNodeCount: 7,
    tokenData: "6s~RrXY#]YZ#w[]#]]^$Upq#]rs$^uv)avw)fwx)kxy.iyz.nz{.s{|.x|}.}}!O/U!O!P/x!P!Q0_!Q!R0l!R![2Q![!]4U!]!^4c!^!_4j!_!`5R!`!a5Z!c!}5m!}#O5{#O#P#n#P#Q6Q#Q#R6V#T#o5m#o#p6[#p#q6a#q#r6f#r#s6k~#bS#R~XY#][]#]pq#]#O#P#n~#qQYZ#]]^#]~#|P#Q~]^$P~$UO#Q~~$ZP#Q~YZ$P~$aWOY$yZ]$y^r$ys#O$y#O#P%n#P;'S$y;'S;=`(O<%lO$y~$|XOY$yZ]$y^r$yrs%is#O$y#O#P%n#P;'S$y;'S;=`(O<%lO$y~%nO#V~~%qZrs$ywx$y!Q![&d#O#P$y#T#U$y#U#V$y#Y#Z$y#b#c$y#i#j(U#l#m(w#n#o$y~&gZOY$yZ]$y^r$yrs%is!Q$y!Q!['Y![#O$y#O#P%n#P;'S$y;'S;=`(O<%lO$y~']ZOY$yZ]$y^r$yrs%is!Q$y!Q![$y![#O$y#O#P%n#P;'S$y;'S;=`(O<%lO$y~(RP;=`<%l$y~(XP#o#p([~(_R!Q![(h!c!i(h#T#Z(h~(kS!Q![(h!c!i(h#T#Z(h#q#r$y~(zR!Q![)T!c!i)T#T#Z)T~)WR!Q![$y!c!i$y#T#Z$y~)fO#h~~)kO#a~~)nWOY*WZ]*W^w*Wx#O*W#O#P*v#P;'S*W;'S;=`-W<%lO*W~*ZXOY*WZ]*W^w*Wwx%ix#O*W#O#P*v#P;'S*W;'S;=`-W<%lO*W~*yZrs*Wwx*W!Q![+l#O#P*W#T#U*W#U#V*W#Y#Z*W#b#c*W#i#j-^#l#m.P#n#o*W~+oZOY*WZ]*W^w*Wwx%ix!Q*W!Q![,b![#O*W#O#P*v#P;'S*W;'S;=`-W<%lO*W~,eZOY*WZ]*W^w*Wwx%ix!Q*W!Q![*W![#O*W#O#P*v#P;'S*W;'S;=`-W<%lO*W~-ZP;=`<%l*W~-aP#o#p-d~-gR!Q![-p!c!i-p#T#Z-p~-sS!Q![-p!c!i-p#T#Z-p#q#r*W~.SR!Q![.]!c!i.]#T#Z.]~.`R!Q![*W!c!i*W#T#Z*W~.nOl~~.sOm~~.xO!S~~.}O#e~V/UOvR#]S~/ZP#f~}!O/^~/cTP~OY/^Z]/^^;'S/^;'S;=`/r<%lO/^~/uP;=`<%l/^V/}PgT!O!P0QV0VP!PT!O!P0YQ0_OcQ~0dP#g~!P!Q0g~0lO#i~~0qUd~!O!P1T!Q![2Q!g!h1i!z!{2c#X#Y1i#l#m2c~1WP!Q![1Z~1`Rd~!Q![1Z!g!h1i#X#Y1i~1lQ{|1r}!O1r~1uP!Q![1x~1}Pd~!Q![1x~2VSd~!O!P1T!Q![2Q!g!h1i#X#Y1i~2fR!Q![2o!c!i2o#T#Z2o~2tUd~!O!P3W!Q![2o!c!i2o!r!s3x#T#Z2o#d#e3x~3ZR!Q![3d!c!i3d#T#Z3d~3iTd~!Q![3d!c!i3d!r!s3x#T#Z3d#d#e3x~3{R{|1r}!O1r!P!Q1r~4ZPo~![!]4^~4cOU~V4jOSR#]SV4qQ#nQzT!^!_4w!_!`4|T4|O#cTT5ROzT~5WP#[~!_!`4|V5bQ#oQzT!_!`4|!`!a5hT5mO#dT~5rR#T~!Q![5m!c!}5m#T#o5m~6QOi~~6VOj~~6[O#j~~6aOq~~6fO#`~~6kOu~~6pP#b~!_!`4|",
    tokenizers: [0, 1, 2],
    topRules: { "Chunk": [0, 2] },
    dynamicPrecedences: { "106": 1 },
    specialized: [{ term: 97, get: (value) => spec_identifier4[value] || -1 }],
    tokenPrec: 2696
  });

  // main.js
  parser_html_css_js = parser.configure({
    nested: configureNesting([
      { tag: "Script", parser: parser2 },
      { tag: "Style", parser: parser3 }
    ])
  });
  window.lz_parser = {
    html: parser_html_css_js,
    js: parser2,
    css: parser3,
    cpp: parser4,
    md: parser5,
    lua: parser6
  };
})();
