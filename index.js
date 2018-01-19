const jsonToTable = require('json-to-table');
const os = require('os');

const register = (server, pluginOptions) => {
  const tableToHtml = (table, options) => {
    const header = `<tr><th>${table[0].join('</th><th>')}</th></tr>${os.EOL}`;
    const rows = table.slice(1).reduce((tableString, n) => `${tableString}<tr><td>${n.join('</td><td>')}</td></tr>${os.EOL}`, '');
    return `<table>${os.EOL}${header}${rows}</table>`;
  };

  server.ext('onRequest', (request, h) => {
    if (request.path.endsWith('.html')) {
      request.headers.accept = 'text/html';
      request.setUrl(request.path.replace('.html', ''));
    }
    return h.continue;
  });
  server.ext('onPreResponse', (request, h) => {
    const response = request.response;
    if (response.isBoom) {
      return h.continue;
    }
    if (request.headers.accept === 'text/html') {
      const routeOptions = request.route.settings.plugins['hapi-transform-table'] || {};
      const options = Object.assign({}, pluginOptions, routeOptions);
      const source = typeof options.mapData === 'function' ? response.source.map(options.mapData) : response.source;
      return h.response(tableToHtml(jsonToTable(source, options)));
    }
    return h.continue;
  });
};

exports.plugin = {
  name: 'hapi-transform-table',
  register,
  once: true,
  pkg: require('./package.json')
};
