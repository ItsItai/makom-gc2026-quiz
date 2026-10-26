// app.js: quiz state machine, rendering, entry form and offline submission queue. All copy comes from content.js.
(() => {
  "use strict";
  const Q = window.QUIZ, S = Q.settings, total = Q.questions.length;
  const $ = id => document.getElementById(id);
  const STATE_KEY = "makomQuiz.state", QUEUE_KEY = "makomQuiz.queue";

  Q.questions.forEach((q, i) => console.assert(
    q.answers.length === 3 && Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 3,
    `content.js: question ${i + 1} needs exactly 3 answers and a correct index of 0, 1 or 2`));

  // Storage can throw (private browsing, blocked site data); the quiz still works without it.
  const store = (area, key, value) => {
    try {
      if (value === undefined) return JSON.parse(window[area].getItem(key));
      if (value === null) window[area].removeItem(key); else window[area].setItem(key, JSON.stringify(value));
    } catch (e) { return null; }
  };

  const fresh = () => ({ screen: "welcome", index: 0, answers: [], answered: false });
  let state = Object.assign(fresh(), store("sessionStorage", STATE_KEY));
  let shown = null, wasPending = false;

  const set = patch => { Object.assign(state, patch); store("sessionStorage", STATE_KEY, state); render(); };
  const score = () => state.answers.filter((a, i) => a === Q.questions[i].correct).length;
  const closed = () => state.closed || Date.now() > Date.parse(S.entryClosesAt);
  const queue = () => store("localStorage", QUEUE_KEY) || [];
  const LETTERS = "ABC";

  const icon = name => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#i-" + name);
    svg.setAttribute("aria-hidden", "true");
    svg.append(use);
    return svg;
  };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

  // Put text in an element, turning the first occurrence of `phrase` into a link that opens in a new tab.
  const linkify = (node, text, phrase, href) => {
    const at = text.indexOf(phrase);
    if (at < 0) { node.textContent = text; return; }
    const a = el("a", "", phrase);
    Object.assign(a, { href, target: "_blank", rel: "noopener" });
    node.replaceChildren(text.slice(0, at), a, text.slice(at + phrase.length));
  };

  // Static copy, filled once.
  document.querySelectorAll("[data-c]").forEach(n => {
    n.textContent = n.dataset.c.split(".").reduce((o, k) => o[k], Q);
  });
  linkify($("fine-print"), Q.welcome.finePrint, "Official Rules", S.rulesUrl);
  linkify($("consent-label"), Q.result.consentLabel, "Official Rules", S.rulesUrl);
  $("privacy-link").href = S.privacyUrl;
  $("discover").href = S.makomUrl;
  $("ig").href = S.instagramUrl;
  $("fb").href = S.facebookUrl;
  $("q-progress").setAttribute("aria-valuemax", total);

  function renderQuestion() {
    const q = Q.questions[state.index], picked = state.answers[state.index];
    $("q-progress-label").textContent = `Question ${state.index + 1} of ${total}`;
    $("q-progress").setAttribute("aria-valuenow", state.index + 1);
    $("q-fill").style.width = ((state.index + 1) / total * 100) + "%";
    $("q-place").textContent = q.place;
    $("q-text").textContent = q.question;

    $("q-answers").replaceChildren(...q.answers.map((text, i) => {
      const b = el("button", "answer");
      b.type = "button";
      b.append(el("span", "letter", LETTERS[i]), el("span", "txt", text));
      if (state.answered) {
        b.disabled = true;
        b.setAttribute("aria-disabled", "true");
        if (i === picked) b.setAttribute("aria-pressed", "true");
        if (i === q.correct) {
          b.classList.add("right");
          const m = el("span", "mark");
          m.append(icon("check"), el("span", "", "Correct answer"));
          b.append(m);
        } else if (i === picked) {
          b.classList.add("wrong");
          const m = el("span", "mark");
          m.append(icon("cross"), el("span", "", "Your answer"));
          b.append(m);
        } else b.classList.add("dim");
      } else b.addEventListener("click", () => answer(i));
      return b;
    }));

    const banner = $("q-banner");
    if (state.answered) {
      const right = picked === q.correct;
      banner.className = "banner " + (right ? "ok" : "no");
      banner.replaceChildren(icon(right ? "check" : "cross"),
        el("span", "", right ? "Correct!" : `Not quite. The correct answer is ${LETTERS[q.correct]}.`));
      $("q-fact").textContent = q.fact;
      const next = $("next");
      next.replaceChildren(state.index + 1 < total ? "Next" : "See my score", icon("arrow"));
    } else {
      banner.className = "banner";
      banner.replaceChildren();
    }
    $("q-after").hidden = !state.answered;
  }

  function renderResult() {
    const s = score();
    const msgKey = Object.keys(Q.result.scoreMessages).map(Number).filter(t => t <= s).sort((a, b) => b - a)[0];
    $("ring-fill").setAttribute("stroke-dasharray", `${s / total * 100} 100`);
    $("ring-text").textContent = `${s}/${total}`;
    $("score-line").textContent = Q.result.scoreLine.replace("{score}", s).replace("{total}", total);
    $("score-msg").textContent = msgKey === undefined ? "" : Q.result.scoreMessages[msgKey];
    const isClosed = closed();
    $("entry").hidden = isClosed;
    $("closed").hidden = !isClosed;
    showLinks(isClosed ? $("closed") : null);
  }

  function renderThanks() {
    $("draw-note").textContent = state.duplicate
      ? "You're already entered. There is one entry per person. Good luck!"
      : Q.thanks.drawNote;
    showLinks($("thanks"));
    updatePending();
  }

  // The thank-you links block is shared by the Thank-you screen and the closed state.
  function showLinks(parent) {
    const links = $("links");
    links.hidden = !parent;
    if (parent) parent.append(links);
  }

  function updatePending() {
    const box = $("pending"), n = queue().length;
    if (n) wasPending = true;
    box.hidden = !wasPending;
    box.textContent = n ? Q.thanks.pendingNote : "Your entry has been sent.";
  }

  function render() {
    for (const id of ["welcome", "question", "result", "thanks"]) $(id).hidden = id !== state.screen;
    if (state.screen === "question") renderQuestion();
    if (state.screen === "result") renderResult();
    if (state.screen === "thanks") renderThanks();
    if (shown !== state.screen) {
      shown = state.screen;
      window.scrollTo(0, 0);
      $(state.screen).querySelector("h1, h2").focus({ preventScroll: true });
    }
  }

  function answer(i) {
    const answers = state.answers.slice(0, state.index);
    answers[state.index] = i;
    set({ answers, answered: true });
    if (i !== Q.questions[state.index].correct) navigator.vibrate?.(30);
    $("next").scrollIntoView({ block: "nearest" });
    $("q-banner").focus({ preventScroll: true });
  }

  $("start").addEventListener("click", () => set({ screen: "question", index: 0, answers: [], answered: false }));
  $("next").addEventListener("click", () => {
    if (state.index + 1 < total) set({ index: state.index + 1, answered: false });
    else set({ screen: "result", answered: false });
    if (state.screen === "question") { window.scrollTo(0, 0); $("q-text").focus(); }
  });

  // ---- Entry form ----
  const form = $("entry");
  const checks = {
    name: f => f.value.trim().length >= 2,
    email: f => f.value.trim() !== "" && f.validity.valid,
    phone: f => /^[\d\s+\-().]+$/.test(f.value.trim()) && /^\d{7,15}$/.test(f.value.replace(/\D/g, "")),
    consent: f => f.checked
  };

  function validate() {
    let first = null;
    for (const [name, ok] of Object.entries(checks)) {
      const f = form.elements[name], valid = ok(f);
      f.setAttribute("aria-invalid", String(!valid));
      $("e-" + name).hidden = valid;
      if (!valid && !first) first = f;
    }
    if (first) first.focus();
    return !first;
  }

  for (const name of Object.keys(checks)) {
    form.elements[name].addEventListener(name === "consent" ? "change" : "input", e => {
      if (e.target.getAttribute("aria-invalid") === "true" && checks[name](e.target)) {
        e.target.setAttribute("aria-invalid", "false");
        $("e-" + name).hidden = true;
      }
    });
  }

  async function send(entry) {
    const r = await fetch(S.endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // a "simple" request: no CORS preflight, which Apps Script cannot answer
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(10000)
    });
    return (await r.json()).status;
  }

  // A completed entry is not saved, so a reload starts a new quiz.
  const finish = patch => {
    form.reset();
    Object.assign(state, { screen: "thanks" }, patch);
    store("sessionStorage", STATE_KEY, null);
    render();
  };

  form.addEventListener("submit", async e => {
    e.preventDefault();
    $("e-form").hidden = true;
    if (!validate()) return;
    const v = name => form.elements[name].value.trim();
    if (form.elements.website.value) return finish({}); // honeypot: pretend success, send nothing
    if (closed()) return set({ closed: true });

    const entry = {
      id: crypto.randomUUID(), name: v("name"), email: v("email"), phone: v("phone"), score: score(),
      consent: true, consentVersion: S.consentVersion, submittedAt: new Date().toISOString(), website: ""
    };
    if (!S.endpoint) {
      console.log("Demo mode, nothing was sent:", entry);
      return finish({});
    }

    const btn = $("submit");
    btn.disabled = true;
    btn.textContent = "Sending…";
    let status;
    try { status = await send(entry); } catch (err) { status = "error"; }
    btn.disabled = false;
    btn.textContent = Q.result.submitButton;

    if (status === "ok") finish({});
    else if (status === "duplicate") finish({ duplicate: true });
    else if (status === "closed") set({ closed: true });
    else if (status === "invalid") { $("e-form").hidden = false; }
    else {
      store("localStorage", QUEUE_KEY, queue().concat(entry));
      // Keep the thank-you screen across a reload while the entry is still queued.
      set({ screen: "thanks" });
      form.reset();
    }
  });

  // ---- Offline queue: send queued entries one at a time; drop them only on a final server answer ----
  let flushing = false;
  async function flush() {
    if (flushing || !S.endpoint) return;
    flushing = true;
    try {
      let q;
      while ((q = queue()).length) {
        let status;
        try { status = await send(q[0]); } catch (err) { break; }
        if (!["ok", "duplicate", "closed", "invalid"].includes(status)) break;
        store("localStorage", QUEUE_KEY, queue().filter(x => x.id !== q[0].id));
      }
    } finally {
      flushing = false;
      if (state.screen === "thanks") updatePending();
    }
  }
  window.addEventListener("online", flush);
  setInterval(() => { if (queue().length) flush(); }, 20000);

  if (location.protocol === "https:" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  render();
  flush();
})();
