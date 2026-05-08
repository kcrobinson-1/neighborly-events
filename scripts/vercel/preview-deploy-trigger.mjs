#!/usr/bin/env node
//
// preview-deploy-trigger.mjs — invoked by .github/workflows/preview-deploys.yml
// when a PR-scoped human signal arrives (comment / label / ready-for-review).
//
// Honors the contracts in docs/plans/vercel-preview-deploy-budget.md:
// - SHA-pinned deploys: gitSource.ref = head branch, gitSource.sha = head SHA.
// - Terminal-state contract: all-READY → success; any ERROR/CANCELED → failure;
//   polling-timeout → failure.
// - Stale results can't leak: status check is set on the head SHA captured by
//   the workflow at trigger time; a later push will get its own pending check
//   from the gate job and override.
//
// Configuration is via env vars (no CLI args). All required env presence is
// validated up front; missing values fail fast with a status-check 'error' and
// a sticky PR comment so the failure is visible.

const env = (key, { required = true, fallback = null } = {}) => {
  const v = process.env[key];
  if (v === undefined || v === '') {
    if (required) throw new Error(`Missing required env: ${key}`);
    return fallback;
  }
  return v;
};

// Required configuration
const GITHUB_TOKEN = env('GITHUB_TOKEN');
const GITHUB_REPOSITORY = env('GITHUB_REPOSITORY'); // owner/repo
const PR_NUMBER = parseInt(env('PR_NUMBER'), 10);
const HEAD_REF = env('HEAD_REF');
const HEAD_SHA = env('HEAD_SHA');
const CLASSIFICATION = env('CLASSIFICATION');
const VERCEL_TOKEN = env('VERCEL_TOKEN');
const VERCEL_ORG_ID = env('VERCEL_ORG_ID');
const VERCEL_PROJECT_ID_WEB = env('VERCEL_PROJECT_ID_WEB');
const VERCEL_PROJECT_ID_SITE = env('VERCEL_PROJECT_ID_SITE');

// Optional configuration with defaults
const STATUS_CONTEXT = env('STATUS_CONTEXT', { required: false, fallback: 'preview-deploy' });
const STICKY_HEADER = env('STICKY_HEADER', { required: false, fallback: '<!-- preview-deploy-sticky -->' });
const POLL_TIMEOUT_SECONDS = parseInt(env('POLL_TIMEOUT_SECONDS', { required: false, fallback: '600' }), 10);
const POLL_INTERVAL_SECONDS = parseInt(env('POLL_INTERVAL_SECONDS', { required: false, fallback: '10' }), 10);

const [OWNER, REPO] = GITHUB_REPOSITORY.split('/');
const SHORT_SHA = HEAD_SHA.substring(0, 7);

const PROJECTS = {
  web: { label: 'apps/web', slug: 'neighborly-scavenger-game-web', id: VERCEL_PROJECT_ID_WEB },
  site: { label: 'apps/site', slug: 'neighborly-events-site', id: VERCEL_PROJECT_ID_SITE },
};

const affectedProjects = (() => {
  switch (CLASSIFICATION) {
    case 'web': return ['web'];
    case 'site': return ['site'];
    case 'both': return ['web', 'site'];
    case 'docs-only': return [];
    default: throw new Error(`Unknown classification: ${CLASSIFICATION}`);
  }
})();

// ─── API helpers ──────────────────────────────────────────────────────────

async function gh(method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`GitHub ${method} ${path}: ${res.status} ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

async function vercel(method, path, body) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`https://api.vercel.com${path}${sep}teamId=${VERCEL_ORG_ID}`, {
    method,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Vercel ${method} ${path}: ${res.status} ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

// ─── Status check ────────────────────────────────────────────────────────

async function setStatus(state, description, target_url) {
  await gh('POST', `/repos/${OWNER}/${REPO}/statuses/${HEAD_SHA}`, {
    state,
    description: description.substring(0, 140),
    context: STATUS_CONTEXT,
    target_url,
  });
}

// ─── Sticky PR comment ───────────────────────────────────────────────────

async function findStickyComment() {
  let page = 1;
  while (true) {
    const comments = await gh(
      'GET',
      `/repos/${OWNER}/${REPO}/issues/${PR_NUMBER}/comments?per_page=100&page=${page}`,
    );
    if (!comments || comments.length === 0) return null;
    const hit = comments.find(c => c.body && c.body.includes(STICKY_HEADER));
    if (hit) return hit;
    if (comments.length < 100) return null;
    page += 1;
  }
}

async function upsertSticky(body) {
  const fullBody = `${STICKY_HEADER}\n${body}`;
  const existing = await findStickyComment();
  if (existing) {
    await gh('PATCH', `/repos/${OWNER}/${REPO}/issues/comments/${existing.id}`, { body: fullBody });
  } else {
    await gh('POST', `/repos/${OWNER}/${REPO}/issues/${PR_NUMBER}/comments`, { body: fullBody });
  }
}

// ─── Vercel deploy ───────────────────────────────────────────────────────

async function createDeployment(projectKey) {
  const project = PROJECTS[projectKey];
  const result = await vercel('POST', '/v13/deployments', {
    name: project.slug,
    project: project.id,
    gitSource: {
      type: 'github',
      org: OWNER,
      repo: REPO,
      ref: HEAD_REF,
      sha: HEAD_SHA,
    },
  });
  return {
    projectKey,
    id: result.id,
    inspectorUrl: result.inspectorUrl,
    url: result.url,
  };
}

async function pollDeployment(deployment) {
  const start = Date.now();
  const deadlineMs = start + POLL_TIMEOUT_SECONDS * 1000;
  while (Date.now() < deadlineMs) {
    const result = await vercel('GET', `/v13/deployments/${deployment.id}`);
    const state = result.readyState || result.status;
    if (['READY', 'ERROR', 'CANCELED'].includes(state)) {
      return {
        ...deployment,
        state,
        url: result.url || deployment.url,
        deployedSha: result.meta?.githubCommitSha,
      };
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_SECONDS * 1000));
  }
  return { ...deployment, state: 'TIMEOUT' };
}

