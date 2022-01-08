addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { searchParams } = new URL(request.url);

  const username = searchParams.get('username');
  const password = searchParams.get('password');

  if (!isValid(username, password)) {
    return end('Unauthoried');
  }

  const hostname = searchParams.get('hostname');
  const ip = searchParams.get('ip');

  if (!hostname || !ip) {
    return end('Bad Request');
  }

  try {
    const msg = await updateRecord(hostname, ip);
    return end(msg);
  } catch (e) {
    return end('something went wrong');
  }
}

function end(message, ...options) {
  return new Response(message, { status: 200, ...options });
}

function isValid(username, password) {
  return username === USERNAME && password === PASSWORD;
}

async function ferry(url, props = {}) {
  const { headers = {}, ...options } = props;

  const response = await fetch(url, {
    headers: {
      authorization: `bearer ${CF_API_TOKEN}`,
      ...headers,
    },
    ...options,
  });

  return await response.json();
}

async function updateRecord(hostname, ip) {
  const base = 'https://api.cloudflare.com/client/v4/zones';
  const response = await ferry(`${base}/${ZONE}/dns_records?name=${hostname}`);

  const record = response.result[0];

  if (record.content === ip) {
    return 'skipped';
  } else {
    const method = 'PATCH';
    const body = JSON.stringify({ content: ip, proxied: false });

    await ferry(`${base}/${ZONE}/dns_records/${record.id}`, {
      method,
      body,
    });

    return 'updated';
  }
}
