package com.rogueisles.wallet;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipDescription;
import android.content.ClipboardManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PersistableBundle;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Only packaged code runs in this WebView. External websites always use the browser. */
public class MainActivity extends Activity {
    private static final String HOST = "wallet.rogueisles.local";
    private static final String HOME = "https://" + HOST + "/index.html";
    private static final Set<String> RPC_URLS = new HashSet<>(Arrays.asList(
        "https://rpc.rogueisles.com", "https://bsc-dataseed.binance.org"));
    private static final Set<String> METHODS = new HashSet<>(Arrays.asList(
        "eth_chainId", "net_version", "eth_blockNumber", "eth_getBalance", "eth_getTransactionCount",
        "eth_call", "eth_getCode", "eth_estimateGas", "eth_gasPrice", "eth_getBlockByNumber",
        "eth_getTransactionReceipt", "eth_getTransactionByHash", "eth_getLogs", "eth_sendRawTransaction"));
    private final ExecutorService executor = Executors.newFixedThreadPool(4);
    private final Handler ui = new Handler(Looper.getMainLooper());
    private WebView web;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        web = new WebView(this);
        web.setBackgroundColor(0xfff7f2e1);
        setContentView(web);
        web.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.addJavascriptInterface(new NativeBridge(), "RogueNative");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (!"https".equals(u.getScheme()) || !HOST.equals(u.getHost())) return blocked();
                String path = u.getPath();
                if (path == null || path.contains("..") || !path.matches("/[a-zA-Z0-9_./-]+")) return blocked();
                try {
                    String mime = path.endsWith(".html") ? "text/html" : path.endsWith(".js") ? "application/javascript" :
                        path.endsWith(".css") ? "text/css" : path.endsWith(".svg") ? "image/svg+xml" :
                        path.endsWith(".png") ? "image/png" : path.endsWith(".woff2") ? "font/woff2" : "application/octet-stream";
                    WebResourceResponse out = new WebResourceResponse(mime, "UTF-8", getAssets().open(path.substring(1)));
                    HashMap<String,String> headers = new HashMap<>();
                    headers.put("Cache-Control", "no-store"); headers.put("X-Content-Type-Options", "nosniff");
                    out.setResponseHeaders(headers); return out;
                } catch (Exception e) { return blocked(); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOME.equals(u.toString())) return false;
                if (request.isForMainFrame() && "https".equals(u.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                }
                return true;
            }
        });
        web.loadUrl(HOME);
    }
    private WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }
    @Override protected void onPause() {
        if (web != null) web.evaluateJavascript("window.rogueLock&&window.rogueLock()", null);
        super.onPause();
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("window.rogueBack&&window.rogueBack()", null);
    }
    @Override protected void onDestroy() {
        executor.shutdownNow();
        if (web != null) { web.removeJavascriptInterface("RogueNative"); web.destroy(); web = null; }
        super.onDestroy();
    }
    public class NativeBridge {
        @JavascriptInterface public void request(String id, String endpoint, String method, String parameters) {
            if (id == null || !id.matches("[0-9]{1,12}")) return;
            executor.execute(() -> {
                JSONObject response = new JSONObject();
                HttpURLConnection connection = null;
                try {
                    if (!RPC_URLS.contains(endpoint) || !METHODS.contains(method) || parameters.length() > 262144)
                        throw new SecurityException("RPC request blocked");
                    JSONObject body = new JSONObject();
                    body.put("jsonrpc", "2.0"); body.put("id", id); body.put("method", method);
                    body.put("params", new JSONArray(parameters));
                    connection = (HttpURLConnection)new URL(endpoint).openConnection();
                    connection.setInstanceFollowRedirects(false);
                    connection.setRequestMethod("POST"); connection.setDoOutput(true);
                    connection.setConnectTimeout(15000); connection.setReadTimeout(25000);
                    connection.setRequestProperty("Content-Type", "application/json");
                    byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                    connection.setFixedLengthStreamingMode(bytes.length);
                    try (java.io.OutputStream out = connection.getOutputStream()) { out.write(bytes); }
                    int status = connection.getResponseCode();
                    if (status < 200 || status >= 300) throw new java.io.IOException("RPC HTTP " + status);
                    try (InputStream input = connection.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                        byte[] buffer = new byte[8192]; int n;
                        while ((n = input.read(buffer)) != -1) {
                            if (out.size() + n > 4194304) throw new java.io.IOException("RPC response too large");
                            out.write(buffer, 0, n);
                        }
                        response = new JSONObject(out.toString("UTF-8"));
                    }
                } catch (Exception e) {
                    try { response.put("error", new JSONObject().put("message", e.getMessage() == null ? "RPC unavailable" : e.getMessage())); }
                    catch (Exception ignored) { }
                } finally { if (connection != null) connection.disconnect(); }
                final String result = response.toString();
                ui.post(() -> { if (web != null && HOME.equals(web.getUrl()))
                    web.evaluateJavascript("window.rogueRpcResult(" + JSONObject.quote(id) + "," + JSONObject.quote(result) + ")", null); });
            });
        }
        @JavascriptInterface public void copy(String text, boolean sensitive) {
            if (text == null || text.length() > 4096) return;
            ui.post(() -> {
                ClipboardManager clipboard = (ClipboardManager)getSystemService(CLIPBOARD_SERVICE);
                ClipData data = ClipData.newPlainText(sensitive ? "Sensitive wallet data" : "Wallet address", text);
                if (sensitive && Build.VERSION.SDK_INT >= 33) {
                    PersistableBundle extra = new PersistableBundle(); extra.putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true);
                    data.getDescription().setExtras(extra);
                }
                clipboard.setPrimaryClip(data);
                if (sensitive) ui.postDelayed(() -> {
                    if (clipboard.hasPrimaryClip() && clipboard.getPrimaryClip() != null &&
                        text.contentEquals(clipboard.getPrimaryClip().getItemAt(0).coerceToText(MainActivity.this)))
                        clipboard.setPrimaryClip(ClipData.newPlainText("", ""));
                }, 60000);
            });
        }
    }
}
