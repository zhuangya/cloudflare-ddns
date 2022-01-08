addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { searchParams } = new URL(request.url);

  const username = searchParams.get('username');
  const password = searchParams.get('password');

  if (!isValid(username, password)) {
    return end(401, 'Unauthoried');
  }

  const hostname = searchParams.get('hostname');
  const ip = searchParams.get('ip');

  if (!hostname || !ip) {
    return end(400, 'Bad Request');
  }

  try {
    const { status, msg } = await updateRecord(hostname, ip);
    return end(status, msg);
  } catch (e) {
    return end(500, 'something went wrong and i am one humble server');
  }
}

function end(status = 200, message, ...options) {
  return new Response(message, { status, ...options });
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
    return { status: 200, msg: 'skipped' };
  } else {
    const method = 'PATCH';
    const body = JSON.stringify({ content: ip, proxied: false });

    await ferry(`${base}/${ZONE}/dns_records/${record.id}`, {
      method,
      body,
    });

    return { status: 200, msg: 'updated' };
  }
}
