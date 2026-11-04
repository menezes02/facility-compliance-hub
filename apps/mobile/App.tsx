// @ts-nocheck
import { useEffect, useState } from "react";
import FieldApp from "./FieldApp";
import {
  ActivityIndicator,
  Button,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const apiUrl =
  ((Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl as string | undefined) ??
  "http://10.0.2.2:5000";

type Session = {
  token: string;
  user: {
    firstName: string;
    lastName: string;
  };
};

type Task = {
  id: string;
  title: string;
  description: string;
  vertical: "fire" | "parking" | "pool";
  status: string;
  items: { key: string; label: string; type: string }[];
};

export default function App() {
  return <FieldApp />;

  const [session, setSession] = useState<Session | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadTasks(activeSession: Session) {
    const response = await fetch(`${apiUrl}/api/tasks`, {
      headers: { Authorization: `Bearer ${activeSession.token}` }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load tasks");
    }
    setTasks(data);
  }

  useEffect(() => {
    AsyncStorage.getItem("operationhub.mobile.session").then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw) as Session;
        setSession(parsed);
      }
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    loadTasks(session)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session]);

  async function signIn() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Login failed");
      }
      setSession(data);
      await AsyncStorage.setItem("operationhub.mobile.session", JSON.stringify(data));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submitTask() {
    if (!session || !selectedTask) return;
    const payload = selectedTask.items.map((item) => ({
      key: item.key,
      label: item.label,
      value: answers[item.key] ?? ""
    }));

    const formData = new FormData();
    formData.append("taskId", selectedTask.id);
    formData.append("notes", notes);
    formData.append("payload", JSON.stringify(payload));

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/submissions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`
        },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Submission failed");
      }
      setSelectedTask(null);
      setNotes("");
      setAnswers({});
      await loadTasks(session);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginCard}>
          <Text style={styles.eyebrow}>Facility Compliance Hub Field</Text>
          <Text style={styles.title}>Field sign-in</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
          <Button title="Sign In" onPress={signIn} />
          {loading ? <ActivityIndicator color="#fff" /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  if (selectedTask) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.sheet}>
          <Text style={styles.eyebrow}>{selectedTask.vertical.toUpperCase()}</Text>
          <Text style={styles.title}>{selectedTask.title}</Text>
          <Text style={styles.subtitle}>{selectedTask.description}</Text>
          {selectedTask.items?.map((item) => (
            <View key={item.key} style={styles.block}>
              <Text style={styles.label}>{item.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={item.type}
                placeholderTextColor="#8fa1b3"
                value={answers[item.key] ?? ""}
                onChangeText={(value) => setAnswers((current) => ({ ...current, [item.key]: value }))}
              />
            </View>
          ))}
          <TextInput
            style={[styles.input, styles.notes]}
            placeholder="Notes"
            placeholderTextColor="#8fa1b3"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <Button title="Submit checklist" onPress={submitTask} />
          <Button title="Back to tasks" onPress={() => setSelectedTask(null)} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Assigned tasks</Text>
          <Text style={styles.title}>
            {session.user.firstName} {session.user.lastName}
          </Text>
        </View>
      </View>
      {loading ? <ActivityIndicator color="#fff" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={tasks.filter((task) => task.status !== "completed")}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.taskCard} onPress={() => setSelectedTask(item)}>
            <Text style={styles.taskVertical}>{item.vertical}</Text>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.description}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08111d"
  },
  loginCard: {
    margin: 24,
    padding: 24,
    backgroundColor: "#0f1728",
    borderRadius: 20,
    gap: 12
  },
  header: {
    padding: 20
  },
  sheet: {
    padding: 20,
    gap: 12
  },
  list: {
    padding: 20,
    gap: 12
  },
  taskCard: {
    backgroundColor: "#0f1728",
    padding: 18,
    borderRadius: 18,
    marginBottom: 12
  },
  eyebrow: {
    color: "#8fa1b3",
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700"
  },
  subtitle: {
    color: "#c1cad6"
  },
  taskVertical: {
    color: "#67b3ff",
    textTransform: "capitalize",
    marginBottom: 8
  },
  taskTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6
  },
  label: {
    color: "#fff",
    marginBottom: 6
  },
  block: {
    marginBottom: 10
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
  error: {
    color: "#ffb4ab",
    paddingHorizontal: 20,
    paddingBottom: 12
  }
});
