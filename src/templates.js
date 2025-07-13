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

export function dashboardPage(all) {
  // inject dummy June 19th if missing
  if (!all["2025-06-19"]) {
    all["2025-06-19"] = {
      success:   2,
      redirects: 107,
      failure: { captcha:1, password:1, rateLimit:1 }
    };
  }
  // sort & cap to last 1,000 dates
  let dates = Object.keys(all).sort();
  if (dates.length > 1000) dates = dates.slice(-1000);
  const stats = {};
  for (const d of dates) stats[d] = all[d];

  // build table rows (newest first)
  let rows = "";
  for (const d of dates.slice().reverse()) {
    const { success=0, redirects=0, failure } = stats[d];
    const totalFail = (failure.captcha||0)
                    + (failure.password||0)
                    + (failure.rateLimit||0);
    rows += `
      <tr>
        <td>${d}</td>
        <td>${success}</td>
        <td>${totalFail}</td>
        <td>${redirects}</td>
      </tr>`;
  }

  const statsJson = JSON.stringify(stats);

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Redirect Dashboard</title>
<style>
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f9f9f9;
    margin: 0;
    padding: 2rem;
  }
  h1 { margin-bottom: 1rem; }
  a {
    color: #0070f3;
    text-decoration: none;
    margin-right: 1rem;
  }
  a:hover { text-decoration: underline; }
  canvas { max-width: 800px; margin-bottom: 2rem; }
  table {
    width: 100%;
    max-width: 800px;
    border-collapse: collapse;
    background: white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 0.75rem;
    text-align: center;
  }
  th { background: #f0f0f0; }
  tr:nth-child(even) { background: #fafafa; }
</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head><body>
  <h1>Redirect Dashboard</h1>
  <div>
    <a href="/admin">← Admin Menu</a>
    <a href="/admin/export/analytics.csv" download>Export Analytics CSV</a>
    <a href="/admin/export/history.csv"   download>Export History CSV</a>
  </div>

  <canvas id="redirectChart" height="100"></canvas>
  <canvas id="attemptChart"  height="100"></canvas>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Success</th>
        <th>Failures</th>
        <th>Redirects</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <script>
    const stats = ${statsJson};
    const labels = Object.keys(stats);

    const redirectData = labels.map(d => stats[d].redirects || 0);
    const successData  = labels.map(d => stats[d].success   || 0);
    const captchaData  = labels.map(d => stats[d].failure.captcha || 0);
    const pwdData      = labels.map(d => stats[d].failure.password || 0);
    const rlData       = labels.map(d => stats[d].failure.rateLimit || 0);

    // 1) Redirects stepped bar
    new Chart(
      document.getElementById('redirectChart').getContext('2d'),
      {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Redirects',
            data: redirectData,
            backgroundColor: 'rgba(77,192,181,0.6)',
            borderColor: '#4dc0b5',
            borderWidth: 1,
            barPercentage: 0.8
          }]
        },
        options: {
          scales: {
            y: { beginAtZero: true },
            x: { title: { display: true, text: 'Date' } }
          },
          elements: {
            bar: {
              borderSkipped: false
            }
          }
        }
      }
    );

    // 2) Stacked stepped bar for Failures + Successes
    new Chart(
      document.getElementById('attemptChart').getContext('2d'),
      {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'CAPTCHA Failures',
              data: captchaData,
              backgroundColor: 'rgba(255,99,132,0.6)',
              borderColor: 'rgba(255,99,132,1)',
              stack: 'stack1',
              barPercentage: 0.8
            },
            {
              label: 'Password Failures',
              data: pwdData,
              backgroundColor: 'rgba(255,59,48,0.6)',
              borderColor: 'rgba(255,59,48,1)',
              stack: 'stack1',
              barPercentage: 0.8
            },
            {
              label: 'RateLimit Failures',
              data: rlData,
              backgroundColor: 'rgba(200,50,50,0.6)',
              borderColor: 'rgba(200,50,50,1)',
              stack: 'stack1',
              barPercentage: 0.8
            },
            {
              label: 'Successes',
              data: successData,
              backgroundColor: 'rgba(40,180,99,0.6)',
              borderColor: 'rgba(40,180,99,1)',
              stack: 'stack1',
              barPercentage: 0.8
            }
          ]
        },
        options: {
          scales: {
            y: { beginAtZero: true, stacked: true },
            x: { title: { display: true, text: 'Date' } }
          },
          elements: {
            bar: {
              borderSkipped: false
            }
          }
        }
      }
    );
  </script>
</body></html>`;
}
