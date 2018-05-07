const Hapi = require('hapi');
const tap = require('tap');
const plugin = require('../index');
const path = require('path');
const fs = require('fs');

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
  t.equal(tableResponse.result, fs.readFileSync(path.join(__dirname, 'output1.html'), 'utf-8'), 'produces correct HTML output');
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
  t.equal(tableResponse.result, fs.readFileSync(path.join(__dirname, 'output2.html'), 'utf-8'), 'produces correct HTML output');
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
  t.equal(tableResponse.result, fs.readFileSync(path.join(__dirname, 'output3.html'), 'utf-8'), 'produces correct HTML output');
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
  t.equal(tableResponse.result, fs.readFileSync(path.join(__dirname, 'output4.html'), 'utf-8'), 'produces correct HTML output');
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
