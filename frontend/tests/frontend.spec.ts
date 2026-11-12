import { test, expect, type Page } from "@playwright/test";
import type { Deal, DealStatus, ViewerRole } from "../src/types";

const proof = { name: "proof.png", mimeType: "image/png", buffer: Buffer.from("test evidence") };
const USER = { id: 1, email: "asha@silk.test", name: "Asha Raman", business_name: "Chennai Silk House", country: "India" };

function makeDeal(status: DealStatus = "negotiated"): Deal {
  return {
    id: 1, product: "Silk sarees", quantity: 100,
    viewer_role: "buyer", next_actor: null, creator_role: "seller",
    invite_email: null, invite_email_status: "sent",
    buyer_name: "Cape Retail", buyer_country: "South Africa",
    seller_name: "Chennai Silk House", seller_country: "India",
    deposit_percent: 30, status, ai_mode: "rule_based",
    unit_price_cents: 2200, delivery_days: 18, total_cents: 220000,
    deposit_cents: 66000, balance_cents: 154000,
    transcript: [{ party: "seller", offer_cents: 2200, message: "Agreed within both limits." }],
    buyer_approved: false, seller_approved: false,
    carrier: null, tracking_number: null, shipped_quantity: null,
    verification: null, tracking_added: false,
    received_quantity: null, damaged_quantity: null, inspection_notes: null,
    claim: null, refund_suggested_cents: null, refund_id: null, refund_status: null,
    payments: [], evidence: [],
    reference: "TC-TEST2345", created_at: "2026-11-07T08:00:00",
    buyer_deadline_days: 21, seller_lead_days: 18, buyer_max_cents: 2500, seller_min_cents: 2000,
    delay_days: 0, delivered: true, watcher: null, events: [],
    activity: [],
  };
}

/** Mirrors the backend's rule for whose move it is. */
function nextActor(deal: Deal): Deal["next_actor"] {
  switch (deal.status) {
    case "invited": return deal.creator_role === "seller" ? "buyer" : "seller";
    case "negotiated":
      if (!deal.buyer_approved && !deal.seller_approved) return "both";
      return deal.buyer_approved ? "seller" : "buyer";
    case "approved": case "shipment_verified": return "buyer";
    case "deposit_paid": return "seller";
    case "proof_review": return "both";
    case "balance_paid": return deal.delivered ? "buyer" : "seller";
    case "refund_suggested": return "seller";
    default: return null;
  }
}

