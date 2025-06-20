export async function onRequestPost(context) {
  const token = context.env.GITHUB_TOKEN;
  const repo  = context.env.GITHUB_REPO;
  const branch= "main";
  const filePath = "public/redirect.txt";

  // Fail fast if we don’t know the repo
  if (!repo) {
    return new Response("❌ Missing GITHUB_REPO env var", { status: 500 });
  }

  // Parse & sanitize the URL
  let { newUrl } = await context.request.json().catch(() => ({}));
  if (typeof newUrl !== "string") {
    return new Response("❌ No newUrl in JSON body", { status: 400 });
  }
  newUrl = newUrl.trim();
  if (!/^https?:\/\//i.test(newUrl)) newUrl = "https://" + newUrl;

  // Prevent loops
  const origin = new URL(context.request.url).origin;
  if (newUrl.startsWith(origin)) {
    return new Response("❌ Would loop back to this site", { status: 400 });
  }

  // 1) Fetch the current SHA
  const shaRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`,
    { headers:{ Authorization:`Bearer ${token}` } }
  );
  if (!shaRes.ok) {
    const err = await shaRes.json().catch(() => ({ message: shaRes.statusText }));
    return new Response(
      `❌ Failed to fetch SHA (check GITHUB_REPO?): ${err.message}`,
      { status: shaRes.status }
    );
  }
  const { sha } = await shaRes.json();

  // 2) Commit the update
  const contentB64 = btoa(unescape(encodeURIComponent(newUrl)));
  const commitRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filePath}`,
    {
      method: "PUT",
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json"
      },
      body: JSON.stringify({ message:"Update redirect", content:contentB64, sha, branch })
    }
  );
  const commitJson = await commitRes.json().catch(() => ({}));
  if (!commitRes.ok) {
    return new Response(
      `❌ GitHub commit failed: ${commitJson.message||JSON.stringify(commitJson)}`,
      { status: commitRes.status }
    );
  }

  // 3) Success—return minimal confirmation
  return new Response(`✅ Updated ${filePath} to ${newUrl}`, { status: 200 });
}
