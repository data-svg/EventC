(function(){
  const STORAGE_KEY = "event_budget_v1_nocdn";
  const CURRENCIES = { USD: "$", GBP: "£", EUR: "€", ZAR: "R" };
  const DEFAULT_CATEGORIES = [
    "Venue","Talent/Artists","Production (Sound/Light/Stage)","Marketing",
    "Staffing & Security","Ticketing & Payments","Permits & Insurance",
    "Catering & Hospitality","Travel & Accommodation","Miscellaneous"
  ];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const state = {
    currency: "GBP",
    vat: 0,
    contingency: 10,
    attendance: 0,
    ticketFee: 0,
    costs: [],
    tickets: [],
    sponsors: [],
    otherIncome: 0
  };

  const fmt = (n) => {
    const cur = state.currency || "GBP";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, currencyDisplay: "narrowSymbol", maximumFractionDigits: 2 }).format(isFinite(n) ? n : 0);
    } catch(e){
      const sym = CURRENCIES[cur] || "";
      return sym + (isFinite(n) ? n.toFixed(2) : "0.00");
    }
  };

  const num = (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, ""));
    return isFinite(n) ? n : 0;
  };

  const uid = () => Math.random().toString(36).slice(2, 9);

  const blankCost = () => ({ id: uid(), category: "Venue", description: "", qty: 1, unit: 0 });
  const blankTicket = () => ({ id: uid(), name: "General", price: 0, qty: 0, includeFees: true });
  const blankSponsor = () => ({ id: uid(), name: "", amount: 0 });

  // DOM refs
  const refs = {
    currency: $("#currency"),
    attendance: $("#attendance"),
    vat: $("#vat"),
    contingency: $("#contingency"),
    fee: $("#fee"),
    otherIncome: $("#other-income"),

    addCost: $("#add-cost"),
    addTicket: $("#add-ticket"),
    addSponsor: $("#add-sponsor"),

    costBody: $("#cost-body"),
    ticketBody: $("#ticket-body"),
    sponsorBody: $("#sponsor-body"),

    kpiCost: $("#kpi-cost"),
    kpiRev: $("#kpi-rev"),
    kpiProfit: $("#kpi-profit"),
    kpiMargin: $("#kpi-margin"),
    kpiCostPerAtt: $("#kpi-cost-per-att"),
    kpiAvgPrice: $("#kpi-avg-price"),
    kpiTicketRev: $("#kpi-ticket-rev"),
    kpiSpon: $("#kpi-spon"),
    kpiTotalRev: $("#kpi-total-rev"),
    kpiBEPPrice: $("#kpi-bep-price"),
    kpiBEPAtt: $("#kpi-bep-att"),
    hintAtt: $("#hint-att"),
    hintAvg: $("#hint-avg"),
    costBreakdown: $("#cost-breakdown"),
    tileProfit: $("#tile-profit"),

    sumSubtotal: $("#sum-subtotal"),
    sumTax: $("#sum-tax"),
    sumCont: $("#sum-cont"),
    sumVatPct: $("#sum-vat-pct"),
    sumContPct: $("#sum-cont-pct"),

    btnCSV: $("#btn-csv"),
    btnJSON: $("#btn-json"),
    btnReset: $("#btn-reset"),
    btnPrint: $("#btn-print"),
    fileImport: $("#file-import"),
  };

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const s = JSON.parse(raw);
        Object.assign(state, s);
      } else {
        // defaults
        state.costs = [blankCost()];
        state.tickets = [blankTicket()];
        state.sponsors = [];
      }
    }catch{}
    // hydrate inputs
    refs.currency.value = state.currency;
    refs.attendance.value = state.attendance;
    refs.vat.value = state.vat;
    refs.contingency.value = state.contingency;
    refs.fee.value = state.ticketFee;
    refs.otherIncome.value = state.otherIncome;
  }

  function save(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function renderCosts(){
    refs.costBody.innerHTML = "";
    state.costs.forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><select class="inp cat"></select></td>
        <td><input class="inp desc" type="text" placeholder="e.g., Venue hire 6pm–2am" /></td>
        <td class="num"><input class="inp qty" type="number" step="1" min="0" /></td>
        <td class="num"><input class="inp unit" type="number" step="0.01" min="0" /></td>
        <td class="num line">—</td>
        <td class="num"><button class="btn btn-del" title="Remove">×</button></td>
      `;
      const cat = tr.querySelector(".cat");
      const options = Array.from(new Set([c.category].concat(DEFAULT_CATEGORIES)));
      options.forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt; o.textContent = opt; if (opt === c.category) o.selected = true; cat.appendChild(o);
      });
      tr.querySelector(".desc").value = c.description || "";
      tr.querySelector(".qty").value = c.qty;
      tr.querySelector(".unit").value = c.unit;

      tr.querySelector(".cat").addEventListener("change", (e)=>{ c.category = e.target.value; save(); calc(); });
      tr.querySelector(".desc").addEventListener("input", (e)=>{ c.description = e.target.value; save(); });
      tr.querySelector(".qty").addEventListener("input", (e)=>{ c.qty = num(e.target.value); save(); calc(); });
      tr.querySelector(".unit").addEventListener("input", (e)=>{ c.unit = num(e.target.value); save(); calc(); });
      tr.querySelector(".btn-del").addEventListener("click", ()=>{
        state.costs = state.costs.filter(x => x !== c);
        save(); renderCosts(); calc();
      });

      refs.costBody.appendChild(tr);
    });
  }

  function renderTickets(){
    refs.ticketBody.innerHTML = "";
    state.tickets.forEach((t) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input class="inp name" type="text" /></td>
        <td class="num"><input class="inp price" type="number" step="0.01" min="0" /></td>
        <td class="num"><input class="inp qty" type="number" step="1" min="0" /></td>
        <td class="num"><input class="inp fee" type="checkbox" /></td>
        <td class="num net">—</td>
        <td class="num"><button class="btn btn-del" title="Remove">×</button></td>
      `;
      tr.querySelector(".name").value = t.name;
      tr.querySelector(".price").value = t.price;
      tr.querySelector(".qty").value = t.qty;
      tr.querySelector(".fee").checked = !!t.includeFees;

      tr.querySelector(".name").addEventListener("input", (e)=>{ t.name = e.target.value; save(); });
      tr.querySelector(".price").addEventListener("input", (e)=>{ t.price = num(e.target.value); save(); calc(); });
      tr.querySelector(".qty").addEventListener("input", (e)=>{ t.qty = num(e.target.value); save(); calc(); });
      tr.querySelector(".fee").addEventListener("change", (e)=>{ t.includeFees = e.target.checked; save(); calc(); });
      tr.querySelector(".btn-del").addEventListener("click", ()=>{
        state.tickets = state.tickets.filter(x => x !== t);
        save(); renderTickets(); calc();
      });

      refs.ticketBody.appendChild(tr);
    });
  }

  function renderSponsors(){
    refs.sponsorBody.innerHTML = "";
    state.sponsors.forEach((s) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input class="inp name" type="text" placeholder="Sponsor name" /></td>
        <td class="num"><input class="inp amount" type="number" step="0.01" min="0" /></td>
        <td class="num"><button class="btn btn-del" title="Remove">×</button></td>
      `;
      tr.querySelector(".name").value = s.name;
      tr.querySelector(".amount").value = s.amount;

      tr.querySelector(".name").addEventListener("input", (e)=>{ s.name = e.target.value; save(); });
      tr.querySelector(".amount").addEventListener("input", (e)=>{ s.amount = num(e.target.value); save(); calc(); });
      tr.querySelector(".btn-del").addEventListener("click", ()=>{
        state.sponsors = state.sponsors.filter(x => x !== s);
        save(); renderSponsors(); calc();
      });

      refs.sponsorBody.appendChild(tr);
    });
  }

  function sums(){
    let subtotal = 0;
    const byCat = {};
    $$("#cost-body tr").forEach((tr, idx) => {
      const c = state.costs[idx];
      const line = num(c.qty) * num(c.unit);
      subtotal += line;
      byCat[c.category || "Uncategorized"] = (byCat[c.category || "Uncategorized"] || 0) + line;
      tr.querySelector(".line").textContent = fmt(line);
    });
    const tax = subtotal * num(state.vat) / 100;
    const cont = subtotal * num(state.contingency) / 100;
    const total = subtotal + tax + cont;
    const perAtt = num(state.attendance) > 0 ? total / num(state.attendance) : 0;

    refs.sumSubtotal.textContent = fmt(subtotal);
    refs.sumTax.textContent = fmt(tax);
    refs.sumCont.textContent = fmt(cont);
    refs.sumVatPct.textContent = `(${num(state.vat)}%)`;
    refs.sumContPct.textContent = `(${num(state.contingency)}%)`;

    // breakdown
    refs.costBreakdown.innerHTML = "";
    Object.entries(byCat).forEach(([k, v]) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${k}</span><span><strong>${fmt(v)}</strong></span>`;
      refs.costBreakdown.appendChild(li);
    });

    return { subtotal, tax, cont, total, perAtt, byCat };
  }

  function revenues(){
    let ticketRev = 0, totalTickets = 0;
    $$("#ticket-body tr").forEach((tr, idx) => {
      const t = state.tickets[idx];
      const gross = num(t.price) * num(t.qty);
      const fee = t.includeFees ? (gross * num(state.ticketFee) / 100) : 0;
      const net = gross - fee;
      totalTickets += num(t.qty);
      ticketRev += net;
      tr.querySelector(".net").textContent = fmt(net);
    });
    const sponsorship = state.sponsors.reduce((a,s)=> a + num(s.amount), 0);
    const total = ticketRev + sponsorship + num(state.otherIncome);
    return { ticketRev, sponsorship, total, totalTickets };
  }

  function calc(){
    const s = sums();
    const r = revenues();

    refs.kpiCost.textContent = fmt(s.total);
    refs.kpiRev.textContent = fmt(r.total);
    const profit = r.total - s.total;
    refs.kpiProfit.textContent = fmt(profit);
    refs.kpiMargin.textContent = (r.total > 0 ? (profit / r.total * 100).toFixed(1) : "0.0") + "%";
    refs.kpiCostPerAtt.textContent = fmt(s.perAtt);

    const avgPrice = r.totalTickets > 0 ? r.ticketRev / r.totalTickets : 0;
    refs.kpiAvgPrice.textContent = fmt(avgPrice);
    const bepPrice = num(state.attendance) > 0 ? (s.total / num(state.attendance)) : 0;
    const bepAtt = avgPrice > 0 ? Math.ceil(s.total / avgPrice) : 0;
    refs.kpiBEPPrice.textContent = fmt(bepPrice);
    refs.kpiBEPAtt.textContent = bepAtt;
    refs.hintAtt.textContent = `${num(state.attendance)} attendees`;
    refs.hintAvg.textContent = `${fmt(avgPrice)} average price`;

    refs.kpiTicketRev.textContent = fmt(r.ticketRev);
    refs.kpiSpon.textContent = fmt(r.sponsorship);
    refs.kpiTotalRev.textContent = fmt(r.total);

    refs.tileProfit.classList.remove("good","bad");
    refs.tileProfit.classList.add(profit >= 0 ? "good" : "bad");
  }

  function bind(){
    refs.currency.addEventListener("change", (e)=>{ state.currency = e.target.value; save(); calc(); });
    refs.attendance.addEventListener("input", (e)=>{ state.attendance = num(e.target.value); save(); calc(); });
    refs.vat.addEventListener("input", (e)=>{ state.vat = num(e.target.value); save(); calc(); });
    refs.contingency.addEventListener("input", (e)=>{ state.contingency = num(e.target.value); save(); calc(); });
    refs.fee.addEventListener("input", (e)=>{ state.ticketFee = num(e.target.value); save(); calc(); });
    refs.otherIncome.addEventListener("input", (e)=>{ state.otherIncome = num(e.target.value); save(); calc(); });

    refs.addCost.addEventListener("click", ()=>{ state.costs.push(blankCost()); save(); renderCosts(); calc(); });
    refs.addTicket.addEventListener("click", ()=>{ state.tickets.push(blankTicket()); save(); renderTickets(); calc(); });
    refs.addSponsor.addEventListener("click", ()=>{ state.sponsors.push(blankSponsor()); save(); renderSponsors(); calc(); });

    refs.btnReset.addEventListener("click", ()=>{
      state.costs = [blankCost()]; state.tickets = [blankTicket()]; state.sponsors = [];
      state.otherIncome = 0; state.attendance = 0; state.vat = 0; state.contingency = 10; state.ticketFee = 0;
      save(); renderCosts(); renderTickets(); renderSponsors(); load(); calc();
    });

    refs.btnPrint.addEventListener("click", ()=>window.print());

    refs.btnJSON.addEventListener("click", ()=>{
      const data = JSON.stringify(state, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `event-budget-${new Date().toISOString().slice(0,10)}.json`;
      a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 500);
    });

    refs.fileImport.addEventListener("change", async (e)=>{
      const f = e.target.files?.[0]; if(!f) return;
      const text = await f.text();
      try{
        const data = JSON.parse(text);
        Object.assign(state, {
          currency: data.currency ?? state.currency,
          vat: num(data.vat), contingency: num(data.contingency),
          attendance: num(data.attendance), ticketFee: num(data.ticketFee),
          costs: Array.isArray(data.costs) && data.costs.length ? data.costs : [blankCost()],
          tickets: Array.isArray(data.tickets) && data.tickets.length ? data.tickets : [blankTicket()],
          sponsors: Array.isArray(data.sponsors) ? data.sponsors : [],
          otherIncome: num(data.otherIncome)
        });
        save(); load(); renderCosts(); renderTickets(); renderSponsors(); calc();
      }catch{ alert("Invalid JSON file"); }
      e.target.value = "";
    });

    refs.btnCSV.addEventListener("click", ()=>{
      const s = sums(); const r = revenues();
      const rows = [];
      rows.push(["Section","Category/Name","Description","Qty","Unit","Line Total"]);
      state.costs.forEach(c=>{
        const line = num(c.qty) * num(c.unit);
        rows.push(["Cost", c.category, c.description, c.qty, c.unit, line]);
      });
      rows.push(["Cost Subtotal","","","","", s.subtotal]);
      rows.push(["Tax","","","","", s.tax]);
      rows.push(["Contingency","","","","", s.cont]);
      rows.push(["Total Cost","","","","", s.total]);
      rows.push([]);
      rows.push(["Revenue","Name","","Qty","Price","Gross (less fees)"]);
      state.tickets.forEach(t=>{
        const gross = num(t.price) * num(t.qty);
        const fee = t.includeFees ? (gross * num(state.ticketFee) / 100) : 0;
        rows.push(["Ticket", t.name, "", t.qty, t.price, gross - fee]);
      });
      state.sponsors.forEach(s=> rows.push(["Sponsorship", s.name, "", "", "", num(s.amount)]));
      rows.push(["Other Income", "", "", "", "", num(state.otherIncome)]);
      rows.push(["Total Revenue", "", "", "", "", r.total]);
      rows.push([]);
      rows.push(["Net Profit", "", "", "", "", r.total - s.total]);
      rows.push(["Margin %", "", "", "", "", (r.total>0 ? (r.total - s.total)/r.total*100 : 0)]);
      const csv = rows.map(r=>r.map(v => (v===undefined||v===null) ? "" : String(v)).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `event-budget-${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 500);
    });
  }

  // init
  load();
  bind();
  renderCosts();
  renderTickets();
  renderSponsors();
  calc();
})();