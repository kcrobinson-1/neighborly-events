const http = require("node:http");
const net = require("node:net");
const { spawn } = require("node:child_process");

const host = "127.0.0.1";
const proxyPort = 4173;
const webPort = 4174;
const sitePort = 3000;
const siteOrigin = `http://${host}:${sitePort}`;
const webOrigin = `http://${host}:${webPort}`;
const readyPath = "/__auth-e2e-ready";

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

function isEventCarveOut(url) {
  if (!url.startsWith("/event/")) return false;
  const afterEvent = url.slice("/event/".length);
  const slashIdx = afterEvent.indexOf("/");
  if (slashIdx === -1) return false;
  const restAfterSlug = afterEvent.slice(slashIdx);
  return (
    restAfterSlug === "/game" ||
    restAfterSlug.startsWith("/game/") ||
    restAfterSlug.startsWith("/game?") ||
    restAfterSlug === "/admin" ||
    restAfterSlug.startsWith("/admin/") ||
    restAfterSlug.startsWith("/admin?")
  );
}

function isSiteRequest(url) {
  return (
    url === "/" ||
    url.startsWith("/?") ||
    url === "/auth/callback" ||
    url.startsWith("/auth/callback?") ||
    url.startsWith("/_next/") ||
    url.startsWith("/__nextjs") ||
    url === "/admin" ||
    url.startsWith("/admin?") ||
    url.startsWith("/admin/") ||
    (url.startsWith("/event/") && !isEventCarveOut(url))
  );
}

function isReadyRequest(url) {
  return url === readyPath;
}

function requestUpstream(path, port) {
  return new Promise((resolve) => {
    const request = http.request(
      {
        host,
        method: "GET",
        path,
        port,
      },
      (response) => {
        response.resume();
        response.on("end", () => {
          resolve({
            ok: (response.statusCode ?? 500) < 500,
            statusCode: response.statusCode ?? 0,
          });
        });
      },
    );

    request.on("error", (error) => {
      resolve({
        error: error.message,
        ok: false,
        statusCode: 0,
      });
    });

    request.end();
  });
}

async function handleReadyRequest(response) {
  const [site, web] = await Promise.all([
    requestUpstream("/admin", sitePort),
    requestUpstream("/event/community-checklist/game", webPort),
  ]);

  const isReady = site.ok && web.ok;
  response.writeHead(isReady ? 200 : 503, {
    "content-type": "application/json",
  });
  response.end(
    JSON.stringify({
      ready: isReady,
      site,
      web,
    }),
  );
}

function proxyRequest(request, response) {
  if (isReadyRequest(request.url ?? "/")) {
    void handleReadyRequest(response);
    return;
  }

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
  let upstream;
  const closeSockets = () => {
    socket.destroy();
    upstream?.destroy();
  };
  upstream = net.connect(targetPort, host, () => {
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

  socket.on("error", closeSockets);
  upstream.on("error", closeSockets);
  socket.on("close", () => upstream.destroy());
  upstream.on("close", () => socket.destroy());
}

const siteEnv = {
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    "",
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
};

function main() {
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
}

if (require.main === module) {
  main();
}

module.exports = {
  isReadyRequest,
  isSiteRequest,
  readyPath,
};
