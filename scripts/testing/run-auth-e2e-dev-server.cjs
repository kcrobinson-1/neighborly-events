const http = require("node:http");
const net = require("node:net");
const { spawn } = require("node:child_process");

const host = "127.0.0.1";
const proxyPort = 4173;
const webPort = 4174;
const sitePort = 3000;
const siteOrigin = `http://${host}:${sitePort}`;
const webOrigin = `http://${host}:${webPort}`;

const children = new Set();
let server = null;

function startProcess(command, args, env) {
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: "inherit",
  });

  children.add(child);

  child.on("exit", (code, signal) => {
    children.delete(child);
    if (code !== null && code !== 0) {
      console.error(`[auth-e2e-dev] child exited: ${command} ${args.join(" ")} (${code})`);
      shutdown(1);
    }
    if (signal && signal !== "SIGTERM" && signal !== "SIGINT") {
      console.error(`[auth-e2e-dev] child signaled: ${command} ${args.join(" ")} (${signal})`);
      shutdown(1);
    }
  });

  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    child.kill("SIGTERM");
  }
  server?.close(() => process.exit(code));
  setTimeout(() => process.exit(code), 2_000).unref();
}

function isSiteRequest(url) {
  return (
    url === "/auth/callback" ||
    url.startsWith("/auth/callback?") ||
    url.startsWith("/_next/") ||
    url.startsWith("/__nextjs")
  );
}

function proxyRequest(request, response) {
  const targetOrigin = isSiteRequest(request.url ?? "/")
    ? siteOrigin
    : webOrigin;
  const targetUrl = new URL(request.url ?? "/", targetOrigin);

  const headers = { ...request.headers };
  const proxy = http.request(
    targetUrl,
    {
      headers,
      method: request.method,
    },
    (proxyResponse) => {
      response.writeHead(
        proxyResponse.statusCode ?? 502,
        proxyResponse.statusMessage,
        proxyResponse.headers,
      );
      proxyResponse.pipe(response);
    },
  );

  proxy.on("error", (error) => {
    response.writeHead(502, { "content-type": "text/plain" });
    response.end(`Auth e2e proxy target unavailable: ${error.message}`);
  });

  request.pipe(proxy);
}

function proxyUpgrade(request, socket, head) {
  const targetPort = isSiteRequest(request.url ?? "/") ? sitePort : webPort;
  const upstream = net.connect(targetPort, host, () => {
    upstream.write(
      [
        `${request.method} ${request.url} HTTP/${request.httpVersion}`,
        ...Object.entries(request.headers).map(([name, value]) =>
          `${name}: ${Array.isArray(value) ? value.join(", ") : value}`,
        ),
        "",
        "",
      ].join("\r\n"),
    );
    upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });

  upstream.on("error", () => {
    socket.destroy();
  });
}

const siteEnv = {
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    "",
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
};

startProcess(
  "npm",
  [
    "--workspace",
    "@neighborly/web",
    "run",
    "dev",
    "--",
    "--host",
    host,
    "--port",
    String(webPort),
    "--strictPort",
  ],
  {},
);

startProcess(
  "npm",
  [
    "--workspace",
    "@neighborly/site",
    "run",
    "dev",
    "--",
    "-H",
    host,
    "-p",
    String(sitePort),
  ],
  siteEnv,
);

server = http.createServer(proxyRequest);
server.on("upgrade", proxyUpgrade);

server.listen(proxyPort, host, () => {
  console.log(
    `[auth-e2e-dev] proxy listening on http://${host}:${proxyPort} (web ${webOrigin}, site ${siteOrigin})`,
  );
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
