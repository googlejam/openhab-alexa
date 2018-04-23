var assert = require('chai').assert;

// set log level to error in test environment
if (process.env.NODE_ENV === 'test') {
  process.env.LOG_LEVEL = 'ERROR';
}

/**
 * Generate directive request based of default template
 * @param  {*} request
 * @return {*}
 */
function generateDirectiveRequest(request) {
  var template = {
    "header": {
      "namespace": null,
      "name": null,
      "messageId": "message-id",
      "correlationToken": "correlation-token",
      "payloadVersion": "3"
    },
    "endpoint": {
      "endpointId": null,
      "cookie": {},
      "scope": {
        "type": "BearerToken",
        "token": "access-token-from-skill"
      }
    },
    "payload": {}
  };
  var directive = {
    "header": Object.assign(template.header, request.header),
    "endpoint": Object.assign(template.endpoint, request.endpoint),
    "payload": Object.assign(template.payload, request.payload)
  };
  // update directive if payloadVersion set to 2
  if (directive.header.payloadVersion === "2") {
    directive.payload.accessToken = directive.endpoint.scope.token;
    delete directive.header.correlationToken;
    delete directive.endpoint.scope;
  }
  // remove endpoint if no id defined
  if (directive.endpoint.endpointId === null) {
    // move endpoint scope to payload if defined
    if (directive.endpoint.scope) {
      directive.payload.scope = directive.endpoint.scope;
    }
    delete directive.endpoint;
  }
  return directive;
}

/**
 * Get list of capabilities namespaces
 * @param {*} capabilities
 */
function getCapabilitiesNamespaces(capabilities) {
  return capabilities.reduce(function(result, capability) {
    if (capability.properties && capability.properties.supported) {
      capability.properties.supported.forEach(function(property) {
        result.push(capability.interface + '.' + property.name);
      });
    } else {
      result.push(capability.interface);
    }
    return result;
  }, []);
};

/**
 * Get list of capabilities parameters
 * @param {*} capabilities
 */
function getCapabilitiesParameters(capabilities) {
  return capabilities.reduce(function(result, capability) {
    Object.keys(capability).forEach(function(parameter) {
      if (parameter !== 'properties') {
        result[capability.interface + '.' + parameter] = capability[parameter];
      }
    });
    return result;
  }, {});
};

/**
 * Assert captured calls
 * @param {*} calls
 * @param {*} expected
 */
assert.capturedCalls = function(calls, expected) {
  if (expected) {
    assert.deepEqual(calls, expected);
  }
};

/**
 * Assert captured result
 * @param {*} result
 * @param {*} expected
 */
assert.capturedResult = function(result, expected) {
  if (expected) {
    Object.keys(expected).forEach(function(key) {
      if (typeof expected[key] === 'object') {
        assert.exists(result[key]);
        assert.capturedResult(result[key], expected[key]);
      } else {
        assert.equal(result[key], expected[key]);
      }
    });
  }
};

/**
 * Assert discovered appliances (v2)
 * @param {*} appliances
 * @param {*} results
 */
assert.discoveredAppliances = function(appliances, results) {
  assert.equal(appliances.length, Object.keys(results).length);

  appliances.forEach(function(appliance) {
    var expected = results[appliance.applianceId];
    assert.isDefined(expected);

    Object.keys(expected).forEach(function(key) {
      switch (key) {
        case 'actions':
        case 'applianceTypes':
          assert.sameMembers(appliance[key], expected[key]);
          break;
        case 'additionalApplianceDetails':
          assert.include(appliance[key], expected[key]);
          break;
        default:
          assert.equal(appliance[key], expected[key]);
      }
    });
  });
};

/**
 * Assert discovered endpoints (v3)
 * @param {*} endpoints
 * @param {*} results
 */
assert.discoveredEndpoints = function(endpoints, results) {
  assert.equal(endpoints.length, Object.keys(results).length);

  endpoints.forEach(function(endpoint) {
    var expected = results[endpoint.endpointId];
    assert.isDefined(expected);

    Object.keys(expected).forEach(function(key) {
      switch (key) {
        case 'capabilities':
          assert.sameMembers(getCapabilitiesNamespaces(endpoint.capabilities), expected.capabilities);
          break;
        case 'displayCategories':
          assert.sameMembers(endpoint.displayCategories, expected.displayCategories);
          break;
        case 'parameters':
          assert.deepInclude(getCapabilitiesParameters(endpoint.capabilities), expected.parameters);
          break;
        case 'propertyMap':
          assert.deepInclude(JSON.parse(endpoint.cookie.propertyMap), expected.propertyMap);
          break;
        default:
          assert.equal(endpoint[key], expected[key]);
      }
    });
  });
};

module.exports.assert = assert;
module.exports.utils = {
  generateDirectiveRequest: generateDirectiveRequest
};
