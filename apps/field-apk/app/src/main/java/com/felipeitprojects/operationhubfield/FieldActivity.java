package com.felipeitprojects.operationhubfield;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.RadioGroup;
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
import java.util.HashMap;
import java.util.Map;

public class FieldActivity extends Activity {
    private static final String API_URL = BuildConfig.OPERATIONHUB_API_URL;
    private static final int PHOTO_PICK_REQUEST = 4001;
    private static final int AMBER = Color.rgb(217, 119, 6);
    private static final int GREEN = Color.rgb(22, 101, 52);
    private static final int INK = Color.rgb(31, 41, 51);
    private static final int MUTED = Color.rgb(75, 85, 99);
    private static final int PAPER = Color.rgb(247, 244, 237);

    private LinearLayout root;
    private SharedPreferences prefs;
    private String token;
    private JSONObject selectedTask;
    private JSONArray selectedItems = new JSONArray();
    private TextView photoStatus;
    private final Map<String, EditText> textInputs = new HashMap<>();
    private final Map<String, CheckBox> checkboxInputs = new HashMap<>();
    private final Map<String, RadioGroup> choiceInputs = new HashMap<>();
    private final JSONArray pickedPhotos = new JSONArray();

    @Override
    protected void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        prefs = getSharedPreferences("operationhub-field", MODE_PRIVATE);
        token = prefs.getString("token", null);
        if (token == null) showLogin();
        else showTasks();
    }

    @Override
    public void onBackPressed() {
        if (selectedTask != null) {
            selectedTask = null;
            showTasks();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PHOTO_PICK_REQUEST || resultCode != RESULT_OK || data == null) return;
        if (data.getData() != null) pickedPhotos.put(data.getData().toString());
        if (photoStatus != null) photoStatus.setText(pickedPhotos.length() + " photo(s) attached");
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
        root.addView(text("Native APK connected to your configured OperationHub API", 15, MUTED));

        EditText email = input("worker@example.com");
        EditText password = input("DemoWorker2026!");
        password.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
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
        selectedTask = null;
        setScreen();
        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setOrientation(LinearLayout.HORIZONTAL);
        TextView title = text("Active Tasks", 28, INK);
        Button logout = button("Logout");
        header.addView(title, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        header.addView(logout);
        root.addView(header);
        TextView status = text("Loading tasks...", 15, MUTED);
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
        int shown = 0;
        for (int i = 0; i < tasks.length(); i++) {
            JSONObject task = tasks.optJSONObject(i);
            if (task == null || "closed".equals(task.optString("status"))) continue;
            shown++;
            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(24, 20, 24, 20);
            card.setBackgroundColor(Color.WHITE);
            card.addView(text(task.optString("title", "Untitled task"), 20, INK));
            card.addView(text(task.optString("vertical", "ops").toUpperCase() + " | " + task.optString("status", "pending"), 14, AMBER));
            card.addView(text(task.optString("site_name", "No site") + " | " + task.optString("asset_name", "No asset"), 14, MUTED));
            String description = task.optString("description", "");
            if (!description.isEmpty()) card.addView(text(description, 14, MUTED));
            Button open = button("Open checklist");
            card.addView(open);
            root.addView(card);
            open.setOnClickListener(v -> showTaskDetail(task));
        }
        status.setText(shown + " active task(s) loaded");
    }

    private void showTaskDetail(JSONObject task) {
        selectedTask = task;
        selectedItems = task.optJSONArray("items") == null ? new JSONArray() : task.optJSONArray("items");
        textInputs.clear();
        checkboxInputs.clear();
        choiceInputs.clear();
        while (pickedPhotos.length() > 0) pickedPhotos.remove(0);

        setScreen();
        Button back = button("Back to tasks");
        root.addView(back);
        back.setOnClickListener(v -> showTasks());
        root.addView(text(task.optString("title", "Task"), 26, INK));
        root.addView(text(task.optString("vertical", "ops").toUpperCase() + " | " + task.optString("status", "pending"), 15, AMBER));
        root.addView(text(task.optString("site_name", "No site") + " | " + task.optString("asset_name", "No asset"), 14, MUTED));
        if (!task.optString("description", "").isEmpty()) root.addView(text(task.optString("description"), 14, MUTED));

        Button start = button("Start task");
        root.addView(start);
        start.setOnClickListener(v -> taskAction(task.optString("id"), "start"));

        root.addView(text("Checklist", 22, INK));
        if (selectedItems.length() == 0) root.addView(text("This task has no template checklist.", 15, MUTED));
        for (int i = 0; i < selectedItems.length(); i++) {
            JSONObject item = selectedItems.optJSONObject(i);
            if (item != null) addChecklistControl(item);
        }

        EditText notes = input("");
        notes.setSingleLine(false);
        notes.setMinLines(3);
        notes.setHint("Notes for manager or auditor");
        root.addView(text("Notes", 16, INK));
        root.addView(notes);

        TextView status = text("", 14, Color.RED);
        Button submit = button("Submit evidence");
        root.addView(submit);
        root.addView(status);
        submit.setOnClickListener(v -> submitTask(task, notes.getText().toString(), status));
    }

    private void addChecklistControl(JSONObject item) {
        String key = item.optString("key");
        String label = item.optString("label", key);
        String type = item.optString("type", "text");
        root.addView(text(label + (item.optBoolean("required", false) ? " *" : ""), 16, INK));

        if ("checkbox".equals(type)) {
            CheckBox box = new CheckBox(this);
            box.setText("Pass / OK");
            box.setTextColor(MUTED);
            checkboxInputs.put(key, box);
            root.addView(box);
            return;
        }

        if ("choice".equals(type)) {
            RadioGroup group = new RadioGroup(this);
            group.setOrientation(RadioGroup.VERTICAL);
            JSONArray options = item.optJSONArray("options");
            if (options != null) {
                for (int i = 0; i < options.length(); i++) {
                    RadioButton radio = new RadioButton(this);
                    radio.setText(options.optString(i));
                    radio.setTextColor(MUTED);
                    radio.setId(20000 + choiceInputs.size() * 100 + i);
                    group.addView(radio);
                }
            }
            choiceInputs.put(key, group);
            root.addView(group);
            return;
        }

        if ("photo".equals(type)) {
            Button pick = button("Attach photo");
            photoStatus = text("No photos attached", 14, MUTED);
            root.addView(pick);
            root.addView(photoStatus);
            pick.setOnClickListener(v -> {
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.setType("image/*");
                startActivityForResult(Intent.createChooser(intent, "Select evidence photo"), PHOTO_PICK_REQUEST);
            });
            return;
        }

        EditText field = input("");
        field.setHint("number".equals(type) ? "Enter number" : "Enter value");
        if ("number".equals(type)) {
            field.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL | InputType.TYPE_NUMBER_FLAG_SIGNED);
        }
        textInputs.put(key, field);
        root.addView(field);
    }

    private void taskAction(String id, String action) {
        new Thread(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("action", action);
                request("POST", "/api/tasks/" + id + "/review", payload.toString(), token);
                runOnUiThread(() -> {
                    toast("Task started");
                    showTasks();
                });
            } catch (Exception ex) {
                runOnUiThread(() -> toast(ex.getMessage()));
            }
        }).start();
    }

    private void submitTask(JSONObject task, String notes, TextView status) {
        try {
            JSONArray payload = buildPayload();
            String missing = missingRequired(payload);
            if (!missing.isEmpty()) {
                status.setTextColor(Color.RED);
                status.setText("Missing required evidence: " + missing);
                return;
            }
            status.setTextColor(MUTED);
            status.setText("Submitting...");
            new Thread(() -> {
                try {
                    postSubmission(task.optString("id"), notes, payload);
                    runOnUiThread(() -> {
                        toast("Submitted. Awaiting manager review.");
                        showTasks();
                    });
                } catch (Exception ex) {
                    runOnUiThread(() -> {
                        status.setTextColor(Color.RED);
                        status.setText(ex.getMessage());
                    });
                }
            }).start();
        } catch (Exception ex) {
            status.setTextColor(Color.RED);
            status.setText(ex.getMessage());
        }
    }

    private JSONArray buildPayload() throws Exception {
        JSONArray payload = new JSONArray();
        for (int i = 0; i < selectedItems.length(); i++) {
            JSONObject item = selectedItems.getJSONObject(i);
            String key = item.optString("key");
            String type = item.optString("type", "text");
            JSONObject answer = new JSONObject();
            answer.put("key", key);
            answer.put("label", item.optString("label", key));
            answer.put("type", type);

            if ("checkbox".equals(type)) {
                answer.put("value", checkboxInputs.get(key) != null && checkboxInputs.get(key).isChecked());
            } else if ("choice".equals(type)) {
                RadioGroup group = choiceInputs.get(key);
                String value = "";
                if (group != null && group.getCheckedRadioButtonId() != -1) {
                    RadioButton checked = findViewById(group.getCheckedRadioButtonId());
                    value = checked == null ? "" : checked.getText().toString();
                }
                answer.put("value", value);
            } else if ("photo".equals(type)) {
                answer.put("value", pickedPhotos.length() > 0 ? "attached" : "");
            } else {
                EditText input = textInputs.get(key);
                answer.put("value", input == null ? "" : input.getText().toString());
            }
            payload.put(answer);
        }
        return payload;
    }

    private String missingRequired(JSONArray payload) throws Exception {
        StringBuilder missing = new StringBuilder();
        for (int i = 0; i < selectedItems.length(); i++) {
            JSONObject item = selectedItems.getJSONObject(i);
            if (!item.optBoolean("required", false)) continue;
            String key = item.optString("key");
            String type = item.optString("type", "text");
            boolean isMissing = false;
            if ("photo".equals(type)) {
                isMissing = pickedPhotos.length() == 0;
            } else {
                for (int p = 0; p < payload.length(); p++) {
                    JSONObject answer = payload.getJSONObject(p);
                    if (!key.equals(answer.optString("key"))) continue;
                    Object value = answer.opt("value");
                    if ("checkbox".equals(type)) isMissing = !(value instanceof Boolean);
                    else isMissing = value == null || String.valueOf(value).trim().isEmpty();
                    break;
                }
            }
            if (isMissing) {
                if (missing.length() > 0) missing.append(", ");
                missing.append(item.optString("label", key));
            }
        }
        return missing.toString();
    }

    private void postSubmission(String taskId, String notes, JSONArray payload) throws Exception {
        String boundary = "OperationHubBoundary" + System.currentTimeMillis();
        HttpURLConnection conn = (HttpURLConnection) new URL(API_URL + "/api/submissions").openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("Accept", "application/json");
        conn.setRequestProperty("Authorization", "Bearer " + token);
        conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);

        try (OutputStream out = conn.getOutputStream()) {
            writeField(out, boundary, "taskId", taskId);
            writeField(out, boundary, "notes", notes);
            writeField(out, boundary, "payload", payload.toString());
            for (int i = 0; i < pickedPhotos.length(); i++) {
                writePhoto(out, boundary, Uri.parse(pickedPhotos.getString(i)), i);
            }
            out.write(("--" + boundary + "--\r\n").getBytes("UTF-8"));
        }

        int code = conn.getResponseCode();
        String raw = read(code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream());
        if (code < 200 || code >= 300) {
            String message = raw;
            try {
                message = new JSONObject(raw).optString("error", raw);
            } catch (Exception ignored) {
            }
            throw new Exception(message.isEmpty() ? "Submission failed" : message);
        }
    }

    private void writeField(OutputStream out, String boundary, String name, String value) throws Exception {
        out.write(("--" + boundary + "\r\n").getBytes("UTF-8"));
        out.write(("Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n").getBytes("UTF-8"));
        out.write((value == null ? "" : value).getBytes("UTF-8"));
        out.write("\r\n".getBytes("UTF-8"));
    }

    private void writePhoto(OutputStream out, String boundary, Uri uri, int index) throws Exception {
        out.write(("--" + boundary + "\r\n").getBytes("UTF-8"));
        out.write(("Content-Disposition: form-data; name=\"photos\"; filename=\"evidence-" + index + ".jpg\"\r\n").getBytes("UTF-8"));
        out.write("Content-Type: image/jpeg\r\n\r\n".getBytes("UTF-8"));
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            if (in != null) {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
            }
        }
        out.write("\r\n".getBytes("UTF-8"));
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
        String raw = read(code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream());
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
