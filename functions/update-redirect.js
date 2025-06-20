export async function onRequestPost(context) {
  const token = context.env.GITHUB_TOKEN;
  const repo  = "kenburke/qr-redirect";
  const branch= "main";
  const filePath = "public/redirect.txt";

  // Parse and sanitize incoming URL
  let { newUrl } = await context.request.json();
  newUrl = newUrl.trim();
  if (!/^https?:\/\//i.test(newUrl)) {
    newUrl = "https://" + newUrl;
  }

  // Prevent infinite loops back to this site
  const siteOrigin = new URL(context.request.url).origin;
  if (newUrl.startsWith(siteOrigin)) {
    return new Response("❌ Redirect would loop to self", { status: 400 });
  }

  // 1) Fetch the current file SHA
  const shaRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!shaRes.ok) {
    const errText = await shaRes.text();
    return new Response(`❌ Failed to fetch SHA: ${errText}`, { status: 500 });
  }
  const { sha } = await shaRes.json();

  // 2) Commit the updated URL (base64-encoded)
  const contentB64 = btoa(unescape(encodeURIComponent(newUrl)));
  const commitRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Update redirect.txt via API",
        content: contentB64,
        sha,
        branch
      })
    }
  );
  const commitData = await commitRes.json();
  if (!commitRes.ok) {
    return new Response(`❌ GitHub commit failed: ${JSON.stringify(commitData)}`, { status: 500 });
  }

  // 3) Return the raw commit response for debugging
  return new Response(JSON.stringify(commitData), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
