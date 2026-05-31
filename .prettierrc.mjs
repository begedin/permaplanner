/** Keep aligned with vue/html-indent and vue/html-closing-bracket-newline in eslint.config.mjs */
export default {
  printWidth: 90,
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  // vue/html-closing-bracket-newline multiline: always — `>` on its own line for wrapped tags
  bracketSameLine: false,
  // One attribute per line when the tag wraps (vue max-attributes / indent)
  singleAttributePerLine: true,
  vueIndentScriptAndStyle: true,
};
