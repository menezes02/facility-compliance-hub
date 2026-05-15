import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import FieldApp from "./FieldApp";
import { ActivityIndicator, Button, FlatList, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
const apiUrl = Constants.expoConfig?.extra?.apiUrl ??
    "http://10.0.2.2:5000";
export default function App() {
    return _jsx(FieldApp, {});

    const [session, setSession] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [email, setEmail] = useState("admin@example.com");
    const [password, setPassword] = useState("DemoAdmin2026!");
    const [notes, setNotes] = useState("");
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    async function loadTasks(activeSession) {
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
                const parsed = JSON.parse(raw);
                setSession(parsed);
            }
        });
    }, []);
    useEffect(() => {
        if (!session)
            return;
        setLoading(true);
        loadTasks(session)
            .catch((err) => setError(err.message))
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
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }
    async function submitTask() {
        if (!session || !selectedTask)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }
    if (!session) {
        return (_jsx(SafeAreaView, { style: styles.container, children: _jsxs(View, { style: styles.loginCard, children: [_jsx(Text, { style: styles.eyebrow, children: "Facility Compliance Hub Android" }), _jsx(Text, { style: styles.title, children: "Field sign-in" }), _jsx(TextInput, { style: styles.input, value: email, onChangeText: setEmail }), _jsx(TextInput, { style: styles.input, value: password, onChangeText: setPassword, secureTextEntry: true }), _jsx(Button, { title: "Sign In", onPress: signIn }), loading ? _jsx(ActivityIndicator, { color: "#fff" }) : null, error ? _jsx(Text, { style: styles.error, children: error }) : null] }) }));
    }
    if (selectedTask) {
        return (_jsx(SafeAreaView, { style: styles.container, children: _jsxs(ScrollView, { contentContainerStyle: styles.sheet, children: [_jsx(Text, { style: styles.eyebrow, children: selectedTask.vertical.toUpperCase() }), _jsx(Text, { style: styles.title, children: selectedTask.title }), _jsx(Text, { style: styles.subtitle, children: selectedTask.description }), selectedTask.items?.map((item) => (_jsxs(View, { style: styles.block, children: [_jsx(Text, { style: styles.label, children: item.label }), _jsx(TextInput, { style: styles.input, placeholder: item.type, placeholderTextColor: "#8fa1b3", value: answers[item.key] ?? "", onChangeText: (value) => setAnswers((current) => ({ ...current, [item.key]: value })) })] }, item.key))), _jsx(TextInput, { style: [styles.input, styles.notes], placeholder: "Notes", placeholderTextColor: "#8fa1b3", value: notes, onChangeText: setNotes, multiline: true }), _jsx(Button, { title: "Submit checklist", onPress: submitTask }), _jsx(Button, { title: "Back to tasks", onPress: () => setSelectedTask(null) })] }) }));
    }
    return (_jsxs(SafeAreaView, { style: styles.container, children: [_jsx(View, { style: styles.header, children: _jsxs(View, { children: [_jsx(Text, { style: styles.eyebrow, children: "Assigned tasks" }), _jsxs(Text, { style: styles.title, children: [session.user.firstName, " ", session.user.lastName] })] }) }), loading ? _jsx(ActivityIndicator, { color: "#fff" }) : null, error ? _jsx(Text, { style: styles.error, children: error }) : null, _jsx(FlatList, { data: tasks.filter((task) => task.status !== "completed"), keyExtractor: (item) => item.id, contentContainerStyle: styles.list, renderItem: ({ item }) => (_jsxs(TouchableOpacity, { style: styles.taskCard, onPress: () => setSelectedTask(item), children: [_jsx(Text, { style: styles.taskVertical, children: item.vertical }), _jsx(Text, { style: styles.taskTitle, children: item.title }), _jsx(Text, { style: styles.subtitle, children: item.description })] })) })] }));
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