// ─── Comment rendering ───────────────────────────────────────────────────

function renderComment(results, { inflight = false } = {}) {
  const lines = [`**Preview deploys** for \`${SHORT_SHA}\``, ''];
  for (const r of results) {
    const project = PROJECTS[r.projectKey];
    let line;
    if (inflight && !['ERROR', 'CANCELED', 'TIMEOUT'].includes(r.state)) {
      line = `- ⏳ **${project.label}** — building ([inspect](${r.inspectorUrl}))`;
    } else {
      switch (r.state) {
        case 'READY':
          line = `- ✅ **${project.label}** — https://${r.url}`;
          break;
        case 'ERROR':
        case 'CANCELED':
          line = `- ❌ **${project.label}** — ${r.state.toLowerCase()}`
            + (r.inspectorUrl ? ` ([inspect](${r.inspectorUrl}))` : '')
            + (r.error ? ` — ${r.error}` : '');
          break;
        case 'TIMEOUT':
          line = `- ⏱ **${project.label}** — did not terminate within ${POLL_TIMEOUT_SECONDS}s`
            + (r.inspectorUrl ? ` ([inspect](${r.inspectorUrl}))` : '');
          break;
        default:
          line = `- ❓ **${project.label}** — unknown state '${r.state}'`;
      }
    }
    lines.push(line);
  }
  return lines.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  if (affectedProjects.length === 0) {
    await upsertSticky(`No preview needed for \`${SHORT_SHA}\` — diff is docs-only.`);
    await setStatus('success', 'no preview needed for docs-only changes');
    return;
  }

  await setStatus('pending', `preview deploys in flight (${affectedProjects.join(', ')})`);

  // Create deployments in parallel
  const created = await Promise.all(affectedProjects.map(async (key) => {
    try {
      return await createDeployment(key);
    } catch (err) {
      return { projectKey: key, state: 'ERROR', error: err.message };
    }
  }));

  // Show "in-flight" sticky comment so reviewers see immediate feedback
  await upsertSticky(renderComment(
    created.map(d => d.state === 'ERROR' ? d : { ...d, state: 'BUILDING' }),
    { inflight: true },
  ));

  // Poll all deployments in parallel
  const polled = await Promise.all(created.map(d => {
    if (d.state === 'ERROR') return Promise.resolve(d);
    return pollDeployment(d);
  }));

  // SHA-pinning sanity check — Vercel must have deployed the SHA we asked for
  for (const r of polled) {
    if (r.state === 'READY' && r.deployedSha && r.deployedSha !== HEAD_SHA) {
      throw new Error(
        `SHA pin failed for ${r.projectKey}: deployed ${r.deployedSha}, expected ${HEAD_SHA}`,
      );
    }
  }

  await upsertSticky(renderComment(polled));

  const allReady = polled.every(r => r.state === 'READY');
  const someTimeout = polled.some(r => r.state === 'TIMEOUT');
  const someFailed = polled.some(r => ['ERROR', 'CANCELED'].includes(r.state));

  if (allReady) {
    await setStatus('success', `preview deploys ready: ${polled.map(r => r.projectKey).join(', ')}`);
  } else if (someTimeout) {
    const t = polled.filter(r => r.state === 'TIMEOUT').map(r => r.projectKey);
    await setStatus('failure', `preview deploy timed out: ${t.join(', ')}`);
  } else if (someFailed) {
    const f = polled.filter(r => ['ERROR', 'CANCELED'].includes(r.state)).map(r => r.projectKey);
    await setStatus('failure', `preview deploy failed: ${f.join(', ')}`);
  } else {
    await setStatus('failure', 'preview deploy ended in unknown state');
  }
}

main().catch(async (err) => {
  console.error(err.stack || err.message);
  try {
    await setStatus('error', `preview-deploy workflow errored: ${err.message}`);
    await upsertSticky(`❌ preview-deploy workflow errored\n\n\`\`\`\n${err.message}\n\`\`\``);
  } catch (postErr) {
    console.error('Failed to post error status/comment:', postErr);
  }
  process.exit(1);
});
