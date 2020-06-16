module.exports = {
	entry: './main-html.js',
	// devtool: 'eval-source-map',
	target: 'electron-renderer',
	output: {
		filename: 'main-html-bundle.js',
		path: __dirname,
	},
	resolve: {
		alias: {
			lib: `${__dirname}/lib`,
		},
	},
	externals: {
		'keytar': 'commonjs2 keytar',
		'fsevents': 'commonjs2 fsevents',
		'sharp': 'commonjs2 sharp',
		'image-data-uri': 'commonjs2 image-data-uri',
		'sqlite3': 'commonjs2 sqlite3',
		'markdown-it-anchor': 'commonjs2 markdown-it-anchor',
		'markdown-it-mark': 'commonjs2 markdown-it-mark',
		'markdown-it-footnote': 'commonjs2 markdown-it-footnote',
		'markdown-it-sub': 'commonjs2 markdown-it-sub',
		'markdown-it-sup': 'commonjs2 markdown-it-sup',
		'markdown-it-deflist': 'commonjs2 markdown-it-deflist',
		'markdown-it-abbr': 'commonjs2 markdown-it-abbr',
		'markdown-it-emoji': 'commonjs2 markdown-it-emoji',
		'markdown-it-ins': 'commonjs2 markdown-it-ins',
		'markdown-it-multimd-table': 'commonjs2 markdown-it-multimd-table',
		'markdown-it-toc-done-right': 'commonjs2 markdown-it-toc-done-right',
		'markdown-it-expand-tabs': 'commonjs2 markdown-it-expand-tabs',
	},

};