// API responses are controlled here: these tests exercise the real frontend,
// without creating accounts or deals, uploading files, or moving money on external services.
async function mockApi(page: Page, status: DealStatus = "negotiated", role: ViewerRole = "buyer") {
  const state = {
    deal: makeDeal(status), role, signedIn: true, empty: false, failList: false, failLoad: false,
    failCapture: false, pendingCapture: false, rejectProof: false,
    creationError: false, createCount: 0, captureCount: 0, shipmentCount: 0,
    inspectionCount: 0, creation: {} as Record<string, unknown>, inspection: "",
    accepted: {} as Record<string, unknown>, deleted: false, loginBody: {} as Record<string, unknown>,
    trackingUpdates: [] as Array<Record<string, unknown>>,
  };
  const view = () => {
    const party = state.role === "invitee" ? null : state.role;
    return {
      ...state.deal,
      viewer_role: state.role,
      next_actor: nextActor(state.deal),
      buyer_max_cents: party === "buyer" ? state.deal.buyer_max_cents : null,
      seller_min_cents: party === "seller" ? state.deal.seller_min_cents : null,
    };
  };
  await page.route(/\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, "");
    const method = request.method();
    const respond = (json: unknown, status = 200) => route.fulfill({ status, json });
    if (path === "/auth/me") return state.signedIn ? respond(USER) : respond({ detail: "Please log in." }, 401);
    if (path === "/auth/login" || path === "/auth/signup") {
      state.loginBody = request.postDataJSON();
      if (state.loginBody.password === "wrong password") return respond({ detail: "Email or password is wrong." }, 401);
      state.signedIn = true;
      return respond(USER, path === "/auth/signup" ? 201 : 200);
    }
    if (path === "/auth/logout") {
      state.signedIn = false;
      return route.fulfill({ status: 204 });
    }
    if (!state.signedIn) return respond({ detail: "Please log in." }, 401);
    if (path === "/partners") return respond([{
      email: "buyer@cape.test", name: "Cape Retail", country: "South Africa", deals: 2,
      last_product: "Silk sarees", last_quantity: 100, last_role: "buyer",
    }]);
    if (path === "/deals" && method === "GET") {
      return state.failList ? respond({ detail: "Service temporarily unavailable." }, 503) : respond(state.empty ? [] : [view()]);
    }
    if (path === "/deals" && method === "POST") {
      state.createCount++;
      state.creation = request.postDataJSON();
      if (state.creationError) return respond({ detail: [{ loc: ["body", "quantity"], msg: "Quantity is not available." }] }, 422);
      state.deal.status = "invited";
      state.deal.creator_role = state.creation.role as "buyer" | "seller";
      state.role = state.deal.creator_role;
      state.deal.invite_email = String(state.creation.counterparty_email);
      return respond(view(), 201);
    }
    if (path === "/deals/1" && method === "DELETE") {
      state.deleted = true;
      return route.fulfill({ status: 204 });
    }
    if (path === "/deals/1" && method === "GET") {
      return state.failLoad ? respond({ detail: "Deal not found." }, 404) : respond(view());
    }
    if (path === "/deals/1/accept") {
      state.accepted = request.postDataJSON();
      state.role = state.deal.creator_role === "seller" ? "buyer" : "seller";
      state.deal.status = "negotiated";
      return respond(view());
    }
    if (path === "/deals/1/decline") {
      state.deal.status = "declined";
      return respond(view());
    }
    if (path === "/deals/1/approve") {
      if (request.postData()) throw new Error("Approve takes no body; the server knows who is signed in.");
      state.deal[state.role === "buyer" ? "buyer_approved" : "seller_approved"] = true;
      if (state.deal.buyer_approved && state.deal.seller_approved) state.deal.status = "approved";
      return respond(view());
    }
    const payment = path.match(/^\/deals\/1\/payments\/(deposit|balance)(\/capture)?$/);
    if (payment) {
      const kind = payment[1] as "deposit" | "balance";
      if (!payment[2]) return respond({ approval_url: `https://paypal.test/checkout?kind=${kind}` });
      state.captureCount++;
      if (state.failCapture) return respond({ detail: "PayPal couldn't complete this payment." }, 502);
      state.deal.payments = state.deal.payments.filter((item) => item.kind !== kind);
      state.deal.payments.push({ kind, amount_cents: kind === "deposit" ? 66000 : 154000, order_id: kind, capture_id: kind, status: state.pendingCapture ? "PENDING" : "COMPLETED" });
      if (!state.pendingCapture) state.deal.status = kind === "deposit" ? "deposit_paid" : "balance_paid";
      return respond(view());
    }
    if (path === "/deals/1/shipment") {
      state.shipmentCount++;
      state.deal.status = state.rejectProof ? "proof_review" : "shipment_verified";
      state.deal.verification = { matches: !state.rejectProof, summary: state.rejectProof ? "Proof needs review." : "Shipment matches the order.", issues: state.rejectProof ? ["Quantity mismatch"] : [], mode: "rule_based" };
      return respond(view());
    }
    if (path === "/deals/1/shipment/accept") {
      state.deal.status = "shipment_verified";
      return respond(view());
    }
    if (path === "/deals/1/inspection") {
      state.inspectionCount++;
      state.inspection = request.postData() || "";
      const received = state.inspection.match(/name="received_quantity"\r\n\r\n(\d+)/)?.[1];
      const damaged = state.inspection.match(/name="damaged_quantity"\r\n\r\n(\d+)/)?.[1];
      state.deal.status = Number(received) >= 100 && Number(damaged) === 0 ? "closed" : "refund_suggested";
      state.deal.claim = { reasoning: "Refund for affected goods.", mode: "rule_based" };
      state.deal.refund_suggested_cents = 22000;
      return respond(view());
    }
    if (path === "/deals/1/claim/approve") {
      state.deal.status = "refunded";
      state.deal.refund_id = "refund-1";
      state.deal.refund_status = "COMPLETED";
      return respond(view());
    }
    if (path === "/deals/1/tracking/updates") {
      const update = request.postDataJSON() as { kind: "milestone" | "delay"; delay_days?: number; note?: string };
      state.trackingUpdates.push(update);
      const events = state.deal.events;
      const last = events.filter((event) => event.kind === "update").at(-1)?.stage ?? 0;
      if (update.kind === "delay") {
        state.deal.delay_days += update.delay_days ?? 0;
        events.push({ stage: last, kind: "delay", title: `Delayed by ${update.delay_days} days`, location: "Port of departure, India", day: 1, note: update.note || null });
      } else {
        const stage = last + 1;
        events.push({ stage, kind: "update", title: stage === 6 ? "Delivered" : `Milestone ${stage}`, location: "Route", day: stage * 3, note: update.note || null });
        state.deal.delivered = stage === 6;
      }
      const delivered = state.deal.delivered;
      state.deal.watcher = {
        level: delivered ? "delivered" : state.deal.delay_days ? "late" : "on_track",
        agreed_day: 18, projected_day: 18 + state.deal.delay_days, deadline_day: 21, delay_days: state.deal.delay_days,
        missed_deadline: 18 + state.deal.delay_days > 21,
        summary: delivered ? "The shipment has been delivered." : "Watcher summary.",
        buyer_message: "Buyer note.", seller_message: "Seller note.", action: "Keep watching.", mode: "rule_based",
        next_milestone: delivered ? null : "Next stop",
      };
      return respond(view());
    }
    if (path === "/deals/1/claim/reject") {
      state.deal.status = "claim_rejected";
      return respond(view());
    }
    throw new Error(`Unexpected API request: ${method} ${path}`);
  });
  await page.route("https://paypal.test/**", async (route) => {
    const kind = new URL(route.request().url()).searchParams.get("kind");
    await route.fulfill({ contentType: "text/html", body: `<a href="http://127.0.0.1:3100/deals/1?paypal=return&kind=${kind}">Approve sandbox payment</a><a href="http://127.0.0.1:3100/deals/1?paypal=cancel">Cancel payment</a>` });
  });
  return state;
}

