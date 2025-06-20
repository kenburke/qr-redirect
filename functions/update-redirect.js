export async function onRequestPost(context) {
  const token = context.env.GITHUB_TOKEN;
  const repo = "yourusername/yourrepo";
  const branch = "main";
  const filePath = "redirect.txt";

  const { newUrl } = await context.request.json();

  // Basic URL sanitization
  let cleanUrl = newUrl.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = "https://" + cleanUrl;
  }

  // Prevent infinite redirect loop
  if (cleanUrl.includes(context.request.url)) {
    return new Response("Redirect would loop to self", { status: 400 });
  }

  // Get current file SHA
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return new Response("Failed to fetch SHA", { status: 500 });
  const data = await res.json();
  const sha = data.sha;

  // Commit new content
  const payload = {
    message: "Update redirect.txt via API",
    content: btoa(unescape(encodeURIComponent(cleanUrl))),
    sha,
    branch
  };

  const updateRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!updateRes.ok) {
    const err = await updateRes.text();
    return new Response(`GitHub commit failed: ${err}`, { status: 500 });
  }

  return new Response("✅ Redirect updated", { status: 200 });
}
