import { router, json, error, db, requireAuth, ai } from '@appdeploy/sdk';

type ListingInput = {
  title?: string;
  description?: string;
  category?: string;
  price?: number;
  location?: string;
  sellerName?: string;
};
const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ ok: true, app: 'NaijaCash' })],
  'POST /api/ai/help': [
    async ctx => {
      const body = (ctx.body || {}) as { mode?: string; prompt?: string; category?: string };
      const mode = body.mode === 'seller' ? 'seller' : body.mode === 'buyer' ? 'buyer' : '';
      const prompt = clean(body.prompt, 1200);
      const category = clean(body.category, 40);
      if (!mode || !prompt) return error('Choose a valid AI task and enter some details.', 400);
      try {
        const system = mode === 'seller'
          ? 'You help Nigerian marketplace sellers write truthful, clear product listings. Never invent product specifications, condition, warranty, certifications, delivery, stock or seller claims. If details are missing, use cautious wording and remind the seller to verify the draft.'
          : 'You are a helpful Nigerian shopping assistant. Help buyers clarify needs, compare features and make safer buying decisions. Never claim you searched live listings or verified stock/prices. Encourage buyers to compare actual listings and verify sellers before paying.';
        const result = await ai.generate({
          system,
          prompt: mode === 'seller'
            ? 'Create a concise, appealing listing description in plain text. Category: ' + category + '. Seller details: ' + prompt
            : 'Help this buyer decide what to search for. Give practical criteria, a reasonable checklist and suggested marketplace search terms. Do not invent live listings. Buyer request: ' + prompt,
          maxTokens: 450,
          thinkingMode: 'FAST',
        });
        const answer = clean(result.text, 3000);
        if (!answer) return error('The AI assistant could not prepare an answer. Please try again.', 502);
        return json({ answer });
      } catch (e) {
        console.error('NaijaCash AI request failed', e);
        return error('AI helper is temporarily unavailable. Please try again shortly.', 503);
      }
    },
  ],
  'GET /api/listings': [
    async () => {
      const page = await db.list('listings', { limit: 100 });
      return json({
        items: page.items.sort(
          (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))
        ),
      });
    },
  ],
  'POST /api/listings': [
    requireAuth(),
    async ctx => {
      const body = (ctx.body || {}) as ListingInput;
      const title = clean(body.title, 90);
      const description = clean(body.description, 700);
      const category = clean(body.category, 40);
      const location = clean(body.location, 100);
      const sellerName = clean(body.sellerName, 60);
      const price = Number(body.price);
      if (!title || !description || !category || !location || !sellerName ||
          !Number.isFinite(price) || price <= 0 || price > 100000000000)
        return error('Please provide valid listing details and a positive Naira price.', 400);
      const record = {
        title, description, category, location, sellerName, price,
        sellerId: ctx.user!.userId,
        createdAt: new Date().toISOString(),
        featured: false,
      };
      const [id] = await db.add('listings', [record]);
      if (!id) return error('Could not save listing. Please try again.', 503);
      return json({ id, ...record }, 201);
    },
  ],
  'POST /api/promotions': [
    requireAuth(),
    async ctx => {
      const body = (ctx.body || {}) as { listingId?: string };
      const listingId = clean(body.listingId, 128);
      if (!listingId) return error('A listing is required.', 400);
      const [listing] = await db.get<{ sellerId: string; title: string }>('listings', [listingId]);
      if (!listing || listing.sellerId !== ctx.user!.userId)
        return error('Listing not found or not owned by your account.', 404);
      const [id] = await db.add('promotions', [{
        listingId, sellerId: ctx.user!.userId, amountNgn: 1500,
        status: 'payment_setup_required', createdAt: new Date().toISOString(),
      }]);
      if (!id) return error('Could not record promotion request.', 503);
      return json({
        id, status: 'payment_setup_required',
        message: 'Your featured-placement request is recorded. The ₦1,500 payment gateway is not connected yet, so no payment has been taken and the listing is not yet promoted.',
      }, 201);
    },
  ],
});