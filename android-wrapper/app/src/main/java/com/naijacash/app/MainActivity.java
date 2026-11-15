package com.naijacash.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String BASE = "https://naijacash-14ydi7.v2.appdeploy.ai";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final List<JSONObject> listings = new ArrayList<>();
    private LinearLayout content;
    private LinearLayout categoryBar;
    private EditText searchBox;
    private String selectedCategory = "All";
    private String searchText = "";
    private TextView countLabel;
    private AdView bannerAd;
    private AdView contentBannerAd;
    private SharedPreferences shoppingPrefs;
    private final Set<String> wishlist = new HashSet<>();
    private final Set<String> cart = new HashSet<>();

    private final String[] categories = {"All", "Electronics", "Fashion", "Home", "Phones", "Beauty", "Food", "Services", "Other"};

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        getWindow().setStatusBarColor(Color.rgb(7, 75, 48));
        getWindow().setNavigationBarColor(Color.rgb(255,255,255));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        shoppingPrefs = getSharedPreferences("shopping", MODE_PRIVATE);
        wishlist.addAll(shoppingPrefs.getStringSet("wishlist", new HashSet<>()));
        cart.addAll(shoppingPrefs.getStringSet("cart", new HashSet<>()));
        buildScreen();
        MobileAds.initialize(this, status -> runOnUiThread(this::loadBannerAd));
        loadListings();
    }

    private int dp(float value) { return (int)(value * getResources().getDisplayMetrics().density + 0.5f); }

    private GradientDrawable shape(int color, int radius, int strokeColor) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color); d.setCornerRadius(dp(radius));
        if (strokeColor != 0) d.setStroke(dp(1), strokeColor);
        return d;
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value); t.setTextSize(size); t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return t;
    }

    private LinearLayout vertical() {
        LinearLayout l = new LinearLayout(this); l.setOrientation(LinearLayout.VERTICAL); return l;
    }

    private void buildScreen() {
        LinearLayout root = vertical(); root.setBackgroundColor(Color.rgb(248,251,248));
        setContentView(root);

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL); header.setPadding(dp(18), dp(12), dp(18), dp(12));
        header.setBackgroundColor(Color.WHITE);
        TextView logo = text("N", 22, Color.WHITE, true);
        logo.setGravity(Gravity.CENTER); logo.setBackground(shape(Color.rgb(8,137,83), 12, 0));
        header.addView(logo, new LinearLayout.LayoutParams(dp(42), dp(42)));
        TextView brand = text("  NaijaCash", 22, Color.rgb(22,57,39), true);
        header.addView(brand, new LinearLayout.LayoutParams(0, -2, 1));
        TextView refresh = text("↻", 28, Color.rgb(8,137,83), true);
        refresh.setGravity(Gravity.CENTER); refresh.setOnClickListener(v -> loadListings());
        header.addView(refresh, new LinearLayout.LayoutParams(dp(44), dp(44)));
        root.addView(header);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        content = vertical(); content.setPadding(dp(16), dp(18), dp(16), dp(24));
        scroll.addView(content);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        LinearLayout nav = new LinearLayout(this); nav.setGravity(Gravity.CENTER);
        nav.setBackgroundColor(Color.WHITE); nav.setElevation(dp(8));
        String[] navItems = {"⌂\nExplore", "＋\nSell", "◉\nAccount"};
        for (int i=0;i<navItems.length;i++) {
            final int index=i;
            TextView item=text(navItems[i],13, i==0?Color.rgb(8,137,83):Color.rgb(100,115,105),true);
            item.setGravity(Gravity.CENTER); item.setPadding(0,dp(10),0,dp(10));
            item.setOnClickListener(v -> onNav(index));
            nav.addView(item,new LinearLayout.LayoutParams(0,dp(58),1));
        }
        root.addView(nav);
        renderContent();
    }

    private AdView createBanner(String unitId) {
        AdView ad = new AdView(this);
        ad.setAdUnitId(unitId);
        int widthDp = (int) (getResources().getDisplayMetrics().widthPixels / getResources().getDisplayMetrics().density);
        ad.setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(this, Math.max(320, widthDp)));
        ad.loadAd(new AdRequest.Builder().build());
        return ad;
    }

    private void loadBannerAd() {
        if (isFinishing()) return;
        try {
            LinearLayout root = (LinearLayout) ((ViewGroup) findViewById(android.R.id.content)).getChildAt(0);
            if (bannerAd == null) {
                bannerAd = createBanner("ca-app-pub-5661872411693118/8164378048");
                int navIndex = root.getChildCount() - 1;
                root.addView(bannerAd, navIndex, new LinearLayout.LayoutParams(-1, -2));
            }
            if (contentBannerAd == null) {
                contentBannerAd = createBanner("ca-app-pub-5661872411693118/7393175677");
            }
            attachContentBanner();
        } catch (Exception e) {
            if (bannerAd != null) { bannerAd.destroy(); bannerAd = null; }
            if (contentBannerAd != null) { contentBannerAd.destroy(); contentBannerAd = null; }
        }
    }

    private void attachContentBanner() {
        if (content == null || contentBannerAd == null) return;
        ViewGroup parent = (ViewGroup) contentBannerAd.getParent();
        if (parent != null) parent.removeView(contentBannerAd);
        int insertAt = Math.min(2, content.getChildCount());
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.setMargins(0, dp(12), 0, dp(8));
        content.addView(contentBannerAd, insertAt, params);
    }

    private void onNav(int index) {
        if(index==0) { renderContent(); return; }
        if(index==1) new AlertDialog.Builder(this).setTitle("Start selling")
            .setMessage("Secure account sign-in and native listing publishing are being connected. Your marketplace listings remain available to browse.")
            .setPositiveButton("Open NaijaCash", (d,w)->openWebsite()).setNegativeButton("Cancel",null).show();
        else new AlertDialog.Builder(this).setTitle("NaijaCash account")
            .setMessage("Sign in securely on the NaijaCash website. Native account connection is being completed.")
            .setPositiveButton("Sign in", (d,w)->openWebsite()).setNegativeButton("Cancel",null).show();
    }

    private void openWebsite() {
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(BASE))); }
        catch(Exception e) { Toast.makeText(this,"Could not open sign-in page.",Toast.LENGTH_SHORT).show(); }
    }

    private void renderContent() {
        if(content==null) return;
        content.removeAllViews();
        LinearLayout hero=vertical(); hero.setPadding(dp(16),dp(18),dp(16),dp(18));
        hero.setBackground(shape(Color.rgb(7,75,48),20,0));
        TextView eyebrow=text("BUY  •  SELL  •  GROW",11,Color.rgb(183,237,204),true);
        hero.addView(eyebrow);
        TextView title=text("Your next great deal\nis closer than you think.",27,Color.WHITE,true);
        title.setPadding(0,dp(12),0,dp(8)); hero.addView(title);
        TextView subtitle=text("Discover products and services across Nigeria.",14,Color.rgb(225,242,231),false);
        hero.addView(subtitle); content.addView(hero);

        LinearLayout shopPanel=vertical(); shopPanel.setPadding(dp(14),dp(14),dp(14),dp(14)); shopPanel.setBackground(shape(Color.WHITE,16,Color.rgb(225,237,228)));
        TextView shopTitle=text("Shop smarter",18,Color.rgb(28,58,40),true); shopPanel.addView(shopTitle);
        TextView shopSummary=text("🛒 Cart: "+cart.size()+" items     ♡ Saved: "+wishlist.size(),13,Color.rgb(8,137,83),true); shopSummary.setPadding(0,dp(8),0,0); shopPanel.addView(shopSummary);
        TextView shopHint=text("Add products to your cart or save favourites for later.",12,Color.GRAY,false); shopHint.setPadding(0,dp(5),0,0); shopPanel.addView(shopHint);
        LinearLayout.LayoutParams shopParams=new LinearLayout.LayoutParams(-1,-2); shopParams.setMargins(0,dp(12),0,0); content.addView(shopPanel,shopParams);
        attachContentBanner();

        searchBox=new EditText(this); searchBox.setSingleLine(true);
        searchBox.setTextSize(14); searchBox.setHint("Search products, services, location...");
        searchBox.setPadding(dp(14),0,dp(14),0); searchBox.setBackground(shape(Color.WHITE,12,Color.rgb(225,235,227)));
        LinearLayout.LayoutParams sp=new LinearLayout.LayoutParams(-1,dp(50)); sp.setMargins(0,dp(18),0,dp(16));
        content.addView(searchBox,sp);
        searchBox.addTextChangedListener(new android.text.TextWatcher(){
            public void beforeTextChanged(CharSequence s,int st,int c,int a){}
            public void onTextChanged(CharSequence s,int st,int before,int count){searchText=s.toString();renderListings();}
            public void afterTextChanged(android.text.Editable e){}
        });

        TextView heading=text("Browse categories",18,Color.rgb(28,58,40),true);
        content.addView(heading);
        HorizontalScrollView hsv=new HorizontalScrollView(this); hsv.setHorizontalScrollBarEnabled(false);
        categoryBar=new LinearLayout(this); categoryBar.setPadding(0,dp(12),0,dp(16));
        hsv.addView(categoryBar); content.addView(hsv); renderCategories();

        LinearLayout row=new LinearLayout(this); row.setGravity(Gravity.CENTER_VERTICAL);
        TextView products=text("Popular listings",20,Color.rgb(28,58,40),true);
        row.addView(products,new LinearLayout.LayoutParams(0,-2,1));
        countLabel=text("Loading…",12,Color.GRAY,false); row.addView(countLabel);
        LinearLayout.LayoutParams rp=new LinearLayout.LayoutParams(-1,-2); rp.setMargins(0,0,0,dp(12));
        content.addView(row,rp);

        LinearLayout listingHolder=vertical(); listingHolder.setTag("listingHolder");
        content.addView(listingHolder);
        TextView safety=text("🔒  Stay safe: verify goods and sellers before making payment.",12,Color.rgb(85,111,94),false);
        safety.setPadding(dp(12),dp(16),dp(12),dp(10)); content.addView(safety);
        renderListings();
    }

    private void renderCategories() {
        categoryBar.removeAllViews();
        for(String category:categories) {
            TextView chip=text(category,13,category.equals(selectedCategory)?Color.WHITE:Color.rgb(67,91,75),true);
            chip.setGravity(Gravity.CENTER); chip.setPadding(dp(15),dp(10),dp(15),dp(10));
            chip.setBackground(shape(category.equals(selectedCategory)?Color.rgb(8,137,83):Color.WHITE,24,Color.rgb(220,232,223)));
            LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-2,-2); p.setMargins(0,0,dp(8),0);
            categoryBar.addView(chip,p);
            chip.setOnClickListener(v->{selectedCategory=category;renderCategories();renderListings();});
        }
    }

    private void renderListings() {
        if(content==null) return;
        LinearLayout holder=(LinearLayout)content.findViewWithTag("listingHolder");
        if(holder==null) return;
        holder.removeAllViews();
        int shown=0;
        for(JSONObject item:listings) {
            String category=item.optString("category","Other");
            String searchable=(item.optString("title")+" "+item.optString("description")+" "+item.optString("location")+" "+category).toLowerCase(Locale.ROOT);
            if(!selectedCategory.equals("All")&&!selectedCategory.equalsIgnoreCase(category)) continue;
            if(!searchable.contains(searchText.toLowerCase(Locale.ROOT))) continue;
            holder.addView(listingCard(item)); shown++;
        }
        countLabel.setText(shown+" found");
        if(shown==0) {
            TextView empty=text(listings.isEmpty()?"No listings loaded yet. Pull refresh above to try again.":"No matching listings. Try another category or search.",14,Color.GRAY,false);
            empty.setPadding(dp(12),dp(28),dp(12),dp(28)); holder.addView(empty);
        }
    }

    private View listingCard(JSONObject item) {
        LinearLayout card=vertical(); card.setPadding(dp(16),dp(15),dp(16),dp(15));
        card.setBackground(shape(Color.WHITE,16,Color.rgb(229,237,230)));
        LinearLayout.LayoutParams cp=new LinearLayout.LayoutParams(-1,-2); cp.setMargins(0,0,0,dp(12));
        TextView category=text(item.optString("category","Marketplace"),11,Color.rgb(8,137,83),true);
        card.addView(category);
        TextView name=text(item.optString("title","Untitled listing"),18,Color.rgb(27,54,38),true);
        name.setPadding(0,dp(7),0,dp(5)); card.addView(name);
        TextView price=text(money(item.optDouble("price",0)),19,Color.rgb(8,137,83),true);
        card.addView(price);
        TextView desc=text(item.optString("description",""),13,Color.rgb(91,108,96),false);
        desc.setPadding(0,dp(8),0,dp(8)); card.addView(desc);
        TextView meta=text("⌖  "+item.optString("location","Nigeria")+"     •     "+item.optString("sellerName","Seller"),12,Color.GRAY,false);
        card.addView(meta);
        Button details=new Button(this); details.setText("View details"); details.setTextSize(12);
        details.setTextColor(Color.rgb(8,115,69)); details.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(233,247,238)));
        details.setOnClickListener(v->new AlertDialog.Builder(this).setTitle(item.optString("title"))
            .setMessage(money(item.optDouble("price",0))+"\n\n"+item.optString("description")+"\n\nLocation: "+item.optString("location")+"\nSeller: "+item.optString("sellerName")+"\n\nContact the seller through the details they provide and verify before payment.")
            .setPositiveButton("OK",null).show());
        card.addView(details);
        LinearLayout actions=new LinearLayout(this); actions.setGravity(Gravity.CENTER_VERTICAL); actions.setOrientation(LinearLayout.HORIZONTAL);
        Button add=new Button(this); add.setText(cart.contains(item.optString("id"))?"In cart":"Add to cart"); add.setTextSize(11);
        add.setOnClickListener(v->{String id=item.optString("id"); if(id.isEmpty()) id=item.optString("_id",item.optString("title")); cart.add(id); shoppingPrefs.edit().putStringSet("cart",new HashSet<>(cart)).apply(); add.setText("In cart"); Toast.makeText(this,"Added to cart",Toast.LENGTH_SHORT).show();});
        actions.addView(add,new LinearLayout.LayoutParams(0,dp(46),1));
        Button save=new Button(this); String productId=item.optString("id"); if(productId.isEmpty()) productId=item.optString("_id",item.optString("title"));
        save.setText(wishlist.contains(productId)?"♥ Saved":"♡ Save"); save.setTextSize(11);
        final String savedId=productId;
        save.setOnClickListener(v->{if(wishlist.contains(savedId)){wishlist.remove(savedId);save.setText("♡ Save");}else{wishlist.add(savedId);save.setText("♥ Saved");}shoppingPrefs.edit().putStringSet("wishlist",new HashSet<>(wishlist)).apply();Toast.makeText(this,"Wishlist updated",Toast.LENGTH_SHORT).show();});
        actions.addView(save,new LinearLayout.LayoutParams(0,dp(46),1));
        card.addView(actions);
        card.setLayoutParams(cp); return card;
    }

    private String money(double amount) {
        NumberFormat f=NumberFormat.getNumberInstance(Locale.US); f.setMaximumFractionDigits(0);
        return "₦"+f.format(amount);
    }

    private void loadListings() {
        Toast.makeText(this,"Refreshing marketplace…",Toast.LENGTH_SHORT).show();
        executor.execute(()->{
            HttpURLConnection connection=null;
            try {
                connection=(HttpURLConnection)new URL(BASE+"/api/listings").openConnection();
                connection.setRequestMethod("GET"); connection.setConnectTimeout(15000); connection.setReadTimeout(15000);
                connection.setRequestProperty("Accept","application/json");
                InputStream stream=connection.getResponseCode()<400?connection.getInputStream():connection.getErrorStream();
                BufferedReader reader=new BufferedReader(new InputStreamReader(stream,"UTF-8"));
                StringBuilder body=new StringBuilder(); String line;
                while((line=reader.readLine())!=null) body.append(line);
                reader.close();
                JSONObject response=new JSONObject(body.toString());
                JSONArray items=response.optJSONArray("items");
                List<JSONObject> fresh=new ArrayList<>();
                if(items!=null) for(int i=0;i<items.length();i++) fresh.add(items.getJSONObject(i));
                runOnUiThread(()->{listings.clear();listings.addAll(fresh);renderListings();});
            } catch(Exception e) {
                runOnUiThread(()->Toast.makeText(this,"Could not connect. Check your internet and tap refresh.",Toast.LENGTH_LONG).show());
            } finally { if(connection!=null) connection.disconnect(); }
        });
    }

    @Override public void onBackPressed() {
        new AlertDialog.Builder(this).setMessage("Close NaijaCash?").setPositiveButton("Exit",(d,w)->finish()).setNegativeButton("Stay",null).show();
    }

    @Override protected void onPause() { if (bannerAd != null) bannerAd.pause(); if (contentBannerAd != null) contentBannerAd.pause(); super.onPause(); }

    @Override protected void onResume() { super.onResume(); if (bannerAd != null) bannerAd.resume(); if (contentBannerAd != null) contentBannerAd.resume(); }

    @Override protected void onDestroy() { if (bannerAd != null) bannerAd.destroy(); if (contentBannerAd != null) contentBannerAd.destroy(); super.onDestroy(); executor.shutdownNow(); }
}
