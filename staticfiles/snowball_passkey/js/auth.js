var lookup = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

(function (exports) {
  "use strict";

  var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;

  var PLUS = "+".charCodeAt(0);
  var SLASH = "/".charCodeAt(0);
  var NUMBER = "0".charCodeAt(0);
  var LOWER = "a".charCodeAt(0);
  var UPPER = "A".charCodeAt(0);
  var PLUS_URL_SAFE = "-".charCodeAt(0);
  var SLASH_URL_SAFE = "_".charCodeAt(0);

  function decode(elt) {
    var code = elt.charCodeAt(0);
    if (code === PLUS || code === PLUS_URL_SAFE) return 62; // '+'
    if (code === SLASH || code === SLASH_URL_SAFE) return 63; // '/'
    if (code < NUMBER) return -1; // no match
    if (code < NUMBER + 10) return code - NUMBER + 26 + 26;
    if (code < UPPER + 26) return code - UPPER;
    if (code < LOWER + 26) return code - LOWER + 26;
  }

  function b64ToByteArray(b64) {
    var i, j, l, tmp, placeHolders, arr;

    if (b64.length % 4 > 0) {
      throw new Error("Invalid string. Length must be a multiple of 4");
    }

    // the number of equal signs (place holders)
    // if there are two placeholders, than the two characters before it
    // represent one byte
    // if there is only one, then the three characters before it represent 2 bytes
    // this is just a cheap hack to not do indexOf twice
    var len = b64.length;
    placeHolders =
      b64.charAt(len - 2) === "=" ? 2 : b64.charAt(len - 1) === "=" ? 1 : 0;

    // base64 is 4/3 + up to two characters of the original data
    arr = new Arr((b64.length * 3) / 4 - placeHolders);

    // if there are placeholders, only get up to the last complete 4 chars
    l = placeHolders > 0 ? b64.length - 4 : b64.length;

    var L = 0;

    function push(v) {
      arr[L++] = v;
    }

    for (i = 0, j = 0; i < l; i += 4, j += 3) {
      tmp =
        (decode(b64.charAt(i)) << 18) |
        (decode(b64.charAt(i + 1)) << 12) |
        (decode(b64.charAt(i + 2)) << 6) |
        decode(b64.charAt(i + 3));
      push((tmp & 0xff0000) >> 16);
      push((tmp & 0xff00) >> 8);
      push(tmp & 0xff);
    }

    if (placeHolders === 2) {
      tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4);
      push(tmp & 0xff);
    } else if (placeHolders === 1) {
      tmp =
        (decode(b64.charAt(i)) << 10) |
        (decode(b64.charAt(i + 1)) << 4) |
        (decode(b64.charAt(i + 2)) >> 2);
      push((tmp >> 8) & 0xff);
      push(tmp & 0xff);
    }

    return arr;
  }

  function uint8ToBase64(uint8) {
    var i;
    var extraBytes = uint8.length % 3; // if we have 1 byte left, pad 2 bytes
    var output = "";
    var temp, length;

    function encode(num) {
      return lookup.charAt(num);
    }

    function tripletToBase64(num) {
      return (
        encode((num >> 18) & 0x3f) +
        encode((num >> 12) & 0x3f) +
        encode((num >> 6) & 0x3f) +
        encode(num & 0x3f)
      );
    }

    // go through the array every three bytes, we'll deal with trailing stuff later
    for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
      temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + uint8[i + 2];
      output += tripletToBase64(temp);
    }

    // pad the end with zeros, but make sure to not forget the extra bytes
    switch (extraBytes) {
      case 1:
        temp = uint8[uint8.length - 1];
        output += encode(temp >> 2);
        output += encode((temp << 4) & 0x3f);
        output += "==";
        break;
      case 2:
        temp = (uint8[uint8.length - 2] << 8) + uint8[uint8.length - 1];
        output += encode(temp >> 10);
        output += encode((temp >> 4) & 0x3f);
        output += encode((temp << 2) & 0x3f);
        output += "=";
        break;
      default:
        break;
    }

    return output;
  }

  exports.toByteArray = b64ToByteArray;
  exports.fromByteArray = uint8ToBase64;
})(typeof exports === "undefined" ? (this.base64js = {}) : exports);

