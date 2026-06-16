export default function onRequest(context) {
  const { env } = context;
  return new Response(JSON.stringify({
    hasAdminUser: !!env.ADMIN_USER,
    hasPassHash: !!env.ADMIN_PASS_HASH,
    hasSessionSecret: !!env.SESSION_SECRET,
    hasGithubToken: !!env.GITHUB_TOKEN,
    keys: Object.keys(env || {})
  }), { headers: { 'Content-Type': 'application/json' } });
}
