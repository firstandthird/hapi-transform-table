const jsonToTable = require('json-to-table');
const os = require('os');
const qs = require('qs');

const register = (server, pluginOptions) => {
  const tableToHtml = (table, options) => {
    const tableAttributes = options && options.tableAttributes ? ` ${options.tableAttributes}` : '';
    const header = `<thead>${os.EOL}<tr><th>${table[0].join('</th><th>')}</th></tr>${os.EOL}</thead>${os.EOL}`;
    const rows = table.slice(1).reduce((tableString, n) => `${tableString}<tr><td>${n.join('</td><td>')}</td></tr>${os.EOL}`, '');
    const css = options.css.map(link => `<link rel="stylesheet" type="text/css" href=${link}>`).join(os.EOL);
    const scripts = options.scripts.map(link => `<script type="text/javascript" src="${link}"></script>`).join(os.EOL);
    return `${css}${css ? os.EOL : ''}${scripts}${scripts ? os.EOL : ''}<table${tableAttributes}>${os.EOL}${header}${os.EOL}<tbody>${rows}</tbody>${os.EOL}</table>`;
  };

  server.ext('onRequest', (request, h) => {
    if (request.path.endsWith('.html')) {
      const query = request.query;
      request.headers.accept = 'text/html';
      let newUrl = request.path.replace('.html', '');
      // save the original path info:
      request.app.transformTable = {
        originalPath: newUrl
      };
      if (Object.keys(query).length) {
        newUrl = `${newUrl}?${qs.stringify(query)}`;
      }
      request.setUrl(newUrl);
      request.query = query;
    }
    return h.continue;
  });
  server.ext('onPreResponse', (request, h) => {
    const response = request.response;
    if (response.isBoom || response.statusCode !== 200) {
      // if this was originally a .html request and it got redirected,
      // add back the .html before returning it
      if (request.app.transformTable && [301, 302].includes(response.statusCode)) {
        const originalPath = request.app.transformTable.originalPath;
        response.headers.location = response.headers.location.replace(originalPath, `${originalPath}.html`);
      }
      return h.continue;
    }
    if (request.headers.accept === 'text/html') {
      const routeOptions = request.route.settings.plugins['hapi-transform-table'] || {};
      const options = Object.assign({}, pluginOptions, routeOptions);
      const source = typeof options.mapData === 'function' ? response.source.map(options.mapData) : response.source;
      options.css = options.css || [];
      options.scripts = options.scripts || [];
      if (options.datatable) {
        options.css.push('https://cdn.datatables.net/1.10.16/css/jquery.dataTables.min.css');
        options.scripts.push('https://code.jquery.com/jquery-3.3.1.min.js');
        options.scripts.push('https://cdn.datatables.net/1.10.16/js/jquery.dataTables.min.js');
        options.tableAttributes = 'id="table"';
      }
      let tableString = tableToHtml(jsonToTable(source, options), options);
      if (options.datatable) {
        tableString = `${tableString}${os.EOL}<script>$(document).ready( function () {
      $('#table').DataTable({
        "pageLength": 100,
        "order": []
      });
    });</script>`;
      }
      return h.response(tableString);
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
