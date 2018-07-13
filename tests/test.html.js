const Hapi = require('hapi');
const tap = require('tap');
const plugin = require('../index');
const path = require('path');
const fs = require('fs');

// this verifies that files match templates and updates the templates
// if  'updateTemplate' is true, making it easier to maintain these tests
const updateTemplate = false;
const verify = (t, result, filename) => {
  if (updateTemplate) {
    fs.writeFileSync(filename, result);
  }
  t.equal(fs.readFileSync(filename, 'utf-8'), result);
};

tap.test('can configure a route to return html table instead of json', async(t) => {
  const server = await new Hapi.Server({ port: 8080 });
  server.route({
    method: 'get',
    path: '/normal',
    handler(request, h) {
      return [
        {
          car: 'Audi',
          price: 40000,
          color: 'blue'
        }, {
          car: 'BMW',
          price: 35000,
          color: 'black'
        }, {
          car: 'Porsche',
          price: 60000,
          color: 'green'
        }
      ];
    }
  });

  server.route({
    method: 'get',
    path: '/path1',
    config: {
      plugins: {
        'hapi-transform-table': {
        }
      }
    },
    handler(request, h) {
      return [
        {
          car: 'Audi',
          price: 40000,
          color: 'blue'
        }, {
          car: 'BMW',
          price: 35000,
          color: 'black'
        }, {
          car: 'Porsche',
          price: 60000,
          color: 'green'
        }
      ];
    }
  });
  await server.register(plugin, {});
  await server.start();
  const tableResponse = await server.inject({
    method: 'get',
    url: '/path1.html'
  });
  t.equal(tableResponse.statusCode, 200, 'returns HTTP OK');
  t.equal(typeof tableResponse.result, 'string', 'returns a string value');
  verify(t, tableResponse.result, path.join(__dirname, 'output1.html'));
  const jsonResponse = await server.inject({
    method: 'get',
    url: '/normal'
  });
  t.equal(jsonResponse.statusCode, 200, 'returns HTTP OK');
  t.deepEqual(jsonResponse.result, [
    {
      car: 'Audi',
      price: 40000,
      color: 'blue'
    }, {
      car: 'BMW',
      price: 35000,
      color: 'black'
    }, {
      car: 'Porsche',
      price: 60000,
      color: 'green'
    }
  ], 'json returns the original json values');
  await server.stop();
  t.end();
});

tap.test('can render a single object as html table', async(t) => {
  const server = await new Hapi.Server({ port: 8080 });
  server.route({
    method: 'get',
    path: '/normal',
    handler(request, h) {
      return {
        car: 'Audi',
        price: 40000,
        color: 'blue'
      };
    }
  });
  await server.register(plugin, {});
  await server.start();
  const tableResponse = await server.inject({
    method: 'get',
    url: '/normal.html'
  });
  t.equal(tableResponse.statusCode, 200, 'returns HTTP OK');
  t.equal(typeof tableResponse.result, 'string', 'returns a string value');
  verify(t, tableResponse.result, path.join(__dirname, 'outputObject.html'));
  await server.stop();
  t.end();
});

tap.test('can render a nested  object as html table', async(t) => {
  const server = await new Hapi.Server({ port: 8080 });
  server.route({
    method: 'get',
    path: '/normal',
    handler(request, h) {
      return {
        subObj: {
          car: 'Audi',
          price: 40000,
          color: {
            r: 255,
            g: 12,
            b: undefined,
            a: null
          }
        }
      };
    }
  });
  await server.register(plugin, {});
  await server.start();
  const tableResponse = await server.inject({
    method: 'get',
    url: '/normal.html'
  });
  t.equal(tableResponse.statusCode, 200, 'returns HTTP OK');
  t.equal(typeof tableResponse.result, 'string', 'returns a string value');
  verify(t, tableResponse.result, path.join(__dirname, 'outputFormat.html'));
  await server.stop();
  t.end();
});

tap.test('will pass config options to json-to-table', async(t) => {
  const server = await new Hapi.Server({ port: 8080 });
  server.route({
    method: 'get',
    path: '/path1',
    config: {
      plugins: {
        'hapi-transform-table': {
          includeCollectionLength: true
        }
      }
    },
    handler(request, h) {
      return [
        {
          car: 'Audi',
          price: 40000,
          colors: ['blue', 'black']
        }, {
          car: 'BMW',
          price: 35000,
          colors: ['magenta', 'muave', 'cyan']
        }, {
          car: 'Porsche',
          price: 60000,
          colors: ['lime']
        }
      ];
    }
  });
  await server.register({ plugin, options: { excludeSubArrays: true } });
  await server.start();
  const tableResponse = await server.inject({
    method: 'get',
    url: '/path1.html'
  });
  t.equal(tableResponse.statusCode, 200, 'returns HTTP OK');
  verify(t, tableResponse.result, path.join(__dirname, 'output2.html'));
  await server.stop();
  t.end();
});

tap.test('will pass mapping functions', async(t) => {
  const server = await new Hapi.Server({ port: 8080 });
  server.route({
    method: 'get',
    path: '/path1',
    config: {
      plugins: {
        'hapi-transform-table': {
          includeCollectionLength: true,
          mapData: (tableEntry) => ({
            Transport: tableEntry.car,
            Price: `$${tableEntry.price.toFixed(2)}`
          })
        }
      }
    },
    handler(request, h) {
      return [
        {
          car: 'Audi',
          price: 40000,
          colors: ['blue', 'black']
        }, {
          car: 'BMW',
          price: 35000,
          colors: ['magenta', 'muave', 'cyan']
        }, {
          car: 'Porsche',
          price: 60000,
          colors: ['lime']
        }
      ];
    }
  });
  await server.register({ plugin, options: { excludeSubArrays: true } });
  await server.start();
  const tableResponse = await server.inject({
    method: 'get',
    url: '/path1.html'
  });
  t.equal(tableResponse.statusCode, 200, 'returns HTTP OK');
  verify(t, tableResponse.result, path.join(__dirname, 'output3.html'));
  await server.stop();
  t.end();
});

