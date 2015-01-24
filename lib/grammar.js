var grammar = {
    "lex": {
        "macros": {
            "esc": "\\\\",
            "int": "-?(?:[0-9]|[1-9][0-9]+)",
        },
        "rules": [
            ["\\$", "return 'DOLLAR'"],
            ["\\.\\.", "return 'DOT_DOT'"],
            ["\\.", "return 'DOT'"],
            ["\\*", "return 'STAR'"],
            ["[a-zA-Z]+[a-zA-Z0-9]*", "return 'IDENTIFIER'"],
            ["\\[", "return '['"],
            ["\\]", "return ']'"],
            [",", "return ','"],
            ["({int})?\\:({int})?(\\:({int})?)?", "return 'ARRAY_SLICE'"],
            ["{int}", "return 'INTEGER'"],
            ["\"(?:{esc}[\"bfnrt/{esc}]|{esc}u[a-fA-F0-9]{4}|[^\"{esc}])*\"", "yytext = yytext.substr(1,yyleng-2); return 'QQ_STRING';"],
            ["'(?:{esc}[\'bfnrt/{esc}]|{esc}u[a-fA-F0-9]{4}|[^\'{esc}])*'", "yytext = yytext.substr(1,yyleng-2); return 'Q_STRING';"],
            ["\\(.+?\\)(?=\\])", "return 'SCRIPT_EXPRESSION'"],
            ["\\?\\(.+?\\)(?=\\])", "return 'FILTER_EXPRESSION'"],
        ]
    },

    "start": "JSON_PATH",

    bnf: {

      JSON_PATH: [
	[ 'DOLLAR',                 'yy.ast.set({ expression: { type: "root", value: $1 } }); yy.ast.unshift(); return yy.ast.yield()' ],
	[ 'DOLLAR PATH_COMPONENTS', 'yy.ast.set({ expression: { type: "root", value: $1 } }); yy.ast.unshift(); return yy.ast.yield()' ],
	[ 'LEADING_CHILD_MEMBER_EXPRESSION',                 'yy.ast.unshift(); return yy.ast.yield()' ],
	[ 'LEADING_CHILD_MEMBER_EXPRESSION PATH_COMPONENTS', 'yy.ast.unshift(); return yy.ast.yield()' ] ],

      PATH_COMPONENTS: [
	[ 'PATH_COMPONENT',                 '' ],
	[ 'PATH_COMPONENTS PATH_COMPONENT', '' ] ],

      PATH_COMPONENT: [
	[ 'MEMBER_COMPONENT',    'yy.ast.set({ operation: "member" }); yy.ast.push()' ],
	[ 'SUBSCRIPT_COMPONENT', 'yy.ast.set({ operation: "subscript" }); yy.ast.push() ' ] ],

      MEMBER_COMPONENT: [
	[ 'CHILD_MEMBER_COMPONENT',      'yy.ast.set({ scope: "child" })' ],
	[ 'DESCENDANT_MEMBER_COMPONENT', 'yy.ast.set({ scope: "descendant" })' ] ],

      CHILD_MEMBER_COMPONENT: [
	[ 'DOT MEMBER_EXPRESSION', '' ] ],

      LEADING_CHILD_MEMBER_EXPRESSION: [
	[ 'MEMBER_EXPRESSION', 'yy.ast.set({ scope: "child", operation: "member" })' ] ],

      DESCENDANT_MEMBER_COMPONENT: [
	[ 'DOT_DOT MEMBER_EXPRESSION', '' ] ],

      MEMBER_EXPRESSION: [
	[ 'STAR',              'yy.ast.set({ expression: { type: "wildcard", value: $1 } })' ],
	[ 'IDENTIFIER',        'yy.ast.set({ expression: { type: "identifier", value: $1 } })' ],
	[ 'SCRIPT_EXPRESSION', 'yy.ast.set({ expression: { type: "script_expression", value: $1 } })' ],
	[ 'INTEGER',           'yy.ast.set({ expression: { type: "numeric_literal", value: parseInt($1) } })' ],
	[ 'END',               '' ] ],

      SUBSCRIPT_COMPONENT: [
	[ 'CHILD_SUBSCRIPT_COMPONENT',      'yy.ast.set({ scope: "child" })' ],
	[ 'DESCENDANT_SUBSCRIPT_COMPONENT', 'yy.ast.set({ scope: "descendant" })' ] ],

      CHILD_SUBSCRIPT_COMPONENT: [
	[ '[ SUBSCRIPT ]', '' ] ],

      DESCENDANT_SUBSCRIPT_COMPONENT: [
	[ 'DOT_DOT [ SUBSCRIPT ]', '' ] ],

      SUBSCRIPT: [
	[ 'SUBSCRIPT_EXPRESSION', '' ],
	[ 'SUBSCRIPT_EXPRESSION_LIST', '' ] ],

      SUBSCRIPT_EXPRESSION_LIST: [
	[ 'SUBSCRIPT_EXPRESSION , SUBSCRIPT_EXPRESSION', 'yy.ast.set({ expression: { type: "union", value: [ $1, $3 ] } })' ],
	[ 'SUBSCRIPT_EXPRESSION_LIST , SUBSCRIPT_EXPRESSION', 'yy.ast.node().expression.value.push( $3 )' ] ],

      SUBSCRIPT_EXPRESSION: [
	[ 'INTEGER',           '$$ = { expression: { type: "numeric_literal", value: parseInt($1) } }; yy.ast.set($$)' ],
	[ 'ARRAY_SLICE',       '$$ = { expression: { type: "slice", value: $1 } }; yy.ast.set($$)' ],
	[ 'STAR',              '$$ = { expression: { type: "wildcard", value: $1 } }; yy.ast.set($$)' ],
	[ 'SCRIPT_EXPRESSION', '$$ = { expression: { type: "script_expression", value: $1 } }; yy.ast.set($$)' ],
	[ 'STRING_LITERAL',    '$$ = { expression: { type: "string_literal", value: $1 } }; yy.ast.set($$)' ],
	[ 'FILTER_EXPRESSION', '$$ = { expression: { type: "filter_expression", value: $1 } }; yy.ast.set($$)' ] ],

      STRING_LITERAL: [
	[ 'QQ_STRING', "$$ = $1" ],
	[ 'Q_STRING',  "$$ = $1" ],
      ]
    }
};

module.exports = grammar;