function b64enc(buf) {
  return base64js
    .fromByteArray(buf)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function b64RawEnc(buf) {
  return base64js.fromByteArray(buf).replace(/\+/g, "-").replace(/\//g, "_");
}

function hexEncode(buf) {
  return Array.from(buf)
    .map(function (x) {
      return ("0" + x.toString(16)).substr(-2);
    })
    .join("");
}

function urlsafe_b64decode(s) {
  return atob(s.replace(/\-/g, "+").replace(/_/g, "/"));
}

async function fetch_json(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (body.fail) throw body.fail;
  return body;
}

/**
 * Get PublicKeyCredentialRequestOptions for this user from the server
 * formData of the registration form
 * @param {FormData} formData
 */
const getCredentialRequestOptionsFromServer = async () => {
  return await fetch_json("{% url 'snowball_passkey:login-begin' %}", {
    method: "POST",
  });
};

const transformCredentialRequestOptions = (
  credentialRequestOptionsFromServer
) => {
  let { challenge, allowCredentials } = credentialRequestOptionsFromServer;

  challenge = Uint8Array.from(urlsafe_b64decode(challenge), (c) =>
    c.charCodeAt(0)
  );

  allowCredentials = allowCredentials.map((credentialDescriptor) => {
    let { id } = credentialDescriptor;
    id = Uint8Array.from(urlsafe_b64decode(id), (c) => c.charCodeAt(0));
    return Object.assign({}, credentialDescriptor, { id });
  });

  const transformedCredentialRequestOptions = Object.assign(
    {},
    credentialRequestOptionsFromServer,
    { challenge, allowCredentials }
  );

  return transformedCredentialRequestOptions;
};

/**
 * Callback executed after submitting login form
 * @param {Event} e
 */
const didClickLogin = async (e) => {
  e.preventDefault();
  if (navigator.credentials == undefined) {
    alert(
      "Your browser doesn't support WebAuthn, please use a different browser."
    );
    return;
  }

  let credentialCreateOptionsFromServer;
  try {
    credentialRequestOptionsFromServer =
      await getCredentialRequestOptionsFromServer();
  } catch (err) {
    return console.error(
      "Error when getting request options from server:",
      err
    );
  }

  const transformedCredentialRequestOptions = transformCredentialRequestOptions(
    credentialRequestOptionsFromServer
  );

  let assertion;
  try {
    assertion = await navigator.credentials.get({
      publicKey: transformedCredentialRequestOptions,
    });
  } catch (err) {
    alert("Error when creating credential: " + err);
    return console.error("Error when creating credential: ", err);
  }

  const transformedAssertionForServer = transformAssertionForServer(assertion);

  postAssertionToServer(transformedAssertionForServer);
};

/**
 * Encodes the binary data in the assertion into strings for posting to the server.
 * @param {PublicKeyCredential} newAssertion
 */
const transformAssertionForServer = (newAssertion) => {
  const SnowballAuth = new Uint8Array(newAssertion.response.authenticatorData);
  const clientDataJSON = new Uint8Array(newAssertion.response.clientDataJSON);
  const rawId = new Uint8Array(newAssertion.rawId);
  const sig = new Uint8Array(newAssertion.response.signature);
  const assertionClientExtensions = newAssertion.getClientExtensionResults();

  return {
    id: newAssertion.id,
    rawId: b64enc(rawId),
    type: newAssertion.type,
    SnowballAuth: b64RawEnc(SnowballAuth),
    clientData: b64RawEnc(clientDataJSON),
    signature: hexEncode(sig),
    assertionClientExtensions: JSON.stringify(assertionClientExtensions),
  };
};

/**
 * Post the assertion to the server for validation and logging the user in.
 * @param {Object} assertionDataForServer
 */
const postAssertionToServer = async (assertionDataForServer) => {
  var form = document.createElement("form");
  form.method = "POST";
  form.action = "{% url 'snowball_passkey:login-verify' %}";
  form.style = "display:none;";

  Object.entries(assertionDataForServer).forEach(([key, value]) => {
    var element = document.createElement("input");
    element.value = value;
    element.name = key;
    element.type = "hidden";
    form.appendChild(element);
  });

  document.body.appendChild(form);

  form.submit();
};

document.addEventListener("DOMContentLoaded", (e) => {
  document
    .querySelector("#webauthin-login")
    .addEventListener("click", didClickLogin);
});