tap.test('be able to pass in tableAttributes', async(t) => {
  const server = await new Hapi.Server({ port: 8080 });
  server.route({
    method: 'get',
    path: '/path1',
    config: {
      plugins: {
        'hapi-transform-table': {
          includeCollectionLength: true,
          tableAttributes: 'class="blah"'
        }
      }
    },
    handler(request, h) {
      return [
        {
          car: 'Audi',
          price: 40000,
          colors: ['blue', 'black']
        }, {
          car: 'BMW',
          price: 35000,
          colors: ['magenta', 'muave', 'cyan']
        }, {
          car: 'Porsche',
          price: 60000,
          colors: ['lime']
        }
      ];
    }
  });
  await server.register({ plugin, options: { excludeSubArrays: true } });
  await server.start();
  const tableResponse = await server.inject({
    method: 'get',
    url: '/path1.html'
  });
  t.equal(tableResponse.statusCode, 200, 'returns HTTP OK');
  verify(t, tableResponse.result, path.join(__dirname, 'output4.html'));
  await server.stop();
  t.end();
});

tap.test('be able to pass in css and js links', async(t) => {
  const server = await new Hapi.Server({ port: 8080 });
  server.route({
    method: 'get',
    path: '/path1',
    config: {
      plugins: {
        'hapi-transform-table': {
          css: ['css.css', 'css2.css'],
          scripts: ['script.js', 'script2.js'],
        }
      }
    },
    handler(request, h) {
      return [
        {
          car: 'Audi',
          price: 40000,
          colors: ['blue', 'black']
        }, {
          car: 'BMW',
          price: 35000,
          colors: ['magenta', 'muave', 'cyan']
        }, {
          car: 'Porsche',
          price: 60000,
          colors: ['lime']
        }
      ];
    }
  });
  await server.register({ plugin, options: { excludeSubArrays: true } });
  await server.start();
  const tableResponse = await server.inject({
    method: 'get',
    url: '/path1.html'
  });
  t.equal(tableResponse.statusCode, 200, 'returns HTTP OK');
  verify(t, tableResponse.result, path.join(__dirname, 'output5.html'));
  await server.stop();
  t.end();
});

tap.test('will not interfere with non-200 results', async(t) => {
  const server = await new Hapi.Server({ port: 8080 });
  server.route({
    method: 'get',
    path: '/path1',
    config: {
      plugins: {
        'hapi-transform-table': {}
      }
    },
    handler(request, h) {
      return h.response('hello there').code(204);
    }
  });
  await server.register({ plugin, options: { excludeSubArrays: true } });
  await server.start();
  const tableResponse = await server.inject({
    method: 'get',
    url: '/path1.html'
  });
  t.equal(tableResponse.statusCode, 204, 'returns HTTP 204');
  await server.stop();
  t.end();
});

tap.test('will use DataTables if specified', async(t) => {
  const server = await new Hapi.Server({ port: 8080 });
  server.route({
    method: 'get',
    path: '/path1',
    config: {
      plugins: {
        'hapi-transform-table': {
          datatable: true
        }
      }
    },
    handler(request, h) {
      return [
        {
          car: 'Audi',
          price: 40000,
          colors: ['blue', 'black']
        }, {
          car: 'BMW',
          price: 35000,
          colors: ['magenta', 'muave', 'cyan']
        }, {
          car: 'Porsche',
          price: 60000,
          colors: ['lime']
        }
      ];
    }
  });
  await server.register({ plugin, options: { excludeSubArrays: true } });
  await server.start();
  const tableResponse = await server.inject({
    method: 'get',
    url: '/path1.html'
  });
  t.equal(tableResponse.statusCode, 200, 'returns HTTP OK');
  verify(t, tableResponse.result, path.join(__dirname, 'output6.html'));
  await server.stop();
  t.end();
});

tap.test('will forward query params to the underlying route', async(t) => {
  const server = await new Hapi.Server({ port: 8080 });
  server.route({
    method: 'get',
    path: '/path1',
    config: {
      plugins: {
        'hapi-transform-table': {
        }
      }
    },
    handler(request, h) {
      t.equal(request.url.path, '/path1?test=1');
      t.equal(request.query.test, '1', 'query param forwarded');
      return [];
    }
  });
  await server.register(plugin, {});
  await server.start();
  const tableResponse = await server.inject({
    method: 'get',
    url: '/path1.html?test=1'
  });
  t.equal(tableResponse.statusCode, 200, 'returns HTTP OK');
  await server.stop();
  t.end();
});

tap.test('auth schemes that do redirects will preserve the original .html route', async(t) => {
  const server = await new Hapi.Server({ port: 8080 });
  await server.register(plugin, {});
  await server.register({
    plugin: require('hapi-password'),
    options: {
      salt: 'aSalt',
      password: 'password',
      cookieName: 'demo-login'
    }
  });
  server.route({
    method: 'GET',
    path: '/success',
    config: {
      plugins: {
        'hapi-transform-table': {}
      },
      handler: (request, h) => 'success!'
    }
  });
  await server.start();
  const redirectResponse = await server.inject({ url: '/success.html' });
  t.equal(redirectResponse.statusCode, 302);
  t.equal(redirectResponse.headers.location, '/login?next=/success.html');
  await server.stop();
  t.end();
});
