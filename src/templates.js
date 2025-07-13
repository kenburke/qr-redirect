function randomChallenge() {
  const ops = ['+', '*'];
  const op  = ops[Math.floor(Math.random() * ops.length)];
  const a   = Math.floor(Math.random() * 21) - 10;
  const b   = Math.floor(Math.random() * 21) - 10;
  return { a, b, op };
}

export function landingPage() {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Admin Menu</title>
<style>
  body{font-family:system-ui,sans-serif;background:#f9f9f9;margin:0;
       display:flex;align-items:center;justify-content:center;height:100vh;}
  .menu{background:white;padding:2rem;border-radius:8px;
        box-shadow:0 2px 8px rgba(0,0,0,0.1);text-align:center;}
  h1{margin-bottom:1rem;}
  a.primary{display:block;margin:0.75rem 0;font-size:1.25rem;
            color:#fff;background:#0070f3;padding:0.75rem;border-radius:4px;
            text-decoration:none;}
  a.secondary{display:block;margin:0.5rem 0;font-size:1rem;
              color:#0070f3;text-decoration:none;}
  a.primary:hover{background:#005bb5;}
  a.secondary:hover{text-decoration:underline;}
</style>
</head><body>
  <div class="menu">
    <h1>Redirect Admin</h1>
    <a href="/admin/update" class="primary">Update Redirect Link</a>
    <a href="/admin/stats"  class="secondary" target="_blank">View Raw Stats (JSON)</a>
    <a href="/admin/dash"   class="secondary">View Dashboard</a>
  </div>
</body></html>`;
}

export function updateForm() {
  const ch = randomChallenge();
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Update Redirect</title>
<style>
  html,body{height:100%;margin:0;}
  body{display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#f9f9f9;}
  .box{background:white;padding:2rem;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:400px;width:100%;box-sizing:border-box;}
  h1{margin-top:0;font-size:1.25rem;}
  form{display:grid;gap:1rem;}
  input,button{font-size:1rem;padding:0.5rem;border-radius:4px;box-sizing:border-box;}
  input{border:1px solid #ccc;width:100%;}
  button{background:#0070f3;color:white;border:none;cursor:pointer;}
  button:hover{background:#005bb5;}
  .msg{margin-top:1rem;font-size:0.95rem;}
  .error{color:#c92a2a;}
  a{display:block;margin-top:1rem;text-align:center;color:#0070f3;text-decoration:none;font-size:0.9rem;}
</style>
</head><body>
  <div class="box">
    <h1>Update Redirect</h1>
    <form id="f">
      <input type="url"     name="url"      placeholder="https://example.com" required/>
      <input type="password" name="password" placeholder="Admin password" required/>
      <label id="challenge">
        <strong>Prove you are human!</strong><br>
        <strong>Solve: ${ch.a} ${ch.op} ${ch.b} =</strong>
        <input type="number" name="captcha" required style="width:4rem"/>
      </label>
      <input type="hidden" name="a"  value="${ch.a}"/>
      <input type="hidden" name="b"  value="${ch.b}"/>
      <input type="hidden" name="op" value="${ch.op}"/>
      <button type="submit">Save</button>
    </form>
    <div id="msg" class="msg"></div>
    <a href="/"            target="_blank" rel="noopener noreferrer">▶ Test redirect</a>
    <a href="/admin" style="margin-top:0.5rem;display:block;">← Admin Menu</a>
  </div>
  <script>
    const f   = document.getElementById("f");
    const msg = document.getElementById("msg");
    const ch  = document.getElementById("challenge");
    f.addEventListener("submit", async e => {
      e.preventDefault();
      msg.textContent = "Updating…";
      msg.classList.remove("error");

      // 1) Submit
      const res = await fetch("/admin/update", {
        method: "POST",
        body: new FormData(f)
      });
      const txt = await res.text();

      // 2) Display result
      if (!res.ok) {
        msg.textContent = txt;
        msg.classList.add("error");
      } else {
        msg.textContent = txt;
      }

      // 3) Reset password (so they have to retype)
      f.querySelector("input[name=password]").value = "";

      // 4) New CAPTCHA
      const { a, b, op } = randomChallenge();
      ch.innerHTML =
        '<strong>Prove you are human!</strong><br>' +
        '<strong>Solve: ' + a + ' ' + op + ' ' + b + ' =</strong>' +
        '<input type="number" name="captcha" required style="width:4rem"/>';

      // 5) Store hidden inputs
      f.querySelector("input[name=a]").value  = a;
      f.querySelector("input[name=b]").value  = b;
      f.querySelector("input[name=op]").value = op;
    });

    function randomChallenge(){
      const ops = ["+","*"];
      const op  = ops[Math.floor(Math.random()*ops.length)];
      const a   = Math.floor(Math.random()*21)-10;
      const b   = Math.floor(Math.random()*21)-10;
      return {a,b,op};
    }
  </script>
</body></html>`;
}
