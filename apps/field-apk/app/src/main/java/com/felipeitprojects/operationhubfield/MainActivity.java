package com.felipeitprojects.operationhubfield;

import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {
    private static final String API_URL = BuildConfig.OPERATIONHUB_API_URL;
    private static final int AMBER = Color.rgb(217, 119, 6);
    private static final int INK = Color.rgb(31, 41, 51);
    private static final int PAPER = Color.rgb(247, 244, 237);

    private LinearLayout root;
    private SharedPreferences prefs;
    private String token;

    @Override
    protected void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        prefs = getSharedPreferences("operationhub-field", MODE_PRIVATE);
        token = prefs.getString("token", null);
        if (token == null) {
            showLogin();
        } else {
            showTasks();
        }
    }

    private void setScreen() {
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(PAPER);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(32, 40, 32, 40);
        scroll.addView(root);
        setContentView(scroll);
    }

    private TextView text(String value, int size, int color) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setPadding(0, 8, 0, 8);
        return view;
    }

    private Button button(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextColor(Color.WHITE);
        button.setBackgroundColor(AMBER);
        button.setPadding(8, 8, 8, 8);
        return button;
    }

    private EditText input(String value) {
        EditText input = new EditText(this);
        input.setText(value);
        input.setSingleLine(true);
        input.setTextColor(INK);
        return input;
    }

    private void showLogin() {
        setScreen();
        root.addView(text("OperationHub Field", 28, INK));
        root.addView(text("Native APK connected to your configured OperationHub API", 15, Color.DKGRAY));

        EditText email = input("worker@example.com");
        EditText password = input("change-me-worker-password");
        password.setInputType(0x00000081);
        root.addView(text("Email", 14, INK));
        root.addView(email);
        root.addView(text("Password", 14, INK));
        root.addView(password);

        TextView status = text("", 14, Color.RED);
        Button login = button("Sign in");
        root.addView(login);
        root.addView(status);

        login.setOnClickListener(v -> {
            status.setText("Signing in...");
            new Thread(() -> {
                try {
                    JSONObject payload = new JSONObject();
                    payload.put("email", email.getText().toString());
                    payload.put("password", password.getText().toString());
                    JSONObject response = request("POST", "/api/auth/login", payload.toString(), null);
                    token = response.getString("token");
                    prefs.edit().putString("token", token).apply();
                    runOnUiThread(this::showTasks);
                } catch (Exception ex) {
                    runOnUiThread(() -> status.setText(ex.getMessage()));
                }
            }).start();
        });
    }

    private void showTasks() {
        setScreen();
        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setOrientation(LinearLayout.HORIZONTAL);
        TextView title = text("Active Tasks", 28, INK);
        Button logout = button("Logout");
        header.addView(title, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        header.addView(logout);
        root.addView(header);
        TextView status = text("Loading tasks...", 15, Color.DKGRAY);
        root.addView(status);
        logout.setOnClickListener(v -> {
            prefs.edit().clear().apply();
            token = null;
            showLogin();
        });

        new Thread(() -> {
            try {
                JSONArray tasks = requestArray("GET", "/api/tasks", null, token);
                runOnUiThread(() -> renderTasks(tasks, status));
            } catch (Exception ex) {
                runOnUiThread(() -> status.setText(ex.getMessage()));
            }
        }).start();
    }

    private void renderTasks(JSONArray tasks, TextView status) {
        status.setText(tasks.length() + " tasks loaded");
        for (int i = 0; i < tasks.length(); i++) {
            JSONObject task = tasks.optJSONObject(i);
            if (task == null) continue;
            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(24, 20, 24, 20);
            card.setBackgroundColor(Color.WHITE);
            card.addView(text(task.optString("title", "Untitled task"), 20, INK));
            card.addView(text(task.optString("vertical", "ops").toUpperCase() + " | " + task.optString("status", "pending"), 14, AMBER));
            card.addView(text(task.optString("site_name", "No site") + " | " + task.optString("asset_name", "No asset"), 14, Color.DKGRAY));
            String description = task.optString("description", "");
            if (!description.isEmpty()) card.addView(text(description, 14, Color.DKGRAY));
            Button start = button("Start task");
            Button submit = button("Submit checklist");
            card.addView(start);
            card.addView(submit);
            root.addView(card);

            String id = task.optString("id");
            start.setOnClickListener(v -> taskAction(id, "start"));
            submit.setOnClickListener(v -> submitTask(id));
        }
    }

    private void taskAction(String id, String action) {
        new Thread(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("action", action);
                request("POST", "/api/tasks/" + id + "/review", payload.toString(), token);
                runOnUiThread(this::showTasks);
            } catch (Exception ex) {
                runOnUiThread(() -> toast(ex.getMessage()));
            }
        }).start();
    }

    private void submitTask(String id) {
        new Thread(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("notes", "Submitted from native Android APK");
                payload.put("answers", new JSONObject());
                payload.put("photos", new JSONArray());
                request("POST", "/api/submissions/" + id, payload.toString(), token);
                runOnUiThread(this::showTasks);
            } catch (Exception ex) {
                runOnUiThread(() -> toast(ex.getMessage()));
            }
        }).start();
    }

    private void toast(String message) {
        android.widget.Toast.makeText(this, message, android.widget.Toast.LENGTH_LONG).show();
    }

    private JSONObject request(String method, String path, String body, String authToken) throws Exception {
        String raw = requestRaw(method, path, body, authToken);
        return raw.isEmpty() ? new JSONObject() : new JSONObject(raw);
    }

    private JSONArray requestArray(String method, String path, String body, String authToken) throws Exception {
        return new JSONArray(requestRaw(method, path, body, authToken));
    }

    private String requestRaw(String method, String path, String body, String authToken) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(API_URL + path).openConnection();
        conn.setRequestMethod(method);
        conn.setRequestProperty("Accept", "application/json");
        if (authToken != null) conn.setRequestProperty("Authorization", "Bearer " + authToken);
        if (body != null) {
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            try (OutputStream out = conn.getOutputStream()) {
                out.write(body.getBytes("UTF-8"));
            }
        }

        int code = conn.getResponseCode();
        InputStream stream = code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream();
        String raw = read(stream);
        if (code < 200 || code >= 300) {
            String message = raw;
            try {
                message = new JSONObject(raw).optString("error", raw);
            } catch (Exception ignored) {
            }
            throw new Exception(message.isEmpty() ? "Request failed" : message);
        }
        return raw;
    }

    private String read(InputStream stream) throws Exception {
        if (stream == null) return "";
        BufferedReader reader = new BufferedReader(new InputStreamReader(stream));
        StringBuilder builder = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) builder.append(line);
        return builder.toString();
    }
}
