var aesprim = require('./aesprim');
var slice = require('./slice');
var _evaluate = require('static-eval');
var _uniq = require('underscore').uniq;

var Handlers = new Function;

Handlers.prototype.resolve = function(component) {

  var key = [ component.operation, component.scope, component.expression.type ].join('-');
  var method = this._fns[key];

  if (!method) throw new Error("couldn't resolve key: " + key);
  return method.bind(this);
};

Handlers.prototype.register = function(key, handler) {

  if (!handler instanceof Function) {
    throw new Error("handler must be a function");
  }

  this._fns[key] = handler;
}

var descend = traverser();
var traverse = traverser(true);

var _descend = function(passable) {
  return function(component, partial) {
    return descend(partial, component.expression.value, passable)
  }
}

var _traverse = function(passable) {
  return function(component, partial) {
    return traverse(partial, component.expression.value, passable)
  }
}

Handlers.prototype._fns = {

  'member-child-identifier':
    _descend(function(key, value, ref) { return key == ref }),

  'member-descendant-identifier':
    _traverse(function(key, value, ref) { return key == ref }),

  'subscript-child-numeric_literal':
    _descend(function(key, value, ref) { return key === ref }),

  'subscript-descendant-numeric_literal':
    _traverse(function(key, value, ref) { return key === ref }),

  'member-child-wildcard':
    _descend(function() { return true }),

  'member-descendant-wildcard': 
    _traverse(function() { return true }),

  'subscript-descendant-wildcard': 
    _traverse(function() { return true }),

  'subscript-child-wildcard':
    _descend(function() { return true }),

  'subscript-child-slice': function(component, partial) {
    if (is_array(partial.value)) {
      var args = component.expression.value.split(':');
      var values = partial.value.map(function(v, i) { return { value: v, path: partial.path.concat(i) } });
      return slice.apply(null, [values].concat(args));
    }
  },

  'subscript-child-union': function(component, partial) {
    var results = [];
    component.expression.value.forEach(function(component) {
      var _component = { operation: 'subscript', scope: 'child', expression: component.expression };
      var handler = this.resolve(_component);
      var _results = handler(_component, partial);
      results = results.concat(_results);
    }, this);

    return unique(results);
  },

  'subscript-descendant-union': function(component, partial) {

    var jp = require('..');
    var self = this;

    var results = [];
    var nodes = jp.nodes(partial, '$..*').slice(1);

    nodes.forEach(function(node) { 
      component.expression.value.forEach(function(component) {
        var _component = { operation: 'subscript', scope: 'child', expression: component.expression };
        var handler = self.resolve(_component);
        var _results = handler(_component, node);
        results = results.concat(_results);
      });
    });

    return unique(results);
  },

  'subscript-child-filter_expression': function(component, partial) {

    // slice out the expression from ?(expression)
    var src = component.expression.value.slice(2, -1);
    var ast = aesprim.parse(src).body[0].expression;

    var passable = function(key, value) {
      return evaluate(ast, { '@': value });
    }

    return descend(partial, null, passable);

  },

  'subscript-descendant-filter_expression': function(component, partial) {

    // slice out the expression from ?(expression)
    var src = component.expression.value.slice(2, -1);
    var ast = aesprim.parse(src).body[0].expression;

    var passable = function(key, value) {
      return evaluate(ast, { '@': value });
    }

    return traverse(partial, null, passable);
  },

  'subscript-child-script_expression': function(component, partial) {
    var exp = component.expression.value.slice(1, -1);
    return eval_recurse(partial, exp, '$[{{value}}]');
  },

  'member-child-script_expression': function(component, partial) {
    var exp = component.expression.value.slice(1, -1);
    return eval_recurse(partial, exp, '$.{{value}}');
  },

  'member-descendant-script_expression': function(component, partial) {
    var exp = component.expression.value.slice(1, -1);
    return eval_recurse(partial, exp, '$..value');
  }
};

Handlers.prototype._fns['subscript-child-string_literal'] = 
	Handlers.prototype._fns['member-child-identifier'];

Handlers.prototype._fns['member-child-numeric_literal'] = 
	Handlers.prototype._fns['subscript-child-numeric_literal'];

Handlers.prototype._fns['member-descendant-numeric_literal'] = 
	Handlers.prototype._fns['member-descendant-identifier'];

function eval_recurse(partial, src, template) {

    var jp = require('./index');
    var ast = aesprim.parse(src).body[0].expression;
    var value = evaluate(ast, { '@': partial.value });
    var path = template.replace(/\{\{\s*value\s*\}\}/g, value);

    var results = jp.nodes(partial.value, path);
    results.forEach(function(r) {
      r.path = partial.path.concat(r.path.slice(1));
    });

    return results;
}

function is_array(val) {
  return Array.isArray(val);
}

function is_object(val) {
  // is this a non-array, non-null object?
  return val && !(val instanceof Array) && val instanceof Object;
}

function traverser(recurse) {

  return function(partial, ref, passable) {

    var value = partial.value;
    var path = partial.path;

    var results = [];

    function descend(value, path) {
      if (is_array(value)) {
        value.forEach(function(element, index) {
          if (passable(index, element, ref)) {
            results.push({ path: path.concat(index), value: element });
          }
        });
        value.forEach(function(element, index) {
          if (recurse) {
            descend(element, path.concat(index));
          }
        });
      } else if (is_object(value)) {
        Object.keys(value).forEach(function(k) {
          if (passable(k, value[k], ref)) {
            results.push({ path: path.concat(k), value: value[k] });
          }
        })
        Object.keys(value).forEach(function(k) {
          if (recurse) {
            descend(value[k], path.concat(k));
          }
        });
      }
    }
    descend(value, path);
    return results;
  }
}

function evaluate() {
  try { return _evaluate.apply(this, arguments) }
  catch(e) { }
}

function unique(results) {
    return _uniq(
      results,
      function(r) { return r.path.map(function(c) { return String(c).replace('-', '--') }).join('-') }
    );
}

module.exports = Handlers;