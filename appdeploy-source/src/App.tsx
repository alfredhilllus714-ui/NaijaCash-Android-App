import { useEffect, useMemo, useState } from 'react';
import { auth, api } from '@appdeploy/client';
import type { AuthUser } from '@appdeploy/client';
import {
  Search,
  Plus,
  ShoppingBag,
  Store,
  LogIn,
  LogOut,
  Star,
  MapPin,
  X,
  ShieldCheck,
  Wallet,
  Sparkles,
  MessageCircle,
} from 'lucide-react';

type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  location: string;
  sellerName: string;
  sellerId: string;
  createdAt: string;
  featured?: boolean;
};
const categories = [
  'All',
  'Electronics',
  'Fashion',
  'Home',
  'Phones',
  'Beauty',
  'Food',
  'Services',
  'Other',
];
const money = (n: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
const demo: Listing[] = [
  {
    id: 'sample-1',
    title: 'Quality Android smartphone',
    description: 'Clean device, good battery and ready for a new owner.',
    category: 'Phones',
    price: 85000,
    location: 'Ado-Odo, Ogun',
    sellerName: 'Demo seller',
    sellerId: 'demo',
    createdAt: '2026-11-15',
    featured: true,
  },
  {
    id: 'sample-2',
    title: 'Unisex sneakers',
    description: 'Comfortable everyday sneakers. Several sizes available.',
    category: 'Fashion',
    price: 22000,
    location: 'Lagos',
    sellerName: 'Demo seller',
    sellerId: 'demo',
    createdAt: '2026-11-15',
  },
  {
    id: 'sample-3',
    title: 'Home delivery and errands',
    description:
      'Local errands and delivery service. Contact seller to arrange.',
    category: 'Services',
    price: 5000,
    location: 'Ogun State',
    sellerName: 'Demo seller',
    sellerId: 'demo',
    createdAt: '2026-11-15',
  },
];

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [listings, setListings] = useState<Listing[]>(demo);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'market' | 'sell' | 'mine'>('market');
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiMode, setAiMode] = useState<'seller' | 'buyer'>('buyer');
  const [aiInput, setAiInput] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Electronics',
    price: '',
    location: '',
    sellerName: '',
  });

  async function loadListings() {
    try {
      const res = await api.get('/api/listings');
      if (Array.isArray(res.data?.items)) setListings(res.data.items);
    } catch {
      setNotice(
        'Could not refresh listings. Showing sample listings until the connection returns.'
      );
    }
  }
  useEffect(() => {
    auth
      .getUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setAuthReady(true));
    loadListings();
  }, []);
  const visible = useMemo(
    () =>
      listings.filter(
        x =>
          (category === 'All' || x.category === category) &&
          (view !== 'mine' || x.sellerId === user?.userId) &&
          (x.title + ' ' + x.description + ' ' + x.location + ' ' + x.category)
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [listings, category, search, view, user]
  );
  async function signIn() {
    try {
      await auth.signInWithRedirect();
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : 'Sign-in could not start. Please try again.'
      );
    }
  }
  async function signOut() {
    await auth.signOut();
    setUser(null);
    setView('market');
  }
  async function runAi(mode: 'seller' | 'buyer', promptText: string) {
    if (!promptText.trim()) {
      setNotice(mode === 'seller' ? 'Enter a product name and a few details first.' : 'Tell the shopping assistant what you need.');
      return;
    }
    setAiBusy(true);
    setAiOutput('');
    try {
      const response = await api.post('/api/ai/help', { mode, prompt: promptText.trim(), category: form.category });
      const answer = String(response.data?.answer || '').trim();
      if (!answer) throw new Error('The AI assistant returned an empty answer. Please try again.');
      if (mode === 'seller') setForm(current => ({ ...current, description: answer.slice(0, 700) }));
      setAiOutput(answer);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'AI helper is temporarily unavailable. Please try again.');
    } finally {
      setAiBusy(false);
    }
  }
  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setNotice('Sign in before publishing a listing.');
      return;
    }
    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.location.trim() ||
      !form.sellerName.trim() ||
      Number(form.price) <= 0
    ) {
      setNotice('Complete every field and enter a price greater than zero.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/listings', { ...form, price: Number(form.price) });
      setForm({
        title: '',
        description: '',
        category: 'Electronics',
        price: '',
        location: '',
        sellerName: '',
      });
      setModal(false);
      setView('mine');
      setNotice('Your listing is published.');
      await loadListings();
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : 'Could not publish listing. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  }
  async function feature(id: string) {
    if (!user) {
      setNotice('Sign in to request featured placement.');
      return;
    }
    try {
      const r = await api.post('/api/promotions', { listingId: id });
      setNotice(
        r.data?.message || 'Featured placement request recorded as pending.'
      );
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : 'Could not create promotion request.'
      );
    }
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={() => {
            setView('market');
            setCategory('All');
          }}
        >
          <span className="brand-mark">N</span>
          <span>
            Naija<span className="brand-accent">Cash</span>
          </span>
        </a>
        <div className="top-search">
          <Search size={18} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products, services, location..."
          />
        </div>
        <div className="top-actions">
          {user ? (
            <>
              <span className="user-label">
                {user.name || user.email || 'Seller account'}
              </span>
              <button className="icon-btn" onClick={signOut} title="Sign out">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button className="sign-btn" onClick={signIn} disabled={!authReady}>
              <LogIn size={17} /> Sign in
            </button>
          )}
        </div>
      </header>
      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">BUY • SELL • GROW</div>
            <h1>
              Your next great deal
              <br />
              <em>is closer than you think.</em>
            </h1>
            <p>Discover products and services from sellers across Nigeria.</p>
            <div className="hero-buttons">
              <button
                className="primary-btn"
                onClick={() => {
                  setView('market');
                  document
                    .getElementById('market')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Explore marketplace
              </button>
              <button
                className="light-btn"
                onClick={() => (user ? setModal(true) : signIn())}
              >
                <Plus size={17} /> Start selling
              </button>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-circle">
              <ShoppingBag size={86} />
            </div>
            <div className="floating-tag tag-one">₦ Great deals</div>
            <div className="floating-tag tag-two">Made for Nigeria 🇳🇬</div>
          </div>
        </section>
        <section className="stats">
          <div>
            <strong>{listings.length}+</strong>
            <span>Listings shown</span>
          </div>
          <div>
            <strong>36</strong>
            <span>States welcome</span>
          </div>
          <div>
            <strong>₦</strong>
            <span>Prices in Naira</span>
          </div>
        </section>
        <section className="ai-tools">
          <div className="ai-tools-heading">
            <div className="eyebrow dark">SMART SHOPPING TOOLS</div>
            <h2>NaijaCash AI Assistant</h2>
            <p>Get help finding the right product or writing a clear listing.</p>
          </div>
          <div className="ai-card">
            <div className="ai-card-title"><MessageCircle size={20} /><strong>Buyer shopping assistant</strong></div>
            <p>Describe what you want, your budget and your location. The assistant will suggest what to look for and useful search terms.</p>
            <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="Example: I need a reliable Android phone under ₦150,000 in Lagos..." maxLength={1200} />
            <button className="primary-btn" disabled={aiBusy} onClick={() => runAi('buyer', aiInput)}><Sparkles size={16} /> {aiBusy ? 'Thinking...' : 'Help me find a product'}</button>
            {aiOutput && aiMode === 'buyer' && <div className="ai-answer">{aiOutput}</div>}
          </div>
        </section>
        <section id="market" className="market-section">
          <div className="section-head">
            <div>
              <div className="eyebrow dark">THE MARKETPLACE</div>
              <h2>{view === 'mine' ? 'My listings' : 'Find what you need'}</h2>
            </div>
            <button
              className="primary-btn sell-cta"
              onClick={() => (user ? setModal(true) : signIn())}
            >
              <Plus size={17} /> Post a listing
            </button>
          </div>
          <div className="tabs">
            <button
              className={view === 'market' ? 'active' : ''}
              onClick={() => setView('market')}
            >
              Explore
            </button>
            {user && (
              <button
                className={view === 'mine' ? 'active' : ''}
                onClick={() => setView('mine')}
              >
                My listings
              </button>
            )}
          </div>
          <div className="category-row">
            {categories.map(c => (
              <button
                key={c}
                className={category === c ? 'selected' : ''}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <div className="empty">
              <Store size={34} />
              <h3>No listings found</h3>
              <p>Try another search or category, or be the first to post.</p>
              <button
                className="primary-btn"
                onClick={() => (user ? setModal(true) : signIn())}
              >
                Post a listing
              </button>
            </div>
          ) : (
            <div className="listing-grid">
              {visible.map(item => (
                <article className="listing-card" key={item.id}>
                  <div className="product-art">
                    <span>{item.category}</span>
                    <ShoppingBag size={42} />
                    {item.featured && <b>FEATURED</b>}
                  </div>
                  <div className="listing-body">
                    <div className="price">{money(item.price)}</div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className="listing-meta">
                      <span>
                        <MapPin size={13} />
                        {item.location}
                      </span>
                      <span>{item.sellerName}</span>
                    </div>
                    <button
                      className="outline-btn"
                      onClick={() =>
                        setNotice(
                          'Contact the seller through the details they provide. In-app chat and escrow are not enabled yet.'
                        )
                      }
                    >
                      View seller details
                    </button>
                    {user?.userId === item.sellerId && (
                      <button
                        className="feature-btn"
                        onClick={() => feature(item.id)}
                      >
                        <Star size={15} /> Request featured placement · ₦1,500
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="earn">
          <div className="earn-icon">
            <Wallet size={28} />
          </div>
          <div>
            <h2>Grow your business on NaijaCash</h2>
            <p>
              Publish your products for free. Request a featured spot to reach
              more buyers.
            </p>
          </div>
          <button
            className="light-btn"
            onClick={() => (user ? setModal(true) : signIn())}
          >
            Become a seller <Plus size={16} />
          </button>
        </section>
        <section className="how">
          <div className="eyebrow dark">SIMPLE AND STRAIGHTFORWARD</div>
          <h2>How NaijaCash works</h2>
          <div className="how-grid">
            <div>
              <b>01</b>
              <h3>Discover</h3>
              <p>Search products and services by category and location.</p>
            </div>
            <div>
              <b>02</b>
              <h3>List your offer</h3>
              <p>Sign in and publish a clear listing with a Naira price.</p>
            </div>
            <div>
              <b>03</b>
              <h3>Promote</h3>
              <p>
                Request featured placement to put your listing in the spotlight.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer>
        <a className="brand" href="#">
          <span className="brand-mark">N</span>
          <span>
            Naija<span className="brand-accent">Cash</span>
          </span>
        </a>
        <span>Made for Nigerian buyers and sellers.</span>
        <span>Trade carefully. Verify goods and sellers before payment.</span>
        <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy policy</a>
      </footer>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <form
            className="modal"
            onSubmit={publish}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <div className="eyebrow dark">SELL ON NAIJACASH</div>
                <h2>Post a listing</h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setModal(false)}
              >
                <X />
              </button>
            </div>
            <label>
              Product or service name
              <input
                required
                maxLength={90}
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Samsung Galaxy phone"
              />
            </label>
            <label>
              Description
              <textarea
                required
                maxLength={700}
                value={form.description}
                onChange={e =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe condition, features or service..."
              />
              <button type="button" className="ai-inline-btn" disabled={aiBusy || !form.title.trim()} onClick={() => runAi('seller', `Write an honest, attractive marketplace description for: ${form.title}. Category: ${form.category}. Seller details: ${form.description || 'No extra details supplied. Do not invent specifications, condition, warranty or delivery promises.'}. Keep it concise and ask buyers to confirm details.`)}><Sparkles size={15} /> {aiBusy ? 'Writing...' : 'Write description with AI'}</button>
              {aiOutput && aiMode === 'seller' && <small className="ai-hint">AI draft inserted. Review it and correct any details before publishing.</small>}
            </label>
            <div className="form-row">
              <label>
                Category
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  {categories.slice(1).map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Price (₦)
                <input
                  required
                  type="number"
                  min="1"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  placeholder="25000"
                />
              </label>
            </div>
            <label>
              Your display name
              <input
                required
                maxLength={60}
                value={form.sellerName}
                onChange={e => setForm({ ...form, sellerName: e.target.value })}
                placeholder="Name buyers will see"
              />
            </label>
            <label>
              Location
              <input
                required
                maxLength={100}
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="Town, State"
              />
            </label>
            <button className="primary-btn full" disabled={busy}>
              {busy ? 'Publishing...' : 'Publish listing'}
            </button>
            <small>
              Publishing is free. Featured placement costs ₦1,500; payment
              collection will be activated after a payment provider is
              connected.
            </small>
          </form>
        </div>
      )}
      <div className="trust-note">
        <ShieldCheck size={14} /> Stay safe: meet in public places and never pay
        before verifying a seller.
      </div>
    </div>
  );
}
