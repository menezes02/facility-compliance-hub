import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";

const apiUrl =
  ((Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl as string | undefined) ??
  "https://example.invalid";

type Session = {
  token: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
};

type ChecklistItem = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
};

type Task = {
  id: string;
  title: string;
  description?: string;
  vertical: "fire" | "parking" | "pool";
  status: string;
  due_date?: string;
  site_name?: string;
  asset_name?: string;
  team_name?: string;
  assignee_name?: string;
  items?: ChecklistItem[];
};

type AnswerValue = string | boolean;

type PickedPhoto = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

async function apiRequest<T>(path: string, token: string | undefined, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body as T;
}

function initialAnswers(items: ChecklistItem[] = []) {
  return Object.fromEntries(items.map((item) => [item.key, item.type === "checkbox" ? false : ""])) as Record<
    string,
    AnswerValue
  >;
}

function formatDueDate(date?: string) {
  if (!date) return "No due date";
  return new Date(date).toLocaleString();
}

export default function FieldApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [email, setEmail] = useState("worker@example.com");
  const [password, setPassword] = useState("change-me-worker-password");
  const [notes, setNotes] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeTasks = useMemo(
    () => tasks.filter((task) => !["closed", "completed"].includes(task.status)),
    [tasks]
  );

  async function loadTasks(activeSession = session) {
    if (!activeSession) return;
    const data = await apiRequest<Task[]>("/api/tasks", activeSession.token);
    setTasks(data);
  }

  useEffect(() => {
    AsyncStorage.getItem("operationhub.mobile.session")
      .then((raw) => {
        if (raw) setSession(JSON.parse(raw) as Session);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    loadTasks(session)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session]);

  function openTask(task: Task) {
    setSelectedTask(task);
    setAnswers(initialAnswers(task.items));
    setNotes("");
    setPhotos([]);
    setError("");
  }

  async function signIn() {
    setError("");
    setLoading(true);
    try {
      const data = await apiRequest<Session>("/api/auth/login", undefined, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setSession(data);
      await AsyncStorage.setItem("operationhub.mobile.session", JSON.stringify(data));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await AsyncStorage.removeItem("operationhub.mobile.session");
    setSession(null);
    setSelectedTask(null);
    setTasks([]);
  }

  async function startTask() {
    if (!session || !selectedTask) return;
    setError("");
    setLoading(true);
    try {
      await apiRequest(`/api/tasks/${selectedTask.id}/review`, session.token, {
        method: "POST",
        body: JSON.stringify({ action: "start" })
      });
      await loadTasks(session);
      setSelectedTask({ ...selectedTask, status: "in_progress" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function pickPhotos() {
    setError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo permission is required to attach evidence.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7
    });

    if (!result.canceled) {
      setPhotos(result.assets.map((asset) => ({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType })));
    }
  }

  function validateSubmission() {
    if (!selectedTask) return [];
    return (selectedTask.items ?? [])
      .filter((item) => item.required)
      .filter((item) => {
        if (item.type === "photo") return photos.length === 0;
        const value = answers[item.key];
        if (item.type === "checkbox") return typeof value !== "boolean";
        return value === undefined || value === null || String(value).trim() === "";
      })
      .map((item) => item.label);
  }

  async function submitTask() {
    if (!session || !selectedTask) return;
    setError("");

    const missing = validateSubmission();
    if (missing.length) {
      setError(`Missing required evidence: ${missing.join(", ")}`);
      return;
    }

    const payload = (selectedTask.items ?? []).map((item) => ({
      key: item.key,
      label: item.label,
      type: item.type,
      value: answers[item.key] ?? (item.type === "photo" ? "attached" : "")
    }));

    const formData = new FormData();
    formData.append("taskId", selectedTask.id);
    formData.append("notes", notes);
    formData.append("payload", JSON.stringify(payload));
    photos.forEach((photo, index) => {
      formData.append("photos", {
        uri: photo.uri,
        name: photo.fileName ?? `operationhub-evidence-${index + 1}.jpg`,
        type: photo.mimeType ?? "image/jpeg"
      } as unknown as Blob);
    });

    setLoading(true);
    try {
      await apiRequest("/api/submissions", session.token, {
        method: "POST",
        body: formData
      });
      await loadTasks(session);
      setSelectedTask(null);
      setNotes("");
      setAnswers({});
      setPhotos([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function renderChecklistItem(item: ChecklistItem) {
    const label = `${item.label}${item.required ? " *" : ""}`;

    if (item.type === "checkbox") {
      return (
        <View key={item.key} style={styles.checkRow}>
          <View style={styles.checkText}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.helper}>Turn off to flag a failed check.</Text>
          </View>
          <Switch
            value={Boolean(answers[item.key])}
            onValueChange={(value) => setAnswers((current) => ({ ...current, [item.key]: value }))}
          />
        </View>
      );
    }

    if (item.type === "choice") {
      return (
        <View key={item.key} style={styles.block}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.choiceRow}>
            {(item.options ?? []).map((option) => (
              <Pressable
                key={option}
                style={[styles.choice, answers[item.key] === option ? styles.choiceActive : null]}
                onPress={() => setAnswers((current) => ({ ...current, [item.key]: option }))}
              >
                <Text style={styles.choiceText}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      );
    }

    if (item.type === "photo") {
      return (
        <View key={item.key} style={styles.photoPrompt}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.helper}>Use the evidence button below to attach photos.</Text>
        </View>
      );
    }

    return (
      <View key={item.key} style={styles.block}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.input}
          keyboardType={item.type === "number" ? "decimal-pad" : "default"}
          placeholder={item.type === "number" ? "Enter reading" : "Enter response"}
          placeholderTextColor="#8fa1b3"
          value={String(answers[item.key] ?? "")}
          onChangeText={(value) => setAnswers((current) => ({ ...current, [item.key]: value }))}
        />
      </View>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loginCard}>
          <Text style={styles.eyebrow}>OperationHub Field</Text>
          <Text style={styles.title}>Worker sign-in</Text>
          <Text style={styles.subtitle}>Connected to {apiUrl.replace("https://", "")}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor="#8fa1b3"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor="#8fa1b3"
          />
          <Pressable style={styles.primaryButton} onPress={signIn} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign in"}</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  if (selectedTask) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.sheet}>
          <Pressable style={styles.secondaryButton} onPress={() => setSelectedTask(null)}>
            <Text style={styles.secondaryText}>Back to tasks</Text>
          </Pressable>
          <View style={styles.taskHero}>
            <Text style={styles.taskVertical}>{selectedTask.vertical}</Text>
            <Text style={styles.title}>{selectedTask.title}</Text>
            <Text style={styles.subtitle}>{selectedTask.description || "No description"}</Text>
            <Text style={styles.meta}>
              {selectedTask.site_name || "No site"} · {selectedTask.asset_name || "No asset"}
            </Text>
            <Text style={styles.meta}>
              {selectedTask.status.replace("_", " ")} · due {formatDueDate(selectedTask.due_date)}
            </Text>
          </View>

          {selectedTask.status === "pending" ? (
            <Pressable style={styles.primaryButton} onPress={startTask} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? "Starting..." : "Start task"}</Text>
            </Pressable>
          ) : null}

          {(selectedTask.items ?? []).map(renderChecklistItem)}

          <View style={styles.block}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notes]}
              placeholder="Findings, exceptions, remediation notes"
              placeholderTextColor="#8fa1b3"
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

          <Pressable style={styles.secondaryButton} onPress={pickPhotos}>
            <Text style={styles.secondaryText}>Attach evidence photos ({photos.length})</Text>
          </Pressable>

          <Pressable style={styles.primaryButton} onPress={submitTask} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Submitting..." : "Submit for review"}</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Assigned field work</Text>
          <Text style={styles.title}>
            {session.user.firstName} {session.user.lastName}
          </Text>
          <Text style={styles.subtitle}>{session.user.email}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.secondaryButton} onPress={() => loadTasks()} disabled={loading}>
            <Text style={styles.secondaryText}>Refresh</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={signOut}>
            <Text style={styles.secondaryText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
      {loading ? <ActivityIndicator color="#fff" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={activeTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No active tasks found.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.taskCard} onPress={() => openTask(item)}>
            <View style={styles.cardRow}>
              <Text style={styles.taskVertical}>{item.vertical}</Text>
              <Text style={styles.statusPill}>{item.status.replace("_", " ")}</Text>
            </View>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.description || "No description"}</Text>
            <Text style={styles.meta}>{item.site_name || "No site"} · {item.asset_name || "No asset"}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111a"
  },
  loginCard: {
    margin: 20,
    marginTop: 80,
    padding: 22,
    backgroundColor: "#0f1728",
    borderRadius: 26,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  header: {
    padding: 20,
    gap: 14
  },
  headerActions: {
    flexDirection: "row",
    gap: 10
  },
  sheet: {
    padding: 20,
    gap: 14
  },
  list: {
    padding: 20,
    gap: 14
  },
  taskCard: {
    backgroundColor: "#0f1728",
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  taskHero: {
    backgroundColor: "#0f1728",
    padding: 18,
    borderRadius: 22,
    gap: 8
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center"
  },
  eyebrow: {
    color: "#8fa1b3",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: "#c1cad6",
    lineHeight: 20
  },
  meta: {
    color: "#8fa1b3",
    fontSize: 13
  },
  taskVertical: {
    color: "#67b3ff",
    textTransform: "capitalize",
    fontWeight: "800"
  },
  taskTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 6
  },
  statusPill: {
    color: "#d8ecff",
    backgroundColor: "rgba(32,164,243,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
    textTransform: "capitalize"
  },
  label: {
    color: "#fff",
    fontWeight: "700",
    marginBottom: 7
  },
  helper: {
    color: "#8fa1b3",
    fontSize: 12
  },
  block: {
    backgroundColor: "rgba(255,255,255,0.035)",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)"
  },
  checkRow: {
    backgroundColor: "rgba(255,255,255,0.035)",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center"
  },
  checkText: {
    flex: 1
  },
  photoPrompt: {
    backgroundColor: "rgba(32,164,243,0.08)",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(32,164,243,0.22)"
  },
  input: {
    backgroundColor: "#122033",
    color: "#fff",
    borderRadius: 14,
    padding: 14
  },
  notes: {
    minHeight: 120,
    textAlignVertical: "top"
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  choice: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#122033"
  },
  choiceActive: {
    backgroundColor: "#175cd3"
  },
  choiceText: {
    color: "#fff",
    textTransform: "capitalize"
  },
  primaryButton: {
    backgroundColor: "#175cd3",
    padding: 15,
    borderRadius: 16,
    alignItems: "center"
  },
  secondaryButton: {
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    padding: 13,
    borderRadius: 16,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800"
  },
  secondaryText: {
    color: "#d8ecff",
    fontWeight: "700"
  },
  empty: {
    color: "#8fa1b3",
    textAlign: "center",
    marginTop: 40
  },
  error: {
    color: "#ffb4ab",
    paddingHorizontal: 20,
    paddingBottom: 12
  }
});
