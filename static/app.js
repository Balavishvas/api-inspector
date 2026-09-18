const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const state = { history: JSON.parse(localStorage.getItem("apiInspectorHistory") || "[]"), responseHeaders: {} };

function toast(message) {
  const el = $("#toast"); el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1600);
}

function addRow(container, key="", value="") {
  const row = document.createElement("div"); row.className = "kv";
  row.innerHTML = '<input class="kv-key" placeholder="key" value="' + escapeAttr(key) + '">' +
    '<input class="kv-value" placeholder="value" value="' + escapeAttr(value) + '">' +
    '<button class="remove" title="Remove">×</button>';
  row.querySelector(".remove").onclick = () => row.remove();
  $(container).appendChild(row);
}
function escapeAttr(v){return String(v).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;")}

function getRows(id) {
  const out = {};
  $$(id + " .kv").forEach(row => {
    const k = row.querySelector(".kv-key").value.trim();
    const v = row.querySelector(".kv-value").value;
    if (k) out[k] = v;
  });
  return out;
}

function setRows(id, data) {
  $(id).innerHTML = "";
  Object.entries(data || {}).forEach(([k,v]) => addRow(id,k,v));
  if (!Object.keys(data || {}).length) addRow(id);
}

function renderHistory() {
  const box = $("#history"); box.innerHTML = "";
  state.history.slice(0,12).forEach((item, i) => {
    const b = document.createElement("button"); b.className = "history-item";
    b.innerHTML = "<b>" + item.method + "</b>" + escapeAttr(item.url);
    b.onclick = () => {
      $("#method").value=item.method; $("#url").value=item.url;
      setRows("#paramsRows", item.params); setRows("#headersRows", item.headers);
      $("#bodyInput").value=item.body || "";
    };
    box.appendChild(b);
  });
}

function saveHistory(req) {
  state.history = [req, ...state.history.filter(x => !(x.method===req.method && x.url===req.url))].slice(0,12);
  localStorage.setItem("apiInspectorHistory", JSON.stringify(state.history)); renderHistory();
}

async function sendRequest() {
  const method=$("#method").value, url=$("#url").value.trim();
  if (!url) return toast("Add a URL first.");
  const headers=getRows("#headersRows"), params=getRows("#paramsRows");
  const token=$("#tokenInput").value.trim();
  if(token) headers.Authorization="Bearer "+token;
  const req={method,url,headers,params,body:$("#bodyInput").value};
  saveHistory(req);
  $("#send").disabled=true; $("#send").innerHTML="WAIT …";
  $("#status").className="status idle"; $("#status").textContent="sending request…";
  try {
    const res=await fetch("/api/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(req)});
    const data=await res.json();
    if(!res.ok) throw new Error(data.detail || "Request failed");
    $("#status").className="status "+(data.status<400?"good":"bad");
    $("#status").textContent=data.status+" "+data.reason;
    $("#time").textContent=data.time_ms; $("#size").textContent=formatBytes(data.size_bytes);
    $("#response").textContent=data.body;
    state.responseHeaders=data.headers;
    renderResponseHeaders();
  } catch(e) {
    $("#status").className="status bad"; $("#status").textContent="request failed";
    $("#response").textContent=e.message; $("#time").textContent="—"; $("#size").textContent="—";
  } finally { $("#send").disabled=false; $("#send").innerHTML='SEND <span>↗</span>'; }
}

function renderResponseHeaders(){
  $("#responseHeaders").innerHTML=Object.entries(state.responseHeaders).map(([k,v]) =>
    '<div style="padding:7px 0;border-bottom:1px solid var(--line)"><b style="display:inline-block;width:170px">'+escapeAttr(k)+'</b>'+escapeAttr(v)+'</div>').join("");
}
function formatBytes(n){return n<1024?n+" B":n<1048576?(n/1024).toFixed(1)+" KB":(n/1048576).toFixed(1)+" MB"}

function buildCurl(){
  const method=$("#method").value,url=$("#url").value.trim(),headers=getRows("#headersRows"),params=getRows("#paramsRows"),body=$("#bodyInput").value;
  const query=new URLSearchParams(params).toString(); const full=query?url+(url.includes("?")?"&":"?")+query:url;
  let c="curl -X "+method+" '"+full.replaceAll("'","\\'")+"'";
  Object.entries(headers).forEach(([k,v])=>c+=" \\\n  -H '"+k+": "+v.replaceAll("'","\\'")+"'");
  if($("#tokenInput").value.trim()) c+=" \\\n  -H 'Authorization: Bearer "+$("#tokenInput").value.trim()+"'";
  if(body.trim()) c+=" \\\n  -d '"+body.replaceAll("'","\\'")+"'";
  navigator.clipboard.writeText(c); toast("cURL copied.");
}
function inspectJwt(){
  const token=$("#tokenInput").value.trim() || prompt("Paste a JWT token");
  if(!token)return;
  try{
    const part=token.split(".")[1]; if(!part)throw new Error();
    const payload=JSON.parse(atob(part.replace(/-/g,"+").replace(/_/g,"/")));
    $("#jwtOutput").textContent=JSON.stringify(payload,null,2); $("#jwtDialog").showModal();
  }catch{toast("That doesn't look like a readable JWT.");}
}

$$(".tab").forEach(btn=>btn.onclick=()=>{
  $$(".tab").forEach(x=>x.classList.remove("active")); btn.classList.add("active");
  $$(".tab-content").forEach(x=>x.classList.add("hidden")); $("#"+btn.dataset.tab).classList.remove("hidden");
});
$$("[data-add]").forEach(btn=>btn.onclick=()=>addRow("#"+btn.dataset.add+"Rows"));
$("#send").onclick=sendRequest;
$("#curlBtn").onclick=buildCurl;
$("#jwtBtn").onclick=inspectJwt;
$("#closeJwt").onclick=()=>$("#jwtDialog").close();
$("#clearHistory").onclick=()=>{state.history=[];localStorage.removeItem("apiInspectorHistory");renderHistory();};
$("#formatBody").onclick=()=>{
  try{$("#bodyInput").value=JSON.stringify(JSON.parse($("#bodyInput").value),null,2);toast("JSON formatted.");}
  catch{toast("Body is not valid JSON.");}
};
$("#responseHeadersBtn").onclick=()=>{
  $("#response").classList.toggle("hidden"); $("#responseHeaders").classList.toggle("hidden");
  $("#responseHeadersBtn").classList.toggle("active");
};
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();sendRequest();}});

addRow("#paramsRows"); addRow("#headersRows"); renderHistory();