type MockState = Awaited<ReturnType<typeof mockApi>>;

/** Switch which person is signed in, as if they opened the deal on their own computer. */
async function actAs(page: Page, state: MockState, role: ViewerRole) {
  state.role = role;
  await page.getByRole("button", { name: /Refresh status/ }).click();
  await expect(page.getByText(role === "invitee" ? "Trade invitation" : `You are the ${role}`)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  (page as Page & { runtimeErrors: string[] }).runtimeErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as Page & { runtimeErrors: string[] }).runtimeErrors).toEqual([]);
  if (new URL(page.url()).hostname === "127.0.0.1") {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("home, navbar, dashboard, new deal and deal links work", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cross-border trade you can trust");
  await expect(page.getByRole("navigation").getByText("Chennai Silk House")).toBeVisible();
  await page.getByRole("link", { name: "Start a deal" }).click();
  await expect(page).toHaveURL(/\/deals\/new$/);
  await page.getByRole("navigation").getByRole("link", { name: "Dashboard" }).click();
  await page.getByRole("link").filter({ hasText: "Silk sarees" }).click();
  await expect(page.getByRole("heading", { name: "Both people must approve" })).toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: "New deal" }).click();
  await expect(page.getByRole("heading", { name: "Start a deal" })).toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: "TrustCargo" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.locator("a button")).toHaveCount(0);
  await page.getByRole("navigation").getByRole("link", { name: "TrustCargo" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("navigation").getByRole("link", { name: "Dashboard" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("signed-out visitors are sent to login and returned afterwards", async ({ page }) => {
  const state = await mockApi(page);
  state.signedIn = false;
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();
  await page.goto("/deals/1");
  await expect(page).toHaveURL(/\/login\?next=%2Fdeals%2F1$/);
  const form = page.getByRole("main");
  await form.getByLabel("Email").fill("asha@silk.test");
  await form.getByLabel("Password").fill("wrong password");
  await form.getByRole("button", { name: "Log in" }).click();
  await expect(form.getByRole("alert")).toHaveText("Email or password is wrong.");
  await form.getByLabel("Password").fill("correct horse");
  await form.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/deals\/1$/);
  await expect(page.getByRole("heading", { name: "Both people must approve" })).toBeVisible();
  expect(state.loginBody).toEqual({ email: "asha@silk.test", password: "correct horse" });
});

test("login ignores links that point to other sites", async ({ page }) => {
  const state = await mockApi(page);
  state.signedIn = false;
  await page.goto("/login?next=//evil.test/steal");
  const form = page.getByRole("main");
  await form.getByLabel("Email").fill("asha@silk.test");
  await form.getByLabel("Password").fill("correct horse");
  await form.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:3100\/dashboard$/);
});

test("people can sign up and log out", async ({ page }) => {
  const state = await mockApi(page);
  state.signedIn = false;
  await page.goto("/signup");
  const form = page.getByRole("main");
  await form.getByLabel("Your name").fill(" Asha Raman ");
  await form.getByLabel("Business name (optional)").fill("Chennai Silk House");
  await form.getByLabel("Country").fill("India");
  await form.getByLabel("Email").fill("asha@silk.test");
  await form.getByLabel("Password").fill("short");
  await form.getByRole("button", { name: "Create account" }).click();
  expect(state.signedIn).toBe(false);
  await form.getByLabel("Password").fill("correct horse");
  await form.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(state.loginBody).toMatchObject({ name: "Asha Raman", country: "India", email: "asha@silk.test" });
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Sign up" })).toBeVisible();
});

test("dashboard empty state and load retry work", async ({ page }) => {
  const state = await mockApi(page);
  state.failList = true;
  await page.goto("/dashboard");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Service temporarily unavailable");
  state.failList = false;
  state.empty = true;
  await page.getByRole("button", { name: "Retry loading deals" }).click();
  await expect(page.getByText("No deals or invitations yet.")).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Start a deal" }).click();
  await expect(page).toHaveURL(/\/deals\/new$/);
});

test("dashboard separates invitations and shows whose turn it is", async ({ page }) => {
  const state = await mockApi(page, "invited", "invitee");
  state.deal.buyer_name = "";
  state.deal.buyer_country = "";
  await page.goto("/dashboard");
  const invitations = page.getByRole("region", { name: "Invitations for you" });
  await expect(invitations.getByText("From Chennai Silk House · you'd be the buyer")).toBeVisible();
  await invitations.getByRole("link").click();
  await expect(page.getByRole("heading", { name: "Join as the buyer" })).toBeVisible();

  state.role = "seller";
  state.deal = makeDeal("approved");
  await page.goto("/dashboard");
  await expect(page.getByText("Waiting for Cape Retail")).toBeVisible();
  // The summary row always has a "Your turn" label; the pill on the deal is the second one.
  await expect(page.getByRole("main").getByText("Your turn", { exact: true })).toHaveCount(1);
  state.role = "buyer";
  await page.getByRole("button", { name: "Refresh deals" }).click();
  await expect(page.getByRole("main").getByText("Your turn", { exact: true })).toHaveCount(2);
});

test("deal form sends only your own limit and the partner's email", async ({ page }) => {
  const state = await mockApi(page);
  await page.goto("/deals/new");
  const submit = page.getByRole("button", { name: "Invite the buyer" });
  await page.getByLabel("Saved trade partners").selectOption("buyer@cape.test");
  await expect(page.getByLabel("Buyer email")).toHaveValue("buyer@cape.test");
  await expect(page.getByLabel("Product", { exact: true })).toHaveValue("Silk sarees");
  await expect(page.getByLabel("Quantity", { exact: true })).toHaveValue("100");

  const quantity = page.getByLabel("Quantity", { exact: true });
  for (const value of ["1.5", "0", "100001"]) {
    await quantity.fill(value);
    await submit.click();
    expect(state.createCount).toBe(0);
  }
  await quantity.fill("100");
  await page.getByLabel("Lowest price you'll accept per unit (USD)").fill("20.50");
  const days = page.getByLabel("Days you need to deliver");
  for (const value of ["1.5", "366"]) {
    await days.fill(value);
    await submit.click();
    expect(state.createCount).toBe(0);
  }
  await days.fill("18");
  await page.getByLabel("Buyer email").fill("ASHA@silk.test");
  await submit.click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("can't trade with your own account");
  expect(state.createCount).toBe(0);

  await page.getByRole("radio", { name: /I'm buying/ }).click();
  await expect(page.getByLabel("Highest price you'll pay per unit (USD)")).toBeVisible();
  await page.getByRole("radio", { name: /I'm selling/ }).click();
  await page.getByLabel("Lowest price you'll accept per unit (USD)").fill("20.50");
  await page.getByLabel("Days you need to deliver").fill("18");
  await page.getByLabel("Buyer email").fill("buyer@cape.test");
  await submit.click();
  await expect(page).toHaveURL(/\/deals\/1$/);
  expect(state.creation).toEqual({
    role: "seller", product: "Silk sarees", quantity: 100, counterparty_email: "buyer@cape.test", limit_cents: 2050, days: 18,
  });
  await expect(page.getByText("buyer@cape.test", { exact: true })).toBeVisible();
  await expect(page.getByText("Waiting for the buyer to join")).toBeVisible();
});

test("structured API validation is shown and the form can be retried", async ({ page }) => {
  const state = await mockApi(page);
  state.creationError = true;
  await page.goto("/deals/new");
  await page.getByLabel("Product", { exact: true }).fill("Silk sarees");
  await page.getByLabel("Quantity", { exact: true }).fill("100");
  await page.getByLabel("Buyer email").fill("buyer@cape.test");
  await page.getByLabel("Lowest price you'll accept per unit (USD)").fill("20");
  await page.getByLabel("Days you need to deliver").fill("18");
  await page.getByRole("button", { name: "Invite the buyer" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("quantity: Quantity is not available.");
  state.creationError = false;
  await page.getByRole("button", { name: "Invite the buyer" }).click();
  await expect(page).toHaveURL(/\/deals\/1$/);
});

test("the invited partner adds a private limit and the agents negotiate", async ({ page }) => {
  const state = await mockApi(page, "invited", "invitee");
  await page.goto("/deals/1");
  await expect(page.getByText("You would be the")).toBeVisible();
  await expect(page.getByText("$20.00")).toHaveCount(0);
  await page.getByLabel("Highest price you'll pay per unit (USD)").fill("25");
  await page.getByLabel("Days until you need the goods").fill("21");
  await page.getByRole("button", { name: "Join and start negotiation" }).click();
  await expect(page.getByRole("heading", { name: "Both people must approve" })).toBeVisible();
  expect(state.accepted).toEqual({ limit_cents: 2500, days: 21 });
  await expect(page.getByRole("button", { name: "Approve these terms" })).toHaveCount(1);
  await expect(page.getByText("Waiting for their signature")).toBeVisible();
});

test("an invitation can be declined after confirming", async ({ page }) => {
  const state = await mockApi(page, "invited", "invitee");
  await page.goto("/deals/1");
  await page.getByRole("button", { name: "Decline" }).click();
  await page.getByRole("button", { name: "Keep it" }).click();
  expect(state.deal.status).toBe("invited");
  await page.getByRole("button", { name: "Decline" }).click();
  await page.getByRole("button", { name: "Yes, decline" }).click();
  await expect(page.getByRole("heading", { name: "You declined this invitation" })).toBeVisible();
});

test("the creator waits for the partner and can cancel the invitation", async ({ page }) => {
  const state = await mockApi(page, "invited", "seller");
  state.deal.buyer_name = "";
  state.deal.buyer_country = "";
  state.deal.invite_email = "buyer@cape.test";
  state.deal.invite_email_status = "not_configured";
  await page.goto("/deals/1");
  await expect(page.getByText("Email isn't set up on this server")).toBeVisible();
  await expect(page.getByText("Your lowest price")).toBeVisible();
  await expect(page.getByText("Next move: buyer@cape.test")).toBeVisible();
  await page.getByRole("button", { name: "Cancel invitation" }).click();
  await page.getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(state.deleted).toBe(true);
});

async function pay(page: Page, kind: "deposit" | "balance") {
  await page.getByRole("button", { name: kind === "deposit" ? "Pay with PayPal" : /Pay .* with PayPal/ }).click();
  await expect(page).toHaveURL(/paypal\.test/);
  await page.getByRole("link", { name: "Approve sandbox payment" }).click();
  await expect(page.getByRole("heading", { name: kind === "deposit" ? "Waiting for the shipment" : "Inspect the goods" })).toBeVisible();
}

async function ship(page: Page) {
  await page.getByLabel("Tracking number").fill("1234567890");
  await page.getByLabel(/Shipping proof/).setInputFiles(proof);
  await page.getByRole("button", { name: "Submit for AI check" }).click();
}

test("complete deal flow with each person doing only their own steps", async ({ page }) => {
  const state = await mockApi(page, "negotiated", "buyer");
  await page.goto("/deals/1");
  await page.getByRole("button", { name: "Approve these terms" }).click();
  await expect(page.getByRole("button", { name: "You approved" })).toBeDisabled();
  await expect(page.getByText("Next move: Chennai Silk House")).toBeVisible();

  await actAs(page, state, "seller");
  await page.getByRole("button", { name: "Approve these terms" }).click();
  await expect(page.getByRole("heading", { name: "Deposit due from the buyer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay with PayPal" })).toHaveCount(0);
  await expect(page.getByText("Waiting for Cape Retail to pay")).toBeVisible();

  await actAs(page, state, "buyer");
  await expect(page.getByRole("heading", { name: "Pay the deposit" })).toBeVisible();
  await pay(page, "deposit");
  await expect(page.getByLabel("Tracking number")).toHaveCount(0);

  await actAs(page, state, "seller");
  await ship(page);
  await expect(page.getByRole("heading", { name: "Balance due from the buyer" })).toBeVisible();

  await actAs(page, state, "buyer");
  await pay(page, "balance");
  await page.getByRole("button", { name: "Submit inspection" }).click();
  await expect(page.getByRole("heading", { name: "Order closed" })).toBeVisible();
  expect(state.captureCount).toBe(2);
  expect(state.inspection).not.toContain('filename=""');
});

test("PayPal cancellation stays visible and checkout can be restarted", async ({ page }) => {
  await mockApi(page, "approved");
  await page.goto("/deals/1");
  await page.getByRole("button", { name: "Pay with PayPal" }).click();
  await page.getByRole("link", { name: "Cancel payment" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("payment was cancelled");
  await expect(page).toHaveURL(/\/deals\/1$/);
  await pay(page, "deposit");
});

test("failed payment capture retains the return link and supports retry", async ({ page }) => {
  const state = await mockApi(page, "approved");
  state.failCapture = true;
  await page.goto("/deals/1?paypal=return&kind=deposit");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("PayPal couldn't complete");
  await expect(page).toHaveURL(/paypal=return/);
  state.failCapture = false;
  await page.getByRole("button", { name: "Retry payment confirmation" }).click();
  await expect(page.getByRole("heading", { name: "Waiting for the shipment" })).toBeVisible();
  await expect(page).toHaveURL(/\/deals\/1$/);
  expect(state.captureCount).toBe(2);
});

test("pending payment blocks a second checkout until confirmation completes", async ({ page }) => {
  const state = await mockApi(page, "approved");
  state.pendingCapture = true;
  await page.goto("/deals/1?paypal=return&kind=deposit");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("still processing");
  await expect(page.getByRole("button", { name: "Pay with PayPal" })).toBeDisabled();
  state.pendingCapture = false;
  await page.getByRole("button", { name: "Retry payment confirmation" }).click();
  await expect(page.getByRole("heading", { name: "Waiting for the shipment" })).toBeVisible();
});

test("deal loading can be retried and malformed return kinds are not captured", async ({ page }) => {
  const state = await mockApi(page);
  state.failLoad = true;
  await page.goto("/deals/1?paypal=return&kind=invalid");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Deal not found");
  state.failLoad = false;
  await page.getByRole("button", { name: "Retry loading deal" }).click();
  await expect(page.getByRole("heading", { name: "Both people must approve" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("return link is invalid");
  expect(state.captureCount).toBe(0);
});

test("shipping rejects excessive, oversized, empty and unsupported files before submitting", async ({ page }) => {
  const state = await mockApi(page, "deposit_paid", "seller");
  await page.goto("/deals/1");
  await page.getByLabel("Tracking number").fill("1234567890");
  const files = page.getByLabel(/Shipping proof/);
  for (const [uploads, message] of [
    [Array.from({ length: 4 }, (_, i) => ({ ...proof, name: `${i}.png` })), "up to 3 files"],
    [[{ ...proof, buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }], "5 MB or less"],
    [[{ ...proof, buffer: Buffer.alloc(0) }], "file is empty"],
    [[{ name: "bad.txt", mimeType: "text/plain", buffer: Buffer.from("bad") }], "choose a JPG"],
  ] as const) {
    await files.setInputFiles([...uploads]);
    await page.getByRole("button", { name: "Submit for AI check" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(message);
    expect(state.shipmentCount).toBe(0);
  }
  await files.setInputFiles(proof);
  await page.getByRole("button", { name: "Submit for AI check" }).click();
  await expect(page.getByRole("heading", { name: "Balance due from the buyer" })).toBeVisible();
});

for (const accept of [true, false]) {
  test(`rejected shipping proof can be ${accept ? "accepted by the buyer" : "resubmitted by the seller"}`, async ({ page }) => {
    const state = await mockApi(page, "deposit_paid", "seller");
    state.rejectProof = true;
    await page.goto("/deals/1");
    await ship(page);
    await expect(page.getByText("Quantity mismatch")).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept this proof anyway" })).toHaveCount(0);
    if (accept) {
      await actAs(page, state, "buyer");
      await expect(page.getByLabel("Tracking number")).toHaveCount(0);
      await page.getByRole("button", { name: "Accept this proof anyway" }).click();
      await expect(page.getByRole("heading", { name: "Pay the balance" })).toBeVisible();
    } else {
      state.rejectProof = false;
      await page.getByRole("button", { name: "Submit for AI check" }).click();
      await expect(page.getByRole("heading", { name: "Balance due from the buyer" })).toBeVisible();
    }
  });
}

for (const approve of [true, false]) {
  test(`inspection validates counts and uploads, then the seller ${approve ? "approves" : "rejects"} the refund`, async ({ page }) => {
    const state = await mockApi(page, "balance_paid", "buyer");
    await page.goto("/deals/1");
    await page.getByLabel("Quantity received").fill("5");
    await page.getByLabel("Quantity damaged").fill("6");
    await page.getByRole("button", { name: "Submit inspection" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("cannot exceed received");
    expect(state.inspectionCount).toBe(0);
    await page.getByLabel("Quantity damaged").fill("1");
    await page.getByLabel(/Delivery photos/).setInputFiles(Array.from({ length: 4 }, (_, i) => ({ ...proof, name: `${i}.png` })));
    await page.getByRole("button", { name: "Submit inspection" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("up to 3 files");
    expect(state.inspectionCount).toBe(0);
    await page.getByLabel(/Delivery photos/).setInputFiles([]);
    await page.getByRole("button", { name: "Submit inspection" }).click();
    await expect(page.getByRole("heading", { name: "Refund suggested to the seller" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve refund" })).toHaveCount(0);

    await actAs(page, state, "seller");
    await expect(page.getByRole("heading", { name: "Review the suggested refund" })).toBeVisible();
    await page.getByRole("button", { name: approve ? "Approve refund" : "Reject", exact: true }).click();
    await expect(page.getByRole("heading", { name: approve ? "Refund sent" : "Claim rejected" })).toBeVisible();
  });
}

test("the seller waits while the buyer inspects", async ({ page }) => {
  await mockApi(page, "balance_paid", "seller");
  await page.goto("/deals/1");
  await expect(page.getByRole("heading", { name: "Delivered. The buyer is counting." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit inspection" })).toHaveCount(0);
});

test("failed negotiation shows only your own limit and a way to start again", async ({ page }) => {
  await mockApi(page, "no_deal", "buyer");
  await page.goto("/deals/1");
  await expect(page.getByRole("heading", { name: "No deal", exact: true })).toBeVisible();
  await expect(page.getByText("Highest price you'd pay")).toBeVisible();
  await expect(page.getByText("$25.00")).toBeVisible();
  await expect(page.getByText("$20.00")).toHaveCount(0);
  await page.getByRole("main").getByRole("link", { name: "Start a new deal" }).click();
  await expect(page.getByRole("heading", { name: "Start a deal" })).toBeVisible();
});

test("dashboard refresh picks up deals created elsewhere and status changes", async ({ page }) => {
  const state = await mockApi(page);
  state.empty = true;
  await page.goto("/dashboard");
  await expect(page.getByText("No deals or invitations yet.")).toBeVisible();
  state.empty = false;
  state.deal.status = "approved";
  await page.getByRole("button", { name: "Refresh deals" }).click();
  await expect(page.getByText("Deposit due", { exact: true })).toBeVisible();
  state.deal.status = "deposit_paid";
  await page.getByRole("button", { name: "Refresh deals" }).click();
  await expect(page.getByText("Waiting for shipment", { exact: true })).toBeVisible();
});

test("deal refresh picks up the other party's approval without submitting actions", async ({ page }) => {
  const state = await mockApi(page, "negotiated", "buyer");
  await page.goto("/deals/1");
  await expect(page.getByRole("heading", { name: "Both people must approve" })).toBeVisible();
  state.deal.seller_approved = true;
  await page.getByRole("button", { name: "Refresh status" }).click();
  await expect(page.getByText("Next move: You")).toBeVisible();
  state.deal.buyer_approved = true;
  state.deal.status = "approved";
  await page.getByRole("button", { name: "Refresh status" }).click();
  await expect(page.getByRole("heading", { name: "Pay the deposit" })).toBeVisible();
  expect(state.captureCount).toBe(0);
  expect(state.createCount).toBe(0);
});

test("refresh preserves shipping inputs and recovers from a failed refresh", async ({ page }) => {
  const state = await mockApi(page, "deposit_paid", "seller");
  await page.goto("/deals/1");
  await page.getByLabel("Tracking number").fill("DHL-DRAFT-123");
  await page.getByRole("combobox", { name: "Carrier", exact: true }).selectOption("UPS");
  await page.getByLabel(/Shipping proof/).setInputFiles(proof);
  state.failLoad = true;
  await page.getByRole("button", { name: "Refresh status" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Deal not found");
  await expect(page.getByLabel("Tracking number")).toHaveValue("DHL-DRAFT-123");
  state.failLoad = false;
  await page.getByRole("button", { name: "Refresh status" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Tracking number")).toHaveValue("DHL-DRAFT-123");
  await expect(page.getByRole("combobox", { name: "Carrier", exact: true })).toHaveValue("UPS");
  expect(await page.getByLabel(/Shipping proof/).evaluate((input: HTMLInputElement) => input.files?.[0]?.name)).toBe("proof.png");
  expect(state.shipmentCount).toBe(0);
});

test("pending refunds are not shown as completed and can be refreshed", async ({ page }) => {
  const state = await mockApi(page, "refunded");
  state.deal.refund_status = "PENDING";
  state.deal.refund_id = "refund-1";
  state.deal.refund_suggested_cents = 22000;
  await page.goto("/dashboard");
  await expect(page.getByText("Refund pending", { exact: true })).toBeVisible();
  await page.getByRole("link").filter({ hasText: "Silk sarees" }).click();
  await expect(page.getByRole("heading", { name: "Refund status", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Refund sent", exact: true })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Deal progress" }).locator('[aria-current="step"]')).toContainText("Inspect");
  state.deal.refund_status = "COMPLETED";
  await page.getByRole("button", { name: "Refresh status" }).click();
  await expect(page.getByRole("heading", { name: "Refund sent", exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByText("Refund pending", { exact: true })).toHaveCount(0);
  expect(state.captureCount).toBe(0);
});

test("original teal styling works across pages and system color preferences", async ({ page }, testInfo) => {
  await mockApi(page);
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  let dashboardBounds: { x: number; width: number } | undefined;
  for (const [name, route] of [["home", "/"], ["dashboard", "/dashboard"], ["new-deal", "/deals/new"], ["deal-room", "/deals/1"]]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (name === "dashboard") await expect(page.getByRole("button", { name: "Refresh deals" })).toBeVisible();
    if (name === "new-deal") await expect(page.getByRole("combobox", { name: "Saved trade partners" })).toBeVisible();
    if (name === "deal-room") await expect(page.getByRole("button", { name: "Approve these terms" })).toBeVisible();

    if (name === "dashboard" || name === "new-deal") {
      const bounds = await page.locator("main").boundingBox();
      expect(bounds).not.toBeNull();

      if (name === "dashboard") {
        dashboardBounds = bounds!;
      } else {
        expect(bounds!.x).toBeCloseTo(dashboardBounds!.x, 0);
        expect(bounds!.width).toBeCloseTo(dashboardBounds!.width, 0);
      }
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const path = testInfo.outputPath(`${name}-light.png`);
    await page.screenshot({ path, fullPage: true });
    await testInfo.attach(`${name}-light`, { path, contentType: "image/png" });
  }
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#background-particles")).toHaveCount(0);
  await expect(page.getByText("Example route", { exact: false })).toHaveCount(0);
  await expect(page.getByText("India", { exact: true })).toHaveCount(0);
  await expect(page.getByText("South Africa", { exact: true })).toHaveCount(0);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(16, 31, 37)");
  await page.screenshot({ path: testInfo.outputPath("home-system-dark.png"), fullPage: true });
  await page.goto("/deals/1");
  await page.getByRole("button", { name: "Approve these terms" }).click();
  await expect(page.getByRole("button", { name: "You approved" })).toBeDisabled();
  await expect(page.getByRole("list", { name: "Deal progress" }).locator('[aria-current="step"]')).toContainText("Approve");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(16, 31, 37)");
  await page.screenshot({ path: testInfo.outputPath("deal-room-system-dark.png"), fullPage: true });
});


test("carrier updates move the shipment to delivery before inspection", async ({ page }) => {
  const state = await mockApi(page, "balance_paid", "seller");
  state.deal.delivered = false;
  state.deal.carrier = "DHL";
  state.deal.tracking_number = "1234567890";
  state.deal.events = [{ stage: 0, kind: "update", title: "Picked up by carrier", location: "India, seller warehouse", day: 0, note: null }];
  state.deal.watcher = {
    level: "on_track", agreed_day: 18, projected_day: 18, deadline_day: 21, delay_days: 0, missed_deadline: false,
    summary: "The shipment is on schedule.", buyer_message: "On time.", seller_message: "On time.", action: "No action needed.",
    mode: "rule_based", next_milestone: "Departed origin port",
  };
  state.deal.evidence = [{ id: 7, stage: "shipment", original_name: "receipt.pdf", content_type: "application/pdf", size_bytes: 2048, url: "/api/deals/1/evidence/7" }];
  state.deal.activity = [{ actor: "seller", message: "Submitted 1 proof file(s).", created_at: "2026-11-07T08:00:00" }];
  await page.goto("/deals/1");

  await expect(page.getByRole("heading", { name: "Waiting for delivery" })).toBeVisible();
  await expect(page.getByText("In transit", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Shipping proof: receipt.pdf" })).toHaveAttribute("href", /\/api\/deals\/1\/evidence\/7$/);
  await expect(page.getByText("Submitted 1 proof file(s).")).toBeVisible();
  await expect(page.getByText("Deal TC-TEST2345")).toBeVisible();

  await page.getByLabel("Note (optional)").fill("Held for customs paperwork");
  await page.getByLabel("Delay (days)").fill("4");
  await page.getByRole("button", { name: "Report delay" }).click();
  await expect(page.getByText("Note: Held for customs paperwork")).toBeVisible();
  expect(state.trackingUpdates[0]).toEqual({ kind: "delay", delay_days: 4, note: "Held for customs paperwork" });

  for (let index = 0; index < 6; index++) {
    await page.getByRole("button", { name: /^Record:/ }).click();
    await expect(page.getByText(`Day ${(index + 1) * 3}:`)).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Delivered. The buyer is counting." })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Record:/ })).toHaveCount(0);
  expect(state.trackingUpdates).toHaveLength(7);
});

test("guide explains the steps and answers common questions", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/\/guide$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How TrustCargo works");

  const steps = page.getByRole("list", { name: "Deal steps" });
  await expect(steps.getByRole("button")).toHaveCount(8);
  await steps.getByRole("button", { name: /Track/ }).click();
  await expect(page.getByRole("heading", { name: "Track", level: 3 })).toBeVisible();
  await expect(page.getByText("A ship moves along the route.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByRole("heading", { name: "Inspect", level: 3 })).toBeVisible();

  const question = page.getByRole("button", { name: "Is this real money?" });
  await question.click();
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Payments run in the PayPal sandbox", { exact: false })).toBeVisible();

  await page.getByRole("link", { name: "Start your first deal" }).click();
  await expect(page).toHaveURL(/\/deals\/new$/);
});

test("bills reached so far can be downloaded", async ({ page }) => {
  const state = await mockApi(page, "approved");
  state.deal.documents = [
    { kind: "agreement", title: "Trade agreement", url: "/api/deals/1/documents/agreement.pdf" },
    { kind: "deposit", title: "Deposit invoice", url: "/api/deals/1/documents/deposit.pdf" },
  ];
  await page.goto("/deals/1");

  const bar = page.getByRole("region", { name: "Documents" });
  await expect(bar.getByRole("link")).toHaveCount(2);
  await expect(bar.getByRole("link", { name: /Trade agreement/ })).toHaveAttribute("href", /\/api\/deals\/1\/documents\/agreement\.pdf$/);
  await expect(bar.getByRole("link", { name: /Deposit invoice/ })).toHaveAttribute("download", "");
  await expect(page.getByRole("link", { name: "Download deposit invoice" })).toBeVisible();
});
