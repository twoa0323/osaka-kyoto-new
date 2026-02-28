export default {
    contextSeparator: '_',
    columnSeparator: '.',
    commonDefaultValue: '',
    defaultValue: (lng, ns, key) => {
        if (lng === 'zh-TW') {
            return key; // For zh-TW, use the key as default value (traditional Chinese)
        }
        return ''; // For other languages, leave empty
    },
    indentation: 2,
    keepRemoved: false,
    keySeparator: '.',
    lexers: {
        ts: ['JavascriptLexer'],
        tsx: ['JsxLexer'],
        js: ['JavascriptLexer'],
        jsx: ['JsxLexer'],
        default: ['JavascriptLexer'],
    },
    lineEnding: 'auto',
    locales: ['zh-TW', 'en', 'ja'],
    output: 'public/locales/$LOCALE/$NAMESPACE.json',
    input: ['src/**/*.{ts,tsx}'],
    reactNamespace: false,
    restructure: false,
    sort: true,
    useKeysAsDefaultValue: false,
    verbose: false,
    failOnWarnings: false,
    customValueTemplate: null,
    resetDefaultValueHelp: false,
    i18nextOptions: null,
    yamlOptions: null,
};
